const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI as string
const SCOPES = 'user-read-currently-playing user-read-playback-state'
const TOKEN_KEY = 'tunepop_tokens'
const VERIFIER_KEY = 'tunepop_pkce_verifier'

interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

function getStored(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as StoredTokens) : null
  } catch {
    return null
  }
}

function store(data: StoredTokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data))
}

function clear(): void {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
}

async function generateVerifier(): Promise<string> {
  const arr = new Uint8Array(64)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function startAuth(): Promise<void> {
  const verifier = await generateVerifier()
  const challenge = await generateChallenge(verifier)
  sessionStorage.setItem(VERIFIER_KEY, verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function handleCallback(code: string): Promise<void> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!verifier) throw new Error('Missing PKCE verifier')
  sessionStorage.removeItem(VERIFIER_KEY)

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  })

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)

  const json = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  store({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  })
}

async function refreshToken(refreshTok: string): Promise<void> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTok,
      client_id: CLIENT_ID,
    }),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)

  const json = await res.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  store({
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshTok,
    expiresAt: Date.now() + json.expires_in * 1000,
  })
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = getStored()
  if (!tokens) return null

  if (Date.now() > tokens.expiresAt - 60_000) {
    try {
      await refreshToken(tokens.refreshToken)
      return getStored()?.accessToken ?? null
    } catch {
      clear()
      return null
    }
  }

  return tokens.accessToken
}

export function isLoggedIn(): boolean {
  return getStored() !== null
}

export function logout(): void {
  clear()
}

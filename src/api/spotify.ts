import { getAccessToken } from './auth'

export interface SpotifyImage {
  url: string
  height: number | null
  width: number | null
}

export interface SpotifyArtist {
  id: string
  name: string
}

export interface SpotifyAlbum {
  id: string
  name: string
  images: SpotifyImage[]
  release_date: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  duration_ms: number
  uri: string
}

export interface SpotifyContext {
  type: 'playlist' | 'album' | 'artist' | 'collection'
  uri: string
}

export interface CurrentlyPlaying {
  item: SpotifyTrack | null
  is_playing: boolean
  context: SpotifyContext | null
}

async function spotifyFetch<T>(path: string): Promise<T | null> {
  const token = await getAccessToken()
  if (!token) return null

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 204 || res.status === 404) return null
  if (res.status === 403) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(`PLAYLIST_PERMISSION_DENIED:${body.error?.message ?? 'Forbidden'}`)
  }
  if (!res.ok) throw new Error(`Spotify ${res.status}: ${path}`)

  return res.json() as Promise<T>
}

export async function getCurrentlyPlaying(): Promise<CurrentlyPlaying | null> {
  return spotifyFetch<CurrentlyPlaying>('/me/player/currently-playing')
}

export async function getPlayerState(): Promise<CurrentlyPlaying | null> {
  return spotifyFetch<CurrentlyPlaying>('/me/player')
}

interface PagedTracks {
  items: Array<{ track: SpotifyTrack | null }>
  next: string | null
}

export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = []
  let path: string | null = `/playlists/${playlistId}/tracks?limit=50`

  while (path) {
    const data = await spotifyFetch<PagedTracks>(path)
    if (!data) break
    for (const item of data.items) {
      if (item.track) tracks.push(item.track)
    }
    path = data.next ? data.next.replace('https://api.spotify.com/v1', '') : null
  }

  return tracks
}

interface SpotifySimplifiedTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  duration_ms: number
  uri: string
}

interface AlbumFull extends SpotifyAlbum {
  tracks: {
    items: SpotifySimplifiedTrack[]
    next: string | null
  }
}

export async function getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
  const album = await spotifyFetch<AlbumFull>(`/albums/${albumId}`)
  if (!album) return []

  const albumMeta: SpotifyAlbum = {
    id: album.id,
    name: album.name,
    images: album.images,
    release_date: album.release_date,
  }

  return album.tracks.items.map(t => ({ ...t, album: albumMeta }))
}

export async function getTracksForContext(context: SpotifyContext): Promise<SpotifyTrack[]> {
  const id = context.uri.split(':')[2]
  if (context.type === 'playlist') return getPlaylistTracks(id)
  if (context.type === 'album') return getAlbumTracks(id)
  return []
}

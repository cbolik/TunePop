import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleCallback, isLoggedIn, startAuth } from '../api/auth'
import { useGameStore } from '../store/gameStore'

export function Login() {
  const navigate = useNavigate()
  const setStatus = useGameStore(s => s.setStatus)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isLoggedIn()) {
      setStatus('setup')
      navigate('/setup', { replace: true })
      return
    }

    const code = sessionStorage.getItem('spotify_oauth_code')
    if (code) {
      sessionStorage.removeItem('spotify_oauth_code')
      setLoading(true)
      handleCallback(code)
        .then(() => {
          setStatus('setup')
          navigate('/setup', { replace: true })
        })
        .catch(err => {
          setError((err as Error).message)
          setLoading(false)
        })
    }
  }, [navigate, setStatus])

  if (loading) {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-spotify border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Connecting to Spotify…</p>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="flex flex-col items-center gap-8 px-6 animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 bg-spotify rounded-full flex items-center justify-center text-4xl">
            🎵
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">TunePop</h1>
          <p className="text-gray-400 text-center text-sm leading-relaxed">
            Beat the bot at identifying songs from your Spotify playlists
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
            {error}. Please try again.
          </div>
        )}

        <button
          onClick={() => startAuth()}
          className="w-full max-w-xs bg-spotify hover:bg-spotify-dark active:scale-95 transition-all text-white font-bold py-4 px-6 rounded-full text-base"
        >
          Connect with Spotify
        </button>

        <p className="text-xs text-gray-500 text-center max-w-xs">
          Requires an active Spotify session. The app only reads currently playing track data — it never modifies your library.
        </p>
      </div>
    </Screen>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      {children}
    </div>
  )
}

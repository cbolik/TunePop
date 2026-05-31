import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentlyPlaying, getTracksForContext, SpotifyTrack } from '../api/spotify'
import { logout, reauthorize } from '../api/auth'
import { useGameStore } from '../store/gameStore'
import { Difficulty } from '../types/game'
import { BOT_PERSONALITIES } from '../types/game'

const ROUND_OPTIONS = [5, 10, 15, 20, null] as const

export function Setup() {
  const navigate = useNavigate()
  const { config, setConfig, startGame, resetToSetup } = useGameStore()
  const [starting, setStarting] = useState(false)
  const [waitingForSpotify, setWaitingForSpotify] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function tryStartGame(): Promise<boolean> {
    const playing = await getCurrentlyPlaying()

    if (!playing?.item || !playing.context) {
      return false
    }

    const pool = await getTracksForContext(playing.context)

    if (pool.length < 4) {
      setError('This playlist/album is too small (needs at least 4 tracks).')
      return false
    }

    startGame(pool, playing.item as SpotifyTrack)
    navigate('/round', { replace: true })
    return true
  }

  async function handleStart() {
    setError(null)
    setStarting(true)

    const ok = await tryStartGame().catch(err => {
      const msg = (err as Error).message
      if (msg === 'PLAYLIST_PERMISSION_DENIED') {
        setNeedsReauth(true)
        setError('Playlist access denied — your Spotify authorisation is missing the required permission.')
      } else {
        setError(msg)
      }
      return false
    })

    if (!ok && !error) {
      setStarting(false)
      setWaitingForSpotify(true)
      pollRef.current = setInterval(async () => {
        const started = await tryStartGame().catch(() => false)
        if (started) {
          if (pollRef.current) clearInterval(pollRef.current)
          setWaitingForSpotify(false)
        }
      }, 3000)
    }
  }

  function handleQuickPlay() {
    setNeedsReauth(false)
    handleStart()
  }

  function handleLogout() {
    logout()
    resetToSetup()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto">
      <header className="flex items-center justify-between px-4 pt-12 pb-4">
        <h1 className="text-2xl font-extrabold text-white">TunePop</h1>
        <button
          onClick={handleLogout}
          className="text-gray-400 text-sm hover:text-white transition-colors"
        >
          Log out
        </button>
      </header>

      <main className="flex-1 flex flex-col gap-5 px-4 pb-8">
        {/* Quick Play */}
        <button
          onClick={handleQuickPlay}
          disabled={starting || waitingForSpotify}
          className="w-full bg-spotify hover:bg-spotify-dark active:scale-95 disabled:opacity-60 disabled:scale-100 transition-all text-white font-bold py-5 px-6 rounded-2xl text-lg"
        >
          {waitingForSpotify ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Waiting for Spotify…
            </span>
          ) : starting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Loading…
            </span>
          ) : (
            '▶  Quick Play'
          )}
        </button>

        {waitingForSpotify && (
          <p className="text-center text-gray-400 text-sm -mt-2">
            Open Spotify and start playing a playlist, then come back here.
          </p>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3 text-sm text-red-400 flex flex-col gap-2">
            <span>{error}</span>
            {needsReauth && (
              <button
                onClick={reauthorize}
                className="self-start text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all font-semibold text-xs px-3 py-1.5 rounded-lg"
              >
                Re-authorize Spotify
              </button>
            )}
          </div>
        )}

        {/* Opponent */}
        <Section title="Opponent">
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(BOT_PERSONALITIES) as [Difficulty, typeof BOT_PERSONALITIES[Difficulty]][]).map(
              ([key, bot]) => (
                <button
                  key={key}
                  onClick={() => setConfig({ difficulty: key })}
                  className={`
                    flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all
                    ${config.difficulty === key
                      ? 'border-spotify bg-spotify/10 text-white'
                      : 'border-card-hover bg-card text-gray-400 active:bg-card-hover'
                    }
                  `}
                >
                  <span className="text-2xl">{bot.emoji}</span>
                  <span className="text-xs font-semibold">{bot.name}</span>
                </button>
              )
            )}
          </div>
        </Section>

        {/* Rounds */}
        <Section title="Rounds">
          <div className="flex gap-2">
            {ROUND_OPTIONS.map(n => (
              <button
                key={String(n)}
                onClick={() => setConfig({ rounds: n })}
                className={`
                  flex-1 py-2 rounded-xl text-sm font-semibold border transition-all
                  ${config.rounds === n
                    ? 'border-spotify bg-spotify/10 text-white'
                    : 'border-card-hover bg-card text-gray-400 active:bg-card-hover'
                  }
                `}
              >
                {n === null ? '∞' : n}
              </button>
            ))}
          </div>
        </Section>

        {/* Speed Mode */}
        <Section title="Speed Mode">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-white text-sm font-medium">Points by speed</p>
              <p className="text-gray-400 text-xs">Max 100 pts, min 10 pts</p>
            </div>
            <Toggle
              checked={config.speedMode}
              onChange={v => setConfig({ speedMode: v })}
            />
          </div>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider px-1">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative w-12 h-6 rounded-full transition-colors duration-200
        ${checked ? 'bg-spotify' : 'bg-card-hover'}
      `}
    >
      <span
        className={`
          absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-0'}
        `}
      />
    </button>
  )
}

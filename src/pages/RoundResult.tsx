import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentlyPlaying, SpotifyTrack } from '../api/spotify'
import { useGameStore, useScores } from '../store/gameStore'
import { BOT_PERSONALITIES, CategoryResult } from '../types/game'
import { CATEGORY_LABELS } from '../utils/options'

export function RoundResult() {
  const navigate = useNavigate()
  const {
    completedRounds,
    config,
    trackPool,
    endGame,
    startNextRound,
  } = useGameStore()
  const { userScore, botScore } = useScores()

  const [waitingForTrack, setWaitingForTrack] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const round = completedRounds[completedRounds.length - 1]
  const isLastRound = config.rounds !== null && completedRounds.length >= config.rounds
  const bot = BOT_PERSONALITIES[config.difficulty]

  function handleSkip() {
    if (pollRef.current) clearInterval(pollRef.current)
    const others = trackPool.filter(t => t.id !== round?.trackId)
    const pick = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : null
    doAdvance(pick)
  }

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  function doAdvance(newTrack: SpotifyTrack | null) {
    if (pollRef.current) clearInterval(pollRef.current)
    startNextRound(newTrack)
    navigate('/round', { replace: true })
  }

  async function handleAdvance() {
    if (isLastRound) {
      endGame()
      navigate('/gameover', { replace: true })
      return
    }

    try {
      const playing = await getCurrentlyPlaying()
      if (playing?.item && playing.item.id !== round?.trackId) {
        const inPool = trackPool.some(t => t.id === playing.item!.id)
        doAdvance(inPool ? playing.item : null)
      } else {
        setWaitingForTrack(true)
        pollRef.current = setInterval(async () => {
          try {
            const p = await getCurrentlyPlaying()
            if (p?.item && p.item.id !== round?.trackId) {
              const inPool = trackPool.some(t => t.id === p.item!.id)
              doAdvance(inPool ? p.item : null)
            }
          } catch { /* keep polling */ }
        }, 3000)
      }
    } catch {
      doAdvance(null)
    }
  }

  if (!round) return null

  const userPoints = round.userPoints
  const botPoints = round.botPoints
  const userWon = userPoints > botPoints
  const botWon = botPoints > userPoints

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto">
      <header className="pt-12 pb-4 px-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider">
          Round {completedRounds.length}
          {config.rounds ? ` of ${config.rounds}` : ''}
        </p>
        <h2 className={`text-lg font-bold mt-0.5 ${
          userWon ? 'text-spotify' :
          botWon ? 'text-red-400' :
          'text-white'
        }`}>
          {userWon ? 'You win this round!' :
           botWon ? `${bot.emoji} ${bot.name} wins this round` :
           'Tied this round!'}
        </h2>
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 pb-6 animate-fade-in">
        {/* Song detail card */}
        <div className="bg-card rounded-2xl p-4 flex gap-3">
          {round.albumArtUrl && (
            <img
              src={round.albumArtUrl}
              alt="Album art"
              className="w-16 h-16 rounded-xl flex-shrink-0 object-cover"
            />
          )}
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{round.trackName}</p>
            <p className="text-gray-400 text-xs truncate">{round.artistName}</p>
            <p className="text-gray-500 text-xs truncate">{round.albumName} · {round.releaseYear}</p>
          </div>
        </div>

        {/* Per-category results */}
        {round.results.map(result => (
          <CategoryResultCard
            key={result.category}
            result={result}
            botLabel={`${bot.emoji} ${bot.name}`}
            speedMode={config.speedMode}
          />
        ))}

        {/* Running totals */}
        <div className="bg-card rounded-2xl p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Total Score</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-2xl font-extrabold text-white">{userScore}</p>
              <p className="text-xs text-gray-400">You</p>
            </div>
            <span className="text-gray-600 font-bold">vs</span>
            <div className="flex-1 text-center">
              <p className="text-2xl font-extrabold text-white">{botScore}</p>
              <p className="text-xs text-gray-400">{bot.name}</p>
            </div>
          </div>
        </div>

        {/* Advance / waiting */}
        {waitingForTrack ? (
          <div className="flex flex-col gap-2">
            <div className="w-full bg-card rounded-2xl py-4 px-6 flex items-center justify-center gap-3">
              <span className="w-4 h-4 border-2 border-spotify border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-gray-400 text-sm">Waiting for next track…</span>
            </div>
            <button
              onClick={handleSkip}
              className="w-full bg-card hover:bg-card-hover active:scale-95 transition-all text-gray-300 font-semibold py-3 rounded-2xl text-sm"
            >
              Skip →
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdvance}
            className="w-full bg-spotify hover:bg-spotify-dark active:scale-95 transition-all text-white font-bold py-4 rounded-2xl text-base"
          >
            {isLastRound ? 'See Final Results' : 'Next Round'}
          </button>
        )}
      </main>
    </div>
  )
}

interface CategoryResultCardProps {
  result: CategoryResult
  botLabel: string
  speedMode: boolean
}

function CategoryResultCard({ result, botLabel, speedMode }: CategoryResultCardProps) {
  const userAnswer = result.options.find(o => o.id === result.userAnswerId)
  const botAnswer = result.options.find(o => o.id === result.botAnswerId)

  return (
    <div className="bg-card rounded-2xl p-4">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">
        {CATEGORY_LABELS[result.category]}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <MiniResultCard
          label="You"
          answer={userAnswer?.label ?? '—'}
          correct={result.userCorrect}
          unanswered={result.userAnswerId === null}
          elapsedMs={result.userElapsedMs}
          speedMode={speedMode}
        />
        <MiniResultCard
          label={botLabel}
          answer={botAnswer?.label ?? '—'}
          correct={result.botCorrect}
          unanswered={result.botAnswerId === null}
          elapsedMs={null}
          speedMode={false}
        />
      </div>
    </div>
  )
}

interface MiniResultCardProps {
  label: string
  answer: string
  correct: boolean
  unanswered: boolean
  elapsedMs: number | null
  speedMode: boolean
}

function MiniResultCard({ label, answer, correct, unanswered, elapsedMs, speedMode }: MiniResultCardProps) {
  return (
    <div className={`rounded-xl p-3 border ${
      unanswered
        ? 'bg-card-hover border-transparent'
        : correct
        ? 'bg-spotify/10 border-spotify/40'
        : 'bg-red-500/10 border-red-500/30'
    }`}>
      <p className="text-xs text-gray-400 mb-1 truncate">{label}</p>
      <p className={`text-xl font-extrabold ${
        unanswered ? 'text-gray-600' : correct ? 'text-spotify' : 'text-red-400'
      }`}>
        {unanswered ? '—' : correct ? '✓' : '✗'}
      </p>
      <p className="text-white text-xs font-semibold truncate mt-1">{answer}</p>
      {speedMode && elapsedMs !== null && (
        <p className="text-gray-500 text-xs">{(elapsedMs / 1000).toFixed(1)}s</p>
      )}
    </div>
  )
}

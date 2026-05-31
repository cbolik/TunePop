import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProgressRing } from '../components/ProgressRing'
import { getCurrentlyPlaying, SpotifyTrack } from '../api/spotify'
import { useGameStore, useScores } from '../store/gameStore'
import { BOT_PERSONALITIES } from '../types/game'
import { getViableCategories, randomCategoryFrom } from '../utils/options'

const AUTO_ADVANCE_SECS = 4

export function RoundResult() {
  const navigate = useNavigate()
  const {
    completedRounds,
    config,
    trackPool,
    currentTrack,
    endGame,
    startNextRound,
    setNextRoundData,
  } = useGameStore()
  const { userScore, botScore } = useScores()

  const [countdown, setCountdown] = useState(AUTO_ADVANCE_SECS)
  const [waitingForTrack, setWaitingForTrack] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const round = completedRounds[completedRounds.length - 1]
  const isLastRound = config.rounds !== null && completedRounds.length >= config.rounds
  const bot = BOT_PERSONALITIES[config.difficulty]

  // Countdown timer — pauses when waiting for next track
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          handleAdvance()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  function doAdvance(newTrack: SpotifyTrack | null) {
    if (timerRef.current) clearInterval(timerRef.current)
    if (pollRef.current) clearInterval(pollRef.current)

    if (newTrack) {
      const viable = getViableCategories(newTrack, trackPool)
      setNextRoundData({ track: newTrack, category: randomCategoryFrom(viable) })
    }

    startNextRound(currentTrack!)
    navigate('/round', { replace: true })
  }

  async function handleAdvance() {
    if (timerRef.current) clearInterval(timerRef.current)

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
        // Same track still playing — wait for it to change
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

  const userWon = round.userCorrect && !round.botCorrect
  const botWon = round.botCorrect && !round.userCorrect
  const bothCorrect = round.userCorrect && round.botCorrect
  const noneCorrect = !round.userCorrect && !round.botCorrect

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto">
      <header className="pt-12 pb-4 px-4 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider">
            Round {completedRounds.length}
            {config.rounds ? ` of ${config.rounds}` : ''}
          </p>
          <h2 className={`text-lg font-bold mt-0.5 ${
            userWon ? 'text-spotify' :
            botWon ? 'text-red-400' :
            'text-white'
          }`}>
            {userWon ? 'You got it!' :
             botWon ? `${bot.emoji} ${bot.name} wins this round` :
             bothCorrect ? 'Both correct!' :
             noneCorrect ? 'Tough one!' : ''}
          </h2>
        </div>
        {!waitingForTrack && (
          <button onClick={handleAdvance}>
            <ProgressRing seconds={countdown} total={AUTO_ADVANCE_SECS} />
          </button>
        )}
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

        {/* Scores comparison */}
        <div className="grid grid-cols-2 gap-3">
          <ResultCard
            label="You"
            correct={round.userCorrect}
            points={round.userPoints}
            answer={round.options.find(o => o.id === round.userAnswerId)?.label ?? '—'}
            speedMode={config.speedMode}
            elapsedMs={round.userElapsedMs}
          />
          <ResultCard
            label={`${bot.emoji} ${bot.name}`}
            correct={round.botCorrect}
            points={round.botPoints}
            answer={round.options.find(o => o.id === round.botAnswerId)?.label ?? '—'}
            speedMode={config.speedMode}
            elapsedMs={null}
          />
        </div>

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
          <div className="w-full bg-card rounded-2xl py-4 px-6 flex items-center justify-center gap-3">
            <span className="w-4 h-4 border-2 border-spotify border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-gray-400 text-sm">Waiting for next track…</span>
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

interface ResultCardProps {
  label: string
  correct: boolean
  points: number
  answer: string
  speedMode: boolean
  elapsedMs: number | null
}

function ResultCard({ label, correct, points, answer, speedMode, elapsedMs }: ResultCardProps) {
  return (
    <div className={`rounded-2xl p-3 border ${
      correct ? 'bg-spotify/10 border-spotify/40' : 'bg-red-500/10 border-red-500/30'
    }`}>
      <p className="text-xs text-gray-400 mb-1 truncate">{label}</p>
      <p className={`text-2xl font-extrabold ${correct ? 'text-spotify' : 'text-red-400'}`}>
        {correct ? '✓' : '✗'}
      </p>
      <p className="text-white text-xs font-semibold truncate mt-1">{answer}</p>
      {speedMode && elapsedMs !== null && (
        <p className="text-gray-500 text-xs">{(elapsedMs / 1000).toFixed(1)}s</p>
      )}
      <p className="text-gray-400 text-xs mt-1">+{points} pts</p>
    </div>
  )
}

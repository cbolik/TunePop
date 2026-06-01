import { Navigate, useNavigate } from 'react-router-dom'
import { useGameStore, useScores } from '../store/gameStore'
import { BOT_PERSONALITIES } from '../types/game'

export function GameOver() {
  const navigate = useNavigate()
  const { config, completedRounds, resetToSetup } = useGameStore()
  const { userScore, botScore } = useScores()
  const bot = BOT_PERSONALITIES[config.difficulty]

  if (completedRounds.length === 0) return <Navigate to="/setup" replace />

  const allResults = completedRounds.flatMap(r => r.results)
  const userCorrect = allResults.filter(r => r.userCorrect).length
  const botCorrect = allResults.filter(r => r.botCorrect).length
  const total = allResults.length
  // Accuracy wins overall; speed score only breaks ties
  const userWins = userCorrect > botCorrect ||
    (userCorrect === botCorrect && userScore > botScore)
  const tied = userCorrect === botCorrect && userScore === botScore

  function handlePlayAgain() {
    resetToSetup()
    navigate('/setup', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto">
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-12 animate-fade-in">
        {/* Winner announcement */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-6xl">{tied ? '🤝' : userWins ? '🏆' : bot.emoji}</span>
          <h1 className="text-3xl font-extrabold text-white mt-2">
            {tied ? "It's a tie!" : userWins ? 'You win!' : `${bot.name} wins!`}
          </h1>
          <p className="text-gray-400 text-sm">
            {tied
              ? 'Great minds think alike.'
              : userWins
              ? `You beat ${bot.name} — well played!`
              : `${bot.tagline}.`}
          </p>
        </div>

        {/* Score breakdown */}
        <div className="w-full bg-card rounded-2xl p-5">
          <div className="flex items-end justify-center gap-6">
            <ScoreColumn
              label="You"
              score={userScore}
              correct={userCorrect}
              total={total}
              highlight={userWins || tied}
            />
            <span className="text-gray-600 font-bold text-xl mb-3">vs</span>
            <ScoreColumn
              label={`${bot.emoji} ${bot.name}`}
              score={botScore}
              correct={botCorrect}
              total={total}
              highlight={!userWins || tied}
            />
          </div>
        </div>

        {/* Round breakdown */}
        {completedRounds.length > 0 && (
          <div className="w-full bg-card rounded-2xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Round Breakdown</p>
            <div className="flex flex-col gap-2">
              {completedRounds.map((round, i) => {
                const rUserCorrect = round.results.filter(r => r.userCorrect).length
                const rBotCorrect = round.results.filter(r => r.botCorrect).length
                const rTotal = round.results.length
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 text-xs w-16">Round {i + 1}</span>
                    <span className="text-gray-300 text-xs flex-1 text-center truncate px-2">
                      {round.trackName}
                    </span>
                    <div className="flex gap-3">
                      <span className={`text-xs font-semibold ${rUserCorrect > rBotCorrect ? 'text-spotify' : 'text-gray-400'}`}>
                        {rUserCorrect}/{rTotal}
                      </span>
                      <span className={`text-xs font-semibold ${rBotCorrect > rUserCorrect ? 'text-spotify' : 'text-gray-400'}`}>
                        {rBotCorrect}/{rTotal}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <button
          onClick={handlePlayAgain}
          className="w-full bg-spotify hover:bg-spotify-dark active:scale-95 transition-all text-white font-bold py-4 rounded-2xl text-base"
        >
          Play Again
        </button>
      </main>
    </div>
  )
}

interface ScoreColumnProps {
  label: string
  score: number
  correct: number
  total: number
  highlight: boolean
}

function ScoreColumn({ label, score, correct, total, highlight }: ScoreColumnProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className={`text-4xl font-extrabold ${highlight ? 'text-spotify' : 'text-white'}`}>
        {score}
      </p>
      <p className="text-gray-400 text-xs">{correct}/{total} correct</p>
      <p className="text-gray-500 text-xs truncate max-w-[80px] text-center">{label}</p>
    </div>
  )
}

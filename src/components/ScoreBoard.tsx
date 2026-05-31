import { BOT_PERSONALITIES } from '../types/game'
import { useGameStore, useScores } from '../store/gameStore'

export function ScoreBoard() {
  const difficulty = useGameStore(s => s.config.difficulty)
  const { userScore, botScore } = useScores()
  const bot = BOT_PERSONALITIES[difficulty]
  const roundNumber = useGameStore(s => s.completedRounds.length + 1)
  const totalRounds = useGameStore(s => s.config.rounds)

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold text-white">{userScore}</span>
        <span className="text-xs text-gray-400">You</span>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-400 font-medium">
          Round {roundNumber}{totalRounds ? ` / ${totalRounds}` : ''}
        </p>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold text-white">{botScore}</span>
        <span className="text-xs text-gray-400">{bot.emoji} {bot.name}</span>
      </div>
    </div>
  )
}

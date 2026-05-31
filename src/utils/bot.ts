import { BOT_PERSONALITIES } from '../types/game'
import { Difficulty, RoundOption } from '../types/game'

export function getBotDelay(difficulty: Difficulty): number {
  const { minDelayMs, maxDelayMs } = BOT_PERSONALITIES[difficulty]
  return minDelayMs + Math.random() * (maxDelayMs - minDelayMs)
}

export function getBotAnswer(options: RoundOption[], difficulty: Difficulty): RoundOption {
  const { accuracy } = BOT_PERSONALITIES[difficulty]
  const correct = options.find(o => o.isCorrect)

  if (correct && Math.random() < accuracy) {
    return correct
  }

  const wrong = options.filter(o => !o.isCorrect)
  return wrong[Math.floor(Math.random() * wrong.length)] ?? options[0]
}

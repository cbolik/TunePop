import { BOT_PERSONALITIES, Difficulty } from '../types/game'

interface Props {
  difficulty: Difficulty
  phase: 'thinking' | 'locked' | 'idle'
}

export function BotAvatar({ difficulty, phase }: Props) {
  const bot = BOT_PERSONALITIES[difficulty]

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card rounded-2xl">
      <span className="text-3xl">{bot.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm leading-tight">{bot.name}</p>
        <p className="text-gray-400 text-xs truncate">{bot.tagline}</p>
      </div>
      <div className="flex items-center justify-center w-16">
        {phase === 'thinking' && <ThinkingDots />}
        {phase === 'locked' && (
          <span className="text-xs font-semibold text-spotify uppercase tracking-wide">
            Locked in
          </span>
        )}
        {phase === 'idle' && null}
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )
}

interface Props {
  label: string
  imageUrl?: string
  state: 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed'
  onClick?: () => void
  disabled?: boolean
}

const textStateClasses: Record<Props['state'], string> = {
  default:  'bg-card border border-transparent active:bg-card-hover',
  selected: 'bg-card border border-spotify',
  correct:  'bg-spotify/20 border border-spotify',
  wrong:    'bg-red-500/20 border border-red-500',
  dimmed:   'bg-card border border-transparent opacity-40',
}

const imageBorderClasses: Record<Props['state'], string> = {
  default:  'border-2 border-transparent active:border-white/30',
  selected: 'border-2 border-spotify',
  correct:  'border-4 border-spotify',
  wrong:    'border-4 border-red-500',
  dimmed:   'border-2 border-transparent opacity-40',
}

const iconForState: Record<Props['state'], string | null> = {
  default:  null,
  selected: null,
  correct:  '✓',
  wrong:    '✗',
  dimmed:   null,
}

export function OptionCard({ label, imageUrl, state, onClick, disabled }: Props) {
  const isInteractive = !disabled && state === 'default'

  if (imageUrl) {
    return (
      <button
        onClick={onClick}
        disabled={disabled || state === 'dimmed'}
        className={`
          aspect-square rounded-xl overflow-hidden relative transition-all duration-200
          ${imageBorderClasses[state]}
          ${isInteractive ? 'cursor-pointer' : 'cursor-default'}
        `}
      >
        <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
        {iconForState[state] && (
          <div className={`absolute inset-0 flex items-center justify-center ${
            state === 'correct' ? 'bg-spotify/40' : 'bg-red-500/40'
          }`}>
            <span className="text-5xl font-extrabold text-white drop-shadow-lg">
              {iconForState[state]}
            </span>
          </div>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || state === 'dimmed'}
      className={`
        w-full min-h-[56px] rounded-xl px-4 py-3 text-left transition-all duration-200
        flex items-center justify-between gap-2
        ${textStateClasses[state]}
        ${isInteractive ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <span className={`text-sm font-medium leading-snug ${
        state === 'dimmed' ? 'text-gray-500' : 'text-white'
      }`}>
        {label}
      </span>
      {iconForState[state] && (
        <span className={`text-base font-bold flex-shrink-0 ${
          state === 'correct' ? 'text-spotify' : 'text-red-400'
        }`}>
          {iconForState[state]}
        </span>
      )}
    </button>
  )
}

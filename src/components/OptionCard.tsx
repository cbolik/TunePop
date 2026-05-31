interface Props {
  label: string
  state: 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed'
  onClick?: () => void
  disabled?: boolean
}

const stateClasses: Record<Props['state'], string> = {
  default:  'bg-card border border-transparent active:bg-card-hover',
  selected: 'bg-card border border-spotify',
  correct:  'bg-spotify/20 border border-spotify',
  wrong:    'bg-red-500/20 border border-red-500',
  dimmed:   'bg-card border border-transparent opacity-40',
}

const iconForState: Record<Props['state'], string | null> = {
  default:  null,
  selected: null,
  correct:  '✓',
  wrong:    '✗',
  dimmed:   null,
}

export function OptionCard({ label, state, onClick, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || state === 'dimmed'}
      className={`
        w-full min-h-[56px] rounded-xl px-4 py-3 text-left transition-all duration-200
        flex items-center justify-between gap-2
        ${stateClasses[state]}
        ${!disabled && state === 'default' ? 'cursor-pointer' : 'cursor-default'}
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

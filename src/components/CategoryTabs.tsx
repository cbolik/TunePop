import { Category } from '../types/game'
import { CATEGORIES, CATEGORY_LABELS } from '../utils/options'

interface Props {
  active: Category
  onChange: (category: Category) => void
  disabled?: boolean
  viableCategories?: Category[]
  answeredCategories?: Category[]
  botLockedCategories?: Category[]
}

export function CategoryTabs({ active, onChange, disabled, viableCategories, answeredCategories, botLockedCategories }: Props) {
  const visible = viableCategories ?? CATEGORIES

  return (
    <div className="flex gap-1 bg-card rounded-xl p-1">
      {visible.map(cat => {
        const answered = answeredCategories?.includes(cat) ?? false
        // Bot-locked only matters if the user hasn't already answered this tab
        const botLocked = !answered && (botLockedCategories?.includes(cat) ?? false)
        const interactive = !disabled && !botLocked

        return (
          <button
            key={cat}
            onClick={() => interactive && onChange(cat)}
            disabled={disabled}
            className={`
              flex-1 py-2 px-1 rounded-lg text-xs font-semibold transition-colors relative
              ${active === cat
                ? 'bg-spotify text-white'
                : botLocked
                ? 'text-gray-500 opacity-50'
                : answered
                ? 'text-spotify hover:text-white active:bg-card-hover'
                : 'text-gray-400 hover:text-white active:bg-card-hover'
              }
              ${interactive ? 'cursor-pointer' : 'cursor-default'}
            `}
          >
            {CATEGORY_LABELS[cat]}
            {botLocked && active !== cat && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-400 rounded-full" />
            )}
            {answered && active !== cat && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-spotify rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}

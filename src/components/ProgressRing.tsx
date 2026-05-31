interface Props {
  seconds: number
  total: number
  size?: number
}

export function ProgressRing({ seconds, total, size = 48 }: Props) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const progress = seconds / total
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3E3E3E"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1DB954"
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-white">{seconds}</span>
    </div>
  )
}

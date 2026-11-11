import type { TrendStats } from '../../types'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Format a UTC day stamp without letting the browser's timezone re-date it. */
function formatUtcDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function Tile({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div
      className="rounded-xl border-3 border-black p-4"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-subtle)' }}
    >
      <p
        className="text-xs font-bold uppercase tracking-wider mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
      >
        {label}
      </p>
      <p
        className="text-3xl font-bold leading-none"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        {value}
      </p>
      <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {detail}
      </p>
    </div>
  )
}

export default function StatTiles({
  stats,
  dimmed = false,
}: {
  stats: TrendStats
  dimmed?: boolean
}) {
  const {
    days_in_period,
    active_days,
    avg_points_per_day,
    avg_points_per_active_day,
    avg_points_per_week,
    best_day,
    best_day_points,
  } = stats

  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        opacity: dimmed ? 0.6 : 1,
        transition: 'opacity 120ms linear',
      }}
    >
      <Tile
        label="Avg / day"
        value={trim(avg_points_per_day)}
        detail={`across ${days_in_period} ${days_in_period === 1 ? 'day' : 'days'}`}
      />
      <Tile
        label="Avg / week"
        value={trim(avg_points_per_week)}
        detail="points per 7 days"
      />
      <Tile
        label="Active days"
        value={`${active_days}/${days_in_period}`}
        detail={
          active_days > 0
            ? `${trim(avg_points_per_active_day)} pts on days you shipped`
            : 'no completed work yet'
        }
      />
      <Tile
        label="Best day"
        value={best_day ? formatUtcDay(best_day) : '—'}
        detail={best_day ? `${best_day_points} points` : 'no completed work yet'}
      />
    </div>
  )
}

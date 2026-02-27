export default function ProjectChip({ project, colorClass }: { project: any, colorClass?: string }) {
  const daysUntilMilestone = (() => {
    if (!project?.milestone_due_at) return null
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const due = new Date(project.milestone_due_at)
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    return Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  })()

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border-2 border-black font-medium ${colorClass || 'bg-blue-100 text-blue-800'}`}
         style={{ fontFamily: 'var(--font-body)', boxShadow: '1px 1px 0px var(--color-border)' }}>
      <div
        className="w-2.5 h-2.5 rounded-sm border border-black"
        style={{ backgroundColor: project?.color || '#3B82F6' }}
      />
      <span>{project?.name || 'Unknown Project'}</span>
      {daysUntilMilestone !== null && daysUntilMilestone <= 14 && daysUntilMilestone >= 0 && (
        <span className="text-xs border border-black px-1.5 py-0.5 rounded-md ml-1 font-bold"
              style={{ background: 'var(--color-secondary)', color: 'var(--color-text)' }}>
          {daysUntilMilestone === 0 ? 'Today' :
           daysUntilMilestone === 1 ? '1d' :
           `${daysUntilMilestone}d`}
        </span>
      )}
    </div>
  );
}

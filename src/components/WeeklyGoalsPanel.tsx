import { Target, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { Goal, GoalStatus } from '../types';

interface WeeklyGoalsPanelProps {
  goals: Goal[];
  onGoalClick?: (goalId: string) => void;
}

function getStatusColor(status?: GoalStatus | null): { bg: string; text: string; icon: React.ElementType } {
  switch (status) {
    case 'on_target':
      return { bg: 'var(--color-accent)', text: 'white', icon: CheckCircle2 };
    case 'at_risk':
      return { bg: 'var(--color-secondary)', text: 'var(--color-text)', icon: AlertTriangle };
    case 'off_target':
      return { bg: 'var(--color-primary)', text: 'white', icon: XCircle };
    default:
      return { bg: 'var(--color-surface)', text: 'var(--color-text-muted)', icon: Target };
  }
}

function WeeklyGoalCard({ goal, onClick }: { goal: Goal; onClick?: (goalId: string) => void }) {
  const statusInfo = getStatusColor(goal.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div
      className="card-brutal rounded-lg p-3 cursor-pointer transition-all hover:translate-y-[-2px] h-full"
      onClick={() => onClick?.(goal.id)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-sm flex-1 line-clamp-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          {goal.title}
        </h4>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md border-2 border-black text-xs font-bold flex-shrink-0"
             style={{ background: statusInfo.bg, color: statusInfo.text, fontFamily: 'var(--font-display)' }}>
          <StatusIcon size={10} />
        </div>
      </div>

      {goal.description && (
        <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
          {goal.description}
        </p>
      )}

      {goal.end_date && (
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="px-2 py-0.5 rounded-md border border-black text-xs"
                style={{ background: 'var(--color-background)', color: 'var(--color-text)' }}>
            📅 {new Date(goal.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  );
}

export default function WeeklyGoalsPanel({ goals, onGoalClick }: WeeklyGoalsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Only show weekly goals
  const weeklyGoals = goals.filter(goal => goal.type === 'weekly');

  if (weeklyGoals.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="card-brutal rounded-xl p-4"
           style={{ background: 'var(--color-surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md flex items-center justify-center border-2 border-black"
                 style={{ background: 'var(--color-accent)' }}>
              <Target size={16} color="white" />
            </div>
            <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Weekly Goals
            </h3>
            <span className="text-xs font-bold rounded-md px-2 py-1 border-2 border-black"
                  style={{ background: 'var(--color-secondary)', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
              {weeklyGoals.length}
            </span>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md border-2 border-black transition-all hover:translate-y-[-2px]"
            style={{ background: 'var(--color-surface)', boxShadow: '2px 2px 0px var(--color-border)' }}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {/* Goals Horizontal Scroll */}
        {!isCollapsed && (
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3 pb-2 min-w-min">
              {weeklyGoals.map(goal => (
                <div key={goal.id} className="w-72 flex-shrink-0">
                  <WeeklyGoalCard
                    goal={goal}
                    onClick={onGoalClick}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

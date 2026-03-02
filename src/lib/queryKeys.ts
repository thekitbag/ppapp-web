export const qk = {
  tasks: {
    all: ['tasks'] as const,
    byStatuses: (statuses: string[]) => ['tasks', statuses] as const,
    byId: (id: string) => ['tasks', { id }] as const,
  },
  recs: {
    all: ['recs'] as const,
    week: ['recs', 'week'] as const,
    suggestWeek: ['recs', 'suggest-week'] as const,
  },
  projects: {
    all: ['projects'] as const,
  },
  goals: {
    all: ['goals'] as const,
    tree: ['goals', 'tree'] as const,
    byType: (type: string, parentId?: string) => ['goals', 'type', type, parentId] as const,
    detail: (id: string) => ['goals', id] as const,
  },
  reports: {
    summary: (params: { start_date: string; end_date: string }) =>
      ['reports', 'summary', params] as const,
    breakdown: (params: { start_date: string; end_date: string }, parentGoalId?: string) =>
      ['reports', 'breakdown', params, parentGoalId ?? null] as const,
  },
};

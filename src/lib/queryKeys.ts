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
  },
};

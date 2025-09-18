import { TaskStatus } from './types';

export const STATUS_ORDER: TaskStatus[] = ['backlog', 'week', 'today', 'doing', 'waiting', 'done'];
export const BUCKETS: TaskStatus[] = ['backlog', 'week', 'today', 'doing', 'waiting'];

export function midpoint(prev?: number, next?: number): number {
  if (prev === undefined && next === undefined) return 1000;
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}

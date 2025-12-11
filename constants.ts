import { TaskType, TaskPriority } from "./types";

export const COLORS = {
  IDLE: 'text-slate-400 border-slate-700 bg-slate-900',
  RUNNING: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  WAITING: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  CRITICAL: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  FINISHED: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
};

export const PRIORITY_COLORS = {
  [TaskPriority.LOW]: 'text-slate-400 border-slate-600',
  [TaskPriority.MEDIUM]: 'text-blue-400 border-blue-500',
  [TaskPriority.HIGH]: 'text-orange-400 border-orange-500',
};

export const TASK_CONFIG = {
  [TaskType.COMPUTE]: {
    color: 'bg-blue-500',
    label: 'Compute (CPU)',
    durationMin: 20,
    durationMax: 40,
    requiresLock: false
  },
  [TaskType.IO_BOUND]: {
    color: 'bg-violet-500',
    label: 'I/O Wait',
    durationMin: 30,
    durationMax: 60,
    requiresLock: false
  },
  [TaskType.CRITICAL_DB]: {
    color: 'bg-rose-500',
    label: 'DB Write (Mutex)',
    durationMin: 40,
    durationMax: 80,
    requiresLock: true
  }
};

export const MAX_THREADS = 6;
export const MAX_LOGS = 50;

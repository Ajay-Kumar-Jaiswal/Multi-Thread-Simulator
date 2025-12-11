export enum ThreadState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  WAITING_LOCK = 'WAITING_LOCK', // Blocked trying to enter critical section
  CRITICAL = 'CRITICAL', // Inside critical section (holding lock)
  FINISHED = 'FINISHED'
}

export enum TaskType {
  COMPUTE = 'COMPUTE',
  IO_BOUND = 'IO_BOUND',
  CRITICAL_DB = 'CRITICAL_DB' // Requires Mutex
}

export interface Task {
  id: string;
  type: TaskType;
  totalDuration: number;
  remainingDuration: number;
  criticalSectionStart?: number; // At what progress tick does it need the lock?
  criticalSectionDuration?: number; // How long does it hold the lock?
  color: string;
}

export interface Thread {
  id: number;
  state: ThreadState;
  currentTask: Task | null;
  history: string[]; // Recent log history specific to this thread
  blockedDuration: number; // How many ticks has this thread been waiting?
}

export interface LogEntry {
  id: string;
  timestamp: string;
  threadId?: number;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface SimulationState {
  threads: Thread[];
  taskQueue: Task[];
  mutexOwner: number | null; // Thread ID that holds the lock
  mutexWaitQueue: number[]; // Queue of thread IDs waiting for lock
  logs: LogEntry[];
  clock: number;
  isRunning: boolean;
  speedMs: number;
  showLegend: boolean;
}
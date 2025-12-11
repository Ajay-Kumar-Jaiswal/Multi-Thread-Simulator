import React, { useEffect, useReducer } from 'react';
import { Play, Pause, FastForward, Plus, RefreshCw, Layers, Zap, Database, Network, HelpCircle, X, Trash2 } from 'lucide-react';
import ThreadColumn from './components/ThreadColumn';
import SharedResources from './components/SharedResources';
import Terminal from './components/Terminal';
import { Task, TaskType, ThreadState, SimulationState, LogEntry, Thread } from './types';
import { MAX_THREADS, TASK_CONFIG, MAX_LOGS } from './constants';

// --- Simulation Logic ---

const generateTask = (forcedType?: TaskType): Task => {
  const types = Object.values(TaskType);
  const type = forcedType || types[Math.floor(Math.random() * types.length)];
  const config = TASK_CONFIG[type];
  const duration = Math.floor(Math.random() * (config.durationMax - config.durationMin + 1)) + config.durationMin;
  
  // Critical sections usually happen in the middle of a task
  let critStart, critDur;
  if (config.requiresLock) {
    critDur = Math.floor(duration * 0.6); // Lock for 60% of time
    critStart = Math.floor((duration - critDur) / 2);
  }

  return {
    id: `TASK-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    type,
    totalDuration: duration,
    remainingDuration: duration,
    criticalSectionStart: critStart,
    criticalSectionDuration: critDur,
    color: config.color
  };
};

const initialState: SimulationState = {
  threads: Array.from({ length: 4 }, (_, i) => ({ 
    id: i + 1, 
    state: ThreadState.IDLE, 
    currentTask: null, 
    history: [],
    blockedDuration: 0
  })),
  taskQueue: [],
  mutexOwner: null,
  mutexWaitQueue: [],
  logs: [],
  clock: 0,
  isRunning: false,
  speedMs: 200,
  showLegend: false
};

type Action = 
  | { type: 'TICK' }
  | { type: 'TOGGLE_RUN' }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'ADD_THREAD' }
  | { type: 'REMOVE_THREAD' }
  | { type: 'ADD_TASK'; payload?: TaskType }
  | { type: 'STRESS_TEST' }
  | { type: 'TOGGLE_LEGEND' }
  | { type: 'RESET' };

const simulationReducer = (state: SimulationState, action: Action): SimulationState => {
  const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + "." + new Date().getMilliseconds().toString().slice(0, 2);
  
  const addLog = (msg: string, type: LogEntry['type'] = 'info', threadId?: number): LogEntry => ({
    id: Math.random().toString(36),
    timestamp: now,
    message: msg,
    type,
    threadId
  });

  const pushLog = (existingLogs: LogEntry[], newLog: LogEntry) => [...existingLogs, newLog].slice(-MAX_LOGS);

  switch (action.type) {
    case 'TOGGLE_RUN':
      return { ...state, isRunning: !state.isRunning };
    
    case 'TOGGLE_LEGEND':
      return { ...state, showLegend: !state.showLegend };

    case 'SET_SPEED':
      return { ...state, speedMs: action.payload };

    case 'ADD_TASK': {
      const newTask = generateTask(action.payload);
      return {
        ...state,
        taskQueue: [...state.taskQueue, newTask],
        logs: pushLog(state.logs, addLog(`Queueing ${newTask.type} (${newTask.id})`, 'info'))
      };
    }

    case 'STRESS_TEST': {
      const newTasks = Array.from({ length: 5 }, () => generateTask(TaskType.CRITICAL_DB));
      return {
        ...state,
        taskQueue: [...state.taskQueue, ...newTasks],
        logs: pushLog(state.logs, addLog(`⚠ INJECTING HIGH CONTENTION LOAD`, 'warning'))
      };
    }

    case 'ADD_THREAD':
      if (state.threads.length >= MAX_THREADS) return state;
      const newThreadId = state.threads.length > 0 ? Math.max(...state.threads.map(t => t.id)) + 1 : 1;
      return {
        ...state,
        threads: [...state.threads, { id: newThreadId, state: ThreadState.IDLE, currentTask: null, history: [], blockedDuration: 0 }],
        logs: pushLog(state.logs, addLog(`Thread #${newThreadId} spawned.`, 'success'))
      };

    case 'REMOVE_THREAD':
      if (state.threads.length <= 1) return state;
      const tToRemove = state.threads[state.threads.length - 1];
      // If holding lock, release it
      let newMutexOwner = state.mutexOwner;
      let newWaitQueue = state.mutexWaitQueue;
      let extraLog = null;
      
      if (state.mutexOwner === tToRemove.id) {
        newMutexOwner = null;
        extraLog = addLog(`Thread #${tToRemove.id} killed holding Mutex! Lock released.`, 'error');
        if (newWaitQueue.length > 0) {
             const nextThread = newWaitQueue[0];
             newWaitQueue = newWaitQueue.slice(1);
             newMutexOwner = nextThread; 
        }
      }

      if (newWaitQueue.includes(tToRemove.id)) {
        newWaitQueue = newWaitQueue.filter(id => id !== tToRemove.id);
      }

      let nextLogs = pushLog(state.logs, addLog(`Thread #${tToRemove.id} terminated.`, 'warning'));
      if (extraLog) nextLogs = pushLog(nextLogs, extraLog);

      return {
        ...state,
        threads: state.threads.slice(0, -1),
        mutexOwner: newMutexOwner,
        mutexWaitQueue: newWaitQueue,
        logs: nextLogs
      };

    case 'RESET':
      return initialState;

    case 'TICK':
      // Deep Copy
      let threads = state.threads.map(t => ({ ...t, history: [...t.history] }));
      let queue = [...state.taskQueue];
      let mutexOwner = state.mutexOwner;
      let waitQueue = [...state.mutexWaitQueue];
      let logs = [...state.logs];

      threads.forEach(thread => {
        // Track wait time
        if (thread.state === ThreadState.WAITING_LOCK) {
          thread.blockedDuration += 1;
        }

        // 1. If Idle, pick up task
        if (thread.state === ThreadState.IDLE || thread.state === ThreadState.FINISHED) {
           if (queue.length > 0) {
              const task = queue.shift()!;
              thread.currentTask = task;
              thread.state = ThreadState.RUNNING;
              thread.blockedDuration = 0;
              thread.history.push(`Started ${task.id}`);
              logs = pushLog(logs, addLog(`Picked up ${task.id}`, 'info', thread.id));
           } else {
             thread.state = ThreadState.IDLE;
           }
           return; 
        }

        // 2. Process Task
        if (thread.currentTask) {
           const task = thread.currentTask;
           const currentProgress = task.totalDuration - task.remainingDuration;

           // CHECK LOCK REQUIREMENTS
           if (task.type === TaskType.CRITICAL_DB && task.criticalSectionStart !== undefined) {
              const needsLockNow = currentProgress >= task.criticalSectionStart;
              const finishedLock = currentProgress >= (task.criticalSectionStart + (task.criticalSectionDuration || 0));

              if (needsLockNow && !finishedLock) {
                 // Needs Lock
                 if (thread.state !== ThreadState.CRITICAL) {
                    // Try to acquire
                    if (mutexOwner === null || mutexOwner === thread.id) {
                       mutexOwner = thread.id;
                       thread.state = ThreadState.CRITICAL;
                       thread.history.push(`ACQUIRED MUTEX`);
                       logs = pushLog(logs, addLog(`Acquired Lock`, 'warning', thread.id));
                    } else {
                       // Locked
                       if (thread.state !== ThreadState.WAITING_LOCK) {
                         thread.state = ThreadState.WAITING_LOCK;
                         if (!waitQueue.includes(thread.id)) waitQueue.push(thread.id);
                         thread.history.push(`BLOCKED by #${mutexOwner}`);
                         logs = pushLog(logs, addLog(`Blocked by Thread #${mutexOwner}`, 'warning', thread.id));
                       }
                       return; // STOP EXECUTION
                    }
                 }
              } else if (finishedLock && thread.state === ThreadState.CRITICAL) {
                 // Release Lock
                 mutexOwner = null;
                 thread.state = ThreadState.RUNNING;
                 thread.history.push(`RELEASED MUTEX`);
                 logs = pushLog(logs, addLog(`Released Lock`, 'success', thread.id));
                 
                 // Wake next
                 if (waitQueue.length > 0) {
                    const nextId = waitQueue.shift()!;
                    mutexOwner = nextId; 
                 }
              }
           }

           // DO WORK
           task.remainingDuration--;
           
           if (task.remainingDuration <= 0) {
              thread.state = ThreadState.FINISHED;
              thread.currentTask = null;
              thread.history.push(`Completed ${task.id}`);
              logs = pushLog(logs, addLog(`Task ${task.id} Completed`, 'success', thread.id));
              
              // Failsafe release
              if (mutexOwner === thread.id) {
                 mutexOwner = null;
                 if (waitQueue.length > 0) mutexOwner = waitQueue.shift()!;
              }
           }
        }
      });

      return {
        ...state,
        threads,
        taskQueue: queue,
        mutexOwner,
        mutexWaitQueue: waitQueue,
        logs,
        clock: state.clock + 1
      };

    default:
      return state;
  }
};

// --- Components ---

const LegendModal = ({ onClose }: { onClose: () => void }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Visual Legend</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Zap size={16} className="text-emerald-400"/>
          </div>
          <div>
            <div className="font-bold text-emerald-400">Running</div>
            <div className="text-xs text-slate-400">Thread is actively executing CPU instructions.</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <HelpCircle size={16} className="text-amber-400"/>
          </div>
          <div>
            <div className="font-bold text-amber-400">Blocked (Waiting)</div>
            <div className="text-xs text-slate-400">Thread is stalled waiting for the Mutex lock.</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <Database size={16} className="text-rose-400"/>
          </div>
          <div>
            <div className="font-bold text-rose-400">Critical Section</div>
            <div className="text-xs text-slate-400">Thread holds the Lock and is modifying shared data.</div>
          </div>
        </div>
      </div>
      <div className="mt-6 text-xs text-slate-500 text-center">Click anywhere to close</div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [state, dispatch] = useReducer(simulationReducer, initialState);

  useEffect(() => {
    let interval: any;
    if (state.isRunning) {
      interval = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, state.speedMs);
    }
    return () => clearInterval(interval);
  }, [state.isRunning, state.speedMs]);

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const val = parseInt(e.target.value);
     // Slider value 0-100. 0 = 1000ms, 100 = 50ms
     const ms = 1000 - (val * 9.5); 
     dispatch({ type: 'SET_SPEED', payload: Math.max(50, ms) });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {state.showLegend && <LegendModal onClose={() => dispatch({ type: 'TOGGLE_LEGEND' })} />}

      {/* --- Navbar --- */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 shrink-0 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Layers className="text-indigo-400" size={24} />
          <h1 className="text-lg font-bold tracking-tight text-white">
            ThreadSim <span className="text-slate-500 font-normal">v1.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => dispatch({ type: 'TOGGLE_LEGEND' })}
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1"
          >
            <HelpCircle size={14} /> Legend
          </button>
          <div className="h-4 w-px bg-slate-700"></div>
          <div className="text-xs font-mono text-slate-500">
            Clock: {state.clock.toString().padStart(6, '0')}
          </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Controls & Queue */}
        <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/30">
          
          {/* Playback Controls */}
          <div className="p-4 border-b border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => dispatch({ type: 'TOGGLE_RUN' })}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-all ${state.isRunning ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'}`}
              >
                {state.isRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                {state.isRunning ? 'PAUSE' : 'RUN'}
              </button>
              <button 
                onClick={() => dispatch({ type: 'RESET' })}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                title="Reset Simulation"
              >
                <RefreshCw size={18} />
              </button>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400 font-medium uppercase tracking-wider">
                <span>Speed</span>
                <span>{state.speedMs < 100 ? 'TURBO' : `${state.speedMs}ms`}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                defaultValue="80"
                onChange={handleSpeedChange}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Task Injectors */}
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Injection</div>
            
            <button 
              onClick={() => dispatch({ type: 'ADD_TASK', payload: TaskType.COMPUTE })}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-blue-900/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Zap size={16} />
                <span className="font-medium">CPU Task</span>
              </div>
              <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
            </button>

            <button 
              onClick={() => dispatch({ type: 'ADD_TASK', payload: TaskType.IO_BOUND })}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-violet-900/50 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Network size={16} />
                <span className="font-medium">I/O Task</span>
              </div>
              <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
            </button>

            <button 
              onClick={() => dispatch({ type: 'ADD_TASK', payload: TaskType.CRITICAL_DB })}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-rose-900/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Database size={16} />
                <span className="font-medium">Critical Section</span>
              </div>
              <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
            </button>

            <div className="h-px bg-slate-800 my-2"></div>

            <button 
              onClick={() => dispatch({ type: 'STRESS_TEST' })}
              className="w-full p-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-center transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
            >
              <FastForward size={16} fill="currentColor" /> STRESS TEST
            </button>
            <p className="text-[10px] text-slate-500 text-center leading-tight">
              Injects 5 critical tasks instantly to force mutex contention.
            </p>
          </div>

          {/* Thread Manager */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Thread Pool</div>
             <div className="flex gap-2">
               <button 
                 onClick={() => dispatch({ type: 'ADD_THREAD' })}
                 disabled={state.threads.length >= MAX_THREADS}
                 className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded text-xs font-bold disabled:opacity-50 transition-colors"
               >
                 + ADD THREAD
               </button>
               <button 
                 onClick={() => dispatch({ type: 'REMOVE_THREAD' })}
                 disabled={state.threads.length <= 1}
                 className="px-3 bg-slate-800 hover:bg-rose-900/50 hover:text-rose-400 text-slate-400 rounded transition-colors disabled:opacity-50"
               >
                 <Trash2 size={16} />
               </button>
             </div>
          </div>
        </div>

        {/* Center: Visualization */}
        <div className="flex-1 flex flex-col bg-slate-950 relative">
          
          {/* Thread Columns */}
          <div className="flex-1 flex overflow-x-auto">
            {state.threads.map(thread => (
              <div key={thread.id} className="flex-1 min-w-[200px] max-w-sm">
                <ThreadColumn thread={thread} />
              </div>
            ))}
            {/* Empty State / Add Placeholders if few threads */}
            {state.threads.length < 3 && (
              <div className="flex-1 border-r border-slate-800/50 bg-slate-950/50 flex items-center justify-center">
                 <div className="text-slate-800 font-bold text-4xl select-none">Void</div>
              </div>
            )}
          </div>

          {/* Shared Resources (Mutex) */}
          <SharedResources 
            mutexOwner={state.mutexOwner}
            waitQueue={state.mutexWaitQueue}
          />
        </div>

      </div>

      {/* Bottom: Terminal/Logs */}
      <div className="h-48 shrink-0 border-t border-slate-800">
        <Terminal logs={state.logs} />
      </div>

    </div>
  );
};

export default App;
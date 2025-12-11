# 🧵 ThreadSim — Thread Scheduling & Mutex Visualization  
A real-time interactive simulation of multithreading, task scheduling, and mutex contention.  
Built using **React**, **Vite**, and **TailwindCSS**, this project visually demonstrates how threads execute, block, and compete for shared resources.

---

## 🚀 Features

### ✅ Thread Simulation  
- Multiple threads executing tasks in parallel  
- Live state transitions: **IDLE → RUNNING → WAITING_LOCK → CRITICAL → FINISHED**

### ✅ Task Types  
- **CPU Task** — compute-bound  
- **I/O Task** — simulates waiting  
- **Critical Section Task** — requires mutex lock

### ✅ Mutex Visualization  
- Shows current mutex owner  
- Displays waiting queue  
- Lock acquire & release events displayed in terminal

### ✅ Task Queue  
- Add individual tasks  
- Stress test to add multiple critical tasks at once

### ✅ Thread Manager  
- Add new threads  
- Remove existing threads (including lock-holder logic)

### ✅ Real-Time Logs  
- Terminal showing events with timestamps  
- Success, info, warning, and error notifications

---

## 🛠 Tech Stack

- **React 18**  
- **TypeScript**  
- **Vite** (lightning-fast dev + build)  
- **Tailwind CSS**  
- **Lucide Icons**  

---

## 📂 Project Structure

npm run dev

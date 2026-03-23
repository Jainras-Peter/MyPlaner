import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Filter,
  ChevronRight,
  ChevronDown,
  Flame
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, getDay, subDays } from 'date-fns';

export default function Planner() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [view, setView] = useState<'today' | 'daily' | 'weekly' | 'due-date'>('today');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    type: 'daily',
    priority: 'medium',
    dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    dayOfWeek: format(new Date(), 'EEEE'), // Monday, Tuesday, etc.
    status: 'pending'
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('dueDate', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewTask({
        title: '',
        type: 'daily',
        priority: 'medium',
        dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        dayOfWeek: format(new Date(), 'EEEE'),
        status: 'pending'
      });
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const calculateStreak = (history: Record<string, boolean>, type: string, dayOfWeek?: string) => {
    if (!history) return 0;
    let streak = 0;
    let curr = new Date();
    
    if (type === 'daily') {
      const todayStr = format(curr, 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(curr, 1), 'yyyy-MM-dd');
      
      if (history[todayStr] || history[yesterdayStr]) {
        let checkDate = history[todayStr] ? curr : subDays(curr, 1);
        while (true) {
          const dateStr = format(checkDate, 'yyyy-MM-dd');
          if (history[dateStr]) {
            streak++;
            checkDate = subDays(checkDate, 1);
          } else {
            break;
          }
        }
      }
    } else if (type === 'weekly' && dayOfWeek) {
      // For weekly, we check if it was completed on the assigned day in previous weeks
      let checkDate = curr;
      // Find the most recent assigned day
      while (format(checkDate, 'EEEE') !== dayOfWeek) {
        checkDate = subDays(checkDate, 1);
      }
      
      const lastAssignedStr = format(checkDate, 'yyyy-MM-dd');
      const prevAssignedStr = format(subDays(checkDate, 7), 'yyyy-MM-dd');

      if (history[lastAssignedStr] || history[prevAssignedStr]) {
        let streakDate = history[lastAssignedStr] ? checkDate : subDays(checkDate, 7);
        while (true) {
          const dateStr = format(streakDate, 'yyyy-MM-dd');
          if (history[dateStr]) {
            streak++;
            streakDate = subDays(streakDate, 7);
          } else {
            break;
          }
        }
      }
    }
    return streak;
  };

  const toggleTaskStatus = async (task: any) => {
    if (task.type === 'daily' || task.type === 'weekly') {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const newHistory = { ...(task.history || {}) };
      newHistory[todayStr] = !newHistory[todayStr];
      await updateDoc(doc(db, 'tasks', task.id), { history: newHistory });
    } else {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateDoc(doc(db, 'tasks', task.id), { status: newStatus });
    }
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
  };

  const isTaskCompletedToday = (task: any) => {
    if (task.type === 'daily' || task.type === 'weekly') {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      return task.history?.[todayStr] === true;
    }
    return task.status === 'completed';
  };

  const filteredTasks = tasks.filter(t => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayDayName = format(today, 'EEEE');

    let matchesView = false;
    if (view === 'today') {
      const isTodayOnly = t.type === 'today';
      const isDaily = t.type === 'daily';
      const isWeeklyToday = t.type === 'weekly' && t.dayOfWeek === todayDayName;
      const isDueDateToday = t.type === 'due-date' && format(new Date(t.dueDate), 'yyyy-MM-dd') === todayStr;
      matchesView = isTodayOnly || isDaily || isWeeklyToday || isDueDateToday;
    } else {
      matchesView = t.type === view;
    }

    const isCompleted = isTaskCompletedToday(t);
    const matchesStatus = 
      statusFilter === 'All' ? true :
      statusFilter === 'Pending' ? !isCompleted :
      isCompleted;
    
    return matchesView && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold">Planner</h2>
          <p className="text-text-muted">Manage your daily schedule and deadlines.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-xl border border-border overflow-x-auto no-scrollbar">
          {(['today', 'daily', 'weekly', 'due-date'] as const).map((v) => (
            <button 
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                view === v ? "bg-primary text-white" : "text-text-muted hover:text-text"
              )}
            >
              {v.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Filter size={18} /> Filters
            </h3>
            <div className="space-y-3">
              {(['All', 'Pending', 'Completed'] as const).map(f => (
                <button 
                  key={f} 
                  onClick={() => setStatusFilter(f)}
                  className="flex items-center gap-3 cursor-pointer group w-full text-left"
                >
                  <div className={cn(
                    "w-4 h-4 border rounded flex items-center justify-center transition-all",
                    statusFilter === f ? "border-primary bg-primary/20" : "border-border group-hover:border-primary"
                  )}>
                    {statusFilter === f && <div className="w-2 h-2 bg-primary rounded-sm" />}
                  </div>
                  <span className={cn(
                    "text-sm transition-colors",
                    statusFilter === f ? "text-text font-medium" : "text-text-muted group-hover:text-text"
                  )}>{f}</span>
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full btn-primary flex items-center justify-center gap-2 py-4 rounded-xl"
          >
            <Plus size={20} />
            Add New Task
          </button>
        </div>

        {/* Task List */}
        <div className="lg:col-span-3 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredTasks.length > 0 ? filteredTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass p-4 flex items-center gap-4 group"
              >
                <button 
                  onClick={() => toggleTaskStatus(task)}
                  className="text-text-muted hover:text-primary transition-colors"
                >
                  {isTaskCompletedToday(task) ? (
                    <CheckCircle2 className="text-primary" size={24} />
                  ) : (
                    <Circle size={24} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={cn(
                      "font-medium truncate",
                      isTaskCompletedToday(task) && "line-through text-text-muted"
                    )}>
                      {task.title}
                    </h4>
                    {(task.type === 'daily' || task.type === 'weekly') && (
                      <div className="flex items-center gap-1 text-primary text-xs font-bold">
                        <Flame size={12} />
                        {calculateStreak(task.history, task.type, task.dayOfWeek)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn(
                      "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                      task.priority === 'high' ? 'bg-primary/20 text-primary' : 
                      task.priority === 'medium' ? 'bg-yellow-400/20 text-yellow-400' : 
                      'bg-blue-400/20 text-blue-400'
                    )}>
                      {task.priority}
                    </span>
                    {task.type === 'weekly' && (
                      <span className="text-xs text-text-muted font-medium">
                        {task.dayOfWeek}
                      </span>
                    )}
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock size={12} />
                      {format(new Date(task.dueDate), 'h:mm a')}
                    </span>
                    {task.type === 'due-date' && (
                      <span className={cn(
                        "text-xs flex items-center gap-1",
                        isPast(new Date(task.dueDate)) && !isTaskCompletedToday(task) ? 'text-primary' : 'text-text-muted'
                      )}>
                        <CalendarIcon size={12} />
                        {format(new Date(task.dueDate), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-red-400 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            )) : (
              <div className="text-center py-20 glass">
                <CalendarIcon size={48} className="mx-auto text-text-muted/20 mb-4" />
                <p className="text-text-muted">No tasks found for this view.</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="text-primary mt-2 hover:underline"
                >
                  Create your first task
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md glass p-8"
            >
              <h3 className="text-2xl font-display font-bold mb-6">New Task</h3>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-text-muted">Task Title</label>
                  <input 
                    required
                    type="text" 
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    placeholder="e.g. Study System Design"
                    className="w-full input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-text-muted">Type</label>
                    <select 
                      value={newTask.type}
                      onChange={e => setNewTask({...newTask, type: e.target.value as any})}
                      className="w-full input-field"
                    >
                      <option value="today">Today Only</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="due-date">Due Date</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-text-muted">Priority</label>
                    <select 
                      value={newTask.priority}
                      onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                      className="w-full input-field"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                {newTask.type === 'weekly' && (
                  <div className="space-y-2">
                    <label className="text-sm text-text-muted">Day of Week</label>
                    <select 
                      value={newTask.dayOfWeek}
                      onChange={e => setNewTask({...newTask, dayOfWeek: e.target.value})}
                      className="w-full input-field"
                    >
                      {daysOfWeek.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}
                {newTask.type === 'due-date' ? (
                  <div className="space-y-2">
                    <label className="text-sm text-text-muted">Due Date & Time</label>
                    <input 
                      required
                      type="datetime-local" 
                      value={newTask.dueDate}
                      onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                      className="w-full input-field [color-scheme:dark]"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm text-text-muted">Set Time</label>
                    <input 
                      required
                      type="time" 
                      value={newTask.dueDate.split('T')[1] || '12:00'}
                      onChange={e => {
                        const datePart = newTask.dueDate.split('T')[0] || format(new Date(), 'yyyy-MM-dd');
                        setNewTask({...newTask, dueDate: `${datePart}T${e.target.value}`});
                      }}
                      className="w-full input-field [color-scheme:dark]"
                    />
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-card/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

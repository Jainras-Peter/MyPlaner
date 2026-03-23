import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from './ConfirmDialog';
import { 
  Plus, 
  Flame, 
  CheckCircle2, 
  Circle, 
  Activity, 
  Droplets, 
  Moon, 
  Book, 
  Trophy, 
  Target, 
  Zap, 
  Heart,
  Coffee,
  Dumbbell,
  Brain,
  Timer,
  Trash2,
  X,
  AlertCircle,
  BarChart3,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  format, 
  subDays, 
  isSameDay, 
  parseISO, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  isToday,
  subMonths,
  addMonths,
  addDays
} from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function Habits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', icon: 'Activity' });
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [viewDate, setViewDate] = useState(new Date());
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'habits'), where('userId', '==', user.uid));
    return onSnapshot(q, (snapshot) => {
      setHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  const calculateStreak = (history: Record<string, boolean>) => {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Sort dates to calculate longest streak
    const dates = Object.keys(history).sort();
    let prevDate: Date | null = null;

    dates.forEach(dateStr => {
      const currentDate = parseISO(dateStr);
      if (prevDate && isSameDay(addDays(prevDate, 1), currentDate)) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      prevDate = currentDate;
    });

    // Calculate current streak
    let checkDate = new Date();
    const todayStr = format(checkDate, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(checkDate, 1), 'yyyy-MM-dd');

    if (history[todayStr] || history[yesterdayStr]) {
      let curr = history[todayStr] ? checkDate : subDays(checkDate, 1);
      while (true) {
        const dateStr = format(curr, 'yyyy-MM-dd');
        if (history[dateStr]) {
          currentStreak++;
          curr = subDays(curr, 1);
        } else {
          break;
        }
      }
    }

    return { currentStreak, longestStreak };
  };

  const habitsWithStreaks = useMemo(() => {
    return habits.map(h => {
      const { currentStreak, longestStreak } = calculateStreak(h.history || {});
      return {
        ...h,
        currentStreak,
        longestStreak
      };
    });
  }, [habits]);

  const chartData = useMemo(() => {
    const start = timeRange === 'week' ? startOfWeek(viewDate) : startOfMonth(viewDate);
    const end = timeRange === 'week' ? endOfWeek(viewDate) : endOfMonth(viewDate);
    
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const completed = habits.filter(h => h.history && h.history[dateStr]).length;
      const total = habits.length;
      
      return {
        date: dateStr,
        displayDate: format(day, timeRange === 'week' ? 'EEE' : 'd'),
        fullDate: format(day, 'MMMM d, yyyy'),
        completed,
        total,
        percentage: total > 0 ? (completed / total) * 100 : 0
      };
    });
  }, [habits, timeRange, viewDate]);

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await addDoc(collection(db, 'habits'), {
      ...newHabit,
      userId: user.uid,
      history: {},
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(false);
    setNewHabit({ name: '', icon: 'Activity' });
  };

  const toggleHabit = async (habit: any) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const history = { ...habit.history };
    if (history[today]) delete history[today];
    else history[today] = true;

    await updateDoc(doc(db, 'habits', habit.id), { 
      history,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleDeleteHabit = async (id: string) => {
    await deleteDoc(doc(db, 'habits', id));
    setDeleteTarget(null);
  };

  const icons = { 
    Activity, Droplets, Moon, Book, Heart, Coffee, Dumbbell, Brain, Timer, Zap, Target, Trophy
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const completedToday = habitsWithStreaks.filter(h => h.history[todayStr]).length;
  const longestStreak = Math.max(0, ...habitsWithStreaks.map(h => h.currentStreak));
  const totalStreaks = habitsWithStreaks.reduce((acc, h) => acc + h.currentStreak, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
      <div className="glass p-3 border border-border shadow-xl">
        <p className="text-xs text-text-muted mb-1">{data.fullDate}</p>
        <p className="text-sm font-bold">
          <span className="text-primary">{data.completed}</span> / {data.total} Habits
        </p>
        <p className="text-[10px] text-text-muted mt-1">{Math.round(data.percentage)}% Completion</p>
      </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold">Habit Tracker</h2>
          <p className="text-text-muted">Consistency is the key to mastery.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Add Habit
        </button>
      </header>

      {/* Progress Analytics */}
      <div className="glass p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <BarChart3 size={20} />
            </div>
            <h3 className="text-xl font-bold">Progress Analytics</h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex bg-card/50 rounded-lg p-1 shrink-0">
              <button 
                onClick={() => setTimeRange('week')}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md transition-all",
                  timeRange === 'week' ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-text"
                )}
              >
                Week
              </button>
              <button 
                onClick={() => setTimeRange('month')}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md transition-all",
                  timeRange === 'month' ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-text"
                )}
              >
                Month
              </button>
            </div>
            
            <div className="flex items-center gap-1 bg-card/50 rounded-lg p-1">
              <button 
                onClick={() => setViewDate(prev => timeRange === 'week' ? subDays(prev, 7) : subMonths(prev, 1))}
                className="p-1.5 hover:bg-card/50 rounded-md text-text-muted hover:text-text transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-[11px] sm:text-sm font-medium min-w-[100px] sm:min-w-[140px] text-center px-1">
                {timeRange === 'week' 
                  ? `${format(startOfWeek(viewDate), 'MMM d')} - ${format(endOfWeek(viewDate), 'MMM d')}`
                  : format(viewDate, 'MMMM yyyy')
                }
              </span>
              <button 
                onClick={() => setViewDate(prev => timeRange === 'week' ? addDays(prev, 7) : addMonths(prev, 1))}
                className="p-1.5 hover:bg-card/50 rounded-md text-text-muted hover:text-text transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis 
                dataKey="displayDate" 
                stroke="var(--chart-text)" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                interval={timeRange === 'month' ? 2 : 0}
              />
              <YAxis 
                stroke="var(--chart-text)" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                domain={[0, habits.length || 5]}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--card)' }} />
              <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.percentage === 100 ? '#E10600' : entry.percentage > 50 ? '#E10600cc' : '#E1060066'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Streak Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 flex items-center gap-4"
        >
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Longest Streak</p>
            <h4 className="text-2xl font-display font-bold">{longestStreak} <span className="text-sm font-sans text-text-muted">days</span></h4>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-4 flex items-center gap-4"
        >
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Total Streaks</p>
            <h4 className="text-2xl font-display font-bold">{totalStreaks} <span className="text-sm font-sans text-text-muted">days</span></h4>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-4 flex items-center gap-4"
        >
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Done Today</p>
            <h4 className="text-2xl font-display font-bold">{completedToday} <span className="text-sm font-sans text-text-muted">/ {habits.length}</span></h4>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-4 flex items-center gap-4"
        >
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Target size={24} />
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Success Rate</p>
            <h4 className="text-2xl font-display font-bold">
              {habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0}%
            </h4>
          </div>
        </motion.div>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-primary shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-text-muted">
          <span className="font-bold text-primary">Daily Check-in:</span> Yes, you need to mark your habits <span className="italic">every day</span> to maintain your streak! If you miss a day, your streak will reset.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habitsWithStreaks.map((habit) => {
          const Icon = (icons as any)[habit.icon] || Activity;
          const isDoneToday = habit.history[todayStr];
          
          return (
            <motion.div 
              key={habit.id}
              layout
              className="glass p-6 flex items-center gap-4 group relative"
            >
              <button 
                onClick={() => setDeleteTarget(habit)}
                className="absolute top-2 right-2 p-1.5 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={14} />
              </button>

              <div className={cn(
                "p-3 rounded-xl transition-all duration-500",
                isDoneToday ? "bg-primary text-white shadow-[0_0_20px_rgba(255,0,0,0.3)]" : "bg-card/50 text-text-muted"
              )}>
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{habit.name}</h3>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2">
                    <Flame size={14} className={habit.currentStreak > 0 ? "text-primary" : "text-text-muted"} />
                    <span className="text-xs text-text-muted">{habit.currentStreak} day streak</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className={habit.longestStreak > 0 ? "text-yellow-500" : "text-text-muted"} />
                    <span className="text-[10px] text-text-muted">Best: {habit.longestStreak} days</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => toggleHabit(habit)}
                className={cn(
                  "p-2 rounded-lg transition-all transform active:scale-90",
                  isDoneToday ? "text-primary" : "text-text-muted hover:text-text"
                )}
              >
                {isDoneToday ? <CheckCircle2 size={32} /> : <Circle size={32} />}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Add Habit Modal */}
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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-display font-bold">New Habit</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddHabit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-text-muted">Habit Name</label>
                  <input 
                    required
                    type="text" 
                    value={newHabit.name}
                    onChange={e => setNewHabit({...newHabit, name: e.target.value})}
                    placeholder="e.g. Morning Workout"
                    className="w-full input-field"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-text-muted">Icon</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.keys(icons).map(iconName => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewHabit({...newHabit, icon: iconName})}
                        className={cn(
                          "p-3 rounded-lg border transition-all flex items-center justify-center",
                          newHabit.icon === iconName ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-text-muted"
                        )}
                      >
                        {React.createElement((icons as any)[iconName], { size: 20 })}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full btn-primary mt-4">Create Habit</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete habit?"
        message={`"${deleteTarget?.name || 'This habit'}" and its tracking history will be removed.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDeleteHabit(deleteTarget.id)}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

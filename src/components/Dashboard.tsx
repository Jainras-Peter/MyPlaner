import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Flame,
  ArrowRight,
  Plus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subDays, eachDayOfInterval, parseISO, isSameDay, addDays } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    activeSkills: 0,
    currentStreak: 0,
    pendingTasks: 0
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [skillProgress, setSkillProgress] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);

  const calculateStreak = (history: Record<string, boolean>) => {
    let currentStreak = 0;
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
    return currentStreak;
  };

  useEffect(() => {
    if (!user) return;

    // Fetch tasks
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('dueDate', 'asc')
    );

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setRecentTasks(allTasks.filter(t => t.status !== 'completed').slice(0, 5));
      setStats(prev => ({
        ...prev,
        pendingTasks: allTasks.filter(t => t.status !== 'completed').length,
        tasksCompleted: allTasks.filter(t => t.status === 'completed').length
      }));
    });

    // Fetch skills
    const skillsQuery = query(
      collection(db, 'skills'),
      where('userId', '==', user.uid),
      limit(4)
    );

    const unsubscribeSkills = onSnapshot(skillsQuery, (snapshot) => {
      const skills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setSkillProgress(skills);
      setStats(prev => ({ ...prev, activeSkills: snapshot.size }));
    });

    // Fetch habits for streaks and activity
    const habitsQuery = query(
      collection(db, 'habits'),
      where('userId', '==', user.uid)
    );

    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      const fetchedHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setHabits(fetchedHabits);
      
      const streaks = fetchedHabits.map(h => calculateStreak(h.history || {}));
      const maxStreak = streaks.length > 0 ? Math.max(...streaks) : 0;
      
      setStats(prev => ({
        ...prev,
        currentStreak: maxStreak
      }));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeSkills();
      unsubscribeHabits();
    };
  }, [user]);

  const chartData = React.useMemo(() => {
    const end = new Date();
    const start = subDays(end, 6);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const completedCount = habits.filter(h => h.history && h.history[dateStr]).length;
      const totalHabits = habits.length;
      const progress = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

      return {
        name: format(day, 'EEE'),
        progress: progress,
        fullDate: format(day, 'MMM d')
      };
    });
  }, [habits]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold">Welcome back, <span className="text-primary">{user?.displayName?.split(' ')[0]}</span></h2>
          <p className="text-text-muted mt-1">Here's what's happening with your growth today.</p>
        </div>
        <button className="btn-primary flex items-center gap-2 self-start">
          <Plus size={20} />
          New Task
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tasks Completed', value: stats.tasksCompleted, icon: CheckCircle2, color: 'text-green-400' },
          { label: 'Active Skills', value: stats.activeSkills, icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Current Streak', value: stats.currentStreak, icon: Flame, color: 'text-primary' },
          { label: 'Pending Tasks', value: stats.pendingTasks, icon: Clock, color: 'text-yellow-400' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={stat.color} size={24} />
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="text-sm text-text-muted">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart */}
        <div className="lg:col-span-2 glass p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Weekly Activity</h3>
            <select className="bg-bg border border-border rounded-lg px-2 py-1 text-sm outline-none">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E10600" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E10600" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--chart-text)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Area type="monotone" dataKey="progress" stroke="#E10600" strokeWidth={3} fillOpacity={1} fill="url(#colorProgress)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Upcoming</h3>
            <button className="text-primary text-sm hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-4">
            {recentTasks.length > 0 ? recentTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-card/50 transition-colors group">
                <div className={cn(
                  "mt-1 w-2 h-2 rounded-full",
                  task.priority === 'high' ? 'bg-primary' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  <p className="text-xs text-text-muted">{new Date(task.dueDate).toLocaleDateString()}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                <CheckCircle2 size={18} className="text-text-muted hover:text-primary" />
                </button>
              </div>
            )) : (
              <p className="text-center text-text-muted py-8">No upcoming tasks</p>
            )}
          </div>
        </div>
      </div>

      {/* Skill Progress Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {skillProgress.map((skill) => (
          <div key={skill.id} className="glass p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{skill.name}</span>
              <span className="text-xs text-primary font-bold">{skill.progress}%</span>
            </div>
            <div className="w-full bg-bg h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${skill.progress}%` }}
                className="bg-primary h-full"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  Target, 
  BookOpen, 
  Activity, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', label: 'Planner', icon: Calendar },
    { id: 'skills', label: 'Skills', icon: Target },
    { id: 'notes', label: 'Notes', icon: BookOpen },
    { id: 'habits', label: 'Habits', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-display font-bold text-white">F</div>
          <h1 className="text-xl font-display font-bold tracking-tight">Forge<span className="text-primary">OS</span></h1>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                activeTab === item.id 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-text-muted hover:text-text hover:bg-card/50"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 mb-4">
            <img src={user?.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-border" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName}</p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/5 transition-all"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-card/80 backdrop-blur-md z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-display font-bold text-white">F</div>
          <h1 className="text-lg font-display font-bold">Forge<span className="text-primary">OS</span></h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-text-muted">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 bottom-0 w-3/4 max-w-sm bg-card z-[70] p-6 md:hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-display font-bold">Menu</h2>
                <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
              </div>
              <nav className="space-y-4">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-lg transition-all",
                      activeTab === item.id 
                        ? "bg-primary text-white font-medium" 
                        : "text-text-muted"
                    )}
                  >
                    <item.icon size={24} />
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="absolute bottom-8 left-6 right-6 pt-6 border-t border-border">
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-lg text-red-400"
                >
                  <LogOut size={24} />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

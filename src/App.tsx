import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Planner from './components/Planner';
import Skills from './components/Skills';
import Notes from './components/Notes';
import Habits from './components/Habits';
import Settings from './components/Settings';
import Auth from './components/Auth';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="text-primary animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'planner' && <Planner />}
      {activeTab === 'skills' && <Skills />}
      {activeTab === 'notes' && <Notes />}
      {activeTab === 'habits' && <Habits />}
      {activeTab === 'settings' && <Settings />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}


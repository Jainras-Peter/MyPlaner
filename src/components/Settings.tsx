import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Monitor, User, Bell, Shield, LogOut, Check, X, Camera, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationSettings {
  dailyPlans: boolean;
  weeklyPlans: boolean;
  dueDatePlans: boolean;
  dailyHabitComplete: boolean;
}

interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string;
  bio?: string;
  location?: string;
  notifications: NotificationSettings;
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        setProfile({
          ...data,
          notifications: data.notifications || {
            dailyPlans: true,
            weeklyPlans: true,
            dueDatePlans: true,
            dailyHabitComplete: true
          }
        });
        setEditData(data);
      }
    });

    return unsubscribe;
  }, [user]);

  const handleToggleNotification = async (key: keyof NotificationSettings) => {
    if (!user || !profile) return;

    const newNotifications = {
      ...profile.notifications,
      [key]: !profile.notifications[key]
    };

    await updateDoc(doc(db, 'users', user.uid), {
      notifications: newNotifications
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), editData);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const Switch = ({ enabled, onChange, label, description }: { enabled: boolean, onChange: () => void, label: string, description?: string }) => (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
      <div className="space-y-0.5">
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          enabled ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header>
        <h2 className="text-3xl font-display font-bold">Settings</h2>
        <p className="text-text-muted">Manage your preferences and account settings.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          {[
            { id: 'profile', icon: User, label: 'Profile' },
            { id: 'appearance', icon: Monitor, label: 'Appearance' },
            { id: 'notifications', icon: Bell, label: 'Notifications' },
            { id: 'security', icon: Shield, label: 'Security' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-primary/10 text-primary font-bold' : 'text-text-muted hover:bg-card/50 hover:text-text'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all mt-8"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.section 
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass p-6 space-y-8"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold mb-2">Account Profile</h3>
                    <p className="text-sm text-text-muted">Manage your public profile and personal information.</p>
                  </div>
                  {!isEditing ? (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-primary text-sm font-bold flex items-center gap-2 hover:underline"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="text-text-muted text-sm font-bold hover:underline"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="text-primary text-sm font-bold flex items-center gap-2 hover:underline disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary text-4xl font-bold overflow-hidden border-4 border-card shadow-xl">
                      {profile?.photoURL ? (
                        <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        profile?.displayName?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()
                      )}
                    </div>
                    {isEditing && (
                      <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                        <Camera size={16} />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-4 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Full Name</label>
                        {isEditing ? (
                          <input 
                            type="text"
                            value={editData.displayName || ''}
                            onChange={e => setEditData({...editData, displayName: e.target.value})}
                            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                        ) : (
                          <p className="font-medium">{profile?.displayName || 'Not set'}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Email Address</label>
                        <p className="font-medium text-text-muted">{profile?.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Bio</label>
                      {isEditing ? (
                        <textarea 
                          value={editData.bio || ''}
                          onChange={e => setEditData({...editData, bio: e.target.value})}
                          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary min-h-[80px]"
                          placeholder="Tell us about yourself..."
                        />
                      ) : (
                        <p className="text-sm">{profile?.bio || 'No bio added yet.'}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Location</label>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={editData.location || ''}
                          onChange={e => setEditData({...editData, location: e.target.value})}
                          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                          placeholder="e.g. San Francisco, CA"
                        />
                      ) : (
                        <p className="text-sm">{profile?.location || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-card/50 rounded-xl">
                    <p className="text-2xl font-bold text-primary">12</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Skills</p>
                  </div>
                  <div className="text-center p-4 bg-card/50 rounded-xl">
                    <p className="text-2xl font-bold text-primary">45</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Tasks</p>
                  </div>
                  <div className="text-center p-4 bg-card/50 rounded-xl">
                    <p className="text-2xl font-bold text-primary">8</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Habits</p>
                  </div>
                  <div className="text-center p-4 bg-card/50 rounded-xl">
                    <p className="text-2xl font-bold text-primary">15</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Streak</p>
                  </div>
                </div>
              </motion.section>
            )}

            {activeTab === 'appearance' && (
              <motion.section 
                key="appearance"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass p-6 space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold mb-2">Appearance</h3>
                  <p className="text-sm text-text-muted">Customize how the application looks for you.</p>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-medium">Theme Mode</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-900">
                        <Sun size={24} />
                      </div>
                      <span className="text-sm font-medium">Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-[#0B0B0F] border border-gray-800 flex items-center justify-center text-white">
                        <Moon size={24} />
                      </div>
                      <span className="text-sm font-medium">Dark</span>
                    </button>
                  </div>
                </div>
              </motion.section>
            )}

            {activeTab === 'notifications' && (
              <motion.section 
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass p-6 space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold mb-2">Notifications</h3>
                  <p className="text-sm text-text-muted">Stay updated with your progress and upcoming tasks.</p>
                </div>

                <div className="space-y-2">
                  <Switch 
                    enabled={profile?.notifications.dailyPlans || false} 
                    onChange={() => handleToggleNotification('dailyPlans')}
                    label="Daily Plans"
                    description="Receive a summary of your tasks every morning."
                  />
                  <Switch 
                    enabled={profile?.notifications.weeklyPlans || false} 
                    onChange={() => handleToggleNotification('weeklyPlans')}
                    label="Weekly Plans"
                    description="Get a weekly overview of your goals and progress."
                  />
                  <Switch 
                    enabled={profile?.notifications.dueDatePlans || false} 
                    onChange={() => handleToggleNotification('dueDatePlans')}
                    label="Due Date Reminders"
                    description="Notifications for tasks approaching their deadline."
                  />
                  <Switch 
                    enabled={profile?.notifications.dailyHabitComplete || false} 
                    onChange={() => handleToggleNotification('dailyHabitComplete')}
                    label="Daily Habit Completion"
                    description="Reminders to complete your daily habits."
                  />
                </div>

                <div className="pt-6 border-t border-border/50">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                    <Shield className="text-primary shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-text-muted">
                      <span className="font-bold text-primary">Privacy Note:</span> We only send notifications related to your productivity and growth. You can opt-out at any time.
                    </p>
                  </div>
                </div>
              </motion.section>
            )}

            {activeTab === 'security' && (
              <motion.section 
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass p-6 space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold mb-2">Security</h3>
                  <p className="text-sm text-text-muted">Manage your account security and data.</p>
                </div>
                <div className="p-12 text-center space-y-4">
                  <Shield size={48} className="mx-auto text-text-muted opacity-20" />
                  <p className="text-text-muted italic">Security settings are managed by your Google Account.</p>
                  <button className="text-primary font-bold hover:underline">Manage Google Account</button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

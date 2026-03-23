import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Target, MoreVertical, Trash2, Edit3, ChevronRight } from 'lucide-react';
import SkillDetail from './SkillDetail';

export default function Skills() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<any[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: 'Technical',
    progress: 0,
    subSkills: []
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'skills'), where('userId', '==', user.uid));
    return onSnapshot(q, (snapshot) => {
      setSkills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  if (selectedSkill) {
    return <SkillDetail skill={selectedSkill} onBack={() => setSelectedSkill(null)} />;
  }

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await addDoc(collection(db, 'skills'), {
      ...newSkill,
      userId: user.uid,
      lastUpdated: new Date().toISOString()
    });
    setIsModalOpen(false);
    setNewSkill({ name: '', category: 'Technical', progress: 0, subSkills: [] });
  };

  const updateProgress = async (id: string, progress: number) => {
    await updateDoc(doc(db, 'skills', id), { 
      progress: Math.min(100, Math.max(0, progress)),
      lastUpdated: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold">Skill Forge</h2>
          <p className="text-text-muted">Track and upscale your professional & personal skills.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          Add Skill
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map((skill) => (
          <motion.div 
            key={skill.id}
            layout
            className="glass p-6 group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-primary font-bold">{skill.category}</span>
                <h3 className="text-xl font-bold mt-1">{skill.name}</h3>
              </div>
              <button className="p-1 text-text-muted hover:text-text"><MoreVertical size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-muted">Overall Progress</span>
                  <span className="font-bold">{skill.progress}%</span>
                </div>
                <div className="w-full bg-bg h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.progress}%` }}
                    className="bg-primary h-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => updateProgress(skill.id, skill.progress - 5)}
                  className="flex-1 py-1 rounded bg-card/50 hover:bg-card text-xs transition-colors"
                >
                  -5%
                </button>
                <button 
                  onClick={() => updateProgress(skill.id, skill.progress + 5)}
                  className="flex-1 py-1 rounded bg-card/50 hover:bg-card text-xs transition-colors"
                >
                  +5%
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-text-muted">Last updated {new Date(skill.lastUpdated).toLocaleDateString()}</span>
              <button 
                onClick={() => setSelectedSkill(skill)}
                className="text-primary text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all"
              >
                Details <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        ))}

        {skills.length === 0 && (
          <div className="col-span-full py-20 text-center glass">
            <Target size={48} className="mx-auto text-text-muted/20 mb-4" />
            <p className="text-text-muted">No skills tracked yet. Start forging your future.</p>
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
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
              <h3 className="text-2xl font-display font-bold mb-6">Add New Skill</h3>
              <form onSubmit={handleAddSkill} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-text-muted">Skill Name</label>
                  <input 
                    required
                    type="text" 
                    value={newSkill.name}
                    onChange={e => setNewSkill({...newSkill, name: e.target.value})}
                    placeholder="e.g. System Design"
                    className="w-full input-field"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-text-muted">Category</label>
                  <select 
                    value={newSkill.category}
                    onChange={e => setNewSkill({...newSkill, category: e.target.value})}
                    className="w-full input-field"
                  >
                    <option>Technical</option>
                    <option>Personal</option>
                    <option>Fitness</option>
                    <option>Communication</option>
                  </select>
                </div>
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
                    Add Skill
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

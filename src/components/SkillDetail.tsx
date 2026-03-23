import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc, 
  orderBy,
  getDocs
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Link as LinkIcon, 
  FileText, 
  Trash2, 
  Edit3,
  X,
  ChevronRight,
  ChevronDown,
  Video,
  ExternalLink
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import ConfirmDialog from './ConfirmDialog';
import LinkDialog from './LinkDialog';

interface Topic {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'completed';
  skillId: string;
  userId: string;
}

interface SubTopic {
  id: string;
  topicId: string;
  skillId: string;
  title: string;
  status: 'pending' | 'completed';
  userId: string;
}

interface Note {
  id?: string;
  title: string;
  content: string;
  topic: string;
  links: string[];
  skillId: string;
  topicId?: string;
  subTopicId?: string;
  userId: string;
  updatedAt: string;
}

interface SkillDetailProps {
  skill: any;
  onBack: () => void;
}

export default function SkillDetail({ skill, onBack }: SkillDetailProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [associatedNote, setAssociatedNote] = useState<Note | null>(null);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [isAddingSubTopic, setIsAddingSubTopic] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editDueDate, setEditDueDate] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [newTopic, setNewTopic] = useState({
    title: '',
    dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });
  const [newSubTopicTitle, setNewSubTopicTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteLinks, setNoteLinks] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'topic' | 'subtopic'; title: string } | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  useEffect(() => {
    if (!user || !skill.id) return;
    
    const qTopics = query(
      collection(db, 'topics'),
      where('skillId', '==', skill.id),
      where('userId', '==', user.uid),
      orderBy('dueDate', 'asc')
    );
    const unsubscribeTopics = onSnapshot(qTopics, (snapshot) => {
      const fetchedTopics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
      setTopics(fetchedTopics);
      
      if (fetchedTopics.length > 0) {
        const completedCount = fetchedTopics.filter(t => t.status === 'completed').length;
        const newProgress = Math.round((completedCount / fetchedTopics.length) * 100);
        if (newProgress !== skill.progress) {
          updateDoc(doc(db, 'skills', skill.id), { progress: newProgress });
        }
      }
    });

    const qSubTopics = query(
      collection(db, 'subtopics'),
      where('skillId', '==', skill.id),
      where('userId', '==', user.uid)
    );
    const unsubscribeSubTopics = onSnapshot(qSubTopics, (snapshot) => {
      setSubTopics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubTopic)));
    });

    return () => {
      unsubscribeTopics();
      unsubscribeSubTopics();
    };
  }, [user, skill.id]);

  useEffect(() => {
    if (!user || (!selectedTopicId && !selectedSubTopicId)) {
      setAssociatedNote(null);
      return;
    }

    const targetId = selectedSubTopicId || selectedTopicId;
    const field = selectedSubTopicId ? 'subTopicId' : 'topicId';

    const q = query(
      collection(db, 'notes'),
      where(field, '==', targetId),
      where('userId', '==', user.uid)
    );

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const noteDoc = snapshot.docs[0];
        const noteData = { id: noteDoc.id, ...noteDoc.data() } as Note;
        setAssociatedNote(noteData);
        // Only update content from Firestore if not currently editing to prevent cursor jumps
        if (!isEditingNote) {
          setNoteContent(noteData.content);
          setNoteLinks(noteData.links || []);
        }
      } else {
        setAssociatedNote(null);
        if (!isEditingNote) {
          setNoteContent('');
          setNoteLinks([]);
        }
      }
    });
  }, [user, selectedTopicId, selectedSubTopicId, isEditingNote]);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const topicRef = await addDoc(collection(db, 'topics'), {
      ...newTopic,
      skillId: skill.id,
      userId: user.uid,
      status: 'pending'
    });

    await addDoc(collection(db, 'notes'), {
      title: `${skill.name}: ${newTopic.title}`,
      content: '',
      topic: skill.name,
      links: [],
      skillId: skill.id,
      topicId: topicRef.id,
      userId: user.uid,
      updatedAt: new Date().toISOString()
    });

    setIsAddingTopic(false);
    setNewTopic({ title: '', dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
  };

  const handleAddSubTopic = async (topicId: string) => {
    if (!user || !newSubTopicTitle) return;
    const subTopicRef = await addDoc(collection(db, 'subtopics'), {
      title: newSubTopicTitle,
      topicId,
      skillId: skill.id,
      userId: user.uid,
      status: 'pending'
    });

    await addDoc(collection(db, 'notes'), {
      title: `${skill.name} > ${newSubTopicTitle}`,
      content: '',
      topic: skill.name,
      links: [],
      skillId: skill.id,
      subTopicId: subTopicRef.id,
      userId: user.uid,
      updatedAt: new Date().toISOString()
    });

    setNewSubTopicTitle('');
    setIsAddingSubTopic(null);
    setExpandedTopics(prev => new Set(prev).add(topicId));
  };

  const handleSaveNote = async () => {
    if (!user || (!selectedTopicId && !selectedSubTopicId)) return;
    
    const currentTopic = topics.find(t => t.id === selectedTopicId);
    const currentSubTopic = subTopics.find(s => s.id === selectedSubTopicId);

    const title = selectedSubTopicId 
      ? `${skill.name} > ${currentSubTopic?.title}` 
      : `${skill.name}: ${currentTopic?.title}`;

    const noteData: any = {
      title,
      content: noteContent,
      topic: skill.name,
      links: noteLinks,
      skillId: skill.id,
      userId: user.uid,
      updatedAt: new Date().toISOString()
    };

    if (selectedSubTopicId) {
      noteData.subTopicId = selectedSubTopicId;
    } else if (selectedTopicId) {
      noteData.topicId = selectedTopicId;
    }

    if (associatedNote?.id) {
      await updateDoc(doc(db, 'notes', associatedNote.id), noteData);
    } else {
      await addDoc(collection(db, 'notes'), noteData);
    }
    setIsEditingNote(false);
  };

  const toggleTopicExpansion = (topicId: string) => {
    const isExpanded = expandedTopics.has(topicId);
    const isSelected = selectedTopicId === topicId && !selectedSubTopicId;

    if (isSelected && isExpanded) {
      setExpandedTopics(prev => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
      setSelectedTopicId(null);
    } else {
      setExpandedTopics(prev => new Set(prev).add(topicId));
      setSelectedTopicId(topicId);
      setSelectedSubTopicId(null);
    }
    setIsEditingNote(false);
  };

  const toggleStatus = async (item: any, type: 'topic' | 'subtopic') => {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    const collectionName = type === 'topic' ? 'topics' : 'subtopics';
    await updateDoc(doc(db, collectionName, item.id), { status: newStatus });
  };

  const deleteItem = async (id: string, type: 'topic' | 'subtopic') => {
    const collectionName = type === 'topic' ? 'topics' : 'subtopics';

    const noteField = type === 'topic' ? 'topicId' : 'subTopicId';
    const relatedNotesSnapshot = user
      ? await getDocs(query(collection(db, 'notes'), where(noteField, '==', id), where('userId', '==', user.uid)))
      : null;

    await deleteDoc(doc(db, collectionName, id));

    if (relatedNotesSnapshot) {
      await Promise.all(relatedNotesSnapshot.docs.map(noteDoc => deleteDoc(noteDoc.ref)));
    }

    if (type === 'topic') {
      const subs = subTopics.filter(s => s.topicId === id);
      for (const s of subs) {
        const subNotesSnapshot = user
          ? await getDocs(query(collection(db, 'notes'), where('subTopicId', '==', s.id), where('userId', '==', user.uid)))
          : null;
        await deleteDoc(doc(db, 'subtopics', s.id));
        if (subNotesSnapshot) {
          await Promise.all(subNotesSnapshot.docs.map(noteDoc => deleteDoc(noteDoc.ref)));
        }
      }
      if (selectedTopicId === id) setSelectedTopicId(null);
      setSelectedSubTopicId(null);
    } else {
      if (selectedSubTopicId === id) setSelectedSubTopicId(null);
    }

    setDeleteTarget(null);
  };

  const addLinkFromDialog = (link: string) => {
    if (!noteLinks.includes(link)) {
      setNoteLinks([...noteLinks, link]);
    }
    setIsLinkDialogOpen(false);
  };

  const removeLink = (linkToRemove: string) => {
    setNoteLinks(noteLinks.filter(l => l !== linkToRemove));
  };

  const handleUpdateTopicDate = async (id: string, newDate: string) => {
    await updateDoc(doc(db, 'topics', id), {
      dueDate: newDate
    });
    setEditingTopicId(null);
  };

  const extendTopicDate = async (topic: Topic, days: number) => {
    const current = new Date(topic.dueDate);
    const extended = addDays(current, days);
    await updateDoc(doc(db, 'topics', topic.id), {
      dueDate: extended.toISOString()
    });
  };

  const renderNoteSection = () => (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 bg-bg/50 rounded-lg border border-border/50 space-y-4"
    >
      <div className="flex justify-between items-center">
        <h5 className="text-sm font-bold flex items-center gap-2">
          <FileText size={16} className="text-primary" /> Notes
        </h5>
        <button 
          onClick={() => setIsEditingNote(!isEditingNote)}
          className="text-primary text-xs font-bold flex items-center gap-1"
        >
          <Edit3 size={14} /> {isEditingNote ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {isEditingNote ? (
        <div className="space-y-4">
          <textarea 
            autoFocus
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="w-full min-h-[150px] bg-transparent border border-border rounded-lg p-3 font-mono text-sm outline-none focus:border-primary"
            placeholder="Write your notes here..."
          />
          <div className="space-y-2">
            <button
              onClick={() => setIsLinkDialogOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-primary transition-colors hover:bg-card/50"
            >
              <Plus size={16} />
              Add Resource Link
            </button>
            <div className="space-y-2">
              {noteLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-3 py-3 text-sm">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-3 text-text transition-colors hover:text-primary"
                  >
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      {link.includes('youtube.com') || link.includes('youtu.be') ? <Video size={16} /> : <LinkIcon size={16} />}
                    </div>
                    <span className="truncate">{link}</span>
                    <ExternalLink size={14} className="shrink-0" />
                  </a>
                  <button onClick={() => removeLink(link)} className="text-text-muted hover:text-red-400"><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={handleSaveNote}
            className="w-full btn-primary py-2 text-sm"
          >
            Save Note
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={cn("prose prose-sm max-w-none text-text", theme === 'dark' && "prose-invert")}>
            {noteContent ? (
              <ReactMarkdown>{noteContent}</ReactMarkdown>
            ) : (
              <p className="italic text-text-muted">No notes yet.</p>
            )}
          </div>
          {noteLinks.length > 0 && (
            <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border/30">
              {noteLinks.map((link, i) => (
                <a 
                  key={i} 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-card/50 rounded text-[10px] hover:text-primary transition-colors truncate"
                >
                  <LinkIcon size={12} /> {link}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-card/50 rounded-lg text-text-muted hover:text-text">
          <ArrowLeft size={24} />
        </button>
        <div>
          <span className="text-xs text-primary font-bold uppercase tracking-widest">{skill.category}</span>
          <h2 className="text-3xl font-display font-bold">{skill.name}</h2>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Curriculum</h3>
          <button 
            onClick={() => setIsAddingTopic(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-bold"
          >
            <Plus size={18} /> Add Topic
          </button>
        </div>

        <AnimatePresence>
          {isAddingTopic && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="glass p-6 space-y-4 overflow-hidden"
            >
              <div className="flex justify-between items-center">
                <h4 className="font-bold">New Topic</h4>
                <button onClick={() => setIsAddingTopic(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddTopic} className="space-y-4">
                <input 
                  required
                  type="text" 
                  placeholder="Topic Title"
                  value={newTopic.title}
                  onChange={e => setNewTopic({...newTopic, title: e.target.value})}
                  className="w-full input-field"
                />
                <input 
                  required
                  type="datetime-local" 
                  value={newTopic.dueDate}
                  onChange={e => setNewTopic({...newTopic, dueDate: e.target.value})}
                  className="w-full input-field [color-scheme:dark]"
                />
                <button type="submit" className="w-full btn-primary">Create Topic</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="space-y-4">
          {topics.map((topic) => (
            <div key={topic.id} className="space-y-2">
              <div
                className={cn(
                  "w-full text-left p-4 glass transition-all flex items-center gap-4 group cursor-pointer",
                  selectedTopicId === topic.id && !selectedSubTopicId ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(255,0,0,0.1)]" : "hover:border-primary"
                )}
                onClick={() => toggleTopicExpansion(topic.id)}
              >
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStatus(topic, 'topic');
                  }}
                  className="text-text-muted hover:text-primary transition-colors"
                >
                  {topic.status === 'completed' ? <CheckCircle2 className="text-primary" size={22} /> : <Circle size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn("font-bold text-lg truncate", topic.status === 'completed' && "line-through text-text-muted")}>
                    {topic.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted mt-1">
                    {editingTopicId === topic.id ? (
                      <div className="flex flex-wrap items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="datetime-local"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="bg-bg border border-border rounded px-2 py-1 text-[11px] outline-none focus:border-primary text-text [color-scheme:dark]"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleUpdateTopicDate(topic.id, editDueDate)}
                            className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/80 transition-colors"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingTopicId(null)}
                            className="px-3 py-1 bg-card/50 text-text-muted text-[10px] font-bold rounded hover:bg-card transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Calendar size={12} /> {format(new Date(topic.dueDate), 'MMM d')}
                        </span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTopicId(topic.id);
                              setEditDueDate(format(new Date(topic.dueDate), "yyyy-MM-dd'T'HH:mm"));
                            }}
                            className="p-1 hover:bg-card/50 rounded text-primary lg:opacity-0 lg:group-hover:opacity-100 transition-all"
                            title="Edit Due Date"
                          >
                            <Edit3 size={10} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              extendTopicDate(topic, 7);
                            }}
                            className="px-1.5 py-0.5 bg-primary/10 hover:bg-primary/20 rounded text-[9px] font-bold text-primary lg:opacity-0 lg:group-hover:opacity-100 transition-all"
                            title="Extend by 7 days"
                          >
                            +7d
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-1 h-1 bg-border rounded-full hidden sm:block" />
                      <span className="whitespace-nowrap">
                        {subTopics.filter(s => s.topicId === topic.id).length} 
                        <span className="hidden sm:inline"> Sub-topics</span>
                        <span className="sm:hidden"> ST</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingSubTopic(topic.id);
                    }}
                    className="p-1.5 text-text-muted hover:text-primary transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: topic.id, type: 'topic', title: topic.title });
                    }}
                    className="p-1.5 text-text-muted hover:text-red-500 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                  {expandedTopics.has(topic.id) ? <ChevronDown size={20} className="text-primary" /> : <ChevronRight size={20} />}
                </div>
              </div>

              {/* Expanded Area for Topic */}
              <AnimatePresence>
                {expandedTopics.has(topic.id) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    {/* SubTopics List */}
                    <div className="pl-8 space-y-2">
                      {subTopics.filter(s => s.topicId === topic.id).map(sub => (
                        <div key={sub.id} className="space-y-2">
                          <div
                            className={cn(
                              "w-full text-left p-3 glass transition-all flex items-center gap-3 group cursor-pointer text-sm",
                              selectedSubTopicId === sub.id ? "border-primary bg-primary/5" : "hover:border-primary"
                            )}
                            onClick={() => {
                              if (selectedSubTopicId === sub.id) {
                                setSelectedSubTopicId(null);
                                setSelectedTopicId(topic.id); // Re-select parent topic notes
                              } else {
                                setSelectedTopicId(topic.id);
                                setSelectedSubTopicId(sub.id);
                              }
                              setIsEditingNote(false);
                            }}
                          >
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStatus(sub, 'subtopic');
                              }}
                              className="text-text-muted hover:text-primary transition-colors"
                            >
                              {sub.status === 'completed' ? <CheckCircle2 className="text-primary" size={18} /> : <Circle size={18} />}
                            </div>
                            <span className={cn("flex-1 truncate font-medium", sub.status === 'completed' && "line-through text-text-muted")}>
                              {sub.title}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ id: sub.id, type: 'subtopic', title: sub.title });
                              }}
                              className="lg:opacity-0 lg:group-hover:opacity-100 text-text-muted hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                            {selectedSubTopicId === sub.id ? <ChevronDown size={14} className="text-primary" /> : <ChevronRight size={14} />}
                          </div>
                          
                          {/* SubTopic Notes (if selected) */}
                          {selectedSubTopicId === sub.id && renderNoteSection()}
                        </div>
                      ))}
                      
                      {isAddingSubTopic === topic.id ? (
                        <div className="p-2 flex gap-2">
                          <input 
                            autoFocus
                            type="text" 
                            value={newSubTopicTitle}
                            onChange={e => setNewSubTopicTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddSubTopic(topic.id)}
                            placeholder="Sub-topic title..."
                            className="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-xs outline-none focus:border-primary"
                          />
                          <button onClick={() => handleAddSubTopic(topic.id)} className="text-primary"><CheckCircle2 size={20} /></button>
                          <button onClick={() => setIsAddingSubTopic(null)} className="text-text-muted"><X size={20} /></button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setIsAddingSubTopic(topic.id)}
                          className="w-full text-left p-2 text-xs text-text-muted hover:text-primary flex items-center gap-2 transition-colors"
                        >
                          <Plus size={14} /> Add Sub-topic
                        </button>
                      )}
                    </div>

                    {/* Topic Notes (if selected) */}
                    {selectedTopicId === topic.id && !selectedSubTopicId && renderNoteSection()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          
          {topics.length === 0 && !isAddingTopic && (
            <div className="text-center py-20 glass border-dashed border-2">
              <FileText size={48} className="mx-auto mb-4 opacity-10" />
              <h4 className="text-lg font-bold text-text-muted">No curriculum yet</h4>
              <p className="text-sm text-text-muted mt-1">Break down this skill into topics and sub-topics.</p>
              <button 
                onClick={() => setIsAddingTopic(true)}
                className="mt-4 text-primary font-bold hover:underline"
              >
                Add your first topic
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.type === 'topic' ? 'topic' : 'sub-topic'}?`}
        message={`"${deleteTarget?.title || 'This item'}" and its related notes will be removed.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteItem(deleteTarget.id, deleteTarget.type)}
      />
      <LinkDialog
        open={isLinkDialogOpen}
        onCancel={() => setIsLinkDialogOpen(false)}
        onSubmit={addLinkFromDialog}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

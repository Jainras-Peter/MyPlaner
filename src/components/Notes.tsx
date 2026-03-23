import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, FileText, Link as LinkIcon, Video, Trash2, Edit3, X, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ConfirmDialog from './ConfirmDialog';
import LinkDialog from './LinkDialog';

export default function Notes() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    topic: '',
    links: [] as string[]
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notes'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const nextNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(nextNotes);
      setSelectedNote(prevSelected => {
        if (nextNotes.length === 0) return null;
        if (!prevSelected) return nextNotes[0];
        return nextNotes.find(note => note.id === prevSelected.id) || nextNotes[0];
      });
    });
  }, [user]);

  const handleSaveNote = async () => {
    if (!user) return;
    const noteData = {
      ...newNote,
      userId: user.uid,
      updatedAt: new Date().toISOString()
    };

    if (selectedNote?.id) {
      await updateDoc(doc(db, 'notes', selectedNote.id), noteData);
    } else {
      await addDoc(collection(db, 'notes'), noteData);
    }
    setIsEditing(false);
    setSelectedNote(null);
    setNewNote({ title: '', content: '', topic: '', links: [] });
  };

  const addLink = () => {
    setIsLinkDialogOpen(true);
  };

  const handleAddLink = (link: string) => {
    if (!newNote.links.includes(link)) {
      setNewNote(prev => ({ ...prev, links: [...(prev.links || []), link] }));
    }
    setIsLinkDialogOpen(false);
  };

  const deleteNote = async (id: string) => {
    await deleteDoc(doc(db, 'notes', id));
    if (selectedNote?.id === id) setSelectedNote(null);
    setDeleteTarget(null);
  };

  const filteredNotes = notes.filter(n => 
    (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.topic || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold">Notes & Resources</h2>
          <p className="text-text-muted">Capture knowledge, links, and documents.</p>
        </div>
        <button 
          onClick={() => {
            setIsEditing(true);
            setSelectedNote(null);
            setNewNote({ title: '', content: '', topic: '', links: [] });
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Note
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Notes List */}
        <div className="w-full lg:w-80 flex flex-col gap-4 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2 outline-none focus:border-primary"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  setSelectedNote(note);
                  setIsEditing(false);
                }}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all",
                  selectedNote?.id === note.id 
                    ? "bg-primary/10 border-primary" 
                    : "bg-card border-border hover:border-primary"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] uppercase font-bold text-primary">{note.topic || 'General'}</span>
                  <div className="flex gap-1">
                    {note.links?.length > 0 && <LinkIcon size={12} className="text-text-muted" />}
                  </div>
                </div>
                <h4 className="font-medium truncate">{note.title}</h4>
                <p className="text-xs text-text-muted mt-2">{new Date(note.updatedAt).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Note Content / Editor */}
        <div className="flex-1 glass overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col p-6 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <input 
                    type="text" 
                    placeholder="Note Title"
                    value={newNote.title}
                    onChange={e => setNewNote({...newNote, title: e.target.value})}
                    className="text-2xl font-display font-bold bg-transparent outline-none w-full"
                  />
                  <button onClick={() => setIsEditing(false)}><X size={24} /></button>
                </div>
                <input 
                  type="text" 
                  placeholder="Topic (e.g. React, Fitness)"
                  value={newNote.topic}
                  onChange={e => setNewNote({...newNote, topic: e.target.value})}
                  className="bg-bg border border-border rounded-lg px-3 py-1 text-sm outline-none"
                />
                <textarea 
                  placeholder="Write your notes here (Markdown supported)..."
                  value={newNote.content}
                  onChange={e => setNewNote({...newNote, content: e.target.value})}
                  className="flex-1 bg-transparent outline-none resize-none font-mono text-sm"
                />
                <div className="space-y-2">
                  {newNote.links?.map((link: string, i: number) => (
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
                      <button
                        onClick={() => setNewNote(prev => ({ ...prev, links: prev.links.filter((_, idx) => idx !== i) }))}
                        className="text-text-muted transition-colors hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-border flex justify-between items-center">
                  <button 
                    onClick={addLink}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Plus size={16} /> Add Link
                  </button>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-lg border border-border hover:bg-card/50"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveNote}
                      className="btn-primary"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : selectedNote ? (
              <motion.div 
                key="viewer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <div>
                    <span className="text-xs text-primary font-bold uppercase tracking-widest">{selectedNote.topic}</span>
                    <h3 className="text-2xl font-display font-bold">{selectedNote.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setNewNote({
                          title: selectedNote.title || '',
                          content: selectedNote.content || '',
                          topic: selectedNote.topic || '',
                          links: selectedNote.links || []
                        });
                        setIsEditing(true);
                      }}
                      className="p-2 hover:bg-card/50 rounded-lg text-text-muted hover:text-text"
                    >
                      <Edit3 size={20} />
                    </button>
                    <button 
                      onClick={() => setDeleteTarget(selectedNote)}
                      className="p-2 hover:bg-card/50 rounded-lg text-text-muted hover:text-red-400"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <div className={cn("flex-1 overflow-y-auto p-6 prose max-w-none", theme === 'dark' && "prose-invert")}>
                  <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
                  
                  {selectedNote.links?.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-border">
                      <h5 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <LinkIcon size={16} /> Resources & Links
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedNote.links.map((link: string, i: number) => (
                          <a 
                            key={i} 
                            href={link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-bg border border-border rounded-lg hover:border-primary transition-colors group"
                          >
                            <div className="p-2 bg-card/50 rounded group-hover:bg-primary/10 group-hover:text-primary">
                              {link.includes('youtube.com') || link.includes('youtu.be') ? <Video size={16} /> : <FileText size={16} />}
                            </div>
                            <span className="text-xs truncate flex-1">{link}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                <FileText size={48} className="mb-4 opacity-20" />
                <p>Select a note to view or create a new one.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete note?"
        message={`"${deleteTarget?.title || 'This note'}" will be removed permanently.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteNote(deleteTarget.id)}
      />
      <LinkDialog
        open={isLinkDialogOpen}
        onCancel={() => setIsLinkDialogOpen(false)}
        onSubmit={handleAddLink}
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

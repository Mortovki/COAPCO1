import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Edit2, Trash2, MessageSquare, Clock, User, Tag, Star, Calendar, FileText } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, onSnapshot, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Por Hacer', color: 'bg-slate-100 text-slate-700' },
  { value: 'working_on_it', label: 'En Progreso', color: 'bg-orange-100 text-orange-700' },
  { value: 'waiting_review', label: 'En Revisión', color: 'bg-blue-100 text-blue-700' },
  { value: 'stuck', label: 'Atascado', color: 'bg-red-100 text-red-700' },
  { value: 'done', label: 'Completado', color: 'bg-green-100 text-green-700' },
];

const TYPE_OPTIONS = ['feature', 'bug', 'quality', 'security', 'operations'];

const TaskSidePanel = ({ taskId, projectId, onClose, userRole, currentUser, students }: any) => {
  const [task, setTask] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!taskId || !projectId) return;

    const taskRef = doc(db, `projects/${projectId}/tasks/${taskId}`);
    const unsubscribeTask = onSnapshot(taskRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setTask(data);
        setEditForm(data);
      }
      setIsLoading(false);
    });

    const notesRef = collection(db, `projects/${projectId}/tasks/${taskId}/notes`);
    const q = query(notesRef, orderBy('createdAt', 'desc'));
    const unsubscribeNotes = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeTask();
      unsubscribeNotes();
    };
  }, [taskId, projectId]);

  const handleSave = async () => {
    if (userRole !== 'admin') {
      toast.error('Solo administradores pueden editar tareas');
      return;
    }
    try {
      await updateDoc(doc(db, `projects/${projectId}/tasks/${taskId}`), editForm);
      setIsEditing(false);
      toast.success('Tarea actualizada');
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error('Error al actualizar tarea');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/tasks/${taskId}`), { status: newStatus });
      toast.success('Estado actualizado');
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const authorName = currentUser?.displayName || 'Usuario';
      await addDoc(collection(db, `projects/${projectId}/tasks/${taskId}/notes`), {
        content: newNote,
        authorUid: currentUser?.uid,
        authorName: authorName,
        createdAt: new Date().toISOString(),
        editedAt: null
      });
      setNewNote('');
      toast.success('Nota agregada');
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error('Error al agregar nota');
    }
  };

  if (isLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-start gap-4">
            <div className="flex-1">
              {isEditing ? (
                <input 
                  value={editForm.title} 
                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                  className="w-full text-2xl font-black text-slate-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent"
                />
              ) : (
                <h2 className="text-2xl font-black text-slate-900">{task?.title}</h2>
              )}
              
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <select 
                  value={task?.status} 
                  onChange={e => handleStatusChange(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest outline-none cursor-pointer ${STATUS_OPTIONS.find(o => o.value === task?.status)?.color || 'bg-slate-100 text-slate-700'}`}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold">
                  <User size={16} />
                  {isEditing ? (
                    <select 
                      value={editForm.assignedTo} 
                      onChange={e => setEditForm({...editForm, assignedTo: e.target.value})}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
                    >
                      <option value="">Sin asignar</option>
                      {students.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.firstName} {s.lastNamePaterno}</option>
                      ))}
                    </select>
                  ) : (
                    <span title={students.find((s: any) => s.id === task?.assignedTo)?.career || ''}>
                      {students.find((s: any) => s.id === task?.assignedTo)?.firstName || 'Sin asignar'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {userRole === 'admin' && (
                isEditing ? (
                  <button onClick={handleSave} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Save size={20} /></button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Edit2 size={20} /></button>
                )
              )}
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><X size={24} /></button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12}/> Inicio</span>
                {isEditing ? (
                  <input type="date" value={editForm.startDate?.split('T')[0] || ''} onChange={e => setEditForm({...editForm, startDate: new Date(e.target.value).toISOString()})} className="w-full text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none" />
                ) : (
                  <p className="font-bold text-slate-700 text-sm">{task?.startDate ? new Intl.DateTimeFormat('es-MX').format(new Date(task.startDate)) : '-'}</p>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12}/> Fin</span>
                {isEditing ? (
                  <input type="date" value={editForm.endDate?.split('T')[0] || ''} onChange={e => setEditForm({...editForm, endDate: new Date(e.target.value).toISOString()})} className="w-full text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none" />
                ) : (
                  <p className="font-bold text-slate-700 text-sm">{task?.endDate ? new Intl.DateTimeFormat('es-MX').format(new Date(task.endDate)) : '-'}</p>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Star size={12}/> Prioridad</span>
                {isEditing ? (
                  <select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: Number(e.target.value)})} className="w-full text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none">
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Estrellas</option>)}
                  </select>
                ) : (
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className={i < (task?.priority || 3) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'} />
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Tag size={12}/> Tipo</span>
                {isEditing ? (
                  <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} className="w-full text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none">
                    {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <p className="font-bold text-slate-700 text-sm capitalize">{task?.type || '-'}</p>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock size={12}/> Esfuerzo</span>
                {isEditing ? (
                  <input type="number" value={editForm.effort || 0} onChange={e => setEditForm({...editForm, effort: Number(e.target.value)})} className="w-full text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none" />
                ) : (
                  <p className="font-bold text-slate-700 text-sm">{task?.effort || 0} pts</p>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Tag size={12}/> Sprint/Fase</span>
                {isEditing ? (
                  <input type="text" value={editForm.phase || ''} onChange={e => setEditForm({...editForm, phase: e.target.value})} className="w-full text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none" />
                ) : (
                  <p className="font-bold text-slate-700 text-sm">{task?.phase || '-'}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><FileText size={16} /> Descripción</h3>
              {isEditing ? (
                <textarea 
                  value={editForm.description || ''} 
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Descripción de la tarea..."
                />
              ) : (
                <div className="prose prose-sm max-w-none text-slate-600 bg-white p-4 rounded-2xl border border-slate-100">
                  <ReactMarkdown>{task?.description || '*Sin descripción*'}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={16} /> Notas y Comentarios</h3>
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <textarea 
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Escribe una nota (soporta Markdown)..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl min-h-[80px] focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    Agregar Nota
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {notes.map((note: any) => (
                  <div key={note.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">
                          {note.authorName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{note.authorName}</p>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                            {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.createdAt))}
                          </p>
                        </div>
                      </div>
                      {note.authorUid === currentUser?.uid && (
                        <button className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 size={14} /></button>
                      )}
                    </div>
                    <div className="prose prose-sm max-w-none text-slate-600 pl-10">
                      <ReactMarkdown>{note.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-center text-slate-400 text-sm font-medium py-8">No hay notas aún.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TaskSidePanel;

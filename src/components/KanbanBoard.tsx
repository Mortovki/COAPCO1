import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { Plus, MessageSquare, Star, User, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import TaskSidePanel from './TaskSidePanel';
import { MobileTabBar } from './ui/MobileTabBar';
import { computeCriticalPath } from '../utils/criticalPath';
import { Task } from '../types/criticalPath';

const STATUS_COLUMNS = [
  { id: 'working_on_it', title: 'Working on it', color: 'bg-orange-500', bg: 'bg-orange-50' },
  { id: 'waiting_review', title: 'Waiting for review', color: 'bg-blue-500', bg: 'bg-blue-50' },
  { id: 'stuck', title: 'Stuck', color: 'bg-red-500', bg: 'bg-red-50' },
  { id: 'done', title: 'Done', color: 'bg-green-500', bg: 'bg-green-50' },
];

const KanbanBoard = ({ tasks, projectId, userRole, currentUser, students }: any) => {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string>(STATUS_COLUMNS[0].id);
  const [isMobileView, setIsMobileView] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Drag to scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll-fast
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const cpmTasks = useMemo(() => {
    try {
      return computeCriticalPath(tasks as Task[]);
    } catch (e) {
      console.error("Error computing CPM:", e);
      return tasks as Task[];
    }
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    const task = tasks.find((t: any) => t.id === draggedTask);
    if (task && task.status !== statusId) {
      try {
        await updateDoc(doc(db, `projects/${projectId}/tasks/${draggedTask}`), {
          status: statusId
        });
        toast.success('Estado actualizado');
      } catch (error) {
        console.error("Error updating task status:", error);
        toast.error('Error al actualizar estado');
      }
    }
    setDraggedTask(null);
  };

  const handleAddTask = async (statusId: string) => {
    if (userRole !== 'admin') {
      toast.error('Solo administradores pueden crear tareas');
      return;
    }
    try {
      const newTask = {
        projectId,
        title: 'Nueva Tarea',
        description: '',
        status: statusId,
        priority: 3,
        effort: 1,
        type: 'feature',
        assignedTo: '',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        phase: 'Sprint 1',
        epic: '',
        estimatedSP: 1,
        categoryId: '',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid || ''
      };
      const docRef = await addDoc(collection(db, `projects/${projectId}/tasks`), newTask);
      setSelectedTaskId(docRef.id);
      toast.success('Tarea creada');
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error('Error al crear tarea');
    }
  };

  const renderStars = (priority: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={12} className={i < priority ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'} />
    ));
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'feature': return 'bg-purple-100 text-purple-700';
      case 'bug': return 'bg-red-100 text-red-700';
      case 'quality': return 'bg-blue-100 text-blue-700';
      case 'security': return 'bg-slate-800 text-white';
      case 'operations': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const renderTaskCard = (task: any) => {
    const assignedStudent = students.find((s: any) => s.id === task.assignedTo);
    const initials = assignedStudent ? `${assignedStudent.firstName.charAt(0)}${assignedStudent.lastNamePaterno.charAt(0)}` : '?';
    
    if (isMobileView) {
      return (
        <div 
          key={task.id}
          onClick={() => setSelectedTaskId(task.id)}
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer active:scale-95 ${task.isCritical ? 'border-red-300' : 'border-slate-200'}`}
        >
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-bold text-slate-800 text-sm leading-tight flex-1">
              {task.title}
            </h4>
            <div className="w-6 h-6 shrink-0 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">
              {initials}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${getTypeColor(task.type)}`}>
              {task.type}
            </span>
            {task.isCritical && (
              <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                <AlertTriangle size={10} /> CPM
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div 
        key={task.id}
        draggable={!isMobileView}
        onDragStart={(e) => handleDragStart(e, task.id)}
        onClick={() => setSelectedTaskId(task.id)}
        className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-all active:scale-95 group ${task.isCritical ? 'border-red-300 hover:border-red-400' : 'border-slate-200 hover:border-indigo-300'}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${getTypeColor(task.type)}`}>
              {task.type}
            </span>
            {task.isCritical && (
              <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md" title="Ruta Crítica">
                <AlertTriangle size={10} /> CPM
              </span>
            )}
          </div>
          <div className="flex gap-0.5">
            {renderStars(task.priority || 3)}
          </div>
        </div>
        
        <h4 className="font-bold text-slate-800 text-sm leading-tight mb-3 group-hover:text-indigo-600 transition-colors">
          {task.title}
        </h4>
        
        <div className="flex justify-between items-end mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black" title={assignedStudent ? `${assignedStudent.firstName} ${assignedStudent.lastNamePaterno}` : 'Sin asignar'}>
              {initials}
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
              <MessageSquare size={12} />
              <span>{task.noteCount || 0}</span>
            </div>
          </div>
          <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
            SP: {task.estimatedSP || 0}
          </div>
        </div>
      </div>
    );
  };

  const renderColumn = (column: any) => {
    const columnTasks = cpmTasks.filter((t: any) => t.status === column.id);
    return (
      <div 
        key={column.id} 
        className={`w-full sm:w-[calc(50%-12px)] lg:w-80 shrink-0 flex flex-col rounded-2xl border border-slate-200 ${column.bg} overflow-hidden snap-center`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, column.id)}
      >
        <div className={`p-4 ${column.color} text-white font-black flex justify-between items-center`}>
          <span>{column.title}</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{columnTasks.length}</span>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {columnTasks.map(renderTaskCard)}
          
          {userRole === 'admin' && (
            <button 
              onClick={() => handleAddTask(column.id)}
              className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all"
            >
              <Plus size={16} /> Add Task
            </button>
          )}
        </div>
      </div>
    );
  };

  const mobileTabs = STATUS_COLUMNS.map(col => ({
    id: col.id,
    label: col.title,
    badge: cpmTasks.filter((t: any) => t.status === col.id).length
  }));

  return (
    <div className="h-full flex flex-col">
      {isMobileView && (
        <div className="mb-4">
          <MobileTabBar tabs={mobileTabs} activeTab={activeColumnId} onChange={setActiveColumnId} />
        </div>
      )}

      <div 
        className={`flex-1 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div className="flex gap-6 h-full min-w-max sm:min-w-0">
          {isMobileView 
            ? renderColumn(STATUS_COLUMNS.find(c => c.id === activeColumnId))
            : STATUS_COLUMNS.map(renderColumn)
          }
        </div>
      </div>

      {selectedTaskId && (
        <TaskSidePanel 
          taskId={selectedTaskId} 
          projectId={projectId} 
          onClose={() => setSelectedTaskId(null)} 
          userRole={userRole}
          currentUser={currentUser}
          students={students}
        />
      )}
    </div>
  );
};

export default KanbanBoard;

import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Star, ChevronDown, ChevronRight, Filter, User, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import TaskSidePanel from './TaskSidePanel';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatusBadge } from './ui/StatusBadge';
import { computeCriticalPath } from '../utils/criticalPath';
import { Task } from '../types/criticalPath';

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700',
  working_on_it: 'bg-orange-100 text-orange-700',
  waiting_review: 'bg-blue-100 text-blue-700',
  stuck: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'Por Hacer',
  working_on_it: 'En Progreso',
  waiting_review: 'En Revisión',
  stuck: 'Atascado',
  done: 'Completado',
};

const SprintTable = ({ tasks, projectId, userRole, currentUser, students }: any) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const cpmTasks = useMemo(() => {
    try {
      return computeCriticalPath(tasks as Task[]);
    } catch (e) {
      console.error("Error computing CPM:", e);
      return tasks as Task[];
    }
  }, [tasks]);

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  const handlePriorityChange = async (taskId: string, priority: number) => {
    if (userRole !== 'admin') {
      toast.error('Solo administradores pueden cambiar la prioridad');
      return;
    }
    try {
      await updateDoc(doc(db, `projects/${projectId}/tasks/${taskId}`), { priority });
      toast.success('Prioridad actualizada');
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error('Error al actualizar prioridad');
    }
  };

  const filteredTasks = useMemo(() => {
    return cpmTasks.filter((t: any) => {
      if (filterUser && t.assignedTo !== filterUser) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      return true;
    });
  }, [cpmTasks, filterUser, filterStatus]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredTasks.forEach((t: any) => {
      const phase = t.phase || 'Sin Sprint';
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(t);
    });
    return groups;
  }, [filteredTasks]);

  const renderStars = (taskId: string, priority: number) => {
    return (
      <div className="flex gap-0.5 cursor-pointer">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star 
            key={i} 
            size={14} 
            onClick={(e) => { e.stopPropagation(); handlePriorityChange(taskId, i + 1); }}
            className={i < priority ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 hover:text-yellow-200'} 
          />
        ))}
      </div>
    );
  };

  const generateBurndownData = (sprintTasks: any[]) => {
    const totalSP = sprintTasks.reduce((acc: number, t: any) => acc + (t.estimatedSP || 0), 0);
    const data = [];
    let remaining = totalSP;
    for (let i = 0; i <= 10; i++) {
      if (i > 0) remaining -= Math.floor(Math.random() * (totalSP / 10));
      if (remaining < 0) remaining = 0;
      data.push({
        day: `Día ${i}`,
        ideal: totalSP - (totalSP / 10) * i,
        actual: i <= 5 ? remaining : null
      });
    }
    return data;
  };

  const renderMobileTaskCard = (task: any) => {
    const assignedStudent = students.find((s: any) => s.id === task.assignedTo);
    return (
      <div 
        key={task.id} 
        onClick={() => setSelectedTaskId(task.id)}
        className={`bg-white p-4 rounded-xl shadow-sm border mb-3 cursor-pointer active:scale-95 transition-transform ${task.isCritical ? 'border-red-300' : 'border-slate-200'}`}
      >
        <div className="flex justify-between items-start mb-2">
          <StatusBadge status={task.status} size="sm" />
          {renderStars(task.id, task.priority || 3)}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-bold text-slate-800 text-sm">{task.title}</h4>
          {task.isCritical && (
            <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md" title="Ruta Crítica">
              <AlertTriangle size={10} /> CPM
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 mb-3">{task.epic || 'Sin Epic'}</div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-black">
              {assignedStudent ? `${assignedStudent.firstName.charAt(0)}${assignedStudent.lastNamePaterno.charAt(0)}` : '?'}
            </div>
            <span className="text-xs font-semibold text-slate-600">{assignedStudent?.firstName || 'Sin asignar'}</span>
          </div>
          <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
            <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md">Esfuerzo: {task.effort || 0}</span>
            <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">SP: {task.estimatedSP || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest">
          <Filter size={16} /> Filtros:
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select 
            value={filterUser} 
            onChange={e => setFilterUser(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
          >
            <option value="">Todos los Responsables</option>
            {students.map((s: any) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastNamePaterno}</option>
            ))}
          </select>
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
          >
            <option value="">Todos los Estados</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-slate-50/50">
        {isMobileView ? (
          <div className="p-4 space-y-6">
            {Object.entries(groupedTasks).map(([phase, phaseTasks]) => {
              const isExpanded = expandedPhases[phase] !== false;
              const totalSP = phaseTasks.reduce((acc, t) => acc + (t.estimatedSP || 0), 0);
              const doneCount = phaseTasks.filter(t => t.status === 'done').length;
              
              return (
                <div key={phase} className="space-y-3">
                  <div 
                    className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
                    onClick={() => togglePhase(phase)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                      <span className="font-black text-slate-800 uppercase tracking-widest text-sm">{phase}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs font-bold text-slate-500">{phaseTasks.length}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      Progreso: {Math.round((doneCount / phaseTasks.length) * 100) || 0}%
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pl-2 border-l-2 border-indigo-100 space-y-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={generateBurndownData(phaseTasks)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" tick={{fontSize: 10}} />
                            <YAxis tick={{fontSize: 10}} />
                            <Tooltip />
                            <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                            <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {phaseTasks.map(renderMobileTaskCard)}
                    </div>
                  )}
                </div>
              );
            })}
            {Object.keys(groupedTasks).length === 0 && (
              <div className="p-8 text-center text-slate-500 font-medium bg-white rounded-xl border border-slate-200">
                No hay tareas que coincidan con los filtros.
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse bg-white">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Tarea</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Responsable</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Estado</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Prioridad</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Tipo</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Esfuerzo</th>
                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">SP Est.</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedTasks).map(([phase, phaseTasks]) => {
                const isExpanded = expandedPhases[phase] !== false; // Default true
                const totalSP = phaseTasks.reduce((acc, t) => acc + (t.estimatedSP || 0), 0);
                const doneCount = phaseTasks.filter(t => t.status === 'done').length;
                
                return (
                  <React.Fragment key={phase}>
                    {/* Phase Header */}
                    <tr className="bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group" onClick={() => togglePhase(phase)}>
                      <td colSpan={7} className="p-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={18} className="text-slate-400 group-hover:text-indigo-600" /> : <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-600" />}
                            <span className="font-black text-slate-800 uppercase tracking-widest">{phase}</span>
                            <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 border border-slate-200">{phaseTasks.length} tareas</span>
                          </div>
                          <div className="flex gap-4 text-xs font-bold text-slate-500">
                            <span>Progreso: {Math.round((doneCount / phaseTasks.length) * 100) || 0}%</span>
                            <span>Total SP: {totalSP}</span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Burndown Chart (if expanded) */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="p-0 border-b border-slate-200 bg-white">
                          <div className="h-48 p-4 border-l-4 border-indigo-500">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={generateBurndownData(phaseTasks)} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="day" tick={{fontSize: 10}} />
                                <YAxis tick={{fontSize: 10}} />
                                <Tooltip />
                                <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                                <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Tasks */}
                    {isExpanded && phaseTasks.map((task: any) => {
                      const assignedStudent = students.find((s: any) => s.id === task.assignedTo);
                      return (
                        <tr 
                          key={task.id} 
                          onClick={() => setSelectedTaskId(task.id)}
                          className={`border-b border-slate-100 hover:bg-indigo-50/30 transition-colors cursor-pointer ${task.isCritical ? 'bg-red-50/30' : ''}`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-slate-800 text-sm">{task.title}</div>
                              {task.isCritical && (
                                <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md" title="Ruta Crítica">
                                  <AlertTriangle size={10} /> CPM
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">{task.epic || 'Sin Epic'}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-black">
                                {assignedStudent ? `${assignedStudent.firstName.charAt(0)}${assignedStudent.lastNamePaterno.charAt(0)}` : '?'}
                              </div>
                              <span className="text-sm font-semibold text-slate-600">{assignedStudent?.firstName || 'Sin asignar'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <StatusBadge status={task.status} size="sm" />
                          </td>
                          <td className="p-4">
                            {renderStars(task.id, task.priority || 3)}
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-bold text-slate-500 capitalize">{task.type}</span>
                          </td>
                          <td className="p-4 text-sm font-bold text-slate-700">{task.effort || 0}</td>
                          <td className="p-4 text-sm font-bold text-slate-700">{task.estimatedSP || 0}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {Object.keys(groupedTasks).length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                    No hay tareas que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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

export default SprintTable;

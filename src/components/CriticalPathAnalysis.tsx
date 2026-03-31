import React, { useMemo, useState } from 'react';
import { computeCriticalPath } from '../utils/criticalPath';
import { Task } from '../types/criticalPath';
import { AlertTriangle, CheckCircle2, Clock, Activity, ArrowRight, Plus, Minus, RotateCcw } from 'lucide-react';
import { SlackChip } from './ui/SlackChip';
import { StatusBadge } from './ui/StatusBadge';
import { ResponsiveFilterBar } from './ui/ResponsiveFilterBar';
import { MobileTabBar } from './ui/MobileTabBar';

interface CriticalPathAnalysisProps {
  tasks: Task[];
}

export const CriticalPathAnalysis: React.FC<CriticalPathAnalysisProps> = ({ tasks }) => {
  const [activeTab, setActiveTab] = useState('metrics');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [simulatedDelays, setSimulatedDelays] = useState<Record<string, number>>({});

  // Compute Original CPM
  const originalCpmTasks = useMemo(() => {
    try {
      return computeCriticalPath(tasks);
    } catch (e) {
      console.error("Error computing original CPM:", e);
      return tasks;
    }
  }, [tasks]);

  const originalDuration = Math.max(...originalCpmTasks.map(t => t.earlyFinish || 0), 0);

  // Compute Simulated CPM
  const cpmTasks = useMemo(() => {
    try {
      if (Object.keys(simulatedDelays).length === 0) return originalCpmTasks;
      
      const simulatedTasks = tasks.map(t => ({
        ...t,
        duration: (t.duration || 0) + (simulatedDelays[t.id] || 0)
      }));
      return computeCriticalPath(simulatedTasks);
    } catch (e) {
      console.error("Error computing simulated CPM:", e);
      return originalCpmTasks;
    }
  }, [tasks, simulatedDelays, originalCpmTasks]);

  const criticalTasks = cpmTasks.filter(t => t.isCritical);
  const totalDuration = Math.max(...cpmTasks.map(t => t.earlyFinish || 0), 0);
  const completedCritical = criticalTasks.filter(t => t.status === 'done').length;
  const criticalProgress = criticalTasks.length > 0 ? (completedCritical / criticalTasks.length) * 100 : 0;

  const filteredTasks = cpmTasks.filter(t => {
    if (filterStatus.length > 0 && !filterStatus.includes(t.status)) return false;
    return true;
  });

  const tabs = [
    { id: 'metrics', label: 'Métricas', icon: Activity },
    { id: 'tasks', label: 'Tareas', icon: CheckCircle2 },
    { id: 'simulator', label: 'Simulador', icon: Clock },
  ];

  const statusOptions = [
    { id: 'todo', label: 'Pendiente' },
    { id: 'working_on_it', label: 'En Progreso' },
    { id: 'done', label: 'Completada' },
  ];

  const handleAddDelay = (taskId: string, amount: number) => {
    setSimulatedDelays(prev => {
      const current = prev[taskId] || 0;
      const next = current + amount;
      if (next <= 0) {
        const { [taskId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [taskId]: next };
    });
  };

  const resetSimulation = () => setSimulatedDelays({});

  const hasSimulation = Object.keys(simulatedDelays).length > 0;
  const durationDiff = totalDuration - originalDuration;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">Análisis de Ruta Crítica</h2>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] sm:text-xs tracking-[0.2em]">
          Método CPM y Holguras
        </p>
      </div>

      {/* Mobile Tabs */}
      <div className="lg:hidden">
        <MobileTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Metrics & Simulator (Desktop) */}
        <div className={`space-y-6 ${activeTab !== 'metrics' && activeTab !== 'simulator' ? 'hidden lg:block' : ''} lg:col-span-1`}>
          
          {/* Metrics Cards */}
          <div className={`space-y-4 ${activeTab !== 'metrics' ? 'hidden lg:block' : ''}`}>
            <div className={`bg-white p-6 rounded-3xl border ${hasSimulation ? 'border-orange-300 shadow-orange-100' : 'border-slate-200'} shadow-sm transition-colors`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${hasSimulation ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    <Clock size={20} />
                  </div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Duración Total</h3>
                </div>
                {hasSimulation && durationDiff > 0 && (
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">+{durationDiff}d</span>
                )}
              </div>
              <p className="text-4xl font-black text-slate-900">
                {totalDuration} <span className="text-lg text-slate-400">días</span>
              </p>
              {hasSimulation && (
                <p className="text-xs text-slate-400 mt-2 font-medium">Original: {originalDuration} días</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Tareas Críticas</h3>
              </div>
              <p className="text-4xl font-black text-slate-900">{criticalTasks.length}</p>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  <span>Progreso Crítico</span>
                  <span>{Math.round(criticalProgress)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${criticalProgress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Simulator */}
          <div className={`bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col ${activeTab !== 'simulator' ? 'hidden lg:flex' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Activity size={20} className="text-indigo-500" />
                Simulador
              </h3>
              {hasSimulation && (
                <button 
                  onClick={resetSimulation}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Reiniciar simulación"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-4 font-medium">
              Agrega retrasos a las tareas para ver cómo impactan en la duración total del proyecto y la ruta crítica.
            </p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[400px]">
              {tasks.filter(t => t.status !== 'done').map(task => {
                const delay = simulatedDelays[task.id] || 0;
                const isDelayed = delay > 0;
                return (
                  <div key={task.id} className={`p-3 rounded-xl border ${isDelayed ? 'border-orange-200 bg-orange-50' : 'border-slate-100 bg-slate-50'} transition-colors`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-bold text-slate-800 line-clamp-1 flex-1 pr-2" title={task.title}>{task.title}</p>
                      <span className="text-[10px] font-black text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{task.duration || 0}d</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Retraso:</span>
                      <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
                        <button 
                          onClick={() => handleAddDelay(task.id, -1)}
                          disabled={!isDelayed}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className={`text-xs font-black w-6 text-center ${isDelayed ? 'text-orange-600' : 'text-slate-700'}`}>
                          {delay > 0 ? `+${delay}` : '0'}
                        </span>
                        <button 
                          onClick={() => handleAddDelay(task.id, 1)}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {tasks.filter(t => t.status !== 'done').length === 0 && (
                <p className="text-center text-slate-400 text-xs py-4">No hay tareas activas para simular.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Task Table */}
        <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col ${activeTab !== 'tasks' ? 'hidden lg:flex' : ''} lg:col-span-2 overflow-hidden`}>
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-black text-slate-900">Desglose de Tareas {hasSimulation && <span className="text-orange-500 text-sm ml-2">(Simulado)</span>}</h3>
            <ResponsiveFilterBar options={statusOptions} selectedIds={filterStatus} onChange={setFilterStatus} title="Estado" />
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tarea</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Estado</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Duración</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden sm:table-cell">ES / EF</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden sm:table-cell">LS / LF</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Holgura</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">No hay tareas que coincidan con los filtros.</td>
                  </tr>
                ) : (
                  filteredTasks.map(task => {
                    const delay = simulatedDelays[task.id] || 0;
                    return (
                      <tr key={task.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${delay > 0 ? 'bg-orange-50/30' : ''}`}>
                        <td className="p-4">
                          <p className="font-bold text-slate-900 text-sm">{task.title}</p>
                          {task.dependencies && task.dependencies.length > 0 && (
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <ArrowRight size={10} /> Depende de {task.dependencies.length}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={task.status} size="sm" />
                        </td>
                        <td className="p-4 text-sm font-bold text-slate-700">
                          {task.duration || 0}d
                          {delay > 0 && <span className="text-orange-500 text-xs ml-1">(+{delay})</span>}
                        </td>
                        <td className="p-4 text-xs text-slate-500 hidden sm:table-cell">
                          <span className="font-bold text-slate-700">{task.earlyStart}</span> - <span className="font-bold text-slate-700">{task.earlyFinish}</span>
                        </td>
                        <td className="p-4 text-xs text-slate-500 hidden sm:table-cell">
                          <span className="font-bold text-slate-700">{task.lateStart}</span> - <span className="font-bold text-slate-700">{task.lateFinish}</span>
                        </td>
                        <td className="p-4">
                          <SlackChip slack={task.slack || 0} isCritical={task.isCritical || false} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

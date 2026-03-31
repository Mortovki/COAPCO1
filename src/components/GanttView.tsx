import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Maximize, ZoomIn, ZoomOut, AlertTriangle, CheckCircle2, Clock, List, LayoutGrid, Activity } from 'lucide-react';
import TaskSidePanel from './TaskSidePanel';
import { computeCriticalPath } from '../utils/criticalPath';
import { Task } from '../types/criticalPath';
import { SlackChip } from './ui/SlackChip';
import { StatusBadge } from './ui/StatusBadge';

const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 60;

const GanttView = ({ tasks, projectId, project, userRole, currentUser, students }: any) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [scale, setScale] = useState<'days' | 'weeks' | 'months'>('days');
  const [isMobileView, setIsMobileView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drag to scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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
    const walk = (x - startX) * 2; // Scroll-fast
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const DAY_WIDTH = useMemo(() => {
    switch (scale) {
      case 'days': return 40;
      case 'weeks': return 15;
      case 'months': return 5;
      default: return 40;
    }
  }, [scale]);

  // Compute CPM
  const cpmTasks = useMemo(() => {
    try {
      return computeCriticalPath(tasks as Task[]);
    } catch (e) {
      console.error("Error computing CPM:", e);
      return tasks as Task[];
    }
  }, [tasks]);

  const { minDate, maxDate, totalDays, groupedTasks } = useMemo(() => {
    if (!cpmTasks || cpmTasks.length === 0) {
      return { minDate: new Date(), maxDate: new Date(), totalDays: 30, groupedTasks: {} };
    }

    let min = new Date(cpmTasks[0].startDate || new Date());
    let max = new Date(cpmTasks[0].endDate || new Date());

    const groups: Record<string, Task[]> = {};

    cpmTasks.forEach((t: Task) => {
      const start = new Date(t.startDate || new Date());
      const end = new Date(t.endDate || new Date());
      if (start < min) min = start;
      if (end > max) max = end;

      const phase = t.phase || 'Sin Fase';
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(t);
    });

    // Adjust min/max based on scale to ensure full weeks/months are visible
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 14);

    if (scale === 'weeks' || scale === 'months') {
      // Start at the beginning of the week (Sunday)
      min.setDate(min.getDate() - min.getDay());
    }
    if (scale === 'months') {
      // Start at the beginning of the month
      min.setDate(1);
    }

    const diffTime = Math.abs(max.getTime() - min.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    });

    return { minDate: min, maxDate: max, totalDays, groupedTasks: groups };
  }, [cpmTasks, scale]);

  const handleAutoFit = () => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  };

  const todayLineLeft = useMemo(() => {
    const today = new Date();
    if (today < minDate || today > maxDate) return -1;
    const diff = Math.ceil((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff * DAY_WIDTH;
  }, [minDate, maxDate, DAY_WIDTH]);

  const dates = useMemo(() => {
    const d = [];
    let current = new Date(minDate);
    for (let i = 0; i < totalDays; i++) {
      d.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return d;
  }, [minDate, totalDays]);

  // Helper to get task coordinates for dependency lines
  const getTaskCoordinates = useMemo(() => {
    const coords: Record<string, { xStart: number, xEnd: number, y: number }> = {};
    let yIndex = 0;
    
    for (const [phase, phaseTasks] of Object.entries(groupedTasks)) {
      yIndex += 1; // Phase header
      for (let i = 0; i < phaseTasks.length; i++) {
        const task = phaseTasks[i];
        const start = new Date(task.startDate || new Date());
        const end = new Date(task.endDate || new Date());
        const diffStart = Math.ceil((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        
        coords[task.id] = {
          xStart: diffStart * DAY_WIDTH,
          xEnd: (diffStart + duration) * DAY_WIDTH,
          y: HEADER_HEIGHT + yIndex * ROW_HEIGHT + (ROW_HEIGHT / 2)
        };
        yIndex += 1;
      }
    }
    return coords;
  }, [groupedTasks, minDate, DAY_WIDTH]);

  // Mobile View: List of tasks prioritized by critical path
  if (isMobileView) {
    const sortedTasks = [...cpmTasks].sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      return (a.slack || 0) - (b.slack || 0);
    });

    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-black text-slate-900">Cronograma</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vista Móvil (CPM)</p>
          </div>
          <button className="p-2 bg-indigo-50 text-indigo-600 rounded-full">
            <Activity size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sortedTasks.map(task => {
            const assignedStudent = students?.find((s: any) => s.id === task.assignedTo);
            const initials = assignedStudent ? `${assignedStudent.firstName.charAt(0)}${assignedStudent.lastNamePaterno.charAt(0)}` : '?';
            
            return (
              <div 
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`bg-white p-4 rounded-2xl border-2 shadow-sm transition-all active:scale-95 ${task.isCritical ? 'border-red-200' : 'border-slate-100'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-slate-900 text-sm leading-tight pr-4">{task.title}</h4>
                  <StatusBadge status={task.status} size="sm" />
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black">
                    {initials}
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{assignedStudent?.firstName || 'Sin asignar'}</span>
                </div>

                <div className="flex flex-wrap gap-2 items-center justify-between mt-4 border-t border-slate-50 pt-3">
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(task.startDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} - {new Date(task.endDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                  </div>
                  <SlackChip slack={task.slack || 0} isCritical={task.isCritical || false} />
                </div>
              </div>
            );
          })}
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
  }

  // Desktop / Tablet View
  return (
    <div className="h-full flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-4">
          <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
            <button onClick={() => setScale('days')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${scale === 'days' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>Días</button>
            <button onClick={() => setScale('weeks')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${scale === 'weeks' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>Semanas</button>
            <button onClick={() => setScale('months')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${scale === 'months' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>Meses</button>
          </div>
        </div>
        <button onClick={handleAutoFit} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
          <Maximize size={16} /> Auto Fit
        </button>
      </div>

      {/* Gantt Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Panel (Task List) */}
        <div className="hidden sm:flex flex-col border-r border-slate-200 bg-white z-20 shrink-0" style={{ width: 'clamp(200px, 30vw, 320px)' }}>
          <div className="h-[60px] border-b border-slate-200 bg-slate-50 flex items-center px-4 shrink-0">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Tareas</span>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar" id="gantt-left-panel" onScroll={(e) => {
            const rightPanel = document.getElementById('gantt-right-panel');
            if (rightPanel) rightPanel.scrollTop = e.currentTarget.scrollTop;
          }}>
            {Object.entries(groupedTasks).map(([phase, phaseTasks]) => (
              <React.Fragment key={phase}>
                <div className="h-12 border-b border-slate-100 bg-slate-50/80 flex items-center px-4 sticky top-0 z-10">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest truncate">{phase}</span>
                </div>
                {phaseTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="h-12 border-b border-slate-50 flex items-center px-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${task.isCritical ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{task.duration}d</span>
                      </div>
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right Panel (Timeline) */}
        <div 
          className={`flex-1 overflow-auto relative hide-scrollbar ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          id="gantt-right-panel" 
          ref={containerRef} 
          onScroll={(e) => {
            const leftPanel = document.getElementById('gantt-left-panel');
            if (leftPanel) leftPanel.scrollTop = e.currentTarget.scrollTop;
          }}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div style={{ width: totalDays * DAY_WIDTH, minHeight: '100%' }} className="relative">
            
            {/* Grid Background */}
            <svg width="100%" height="100%" className="absolute top-0 left-0 pointer-events-none">
              <defs>
                <pattern id="grid" width={DAY_WIDTH} height={ROW_HEIGHT} patternUnits="userSpaceOnUse">
                  <path d={`M ${DAY_WIDTH} 0 L 0 0 0 ${ROW_HEIGHT}`} fill="none" stroke="#f8fafc" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Dependency Lines */}
              {cpmTasks.map(task => {
                if (!task.dependencies || task.dependencies.length === 0) return null;
                const toCoords = getTaskCoordinates[task.id];
                if (!toCoords) return null;

                return task.dependencies.map(depId => {
                  const fromCoords = getTaskCoordinates[depId];
                  if (!fromCoords) return null;

                  // Draw a path from the end of the dependency to the start of the task
                  const startX = fromCoords.xEnd;
                  const startY = fromCoords.y;
                  const endX = toCoords.xStart;
                  const endY = toCoords.y;
                  
                  // Simple elbow routing
                  const midX = startX + 10;
                  const path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
                  
                  // If the task is critical and the dependency is critical, color the line red
                  const depTask = cpmTasks.find(t => t.id === depId);
                  const isCriticalPath = task.isCritical && depTask?.isCritical;

                  return (
                    <g key={`${depId}-${task.id}`}>
                      <path 
                        d={path} 
                        fill="none" 
                        stroke={isCriticalPath ? '#ef4444' : '#94a3b8'} 
                        strokeWidth={isCriticalPath ? 2 : 1.5}
                        strokeDasharray={isCriticalPath ? 'none' : '4 2'}
                      />
                      <polygon 
                        points={`${endX},${endY - 4} ${endX + 6},${endY} ${endX},${endY + 4}`} 
                        fill={isCriticalPath ? '#ef4444' : '#94a3b8'} 
                      />
                    </g>
                  );
                });
              })}

              {/* Today Line */}
              {todayLineLeft >= 0 && (
                <line x1={todayLineLeft} y1={0} x2={todayLineLeft} y2="100%" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
              )}
            </svg>

            {/* Header Dates */}
            <div className="absolute top-0 left-0 h-[60px] flex border-b border-slate-200 bg-white/95 backdrop-blur-sm z-10 sticky top-0">
              {dates.map((date, i) => {
                // Render logic based on scale
                if (scale === 'months') {
                  if (date.getDate() === 1) {
                    return (
                      <div key={i} className="absolute h-full flex items-end pb-2 border-l border-slate-200 pl-2" style={{ left: i * DAY_WIDTH, width: 30 * DAY_WIDTH }}>
                        <span className="text-xs font-bold text-slate-700">{date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</span>
                      </div>
                    );
                  }
                  return null;
                }
                
                if (scale === 'weeks') {
                  if (date.getDay() === 1) { // Monday
                    return (
                      <div key={i} className="absolute h-full flex flex-col justify-end pb-2 border-l border-slate-200 pl-2" style={{ left: i * DAY_WIDTH, width: 7 * DAY_WIDTH }}>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Semana</span>
                        <span className="text-xs font-bold text-slate-700">{date.getDate()} {date.toLocaleDateString('es-MX', { month: 'short' })}</span>
                      </div>
                    );
                  }
                  return null;
                }

                // Days scale
                return (
                  <div key={i} className="flex flex-col items-center justify-end pb-2 border-r border-slate-100 shrink-0" style={{ width: DAY_WIDTH }}>
                    <span className="text-[9px] font-black text-slate-400 uppercase">{date.toLocaleDateString('es-MX', { weekday: 'short' }).charAt(0)}</span>
                    <span className={`text-xs font-bold ${date.getDay() === 0 || date.getDay() === 6 ? 'text-slate-300' : 'text-slate-700'}`}>{date.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Tasks Bars */}
            <div className="pt-[60px] w-full">
              {Object.entries(groupedTasks).map(([phase, phaseTasks], groupIndex) => (
                <React.Fragment key={phase}>
                  {/* Phase Spacer */}
                  <div className="h-12 w-full border-b border-slate-100/50" />
                  
                  {phaseTasks.map((task, i) => {
                    const coords = getTaskCoordinates[task.id];
                    if (!coords) return null;
                    
                    const left = coords.xStart;
                    const width = coords.xEnd - coords.xStart;

                    return (
                      <div key={task.id} className="h-12 border-b border-transparent relative group">
                        <div 
                          onClick={() => setSelectedTaskId(task.id)}
                          className={`absolute h-8 top-2 rounded-lg shadow-sm cursor-pointer transition-all flex items-center px-3 overflow-hidden ${
                            task.isCritical 
                              ? 'bg-red-500 hover:bg-red-600 ring-2 ring-red-200' 
                              : 'bg-indigo-500 hover:bg-indigo-600 ring-2 ring-indigo-200'
                          }`}
                          style={{ left, width: Math.max(width, 24) }}
                        >
                          {width > 40 && <span className="text-[10px] font-bold text-white truncate drop-shadow-sm">{task.title}</span>}
                          
                          {/* Tooltip */}
                          <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 whitespace-nowrap border border-slate-700">
                            <p className="font-bold text-sm mb-1">{task.title}</p>
                            <div className="flex items-center gap-4 text-slate-300">
                              <span>{new Date(task.startDate).toLocaleDateString('es-MX')} - {new Date(task.endDate).toLocaleDateString('es-MX')}</span>
                              <span className="flex items-center gap-1"><Clock size={12}/> {task.duration}d</span>
                            </div>
                            {task.isCritical && (
                              <div className="mt-2 text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
                                <AlertTriangle size={12} /> Tarea Crítica
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

          </div>
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

export default GanttView;

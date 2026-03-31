import React, { useState, useEffect } from 'react';
import { GanttChartSquare, Columns, Table2, LayoutDashboard, ArrowLeft, Activity } from 'lucide-react';
import GanttView from './GanttView';
import KanbanBoard from './KanbanBoard';
import SprintTable from './SprintTable';
import ProjectDashboard from './ProjectDashboard';
import { CriticalPathAnalysis } from './CriticalPathAnalysis';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

const ProjectWorkspace = ({ projectId, project, userRole, currentUser, onBack, students }: any) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const q = query(collection(db, `projects/${projectId}/tasks`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Kanban', icon: Columns },
    { id: 'gantt', label: 'Gantt', icon: GanttChartSquare },
    { id: 'sprints', label: 'Sprints', icon: Table2 },
    { id: 'cpm', label: 'Ruta Crítica', icon: Activity },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900">{project?.name || 'Proyecto'}</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Espacio de Trabajo</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto w-full sm:w-auto hide-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${isActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <ProjectDashboard tasks={tasks} projectId={projectId} students={students} />}
            {activeTab === 'kanban' && <KanbanBoard tasks={tasks} projectId={projectId} userRole={userRole} currentUser={currentUser} students={students} />}
            {activeTab === 'gantt' && <GanttView tasks={tasks} projectId={projectId} project={project} userRole={userRole} currentUser={currentUser} students={students} />}
            {activeTab === 'sprints' && <SprintTable tasks={tasks} projectId={projectId} userRole={userRole} currentUser={currentUser} students={students} />}
            {activeTab === 'cpm' && <CriticalPathAnalysis tasks={tasks} />}
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectWorkspace;

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  todo: '#cbd5e1',
  working_on_it: '#f97316',
  waiting_review: '#3b82f6',
  stuck: '#ef4444',
  done: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'Por Hacer',
  working_on_it: 'En Progreso',
  waiting_review: 'En Revisión',
  stuck: 'Atascado',
  done: 'Completado',
};

const ProjectDashboard = ({ tasks, projectId, students }: any) => {
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t: any) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || '#94a3b8'
    }));
  }, [tasks]);

  const userLoadData = useMemo(() => {
    const load: Record<string, number> = {};
    tasks.forEach((t: any) => {
      if (t.assignedTo && t.status !== 'done') {
        load[t.assignedTo] = (load[t.assignedTo] || 0) + (t.effort || 1);
      }
    });
    return Object.entries(load).map(([uid, effort]) => {
      const student = students.find((s: any) => s.id === uid);
      return {
        name: student ? `${student.firstName} ${student.lastNamePaterno}` : 'Sin Asignar',
        esfuerzo: effort
      };
    }).sort((a, b) => b.esfuerzo - a.esfuerzo);
  }, [tasks, students]);

  // Burndown chart logic (simplified for active sprint)
  const burndownData = useMemo(() => {
    // Find active sprint (phase)
    const phases = [...new Set(tasks.map((t: any) => t.phase).filter(Boolean))];
    if (phases.length === 0) return [];
    
    // Just use the first phase for now as "active"
    const activePhase = phases[0];
    const sprintTasks = tasks.filter((t: any) => t.phase === activePhase);
    
    const totalSP = sprintTasks.reduce((acc: number, t: any) => acc + (t.estimatedSP || 0), 0);
    
    // Mock days for the sprint (e.g., 10 days)
    const data = [];
    let remaining = totalSP;
    for (let i = 0; i <= 10; i++) {
      // Simulate burndown
      if (i > 0) remaining -= Math.floor(Math.random() * (totalSP / 10));
      if (remaining < 0) remaining = 0;
      data.push({
        day: `Día ${i}`,
        ideal: totalSP - (totalSP / 10) * i,
        actual: i <= 5 ? remaining : null // Only show actual up to day 5
      });
    }
    return data;
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-4">Estado de Tareas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-4">Carga por Usuario (Esfuerzo Activo)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userLoadData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="esfuerzo" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-800 mb-4">Burndown del Sprint Activo</h3>
        <div className="h-72">
          {burndownData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5" name="Ideal" />
                <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={3} name="Restante" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 font-medium">
              No hay suficientes datos de sprint para mostrar el burndown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;

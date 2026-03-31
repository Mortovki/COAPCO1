import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, ExternalLink, Plus, Edit2, Save, Trash2, X, PlayCircle, ChevronRight, Search, MoreHorizontal, Copy, Download, Pencil } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

const ProjectDirectory = ({ projects, setProjects, userRole, selectedProjectId, enrolledProjectIds, onOpenWorkspace }: any) => {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<{ [key: string]: boolean }>({});
  const projectRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (selectedProjectId && projectRefs.current[selectedProjectId]) {
      projectRefs.current[selectedProjectId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.project-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const displayProjects = projects.filter((p: any) => 
    (!enrolledProjectIds || enrolledProjectIds.includes(p.id)) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (project: any) => {
    setEditingProjectId(project.id);
    setEditData(JSON.parse(JSON.stringify(project))); // Deep copy to avoid mutating original state directly
  };

  const handleSave = () => {
    setProjects(projects.map((p: any) => p.id === editingProjectId ? editData : p));
    setEditingProjectId(null);
    setEditData(null);
  };

  const addSection = (projectId: string) => {
    if (editingProjectId === projectId) {
      setEditData({
        ...editData,
        sections: [...(editData.sections || []), { id: Date.now().toString(), name: 'Nueva Sección', description: '', color: '#6366f1', links: [] }]
      });
    } else {
      setProjects(projects.map((p: any) => {
        if (p.id === projectId) {
          return { ...p, sections: [...(p.sections || []), { id: Date.now().toString(), name: 'Nueva Sección', description: '', color: '#6366f1', links: [] }] };
        }
        return p;
      }));
    }
  };

  const addLink = (projectId: string, sectionId: string) => {
    if (editingProjectId === projectId) {
      setEditData({
        ...editData,
        sections: editData.sections.map((s: any) => s.id === sectionId ? { ...s, links: [...(s.links || []), { name: 'Nuevo Enlace', url: 'https://' }] } : s)
      });
    } else {
      const linkName = prompt('Nombre del enlace:');
      const linkUrl = prompt('URL del enlace:');
      if (linkName && linkUrl) {
        setProjects(projects.map((p: any) => {
          if (p.id === projectId) {
            return {
              ...p,
              sections: p.sections.map((s: any) => s.id === sectionId ? { ...s, links: [...(s.links || []), { name: linkName, url: linkUrl }] } : s)
            };
          }
          return p;
        }));
      }
    }
  };

  const updateSection = (sectionId: string, field: string, value: string) => {
    setEditData({
      ...editData,
      sections: editData.sections.map((s: any) => s.id === sectionId ? { ...s, [field]: value } : s)
    });
  };

  const removeSection = (sectionId: string) => {
    if (confirm('¿Estás seguro de eliminar esta sección?')) {
      setEditData({
        ...editData,
        sections: editData.sections.filter((s: any) => s.id !== sectionId)
      });
    }
  };

  const updateLink = (sectionId: string, linkIndex: number, field: string, value: string) => {
    setEditData({
      ...editData,
      sections: editData.sections.map((s: any) => {
        if (s.id === sectionId) {
          const newLinks = [...s.links];
          newLinks[linkIndex] = { ...newLinks[linkIndex], [field]: value };
          return { ...s, links: newLinks };
        }
        return s;
      })
    });
  };

  const removeLink = (sectionId: string, linkIndex: number) => {
    setEditData({
      ...editData,
      sections: editData.sections.map((s: any) => {
        if (s.id === sectionId) {
          const newLinks = [...s.links];
          newLinks.splice(linkIndex, 1);
          return { ...s, links: newLinks };
        }
        return s;
      })
    });
  };

  const loadExampleProject = async () => {
    if (userRole !== 'admin') {
      toast.error('Solo administradores pueden cargar el proyecto de ejemplo');
      return;
    }
    
    const toastId = toast.loading('Cargando proyecto de ejemplo...');
    try {
      // 1. Create Project
      const newProjectId = `p-cpm-example-${Date.now()}`;
      const newProject = {
        id: newProjectId,
        name: 'Ejemplo CPM (Construcción)',
        color: '#ef4444',
        description: 'Proyecto de ejemplo para demostrar la Ruta Crítica (CPM).',
        sections: []
      };
      
      // Add to local state
      setProjects([...projects, newProject]);
      
      // Save project to Firestore
      await setDoc(doc(db, 'projects', newProjectId), newProject);
      
      // 2. Create Tasks
      const now = new Date();
      // Helper to add days
      const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
      };
      
      // Define tasks
      const exampleTasks = [
        { id: `t1-${Date.now()}`, title: 'A. Preparación del terreno', duration: 3, deps: [], phase: 'Fase 1: Cimientos' },
        { id: `t2-${Date.now()}`, title: 'B. Compra de materiales', duration: 2, deps: [], phase: 'Fase 1: Cimientos' },
        { id: `t3-${Date.now()}`, title: 'C. Excavación', duration: 4, deps: [0], phase: 'Fase 1: Cimientos' },
        { id: `t4-${Date.now()}`, title: 'D. Cimientos', duration: 5, deps: [1, 2], phase: 'Fase 1: Cimientos' },
        { id: `t5-${Date.now()}`, title: 'E. Estructura', duration: 6, deps: [3], phase: 'Fase 2: Estructura' },
        { id: `t6-${Date.now()}`, title: 'F. Techo', duration: 3, deps: [4], phase: 'Fase 2: Estructura' },
        { id: `t7-${Date.now()}`, title: 'G. Plomería', duration: 4, deps: [4], phase: 'Fase 3: Instalaciones' },
        { id: `t8-${Date.now()}`, title: 'H. Electricidad', duration: 5, deps: [4], phase: 'Fase 3: Instalaciones' },
        { id: `t9-${Date.now()}`, title: 'I. Acabados', duration: 7, deps: [5, 6, 7], phase: 'Fase 4: Acabados' },
      ];
      
      const taskDocs: any[] = [];
      const taskMap: any = {};
      
      exampleTasks.forEach((t, index) => {
        let maxEnd = now;
        const actualDeps = t.deps.map(depIndex => exampleTasks[depIndex].id);

        if (actualDeps.length > 0) {
          const depEnds = actualDeps.map(dId => taskMap[dId].endDate);
          maxEnd = new Date(Math.max(...depEnds.map(d => d.getTime())));
        }
        
        const startDate = new Date(maxEnd);
        const endDate = addDays(startDate, t.duration);
        
        const taskDoc = {
          id: t.id,
          projectId: newProjectId,
          title: t.title,
          description: `Tarea de ejemplo: ${t.title}`,
          status: 'todo',
          priority: 3,
          effort: t.duration * 8,
          type: 'feature',
          assignedTo: '',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          phase: t.phase,
          epic: 'Construcción Casa',
          estimatedSP: t.duration,
          categoryId: '',
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
          dependencies: actualDeps
        };
        
        taskMap[t.id] = { startDate, endDate };
        taskDocs.push(taskDoc);
      });
      
      // Write to Firestore
      for (const t of taskDocs) {
        await setDoc(doc(db, `projects/${newProjectId}/tasks/${t.id}`), t);
      }
      
      toast.success('Proyecto de ejemplo cargado exitosamente', { id: toastId });
    } catch (error) {
      console.error("Error loading example project:", error);
      toast.error('Error al cargar proyecto de ejemplo', { id: toastId });
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Directorio de Proyectos</h2>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar proyecto..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            />
          </div>
          {userRole === 'admin' && (
            <button 
              onClick={loadExampleProject}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <PlayCircle size={18} /> Cargar Ejemplo CPM
            </button>
          )}
        </div>
      </div>
      {displayProjects.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-500 font-medium">
            {searchQuery ? "No se encontraron proyectos con ese nombre" : "No estás enrolado en ningún proyecto actualmente."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayProjects.map((project: any) => (
            <div 
              key={project.id} 
              ref={el => { projectRefs.current[project.id] = el; }}
              className={`bg-white p-6 rounded-3xl shadow-sm border transition-all duration-300 flex flex-col overflow-hidden ${expandedProjects[project.id] ? 'h-auto' : 'h-64'} ${selectedProjectId === project.id ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-200 hover:shadow-md'}`}
            >
              {editingProjectId === project.id ? (
                <div className="space-y-6 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Edit2 size={18} className="text-indigo-500"/> Editar Proyecto</h3>
                    <button onClick={() => setEditingProjectId(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors"><X size={18} /></button>
                  </div>
                  
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nombre</label>
                      <input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-sm shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Descripción</label>
                      <textarea value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm shadow-sm" rows={2} />
                    </div>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-slate-800 text-sm">Secciones</h4>
                      <button onClick={() => addSection(project.id)} className="text-[10px] bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1 font-black uppercase tracking-wider hover:bg-indigo-200 transition-colors"><Plus size={14} /> Sección</button>
                    </div>
                    
                    <div className="space-y-4">
                      {(editData.sections || []).map((section: any) => (
                        <div key={section.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="color" 
                                  value={section.color || '#6366f1'} 
                                  onChange={e => updateSection(section.id, 'color', e.target.value)} 
                                  className="w-8 h-8 p-0.5 border border-slate-200 rounded-lg cursor-pointer shrink-0" 
                                  title="Color"
                                />
                                <input 
                                  value={section.name} 
                                  onChange={e => updateSection(section.id, 'name', e.target.value)} 
                                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" 
                                  placeholder="Nombre de la sección"
                                />
                              </div>
                              <input 
                                value={section.description || ''} 
                                onChange={e => updateSection(section.id, 'description', e.target.value)} 
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs" 
                                placeholder="Descripción (opcional)"
                              />
                            </div>
                            <button onClick={() => removeSection(section.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors shrink-0"><Trash2 size={16} /></button>
                          </div>

                          <div className="pl-2 border-l-2 border-slate-100 space-y-2">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enlaces</h5>
                              <button onClick={() => addLink(project.id, section.id)} className="text-[10px] text-indigo-600 flex items-center gap-1 hover:underline font-bold"><Plus size={12} /> Añadir</button>
                            </div>
                            
                            {section.links.map((link: any, idx: number) => (
                              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                                  <FileText size={14} className="text-slate-400 shrink-0 ml-1" />
                                  <input 
                                    value={link.name} 
                                    onChange={e => updateLink(section.id, idx, 'name', e.target.value)} 
                                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium" 
                                    placeholder="Nombre"
                                  />
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                                  <input 
                                    value={link.url} 
                                    onChange={e => updateLink(section.id, idx, 'url', e.target.value)} 
                                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
                                    placeholder="https://..."
                                  />
                                  <button onClick={() => removeLink(section.id, idx)} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg shrink-0"><X size={14} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 shrink-0">
                    <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/30">
                      <Save size={16} /> Guardar Cambios
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-4 mb-4 shrink-0">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl shrink-0 mt-1 shadow-sm" style={{ backgroundColor: project.color || '#6366f1' }}></div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-slate-900 break-words leading-tight line-clamp-1">{project.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {project.sections?.length || 0} seccion{(project.sections?.length !== 1) ? 'es' : ''}
                          {project.tasks?.filter((t: any) => t.slack === 0).length > 0 && ` · ${project.tasks.filter((t: any) => t.slack === 0).length} críticas 🔴`}
                        </p>
                        <p className="text-sm text-slate-500 mt-1 break-words line-clamp-2">{project.description}</p>
                      </div>
                    </div>
                    {userRole !== 'user' && (
                      <div className="relative project-menu-container">
                        <button onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)} className="text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 p-2 rounded-xl transition-colors shrink-0">
                          <MoreHorizontal size={18} />
                        </button>
                        {openMenuId === project.id && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                            <button onClick={() => { handleEdit(project); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Pencil size={14} /> Editar
                            </button>
                            <button onClick={() => { 
                              const newProject = { ...project, id: `p-${Date.now()}`, name: `${project.name} (Copia)` };
                              setProjects([...projects, newProject]);
                              setOpenMenuId(null); 
                            }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Copy size={14} /> Duplicar
                            </button>
                            <button onClick={() => { 
                              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project));
                              const downloadAnchorNode = document.createElement('a');
                              downloadAnchorNode.setAttribute("href",     dataStr);
                              downloadAnchorNode.setAttribute("download", project.name + ".json");
                              document.body.appendChild(downloadAnchorNode);
                              downloadAnchorNode.click();
                              downloadAnchorNode.remove();
                              setOpenMenuId(null); 
                            }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <Download size={14} /> Exportar
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button onClick={() => { 
                              setProjects(projects.filter((p: any) => p.id !== project.id));
                              setOpenMenuId(null); 
                            }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium">
                              <Trash2 size={14} /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 my-4 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
                    {(!project.sections || project.sections.length === 0) ? (
                      <button 
                        onClick={() => handleEdit(project)}
                        className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-sm font-medium mt-2"
                      >
                        + Agregar primera sección
                      </button>
                    ) : (
                      <div className="space-y-4">
                        {project.sections.slice(0, 3).map((section: any) => (
                          <div key={section.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: section.color || '#6366f1' }}>
                                <Folder size={16} className="text-white" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-800 text-sm break-words">{section.name}</h4>
                                {section.description && <p className="text-[10px] text-slate-500 break-words leading-tight mt-0.5">{section.description}</p>}
                              </div>
                            </div>
                            <div className="space-y-2 pl-11">
                              {section.links.map((link: any, idx: number) => (
                                <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors bg-white p-2 rounded-xl border border-slate-100 hover:border-indigo-100 shadow-sm">
                                  <div className="bg-slate-100 group-hover:bg-indigo-100 p-1.5 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0">
                                    <FileText size={14} />
                                  </div>
                                  <span className="truncate flex-1">{link.name}</span>
                                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </a>
                              ))}
                              {section.links.length === 0 && <p className="text-[10px] text-slate-400 italic">Sin enlaces</p>}
                            </div>
                          </div>
                        ))}
                        
                        {project.sections.length > 3 && (
                          <>
                            <motion.div 
                              initial="collapsed"
                              animate={expandedProjects[project.id] ? "expanded" : "collapsed"}
                              variants={{
                                collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
                                expanded: { height: "auto", opacity: 1, overflow: 'visible' }
                              }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="space-y-4"
                            >
                              {project.sections.slice(3).map((section: any) => (
                                <div key={section.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: section.color || '#6366f1' }}>
                                      <Folder size={16} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-slate-800 text-sm break-words">{section.name}</h4>
                                      {section.description && <p className="text-[10px] text-slate-500 break-words leading-tight mt-0.5">{section.description}</p>}
                                    </div>
                                  </div>
                                  <div className="space-y-2 pl-11">
                                    {section.links.map((link: any, idx: number) => (
                                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors bg-white p-2 rounded-xl border border-slate-100 hover:border-indigo-100 shadow-sm">
                                        <div className="bg-slate-100 group-hover:bg-indigo-100 p-1.5 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0">
                                          <FileText size={14} />
                                        </div>
                                        <span className="truncate flex-1">{link.name}</span>
                                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                      </a>
                                    ))}
                                    {section.links.length === 0 && <p className="text-[10px] text-slate-400 italic">Sin enlaces</p>}
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                            <button 
                              onClick={() => setExpandedProjects(prev => ({ ...prev, [project.id]: !prev[project.id] }))}
                              className="text-indigo-600 font-medium text-sm w-full text-center py-2 hover:bg-indigo-50 rounded-xl transition-colors"
                            >
                              {expandedProjects[project.id] ? "Ver menos ▴" : `+ Ver ${project.sections.length - 3} secciones más ▾`}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 shrink-0">
                    <button 
                      onClick={() => onOpenWorkspace(project.id)}
                      className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      Espacio de Trabajo <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectDirectory;

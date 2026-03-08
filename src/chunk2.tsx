  const renderActivityForm = (isGroup: boolean) => {
    const isAbsence = !isGroup && activityForm.status !== 'A';

    return (
      <div className="space-y-8">
        <div className="bg-indigo-900 text-white rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-indigo-700 p-3 rounded-2xl shadow-inner"><Clock size={32} /></div>
            <div>
              <h4 className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Duración</h4>
              <div className="flex items-baseline gap-1"><span className="text-4xl font-black">{activityForm.hours.toFixed(1)}</span><span className="text-indigo-300 font-bold uppercase text-sm">H</span></div>
            </div>
          </div>
          <div className="text-center sm:text-right relative z-10 text-xs font-bold border border-indigo-700 bg-indigo-800/50 px-4 py-2 rounded-xl">
            {activityForm.date}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</label>
            <input type="date" required className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-sm font-bold" value={activityForm.date} onChange={e => setActivityForm({...activityForm, date: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada</label>
            <input type="text" maxLength={5} className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-sm font-black text-center" value={activityForm.startTime} onChange={e => setActivityForm({...activityForm, startTime: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salida</label>
            <input type="text" maxLength={5} className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-sm font-black text-center" value={activityForm.endTime} onChange={e => setActivityForm({...activityForm, endTime: e.target.value})} />
          </div>
        </div>

        <div className={`grid grid-cols-1 ${!isGroup ? 'md:grid-cols-2' : ''} gap-8`}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
            {!showNewCatInput ? (
              <div className="flex gap-3">
                <select className="flex-1 p-4 border border-slate-200 rounded-2xl bg-white text-sm font-bold" value={activityForm.categoryId} onChange={e => setActivityForm({...activityForm, categoryId: e.target.value})}>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewCatInput(true)} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200"><Plus size={20}/></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" className="flex-1 p-4 border rounded-2xl text-sm" value={newInlineCat.name} onChange={e => setNewInlineCat({...newInlineCat, name: e.target.value})} />
                <button type="button" onClick={handleCreateInlineCat} className="px-4 bg-indigo-600 text-white rounded-2xl">Ok</button>
              </div>
            )}
          </div>
          {!isGroup && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asistencia</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(ATTENDANCE_STATUS).map(k => (
                  <button key={k} type="button" onClick={() => setActivityForm({...activityForm, status: k})} className={`p-3 rounded-2xl text-[10px] font-black border-2 ${activityForm.status === k ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-400'}`}>{k}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isGroup && (
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Participantes</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-50 rounded-[2rem] border max-h-[300px] overflow-y-auto">
              {students.map(s => {
                const isSelected = activityForm.selectedStudentIds.includes(s.id);
                const sStatus = activityForm.studentStatuses[s.id] || 'A';
                return (
                  <div key={s.id} className={`p-4 rounded-xl border-2 ${isSelected ? 'bg-white border-emerald-500' : 'bg-transparent border-transparent'}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={isSelected} onChange={e => {
                        const checked = e.target.checked;
                        const ids = checked ? [...activityForm.selectedStudentIds, s.id] : activityForm.selectedStudentIds.filter(id => id !== s.id);
                        const newStatuses = { ...activityForm.studentStatuses };
                        if (checked) newStatuses[s.id] = 'A'; else delete newStatuses[s.id];
                        setActivityForm({...activityForm, selectedStudentIds: ids, studentStatuses: newStatuses});
                      }} />
                      <span className="text-sm font-bold">{s.name}</span>
                    </label>
                    {isSelected && (
                      <div className="flex gap-1 mt-2">
                        {Object.keys(ATTENDANCE_STATUS).map(k => (
                          <button key={k} type="button" onClick={() => setActivityForm(prev => ({...prev, studentStatuses: {...prev.studentStatuses, [s.id]: k}}))} className={`text-[9px] font-black p-1 border rounded flex-1 ${sStatus === k ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>{k}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidencia</label>
            <input type="url" disabled={isAbsence} placeholder="Link..." className="w-full p-4 border rounded-2xl" value={activityForm.evidenceLink} onChange={e => setActivityForm({...activityForm, evidenceLink: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
            <textarea disabled={isAbsence} className="w-full p-5 border rounded-2xl h-32" value={activityForm.description} onChange={e => setActivityForm({...activityForm, description: e.target.value})}></textarea>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100">
      <Sidebar view={view} setView={setView} setEditingRecordId={setEditingRecordId} />
      <div className="flex-1 flex flex-col">
        {/* Navbar Móvil */}
        <div className="lg:hidden bg-slate-900 text-white p-6 flex justify-between items-center shadow-lg border-b border-white/5">
          <div className="flex items-center gap-2"><GraduationCap size={24} className="text-indigo-400" /><h1 className="font-black text-xs uppercase tracking-tighter">Asistencia<br/><span className="text-indigo-400">Prestadores</span></h1></div>
          <div className="flex gap-6"><LayoutDashboard size={26} onClick={() => setView('dashboard')} /><CalendarDays size={26} onClick={() => setView('calendar')} /></div>
        </div>
        
        <main className="p-6 sm:p-12 max-w-7xl mx-auto w-full flex-1 animate-in fade-in duration-700">
          {view === 'dashboard' && (
            <div className="space-y-10">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                <div><h2 className="text-5xl font-black text-slate-900 tracking-tighter">Prestadores</h2><p className="text-slate-500 font-medium mt-1 uppercase text-[11px] tracking-[0.2em] italic">Sistema central de seguimiento y control de horas</p></div>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => { setActivityForm(prev => ({...prev, selectedStudentIds: []})); setView('individual-activity'); }} className="bg-white border-4 border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-all active:scale-95"><PlusCircle size={20} className="text-indigo-500" /> Individual</button>
                  <button onClick={() => setView('group-activity')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"><Users size={20} /> Grupal</button>
                  <button onClick={() => { setShowEditStudent(false); setStudentForm({ name: '', phone: '', emergencyPhone: '', email: '', brigadePeriod: '', career: 'Arquitectura', status: 'En Curso', workStatus: 'Sin asignar', projectIds: [], projectTasks: {} }); setShowAddStudent(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"><UserPlus size={20} /> Nuevo Alumno</button>
                </div>
              </div>

              {/* Filtros */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-6">
                <div className="w-full space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Búsqueda Global</span>
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
                    <input type="text" placeholder="Nombre del alumno, carrera o etiqueta..." className="w-full pl-14 pr-6 py-4 rounded-[1.5rem] bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Proyecto</span>
                    <select className="w-full bg-slate-50 px-5 py-3.5 rounded-[1.2rem] border border-slate-100 text-[11px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                      <option value="Todos">PROYECTOS: TODOS</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Estatus Acad.</span>
                    <select className="w-full bg-slate-50 px-5 py-3.5 rounded-[1.2rem] border border-slate-100 text-[11px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                      <option value="Todos">ESTATUS: TODOS</option>
                      {Object.keys(STUDENT_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Carga Trabajo</span>
                    <select className="w-full bg-slate-50 px-5 py-3.5 rounded-[1.2rem] border border-slate-100 text-[11px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterWork} onChange={e => setFilterWork(e.target.value)}>
                      <option value="Todos">TRABAJO: TODOS</option>
                      {Object.keys(WORK_STATUS).map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Lista */}
              <div className="grid grid-cols-1 gap-6">
                {filteredStudents.map(student => {
                  const totalHrs = student.records.reduce((acc: number, curr: any) => acc + curr.hours, 0);
                  const perc = Math.min(100, (totalHrs / TOTAL_REQUIRED_HOURS) * 100);
                  const totalSessions = student.records.length;
                  const countAbsences = student.records.filter((r: any) => r.status !== 'A').length;
                  const absencePerc = totalSessions > 0 ? (countAbsences / totalSessions) * 100 : 0;
                  
                  return (
                    <div key={student.id} onClick={() => { setSelectedStudentId(student.id); setView('student-detail'); }} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer relative overflow-hidden flex flex-col md:flex-row items-stretch gap-6">
                      <div className={`absolute left-0 top-0 w-2 h-full transition-all duration-500 ${student.workStatus === 'Asignado' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                      
                      <div className="flex-1 w-full pl-3 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-black text-2xl text-slate-900 tracking-tight">{student.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border shadow-sm ${(STUDENT_STATUS as any)[student.status]?.color || 'bg-slate-100'}`}>{student.status}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest mb-5">
                          <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100"><GraduationCap size={14}/> {student.career}</span>
                        </div>
                        <div className="flex gap-5 mt-auto">
                           <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase"><Mail size={14}/> {student.email ? 'ACTIVO' : 'SIN REG'}</div>
                           <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase"><Phone size={14}/> {student.phone ? 'ACTIVO' : 'SIN REG'}</div>
                        </div>
                      </div>

                      <div className="flex-1 w-full border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Proyectos & Tareas</p>
                           <div className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase shadow-sm border ${(WORK_STATUS as any)[student.workStatus]?.color || 'bg-slate-500'}`}>{student.workStatus}</div>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[140px] pr-2 custom-scrollbar flex-1">
                           {student.projectIds.map((pid: string) => {
                             const p = projects.find(pr => pr.id === pid);
                             const tasks = student.projectTasks[pid] || [];
                             return (
                               <div key={pid} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-sm">
                                 <div className="flex items-center gap-2 mb-2">
                                   <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${p?.color || 'bg-slate-300'}`}></div>
                                   <span className="font-black text-[10px] text-slate-700 uppercase">{p?.name || 'Proyecto'}</span>
                                 </div>
                                 <div className="flex flex-wrap gap-1.5 pl-1">
                                   {tasks.map((t: string, i: number) => (
                                     <span key={i} className="text-[9px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-100 italic shadow-sm tracking-tight">#{String(t)}</span>
                                   ))}
                                 </div>
                               </div>
                             );
                           })}
                        </div>
                        <div className="mt-5 pt-5 border-t border-slate-100">
                          <div className="flex justify-between items-end mb-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Inasistencias</p>
                            <span className="text-[10px] font-black text-slate-500">{absencePerc.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden shadow-inner">
                            <div className="bg-red-500 h-full" style={{ width: `${absencePerc}%` }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-56 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center">
                        <div className="w-full bg-slate-50 rounded-[2rem] p-6 flex flex-col justify-center items-center relative overflow-hidden shadow-inner h-full">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Reportado</p>
                           <div className="flex items-baseline gap-1 text-indigo-600 mb-4">
                              <span className="text-5xl font-black tracking-tighter">{totalHrs.toFixed(1)}</span>
                              <span className="text-sm font-black uppercase">H</span>
                           </div>
                           <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${perc}%` }}></div>
                           </div>
                           <p className="mt-3 text-[10px] font-black text-indigo-400 uppercase">{perc.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'student-detail' && selectedStudent && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto">
              <button onClick={() => setView('dashboard')} className="flex items-center gap-3 text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] hover:text-indigo-600 transition-all border border-slate-200 bg-white px-6 py-2.5 rounded-2xl shadow-sm"><ArrowLeft size={16} /> Volver</button>
              
              <div className="bg-white p-10 sm:p-14 rounded-[4.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600"></div>
                <div className="absolute top-0 right-0 p-10">
                    <button onClick={startEditStudent} className="p-5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-3xl border border-slate-100"><Edit2 size={28} /></button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
                  <div className="xl:col-span-5 space-y-10">
                    <div>
                        <div className={`inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full text-[12px] font-black uppercase border shadow-lg mb-8 ${(STUDENT_STATUS as any)[selectedStudent.status]?.color || 'bg-slate-100'}`}>
                            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: (STUDENT_STATUS as any)[selectedStudent.status]?.hex || '#ccc' }}></div>
                            {selectedStudent.status}
                        </div>
                        <h2 className="text-6xl font-black text-slate-900 leading-none tracking-tighter mb-6">{selectedStudent.name}</h2>
                        <div className="flex flex-wrap gap-5 uppercase font-black tracking-[0.25em] text-[12px]">
                            <span className="flex items-center gap-3 text-indigo-600 bg-indigo-50 px-6 py-3 rounded-3xl border border-indigo-100 shadow-md"><GraduationCap size={20}/> {selectedStudent.career}</span>
                            <span className="flex items-center gap-3 text-slate-500 bg-slate-50 px-6 py-3 rounded-3xl border border-slate-100 shadow-md">Brigada: {selectedStudent.brigadePeriod}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={14} className="text-indigo-300"/> Email</span>
                            <span className="truncate text-[13px] font-black text-slate-700">{selectedStudent.email || 'NO REGISTRADO'}</span>
                        </div>
                        <div className="flex flex-col gap-2 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Phone size={14} className="text-indigo-300"/> Teléfono</span>
                            <span className="text-base font-black text-slate-700">{selectedStudent.phone || 'NO REGISTRADO'}</span>
                        </div>
                        <div className="flex flex-col gap-2 p-8 bg-red-50/60 rounded-[2.5rem] border border-red-100 shadow-lg col-span-2">
                            <span className="text-[11px] font-black text-red-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-1"><AlertCircle size={16}/> SOS</span>
                            <span className="text-3xl font-black text-red-800 leading-none tracking-tight">{selectedStudent.emergencyPhone || 'SIN CONTACTO'}</span>
                        </div>
                    </div>
                  </div>

                  <div className="xl:col-span-7 flex flex-col gap-6">
                    <div className="bg-slate-50 p-6 sm:p-8 rounded-[3rem] border border-slate-100 flex-1 flex flex-col shadow-inner overflow-hidden relative group">
                        <div className="absolute top-1/2 right-0 transform -translate-y-1/2 -mr-4 opacity-[0.02] pointer-events-none"><Briefcase size={120}/></div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 mb-6 border-b border-slate-200/60 pb-5">
                            <div className="w-full">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Proyectos Asignados</p>
                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase shadow-sm ${(WORK_STATUS as any)[selectedStudent.workStatus]?.color || 'bg-slate-500'}`}>{selectedStudent.workStatus}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {projects.map(p => {
                                    const isEnrolled = selectedStudent.projectIds.includes(p.id);
                                    return (
                                      <button key={p.id} onClick={() => {
                                          setStudents(prev => prev.map(s => {
                                            if (s.id === selectedStudentId) {
                                              const newIds = isEnrolled ? s.projectIds.filter((id: string) => id !== p.id) : [...s.projectIds, p.id];
                                              const newWorkStatus = newIds.length > 0 ? 'Asignado' : 'Sin asignar';
                                              return { ...s, projectIds: newIds, workStatus: newWorkStatus };
                                            }
                                            return s;
                                          }));
                                      }} className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase rounded-xl border transition-all ${isEnrolled ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm' : 'bg-transparent border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300'}`}>
                                        <div className={`w-2 h-2 rounded-full ${p.color} ${isEnrolled ? 'opacity-100' : 'opacity-40'}`}></div>
                                        <span className="truncate max-w-[100px]">{p.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 overflow-y-auto pr-2 flex-1 content-start custom-scrollbar">
                           {selectedStudent.projectIds.map((pid: string) => {
                             const p = projects.find(pr => pr.id === pid);
                             const tasks = selectedStudent.projectTasks[pid] || [];
                             const currentInputValue = tagInputs[pid] || '';
                             const bankForProject = projectTagsBank[pid] || [];
                             const suggestions = bankForProject.filter((t: string) => t.toLowerCase().includes(currentInputValue.toLowerCase()) && !tasks.includes(t));
                             const showSuggestions = activeSuggestionProject === pid && currentInputValue.length > 0 && suggestions.length > 0;

                             return (
                               <div key={pid} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full relative">
                                  <div className="flex items-center gap-3 mb-3">
                                     <div className={`w-3 h-3 rounded-full shadow-sm ${p?.color || 'bg-slate-300'}`}></div>
                                     <span className="font-black text-slate-800 text-xs uppercase tracking-tight truncate">{p?.name || 'Proyecto'}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mb-3 flex-1 content-start min-h-[40px]">
                                    {tasks.map((t: string, idx: number) => (
                                      <div key={idx} onClick={() => {
                                          const updatedTags = tasks.filter((_: any, i: number) => i !== idx);
                                          setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, projectTasks: { ...s.projectTasks, [pid]: updatedTags } } : s));
                                      }} className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[9px] font-black italic transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-pointer">
                                         <Tag size={9}/> <span className="truncate max-w-[80px]">{String(t)}</span>
                                         <X size={10} className="ml-1 shrink-0"/>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-auto pt-3 border-t border-slate-50 relative">
                                     <input type="text" placeholder="Nueva tarea..." className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-[9px] font-bold outline-none focus:bg-white"
                                       value={currentInputValue}
                                       onChange={(e) => { setTagInputs({...tagInputs, [pid]: e.target.value}); setActiveSuggestionProject(pid); }}
                                       onFocus={() => setActiveSuggestionProject(pid)}
                                       onBlur={() => setTimeout(() => setActiveSuggestionProject(null), 200)}
                                       onKeyDown={(e) => {
                                         if (e.key === 'Enter') {
                                           e.preventDefault(); const val = currentInputValue.trim(); if (!val) return;
                                           if (!tasks.includes(val)) {
                                             setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, projectTasks: { ...s.projectTasks, [pid]: [...tasks, val] } } : s));
                                           }
                                           setTagInputs({...tagInputs, [pid]: ''}); setActiveSuggestionProject(null);
                                         }
                                       }}
                                     />
                                     {showSuggestions && (
                                       <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-indigo-100 rounded-2xl shadow-2xl z-50 max-h-32 overflow-y-auto">
                                         {suggestions.map((sugg: string) => (
                                           <div key={sugg} className="p-3 hover:bg-indigo-50 cursor-pointer text-[9px] font-black uppercase text-slate-700 border-b last:border-0"
                                             onClick={() => {
                                                setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, projectTasks: { ...s.projectTasks, [pid]: [...tasks, sugg] } } : s));
                                                setTagInputs({...tagInputs, [pid]: ''}); setActiveSuggestionProject(null);
                                             }}> {String(sugg)} </div>
                                         ))}
                                       </div>
                                     )}
                                  </div>
                               </div>
                             );
                           })}
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-8 sm:p-10 rounded-[3rem] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden group/clock">
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="bg-indigo-600 p-5 rounded-[1.5rem] shadow-xl"><Clock size={36}/></div>
                            <div>
                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.4em] mb-1.5 leading-none">Bitácora Global</p>
                                <div className="flex items-baseline gap-2 leading-none">
                                    <span className="text-6xl font-black tracking-tighter">{selectedStudent.records.reduce((a: number,c: any)=>a+c.hours,0).toFixed(1)}</span>
                                    <span className="text-xl font-black text-indigo-500 italic">/ {TOTAL_REQUIRED_HOURS}H</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right relative z-10 space-y-3">
                            <div className="flex items-baseline gap-2 justify-end">
                               <p className="text-[9px] text-indigo-400 font-black uppercase opacity-80">Restan:</p>
                               <span className="text-2xl font-black text-indigo-100 tracking-tighter leading-none">{Math.max(0, TOTAL_REQUIRED_HOURS - selectedStudent.records.reduce((a: number,c: any)=>a+c.hours,0)).toFixed(1)}h</span>
                            </div>
                            <div className="w-40 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                               <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, (selectedStudent.records.reduce((a: number,c: any)=>a+c.hours,0)/TOTAL_REQUIRED_HOURS)*100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registro Actividad */}
              <div className="bg-white p-12 sm:p-16 rounded-[5rem] border border-slate-200 shadow-sm relative overflow-hidden" id="entry-form">
                <div className="flex items-center justify-between mb-16">
                  <h3 className="text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-6">
                      <div className={`p-4 rounded-[1.8rem] shadow-xl ${editingRecordId ? 'bg-amber-100 text-amber-600 shadow-amber-200/50' : 'bg-indigo-100 text-indigo-600 shadow-indigo-200/50'}`}>
                          {editingRecordId ? <Edit2 size={36} /> : <PlusCircle size={36} />}
                      </div>
                      {editingRecordId ? 'Actualizar Reporte' : 'Registrar Sesión'}
                  </h3>
                  {editingRecordId && <button onClick={()=>setEditingRecordId(null)} className="text-[11px] font-black text-red-500 bg-red-50 px-8 py-4 rounded-[1.5rem] uppercase border-2 border-red-100 hover:bg-red-100 transition-all flex items-center gap-2"><X size={16}/> Descartar</button>}
                </div>
                <form onSubmit={saveActivity} className="space-y-16 animate-in slide-in-from-bottom-12 duration-700">
                    {errorMessage && <div className="p-6 bg-red-50 text-red-700 rounded-[2rem] border-4 border-red-200 flex items-center gap-5 font-black text-[13px] uppercase animate-bounce shadow-xl"><AlertCircle size={28}/> {errorMessage}</div>}
                    {renderActivityForm(false)}
                    <button className={`w-full text-white font-black py-9 rounded-[3rem] shadow-2xl uppercase tracking-[0.4em] text-sm transform transition-all hover:-translate-y-1 active:translate-y-0.5 ${editingRecordId ? 'bg-amber-600' : 'bg-indigo-600'}`}>
                        <span className="relative z-10">{editingRecordId ? 'Ejecutar Actualización' : 'Certificar Registro en Expediente'}</span>
                    </button>
                </form>
              </div>

              {/* Bitácora Histórica */}
              <div className="bg-white rounded-[5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-12 border-b border-slate-100 font-black bg-slate-50 flex justify-between items-center text-xs text-slate-500 uppercase tracking-[0.3em] shadow-sm">
                   <span className="flex items-center gap-4"><History size={28} className="text-indigo-500" /> Cronología de Sesiones</span>
                   <div className="bg-white px-8 py-3 rounded-[1.5rem] border border-slate-200 font-black text-slate-400"> {selectedStudent.records.length} SESIONES TOTALES </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedStudent.records.length === 0 ? (
                    <div className="p-40 text-center flex flex-col items-center gap-10 opacity-30">
                       <div className="p-14 bg-white rounded-full border-8 border-slate-100 shadow-2xl"><CalendarIcon size={100} className="text-slate-300" /></div>
                       <p className="text-xl font-black uppercase tracking-[0.4em] text-slate-500">Expediente Vacío</p>
                    </div>
                  ) : (
                    selectedStudent.records.map((r: any) => {
                      const cat = categories.find(c => c.id === r.categoryId);
                      return (
                        <div key={r.id} className={`p-12 sm:p-16 transition-all relative group/item ${editingRecordId === r.id ? 'bg-amber-50/40' : 'hover:bg-indigo-50/20'}`}>
                          {editingRecordId === r.id && <div className="absolute top-0 left-0 w-3 h-full bg-amber-500"></div>}
                          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
                            <div className="space-y-8 flex-1">
                              <div className="flex items-center gap-5 flex-wrap">
                                 <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{r.date}</span>
                                 <div className="flex items-center gap-3 text-[12px] font-black bg-white border border-slate-200 px-6 py-2.5 rounded-[1.2rem] text-slate-600 shadow-sm"><Clock size={18} className="text-indigo-500" /> {r.startTime} - {r.endTime}</div>
                                 <span className="px-5 py-2 rounded-2xl text-[11px] font-black text-white uppercase shadow-xl" style={{ backgroundColor: cat?.color }}>{cat?.name || 'Categoría'}</span>
                                 <span className={`px-5 py-2 rounded-full text-[11px] font-black uppercase border-2 shadow-sm ${(ATTENDANCE_STATUS as any)[r.status]?.color || 'bg-slate-100'}`}>{(ATTENDANCE_STATUS as any)[r.status]?.label || 'Status'}</span>
                              </div>
                              <div className="relative">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200 group-hover/item:bg-indigo-200 transition-colors rounded-full"></div>
                                <p className="text-slate-600 font-bold text-xl pr-16 leading-relaxed italic pl-8">"{r.description || 'Sin detalles.'}"</p>
                              </div>
                              {r.evidenceLink && <a href={r.evidenceLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-4 text-[12px] text-indigo-700 font-black bg-white border border-slate-200 px-8 py-4 rounded-[1.8rem] shadow-lg uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"><LinkIcon size={16}/> Comprobante Digital</a>}
                            </div>
                            <div className="flex flex-col items-end gap-10 w-full md:w-auto">
                              <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl flex flex-col items-center min-w-[150px]">
                                  <span className="text-[11px] font-black uppercase text-indigo-400 tracking-[0.4em] mb-2 leading-none">Reportado</span>
                                  <div className="flex items-baseline gap-2 leading-none"><span className="text-5xl font-black">{r.hours.toFixed(1)}</span><span className="text-sm font-black text-indigo-500 uppercase">H</span></div>
                              </div>
                              <div className="flex gap-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  <button onClick={()=>{startEditRecord(r); window.scrollTo({top:0, behavior:'smooth'});}} className="p-5 text-slate-400 hover:text-amber-600 bg-white rounded-3xl border shadow-md"><Edit2 size={24}/></button>
                                  <button onClick={()=>{if(window.confirm('¿Confirmar eliminación?'))setStudents(prev=>prev.map(s=>s.id===selectedStudentId?{...s,records:s.records.filter((x: any)=>x.id!==r.id)}:s))}} className="p-5 text-slate-400 hover:text-red-500 bg-white rounded-3xl border shadow-md"><Trash2 size={24}/></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

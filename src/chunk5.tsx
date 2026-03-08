      {/* MODAL ALTA/EDICIÓN ALUMNO */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-3xl flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-[5rem] p-12 sm:p-20 w-full max-w-5xl shadow-2xl my-auto border-t-[16px] border-indigo-600 animate-in zoom-in-95 duration-500 relative">
            <button onClick={()=>{setShowAddStudent(false); setStudentFormError(null);}} className="absolute top-10 right-10 p-6 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 rounded-full border border-slate-100 shadow-inner"><X size={32}/></button>
            <h3 className="text-6xl font-black mb-4 text-slate-900 tracking-tighter">{showEditStudent ? 'Modificar Perfil' : 'Alta de Prestador'}</h3>
            <div className="text-slate-400 mb-12 font-black uppercase tracking-[0.4em] text-[12px] flex items-center gap-4"><div className="w-12 h-1 bg-indigo-100"></div> Gestión Técnica de Expedientes</div>

             {studentFormError && (
              <div className="p-6 mb-12 bg-red-50 text-red-700 rounded-[2rem] border-4 border-red-200 flex items-center gap-5 font-black text-[13px] uppercase animate-bounce shadow-lg">
                <AlertCircle size={28}/> {studentFormError}
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
              <div className="lg:col-span-2 space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Nombre Completo</label>
                <input type="text" className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-xl font-black outline-none focus:bg-white transition-all shadow-inner" placeholder="Ej. Mariana Soler Rojas" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} />
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Programa Académico</label>
                <select className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-base font-black outline-none focus:bg-white shadow-inner transition-all" value={studentForm.career} onChange={e => setStudentForm({...studentForm, career: e.target.value})}>{CAREER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
              </div>

               <div className="lg:col-span-3 space-y-6 bg-slate-50/50 p-10 rounded-[4rem] border border-slate-100 shadow-inner">
                <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest block ml-4 mb-4">Enrolamiento en Proyectos (Multi-selección)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                   {projects.map(p => (
                     <label key={p.id} className={`flex items-center gap-5 p-6 rounded-[2.5rem] border-4 transition-all cursor-pointer shadow-lg group ${studentForm.projectIds.includes(p.id) ? 'bg-white border-indigo-500 scale-105' : 'bg-white border-transparent hover:border-indigo-100'}`}>
                       <input type="checkbox" className="w-6 h-6 rounded-lg text-indigo-600 focus:ring-indigo-500 border-2 shrink-0" checked={studentForm.projectIds.includes(p.id)} onChange={e => {
                         const ids = e.target.checked ? [...studentForm.projectIds, p.id] : studentForm.projectIds.filter(id => id !== p.id);
                         const newWorkStatus = ids.length > 0 ? 'Asignado' : 'Sin asignar';
                         setStudentForm({...studentForm, projectIds: ids, workStatus: newWorkStatus});
                       }} />
                       <div className="flex flex-col min-w-0">
                          <div className={`w-4 h-4 rounded-full mb-2 shadow-inner group-hover:scale-125 transition-transform shrink-0 ${p.color}`}></div>
                          <span className="text-[11px] font-black uppercase text-slate-800 leading-none tracking-tight truncate w-full">{p.name}</span>
                       </div>
                     </label>
                   ))}
                </div>
              </div>

               <div className="lg:col-span-3 space-y-10">
                <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest block ml-4 underline decoration-indigo-400 decoration-4 underline-offset-8 mb-4">Gestión de Etiquetas por Proyecto</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {studentForm.projectIds.length === 0 ? (
                    <div className="col-span-full p-20 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
                       <p className="text-slate-300 font-black uppercase tracking-widest text-sm">Selecciona proyectos para asignar etiquetas</p>
                    </div>
                  ) : studentForm.projectIds.map(pid => {
                    const p = projects.find(pr => pr.id === pid);
                    const currentTags = studentForm.projectTasks[pid] || [];
                    const currentInputValue = tagInputs[pid] || '';
                    const bankForProject = projectTagsBank[pid] || [];
                    const suggestions = bankForProject.filter((t: string) => t.toLowerCase().includes(currentInputValue.toLowerCase()) && !currentTags.includes(t));
                    const showSuggestions = activeSuggestionProject === pid && currentInputValue.length > 0 && suggestions.length > 0;

                     return (
                      <div key={pid} className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 space-y-6 shadow-xl relative overflow-hidden transition-all hover:border-indigo-200 animate-in zoom-in duration-500">
                         <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                            <div className={`w-6 h-6 rounded-full shadow-lg border-2 border-white shrink-0 ${p?.color || 'bg-slate-300'}`}></div>
                            <span className="font-black text-sm uppercase text-slate-900 tracking-tighter truncate">{p?.name || 'Proyecto'}</span>
                         </div>
                         <div className="flex gap-4">
                            <div className="relative flex-1 min-w-0">
                               <input type="text" placeholder="Nueva tarea..." className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold outline-none focus:bg-white shadow-inner"
                                 value={currentInputValue}
                                 onChange={(e) => { setTagInputs({...tagInputs, [pid]: e.target.value}); setActiveSuggestionProject(pid); }}
                                 onFocus={() => setActiveSuggestionProject(pid)}
                                 onBlur={() => setTimeout(() => setActiveSuggestionProject(null), 200)}
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter') {
                                     e.preventDefault(); const val = currentInputValue.trim(); if (!val) return;
                                     if (!currentTags.includes(val)) {
                                       setStudentForm({ ...studentForm, projectTasks: { ...studentForm.projectTasks, [pid]: [...currentTags, val] } });
                                     }
                                     setTagInputs({...tagInputs, [pid]: ''}); setActiveSuggestionProject(null);
                                   }
                                 }}
                               />
                               {showSuggestions && (
                                 <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-indigo-100 rounded-2xl shadow-2xl z-50 max-h-40 overflow-y-auto">
                                   {suggestions.map((sugg: string) => (
                                     <div key={sugg} className="p-4 hover:bg-indigo-50 cursor-pointer text-[11px] font-black uppercase text-slate-700 border-b last:border-0 transition-colors flex items-center gap-3"
                                       onClick={() => {
                                         if (!currentTags.includes(sugg)) { setStudentForm({ ...studentForm, projectTasks: { ...studentForm.projectTasks, [pid]: [...currentTags, sugg] } }); }
                                         setTagInputs({...tagInputs, [pid]: ''}); setActiveSuggestionProject(null);
                                       }}>
                                       <Tag size={12} className="text-indigo-400"/> {String(sugg)}
                                     </div>
                                   ))}
                                 </div>
                               )}
                            </div>
                            <button type="button" onClick={() => {
                                  const val = currentInputValue.trim(); if (!val) return;
                                  if (!currentTags.includes(val)) { setStudentForm({ ...studentForm, projectTasks: { ...studentForm.projectTasks, [pid]: [...currentTags, val] } }); }
                                  setTagInputs({...tagInputs, [pid]: ''});
                            }} className="bg-slate-900 text-white p-5 rounded-3xl transition-all hover:bg-black active:scale-95 shadow-xl shrink-0"><Plus size={24}/></button>
                         </div>
                         <div className="flex flex-wrap gap-3 min-h-[60px] p-2 bg-slate-50/30 rounded-3xl border border-dashed border-slate-200">
                            {currentTags.map((tag: string, idx: number) => (
                              <div key={idx} onClick={() => {
                                    const updatedTagsForProj = currentTags.filter((_: any, i: number) => i !== idx);
                                    setStudentForm({ ...studentForm, projectTasks: { ...studentForm.projectTasks, [pid]: updatedTagsForProj } });
                              }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-3 group transition-all hover:bg-red-50 hover:scale-105 shadow-md uppercase tracking-widest max-w-full cursor-pointer">
                                 <span className="truncate">{String(tag)}</span> <X size={14} className="shrink-0"/>
                              </div>
                            ))}
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase block ml-4">Estatus Global</label><select className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-base font-black outline-none focus:bg-white shadow-inner" value={studentForm.status} onChange={e => setStudentForm({...studentForm, status: e.target.value})}>{Object.keys(STUDENT_STATUS).map(st => <option key={st} value={st}>{st}</option>)}</select></div>
              <div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase block ml-4">Carga de Trabajo</label><select className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-base font-black outline-none focus:bg-white shadow-inner" value={studentForm.workStatus} onChange={e => setStudentForm({...studentForm, workStatus: e.target.value})}>{Object.keys(WORK_STATUS).map(ws => <option key={ws} value={ws}>{ws}</option>)}</select></div>
              <div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase block ml-4">Ciclo de Brigada</label><input type="text" placeholder="Ej. 111" maxLength={3} className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-base font-black outline-none shadow-inner" value={studentForm.brigadePeriod} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 3); setStudentForm({...studentForm, brigadePeriod: val}); }} /></div>
              
              <div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase block ml-4">Email</label><input type="email" placeholder="ejemplo@correo.com" className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-base font-black outline-none shadow-inner" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} /></div>
              <div className="space-y-4"><label className="text-[11px] font-black text-slate-400 uppercase block ml-4">Línea Telefónica</label><input type="tel" placeholder="Solo números (Mín. 8)" className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-base font-black outline-none shadow-inner" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value.replace(/\D/g, '')})} /></div>
              <div className="space-y-4"><label className="text-[11px] font-black text-red-500 uppercase block ml-4">Protocolo SOS</label><input type="tel" placeholder="Mín. 8 dígitos" className="w-full p-6 border-4 border-red-50/50 rounded-[2rem] bg-red-50/20 text-xl font-black outline-none text-red-900 shadow-lg" value={studentForm.emergencyPhone} onChange={e => setStudentForm({...studentForm, emergencyPhone: e.target.value.replace(/\D/g, '')})} /></div>
            </div>
            
            <div className="flex gap-10 mt-20">
              <button onClick={() => { setShowAddStudent(false); setStudentFormError(null); }} className="flex-1 px-10 py-8 border-8 border-slate-50 rounded-[3rem] font-black uppercase text-xs text-slate-300 shadow-lg hover:bg-slate-50 transition-all">Cancelar</button>
              <button onClick={handleAddStudent} className="flex-2 px-20 py-8 bg-slate-900 text-white rounded-[3rem] font-black uppercase text-xs shadow-2xl hover:bg-black active:scale-[0.98] transition-all">Certificar Alumno</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

          {(view === 'group-activity' || view === 'individual-activity') && (
            <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-12 duration-700">
              <button onClick={() => setView('dashboard')} className="text-slate-400 font-black uppercase text-[11px] tracking-[0.4em] flex items-center gap-3 hover:text-indigo-600 transition-all"><ArrowLeft size={18}/> Regresar al Panel</button>
              <div className="bg-white p-14 sm:p-20 rounded-[5rem] border border-slate-200 shadow-2xl relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-3 h-full ${view === 'group-activity' ? 'bg-emerald-500 shadow-[6px_0_20px_rgba(16,185,129,0.3)]' : 'bg-indigo-600 shadow-[6px_0_20px_rgba(79,70,229,0.3)]'}`}></div>
                <div className="flex items-center justify-between mb-16">
                   <h2 className="text-5xl font-black text-slate-900 flex items-center gap-6 tracking-tighter">
                      {view === 'group-activity' ? <Users size={56} className="text-emerald-500"/> : <PlusCircle size={56} className="text-indigo-600"/>}
                      {view === 'group-activity' ? 'Bitácora Grupal' : 'Bitácora Individual'}
                   </h2>
                </div>
                <form onSubmit={saveActivity} className="space-y-16">
                    {errorMessage && <div className="p-6 bg-red-50 text-red-700 rounded-[2.5rem] border-4 border-red-200 flex items-center gap-5 font-black text-[13px] uppercase animate-bounce shadow-xl"><AlertCircle size={32}/> {errorMessage}</div>}
                    {renderActivityForm(view === 'group-activity')}
                    <button className={`w-full text-white font-black py-10 rounded-[3.5rem] shadow-2xl uppercase tracking-[0.5em] text-sm transition-all active:scale-[0.98] ${view === 'group-activity' ? 'bg-emerald-600 shadow-emerald-600/40' : 'bg-indigo-600 shadow-indigo-600/40'}`}>Validar y Registrar</button>
                </form>
              </div>
            </div>
          )}

          {view === 'calendar' && (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                 <div>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tight">Calendario</h2>
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mt-2 flex items-center gap-2">Cronograma Mensual de Actividades</p>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                      <button onClick={() => setCalendarMode('grid')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${calendarMode === 'grid' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutGrid size={16}/> Cuadrícula</button>
                      <button onClick={() => setCalendarMode('list')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${calendarMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}><List size={16}/> Listado</button>
                    </div>
                    <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] border border-slate-200 shadow-lg px-6">
                      <button onClick={() => { const next = new Date(currentMonth); next.setMonth(next.getMonth() - 1); setCurrentMonth(next); }} className="p-3 hover:bg-slate-50 rounded-2xl border border-slate-50 hover:scale-110 active:scale-90"><ChevronLeft size={20}/></button>
                      <span className="font-black text-slate-800 min-w-[180px] text-center capitalize text-2xl tracking-tighter">{currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => { const next = new Date(currentMonth); next.setMonth(next.getMonth() + 1); setCurrentMonth(next); }} className="p-3 hover:bg-slate-50 rounded-2xl border border-slate-50 hover:scale-110 active:scale-90"><ChevronRight size={20}/></button>
                    </div>
                 </div>
               </div>

               {calendarMode === 'grid' ? (
                 <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm grid grid-cols-7 relative">
                   {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d} className="py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-50 bg-slate-50/50">{d}</div>)}
                   {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} className="bg-slate-50/10 min-h-[160px] border-r border-b border-slate-100"></div>)}
                   {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                     const day = i + 1;
                     const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                     const dayRecords = allRecords.filter((r: any) => r.date === dateStr);
                     const uniqueCats = Array.from(new Set(dayRecords.map((r: any) => r.categoryId)));
                     return (
                       <div key={day} onClick={() => { if(dayRecords.length > 0) setSelectedCalendarDate(dateStr); }} className={`min-h-[160px] p-5 border-r border-b border-slate-100 transition-all ${dayRecords.length > 0 ? 'cursor-pointer hover:bg-indigo-50/30' : ''} flex flex-col relative overflow-hidden`}>
                         <div className="absolute top-0 right-0 w-8 h-8 bg-slate-50 border-b border-l flex items-center justify-center font-black text-[10px] text-slate-400">{day}</div>
                         <span className="text-sm font-black text-slate-300">{day}</span>
                         <div className="mt-auto space-y-2">
                           {uniqueCats.slice(0, 3).map((cid: any) => {
                             const cat = categories.find(c => c.id === cid);
                             return (
                               <div key={cid} className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden animate-in zoom-in duration-300">
                                 <div className="w-2 h-2 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: cat?.color || '#ccc' }}></div>
                                 <span className="text-[8px] font-black text-slate-500 truncate uppercase">{cat?.name || 'Cat'}</span>
                               </div>
                             );
                           })}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm p-8 sm:p-12 relative overflow-hidden">
                   {(() => {
                     const monthStr = String(currentMonth.getMonth() + 1).padStart(2, '0');
                     const yearStr = String(currentMonth.getFullYear());
                     const monthRecords = allRecords.filter((r: any) => r.date.startsWith(`${yearStr}-${monthStr}`)).sort((a: any, b: any) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
                     const groupedByDate = monthRecords.reduce((acc: any, record: any) => { if (!acc[record.date]) acc[record.date] = []; acc[record.date].push(record); return acc; }, {});
                     
                     return Object.keys(groupedByDate).length === 0 ? (
                       <div className="p-20 text-center flex flex-col items-center gap-6 opacity-50">
                         <CalendarIcon size={64} className="text-slate-300" />
                         <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">Sin Actividades Registradas</p>
                       </div>
                     ) : (
                       <div className="space-y-12">
                         {Object.keys(groupedByDate).map(date => {
                           const dateObj = new Date(`${date}T00:00:00`);
                           const groupedActs: any = {};
                           groupedByDate[date].forEach((r: any) => {
                              const k = `${r.startTime}-${r.endTime}-${r.categoryId}-${r.description}`;
                              if (!groupedActs[k]) groupedActs[k] = { ...r, participants: [r.studentName] };
                              else groupedActs[k].participants.push(r.studentName);
                           });
                           return (
                             <div key={date} className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
                               <div className="sticky top-0 bg-white/95 backdrop-blur-md py-4 mb-6 border-b-2 border-slate-100 z-10 flex items-center gap-4">
                                 <h3 className="font-black text-2xl text-slate-800 capitalize tracking-tight">{dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                               </div>
                               <div className="space-y-4 pl-4 md:pl-8 border-l-2 border-indigo-50">
                                 {Object.values(groupedActs).map((group: any, idx) => {
                                   const cat = categories.find(c => c.id === group.categoryId);
                                   return (
                                     <div key={idx} className="bg-slate-50 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white hover:shadow-lg transition-all border border-slate-100 group">
                                       <div className="flex items-center gap-6 w-full md:w-auto">
                                         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center min-w-[100px]">
                                           <p className="text-xl font-black text-indigo-600 leading-none">{group.startTime}</p>
                                         </div>
                                         <div className="space-y-3">
                                           <div className="flex flex-wrap items-center gap-2">
                                              <span className="px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase shadow-sm" style={{ backgroundColor: cat?.color }}>{cat?.name || 'Categoría'}</span>
                                              {group.participants.length > 1 && <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 shadow-sm"><Users size={10}/> Actividad Grupal</span>}
                                           </div>
                                           <div className="flex flex-wrap gap-2">
                                              {group.participants.map((pName: string, i: number) => (
                                                 <div key={i} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 shadow-sm">{String(pName)}</div>
                                              ))}
                                           </div>
                                         </div>
                                       </div>
                                       {group.description && <div className="md:max-w-xs w-full"> <p className="text-[11px] text-slate-500 font-bold italic line-clamp-2">"{group.description}"</p> </div>}
                                     </div>
                                   );
                                 })}
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     );
                   })()}
                 </div>
               )}

               {selectedCalendarDate && (
                 <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] overflow-y-auto" onClick={(e) => {if(e.target===e.currentTarget) setSelectedCalendarDate(null);}}>
                   <div className="bg-white rounded-[4rem] p-10 sm:p-14 w-full max-w-4xl shadow-2xl relative animate-in zoom-in-95 duration-300 border-t-[12px] border-indigo-600">
                     <button onClick={() => setSelectedCalendarDate(null)} className="absolute top-10 right-10 p-5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-[1.5rem] transition-all"><X size={24}/></button>
                     <h3 className="font-black text-4xl text-slate-900 capitalize tracking-tight mb-8"> {new Date(`${selectedCalendarDate}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} </h3>
                     <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                       {(() => {
                          const dayRecords = allRecords.filter((r: any) => r.date === selectedCalendarDate).sort((a: any,b: any) => a.startTime.localeCompare(b.startTime));
                          const grouped: any = {};
                          dayRecords.forEach((r: any) => {
                             const key = `${r.startTime}-${r.endTime}-${r.categoryId}-${r.description}`;
                             if (!grouped[key]) grouped[key] = { ...r, participants: [r.studentName] };
                             else grouped[key].participants.push(r.studentName);
                          });
                          return Object.values(grouped).map((group: any, idx) => {
                             const cat = categories.find(c => c.id === group.categoryId);
                             return (
                               <div key={idx} className="bg-slate-50 p-6 sm:p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white hover:shadow-lg transition-all border border-slate-100">
                                 <div className="flex items-center gap-6 w-full md:w-auto">
                                   <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center min-w-[100px]">
                                     <p className="text-xl font-black text-indigo-600 leading-none">{group.startTime}</p>
                                   </div>
                                   <div className="space-y-3">
                                     <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase" style={{ backgroundColor: cat?.color || '#ccc' }}>{cat?.name || 'Categoría'}</span>
                                        {group.participants.length > 1 && <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-xl text-[9px] font-black flex items-center gap-1"><Users size={10}/> Grupal</span>}
                                     </div>
                                     <div className="flex flex-wrap gap-2"> {group.participants.map((pName: string, i: number) => ( <div key={i} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 shadow-sm">{String(pName)}</div> ))} </div>
                                   </div>
                                 </div>
                                 {group.description && <div className="md:max-w-xs w-full"> <p className="text-[11px] text-slate-500 font-bold italic line-clamp-3">"{group.description}"</p> </div>}
                               </div>
                             );
                          });
                       })()}
                     </div>
                   </div>
                 </div>
               )}
             </div>
          )}

          {view === 'categories' && (
            <div className="max-w-6xl mx-auto space-y-16 animate-in slide-in-from-right-8 duration-700 pb-20">
              <div className="space-y-8">
                <div className="flex items-center gap-5">
                   <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl shadow-sm border border-indigo-200"><Tag size={32}/></div>
                   <h2 className="text-4xl font-black text-slate-900 tracking-tight">Categorías de Actividad</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-fit">
                    <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2"><PlusCircle size={16}/> Nueva Categoría</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre</label>
                         <input type="text" placeholder="Ej. Taller de Paisaje" className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all text-sm shadow-inner" value={newInlineCat.name} onChange={e => setNewInlineCat({...newInlineCat, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Color</label>
                         <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                            <input type="color" className="w-12 h-12 p-0 border-0 rounded-xl cursor-pointer bg-transparent shadow-sm" value={newInlineCat.color} onChange={e => setNewInlineCat({...newInlineCat, color: e.target.value})} />
                            <span className="text-sm font-bold text-slate-600 uppercase font-mono">{newInlineCat.color}</span>
                         </div>
                      </div>
                      <button onClick={handleCreateInlineCat} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs hover:bg-indigo-700 transition-all shadow-lg active:scale-95">Registrar Categoría</button>
                    </div>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit content-start">
                    {categories.map(cat => (
                      <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-indigo-300 transition-all shadow-sm">
                        <div className="flex items-center gap-4 min-w-0">
                           <div className="w-5 h-5 rounded-full shadow-inner border border-slate-100 shrink-0" style={{ backgroundColor: cat.color }}></div>
                           <span className="font-bold text-slate-800 text-sm tracking-tight truncate">{cat.name}</span>
                        </div>
                        <button onClick={() => setCategories(categories.filter(c => c.id !== cat.id))} className="text-slate-300 hover:text-red-500 p-2.5 bg-slate-50 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8 pt-12 border-t-2 border-dashed border-slate-200">
                <div className="flex items-center gap-5">
                   <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm border border-emerald-200"><Briefcase size={32}/></div>
                   <h2 className="text-4xl font-black text-slate-900 tracking-tight">Proyectos de Brigada</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-fit">
                    <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2"><PlusCircle size={16}/> Nuevo Proyecto</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título</label>
                        <input type="text" placeholder="Ej. Intervención Plaza..." className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 font-bold outline-none focus:bg-white focus:border-emerald-300 transition-all text-sm shadow-inner" id="newProjName" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Color</label>
                        <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                          {['bg-green-500','bg-yellow-500','bg-red-500','bg-blue-500','bg-indigo-500','bg-purple-500','bg-orange-500','bg-pink-500'].map(c=>(
                            <button key={c} onClick={(e: any)=>{
                               (window as any).__selProjColor=c;
                               e.target.parentElement.querySelectorAll('button').forEach((btn: any) => btn.classList.remove('ring-4', 'ring-slate-400', 'scale-110'));
                               e.target.classList.add('ring-4', 'ring-slate-400', 'scale-110');
                            }} className={`w-8 h-8 rounded-full ${c} border-2 border-white shadow-sm transition-all hover:scale-110 active:scale-95`}></button>
                          ))}
                        </div>
                      </div>
                      <button onClick={()=>{const n=(document.getElementById('newProjName') as any).value; if(!n)return; setProjects([...projects,{id:`p-${Date.now()}`,name:n,color:(window as any).__selProjColor||'bg-slate-500'}]); (document.getElementById('newProjName') as any).value='';}} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs hover:bg-emerald-700 transition-all shadow-lg active:scale-95">Registrar Proyecto</button>
                    </div>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit content-start">
                    {projects.map(p => (
                      <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-emerald-300 transition-all shadow-sm">
                        <div className="flex items-center gap-4 min-w-0">
                           <div className={`w-5 h-5 rounded-full shadow-inner border border-slate-100 shrink-0 ${p.color}`}></div>
                           <span className="font-bold text-slate-800 text-sm tracking-tight truncate">{p.name}</span>
                        </div>
                        <button onClick={() => setProjects(projects.filter(proj => proj.id !== p.id))} className="text-slate-300 hover:text-red-600 p-2.5 bg-slate-50 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

import React, { useState, useMemo, useEffect } from 'react';
import { Users, PlusCircle, Clock, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, History, Trash2, Edit2, ChevronRight, ChevronLeft, ArrowLeft, UserPlus, Tag, LayoutDashboard, CalendarDays, ExternalLink, Link as LinkIcon, Phone, Mail, GraduationCap, Briefcase, Plus, Filter, Search, Check, X, List, LayoutGrid } from 'lucide-react';

const TOTAL_REQUIRED_HOURS = 480;

const ATTENDANCE_STATUS = {
  A: { label: 'Asistió', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  N: { label: 'No Asistió', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  AJ: { label: 'Ausencia Justificada', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle },
  AI: { label: 'Ausencia Injustificada', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle },
};

const STUDENT_STATUS = {
  'En Curso': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', hex: '#fef08a' },
  'Finalizada': { color: 'bg-green-100 text-green-800 border-green-200', hex: '#bbf7d0' },
  'Pausada': { color: 'bg-orange-100 text-orange-800 border-orange-200', hex: '#fed7aa' },
  'Abandonada': { color: 'bg-red-100 text-red-800 border-red-200', hex: '#fecaca' },
};

const WORK_STATUS = {
  'Asignado': { color: 'bg-green-500 text-white', icon: Check },
  'Sin asignar': { color: 'bg-orange-500 text-white', icon: AlertCircle },
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Minuta', color: '#3b82f6' },
  { id: 'cat-2', name: 'Visita de campo', color: '#10b981' },
  { id: 'cat-3', name: 'Lecturas', color: '#8b5cf6' },
  { id: 'cat-4', name: 'Reunión Virtual', color: '#ec4899' },
  { id: 'cat-5', name: 'Reunión Presencial', color: '#f59e0b' },
];

const DEFAULT_PROJECTS = [
  { id: 'p-1', name: 'Polvorín/Columpio', color: 'bg-green-500' },
  { id: 'p-2', name: 'Invi', color: 'bg-yellow-500' },
];

const CAREER_OPTIONS = ['Arquitectura', 'Arquitectura del Paisaje', 'Urbanismo', 'Otro'];

const Sidebar = ({ view, setView, setEditingRecordId }: any) => (
  <div className="w-64 bg-slate-900 text-white flex flex-col hidden lg:flex shadow-2xl">
    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
      <div className="bg-indigo-500 p-2 rounded-lg text-white">
        <GraduationCap size={20} />
      </div>
      <h1 className="font-bold text-xs leading-tight uppercase tracking-widest text-indigo-100">Asistencia Prestadores</h1>
    </div>
    <div className="p-4 flex-1 space-y-2 mt-4">
      <button
        onClick={() => { setView('dashboard'); setEditingRecordId(null); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
      >
        <LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span>
      </button>
      <button
        onClick={() => { setView('calendar'); setEditingRecordId(null); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'calendar' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
      >
        <CalendarDays size={20} /> <span className="font-medium">Calendario</span>
      </button>
      <button
        onClick={() => { setView('categories'); setEditingRecordId(null); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'categories' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
      >
        <Tag size={20} /> <span className="font-medium">Configuración</span>
      </button>
    </div>
  </div>
);

const App = () => {
  const [students, setStudents] = useState<any[]>([
    {
      id: '1',
      name: 'Juan Pérez',
      phone: '5512345678',
      emergencyPhone: '5598765432',
      email: 'juan@correo.com',
      brigadePeriod: '111',
      career: 'Arquitectura',
      status: 'En Curso',
      workStatus: 'Asignado',
      projectIds: ['p-1'],
      projectTasks: {
        'p-1': ['Realizando planos', 'Investigación']
      },
      records: []
    }
  ]);

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [view, setView] = useState('dashboard');
  const [calendarMode, setCalendarMode] = useState('grid');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterWork, setFilterWork] = useState('Todos');
  const [filterProject, setFilterProject] = useState('Todos');

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newInlineCat, setNewInlineCat] = useState({ name: '', color: '#6366f1' });

  const [tagInputs, setTagInputs] = useState<any>({});
  const [activeSuggestionProject, setActiveSuggestionProject] = useState<string | null>(null);

  const [studentForm, setStudentForm] = useState({
    name: '', phone: '', emergencyPhone: '', email: '', brigadePeriod: '',
    career: 'Arquitectura', status: 'En Curso', workStatus: 'Sin asignar',
    projectIds: [] as string[], projectTasks: {} as any
  });

  const [activityForm, setActivityForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '13:00',
    hours: 4,
    status: 'A',
    categoryId: 'cat-1',
    description: '',
    evidenceLink: '',
    selectedStudentIds: [] as string[],
    studentStatuses: {} as any
  });

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const toMins = (t: string) => {
    if (!t || !t.includes(':')) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  const projectTagsBank = useMemo(() => {
    const bank: any = {};
    projects.forEach(p => bank[p.id] = new Set());
    students.forEach(student => {
      Object.entries(student.projectTasks || {}).forEach(([projectId, tasks]: any) => {
        if (!bank[projectId]) bank[projectId] = new Set();
        tasks.forEach((task: string) => bank[projectId].add(task));
      });
    });
    return Object.fromEntries(Object.entries(bank).map(([k, v]: any) => [k, Array.from(v)]));
  }, [students, projects]);

  useEffect(() => {
    const isIndividualView = view === 'individual-activity' || view === 'student-detail';
    if (isIndividualView && activityForm.status !== 'A') {
      setActivityForm(prev => {
        if (prev.hours !== 0 || prev.evidenceLink !== '' || prev.description !== '') {
          return { ...prev, hours: 0, evidenceLink: '', description: '' };
        }
        return prev;
      });
      return;
    }
    const start = toMins(activityForm.startTime);
    const end = toMins(activityForm.endTime);
    const calcHours = end - start > 0 ? (end - start) / 60 : 0;
    setActivityForm(prev => prev.hours !== calcHours ? { ...prev, hours: calcHours } : prev);
  }, [activityForm.startTime, activityForm.endTime, activityForm.status, view]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchStatus = filterStatus === 'Todos' || s.status === filterStatus;
      const matchWork = filterWork === 'Todos' || s.workStatus === filterWork;
      const matchProject = filterProject === 'Todos' || s.projectIds.includes(filterProject);
      const lowerSearch = searchTerm.toLowerCase();
      const hasMatchingTag = Object.values(s.projectTasks || {}).some((taskList: any) =>
        taskList.some((tag: string) => tag.toLowerCase().includes(lowerSearch))
      );
      const matchSearch = s.name.toLowerCase().includes(lowerSearch) ||
                          s.career.toLowerCase().includes(lowerSearch) ||
                          hasMatchingTag;
      return matchStatus && matchWork && matchProject && matchSearch;
    });
  }, [students, filterStatus, filterWork, filterProject, searchTerm]);

  const allRecords = useMemo(() => students.flatMap(s => s.records.map((r: any) => ({ ...r, studentName: s.name, studentId: s.id }))), [students]);

  const checkTimeOverlap = (studentId: string, date: string, startTime: string, endTime: string, ignoreRecordId = null) => {
    if (!studentId) return false;
    const student = students.find(s => s.id === studentId);
    if (!student) return false;
    const newStart = toMins(startTime);
    const newEnd = toMins(endTime);
    return student.records.some((record: any) => {
      if (record.id === ignoreRecordId) return false;
      if (record.date !== date) return false;
      const recStart = toMins(record.startTime);
      const recEnd = toMins(record.endTime);
      return (newStart < recEnd && newEnd > recStart);
    });
  };

  const handleAddStudent = () => {
    setStudentFormError(null);
    if (!studentForm.name.trim()) { setStudentFormError("El nombre es obligatorio."); return; }
    if (studentForm.projectIds.length === 0) { setStudentFormError("Debe asignar al menos un proyecto."); return; }
    if (!studentForm.brigadePeriod.trim()) { setStudentFormError("El ciclo de brigada es obligatorio."); return; }
    if (!studentForm.email.trim()) { setStudentFormError("El contacto electrónico es obligatorio."); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentForm.email)) { setStudentFormError("Email inválido."); return; }
    if (studentForm.phone && studentForm.phone.length < 8) { setStudentFormError("Teléfono requiere mín. 8 dígitos."); return; }
    if (studentForm.emergencyPhone && studentForm.emergencyPhone.length < 8) { setStudentFormError("Protocolo SOS requiere mín. 8 dígitos."); return; }

    if (showEditStudent) {
      setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, ...studentForm } : s));
      setShowEditStudent(false);
    } else {
      setStudents([...students, { ...studentForm, id: Date.now().toString(), records: [] }]);
    }
    setShowAddStudent(false);
  };

  const startEditStudent = () => {
    if (!selectedStudent) return;
    setStudentForm({ ...selectedStudent });
    setShowEditStudent(true);
    setShowAddStudent(true);
  };

  const handleCreateInlineCat = () => {
    if (!newInlineCat.name.trim()) return;
    const id = `cat-${Date.now()}`;
    setCategories([...categories, { id, ...newInlineCat }]);
    setActivityForm({ ...activityForm, categoryId: id });
    setShowNewCatInput(false);
    setNewInlineCat({ name: '', color: '#6366f1' });
  };

  const startEditRecord = (record: any) => {
    setEditingRecordId(record.id);
    setActivityForm({
      date: record.date, startTime: record.startTime, endTime: record.endTime,
      hours: record.hours, status: record.status, categoryId: record.categoryId,
      description: record.description, evidenceLink: record.evidenceLink || '',
      selectedStudentIds: [record.studentId], studentStatuses: { [record.studentId]: record.status }
    });
  };

  const saveActivity = (e: any) => {
    e.preventDefault();
    setErrorMessage(null);
    const isGroup = view === 'group-activity';
    const targetIds = isGroup ? activityForm.selectedStudentIds : [activityForm.selectedStudentIds[0] || selectedStudentId];
    
    if (!targetIds || targetIds.length === 0 || !targetIds[0]) {
      setErrorMessage("Debe seleccionar participantes.");
      return;
    }

    const startMins = toMins(activityForm.startTime);
    const endMins = toMins(activityForm.endTime);
    const anyAsistio = isGroup ? Object.values(activityForm.studentStatuses).includes('A') : activityForm.status === 'A';

    if (anyAsistio && endMins <= startMins) { setErrorMessage("La salida debe ser posterior a la entrada."); return; }
    if (anyAsistio && !activityForm.description.trim()) { setErrorMessage("La descripción es obligatoria si hubo asistencia."); return; }

    for (const sId of targetIds) {
      if (checkTimeOverlap(sId as string, activityForm.date, activityForm.startTime, activityForm.endTime, editingRecordId as any)) {
        const sName = students.find(s => s.id === sId)?.name || 'El alumno';
        setErrorMessage(`Horario ocupado para ${sName}.`);
        return;
      }
    }

    setStudents(prev => prev.map(s => {
      if (targetIds.includes(s.id)) {
        const sStat = isGroup ? (activityForm.studentStatuses[s.id] || 'A') : activityForm.status;
        const sHrs = sStat === 'A' ? Number(activityForm.hours) : 0;
        const sDesc = sStat === 'A' ? activityForm.description : '';
        const sLink = sStat === 'A' ? activityForm.evidenceLink : '';

        const newRecord = {
          id: editingRecordId && s.id === selectedStudentId ? editingRecordId : `${Date.now()}-${s.id}`,
          date: activityForm.date, startTime: activityForm.startTime, endTime: activityForm.endTime,
          hours: sHrs, status: sStat, categoryId: activityForm.categoryId,
          description: sDesc, evidenceLink: sLink
        };

        let updatedRecords;
        if (editingRecordId && s.id === selectedStudentId) {
          updatedRecords = s.records.map((r: any) => r.id === editingRecordId ? newRecord : r);
        } else {
          updatedRecords = [newRecord, ...s.records];
        }
        return { ...s, records: updatedRecords, status: updatedRecords.reduce((a: number,c: any)=>a+c.hours,0) >= TOTAL_REQUIRED_HOURS ? 'Finalizada' : s.status };
      }
      return s;
    }));

    setEditingRecordId(null);
    setActivityForm({
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '13:00',
      hours: 4,
      status: 'A',
      categoryId: 'cat-1',
      description: '',
      evidenceLink: '',
      selectedStudentIds: [],
      studentStatuses: {}
    });
    if (isGroup || view === 'individual-activity') setView('dashboard');
  };

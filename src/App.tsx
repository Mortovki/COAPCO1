import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Users, PlusCircle, Clock, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, History, Trash2, Edit2, ChevronRight, ChevronLeft, ArrowLeft, UserPlus, Tag, LayoutDashboard, CalendarDays, ExternalLink, Link as LinkIcon, Phone, Mail, GraduationCap, Briefcase, Plus, Filter, Search, Check, X, List, LayoutGrid, Download } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast, { Toaster } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const getCDMXDateString = () => {
  const now = new Date();
  const cdmxTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
  const cdmxDate = new Date(cdmxTimeStr);
  const cdmxYear = cdmxDate.getFullYear();
  const cdmxMonth = String(cdmxDate.getMonth() + 1).padStart(2, '0');
  const cdmxDay = String(cdmxDate.getDate()).padStart(2, '0');
  return `${cdmxYear}-${cdmxMonth}-${cdmxDay}`;
};

const TOTAL_REQUIRED_HOURS = 480;

const studentSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido paterno es obligatorio"),
  secondLastName: z.string().optional(),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  emergencyPhone: z.string().optional(),
  email: z.string().email("Correo electrónico inválido").min(1, "El correo electrónico es obligatorio"),
  brigadePeriod: z.string().min(1, "El ciclo de brigada es obligatorio"),
  career: z.string(),
  status: z.string(),
  workStatus: z.string(),
  projectIds: z.array(z.string()).min(1, "Debe asignar al menos un proyecto"),
  projectTasks: z.record(z.string(), z.any()).optional().default({}),
  projectTaskHistory: z.record(z.string(), z.any()).optional().default({})
});

const activitySchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM").or(z.literal('')),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM").or(z.literal('')),
  categoryId: z.string().min(1, "La categoría es obligatoria"),
  description: z.string().optional(),
  status: z.string(),
  projectId: z.string().optional(),
  selectedStudentIds: z.array(z.string()),
  studentStatuses: z.record(z.string(), z.string()).optional().default({})
});

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
  { id: 'cat-otra', name: 'Otra Brigada', color: '#64748b' },
  { id: 'cat-nd', name: 'ND en Sistema', color: '#94a3b8' },
];

const DEFAULT_PROJECTS = [
  { id: 'p-1', name: 'Polvorín/Columpio', color: '#22c55e' },
  { id: 'p-2', name: 'Invi', color: '#eab308' },
];

const CAREER_OPTIONS = ['Arquitectura', 'Arquitectura del Paisaje', 'Urbanismo', 'Otro'];

const getDisplayName = (student: any) => {
  if (student.nickname) return student.nickname;
  if (student.firstName && student.lastName) {
    const firstNames = student.firstName.trim().split(' ');
    return `${firstNames[0]} ${student.lastName}`;
  }
  return student.name || 'Desconocido';
};

const getFullName = (student: any) => {
  if (student.firstName) {
    return `${student.firstName} ${student.lastName} ${student.secondLastName || ''}`.trim();
  }
  return student.name || 'Desconocido';
};

const Sidebar = ({ view, setView, setEditingRecordId, userRole }: any) => (
  <div className="w-64 bg-slate-900 text-white flex flex-col hidden lg:flex shadow-2xl">
    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
      <div className="bg-indigo-500 p-2 rounded-lg text-white">
        <GraduationCap size={20} />
      </div>
      <h1 className="font-bold text-xs leading-tight uppercase tracking-widest text-indigo-100">Asistencia Prestadores</h1>
    </div>
    <div className="p-4 flex-1 space-y-2 mt-4">
      <div className="p-4 bg-slate-800 rounded-xl mb-4">
        <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Modo Prueba</p>
        <button onClick={() => { setUserRole(userRole === 'admin' ? 'user' : 'admin'); setCurrentUserId(students[0]?.id || null); }} className="text-xs font-bold text-indigo-400">Cambiar a {userRole === 'admin' ? 'Usuario' : 'Admin'}</button>
      </div>
      {userRole === 'admin' ? (
        <>
          <button
            onClick={() => { toast.dismiss(); setView('dashboard'); setEditingRecordId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => { toast.dismiss(); setView('calendar'); setEditingRecordId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'calendar' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <CalendarDays size={20} /> <span className="font-medium">Calendario</span>
          </button>
          <button
            onClick={() => { toast.dismiss(); setView('categories'); setEditingRecordId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'categories' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Tag size={20} /> <span className="font-medium">Configuración</span>
          </button>
        </>
      ) : (
        <button
          onClick={() => { toast.dismiss(); setView('user-dashboard'); setEditingRecordId(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'user-dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <LayoutDashboard size={20} /> <span className="font-medium">Mi Progreso</span>
        </button>
      )}
    </div>
  </div>
);

const UserDashboard = ({ student, setStudents }: any) => {
  const [task, setTask] = useState('');
  const totalHours = student.records.reduce((acc: number, r: any) => acc + r.hours, 0);
  const progress = Math.min((totalHours / TOTAL_REQUIRED_HOURS) * 100, 100);

  const handleAddTask = () => {
    if (!task) return;
    // Assuming adding a task is adding a record
    const newRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        hours: 0, // Individual tasks might not have hours initially
        categoryId: 'cat-otra',
        description: task,
        status: 'A',
        startTime: '00:00',
        endTime: '00:00'
    };
    setStudents((prev: any) => prev.map((s: any) => s.id === student.id ? { ...s, records: [...s.records, newRecord] } : s));
    setTask('');
    showSuccessToast("Tarea agregada");
  };

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-black text-slate-900">Mi Progreso</h2>
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Horas Completadas</span>
            <span className="text-2xl font-black text-indigo-600">{totalHours} / {TOTAL_REQUIRED_HOURS}</span>
        </div>
        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black mb-4">Agregar Tarea Individual</h3>
        <div className="flex gap-4">
            <input type="text" className="flex-1 p-4 rounded-xl border border-slate-200" placeholder="Descripción de la tarea..." value={task} onChange={e => setTask(e.target.value)} />
            <button onClick={handleAddTask} className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black">Agregar</button>
        </div>
      </div>
    </div>
  );
};

const showSuccessToast = (message: string) => {
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? 'animate-in slide-in-from-top-5 fade-in duration-300' : 'animate-out slide-out-to-top-5 fade-out duration-300'
      } max-w-sm w-full bg-emerald-500 text-white shadow-2xl rounded-2xl pointer-events-auto flex items-center p-4 gap-4`}
    >
      <div className="bg-white/20 p-2 rounded-full">
        <CheckCircle2 size={24} className="text-white" />
      </div>
      <div className="flex-1">
        <p className="font-black text-sm uppercase tracking-widest">{message}</p>
      </div>
      <button onClick={() => toast.dismiss(t.id)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
        <X size={16} />
      </button>
    </div>
  ), { duration: 4000 });
};

const showErrorToast = (message: string, onRetry?: () => void) => {
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? 'animate-in slide-in-from-top-5 fade-in duration-300' : 'animate-out slide-out-to-top-5 fade-out duration-300'
      } max-w-sm w-full bg-red-500 text-white shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-4 gap-3`}
    >
      <div className="flex items-center gap-4">
        <div className="bg-white/20 p-2 rounded-full">
          <AlertCircle size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="font-black text-sm uppercase tracking-widest">Error</p>
          <p className="text-xs font-medium text-red-100 mt-0.5">{message}</p>
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="p-2 hover:bg-white/20 rounded-full transition-colors self-start">
          <X size={16} />
        </button>
      </div>
      <button 
        onClick={() => { toast.dismiss(t.id); if(onRetry) onRetry(); }}
        className="w-full py-2 bg-white text-red-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-50 transition-colors shadow-sm"
      >
        Volver a Intentar
      </button>
    </div>
  ), { duration: 5000 });
};

const showConfirmToast = (message: string, onConfirm: () => void) => {
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? 'animate-in slide-in-from-top-5 fade-in duration-300' : 'animate-out slide-out-to-top-5 fade-out duration-300'
      } max-w-sm w-full bg-white border border-slate-200 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 gap-4`}
    >
      <div className="flex items-center gap-4">
        <div className="bg-red-100 p-2 rounded-full shrink-0">
          <AlertCircle size={24} className="text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-slate-900 uppercase tracking-widest">Confirmar Acción</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5 leading-tight">{message}</p>
        </div>
      </div>
      <div className="flex gap-3 mt-2">
        <button 
          onClick={() => { toast.dismiss(t.id); }}
          className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
        >
          Cancelar
        </button>
        <button 
          onClick={() => { toast.dismiss(t.id); onConfirm(); }}
          className="flex-1 py-2.5 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors shadow-sm"
        >
          Eliminar
        </button>
      </div>
    </div>
  ), { duration: Infinity });
};

const INITIAL_STUDENTS = [
  {
    id: '1',
    firstName: 'Juan',
    lastName: 'Pérez',
    secondLastName: '',
    nickname: 'Juanito',
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
];

const App = () => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);
  const isManualScrollingRef = useRef(false);
  const reqRef = useRef<number>();

  const loopScroll = () => {
    if (carouselRef.current && firstItemRef.current && !isHoveredRef.current && !isManualScrollingRef.current) {
      carouselRef.current.scrollLeft += 1;
      
      const setWidth = (firstItemRef.current.offsetWidth + 24) * 4; // 4 items per set, gap-6 (24px)
      
      if (carouselRef.current.scrollLeft >= setWidth * 2) {
        carouselRef.current.scrollLeft -= setWidth;
      } else if (carouselRef.current.scrollLeft <= 0) {
        carouselRef.current.scrollLeft += setWidth;
      }
    }
    reqRef.current = requestAnimationFrame(loopScroll);
  };

  useEffect(() => {
    setTimeout(() => {
      if (carouselRef.current && firstItemRef.current) {
        const setWidth = (firstItemRef.current.offsetWidth + 24) * 4;
        carouselRef.current.scrollLeft = setWidth;
      }
    }, 100);

    reqRef.current = requestAnimationFrame(loopScroll);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      isManualScrollingRef.current = true;
      const scrollAmount = carouselRef.current.clientWidth * 0.5;
      carouselRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      
      setTimeout(() => {
        isManualScrollingRef.current = false;
      }, 600);
    }
  };

  const [students, setStudents] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('app_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('app_projects');
    return saved ? JSON.parse(saved) : DEFAULT_PROJECTS;
  });

  useEffect(() => {
    localStorage.setItem('app_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('app_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('app_projects', JSON.stringify(projects));
  }, [projects]);
  const [view, setView] = useState('dashboard');
  const [userRole, setUserRole] = useState<'admin' | 'user'>('admin'); // 'admin' or 'user'
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // To identify the logged-in user
  const [calendarMode, setCalendarMode] = useState('grid');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterWork, setFilterWork] = useState('Todos');
  const [filterProject, setFilterProject] = useState('Todos');
  const [filterCareer, setFilterCareer] = useState('Todos');
  const [filterBrigade, setFilterBrigade] = useState('Todos');
  const [sortHours, setSortHours] = useState<'none' | 'asc' | 'desc'>('none');
  const [calendarDateFilter, setCalendarDateFilter] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const studentsPerPage = 10;
  const [sessionPage, setSessionPage] = useState(1);
  const sessionsPerPage = 5;

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newInlineCat, setNewInlineCat] = useState({ name: '', color: '#6366f1' });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [showManualHours, setShowManualHours] = useState(false);
  const [manualHoursForm, setManualHoursForm] = useState({ hours: 0, category: 'Otra Brigada', date: getCDMXDateString() });

  const [tagInputs, setTagInputs] = useState<any>({});
  const [activeSuggestionProject, setActiveSuggestionProject] = useState<string | null>(null);

  const [studentForm, setStudentForm] = useState({
    firstName: '', lastName: '', secondLastName: '', nickname: '', phone: '', emergencyPhone: '', email: '', brigadePeriod: '',
    career: 'Arquitectura', status: 'En Curso', workStatus: 'Sin asignar',
    projectIds: [] as string[], projectTasks: {} as any, projectTaskHistory: {} as any
  });


  const [activityForm, setActivityForm] = useState({
    date: getCDMXDateString(),
    startTime: '09:00',
    endTime: '13:00',
    hours: 4,
    isManualHours: false,
    status: 'A',
    categoryId: '',
    projectId: '',
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
    if (activityForm.isManualHours) return;
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
  }, [activityForm.startTime, activityForm.endTime, activityForm.status, view, activityForm.isManualHours]);

  const uniqueCareers = useMemo(() => Array.from(new Set(students.map(s => s.career).filter(Boolean))).sort(), [students]);
  const uniqueBrigades = useMemo(() => Array.from(new Set(students.map(s => s.brigadePeriod).filter(Boolean))).sort(), [students]);

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      const matchStatus = filterStatus === 'Todos' || s.status === filterStatus;
      const matchWork = filterWork === 'Todos' || s.workStatus === filterWork;
      const matchProject = filterProject === 'Todos' || s.projectIds.includes(filterProject);
      const matchCareer = filterCareer === 'Todos' || s.career === filterCareer;
      const matchBrigade = filterBrigade === 'Todos' || s.brigadePeriod === filterBrigade;
      const lowerSearch = searchTerm.toLowerCase();
      const hasMatchingTag = Object.values(s.projectTasks || {}).some((taskList: any) =>
        taskList.some((tag: string) => tag.toLowerCase().includes(lowerSearch))
      );
      const matchSearch = getFullName(s).toLowerCase().includes(lowerSearch) ||
                          (s.nickname || '').toLowerCase().includes(lowerSearch) ||
                          s.career.toLowerCase().includes(lowerSearch) ||
                          hasMatchingTag;
      return matchStatus && matchWork && matchProject && matchCareer && matchBrigade && matchSearch;
    });

    if (sortHours !== 'none') {
      result.sort((a, b) => {
        const aHours = a.records.reduce((sum: number, r: any) => sum + r.hours, 0);
        const bHours = b.records.reduce((sum: number, r: any) => sum + r.hours, 0);
        return sortHours === 'asc' ? aHours - bHours : bHours - aHours;
      });
    }
    return result;
  }, [students, filterStatus, filterWork, filterProject, filterCareer, filterBrigade, searchTerm, sortHours]);

  useEffect(() => {
    setStudentPage(1);
  }, [filterStatus, filterWork, filterProject, filterCareer, filterBrigade, searchTerm, sortHours]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (studentPage - 1) * studentsPerPage;
    return filteredStudents.slice(startIndex, startIndex + studentsPerPage);
  }, [filteredStudents, studentPage]);

  const totalStudentPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const allRecords = useMemo(() => students.flatMap(s => s.records.map((r: any) => ({ ...r, studentName: s.name, studentId: s.id }))), [students]);

  const paginatedSessions = useMemo(() => {
    if (!selectedStudent) return [];
    const startIndex = (sessionPage - 1) * sessionsPerPage;
    return selectedStudent.records.slice(startIndex, startIndex + sessionsPerPage);
  }, [selectedStudent, sessionPage]);

  const totalSessionPages = selectedStudent ? Math.ceil(selectedStudent.records.length / sessionsPerPage) : 0;

  const chartData = useMemo(() => {
    const hoursByProject: Record<string, { hours: number, color: string, studentCount: number }> = {};
    const hoursByCategory: Record<string, number> = {};
    let totalCompletedHours = 0;

    projects.forEach(p => {
      hoursByProject[p.name] = { hours: 0, color: p.color || '#8884d8', studentCount: 0 };
    });
    hoursByProject['General'] = { hours: 0, color: '#94a3b8', studentCount: 0 };

    students.forEach(s => {
      if (s.projectIds && s.projectIds.length > 0) {
        s.projectIds.forEach(pid => {
          const p = projects.find(proj => proj.id === pid);
          if (p && hoursByProject[p.name]) hoursByProject[p.name].studentCount++;
        });
      } else {
        hoursByProject['General'].studentCount++;
      }

      s.records.forEach((r: any) => {
        if (r.status === 'A') {
          totalCompletedHours += r.hours;
          
          if (r.projectId) {
            const proj = projects.find(p => p.id === r.projectId);
            const pName = proj?.name || 'Desconocido';
            if (hoursByProject[pName]) {
              hoursByProject[pName].hours += r.hours;
            } else {
              hoursByProject[pName] = { hours: r.hours, color: proj?.color || '#8884d8', studentCount: 0 };
            }
          } else {
            hoursByProject['General'].hours += r.hours;
          }

          if (r.categoryId) {
            const cName = categories.find(c => c.id === r.categoryId)?.name || 'Desconocida';
            hoursByCategory[cName] = (hoursByCategory[cName] || 0) + r.hours;
          }
        }
      });
    });

    const projectChartData = Object.entries(hoursByProject)
      .filter(([_, data]) => data.hours > 0 || data.studentCount > 0)
      .map(([name, data]) => ({ 
        name, 
        hours: data.hours, 
        color: data.color, 
        studentCount: data.studentCount,
        avgHours: data.studentCount > 0 ? data.hours / data.studentCount : 0
      }));
    
    const categoryChartData = Object.entries(hoursByCategory).map(([name, hours]) => ({ name, hours }));
    const totalRequired = students.length * TOTAL_REQUIRED_HOURS;
    const progressPerc = totalRequired > 0 ? (totalCompletedHours / totalRequired) * 100 : 0;
    const avgHoursPerStudent = students.length > 0 ? totalCompletedHours / students.length : 0;

    return { projectChartData, categoryChartData, progressPerc, totalCompletedHours, totalRequired, avgHoursPerStudent, totalEnrolled: students.length };
  }, [students, projects, categories]);

  const checkTimeOverlap = (studentId: string, date: string, startTime: string, endTime: string, ignoreRecordId = null) => {
    if (!studentId || !startTime || !endTime) return false;
    const student = students.find(s => s.id === studentId);
    if (!student) return false;
    const newStart = toMins(startTime);
    const newEnd = toMins(endTime);
    return student.records.some((record: any) => {
      if (record.id === ignoreRecordId) return false;
      if (record.date !== date) return false;
      if (!record.startTime || !record.endTime) return false;
      const recStart = toMins(record.startTime);
      const recEnd = toMins(record.endTime);
      return (newStart < recEnd && newEnd > recStart);
    });
  };

  const handleAddStudent = () => {
    setStudentFormError(null);
    try {
      studentSchema.parse(studentForm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setStudentFormError(error.issues[0].message);
        showErrorToast(error.issues[0].message);
        return;
      }
    }

    if (studentForm.phone && studentForm.phone.length < 8) { setStudentFormError("Teléfono requiere mín. 8 dígitos."); showErrorToast("Teléfono requiere mín. 8 dígitos."); return; }
    if (studentForm.emergencyPhone && studentForm.emergencyPhone.length < 8) { setStudentFormError("Protocolo SOS requiere mín. 8 dígitos."); showErrorToast("Protocolo SOS requiere mín. 8 dígitos."); return; }

    if (showEditStudent) {
      setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, ...studentForm } : s));
      setShowEditStudent(false);
      showSuccessToast("Alumno actualizado exitosamente");
    } else {
      setStudents([...students, { ...studentForm, id: Date.now().toString(), records: [] }]);
      showSuccessToast("Alumno agregado exitosamente");
    }
    setShowAddStudent(false);
  };

  const handleDownloadReport = () => {
    if (!selectedStudent) return;
    const headers = ['Fecha', 'Hora de inicio', 'Hora de salida', 'Total de Horas', 'Descripción de actividades'];
    const rows = selectedStudent.records.map((r: any) => [
      r.date,
      r.startTime || 'Manual',
      r.endTime || 'Manual',
      r.hours,
      `"${r.description ? r.description.replace(/"/g, '""') : ''}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Horas_${selectedStudent.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const isManual = !record.startTime || !record.endTime;
    setActivityForm({
      date: record.date, 
      startTime: record.startTime || '09:00', 
      endTime: record.endTime || '13:00',
      hours: record.hours, 
      isManualHours: isManual,
      status: record.status, 
      categoryId: record.categoryId,
      projectId: record.projectId || '',
      description: record.description, 
      evidenceLink: record.evidenceLink || '',
      selectedStudentIds: [record.studentId], 
      studentStatuses: { [record.studentId]: record.status }
    });
  };

  const saveActivity = (e: any) => {
    e.preventDefault();
    setErrorMessage(null);
    const isGroup = view === 'group-activity';
    const targetIds = isGroup ? activityForm.selectedStudentIds : [activityForm.selectedStudentIds[0] || selectedStudentId];
    
    if (!targetIds || targetIds.length === 0 || !targetIds[0]) {
      setErrorMessage("Debe seleccionar participantes.");
      showErrorToast("Debe seleccionar participantes.");
      return;
    }

    const formToValidate = {
      ...activityForm,
      startTime: activityForm.isManualHours ? '' : activityForm.startTime,
      endTime: activityForm.isManualHours ? '' : activityForm.endTime
    };

    try {
      activitySchema.parse(formToValidate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrorMessage(error.issues[0].message);
        showErrorToast(error.issues[0].message);
        return;
      }
    }

    const startMins = toMins(activityForm.startTime);
    const endMins = toMins(activityForm.endTime);
    const anyAsistio = isGroup ? Object.values(activityForm.studentStatuses).includes('A') : activityForm.status === 'A';

    if (anyAsistio && !activityForm.isManualHours && endMins <= startMins) { setErrorMessage("La salida debe ser posterior a la entrada."); showErrorToast("La salida debe ser posterior a la entrada."); return; }
    if (anyAsistio && !activityForm.description.trim()) { setErrorMessage("La descripción es obligatoria si hubo asistencia."); showErrorToast("La descripción es obligatoria si hubo asistencia."); return; }

    // Validar que la fecha y hora no sean en el futuro (CDMX)
    const now = new Date();
    const cdmxTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const cdmxDate = new Date(cdmxTimeStr);
    
    const cdmxYear = cdmxDate.getFullYear();
    const cdmxMonth = String(cdmxDate.getMonth() + 1).padStart(2, '0');
    const cdmxDay = String(cdmxDate.getDate()).padStart(2, '0');
    const cdmxDateString = `${cdmxYear}-${cdmxMonth}-${cdmxDay}`;
    
    const cdmxCurrentMins = cdmxDate.getHours() * 60 + cdmxDate.getMinutes();

    if (activityForm.date > cdmxDateString) {
      setErrorMessage("No se pueden registrar actividades en fechas futuras.");
      showErrorToast("No se pueden registrar actividades en fechas futuras.");
      return;
    }

    if (!activityForm.isManualHours && activityForm.date === cdmxDateString && endMins > cdmxCurrentMins) {
      setErrorMessage("La hora de salida no puede ser mayor a la hora actual.");
      showErrorToast("La hora de salida no puede ser mayor a la hora actual.");
      return;
    }

    if (!activityForm.isManualHours) {
      for (const sId of targetIds) {
        if (checkTimeOverlap(sId as string, activityForm.date, activityForm.startTime, activityForm.endTime, editingRecordId as any)) {
          const sName = students.find(s => s.id === sId)?.name || 'El alumno';
          setErrorMessage(`Horario ocupado para ${sName}.`);
          showErrorToast(`Horario ocupado para ${sName}.`);
          return;
        }
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
          date: activityForm.date, 
          startTime: activityForm.isManualHours ? '' : activityForm.startTime, 
          endTime: activityForm.isManualHours ? '' : activityForm.endTime,
          hours: sHrs, status: sStat, categoryId: activityForm.categoryId,
          projectId: activityForm.projectId,
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
      date: getCDMXDateString(),
      startTime: '09:00',
      endTime: '13:00',
      hours: 4,
      isManualHours: false,
      status: 'A',
      categoryId: '',
      projectId: '',
      description: '',
      evidenceLink: '',
      selectedStudentIds: [],
      studentStatuses: {}
    });
    showSuccessToast(editingRecordId ? "Registro actualizado exitosamente" : "Registro agregado exitosamente");
    if (isGroup || view === 'individual-activity') setView('dashboard');
  };
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
            <input type="date" max={getCDMXDateString()} required className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-sm font-bold" value={activityForm.date} onChange={e => setActivityForm({...activityForm, date: e.target.value})} />
          </div>
          {!activityForm.isManualHours ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada</label>
                <input type="text" maxLength={5} className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-sm font-black text-center" value={activityForm.startTime} onChange={e => setActivityForm({...activityForm, startTime: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salida</label>
                <input type="text" maxLength={5} className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-sm font-black text-center" value={activityForm.endTime} onChange={e => setActivityForm({...activityForm, endTime: e.target.value})} />
              </div>
            </>
          ) : (
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Acumuladas</label>
              <input type="number" min="0" step="0.5" className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-sm font-black text-center" value={activityForm.hours} onChange={e => setActivityForm({...activityForm, hours: Number(e.target.value)})} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="manualHours" checked={activityForm.isManualHours} onChange={e => setActivityForm({...activityForm, isManualHours: e.target.checked, hours: e.target.checked ? 0 : activityForm.hours})} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
          <label htmlFor="manualHours" className="text-xs font-bold text-slate-600 cursor-pointer">Registrar horas acumuladas / extra manualmente</label>
        </div>

        <div className={`grid grid-cols-1 ${!isGroup ? 'md:grid-cols-2' : ''} gap-8`}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
            {!showNewCatInput ? (
              <div className="flex gap-3">
                <select className="flex-1 p-4 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm font-bold" value={activityForm.categoryId} onChange={e => setActivityForm({...activityForm, categoryId: e.target.value})}>
                  <option value="" disabled>Seleccionar categoría...</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewCatInput(true)} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 text-indigo-600"><Plus size={20}/></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" className="flex-1 p-4 border rounded-2xl text-sm" value={newInlineCat.name} onChange={e => setNewInlineCat({...newInlineCat, name: e.target.value})} />
                <button type="button" onClick={handleCreateInlineCat} className="px-4 bg-indigo-600 text-white rounded-2xl">Ok</button>
              </div>
            )}
          </div>
          
          {activityForm.categoryId && !isGroup && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asistencia</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(ATTENDANCE_STATUS).map(k => (
                  <button key={k} type="button" onClick={() => setActivityForm({...activityForm, status: k})} className={`p-3 rounded-2xl text-[10px] font-black border-2 ${activityForm.status === k ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-400'}`}>{k}</button>
                ))}
              </div>
            </div>
          )}
          {activityForm.categoryId && !isGroup && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyecto (Opcional)</label>
              <div className="flex gap-3">
                <select className="flex-1 p-4 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm font-bold" value={activityForm.projectId || ''} onChange={e => setActivityForm({...activityForm, projectId: e.target.value})}>
                  <option value="">General / Sin especificar</option>
                  {(() => {
                     const sId = activityForm.selectedStudentIds[0] || selectedStudentId;
                     const student = students.find(s => s.id === sId);
                     if (!student) return null;
                     return student.projectIds.map((pid: string) => {
                       const p = projects.find(pr => pr.id === pid);
                       return <option key={pid} value={pid}>{p?.name}</option>;
                     });
                  })()}
                </select>
                {activityForm.projectId && (
                  <button type="button" onClick={() => {
                    setActivityForm(prev => ({ ...prev, projectId: '' }));
                  }} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 text-slate-500"><X size={20}/></button>
                )}
              </div>
            </div>
          )}
          {activityForm.categoryId && !isGroup && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alumno</label>
              <select className="w-full p-4 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm font-bold" value={activityForm.selectedStudentIds[0] || selectedStudentId || ''} onChange={e => {
                setActivityForm({...activityForm, selectedStudentIds: [e.target.value]});
                setSelectedStudentId(e.target.value);
              }}>
                <option value="">Seleccionar Alumno</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {activityForm.categoryId && isGroup && (
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

        {activityForm.categoryId && (
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
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100">
      <Toaster position="top-right" />
      <Sidebar view={view} setView={setView} setEditingRecordId={setEditingRecordId} userRole={userRole} />
      <div className="flex-1 flex flex-col">
        {/* Navbar Móvil */}
        <div className="lg:hidden bg-slate-900 text-white p-6 flex justify-between items-center shadow-lg border-b border-white/5">
          <div className="flex items-center gap-2"><GraduationCap size={24} className="text-indigo-400" /><h1 className="font-black text-xs uppercase tracking-tighter">Asistencia<br/><span className="text-indigo-400">Prestadores</span></h1></div>
          <div className="flex gap-6"><LayoutDashboard size={26} onClick={() => setView('dashboard')} /><CalendarDays size={26} onClick={() => setView('calendar')} /></div>
        </div>
        
        <main className="p-6 sm:p-12 max-w-7xl mx-auto w-full flex-1 animate-in fade-in duration-700">
          {view === 'user-dashboard' && currentUserId && (
            <UserDashboard student={students.find(s => s.id === currentUserId)} setStudents={setStudents} />
          )}
          {view === 'dashboard' && (
            <div className="space-y-10">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                <div><h2 className="text-5xl font-black text-slate-900 tracking-tighter">Prestadores</h2><p className="text-slate-500 font-medium mt-1 uppercase text-[11px] tracking-[0.2em] italic">Sistema central de seguimiento y control de horas</p></div>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => { setActivityForm(prev => ({...prev, selectedStudentIds: []})); setView('individual-activity'); }} className="bg-white border-4 border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-all active:scale-95"><PlusCircle size={20} className="text-indigo-500" /> Individual</button>
                  <button onClick={() => setView('group-activity')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"><Users size={20} /> Grupal</button>
                  <button onClick={() => { setShowEditStudent(false); setStudentForm({ firstName: '', lastName: '', secondLastName: '', nickname: '', phone: '', emergencyPhone: '', email: '', brigadePeriod: '', career: 'Arquitectura', status: 'En Curso', workStatus: 'Sin asignar', projectIds: [], projectTasks: {}, projectTaskHistory: {} }); setShowAddStudent(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"><UserPlus size={20} /> Nuevo Alumno</button>
                </div>
              </div>

              {/* Filtros */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Búsqueda y Filtros</span>
                  <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {filteredStudents.length} {filteredStudents.length === 1 ? 'Alumno' : 'Alumnos'}
                  </span>
                </div>
                <div className="w-full relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
                  <input type="text" placeholder="Nombre del alumno, carrera o etiqueta..." className="w-full pl-14 pr-6 py-4 rounded-[1.5rem] bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Proyecto</span>
                    <select className="w-full bg-slate-50 px-4 py-3 rounded-[1.2rem] border border-slate-100 text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                      <option value="Todos">TODOS</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Carrera</span>
                    <select className="w-full bg-slate-50 px-4 py-3 rounded-[1.2rem] border border-slate-100 text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterCareer} onChange={e => setFilterCareer(e.target.value)}>
                      <option value="Todos">TODAS</option>
                      {uniqueCareers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Brigada</span>
                    <select className="w-full bg-slate-50 px-4 py-3 rounded-[1.2rem] border border-slate-100 text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterBrigade} onChange={e => setFilterBrigade(e.target.value)}>
                      <option value="Todos">TODAS</option>
                      {uniqueBrigades.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Estatus Acad.</span>
                    <select className="w-full bg-slate-50 px-4 py-3 rounded-[1.2rem] border border-slate-100 text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                      <option value="Todos">TODOS</option>
                      {Object.keys(STUDENT_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Carga Trabajo</span>
                    <select className="w-full bg-slate-50 px-4 py-3 rounded-[1.2rem] border border-slate-100 text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterWork} onChange={e => setFilterWork(e.target.value)}>
                      <option value="Todos">TODOS</option>
                      {Object.keys(WORK_STATUS).map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ordenar por Horas</span>
                    <select className="w-full bg-slate-50 px-4 py-3 rounded-[1.2rem] border border-slate-100 text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={sortHours} onChange={e => setSortHours(e.target.value as any)}>
                      <option value="none">SIN ORDENAR</option>
                      <option value="desc">MAYOR A MENOR</option>
                      <option value="asc">MENOR A MAYOR</option>
                    </select>
                  </div>
                </div>
                {(filterProject !== 'Todos' || filterCareer !== 'Todos' || filterBrigade !== 'Todos' || filterStatus !== 'Todos' || filterWork !== 'Todos' || sortHours !== 'none' || searchTerm !== '') && (
                  <div className="flex justify-end mt-2">
                    <button 
                      onClick={() => {
                        setFilterProject('Todos');
                        setFilterCareer('Todos');
                        setFilterBrigade('Todos');
                        setFilterStatus('Todos');
                        setFilterWork('Todos');
                        setSortHours('none');
                        setSearchTerm('');
                      }}
                      className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-1 transition-colors"
                    >
                      <X size={12} /> Limpiar Filtros
                    </button>
                  </div>
                )}
              </div>

              {/* Stats Section */}
              <div 
                className="relative w-full rounded-[2rem] mb-6 group"
                onMouseEnter={() => { isHoveredRef.current = true; }}
                onMouseLeave={() => { isHoveredRef.current = false; }}
              >
                <button 
                  onClick={() => scrollCarousel('left')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all hidden md:block opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft size={24} />
                </button>
                
                <div 
                  ref={carouselRef}
                  className="flex overflow-x-auto hide-scrollbar gap-6 pb-4 px-2"
                >
                  {[0, 1, 2].map(setIdx => (
                    <React.Fragment key={setIdx}>
                      <div ref={setIdx === 0 ? firstItemRef : null} className="shrink-0 w-[280px] sm:w-[300px] bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Enrolados</span>
                        <span className="text-4xl font-black text-indigo-600">{chartData.totalEnrolled}</span>
                      </div>
                      <div className="shrink-0 w-[280px] sm:w-[300px] bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Promedio Hrs/Alumno</span>
                        <span className="text-4xl font-black text-emerald-600">{chartData.avgHoursPerStudent.toFixed(1)}</span>
                      </div>
                      <div className="shrink-0 w-[280px] sm:w-[300px] bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Progreso General</span>
                        <span className="text-4xl font-black text-indigo-600">{chartData.progressPerc.toFixed(1)}%</span>
                      </div>
                      <div className="shrink-0 w-[280px] sm:w-[300px] bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Proyectos</span>
                        <span className="text-4xl font-black text-amber-500">{projects.length}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                <button 
                  onClick={() => scrollCarousel('right')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all hidden md:block opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              {/* Charts Section */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm mb-8">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Progreso General de la Generación</h3>
                  <span className="text-2xl font-black text-indigo-600">{chartData.progressPerc.toFixed(1)}%</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${chartData.progressPerc}%` }}></div>
                </div>
                <div className="flex justify-between mt-3 text-[10px] font-black uppercase text-slate-400">
                  <span>{chartData.totalCompletedHours.toFixed(1)} Horas Completadas</span>
                  <span>{chartData.totalRequired} Horas Requeridas</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Horas por Proyecto</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.projectChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                          {chartData.projectChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Distribución de Alumnos por Proyecto</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.projectChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="studentCount" radius={[4, 4, 0, 0]}>
                          {chartData.projectChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Promedio Horas/Alumno por Proyecto</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.projectChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="avgHours" radius={[4, 4, 0, 0]}>
                          {chartData.projectChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Distribución de Categorías</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.categoryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="hours"
                        >
                                  {chartData.categoryChartData.map((entry, index) => {
                                    const cat = categories.find(c => c.name === entry.name);
                                    return <Cell key={`cell-${index}`} fill={cat?.color || '#4f46e5'} />;
                                  })}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Lista */}
              <div className="grid grid-cols-1 gap-6">
                {paginatedStudents.map(student => {
                  const totalHrs = student.records.reduce((acc: number, curr: any) => acc + curr.hours, 0);
                  const perc = Math.min(100, (totalHrs / TOTAL_REQUIRED_HOURS) * 100);
                  const totalSessions = student.records.length;
                  const countAbsences = student.records.filter((r: any) => r.status !== 'A').length;
                  const absencePerc = totalSessions > 0 ? (countAbsences / totalSessions) * 100 : 0;
                  
                  return (
                    <div key={student.id} onClick={() => { setSelectedStudentId(student.id); setView('student-detail'); }} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer relative overflow-hidden flex flex-col md:flex-row items-stretch gap-6">
                      <div className={`absolute left-0 top-0 w-2 h-full transition-all duration-500 ${student.workStatus === 'Asignado' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                      
                      <div className="flex-1 w-full pl-3 flex flex-col justify-center">
                        <div className="flex flex-col mb-3">
                          <div className="flex items-center gap-3">
                            <h3 className="font-black text-2xl text-slate-900 tracking-tight">{getDisplayName(student)}</h3>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border shadow-sm ${(STUDENT_STATUS as any)[student.status]?.color || 'bg-slate-100'}`}>{student.status}</span>
                          </div>
                          <p className="text-xs text-slate-400 italic mt-1">{getFullName(student)}</p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest mb-5">
                          <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100"><GraduationCap size={14}/> {student.career}</span>
                        </div>
                        <div className="flex gap-5 mt-auto">
                           {student.email ? (
                             <a href={`mailto:${student.email}`} className="flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-bold text-[10px] uppercase transition-colors" onClick={(e) => e.stopPropagation()}>
                               <Mail size={14}/> ENVIAR CORREO
                             </a>
                           ) : (
                             <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase"><Mail size={14}/> SIN REG</div>
                           )}
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
                                   <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: p?.color || '#cbd5e1' }}></div>
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
              
              {/* Pagination Controls */}
              {totalStudentPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button 
                    onClick={() => setStudentPage(p => Math.max(1, p - 1))} 
                    disabled={studentPage === 1}
                    className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm disabled:opacity-50 hover:bg-slate-50 transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-black text-slate-500 uppercase tracking-widest">
                    Página {studentPage} de {totalStudentPages}
                  </span>
                  <button 
                    onClick={() => setStudentPage(p => Math.min(totalStudentPages, p + 1))} 
                    disabled={studentPage === totalStudentPages}
                    className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm disabled:opacity-50 hover:bg-slate-50 transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          )}

          {view === 'student-detail' && selectedStudent && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto">
              <button onClick={() => setView('dashboard')} className="flex items-center gap-3 text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] hover:text-indigo-600 transition-all border border-slate-200 bg-white px-6 py-2.5 rounded-2xl shadow-sm"><ArrowLeft size={16} /> Volver</button>
              
              <div className="bg-white p-10 sm:p-14 rounded-[4.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600"></div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
                  <div className="xl:col-span-5 space-y-10">
                    <div>
                        <div className={`inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full text-[12px] font-black uppercase border shadow-lg mb-8 ${(STUDENT_STATUS as any)[selectedStudent.status]?.color || 'bg-slate-100'}`}>
                            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: (STUDENT_STATUS as any)[selectedStudent.status]?.hex || '#ccc' }}></div>
                            {selectedStudent.status}
                        </div>
                        <div className="flex items-center gap-6 mb-6">
                          <h2 className="text-6xl font-black text-slate-900 leading-none tracking-tighter">{selectedStudent.name}</h2>
                          <button onClick={startEditStudent} className="p-4 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transition-all"><Edit2 size={24} /></button>
                          <button onClick={() => setShowManualHours(true)} className="p-4 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transition-all"><Clock size={24} /></button>
                        </div>
                        <div className="flex flex-wrap gap-5 uppercase font-black tracking-[0.25em] text-[12px]">
                            <span className="flex items-center gap-3 text-indigo-600 bg-indigo-50 px-6 py-3 rounded-3xl border border-indigo-100 shadow-md"><GraduationCap size={20}/> {selectedStudent.career}</span>
                            <span className="flex items-center gap-3 text-slate-500 bg-slate-50 px-6 py-3 rounded-3xl border border-slate-100 shadow-md">Brigada: {selectedStudent.brigadePeriod}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={14} className="text-indigo-300"/> Email</span>
                            {selectedStudent.email ? (
                              <a href={`mailto:${selectedStudent.email}`} className="truncate text-[13px] font-black text-indigo-600 hover:text-indigo-800 transition-colors">
                                {selectedStudent.email}
                              </a>
                            ) : (
                              <span className="truncate text-[13px] font-black text-slate-700">NO REGISTRADO</span>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Phone size={14} className="text-indigo-300"/> Teléfono</span>
                            {selectedStudent.phone ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base font-black text-slate-700 break-all">{selectedStudent.phone}</span>
                                <div className="flex gap-2">
                                  <a href={`tel:${selectedStudent.phone}`} className="p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 transition-colors shrink-0" title="Llamar"><Phone size={14} /></a>
                                  <button onClick={() => { navigator.clipboard.writeText(selectedStudent.phone); showSuccessToast("Teléfono copiado"); }} className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-colors shrink-0" title="Copiar"><ExternalLink size={14} /></button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-base font-black text-slate-700">NO REGISTRADO</span>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 p-8 bg-red-50/60 rounded-[2.5rem] border border-red-100 shadow-lg col-span-2">
                            <span className="text-[11px] font-black text-red-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-1"><AlertCircle size={16}/> SOS</span>
                            {selectedStudent.emergencyPhone ? (
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-2xl sm:text-3xl font-black text-red-800 leading-none tracking-tight break-all">{selectedStudent.emergencyPhone}</span>
                                <div className="flex gap-2">
                                  <a href={`tel:${selectedStudent.emergencyPhone}`} className="p-3 bg-red-200 text-red-700 rounded-2xl hover:bg-red-300 transition-colors shadow-sm shrink-0" title="Llamar"><Phone size={20} /></a>
                                  <button onClick={() => { navigator.clipboard.writeText(selectedStudent.emergencyPhone); showSuccessToast("Teléfono SOS copiado"); }} className="p-3 bg-red-100 text-red-600 rounded-2xl hover:bg-red-200 transition-colors shadow-sm shrink-0" title="Copiar"><ExternalLink size={20} /></button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-2xl sm:text-3xl font-black text-red-800 leading-none tracking-tight">SIN CONTACTO</span>
                            )}
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
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color, opacity: isEnrolled ? 1 : 0.4 }}></div>
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
                                     <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: p?.color || '#cbd5e1' }}></div>
                                     <span className="font-black text-slate-800 text-xs uppercase tracking-tight truncate">{p?.name || 'Proyecto'}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mb-3 flex-1 content-start min-h-[40px] max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                    {tasks.map((t: string, idx: number) => (
                                      <div key={idx} onClick={() => {
                                          const removedTag = tasks[idx];
                                          const updatedTags = tasks.filter((_: any, i: number) => i !== idx);
                                          setStudents(prev => prev.map(s => {
                                            if (s.id === selectedStudentId) {
                                              const currentHistory = s.projectTaskHistory?.[pid] || [];
                                              if (!currentHistory.includes(removedTag)) {
                                                return { 
                                                  ...s, 
                                                  projectTasks: { ...s.projectTasks, [pid]: updatedTags },
                                                  projectTaskHistory: { ...s.projectTaskHistory, [pid]: [...currentHistory, removedTag] }
                                                };
                                              }
                                              return { ...s, projectTasks: { ...s.projectTasks, [pid]: updatedTags } };
                                            }
                                            return s;
                                          }));
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
                                  
                                  {selectedStudent.projectTaskHistory?.[pid]?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                      <div className="flex justify-between items-center mb-2">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Historial</p>
                                        <button onClick={() => {
                                          const historyTags = selectedStudent.projectTaskHistory[pid];
                                          const csvContent = ['Actividad'].concat(historyTags).join('\n');
                                          const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                                          const url = URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.setAttribute('href', url);
                                          link.setAttribute('download', `Reporte_${p?.name.replace(/\s+/g, '_')}_${selectedStudent.firstName}.csv`);
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }} className="text-[8px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1"><Download size={10}/> Reporte</button>
                                      </div>
                                      <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto custom-scrollbar pr-1">
                                        {selectedStudent.projectTaskHistory[pid].map((tag: string, idx: number) => (
                                          <div key={idx} className="flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[8px] font-black italic">
                                            <span className="truncate max-w-[80px]">{String(tag)}</span>
                                            <button type="button" onClick={() => {
                                              const updatedHistory = selectedStudent.projectTaskHistory[pid].filter((_: any, i: number) => i !== idx);
                                              setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, projectTaskHistory: { ...s.projectTaskHistory, [pid]: updatedHistory } } : s));
                                            }} className="ml-1 hover:text-red-500 transition-colors"><X size={10}/></button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
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
                    {activityForm.categoryId && (
                      <button className={`w-full text-white font-black py-9 rounded-[3rem] shadow-2xl uppercase tracking-[0.4em] text-sm transform transition-all hover:-translate-y-1 active:translate-y-0.5 ${editingRecordId ? 'bg-amber-600' : 'bg-indigo-600'}`}>
                          <span className="relative z-10">{editingRecordId ? 'Ejecutar Actualización' : 'Certificar Registro en Expediente'}</span>
                      </button>
                    )}
                </form>
              </div>

              {/* Bitácora Histórica */}
              <div className="bg-white rounded-[5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-12 border-b border-slate-100 font-black bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 text-xs text-slate-500 uppercase tracking-[0.3em] shadow-sm">
                   <span className="flex items-center gap-4"><History size={28} className="text-indigo-500" /> Cronología de Sesiones</span>
                   <div className="flex items-center gap-4">
                     <button onClick={handleDownloadReport} className="flex items-center gap-3 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-100 px-6 py-3 rounded-[1.5rem] font-black transition-all shadow-sm"><Download size={16} /> Descargar Reporte</button>
                     <div className="bg-white px-8 py-3 rounded-[1.5rem] border border-slate-200 font-black text-slate-400"> {selectedStudent.records.length} SESIONES TOTALES </div>
                   </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedStudent.records.length === 0 ? (
                    <div className="p-40 text-center flex flex-col items-center gap-10 opacity-30">
                       <div className="p-14 bg-white rounded-full border-8 border-slate-100 shadow-2xl"><CalendarIcon size={100} className="text-slate-300" /></div>
                       <p className="text-xl font-black uppercase tracking-[0.4em] text-slate-500">Expediente Vacío</p>
                    </div>
                  ) : (
                    paginatedSessions.map((r: any) => {
                      const cat = categories.find(c => c.id === r.categoryId);
                      return (
                        <div key={r.id} className={`p-12 sm:p-16 transition-all relative group/item ${editingRecordId === r.id ? 'bg-amber-50/40' : 'hover:bg-indigo-50/20'}`}>
                          {editingRecordId === r.id && <div className="absolute top-0 left-0 w-3 h-full bg-amber-500"></div>}
                          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
                            <div className="space-y-8 flex-1">
                              <div className="flex items-center gap-5 flex-wrap">
                                 <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{r.date}</span>
                                 {r.startTime && r.endTime ? (
                                   <div className="flex items-center gap-3 text-[12px] font-black bg-white border border-slate-200 px-6 py-2.5 rounded-[1.2rem] text-slate-600 shadow-sm"><Clock size={18} className="text-indigo-500" /> {r.startTime} - {r.endTime}</div>
                                 ) : (
                                   <div className="flex items-center gap-3 text-[12px] font-black bg-white border border-slate-200 px-6 py-2.5 rounded-[1.2rem] text-slate-600 shadow-sm"><Clock size={18} className="text-indigo-500" /> Manual</div>
                                 )}
                                 <span className="px-5 py-2 rounded-2xl text-[11px] font-black text-white uppercase shadow-xl" style={{ backgroundColor: cat?.color }}>{cat?.name || 'Categoría'}</span>
                                 {r.projectId && (() => {
                                   const p = projects.find(pr => pr.id === r.projectId);
                                   return p ? <span className="px-5 py-2 rounded-2xl text-[11px] font-black text-white uppercase shadow-xl" style={{ backgroundColor: p.color }}>{p.name}</span> : null;
                                 })()}
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
                                  <button type="button" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); showConfirmToast("¿Estás seguro de que deseas eliminar esta sesión?", () => { setStudents(prev=>prev.map(s=>s.id===selectedStudentId?{...s,records:s.records.filter((x: any)=>x.id!==r.id)}:s)); showSuccessToast("Sesión eliminada"); }); }} className="p-5 text-slate-400 hover:text-red-500 bg-white rounded-3xl border shadow-md relative z-10"><Trash2 size={24}/></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* Session Pagination Controls */}
                {totalSessionPages > 1 && (
                  <div className="flex justify-center items-center gap-4 p-8 border-t border-slate-100 bg-slate-50">
                    <button 
                      onClick={() => setSessionPage(p => Math.max(1, p - 1))} 
                      disabled={sessionPage === 1}
                      className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm disabled:opacity-50 hover:bg-slate-50 transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-black text-slate-500 uppercase tracking-widest">
                      Página {sessionPage} de {totalSessionPages}
                    </span>
                    <button 
                      onClick={() => setSessionPage(p => Math.min(totalSessionPages, p + 1))} 
                      disabled={sessionPage === totalSessionPages}
                      className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm disabled:opacity-50 hover:bg-slate-50 transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
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
                    {activityForm.categoryId && (
                      <button className={`w-full text-white font-black py-10 rounded-[3.5rem] shadow-2xl uppercase tracking-[0.5em] text-sm transition-all active:scale-[0.98] ${view === 'group-activity' ? 'bg-emerald-600 shadow-emerald-600/40' : 'bg-indigo-600 shadow-indigo-600/40'}`}>Validar y Registrar</button>
                    )}
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
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                       <Filter size={16} className="text-slate-400 ml-2" />
                       <input type="date" className="p-2 text-xs font-bold text-slate-600 outline-none bg-transparent" value={calendarDateFilter} onChange={e => {
                         setCalendarDateFilter(e.target.value);
                         if (e.target.value) {
                           const [y, m] = e.target.value.split('-');
                           setCurrentMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
                           setCalendarMode('list');
                         }
                       }} />
                       {calendarDateFilter && <button onClick={() => setCalendarDateFilter('')} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><X size={14}/></button>}
                    </div>
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
                     const hasActivities = dayRecords.length > 0;
                     
                     return (
                       <div 
                         key={day} 
                         onClick={() => { if(hasActivities) setSelectedCalendarDate(dateStr); }} 
                         className={`min-h-[160px] p-5 border-r border-b border-slate-100 transition-all relative overflow-hidden group ${hasActivities ? 'cursor-pointer hover:bg-indigo-50/50' : 'bg-slate-50/10'}`}
                       >
                         {hasActivities && (
                           <div className="absolute inset-0 bg-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                         )}
                         
                         <div className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] transition-colors ${hasActivities ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'text-slate-400 bg-slate-100'}`}>
                           {day}
                         </div>
                         
                         <div className="mt-12 space-y-2 relative z-10">
                           {hasActivities ? (
                             <>
                               <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3">
                                 {dayRecords.length} Actividad{dayRecords.length !== 1 ? 'es' : ''}
                               </div>
                               <div className="flex flex-wrap gap-1.5">
                                 {uniqueCats.slice(0, 4).map((cid: any) => {
                                   const cat = categories.find(c => c.id === cid);
                                   return (
                                     <div 
                                       key={cid} 
                                       className="w-5 h-5 rounded-full shadow-sm border-2 border-white flex items-center justify-center" 
                                       style={{ backgroundColor: cat?.color || '#cbd5e1' }}
                                       title={cat?.name}
                                     ></div>
                                   );
                                 })}
                                 {uniqueCats.length > 4 && (
                                   <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500">
                                     +{uniqueCats.length - 4}
                                   </div>
                                 )}
                               </div>
                             </>
                           ) : (
                             <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-4 opacity-50">Sin registro</div>
                           )}
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
                     const monthRecords = calendarDateFilter ? allRecords.filter((r: any) => r.date === calendarDateFilter).sort((a: any, b: any) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)) : allRecords.filter((r: any) => r.date.startsWith(`${yearStr}-${monthStr}`)).sort((a: any, b: any) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
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
                          const dayRecords = allRecords.filter((r: any) => r.date === selectedCalendarDate).sort((a: any,b: any) => (a.startTime || '').localeCompare(b.startTime || ''));
                          const grouped: any = {};
                          dayRecords.forEach((r: any) => {
                             const key = `${r.startTime || 'manual'}-${r.endTime || 'manual'}-${r.categoryId}-${r.description}`;
                             if (!grouped[key]) grouped[key] = { ...r, participants: [r.studentName] };
                             else grouped[key].participants.push(r.studentName);
                          });
                          return Object.values(grouped).map((group: any, idx) => {
                             const cat = categories.find(c => c.id === group.categoryId);
                             return (
                               <div key={idx} className="bg-slate-50 p-6 sm:p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white hover:shadow-lg transition-all border border-slate-100">
                                 <div className="flex items-center gap-6 w-full md:w-auto">
                                   <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center min-w-[100px]">
                                     <p className="text-xl font-black text-indigo-600 leading-none">{group.startTime || 'Manual'}</p>
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
                        {editingCategory?.id === cat.id ? (
                          <div className="flex items-center gap-3 w-full">
                            <input type="color" className="w-8 h-8 p-0 border-0 rounded-lg cursor-pointer bg-transparent shadow-sm shrink-0" value={editingCategory.color} onChange={e => setEditingCategory({...editingCategory, color: e.target.value})} />
                            <input type="text" className="flex-1 p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold outline-none focus:bg-white text-sm" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} />
                            <button onClick={() => {
                              setCategories(categories.map(c => c.id === cat.id ? editingCategory : c));
                              setEditingCategory(null);
                            }} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition-all"><Check size={18} /></button>
                            <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-xl transition-all"><X size={18} /></button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-4 min-w-0">
                               <div className="w-5 h-5 rounded-full shadow-inner border border-slate-100 shrink-0" style={{ backgroundColor: cat.color }}></div>
                               <span className="font-bold text-slate-800 text-sm tracking-tight truncate">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingCategory(cat)} className="text-slate-300 hover:text-indigo-500 p-2.5 bg-slate-50 rounded-xl transition-all shadow-sm"><Edit2 size={16} /></button>
                              <button onClick={() => {
                                showConfirmToast('¿Estás seguro de que deseas eliminar esta categoría? Esto no se puede deshacer.', () => {
                                  setCategories(categories.filter(c => c.id !== cat.id));
                                  showSuccessToast("Categoría eliminada");
                                });
                              }} className="text-slate-300 hover:text-red-500 p-2.5 bg-slate-50 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
                            </div>
                          </>
                        )}
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
                          {['#22c55e','#eab308','#ef4444','#3b82f6','#6366f1','#a855f7','#f97316','#ec4899'].map(c=>(
                            <button key={c} onClick={(e: any)=>{
                               (window as any).__selProjColor=c;
                               e.target.parentElement.querySelectorAll('button').forEach((btn: any) => btn.classList.remove('ring-4', 'ring-slate-400', 'scale-110'));
                               e.target.classList.add('ring-4', 'ring-slate-400', 'scale-110');
                            }} className="w-8 h-8 rounded-full border-2 border-white shadow-sm transition-all hover:scale-110 active:scale-95" style={{ backgroundColor: c }}></button>
                          ))}
                        </div>
                      </div>
                      <button onClick={()=>{const n=(document.getElementById('newProjName') as any).value; if(!n)return; setProjects([...projects,{id:`p-${Date.now()}`,name:n,color:(window as any).__selProjColor||'#64748b'}]); (document.getElementById('newProjName') as any).value='';}} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs hover:bg-emerald-700 transition-all shadow-lg active:scale-95">Registrar Proyecto</button>
                    </div>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit content-start">
                    {projects.map(p => (
                      <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-emerald-300 transition-all shadow-sm">
                        {editingProject?.id === p.id ? (
                          <div className="flex flex-col gap-3 w-full">
                            <input type="text" className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold outline-none focus:bg-white text-sm" value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})} />
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1">
                                {['#22c55e','#eab308','#ef4444','#3b82f6','#6366f1','#a855f7','#f97316','#ec4899'].map(c=>(
                                  <button key={c} onClick={() => setEditingProject({...editingProject, color: c})} className={`w-5 h-5 rounded-full border-2 ${editingProject.color === c ? 'border-slate-800 scale-110' : 'border-white'} shadow-sm transition-all`} style={{ backgroundColor: c }}></button>
                                ))}
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => {
                                  setProjects(projects.map(pr => pr.id === p.id ? editingProject : pr));
                                  setEditingProject(null);
                                  showSuccessToast("Proyecto actualizado");
                                }} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition-all"><Check size={18} /></button>
                                <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-xl transition-all"><X size={18} /></button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-4 min-w-0">
                               <div className="w-5 h-5 rounded-full shadow-inner border border-slate-100 shrink-0" style={{ backgroundColor: p.color }}></div>
                               <span className="font-bold text-slate-800 text-sm tracking-tight truncate">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingProject(p)} className="text-slate-300 hover:text-emerald-500 p-2.5 bg-slate-50 rounded-xl transition-all shadow-sm"><Edit2 size={16} /></button>
                              <button onClick={() => { showConfirmToast('¿Estás seguro de que deseas eliminar este proyecto?', () => { setProjects(projects.filter(proj => proj.id !== p.id)); setStudents(prev => prev.map(s => { if (s.projectIds.includes(p.id)) { const newIds = s.projectIds.filter((id: string) => id !== p.id); return { ...s, projectIds: newIds, workStatus: newIds.length > 0 ? 'Asignado' : 'Sin asignar' }; } return s; })); showSuccessToast("Proyecto eliminado"); }); }} className="text-slate-300 hover:text-red-600 p-2.5 bg-slate-50 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8 pt-12 border-t-2 border-dashed border-slate-200">
                <div className="flex items-center gap-5">
                   <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl shadow-sm border border-slate-200"><Download size={32}/></div>
                   <h2 className="text-4xl font-black text-slate-900 tracking-tight">Respaldo de Datos</h2>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 mb-6 font-medium">Puedes exportar todos los datos del sistema (alumnos, registros, proyectos y categorías) a un archivo JSON para tener un respaldo, o importar un archivo previamente guardado.</p>
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => {
                      const data = { students, categories, projects };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `backup_prestadores_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showSuccessToast("Respaldo descargado exitosamente");
                    }} className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95">
                      <Download size={20} /> Exportar Datos (JSON)
                    </button>
                    <label className="bg-white border-4 border-slate-100 text-slate-700 px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
                      <PlusCircle size={20} className="text-slate-400" /> Importar Datos (JSON)
                      <input type="file" accept=".json" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const data = JSON.parse(event.target?.result as string);
                            if (data.students && data.categories && data.projects) {
                              setStudents(data.students);
                              setCategories(data.categories);
                              setProjects(data.projects);
                              showSuccessToast("Datos importados exitosamente");
                            } else {
                              showErrorToast("El archivo no tiene el formato correcto");
                            }
                          } catch (error) {
                            showErrorToast("Error al leer el archivo JSON");
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                      }} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
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
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Nombre(s)</label>
                  <input type="text" className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-xl font-black outline-none focus:bg-white transition-all shadow-inner" placeholder="Ej. Mariana" value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} />
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Apellido Paterno</label>
                  <input type="text" className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-xl font-black outline-none focus:bg-white transition-all shadow-inner" placeholder="Ej. Soler" value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} />
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Apellido Materno</label>
                  <input type="text" className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-xl font-black outline-none focus:bg-white transition-all shadow-inner" placeholder="Ej. Rojas" value={studentForm.secondLastName} onChange={e => setStudentForm({...studentForm, secondLastName: e.target.value})} />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Nickname (Opcional)</label>
                <input type="text" className="w-full p-6 border-4 border-slate-50 rounded-[2rem] bg-slate-50 text-xl font-black outline-none focus:bg-white transition-all shadow-inner" placeholder="Ej. Marianita" value={studentForm.nickname} onChange={e => setStudentForm({...studentForm, nickname: e.target.value})} />
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
                          <div className="w-4 h-4 rounded-full mb-2 shadow-inner group-hover:scale-125 transition-transform shrink-0" style={{ backgroundColor: p.color }}></div>
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
                            <div className="w-6 h-6 rounded-full shadow-lg border-2 border-white shrink-0" style={{ backgroundColor: p?.color || '#cbd5e1' }}></div>
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
                         <div className="flex flex-wrap gap-3 min-h-[60px] max-h-[150px] overflow-y-auto custom-scrollbar p-2 bg-slate-50/30 rounded-3xl border border-dashed border-slate-200">
                            {currentTags.map((tag: string, idx: number) => (
                              <div key={idx} onClick={() => {
                                    const removedTag = currentTags[idx];
                                    const updatedTagsForProj = currentTags.filter((_: any, i: number) => i !== idx);
                                    const currentHistory = studentForm.projectTaskHistory?.[pid] || [];
                                    if (!currentHistory.includes(removedTag)) {
                                      setStudentForm({ 
                                        ...studentForm, 
                                        projectTasks: { ...studentForm.projectTasks, [pid]: updatedTagsForProj },
                                        projectTaskHistory: { ...studentForm.projectTaskHistory, [pid]: [...currentHistory, removedTag] }
                                      });
                                    } else {
                                      setStudentForm({ ...studentForm, projectTasks: { ...studentForm.projectTasks, [pid]: updatedTagsForProj } });
                                    }
                              }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-3 group transition-all hover:bg-red-50 hover:scale-105 shadow-md uppercase tracking-widest max-w-full cursor-pointer">
                                 <span className="truncate">{String(tag)}</span> <X size={14} className="shrink-0"/>
                              </div>
                            ))}
                         </div>
                         
                         {/* Historial de Actividades */}
                         {studentForm.projectTaskHistory?.[pid]?.length > 0 && (
                           <div className="mt-6 pt-6 border-t border-slate-100">
                             <div className="flex justify-between items-center mb-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Historial de Actividades</label>
                               <button type="button" onClick={() => {
                                 const historyTags = studentForm.projectTaskHistory[pid];
                                 const csvContent = ['Actividad'].concat(historyTags).join('\n');
                                 const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                                 const url = URL.createObjectURL(blob);
                                 const link = document.createElement('a');
                                 link.setAttribute('href', url);
                                 link.setAttribute('download', `Reporte_${p?.name.replace(/\s+/g, '_')}_${studentForm.firstName || 'Alumno'}.csv`);
                                 document.body.appendChild(link);
                                 link.click();
                                 document.body.removeChild(link);
                               }} className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1"><Download size={12}/> Reporte</button>
                             </div>
                             <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                               {studentForm.projectTaskHistory[pid].map((tag: string, idx: number) => (
                                 <div key={idx} className="flex items-center gap-1 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">
                                   <span className="truncate">{String(tag)}</span>
                                   <button type="button" onClick={() => {
                                     const updatedHistory = studentForm.projectTaskHistory[pid].filter((_: any, i: number) => i !== idx);
                                     setStudentForm({ ...studentForm, projectTaskHistory: { ...studentForm.projectTaskHistory, [pid]: updatedHistory } });
                                   }} className="ml-1 hover:text-red-500 transition-colors"><X size={12}/></button>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
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
        {showManualHours && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-black mb-6">Agregar Horas Manuales</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Horas</label>
                  <input type="number" className="w-full p-4 rounded-xl border border-slate-200" value={manualHoursForm.hours} onChange={e => setManualHoursForm({...manualHoursForm, hours: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2">Categoría</label>
                  <select className="w-full p-4 rounded-xl border border-slate-200" value={manualHoursForm.category} onChange={e => setManualHoursForm({...manualHoursForm, category: e.target.value})}>
                    <option value="Otra Brigada">Otra Brigada</option>
                    <option value="ND en Sistema">ND en Sistema</option>
                  </select>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setShowManualHours(false)} className="flex-1 p-4 bg-slate-100 rounded-xl font-black">Cancelar</button>
                  <button onClick={() => {
                    const newRecord = {
                      id: Date.now().toString(),
                      date: manualHoursForm.date,
                      hours: manualHoursForm.hours,
                      categoryId: manualHoursForm.category === 'Otra Brigada' ? 'cat-otra' : 'cat-nd',
                      description: 'Manual: ' + manualHoursForm.category,
                      status: 'A',
                      startTime: '00:00',
                      endTime: '00:00'
                    };
                    setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, records: [...s.records, newRecord] } : s));
                    setShowManualHours(false);
                    showSuccessToast("Horas manuales agregadas");
                  }} className="flex-1 p-4 bg-indigo-600 text-white rounded-xl font-black">Guardar</button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default App;

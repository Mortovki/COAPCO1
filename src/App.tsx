import * as React from 'react';
import { useState, useMemo, useEffect, useRef, Component } from 'react';
import { createPortal } from 'react-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, getDocFromServer, getDocs, collection } from 'firebase/firestore';
import Login from './components/Login';
import ProfileForm from './components/ProfileForm';
import { AdminValidation } from './components/AdminValidation';
import ProjectDirectory from './components/ProjectDirectory';
import ProjectWorkspace from './components/ProjectWorkspace';
import { Users, PlusCircle, Clock, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, History, Trash2, Edit2, ChevronRight, ChevronLeft, ArrowLeft, UserPlus, Tag, LayoutDashboard, CalendarDays, ExternalLink, Link as LinkIcon, Phone, Mail, GraduationCap, Briefcase, Plus, Filter, Search, Check, X, List, LayoutGrid, Download, RefreshCw, BarChart3, AlertTriangle, CheckSquare, ArrowDownUp, Folder, Send, Shield, ShieldOff } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast, { Toaster } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const TOTAL_REQUIRED_HOURS = 480;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<any, any> {
  state: { hasError: boolean, error: any };
  props: { children: React.ReactNode };

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Algo salió mal.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.operationType) {
          errorMessage = `Error de Firestore (${parsed.operationType}): ${parsed.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">¡Ups!</h2>
            <p className="text-slate-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const toMins = (t: string) => {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const getCDMXDateString = () => {
  const now = new Date();
  const cdmxTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
  const cdmxDate = new Date(cdmxTimeStr);
  const cdmxYear = cdmxDate.getFullYear();
  const cdmxMonth = String(cdmxDate.getMonth() + 1).padStart(2, '0');
  const cdmxDay = String(cdmxDate.getDate()).padStart(2, '0');
  return `${cdmxYear}-${cdmxMonth}-${cdmxDay}`;
};

const studentSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastNamePaterno: z.string().min(1, "El apellido paterno es obligatorio"),
  lastNameMaterno: z.string().min(1, "El apellido materno es obligatorio"),
  studentId: z.string().min(1, "La matrícula es obligatoria"),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  emergencyPhone: z.string().optional(),
  email: z.string().email("Correo electrónico inválido").min(1, "El correo electrónico es obligatorio"),
  brigadePeriod: z.string().min(1, "El ciclo de brigada es obligatorio"),
  brigade: z.string().optional(),
  skills: z.array(z.string()).optional().default([]),
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
  hours: z.number().max(240, "Máximo 240 horas por registro"),
  categoryId: z.string().min(1, "La categoría es obligatoria"),
  description: z.string().optional(),
  status: z.string(),
  projectId: z.string().optional(),
  selectedStudentIds: z.array(z.string()),
  studentStatuses: z.record(z.string(), z.string()).optional().default({})
}).superRefine((data, ctx) => {
  const anyAsistio = Object.values(data.studentStatuses).includes('A') || data.status === 'A';
  if (anyAsistio && data.hours < 0.5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El registro mínimo es de media hora",
      path: ["hours"]
    });
  }
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

const VALIDATION_STATUS = {
  'pendiente': { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  'aprobado': { label: 'Aprobado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  'rechazado': { label: 'Rechazado', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
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
  { 
    id: 'p-1', 
    name: 'Polvorín/Columpio', 
    color: '#22c55e',
    description: 'Proyecto de intervención en Polvorín/Columpio.',
    sections: [
      { id: 'sec-1', name: 'Archivos de Proyecto', links: [] }
    ]
  },
  { 
    id: 'p-2', 
    name: 'Invi', 
    color: '#eab308',
    description: 'Proyecto Invi.',
    sections: [
      { id: 'sec-2', name: 'Archivos de Proyecto', links: [] }
    ]
  },
  { 
    id: 'p-general', 
    name: 'General', 
    color: '#94a3b8',
    description: 'Proyecto General.',
    sections: [
      { id: 'sec-3', name: 'Archivos de Proyecto', links: [] }
    ]
  },
];

const CAREER_OPTIONS = ['Arquitectura', 'Arquitectura del Paisaje', 'Urbanismo', 'Otro'];

const getDisplayName = (student: any) => {
  if (student.nickname) return student.nickname;
  if (student.firstName && student.lastNamePaterno) {
    const firstNames = student.firstName.trim().split(' ');
    return `${firstNames[0]} ${student.lastNamePaterno}`;
  }
  return student.name || 'Desconocido';
};

const getFullName = (student: any) => {
  if (student.firstName) {
    return `${student.firstName} ${student.lastNamePaterno} ${student.lastNameMaterno || ''}`.trim();
  }
  return student.name || 'Desconocido';
};

const Sidebar = ({ view, setView, setEditingRecordId, userRole, setUserRole, setCurrentUserId, currentUserId, firstStudentId, user, onOpenProfile, students, projects, setSelectedProjectId, selectedProjectId }: any) => {
  const currentStudent = students.find((s: any) => s.id === currentUserId);
  const enrolledProjects = (currentStudent?.projectIds && currentStudent.projectIds.length > 0) ? currentStudent.projectIds : ['p-general'];

  return (
  <div className="w-64 bg-slate-900 text-white flex flex-col hidden lg:flex shadow-2xl">
    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
      <div className="bg-indigo-500 p-2 rounded-lg text-white">
        <GraduationCap size={20} />
      </div>
      <h1 className="font-bold text-xs leading-tight uppercase tracking-widest text-indigo-100">Asistencia Prestadores</h1>
    </div>
    <div className="p-4 flex-1 space-y-2 mt-4 overflow-y-auto">
      {userRole !== 'user' ? (
        <>
          <div className="mb-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2">Vista Admin</p>
            <button
              onClick={() => { toast.dismiss(); setView('dashboard'); setEditingRecordId(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <LayoutDashboard size={20} /> <span className="font-medium">Dashboard Admin</span>
            </button>
            <button
              onClick={() => { toast.dismiss(); setView('validation'); setEditingRecordId(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${view === 'validation' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare size={20} /> <span className="font-medium">Validación</span>
              </div>
              {students.reduce((acc: number, s: any) => acc + (s.records || []).filter((r: any) => r.validationStatus === 'pendiente').length, 0) > 0 && (
                <span className="bg-white text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {students.reduce((acc: number, s: any) => acc + (s.records || []).filter((r: any) => r.validationStatus === 'pendiente').length, 0)}
                </span>
              )}
            </button>
            <button
              onClick={() => { toast.dismiss(); setSelectedProjectId(null); setView('project-directory'); setEditingRecordId(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'project-directory' && !selectedProjectId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Briefcase size={20} /> <span className="font-medium">Directorio Proyectos</span>
            </button>
            <button
              onClick={() => { toast.dismiss(); setView('categories'); setEditingRecordId(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'categories' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Tag size={20} /> <span className="font-medium">Configuración</span>
            </button>
          </div>
          
          {user?.email !== 'mortovki@gmail.com' && (
            <div className="pt-4 border-t border-slate-800">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2">Vista Usuario</p>
              <button
                onClick={() => { toast.dismiss(); setView('user-dashboard'); setEditingRecordId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'user-dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <History size={20} /> <span className="font-medium">Mi Progreso</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => { toast.dismiss(); setView('user-dashboard'); setEditingRecordId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'user-dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} /> <span className="font-medium">Mi Progreso</span>
          </button>
          <button
            onClick={() => { toast.dismiss(); setView('calendar'); setEditingRecordId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'calendar' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <CalendarDays size={20} /> <span className="font-medium">Calendario</span>
          </button>
          <button
            onClick={() => { toast.dismiss(); setSelectedProjectId(null); setView('project-directory'); setEditingRecordId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'project-directory' && !selectedProjectId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Briefcase size={20} /> <span className="font-medium">Directorio Proyectos</span>
          </button>
        </>
      )}

      {enrolledProjects.length > 0 && (
        <div className="pt-4 border-t border-slate-800 mt-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-2">Mis Proyectos</p>
          {enrolledProjects.map((pid: string) => {
            const project = projects.find((p: any) => p.id === pid);
            if (!project) return null;
            return (
              <button
                key={pid}
                onClick={() => { toast.dismiss(); setSelectedProjectId(pid); setView('project-directory'); setEditingRecordId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'project-directory' && selectedProjectId === pid ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Folder size={18} style={{ color: view === 'project-directory' && selectedProjectId === pid ? '#fff' : project.color }} /> 
                <span className="font-medium text-sm truncate">{project.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
    <div className="p-6 border-t border-slate-800 space-y-4">
      <div 
        className="flex items-center gap-3 cursor-pointer hover:bg-slate-800 p-2 rounded-xl transition-all"
        onClick={onOpenProfile}
      >
        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-black text-white">
          {user?.displayName?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{user?.displayName || 'Usuario'}</p>
          <p className="text-[10px] text-slate-500 uppercase font-black">{userRole}</p>
        </div>
      </div>
      <button 
        onClick={() => auth.signOut()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-bold"
      >
        Cerrar Sesión
      </button>
    </div>
  </div>
  );
};

const UserDashboard = ({ student, setStudents, userRole, categories, setCategories, projects, students, checkTimeOverlap, selectedRecords, setSelectedRecords, handleDeleteSelected, setView, setSelectedProjectId }: any) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  console.log('DEBUG: UserDashboard', { userRole });
  if (!student) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Cargando perfil...</div>;
  
  const studentProjectIds = (student.projectIds && student.projectIds.length > 0) ? student.projectIds : ['p-general'];
  
  const projectStats = useMemo(() => {
    const stats: Record<string, number> = {};
    (student.records || []).forEach((r: any) => {
      if (r.validationStatus === 'aprobado' || !r.validationStatus) {
        stats[r.projectId] = (stats[r.projectId] || 0) + r.hours;
      }
    });
    return Object.entries(stats).map(([pid, hours]) => {
      const p = projects.find((proj: any) => proj.id === pid);
      return { id: pid, name: p?.name || pid, hours, color: p?.color || '#cbd5e1' };
    });
  }, [student.records, projects]);

  const [form, setForm] = useState({
    date: getCDMXDateString(),
    startTime: '09:00',
    endTime: '13:00',
    categoryId: '',
    projectId: studentProjectIds[0] || '',
    description: '',
    evidenceLink: '',
  });
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', color: '#6366f1' });
  const [tagInput, setTagInput] = useState('');
  const [activeTagProject, setActiveTagProject] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const totalHours = (student.records || []).reduce((acc: number, r: any) => {
    if (r.validationStatus === 'aprobado') return acc + r.hours;
    return acc;
  }, 0);
  const progress = Math.min((totalHours / TOTAL_REQUIRED_HOURS) * 100, 100);

  const calcHours = useMemo(() => {
    const start = toMins(form.startTime);
    const end = toMins(form.endTime);
    return end - start > 0 ? (end - start) / 60 : 0;
  }, [form.startTime, form.endTime]);

  const handleAddTask = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    if (!form.categoryId && !showNewCat) {
      showErrorToast("Selecciona una categoría");
      return;
    }
    if (!form.projectId) {
      showErrorToast("Selecciona un proyecto");
      return;
    }

    if (calcHours <= 0) {
      showErrorToast("La hora de salida debe ser posterior a la de entrada");
      return;
    }
    if (calcHours < 0.5) {
      showErrorToast("El registro mínimo es de media hora");
      return;
    }
    console.log('DEBUG: handleAddTask', { userRole, calcHours });
    if (calcHours > 8 && userRole === 'user') {
      showErrorToast("Un registro no puede exceder las 8 horas");
      return;
    }
    if (calcHours > 240) {
      showErrorToast("Un registro no puede exceder las 240 horas");
      return;
    }

    // Validar que la fecha y hora no sean en el futuro (CDMX)
    const now = new Date();
    const cdmxTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const cdmxDate = new Date(cdmxTimeStr);
    
    const cdmxYear = cdmxDate.getFullYear();
    const cdmxMonth = String(cdmxDate.getMonth() + 1).padStart(2, '0');
    const cdmxDay = String(cdmxDate.getDate()).padStart(2, '0');
    const cdmxDateString = `${cdmxYear}-${cdmxMonth}-${cdmxDay}`;
    
    const cdmxCurrentMins = cdmxDate.getHours() * 60 + cdmxDate.getMinutes();
    const startMins = toMins(form.startTime);
    const endMins = toMins(form.endTime);

    if (form.date > cdmxDateString) {
      setErrorMessage("No se pueden registrar actividades en fechas futuras.");
      showErrorToast("No se pueden registrar actividades en fechas futuras.");
      return;
    }

    if (form.date === cdmxDateString && endMins > cdmxCurrentMins) {
      setErrorMessage("La hora de salida no puede ser mayor a la hora actual.");
      showErrorToast("La hora de salida no puede ser mayor a la hora actual.");
      return;
    }

    // Validar traslapes
    if (checkTimeOverlap(student.id, form.date, form.startTime, form.endTime, editingRecordId)) {
      setErrorMessage("Ya tienes una actividad registrada en este horario.");
      showErrorToast("Ya tienes una actividad registrada en este horario.");
      return;
    }

    setIsSubmitting(true);
    let finalCatId = form.categoryId;
    if (showNewCat) {
      if (!newCat.name) {
        showErrorToast("Ingresa el nombre de la categoría");
        return;
      }
      const catId = `cat-${Date.now()}`;
      const newCategory = { id: catId, ...newCat };
      setCategories([...categories, newCategory]);
      try {
        await setDoc(doc(db, 'categories', catId), newCategory);
        finalCatId = catId;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `categories/${catId}`);
      }
    }

    const newRecord = {
        id: editingRecordId || Date.now().toString(),
        date: form.date,
        hours: calcHours,
        categoryId: finalCatId,
        projectId: form.projectId,
        description: form.description,
        evidenceLink: form.evidenceLink,
        status: 'A',
        startTime: form.startTime,
        endTime: form.endTime,
        validationStatus: 'pendiente',
        createdBy: userRole
    };

    if (editingRecordId) {
      const updatedStudents = students.map((s: any) => s.id === student.id ? { 
        ...s, 
        records: (s.records || []).map((r: any) => r.id === editingRecordId ? newRecord : r) 
      } : s);
      setStudents(updatedStudents);
      
      // Persist to Firestore
      const updateFirestore = async () => {
        try {
          const studentToUpdate = updatedStudents.find((s: any) => s.id === student.id);
          if (studentToUpdate) {
            const dataToSave = {
              ...studentToUpdate,
              uid: student.id,
              role: studentToUpdate.role || 'user',
              createdAt: studentToUpdate.createdAt || new Date().toISOString()
            };
            await setDoc(doc(db, 'users', student.id), dataToSave, { merge: true });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${student.id}`);
        }
      };
      updateFirestore();
      setEditingRecordId(null);
      showSuccessToast("Registro actualizado");
    } else {
      const updatedStudents = students.map((s: any) => s.id === student.id ? { ...s, records: [...(s.records || []), newRecord] } : s);
      setStudents(updatedStudents);

      // Persist to Firestore
      const updateFirestore = async () => {
        try {
          const studentToUpdate = updatedStudents.find((s: any) => s.id === student.id);
          if (studentToUpdate) {
            const dataToSave = {
              ...studentToUpdate,
              uid: student.id,
              role: studentToUpdate.role || 'user',
              createdAt: studentToUpdate.createdAt || new Date().toISOString()
            };
            await setDoc(doc(db, 'users', student.id), dataToSave, { merge: true });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${student.id}`);
        }
      };
      updateFirestore();
      showSuccessToast("Tarea agregada");
    }

    setForm({
      date: getCDMXDateString(),
      startTime: '09:00',
      endTime: '13:00',
      categoryId: '',
      projectId: studentProjectIds[0] || '',
      description: '',
      evidenceLink: '',
    });
    setShowNewCat(false);
    setIsSubmitting(false);
  };

  const handleEditTask = (record: any) => {
    setEditingRecordId(record.id);
    setForm({
      date: record.date,
      startTime: record.startTime || '09:00',
      endTime: record.endTime || '13:00',
      categoryId: record.categoryId,
      projectId: record.projectId,
      description: record.description || '',
      evidenceLink: record.evidenceLink || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTask = (recordId: string) => {
    showConfirmToast("¿Estás seguro de que deseas eliminar esta actividad?", async () => {
      const updatedRecords = (student.records || []).filter((r: any) => r.id !== recordId);
      const updatedStudents = students.map((s: any) => s.id === student.id ? { ...s, records: updatedRecords } : s);
      
      setStudents(updatedStudents);
      try {
        const studentToUpdate = updatedStudents.find((s: any) => s.id === student.id);
        if (studentToUpdate) {
          const dataToSave = {
            ...studentToUpdate,
            uid: student.id,
            role: studentToUpdate.role || 'user',
            createdAt: studentToUpdate.createdAt || new Date().toISOString()
          };
          await setDoc(doc(db, 'users', student.id), dataToSave, { merge: true });
          showSuccessToast("Actividad eliminada");
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${student.id}`);
      }
    });
  };

  const handleDeleteSelectedLocal = () => {
    handleDeleteSelected(student.id);
  };

  const downloadCSV = () => {
    if (selectedRecords.length === 0) {
      showErrorToast("Selecciona al menos un registro para descargar");
      return;
    }

    const recordsToExport = (student.records || []).filter((r: any) => selectedRecords.includes(r.id));
    const headers = ["Fecha", "Hora de entrada", "Hora de salida", "Descripción de actividades"];
    const rows = recordsToExport.map((r: any) => [
      r.date,
      r.startTime,
      r.endTime,
      `"${(r.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `actividades_${student.firstName}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccessToast("Archivo descargado");
  };

  const handleAddTag = (projectId: string) => {
    if (!tagInput.trim()) return;
    setStudents((prev: any) => prev.map((s: any) => {
      if (s.id === student.id) {
        const currentTags = s.projectTasks?.[projectId] || [];
        if (currentTags.includes(tagInput.trim())) return s;
        return {
          ...s,
          projectTasks: {
            ...s.projectTasks,
            [projectId]: [...currentTags, tagInput.trim()]
          }
        };
      }
      return s;
    }));
    setTagInput('');
    setActiveTagProject(null);
    showSuccessToast("Etiqueta agregada");
  };

  const collaborators = useMemo(() => {
    return students.filter((s: any) => 
      s.id !== student.id && 
      s.email !== 'mortovki@gmail.com' &&
      (s.projectIds || []).some((pid: string) => studentProjectIds.includes(pid))
    );
  }, [students, student.id, studentProjectIds]);

  return (
    <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter">Mi Progreso</h2>
                  <p className="text-slate-500 font-medium mt-1 uppercase text-[9px] sm:text-[11px] tracking-[0.2em] italic">Seguimiento personal de actividades y horas</p>
                </div>
                <button 
                  onClick={() => { setSelectedProjectId(null); setView('project-directory'); }} 
                  className="w-full sm:w-auto bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95"
                >
                  <Briefcase size={18} /> Directorio de Proyectos
                </button>
              </div>

      <div className="grid grid-cols-1 gap-8 items-start max-w-4xl mx-auto">
        <div className="grid grid-cols-1 gap-8 items-start">
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 shadow-sm space-y-6 sm:space-y-8">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
              <PlusCircle className="text-indigo-600" size={24} /> Registrar Sesión
            </h3>

            {errorMessage && (
              <div className="p-4 bg-red-50 text-red-700 rounded-2xl border-2 border-red-100 flex items-center gap-3 font-bold text-xs uppercase animate-pulse shadow-sm">
                <AlertCircle size={18} /> {errorMessage}
              </div>
            )}
            
            <div className="space-y-6">
              {/* Row 1: Time tracking */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">FECHA</label>
                  <div className="relative">
                    <input type="date" className="w-full pl-3 pr-8 py-4 bg-slate-50 border-none rounded-2xl text-[11px] sm:text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">ENTRADA (24H)</label>
                  <div className="relative">
                    <input type="time" className="w-full pl-3 pr-8 py-4 bg-slate-50 border-none rounded-2xl text-[11px] sm:text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">SALIDA (24H)</label>
                  <div className="relative">
                    <input type="time" className="w-full pl-3 pr-8 py-4 bg-slate-50 border-none rounded-2xl text-[11px] sm:text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Total Calculado */}
              <div className="flex flex-col items-center sm:items-start bg-indigo-50/50 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">TOTAL CALCULADO</span>
                <span className="text-3xl font-black text-indigo-600 tracking-tighter">{Number(calcHours.toFixed(2))} Horas</span>
              </div>

              {/* Row 2: Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">PROYECTO</label>
                  <div className="relative">
                    <select className="w-full pl-4 pr-12 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer" value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})}>
                      {studentProjectIds.map((pid: string) => {
                        const p = projects.find((proj: any) => proj.id === pid);
                        return <option key={pid} value={pid}>{p?.name || pid}</option>;
                      })}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" size={18} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CATEGORÍA</label>
                    <button onClick={() => setShowNewCat(!showNewCat)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline shrink-0">
                      {showNewCat ? 'CANCELAR' : '+ NUEVA'}
                    </button>
                  </div>
                  {showNewCat ? (
                    <div className="flex gap-2">
                      <input type="text" placeholder="Nombre..." className="flex-1 p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
                      <input type="color" className="w-14 h-14 p-1 bg-slate-50 border-none rounded-2xl cursor-pointer" value={newCat.color} onChange={e => setNewCat({...newCat, color: e.target.value})} />
                    </div>
                  ) : (
                    <div className="relative">
                      <select className="w-full pl-4 pr-12 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                        <option value="">Seleccionar...</option>
                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" size={18} />
                    </div>
                  )}
                </div>
              </div>

              {/* Evidencia */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">EVIDENCIA (URL)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="url" placeholder="https://..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all" value={form.evidenceLink} onChange={e => setForm({...form, evidenceLink: e.target.value})} />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">DESCRIPCIÓN DE LA ACTIVIDAD</label>
                <textarea className="w-full p-5 bg-slate-50 border-none rounded-[2rem] h-32 font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none" placeholder="¿Qué hiciste hoy?..." value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end pt-4">
                {editingRecordId && (
                  <button 
                    onClick={() => {
                      setEditingRecordId(null);
                      setForm({
                        ...form,
                        description: '',
                        evidenceLink: '',
                      });
                    }} 
                    className="px-8 py-4 bg-slate-100 text-slate-500 rounded-full font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    CANCELAR
                  </button>
                )}
                <button 
                  disabled={isSubmitting}
                  onClick={handleAddTask} 
                  className="px-12 py-5 bg-indigo-600 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isSubmitting && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {editingRecordId ? 'ACTUALIZAR' : 'ENVIAR'}
                </button>
              </div>
            </div>
          </div>

          {/* ETIQUETAS DE ACTIVIDAD */}
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
              <BarChart3 className="text-indigo-600 w-6 h-6 sm:w-7 sm:h-7" /> Estadísticas por Proyecto
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {projectStats.map((stat: any) => (
                <div key={stat.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }}></div>
                      <span className="font-black text-xs uppercase text-slate-700">{stat.name}</span>
                    </div>
                    <span className="text-lg font-black text-indigo-600">{Number(stat.hours.toFixed(2))}h</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((stat.hours / TOTAL_REQUIRED_HOURS) * 100 * 5, 100)}%`, backgroundColor: stat.color }}></div>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aportación al progreso total</p>
                </div>
              ))}
              {projectStats.length === 0 && <p className="text-center py-10 text-slate-300 font-black uppercase tracking-widest text-[10px] col-span-full">No hay horas registradas aún</p>}
            </div>
          </div>

          {/* ETIQUETAS DE ACTIVIDAD */}
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
              <Tag className="text-indigo-600 w-6 h-6 sm:w-7 sm:h-7" /> Mis Etiquetas por Proyecto
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {studentProjectIds.map((pid: string) => {
                const p = projects.find((proj: any) => proj.id === pid);
                const tags = student.projectTasks?.[pid] || [];
                return (
                  <div key={pid} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          if (setView && setSelectedProjectId) {
                            setSelectedProjectId(pid);
                            setView('project-directory');
                          }
                        }}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p?.color || '#cbd5e1' }}></div>
                        <span className="font-black text-xs uppercase text-slate-700 hover:text-indigo-600 transition-colors">{p?.name || pid}</span>
                      </div>
                      <button onClick={() => setActiveTagProject(activeTagProject === pid ? null : pid)} className="text-indigo-600 hover:bg-indigo-100 p-2 rounded-xl transition-all">
                        <Plus size={16} />
                      </button>
                    </div>
                    {activeTagProject === pid && (
                      <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                        <input 
                          type="text" 
                          placeholder="Nueva etiqueta..." 
                          className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddTag(pid)}
                        />
                        <button onClick={() => handleAddTag(pid)} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all">
                          <Check size={16} />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t: string, i: number) => (
                        <span key={i} className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-2">
                          #{t}
                          <button onClick={() => {
                            setStudents((prev: any) => prev.map((s: any) => {
                              if (s.id === student.id) {
                                return {
                                  ...s,
                                  projectTasks: {
                                    ...s.projectTasks,
                                    [pid]: tags.filter((_: any, idx: number) => idx !== i)
                                  }
                                };
                              }
                              return s;
                            }));
                          }} className="text-slate-300 hover:text-red-500 transition-colors">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      {tags.length === 0 && <p className="text-[10px] font-bold text-slate-300 uppercase italic">Sin etiquetas</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COMPAÑEROS DE PROYECTO */}
          <div className="bg-white p-4 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 shadow-sm space-y-6 sm:space-y-8">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
              <Users className="text-indigo-600" size={24} /> Compañeros de Proyecto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {collaborators.map((collab: any) => {
                const records = collab.records || [];
                const latestRecord = records[records.length - 1];
                const commonProjects = (collab.projectIds || []).filter((pid: string) => studentProjectIds.includes(pid));
                return (
                  <div key={collab.id} className="bg-slate-50 p-4 sm:p-6 rounded-[2rem] border border-slate-100 flex gap-4 items-start hover:bg-white hover:shadow-md transition-all group">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 shrink-0">
                      {collab.firstName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                      <div>
                        <p className="font-black text-slate-900 truncate text-sm sm:text-base">{getFullName(collab)}</p>
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{collab.career}</p>
                      </div>
                      
                      {commonProjects.length > 0 && collab.role !== 'coordinator' && collab.role !== 'admin' && (
                        <div className="flex flex-wrap gap-1">
                          {commonProjects.map((pid: string) => {
                            const p = projects.find((proj: any) => proj.id === pid);
                            return (
                              <span 
                                key={pid} 
                                className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter"
                                style={{ 
                                  backgroundColor: `${p?.color || '#6366f1'}15`, 
                                  color: p?.color || '#6366f1' 
                                }}
                              >
                                {p?.name || pid}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {latestRecord && (
                        <div className="bg-white/50 p-2 sm:p-3 rounded-xl border border-slate-100 overflow-hidden">
                          <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">Última Actividad</p>
                          <p className="text-[10px] sm:text-[11px] font-bold text-slate-600 line-clamp-1 italic break-words">"{latestRecord.description}"</p>
                        </div>
                      )}
                      <div className="flex gap-3 pt-1">
                        {collab.email && (
                          <a href={`mailto:${collab.email}`} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                            <Mail size={14} />
                          </a>
                        )}
                        {collab.phone && (
                          <a href={`tel:${collab.phone}`} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
                            <Phone size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Admin Card */}
              <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex gap-4 items-start shadow-sm">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white shrink-0">
                  A
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <p className="font-black text-indigo-900">Luis Edgar Gutiérrez</p>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Coordinación General</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <Mail size={12} className="text-indigo-400" /> mortovki@gmail.com
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <Phone size={12} className="text-emerald-400" /> 5512345678
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progreso General</span>
                <span className="text-2xl font-black text-indigo-600 tracking-tighter">{Number(totalHours.toFixed(2))} / {TOTAL_REQUIRED_HOURS}</span>
            </div>
            <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden mb-4 shadow-inner">
                <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000 shadow-lg" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Faltan {Number(Number((TOTAL_REQUIRED_HOURS - totalHours).toFixed(2)))} horas para completar</p>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <History className="text-slate-400" size={24} /> Recientes
              </h3>
              <div className="flex gap-2">
                {selectedRecords.length > 0 && (
                  <>
                    <button onClick={handleDeleteSelectedLocal} className="p-2 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Borrar Seleccionados">
                      <Trash2 size={18} />
                    </button>
                    <button onClick={downloadCSV} className="p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Descargar Seleccionados">
                      <Download size={18} />
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all shadow-sm flex items-center justify-center"
                  title={sortOrder === 'desc' ? 'Ordenar Ascendente' : 'Ordenar Descendente'}
                >
                  <ArrowDownUp size={18} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
                <button 
                  onClick={() => {
                    const records = student.records || [];
                    if (selectedRecords.length === records.length) setSelectedRecords([]);
                    else setSelectedRecords(records.map((r: any) => r.id));
                  }} 
                  className={`p-2 rounded-xl transition-all shadow-sm flex items-center justify-center ${selectedRecords.length > 0 && selectedRecords.length === (student.records || []).length ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  title={selectedRecords.length > 0 && selectedRecords.length === (student.records || []).length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                >
                  {selectedRecords.length > 0 && selectedRecords.length === (student.records || []).length ? <X size={18} /> : <CheckSquare size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {(student.records || []).slice().sort((a: any, b: any) => {
                  const dateA = new Date(`${a.date}T${a.startTime || '00:00'}`).getTime();
                  const dateB = new Date(`${b.date}T${b.startTime || '00:00'}`).getTime();
                  return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                }).map((r: any) => {
                  const cat = categories.find((c: any) => c.id === r.categoryId);
                  const isSelected = selectedRecords.includes(r.id);
                  return (
                    <div 
                      key={r.id} 
                      onClick={() => {
                        setSelectedRecords(prev => isSelected ? prev.filter(id => id !== r.id) : [...prev, r.id]);
                      }}
                      className={`group p-6 border rounded-[2rem] transition-all relative cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-md' : 'border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30'}`}
                    >
                      <div className="flex justify-between items-start mb-2 gap-4 pr-16">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.date}</span>
                          </div>
                          <span className="text-sm font-black text-indigo-600 shrink-0">{Number(r.hours.toFixed(2))}h</span>
                      </div>
                        <p className="font-bold text-slate-800 text-sm leading-tight mb-3">{r.description || 'Sin descripción'}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat?.color || '#cbd5e1' }}></div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{cat?.name || 'Otra'}</span>
                          </div>
                          {r.validationStatus && (
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest ${(VALIDATION_STATUS as any)[r.validationStatus]?.color || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                              {(() => {
                                const Icon = (VALIDATION_STATUS as any)[r.validationStatus]?.icon || Clock;
                                return <Icon size={10} />;
                              })()}
                              {(VALIDATION_STATUS as any)[r.validationStatus]?.label || 'Pendiente'}
                            </div>
                          )}
                        </div>
                        {r.createdBy !== 'admin' && (
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEditTask(r); }} 
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); showConfirmToast("¿Eliminar este registro?", () => handleDeleteTask(r.id)); }} 
                                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                  );
                })}
                {(student.records || []).length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">No hay registros aún</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const showSuccessToast = (message: string) => {
  toast.custom((t) => createPortal(
    <div className={`fixed inset-0 flex items-center justify-center z-[99999] pointer-events-none p-4 transition-all duration-500 ease-out ${t.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl border-4 border-emerald-500 shadow-[0_32px_64px_-12px_rgba(16,185,129,0.4)] rounded-[3rem] pointer-events-auto flex flex-col items-center p-10 gap-6 text-center">
        <div className="bg-emerald-500 p-6 rounded-full shadow-lg shadow-emerald-500/30">
          <CheckCircle2 size={48} className="text-white" />
        </div>
        <div className="space-y-2">
          <p className="font-black text-2xl text-slate-900 uppercase tracking-tighter leading-none">¡Éxito!</p>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{message}</p>
        </div>
        <button 
          onClick={() => toast.dismiss(t.id)} 
          className="mt-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg"
        >
          Entendido
        </button>
      </div>
    </div>,
    document.body
  ), { duration: 4000 });
};

const showErrorToast = (message: string, onRetry?: () => void) => {
  toast.custom((t) => createPortal(
    <div className={`fixed inset-0 flex items-center justify-center z-[99999] pointer-events-none p-4 transition-all duration-500 ease-out ${t.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl border-4 border-red-500 shadow-[0_32px_64px_-12px_rgba(239,68,68,0.4)] rounded-[3rem] pointer-events-auto flex flex-col items-center p-10 gap-6 text-center">
        <div className="bg-red-500 p-6 rounded-full shadow-lg shadow-red-500/30">
          <AlertCircle size={48} className="text-white" />
        </div>
        <div className="space-y-2">
          <p className="font-black text-2xl text-slate-900 uppercase tracking-tighter leading-none">Error</p>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-4 w-full">
          {onRetry && (
            <button 
              onClick={() => { toast.dismiss(t.id); onRetry(); }} 
              className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg"
            >
              Reintentar
            </button>
          )}
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className={`${onRetry ? 'flex-1' : 'w-full'} px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  ), { duration: 5000 });
};

const showConfirmToast = (message: string, onConfirm: () => void) => {
  toast.custom((t) => createPortal(
    <div className={`fixed inset-0 flex items-center justify-center z-[99999] pointer-events-none p-4 transition-all duration-500 ease-out ${t.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl border-4 border-red-500 shadow-[0_32px_64px_-12px_rgba(239,68,68,0.4)] rounded-[3rem] pointer-events-auto flex flex-col items-center p-10 gap-6 text-center">
        <div className="bg-red-500 p-6 rounded-full shadow-lg shadow-red-500/30">
          <AlertCircle size={48} className="text-white" />
        </div>
        <div className="space-y-2">
          <p className="font-black text-2xl text-slate-900 uppercase tracking-tighter leading-none">Confirmar</p>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-4 w-full">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { toast.dismiss(t.id); onConfirm(); }} 
            className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  ), { duration: Infinity });
};

const INITIAL_STUDENTS = [
  {
    id: '1',
    firstName: 'Juan',
    lastNamePaterno: 'Pérez',
    lastNameMaterno: '',
    studentId: '315123456',
    nickname: 'Juanito',
    phone: '5512345678',
    emergencyPhone: '5598765432',
    email: 'juan@correo.com',
    brigadePeriod: '111',
    brigade: 'Brigada 111',
    skills: ['AutoCAD', 'SketchUp', 'Revit'],
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
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  useEffect(() => {
    const handleDismiss = () => {
      toast.dismiss();
    };

    window.addEventListener('click', handleDismiss);
    window.addEventListener('scroll', handleDismiss, { passive: true });

    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('scroll', handleDismiss);
    };
  }, []);

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

  const [view, setView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'coordinator' | 'user'>('user');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // To identify the logged-in user
  const [calendarMode, setCalendarMode] = useState('grid');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [studentFormErrors, setStudentFormErrors] = useState<Record<string, string>>({});
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
  const [sessionSortOrder, setSessionSortOrder] = useState<'desc' | 'asc'>('desc');
  const sessionsPerPage = 5;

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfileForm, setEditingProfileForm] = useState<any>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectedNotifications, setRejectedNotifications] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(data));
            setView(data.role === 'user' ? 'user-dashboard' : 'dashboard');
          } else {
            // Check local storage fallback
            const localProfile = localStorage.getItem(`profile_${currentUser.uid}`);
            if (localProfile) {
              const parsed = JSON.parse(localProfile);
              setUserProfile(parsed);
              setView(parsed.role === 'user' ? 'user-dashboard' : 'dashboard');
            } else {
              setUserProfile(null);
            }
          }
        } catch (error: any) {
          console.error("Error loading user profile:", error);
          
          // Fallback to local storage on permission error
          const localProfile = localStorage.getItem(`profile_${currentUser.uid}`);
          if (localProfile) {
            const parsed = JSON.parse(localProfile);
            setUserProfile(parsed);
            setView(parsed.role === 'user' ? 'user-dashboard' : 'dashboard');
          } else {
            setUserProfile(null);
          }

          if (error.code === 'permission-denied') {
            toast.error('Error de permisos en Firebase. Usando datos locales si están disponibles.', {
              duration: 4000,
              id: 'firebase-permission-error'
            });
          } else {
            // Do not throw here to allow app to proceed to ProfileForm if not found
            console.warn("Could not load profile from Firestore, proceeding to ProfileForm");
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('app_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('app_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('app_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (userProfile) {
      setUserRole(userProfile.role || 'user');
      setCurrentUserId(userProfile.uid || null);
      
      if (userProfile.records) {
        const unacknowledged = userProfile.records.filter((r: any) => 
          r.validationStatus === 'rechazado' && r.acknowledgedRejection === false
        );
        if (unacknowledged.length > 0) {
          setRejectedNotifications(unacknowledged);
        }
      }

      if (userProfile.role === 'user') {
        // Asegurar que el estudiante existe en la lista local
        setStudents(prev => {
          if (!prev.find(s => s.id === userProfile.uid)) {
            return [...prev, {
              id: userProfile.uid,
              firstName: userProfile.firstName,
              lastNamePaterno: userProfile.lastNamePaterno,
              lastNameMaterno: userProfile.lastNameMaterno,
              studentId: userProfile.studentId,
              name: `${userProfile.firstName} ${userProfile.lastNamePaterno} ${userProfile.lastNameMaterno}`,
              email: userProfile.email,
              phone: userProfile.phone,
              career: userProfile.career,
              brigadePeriod: userProfile.brigadePeriod || '2024-1',
              brigade: userProfile.brigade || '',
              skills: userProfile.skills || [],
              status: 'En Curso',
              workStatus: 'Sin asignar',
              projectIds: userProfile.projectIds || [],
              records: userProfile.records || []
            }];
          }
          return prev;
        });
      }
    }
  }, [userProfile]);
  useEffect(() => {
    if (loading || !user) return;
    const fetchConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        if (!projectsSnapshot.empty) {
          const projectsData = projectsSnapshot.docs.map(doc => doc.data());
          setProjects(projectsData);
        } else if (userRole !== 'user') {
          // If empty and admin, save defaults to Firestore
          const defaults = [
            { id: 'p-1', name: 'Brigada de Salud', color: '#ef4444' },
            { id: 'p-2', name: 'Apoyo Comunitario', color: '#3b82f6' }
          ];
          for (const p of defaults) {
            await setDoc(doc(db, 'projects', p.id), p);
          }
          setProjects(defaults);
        }

        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        if (!categoriesSnapshot.empty) {
          const categoriesData = categoriesSnapshot.docs.map(doc => doc.data());
          setCategories(categoriesData);
        } else if (userRole !== 'user') {
          // If empty and admin, save defaults to Firestore
          const defaults = [
            { id: 'cat-1', name: 'Administrativo', icon: 'FileText' },
            { id: 'cat-2', name: 'Campo', icon: 'Map' },
            { id: 'cat-3', name: 'Investigación', icon: 'Search' }
          ];
          for (const c of defaults) {
            await setDoc(doc(db, 'categories', c.id), c);
          }
          setCategories(defaults);
        }
      } catch (error: any) {
        console.error("Error fetching config from Firestore:", error);
        if (error.code === 'permission-denied') {
          console.log("Permission denied for config fetch. Auth state:", {
            user: !!user,
            userRole,
            loading,
            currentUser: !!auth.currentUser
          });
        }
      } finally {
        setIsLoadingConfig(false);
      }
    };
    fetchConfig();
  }, [user, userRole, loading]);

  useEffect(() => {
    if (userRole !== 'user') {
      const fetchStudents = async () => {
        setIsLoadingStudents(true);
        try {
          const querySnapshot = await getDocs(collection(db, 'users'));
          const studentsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              name: `${data.firstName || ''} ${data.lastNamePaterno || ''} ${data.lastNameMaterno || ''}`.trim() || 'Sin nombre'
            };
          });
          setStudents(studentsData);
        } catch (error) {
          console.error("Error fetching students:", error);
          // Only handle if it's not a permission error we already handle elsewhere
          if (error instanceof Error && !error.message.includes('permission-denied')) {
            handleFirestoreError(error, OperationType.LIST, 'users');
          }
        } finally {
          setIsLoadingStudents(false);
        }
      };
      fetchStudents();
    }
  }, [userRole]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
          toast.error("Error de conexión con Firebase. Revisa tu configuración.");
        }
      }
    }
    testConnection();
  }, []);

  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newInlineCat, setNewInlineCat] = useState({ name: '', color: '#6366f1' });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [showManualHours, setShowManualHours] = useState(false);
  const [manualHoursForm, setManualHoursForm] = useState({ hours: 0, category: 'Otra Brigada', date: getCDMXDateString() });

  const [tagInputs, setTagInputs] = useState<any>({});
  const [activeSuggestionProject, setActiveSuggestionProject] = useState<string | null>(null);

  const [studentForm, setStudentForm] = useState({
    firstName: '', lastNamePaterno: '', lastNameMaterno: '', nickname: '', phone: '', emergencyPhone: '', email: '', brigadePeriod: '',
    brigade: '', skills: [] as string[],
    studentId: '', serviceType: 'Prestador',
    career: 'Arquitectura', status: 'En Curso', workStatus: 'Sin asignar',
    projectIds: [] as string[], projectTasks: {} as any, projectTaskHistory: {} as any,
    role: 'user'
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
      if (s.email === 'mortovki@gmail.com') return false;
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
      const getApprovedHours = (s: any) => (s.records || []).reduce((sum: number, r: any) => {
        if (r.validationStatus === 'aprobado' || !r.validationStatus) return sum + r.hours;
        return sum;
      }, 0);
      result.sort((a, b) => {
        const aHours = getApprovedHours(a);
        const bHours = getApprovedHours(b);
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

  const allRecords = useMemo(() => {
    let filtered = students;
    if (userRole === 'user' && currentUserId) {
      filtered = students.filter(s => s.id === currentUserId);
    }
    return filtered.flatMap(s => (s.records || []).map((r: any) => ({ ...r, studentName: s.name, studentId: s.id })));
  }, [students, userRole, currentUserId]);

  const paginatedSessions = useMemo(() => {
    if (!selectedStudent) return [];
    const startIndex = (sessionPage - 1) * sessionsPerPage;
    const sortedRecords = [...(selectedStudent.records || [])].sort((a: any, b: any) => {
      const dateA = new Date(`${a.date}T${a.startTime || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.startTime || '00:00'}`).getTime();
      return sessionSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    return sortedRecords.slice(startIndex, startIndex + sessionsPerPage);
  }, [selectedStudent, sessionPage, sessionSortOrder]);

  const totalSessionPages = selectedStudent ? Math.ceil((selectedStudent.records || []).length / sessionsPerPage) : 0;

  const chartData = useMemo(() => {
    const hoursByProject: Record<string, { hours: number, color: string, studentCount: number }> = {};
    const hoursByCategory: Record<string, number> = {};
    let totalCompletedHours = 0;

    projects.forEach(p => {
      hoursByProject[p.name] = { hours: 0, color: p.color || '#8884d8', studentCount: 0 };
    });
    hoursByProject['General'] = { hours: 0, color: '#94a3b8', studentCount: 0 };

    const validStudents = students.filter(s => s.email !== 'mortovki@gmail.com');

    validStudents.forEach(s => {
      if (s.projectIds && s.projectIds.length > 0) {
        s.projectIds.forEach(pid => {
          const p = projects.find(proj => proj.id === pid);
          if (p && hoursByProject[p.name]) hoursByProject[p.name].studentCount++;
        });
      } else {
        hoursByProject['General'].studentCount++;
      }

      (s.records || []).forEach((r: any) => {
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
    const totalRequired = validStudents.length * TOTAL_REQUIRED_HOURS;
    const progressPerc = totalRequired > 0 ? (totalCompletedHours / totalRequired) * 100 : 0;
    const avgHoursPerStudent = validStudents.length > 0 ? totalCompletedHours / validStudents.length : 0;

    return { projectChartData, categoryChartData, progressPerc, totalCompletedHours, totalRequired, avgHoursPerStudent, totalEnrolled: validStudents.length };
  }, [students, projects, categories]);

  const [rejectingRecord, setRejectingRecord] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleRejectRecordProfile = async () => {
    if (!rejectingRecord || !selectedStudentId) return;

    const updatedStudents = students.map(s => s.id === selectedStudentId ? {
      ...s,
      records: (s.records || []).map((rec: any) => rec.id === rejectingRecord.id ? { 
        ...rec, 
        validationStatus: 'rechazado',
        rejectReason: rejectReason,
        acknowledgedRejection: false
      } : rec)
    } : s);
    setStudents(updatedStudents);

    try {
      const studentToUpdate = updatedStudents.find(s => s.id === selectedStudentId);
      if (studentToUpdate) {
        const dataToSave = {
          ...studentToUpdate,
          uid: selectedStudentId,
          role: studentToUpdate.role || 'user',
          createdAt: studentToUpdate.createdAt || new Date().toISOString()
        };
        await setDoc(doc(db, 'users', selectedStudentId), dataToSave, { merge: true });
        
        if (studentToUpdate.email) {
          const subject = encodeURIComponent("Registro de horas rechazado");
          const body = encodeURIComponent(`Hola ${studentToUpdate.name},\n\nTu registro de horas ha sido rechazado por el siguiente motivo:\n\n${rejectReason}\n\nPor favor revisa tu panel para más detalles.`);
          window.open(`mailto:${studentToUpdate.email}?subject=${subject}&body=${body}`, '_blank');
        }

        showSuccessToast("Sesión rechazada y notificación enviada");
        setRejectingRecord(null);
        setRejectReason('');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${selectedStudentId}`);
    }
  };

  const handleMakeCoordinator = async (studentId: string) => {
    try {
      const studentToUpdate = students.find(s => s.id === studentId);
      if (!studentToUpdate) return;

      const dataToSave = {
        ...studentToUpdate,
        uid: studentId,
        role: 'coordinator',
        createdAt: studentToUpdate.createdAt || new Date().toISOString()
      };

      await setDoc(doc(db, 'users', studentId), dataToSave, { merge: true });
      
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, role: 'coordinator' } : s));
      showSuccessToast("Privilegios de coordinador otorgados");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${studentId}`);
    }
  };

  const handleDemoteUser = async (studentId: string) => {
    try {
      const studentToUpdate = students.find(s => s.id === studentId);
      if (!studentToUpdate) return;

      const dataToSave = {
        ...studentToUpdate,
        uid: studentId,
        role: 'user',
        createdAt: studentToUpdate.createdAt || new Date().toISOString()
      };

      await setDoc(doc(db, 'users', studentId), dataToSave, { merge: true });
      
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, role: 'user' } : s));
      showSuccessToast("Privilegios removidos. Ahora es un usuario estándar.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${studentId}`);
    }
  };

  const handleAcknowledgeRejection = async (recordId: string) => {
    if (!userProfile) return;
    
    const updatedRecords = (userProfile.records || []).map((r: any) => 
      r.id === recordId ? { ...r, acknowledgedRejection: true } : r
    );

    const updatedProfile = { ...userProfile, records: updatedRecords };
    setUserProfile(updatedProfile);
    setRejectedNotifications(prev => prev.filter(n => n.id !== recordId));

    try {
      await setDoc(doc(db, 'users', userProfile.uid), updatedProfile, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userProfile.uid}`);
    }
  };

  const checkTimeOverlap = (studentId: string, date: string, startTime: string, endTime: string, ignoreRecordId = null) => {
    if (!studentId || !startTime || !endTime) return false;
    const student = students.find(s => s.id === studentId);
    if (!student) return false;
    const newStart = toMins(startTime);
    const newEnd = toMins(endTime);
    return (student.records || []).some((record: any) => {
      if (record.id === ignoreRecordId) return false;
      if (record.date !== date) return false;
      if (!record.startTime || !record.endTime) return false;
      const recStart = toMins(record.startTime);
      const recEnd = toMins(record.endTime);
      return (newStart < recEnd && newEnd > recStart);
    });
  };

  const handleAddStudent = () => {
    setStudentFormErrors({});
    try {
      studentSchema.parse(studentForm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach(issue => {
          const path = issue.path[0] as string;
          if (!errors[path]) errors[path] = issue.message;
        });
        setStudentFormErrors(errors);
        showErrorToast("Por favor corrige los errores en el formulario");
        return;
      }
    }

    const manualErrors: Record<string, string> = {};
    if (studentForm.phone && studentForm.phone.length < 8) { manualErrors.phone = "Teléfono requiere mín. 8 dígitos."; }
    if (studentForm.emergencyPhone && studentForm.emergencyPhone.length < 8) { manualErrors.emergencyPhone = "Protocolo SOS requiere mín. 8 dígitos."; }

    if (Object.keys(manualErrors).length > 0) {
      setStudentFormErrors(prev => ({ ...prev, ...manualErrors }));
      showErrorToast("Por favor corrige los errores en el formulario");
      return;
    }

    // Validación de certificación (horas mínimas)
    if (studentForm.status === 'Finalizada') {
      const currentStudent = students.find(s => s.id === selectedStudentId);
      const totalHours = currentStudent ? (currentStudent.records || []).reduce((acc: number, r: any) => {
        if (r.validationStatus === 'aprobado') return acc + r.hours;
        return acc;
      }, 0) : 0;
      
      if (totalHours < TOTAL_REQUIRED_HOURS) {
        setStudentFormErrors(prev => ({ 
          ...prev, 
          status: `No se puede certificar: el alumno solo tiene ${Number(totalHours.toFixed(2))} de ${TOTAL_REQUIRED_HOURS} horas requeridas.` 
        }));
        showErrorToast(`El alumno no cumple con las ${TOTAL_REQUIRED_HOURS} horas requeridas para ser certificado.`);
        return;
      }
    }

    if (showEditStudent) {
      const updateFirestore = async () => {
        try {
          const docRef = doc(db, 'users', selectedStudentId!);
          const existingStudent = students.find(s => s.id === selectedStudentId);
          
          const updatedData = {
            ...studentForm,
            uid: selectedStudentId,
            role: studentForm.role || existingStudent?.role || 'user',
            createdAt: existingStudent?.createdAt || new Date().toISOString()
          };
          
          await setDoc(docRef, updatedData, { merge: true });
          setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, ...updatedData } : s));
          setShowEditStudent(false);
          setShowAddStudent(false);
          showSuccessToast("Alumno actualizado exitosamente");
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${selectedStudentId}`);
        }
      };
      updateFirestore();
    } else {
      // For new students, we might want to save them to Firestore too with a generated ID
      // but usually they register themselves. If admin adds them, we can use a random ID.
      const addNewStudent = async () => {
        const newId = Date.now().toString();
        try {
          const docRef = doc(db, 'users', newId);
          const newStudentData = {
            ...studentForm,
            uid: newId,
            role: studentForm.role || 'user',
            createdAt: new Date().toISOString(),
            records: []
          };
          await setDoc(docRef, newStudentData);
          setStudents([...students, { ...newStudentData, id: newId, name: `${studentForm.firstName} ${studentForm.lastNamePaterno} ${studentForm.lastNameMaterno}` }]);
          showSuccessToast("Alumno agregado exitosamente");
          setShowAddStudent(false);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${newId}`);
        }
      };
      addNewStudent();
    }
  };

  const handleApproveRecord = async (studentId: string, recordId: string) => {
    const updatedStudents = students.map((s: any) => {
      if (s.id === studentId) {
        return {
          ...s,
          records: (s.records || []).map((r: any) => 
            r.id === recordId ? { ...r, validationStatus: 'aprobado' } : r
          )
        };
      }
      return s;
    });

    setStudents(updatedStudents);

    try {
      const studentToUpdate = updatedStudents.find((s: any) => s.id === studentId);
      if (studentToUpdate) {
        const dataToSave = {
          ...studentToUpdate,
          uid: studentId,
          role: studentToUpdate.role || 'user',
          createdAt: studentToUpdate.createdAt || new Date().toISOString()
        };
        await setDoc(doc(db, 'users', studentId), dataToSave, { merge: true });
        showSuccessToast("Registro aprobado");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${studentId}`);
    }
  };

  const handleDeleteSelected = (studentId: string) => {
    if (selectedRecords.length === 0) return;
    
    showConfirmToast(
      `¿Estás seguro de que deseas eliminar los ${selectedRecords.length} registros seleccionados?`,
      async () => {
        const updatedStudents = students.map((s: any) => {
          if (s.id === studentId) {
            return {
              ...s,
              records: (s.records || []).filter((r: any) => !selectedRecords.includes(r.id))
            };
          }
          return s;
        });
        
        setStudents(updatedStudents);
        setSelectedRecords([]);
        
        try {
          const studentToUpdate = updatedStudents.find((s: any) => s.id === studentId);
          if (studentToUpdate) {
            const dataToSave = {
              ...studentToUpdate,
              uid: studentId,
              role: studentToUpdate.role || 'user',
              createdAt: studentToUpdate.createdAt || new Date().toISOString()
            };
            await setDoc(doc(db, 'users', studentId), dataToSave, { merge: true });
            showSuccessToast("Registros eliminados");
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${studentId}`);
        }
      }
    );
  };

  const handleDownloadReport = () => {
    if (!selectedStudent) return;
    const headers = ['Fecha', 'Hora de inicio', 'Hora de salida', 'Total de Horas', 'Descripción de actividades'];
    const rows = (selectedStudent.records || []).map((r: any) => [
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
    setStudentForm({ 
      ...selectedStudent,
      projectTasks: selectedStudent.projectTasks || {},
      projectTaskHistory: selectedStudent.projectTaskHistory || {}
    });
    setShowEditStudent(true);
    setShowAddStudent(true);
  };

  const handleCreateInlineCat = async () => {
    if (!newInlineCat.name.trim()) return;
    const id = `cat-${Date.now()}`;
    const newCategory = { id, ...newInlineCat };
    setCategories([...categories, newCategory]);
    try {
      await setDoc(doc(db, 'categories', id), newCategory);
    } catch (error) {
      console.error("Error saving inline category:", error);
    }
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
    if (isSubmitting) return;
    setErrorMessage(null);
    const isGroup = view === 'group-activity';
    const targetIds = isGroup ? activityForm.selectedStudentIds : [activityForm.selectedStudentIds[0] || selectedStudentId];
    
    if (!targetIds || targetIds.length === 0 || !targetIds[0]) {
      setErrorMessage("Debe seleccionar participantes.");
      showErrorToast("Debe seleccionar participantes.");
      return;
    }

    const startMins = toMins(activityForm.startTime);
    const endMins = toMins(activityForm.endTime);
    const anyAsistio = isGroup ? Object.values(activityForm.studentStatuses).includes('A') : activityForm.status === 'A';

    if (anyAsistio && !activityForm.isManualHours && endMins <= startMins) { setErrorMessage("La salida debe ser posterior a la entrada."); showErrorToast("La salida debe ser posterior a la entrada."); return; }
    if (anyAsistio && !activityForm.description.trim()) { setErrorMessage("La descripción es obligatoria si hubo asistencia."); showErrorToast("La descripción es obligatoria si hubo asistencia."); return; }

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

    if (formToValidate.hours > 8 && userRole === 'user') {
      setErrorMessage("Un registro no puede exceder las 8 horas");
      showErrorToast("Un registro no puede exceder las 8 horas");
      return;
    }
    if (formToValidate.hours > 240) {
      setErrorMessage("Un registro no puede exceder las 240 horas");
      showErrorToast("Un registro no puede exceder las 240 horas");
      return;
    }

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
          const errorMsg = `Ya se tienen actividades registradas en este horario para ${sName}.`;
          setErrorMessage(errorMsg);
          showErrorToast(errorMsg);
          return;
        }
      }
    }

    setIsSubmitting(true);
    const updatedStudents = students.map(s => {
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
          description: sDesc, evidenceLink: sLink, 
          validationStatus: 'aprobado',
          createdBy: userRole
        };

        let updatedRecords;
        const records = s.records || [];
        if (editingRecordId && s.id === selectedStudentId) {
          updatedRecords = records.map((r: any) => r.id === editingRecordId ? newRecord : r);
        } else {
          updatedRecords = [newRecord, ...records];
        }
        const approvedHours = updatedRecords.reduce((a: number,c: any) => {
          if (c.validationStatus === 'aprobado' || !c.validationStatus) return a + c.hours;
          return a;
        }, 0);
        return { ...s, records: updatedRecords, status: approvedHours >= TOTAL_REQUIRED_HOURS ? 'Finalizada' : s.status };
      }
      return s;
    });

    setStudents(updatedStudents);

    // Persist each updated student to Firestore
    const persistUpdates = async () => {
      try {
        const updates = targetIds.map(async (id: string) => {
          const studentToUpdate = updatedStudents.find((s: any) => s.id === id);
          if (studentToUpdate) {
            const dataToSave = {
              ...studentToUpdate,
              uid: id,
              role: studentToUpdate.role || 'user',
              createdAt: studentToUpdate.createdAt || new Date().toISOString()
            };
            await setDoc(doc(db, 'users', id), dataToSave, { merge: true });
          }
        });
        await Promise.all(updates);
        showSuccessToast(editingRecordId ? "Registro actualizado exitosamente" : "Registro agregado exitosamente");
      } catch (error) {
        console.error("Error persisting activity updates:", error);
        handleFirestoreError(error, OperationType.WRITE, `users/multiple`);
      } finally {
        setIsSubmitting(false);
      }
    };
    persistUpdates();

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
    const isUser = userRole === 'user';

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</label>
            <input type="date" max={getCDMXDateString()} required className="w-full p-3 sm:p-4 border border-slate-200 rounded-2xl bg-white text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" value={activityForm.date || ''} onChange={e => setActivityForm({...activityForm, date: e.target.value})} />
          </div>
          {!activityForm.isManualHours ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada</label>
                <input type="text" placeholder="HH:MM" maxLength={5} className="w-full p-3 sm:p-4 border border-slate-200 rounded-2xl bg-white text-sm font-black text-center focus:ring-2 focus:ring-indigo-500 outline-none" value={activityForm.startTime || ''} onChange={e => setActivityForm({...activityForm, startTime: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salida</label>
                <input type="text" placeholder="HH:MM" maxLength={5} className="w-full p-3 sm:p-4 border border-slate-200 rounded-2xl bg-white text-sm font-black text-center focus:ring-2 focus:ring-indigo-500 outline-none" value={activityForm.endTime || ''} onChange={e => setActivityForm({...activityForm, endTime: e.target.value})} />
              </div>
            </>
          ) : (
            <div className="space-y-1 lg:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Acumuladas</label>
              <input type="number" min="0" step="0.5" className="w-full p-3 sm:p-4 border border-slate-200 rounded-2xl bg-white text-sm font-black text-center focus:ring-2 focus:ring-indigo-500 outline-none" value={activityForm.hours || 0} onChange={e => setActivityForm({...activityForm, hours: Number(e.target.value)})} />
            </div>
          )}
        </div>

        <div className="bg-indigo-900 text-white rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-indigo-700 p-3 rounded-2xl shadow-inner"><Clock size={32} /></div>
            <div>
              <h4 className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Total Calculado</h4>
              <div className="flex items-baseline gap-1"><span className="text-4xl font-black">{Number(activityForm.hours.toFixed(2))}</span><span className="text-indigo-300 font-bold uppercase text-sm">H</span></div>
            </div>
          </div>
          <div className="text-center sm:text-right relative z-10 text-xs font-bold border border-indigo-700 bg-indigo-800/50 px-4 py-2 rounded-xl">
            {activityForm.date}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="manualHours" checked={activityForm.isManualHours} onChange={e => setActivityForm({...activityForm, isManualHours: e.target.checked, hours: e.target.checked ? 0 : activityForm.hours})} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
          <label htmlFor="manualHours" className="text-xs font-bold text-slate-600 cursor-pointer">Registrar horas acumuladas / extra manualmente</label>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {(!isGroup) && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyecto (Opcional)</label>
              <div className="flex gap-3">
                <select className="flex-1 p-4 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm font-bold" value={activityForm.projectId || ''} onChange={e => setActivityForm({...activityForm, projectId: e.target.value})}>
                  <option value="">General / Sin especificar</option>
                  {(() => {
                     const sId = activityForm.selectedStudentIds[0] || selectedStudentId;
                     const student = students.find(s => s.id === sId);
                     if (!student) return null;
                     return (student.projectIds || []).map((pid: string) => {
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

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
            {!showNewCatInput ? (
              <div className="flex gap-3">
                <select className="flex-1 p-4 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm font-bold" value={activityForm.categoryId || ''} onChange={e => setActivityForm({...activityForm, categoryId: e.target.value})}>
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
          
          {activityForm.categoryId && !isGroup && !isUser && (
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
            <div className="grid grid-cols-1 gap-4 p-6 bg-slate-50 rounded-[2rem] border max-h-[300px] overflow-y-auto">
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

  const handleDeleteStudent = (studentId: string) => {
    const sId = String(studentId);
    showConfirmToast(
      "¿Estás seguro de que deseas eliminar a este usuario? Esta acción no se puede deshacer y se eliminarán todos sus registros, tareas e historial asociados.",
      async () => {
        // Optimistic update: remove from local state immediately
        setStudents(prev => prev.filter(s => String(s.id) !== sId));
        
        // If we are viewing this student, reset view
        if (String(selectedStudentId) === sId) {
          setSelectedStudentId(null);
          setView('dashboard');
        }

        try {
          // In this application, all user-related data (records, projectTasks, projectTaskHistory)
          // is stored directly within the user document in the 'users' collection.
          // Therefore, deleting the document itself removes all associated data.
          await deleteDoc(doc(db, 'users', sId));
          showSuccessToast("Usuario y todos sus datos asociados han sido eliminados correctamente");
        } catch (error) {
          console.error("Error deleting user from Firestore:", error);
          handleFirestoreError(error, OperationType.DELETE, `users/${sId}`);
        }
      }
    );
  };

  const handleUpdateProfile = async () => {
    if (!editingProfileForm) return;
    
    if (!editingProfileForm.firstName || editingProfileForm.firstName.trim() === '') {
      showErrorToast("El nombre es obligatorio");
      return;
    }
    
    try {
      const docRef = doc(db, 'users', user.uid);
      
      const updatedProfile = {
        ...userProfile,
        ...editingProfileForm,
        role: userProfile.role || 'user',
        status: userProfile.status || 'En Curso',
        career: userProfile.career || 'Arquitectura',
        uid: user.uid,
        email: user.email,
        createdAt: userProfile.createdAt || new Date().toISOString()
      };

      await setDoc(docRef, updatedProfile, { merge: true });
      
      setUserProfile(updatedProfile);
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(updatedProfile));
      
      // Update students list too
      setStudents(prev => prev.map(s => s.id === user.uid ? { ...s, ...updatedProfile, name: `${updatedProfile.firstName} ${updatedProfile.lastNamePaterno} ${updatedProfile.lastNameMaterno}` } : s));
      
      setShowProfileModal(false);
      showSuccessToast("Perfil actualizado");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">Cargando aplicación...</p>
      </div>
    </div>
  );
  if (!user) return <Login />;
  if (!userProfile) return <ProfileForm user={user} onComplete={(profile) => {
    setUserProfile(profile);
    setView(profile.role === 'user' ? 'user-dashboard' : 'dashboard');
  }} />;

  return (
    <ErrorBoundary>
      <Toaster 
        position="top-center" 
        containerStyle={{
          top: '50%',
          transform: 'translateY(-50%)',
          bottom: 'auto'
        }}
        toastOptions={{
          duration: 5000,
        }}
      />
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 overflow-x-hidden">
      <Sidebar 
        view={view} 
        setView={setView} 
        setEditingRecordId={setEditingRecordId} 
        userRole={userRole} 
        setUserRole={setUserRole} 
        setCurrentUserId={setCurrentUserId} 
        currentUserId={currentUserId}
        firstStudentId={students[0]?.id} 
        user={user} 
        students={students}
        projects={projects}
        setSelectedProjectId={setSelectedProjectId}
        selectedProjectId={selectedProjectId}
        onOpenProfile={() => {
          setEditingProfileForm({
            firstName: userProfile.firstName || '',
            lastNamePaterno: userProfile.lastNamePaterno || '',
            lastNameMaterno: userProfile.lastNameMaterno || '',
            email: userProfile.email || '',
            phone: userProfile.phone || '',
            emergencyPhone: userProfile.emergencyPhone || '',
            skills: userProfile.skills || [],
            brigadePeriod: userProfile.brigadePeriod || '',
            studentId: userProfile.studentId || '',
            career: userProfile.career || '',
            status: userProfile.status || 'En Curso',
          });
          setShowProfileModal(true);
        }}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar Móvil */}
        <div className="lg:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg border-b border-white/5 sticky top-0 z-[60]">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <List size={24} />}
            </button>
            <div className="flex items-center gap-2">
              <GraduationCap size={20} className="text-indigo-400" />
              <h1 className="font-black text-[10px] uppercase tracking-tighter leading-none">Asistencia<br/><span className="text-indigo-400">Prestadores</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setView(userRole !== 'user' ? 'dashboard' : 'user-dashboard'); setIsMobileMenuOpen(false); }}
              className={`p-2 rounded-lg ${view === 'dashboard' || view === 'user-dashboard' ? 'bg-indigo-600' : ''}`}
            >
              <LayoutDashboard size={20} />
            </button>
            <div 
              className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-black text-xs cursor-pointer"
              onClick={() => {
                setEditingProfileForm({
                  firstName: userProfile.firstName || '',
                  lastNamePaterno: userProfile.lastNamePaterno || '',
                  lastNameMaterno: userProfile.lastNameMaterno || '',
                  email: userProfile.email || '',
                  phone: userProfile.phone || '',
                  emergencyPhone: userProfile.emergencyPhone || '',
                  skills: userProfile.skills || [],
                  brigadePeriod: userProfile.brigadePeriod || '',
                  studentId: userProfile.studentId || '',
                  career: userProfile.career || '',
                  status: userProfile.status || 'En Curso',
                });
                setShowProfileModal(true);
                setIsMobileMenuOpen(false);
              }}
            >
              {user?.displayName?.charAt(0) || 'U'}
            </div>
          </div>
        </div>

        {/* Menú Móvil Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/95 z-[70] lg:hidden animate-in fade-in duration-300">
            <div className="flex flex-col h-full p-8">
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500 p-2 rounded-lg text-white">
                    <GraduationCap size={24} />
                  </div>
                  <h1 className="font-bold text-sm uppercase tracking-widest text-indigo-100">Menú Principal</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                  <X size={32} />
                </button>
              </div>

              <div className="flex-1 space-y-4">
                {userRole !== 'user' ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 mb-2">Vista Admin</p>
                      <button
                        onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      >
                        <LayoutDashboard size={24} /> <span className="font-bold text-lg">Dashboard Admin</span>
                      </button>
                      <button
                        onClick={() => { setView('calendar'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${view === 'calendar' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      >
                        <CalendarDays size={24} /> <span className="font-bold text-lg">Calendario</span>
                      </button>
                      <button
                        onClick={() => { setSelectedProjectId(null); setView('project-directory'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${view === 'project-directory' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      >
                        <Briefcase size={24} /> <span className="font-bold text-lg">Directorio</span>
                      </button>
                      <button
                        onClick={() => { setView('categories'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${view === 'categories' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      >
                        <Tag size={24} /> <span className="font-bold text-lg">Configuración</span>
                      </button>
                    </div>
                    
                    {user?.email !== 'mortovki@gmail.com' && (
                      <div className="space-y-2 pt-4 border-t border-slate-800">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-6 mb-2">Vista Usuario</p>
                        <button
                          onClick={() => { setView('user-dashboard'); setIsMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${view === 'user-dashboard' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                          <History size={24} /> <span className="font-bold text-lg">Mi Progreso</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setView('user-dashboard'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${view === 'user-dashboard' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                      <LayoutDashboard size={24} /> <span className="font-bold text-lg">Mi Progreso</span>
                    </button>
                    <button
                      onClick={() => { setView('calendar'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${view === 'calendar' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                      <CalendarDays size={24} /> <span className="font-bold text-lg">Calendario</span>
                    </button>
                    <button
                      onClick={() => { setSelectedProjectId(null); setView('project-directory'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${view === 'project-directory' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                      <Briefcase size={24} /> <span className="font-bold text-lg">Directorio</span>
                    </button>
                  </>
                )}
              </div>

              <div className="pt-8 border-t border-slate-800 space-y-4">
                <button 
                  onClick={() => auth.signOut()}
                  className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-red-500/10 text-red-500 font-bold text-lg"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}
        
        <main className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto w-full flex-1 animate-in fade-in duration-700 overflow-x-hidden">
          {view === 'user-dashboard' && currentUserId && (
            isLoadingStudents ? (
              <div className="space-y-8 animate-pulse">
                <div className="h-12 bg-slate-100 rounded-2xl w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 h-96 bg-slate-50 rounded-[3rem]"></div>
                  <div className="h-96 bg-slate-50 rounded-[3rem]"></div>
                </div>
              </div>
            ) : (
              <UserDashboard 
                student={students.find(s => s.id === currentUserId)} 
                setStudents={setStudents} 
                userRole={userRole} 
                categories={categories}
                setCategories={setCategories}
                projects={projects}
                students={students}
                checkTimeOverlap={checkTimeOverlap}
                selectedRecords={selectedRecords}
                setSelectedRecords={setSelectedRecords}
                handleDeleteSelected={handleDeleteSelected}
                setView={setView}
                setSelectedProjectId={setSelectedProjectId}
              />
            )
          )}
          {view === 'project-directory' && (
            isLoadingConfig ? (
              <div className="space-y-8 animate-pulse">
                <div className="h-12 bg-slate-100 rounded-2xl w-1/3"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-64 bg-slate-50 rounded-[2.5rem]"></div>
                  ))}
                </div>
              </div>
            ) : (
              <ProjectDirectory 
                projects={projects}
                setProjects={setProjects}
                userRole={userRole}
                selectedProjectId={selectedProjectId}
                enrolledProjectIds={userRole === 'user' ? (students.find(s => s.id === currentUserId)?.projectIds?.length > 0 ? students.find(s => s.id === currentUserId)?.projectIds : ['p-general']) : null}
                onOpenWorkspace={(id: string) => {
                  setSelectedProjectId(id);
                  setView('project-workspace');
                }}
              />
            )
          )}
          {view === 'validation' && userRole !== 'user' && (
            isLoadingStudents ? (
              <div className="space-y-8 animate-pulse">
                <div className="h-12 bg-slate-100 rounded-2xl w-1/4"></div>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-32 bg-slate-50 rounded-[2rem]"></div>
                  ))}
                </div>
              </div>
            ) : (
              <AdminValidation 
                students={students}
                setStudents={setStudents}
                categories={categories}
                projects={projects}
              />
            )
          )}
          {view === 'project-workspace' && selectedProjectId && (
            <ProjectWorkspace
              projectId={selectedProjectId}
              project={projects.find(p => p.id === selectedProjectId)}
              userRole={userRole}
              currentUser={user}
              students={students}
              onBack={() => setView('project-directory')}
            />
          )}
          {view === 'dashboard' && (
            <div className="space-y-6 sm:space-y-10">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 sm:gap-8">
                <div>
                  <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter">Prestadores</h2>
                  <p className="text-slate-500 font-medium mt-1 uppercase text-[9px] sm:text-[11px] tracking-[0.2em] italic">Sistema central de seguimiento y control de horas</p>
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4 w-full sm:w-auto">
                  <button onClick={() => { setSelectedProjectId(null); setView('project-directory'); }} className="flex-1 sm:flex-none bg-indigo-50 text-indigo-600 px-4 py-3 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 font-black text-[10px] sm:text-xs uppercase tracking-widest sm:tracking-[0.2em] shadow-sm hover:bg-indigo-100 transition-all active:scale-95"><Briefcase size={18} /> Directorio</button>
                  <button onClick={() => { setActivityForm(prev => ({...prev, selectedStudentIds: []})); setView('individual-activity'); }} className="flex-1 sm:flex-none bg-white border-2 sm:border-4 border-slate-100 px-4 py-3 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 font-black text-[10px] sm:text-xs uppercase tracking-widest sm:tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-all active:scale-95"><PlusCircle size={18} className="text-indigo-500" /> Individual</button>
                  <button onClick={() => setView('group-activity')} className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-3 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 font-black text-[10px] sm:text-xs uppercase tracking-widest sm:tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"><Users size={18} /> Grupal</button>
                  <button onClick={() => { setShowEditStudent(false); setStudentForm({ firstName: '', lastNamePaterno: '', lastNameMaterno: '', studentId: '', serviceType: 'Prestador', nickname: '', phone: '', emergencyPhone: '', email: '', brigadePeriod: '', brigade: '', skills: [], career: 'Arquitectura', status: 'En Curso', workStatus: 'Sin asignar', projectIds: [], projectTasks: {}, projectTaskHistory: {}, role: 'user' }); setStudentFormErrors({}); setShowAddStudent(true); }} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] sm:text-xs uppercase tracking-widest sm:tracking-[0.2em] shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"><UserPlus size={18} /> Nuevo Alumno</button>
                </div>
              </div>

              {/* Filtros */}
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-4 sm:gap-6">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Búsqueda y Filtros</span>
                  <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                    {filteredStudents.length} {filteredStudents.length === 1 ? 'Alumno' : 'Alumnos'}
                  </span>
                </div>
                <div className="w-full relative">
                  <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type="text" placeholder="Nombre del alumno, carrera o etiqueta..." className="w-full pl-12 sm:pl-14 pr-6 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] bg-slate-50 border border-slate-100 text-xs sm:text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 w-full">
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Proyecto</span>
                    <select className="w-full bg-slate-50 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-[1.2rem] border border-slate-100 text-[9px] sm:text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                      <option value="Todos">TODOS</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Carrera</span>
                    <select className="w-full bg-slate-50 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-[1.2rem] border border-slate-100 text-[9px] sm:text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterCareer} onChange={e => setFilterCareer(e.target.value)}>
                      <option value="Todos">TODAS</option>
                      {uniqueCareers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Brigada</span>
                    <select className="w-full bg-slate-50 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-[1.2rem] border border-slate-100 text-[9px] sm:text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterBrigade} onChange={e => setFilterBrigade(e.target.value)}>
                      <option value="Todos">TODAS</option>
                      {uniqueBrigades.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Estatus Acad.</span>
                    <select className="w-full bg-slate-50 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-[1.2rem] border border-slate-100 text-[9px] sm:text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                      <option value="Todos">TODOS</option>
                      {Object.keys(STUDENT_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Carga Trabajo</span>
                    <select className="w-full bg-slate-50 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-[1.2rem] border border-slate-100 text-[9px] sm:text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={filterWork} onChange={e => setFilterWork(e.target.value)}>
                      <option value="Todos">TODOS</option>
                      {Object.keys(WORK_STATUS).map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ordenar</span>
                    <select className="w-full bg-slate-50 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-[1.2rem] border border-slate-100 text-[9px] sm:text-[10px] font-black uppercase outline-none focus:bg-white transition-all shadow-sm" value={sortHours} onChange={e => setSortHours(e.target.value as any)}>
                      <option value="none">SIN ORDENAR</option>
                      <option value="desc">MAYOR HORAS</option>
                      <option value="asc">MENOR HORAS</option>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 w-full">
                {isLoadingStudents ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm animate-pulse flex flex-col justify-center items-center text-center gap-2">
                      <div className="h-3 bg-slate-100 rounded-full w-1/2"></div>
                      <div className="h-10 bg-slate-50 rounded-xl w-3/4"></div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Total Enrolados</span>
                      <span className="text-3xl sm:text-4xl font-black text-indigo-600">{chartData.totalEnrolled}</span>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Promedio Hrs/Alumno</span>
                      <span className="text-3xl sm:text-4xl font-black text-emerald-600">{Number(chartData.avgHoursPerStudent.toFixed(2))}</span>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Progreso General</span>
                      <span className="text-3xl sm:text-4xl font-black text-indigo-600">{Number(chartData.progressPerc.toFixed(2))}%</span>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Total Proyectos</span>
                      <span className="text-3xl sm:text-4xl font-black text-amber-500">{projects.length}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Charts Section */}
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm mb-6 sm:mb-8">
                {isLoadingStudents ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="flex justify-between items-end">
                      <div className="h-8 bg-slate-100 rounded-xl w-1/3"></div>
                      <div className="h-6 bg-slate-50 rounded-lg w-1/4"></div>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-slate-50 rounded-full w-1/4"></div>
                      <div className="h-3 bg-slate-50 rounded-full w-1/4"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Progreso General de la Generación</h3>
                      <span className="text-xl sm:text-2xl font-black text-indigo-600">{Number(chartData.progressPerc.toFixed(2))}%</span>
                    </div>
                    <div className="w-full h-3 sm:h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${chartData.progressPerc}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-3 text-[8px] sm:text-[10px] font-black uppercase text-slate-400">
                      <span>{Number(chartData.totalCompletedHours.toFixed(2))} Horas Completadas</span>
                      <span>{chartData.totalRequired} Horas Requeridas</span>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-6">Horas por Proyecto</h3>
                  {isLoadingStudents ? (
                    <div className="h-48 sm:h-64 w-full bg-slate-50 rounded-2xl animate-pulse"></div>
                  ) : (
                    <div className="h-48 sm:h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.projectChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px'}} />
                          <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                            {chartData.projectChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-6">Promedio Horas/Alumno por Proyecto</h3>
                  {isLoadingStudents ? (
                    <div className="h-48 sm:h-64 w-full bg-slate-50 rounded-2xl animate-pulse"></div>
                  ) : (
                    <div className="h-48 sm:h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.projectChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px'}} />
                          <Bar dataKey="avgHours" radius={[4, 4, 0, 0]}>
                            {chartData.projectChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-6">Distribución de Alumnos por Proyecto</h3>
                  {isLoadingStudents ? (
                    <div className="h-48 sm:h-64 w-full bg-slate-50 rounded-2xl animate-pulse"></div>
                  ) : (
                    <div className="h-48 sm:h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.projectChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px'}} />
                          <Bar dataKey="studentCount" radius={[4, 4, 0, 0]}>
                            {chartData.projectChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-6">Distribución de Categorías</h3>
                  {isLoadingStudents ? (
                    <div className="h-48 sm:h-64 w-full bg-slate-50 rounded-2xl animate-pulse"></div>
                  ) : (
                    <div className="h-48 sm:h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.categoryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="hours"
                          >
                                    {chartData.categoryChartData.map((entry, index) => {
                                      const cat = categories.find(c => c.name === entry.name);
                                      return <Cell key={`cell-${index}`} fill={cat?.color || '#4f46e5'} />;
                                    })}
                          </Pie>
                          <Tooltip contentStyle={{borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px'}} />
                          <Legend wrapperStyle={{fontSize: '8px', fontWeight: 'bold'}} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista */}
              <div className="grid grid-cols-1 gap-6">
                {isLoadingStudents ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm animate-pulse flex flex-col md:flex-row items-center gap-6">
                      <div className="w-2 h-24 bg-slate-100 rounded-full"></div>
                      <div className="flex-1 space-y-4 w-full">
                        <div className="h-8 bg-slate-100 rounded-xl w-1/3"></div>
                        <div className="h-4 bg-slate-50 rounded-lg w-1/2"></div>
                        <div className="h-4 bg-slate-50 rounded-lg w-1/4"></div>
                      </div>
                      <div className="w-full md:w-48 h-12 bg-slate-100 rounded-2xl"></div>
                    </div>
                  ))
                ) : paginatedStudents.length === 0 ? (
                  <div className="bg-white p-20 rounded-[4rem] border-4 border-dashed border-slate-100 text-center space-y-6">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                      <Users size={48} />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se encontraron alumnos con los filtros aplicados</p>
                  </div>
                ) : (
                  paginatedStudents.map(student => {
                  const totalHrs = (student.records || []).reduce((acc: number, curr: any) => {
                    if (curr.validationStatus === 'aprobado' || !curr.validationStatus) return acc + curr.hours;
                    return acc;
                  }, 0);
                  const perc = Math.min(100, (totalHrs / TOTAL_REQUIRED_HOURS) * 100);
                  const totalSessions = (student.records || []).length;
                  const countAbsences = (student.records || []).filter((r: any) => r.status !== 'A').length;
                  const absencePerc = totalSessions > 0 ? (countAbsences / totalSessions) * 100 : 0;
                  
                    return (
                      <div key={student.id} onClick={() => { setSelectedStudentId(student.id); setView('student-detail'); }} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer relative overflow-hidden grid grid-cols-1 md:grid-cols-10 lg:grid-cols-[1fr_1.2fr_0.8fr] gap-6">
                        <div className={`absolute left-0 top-0 w-1.5 md:w-2 h-full transition-all duration-500 ${student.workStatus === 'Asignado' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                        
                        {/* Col 1: Identidad - md:col-span-6 order-1 */}
                        <div className="md:col-span-6 lg:col-span-1 pl-3 flex flex-col justify-center order-1">
                          <div className="flex flex-col mb-3">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-1">
                              <h3 className="font-black text-2xl md:text-3xl text-slate-900 tracking-tight leading-tight">{getDisplayName(student)}</h3>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border shadow-sm ${(STUDENT_STATUS as any)[student.status]?.color || 'bg-slate-100'}`}>{student.status}</span>
                                <span className="hidden md:flex lg:hidden items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 text-[9px] font-black uppercase tracking-widest"><GraduationCap size={12}/> {student.career}</span>
                              </div>
                            </div>
                            <p className="text-xs md:text-sm text-slate-400 italic font-medium md:-mt-1">{getFullName(student)}</p>
                          </div>
                          
                          <div className="flex lg:flex-wrap items-center gap-3 mt-1 md:mt-2">
                            <div className="flex items-center gap-2 md:gap-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStudentId(student.id);
                                  setStudentForm({
                                    ...student,
                                    projectIds: student.projectIds || [],
                                    projectTasks: student.projectTasks || {},
                                    projectTaskHistory: student.projectTaskHistory || {},
                                    skills: student.skills || []
                                  });
                                  setShowEditStudent(true);
                                  setShowAddStudent(true);
                                }}
                                className="p-2 md:px-3 md:py-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2"
                                title="Editar Estudiante"
                              >
                                <Edit2 size={16} />
                                <span className="hidden md:inline lg:hidden text-[10px] font-black uppercase tracking-widest">Editar</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStudent(student.id);
                                }}
                                className="p-2 md:px-3 md:py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2"
                                title="Eliminar Estudiante"
                              >
                                <Trash2 size={16} />
                                <span className="hidden md:inline lg:hidden text-[10px] font-black uppercase tracking-widest">Eliminar</span>
                              </button>
                            </div>
                            
                            <div className="hidden lg:flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest">
                              <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100"><GraduationCap size={14}/> {student.career}</span>
                            </div>
                          </div>

                          <div className="flex gap-5 mt-4 md:mt-5">
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

                        {/* Col 3: Métricas - md:col-span-4 order-2 lg:order-3 */}
                        <div className="md:col-span-4 lg:col-span-1 flex flex-col justify-center order-2 lg:order-3">
                          <div className="w-full bg-slate-50 md:bg-gray-50 rounded-[2rem] md:rounded-xl p-6 md:p-4 flex flex-col justify-center items-center relative overflow-hidden shadow-inner md:shadow-none h-full gap-1">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 md:mb-0">Total Reportado</p>
                             <div className="flex items-baseline gap-1 text-indigo-600 mb-3 md:mb-1">
                                <span className="text-4xl md:text-3xl lg:text-5xl font-black tracking-tighter">{Number(totalHrs.toFixed(2))}</span>
                                <span className="text-xs md:text-[10px] lg:text-sm font-black uppercase">H</span>
                             </div>
                             <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${perc}%` }}></div>
                             </div>
                             <p className="mt-2 md:mt-1 text-[10px] md:text-[9px] font-black text-indigo-400 uppercase">{Number(perc.toFixed(2))}%</p>
                          </div>
                        </div>

                        {/* Divider for Tablet */}
                        <div className="hidden md:block lg:hidden md:col-span-10 h-px bg-gray-100 mx-5 order-3"></div>

                        {/* Col 2: Proyectos & Tareas - md:col-span-10 order-4 lg:order-2 */}
                        <div className="md:col-span-10 lg:col-span-1 flex flex-col order-4 lg:order-2 md:p-0 lg:pl-8 lg:border-l border-slate-100">
                          <div className="flex items-center justify-between mb-4">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Proyectos & Tareas</p>
                             <div className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase shadow-sm border ${(WORK_STATUS as any)[student.workStatus]?.color || 'bg-slate-500'}`}>{student.workStatus}</div>
                          </div>
                          <div className="flex flex-col md:flex-row lg:flex-col gap-3 overflow-y-auto md:overflow-x-auto lg:overflow-y-auto max-h-[140px] md:max-h-none lg:max-h-[140px] pr-2 md:pr-0 lg:pr-2 md:pb-1 lg:pb-0 custom-scrollbar md:snap-x md:snap-mandatory flex-1">
                             {(student.projectIds || []).map((pid: string) => {
                               const p = projects.find(pr => pr.id === pid);
                               const tasks = (student.projectTasks && student.projectTasks[pid]) || [];
                               return (
                                 <div key={pid} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-sm md:flex-shrink-0 md:snap-start md:min-w-[180px] lg:min-w-0">
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
                             {student.skills && student.skills.length > 0 && (
                               <div className="bg-emerald-50/30 p-3 rounded-2xl border border-emerald-100/50 shadow-sm mt-2 md:mt-0 lg:mt-2 md:flex-shrink-0 md:snap-start md:min-w-[180px] lg:min-w-0">
                                 <div className="flex items-center gap-2 mb-2">
                                   <Briefcase className="text-emerald-600" size={12} />
                                   <span className="font-black text-[10px] text-emerald-700 uppercase tracking-tight">Habilidades</span>
                                 </div>
                                 <div className="flex flex-wrap gap-1.5 pl-1">
                                   {student.skills.map((skill: string, i: number) => (
                                     <span key={i} className="text-[9px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-100 shadow-sm">
                                       {skill}
                                     </span>
                                   ))}
                                 </div>
                               </div>
                             )}
                          </div>
                          
                          {/* Indicador de scroll en tablet */}
                          <div className="hidden md:flex lg:hidden justify-center gap-1 mt-2">
                            <div className="w-1 h-1 rounded-full bg-indigo-600"></div>
                            <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                            <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                          </div>

                          <div className="mt-5 pt-5 border-t border-slate-100">
                            <div className="flex justify-between items-end mb-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase">Inasistencias</p>
                              <span className="text-[10px] font-black text-slate-500">{Number(absencePerc.toFixed(2))}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden shadow-inner">
                              <div className="bg-red-500 h-full" style={{ width: `${absencePerc}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                })
              )}
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
            <div className="space-y-6 sm:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto">
              <button onClick={() => setView('dashboard')} className="flex items-center gap-3 text-slate-400 font-black uppercase text-[9px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.3em] hover:text-indigo-600 transition-all border border-slate-200 bg-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-sm"><ArrowLeft size={16} /> Volver</button>
              
              <div className="bg-white p-4 sm:p-10 lg:p-14 rounded-[1.5rem] sm:rounded-[4.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 sm:h-3 bg-indigo-600"></div>

                <div className="grid grid-cols-1 gap-8 sm:gap-16">
                  <div className="space-y-6 sm:space-y-10">
                    <div>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-[10px] sm:text-[12px] font-black uppercase border shadow-lg mb-6 sm:mb-8 ${(STUDENT_STATUS as any)[selectedStudent.status]?.color || 'bg-slate-100'}`}>
                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-pulse" style={{ backgroundColor: (STUDENT_STATUS as any)[selectedStudent.status]?.hex || '#ccc' }}></div>
                            {selectedStudent.status}
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                          <h2 className="text-2xl sm:text-4xl md:text-6xl font-black text-slate-900 leading-tight tracking-tighter">{selectedStudent.name}</h2>
                          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                            <button onClick={startEditStudent} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                              <Edit2 size={16} /> Editar
                            </button>
                            {selectedStudent.role !== 'coordinator' && selectedStudent.role !== 'superadmin' && selectedStudent.role !== 'admin' && (
                              <button 
                                onClick={() => showConfirmToast("¿Otorgar privilegios de coordinador a este alumno?", () => handleMakeCoordinator(selectedStudent.id))} 
                                className="p-3 sm:p-4 text-emerald-600 bg-emerald-50 rounded-xl sm:rounded-2xl border border-emerald-100 shadow-sm hover:bg-emerald-100 transition-all active:scale-95" 
                                title="Hacer Coordinador"
                              >
                                <Shield size={20} />
                              </button>
                            )}
                            {user?.email === 'mortovki@gmail.com' && (selectedStudent.role === 'coordinator' || selectedStudent.role === 'admin') && (
                              <button 
                                onClick={() => showConfirmToast("¿Remover privilegios de este usuario?", () => handleDemoteUser(selectedStudent.id))} 
                                className="p-3 sm:p-4 text-orange-600 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-100 shadow-sm hover:bg-orange-100 transition-all active:scale-95" 
                                title="Remover Privilegios"
                              >
                                <ShieldOff size={20} />
                              </button>
                            )}
                            <button onClick={() => setShowManualHours(true)} className="p-3 sm:p-4 text-indigo-600 bg-indigo-50 rounded-xl sm:rounded-2xl border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-all active:scale-95" title="Agregar Horas Manuales">
                              <Clock size={20} />
                            </button>
                            <button 
                              onClick={() => handleDeleteStudent(selectedStudent.id)} 
                              className="p-3 sm:p-4 text-red-600 bg-red-50 rounded-xl sm:rounded-2xl border border-red-100 shadow-sm hover:bg-red-100 transition-all active:scale-95" 
                              title="Eliminar Estudiante"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 sm:gap-5 uppercase font-black tracking-widest sm:tracking-[0.25em] text-[10px] sm:text-[12px]">
                            <span className="flex items-center gap-2 sm:gap-3 text-indigo-600 bg-indigo-50 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-3xl border border-indigo-100 shadow-md"><GraduationCap size={16}/> {selectedStudent.career}</span>
                            <span className="flex items-center gap-2 sm:gap-3 text-slate-500 bg-slate-50 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-md">Brigada: {selectedStudent.brigadePeriod}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                        <div className="flex flex-col gap-1 sm:gap-2 p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-[2.5rem] border border-slate-100">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={12} className="text-indigo-300"/> Email</span>
                            {selectedStudent.email ? (
                              <a href={`mailto:${selectedStudent.email}`} className="truncate text-xs sm:text-[13px] font-black text-indigo-600 hover:text-indigo-800 transition-colors">
                                {selectedStudent.email}
                              </a>
                            ) : (
                              <span className="text-xs sm:text-[13px] font-black text-slate-300 italic">No registrado</span>
                            )}
                        </div>
                        <div className="flex flex-col gap-1 sm:gap-2 p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-[2.5rem] border border-slate-100">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Phone size={12} className="text-emerald-300"/> Teléfono</span>
                            {selectedStudent.phone ? (
                              <a href={`tel:${selectedStudent.phone}`} className="text-xs sm:text-[13px] font-black text-slate-600 hover:text-emerald-600 transition-colors">
                                {selectedStudent.phone}
                              </a>
                            ) : (
                              <span className="text-xs sm:text-[13px] font-black text-slate-300 italic">No registrado</span>
                            )}
                        </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-8 sm:gap-12">
                    <div className="grid grid-cols-1 gap-6 sm:gap-10">
                        <div className="space-y-4 sm:space-y-6">
                            <div className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <div className="w-8 h-1 bg-indigo-100"></div> Proyectos Asignados
                            </div>
                            <div className="space-y-3 sm:space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                {(selectedStudent.projectIds || []).map((pid: string) => {
                                    const p = projects.find(pr => pr.id === pid);
                                    const tasks = (selectedStudent.projectTasks && selectedStudent.projectTasks[pid]) || [];
                                    return (
                                        <div key={pid} className="bg-slate-50 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: p?.color || '#cbd5e1' }}></div>
                                                <span className="font-black text-[11px] sm:text-[12px] text-slate-800 uppercase tracking-tight">{p?.name || 'Proyecto'}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {tasks.map((t: string, i: number) => (
                                                    <span key={i} className="text-[9px] sm:text-[10px] font-bold text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-100 italic shadow-sm">#{String(t)}</span>
                                                ))}
                                                {tasks.length === 0 && <span className="text-[10px] font-bold text-slate-300 italic">Sin tareas específicas</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {(selectedStudent.projectIds || []).length === 0 && (
                                    <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-300 font-black uppercase text-[10px] tracking-widest">Sin proyectos asignados</div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4 sm:space-y-6">
                            <div className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <div className="w-8 h-1 bg-emerald-100"></div> Habilidades
                            </div>
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                {(selectedStudent.skills || []).map((skill: string, i: number) => (
                                    <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase shadow-sm">{skill}</span>
                                ))}
                                {(selectedStudent.skills || []).length === 0 && (
                                    <div className="w-full p-8 text-center border-2 border-dashed border-emerald-50 rounded-[2rem] text-emerald-200 font-black uppercase text-[10px] tracking-widest">Sin habilidades registradas</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto bg-slate-900 rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-12 text-white relative overflow-hidden shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="relative z-10 flex flex-col items-center sm:items-start">
                            <p className="text-[9px] sm:text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Horas Totales Reportadas</p>
                            <div className="flex items-baseline gap-2 leading-none">
                                <span className="text-4xl sm:text-7xl font-black tracking-tighter">
                                  {((selectedStudent.records || []).reduce((a: number, c: any) => {
                                    if (c.validationStatus === 'aprobado' || !c.validationStatus) return a + c.hours;
                                    return a;
                                  }, 0)).toFixed(2)}
                                </span>
                                <span className="text-base sm:text-2xl font-black text-indigo-500 italic">/ {TOTAL_REQUIRED_HOURS}H</span>
                            </div>
                        </div>
                        <div className="text-center sm:text-right relative z-10 space-y-3 w-full sm:w-auto">
                            <div className="flex items-baseline gap-2 justify-center sm:justify-end">
                               <p className="text-[9px] sm:text-[10px] text-indigo-400 font-black uppercase opacity-80">Restan:</p>
                               <span className="text-xl sm:text-3xl font-black text-indigo-100 tracking-tighter leading-none">
                                 {Number(Math.max(0, TOTAL_REQUIRED_HOURS - (selectedStudent.records || []).reduce((a: number, c: any) => {
                                   if (c.validationStatus === 'aprobado' || !c.validationStatus) return a + c.hours;
                                   return a;
                                 }, 0)).toFixed(2))}h
                               </span>
                            </div>
                            <div className="w-full sm:w-48 h-2 sm:h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                               <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, (((selectedStudent.records || []).reduce((a: number, c: any) => {
                                 if (c.validationStatus === 'aprobado' || !c.validationStatus) return a + c.hours;
                                 return a;
                               }, 0))/TOTAL_REQUIRED_HOURS)*100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registro Actividad */}
              <div className="bg-white p-6 sm:p-12 md:p-16 rounded-[2rem] sm:rounded-[5rem] border border-slate-200 shadow-sm relative overflow-hidden" id="entry-form">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-16 gap-4">
                  <h3 className="text-2xl sm:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-4 sm:gap-6">
                      <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-[1.8rem] shadow-xl ${editingRecordId ? 'bg-amber-100 text-amber-600 shadow-amber-200/50' : 'bg-indigo-100 text-indigo-600 shadow-indigo-200/50'}`}>
                          {editingRecordId ? <Edit2 size={20} className="sm:w-9 sm:h-9" /> : <PlusCircle size={20} className="sm:w-9 sm:h-9" />}
                      </div>
                      {editingRecordId ? 'Actualizar Reporte' : 'Registrar Sesión'}
                  </h3>
                  {editingRecordId && <button onClick={()=>setEditingRecordId(null)} className="text-[10px] sm:text-[11px] font-black text-red-500 bg-red-50 px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-[1.5rem] uppercase border-2 border-red-100 hover:bg-red-100 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"><X size={16}/> Descartar</button>}
                </div>
                <form onSubmit={saveActivity} className="space-y-8 sm:space-y-16 animate-in slide-in-from-bottom-12 duration-700">
                    {errorMessage && <div className="p-4 sm:p-6 bg-red-50 text-red-700 rounded-2xl sm:rounded-[2rem] border-2 sm:border-4 border-red-200 flex items-center gap-3 sm:gap-5 font-black text-[11px] sm:text-[13px] uppercase animate-bounce shadow-xl"><AlertCircle size={24} className="sm:w-7 sm:h-7"/> {errorMessage}</div>}
                    {renderActivityForm(false)}
                    {activityForm.categoryId && (
                      <button 
                        disabled={isSubmitting}
                        className={`w-full text-white font-black py-6 sm:py-9 rounded-[2rem] sm:rounded-[3rem] shadow-2xl uppercase tracking-[0.2em] sm:tracking-[0.4em] text-xs sm:text-sm transform transition-all hover:-translate-y-1 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 ${editingRecordId ? 'bg-amber-600' : 'bg-indigo-600'}`}
                      >
                          {isSubmitting && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
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
                     {selectedRecords.length > 0 && (
                       <button 
                         onClick={() => handleDeleteSelected(selectedStudent.id)} 
                         className="flex items-center gap-3 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-100 px-6 py-3 rounded-[1.5rem] font-black transition-all shadow-sm"
                       >
                         <Trash2 size={16} /> Borrar Seleccionados
                       </button>
                     )}
                     <button onClick={handleDownloadReport} className="flex items-center gap-3 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-100 px-6 py-3 rounded-[1.5rem] font-black transition-all shadow-sm"><Download size={16} /> Descargar Reporte</button>
                     <button 
                       onClick={() => setSessionSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                       className="p-3 rounded-[1.5rem] border font-black transition-all shadow-sm flex items-center justify-center bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                       title={`Ordenar: ${sessionSortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}`}
                     >
                       <ArrowDownUp size={20} className={sessionSortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                     </button>
                     <button 
                       onClick={() => {
                         const records = selectedStudent.records || [];
                         if (selectedRecords.length === records.length) setSelectedRecords([]);
                         else setSelectedRecords(records.map((r: any) => r.id));
                       }}
                       className={`p-3 rounded-[1.5rem] border font-black transition-all shadow-sm flex items-center justify-center ${selectedRecords.length > 0 && selectedRecords.length === (selectedStudent.records || []).length ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                       title={selectedRecords.length > 0 && selectedRecords.length === (selectedStudent.records || []).length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                     >
                       {selectedRecords.length > 0 && selectedRecords.length === (selectedStudent.records || []).length ? <X size={20} /> : <CheckSquare size={20} />}
                     </button>
                     <div className="bg-white px-8 py-3 rounded-[1.5rem] border border-slate-200 font-black text-slate-400"> {(selectedStudent.records || []).length} SESIONES TOTALES </div>
                   </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {(selectedStudent.records || []).length === 0 ? (
                    <div className="p-40 text-center flex flex-col items-center gap-10 opacity-30">
                       <div className="p-14 bg-white rounded-full border-8 border-slate-100 shadow-2xl"><CalendarIcon size={100} className="text-slate-300" /></div>
                       <p className="text-xl font-black uppercase tracking-[0.4em] text-slate-500">Expediente Vacío</p>
                    </div>
                  ) : (
                    paginatedSessions.map((r: any) => {
                      const cat = categories.find(c => c.id === r.categoryId);
                      const isSelected = selectedRecords.includes(r.id);
                      return (
                        <div 
                          key={r.id} 
                          onClick={() => {
                            setSelectedRecords(prev => isSelected ? prev.filter(id => id !== r.id) : [...prev, r.id]);
                          }}
                          className={`p-12 sm:p-16 transition-all relative group/item cursor-pointer ${editingRecordId === r.id ? 'bg-amber-50/40' : isSelected ? 'bg-indigo-50/50' : 'hover:bg-indigo-50/20'}`}
                        >
                          {editingRecordId === r.id && <div className="absolute top-0 left-0 w-3 h-full bg-amber-500"></div>}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="space-y-6 flex-1 w-full">
                              <div className="flex items-center gap-4 flex-wrap">
                                 <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                                   {isSelected && <Check size={14} className="text-white" />}
                                 </div>
                                 <span className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none">{r.date}</span>
                                 {r.startTime && r.endTime ? (
                                   <div className="flex items-center gap-2 text-[11px] font-black bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-slate-500 shadow-sm"><Clock size={14} className="text-indigo-400" /> {r.startTime} - {r.endTime}</div>
                                 ) : (
                                   <div className="flex items-center gap-2 text-[11px] font-black bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-slate-500 shadow-sm"><Clock size={14} className="text-indigo-400" /> Manual</div>
                                 )}
                                 <span className="px-4 py-1.5 rounded-xl text-[10px] font-black text-white uppercase shadow-md" style={{ backgroundColor: cat?.color }}>{cat?.name || 'Categoría'}</span>
                                 {r.projectId && (() => {
                                   const p = projects.find(pr => pr.id === r.projectId);
                                   return p ? <span className="px-4 py-1.5 rounded-xl text-[10px] font-black text-white uppercase shadow-md" style={{ backgroundColor: p.color }}>{p.name}</span> : null;
                                 })()}
                                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border shadow-sm ${(ATTENDANCE_STATUS as any)[r.status]?.color || 'bg-slate-100'}`}>{(ATTENDANCE_STATUS as any)[r.status]?.label || 'Status'}</span>
                                 {r.validationStatus && (
                                   <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase shadow-sm ${(VALIDATION_STATUS as any)[r.validationStatus]?.color || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                     {(() => {
                                       const Icon = (VALIDATION_STATUS as any)[r.validationStatus]?.icon || Clock;
                                       return <Icon size={14} />;
                                     })()}
                                     {(VALIDATION_STATUS as any)[r.validationStatus]?.label || 'Pendiente'}
                                   </div>
                                 )}
                              </div>
                              <div className="relative pl-6">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-100 group-hover/item:bg-indigo-300 transition-colors rounded-full"></div>
                                <p className="text-slate-600 font-bold text-lg leading-relaxed italic">"{r.description || 'Sin detalles.'}"</p>
                              </div>
                              {r.evidenceLink && <a href={r.evidenceLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-[10px] text-indigo-600 font-black bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl shadow-sm uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"><LinkIcon size={14}/> Comprobante</a>}
                            </div>
                            
                            <div className="flex items-center gap-8 shrink-0">
                              {userRole !== 'user' && r.validationStatus !== 'aprobado' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApproveRecord(selectedStudent.id, r.id);
                                  }}
                                  className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                  title="Aprobar registro"
                                >
                                  <Check size={20} />
                                </button>
                              )}
                              <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl flex flex-col items-center min-w-[120px]">
                                  <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1 opacity-70">Horas</span>
                                  <div className="flex items-baseline gap-1 leading-none"><span className="text-4xl font-black">{Number(r.hours.toFixed(2))}</span><span className="text-xs font-black text-indigo-500 uppercase">H</span></div>
                              </div>
                              <div className="flex flex-col gap-3">
                                  {r.validationStatus === 'pendiente' && (
                                    <div className="flex gap-2 mb-2">
                                      <button 
                                        onClick={async () => {
                                          const updatedStudents = students.map(s => s.id === selectedStudentId ? {
                                            ...s,
                                            records: (s.records || []).map((rec: any) => rec.id === r.id ? { ...rec, validationStatus: 'aprobado' } : rec)
                                          } : s);
                                          setStudents(updatedStudents);
                                          
                                          try {
                                            const studentToUpdate = updatedStudents.find(s => s.id === selectedStudentId);
                                            if (studentToUpdate) {
                                              const dataToSave = {
                                                ...studentToUpdate,
                                                uid: selectedStudentId!,
                                                role: studentToUpdate.role || 'user',
                                                createdAt: studentToUpdate.createdAt || new Date().toISOString()
                                              };
                                              await setDoc(doc(db, 'users', selectedStudentId!), dataToSave, { merge: true });
                                              showSuccessToast("Sesión aprobada");
                                            }
                                          } catch (error) {
                                            handleFirestoreError(error, OperationType.WRITE, `users/${selectedStudentId}`);
                                          }
                                        }}
                                        className="p-3 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl border border-emerald-100 shadow-sm transition-all"
                                        title="Aprobar"
                                      >
                                        <CheckCircle2 size={18} />
                                      </button>
                                      <button 
                                        onClick={() => setRejectingRecord(r)}
                                        className="p-3 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl border border-rose-100 shadow-sm transition-all"
                                        title="Rechazar"
                                      >
                                        <XCircle size={18} />
                                      </button>
                                    </div>
                                  )}
                                  <button onClick={()=>{startEditRecord(r); window.scrollTo({top:0, behavior:'smooth'});}} className="p-4 text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all" title="Editar"><Edit2 size={20}/></button>
                                  <button type="button" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); showConfirmToast("¿Estás seguro de que deseas eliminar esta sesión?", async () => { 
                                    const updatedStudents = students.map(s=>s.id===selectedStudentId?{...s,records:(s.records || []).filter((x: any)=>x.id!==r.id)}:s);
                                    setStudents(updatedStudents);
                                    try {
                                      const studentToUpdate = updatedStudents.find(s => s.id === selectedStudentId);
                                      if (studentToUpdate) {
                                        const dataToSave = {
                                          ...studentToUpdate,
                                          uid: selectedStudentId!,
                                          role: studentToUpdate.role || 'user',
                                          createdAt: studentToUpdate.createdAt || new Date().toISOString()
                                        };
                                        await setDoc(doc(db, 'users', selectedStudentId!), dataToSave, { merge: true });
                                        showSuccessToast("Sesión eliminada");
                                      }
                                    } catch (error) {
                                      handleFirestoreError(error, OperationType.WRITE, `users/${selectedStudentId}`);
                                    }
                                  }); }} className="p-4 text-slate-400 hover:text-red-500 hover:bg-red-50 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all" title="Eliminar"><Trash2 size={20}/></button>
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
                      <button 
                        disabled={isSubmitting}
                        className={`w-full text-white font-black py-10 rounded-[3.5rem] shadow-2xl uppercase tracking-[0.5em] text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 ${view === 'group-activity' ? 'bg-emerald-600 shadow-emerald-600/40' : 'bg-indigo-600 shadow-indigo-600/40'}`}
                      >
                        {isSubmitting && <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        Validar y Registrar
                      </button>
                    )}
                </form>
              </div>
            </div>
          )}

          {view === 'calendar' && (
            <div className="space-y-6 sm:space-y-10 animate-in fade-in zoom-in-95 duration-700">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-8">
                 <div className="w-full lg:w-auto">
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">Calendario</h2>
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[8px] sm:text-[10px] mt-2 flex items-center gap-2">Cronograma Mensual de Actividades</p>
                 </div>
                 <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex-1 sm:flex-none">
                       <Filter size={16} className="text-slate-400 ml-2" />
                       <input type="date" className="p-2 text-[10px] sm:text-xs font-bold text-slate-600 outline-none bg-transparent w-full" value={calendarDateFilter} onChange={e => {
                         setCalendarDateFilter(e.target.value);
                         if (e.target.value) {
                           const [y, m] = e.target.value.split('-');
                           setCurrentMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
                           setCalendarMode('list');
                         }
                       }} />
                       {calendarDateFilter && <button onClick={() => setCalendarDateFilter('')} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><X size={14}/></button>}
                    </div>
                    <div className="flex items-center bg-white p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex-1 sm:flex-none">
                      <button onClick={() => setCalendarMode('grid')} className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 ${calendarMode === 'grid' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutGrid size={14} className="sm:w-4 sm:h-4"/> <span className="hidden xs:inline">Cuadrícula</span></button>
                      <button onClick={() => setCalendarMode('list')} className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-2 ${calendarMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}><List size={14} className="sm:w-4 sm:h-4"/> <span className="hidden xs:inline">Listado</span></button>
                    </div>
                    <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4 bg-white p-1.5 sm:p-3 rounded-xl sm:rounded-[2rem] border border-slate-200 shadow-lg px-3 sm:px-6 flex-1 sm:flex-none">
                      <button onClick={() => { const next = new Date(currentMonth); next.setMonth(next.getMonth() - 1); setCurrentMonth(next); }} className="p-2 sm:p-3 hover:bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-50 hover:scale-110 active:scale-90"><ChevronLeft size={18} className="sm:w-5 sm:h-5"/></button>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <select 
                            value={currentMonth.getMonth()} 
                            onChange={(e) => {
                              const next = new Date(currentMonth);
                              next.setMonth(parseInt(e.target.value));
                              setCurrentMonth(next);
                            }}
                            className="font-black text-slate-800 text-sm sm:text-2xl tracking-tighter leading-none bg-transparent outline-none cursor-pointer capitalize appearance-none text-center min-w-[80px] sm:min-w-[140px]"
                          >
                            {Array.from({ length: 12 }).map((_, i) => (
                              <option key={i} value={i}>
                                {new Date(2000, i, 1).toLocaleDateString('es-ES', { month: 'long' })}
                              </option>
                            ))}
                          </select>
                          <select 
                            value={currentMonth.getFullYear()} 
                            onChange={(e) => {
                              const next = new Date(currentMonth);
                              next.setFullYear(parseInt(e.target.value));
                              setCurrentMonth(next);
                            }}
                            className="font-black text-slate-800 text-sm sm:text-2xl tracking-tighter leading-none bg-transparent outline-none cursor-pointer appearance-none text-center min-w-[60px] sm:min-w-[100px]"
                          >
                            {Array.from({ length: 10 }).map((_, i) => {
                              const year = new Date().getFullYear() - 5 + i;
                              return <option key={year} value={year}>{year}</option>;
                            })}
                          </select>
                        </div>
                        <button 
                          onClick={() => setCurrentMonth(new Date())}
                          className="text-[8px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1 hover:text-indigo-700 transition-colors"
                        >
                          Hoy
                        </button>
                      </div>
                      <button onClick={() => { const next = new Date(currentMonth); next.setMonth(next.getMonth() + 1); setCurrentMonth(next); }} className="p-2 sm:p-3 hover:bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-50 hover:scale-110 active:scale-90"><ChevronRight size={18} className="sm:w-5 sm:h-5"/></button>
                    </div>
                 </div>
               </div>

               {calendarMode === 'grid' ? (
                 <div className="overflow-x-auto pb-4 hide-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
                   <div className="bg-white border border-slate-200 rounded-[1.5rem] sm:rounded-[3rem] overflow-hidden shadow-sm grid grid-cols-7 relative min-w-[500px] sm:min-w-[800px]">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, idx) => <div key={`${d}-${idx}`} className="py-3 sm:py-6 text-center text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest sm:tracking-[0.3em] border-b border-slate-50 bg-slate-50/50">{d}</div>)}
                    {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} className="bg-slate-50/10 min-h-[60px] sm:min-h-[140px] border-r border-b border-slate-100"></div>)}
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
                          className={`min-h-[60px] sm:min-h-[140px] p-1.5 sm:p-5 border-r border-b border-slate-100 transition-all relative overflow-hidden group ${hasActivities ? 'cursor-pointer hover:bg-indigo-50/50' : 'bg-slate-50/10'}`}
                        >
                          {hasActivities && (
                            <div className="absolute inset-0 bg-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          )}
                          
                          <div className={`absolute top-1 right-1 sm:top-3 sm:right-3 w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-[8px] sm:text-[11px] transition-colors ${hasActivities ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'text-slate-400 bg-slate-100'}`}>
                            {day}
                          </div>
                          
                          <div className="mt-4 sm:mt-12 space-y-1 sm:space-y-2 relative z-10">
                            {hasActivities ? (
                              <>
                                <div className="text-[6px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 sm:mb-3 hidden sm:block">
                                  {dayRecords.length} Act.
                                </div>
                                <div className="flex flex-wrap gap-0.5 sm:gap-1.5">
                                  {uniqueCats.slice(0, 3).map((cid: any) => {
                                    const cat = categories.find(c => c.id === cid);
                                    return (
                                      <div 
                                        key={cid} 
                                        className="w-2 h-2 sm:w-5 sm:h-5 rounded-full shadow-sm border sm:border-2 border-white flex items-center justify-center" 
                                        style={{ backgroundColor: cat?.color || '#cbd5e1' }}
                                        title={cat?.name}
                                      ></div>
                                    );
                                  })}
                                  {uniqueCats.length > 3 && (
                                    <div className="w-2 h-2 sm:w-5 sm:h-5 rounded-full bg-slate-100 border sm:border-2 border-white flex items-center justify-center text-[5px] sm:text-[8px] font-black text-slate-500">
                                      +{uniqueCats.length - 3}
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                   </div>
                 </div>
               ) : (
                 <div className="bg-white border border-slate-200 rounded-[1.5rem] sm:rounded-[3rem] shadow-sm p-4 sm:p-12 relative overflow-hidden">
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
                               <div className="sticky top-0 bg-white/95 backdrop-blur-md py-3 sm:py-4 mb-4 sm:mb-6 border-b-2 border-slate-100 z-10 flex items-center gap-4">
                                 <h3 className="font-black text-lg sm:text-2xl text-slate-800 capitalize tracking-tight">{dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                               </div>
                               <div className="space-y-4 pl-2 sm:pl-8 border-l-2 border-indigo-50">
                                 {Object.values(groupedActs).map((group: any, idx) => {
                                   const cat = categories.find(c => c.id === group.categoryId);
                                   return (
                                     <div key={idx} className="bg-slate-50 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 hover:bg-white hover:shadow-lg transition-all border border-slate-100 group">
                                       <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto">
                                         <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 text-center min-w-[80px] sm:min-w-[100px]">
                                           <p className="text-lg sm:text-xl font-black text-indigo-600 leading-none">{group.startTime}</p>
                                         </div>
                                         <div className="space-y-2 sm:space-y-3 flex-1">
                                           <div className="flex flex-wrap items-center gap-2">
                                               <span className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black text-white uppercase shadow-sm" style={{ backgroundColor: cat?.color }}>{cat?.name || 'Categoría'}</span>
                                               {group.participants.length > 1 && <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-indigo-100 text-indigo-700 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase flex items-center gap-1 shadow-sm"><Users size={10}/> <span className="hidden xs:inline">Actividad Grupal</span><span className="xs:hidden">Grupal</span></span>}
                                           </div>
                                           <div className="flex flex-wrap gap-2">
                                              {group.participants.map((pName: string, i: number) => (
                                                  <div key={i} className="bg-white border border-slate-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold text-slate-700 shadow-sm">{String(pName)}</div>
                                              ))}
                                           </div>
                                         </div>
                                       </div>
                                       {group.description && <div className="md:max-w-xs w-full border-t md:border-t-0 border-slate-100 pt-3 md:pt-0"> <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold italic line-clamp-2">"{group.description}"</p> </div>}
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
                   <div className="bg-white rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-14 w-full max-w-4xl shadow-2xl relative animate-in zoom-in-95 duration-300 border-t-[8px] sm:border-t-[12px] border-indigo-600 my-auto">
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
                <div className="grid grid-cols-1 gap-8">
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
                  <div className="grid grid-cols-1 gap-4 h-fit content-start">
                    {categories.map(cat => (
                      <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-indigo-300 transition-all shadow-sm">
                        {editingCategory?.id === cat.id ? (
                          <div className="flex items-center gap-3 w-full">
                            <input type="color" className="w-8 h-8 p-0 border-0 rounded-lg cursor-pointer bg-transparent shadow-sm shrink-0" value={editingCategory.color} onChange={e => setEditingCategory({...editingCategory, color: e.target.value})} />
                            <input type="text" className="flex-1 p-2 border border-slate-200 rounded-xl bg-slate-50 font-bold outline-none focus:bg-white text-sm" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} />
                            <button onClick={async () => {
                              setCategories(categories.map(c => c.id === cat.id ? editingCategory : c));
                              try {
                                await setDoc(doc(db, 'categories', cat.id), editingCategory);
                                setEditingCategory(null);
                                showSuccessToast("Categoría actualizada");
                              } catch (error) {
                                handleFirestoreError(error, OperationType.WRITE, `categories/${cat.id}`);
                              }
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
                                showConfirmToast('¿Estás seguro de que deseas eliminar esta categoría? Esto no se puede deshacer.', async () => {
                                  setCategories(categories.filter(c => c.id !== cat.id));
                                  try {
                                    await deleteDoc(doc(db, 'categories', cat.id));
                                    showSuccessToast("Categoría eliminada");
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.DELETE, `categories/${cat.id}`);
                                  }
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
                <div className="grid grid-cols-1 gap-8">
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
                      <button onClick={async ()=>{
                        const n=(document.getElementById('newProjName') as any).value; 
                        if(!n)return; 
                        const newId = `p-${Date.now()}`;
                        const newProj = {id:newId,name:n,color:(window as any).__selProjColor||'#64748b'};
                        setProjects([...projects, newProj]); 
                        try {
                          await setDoc(doc(db, 'projects', newId), newProj);
                          showSuccessToast("Proyecto registrado");
                        } catch (error) {
                          handleFirestoreError(error, OperationType.WRITE, `projects/${newId}`);
                        }
                        (document.getElementById('newProjName') as any).value='';
                      }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs hover:bg-emerald-700 transition-all shadow-lg active:scale-95">Registrar Proyecto</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 h-fit content-start">
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
                                <button onClick={async () => {
                                  setProjects(projects.map(pr => pr.id === p.id ? editingProject : pr));
                                  try {
                                    await setDoc(doc(db, 'projects', p.id), editingProject);
                                    setEditingProject(null);
                                    showSuccessToast("Proyecto actualizado");
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.WRITE, `projects/${p.id}`);
                                  }
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
                              <button onClick={() => { showConfirmToast('¿Estás seguro de que deseas eliminar este proyecto?', async () => { 
                                const updatedProjects = projects.filter(proj => proj.id !== p.id);
                                setProjects(updatedProjects);
                                
                                const updatedStudents = students.map(s => { 
                                  if ((s.projectIds || []).includes(p.id)) { 
                                    const newIds = (s.projectIds || []).filter((id: string) => id !== p.id); 
                                    return { ...s, projectIds: newIds, workStatus: newIds.length > 0 ? 'Asignado' : 'Sin asignar' }; 
                                  } 
                                  return s; 
                                });
                                setStudents(updatedStudents);

                                try {
                                  await deleteDoc(doc(db, 'projects', p.id));
                                  // Also update all students who had this project
                                  const updates = updatedStudents.filter(s => (s.projectIds || []).includes(p.id)).map(async (s) => {
                                    const dataToSave = {
                                      ...s,
                                      uid: s.id,
                                      role: s.role || 'user',
                                      createdAt: s.createdAt || new Date().toISOString()
                                    };
                                    await setDoc(doc(db, 'users', s.id), dataToSave, { merge: true });
                                  });
                                  await Promise.all(updates);
                                  showSuccessToast("Proyecto eliminado"); 
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.DELETE, `projects/${p.id}`);
                                }
                              }); }} className="text-slate-300 hover:text-red-600 p-2.5 bg-slate-50 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
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
          {rejectedNotifications.length > 0 && (
            <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-3xl flex items-center justify-center p-4 z-[100] overflow-y-auto">
              <div className="bg-white rounded-[2.5rem] sm:rounded-[5rem] p-6 sm:p-12 md:p-20 w-full max-w-2xl shadow-2xl my-auto border-t-[8px] sm:border-t-[16px] border-red-600 animate-in zoom-in-95 duration-500 relative">
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                    <AlertCircle size={48} />
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Horas Rechazadas</h2>
                  <p className="text-lg text-slate-600 max-w-lg">
                    Se han rechazado horas que habías registrado. Por favor, revisa el motivo a continuación.
                  </p>
                  
                  <div className="w-full mt-8 space-y-6">
                    {rejectedNotifications.map((notification, index) => (
                      <div key={notification.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-left">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-xl">{notification.date}</h3>
                            <p className="text-slate-500">{notification.hours} horas - {notification.description}</p>
                          </div>
                          <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-sm font-medium">Rechazado</span>
                        </div>
                        <div className="bg-white border border-red-100 rounded-2xl p-5 mt-4">
                          <h4 className="text-sm font-semibold text-red-800 uppercase tracking-wider mb-2">Motivo del rechazo:</h4>
                          <p className="text-slate-700 whitespace-pre-wrap">{notification.rejectReason || 'No se especificó un motivo.'}</p>
                        </div>
                        <div className="mt-6 flex justify-end">
                          <button
                            onClick={() => handleAcknowledgeRejection(notification.id)}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-full font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                          >
                            <Check size={20} />
                            Entendido
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {rejectingRecord && selectedStudentId && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900">Rechazar Registro</h3>
                  <button onClick={() => { setRejectingRecord(null); setRejectReason(''); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-sm font-bold text-slate-700">{selectedStudent?.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{rejectingRecord.date} • {Number(rejectingRecord.hours.toFixed(2))}h</p>
                    <p className="text-xs text-slate-600 mt-2 italic">"{rejectingRecord.description}"</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo del Rechazo (Se enviará por correo)</label>
                    <textarea 
                      className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 font-bold outline-none focus:bg-white focus:border-rose-300 transition-all text-sm shadow-inner resize-none h-32"
                      placeholder="Explica por qué se rechazan estas horas..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => { setRejectingRecord(null); setRejectReason(''); }}
                      className="flex-1 py-4 rounded-2xl font-black uppercase text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleRejectRecordProfile}
                      disabled={!rejectReason.trim()}
                      className="flex-1 py-4 rounded-2xl font-black uppercase text-xs bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Send size={16} /> Enviar y Rechazar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {/* MODAL PERFIL USUARIO (ALUMNO) */}
      {showProfileModal && editingProfileForm && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-3xl flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] sm:rounded-[5rem] p-6 sm:p-12 md:p-20 w-full max-w-4xl shadow-2xl my-auto border-t-[8px] sm:border-t-[16px] border-indigo-600 animate-in zoom-in-95 duration-500 relative">
            <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 sm:top-10 sm:right-10 p-3 sm:p-6 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 rounded-full border border-slate-100 shadow-inner"><X size={24}/></button>
            
            <div className="flex flex-col gap-8 sm:gap-12 items-start w-full">
              <div className="w-full space-y-6 sm:space-y-10">
                <div>
                  <h3 className="text-3xl sm:text-6xl font-black text-slate-900 tracking-tighter">Mi Perfil</h3>
                  <div className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] sm:text-[12px] mt-2 flex items-center gap-4">
                    <div className="w-8 sm:w-12 h-1 bg-indigo-100"></div> {userRole !== 'user' ? 'Información del Administrador' : 'Información del Estudiante'}
                  </div>
                </div>

                {userRole === 'user' && (
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    <div className="bg-slate-50 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-slate-100 shadow-inner space-y-4 sm:space-y-6">
                      <h4 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Estatus Actual</h4>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-pulse shadow-lg ${(STUDENT_STATUS as any)[editingProfileForm.status]?.color || 'bg-yellow-400 shadow-yellow-400/20'}`}></div>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{editingProfileForm.status}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-slate-100 shadow-inner space-y-4 sm:space-y-6">
                      <h4 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Proyectos Asignados</h4>
                      <div className="space-y-3 sm:space-y-4">
                        {userProfile.projectIds?.length > 0 ? userProfile.projectIds.map((pid: string) => {
                          const p = projects.find((proj: any) => proj.id === pid);
                          return (
                            <div key={pid} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
                              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: p?.color || '#cbd5e1' }}></div>
                              <span className="text-[10px] sm:text-xs font-black uppercase text-slate-700 truncate">{p?.name || pid}</span>
                            </div>
                          );
                        }) : (
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ningún proyecto asignado</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  <div className="space-y-2 sm:space-y-4">
                    <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Nombre(s)</label>
                    <input type="text" className="w-full p-4 sm:p-6 border-2 sm:border-4 border-slate-50 rounded-2xl sm:rounded-[2rem] bg-slate-50 text-lg sm:text-xl font-black outline-none focus:bg-white transition-all shadow-inner" value={editingProfileForm.firstName || ''} onChange={e => setEditingProfileForm({...editingProfileForm, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Apellido Paterno</label>
                    <input type="text" className="w-full p-4 sm:p-6 border-2 sm:border-4 border-slate-50 rounded-2xl sm:rounded-[2rem] bg-slate-50 text-lg sm:text-xl font-black outline-none focus:bg-white transition-all shadow-inner" value={editingProfileForm.lastNamePaterno || ''} onChange={e => setEditingProfileForm({...editingProfileForm, lastNamePaterno: e.target.value})} />
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Apellido Materno</label>
                    <input type="text" className="w-full p-4 sm:p-6 border-2 sm:border-4 border-slate-50 rounded-2xl sm:rounded-[2rem] bg-slate-50 text-lg sm:text-xl font-black outline-none focus:bg-white transition-all shadow-inner" value={editingProfileForm.lastNameMaterno || ''} onChange={e => setEditingProfileForm({...editingProfileForm, lastNameMaterno: e.target.value})} />
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Correo Electrónico</label>
                    <input type="email" className="w-full p-4 sm:p-6 border-2 sm:border-4 border-slate-50 rounded-2xl sm:rounded-[2rem] bg-slate-50 text-lg sm:text-xl font-black outline-none focus:bg-white transition-all shadow-inner" value={editingProfileForm.email || ''} onChange={e => setEditingProfileForm({...editingProfileForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Teléfono</label>
                    <input type="tel" className="w-full p-4 sm:p-6 border-2 sm:border-4 border-slate-50 rounded-2xl sm:rounded-[2rem] bg-slate-50 text-lg sm:text-xl font-black outline-none focus:bg-white transition-all shadow-inner" value={editingProfileForm.phone || ''} onChange={e => setEditingProfileForm({...editingProfileForm, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Teléfono de Emergencia</label>
                    <input type="tel" className="w-full p-4 sm:p-6 border-2 sm:border-4 border-slate-50 rounded-2xl sm:rounded-[2rem] bg-slate-50 text-lg sm:text-xl font-black outline-none focus:bg-white transition-all shadow-inner" value={editingProfileForm.emergencyPhone || ''} onChange={e => setEditingProfileForm({...editingProfileForm, emergencyPhone: e.target.value})} />
                  </div>
                  {userRole === 'user' && (
                    <div className="space-y-2 sm:space-y-4">
                      <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Ciclo de Brigada</label>
                      <input type="text" className="w-full p-4 sm:p-6 border-2 sm:border-4 border-slate-50 rounded-2xl sm:rounded-[2rem] bg-slate-50 text-lg sm:text-xl font-black outline-none focus:bg-white transition-all shadow-inner" placeholder="Ej. 111" value={editingProfileForm.brigadePeriod || ''} onChange={e => setEditingProfileForm({...editingProfileForm, brigadePeriod: e.target.value})} />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-4">Habilidades y Software</label>
                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-[2rem] border-4 border-slate-50 shadow-inner">
                    {(editingProfileForm.skills || []).map((skill: string, i: number) => (
                      <span key={i} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
                        {skill}
                        <button onClick={() => setEditingProfileForm({...editingProfileForm, skills: editingProfileForm.skills.filter((_: any, idx: number) => idx !== i)})} className="text-slate-300 hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      placeholder="Agregar habilidad..." 
                      className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm font-bold p-2"
                      onKeyDown={(e: any) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const newSkill = e.target.value.trim();
                          if (!(editingProfileForm.skills || []).includes(newSkill)) {
                            setEditingProfileForm({...editingProfileForm, skills: [...(editingProfileForm.skills || []), newSkill]});
                          }
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleUpdateProfile}
                  className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-lg uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALTA/EDICIÓN ALUMNO */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-3xl flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] sm:rounded-[5rem] p-6 sm:p-12 md:p-20 w-full max-w-5xl shadow-2xl my-auto border-t-[8px] sm:border-t-[16px] border-indigo-600 animate-in zoom-in-95 duration-500 relative">
            <button onClick={()=>{setShowAddStudent(false); setStudentFormErrors({});}} className="absolute top-4 right-4 sm:top-10 sm:right-10 p-3 sm:p-6 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 rounded-full border border-slate-100 shadow-inner"><X size={24}/></button>
            <h3 className="text-3xl sm:text-6xl font-black mb-2 sm:mb-4 text-slate-900 tracking-tighter">{showEditStudent ? 'Modificar Perfil' : 'Alta de Prestador'}</h3>
            <div className="text-slate-400 mb-6 sm:mb-12 font-black uppercase tracking-[0.4em] text-[10px] sm:text-[12px] flex items-center gap-4"><div className="w-8 sm:w-12 h-1 bg-indigo-100"></div> Gestión Técnica de Expedientes</div>

             {Object.keys(studentFormErrors).length > 0 && (
              <div className="p-4 sm:p-6 mb-6 sm:mb-12 bg-red-50 text-red-700 rounded-2xl sm:rounded-[2rem] border-2 sm:border-4 border-red-200 flex items-center gap-3 sm:gap-5 font-black text-[11px] sm:text-[13px] uppercase animate-bounce shadow-lg">
                <AlertCircle size={24}/> Por favor corrige los errores marcados en rojo
              </div>
            )}
            
            <div className="space-y-8 sm:space-y-12 mb-10 sm:mb-16">
              {/* Sección 1: Información Personal */}
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 sm:w-8 h-1 bg-indigo-500 rounded-full"></div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest">Información Personal</h4>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Nombre(s)</label>
                    <input type="text" className={`w-full p-4 sm:p-5 border-2 ${studentFormErrors.firstName ? 'border-red-500' : 'border-slate-100'} rounded-xl sm:rounded-2xl bg-slate-50 text-base sm:text-lg font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm`} placeholder="Ej. Mariana" value={studentForm.firstName || ''} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} />
                    {studentFormErrors.firstName && <p className="text-red-500 text-[10px] font-bold ml-4">{studentFormErrors.firstName}</p>}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Apellido Paterno</label>
                    <input type="text" className={`w-full p-5 border-2 ${studentFormErrors.lastNamePaterno ? 'border-red-500' : 'border-slate-100'} rounded-2xl bg-slate-50 text-lg font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm`} placeholder="Ej. Soler" value={studentForm.lastNamePaterno || ''} onChange={e => setStudentForm({...studentForm, lastNamePaterno: e.target.value})} />
                    {studentFormErrors.lastNamePaterno && <p className="text-red-500 text-[10px] font-bold ml-4">{studentFormErrors.lastNamePaterno}</p>}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Apellido Materno</label>
                    <input type="text" className={`w-full p-5 border-2 ${studentFormErrors.lastNameMaterno ? 'border-red-500' : 'border-slate-100'} rounded-2xl bg-slate-50 text-lg font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm`} placeholder="Ej. Rojas" value={studentForm.lastNameMaterno || ''} onChange={e => setStudentForm({...studentForm, lastNameMaterno: e.target.value})} />
                    {studentFormErrors.lastNameMaterno && <p className="text-red-500 text-[10px] font-bold ml-4">{studentFormErrors.lastNameMaterno}</p>}
                  </div>
                </div>
              </div>

              {/* Sección 2: Datos Académicos y de Servicio */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-1 bg-indigo-500 rounded-full"></div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Datos Académicos</h4>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Matrícula</label>
                    <input type="text" className={`w-full p-5 border-2 ${studentFormErrors.studentId ? 'border-red-500' : 'border-slate-100'} rounded-2xl bg-slate-50 text-lg font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm`} placeholder="Ej. 315123456" value={studentForm.studentId || ''} onChange={e => setStudentForm({...studentForm, studentId: e.target.value})} />
                    {studentFormErrors.studentId && <p className="text-red-500 text-[10px] font-bold ml-4">{studentFormErrors.studentId}</p>}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Tipo de Servicio</label>
                    <select className="w-full p-5 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 shadow-sm transition-all" value={studentForm.serviceType || ''} onChange={e => setStudentForm({...studentForm, serviceType: e.target.value as 'Prestador' | 'Brigadista'})}>
                      <option value="Prestador">Prestador</option>
                      <option value="Brigadista">Brigadista</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4 flex items-center gap-2">
                      Ciclo Brigada <span className="text-red-500">*</span>
                    </label>
                    <input type="text" placeholder="Ej. 111" maxLength={3} className={`w-full p-5 border-2 ${studentFormErrors.brigadePeriod ? 'border-red-500' : 'border-slate-100'} rounded-2xl bg-slate-50 text-lg font-bold outline-none focus:bg-white focus:border-indigo-500 shadow-sm transition-all`} value={studentForm.brigadePeriod || ''} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 3); setStudentForm({...studentForm, brigadePeriod: val}); }} />
                    {studentFormErrors.brigadePeriod && <p className="text-red-500 text-[10px] font-bold ml-4">{studentFormErrors.brigadePeriod}</p>}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Nickname</label>
                    <input type="text" className="w-full p-5 border-2 border-slate-100 rounded-2xl bg-slate-50 text-lg font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm" placeholder="Opcional" value={studentForm.nickname || ''} onChange={e => setStudentForm({...studentForm, nickname: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Programa Académico</label>
                    <select className="w-full p-5 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 shadow-sm transition-all" value={studentForm.career || ''} onChange={e => setStudentForm({...studentForm, career: e.target.value})}>{CAREER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Estatus Global</label>
                    <select 
                      className={`w-full p-5 border-2 ${studentFormErrors.status ? 'border-red-500' : 'border-slate-100'} rounded-2xl bg-slate-50 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 shadow-sm transition-all ${userRole === 'user' ? 'opacity-50 cursor-not-allowed' : ''}`} 
                      value={studentForm.status || ''} 
                      onChange={e => setStudentForm({...studentForm, status: e.target.value})}
                      disabled={userRole === 'user'}
                    >
                      {Object.keys(STUDENT_STATUS).map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                    {studentFormErrors.status && <p className="text-red-500 text-[10px] font-bold ml-4">{studentFormErrors.status}</p>}
                    {userRole === 'user' && <p className="text-slate-400 text-[9px] font-bold ml-4 uppercase tracking-tighter">* Solo administradores pueden cambiar el estatus</p>}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Carga Trabajo</label>
                    <select className="w-full p-5 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 shadow-sm" value={studentForm.workStatus || ''} onChange={e => setStudentForm({...studentForm, workStatus: e.target.value})}>{Object.keys(WORK_STATUS).map(ws => <option key={ws} value={ws}>{ws}</option>)}</select>
                  </div>
                  {userRole !== 'user' && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block ml-4">Rol del Usuario</label>
                      <select 
                        className="w-full p-5 border-2 border-indigo-100 rounded-2xl bg-indigo-50/30 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 shadow-sm transition-all" 
                        value={studentForm.role || 'user'} 
                        onChange={e => setStudentForm({...studentForm, role: e.target.value})}
                      >
                        <option value="user" disabled={user?.email !== 'mortovki@gmail.com' && (studentForm.role === 'admin' || studentForm.role === 'coordinator')}>Usuario</option>
                        <option value="coordinator" disabled={user?.email !== 'mortovki@gmail.com' && studentForm.role === 'admin'}>Coordinador</option>
                        <option value="admin" disabled={user?.email !== 'mortovki@gmail.com'}>Administrador</option>
                      </select>
                      {user?.email !== 'mortovki@gmail.com' && <p className="text-slate-400 text-[9px] font-bold ml-4 uppercase tracking-tighter">* Solo el superadmin puede destituir privilegios</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 3: Contacto */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-1 bg-indigo-500 rounded-full"></div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Contacto y Seguridad</h4>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Email</label>
                    <input type="email" placeholder="ejemplo@correo.com" className={`w-full p-5 border-2 ${studentFormErrors.email ? 'border-red-500' : 'border-slate-100'} rounded-2xl bg-slate-50 text-lg font-bold outline-none focus:bg-white focus:border-indigo-500 shadow-sm`} value={studentForm.email || ''} onChange={e => setStudentForm({...studentForm, email: e.target.value})} />
                    {studentFormErrors.email && <p className="text-red-500 text-[10px] font-bold ml-4">{studentFormErrors.email}</p>}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Teléfono Personal</label>
                    <input type="tel" placeholder="10 dígitos" className={`w-full p-5 border-2 ${studentFormErrors.phone ? 'border-red-500' : 'border-slate-100'} rounded-2xl bg-slate-50 text-lg font-bold outline-none focus:bg-white focus:border-indigo-500 shadow-sm`} value={studentForm.phone || ''} onChange={e => setStudentForm({...studentForm, phone: e.target.value.replace(/\D/g, '')})} />
                    {studentFormErrors.phone && <p className="text-red-500 text-[10px] font-bold ml-4">{studentFormErrors.phone}</p>}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest block ml-4">Contacto SOS (Emergencia)</label>
                    <input type="tel" placeholder="10 dígitos" className={`w-full p-5 border-2 ${studentFormErrors.emergencyPhone ? 'border-red-500' : 'border-red-100'} rounded-2xl bg-red-50/30 text-lg font-bold outline-none focus:bg-white focus:border-red-500 text-red-900 shadow-sm`} value={studentForm.emergencyPhone || ''} onChange={e => setStudentForm({...studentForm, emergencyPhone: e.target.value.replace(/\D/g, '')})} />
                    {studentFormErrors.emergencyPhone && <p className="text-red-500 text-[10px] font-bold ml-4">{studentFormErrors.emergencyPhone}</p>}
                  </div>
                </div>
              </div>

              {/* Sección 4: Habilidades y Software */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-1 bg-indigo-500 rounded-full"></div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Habilidades y Software</h4>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-inner">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(studentForm.skills || []).map((skill: string, i: number) => (
                      <span key={i} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
                        {skill}
                        <button type="button" onClick={() => setStudentForm({...studentForm, skills: studentForm.skills.filter((_: any, idx: number) => idx !== i)})} className="text-slate-300 hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Agregar habilidad y presionar Enter..." 
                    className="w-full bg-white border-2 border-slate-100 outline-none text-sm font-bold p-4 rounded-xl focus:border-indigo-500 transition-all shadow-sm"
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (e.target.value.trim()) {
                          const newSkill = e.target.value.trim();
                          if (!(studentForm.skills || []).includes(newSkill)) {
                            setStudentForm({...studentForm, skills: [...(studentForm.skills || []), newSkill]});
                          }
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Sección 5: Proyectos */}
              <div className="space-y-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-1 bg-indigo-500 rounded-full"></div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Asignación de Proyectos</h4>
                </div>
                
                <div className={`bg-slate-50 p-8 rounded-[2.5rem] border-2 ${studentFormErrors.projectIds ? 'border-red-500' : 'border-slate-100'} shadow-inner`}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-6 ml-2">Selecciona los proyectos activos</label>
                  {studentFormErrors.projectIds && <p className="text-red-500 text-[10px] font-bold mb-4 ml-2">{studentFormErrors.projectIds}</p>}
                  <div className="grid grid-cols-1 gap-4">
                    {projects.map(p => (
                      <label key={p.id} className={`flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-sm group ${studentForm.projectIds.includes(p.id) ? 'bg-white border-indigo-500 ring-4 ring-indigo-500/10' : 'bg-white border-transparent hover:border-slate-200'}`}>
                        <div className="flex justify-between items-start">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: p.color }}></div>
                          <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={studentForm.projectIds.includes(p.id)} onChange={e => {
                            const ids = e.target.checked ? [...studentForm.projectIds, p.id] : studentForm.projectIds.filter(id => id !== p.id);
                            const newWorkStatus = ids.length > 0 ? 'Asignado' : 'Sin asignar';
                            setStudentForm({...studentForm, projectIds: ids, workStatus: newWorkStatus});
                          }} />
                        </div>
                        <span className="text-[11px] font-black uppercase text-slate-700 leading-tight tracking-tight truncate">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gestión de Etiquetas */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-4">Tareas y Etiquetas por Proyecto</label>
                  <div className="grid grid-cols-1 gap-6">
                    {(studentForm.projectIds || []).length === 0 ? (
                      <div className="col-span-full p-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                         <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Asigna proyectos para gestionar sus tareas</p>
                      </div>
                    ) : (studentForm.projectIds || []).map(pid => {
                      const p = projects.find(pr => pr.id === pid);
                      const currentTags = (studentForm.projectTasks && studentForm.projectTasks[pid]) || [];
                      const currentInputValue = tagInputs[pid] || '';
                      const bankForProject = projectTagsBank[pid] || [];
                      const suggestions = bankForProject.filter((t: string) => t.toLowerCase().includes(currentInputValue.toLowerCase()) && !currentTags.includes(t));
                      const showSuggestions = activeSuggestionProject === pid && currentInputValue.length > 0 && suggestions.length > 0;

                       return (
                        <div key={pid} className="bg-white p-6 rounded-[2rem] border border-slate-200 space-y-4 shadow-sm relative overflow-hidden transition-all hover:border-indigo-200">
                           <div className="flex items-center gap-3 pb-3 border-b border-slate-50">
                              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: p?.color || '#cbd5e1' }}></div>
                              <span className="font-black text-[11px] uppercase text-slate-900 tracking-tight truncate">{p?.name || 'Proyecto'}</span>
                           </div>
                           
                           <div className="flex gap-2">
                              <div className="relative flex-1">
                                 <input type="text" placeholder="Nueva tarea..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white shadow-inner"
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
                                   <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-indigo-100 rounded-xl shadow-xl z-50 max-h-32 overflow-y-auto">
                                     {suggestions.map((sugg: string) => (
                                       <div key={sugg} className="p-3 hover:bg-indigo-50 cursor-pointer text-[10px] font-black uppercase text-slate-700 border-b last:border-0 transition-colors"
                                         onClick={() => {
                                           if (!currentTags.includes(sugg)) { setStudentForm({ ...studentForm, projectTasks: { ...studentForm.projectTasks, [pid]: [...currentTags, sugg] } }); }
                                           setTagInputs({...tagInputs, [pid]: ''}); setActiveSuggestionProject(null);
                                         }}> {String(sugg)} </div>
                                     ))}
                                   </div>
                                 )}
                              </div>
                              <button type="button" onClick={() => {
                                    const val = currentInputValue.trim(); if (!val) return;
                                    if (!currentTags.includes(val)) { setStudentForm({ ...studentForm, projectTasks: { ...studentForm.projectTasks, [pid]: [...currentTags, val] } }); }
                                    setTagInputs({...tagInputs, [pid]: ''});
                              }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-all shadow-sm"><Plus size={18}/></button>
                           </div>

                           <div className="flex flex-wrap gap-2 min-h-[40px] max-h-[120px] overflow-y-auto custom-scrollbar p-1">
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
                                }} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-[9px] font-black flex items-center gap-2 transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-100 cursor-pointer border border-indigo-100 shadow-sm uppercase italic">
                                   <span className="truncate max-w-[100px]">{String(tag)}</span> <X size={12}/>
                                </div>
                              ))}
                           </div>
                           
                           {studentForm.projectTaskHistory?.[pid]?.length > 0 && (
                             <div className="mt-4 pt-4 border-t border-slate-50">
                               <div className="flex justify-between items-center mb-2">
                                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Historial</label>
                                 <button type="button" onClick={() => {
                                   const historyTags = (studentForm.projectTaskHistory && studentForm.projectTaskHistory[pid]) || [];
                                   const csvContent = ['Actividad'].concat(historyTags).join('\n');
                                   const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                                   const url = URL.createObjectURL(blob);
                                   const link = document.createElement('a');
                                   link.setAttribute('href', url);
                                   link.setAttribute('download', `Reporte_${p?.name.replace(/\s+/g, '_')}_${studentForm.firstName || 'Alumno'}.csv`);
                                   document.body.appendChild(link);
                                   link.click();
                                   document.body.removeChild(link);
                                 }} className="text-[8px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1"><Download size={10}/> Reporte</button>
                               </div>
                               <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto custom-scrollbar pr-1">
                                 {((studentForm.projectTaskHistory && studentForm.projectTaskHistory[pid]) || []).map((tag: string, idx: number) => (
                                   <div key={idx} className="flex items-center gap-1 bg-slate-50 text-slate-400 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tight">
                                     <span className="truncate max-w-[80px]">{String(tag)}</span>
                                     <button type="button" onClick={() => {
                                       const currentHistory = (studentForm.projectTaskHistory && studentForm.projectTaskHistory[pid]) || [];
                                        const updatedHistory = currentHistory.filter((_: any, i: number) => i !== idx);
                                       setStudentForm({ ...studentForm, projectTaskHistory: { ...studentForm.projectTaskHistory, [pid]: updatedHistory } });
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
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-10 mt-10 sm:mt-20">
              <button onClick={() => { setShowAddStudent(false); setStudentFormErrors({}); }} className="flex-1 px-6 py-4 sm:px-10 sm:py-8 border-4 sm:border-8 border-slate-50 rounded-2xl sm:rounded-[3rem] font-black uppercase text-[10px] sm:text-xs text-slate-300 shadow-lg hover:bg-slate-50 transition-all">Cancelar</button>
              <button onClick={handleAddStudent} className="flex-2 px-6 py-4 sm:px-20 sm:py-8 bg-slate-900 text-white rounded-2xl sm:rounded-[3rem] font-black uppercase text-[10px] sm:text-xs shadow-2xl hover:bg-black active:scale-[0.98] transition-all">
                {showEditStudent ? (studentForm.status === 'Finalizada' ? 'Certificar y Guardar' : 'Guardar Cambios') : 'Registrar Prestador'}
              </button>
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
                    if (manualHoursForm.hours < 0.5) {
                      showErrorToast("El registro mínimo es de media hora");
                      return;
                    }
                    if (manualHoursForm.hours > 240) {
                      showErrorToast("Un registro no puede exceder las 240 horas");
                      return;
                    }
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
                    setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, records: [...(s.records || []), newRecord] } : s));
                    setShowManualHours(false);
                    showSuccessToast("Horas manuales agregadas");
                  }} className="flex-1 p-4 bg-indigo-600 text-white rounded-xl font-black">Guardar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;

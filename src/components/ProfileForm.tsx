import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../App';

const profileSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastNamePaterno: z.string().min(1, "El apellido paterno es obligatorio"),
  lastNameMaterno: z.string().min(1, "El apellido materno es obligatorio"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  studentId: z.string().min(1, "La matrícula es obligatoria"),
  career: z.string().min(1, "La carrera es obligatoria"),
  brigadePeriod: z.string().min(1, "El ciclo de brigada es obligatorio"),
  skills: z.array(z.string()).optional().default([]),
});

interface ProfileFormProps {
  user: User;
  onComplete: (profile: any) => void;
}

const ProfileForm = ({ user, onComplete }: ProfileFormProps) => {
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.displayName?.split(' ')[0] || '',
      lastNamePaterno: user.displayName?.split(' ').slice(1, 2).join(' ') || '',
      lastNameMaterno: user.displayName?.split(' ').slice(2, 3).join(' ') || '',
      phone: '',
      studentId: '',
      career: 'Arquitectura',
      brigadePeriod: '',
      skills: [] as string[],
    }
  });

  const currentSkills = watch('skills') || [];

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Hardcoded admin email
      const isAdmin = user.email === 'mortovki@gmail.com';
      
      const profileData = {
        ...data,
        role: isAdmin ? 'admin' : 'user',
        status: 'En Curso', // Default status for all new users
        email: user.email,
        uid: user.uid,
        createdAt: new Date().toISOString(),
      };
      
      const path = `users/${user.uid}`;
      try {
        await setDoc(doc(db, 'users', user.uid), profileData);
        toast.success('Perfil guardado en la nube');
      } catch (error: any) {
        console.error("Error saving profile to Firestore", error);
        if (error.code === 'permission-denied') {
          toast.error('Error de permisos en Firestore. El perfil se guardará localmente en este navegador.', {
            duration: 5000
          });
        } else {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }

      // Always save to localStorage as fallback/cache
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(profileData));
      onComplete(profileData);
    } catch (error: any) {
      console.error("Error saving profile", error);
      // If it's our custom JSON error, it will be caught by ErrorBoundary if we don't catch it here
      // But we want to show a toast if possible
      if (!(error instanceof Error && error.message.startsWith('{'))) {
        toast.error('Error al guardar el perfil');
      } else {
        throw error; // Let ErrorBoundary handle it
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border border-slate-200 w-full max-w-md">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Completa tu perfil</h1>
        <p className="text-slate-500 mb-8">Necesitamos unos datos adicionales para comenzar.</p>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre(s)</label>
            <input 
              {...register('firstName')}
              className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            {errors.firstName && <p className="text-red-500 text-xs font-bold">{errors.firstName.message as string}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apellido Paterno</label>
              <input 
                {...register('lastNamePaterno')}
                className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              {errors.lastNamePaterno && <p className="text-red-500 text-xs font-bold">{errors.lastNamePaterno.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apellido Materno</label>
              <input 
                {...register('lastNameMaterno')}
                className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              {errors.lastNameMaterno && <p className="text-red-500 text-xs font-bold">{errors.lastNameMaterno.message as string}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matrícula</label>
              <input 
                {...register('studentId')}
                placeholder="Ej. 315123456"
                className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              {errors.studentId && <p className="text-red-500 text-xs font-bold">{errors.studentId.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ciclo Brigada</label>
              <input 
                {...register('brigadePeriod')}
                placeholder="Ej. 111"
                className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              {errors.brigadePeriod && <p className="text-red-500 text-xs font-bold">{errors.brigadePeriod.message as string}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono</label>
              <input 
                {...register('phone')}
                placeholder="10 dígitos"
                className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              {errors.phone && <p className="text-red-500 text-xs font-bold">{errors.phone.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carrera</label>
              <select 
                {...register('career')}
                className="w-full p-4 border rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="Arquitectura">Arquitectura</option>
                <option value="Arquitectura del Paisaje">Arquitectura del Paisaje</option>
                <option value="Urbanismo">Urbanismo</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Habilidades y Software</label>
            <div className="flex flex-wrap gap-2 p-4 border rounded-2xl bg-slate-50">
              {currentSkills.map((skill: string, i: number) => (
                <span key={i} className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
                  {skill}
                  <button type="button" onClick={() => {
                    const newSkills = currentSkills.filter((_: any, idx: number) => idx !== i);
                    setValue('skills', newSkills);
                  }} className="text-slate-300 hover:text-red-500 transition-colors">
                    ×
                  </button>
                </span>
              ))}
              <input 
                type="text" 
                placeholder="Agregar habilidad y presionar Enter..." 
                className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm font-bold p-1"
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.target.value.trim()) {
                      const newSkill = e.target.value.trim();
                      if (!currentSkills.includes(newSkill)) {
                        setValue('skills', [...currentSkills, newSkill]);
                      }
                      e.target.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {loading ? 'Guardando...' : 'Comenzar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileForm;

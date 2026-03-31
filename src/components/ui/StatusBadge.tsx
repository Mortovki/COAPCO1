import React from 'react';
import { CheckCircle2, AlertCircle, Clock, PlayCircle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className = '' }) => {
  const getStatusConfig = (s: string) => {
    switch (s.toLowerCase()) {
      case 'completada':
      case 'done':
        return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2, label: 'Completada' };
      case 'en progreso':
      case 'in_progress':
      case 'in progress':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: PlayCircle, label: 'En Progreso' };
      case 'pendiente':
      case 'todo':
        return { color: 'bg-slate-100 text-slate-800 border-slate-200', icon: Clock, label: 'Pendiente' };
      case 'bloqueada':
      case 'blocked':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Bloqueada' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle, label: status };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-4 py-1.5 text-sm gap-2'
  };

  return (
    <span className={`inline-flex items-center font-bold uppercase tracking-widest rounded-full border ${config.color} ${sizeClasses[size]} ${className}`}>
      <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
      {config.label}
    </span>
  );
};

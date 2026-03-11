import { useEffect, useState } from 'react';
import { CheckSquare, Clock, Users, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const Dashboard = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [stats, setStats] = useState({
    totalTareas: 0,
    tareasPendientes: 0,
    tareasEnProceso: 0,
    tareasCompletadas: 0,
    disenadores: 0,
    ingresos: 0,
  });
  const [recentTareas, setRecentTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [
        { count: totalTareas },
        { count: tareasPendientes },
        { count: tareasEnProceso },
        { count: tareasCompletadas },
        { count: disenadores },
        { data: tareasCompletas },
        { data: consultasCompletas },
        { data: tareas },
      ] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'en_proceso'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completada'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin').eq('is_active', true),
        supabase.from('tasks').select('monto').eq('status', 'completada'),
        supabase.from('consultas').select('monto').eq('estado', 'Completada'),
        supabase.from('tasks').select('*, assigned_user:profiles!tasks_assigned_to_fkey(full_name)').order('created_at', { ascending: false }).limit(8),
      ]);

      const ingresos =
        (tareasCompletas || []).reduce((sum, t) => sum + (t.monto || 0), 0) +
        (consultasCompletas || []).reduce((sum, c) => sum + (c.monto || 0), 0);

      setStats({
        totalTareas: totalTareas || 0,
        tareasPendientes: tareasPendientes || 0,
        tareasEnProceso: tareasEnProceso || 0,
        tareasCompletadas: tareasCompletadas || 0,
        disenadores: disenadores || 0,
        ingresos,
      });
      setRecentTareas(tareas || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const statCards = [
    {
      label: 'Total Tareas',
      value: stats.totalTareas,
      sub: `${stats.tareasCompletadas} completadas`,
      icon: CheckSquare,
      adminOnly: false,
    },
    {
      label: 'Pendientes',
      value: stats.tareasPendientes,
      sub: 'Necesitan atención',
      icon: Clock,
      adminOnly: false,
    },
    {
      label: 'Equipo Activo',
      value: stats.disenadores,
      sub: 'Usuarios en el equipo',
      icon: Users,
      adminOnly: false,
    },
    {
      label: 'Ingresos',
      value: `$${stats.ingresos.toLocaleString('es-AR')}`,
      sub: 'Tareas + consultas completadas',
      icon: DollarSign,
      adminOnly: true,
    },
  ].filter(s => !s.adminOnly || isAdmin);

  const STATUS_COLOR: Record<string, string> = {
    pendiente: 'text-warning',
    en_proceso: 'text-primary',
    completada: 'text-success',
    cancelada: 'text-muted-foreground',
  };

  const STATUS_LABEL: Record<string, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En Proceso',
    completada: 'Completada',
    cancelada: 'Cancelada',
  };

  if (loading) return (
    <div className="p-12 text-center">
      <p className="font-mono text-sm text-muted-foreground animate-pulse">Cargando dashboard...</p>
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" style={{ gridTemplateColumns: `repeat(${statCards.length}, minmax(0, 1fr))` }}>
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card border border-border p-6 card-inset animate-slide-in-up">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground font-mono">{stat.label}</span>
              <stat.icon size={18} strokeWidth={1.5} className="text-muted-foreground" />
            </div>
            <p className="font-display text-4xl mb-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground font-mono">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border p-6 card-inset mb-6">
        <h2 className="font-display text-base mb-4">Estado de Tareas</h2>
        <div className="flex gap-6">
          {[
            { label: 'Pendientes', value: stats.tareasPendientes, color: 'bg-warning' },
            { label: 'En Proceso', value: stats.tareasEnProceso, color: 'bg-primary' },
            { label: 'Completadas', value: stats.tareasCompletadas, color: 'bg-success' },
          ].map(item => {
            const total = stats.tareasPendientes + stats.tareasEnProceso + stats.tareasCompletadas;
            return (
              <div key={item.label} className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-mono font-medium">{item.value}</span>
                </div>
                <div className="h-1.5 bg-muted">
                  <div
                    className={`h-full ${item.color} transition-all`}
                    style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border p-6 card-inset">
        <h2 className="font-display text-base mb-6">Tareas Recientes</h2>
        {recentTareas.length === 0 ? (
          <p className="text-sm font-mono text-muted-foreground">No hay tareas todavía.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Tarea', 'Asignado a', ...(isAdmin ? ['Precio'] : []), 'Estado'].map(h => (
                  <th key={h} className="text-left py-3 text-xs text-muted-foreground font-mono font-medium uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTareas.map(t => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-3 text-sm font-mono font-medium">{t.title}</td>
                  <td className="py-3 text-sm font-mono text-muted-foreground">
                    {t.assigned_user?.full_name || '-'}
                  </td>
                  {isAdmin && (
                    <td className="py-3 text-sm font-mono">
                      {t.monto && t.monto > 0 ? `$${t.monto.toLocaleString('es-AR')}` : '-'}
                    </td>
                  )}
                  <td className="py-3">
                    <span className={`text-xs font-mono ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
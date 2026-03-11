import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase, AppUser, Task } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  editor_video: 'Editor de Video',
  disenador_grafico: 'Diseñador Gráfico',
  programador: 'Programador',
  supervisor: 'Supervisor',
};

const ESTADO_CONFIG: Record<string, { label: string; dotClass: string }> = {
  disponible: { label: 'Disponible', dotClass: 'bg-success' },
  ocupado: { label: 'Ocupado', dotClass: 'bg-warning' },
  desconectado: { label: 'Desconectado', dotClass: 'bg-muted-foreground' },
};

const PRIORITY_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
];

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

const Disenadores = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor';

  const [usuarios, setUsuarios] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'media',
    due_date: '',
    monto: '',
  });

  const [showTareasModal, setShowTareasModal] = useState(false);
  const [tareasUsuario, setTareasUsuario] = useState<Task[]>([]);
  const [tareasCompletadas, setTareasCompletadas] = useState<Task[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(false);
  const [tareasUsuarioNombre, setTareasUsuarioNombre] = useState('');
  const [tabActiva, setTabActiva] = useState<'activas' | 'completadas' | 'consultas'>('activas');

  useEffect(() => {
    const fetchUsuarios = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .eq('is_active', true)
        .order('full_name');
      if (data) setUsuarios(data as AppUser[]);
      setLoading(false);
    };
    fetchUsuarios();
  }, []);

  const openAsignar = (user: AppUser) => {
    setSelectedUser(user);
    setForm({ title: '', description: '', priority: 'media', due_date: '', monto: '' });
    setSuccess('');
    setShowAsignarModal(true);
  };

  const openTareas = async (user: AppUser) => {
    setTareasUsuarioNombre(user.full_name);
    setTabActiva('activas');
    setLoadingTareas(true);
    setShowTareasModal(true);

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', user.id)
      .neq('status', 'completada')
      .neq('status', 'cancelada')
      .order('created_at', { ascending: false });
    if (data) setTareasUsuario(data as Task[]);

    const { data: completadas } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', user.id)
      .eq('status', 'completada')
      .order('created_at', { ascending: false });
    if (completadas) setTareasCompletadas(completadas as Task[]);

    const { data: consultasData } = await supabase
      .from('consultas')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false });
    if (consultasData) setConsultas(consultasData);

    setLoadingTareas(false);
  };

  const handleAsignar = async () => {
    if (!selectedUser || !form.title) return;
    setSaving(true);

    await supabase.from('tasks').insert({
      title: form.title,
      description: form.description,
      priority: form.priority,
      due_date: form.due_date || null,
      monto: isAdmin ? (parseFloat(form.monto) || null) : null,
      assigned_to: selectedUser.id,
      created_by: profile?.id,
      status: 'pendiente',
    });

    await supabase.from('notifications').insert({
      user_id: selectedUser.id,
      title: 'Nueva tarea asignada',
      message: `Se te asigno la tarea: ${form.title}`,
    });

    setSaving(false);
    setSuccess(`Tarea asignada a ${selectedUser.full_name}`);
    setTimeout(() => {
      setShowAsignarModal(false);
      setSuccess('');
    }, 1500);
  };

  if (loading) return (
    <div className="p-12 text-center">
      <p className="font-mono text-sm text-muted-foreground animate-pulse">Cargando equipo...</p>
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl mb-8">Equipo de Diseñadores</h1>

      {usuarios.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="font-mono text-sm text-muted-foreground">No hay usuarios en el equipo todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usuarios.map((u) => {
            const estadoInfo = ESTADO_CONFIG[u.estado || 'desconectado'];
            return (
              <div key={u.id} className="bg-card border border-border p-6 card-inset animate-slide-in-up">
                <div className="flex items-center gap-4 mb-4">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-12 h-12 object-cover border border-border" />
                  ) : (
                    <div className="w-12 h-12 bg-muted border border-border flex items-center justify-center text-sm font-mono font-medium">
                      {u.full_name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-mono font-medium">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{ROLE_LABELS[u.role] || u.role}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(u.skills || []).map(s => (
                    <span key={s} className="border border-border px-2 py-1 text-xs font-mono">{s}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-muted-foreground font-mono">Estado:</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${estadoInfo.dotClass}`} />
                    <span className="text-xs font-mono text-muted-foreground">{estadoInfo.label}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openTareas(u)}
                    className="flex-1 py-2.5 text-sm font-display uppercase tracking-wide border-2 border-border hover:border-foreground transition-colors"
                  >
                    Ver Tareas
                  </button>
                  {isAdminOrSupervisor && (
                    <button
                      onClick={() => openAsignar(u)}
                      className="flex-1 py-2.5 text-sm font-display uppercase tracking-wide border-2 border-foreground bg-foreground text-card hover:opacity-90 transition-opacity"
                    >
                      Asignar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Ver Tareas */}
      {showTareasModal && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border w-full max-w-lg card-inset max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div>
                <h2 className="font-display text-base">Tareas</h2>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{tareasUsuarioNombre}</p>
              </div>
              <button onClick={() => setShowTareasModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="flex border-b border-border shrink-0">
                {(['activas', 'completadas', 'consultas'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTabActiva(tab)}
                    className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider transition-colors ${
                      tabActiva === tab ? 'border-b-2 border-foreground text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'activas' ? `Activas (${tareasUsuario.length})` : tab === 'completadas' ? `Completadas (${tareasCompletadas.length})` : `Consultas (${consultas.length})`}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {loadingTareas ? (
                  <p className="font-mono text-sm text-muted-foreground animate-pulse text-center py-8">Cargando...</p>
                ) : tabActiva === 'activas' ? (
                  tareasUsuario.length === 0 ? (
                    <p className="font-mono text-sm text-muted-foreground text-center py-8">No tiene tareas activas.</p>
                  ) : (
                    <div className="space-y-3">
                      {tareasUsuario.map(t => (
                        <div key={t.id} className="border border-border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-mono font-medium mb-1">{t.title}</p>
                              {t.description && <p className="text-xs font-mono text-muted-foreground mb-2">{t.description}</p>}
                              {t.due_date && (
                                <span className="text-xs font-mono text-muted-foreground">
                                  Vence: {new Date(t.due_date).toLocaleDateString('es-AR')}
                                </span>
                              )}
                            </div>
                            <span className={`text-xs font-mono shrink-0 ${STATUS_COLOR[t.status]}`}>
                              {STATUS_LABEL[t.status]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : tabActiva === 'completadas' ? (
                  tareasCompletadas.length === 0 ? (
                    <p className="font-mono text-sm text-muted-foreground text-center py-8">No tiene tareas completadas.</p>
                  ) : (
                    <div className="space-y-3">
                      {tareasCompletadas.map(t => (
                        <div key={t.id} className="border border-border p-4 opacity-75">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-mono font-medium mb-1 line-through">{t.title}</p>
                              {t.description && <p className="text-xs font-mono text-muted-foreground mb-2">{t.description}</p>}
                              <span className="text-xs font-mono text-muted-foreground">
                                {new Date(t.created_at).toLocaleDateString('es-AR')}
                              </span>
                            </div>
                            <span className="text-xs font-mono shrink-0 text-success">✓ Completada</span>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total completadas</span>
                        <span className="text-sm font-mono font-medium">{tareasCompletadas.length}</span>
                      </div>
                    </div>
                  )
                ) : (
                  consultas.length === 0 ? (
                    <p className="font-mono text-sm text-muted-foreground text-center py-8">No tiene consultas asignadas.</p>
                  ) : (
                    <div className="space-y-3">
                      {consultas.filter(c => c.estado !== 'Completada').map(c => (
                        <div key={c.id} className="border border-border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-mono font-medium mb-1">{c.cliente}</p>
                              <p className="text-xs font-mono text-muted-foreground mb-2">{c.servicio}</p>
                              {c.notas && (
                                <p className="text-xs font-mono text-muted-foreground border-l-2 border-border pl-3">{c.notas}</p>
                              )}
                            </div>
                            <span className={`text-xs font-mono shrink-0 ${c.estado === 'En Proceso' ? 'text-primary' : 'text-warning'}`}>
                              {c.estado}
                            </span>
                          </div>
                        </div>
                      ))}
                      {consultas.filter(c => c.estado === 'Completada').length > 0 && (
                        <>
                          <div className="border-t border-border pt-3 mt-1 flex items-center justify-between mb-3">
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Completadas</p>
                            <span className="text-xs font-mono font-medium">{consultas.filter(c => c.estado === 'Completada').length}</span>
                          </div>
                          {consultas.filter(c => c.estado === 'Completada').map(c => (
                            <div key={c.id} className="border border-border p-4 opacity-75">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-mono font-medium mb-1 line-through">{c.cliente}</p>
                                  <p className="text-xs font-mono text-muted-foreground">{c.servicio}</p>
                                </div>
                                <span className="text-xs font-mono shrink-0 text-success">✓ Completada</span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Tarea */}
      {showAsignarModal && selectedUser && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border w-full max-w-lg card-inset">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="font-display text-base">Asignar Tarea</h2>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">Para: {selectedUser.full_name}</p>
              </div>
              <button onClick={() => setShowAsignarModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {success ? (
              <div className="p-12 text-center">
                <p className="font-mono text-sm text-success animate-slide-in-up">✓ {success}</p>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Titulo</label>
                    <input
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                      placeholder="Nombre de la tarea"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Descripcion</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors resize-none"
                      placeholder="Detalles de la tarea..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Prioridad</label>
                      <select
                        value={form.priority}
                        onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                        className="w-full bg-card border border-border px-3 py-2.5 text-sm font-mono outline-none"
                      >
                        {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Fecha limite</label>
                      <input
                        type="date"
                        value={form.due_date}
                        onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                        className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                      />
                    </div>
                  </div>

                  {isAdmin && (
                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Precio ($)</label>
                      <input
                        type="number"
                        value={form.monto}
                        onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                        className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 p-6 pt-0">
                  <button onClick={() => setShowAsignarModal(false)} className="flex-1 py-2.5 border border-border text-sm font-mono hover:bg-accent transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={handleAsignar}
                    disabled={saving || !form.title}
                    className="flex-1 py-2.5 bg-foreground text-card text-sm font-mono hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Asignando...' : 'Asignar Tarea'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Disenadores;
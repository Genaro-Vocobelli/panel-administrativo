import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Paperclip, Download } from 'lucide-react';

const ESTADO_OPTIONS = [
  { value: 'Pendiente', color: 'text-warning border-warning/40 bg-warning/5' },
  { value: 'En Proceso', color: 'text-primary border-primary/40 bg-primary/5' },
  { value: 'Completada', color: 'text-success border-success/40 bg-success/5' },
];

const MisConsultas = () => {
  const { profile } = useAuth();
  const [consultas, setConsultas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState('todos');
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const userFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchConsultas = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('consultas')
      .select('*')
      .eq('assigned_to', profile.id)
      .order('created_at', { ascending: false });
    if (data) setConsultas(data);
    setLoading(false);
  };

  useEffect(() => { fetchConsultas(); }, [profile]);

  const handleEstadoChange = async (id: string, newEstado: string) => {
    const { error } = await supabase.from('consultas').update({ estado: newEstado }).eq('id', id);
    if (!error) {
      setConsultas(prev => prev.map(c => c.id === id ? { ...c, estado: newEstado } : c));
      if (newEstado === 'Completada') {
        const consulta = consultas.find(c => c.id === id);
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
        if (admins) {
          await Promise.all(admins.map(admin =>
            supabase.from('notifications').insert({
              user_id: admin.id,
              title: 'Consulta completada',
              message: `${profile?.full_name} completo la consulta de: ${consulta?.cliente}`,
            })
          ));
        }
      }
    }
  };

  const handleUserFileUpload = async (consultaId: string, file: File) => {
    setUploadingFile(consultaId);
    const ext = file.name.split('.').pop();
    const path = `consultas/${consultaId}/usuario_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('archivos-tareas').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('archivos-tareas').getPublicUrl(path);
      await supabase.from('consultas').update({
        archivo_usuario_url: data.publicUrl,
        archivo_usuario_nombre: file.name,
      }).eq('id', consultaId);
      await fetchConsultas();

      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins) {
        const consulta = consultas.find(c => c.id === consultaId);
        await Promise.all(admins.map(admin =>
          supabase.from('notifications').insert({
            user_id: admin.id,
            title: 'Archivo subido',
            message: `${profile?.full_name} subio un archivo en la consulta de: ${consulta?.cliente}`,
          })
        ));
      }
    }
    setUploadingFile(null);
  };

  const filtered = filterEstado === 'todos' ? consultas : consultas.filter(c => c.estado === filterEstado);
  const getEstadoStyle = (estado: string) => ESTADO_OPTIONS.find(e => e.value === estado)?.color || '';

  return (
    <div>
      <h1 className="font-display text-2xl mb-8">Mis Consultas</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['todos', 'Pendiente', 'En Proceso', 'Completada'].map(estado => (
          <button key={estado} onClick={() => setFilterEstado(estado)}
            className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
              filterEstado === estado ? 'bg-foreground text-card border-foreground' : 'border-border hover:border-foreground'
            }`}>
            {estado === 'todos' ? 'Todas' : estado}{' '}
            <span className="opacity-60">({estado === 'todos' ? consultas.length : consultas.filter(c => c.estado === estado).length})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <p className="font-mono text-sm text-muted-foreground animate-pulse">Cargando consultas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="font-mono text-sm text-muted-foreground">No tenés consultas asignadas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-card border border-border p-5 card-inset animate-slide-in-up">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 text-xs font-mono border ${getEstadoStyle(c.estado)}`}>{c.estado}</span>
                    <span className="text-xs font-mono text-muted-foreground">{new Date(c.created_at).toLocaleDateString('es-AR')}</span>
                  </div>
                  <h3 className="font-display text-sm mb-1">{c.cliente}</h3>
                  <p className="text-xs font-mono text-muted-foreground mb-2">{c.servicio}</p>
                  {c.notas && (
                    <p className="text-xs font-mono text-muted-foreground border-l-2 border-border pl-3 mt-2">{c.notas}</p>
                  )}

                  {/* Archivo de la consulta (admin) */}
                  {c.archivo_url && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Archivo de la consulta</p>
                      <a href={c.archivo_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-xs font-mono hover:bg-primary/10 transition-colors">
                        <Download size={12} strokeWidth={1.5} />
                        {c.archivo_nombre || "Ver archivo"}
                      </a>
                    </div>
                  )}

                  {/* Entrega del usuario */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Tu entrega</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {c.archivo_usuario_url && (
                        <a href={c.archivo_usuario_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-success text-success text-xs font-mono hover:bg-success/10 transition-colors">
                          <Download size={12} strokeWidth={1.5} />
                          {c.archivo_usuario_nombre || "Ver entrega"}
                        </a>
                      )}
                      <input type="file" className="hidden"
                        ref={el => userFileRefs.current[c.id] = el}
                        onChange={e => { const file = e.target.files?.[0]; if (file) handleUserFileUpload(c.id, file); }} />
                      <button onClick={() => userFileRefs.current[c.id]?.click()}
                        disabled={uploadingFile === c.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-mono hover:border-foreground transition-colors disabled:opacity-50">
                        <Paperclip size={12} strokeWidth={1.5} />
                        {uploadingFile === c.id ? 'Subiendo...' : c.archivo_usuario_url ? 'Reemplazar entrega' : 'Subir entrega'}
                      </button>
                    </div>
                  </div>
                </div>

                <select value={c.estado} onChange={e => handleEstadoChange(c.id, e.target.value)}
                  className="bg-card border border-border px-2 py-1.5 text-xs font-mono outline-none shrink-0">
                  {ESTADO_OPTIONS.map(e => <option key={e.value} value={e.value}>{e.value}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MisConsultas;
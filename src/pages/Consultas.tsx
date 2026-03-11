import { useState, useEffect, useRef } from "react";
import { Plus, X, Pencil, Trash2, Check, Paperclip, Download } from "lucide-react";
import { supabase, AppUser } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const ESTADO_OPTIONS = [
  { value: "Pendiente", color: "text-warning border-warning/40 bg-warning/5" },
  { value: "En Proceso", color: "text-primary border-primary/40 bg-primary/5" },
  { value: "Completada", color: "text-success border-success/40 bg-success/5" },
];

const emptyForm = {
  cliente: "",
  servicio: "",
  monto: "",
  estado: "Pendiente",
  assigned_to: "",
  notas: "",
};

const Consultas = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const isAdminOrSupervisor = profile?.role === "admin" || profile?.role === "supervisor";

  const [consultas, setConsultas] = useState<any[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConsulta, setEditingConsulta] = useState<any | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [search, setSearch] = useState("");
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const adminFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const newFileRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fetchConsultas = async () => {
    const { data } = await supabase
      .from("consultas")
      .select("*, assigned_user:profiles!consultas_assigned_to_fkey(full_name, avatar_url)")
      .order("created_at", { ascending: false });
    if (data) setConsultas(data);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("role", "admin")
      .eq("is_active", true)
      .order("full_name");
    if (data) setUsers(data as AppUser[]);
  };

  useEffect(() => {
    fetchConsultas();
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditingConsulta(null);
    setForm({ ...emptyForm });
    setPendingFile(null);
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditingConsulta(c);
    setForm({
      cliente: c.cliente,
      servicio: c.servicio,
      monto: c.monto?.toString() || "",
      estado: c.estado,
      assigned_to: c.assigned_to || "",
      notas: c.notas || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      cliente: form.cliente,
      servicio: form.servicio,
      monto: isAdmin ? (parseFloat(form.monto) || 0) : undefined,
      estado: form.estado,
      assigned_to: form.assigned_to || null,
      notas: form.notas,
    };

    if (editingConsulta) {
      await supabase.from("consultas").update(payload).eq("id", editingConsulta.id);
      if (payload.assigned_to && payload.assigned_to !== editingConsulta.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: payload.assigned_to,
          title: "Nueva consulta asignada",
          message: `Se te asigno la consulta de: ${payload.cliente}`,
        });
      }
    } else {
      await supabase.from("consultas").insert(payload);
      if (payload.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: payload.assigned_to,
          title: "Nueva consulta asignada",
          message: `Se te asigno la consulta de: ${payload.cliente}`,
        });
      }
    }

    if (!editingConsulta && pendingFile) {
      const { data: inserted } = await supabase
        .from("consultas")
        .select("id")
        .eq("cliente", payload.cliente)
        .eq("servicio", payload.servicio)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (inserted) await handleAdminFileUpload(inserted.id, pendingFile);
      setPendingFile(null);
    }

    await fetchConsultas();
    setShowModal(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("consultas").delete().eq("id", id);
    setConsultas((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirm(null);
  };

  const handleAdminFileUpload = async (consultaId: string, file: File) => {
    setUploadingFile(`admin-${consultaId}`);
    const ext = file.name.split(".").pop();
    const path = `consultas/${consultaId}/admin_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("archivos-tareas").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("archivos-tareas").getPublicUrl(path);
      await supabase.from("consultas").update({ archivo_url: data.publicUrl, archivo_nombre: file.name }).eq("id", consultaId);
      await fetchConsultas();
    }
    setUploadingFile(null);
  };

  const filtered = consultas
    .filter((c) => filterEstado === "todos" || c.estado === filterEstado)
    .filter((c) => search === "" || c.cliente.toLowerCase().includes(search.toLowerCase()) || c.servicio.toLowerCase().includes(search.toLowerCase()));

  const getEstadoStyle = (estado: string) => ESTADO_OPTIONS.find((e) => e.value === estado)?.color || "";

  const headers = isAdmin
    ? ["Cliente", "Servicio", "Monto", "Diseñador", "Archivos", "Fecha", "Estado", "Acciones"]
    : ["Cliente", "Servicio", "Diseñador", "Archivos", "Fecha", "Estado", "Acciones"];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl">Gestión de Consultas</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-foreground text-card text-sm font-mono hover:opacity-90 transition-opacity">
          <Plus size={16} strokeWidth={1.5} />
          Nueva Consulta
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["todos", "Pendiente", "En Proceso", "Completada"].map((estado) => (
          <button
            key={estado}
            onClick={() => setFilterEstado(estado)}
            className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
              filterEstado === estado ? "bg-foreground text-card border-foreground" : "border-border hover:border-foreground"
            }`}
          >
            {estado === "todos" ? "Todas" : estado}{" "}
            <span className="opacity-60">({estado === "todos" ? consultas.length : consultas.filter((c) => c.estado === estado).length})</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border card-inset">
        <div className="p-4 border-b border-border">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o servicio..."
            className="w-full bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <p className="font-mono text-sm text-muted-foreground animate-pulse">Cargando consultas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-mono text-sm text-muted-foreground">No hay consultas en esta categoría.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {headers.map((h) => (
                  <th key={h} className="text-left px-6 py-4 text-xs text-muted-foreground font-mono font-medium uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 animate-slide-in-up">
                  <td className="px-6 py-4 text-sm font-mono font-medium">{c.cliente}</td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{c.servicio}</td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-sm font-mono">
                      {c.monto > 0 ? `$${c.monto.toLocaleString("es-AR")}` : "-"}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{c.assigned_user?.full_name || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {c.archivo_url && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-muted-foreground w-14">Tarea:</span>
                          <a href={c.archivo_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 border border-primary text-primary text-xs font-mono hover:bg-primary/10 transition-colors">
                            <Download size={11} strokeWidth={1.5} />
                            {c.archivo_nombre || "Ver"}
                          </a>
                        </div>
                      )}
                      {c.archivo_usuario_url && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-muted-foreground w-14">Entrega:</span>
                          <a href={c.archivo_usuario_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 border border-success text-success text-xs font-mono hover:bg-success/10 transition-colors">
                            <Download size={11} strokeWidth={1.5} />
                            {c.archivo_usuario_nombre || "Ver"}
                          </a>
                        </div>
                      )}
                      {!c.archivo_url && !c.archivo_usuario_url && (
                        <span className="text-xs font-mono text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-0.5 text-xs font-mono border ${getEstadoStyle(c.estado)}`}>{c.estado}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>
                      {deleteConfirm === c.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-destructive hover:bg-destructive/10">
                            <Check size={15} strokeWidth={1.5} />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 text-muted-foreground hover:bg-accent">
                            <X size={15} strokeWidth={1.5} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 size={15} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border w-full max-w-lg card-inset max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-display text-base">{editingConsulta ? "Editar Consulta" : "Nueva Consulta"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Cliente</label>
                <input value={form.cliente} onChange={(e) => setForm((p) => ({ ...p, cliente: e.target.value }))}
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                  placeholder="@usuario o nombre" />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Servicio</label>
                <input value={form.servicio} onChange={(e) => setForm((p) => ({ ...p, servicio: e.target.value }))}
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                  placeholder="Ej: Edición de Video" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Monto ($)</label>
                    <input type="number" value={form.monto} onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))}
                      className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                      placeholder="0" />
                  </div>
                )}
                <div className={isAdmin ? "" : "col-span-2"}>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Estado</label>
                  <select value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}
                    className="w-full bg-card border border-border px-3 py-2.5 text-sm font-mono outline-none">
                    {ESTADO_OPTIONS.map((e) => <option key={e.value} value={e.value}>{e.value}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Diseñador Asignado</label>
                <select value={form.assigned_to} onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
                  className="w-full bg-card border border-border px-3 py-2.5 text-sm font-mono outline-none">
                  <option value="">Sin asignar</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Notas</label>
                <textarea value={form.notas} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
                  rows={3} className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors resize-none"
                  placeholder="Detalles adicionales..." />
              </div>

              {/* Archivo de la consulta (admin) */}
              {!editingConsulta && (
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Archivo de la consulta</label>
                  <div className="flex items-center gap-3">
                    {pendingFile && <span className="text-xs font-mono text-success">✓ {pendingFile.name}</span>}
                    <input type="file" className="hidden" ref={newFileRef} onChange={(e) => setPendingFile(e.target.files?.[0] || null)} />
                    <button type="button" onClick={() => newFileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-mono hover:border-foreground transition-colors">
                      <Paperclip size={12} strokeWidth={1.5} />
                      {pendingFile ? "Cambiar archivo" : "Subir archivo"}
                    </button>
                  </div>
                </div>
              )}

              {editingConsulta && (
                <div className="space-y-4">
                  {/* Archivo admin al editar */}
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Archivo de la consulta</label>
                    <div className="flex items-center gap-3 flex-wrap">
                      {editingConsulta.archivo_url && (
                        <a href={editingConsulta.archivo_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-xs font-mono hover:bg-primary/10 transition-colors">
                          <Download size={12} strokeWidth={1.5} />
                          {editingConsulta.archivo_nombre || "Descargar"}
                        </a>
                      )}
                      <input type="file" className="hidden"
                        ref={(el) => (adminFileRefs.current[editingConsulta.id] = el)}
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAdminFileUpload(editingConsulta.id, file); }} />
                      <button type="button" onClick={() => adminFileRefs.current[editingConsulta.id]?.click()}
                        disabled={uploadingFile === `admin-${editingConsulta.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-mono hover:border-foreground transition-colors disabled:opacity-50">
                        <Paperclip size={12} strokeWidth={1.5} />
                        {uploadingFile === `admin-${editingConsulta.id}` ? "Subiendo..." : editingConsulta.archivo_url ? "Reemplazar" : "Subir archivo"}
                      </button>
                    </div>
                  </div>

                  {/* Entrega del usuario (solo lectura en modal admin) */}
                  {editingConsulta.archivo_usuario_url && (
                    <div>
                      <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Entrega del usuario</label>
                      <a href={editingConsulta.archivo_usuario_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-success text-success text-xs font-mono hover:bg-success/10 transition-colors">
                        <Download size={12} strokeWidth={1.5} />
                        {editingConsulta.archivo_usuario_nombre || "Descargar entrega"}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-border text-sm font-mono hover:bg-accent transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.cliente || !form.servicio}
                className="flex-1 py-2.5 bg-foreground text-card text-sm font-mono hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Guardando..." : editingConsulta ? "Guardar Cambios" : "Crear Consulta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consultas;
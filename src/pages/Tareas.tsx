import { useState, useEffect, useRef } from "react";
import { Plus, X, Pencil, Trash2, Check, Paperclip, Download } from "lucide-react";
import { supabase, Task, AppUser } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente", color: "text-warning border-warning/40 bg-warning/5" },
  { value: "en_proceso", label: "En Proceso", color: "text-primary border-primary/40 bg-primary/5" },
  { value: "completada", label: "Completada", color: "text-success border-success/40 bg-success/5" },
  { value: "cancelada", label: "Cancelada", color: "text-muted-foreground border-border bg-muted" },
];

const PRIORITY_OPTIONS = [
  { value: "baja", label: "Baja", color: "text-muted-foreground" },
  { value: "media", label: "Media", color: "text-warning" },
  { value: "alta", label: "Alta", color: "text-destructive" },
];

const emptyForm = {
  title: "",
  description: "",
  status: "pendiente" as Task["status"],
  priority: "media" as Task["priority"],
  assigned_to: "",
  due_date: "",
  monto: "",
};

const Tareas = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const isAdminOrSupervisor = profile?.role === "admin" || profile?.role === "supervisor";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const userFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const adminFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const newFileRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fetchTasks = async () => {
    let query = supabase
      .from("tasks")
      .select("*, assigned_user:profiles!tasks_assigned_to_fkey(*), creator:profiles!tasks_created_by_fkey(*)")
      .order("created_at", { ascending: false });

    if (!isAdminOrSupervisor && profile) {
      query = query.eq("assigned_to", profile.id);
    }

    const { data } = await query;
    if (data) setTasks(data as Task[]);
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
    fetchTasks();
    if (isAdminOrSupervisor) fetchUsers();
  }, [profile]);

  const openCreate = () => {
    setEditingTask(null);
    setForm({ ...emptyForm });
    setPendingFile(null);
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to || "",
      due_date: task.due_date || "",
      monto: task.monto?.toString() || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      monto: isAdmin ? (parseFloat(form.monto) || null) : undefined,
    };

    if (editingTask) {
      await supabase.from("tasks").update(payload).eq("id", editingTask.id);
      if (payload.assigned_to && payload.assigned_to !== editingTask.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: payload.assigned_to,
          title: "Nueva tarea asignada",
          message: `Se te asigno la tarea: ${payload.title}`,
        });
      }
    } else {
      await supabase.from("tasks").insert({ ...payload, created_by: profile?.id });
      if (payload.assigned_to) {
        await supabase.from("notifications").insert({
          user_id: payload.assigned_to,
          title: "Nueva tarea asignada",
          message: `Se te asigno la tarea: ${payload.title}`,
        });
      }
    }

    if (!editingTask && pendingFile) {
      const { data: inserted } = await supabase
        .from("tasks")
        .select("id")
        .eq("title", payload.title)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (inserted) await handleAdminFileUpload(inserted.id, pendingFile);
      setPendingFile(null);
    }

    await fetchTasks();
    setShowModal(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeleteConfirm(null);
  };

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
    if (!error) {
      await fetchTasks();
      if (newStatus === "completada") {
        const task = tasks.find((t) => t.id === taskId);
        const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
        if (admins) {
          await Promise.all(admins.map((admin) =>
            supabase.from("notifications").insert({
              user_id: admin.id,
              title: "Tarea completada",
              message: `${profile?.full_name} completo la tarea: ${task?.title}`,
            })
          ));
        }
      }
    }
  };

  // Archivo subido por el admin (archivo_url / archivo_nombre)
  const handleAdminFileUpload = async (taskId: string, file: File) => {
    setUploadingFile(`admin-${taskId}`);
    const ext = file.name.split(".").pop();
    const path = `tareas/${taskId}/admin_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("archivos-tareas").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("archivos-tareas").getPublicUrl(path);
      await supabase.from("tasks").update({ archivo_url: data.publicUrl, archivo_nombre: file.name }).eq("id", taskId);
      await fetchTasks();
    }
    setUploadingFile(null);
  };

  // Archivo subido por el usuario (archivo_usuario_url / archivo_usuario_nombre)
  const handleUserFileUpload = async (taskId: string, file: File) => {
    setUploadingFile(`user-${taskId}`);
    const ext = file.name.split(".").pop();
    const path = `tareas/${taskId}/usuario_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("archivos-tareas").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("archivos-tareas").getPublicUrl(path);
      await supabase.from("tasks").update({ archivo_usuario_url: data.publicUrl, archivo_usuario_nombre: file.name }).eq("id", taskId);
      await fetchTasks();
      // Notificar a admins
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
      if (admins) {
        const task = tasks.find((t) => t.id === taskId);
        await Promise.all(admins.map((admin) =>
          supabase.from("notifications").insert({
            user_id: admin.id,
            title: "Archivo subido",
            message: `${profile?.full_name} subió un archivo en la tarea: ${task?.title}`,
          })
        ));
      }
    }
    setUploadingFile(null);
  };

  const filteredTasks = filterStatus === "todos" ? tasks : tasks.filter((t) => t.status === filterStatus);
  const getStatusStyle = (status: string) => STATUS_OPTIONS.find((s) => s.value === status)?.color || "";
  const getPriorityStyle = (priority: string) => PRIORITY_OPTIONS.find((p) => p.value === priority)?.color || "";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl">
          {isAdminOrSupervisor ? "Gestion de Tareas" : "Mis Tareas"}
        </h1>
        {isAdminOrSupervisor && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-card text-sm font-mono hover:opacity-90 transition-opacity"
          >
            <Plus size={16} strokeWidth={1.5} />
            Nueva Tarea
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["todos", ...STATUS_OPTIONS.map((s) => s.value)].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
              filterStatus === status ? "bg-foreground text-card border-foreground" : "border-border hover:border-foreground"
            }`}
          >
            {status === "todos" ? "Todas" : STATUS_OPTIONS.find((s) => s.value === status)?.label}{" "}
            <span className="opacity-60">
              ({status === "todos" ? tasks.length : tasks.filter((t) => t.status === status).length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <p className="font-mono text-sm text-muted-foreground animate-pulse">Cargando tareas...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="font-mono text-sm text-muted-foreground">No hay tareas en esta categoria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-card border border-border p-5 card-inset animate-slide-in-up">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">

                  {/* Header */}
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className={`text-xs font-mono font-medium ${getPriorityStyle(task.priority)}`}>
                      * {task.priority.toUpperCase()}
                    </span>
                    <span className={`inline-block px-2 py-0.5 text-xs font-mono border ${getStatusStyle(task.status)}`}>
                      {STATUS_OPTIONS.find((s) => s.value === task.status)?.label}
                    </span>
                    {task.due_date && (
                      <span className="text-xs font-mono text-muted-foreground">
                        Vence: {new Date(task.due_date).toLocaleDateString("es-AR")}
                      </span>
                    )}
                    {isAdmin && task.monto && (
                      <span className="text-xs font-mono text-muted-foreground">
                        ${task.monto.toLocaleString("es-AR")}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-sm mb-1">{task.title}</h3>
                  {task.description && (
                    <p className="text-xs font-mono text-muted-foreground">{task.description}</p>
                  )}
                  {task.assigned_user && (
                    <p className="text-xs font-mono text-muted-foreground mt-2">
                      Asignado a: <span className="text-foreground">{(task.assigned_user as AppUser).full_name}</span>
                    </p>
                  )}

                  {/* Archivo de la tarea (admin) */}
                  {(task as any).archivo_url && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Archivo de la tarea</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={(task as any).archivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-xs font-mono hover:bg-primary/10 transition-colors"
                        >
                          <Download size={12} strokeWidth={1.5} />
                          {(task as any).archivo_nombre || "Descargar"}
                        </a>
                        {/* Admin puede reemplazar su archivo */}
                        {isAdminOrSupervisor && (
                          <>
                            <input
                              type="file"
                              className="hidden"
                              ref={(el) => (adminFileRefs.current[task.id] = el)}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAdminFileUpload(task.id, file);
                              }}
                            />
                            <button
                              onClick={() => adminFileRefs.current[task.id]?.click()}
                              disabled={uploadingFile === `admin-${task.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-mono text-muted-foreground hover:border-foreground transition-colors disabled:opacity-50"
                            >
                              <Paperclip size={12} strokeWidth={1.5} />
                              {uploadingFile === `admin-${task.id}` ? "Subiendo..." : "Reemplazar"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Si admin/supervisor y no hay archivo aún, mostrar botón subir */}
                  {isAdminOrSupervisor && !(task as any).archivo_url && (
                    <div className="mt-3">
                      <input
                        type="file"
                        className="hidden"
                        ref={(el) => (adminFileRefs.current[task.id] = el)}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAdminFileUpload(task.id, file);
                        }}
                      />
                      <button
                        onClick={() => adminFileRefs.current[task.id]?.click()}
                        disabled={uploadingFile === `admin-${task.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-mono text-muted-foreground hover:border-foreground transition-colors disabled:opacity-50"
                      >
                        <Paperclip size={12} strokeWidth={1.5} />
                        {uploadingFile === `admin-${task.id}` ? "Subiendo..." : "Adjuntar archivo"}
                      </button>
                    </div>
                  )}

                  {/* Archivo del usuario */}
                  {!isAdminOrSupervisor && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Tu entrega</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(task as any).archivo_usuario_url && (
                          <a
                            href={(task as any).archivo_usuario_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-success text-success text-xs font-mono hover:bg-success/10 transition-colors"
                          >
                            <Download size={12} strokeWidth={1.5} />
                            {(task as any).archivo_usuario_nombre || "Descargar"}
                          </a>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          ref={(el) => (userFileRefs.current[task.id] = el)}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUserFileUpload(task.id, file);
                          }}
                        />
                        <button
                          onClick={() => userFileRefs.current[task.id]?.click()}
                          disabled={uploadingFile === `user-${task.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-mono hover:border-foreground transition-colors disabled:opacity-50"
                        >
                          <Paperclip size={12} strokeWidth={1.5} />
                          {uploadingFile === `user-${task.id}` ? "Subiendo..." : (task as any).archivo_usuario_url ? "Reemplazar entrega" : "Subir entrega"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Admin ve la entrega del usuario también */}
                  {isAdminOrSupervisor && (task as any).archivo_usuario_url && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Entrega del usuario</p>
                      <a
                        href={(task as any).archivo_usuario_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-success text-success text-xs font-mono hover:bg-success/10 transition-colors"
                      >
                        <Download size={12} strokeWidth={1.5} />
                        {(task as any).archivo_usuario_nombre || "Descargar entrega"}
                      </a>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 shrink-0">
                  {!isAdminOrSupervisor && (
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as Task["status"])}
                      className="bg-card border border-border px-2 py-1.5 text-xs font-mono outline-none"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_proceso">En Proceso</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  )}

                  {isAdminOrSupervisor && (
                    <>
                      <button onClick={() => openEdit(task)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>
                      {deleteConfirm === task.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(task.id)} className="p-1.5 text-destructive hover:bg-destructive/10">
                            <Check size={15} strokeWidth={1.5} />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 text-muted-foreground hover:bg-accent">
                            <X size={15} strokeWidth={1.5} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(task.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 size={15} strokeWidth={1.5} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border w-full max-w-lg card-inset max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-display text-base">
                {editingTask ? "Editar Tarea" : "Nueva Tarea"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Titulo</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                  placeholder="Nombre de la tarea"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Descripcion</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors resize-none"
                  placeholder="Detalles de la tarea..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Task["status"] }))}
                    className="w-full bg-card border border-border px-3 py-2.5 text-sm font-mono outline-none"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Prioridad</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Task["priority"] }))}
                    className="w-full bg-card border border-border px-3 py-2.5 text-sm font-mono outline-none"
                  >
                    {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Asignar a</label>
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
                  className="w-full bg-card border border-border px-3 py-2.5 text-sm font-mono outline-none"
                >
                  <option value="">Sin asignar</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Fecha limite</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                    className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Precio ($)</label>
                    <input
                      type="number"
                      value={form.monto}
                      onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))}
                      className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {!editingTask && (
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Archivo de la tarea</label>
                  <div className="flex items-center gap-3">
                    {pendingFile && <span className="text-xs font-mono text-success">✓ {pendingFile.name}</span>}
                    <input
                      type="file"
                      className="hidden"
                      ref={newFileRef}
                      onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      onClick={() => newFileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-mono hover:border-foreground transition-colors"
                    >
                      <Paperclip size={12} strokeWidth={1.5} />
                      {pendingFile ? "Cambiar archivo" : "Subir archivo"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-border text-sm font-mono hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title}
                className="flex-1 py-2.5 bg-foreground text-card text-sm font-mono hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Guardando..." : editingTask ? "Guardar Cambios" : "Crear Tarea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tareas;
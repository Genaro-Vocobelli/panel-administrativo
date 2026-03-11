import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, KeyRound } from 'lucide-react';
import { supabase, AppUser, UserRole } from '@/lib/supabase';

const SKILLS_BY_ROLE: Record<string, string[]> = {
  editor_video: ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Final Cut', 'Cinema 4D', 'Audition', 'Fusion', 'Motion'],
  disenador_grafico: ['Photoshop', 'Illustrator', 'Figma', 'InDesign', 'Blender', 'XD', 'Sketch', 'Canva'],
  programador: ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'Vue', 'Next.js', 'AWS', 'GraphQL'],
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  editor_video: 'Editor de Video',
  disenador_grafico: 'Diseñador Gráfico',
  programador: 'Programador',
};

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  role: 'editor_video' as UserRole,
  skills: [] as string[],
  is_active: true,
};

const AdminUsuarios = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [customSkill, setCustomSkill] = useState('');

  // Roles
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<string | null>(null);

  // Contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setUsers(data as AppUser[]);
    setLoading(false);
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('nombre').order('nombre');
    if (data) setRoles(['admin', ...data.map((r: any) => r.nombre)]);
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ ...emptyForm });
    setError('');
    setShowModal(true);
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setForm({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
      skills: user.skills || [],
      is_active: user.is_active,
    });
    setError('');
    setShowModal(true);
  };

  const openPassword = (user: AppUser) => {
    setPasswordUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess(false);
    setShowPasswordModal(true);
  };

  const handleSkillToggle = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setCustomSkill('');
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    if (!editingUser) {
      const { data, error: fnErr } = await supabase.functions.invoke('create-user', {
        body: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          skills: form.skills,
        },
      });

      if (fnErr || data?.error) {
        setError(fnErr?.message || data?.error || 'Error al crear usuario');
        setSaving(false);
        return;
      }
    } else {
      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          role: form.role,
          skills: form.skills,
          is_active: form.is_active,
        })
        .eq('id', editingUser.id);

      if (upErr) {
        setError(upErr.message);
        setSaving(false);
        return;
      }
    }

    await fetchUsers();
    setShowModal(false);
    setSaving(false);
  };

  const handlePasswordSave = async () => {
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contrasenas no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Minimo 8 caracteres');
      return;
    }
    setSavingPassword(true);

    const { data, error: fnErr } = await supabase.functions.invoke('update-password', {
      body: { user_id: passwordUser?.id, password: newPassword },
    });

    setSavingPassword(false);

    if (fnErr || data?.error) {
      setPasswordError(fnErr?.message || data?.error || 'Error al actualizar');
      return;
    }

    setPasswordSuccess(true);
    setTimeout(() => {
      setShowPasswordModal(false);
      setPasswordSuccess(false);
    }, 2000);
  };

  const handleDelete = async (userId: string) => {
    setDeleting(true);
    const { error } = await supabase.rpc('delete_user', { user_id: userId });
    if (!error) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
    } else {
      await supabase.from('profiles').update({ is_active: false }).eq('id', userId);
      await fetchUsers();
      setDeleteConfirm(null);
    }
    setDeleting(false);
  };

  const handleAddRole = async () => {
    const trimmed = newRoleName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!trimmed) return;
    setSavingRole(true);
    await supabase.from('roles').insert({ nombre: trimmed });
    await fetchRoles();
    setNewRoleName('');
    setSavingRole(false);
  };

  const handleDeleteRole = async (nombre: string) => {
    await supabase.from('roles').delete().eq('nombre', nombre);
    await fetchRoles();
    setDeleteRoleConfirm(null);
  };

  const roleLabel = (role: string) => ROLE_LABELS[role] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl">Gestion de Usuarios</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRolesModal(true)}
            className="px-4 py-2 border border-border text-sm font-mono hover:bg-accent transition-colors"
          >
            Gestionar Roles
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-card text-sm font-mono hover:opacity-90 transition-opacity"
          >
            <Plus size={16} strokeWidth={1.5} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="bg-card border border-border card-inset">
        {loading ? (
          <div className="p-12 text-center">
            <p className="font-mono text-sm text-muted-foreground animate-pulse">Cargando usuarios...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Usuario', 'Email', 'Rol', 'Habilidades', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-xs text-muted-foreground font-mono font-medium uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border last:border-0 animate-slide-in-up">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-8 h-8 object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 bg-muted flex items-center justify-center text-xs font-mono border border-border">
                          {u.full_name?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-mono font-medium">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 text-xs font-mono border ${
                      u.role === 'admin' ? 'border-primary bg-primary/10' : 'border-border'
                    }`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(u.skills || []).slice(0, 3).map(s => (
                        <span key={s} className="px-1.5 py-0.5 border border-border text-xs font-mono">{s}</span>
                      ))}
                      {(u.skills || []).length > 3 && (
                        <span className="text-xs font-mono text-muted-foreground">+{u.skills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-mono ${
                      u.is_active ? 'text-success' : 'text-muted-foreground'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(u)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => openPassword(u)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <KeyRound size={15} strokeWidth={1.5} />
                      </button>
                      {deleteConfirm === u.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(u.id)} disabled={deleting} className="p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50">
                            <Check size={15} strokeWidth={1.5} />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 text-muted-foreground hover:bg-accent">
                            <X size={15} strokeWidth={1.5} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(u.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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

      {/* Modal Gestionar Roles */}
      {showRolesModal && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border w-full max-w-sm card-inset">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-display text-base">Gestionar Roles</h2>
              <button onClick={() => setShowRolesModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {roles.filter(r => r !== 'admin').map(r => (
                  <div key={r} className="flex items-center justify-between px-3 py-2 border border-border">
                    <span className="text-sm font-mono">{roleLabel(r)}</span>
                    {deleteRoleConfirm === r ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDeleteRole(r)} className="p-1 text-destructive hover:bg-destructive/10">
                          <Check size={13} strokeWidth={1.5} />
                        </button>
                        <button onClick={() => setDeleteRoleConfirm(null)} className="p-1 text-muted-foreground hover:bg-accent">
                          <X size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteRoleConfirm(r)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                  placeholder="Nuevo rol..."
                  className="flex-1 bg-transparent border border-border px-3 py-2 text-sm font-mono outline-none focus:border-foreground transition-colors"
                />
                <button
                  onClick={handleAddRole}
                  disabled={savingRole || !newRoleName.trim()}
                  className="px-4 py-2 bg-foreground text-card text-sm font-mono hover:opacity-90 disabled:opacity-50"
                >
                  <Plus size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar/Crear */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border w-full max-w-lg card-inset max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-display text-base">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Nombre Completo</label>
                <input
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                  placeholder="Ana Lopez"
                />
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                      placeholder="ana@neuz.studio"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Contrasena Inicial</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                      placeholder="Minimo 8 caracteres"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Rol</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value, skills: [] }))}
                  className="w-full bg-card border border-border px-3 py-2.5 text-sm font-mono outline-none"
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{roleLabel(r)}</option>
                  ))}
                </select>
              </div>

              {form.role !== 'admin' && (
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Habilidades</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(SKILLS_BY_ROLE[form.role] || []).map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleSkillToggle(skill)}
                        className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
                          form.skills.includes(skill)
                            ? 'bg-foreground text-card border-foreground'
                            : 'border-border hover:border-foreground'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={customSkill}
                      onChange={e => setCustomSkill(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomSkill()}
                      placeholder="Agregar habilidad personalizada..."
                      className="flex-1 bg-transparent border border-border px-3 py-2 text-sm font-mono outline-none focus:border-foreground transition-colors"
                    />
                    <button onClick={addCustomSkill} className="px-3 py-2 border border-border hover:bg-accent transition-colors text-sm font-mono">+</button>
                  </div>
                </div>
              )}

              {editingUser && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Estado:</label>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
                      form.is_active ? 'border-success text-success bg-success/10' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {form.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              )}

              {error && (
                <p className="text-xs font-mono text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-border text-sm font-mono hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-foreground text-card text-sm font-mono hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambiar Contrasena */}
      {showPasswordModal && passwordUser && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border w-full max-w-sm card-inset">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="font-display text-base">Cambiar Contrasena</h2>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{passwordUser.full_name}</p>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6">
              {passwordSuccess ? (
                <p className="text-sm font-mono text-success text-center py-4">✓ Contrasena actualizada</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Nueva Contrasena</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                      placeholder="Minimo 8 caracteres"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Confirmar Contrasena</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                      placeholder="Repetir contrasena"
                    />
                  </div>

                  {passwordError && (
                    <p className="text-xs font-mono text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2">
                      {passwordError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 border border-border text-sm font-mono hover:bg-accent transition-colors">
                      Cancelar
                    </button>
                    <button
                      onClick={handlePasswordSave}
                      disabled={savingPassword || !newPassword || !confirmPassword}
                      className="flex-1 py-2.5 bg-foreground text-card text-sm font-mono hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {savingPassword ? 'Guardando...' : 'Actualizar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios;
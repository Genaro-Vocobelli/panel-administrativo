import { useState, useRef } from 'react';
import { Camera, X, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const SKILLS_BY_ROLE: Record<string, string[]> = {
  editor_video: ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Final Cut', 'Cinema 4D', 'Audition', 'Fusion', 'Motion'],
  disenador_grafico: ['Photoshop', 'Illustrator', 'Figma', 'InDesign', 'Blender', 'XD', 'Sketch', 'Canva'],
  programador: ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'Vue', 'Next.js', 'AWS', 'GraphQL'],
  admin: [],
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  editor_video: 'Editor de Video',
  disenador_grafico: 'Diseñador Gráfico',
  programador: 'Programador',
};

const ESTADO_OPTIONS = [
  { value: 'disponible', label: 'Disponible', color: 'border-success text-success bg-success/10' },
  { value: 'ocupado', label: 'Ocupado', color: 'border-warning text-warning bg-warning/10' },
  { value: 'desconectado', label: 'Desconectado', color: 'border-border text-muted-foreground' },
];

const Perfil = () => {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [estado, setEstado] = useState<'disponible' | 'ocupado' | 'desconectado'>(profile?.estado || 'disponible');
  const [customSkill, setCustomSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cambio de contraseña
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  if (!profile) return null;

  const suggestedSkills = SKILLS_BY_ROLE[profile.role] || [];

  const toggleSkill = (skill: string) => {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills(prev => [...prev, trimmed]);
    }
    setCustomSkill('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);

    const ext = file.name.split('.').pop();
    const path = `avatars/${profile.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (!uploadErr) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
      await refreshProfile();
    }
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ full_name: fullName, skills, estado })
      .eq('id', profile.id);
    await refreshProfile();
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contrasenas no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La contrasena debe tener al menos 8 caracteres');
      return;
    }
    setSavingPassword(true);

    // Primero verificamos la contrasena actual
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });

    if (signInErr) {
      setPasswordError('La contrasena actual es incorrecta');
      setSavingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPassword(false);
      }, 3000);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl mb-8">Mi Perfil</h1>

      <div className="bg-card border border-border p-8 card-inset space-y-8">
        {/* Avatar */}
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-20 h-20 object-cover border border-border" />
            ) : (
              <div className="w-20 h-20 bg-muted border border-border flex items-center justify-center text-xl font-mono font-medium">
                {profile.full_name?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-2 -right-2 w-7 h-7 bg-foreground text-card flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              <Camera size={13} strokeWidth={1.5} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div>
            <p className="font-mono text-sm font-medium">{profile.full_name}</p>
            <p className="font-mono text-xs text-muted-foreground">{profile.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 border border-border text-xs font-mono">
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
            Nombre Completo
          </label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
          />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
            Mi Estado
          </label>
          <div className="flex gap-2">
            {ESTADO_OPTIONS.map(op => (
              <button
                key={op.value}
                type="button"
                onClick={() => setEstado(op.value)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-mono border transition-colors ${
                  estado === op.value ? op.color : 'border-border text-muted-foreground hover:border-foreground'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  op.value === 'disponible' ? 'bg-success' :
                  op.value === 'ocupado' ? 'bg-warning' : 'bg-muted-foreground'
                }`} />
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Habilidades */}
        {profile.role !== 'admin' && (
          <div>
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
              Habilidades
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {suggestedSkills.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
                    skills.includes(skill)
                      ? 'bg-foreground text-card border-foreground'
                      : 'border-border hover:border-foreground'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>

            <div className="mb-3">
              {skills.filter(s => !suggestedSkills.includes(s)).map(s => (
                <span key={s} className="inline-flex items-center gap-1 mr-2 mb-2 px-2 py-1 bg-foreground text-card text-xs font-mono">
                  {s}
                  <button onClick={() => toggleSkill(s)}><X size={10} strokeWidth={2} /></button>
                </span>
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
              <button onClick={addCustomSkill} className="px-3 py-2 border border-border hover:bg-accent transition-colors">
                <Plus size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* Guardar */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-foreground text-card text-sm font-mono hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          {success && (
            <span className="text-xs font-mono text-success animate-slide-in-up">✓ Cambios guardados</span>
          )}
        </div>
      </div>

      {/* Cambiar Contrasena */}
      <div className="bg-card border border-border p-8 card-inset mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-base">Cambiar Contrasena</h2>
          <button
            onClick={() => { setShowPassword(!showPassword); setPasswordError(''); }}
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? 'Cancelar' : 'Cambiar'}
          </button>
        </div>

        {showPassword && (
          <div className="space-y-4">
            {passwordSuccess ? (
              <p className="text-xs font-mono text-success">✓ Contrasena actualizada correctamente</p>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Contrasena Actual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                    placeholder="••••••••"
                  />
                </div>
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

                <button
                  onClick={handlePasswordChange}
                  disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full py-2.5 bg-foreground text-card text-sm font-mono hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingPassword ? 'Guardando...' : 'Actualizar Contrasena'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Perfil;
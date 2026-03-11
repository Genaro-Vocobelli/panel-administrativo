import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const ActualizarPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase maneja el token de reset automaticamente via la URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Listo para actualizar
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="font-display text-4xl tracking-tight mb-1">NEUZ</h1>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Studio Panel</p>
        </div>

        <div className="bg-card border border-border p-8 card-inset">
          <h2 className="font-display text-lg mb-2">Nueva Contrasena</h2>
          <p className="text-xs font-mono text-muted-foreground mb-6">Ingresa tu nueva contrasena.</p>

          {success ? (
            <div className="text-center py-4">
              <p className="text-sm font-mono text-success mb-2">✓ Contrasena actualizada</p>
              <p className="text-xs font-mono text-muted-foreground">Redirigiendo al login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Nueva Contrasena</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                  placeholder="Minimo 8 caracteres"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Confirmar Contrasena</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                  placeholder="Repetir contrasena"
                />
              </div>

              {error && (
                <p className="text-xs font-mono text-destructive border border-destructive/30 bg-destructive/5 px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-foreground text-card py-3 text-sm font-display uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Actualizar Contrasena'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActualizarPassword;
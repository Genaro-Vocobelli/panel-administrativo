import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError("Email o contraseña incorrectos");
    } else {
      navigate("/");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    });
    setResetLoading(false);
    if (!error) {
      setResetSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="font-display text-4xl tracking-tight mb-1">Panel</h1>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            Administrativo
          </p>
        </div>

        {!showReset ? (
          <div className="bg-card border border-border p-8 card-inset">
            <h2 className="font-display text-lg mb-6">Iniciar Sesion</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                  placeholder="usuario@panel.administrativo"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Contrasena
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                  placeholder="••••••••"
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
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="w-full text-xs font-mono text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Olvide mi contrasena
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-card border border-border p-8 card-inset">
            <h2 className="font-display text-lg mb-2">Recuperar Contrasena</h2>
            <p className="text-xs font-mono text-muted-foreground mb-6">
              Te vamos a mandar un link para resetear tu contrasena.
            </p>

            {resetSent ? (
              <div className="text-center py-4">
                <p className="text-sm font-mono text-success mb-4">
                  ✓ Link enviado a {resetEmail}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  Revisa tu email y seguí las instrucciones.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full bg-transparent border border-border px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                    placeholder="usuario@neuz.studio"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-foreground text-card py-3 text-sm font-display uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {resetLoading ? "Enviando..." : "Enviar Link"}
                </button>
              </form>
            )}

            <button
              onClick={() => {
                setShowReset(false);
                setResetSent(false);
                setResetEmail("");
              }}
              className="mt-4 w-full text-xs font-mono text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Volver al login
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs font-mono text-muted-foreground">
          Sin cuenta? Contacta al administrador.
        </p>
      </div>
    </div>
  );
};

export default Login;

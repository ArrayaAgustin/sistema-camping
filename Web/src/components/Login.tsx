import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, isLoading, user } = useAuth();

  const resolveLandingRoute = () => {
    const roles = user?.roles || [];
    if (roles.includes('admin')) return '/admin';
    if (roles.includes('operador')) return '/operador';
    return '/perfil';
  };

  if (isAuthenticated) return <Navigate to={resolveLandingRoute()} replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    }
  };

  return (
    <div className="flex min-h-screen bg-white">

      {/* Panel izquierdo — branding (solo desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary-700 via-primary-600 to-blue-500 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 font-bold text-white text-sm">
            SA
          </div>
          <span className="font-semibold text-white/90">SMATA Córdoba</span>
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-white/60">Sistema de Camping</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-tight">
            Bienvenido<br />al sistema
          </h1>
          <p className="mt-4 max-w-xs text-base text-white/70 leading-relaxed">
            Gestioná ingresos, consultá campings disponibles y accedé a tu carnet digital de afiliado.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg">
            🔒
          </div>
          <p className="text-sm text-white/80">
            Acceso seguro con credenciales institucionales del Sindicato SMATA Córdoba.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex w-full flex-col lg:w-1/2">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Link to="/" className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Volver
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">SA</div>
            <span className="text-sm font-semibold text-slate-700">SMATA Córdoba</span>
          </div>
          <span className="w-12" />
        </div>

        {/* Form container */}
        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-12">
          <div className="w-full max-w-sm">

            {/* Desktop back link */}
            <Link to="/" className="hidden lg:inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-8">
              ← Inicio
            </Link>

            <div className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Iniciar sesión</h2>
              <p className="mt-2 text-sm text-slate-500">Ingresá con tu DNI y contraseña.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* DNI */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  DNI
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="12345678"
                  required
                  autoComplete="username"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-60"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  Contraseña
                </label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-primary-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-100">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    tabIndex={-1}
                    className="px-4 text-xs font-medium text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <span className="mt-0.5 shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !username.trim() || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-200 transition hover:bg-primary-700 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Ingresando...
                  </>
                ) : (
                  <>Ingresar <span className="text-white/70">→</span></>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-400">
              Plataforma institucional · Sindicato SMATA Córdoba
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

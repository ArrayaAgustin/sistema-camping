import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services';

const CambiarContrasena: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rules = {
    length: newPassword.length >= 6,
    letter: /[a-zA-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };
  const rulesOk = rules.length && rules.letter && rules.number;
  const match = newPassword === confirm && confirm.length > 0;
  const canSubmit = rulesOk && match && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!rulesOk) {
      setError('La contraseña no cumple los requisitos.');
      return;
    }
    if (!match) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      // currentPassword can be empty string - backend skips check when must_change_password=true
      await authService.changePassword('', newPassword) as any;
      updateUser({ must_change_password: false });
      // Redirigir según el rol
      const roles = user?.roles ?? [];
      if (roles.includes('admin')) navigate('/admin', { replace: true });
      else if (roles.includes('operador')) navigate('/operador', { replace: true });
      else navigate('/perfil', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60">
          {/* Icono */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
              🔑
            </div>
          </div>

          <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            Cambiar contraseña
          </h1>
          <p className="mt-2 text-center text-sm text-slate-500">
            Por seguridad debés establecer una nueva contraseña antes de continuar.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Nueva contraseña */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nueva contraseña
              </label>
              <div className="mt-1.5 flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={loading}
                  className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(p => !p)}
                  className="px-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  {showNew ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Confirmar contraseña
              </label>
              <div className="mt-1.5 flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repetí la contraseña"
                  required
                  disabled={loading}
                  className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  className="px-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {/* Requisitos en tiempo real */}
            {newPassword.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Requisitos</p>
                {[
                  { ok: rules.length, label: 'Mínimo 6 caracteres' },
                  { ok: rules.letter, label: 'Al menos una letra' },
                  { ok: rules.number, label: 'Al menos un número' },
                ].map(r => (
                  <p key={r.label} className={`flex items-center gap-2 text-xs font-medium ${r.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${r.ok ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                      {r.ok ? '✓' : '·'}
                    </span>
                    {r.label}
                  </p>
                ))}
              </div>
            )}

            {/* Coincidencia */}
            {confirm.length > 0 && (
              <p className={`flex items-center gap-1.5 text-xs font-medium ${match ? 'text-emerald-600' : 'text-rose-500'}`}>
                <span>{match ? '✓' : '✗'}</span>
                {match ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
              </p>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-200 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Guardando...</>
              ) : 'Establecer nueva contraseña →'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          ¿No sos vos?{' '}
          <button type="button" onClick={logout} className="font-semibold text-slate-500 hover:text-slate-700 underline">
            Cerrar sesión
          </button>
        </p>
      </div>
    </div>
  );
};

export default CambiarContrasena;

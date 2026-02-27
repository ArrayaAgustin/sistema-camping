import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/user.service';

interface PersonaData {
  id: number;
  dni: string;
  apellido: string | null;
  nombres: string | null;
  nombre_completo: string | null;
  email?: string | null;
  telefono?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;
  qr_code: string;
  afiliado?: {
    id: number;
    cuil: string;
    tipo_afiliado?: string | null;
    categoria?: string | null;
    situacion_sindicato: string;
    situacion_obra_social: string;
    activo: boolean;
    grupo_sanguineo?: string | null;
    empresa_nombre?: string | null;
  } | null;
  invitado?: {
    vigente_desde: string | null;
    vigente_hasta: string | null;
    activo: boolean | null;
  } | null;
  es_familiar_de?: Array<{
    id: number;
    afiliado_id: number;
    activo: boolean | null;
    afiliado_titular?: {
      persona?: {
        nombre_completo?: string | null;
        apellido?: string | null;
        nombres?: string | null;
        dni: string;
      } | null;
    } | null;
  }>;
}

function mapFullResult(full: any): PersonaData | null {
  const p = full?.persona;
  if (!p?.id) return null;
  return {
    ...p,
    afiliado: full.afiliado ?? null,
    invitado: full.invitado ?? null,
    es_familiar_de: full.es_familiar_de ?? [],
  };
}

const PerfilUsuario: React.FC = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    setLoading(true);
    setError(null);

    userService.getMyPersona()
      .then((res: any) => {
        const full = res?.data ?? res;
        const mapped = mapFullResult(full);
        if (mapped) {
          setPersona(mapped);
        } else {
          setError('Tu cuenta no tiene una persona asociada.');
        }
      })
      .catch(() => setError('No se pudieron cargar los datos.'))
      .finally(() => setLoading(false));
  }, [user?.id, authLoading]);

  const nombreMostrar =
    persona?.nombre_completo ||
    `${persona?.apellido ?? ''} ${persona?.nombres ?? ''}`.trim() ||
    user?.username || '—';

  const iniciales = nombreMostrar
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';

  const rolLabel = (): string => {
    const roles = user?.roles ?? [];
    if (roles.includes('admin')) return 'Administrador';
    if (roles.includes('operador')) return 'Operador';
    if (roles.includes('afiliado')) return 'Afiliado';
    return 'Usuario';
  };

  const afiliadoActivo =
    persona?.afiliado?.activo && persona.afiliado.situacion_sindicato === 'ACTIVO';

  const invitadoVigente =
    persona?.invitado?.activo &&
    (!persona.invitado.vigente_hasta ||
      new Date(persona.invitado.vigente_hasta) >= new Date());

  const esFamiliar = (persona?.es_familiar_de ?? []).some(f => f.activo);

  const qrMiniUrl = persona?.qr_code
    ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&margin=2&data=${encodeURIComponent(persona.qr_code)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
            {authLoading || loading ? '…' : iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Mi perfil</p>
            <p className="truncate text-sm font-semibold leading-tight">
              {authLoading || loading ? 'Cargando...' : nombreMostrar}
            </p>
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4 sm:px-6 space-y-4">

        {/* Estado de membresía */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          {authLoading || loading ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-36 rounded bg-slate-100 animate-pulse" />
                <div className="h-3 w-52 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          ) : afiliadoActivo ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-lg font-bold">✓</div>
              <div className="flex-1">
                <p className="font-semibold">Afiliado activo</p>
                <p className="text-sm text-slate-500">
                  Sindicato: <span className="text-emerald-600 font-medium">ACTIVO</span>
                  {' · '}
                  Obra social: <span className={`font-medium ${persona?.afiliado?.situacion_obra_social === 'ACTIVO' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {persona?.afiliado?.situacion_obra_social}
                  </span>
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Activo</span>
            </div>
          ) : persona?.afiliado ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 text-lg font-bold">✕</div>
              <div className="flex-1">
                <p className="font-semibold">Afiliado inactivo</p>
                <p className="text-sm text-slate-500">
                  Sindicato: <span className="text-red-500 font-medium">{persona.afiliado.situacion_sindicato}</span>
                </p>
              </div>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">Inactivo</span>
            </div>
          ) : invitadoVigente ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl">🎟</div>
              <div className="flex-1">
                <p className="font-semibold">Invitado</p>
                {persona?.invitado?.vigente_hasta && (
                  <p className="text-sm text-slate-500">
                    Válido hasta {new Date(persona.invitado.vigente_hasta).toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">Vigente</span>
            </div>
          ) : esFamiliar ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xl">👨‍👩‍👦</div>
              <div className="flex-1">
                <p className="font-semibold">Familiar de afiliado</p>
                <p className="text-sm text-slate-500">Integrante de grupo familiar</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xl">👤</div>
              <div className="flex-1">
                <p className="font-semibold">{rolLabel()}</p>
                <p className="text-sm text-slate-500">{user?.email ?? user?.username}</p>
              </div>
            </div>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {error}
          </div>
        )}

        {/* Mini carnet */}
        {!loading && !error && (
          <section>
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-blue-700 text-white shadow-xl">
              <div className="flex items-start justify-between px-5 pt-5 pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/60">Sistema de Camping</p>
                  <p className="text-xl font-bold">Carnet Digital</p>
                </div>
                <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
                  {rolLabel()}
                </span>
              </div>

              <div className="flex items-end justify-between gap-3 px-5 pb-5">
                <div className="space-y-1 min-w-0">
                  <p className="text-base font-bold leading-tight truncate">{nombreMostrar}</p>
                  {persona?.dni && (
                    <p className="text-sm text-white/80">DNI: {persona.dni}</p>
                  )}
                  {persona?.afiliado?.cuil && (
                    <p className="text-sm text-white/80">CUIL: {persona.afiliado.cuil}</p>
                  )}
                  {!persona && (
                    <p className="text-sm text-white/70">{user?.username}</p>
                  )}
                </div>
                <div className="shrink-0 rounded-xl bg-white p-2 shadow">
                  {qrMiniUrl ? (
                    <img src={qrMiniUrl} alt="QR" className="h-16 w-16 rounded" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100 text-slate-400 text-xs">
                      QR
                    </div>
                  )}
                </div>
              </div>

              <Link
                to="/credencial"
                className="flex w-full items-center justify-center gap-2 border-t border-white/10 bg-white/10 py-3 text-sm font-semibold hover:bg-white/15"
              >
                Ver carnet completo →
              </Link>
            </div>
          </section>
        )}

        {/* Datos personales */}
        {!loading && persona && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">Datos personales</h2>
            <div className="grid gap-2.5 text-sm sm:grid-cols-2">
              <Row label="DNI" value={persona.dni} />
              {persona.afiliado?.cuil && <Row label="CUIL" value={persona.afiliado.cuil} />}
              {persona.email && <Row label="Email" value={persona.email} className="sm:col-span-2" />}
              {persona.telefono && <Row label="Teléfono" value={persona.telefono} />}
              {persona.sexo && <Row label="Sexo" value={persona.sexo} />}
              {persona.fecha_nacimiento && (
                <Row
                  label="Fecha nacimiento"
                  value={new Date(persona.fecha_nacimiento).toLocaleDateString('es-AR')}
                />
              )}
              {persona.afiliado?.tipo_afiliado && <Row label="Tipo afiliado" value={persona.afiliado.tipo_afiliado} />}
              {persona.afiliado?.categoria && <Row label="Categoría" value={persona.afiliado.categoria} />}
              {persona.afiliado?.empresa_nombre && (
                <Row label="Empresa" value={persona.afiliado.empresa_nombre} className="sm:col-span-2" />
              )}
              {persona.afiliado?.grupo_sanguineo && (
                <Row label="Grupo sanguíneo" value={persona.afiliado.grupo_sanguineo} highlight />
              )}
            </div>
          </section>
        )}

        {/* Familiar de */}
        {!loading && (persona?.es_familiar_de ?? []).length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">Grupo familiar</h2>
            <div className="space-y-2">
              {persona!.es_familiar_de!.map(rel => {
                const titular = rel.afiliado_titular?.persona;
                const nombreTitular = titular?.nombre_completo ||
                  `${titular?.apellido ?? ''} ${titular?.nombres ?? ''}`.trim() ||
                  `DNI ${titular?.dni ?? '—'}`;
                return (
                  <div key={rel.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                    <span>👥</span>
                    <span className="font-semibold text-slate-800 flex-1">{nombreTitular}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${rel.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'}`}>
                      {rel.activo ? 'Activo' : 'Baja'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Invitado */}
        {!loading && persona?.invitado?.activo && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="font-semibold text-blue-800 text-sm">Acceso por invitación</p>
            {persona.invitado.vigente_desde && (
              <p className="text-sm text-blue-600 mt-1">
                {new Date(persona.invitado.vigente_desde).toLocaleDateString('es-AR')}
                {persona.invitado.vigente_hasta &&
                  ` → ${new Date(persona.invitado.vigente_hasta).toLocaleDateString('es-AR')}`}
              </p>
            )}
          </section>
        )}

        {/* Acciones */}
        <section className="grid gap-3 sm:grid-cols-2 pt-2">
          <Link
            to="/credencial"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-700"
          >
            Ver carnet completo
          </Link>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </section>
      </main>
    </div>
  );
};

// Componente auxiliar para filas de datos
const Row: React.FC<{
  label: string;
  value: string;
  className?: string;
  highlight?: boolean;
}> = ({ label, value, className = '', highlight }) => (
  <div className={`flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ${className}`}>
    <span className="text-slate-500">{label}</span>
    <span className={`font-semibold text-right ${highlight ? 'text-red-600' : 'text-slate-800'}`}>{value}</span>
  </div>
);

export default PerfilUsuario;

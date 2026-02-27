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
  sexo?: string | null;
  fecha_nacimiento?: string | null;
  email?: string | null;
  telefono?: string | null;
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
    foto_url?: string | null;
    empresa_nombre?: string | null;
    empresa_cuit?: string | null;
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
      persona?: { nombre_completo?: string | null; apellido?: string | null; nombres?: string | null; dni: string } | null;
    } | null;
  }>;
}

// Mapea IPersonaFullResult { persona, afiliado, invitado, ... } → PersonaData plana
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

const CredencialDigital: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Esperar a que la auth esté lista
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
          setError('Tu cuenta no tiene una persona asociada. Contactá al administrador.');
        }
      })
      .catch((err: any) => {
        const msg = err?.details?.message || err?.message || '';
        if (msg.includes('persona asociada') || err?.status === 404) {
          setError('Tu cuenta no tiene una persona asociada. Contactá al administrador.');
        } else if (err?.status === 401) {
          setError('Sesión expirada. Volvé a iniciar sesión.');
        } else {
          setError('Error al cargar el carnet. Intentá recargar la página.');
        }
      })
      .finally(() => setLoading(false));
  }, [user?.id, authLoading]);

  const nombreMostrar =
    persona?.nombre_completo ||
    `${persona?.apellido ?? ''} ${persona?.nombres ?? ''}`.trim() ||
    user?.username || '—';

  const getTipoLabel = (): string => {
    if (persona?.afiliado?.activo && persona.afiliado.situacion_sindicato === 'ACTIVO') return 'Afiliado';
    if (persona?.afiliado?.activo) return 'Afiliado';
    if (persona?.invitado?.activo) return 'Invitado';
    if ((persona?.es_familiar_de ?? []).some(f => f.activo)) return 'Familiar';
    const roles = user?.roles ?? [];
    if (roles.includes('admin')) return 'Administrador';
    if (roles.includes('operador')) return 'Operador';
    return 'Usuario';
  };

  const isQrValid = (qr: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qr) ||
    qr.length > 10;

  const qrImageUrl = persona?.qr_code && isQrValid(persona.qr_code)
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=4&data=${encodeURIComponent(persona.qr_code)}`
    : null;

  const handlePrint = () => window.print();

  const handleDownloadQR = async () => {
    if (!qrImageUrl) return;
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${persona?.dni ?? 'carnet'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(qrImageUrl, '_blank');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="flex items-center justify-between bg-white border-b border-slate-200 px-4 py-4 sm:px-6">
          <Link to="/perfil" className="rounded-full p-2 text-slate-600 hover:bg-slate-100">←</Link>
          <h1 className="text-lg font-semibold">Carnet Digital</h1>
          <span className="w-10" />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            <p className="mt-4 text-slate-500">Cargando carnet...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="flex items-center justify-between bg-white border-b border-slate-200 px-4 py-4 sm:px-6">
          <Link to="/perfil" className="rounded-full p-2 text-slate-600 hover:bg-slate-100">←</Link>
          <h1 className="text-lg font-semibold">Carnet Digital</h1>
          <span className="w-10" />
        </header>
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="mx-auto mb-4 text-4xl">⚠️</div>
            <p className="font-semibold text-red-800">No se pudo cargar el carnet</p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); userService.getMyPersona().then((res: any) => { const full = res?.data ?? res; const mapped = mapFullResult(full); if (mapped) setPersona(mapped); else setError('Sin datos.'); }).catch(() => setError('Error al cargar.')).finally(() => setLoading(false)); }}
              className="mt-6 rounded-xl bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          #carnet-print {
            max-width: 400px;
            margin: 0 auto;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-slate-100">
        {/* Header */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sm:px-6">
          <Link to="/perfil" className="rounded-full p-2 text-slate-600 hover:bg-slate-100 text-lg">←</Link>
          <h1 className="text-base font-semibold">Carnet Digital</h1>
          <button
            onClick={handlePrint}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Imprimir
          </button>
        </header>

        <main className="mx-auto max-w-md px-4 py-6 sm:px-6">
          {/* ====== CARNET ====== */}
          <div
            id="carnet-print"
            className="overflow-hidden rounded-3xl shadow-2xl"
          >
            {/* Banda superior */}
            <div className="bg-gradient-to-r from-primary-700 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/70">Sistema de Camping</p>
                <p className="text-base font-bold text-white">Carnet Digital</p>
              </div>
              <span className="rounded-full bg-white/20 border border-white/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                {getTipoLabel()}
              </span>
            </div>

            {/* Cuerpo del carnet */}
            <div className="bg-white px-6 py-5 space-y-4">
              {/* Foto + Nombre */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 border border-slate-200">
                  {persona?.afiliado?.foto_url ? (
                    <img
                      src={persona.afiliado.foto_url}
                      alt="Foto"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300">
                      👤
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-slate-900 leading-tight truncate">{nombreMostrar}</p>
                  <div className="mt-1 space-y-0.5 text-sm text-slate-500">
                    <p>DNI: <span className="font-semibold text-slate-700">{persona?.dni ?? '—'}</span></p>
                    {persona?.afiliado?.cuil && (
                      <p>CUIL: <span className="font-semibold text-slate-700">{persona.afiliado.cuil}</span></p>
                    )}
                    {persona?.fecha_nacimiento && (
                      <p>Nac: <span className="font-semibold text-slate-700">
                        {new Date(persona.fecha_nacimiento).toLocaleDateString('es-AR')}
                      </span></p>
                    )}
                  </div>
                </div>
              </div>

              {/* Estados */}
              {(persona?.afiliado || persona?.invitado) && (
                <div className="grid grid-cols-2 gap-2">
                  {persona?.afiliado && (
                    <div className={`rounded-xl px-3 py-2 text-center text-xs ${persona.afiliado.situacion_sindicato === 'ACTIVO' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide">Sindicato</p>
                      <p className={`font-bold ${persona.afiliado.situacion_sindicato === 'ACTIVO' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {persona.afiliado.situacion_sindicato}
                      </p>
                    </div>
                  )}
                  {persona?.afiliado && (
                    <div className={`rounded-xl px-3 py-2 text-center text-xs ${persona.afiliado.situacion_obra_social === 'ACTIVO' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide">Obra Social</p>
                      <p className={`font-bold ${persona.afiliado.situacion_obra_social === 'ACTIVO' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {persona.afiliado.situacion_obra_social}
                      </p>
                    </div>
                  )}
                  {persona?.invitado?.activo && (
                    <div className="col-span-2 rounded-xl bg-blue-50 px-3 py-2 text-center text-xs">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide">Invitado hasta</p>
                      <p className="font-bold text-blue-600">
                        {persona.invitado.vigente_hasta
                          ? new Date(persona.invitado.vigente_hasta).toLocaleDateString('es-AR')
                          : 'Vigente'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* QR Code */}
              <div className="flex flex-col items-center rounded-2xl bg-slate-50 p-4">
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="Código QR de acceso al camping"
                    className="h-52 w-52 rounded-xl"
                  />
                ) : (
                  <div className="flex h-52 w-52 flex-col items-center justify-center rounded-xl bg-slate-200 text-slate-400">
                    <span className="text-4xl">⬛</span>
                    <span className="mt-2 text-xs">QR no disponible</span>
                  </div>
                )}
                <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-400">
                  Acceso a camping · Escanear al ingresar
                </p>
                {persona?.qr_code && (
                  <p className="mt-1 font-mono text-[9px] text-slate-300 truncate max-w-[200px]">
                    {persona.qr_code}
                  </p>
                )}
              </div>

              {/* Empresa / Grupo sanguíneo */}
              {(persona?.afiliado?.empresa_nombre || persona?.afiliado?.grupo_sanguineo) && (
                <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                  {persona?.afiliado?.empresa_nombre && (
                    <span>Empresa: <span className="font-semibold text-slate-700">{persona.afiliado.empresa_nombre}</span></span>
                  )}
                  {persona?.afiliado?.grupo_sanguineo && (
                    <span>Gr. sang.: <span className="font-bold text-red-600">{persona.afiliado.grupo_sanguineo}</span></span>
                  )}
                </div>
              )}
            </div>

            {/* Footer del carnet */}
            <div className="bg-slate-800 px-6 py-3 text-center text-[10px] uppercase tracking-wide text-slate-400">
              Presentar DNI físico para validar identidad · Personal e intransferible
            </div>
          </div>

          {/* Acciones */}
          <div className="no-print mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              🖨️ Imprimir
            </button>
            {qrImageUrl && (
              <button
                onClick={handleDownloadQR}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Descargar QR
              </button>
            )}
          </div>

          <p className="no-print mt-4 text-center text-xs text-slate-400">
            El código QR identifica a esta persona de forma permanente.<br />
            Solo cambia si se solicita explícitamente.
          </p>
        </main>
      </div>
    </>
  );
};

export default CredencialDigital;

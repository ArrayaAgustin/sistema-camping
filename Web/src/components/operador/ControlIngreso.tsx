import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import { useAuth } from '../../contexts/AuthContext';
import { operadorService } from '../../services/operador.service';
import { campingsService, type CampingData } from '../../services/campings.service';

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface FamiliarItem {
  id: number;
  persona_id: number;
  dni: string;
  nombre_completo: string;
  activo: boolean | null;
  baja: boolean | null;
}

interface ResolveResult {
  persona: {
    id: number;
    dni: string;
    apellido: string | null;
    nombres: string | null;
    nombre_completo: string;
    qr_code: string | null;
  };
  tipos: string[];
  allowed: boolean;
  reason?: string;
  afiliado?: { id: number; situacion_sindicato: string | null; activo: boolean | null };
  familiaresDelTitular?: FamiliarItem[];
}

interface PeriodoActivo {
  id: number;
  total_visitas: number;
  fecha_apertura: string;
  camping?: { id: number; nombre: string };
}

interface VisitaRow {
  id: number;
  fecha_ingreso: string;
  condicion_ingreso: string;
  persona: { id: number; dni: string; apellido: string; nombres: string; nombre_completo: string } | null;
}

const REASON_LABEL: Record<string, string> = {
  AFILIADO_ACTIVO: 'Afiliado activo',
  AFILIADO_INACTIVO: 'Afiliado inactivo',
  FAMILIAR_VALIDO: 'Familiar de afiliado activo',
  FAMILIAR_INACTIVO: 'Familiar inactivo',
  TITULAR_INACTIVO: 'Titular inactivo',
  INVITADO_VIGENTE: 'Invitado vigente',
  PERSONA_SIN_ROL: 'Sin rol registrado',
  PERSONA_NO_ENCONTRADA: 'Persona no encontrada',
};

const CONDICION_LABEL: Record<string, string> = {
  AFILIADO: 'Afiliado',
  FAMILIAR: 'Familiar',
  INVITADO: 'Invitado',
  DESCONOCIDO: 'Desconocido',
};

// ─── Componente principal ─────────────────────────────────────────────────────

const ControlIngreso: React.FC = () => {
  const { user } = useAuth();

  // Camping selection
  const [campingId, setCampingId] = useState<number | null>(null);
  const [allCampings, setAllCampings] = useState<CampingData[]>([]);
  const [loadingCampings, setLoadingCampings] = useState(true);

  // Período / turno
  const [periodo, setPeriodo] = useState<PeriodoActivo | null>(null);
  const [loadingPeriodo, setLoadingPeriodo] = useState(false);
  const [cajaMsg, setCajaMsg] = useState('');

  // Visitas del turno
  const [visitas, setVisitas] = useState<VisitaRow[]>([]);
  const [loadingVisitas, setLoadingVisitas] = useState(false);

  // Búsqueda
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<ResolveResult | null>(null);
  const [searchError, setSearchError] = useState('');

  // Selección de personas para ingreso
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Confirmar ingreso
  const [confirming, setConfirming] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');

  // Cámara QR
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const isAdmin = user?.roles?.includes('admin') ?? false;

  // ── Cargar campings disponibles ──────────────────────────────────────────────
  useEffect(() => {
    const loadCampings = async () => {
      try {
        if (isAdmin) {
          const res = await campingsService.getAllAdmin() as any;
          const data: CampingData[] = res?.data ?? res ?? [];
          setAllCampings(data);
          if (data.length === 1) setCampingId(data[0].id);
        } else {
          const userCampings = user?.campings ?? [];
          if (userCampings.length === 1) {
            setCampingId(userCampings[0].camping_id);
            setAllCampings([{ id: userCampings[0].camping_id, nombre: `Camping #${userCampings[0].camping_id}` }]);
          } else if (userCampings.length > 1) {
            const res = await campingsService.getAll() as any;
            const all: CampingData[] = res?.data ?? res ?? [];
            const allowed = all.filter(c => userCampings.some(uc => uc.camping_id === c.id));
            setAllCampings(allowed);
          }
        }
      } catch {
        setAllCampings([]);
      } finally {
        setLoadingCampings(false);
      }
    };
    loadCampings();
  }, [isAdmin, user?.campings]);

  // ── Cargar período activo cuando se selecciona camping ────────────────────────
  useEffect(() => {
    if (!campingId) return;
    loadPeriodo();
  }, [campingId]);

  const loadPeriodo = useCallback(async () => {
    if (!campingId) return;
    setLoadingPeriodo(true);
    setCajaMsg('');
    try {
      const res = await operadorService.getPeriodoActivo(campingId) as any;
      const p = res?.periodo ?? null;
      setPeriodo(p);
      if (p) loadVisitas(p.id);
      else setVisitas([]);
    } catch {
      setPeriodo(null);
    } finally {
      setLoadingPeriodo(false);
    }
  }, [campingId]);

  const loadVisitas = async (periodoId: number) => {
    setLoadingVisitas(true);
    try {
      const data = await operadorService.getVisitasByPeriodo(periodoId) as any;
      setVisitas(Array.isArray(data) ? data : data?.data ?? []);
    } catch {
      setVisitas([]);
    } finally {
      setLoadingVisitas(false);
    }
  };

  // ── Abrir turno ──────────────────────────────────────────────────────────────
  const handleAbrirTurno = async () => {
    if (!campingId) return;
    setLoadingPeriodo(true);
    setCajaMsg('');
    try {
      const res = await operadorService.abrirPeriodo({ camping_id: campingId }) as any;
      if (res?.success && res?.periodo) {
        setPeriodo(res.periodo);
        setVisitas([]);
        setCajaMsg('Turno abierto correctamente.');
      } else {
        setCajaMsg(res?.error ?? 'Error al abrir turno');
      }
    } catch (e: any) {
      setCajaMsg(e?.message ?? 'Error al abrir turno');
    } finally {
      setLoadingPeriodo(false);
    }
  };

  // ── Cerrar turno ─────────────────────────────────────────────────────────────
  const handleCerrarTurno = async () => {
    if (!periodo) return;
    if (!window.confirm(`¿Cerrar el turno #${periodo.id}?`)) return;
    setLoadingPeriodo(true);
    setCajaMsg('');
    try {
      const res = await operadorService.cerrarPeriodo(periodo.id) as any;
      if (res?.success) {
        setPeriodo(null);
        setVisitas([]);
        setCajaMsg('Turno cerrado correctamente.');
      } else {
        setCajaMsg(res?.error ?? 'Error al cerrar turno');
      }
    } catch (e: any) {
      setCajaMsg(e?.message ?? 'Error al cerrar turno');
    } finally {
      setLoadingPeriodo(false);
    }
  };

  // ── Búsqueda por QR/DNI ──────────────────────────────────────────────────────
  const handleSearch = async (value?: string) => {
    const query = (value ?? searchInput).trim();
    if (!query) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    setSelectedIds(new Set());
    setConfirmMsg('');
    try {
      const isNumeric = /^\d+$/.test(query);
      const res = await (isNumeric
        ? operadorService.resolveByDNI(query)
        : operadorService.resolveQR(query)) as any;
      const data: ResolveResult = res?.data ?? res;
      setSearchResult(data);
      if (data?.allowed && data?.persona) {
        setSelectedIds(new Set([data.persona.id]));
      }
    } catch (e: any) {
      setSearchError(e?.message ?? 'Error al buscar persona');
    } finally {
      setSearching(false);
    }
  };

  // ── Cámara QR ────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      requestAnimationFrame(scanFrame);
    } catch {
      setCameraError('No se pudo acceder a la cámara. Usá el campo de texto para ingresar el QR.');
    }
  };

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      stopCamera();
      setSearchInput(code.data);
      handleSearch(code.data);
    } else {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Toggle familiar en selección ─────────────────────────────────────────────
  const togglePersona = (personaId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(personaId)) next.delete(personaId);
      else next.add(personaId);
      return next;
    });
  };

  // ── Confirmar ingreso ────────────────────────────────────────────────────────
  const handleConfirmarIngreso = async () => {
    if (!campingId || !searchResult || selectedIds.size === 0) return;
    setConfirming(true);
    setConfirmMsg('');
    try {
      const condicion = searchResult.tipos[0] ?? 'DESCONOCIDO';
      const personas = Array.from(selectedIds).map(persona_id => ({ persona_id, condicion_ingreso: condicion }));
      const res = await operadorService.crearVisitasBatch({
        camping_id: campingId,
        periodo_caja_id: periodo?.id ?? null,
        personas
      }) as any;
      const created: number = res?.created ?? 0;
      const failed: number = res?.failed ?? 0;
      setConfirmMsg(`✅ ${created} ingreso(s) registrado(s)${failed > 0 ? `. ⚠️ ${failed} error(es).` : '.'}`);
      setSearchResult(null);
      setSearchInput('');
      setSelectedIds(new Set());
      if (periodo) {
        await loadVisitas(periodo.id);
        setPeriodo(prev => prev ? { ...prev, total_visitas: (prev.total_visitas ?? 0) + created } : prev);
      }
    } catch (e: any) {
      setConfirmMsg(`❌ ${e?.message ?? 'Error al registrar ingreso'}`);
    } finally {
      setConfirming(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (loadingCampings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin && allCampings.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <p className="text-lg font-semibold text-slate-700">Sin camping asignado</p>
        <p className="text-sm text-slate-500">Tu usuario no tiene ningún camping asociado. Contactá al administrador.</p>
        <Link to="/" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">Volver al inicio</Link>
      </div>
    );
  }

  const campingNombre = periodo?.camping?.nombre
    ?? allCampings.find(c => c.id === campingId)?.nombre
    ?? (campingId ? `Camping #${campingId}` : '');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
          ←
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold">Control de Ingreso</p>
          {campingNombre && <p className="text-xs text-slate-500">{campingNombre}</p>}
        </div>
        <Link to="/" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Salir
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-16 pt-5 sm:px-6">

        {/* Selector de camping */}
        {allCampings.length > 1 && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Camping:</label>
            <select
              value={campingId ?? ''}
              onChange={e => setCampingId(Number(e.target.value))}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">— Seleccioná un camping —</option>
              {allCampings.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        )}

        {campingId && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">

            {/* ── Panel Búsqueda ───────────────────────────────── */}
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700">Buscar persona</h2>

              <div className="flex overflow-hidden rounded-xl border border-slate-200">
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="DNI (solo números) o código QR..."
                  className="w-full bg-slate-50 px-4 py-3 text-sm focus:outline-none"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={searching || !searchInput.trim()}
                  className="border-l border-slate-200 bg-white px-4 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                >
                  {searching ? '⏳' : '🔍'}
                </button>
              </div>

              <button
                onClick={cameraOn ? stopCamera : startCamera}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition-colors ${
                  cameraOn ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {cameraOn ? '⏹ Detener cámara' : '📷 Escanear QR con cámara'}
              </button>

              {cameraError && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{cameraError}</p>
              )}

              {/* Vista previa de cámara */}
              <div className={cameraOn ? 'relative overflow-hidden rounded-xl bg-black' : 'hidden'}>
                <video ref={videoRef} className="w-full rounded-xl" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-2xl border-4 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                </div>
                <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/80">
                  Apuntá la cámara al código QR
                </p>
              </div>

              {searchError && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{searchError}</p>
              )}

              {/* Resultado */}
              {searchResult && (
                <div className={`rounded-xl border p-4 ${searchResult.allowed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${searchResult.allowed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {searchResult.allowed ? '✅ PERMITIDO' : '❌ DENEGADO'}
                    </span>
                    {searchResult.reason && (
                      <span className="text-xs text-slate-600">{REASON_LABEL[searchResult.reason] ?? searchResult.reason}</span>
                    )}
                  </div>

                  {searchResult.persona && (
                    <div className="mb-3">
                      <p className="font-semibold text-slate-900">
                        {searchResult.persona.nombre_completo || `${searchResult.persona.apellido ?? ''} ${searchResult.persona.nombres ?? ''}`.trim()}
                      </p>
                      <p className="text-sm text-slate-500">DNI: {searchResult.persona.dni}</p>
                      {searchResult.tipos.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {searchResult.tipos.map(t => (
                            <span key={t} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {searchResult.allowed && searchResult.persona && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {(searchResult.familiaresDelTitular?.length ?? 0) > 0 ? 'Seleccioná quiénes ingresan' : 'Persona encontrada'}
                      </p>

                      {/* Titular */}
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(searchResult.persona.id)}
                          onChange={() => togglePersona(searchResult.persona.id)}
                          className="h-4 w-4 rounded text-primary-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {searchResult.persona.nombre_completo || `${searchResult.persona.apellido ?? ''} ${searchResult.persona.nombres ?? ''}`.trim()}
                          </p>
                          <p className="text-xs text-slate-500">DNI {searchResult.persona.dni} · Titular</p>
                        </div>
                      </label>

                      {/* Familiares del titular */}
                      {searchResult.familiaresDelTitular?.map(fam => (
                        <label
                          key={fam.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 ${(!fam.activo || fam.baja) ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(fam.persona_id)}
                            onChange={() => togglePersona(fam.persona_id)}
                            disabled={!fam.activo || !!fam.baja}
                            className="h-4 w-4 rounded text-primary-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">{fam.nombre_completo}</p>
                            <p className="text-xs text-slate-500">DNI {fam.dni} · Familiar</p>
                          </div>
                          {(!fam.activo || fam.baja) && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">BAJA</span>
                          )}
                        </label>
                      ))}

                      <button
                        onClick={handleConfirmarIngreso}
                        disabled={confirming || !periodo || selectedIds.size === 0}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                      >
                        {confirming
                          ? '⏳ Registrando...'
                          : `✅ Confirmar ingreso (${selectedIds.size} persona${selectedIds.size !== 1 ? 's' : ''})`}
                      </button>
                      {!periodo && (
                        <p className="text-center text-xs text-amber-600">⚠️ Abrí un turno antes de registrar ingresos.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {confirmMsg && (
                <p className={`rounded-lg px-3 py-2 text-sm font-medium ${confirmMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {confirmMsg}
                </p>
              )}
            </section>

            {/* ── Panel Turno ─────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Estado del turno</h2>

              {loadingPeriodo ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
                </div>
              ) : periodo ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Turno activo</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">#{periodo.id}</p>
                    <p className="text-sm text-slate-600">
                      Abierto: {new Date(periodo.fecha_apertura).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Total visitas: <span className="font-bold text-slate-900">{periodo.total_visitas}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleCerrarTurno}
                    disabled={loadingPeriodo}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Cerrar turno
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="text-sm text-slate-500">No hay turno activo</p>
                    <p className="mt-1 text-xs text-slate-400">Abrí un turno para comenzar a registrar ingresos.</p>
                  </div>
                  <button
                    onClick={handleAbrirTurno}
                    disabled={loadingPeriodo}
                    className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                  >
                    {loadingPeriodo ? '⏳ Abriendo...' : 'Abrir turno'}
                  </button>
                </div>
              )}

              {cajaMsg && (
                <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{cajaMsg}</p>
              )}
            </section>
          </div>
        )}

        {/* ── Grilla de visitas ─────────────────────────────────────────── */}
        {periodo && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-800">Visitas del turno #{periodo.id}</h3>
                <p className="text-sm text-slate-500">{visitas.length} registro{visitas.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => loadVisitas(periodo.id)}
                disabled={loadingVisitas}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                {loadingVisitas ? '⏳' : '↻ Actualizar'}
              </button>
            </div>

            {loadingVisitas ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
              </div>
            ) : visitas.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">Sin registros en este turno todavía.</div>
            ) : (
              <>
                {/* Mobile: cards */}
                <div className="divide-y divide-slate-100 sm:hidden">
                  {visitas.map(v => (
                    <div key={v.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-sm text-slate-800">{v.persona?.nombre_completo ?? '—'}</p>
                        <p className="text-xs text-slate-500">
                          DNI {v.persona?.dni ?? '—'} ·{' '}
                          {new Date(v.fecha_ingreso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        v.condicion_ingreso === 'AFILIADO' ? 'bg-blue-100 text-blue-700' :
                        v.condicion_ingreso === 'FAMILIAR' ? 'bg-violet-100 text-violet-700' :
                        v.condicion_ingreso === 'INVITADO' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {CONDICION_LABEL[v.condicion_ingreso] ?? v.condicion_ingreso}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Hora</th>
                        <th className="px-5 py-3">Nombre</th>
                        <th className="px-5 py-3">DNI</th>
                        <th className="px-5 py-3">Condición</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visitas.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                            {new Date(v.fecha_ingreso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-800">{v.persona?.nombre_completo ?? '—'}</td>
                          <td className="px-5 py-3 text-slate-600">{v.persona?.dni ?? '—'}</td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              v.condicion_ingreso === 'AFILIADO' ? 'bg-blue-100 text-blue-700' :
                              v.condicion_ingreso === 'FAMILIAR' ? 'bg-violet-100 text-violet-700' :
                              v.condicion_ingreso === 'INVITADO' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {CONDICION_LABEL[v.condicion_ingreso] ?? v.condicion_ingreso}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default ControlIngreso;

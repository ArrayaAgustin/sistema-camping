import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { CampingData } from '../services/campings.service';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const Home: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [campings, setCampings] = useState<CampingData[]>([]);
  const [loadingCampings, setLoadingCampings] = useState(true);

  const roles = user?.roles || [];
  const canViewOperador = roles.includes('operador') || roles.includes('admin');
  const canViewAdmin = roles.includes('admin');

  const roleColor: Record<string, string> = {
    admin: 'bg-violet-100 text-violet-700',
    operador: 'bg-sky-100 text-sky-700',
    afiliado: 'bg-emerald-100 text-emerald-700',
  };

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    operador: 'Operador',
    afiliado: 'Afiliado',
  };

  useEffect(() => {
    fetch('/api/campings')
      .then(r => r.json())
      .then(d => setCampings(d?.data ?? d ?? []))
      .catch(() => setCampings([]))
      .finally(() => setLoadingCampings(false));
  }, []);

  const campingsConUbicacion = campings.filter(c => c.latitud && c.longitud);

  const quickLinks = [
    { to: '/credencial', label: 'Mi carnet digital', icon: '🪪', show: true, accent: false },
    { to: '/perfil', label: 'Perfil del afiliado', icon: '👤', show: true, accent: false },
    { to: '/operador', label: 'Panel operador', icon: '🏕️', show: canViewOperador, accent: false },
    { to: '/admin', label: 'Administración', icon: '⚙️', show: canViewAdmin, accent: true },
  ].filter(l => l.show);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white transition group-hover:bg-primary-700">
              SA
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight">SMATA Córdoba</p>
              <p className="text-[11px] text-slate-400 leading-tight">Sistema de Camping</p>
            </div>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* Desktop nav */}
            {isAuthenticated && (
              <nav className="hidden items-center gap-1 md:flex">
                {quickLinks.map(l => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 sm:flex">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
                    {(user?.username?.[0] ?? '?').toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-slate-700">{user?.username}</span>
                  {roles[0] && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${roleColor[roles[0]] ?? 'bg-slate-100 text-slate-600'}`}>
                      {roleLabel[roles[0]] ?? roles[0]}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(p => !p)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden"
                  aria-label="Menú"
                >
                  <span className="text-base">{mobileMenuOpen ? '✕' : '☰'}</span>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 md:block"
                >
                  Salir
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary-200 hover:bg-primary-700 transition-colors"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 pb-3 pt-2">
            <div className="flex flex-col gap-1 text-sm">
              {quickLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-slate-700 hover:bg-slate-50"
                >
                  <span>{l.icon}</span>{l.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-rose-500 hover:bg-rose-50"
              >
                <span>→</span> Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-blue-500 px-4 py-14 sm:py-20 sm:px-6">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/80">
              Sindicato SMATA Córdoba
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
              {isAuthenticated
                ? `Hola, ${user?.username ?? 'usuario'} 👋`
                : 'Sistema de Campings'}
            </h1>
            <p className="mt-3 max-w-lg text-sm text-white/75 sm:text-base">
              Consultá campings disponibles, accedé a tu carnet digital y gestioná ingresos de forma rápida y segura.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <>
                  <Link to="/credencial" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 shadow-sm hover:bg-white/90 transition-colors">
                    Ver carnet digital
                  </Link>
                  {canViewOperador && (
                    <Link to="/operador" className="rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors">
                      Panel operador
                    </Link>
                  )}
                </>
              ) : (
                <Link to="/login" className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-primary-700 shadow-sm hover:bg-white/90 transition-colors">
                  Iniciar sesión →
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">

        {/* ── Accesos rápidos (solo si autenticado) ──────────────────────────── */}
        {isAuthenticated && quickLinks.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Accesos rápidos</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`group flex flex-col gap-2 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    l.accent
                      ? 'border-primary-100 bg-primary-50 hover:border-primary-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-2xl">{l.icon}</span>
                  <span className={`text-xs font-semibold leading-snug ${l.accent ? 'text-primary-700' : 'text-slate-700'}`}>
                    {l.label}
                  </span>
                  <span className={`mt-auto text-[10px] font-medium transition-colors ${l.accent ? 'text-primary-400 group-hover:text-primary-600' : 'text-slate-300 group-hover:text-slate-500'}`}>
                    Abrir →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Campings ───────────────────────────────────────────────────────── */}
        <section className="mt-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Campings disponibles</h2>
              <p className="mt-1 text-sm text-slate-500">
                {loadingCampings ? 'Cargando...' : campings.length > 0
                  ? `${campings.length} camping${campings.length !== 1 ? 's' : ''} disponible${campings.length !== 1 ? 's' : ''}`
                  : 'Sin campings por el momento'}
              </p>
            </div>
          </div>

          {loadingCampings ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : campings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
              <span className="text-4xl">🏕️</span>
              <p className="mt-3 font-semibold text-slate-600">No hay campings disponibles</p>
              <p className="mt-1 text-sm text-slate-400">Volvé a chequear pronto.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {campings.map(camping => (
                <div
                  key={camping.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Imagen */}
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary-50 to-slate-100">
                    {camping.foto_url ? (
                      <img
                        src={camping.foto_url}
                        alt={camping.nombre}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl">🏕️</div>
                    )}
                    {/* Badge activo */}
                    <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 shadow-sm backdrop-blur-sm">
                      Disponible
                    </span>
                  </div>

                  {/* Contenido */}
                  <div className="p-5">
                    <h3 className="font-bold text-slate-900">{camping.nombre}</h3>
                    {camping.descripcion && (
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{camping.descripcion}</p>
                    )}
                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      {(camping.localidad || camping.provincia) && (
                        <p>📍 {[camping.localidad, camping.provincia].filter(Boolean).join(', ')}</p>
                      )}
                      {!camping.localidad && camping.ubicacion && <p>📍 {camping.ubicacion}</p>}
                      {camping.telefono && <p>📞 {camping.telefono}</p>}
                      {camping.email && <p>✉️ {camping.email}</p>}
                    </div>
                    {camping.latitud && camping.longitud && (
                      <a
                        href={`https://www.google.com/maps?q=${camping.latitud},${camping.longitud}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        Ver en Google Maps →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mapa */}
          {campingsConUbicacion.length > 0 && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="font-semibold text-slate-800">Mapa de campings</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {campingsConUbicacion.length} camping{campingsConUbicacion.length !== 1 ? 's' : ''} con ubicación exacta
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                  📍 OpenStreetMap
                </span>
              </div>
              <div style={{ height: 400 }}>
                <MapContainer
                  center={[campingsConUbicacion[0].latitud!, campingsConUbicacion[0].longitud!]}
                  zoom={campingsConUbicacion.length === 1 ? 13 : 6}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap contributors"
                  />
                  {campingsConUbicacion.map(camping => (
                    <Marker key={camping.id} position={[camping.latitud!, camping.longitud!]}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">{camping.nombre}</p>
                          {camping.localidad && <p className="text-slate-500">{camping.localidad}</p>}
                          {camping.telefono && <p>📞 {camping.telefono}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-6 text-center">
        <p className="text-xs text-slate-400">
          Sindicato SMATA Córdoba · Sistema de Gestión de Campings
        </p>
        {!isAuthenticated && (
          <Link to="/login" className="mt-2 inline-block text-xs font-semibold text-primary-600 hover:underline">
            Iniciar sesión →
          </Link>
        )}
      </footer>

    </div>
  );
};

export default Home;

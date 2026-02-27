import { request } from './apiClient';

export const operadorService = {
  getPeriodoActivo: (campingId: number) =>
    request(`/periodos-caja/activo?camping_id=${campingId}`),

  abrirPeriodo: (payload: { camping_id: number; observaciones?: string }) =>
    request('/periodos-caja/abrir', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  cerrarPeriodo: (id: number, payload: { observaciones?: string } = {}) =>
    request(`/periodos-caja/${id}/cerrar`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  crearVisita: (payload: any) =>
    request('/visitas', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  crearVisitasBatch: (payload: {
    camping_id: number;
    periodo_caja_id?: number | null;
    personas: { persona_id: number; condicion_ingreso?: string }[];
    observaciones?: string;
  }) =>
    request('/visitas/batch', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  resolveQR: (qrCode: string) =>
    request(`/qr/${encodeURIComponent(qrCode)}`),

  resolveByDNI: (dni: string) =>
    request(`/qr/dni/${encodeURIComponent(dni)}`),

  getVisitasByPeriodo: (periodoId: number) =>
    request(`/visitas/periodo/${periodoId}`)
};

export default operadorService;

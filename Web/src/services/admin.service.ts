import { request } from './apiClient';

export interface PersonaSearchItem {
  persona: {
    id: number;
    dni: string;
    apellido?: string | null;
    nombres?: string | null;
    nombre_completo?: string | null;
    qr_code: string;
  };
  tipos: string[];
}

export const adminService = {
  searchPersonas: (q: string, limit = 20) =>
    request<{ success: boolean; data: PersonaSearchItem[] }>('/personas/search?q=' + encodeURIComponent(q) + '&limit=' + limit),

  getPersonaById: (id: number) => request(`/personas/${id}`),

  getPersonaByDni: (dni: string) => request(`/personas/dni/${encodeURIComponent(dni)}`),

  createPersona: (payload: any) =>
    request('/personas', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updatePersona: (id: number, payload: any) =>
    request(`/personas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  findTitularByDni: (dni: string) =>
    request(`/personas/titular?dni=${encodeURIComponent(dni)}`),

  createUser: (payload: { username: string; email: string; persona_id?: number | null }) =>
    request('/auth/create-user', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getCatalogo: () =>
    request<{ success: boolean; data: { roles: { id: number; nombre: string; descripcion?: string }[]; campings: { id: number; nombre: string }[] } }>('/usuarios/catalogo'),

  createUsuarioFromPersona: (personaId: number, dni: string) =>
    request('/usuarios', {
      method: 'POST',
      body: JSON.stringify({ personaId, dni })
    }),

  asignarRol: (usuarioId: number, rolId: number, campingId?: number | null) =>
    request('/usuarios/roles', {
      method: 'POST',
      body: JSON.stringify({ usuarioId, rolId, campingId: campingId ?? null })
    }),

  resetPassword: (userId: number) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),
};

export default adminService;

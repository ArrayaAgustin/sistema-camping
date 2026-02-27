import { request } from './apiClient';

export const userService = {
  // Devuelve la persona del usuario autenticado sin exponer el ID en la URL
  getMyPersona: () => request('/personas/me'),

  // Para uso interno (admin, operador con read:personas)
  getPersonaById: (id: number) => request(`/personas/${id}`),

  resolveQR: (qrCode: string) => request(`/qr/${encodeURIComponent(qrCode)}`)
};

export default userService;

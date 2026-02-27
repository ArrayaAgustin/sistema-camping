import { request } from './apiClient';

export interface CampingData {
  id: number;
  nombre: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  telefono?: string | null;
  email?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  foto_url?: string | null;
  activo?: boolean | null;
  created_at?: string | null;
}

export interface CampingInput {
  nombre: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  telefono?: string | null;
  email?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  foto_url?: string | null;
  activo?: boolean;
}

export const campingsService = {
  getAll: () => request<any>('/campings'),
  getAllAdmin: () => request<any>('/campings/admin'),
  create: (data: CampingInput) => request<any>('/campings', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: number, data: Partial<CampingInput>) => request<any>(`/campings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};

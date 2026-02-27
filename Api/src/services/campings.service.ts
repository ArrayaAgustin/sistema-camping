import { prisma } from '../config/prisma-config';

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

export class CampingsService {
  async getAll() {
    const campings = await (prisma as any).campings.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        ubicacion: true,
        provincia: true,
        localidad: true,
        telefono: true,
        email: true,
        latitud: true,
        longitud: true,
        foto_url: true,
        activo: true
      }
    });
    return campings.map((c: any) => ({
      ...c,
      latitud: c.latitud ? Number(c.latitud) : null,
      longitud: c.longitud ? Number(c.longitud) : null
    }));
  }

  async getAllAdmin() {
    const campings = await (prisma as any).campings.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        ubicacion: true,
        provincia: true,
        localidad: true,
        telefono: true,
        email: true,
        latitud: true,
        longitud: true,
        foto_url: true,
        activo: true,
        created_at: true
      }
    });
    return campings.map((c: any) => ({
      ...c,
      latitud: c.latitud ? Number(c.latitud) : null,
      longitud: c.longitud ? Number(c.longitud) : null
    }));
  }

  async getById(id: number) {
    const camping = await (prisma as any).campings.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        ubicacion: true,
        provincia: true,
        localidad: true,
        telefono: true,
        email: true,
        latitud: true,
        longitud: true,
        foto_url: true,
        activo: true
      }
    });
    if (!camping) return null;
    return {
      ...camping,
      latitud: camping.latitud ? Number(camping.latitud) : null,
      longitud: camping.longitud ? Number(camping.longitud) : null
    };
  }

  async create(input: CampingInput) {
    if (!input.nombre?.trim()) throw new Error('nombre es requerido');
    const camping = await (prisma as any).campings.create({
      data: {
        nombre: input.nombre.trim(),
        descripcion: input.descripcion ?? null,
        ubicacion: input.ubicacion ?? null,
        provincia: input.provincia ?? null,
        localidad: input.localidad ?? null,
        telefono: input.telefono ?? null,
        email: input.email ?? null,
        latitud: input.latitud ?? null,
        longitud: input.longitud ?? null,
        foto_url: input.foto_url ?? null,
        activo: input.activo ?? true
      }
    });
    return {
      ...camping,
      latitud: camping.latitud ? Number(camping.latitud) : null,
      longitud: camping.longitud ? Number(camping.longitud) : null
    };
  }

  async update(id: number, input: Partial<CampingInput>) {
    const existing = await (prisma as any).campings.findUnique({ where: { id } });
    if (!existing) throw new Error('Camping no encontrado');

    const data: any = {};
    if (input.nombre !== undefined) data.nombre = input.nombre?.trim() || existing.nombre;
    if (input.descripcion !== undefined) data.descripcion = input.descripcion ?? null;
    if (input.ubicacion !== undefined) data.ubicacion = input.ubicacion ?? null;
    if (input.provincia !== undefined) data.provincia = input.provincia ?? null;
    if (input.localidad !== undefined) data.localidad = input.localidad ?? null;
    if (input.telefono !== undefined) data.telefono = input.telefono ?? null;
    if (input.email !== undefined) data.email = input.email ?? null;
    if (input.latitud !== undefined) data.latitud = input.latitud ?? null;
    if (input.longitud !== undefined) data.longitud = input.longitud ?? null;
    if (input.foto_url !== undefined) data.foto_url = input.foto_url ?? null;
    if (input.activo !== undefined) data.activo = input.activo;

    const updated = await (prisma as any).campings.update({ where: { id }, data });
    return {
      ...updated,
      latitud: updated.latitud ? Number(updated.latitud) : null,
      longitud: updated.longitud ? Number(updated.longitud) : null
    };
  }
}

export const campingsService = new CampingsService();
export default campingsService;

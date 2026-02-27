import { prisma } from '../config/prisma-config';
import HashUtil from '../utils/hash.util';

export class UsuariosService {
  /**
   * Crea un usuario a partir de una persona existente (username = dni, password_hash = hash del dni, must_change_password = 1, activo = 1, persona_id, etc.)
   */
  async createUsuarioFromPersona({ personaId, dni }: { personaId: number, dni: string }) {
    // Verifica si ya existe usuario con ese username
    const existing = await prisma.usuarios.findUnique({ where: { username: dni } });
    if (existing) {
      throw new Error('El usuario ya existe');
    }
    const password_hash = await HashUtil.hashPassword(dni);
    const usuario = await prisma.usuarios.create({
      data: {
        username: dni,
        password_hash,
        activo: true,
        ultimo_acceso: null,
        created_at: new Date(),
        updated_at: null,
        persona_id: personaId,
        must_change_password: true
      }
    });
    return usuario;
  }

  /**
   * Asigna un rol a un usuario (por defecto rol_id=3, usuario común)
   */
  async asignarRolUsuario({ usuarioId, rolId = 3, campingId = null }: { usuarioId: number, rolId?: number, campingId?: number | null }) {
    const usuarioRol = await prisma.usuario_roles.create({
      data: {
        usuario_id: usuarioId,
        rol_id: rolId,
        camping_id: campingId,
        activo: true,
        fecha_asignacion: new Date()
      }
    });
    return usuarioRol;
  }

  /**
   * Retorna roles y campings disponibles para el formulario de gestión de usuarios
   */
  async getCatalogo() {
    const [roles, campings] = await Promise.all([
      prisma.roles.findMany({
        select: { id: true, nombre: true, descripcion: true },
        orderBy: { id: 'asc' }
      }),
      prisma.campings.findMany({
        where: { activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' }
      })
    ]);
    return { roles, campings };
  }
}

export const usuariosService = new UsuariosService();
export default usuariosService;

import { prisma } from '../config/prisma-config';
import { IAfiliadosService } from '../interfaces/afiliados/afiliados.interfaces';
import { 
  IAfiliado, 
  IAfiliadoResponse, 
  IPadronVersion, 
  IPadronStats,
  IFamiliar,
  IUser,
  Permission,
  Role 
} from '../types';

/**
 * Servicio de afiliados - Implementa la lógica de negocio para gestión de afiliados
 * Implementa la interface IAfiliadosService
 */
export class AfiliadosService implements IAfiliadosService {

  /**
   * Busca afiliados según criterios de búsqueda
   */
  async searchAfiliados(tipo: 'dni' | 'apellido' | 'general', q: string, limit: number): Promise<IAfiliado[]> {

    try {
      let whereClause: any = {
        activo: true // Solo afiliados activos por defecto
      };

      // Construir filtros según el tipo de búsqueda
      switch (tipo) {
        case 'dni':
          whereClause.dni = { contains: q };
          break;
        case 'apellido':
          whereClause.apellido = { contains: q.toUpperCase(), mode: 'insensitive' };
          break;
        case 'general':
          whereClause.OR = [
            { apellido: { contains: q.toUpperCase(), mode: 'insensitive' } },
            { nombres: { contains: q.toUpperCase(), mode: 'insensitive' } },
            { dni: { contains: q } }
          ];
          break;
      }

      const afiliados = await prisma.afiliados.findMany({
        where: whereClause,
        orderBy: [
          { apellido: 'asc' },
          { nombres: 'asc' }
        ],
        take: Math.min(limit, 100), // Máximo 100 registros por consulta
        include: {
          Familiares: {
            where: { activo: true },
            orderBy: { nombre: 'asc' },
            take: 5 // Limitar familiares en búsquedas generales
          }
        }
      });

      // Mapear a la interface IAfiliado
      return afiliados.map(this.mapPrismaToAfiliado);
    } catch (error) {
      console.error('Error searching afiliados:', error);
      throw new Error('Error searching afiliados');
    }
  }

  /**
   * Obtiene un afiliado específico por su ID
   */
  async getAfiliadoById(afiliadoId: number): Promise<IAfiliado | null> {
    if (!afiliadoId || isNaN(afiliadoId)) {
      throw new Error('Valid afiliado ID is required');
    }

    try {
      const afiliado = await prisma.afiliados.findUnique({
        where: { id: afiliadoId },
        include: {
          Familiares: {
            where: { activo: true },
            orderBy: { nombre: 'asc' }
          }
        }
      });

      if (!afiliado) {
        return null;
      }

      return this.mapPrismaToAfiliado(afiliado);
    } catch (error) {
      console.error('Error getting afiliado by ID:', error);
      throw new Error('Error retrieving afiliado');
    }
  }

  /**
   * Obtiene un afiliado con todos sus familiares
   */
  async getAfiliadoWithFamily(afiliadoId: number): Promise<IAfiliadoResponse | null> {
    const afiliado = await this.getAfiliadoById(afiliadoId);
    if (!afiliado) {
      return null;
    }

    const familiares = await this.getFamiliaresByAfiliado(afiliadoId);

    return {
      afiliado,
      familiares,
      totalFamiliares: familiares.length
    };
  }

  /**
   * Obtiene los familiares de un afiliado
   */
  async getFamiliaresByAfiliado(afiliadoId: number): Promise<IFamiliar[]> {
    try {
      const familiares = await prisma.familiares.findMany({
        where: { 
          afiliado_id: afiliadoId,
          activo: true 
        },
        orderBy: { nombre: 'asc' }
      });

      return familiares.map(this.mapPrismaToFamiliar);
    } catch (error) {
      console.error('Error getting familiares:', error);
      throw new Error('Error retrieving familiares');
    }
  }

  /**
   * Busca afiliados por número de afiliado
   */
  async getAfiliadoByNumero(numero: number): Promise<IAfiliadoResponse | null> {
    try {
      const afiliado = await prisma.afiliados.findFirst({
        where: { 
          id: numero,
          activo: true 
        },
        include: {
          Familiares: {
            where: { activo: true },
            orderBy: { nombre: 'asc' }
          }
        }
      });

      if (!afiliado) {
        return null;
      }

      // Convertir a IAfiliadoResponse
      const afiliadoMapped = this.mapPrismaToAfiliado(afiliado);
      const familiaresMapped = afiliado.Familiares?.map(familiar => this.mapPrismaToFamiliar(familiar)) || [];

      return {
        afiliado: afiliadoMapped,
        familiares: familiaresMapped,
        totalFamiliares: familiaresMapped.length
      };
    } catch (error) {
      console.error('Error getting afiliado by numero:', error);
      throw new Error('Error retrieving afiliado by numero');
    }
  }

  /**
   * Busca afiliados por documento
   */
  async getAfiliadosByDocumento(documento: string): Promise<IAfiliado[]> {
    try {
      const afiliados = await prisma.afiliados.findMany({
        where: { 
          dni: documento,
          activo: true 
        },
        include: {
          Familiares: {
            where: { activo: true },
            orderBy: { nombre: 'asc' },
            take: 5
          }
        },
        orderBy: [
          { apellido: 'asc' },
          { nombres: 'asc' }
        ]
      });

      return afiliados.map(this.mapPrismaToAfiliado);
    } catch (error) {
      console.error('Error getting afiliados by documento:', error);
      throw new Error('Error retrieving afiliados by documento');
    }
  }

  /**
   * Obtiene estadísticas del padrón de afiliados
   */
  async getPadronStats(): Promise<IPadronStats> {
    try {
      const [totalAfiliados, totalActivos, totalFamiliares, version] = await Promise.all([
        prisma.afiliados.count(),
        prisma.afiliados.count({ where: { activo: true } }),
        prisma.familiares.count({ where: { activo: true } }),
        this.getPadronVersion()
      ]);

      return {
        totalAfiliados,
        totalActivos,
        totalFamiliares,
        version: version?.version || 'No definida',
        fechaActualizacion: version?.fecha_actualizacion || new Date()
      };
    } catch (error) {
      console.error('Error getting padron stats:', error);
      throw new Error('Error retrieving padron statistics');
    }
  }

  /**
   * Obtiene información de la versión del padrón
   */
  async getPadronVersion(): Promise<IPadronVersion> {
    try {
      const version = await prisma.padron_versiones.findFirst({
        where: { activo: true },
        orderBy: { fecha_actualizacion: 'desc' }
      });

      const totalAfiliados = version?.total_afiliados || 0;
      const totalFamiliares = version?.total_familiares || 0;
      
      return {
        id: version?.id || 0,
        version: version?.version || '1.0.0',
        fecha_actualizacion: version?.fecha_actualizacion || new Date(),
        total_afiliados: version?.total_afiliados || null,
        total_familiares: version?.total_familiares || null,
        total_registros: totalAfiliados + totalFamiliares,
        descripcion: version?.descripcion || 'Versión inicial del padrón',
        hash_checksum: version?.hash_checksum || null,
        usuario_carga_id: version?.usuario_carga_id || null,
        activo: version?.activo ?? true,
        created_at: version?.created_at || new Date()
      };
    } catch (error) {
      console.error('Error getting padron version:', error);
      throw new Error('Error retrieving padron version');
    }
  }

  /**
   * Verifica si un afiliado está activo
   */
  async isAfiliadoActive(afiliadoId: number): Promise<boolean> {
    try {
      const afiliado = await prisma.afiliados.findUnique({
        where: { id: afiliadoId },
        select: { activo: true }
      });

      return afiliado?.activo || false;
    } catch (error) {
      console.error('Error checking afiliado status:', error);
      return false;
    }
  }

  /**
   * Actualiza los datos de un afiliado
   */
  async updateAfiliado(afiliadoId: number, updateData: Partial<IAfiliado>): Promise<IAfiliado> {
    try {
      const existingAfiliado = await this.getAfiliadoById(afiliadoId);
      if (!existingAfiliado) {
        throw new Error('Afiliado not found');
      }

      const updatedAfiliado = await prisma.afiliados.update({
        where: { id: afiliadoId },
        data: {
          apellido: updateData.apellido,
          nombres: updateData.nombres,
          dni: updateData.documento,
          telefono: updateData.telefono,
          email: updateData.email,
          domicilio: updateData.domicilio,
          activo: updateData.activo,
          updated_at: new Date()
        },
        include: {
          Familiares: {
            where: { activo: true },
            orderBy: { nombre: 'asc' }
          }
        }
      });

      return this.mapPrismaToAfiliado(updatedAfiliado);
    } catch (error) {
      console.error('Error updating afiliado:', error);
      throw new Error('Error updating afiliado');
    }
  }

  /**
   * Búsqueda avanzada de afiliados
   */
  async advancedSearch(filters: {
    text?: string;
    estado?: string;
    seccion?: string;
    delegacion?: string;
    fechaNacimientoDesde?: Date;
    fechaNacimientoHasta?: Date;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    afiliados: IAfiliado[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const {
      text,
      estado = 'activo',
      seccion,
      delegacion,
      fechaNacimientoDesde,
      fechaNacimientoHasta,
      page = 1,
      pageSize = 20,
      sortBy = 'apellido',
      sortOrder = 'asc'
    } = filters;

    const offset = (page - 1) * pageSize;
    const limit = Math.min(pageSize, 100);

    try {
      let whereClause: any = {};

      // Filtro de estado
      if (estado === 'activo') {
        whereClause.activo = true;
      } else if (estado === 'inactivo') {
        whereClause.activo = false;
      }

      // Filtros adicionales
      if (text) {
        whereClause.OR = [
          { apellido: { contains: text.toUpperCase(), mode: 'insensitive' } },
          { nombres: { contains: text.toUpperCase(), mode: 'insensitive' } },
          { dni: { contains: text } },
          { numero_afiliado: { contains: text } }
        ];
      }

      if (seccion) {
        whereClause.seccion = seccion;
      }

      if (delegacion) {
        whereClause.delegacion = delegacion;
      }

      if (fechaNacimientoDesde || fechaNacimientoHasta) {
        whereClause.fecha_nacimiento = {};
        if (fechaNacimientoDesde) {
          whereClause.fecha_nacimiento.gte = fechaNacimientoDesde;
        }
        if (fechaNacimientoHasta) {
          whereClause.fecha_nacimiento.lte = fechaNacimientoHasta;
        }
      }

      // Construir ordenamiento
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const [afiliados, total] = await Promise.all([
        prisma.afiliados.findMany({
          where: whereClause,
          orderBy,
          take: limit,
          skip: offset,
          include: {
            Familiares: {
              where: { activo: true },
              orderBy: { nombre: 'asc' },
              take: 3 // Limitar en búsquedas avanzadas
            }
          }
        }),
        prisma.afiliados.count({ where: whereClause })
      ]);

      const totalPages = Math.ceil(total / pageSize);

      return {
        afiliados: afiliados.map(this.mapPrismaToAfiliado),
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      console.error('Error in advanced search:', error);
      throw new Error('Error in advanced search');
    }
  }

  /**
   * Verifica si un usuario puede acceder a un afiliado específico
   */
  canAccessAfiliado(user: IUser, afiliadoId: number): boolean {
    if (!user) return false;

    // Admin puede ver todos
    if (user.permisos.includes(Permission.ALL) || user.permisos.includes(Permission.READ_AFILIADOS)) {
      return true;
    }

    // Usuario puede ver su propio registro
    if (user.permisos.includes(Permission.READ_OWN) && user.afiliado_id === afiliadoId) {
      return true;
    }

    return false;
  }

  /**
   * Mapea un registro de Prisma a la interface IAfiliado
   */
  private mapPrismaToAfiliado(prismaAfiliado: any): IAfiliado {
    return {
      id: prismaAfiliado.id,
      cuil: prismaAfiliado.cuil || '',
      dni: prismaAfiliado.dni || '',
      apellido: prismaAfiliado.apellido || '',
      nombres: prismaAfiliado.nombres || '',
      numeroAfiliado: prismaAfiliado.numero_afiliado || '',
      numero_afiliado: prismaAfiliado.numero_afiliado,
      documento: prismaAfiliado.dni || '',
      sexo: prismaAfiliado.sexo,
      tipo_afiliado: prismaAfiliado.tipo_afiliado,
      fecha_nacimiento: prismaAfiliado.fecha_nacimiento,
      categoria: prismaAfiliado.categoria,
      situacion_sindicato: prismaAfiliado.situacion_sindicato,
      situacion_obra_social: prismaAfiliado.situacion_obra_social,
      domicilio: prismaAfiliado.domicilio,
      provincia: prismaAfiliado.provincia,
      localidad: prismaAfiliado.localidad,
      empresa_cuit: prismaAfiliado.empresa_cuit,
      empresa_nombre: prismaAfiliado.empresa_nombre,
      codigo_postal: prismaAfiliado.codigo_postal,
      telefono: prismaAfiliado.telefono,
      email: prismaAfiliado.email,
      grupo_sanguineo: prismaAfiliado.grupo_sanguineo,
      foto_url: prismaAfiliado.foto_url,
      qr_code: prismaAfiliado.qr_code,
      padron_version_id: prismaAfiliado.padron_version_id,
      activo: prismaAfiliado.activo || false,
      created_at: prismaAfiliado.created_at,
      updated_at: prismaAfiliado.updated_at
    };
  }

  /**
   * Mapea un registro de Prisma a la interface IFamiliar
   */
  private mapPrismaToFamiliar(prismaFamiliar: any): IFamiliar {
    return {
      id: prismaFamiliar.id,
      afiliado_id: prismaFamiliar.afiliado_id,
      afiliadoId: prismaFamiliar.afiliado_id,
      nombre: prismaFamiliar.nombre || '',
      dni: prismaFamiliar.dni,
      fecha_nacimiento: prismaFamiliar.fecha_nacimiento,
      edad: prismaFamiliar.edad,
      estudia: prismaFamiliar.estudia,
      discapacitado: prismaFamiliar.discapacitado,
      baja: prismaFamiliar.baja,
      qr_code: prismaFamiliar.qr_code,
      activo: prismaFamiliar.activo || false,
      created_at: prismaFamiliar.created_at,
      updated_at: prismaFamiliar.updated_at
    };
  }

  /**
   * Busca afiliados por DNI - Requerido por IAfiliadosService
   */
  async getAfiliadosByDni(dni: string): Promise<IAfiliado[]> {
    try {
      return await this.searchAfiliados('dni', dni, 50);
    } catch (error) {
      console.error('Error getting afiliados by DNI:', error);
      throw new Error('Error retrieving afiliados by DNI');
    }
  }

  /**
   * Verifica si un usuario puede acceder a un afiliado específico - Requerido por IAfiliadosService
   */
  async canUserAccessAfiliado(userId: number, afiliadoId: number): Promise<boolean> {
    try {
      // Obtener datos del usuario
      const user = await prisma.usuarios.findUnique({
        where: { id: userId },
        include: {
          UsuarioRoles: {
            include: {
              Role: true
            }
          }
        }
      });

      if (!user) return false;

      // Extraer permisos básicos (solo roles por ahora)
      const permisos: Permission[] = [];

      // Crear objeto IUser compatible
      const userForCheck: IUser = {
        id: user.id,
        username: user.username,
        email: user.email || '',
        afiliado_id: user.afiliado_id,
        roles: user.UsuarioRoles.map(ur => ur.Role.nombre as Role),
        permisos,
        activo: user.activo || false
      };

      return this.canAccessAfiliado(userForCheck, afiliadoId);
    } catch (error) {
      console.error('Error checking user access to afiliado:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const afiliadosService = new AfiliadosService();
export default afiliadosService;
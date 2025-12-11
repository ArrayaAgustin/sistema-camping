import { prisma } from '../config/prisma-config';
import * as fs from 'fs';
import * as path from 'path';
import { IAfiliadosService } from '../interfaces/afiliados/afiliados.interfaces';
import { 
  IAfiliado,
  IAfiliadoDetailed,
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
export class AfiliadosService {
  private cacheDir = path.join(process.cwd(), 'cache');
  private padronCacheFile = path.join(this.cacheDir, 'padron-completo.json');
  private cacheVersionFile = path.join(this.cacheDir, 'padron-version.json');
  private cacheMaxAge = 24 * 60 * 60 * 1000; // 24 horas en millisegundos

  constructor() {
    // Crear directorio de cache si no existe
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Busca afiliados según criterios de búsqueda
   */
  async searchAfiliados(tipo: 'dni' | 'apellido' | 'general', q: string, limit: number): Promise<any[]> {
    console.log('🔍 AfiliadosService.searchAfiliados:', { tipo, q, limit });

    try {
      // Construir filtros más simples para diagnosticar
      let whereClause: any = {};

      if (tipo === 'dni') {
        whereClause.dni = { contains: q };
      } else if (tipo === 'apellido') {
        whereClause.apellido = { contains: q.toUpperCase() };
      } else {
        // general
        whereClause.OR = [
          { apellido: { contains: q.toUpperCase() } },
          { nombres: { contains: q.toUpperCase() } },
          { dni: { contains: q } }
        ];
      }

      console.log('📊 Where clause:', JSON.stringify(whereClause, null, 2));

      const afiliados = await prisma.afiliados.findMany({
        where: whereClause,
        orderBy: { apellido: 'asc' },
        take: Math.min(limit, 10) // Limitar más para diagnosticar
      });

      console.log(`✅ Found ${afiliados.length} raw afiliados`);
      
      if (afiliados.length > 0) {
        console.log('📄 Sample afiliado:', JSON.stringify(afiliados[0], null, 2));
      }

      // Mapear resultados usando el mapPrismaToAfiliado
      const result = afiliados.map(afiliado => this.mapPrismaToAfiliado(afiliado));

      return result;
    } catch (error) {
      console.error('❌ Error searching afiliados:', error);
      throw new Error('Error searching afiliados');
    }
  }

  /**
   * Obtiene el padrón completo de afiliados para sincronización offline
   */
  async getPadronCompleto(includeInactivos: boolean = false, useCache: boolean = false): Promise<{ afiliados: any[], version: string, lastUpdated: string, fromCache: boolean }> {
    console.log('📋 Getting complete padron, includeInactivos:', includeInactivos, 'useCache:', useCache);

    try {
      // Si se solicita cache, intentar leerlo
      if (useCache && await this.isCacheValid()) {
        console.log('💾 Using cached padron data');
        return await this.getCachedPadron();
      }

      // Generar datos frescos desde la base de datos
      console.log('🔄 Generating fresh padron data from database');
      const whereClause: any = {};
      
      if (!includeInactivos) {
        whereClause.activo = true;
      }

      const afiliados = await prisma.afiliados.findMany({
        where: whereClause,
        include: {
          Familiares: true
        },
        orderBy: [
          { apellido: 'asc' },
          { nombres: 'asc' }
        ]
      });

      console.log(`✅ Retrieved ${afiliados.length} afiliados for complete padron`);

      // Mapear resultados
      const mappedAfiliados = afiliados.map(afiliado => this.mapPrismaToAfiliado(afiliado));
      
      // Crear resultado con metadatos
      const result = {
        afiliados: mappedAfiliados,
        version: new Date().toISOString().split('T')[0] + '-' + Date.now(),
        lastUpdated: new Date().toISOString(),
        fromCache: false
      };

      // Guardar en cache para uso futuro
      await this.savePadronCache(result);

      return result;
    } catch (error) {
      console.error('❌ Error getting complete padron:', error);
      throw new Error('Error getting complete padron');
    }
  }

  /**
   * Verifica si el cache es válido (no ha expirado)
   */
  private async isCacheValid(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.cacheVersionFile) || !fs.existsSync(this.padronCacheFile)) {
        return false;
      }

      const versionData = JSON.parse(fs.readFileSync(this.cacheVersionFile, 'utf8'));
      const cacheTime = new Date(versionData.lastUpdated).getTime();
      const now = Date.now();

      return (now - cacheTime) < this.cacheMaxAge;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  /**
   * Obtiene datos del cache
   */
  private async getCachedPadron(): Promise<{ afiliados: any[], version: string, lastUpdated: string, fromCache: boolean }> {
    try {
      const cacheData = JSON.parse(fs.readFileSync(this.padronCacheFile, 'utf8'));
      const versionData = JSON.parse(fs.readFileSync(this.cacheVersionFile, 'utf8'));
      
      return {
        afiliados: cacheData,
        version: versionData.version,
        lastUpdated: versionData.lastUpdated,
        fromCache: true
      };
    } catch (error) {
      console.error('Error reading cached padron:', error);
      throw new Error('Error reading cached padron');
    }
  }

  /**
   * Guarda datos en el cache
   */
  private async savePadronCache(data: { afiliados: any[], version: string, lastUpdated: string }): Promise<void> {
    try {
      // Guardar afiliados
      fs.writeFileSync(this.padronCacheFile, JSON.stringify(data.afiliados, null, 2));
      
      // Guardar metadatos de versión
      const versionData = {
        version: data.version,
        lastUpdated: data.lastUpdated,
        totalAfiliados: data.afiliados.length
      };
      fs.writeFileSync(this.cacheVersionFile, JSON.stringify(versionData, null, 2));
      
      console.log(`💾 Padron cache saved: ${data.afiliados.length} afiliados (${(fs.statSync(this.padronCacheFile).size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      console.error('Error saving padron cache:', error);
    }
  }

  /**
   * Obtiene un afiliado específico por su ID
   */
  async getAfiliadoById(afiliadoId: number): Promise<any | null> {
    if (!afiliadoId || isNaN(afiliadoId)) {
      throw new Error('Valid afiliado ID is required');
    }

    try {
      const afiliado = await prisma.afiliados.findUnique({
        where: { id: afiliadoId }
        // Sin include - solo datos del afiliado
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
        }
        // Sin include para evitar problemas de tipos
      });

      if (!afiliado) {
        return null;
      }

      // Obtener familiares por separado usando método existente
      const familiares = await this.getFamiliaresByAfiliado(numero);

      return {
        afiliado: this.mapPrismaToAfiliado(afiliado),
        familiares,
        totalFamiliares: familiares.length
      };
    } catch (error) {
      console.error('Error getting afiliado by numero:', error);
      throw new Error('Error retrieving afiliado by numero');
    }
  }

  /**
   * Busca afiliados por documento
   */
  async getAfiliadosByDocumento(documento: string): Promise<any[]> {
    try {
      const afiliados = await prisma.afiliados.findMany({
        where: { 
          dni: documento,
          activo: true 
        },
        orderBy: [
          { apellido: 'asc' },
          { nombres: 'asc' }
        ]
        // Sin include para evitar problemas de tipos
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
  async updateAfiliado(afiliadoId: number, updateData: Partial<any>): Promise<any> {
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
        }
        // Sin include para evitar problemas de tipos
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
    afiliados: any[];
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
          skip: offset
          // Sin include para evitar problemas de tipos
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
  private mapPrismaToAfiliado(prismaAfiliado: any): IAfiliado | IAfiliadoDetailed {
    try {
      const mapped = {
        id: prismaAfiliado.id || 0,
        cuil: prismaAfiliado.cuil || '',
        dni: prismaAfiliado.dni || '',
        apellido: prismaAfiliado.apellido || '',
        nombres: prismaAfiliado.nombres || '',
        numeroAfiliado: prismaAfiliado.numero_afiliado || prismaAfiliado.cuil || '',
        numero_afiliado: prismaAfiliado.numero_afiliado || prismaAfiliado.cuil || '',
        documento: prismaAfiliado.dni || '',
        sexo: prismaAfiliado.sexo as 'M' | 'F' | 'X' | null,
        tipo_afiliado: prismaAfiliado.tipo_afiliado || null,
        fecha_nacimiento: prismaAfiliado.fecha_nacimiento || null,
        categoria: prismaAfiliado.categoria || null,
        situacion_sindicato: prismaAfiliado.situacion_sindicato as 'ACTIVO' | 'BAJA' | null,
        situacion_obra_social: prismaAfiliado.situacion_obra_social as 'ACTIVO' | 'BAJA' | null,
        domicilio: prismaAfiliado.domicilio || null,
        provincia: prismaAfiliado.provincia || null,
        localidad: prismaAfiliado.localidad || null,
        empresa_cuit: prismaAfiliado.empresa_cuit || null,
        empresa_nombre: prismaAfiliado.empresa_nombre || null,
        codigo_postal: prismaAfiliado.codigo_postal || null,
        telefono: prismaAfiliado.telefono || null,
        email: prismaAfiliado.email || null,
        grupo_sanguineo: prismaAfiliado.grupo_sanguineo || null,
        foto_url: prismaAfiliado.foto_url || null,
        qr_code: prismaAfiliado.qr_code || null,
        padron_version_id: prismaAfiliado.padron_version_id || null,
        activo: prismaAfiliado.activo !== undefined ? prismaAfiliado.activo : true,
        created_at: prismaAfiliado.created_at || null,
        updated_at: prismaAfiliado.updated_at || null
      };

      // Si incluye familiares, agregarlos al resultado
      if (prismaAfiliado.Familiares && Array.isArray(prismaAfiliado.Familiares)) {
        return {
          ...mapped,
          Familiares: prismaAfiliado.Familiares.map(this.mapPrismaToFamiliar)
        } as IAfiliadoDetailed;
      }

      return mapped as IAfiliado;
    } catch (error) {
      console.error('Error mapping Prisma afiliado:', error);
      console.error('Prisma afiliado data:', JSON.stringify(prismaAfiliado, null, 2));
      throw new Error('Error mapping afiliado data');
    }
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
  async getAfiliadosByDni(dni: string): Promise<any[]> {
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
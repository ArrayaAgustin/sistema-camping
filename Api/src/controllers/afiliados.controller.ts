import { Request, Response } from 'express';
import { afiliadosService } from '../services';
import { IAfiliadosController } from '../interfaces/afiliados/afiliados.interfaces';
import { 
  IAfiliado, 
  IAfiliadoResponse, 
  IPadronVersion, 
  IPadronStats, 
  IApiResponse,
  Permission
} from '../types';
import { responseHandler } from '../middlewares';

/**
 * Controlador de afiliados - Implementa IAfiliadosController
 * Maneja todas las operaciones relacionadas con afiliados y familiares
 */
export class AfiliadosController implements IAfiliadosController {

  /**
   * GET /afiliados - Busca afiliados según criterios
   */
  async searchAfiliados(req: Request, res: Response): Promise<Response<IAfiliado[]>> {
    const { 
      numeroAfiliado,
      apellidos,
      nombres,
      documento,
      estado = 'activo',
      limit = '20',
      offset = '0'
    } = req.query as any;
    
    console.log('🔍 Searching afiliados:', { 
      numeroAfiliado, 
      apellidos, 
      nombres, 
      documento, 
      estado,
      limit, 
      offset,
      user: req.user?.username 
    });
    
    try {
      const searchCriteria = {
        numeroAfiliado: numeroAfiliado as string,
        apellidos: apellidos as string,
        nombres: nombres as string,
        documento: documento as string,
        estado: estado as string,
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
      };

      // Validar parámetros
      if (searchCriteria.limit > 100) {
        return responseHandler.validationError(res, ['Limit cannot exceed 100']);
      }

      if (searchCriteria.limit < 1) {
        return responseHandler.validationError(res, ['Limit must be at least 1']);
      }

      const afiliados = await afiliadosService.searchAfiliados('general', searchCriteria.documento || searchCriteria.apellidos || '', searchCriteria.limit);
      
      console.log(`✅ Found ${afiliados.length} afiliados`);
      
      return responseHandler.success(res, afiliados, `Found ${afiliados.length} afiliados`);
      
    } catch (error: any) {
      console.error('❌ Search afiliados error:', {
        message: error.message,
        stack: error.stack,
        query: req.query
      });
      
      return responseHandler.internalError(res, 'Error searching afiliados');
    }
  }

  /**
   * GET /afiliados/:id - Obtiene un afiliado específico con familiares
   */
  async getAfiliadoById(req: Request, res: Response): Promise<Response<IAfiliadoResponse>> {
    const id = parseInt(req.params.id, 10);
    
    if (!id || isNaN(id) || id <= 0) {
      return responseHandler.validationError(res, ['Afiliado ID must be a valid positive number']);
    }

    console.log('🔍 Getting afiliado by ID:', {
      id,
      user: req.user?.username,
      timestamp: new Date().toISOString()
    });

    try {
      // Verificar permisos de acceso
      if (req.user && !afiliadosService.canAccessAfiliado(req.user, id)) {
        console.log('❌ Access denied for user:', req.user.username, 'to afiliado:', id);
        return responseHandler.forbidden(res, 'You do not have permission to access this afiliado');
      }

      const result = await afiliadosService.getAfiliadoWithFamily(id);
      
      if (!result) {
        console.log('❌ Afiliado not found:', id);
        return responseHandler.notFound(res, 'No afiliado found with the specified ID');
      }
      
      console.log('✅ Afiliado found:', {
        id: result.afiliado.id,
        apellido: result.afiliado.apellido,
        nombres: result.afiliado.nombres,
        familiares: result.familiares.length
      });
      
      return responseHandler.success(res, result, 'Afiliado retrieved successfully');
      
    } catch (error: any) {
      console.error('❌ Get afiliado error:', {
        message: error.message,
        stack: error.stack,
        afiliadoId: id
      });
      
      return responseHandler.internalError(res, 'Error retrieving afiliado');
    }
  }

  /**
   * GET /afiliados/numero/:numeroAfiliado - Busca afiliado por número
   */
  async getAfiliadoByNumero(req: Request, res: Response): Promise<Response<IAfiliado | null>> {
    const numeroAfiliadoStr = req.params.numeroAfiliado;
    
    if (!numeroAfiliadoStr || typeof numeroAfiliadoStr !== 'string') {
      return responseHandler.validationError(res, ['Numero de afiliado is required']);
    }

    const numeroAfiliado = parseInt(numeroAfiliadoStr, 10);
    
    if (isNaN(numeroAfiliado)) {
      return responseHandler.validationError(res, ['Numero de afiliado must be a valid number']);
    }

    console.log('🔍 Getting afiliado by numero:', numeroAfiliado);

    try {
      const afiliado = await afiliadosService.getAfiliadoByNumero(numeroAfiliado);
      
      if (!afiliado) {
        return responseHandler.notFound(res, 'No afiliado found with the specified numero');
      }

      // Verificar permisos si hay usuario autenticado
      if (req.user && !afiliadosService.canAccessAfiliado(req.user, afiliado.afiliado.id)) {
        return responseHandler.forbidden(res, 'Access denied to this afiliado');
      }

      console.log('✅ Afiliado found by numero:', afiliado.afiliado.apellido, afiliado.afiliado.nombres);
      
      return responseHandler.success(res, afiliado, 'Afiliado found successfully');
      
    } catch (error: any) {
      console.error('❌ Get afiliado by numero error:', error.message);
      return responseHandler.internalError(res, 'Error retrieving afiliado by numero');
    }
  }

  /**
   * GET /afiliados/dni/:dni - Busca afiliados por DNI
   * Requerido por IAfiliadosController
   */
  async getAfiliadosByDni(req: Request, res: Response): Promise<Response<IAfiliado[]>> {
    const { dni } = req.params;
    
    if (!dni || typeof dni !== 'string') {
      return responseHandler.validationError(res, ['DNI is required']);
    }

    console.log('🔍 Getting afiliados by DNI:', dni);

    try {
      const afiliados = await afiliadosService.searchAfiliados('dni', dni, 50);
      
      // Filtrar por permisos si hay usuario autenticado
      let filteredAfiliados = afiliados;
      if (req.user) {
        filteredAfiliados = afiliados.filter(afiliado => 
          afiliadosService.canAccessAfiliado(req.user!, afiliado.id)
        );
      }
      
      console.log(`✅ Found ${filteredAfiliados.length} afiliados with DNI ${dni}`);
      
      return responseHandler.success(res, filteredAfiliados, `Found ${filteredAfiliados.length} afiliados with DNI`);
      
    } catch (error: any) {
      console.error('❌ Get afiliados by DNI error:', error.message);
      return responseHandler.internalError(res, 'Error retrieving afiliados by DNI');
    }
  }

  /**
   * GET /afiliados/documento/:documento - Busca afiliados por documento
   */
  async getAfiliadosByDocumento(req: Request, res: Response): Promise<Response<IAfiliado[]>> {
    const { documento } = req.params;
    
    if (!documento || typeof documento !== 'string') {
      return responseHandler.validationError(res, ['Document number is required']);
    }

    console.log('🔍 Getting afiliados by documento:', documento);

    try {
      const afiliados = await afiliadosService.getAfiliadosByDocumento(documento);
      
      // Filtrar por permisos si hay usuario autenticado
      let filteredAfiliados = afiliados;
      if (req.user) {
        filteredAfiliados = afiliados.filter(afiliado => 
          afiliadosService.canAccessAfiliado(req.user!, afiliado.id)
        );
      }
      
      console.log(`✅ Found ${filteredAfiliados.length} afiliados with documento:`, documento);
      
      return responseHandler.success(res, filteredAfiliados, `Found ${filteredAfiliados.length} afiliados`);
      
    } catch (error: any) {
      console.error('❌ Get afiliados by documento error:', error.message);
      return responseHandler.internalError(res, 'Error retrieving afiliados by documento');
    }
  }

  /**
   * GET /afiliados/version/padron - Obtiene información de la versión del padrón
   */
  async getPadronVersion(req: Request, res: Response): Promise<Response<IPadronVersion>> {
    console.log('📊 Getting padron version');
    
    try {
      const version = await afiliadosService.getPadronVersion();
      
      console.log('✅ Padron version found:', version.version);
      
      return responseHandler.success(res, version, 'Padron version retrieved successfully');
      
    } catch (error: any) {
      console.error('❌ Get padron version error:', error.message);
      return responseHandler.internalError(res, 'Error retrieving padron version');
    }
  }

  /**
   * GET /afiliados/stats/padron - Obtiene estadísticas del padrón
   */
  async getPadronStats(req: Request, res: Response): Promise<Response<IApiResponse<IPadronStats>>> {
    console.log('📈 Getting padron stats');
    
    try {
      const stats = await afiliadosService.getPadronStats();
      
      console.log('✅ Padron stats:', {
        totalAfiliados: stats.totalAfiliados,
        totalActivos: stats.totalActivos,
        totalFamiliares: stats.totalFamiliares
      });
      
      return responseHandler.success(res, stats, 'Padron statistics retrieved successfully');
      
    } catch (error: any) {
      console.error('❌ Get padron stats error:', error.message);
      return responseHandler.internalError(res, 'Error retrieving padron statistics');
    }
  }

  /**
   * POST /afiliados/search/advanced - Búsqueda avanzada de afiliados
   */
  async advancedSearch(req: Request, res: Response): Promise<Response<any>> {
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
    } = req.body;

    console.log('🔍 Advanced search request:', {
      text,
      estado,
      page,
      pageSize,
      user: req.user?.username
    });

    try {
      const filters = {
        text,
        estado,
        seccion,
        delegacion,
        fechaNacimientoDesde: fechaNacimientoDesde ? new Date(fechaNacimientoDesde) : undefined,
        fechaNacimientoHasta: fechaNacimientoHasta ? new Date(fechaNacimientoHasta) : undefined,
        page: Math.max(1, parseInt(page) || 1),
        pageSize: Math.min(100, Math.max(1, parseInt(pageSize) || 20)),
        sortBy,
        sortOrder: sortOrder === 'desc' ? 'desc' as const : 'asc' as const
      };

      const result = await afiliadosService.advancedSearch(filters);
      
      console.log('✅ Advanced search completed:', {
        found: result.afiliados.length,
        total: result.total,
        pages: result.totalPages
      });
      
      return responseHandler.paginated(res, result.afiliados, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      }, 'Advanced search completed successfully');
      
    } catch (error: any) {
      console.error('❌ Advanced search error:', error.message);
      return responseHandler.internalError(res, 'Error in advanced search');
    }
  }

  /**
   * PUT /afiliados/:id - Actualiza datos de un afiliado
   */
  async updateAfiliado(req: Request, res: Response): Promise<Response<IAfiliado>> {
    const id = parseInt(req.params.id, 10);
    
    if (!id || isNaN(id) || id <= 0) {
      return responseHandler.validationError(res, ['Afiliado ID must be a valid positive number']);
    }

    console.log('✏️ Updating afiliado:', {
      id,
      user: req.user?.username,
      updateData: Object.keys(req.body)
    });

    try {
      // Verificar permisos
      if (!req.user) {
        return responseHandler.unauthorized(res, 'Authentication required');
      }

      // Solo admin o el mismo afiliado puede actualizar
      const canUpdate = req.user.permisos.includes(Permission.ALL) || 
                       req.user.permisos.includes(Permission.UPDATE_AFILIADOS) ||
                       (req.user.permisos.includes(Permission.UPDATE_OWN) && req.user.afiliado_id === id);

      if (!canUpdate) {
        return responseHandler.forbidden(res, 'Insufficient permissions to update afiliado');
      }

      const updatedAfiliado = await afiliadosService.updateAfiliado(id, req.body);
      
      console.log('✅ Afiliado updated successfully:', {
        id: updatedAfiliado.id,
        apellido: updatedAfiliado.apellido,
        nombres: updatedAfiliado.nombres
      });
      
      return responseHandler.success(res, updatedAfiliado, 'Afiliado updated successfully');
      
    } catch (error: any) {
      console.error('❌ Update afiliado error:', error.message);
      
      if (error.message.includes('not found')) {
        return responseHandler.notFound(res, 'Afiliado not found');
      }
      
      return responseHandler.internalError(res, 'Error updating afiliado');
    }
  }
}

// Exportar instancia del controlador
export const afiliadosController = new AfiliadosController();
export default afiliadosController;
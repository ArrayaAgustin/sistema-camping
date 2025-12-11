import { Request, Response } from 'express';
import { visitasService } from '../services';
import { IVisitasController } from '../interfaces/visitas/visitas.interfaces';
import { 
  ICreateVisitaRequest,
  ICreateVisitaResponse,
  IVisitaDetailed,
  ID
} from '../types';
import { responseHandler } from '../middlewares';

/**
 * Controlador de visitas - Implementa IVisitasController
 * Maneja todas las operaciones relacionadas con visitas
 */
export class VisitasController implements IVisitasController {

  /**
   * POST /visitas - Crear nueva visita
   */
  async createVisita(req: Request, res: Response): Promise<Response<ICreateVisitaResponse>> {
    console.log('📝 Creating new visita:', {
      afiliado_id: req.body?.afiliado_id,
      camping_id: req.body?.camping_id,
      usuario_id: req.user?.id,
      timestamp: new Date().toISOString()
    });

    const {
      afiliado_id,
      camping_id,
      periodo_caja_id,
      acompanantes,
      observaciones,
      registro_offline
    } = req.body;

    // Validaciones básicas
    if (!afiliado_id || !camping_id) {
      return responseHandler.validationError(res, [
        'afiliado_id y camping_id son requeridos'
      ]);
    }

    if (!req.user) {
      return responseHandler.unauthorized(res, 'Authentication required');
    }

    try {
      const visitaData: ICreateVisitaRequest = {
        afiliado_id,
        camping_id,
        periodo_caja_id,
        acompanantes,
        observaciones,
        registro_offline
      };

      const result = await visitasService.createVisita(visitaData, req.user.id);

      console.log('✅ Visita created successfully:', result.uuid);
      
      return responseHandler.created(res, result, 'Visita registered successfully');
      
    } catch (error: any) {
      console.error('❌ Create visita error:', error.message);
      return responseHandler.internalError(res, 'Error al registrar visita');
    }
  }

  /**
   * GET /visitas/dia - Obtener visitas por día
   */
  async getVisitasByDay(req: Request, res: Response): Promise<Response<IVisitaDetailed[]>> {
    const campingIdStr = req.query.camping_id as string;
    const fecha = (req.query.fecha as string) || new Date().toISOString().slice(0, 10);
    
    console.log('🔍 Getting visitas by day:', {
      camping_id: campingIdStr,
      fecha,
      timestamp: new Date().toISOString()
    });

    const campingId = parseInt(campingIdStr, 10);
    
    if (!campingId || isNaN(campingId)) {
      return responseHandler.validationError(res, ['camping_id requerido']);
    }

    if (!req.user) {
      return responseHandler.unauthorized(res, 'Authentication required');
    }

    try {
      const visitas = await visitasService.getVisitasByDay(campingId, fecha);

      console.log(`✅ Found ${visitas.length} visitas for date ${fecha}`);
      
      return responseHandler.success(res, visitas, `Found ${visitas.length} visitas`);
      
    } catch (error: any) {
      console.error('❌ Get visitas by day error:', error.message);
      return responseHandler.internalError(res, 'Server error');
    }
  }
}

// Exportar instancia del controlador
export const visitasController = new VisitasController();
export default visitasController;
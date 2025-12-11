import { Request, Response } from 'express';
import { syncService } from '../services';
import { ISyncController } from '../interfaces/visitas/visitas.interfaces';
import { 
  ISyncVisitasRequest,
  ISyncResponse
} from '../types';
import { responseHandler } from '../middlewares';

/**
 * Controlador de sincronización - Implementa ISyncController
 * Maneja todas las operaciones relacionadas con sincronización
 */
export class SyncController implements ISyncController {

  /**
   * POST /sync/visitas - Sincronizar visitas desde dispositivos offline
   */
  async syncVisitas(req: Request, res: Response): Promise<Response<ISyncResponse>> {
    console.log('🔄 Syncing visitas:', {
      campingId: req.body?.campingId,
      visitasCount: req.body?.visitas?.length,
      usuario_id: req.user?.id,
      timestamp: new Date().toISOString()
    });

    const { visitas, campingId } = req.body;

    // Validaciones básicas
    if (!Array.isArray(visitas) || !campingId) {
      return responseHandler.validationError(res, [
        'visitas(array) y campingId requeridos'
      ]);
    }

    if (!req.user) {
      return responseHandler.unauthorized(res, 'Authentication required');
    }

    try {
      const syncData: ISyncVisitasRequest = {
        campingId,
        visitas
      };

      const result = await syncService.syncVisitas(syncData, req.user.id);

      console.log('✅ Sync completed:', {
        sincronizadas: result.sincronizadas,
        errores: result.errores,
        total: visitas.length
      });
      
      return responseHandler.success(res, result, 
        `Sync completed: ${result.sincronizadas} synchronized, ${result.errores} errors`
      );
      
    } catch (error: any) {
      console.error('❌ Sync visitas error:', error.message);
      return responseHandler.internalError(res, 'Error during synchronization');
    }
  }
}

// Exportar instancia del controlador
export const syncController = new SyncController();
export default syncController;
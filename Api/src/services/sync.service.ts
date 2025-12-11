import { prisma } from '../config/prisma-config';
import { ISyncService } from '../interfaces/visitas/visitas.interfaces';
import { 
  ISyncVisitasRequest,
  ISyncResponse,
  ID
} from '../types';

/**
 * Servicio de sincronización - Implementa la lógica de negocio para sincronización de datos
 */
export class SyncService implements ISyncService {

  /**
   * Sincroniza visitas desde dispositivos offline
   */
  async syncVisitas(syncData: ISyncVisitasRequest, usuarioId: ID): Promise<ISyncResponse> {
    const { visitas, campingId } = syncData;
    
    let sincronizadas = 0;
    let errores = 0;

    // Procesar en serie para evitar conflictos de concurrencia
    for (const item of visitas) {
      try {
        // Comprobar si existe uuid
        const exists = await prisma.visitas.findUnique({ 
          where: { uuid: item.uuid } 
        });
        
        if (exists) {
          continue; // Ya existe, saltar
        }

        await prisma.visitas.create({
          data: {
            uuid: item.uuid,
            afiliado_id: item.afiliadoId,
            camping_id: campingId,
            periodo_caja_id: item.periodoCajaId || null,
            usuario_registro_id: usuarioId,
            fecha_ingreso: item.fechaIngreso ? new Date(item.fechaIngreso) : undefined,
            acompanantes: item.acompanantes ? JSON.stringify(item.acompanantes) : '[]',
            observaciones: item.observaciones || '',
            registro_offline: true,
            sincronizado: true
          }
        });
        
        sincronizadas++;

        // Actualizar periodo si aplica
        if (item.periodoCajaId) {
          await prisma.periodos_caja.updateMany({
            where: { id: item.periodoCajaId },
            data: { total_visitas: { increment: 1 } }
          });
        }
      } catch (err) {
        console.error('Error sync item', item.uuid, err);
        errores++;
      }
    }

    // Registrar log de sincronización
    await this.createSyncLog(usuarioId, campingId, sincronizadas, errores, visitas.length);

    return { sincronizadas, errores };
  }

  /**
   * Crea un log de sincronización
   */
  async createSyncLog(usuarioId: ID, campingId: ID, sincronizadas: number, errores: number, total: number): Promise<void> {
    try {
      const estado = errores === 0 ? 'success' : sincronizadas > 0 ? 'partial' : 'failed';
      
      await prisma.sync_logs.create({
        data: {
          usuario_id: usuarioId,
          camping_id: campingId,
          tipo: 'batch',
          registros_sincronizados: sincronizadas,
          estado,
          detalles: { total, sincronizadas, errores }
        }
      });
    } catch (error) {
      console.error('Error creating sync log:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }
}

// Exportar instancia singleton
export const syncService = new SyncService();
export default syncService;
import { prisma } from '../config/prisma-config';
import { IVisitasService } from '../interfaces/visitas/visitas.interfaces';
import { 
  ICreateVisitaRequest,
  ICreateVisitaResponse,
  IVisitaDetailed,
  ID
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio de visitas - Implementa la lógica de negocio para gestión de visitas
 */
export class VisitasService implements IVisitasService {

  /**
   * Crea una nueva visita
   */
  async createVisita(visitaData: ICreateVisitaRequest, usuarioId: ID): Promise<ICreateVisitaResponse> {
    const {
      afiliado_id,
      camping_id,
      periodo_caja_id = null,
      acompanantes = null,
      observaciones = '',
      registro_offline = false
    } = visitaData;

    const uuid = uuidv4();

    try {
      const visita = await prisma.visitas.create({
        data: {
          uuid,
          afiliado_id,
          camping_id,
          periodo_caja_id,
          usuario_registro_id: usuarioId,
          acompanantes: acompanantes ? JSON.stringify(acompanantes) : '[]',
          observaciones,
          registro_offline,
          sincronizado: !registro_offline
        }
      });

      // Actualizar total_visitas si periodo_caja_id presente
      if (periodo_caja_id) {
        await this.updatePeriodoCajaVisitas(periodo_caja_id);
      }

      return {
        visita_id: visita.id,
        uuid
      };
    } catch (error) {
      console.error('Error creating visita:', error);
      throw new Error('Error al registrar visita');
    }
  }

  /**
   * Obtiene visitas por día
   */
  async getVisitasByDay(campingId: ID, fecha: string): Promise<IVisitaDetailed[]> {
    try {
      const fechaInicio = new Date(fecha + 'T00:00:00.000Z');
      const fechaFin = new Date(fecha + 'T23:59:59.999Z');
      
      const visitas = await prisma.visitas.findMany({
        where: {
          camping_id: campingId,
          fecha_ingreso: {
            gte: fechaInicio,
            lte: fechaFin
          }
        },
        include: {
          Afiliado: {
            select: {
              dni: true,
              apellido: true,
              nombres: true,
              situacion_sindicato: true,
              situacion_obra_social: true
            }
          }
        },
        orderBy: {
          fecha_ingreso: 'desc'
        }
      });

      return visitas as IVisitaDetailed[];
    } catch (error) {
      console.error('Error getting visitas by day:', error);
      throw new Error('Error al obtener visitas del día');
    }
  }

  /**
   * Actualiza el contador de visitas en periodo_caja
   */
  async updatePeriodoCajaVisitas(periodoCajaId: ID): Promise<void> {
    try {
      await prisma.periodos_caja.updateMany({
        where: { id: periodoCajaId },
        data: { total_visitas: { increment: 1 } }
      });
    } catch (error) {
      console.error('Error updating periodo caja visitas:', error);
      // No lanzamos error para no interrumpir el flujo principal
    }
  }
}

// Exportar instancia singleton
export const visitasService = new VisitasService();
export default visitasService;
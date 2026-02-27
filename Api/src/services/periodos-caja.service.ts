import { prisma } from '../config/prisma-config';
import {
  IPeriodoCaja,
  IPeriodoCajaDetailed,
  IAbrirPeriodoCajaRequest,
  ICerrarPeriodoCajaRequest,
  IPeriodoCajaResponse,
  ID
} from '../types';

/**
 * Servicio de períodos de caja - Implementa la lógica de negocio para gestión de turnos
 */
export class PeriodosCajaService {

  private async ensureCampingAccess(usuarioId: ID, campingId: ID): Promise<void> {
    const roles = await prisma.usuario_roles.findMany({
      where: {
        usuario_id: usuarioId,
        OR: [
          { camping_id: campingId },
          { camping_id: null }
        ]
      },
      include: {
        Role: true
      }
    });

    if (!roles || roles.length === 0) {
      throw new Error('Usuario sin acceso al camping');
    }

    const hasCampingRole = roles.some(r => r.camping_id === campingId);
    if (hasCampingRole) {
      return;
    }

    const hasAdmin = roles.some(r => r.Role?.nombre === 'admin');
    if (hasAdmin) {
      return;
    }

    const hasAll = roles.some(r => {
      const permisos = r.Role?.permisos as any;
      try {
        if (Array.isArray(permisos)) {
          return permisos.includes('all');
        }
        if (typeof permisos === 'string') {
          const parsed = JSON.parse(permisos);
          return Array.isArray(parsed) && parsed.includes('all');
        }
      } catch {
        return false;
      }
      return false;
    });

    if (!hasAll) {
      throw new Error('Usuario sin permisos para este camping');
    }
  }

  /**
   * Abre un nuevo período de caja (turno)
   */
  async abrirPeriodo(data: IAbrirPeriodoCajaRequest, usuarioId: ID): Promise<IPeriodoCajaResponse> {
    const { camping_id, observaciones } = data;

    try {
      await this.ensureCampingAccess(usuarioId, camping_id);

      // Verificar que no haya un período activo en este camping
      const periodoActivo = await prisma.periodos_caja.findFirst({
        where: {
          camping_id,
          activo: true,
          fecha_cierre: null
        }
      });

      if (periodoActivo) {
        throw new Error('Ya existe un período de caja activo en este camping');
      }

      // Crear nuevo período de caja
      const periodo = await prisma.periodos_caja.create({
        data: {
          camping_id,
          usuario_apertura_id: usuarioId,
          fecha_apertura: new Date(),
          observaciones: observaciones || null,
          total_visitas: 0,
          activo: true,
          sincronizado: true
        }
      });

      return {
        success: true,
        periodo: periodo as IPeriodoCaja,
        message: 'Período de caja abierto exitosamente'
      };
    } catch (error: any) {
      throw new Error(`Error al abrir período de caja: ${error.message}`);
    }
  }

  /**
   * Cierra un período de caja activo
   */
  async cerrarPeriodo(periodoId: ID, data: ICerrarPeriodoCajaRequest, usuarioId: ID): Promise<IPeriodoCajaResponse> {
    const { observaciones } = data;

    try {
      // Verificar que el período existe y está activo
      const periodo = await prisma.periodos_caja.findFirst({
        where: {
          id: periodoId,
          activo: true,
          fecha_cierre: null
        }
      });

      if (!periodo) {
        throw new Error('Período de caja no encontrado o ya está cerrado');
      }

      await this.ensureCampingAccess(usuarioId, periodo.camping_id);

      // Cerrar período de caja
      const periodoCerrado = await prisma.periodos_caja.update({
        where: { id: periodoId },
        data: {
          fecha_cierre: new Date(),
          usuario_cierre_id: usuarioId,
          observaciones: observaciones || periodo.observaciones,
          activo: false
        }
      });

      return {
        success: true,
        periodo: periodoCerrado as IPeriodoCaja,
        message: 'Período de caja cerrado exitosamente'
      };
    } catch (error: any) {
      throw new Error(`Error al cerrar período de caja: ${error.message}`);
    }
  }

  /**
   * Obtiene el período de caja activo de un camping
   */
  async getPeriodoActivo(campingId: ID): Promise<IPeriodoCajaDetailed | null> {
    try {
      const periodo = await prisma.periodos_caja.findFirst({
        where: {
          camping_id: campingId,
          activo: true,
          fecha_cierre: null
        },
        include: {
          Camping: {
            select: {
              id: true,
              nombre: true
            }
          },
          UsuarioApertura: {
            select: {
              id: true,
              username: true
            }
          },
          UsuarioCierre: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      if (!periodo) {
        return null;
      }

      // Convertir nombres de Prisma a la interfaz
      const { Camping, UsuarioApertura, UsuarioCierre, ...periodoData } = periodo;
      
      return {
        ...periodoData,
        camping: Camping,
        usuarioApertura: UsuarioApertura,
        usuarioCierre: UsuarioCierre
      } as IPeriodoCajaDetailed;
    } catch (error: any) {
      throw new Error(`Error al obtener período activo: ${error.message}`);
    }
  }

  /**
   * Obtiene un período de caja por ID
   */
 async getPeriodoById(periodoId: ID): Promise<IPeriodoCajaDetailed | null> {
  try {
    const periodo = await prisma.periodos_caja.findUnique({
      where: { id: periodoId },
      include: {
        Camping: {
          select: {
            id: true,
            nombre: true
          }
        },
        UsuarioApertura: {
          select: {
            id: true,
            username: true
          }
        },
        UsuarioCierre: {
          select: {
            id: true,
            username: true
          }
        },
        Visitas: {
          select: {
            id: true,
            uuid: true,
            fecha_ingreso: true,
            Afiliado: {
              select: {
                Persona: {
                  select: {
                    dni: true,
                    apellido: true,
                    nombres: true
                  }
                }
              }
            }
          },
          orderBy: {
            fecha_ingreso: 'desc'
          }
        }
      }
    });

    if (!periodo) {
      return null;
    }

    return {
      ...periodo,
      camping: periodo.Camping,
      usuarioApertura: periodo.UsuarioApertura,
      usuarioCierre: periodo.UsuarioCierre
    } as IPeriodoCajaDetailed;

  } catch (error: any) {
    throw new Error(`Error al obtener período: ${error.message}`);
  }
}


  /**
   * Obtiene el historial de períodos de caja de un camping
   */
  async getHistorialPeriodos(campingId: ID, limite: number = 20): Promise<IPeriodoCajaDetailed[]> {
    try {
      const periodos = await prisma.periodos_caja.findMany({
        where: {
          camping_id: campingId
        },
        include: {
          Camping: {
            select: {
              id: true,
              nombre: true
            }
          },
          UsuarioApertura: {
            select: {
              id: true,
              username: true
            }
          },
          UsuarioCierre: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: {
          fecha_apertura: 'desc'
        },
        take: limite
      });

      return periodos.map(periodo => {
        const { Camping, UsuarioApertura, UsuarioCierre, ...periodoData } = periodo;
        return {
          ...periodoData,
          camping: Camping,
          usuarioApertura: UsuarioApertura,
          usuarioCierre: UsuarioCierre
        };
      }) as IPeriodoCajaDetailed[];
    } catch (error: any) {
      throw new Error(`Error al obtener historial: ${error.message}`);
    }
  }
}
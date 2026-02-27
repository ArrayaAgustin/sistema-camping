import { prisma } from '../config/prisma-config';
import { Prisma } from '@prisma/client';
import { IVisitasService } from '../interfaces/visitas/visitas.interfaces';
import { 
  ICreateVisitaRequest,
  ICreateVisitaResponse,
  ICreateVisitaBatchRequest,
  ICreateVisitaBatchResponse,
  IVisitaDetailed,
  ID
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio de visitas - Implementa la lógica de negocio para gestión de visitas
 */
export class VisitasService implements IVisitasService {

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
   * Crea una nueva visita
   */
  async createVisita(visitaData: ICreateVisitaRequest, usuarioId: ID): Promise<ICreateVisitaResponse> {
    const {
      afiliado_id,
      persona_id,
      camping_id,
      periodo_caja_id = null,
      acompanantes = null,
      observaciones = '',
      registro_offline = false
    } = visitaData;

    await this.ensureCampingAccess(usuarioId, camping_id);

    let resolvedAfiliadoId = afiliado_id || null;
    let resolvedPersonaId = persona_id || null;

    if (!resolvedPersonaId) {
      if (!afiliado_id) {
        throw new Error('persona_id o afiliado_id es requerido');
      }

      const afiliado = await prisma.afiliados.findUnique({
        where: { id: afiliado_id }
      });

      if (afiliado?.persona_id) {
        resolvedPersonaId = afiliado.persona_id;
      } else {
        throw new Error('El afiliado no tiene persona asociada');
      }
    }

    if (!resolvedAfiliadoId) {
      const afiliado = await prisma.afiliados.findFirst({
        where: { persona_id: resolvedPersonaId }
      });

      if (afiliado) {
        resolvedAfiliadoId = afiliado.id;
      } else {
        const familiar = await prisma.familiares.findFirst({
          where: { persona_id: resolvedPersonaId }
        });

        if (familiar) {
          resolvedAfiliadoId = familiar.afiliado_id;
        }
      }
    }

    // Verificar duplicado en el mismo turno
    if (periodo_caja_id && resolvedPersonaId) {
      const existente = await prisma.visitas.findFirst({
        where: { persona_id: resolvedPersonaId, periodo_caja_id }
      });
      if (existente) {
        throw new Error('La persona ya tiene un ingreso registrado en este turno');
      }
    }

    // Determinar condición de ingreso en el momento
    let condicion_ingreso: 'AFILIADO' | 'FAMILIAR' | 'INVITADO' | 'DESCONOCIDO' = 'DESCONOCIDO';
    const now = new Date();

    if (resolvedPersonaId) {
      const invitado = await prisma.invitados.findFirst({
        where: { persona_id: resolvedPersonaId, activo: true }
      });

      if (invitado) {
        const vigente = (!invitado.vigente_desde || invitado.vigente_desde <= now) &&
          (!invitado.vigente_hasta || invitado.vigente_hasta >= now);

        if (vigente) {
          condicion_ingreso = 'INVITADO';
        }
      }

      if (condicion_ingreso === 'DESCONOCIDO' && resolvedAfiliadoId) {
        const afiliado = await prisma.afiliados.findUnique({
          where: { id: resolvedAfiliadoId }
        });

        if (afiliado?.activo && afiliado.situacion_sindicato === 'ACTIVO') {
          condicion_ingreso = 'AFILIADO';
        }
      }

      if (condicion_ingreso === 'DESCONOCIDO') {
        const familiar = await prisma.familiares.findFirst({
          where: { persona_id: resolvedPersonaId, activo: true, baja: false }
        });

        if (familiar) {
          const titular = await prisma.afiliados.findUnique({
            where: { id: familiar.afiliado_id }
          });

          if (titular?.activo && titular.situacion_sindicato === 'ACTIVO') {
            condicion_ingreso = 'FAMILIAR';
          }
        }
      }
    }

    const uuid = uuidv4();

    try {
      const data: Prisma.visitasUncheckedCreateInput = {
        uuid,
        persona_id: resolvedPersonaId,
        camping_id,
        periodo_caja_id,
        usuario_registro_id: usuarioId,
        condicion_ingreso,
        acompanantes: acompanantes ? JSON.stringify(acompanantes) : '[]',
        observaciones,
        registro_offline,
        sincronizado: !registro_offline
      };

      if (resolvedAfiliadoId !== null) {
        data.afiliado_id = resolvedAfiliadoId;
      }

      const visita = await prisma.visitas.create({
        data
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
   * Crea múltiples visitas en batch
   */
  async createVisitasBatch(batchData: ICreateVisitaBatchRequest, usuarioId: ID): Promise<ICreateVisitaBatchResponse> {
    const { camping_id, periodo_caja_id = null, personas, observaciones, registro_offline } = batchData;

    await this.ensureCampingAccess(usuarioId, camping_id);

    if (!personas || !Array.isArray(personas) || personas.length === 0) {
      throw new Error('personas es requerido');
    }

    const results: ICreateVisitaBatchResponse['results'] = [];

    for (const item of personas) {
      const personaId = item.persona_id;

      try {
        const visita = await this.createVisita({
          persona_id: personaId,
          camping_id,
          periodo_caja_id,
          observaciones: observaciones || '',
          registro_offline: registro_offline || false
        }, usuarioId);

        await prisma.visitas.update({
          where: { id: visita.visita_id },
          data: { condicion_ingreso: item.condicion_ingreso }
        });

        results.push({
          ok: true,
          persona_id: personaId,
          visita_id: visita.visita_id,
          uuid: visita.uuid
        });
      } catch (error: any) {
        results.push({
          ok: false,
          persona_id: personaId,
          error: error.message || 'Error creando visita'
        });
      }
    }

    const created = results.filter(r => r.ok).length;
    const failed = results.length - created;

    return {
      total: results.length,
      created,
      failed,
      results
    };
  }


  /**
   * Obtiene visitas por día
   */
 async getVisitasByDay(
  campingId: ID,
  fecha: string
): Promise<IVisitaDetailed[]> {
  try {
    const fechaInicio = new Date(`${fecha}T00:00:00.000Z`);
    const fechaFin = new Date(`${fecha}T23:59:59.999Z`);

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
            situacion_sindicato: true,
            situacion_obra_social: true,
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
    });

    return visitas.map(v => ({
      ...v,
      Afiliado: v.Afiliado
        ? {
            dni: v.Afiliado.Persona?.dni ?? '',
            apellido: v.Afiliado.Persona?.apellido ?? '',
            nombres: v.Afiliado.Persona?.nombres ?? '',
            situacion_sindicato: v.Afiliado.situacion_sindicato,
            situacion_obra_social: v.Afiliado.situacion_obra_social
          }
        : undefined
    }));
  } catch (error) {
    console.error('Error getting visitas by day:', error);
    throw new Error('Error al obtener visitas del día');
  }
}


  /**
   * Obtiene visitas de un período de caja específico
   */
  async getVisitasByPeriodo(periodoId: ID): Promise<any[]> {
    try {
      const visitas = await prisma.visitas.findMany({
        where: { periodo_caja_id: periodoId },
        include: {
          Persona: {
            select: { id: true, dni: true, apellido: true, nombres: true }
          }
        },
        orderBy: { fecha_ingreso: 'desc' }
      });

      return visitas.map(v => ({
        id: v.id,
        uuid: v.uuid,
        fecha_ingreso: v.fecha_ingreso,
        condicion_ingreso: v.condicion_ingreso,
        acompanantes: v.acompanantes,
        persona: v.Persona
          ? {
              id: v.Persona.id,
              dni: v.Persona.dni,
              apellido: v.Persona.apellido ?? '',
              nombres: v.Persona.nombres ?? '',
              nombre_completo: `${v.Persona.apellido ?? ''} ${v.Persona.nombres ?? ''}`.trim()
            }
          : null
      }));
    } catch (error) {
      console.error('Error getting visitas by periodo:', error);
      throw new Error('Error al obtener visitas del período');
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
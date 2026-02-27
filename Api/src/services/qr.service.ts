import { prisma } from "../config/prisma-config";
import { IQRService } from "interfaces/qr";
import { IQRResolveResponse } from "../types";

export class QRService implements IQRService {

  /** Lógica común: a partir de una persona Prisma, evalúa acceso y devuelve respuesta completa */
  private async resolveByPersona(persona: any): Promise<IQRResolveResponse> {

    const tipos: IQRResolveResponse["tipos"] = [];

    // Afiliado
    const afiliado = await prisma.afiliados.findFirst({
      where: { persona_id: persona.id }
    });
    if (afiliado) tipos.push("AFILIADO");

    // Familiar (esta persona ES familiar de alguien)
    const familiares = await prisma.familiares.findMany({
      where: { persona_id: persona.id }
    });
    if (familiares.length > 0) tipos.push("FAMILIAR");

    // Invitado
    const invitado = await prisma.invitados.findFirst({
      where: { persona_id: persona.id, activo: true }
    });
    if (invitado) tipos.push("INVITADO");

    // Familiares DEL titular (para mostrar grupo familiar en panel operador)
    let familiaresDelTitular: IQRResolveResponse["familiaresDelTitular"] = undefined;
    if (afiliado) {
      const fams = await (prisma as any).familiares.findMany({
        where: { afiliado_id: afiliado.id, activo: true, baja: false },
        include: {
          Persona: { select: { id: true, dni: true, apellido: true, nombres: true } }
        }
      });
      if (fams.length > 0) {
        familiaresDelTitular = fams.map((f: any) => ({
          id: f.id,
          persona_id: f.persona_id,
          dni: f.Persona?.dni ?? '',
          nombre_completo: f.Persona ? `${f.Persona.apellido} ${f.Persona.nombres}` : 'Desconocido',
          activo: f.activo,
          baja: f.baja
        }));
      }
    }

    // Validación de ingreso
    const now = new Date();
    const invitadoVigente = invitado
      ? (invitado.activo &&
         (!invitado.vigente_desde || invitado.vigente_desde <= now) &&
         (!invitado.vigente_hasta || invitado.vigente_hasta >= now))
      : false;

    let allowed = false;
    let reason: string | undefined;

    if (invitadoVigente) {
      allowed = true;
      reason = 'INVITADO_VIGENTE';
    } else if (afiliado) {
      if (afiliado.activo && afiliado.situacion_sindicato === 'ACTIVO') {
        allowed = true;
        reason = 'AFILIADO_ACTIVO';
      } else {
        allowed = false;
        reason = 'AFILIADO_INACTIVO';
      }
    } else if (familiares.length > 0) {
      const familiarValido = familiares.find(f => f.activo && !f.baja);
      if (familiarValido) {
        const titular = await prisma.afiliados.findUnique({
          where: { id: familiarValido.afiliado_id }
        });
        if (titular && titular.activo && titular.situacion_sindicato === 'ACTIVO') {
          allowed = true;
          reason = 'FAMILIAR_VALIDO';
        } else {
          allowed = false;
          reason = 'TITULAR_INACTIVO';
        }
      } else {
        allowed = false;
        reason = 'FAMILIAR_INACTIVO';
      }
    } else {
      allowed = false;
      reason = 'PERSONA_SIN_ROL';
    }

    return {
      persona: {
        id: persona.id,
        dni: persona.dni,
        apellido: persona.apellido ?? null,
        nombres: persona.nombres ?? null,
        nombre_completo: `${persona.apellido ?? ''} ${persona.nombres ?? ''}`.trim(),
        sexo: persona.sexo ?? null,
        fecha_nacimiento: persona.fecha_nacimiento ?? null,
        email: persona.email ?? null,
        telefono: persona.telefono ?? null,
        qr_code: persona.qr_code ?? ''
      },
      tipos,
      allowed,
      reason,
      afiliado: afiliado
        ? {
            id: afiliado.id,
            cuil: afiliado.cuil,
            situacion_sindicato: afiliado.situacion_sindicato,
            situacion_obra_social: afiliado.situacion_obra_social,
            activo: afiliado.activo
          }
        : undefined,
      familiares: familiares.length
        ? familiares.map(f => ({ id: f.id, afiliado_id: f.afiliado_id, activo: f.activo, baja: f.baja }))
        : undefined,
      familiaresDelTitular,
      invitado: invitado
        ? {
            id: invitado.id,
            vigente_desde: invitado.vigente_desde,
            vigente_hasta: invitado.vigente_hasta,
            aplica_a_familia: invitado.aplica_a_familia,
            activo: invitado.activo,
            vigente:
              (!invitado.vigente_desde || invitado.vigente_desde <= new Date()) &&
              (!invitado.vigente_hasta || invitado.vigente_hasta >= new Date())
          }
        : undefined
    };
  }

  async resolveByQRCode(qrCode: string): Promise<IQRResolveResponse> {
    const persona = await prisma.personas.findUnique({
      where: { qr_code: qrCode }
    });

    if (!persona) {
      return {
        persona: null as any,
        tipos: [],
        allowed: false,
        reason: 'PERSONA_NO_ENCONTRADA'
      };
    }

    return this.resolveByPersona(persona);
  }

  async resolveByDNI(dni: string): Promise<IQRResolveResponse> {
    const persona = await prisma.personas.findUnique({
      where: { dni }
    });

    if (!persona) {
      return {
        persona: null as any,
        tipos: [],
        allowed: false,
        reason: 'PERSONA_NO_ENCONTRADA'
      };
    }

    return this.resolveByPersona(persona);
  }
}

export const qrService = new QRService();

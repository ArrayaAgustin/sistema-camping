import { prisma } from '../config/prisma-config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { HashUtil } from '../utils/hash.util';
import {
  IPersonaSearchItem,
  IPersonaBasic,
  PersonaTipo,
  IPersonaFormInput,
  IPersonaFormResult,
  IPersonaFormUpdateInput,
  IPersonaFullResult,
  IPersonaTitularResult,
  IPersonaAfiliadoInput,
  IPersonaFamiliarUpdateInput,
  IPersonaInvitadoInput
} from '../types';
import { IPersonasService } from '../interfaces/personas/IPersonasService';

/**
 * Servicio de personas - Búsqueda unificada por identidad
 */
export class PersonasService implements IPersonasService {
  private mapToBasic(persona: any): IPersonaBasic {
    return {
      id: persona.id,
      dni: persona.dni,
      apellido: persona.apellido,
      nombres: persona.nombres,
      nombre_completo: persona.nombre_completo,
      sexo: persona.sexo as any,
      fecha_nacimiento: persona.fecha_nacimiento,
      email: persona.email,
      telefono: persona.telefono,
      qr_code: persona.qr_code
    };
  }

  private normalizeFecha(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private buildNombreCompleto(apellido?: string | null, nombres?: string | null): string | null {
    const full = `${apellido ?? ''} ${nombres ?? ''}`.trim();
    return full.length > 0 ? full : null;
  }

  async searchPersonas(q: string, limit: number = 20): Promise<IPersonaSearchItem[]> {
    if (!q || q.trim() === '') {
      return [];
    }

    const term = q.trim();
    const upper = term.toUpperCase();

    const personas = await prisma.personas.findMany({
      where: {
        OR: [
          { dni: { contains: term } },
          { apellido: { contains: upper } },
          { nombres: { contains: upper } },
          { nombre_completo: { contains: upper } }
        ]
      },
      take: Math.min(limit, 50),
      orderBy: {
        apellido: 'asc'
      }
    });

    if (personas.length === 0) {
      return [];
    }

    const personaIds = personas.map(p => p.id);

    const [afiliados, familiares, invitados] = await Promise.all([
      prisma.afiliados.findMany({
        where: { persona_id: { in: personaIds } }
      }),
      prisma.familiares.findMany({
        where: { persona_id: { in: personaIds } }
      }),
      prisma.invitados.findMany({
        where: { persona_id: { in: personaIds } }
      })
    ]);

    const afiliadoByPersona = new Map<number, (typeof afiliados)[0]>();
    afiliados.forEach(a => {
      if (a.persona_id) {
        afiliadoByPersona.set(a.persona_id, a);
      }
    });

    const familiaresByPersona = new Map<number, (typeof familiares)>();
    familiares.forEach(f => {
      if (!f.persona_id) return;
      const current = familiaresByPersona.get(f.persona_id) || [];
      current.push(f);
      familiaresByPersona.set(f.persona_id, current);
    });

    const invitadoByPersona = new Map<number, (typeof invitados)[0]>();
    invitados.forEach(i => {
      if (i.persona_id) {
        invitadoByPersona.set(i.persona_id, i);
      }
    });

    const now = new Date();

    return personas.map((p): IPersonaSearchItem => {
      const afiliado = afiliadoByPersona.get(p.id);
      const familiaresPersona = familiaresByPersona.get(p.id) || [];
      const invitado = invitadoByPersona.get(p.id);

      const tipos: PersonaTipo[] = [];
      if (afiliado) tipos.push('AFILIADO');
      if (familiaresPersona.length > 0) tipos.push('FAMILIAR');
      if (invitado) tipos.push('INVITADO');

      const personaBasic: IPersonaBasic = {
        id: p.id,
        dni: p.dni,
        apellido: p.apellido,
        nombres: p.nombres,
        nombre_completo: p.nombre_completo,
        sexo: p.sexo as any,
        fecha_nacimiento: p.fecha_nacimiento,
        email: p.email,
        telefono: p.telefono,
        qr_code: p.qr_code
      };

      const nombre = p.nombre_completo || `${p.apellido ?? ''} ${p.nombres ?? ''}`.trim();

      const invitadoVigente = invitado
        ? (
            (!invitado.vigente_desde || invitado.vigente_desde <= now) &&
            (!invitado.vigente_hasta || invitado.vigente_hasta >= now)
          )
        : null;

      return {
        persona: personaBasic,
        tipos,
        credencial: {
          persona_id: p.id,
          dni: p.dni,
          nombre,
          qr_code: p.qr_code,
          tipos,
          foto_url: afiliado?.foto_url ?? null
        },
        afiliado: afiliado
          ? {
              id: afiliado.id,
              cuil: afiliado.cuil,
              situacion_sindicato: afiliado.situacion_sindicato,
              situacion_obra_social: afiliado.situacion_obra_social,
              activo: afiliado.activo,
              foto_url: afiliado.foto_url
            }
          : undefined,
        familiares: familiaresPersona.length
          ? familiaresPersona.map(f => ({
              id: f.id,
              afiliado_id: f.afiliado_id,
              activo: f.activo,
              baja: f.baja
            }))
          : undefined,
        invitado: invitado
          ? {
              id: invitado.id,
              vigente_desde: invitado.vigente_desde,
              vigente_hasta: invitado.vigente_hasta,
              aplica_a_familia: invitado.aplica_a_familia,
              activo: invitado.activo,
              vigente: invitadoVigente
            }
          : undefined
      };
    });
  }

  async createPersona(input: IPersonaFormInput): Promise<IPersonaFormResult> {
    const dni = String(input.dni || '').trim();
    if (!dni) {
      throw new Error('dni es requerido');
    }

    return prisma.$transaction(async (tx) => {
      let created = false;
      let persona = await tx.personas.findUnique({ where: { dni } });

      if (!persona) {
        const nombreCompleto = (input.nombre_completo && String(input.nombre_completo).trim())
          ? String(input.nombre_completo).trim()
          : this.buildNombreCompleto(input.apellido ?? null, input.nombres ?? null);

        persona = await tx.personas.create({
          data: {
            dni,
            apellido: input.apellido ?? null,
            nombres: input.nombres ?? null,
            nombre_completo: nombreCompleto,
            sexo: (input.sexo as any) ?? null,
            fecha_nacimiento: this.normalizeFecha(input.fecha_nacimiento),
            email: input.email ?? null,
            telefono: input.telefono ?? null,
            qr_code: input.qr_code?.trim() || randomUUID()
          }
        });
        created = true;
      } else {
        const updateData: Prisma.personasUpdateInput = {};

        if (input.apellido !== undefined) updateData.apellido = input.apellido ?? null;
        if (input.nombres !== undefined) updateData.nombres = input.nombres ?? null;
        if (input.sexo !== undefined) updateData.sexo = (input.sexo as any) ?? null;
        if (input.fecha_nacimiento !== undefined) updateData.fecha_nacimiento = this.normalizeFecha(input.fecha_nacimiento);
        if (input.email !== undefined) updateData.email = input.email ?? null;
        if (input.telefono !== undefined) updateData.telefono = input.telefono ?? null;
        if (input.qr_code !== undefined) updateData.qr_code = input.qr_code?.trim() || persona.qr_code;

        if (input.nombre_completo !== undefined || input.apellido !== undefined || input.nombres !== undefined) {
          const apellido = input.apellido !== undefined ? input.apellido : persona.apellido;
          const nombres = input.nombres !== undefined ? input.nombres : persona.nombres;
          updateData.nombre_completo = (input.nombre_completo && String(input.nombre_completo).trim())
            ? String(input.nombre_completo).trim()
            : this.buildNombreCompleto(apellido ?? null, nombres ?? null);
        }

        if (Object.keys(updateData).length > 0) {
          persona = await tx.personas.update({
            where: { id: persona.id },
            data: updateData
          });
        }
      }

      await this.upsertAfiliado(tx, persona.id, input.afiliado, persona);
      await this.upsertFamiliar(tx, persona.id, input.familiar);
      await this.upsertInvitado(tx, persona.id, input.invitado);

      // Auto-crear usuario si la persona no tiene uno (username=DNI, password=DNI, must_change_password=true)
      const existingUser = await tx.usuarios.findFirst({ where: { persona_id: persona.id } });
      if (!existingUser) {
        const passwordHash = await HashUtil.hashPassword(dni);
        const newUser = await tx.usuarios.create({
          data: {
            username: dni,
            password_hash: passwordHash,
            persona_id: persona.id,
            afiliado_id: null,
            activo: true,
            must_change_password: true
          }
        });

        // Asignar rol 'usuario' por defecto (rol_id=3, usuario común)
        await (tx as any).usuario_roles.create({
          data: {
            usuario_id: newUser.id,
            rol_id: 3,
            camping_id: null,
            activo: true,
            fecha_asignacion: new Date()
          }
        });
      }

      const detail = await this.getPersonaDetailWithTx(tx, persona.id);
      if (!detail) {
        throw new Error('Persona no encontrada');
      }

      return { ...detail, created };
    });
  }

  async getPersonaById(personaId: number): Promise<IPersonaFullResult | null> {
    return this.getPersonaDetailWithTx(prisma, personaId);
  }

  async getPersonaByDni(dni: string): Promise<IPersonaFullResult | null> {
    const doc = String(dni || '').trim();
    if (!doc) return null;

    const persona = await prisma.personas.findUnique({ where: { dni: doc } });
    if (!persona) return null;

    return this.getPersonaDetailWithTx(prisma, persona.id);
  }

  async updatePersona(personaId: number, input: IPersonaFormUpdateInput): Promise<IPersonaFullResult> {
    return prisma.$transaction(async (tx) => {
      const persona = await tx.personas.findUnique({ where: { id: personaId } });
      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      if (input.dni && input.dni !== persona.dni) {
        const exists = await tx.personas.findUnique({ where: { dni: input.dni } });
        if (exists && exists.id !== personaId) {
          throw new Error('El dni ya existe');
        }
      }

      const updateData: Prisma.personasUpdateInput = {};

      if (input.dni !== undefined) updateData.dni = String(input.dni).trim();
      if (input.apellido !== undefined) updateData.apellido = input.apellido ?? null;
      if (input.nombres !== undefined) updateData.nombres = input.nombres ?? null;
      if (input.sexo !== undefined) updateData.sexo = (input.sexo as any) ?? null;
      if (input.fecha_nacimiento !== undefined) updateData.fecha_nacimiento = this.normalizeFecha(input.fecha_nacimiento);
      if (input.email !== undefined) updateData.email = input.email ?? null;
      if (input.telefono !== undefined) updateData.telefono = input.telefono ?? null;
      if (input.qr_code !== undefined) updateData.qr_code = input.qr_code?.trim() || persona.qr_code;

      if (input.nombre_completo !== undefined || input.apellido !== undefined || input.nombres !== undefined) {
        const apellido = input.apellido !== undefined ? input.apellido : persona.apellido;
        const nombres = input.nombres !== undefined ? input.nombres : persona.nombres;
        updateData.nombre_completo = (input.nombre_completo && String(input.nombre_completo).trim())
          ? String(input.nombre_completo).trim()
          : this.buildNombreCompleto(apellido ?? null, nombres ?? null);
      }

      if (Object.keys(updateData).length > 0) {
        await tx.personas.update({
          where: { id: personaId },
          data: updateData
        });
      }

      await this.upsertAfiliado(tx, personaId, input.afiliado, persona);
      await this.upsertFamiliar(tx, personaId, input.familiar);
      await this.upsertInvitado(tx, personaId, input.invitado);

      const detail = await this.getPersonaDetailWithTx(tx, personaId);
      if (!detail) {
        throw new Error('Persona no encontrada');
      }

      return detail;
    });
  }

  async findTitularByDni(dni: string): Promise<IPersonaTitularResult | null> {
    const doc = String(dni || '').trim();
    if (!doc) return null;

    const persona = await prisma.personas.findUnique({ where: { dni: doc } });
    if (!persona) return null;

    const afiliado = await prisma.afiliados.findFirst({ where: { persona_id: persona.id } });
    if (!afiliado) return null;

    return {
      afiliado_id: afiliado.id,
      persona_id: persona.id,
      dni: persona.dni,
      apellido: persona.apellido,
      nombres: persona.nombres,
      nombre_completo: persona.nombre_completo
    };
  }

  private async getPersonaDetailWithTx(tx: Prisma.TransactionClient | typeof prisma, personaId: number): Promise<IPersonaFullResult | null> {
    let persona = await tx.personas.findUnique({ where: { id: personaId } });
    if (!persona) return null;

    // Auto-migrar QR codes en formato viejo (QR-XXXXXXXX) a UUID v4
    if (persona.qr_code && /^QR-\d+$/.test(persona.qr_code)) {
      const newQrCode = randomUUID();
      persona = await (tx as any).personas.update({
        where: { id: personaId },
        data: { qr_code: newQrCode }
      });
    }

    const [afiliado, invitado, usuario, familiarDe] = await Promise.all([
      tx.afiliados.findFirst({ where: { persona_id: personaId } }),
      tx.invitados.findFirst({ where: { persona_id: personaId } }),
      tx.usuarios.findFirst({ where: { persona_id: personaId } }),
      // Registros donde esta persona ES el familiar (la relación inversa)
      (tx as any).familiares.findMany({
        where: { persona_id: personaId },
        include: { Afiliado: { include: { Persona: true } } }
      })
    ]);

    // Buscar familiares donde el afiliado_id sea el id del afiliado de la persona (grupo familiar del titular)
    let familiares: any[] = [];
    if (afiliado) {
      familiares = await tx.familiares.findMany({ where: { afiliado_id: afiliado.id } });
    }

    // Traer roles del usuario si existe (incluyendo camping)
    let roles: Array<{ rol_id: number, camping_id: number | null, Role?: { nombre?: string | null, descripcion?: string | null }, Camping?: { id: number, nombre: string } | null, activo: boolean | null, fecha_asignacion: Date | null }> = [];
    if (usuario) {
      roles = await (tx as any).usuario_roles.findMany({
        where: { usuario_id: usuario.id },
        include: { Role: true, Camping: { select: { id: true, nombre: true } } }
      });
    }

    // Traer afiliados titulares y personas de los familiares
    const afiliadoIds = [...new Set(familiares.map(f => f.afiliado_id))];
    const personaIdsFamiliares = [...new Set(familiares.map(f => f.persona_id))];
    const [afiliadosRelacionados, personasFamiliares] = await Promise.all([
      afiliadoIds.length
        ? tx.afiliados.findMany({
            where: { id: { in: afiliadoIds } },
            include: { Persona: true }
          })
        : [],
      personaIdsFamiliares.length
        ? tx.personas.findMany({ where: { id: { in: personaIdsFamiliares } } })
        : []
    ]);
    const afiliadoById = new Map(afiliadosRelacionados.map(a => [a.id, a]));
    const personaById = new Map(personasFamiliares.map(p => [p.id, p]));

    const tipos: PersonaTipo[] = [];
    if (afiliado) tipos.push('AFILIADO');
    if (familiares.length > 0) tipos.push('FAMILIAR');
    if (familiarDe.length > 0 && !tipos.includes('FAMILIAR')) tipos.push('FAMILIAR');
    if (invitado) tipos.push('INVITADO');

    const now = new Date();
    const invitadoVigente = invitado
      ? (
          (!invitado.vigente_desde || invitado.vigente_desde <= now) &&
          (!invitado.vigente_hasta || invitado.vigente_hasta >= now)
        )
      : null;

    return {
      persona: this.mapToBasic(persona),
      tipos,
      afiliado: afiliado
        ? {
            id: afiliado.id,
            persona_id: afiliado.persona_id ?? null,
            cuil: afiliado.cuil,
            sexo: (afiliado.sexo as any) ?? null,
            tipo_afiliado: afiliado.tipo_afiliado ?? null,
            fecha_nacimiento: afiliado.fecha_nacimiento ?? null,
            categoria: afiliado.categoria ?? null,
            situacion_sindicato: afiliado.situacion_sindicato ?? null,
            situacion_obra_social: afiliado.situacion_obra_social ?? null,
            domicilio: afiliado.domicilio ?? null,
            provincia: afiliado.provincia ?? null,
            localidad: afiliado.localidad ?? null,
            empresa_cuit: afiliado.empresa_cuit ?? null,
            empresa_nombre: afiliado.empresa_nombre ?? null,
            codigo_postal: afiliado.codigo_postal ?? null,
            grupo_sanguineo: afiliado.grupo_sanguineo ?? null,
            foto_url: afiliado.foto_url ?? null,
            activo: afiliado.activo ?? null
          }
        : undefined,
      familiares: familiares.length
        ? familiares.map(f => {
            const afiliadoRelacionado = afiliadoById.get(f.afiliado_id);
            const personaFamiliar = personaById.get(f.persona_id);
            return {
              id: f.id,
              afiliado_id: f.afiliado_id,
              persona_id: f.persona_id ?? null,
              estudia: f.estudia ?? null,
              discapacitado: f.discapacitado ?? null,
              baja: f.baja ?? null,
              activo: f.activo ?? null,
              persona: personaFamiliar ? this.mapToBasic(personaFamiliar) : null,
              afiliado_titular: afiliadoRelacionado
                ? {
                    id: afiliadoRelacionado.id,
                    cuil: afiliadoRelacionado.cuil,
                    persona: afiliadoRelacionado.Persona
                      ? this.mapToBasic(afiliadoRelacionado.Persona)
                      : null
                  }
                : undefined
            };
          })
        : undefined,
      invitado: invitado
        ? {
            id: invitado.id,
            vigente_desde: invitado.vigente_desde ?? null,
            vigente_hasta: invitado.vigente_hasta ?? null,
            aplica_a_familia: invitado.aplica_a_familia ?? null,
            activo: invitado.activo ?? null,
            vigente: invitadoVigente
          }
        : undefined,
      es_familiar_de: familiarDe.length
        ? familiarDe.map((f: any) => ({
            id: f.id,
            afiliado_id: f.afiliado_id,
            estudia: f.estudia ?? null,
            discapacitado: f.discapacitado ?? null,
            baja: f.baja ?? null,
            activo: f.activo ?? null,
            afiliado_titular: f.Afiliado
              ? {
                  id: f.Afiliado.id,
                  cuil: f.Afiliado.cuil,
                  persona: f.Afiliado.Persona ? this.mapToBasic(f.Afiliado.Persona) : null
                }
              : undefined
          }))
        : undefined,
      usuario: usuario
        ? {
            id: usuario.id,
            username: usuario.username,
            activo: usuario.activo,
            must_change_password: usuario.must_change_password,
            ultimo_acceso: usuario.ultimo_acceso,
            created_at: usuario.created_at,
            updated_at: usuario.updated_at
          }
        : undefined,
      roles: roles.length
        ? roles.map(r => ({
            id: r.rol_id,
            nombre: r.Role?.nombre ?? undefined,
            descripcion: r.Role?.descripcion ?? undefined,
            activo: r.activo ?? false,
            fecha_asignacion: r.fecha_asignacion ?? undefined,
            camping_id: r.camping_id ?? null,
            camping: r.Camping ? { id: r.Camping.id, nombre: r.Camping.nombre } : null
          }))
        : undefined
    };
  }

  private async upsertAfiliado(
    tx: Prisma.TransactionClient,
    personaId: number,
    afiliadoInput?: Partial<IPersonaAfiliadoInput>,
    persona?: any
  ): Promise<void> {
    if (!afiliadoInput) return;

    const existing = await tx.afiliados.findFirst({ where: { persona_id: personaId } });

    if (existing) {
      const updateData: Prisma.afiliadosUpdateInput = {};

      if (afiliadoInput.cuil !== undefined) updateData.cuil = afiliadoInput.cuil;
      if (afiliadoInput.sexo !== undefined) updateData.sexo = (afiliadoInput.sexo as any) ?? existing.sexo;
      if (afiliadoInput.tipo_afiliado !== undefined) updateData.tipo_afiliado = afiliadoInput.tipo_afiliado ?? null;
      if (afiliadoInput.fecha_nacimiento !== undefined) updateData.fecha_nacimiento = this.normalizeFecha(afiliadoInput.fecha_nacimiento);
      if (afiliadoInput.categoria !== undefined) updateData.categoria = afiliadoInput.categoria ?? null;
      if (afiliadoInput.situacion_sindicato !== undefined) updateData.situacion_sindicato = afiliadoInput.situacion_sindicato as any;
      if (afiliadoInput.situacion_obra_social !== undefined) updateData.situacion_obra_social = afiliadoInput.situacion_obra_social as any;
      if (afiliadoInput.domicilio !== undefined) updateData.domicilio = afiliadoInput.domicilio ?? null;
      if (afiliadoInput.provincia !== undefined) updateData.provincia = afiliadoInput.provincia ?? null;
      if (afiliadoInput.localidad !== undefined) updateData.localidad = afiliadoInput.localidad ?? null;
      if (afiliadoInput.empresa_cuit !== undefined) updateData.empresa_cuit = afiliadoInput.empresa_cuit ?? null;
      if (afiliadoInput.empresa_nombre !== undefined) updateData.empresa_nombre = afiliadoInput.empresa_nombre ?? null;
      if (afiliadoInput.codigo_postal !== undefined) updateData.codigo_postal = afiliadoInput.codigo_postal ?? null;
      if (afiliadoInput.grupo_sanguineo !== undefined) updateData.grupo_sanguineo = afiliadoInput.grupo_sanguineo ?? null;
      if (afiliadoInput.foto_url !== undefined) updateData.foto_url = afiliadoInput.foto_url ?? null;
      if (afiliadoInput.activo !== undefined) updateData.activo = afiliadoInput.activo ?? true;

      if (Object.keys(updateData).length > 0) {
        await tx.afiliados.update({
          where: { id: existing.id },
          data: updateData
        });
      }
      return;
    }

    if (!afiliadoInput.cuil) {
      throw new Error('cuil es requerido para afiliado');
    }

    const sexo = afiliadoInput.sexo ?? persona?.sexo ?? null;
    if (!sexo) {
      throw new Error('sexo es requerido para afiliado');
    }

    await tx.afiliados.create({
      data: {
        persona_id: personaId,
        cuil: afiliadoInput.cuil,
        sexo: sexo as any,
        tipo_afiliado: afiliadoInput.tipo_afiliado ?? null,
        fecha_nacimiento: this.normalizeFecha(afiliadoInput.fecha_nacimiento),
        categoria: afiliadoInput.categoria ?? null,
        situacion_sindicato: afiliadoInput.situacion_sindicato as any,
        situacion_obra_social: afiliadoInput.situacion_obra_social as any,
        domicilio: afiliadoInput.domicilio ?? null,
        provincia: afiliadoInput.provincia ?? null,
        localidad: afiliadoInput.localidad ?? null,
        empresa_cuit: afiliadoInput.empresa_cuit ?? null,
        empresa_nombre: afiliadoInput.empresa_nombre ?? null,
        codigo_postal: afiliadoInput.codigo_postal ?? null,
        grupo_sanguineo: afiliadoInput.grupo_sanguineo ?? null,
        foto_url: afiliadoInput.foto_url ?? null,
        activo: afiliadoInput.activo ?? true
      }
    });
  }

  private async upsertFamiliar(
    tx: Prisma.TransactionClient,
    personaId: number,
    familiarInput?: IPersonaFamiliarUpdateInput
  ): Promise<void> {
    if (!familiarInput) return;

    let existing = null as any;

    if (familiarInput.id) {
      existing = await tx.familiares.findUnique({ where: { id: familiarInput.id } });
      if (!existing) {
        throw new Error('Familiar no encontrado');
      }
      if (existing.persona_id && existing.persona_id !== personaId) {
        throw new Error('El familiar no pertenece a la persona');
      }
    } else if (familiarInput.afiliado_id) {
      existing = await tx.familiares.findFirst({
        where: { persona_id: personaId, afiliado_id: familiarInput.afiliado_id }
      });
    }

    const afiliadoId = familiarInput.afiliado_id ?? existing?.afiliado_id;
    if (!afiliadoId) {
      throw new Error('afiliado_id es requerido para familiar');
    }

    const afiliado = await tx.afiliados.findUnique({ where: { id: afiliadoId } });
    if (!afiliado) {
      throw new Error('Afiliado no encontrado para familiar');
    }

    if (existing) {
      const updateData: Prisma.familiaresUncheckedUpdateInput = {};
      if (familiarInput.afiliado_id !== undefined) updateData.afiliado_id = afiliadoId;
      if (familiarInput.estudia !== undefined) updateData.estudia = familiarInput.estudia ?? false;
      if (familiarInput.discapacitado !== undefined) updateData.discapacitado = familiarInput.discapacitado ?? false;
      if (familiarInput.baja !== undefined) updateData.baja = familiarInput.baja ?? false;
      if (familiarInput.activo !== undefined) updateData.activo = familiarInput.activo ?? true;

      if (Object.keys(updateData).length > 0) {
        await tx.familiares.update({
          where: { id: existing.id },
          data: updateData
        });
      }
      return;
    }

    await tx.familiares.create({
      data: {
        persona_id: personaId,
        afiliado_id: afiliadoId,
        estudia: familiarInput.estudia ?? false,
        discapacitado: familiarInput.discapacitado ?? false,
        baja: familiarInput.baja ?? false,
        activo: familiarInput.activo ?? true
      }
    });
  }

  private async upsertInvitado(
    tx: Prisma.TransactionClient,
    personaId: number,
    invitadoInput?: Partial<IPersonaInvitadoInput>
  ): Promise<void> {
    if (!invitadoInput) return;

    const existing = await tx.invitados.findFirst({ where: { persona_id: personaId } });
    const data: Prisma.invitadosUncheckedCreateInput | Prisma.invitadosUpdateInput = {
      vigente_desde: this.normalizeFecha(invitadoInput.vigente_desde),
      vigente_hasta: this.normalizeFecha(invitadoInput.vigente_hasta),
      aplica_a_familia: invitadoInput.aplica_a_familia ?? true,
      activo: invitadoInput.activo ?? true
    } as any;

    if (existing) {
      await tx.invitados.update({
        where: { id: existing.id },
        data
      });
      return;
    }

    await tx.invitados.create({
      data: {
        persona_id: personaId,
        vigente_desde: this.normalizeFecha(invitadoInput.vigente_desde),
        vigente_hasta: this.normalizeFecha(invitadoInput.vigente_hasta),
        aplica_a_familia: invitadoInput.aplica_a_familia ?? true,
        activo: invitadoInput.activo ?? true
      }
    });
  }
}

export const personasService = new PersonasService();
export default personasService;

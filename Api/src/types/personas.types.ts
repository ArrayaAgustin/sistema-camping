import { ID, Timestamp } from './common.types';

/**
 * Persona = identidad única (base para afiliado, familiar, invitado, usuario)
 */

export type PersonaSexoType = 'M' | 'F' | 'X';

export type PersonaTipo = 'AFILIADO' | 'FAMILIAR' | 'INVITADO';

export interface IPersona {
  id: ID;
  dni: string;
  apellido: string | null;
  nombres: string | null;
  nombre_completo: string | null;
  sexo: PersonaSexoType | null;
  fecha_nacimiento: Timestamp | null;
  email: string | null;
  telefono: string | null;
  qr_code: string;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

/**
 * Para respuestas livianas al front
 */
export type IPersonaBasic = Pick<
  IPersona,
  | 'id'
  | 'dni'
  | 'apellido'
  | 'nombres'
  | 'nombre_completo'
  | 'sexo'
  | 'fecha_nacimiento'
  | 'email'
  | 'telefono'
  | 'qr_code'
>;

/**
 * Datos mínimos para credencial/carnet
 */
export interface IPersonaCredencial {
  persona_id: ID;
  dni: string;
  nombre: string;
  qr_code: string;
  tipos: PersonaTipo[];
  foto_url?: string | null;
}

/**
 * Alta de persona (datos base)
 */
export interface IPersonaCreateInput {
  dni: string;
  apellido?: string | null;
  nombres?: string | null;
  nombre_completo?: string | null;
  sexo?: PersonaSexoType | null;
  fecha_nacimiento?: Timestamp | string | null;
  email?: string | null;
  telefono?: string | null;
  qr_code?: string | null;
}

/**
 * Datos de afiliado para formulario general de personas
 */
export interface IPersonaAfiliadoInput {
  cuil: string;
  sexo?: PersonaSexoType | null;
  tipo_afiliado?: string | null;
  fecha_nacimiento?: Timestamp | string | null;
  categoria?: string | null;
  situacion_sindicato?: 'ACTIVO' | 'BAJA' | null;
  situacion_obra_social?: 'ACTIVO' | 'BAJA' | null;
  domicilio?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  empresa_cuit?: string | null;
  empresa_nombre?: string | null;
  codigo_postal?: string | null;
  grupo_sanguineo?: string | null;
  foto_url?: string | null;
  activo?: boolean | null;
}

/**
 * Datos de familiar para formulario general de personas
 */
export interface IPersonaFamiliarInput {
  afiliado_id: ID;
  estudia?: boolean | null;
  discapacitado?: boolean | null;
  baja?: boolean | null;
  activo?: boolean | null;
}

export interface IPersonaFamiliarUpdateInput extends Partial<IPersonaFamiliarInput> {
  id?: ID;
}

/**
 * Datos de invitado para formulario general de personas
 */
export interface IPersonaInvitadoInput {
  vigente_desde?: Timestamp | string | null;
  vigente_hasta?: Timestamp | string | null;
  aplica_a_familia?: boolean | null;
  activo?: boolean | null;
}

/**
 * Input general para alta de persona + rol (afiliado/familiar/invitado)
 */
export interface IPersonaFormInput extends IPersonaCreateInput {
  tipo?: PersonaTipo;
  afiliado?: IPersonaAfiliadoInput;
  familiar?: IPersonaFamiliarInput;
  invitado?: IPersonaInvitadoInput;
}

/**
 * Input general para edición de persona
 */
export interface IPersonaFormUpdateInput
  extends Partial<Omit<IPersonaFormInput, 'afiliado' | 'familiar' | 'invitado'>> {
  afiliado?: Partial<IPersonaAfiliadoInput>;
  familiar?: IPersonaFamiliarUpdateInput;
  invitado?: Partial<IPersonaInvitadoInput>;
}

export interface IPersonaCreateResult {
  persona: IPersonaBasic;
  created: boolean;
}

/**
 * Detalle de afiliado en formulario de persona
 */
export interface IPersonaAfiliadoDetail {
  id: ID;
  persona_id: ID | null;
  cuil: string;
  sexo: PersonaSexoType | null;
  tipo_afiliado: string | null;
  fecha_nacimiento: Timestamp | null;
  categoria: string | null;
  situacion_sindicato: string | null;
  situacion_obra_social: string | null;
  domicilio: string | null;
  provincia: string | null;
  localidad: string | null;
  empresa_cuit: string | null;
  empresa_nombre: string | null;
  codigo_postal: string | null;
  grupo_sanguineo: string | null;
  foto_url: string | null;
  activo: boolean | null;
}

/**
 * Detalle de familiar en formulario de persona
 */
export interface IPersonaFamiliarDetail {
  id: ID;
  afiliado_id: ID;
  persona_id: ID | null;
  estudia: boolean | null;
  discapacitado: boolean | null;
  baja: boolean | null;
  activo: boolean | null;
  afiliado?: {
    id: ID;
    cuil: string;
    persona?: IPersonaBasic | null;
  };
}

/**
 * Detalle de invitado en formulario de persona
 */
export interface IPersonaInvitadoDetail {
  id: ID;
  vigente_desde: Timestamp | null;
  vigente_hasta: Timestamp | null;
  aplica_a_familia: boolean | null;
  activo: boolean | null;
  vigente: boolean | null;
}

/**
 * Relación donde esta persona ES el familiar (no el titular)
 */
export interface IPersonaEsFamiliarDe {
  id: ID;
  afiliado_id: ID;
  estudia: boolean | null;
  discapacitado: boolean | null;
  baja: boolean | null;
  activo: boolean | null;
  afiliado_titular?: {
    id: ID;
    cuil: string;
    persona?: IPersonaBasic | null;
  };
}

/**
 * Detalle completo de persona
 */
export interface IPersonaFullResult {
  persona: IPersonaBasic;
  tipos: PersonaTipo[];
  afiliado?: IPersonaAfiliadoDetail;
  familiares?: IPersonaFamiliarDetail[];
  invitado?: IPersonaInvitadoDetail;
  es_familiar_de?: IPersonaEsFamiliarDe[];
  usuario?: {
    id: number;
    username: string;
    activo: boolean | null;
    must_change_password: boolean | null;
    ultimo_acceso: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
  };
  roles?: Array<{
    id: number;
    nombre?: string;
    descripcion?: string;
    activo: boolean;
    fecha_asignacion?: Date;
    camping_id?: number | null;
    camping?: { id: number; nombre: string } | null;
  }>;
}

export interface IPersonaFormResult extends IPersonaFullResult {
  created: boolean;
}

/**
 * Resultado de búsqueda de titular (afiliado) por DNI
 */
export interface IPersonaTitularResult {
  afiliado_id: ID;
  persona_id: ID;
  dni: string;
  apellido: string | null;
  nombres: string | null;
  nombre_completo: string | null;
}

/**
 * Resultado de búsqueda unificada por persona
 */
export interface IPersonaSearchItem {
  persona: IPersonaBasic;
  tipos: PersonaTipo[];
  credencial: IPersonaCredencial;
  afiliado?: {
    id: ID;
    cuil: string;
    situacion_sindicato: string | null;
    situacion_obra_social: string | null;
    activo: boolean | null;
    foto_url?: string | null;
  };
  familiares?: {
    id: ID;
    afiliado_id: ID;
    activo: boolean | null;
    baja: boolean | null;
  }[];
  invitado?: {
    id: ID;
    vigente_desde: Timestamp | null;
    vigente_hasta: Timestamp | null;
    aplica_a_familia: boolean | null;
    activo: boolean | null;
    vigente: boolean | null;
  };
}

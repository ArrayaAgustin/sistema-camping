import { ID, Timestamp } from './common.types';
import { IPersonaBasic } from './personas.types';


/**
 * Tipos relacionados con afiliados y familiares
 */

// Enums para afiliados
export enum SexoEnum {
  M = 'M',
  F = 'F',
  X = 'X'
}

// Tipos para compatibilidad con Prisma enums
export type SituacionSindicatoEnum = 'ACTIVO' | 'BAJA';
export type SituacionObraSocialEnum = 'ACTIVO' | 'BAJA';
export type SexoType = 'M' | 'F' | 'X';

// Tipo base de afiliado
export interface IAfiliado {
  id: ID;
  cuil: string;

  // ⚠️ legacy (por ahora)
  dni: string;
  apellido: string;
  nombres: string;

  // NUEVO
  persona?: IPersonaBasic;

  numeroAfiliado: string;
  numero_afiliado: string | null;
  documento: string;

  sexo: SexoType | null;
  tipo_afiliado: string | null;
  fecha_nacimiento: Timestamp | null;
  categoria: string | null;
  situacion_sindicato: SituacionSindicatoEnum | null;
  situacion_obra_social: SituacionObraSocialEnum | null;

  domicilio: string | null;
  provincia: string | null;
  localidad: string | null;
  empresa_cuit: string | null;
  empresa_nombre: string | null;
  codigo_postal: string | null;

  telefono: string | null;
  email: string | null;

  grupo_sanguineo: string | null;
  foto_url: string | null;

  // ⚠️ legacy QR (después lo sacamos)
  qr_code: string | null;

  padron_version_id: ID | null;
  activo: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}


// Afiliado con familiares incluidos
export interface IAfiliadoDetailed extends IAfiliado {
  Familiares: IFamiliar[];
}

// Respuesta de búsqueda de afiliado específico
export interface IAfiliadoResponse {
  afiliado: IAfiliado;
  familiares: IFamiliar[];
  totalFamiliares: number;  // Agregar propiedad faltante
}

// Tipo de familiar
export interface IFamiliar {
  id: ID;
  afiliado_id: ID;
  afiliadoId: ID;  // Alias para compatibilidad
  nombre: string;
  dni: string | null;
  fecha_nacimiento: Timestamp | null;
  edad: number | null;
  estudia: boolean | null;
  discapacitado: boolean | null;
  baja: boolean | null;
  qr_code: string | null;
  activo: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Versión del padrón
export interface IPadronVersion {
  id: ID;
  version: string;
  fecha_actualizacion: Timestamp;
  total_afiliados: number | null;
  total_familiares: number | null;
  total_registros: number;  // Agregar propiedad faltante
  descripcion: string | null;
  hash_checksum: string | null;
  usuario_carga_id: ID | null;
  activo: boolean;
  created_at: Timestamp;
}

// Estadísticas del padrón
export interface IPadronStats {
  totalAfiliados: number;
  totalActivos: number;  // Agregar propiedad faltante
  totalFamiliares: number;
  version: string;
  fechaActualizacion: Timestamp | null;
}

// Opciones para búsqueda de afiliados
export interface IAfiliadosSearchOptions {
  tipo: 'dni' | 'apellido' | 'general';
  q: string;
  limit: number;
  incluirFamiliares?: boolean;
}

// Resultado de búsqueda de afiliados
export type IAfiliadosSearchResult = IAfiliado[] | IAfiliadoDetailed[];
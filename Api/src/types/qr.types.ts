import { ID, Timestamp } from "./common.types";
import { IPersonaBasic, PersonaTipo } from "./personas.types";

export type QRIdentidadTipo = PersonaTipo;

export interface IQRResolveResponse {
  persona: IPersonaBasic;

  tipos: QRIdentidadTipo[];

  allowed: boolean;
  reason?: string;

  afiliado?: {
    id: ID;
    cuil: string;
    situacion_sindicato: string | null;
    situacion_obra_social: string | null;
    
    activo: boolean | null;
  };

  familiares?: {
    id: ID;
    afiliado_id: ID; // titular
    activo: boolean | null;
    baja: boolean | null;
  }[];

  /** Familiares del titular (para mostrar grupo familiar en panel operador) */
  familiaresDelTitular?: {
    id: ID;
    persona_id: ID;
    dni: string;
    nombre_completo: string;
    activo: boolean | null;
    baja: boolean | null;
  }[];

  invitado?: {
    id: ID;
    vigente_desde: Timestamp | null;
    vigente_hasta: Timestamp | null;
    aplica_a_familia: boolean   | null;
    activo: boolean | null;
    vigente: boolean  | null;
  };
}

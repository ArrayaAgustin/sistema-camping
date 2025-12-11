/**
 * Tipos para el módulo de visitas
 */
import { ID, Timestamp } from './common.types';

// Visita base
export interface IVisita {
  id: ID;
  uuid: string;
  afiliado_id: ID;
  camping_id: ID;
  periodo_caja_id?: ID | null;
  usuario_registro_id: ID;
  fecha_ingreso: Timestamp;
  acompanantes: string; // JSON string
  observaciones: string;
  registro_offline: boolean;
  sincronizado: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// Datos para crear una visita
export interface ICreateVisitaRequest {
  afiliado_id: ID;
  camping_id: ID;
  periodo_caja_id?: ID | null;
  acompanantes?: any[] | null;
  observaciones?: string;
  registro_offline?: boolean;
}

// Respuesta de creación de visita
export interface ICreateVisitaResponse {
  visita_id: ID;
  uuid: string;
}

// Visita con datos del afiliado
export interface IVisitaDetailed extends IVisita {
  Afiliado: {
    dni: string;
    apellido: string;
    nombres: string;
    situacion_sindicato: string | null;
    situacion_obra_social: string | null;
  };
}

// Request de sincronización de visitas
export interface ISyncVisitasRequest {
  campingId: ID;
  visitas: ISyncVisitaItem[];
}

// Item de sincronización
export interface ISyncVisitaItem {
  uuid: string;
  afiliadoId: ID;
  periodoCajaId?: ID | null;
  acompanantes?: any[];
  observaciones?: string;
  fechaIngreso?: string | Date;
}

// Respuesta de sincronización
export interface ISyncResponse {
  sincronizadas: number;
  errores: number;
}

// Log de sincronización
export interface ISyncLog {
  id: ID;
  usuario_id: ID;
  camping_id: ID;
  tipo: string;
  registros_sincronizados: number;
  estado: 'success' | 'partial' | 'failed';
  detalles: any; // JSON
}

// Tipos para Periodos de Caja (Turnos)
export interface IPeriodoCaja {
  id: ID;
  camping_id: ID;
  usuario_apertura_id: ID;
  usuario_cierre_id: ID | null;
  fecha_apertura: Timestamp;
  fecha_cierre: Timestamp | null;
  total_visitas: number;
  observaciones?: string | null;
  sincronizado: boolean;
  activo: boolean;
}

// Request para abrir periodo de caja
export interface IAbrirPeriodoCajaRequest {
  camping_id: ID;
  observaciones?: string;
}

// Request para cerrar periodo de caja
export interface ICerrarPeriodoCajaRequest {
  observaciones?: string;
}

// Response para operaciones de periodo de caja
export interface IPeriodoCajaResponse {
  success: true;
  periodo: IPeriodoCaja;
  message: string;
}

// Periodo de caja con información adicional
export interface IPeriodoCajaDetailed extends IPeriodoCaja {
  camping?: {
    id: ID;
    nombre: string;
  };
  usuarioApertura?: {
    id: ID;
    username: string;
  };
  usuarioCierre?: {
    id: ID;
    username: string;
  } | null;
}
/**
 * Interfaces para el módulo de visitas
 */
import { Request, Response } from 'express';
import {
  IVisita,
  IVisitaDetailed,
  ICreateVisitaRequest,
  ICreateVisitaResponse,
  ISyncVisitasRequest,
  ISyncResponse,
  ID
} from '../../types';

/**
 * Interface para el controlador de visitas
 */
export interface IVisitasController {
  createVisita(req: Request, res: Response): Promise<Response<ICreateVisitaResponse>>;
  getVisitasByDay(req: Request, res: Response): Promise<Response<IVisitaDetailed[]>>;
}

/**
 * Interface para el servicio de visitas
 */
export interface IVisitasService {
  createVisita(visitaData: ICreateVisitaRequest, usuarioId: ID): Promise<ICreateVisitaResponse>;
  getVisitasByDay(campingId: ID, fecha: string): Promise<IVisitaDetailed[]>;
  updatePeriodoCajaVisitas(periodoCajaId: ID): Promise<void>;
}

/**
 * Interface para el controlador de sincronización
 */
export interface ISyncController {
  syncVisitas(req: Request, res: Response): Promise<Response<ISyncResponse>>;
}

/**
 * Interface para el servicio de sincronización
 */
export interface ISyncService {
  syncVisitas(syncData: ISyncVisitasRequest, usuarioId: ID): Promise<ISyncResponse>;
  createSyncLog(usuarioId: ID, campingId: ID, sincronizadas: number, errores: number, total: number): Promise<void>;
}
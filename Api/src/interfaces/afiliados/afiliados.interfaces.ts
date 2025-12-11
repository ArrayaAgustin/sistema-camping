/**
 * Interfaces para el módulo de afiliados
 */
import { Request, Response } from 'express';
import {
  IAfiliado,
  IAfiliadoResponse,
  IPadronVersion,
  IPadronStats,
  IApiResponse
} from '../../types';

/**
 * Interface para el controlador de afiliados
 */
export interface IAfiliadosController {
  searchAfiliados(req: Request, res: Response): Promise<Response<IAfiliado[]>>;
  getAfiliadoByNumero(req: Request, res: Response): Promise<Response<IAfiliado | null>>;
  getAfiliadosByDni(req: Request, res: Response): Promise<Response<IAfiliado[]>>;
  updateAfiliado(req: Request, res: Response): Promise<Response<IAfiliado>>;
  getPadronVersion(req: Request, res: Response): Promise<Response<IPadronVersion>>;
  getPadronStats(req: Request, res: Response): Promise<Response<IApiResponse<IPadronStats>>>;
  exportPadronCompleto(req: Request, res: Response): Promise<Response<any>>;
}

/**
 * Interface para el servicio de afiliados
 */
export interface IAfiliadosService {
  searchAfiliados(tipo: 'dni' | 'apellido' | 'general', q: string, limit: number): Promise<IAfiliado[]>;
  getAfiliadoByNumero(numero: number): Promise<IAfiliadoResponse | null>;
  getAfiliadosByDni(dni: string): Promise<IAfiliado[]>;
  updateAfiliado(id: number, updateData: Partial<IAfiliado>): Promise<IAfiliado | null>;
  getPadronVersion(): Promise<IPadronVersion>;
  getPadronStats(): Promise<IPadronStats>;
  canUserAccessAfiliado(userId: number, afiliadoId: number): Promise<boolean>;
  getPadronCompleto(includeInactivos?: boolean): Promise<any[]>;
}
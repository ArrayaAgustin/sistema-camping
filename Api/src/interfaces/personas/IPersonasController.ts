import { Request, Response } from 'express';
import { IPersonaFormResult, IPersonaFullResult, IPersonaSearchItem, IPersonaTitularResult } from '../../types';

/**
 * Interface para el controlador de personas
 */
export interface IPersonasController {
  searchPersonas(req: Request, res: Response): Promise<Response<IPersonaSearchItem[]>>;
  createPersona(req: Request, res: Response): Promise<Response<IPersonaFormResult>>;
  getMyPersona(req: Request, res: Response): Promise<Response<IPersonaFullResult | null>>;
  getPersonaById(req: Request, res: Response): Promise<Response<IPersonaFullResult | null>>;
  updatePersona(req: Request, res: Response): Promise<Response<IPersonaFullResult>>;
  getTitularByDni(req: Request, res: Response): Promise<Response<IPersonaTitularResult | null>>;
}

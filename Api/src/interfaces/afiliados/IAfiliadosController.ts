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
 * Define el contrato que debe cumplir cualquier implementación de AfiliadosController
 */
export interface IAfiliadosController {
  /**
   * GET /afiliados - Busca afiliados según criterios
   * @param req - Request con parámetros de búsqueda en query
   * @param res - Response con lista de afiliados
   */
  searchAfiliados(req: Request, res: Response): Promise<Response<IAfiliado[]>>;

  /**
   * GET /afiliados/:id - Obtiene un afiliado específico con familiares
   * @param req - Request con ID del afiliado en params
   * @param res - Response con datos del afiliado y familiares
   */
  getAfiliadoById(req: Request, res: Response): Promise<Response<IAfiliadoResponse>>;

  /**
   * GET /afiliados/numero/:numeroAfiliado - Busca afiliado por número
   * @param req - Request con número de afiliado en params
   * @param res - Response con datos del afiliado
   */
  getAfiliadoByNumero(req: Request, res: Response): Promise<Response<IAfiliado | null>>;

  /**
   * GET /afiliados/documento/:documento - Busca afiliados por documento
   * @param req - Request con documento en params
   * @param res - Response con lista de afiliados
   */
  getAfiliadosByDocumento(req: Request, res: Response): Promise<Response<IAfiliado[]>>;

  /**
   * GET /afiliados/version/padron - Obtiene información de la versión del padrón
   * @param req - Request vacío
   * @param res - Response con versión del padrón
   */
  getPadronVersion(req: Request, res: Response): Promise<Response<IPadronVersion>>;

  /**
   * GET /afiliados/stats/padron - Obtiene estadísticas del padrón
   * @param req - Request vacío
   * @param res - Response con estadísticas
   */
  getPadronStats(req: Request, res: Response): Promise<Response<IApiResponse<IPadronStats>>>;

  /**
   * POST /afiliados/search/advanced - Búsqueda avanzada de afiliados
   * @param req - Request con filtros de búsqueda en body
   * @param res - Response con resultados paginados
   */
  advancedSearch(req: Request, res: Response): Promise<Response<any>>;

  /**
   * PUT /afiliados/:id - Actualiza datos de un afiliado
   * @param req - Request con ID en params y datos en body
   * @param res - Response con afiliado actualizado
   */
  updateAfiliado(req: Request, res: Response): Promise<Response<IAfiliado>>;
}
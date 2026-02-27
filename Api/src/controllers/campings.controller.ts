import { Request, Response } from 'express';
import { campingsService } from '../services/campings.service';
import { responseHandler } from '../middlewares';

export class CampingsController {
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const campings = await campingsService.getAll();
      return responseHandler.success(res, campings, `${campings.length} campings encontrados`);
    } catch (error: any) {
      console.error('❌ Get campings error:', error.message);
      return responseHandler.internalError(res, 'Error obteniendo campings');
    }
  }

  async getAllAdmin(req: Request, res: Response): Promise<Response> {
    try {
      const campings = await campingsService.getAllAdmin();
      return responseHandler.success(res, campings, `${campings.length} campings`);
    } catch (error: any) {
      console.error('❌ Get campings admin error:', error.message);
      return responseHandler.internalError(res, 'Error obteniendo campings');
    }
  }

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const camping = await campingsService.create(req.body);
      return responseHandler.success(res, camping, 'Camping creado');
    } catch (error: any) {
      console.error('❌ Create camping error:', error.message);
      if (error.message === 'nombre es requerido') {
        return responseHandler.validationError(res, ['nombre es requerido']);
      }
      return responseHandler.internalError(res, 'Error creando camping');
    }
  }

  async update(req: Request, res: Response): Promise<Response> {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id) || id <= 0) {
      return responseHandler.validationError(res, ['ID de camping inválido']);
    }
    try {
      const camping = await campingsService.update(id, req.body);
      return responseHandler.success(res, camping, 'Camping actualizado');
    } catch (error: any) {
      console.error('❌ Update camping error:', error.message);
      if (error.message === 'Camping no encontrado') {
        return responseHandler.notFound(res, 'Camping no encontrado');
      }
      return responseHandler.internalError(res, 'Error actualizando camping');
    }
  }
}

export const campingsController = new CampingsController();
export default campingsController;

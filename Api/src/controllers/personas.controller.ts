import { Request, Response } from 'express';
import { IPersonasController } from '../interfaces/personas';
import { personasService } from '../services/personas.service';
import { IPersonaFormResult, IPersonaFullResult, IPersonaSearchItem, IPersonaTitularResult } from '../types';
import { responseHandler } from '../middlewares';

/**
 * Controlador de personas - Implementa IPersonasController
 */
export class PersonasController implements IPersonasController {
  /**
   * GET /personas/search - Búsqueda unificada por personas
   */
  async searchPersonas(req: Request, res: Response): Promise<Response<IPersonaSearchItem[]>> {
    const { q = '', limit = 20 } = req.query as any;

    if (!q || String(q).trim() === '') {
      return responseHandler.success(res, [], 'No search term provided');
    }

    try {
      const personas = await personasService.searchPersonas(String(q), Number(limit));
      return responseHandler.success(res, personas, `Found ${personas.length} personas`);
    } catch (error: any) {
      console.error('❌ Search personas error:', error.message);
      return responseHandler.internalError(res, 'Error searching personas');
    }
  }

  /**
   * POST /personas - Alta de persona (identidad base)
   */
  async createPersona(req: Request, res: Response): Promise<Response<IPersonaFormResult>> {
    try {
      const result = await personasService.createPersona(req.body);
      if (result.created) {
        return responseHandler.created(res, result, 'Persona creada');
      }
      return responseHandler.success(res, result, 'Persona ya existente');
    } catch (error: any) {
      console.error('❌ Create persona error:', error.message);
      return responseHandler.internalError(res, 'Error creating persona');
    }
  }

  /**
   * GET /personas/me - Datos de la persona del usuario autenticado (sin exponer ID en URL)
   */
  async getMyPersona(req: Request, res: Response): Promise<Response<IPersonaFullResult | null>> {
    const personaId = (req.user as any)?.persona_id;

    if (!personaId) {
      return responseHandler.notFound(res, 'Tu cuenta no tiene una persona asociada');
    }

    try {
      const result = await personasService.getPersonaById(personaId);
      if (!result) {
        return responseHandler.notFound(res, 'Persona no encontrada');
      }
      return responseHandler.success(res, result, 'Persona encontrada');
    } catch (error: any) {
      console.error('❌ Get my persona error:', error.message);
      return responseHandler.internalError(res, 'Error buscando persona');
    }
  }

  /**
   * GET /personas/:id - Detalle completo de persona
   */
  async getPersonaById(req: Request, res: Response): Promise<Response<IPersonaFullResult | null>> {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id) || id <= 0) {
      return responseHandler.validationError(res, ['Persona ID must be a valid positive number']);
    }

    try {
      const result = await personasService.getPersonaById(id);
      if (!result) {
        return responseHandler.notFound(res, 'Persona no encontrada');
      }
      return responseHandler.success(res, result, 'Persona encontrada');
    } catch (error: any) {
      console.error('❌ Get persona error:', error.message);
      return responseHandler.internalError(res, 'Error buscando persona');
    }
  }

  /**
   * GET /personas/dni/:dni - Detalle completo por DNI
   */
  async getPersonaByDni(req: Request, res: Response): Promise<Response<IPersonaFullResult | null>> {
    const { dni = '' } = req.params as any;

    try {
      const result = await personasService.getPersonaByDni(String(dni));
      if (!result) {
        return responseHandler.notFound(res, 'Persona no encontrada');
      }
      return responseHandler.success(res, result, 'Persona encontrada');
    } catch (error: any) {
      console.error('❌ Get persona by DNI error:', error.message);
      return responseHandler.internalError(res, 'Error buscando persona');
    }
  }

  /**
   * PUT /personas/:id - Editar persona (base + afiliado/familiar/invitado)
   */
  async updatePersona(req: Request, res: Response): Promise<Response<IPersonaFullResult>> {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id) || id <= 0) {
      return responseHandler.validationError(res, ['Persona ID must be a valid positive number']);
    }

    try {
      const result = await personasService.updatePersona(id, req.body);
      return responseHandler.success(res, result, 'Persona actualizada');
    } catch (error: any) {
      console.error('❌ Update persona error:', error.message);

      if (error.message?.includes('no encontrada')) {
        return responseHandler.notFound(res, error.message);
      }

      if (error.message?.includes('dni')) {
        return responseHandler.validationError(res, [error.message]);
      }

      return responseHandler.internalError(res, 'Error actualizando persona');
    }
  }

  /**
   * GET /personas/titular?dni=... - Buscar afiliado titular por DNI
   */
  async getTitularByDni(req: Request, res: Response): Promise<Response<IPersonaTitularResult | null>> {
    const { dni = '' } = req.query as any;

    try {
      const result = await personasService.findTitularByDni(String(dni));
      if (!result) {
        return responseHandler.notFound(res, 'Titular no encontrado');
      }
      return responseHandler.success(res, result, 'Titular encontrado');
    } catch (error: any) {
      console.error('❌ Get titular error:', error.message);
      return responseHandler.internalError(res, 'Error buscando titular');
    }
  }
}

export const personasController = new PersonasController();
export default personasController;

import { 
  IPersonaFormInput,
  IPersonaFormResult,
  IPersonaFormUpdateInput,
  IPersonaFullResult,
  IPersonaSearchItem,
  IPersonaTitularResult 
} from '../../types';

/**
 * Interface para el servicio de personas
 */
export interface IPersonasService {
  searchPersonas(q: string, limit?: number): Promise<IPersonaSearchItem[]>;
  createPersona(input: IPersonaFormInput): Promise<IPersonaFormResult>;
  getPersonaById(personaId: number): Promise<IPersonaFullResult | null>;
  getPersonaByDni(dni: string): Promise<IPersonaFullResult | null>;
  updatePersona(personaId: number, input: IPersonaFormUpdateInput): Promise<IPersonaFullResult>;
  findTitularByDni(dni: string): Promise<IPersonaTitularResult | null>;
}

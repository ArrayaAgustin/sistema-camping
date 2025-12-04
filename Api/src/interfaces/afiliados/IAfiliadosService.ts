import { 
  IAfiliado, 
  IAfiliadoResponse, 
  IPadronVersion, 
  IPadronStats,
  IFamiliar
} from '../../types';

/**
 * Interface para el servicio de afiliados
 * Define el contrato que debe cumplir cualquier implementación de AfiliadosService
 */
export interface IAfiliadosService {
  /**
   * Busca afiliados según criterios de búsqueda
   * @param searchCriteria - Criterios de búsqueda
   * @returns Lista de afiliados que coinciden con los criterios
   */
  searchAfiliados(searchCriteria: {
    numeroAfiliado?: string;
    apellidos?: string;
    nombres?: string;
    documento?: string;
    estado?: string;
    limit?: number;
    offset?: number;
  }): Promise<IAfiliado[]>;

  /**
   * Obtiene un afiliado específico por su ID
   * @param afiliadoId - ID del afiliado
   * @returns Datos del afiliado o null si no existe
   */
  getAfiliadoById(afiliadoId: number): Promise<IAfiliado | null>;

  /**
   * Obtiene un afiliado con todos sus familiares
   * @param afiliadoId - ID del afiliado
   * @returns Afiliado con familiares o null si no existe
   */
  getAfiliadoWithFamily(afiliadoId: number): Promise<IAfiliadoResponse | null>;

  /**
   * Obtiene los familiares de un afiliado
   * @param afiliadoId - ID del afiliado titular
   * @returns Lista de familiares
   */
  getFamiliaresByAfiliado(afiliadoId: number): Promise<IFamiliar[]>;

  /**
   * Busca afiliados por número de afiliado
   * @param numeroAfiliado - Número de afiliado a buscar
   * @returns Afiliado encontrado o null
   */
  getAfiliadoByNumero(numeroAfiliado: string): Promise<IAfiliado | null>;

  /**
   * Busca afiliados por documento
   * @param documento - Documento a buscar
   * @returns Lista de afiliados con ese documento
   */
  getAfiliadosByDocumento(documento: string): Promise<IAfiliado[]>;

  /**
   * Obtiene estadísticas del padrón de afiliados
   * @returns Estadísticas generales del padrón
   */
  getPadronStats(): Promise<IPadronStats>;

  /**
   * Obtiene información de la versión del padrón
   * @returns Información de versión y última actualización
   */
  getPadronVersion(): Promise<IPadronVersion>;

  /**
   * Verifica si un afiliado está activo
   * @param afiliadoId - ID del afiliado
   * @returns True si el afiliado está activo
   */
  isAfiliadoActive(afiliadoId: number): Promise<boolean>;

  /**
   * Actualiza los datos de un afiliado
   * @param afiliadoId - ID del afiliado
   * @param updateData - Datos a actualizar
   * @returns Afiliado actualizado
   */
  updateAfiliado(afiliadoId: number, updateData: Partial<IAfiliado>): Promise<IAfiliado>;

  /**
   * Busca afiliados con filtros avanzados
   * @param filters - Filtros avanzados de búsqueda
   * @returns Resultado de búsqueda paginado
   */
  advancedSearch(filters: {
    text?: string;
    estado?: string;
    seccion?: string;
    delegacion?: string;
    fechaNacimientoDesde?: Date;
    fechaNacimientoHasta?: Date;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    afiliados: IAfiliado[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
}
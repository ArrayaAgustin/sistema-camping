/**
 * Barrel export para todos los tipos
 * Permite importar todos los tipos desde un solo lugar: import { IUser, IAfiliado } from '@/types'
 */

// Common types
export * from './common.types';

// Auth types  
export * from './auth.types';

// Afiliados types
export * from './afiliados.types';

// Visitas types
export * from './visitas.types';

// Re-export specific interfaces que se usan frecuentemente
export type {
  IApiResponse,
  IApiError,
  IPagination
} from './common.types';

export type {
  IAuthenticatedUser,
  IJWTPayload,
  ILoginRequest,
  ILoginResponse,
  IUserProfile
} from './auth.types';

export type {
  IAfiliado,
  IAfiliadoDetailed,
  IFamiliar,
  IPadronVersion,
  IPadronStats
} from './afiliados.types';
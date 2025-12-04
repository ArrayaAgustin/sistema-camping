import { ID, Timestamp, IApiResponse } from './common.types';

/**
 * Tipos relacionados con autenticación y autorización
 */

// Enums para roles y permisos
export enum Role {
  ADMIN = 'admin',
  OPERADOR = 'operador',
  AFILIADO = 'afiliado'
}

export enum Permission {
  ALL = 'all',
  READ_AFILIADOS = 'read:afiliados',
  UPDATE_AFILIADOS = 'update:afiliados',
  READ_OWN = 'read:own',
  UPDATE_OWN = 'update:own',
  CREATE_VISITAS = 'create:visitas',
  READ_VISITAS = 'read:visitas',
  SYNC_VISITAS = 'sync:visitas',
  ADMIN = 'admin'
}

// Tipos alternativos para compatibilidad con strings
export type PermissionString = keyof typeof Permission | string;
export type RoleString = keyof typeof Role | string;

// Payload del JWT Token
export interface IJWTPayload {
  userId: ID;
  username: string;
  afiliadoId: ID | null;
  roles: Role[];
  permisos: Permission[];
  iat?: number;  // issued at
  exp?: number;  // expires at
  type?: 'access' | 'refresh';
}

// Alias para compatibilidad
export interface IJwtPayload extends IJWTPayload {}

// Usuario autenticado (datos que se obtienen tras login)
export interface IAuthenticatedUser {
  id: ID;
  username: string;
  email: string | null;
  afiliado_id: ID | null;
  roles: Role[];
  permisos: Permission[];
  activo: boolean;
  ultimo_acceso?: Timestamp;
}

// Request de login
export interface ILoginRequest {
  username: string;
  password: string;
}

// Response de login exitoso
export interface ILoginResponse {
  success: true;
  token: string;
  message?: string;
  user: {
    id: ID;
    username: string;
    email: string | null;
    afiliado_id: ID | null;
    roles: Role[];
    permisos: Permission[];
    activo?: boolean;
  };
  timestamp: string;
}

// Request para crear usuario
export interface ICreateUserRequest {
  username: string;
  password: string;
  afiliado_id?: ID;
  email?: string;
  role_id?: ID;
}

// Response de usuario creado
export interface ICreateUserResponse {
  success: true;
  userId: ID;
  username: string;
  message: string;
  user?: any;  // Para compatibilidad
}

// Datos del perfil de usuario
export interface IUserProfile {
  id: ID;
  username: string;
  email: string | null;
  afiliado_id: ID | null;
  roles: Role[];
  permisos: Permission[];
  ultimo_acceso: Timestamp | null;
  afiliado?: IUserAfiliado;
}

// Información básica del afiliado asociado al usuario
export interface IUserAfiliado {
  id: ID;
  apellido: string;
  nombres: string;
  dni: string;
  cuil: string;
  email: string | null;
}

// Opciones para validación de contraseña
export interface IPasswordValidation {
  isValid: boolean;
  errors: string[];
}

// Request para registrar usuario
export interface IRegisterRequest {
  username: string;
  password: string;
  email?: string;
  afiliado_id?: ID;
}

// Response de autenticación
export interface IAuthResponse extends IApiResponse<IUser> {
  token: string;
}

// Response de usuario
export interface IUserResponse extends IApiResponse<IUser> {
}

// Usuario base
export interface IUser {
  id: ID;
  username: string;
  email: string | null;
  afiliado_id: ID | null;
  roles: Role[];
  permisos: Permission[];
  activo?: boolean;
  ultimo_acceso?: Timestamp | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  afiliado?: any;  // Para compatibilidad
}

// ========================================
// RESPONSE TYPES
// ========================================
export interface IValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  error?: string;
  errors?: string[];  // Para compatibilidad con validación de contraseñas
  details?: string[];
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: IAuthenticatedUser;
      token?: string;
    }
  }
}
/**
 * Tipos comunes utilizados en toda la aplicación
 */
import { Request, Response } from 'express';
import { IAuthenticatedUser } from './auth.types';

// Tipos básicos de la aplicación
export type ID = number;
export type Timestamp = Date | string;

// Enums para valores constantes
export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test'
}

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500
}

// Tipos para responses de API
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string | string[] | object;
  timestamp: string;
}

export interface IApiError {
  error: string;
  details?: string;
  statusCode?: number;
  timestamp?: string;
}

// Tipos de paginación
export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  pagination: IPagination;
}

// Tipos para opciones de búsqueda
export interface ISearchOptions {
  tipo: 'dni' | 'apellido' | 'general';
  q: string;
  limit: number;
  page?: number;
}

// Tipo para configuración de aplicación
export interface IAppConfig {
  PORT: number;
  NODE_ENV: Environment;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES: string;
  BCRYPT_ROUNDS: number;
  CORS_ORIGIN: string;
  LOG_LEVEL: string;
}

// ========================================
// TYPES PARA MIDDLEWARES
// ========================================

// Configuración de Rate Limiting
export interface IRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

export interface IRateLimitState {
  requests: number;
  resetTime: number;
}

// Generic Response Type para Express
export interface IResponse<T = any> extends Response {
  apiResponse?: (data: T) => void;
  apiError?: (message: string, statusCode?: number) => void;
}

// Request con usuario autenticado
export interface IAuthenticatedRequest extends Request {
  user?: IAuthenticatedUser;
}
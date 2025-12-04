/**
 * Interfaces para el módulo de autenticación
 */
import { Request, Response } from 'express';
import {
  IUser,
  ILoginRequest,
  IRegisterRequest,
  IAuthResponse,
  ILoginResponse,
  ICreateUserResponse,
  IUserResponse
} from '../../types';

/**
 * Interface para el controlador de autenticación
 */
export interface IAuthController {
  login(req: Request, res: Response): Promise<Response<ILoginResponse>>;
  refreshToken(req: Request, res: Response): Promise<Response<{ token: string }>>;
  createUser(req: Request, res: Response): Promise<Response<ICreateUserResponse>>;
  changePassword(req: Request, res: Response): Promise<Response<IUserResponse>>;
  validateToken(req: Request, res: Response): Promise<Response<IUserResponse>>;
}

/**
 * Interface para el servicio de autenticación
 */
export interface IAuthService {
  authenticate(loginData: ILoginRequest): Promise<ILoginResponse>;
  createUser(userData: IRegisterRequest): Promise<ICreateUserResponse>;
  getUserById(userId: number): Promise<IUser | null>;
  validatePassword(password: string): { isValid: boolean; errors: string[] };
  changeUserPassword(userId: number, newPassword: string): Promise<IUser>;
  getUserByUsername(username: string): Promise<IUser | null>;
}
import { Request, Response } from 'express';
import { 
  ILoginRequest, 
  IRegisterRequest, 
  IAuthResponse, 
  IUserResponse, 
  IApiResponse,
  ILoginResponse,
  ICreateUserResponse 
} from '../../types';

/**
 * Interface para el controlador de autenticación
 * Define el contrato que debe cumplir cualquier implementación de AuthController
 */
export interface IAuthController {
  /**
   * POST /auth/login - Autentica un usuario con credenciales
   * @param req - Request con username y password en el body
   * @param res - Response con token JWT y datos del usuario
   */
  login(req: Request<{}, ILoginResponse, ILoginRequest>, res: Response<ILoginResponse>): Promise<Response<ILoginResponse>>;

  /**
   * POST /auth/register - Registra un nuevo usuario
   * @param req - Request con datos de registro en el body
   * @param res - Response con token JWT y datos del usuario creado
   */
  register(req: Request<{}, IAuthResponse, IRegisterRequest>, res: Response<IAuthResponse>): Promise<Response<IAuthResponse>>;

  /**
   * POST /auth/create-user - Crea un nuevo usuario (solo admin)
   * @param req - Request con datos del nuevo usuario
   * @param res - Response con confirmación de usuario creado
   */
  createUser(req: Request, res: Response): Promise<Response<ICreateUserResponse>>;

  /**
   * GET /auth/profile - Obtiene el perfil del usuario autenticado
   * @param req - Request con usuario en req.user (desde middleware de auth)
   * @param res - Response con datos del usuario
   */
  getProfile(req: Request, res: Response<IUserResponse>): Promise<Response<IUserResponse>>;

  /**
   * POST /auth/logout - Cierra sesión del usuario
   * @param req - Request con token en headers
   * @param res - Response de confirmación
   */
  logout(req: Request, res: Response<IApiResponse<null>>): Promise<Response<IApiResponse<null>>>;

  /**
   * POST /auth/refresh - Renueva el token JWT
   * @param req - Request con usuario autenticado
   * @param res - Response con nuevo token
   */
  refreshToken(req: Request, res: Response): Promise<Response<IApiResponse<{ token: string }>>>;

  /**
   * POST /auth/reset-password - Resetea contraseña al DNI (admin)
   */
  resetPassword(req: Request, res: Response): Promise<Response<IApiResponse<{ userId: number; username: string }>>>;
}
import { Request, Response } from 'express';
import { authService } from '../services';
import { JwtUtil, HashUtil } from '../utils';
import { config } from '../config';
import { IAuthController } from '../interfaces/auth/auth.interfaces';
import { 
  ILoginRequest,
  IRegisterRequest,
  IAuthResponse,
  ILoginResponse,
  ICreateUserResponse,
  IUserResponse,
  IApiResponse,
  IUser
} from '../types';
import { responseHandler } from '../middlewares';

/**
 * Controlador de autenticación - Implementa IAuthController
 * Maneja todas las operaciones relacionadas con autenticación y usuarios
 */
export class AuthController implements IAuthController {

  /**
   * POST /auth/login - Autentica un usuario y genera token JWT
   */
  async login(
    req: Request<{}, ILoginResponse, ILoginRequest>, 
    res: Response<ILoginResponse>
  ): Promise<Response<ILoginResponse>> {
    console.log('🔐 Login attempt:', {
      username: req.body?.username,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('❌ Missing credentials');
      return responseHandler.validationError(res, [
        'Username is required',
        'Password is required'
      ]);
    }
    
    try {
      console.log('🔍 Authenticating user:', username);
      const loginResult = await authService.authenticate({ username, password });
      
      if (!loginResult.success) {
        console.log('❌ Invalid credentials for:', username);
        return responseHandler.unauthorized(res, 'Invalid username or password');
      }
      
      console.log('✅ User authenticated:', loginResult.user.username);
      console.log('👑 User roles:', loginResult.user.roles);
      console.log('🔑 User permissions:', loginResult.user.permisos);
      
      const token = JwtUtil.generateToken(loginResult.user);
      console.log('🎫 Token generated successfully');
      
      const response: ILoginResponse = {
        success: true,
        message: 'Authentication successful',
        token,
        user: {
          id: loginResult.user.id,
          username: loginResult.user.username,
          email: loginResult.user.email,
          afiliado_id: loginResult.user.afiliado_id,
          persona_id: loginResult.user.persona_id,
          roles: loginResult.user.roles,
          permisos: loginResult.user.permisos,
          activo: loginResult.user.activo,
          must_change_password: loginResult.user.must_change_password
        },
        timestamp: new Date().toISOString()
      };
      
      res.cookie('camping-token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 8
      });

      return res.status(200).json(response);
      
    } catch (error: any) {
      console.error('❌ Login error:', {
        message: error.message,
        stack: error.stack,
        username,
        timestamp: new Date().toISOString()
      });
      
      if (error.message === 'User account is inactive') {
        return responseHandler.forbidden(res, 'Your account has been deactivated');
      }
      
      if (error.message === 'Invalid credentials') {
        return responseHandler.unauthorized(res, 'Invalid username or password');
      }
      
      return responseHandler.internalError(res, 'An error occurred during authentication');
    }
  }

  /**
   * POST /auth/register - Registra un nuevo usuario
   */
  async register(
    req: Request<{}, IAuthResponse, IRegisterRequest>, 
    res: Response<IAuthResponse>
  ): Promise<Response<IAuthResponse>> {
    console.log('📝 Register attempt:', {
      username: req.body?.username,
      email: req.body?.email,
      timestamp: new Date().toISOString()
    });

    const { username, email, password, afiliado_id } = req.body;
    
    if (!username || !password) {
      return responseHandler.validationError(res, [
        'Username is required',
        'Password is required'
      ]);
    }

    // Validar fortaleza de contraseña
    const passwordValidation = HashUtil.validatePassword(password);
    if (!passwordValidation.isValid) {
      return responseHandler.validationError(res, passwordValidation.errors || ['Invalid password']);
    }

    try {
      const registerResult = await authService.registerUser({
        username,
        email,
        password,
        afiliado_id
      });

      if (!registerResult.success) {
        return responseHandler.conflict(res, 'User registration failed');
      }

      const token = JwtUtil.generateToken(registerResult.data!);

      const response: IAuthResponse = {
        success: true,
        data: registerResult.data!,
        token,
        timestamp: new Date().toISOString()
      };

      return responseHandler.created(res, response, 'User registered successfully');
      
    } catch (error: any) {
      console.error('❌ Register error:', error.message);
      
      if (error.message.includes('already exists')) {
        return responseHandler.conflict(res, 'Username or email already exists');
      }
      
      return responseHandler.internalError(res, 'Error during user registration');
    }
  }

  /**
   * POST /auth/create-user - Crea un nuevo usuario (solo admin)
   */
  async createUser(req: Request, res: Response): Promise<Response<ICreateUserResponse>> {
    console.log('👤 Create user attempt:', {
      username: req.body?.username,
      createdBy: req.user?.username,
      timestamp: new Date().toISOString()
    });

    const { username, email, afiliado_id, persona_id } = req.body;
    
    if (!username || !email) {
      return responseHandler.validationError(res, [
        'Username is required',
        'Email is required'
      ]);
    }

    try {
      if (!req.user) {
        return responseHandler.unauthorized(res, 'Authentication required');
      }

      const createResult = await authService.createUser({
        username,
        email,
        afiliado_id,
        persona_id
      });

      console.log('✅ User created successfully:', createResult.username);
      
      return responseHandler.created(res, createResult, 'User created successfully');
      
    } catch (error: any) {
      console.error('❌ Create user error:', error.message);
      
      if (error.message.includes('Insufficient permissions')) {
        return responseHandler.forbidden(res, 'Administrator privileges required');
      }
      
      if (error.message.includes('already exists')) {
        return responseHandler.conflict(res, 'Username or email already exists');
      }
      
      return responseHandler.internalError(res, 'Error creating user');
    }
  }

  /**
   * POST /auth/reset-password - Resetea contraseña al DNI (admin)
   */
  async resetPassword(req: Request, res: Response<IApiResponse<{ userId: number; username: string }>>): Promise<Response<IApiResponse<{ userId: number; username: string }>>> {
    const { userId, username } = req.body as { userId?: number; username?: string };

    if (!userId && !username) {
      return responseHandler.validationError(res, ['userId o username es requerido']);
    }

    try {
      const result = await authService.resetPasswordToDni(userId, username);

      return responseHandler.success(res, {
        userId: result.userId,
        username: result.username
      }, 'Password reseteada al DNI');
    } catch (error: any) {
      console.error('❌ Reset password error:', error.message);
      return responseHandler.internalError(res, error.message || 'Error al resetear contraseña');
    }
  }

  /**
   * GET /auth/profile - Obtiene el perfil del usuario autenticado
   */
  async getProfile(req: Request, res: Response<IUserResponse>): Promise<Response<IUserResponse>> {
    try {
      if (!req.user) {
        return responseHandler.unauthorized(res, 'Authentication required');
      }

      // Obtener datos actualizados del usuario
      const user = await authService.getUserById(req.user.id);
      
      if (!user) {
        return responseHandler.notFound(res, 'User profile not found');
      }

      const userResponse: IUserResponse = {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          afiliado_id: user.afiliado_id,
          persona_id: user.persona_id,
          roles: user.roles,
          permisos: user.permisos,
          activo: user.activo,
          must_change_password: user.must_change_password,
          ultimo_acceso: user.ultimo_acceso,
          created_at: user.created_at,
          updated_at: user.updated_at,
          afiliado: user.afiliado
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(200).json(userResponse);
      
    } catch (error: any) {
      console.error('❌ Get profile error:', error.message);
      return responseHandler.internalError(res, 'Error retrieving user profile');
    }
  }

  /**
   * POST /auth/logout - Cierra sesión del usuario
   */
  async logout(req: Request, res: Response<IApiResponse<null>>): Promise<Response<IApiResponse<null>>> {
    try {
      if (!req.token) {
        return responseHandler.unauthorized(res, 'No token provided');
      }

      // Invalidar token (implementación básica)
      await authService.invalidateToken(req.token);
      
      console.log('🔓 User logged out:', {
        userId: req.user?.id,
        username: req.user?.username,
        timestamp: new Date().toISOString()
      });

      res.clearCookie('camping-token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.NODE_ENV === 'production'
      });

      return responseHandler.success(res, null, 'Logged out successfully');
      
    } catch (error: any) {
      console.error('❌ Logout error:', error.message);
      return responseHandler.internalError(res, 'Error during logout');
    }
  }

  /**
   * POST /auth/refresh - Renueva el token JWT
   */
  async refreshToken(req: Request, res: Response): Promise<Response<{ token: string }>> {
    try {
      if (!req.user) {
        return responseHandler.unauthorized(res, 'Authentication required');
      }

      const newToken = await authService.refreshToken(req.user.id);
      
      console.log('🔄 Token refreshed for user:', req.user.username);

      return res.status(200).json({ token: newToken });
      
    } catch (error: any) {
      console.error('❌ Refresh token error:', error.message);
      
      if (error.message.includes('not found')) {
        return responseHandler.notFound(res, 'User not found');
      }
      
      if (error.message.includes('inactive')) {
        return responseHandler.forbidden(res, 'User account is inactive');
      }
      
      return responseHandler.internalError(res, 'Error refreshing token');
    }
  }

  /**
   * POST /auth/change-password - Cambiar contraseña del usuario
   */
  async changePassword(req: Request, res: Response): Promise<Response<IUserResponse>> {
    const { currentPassword = '', newPassword } = req.body;

    if (!newPassword) {
      return responseHandler.validationError(res, ['New password is required']);
    }

    // Validar nueva contraseña
    const passwordValidation = HashUtil.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return responseHandler.validationError(res, passwordValidation.errors || ['Invalid password']);
    }

    try {
      if (!req.user) {
        return responseHandler.unauthorized(res, 'Authentication required');
      }

      const success = await authService.changePassword(
        req.user.id, 
        currentPassword, 
        newPassword
      );

      if (!success) {
        return responseHandler.error(res, 'Failed to change password', 400);
      }

      console.log('🔑 Password changed for user:', req.user.username);

      const updatedUser = await authService.getUserById(req.user.id);
      return res.status(200).json({
        success: true,
        data: updatedUser,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ Change password error:', error.message);
      
      if (error.message.includes('incorrect')) {
        return responseHandler.unauthorized(res, 'Current password is incorrect');
      }
      
      return responseHandler.internalError(res, 'Error changing password');
    }
  }

  /**
   * GET /auth/validate - Validar token JWT
   */
  async validateToken(req: Request, res: Response): Promise<Response<IUserResponse>> {
    try {
      if (!req.user) {
        return responseHandler.unauthorized(res, 'Invalid token');
      }

      const user = await authService.getUserById(req.user.id);
      
      if (!user) {
        return responseHandler.notFound(res, 'User not found');
      }

      return res.status(200).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ Validate token error:', error.message);
      return responseHandler.internalError(res, 'Error validating token');
    }
  }
}

// Exportar instancia del controlador
export const authController = new AuthController();
export default authController;
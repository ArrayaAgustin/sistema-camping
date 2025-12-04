import { prisma } from '../config/prisma-config';
import { HashUtil } from '../utils/hash.util';
import { IAuthService } from '../interfaces/auth/auth.interfaces';
import { 
  IUser, 
  ILoginRequest, 
  IRegisterRequest, 
  IAuthResponse,
  ILoginResponse,
  ICreateUserResponse,
  Role,
  Permission 
} from '../types';

/**
 * Servicio de autenticación - Implementa la lógica de negocio para autenticación
 * Implementa la interface IAuthService
 */
export class AuthService implements IAuthService {
  
  /**
   * Autentica las credenciales de un usuario
   */
  async authenticate(credentials: ILoginRequest): Promise<ILoginResponse> {
    const { username, password } = credentials;
    
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Buscar usuario
    const user = await prisma.usuarios.findUnique({ 
      where: { username: username.toLowerCase() },
      include: {
        UsuarioRoles: {
          where: { activo: true },
          include: { Role: true }
        }
      }
    });

    if (!user) {
      throw new Error('Invalid credentials'); // No revelar si el usuario existe o no
    }

    if (!user.activo) {
      throw new Error('User account is inactive');
    }

    // Verificar contraseña
    const isPasswordValid = await HashUtil.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Construir datos del usuario con roles y permisos
    const roles = user.UsuarioRoles.map(ur => ur.Role?.nombre).filter(Boolean);
    const permisosSet = new Set<string>();
    
    for (const ur of user.UsuarioRoles) {
      if (ur.Role && ur.Role.permisos) {
        try {
          const perms = ur.Role.permisos;
          if (Array.isArray(perms)) {
            perms.forEach(p => p && typeof p === 'string' && permisosSet.add(p));
          } else if (typeof perms === 'string') {
            const parsed = JSON.parse(perms);
            if (Array.isArray(parsed)) {
              parsed.forEach(p => permisosSet.add(p));
            }
          }
        } catch (error) {
          console.warn('Error parsing permissions for role:', ur.Role.nombre, error);
        }
      }
    }

    const permisos = Array.from(permisosSet);

    // Actualizar último acceso
    await prisma.usuarios.update({
      where: { id: user.id },
      data: { ultimo_acceso: new Date() }
    });

    const userData: IUser = {
      id: user.id,
      username: user.username,
      email: user.email || '',
      afiliado_id: user.afiliado_id,
      roles: roles as Role[],
      permisos: permisos as Permission[],
      activo: user.activo || undefined,
      ultimo_acceso: user.ultimo_acceso || undefined,
      created_at: user.created_at || undefined,
      updated_at: user.updated_at || undefined
    };

    return {
      success: true,
      token: 'dummy-token', // TODO: Implementar generación de JWT
      message: 'Authentication successful',
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        afiliado_id: userData.afiliado_id,
        roles: userData.roles,
        permisos: userData.permisos,
        activo: userData.activo
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Registra un nuevo usuario en el sistema
   */
  async registerUser(userData: IRegisterRequest): Promise<IAuthResponse> {
    const { username, email, password, afiliado_id } = userData;

    // Validar datos requeridos
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Validar fortaleza de contraseña
    const passwordValidation = HashUtil.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors?.join(', ') || 'Invalid password'}`);
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.usuarios.findFirst({
      where: {
        OR: [
          { username: username.toLowerCase() },
          { email: email || undefined }
        ]
      }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash de la contraseña
    const passwordHash = await HashUtil.hashPassword(password);

    // Crear usuario
    const newUser = await prisma.usuarios.create({
      data: {
        username: username.toLowerCase(),
        email: email || null,
        password_hash: passwordHash,
        afiliado_id: afiliado_id || null,
        activo: true
      }
    });

    const user: IUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email || '',
      afiliado_id: newUser.afiliado_id,
      roles: [],
      permisos: [],
      activo: newUser.activo || undefined,
      ultimo_acceso: newUser.ultimo_acceso || undefined,
      created_at: newUser.created_at || undefined,
      updated_at: newUser.updated_at || undefined
    };

    return {
      success: true,
      data: user,
      token: 'dummy-token', // TODO: Implementar generación de JWT
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Crea un nuevo usuario (solo para administradores)
   */
  async createUser(userData: IRegisterRequest): Promise<ICreateUserResponse> {
    // TODO: Implementar verificación de permisos de admin si es necesario
    
    const { username, email, password, afiliado_id } = userData;

    if (!userData.username || !userData.email) {
      throw new Error('Username and email are required');
    }

    // Generar contraseña temporal
    const temporaryPassword = HashUtil.generateSecurePassword(12);
    const passwordHash = await HashUtil.hashPassword(temporaryPassword);

    // Crear usuario
    const newUser = await prisma.usuarios.create({
      data: {
        username: userData.username.toLowerCase(),
        email: userData.email,
        password_hash: passwordHash,
        afiliado_id: userData.afiliado_id || null,
        activo: true
      }
    });

    return {
      success: true,
      userId: newUser.id,
      username: newUser.username,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email || '',
        activo: newUser.activo
      }
    };
  }

  /**
   * Obtiene un usuario por su ID
   */
  async getUserById(userId: number): Promise<IUser | null> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await prisma.usuarios.findUnique({
      where: { id: userId },
      include: {
        UsuarioRoles: {
          where: { activo: true },
          include: { Role: true }
        },
        Afiliado: true
      }
    });

    if (!user) {
      return null;
    }

    const roles = user.UsuarioRoles.map(ur => ur.Role?.nombre).filter(Boolean);
    const permisosSet = new Set<string>();
    
    for (const ur of user.UsuarioRoles) {
      if (ur.Role && ur.Role.permisos) {
        try {
          const perms = Array.isArray(ur.Role.permisos) 
            ? ur.Role.permisos 
            : JSON.parse(ur.Role.permisos as string);
          if (Array.isArray(perms)) {
            perms.forEach(p => permisosSet.add(p));
          }
        } catch (error) {
          console.warn('Error parsing permissions:', error);
        }
      }
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email || '',
      afiliado_id: user.afiliado_id,
      roles: roles as Role[],
      permisos: Array.from(permisosSet) as Permission[],
      activo: user.activo || undefined,
      ultimo_acceso: user.ultimo_acceso || undefined,
      created_at: user.created_at || undefined,
      updated_at: user.updated_at || undefined,
      afiliado: user.Afiliado
    };
  }

  /**
   * Obtiene un usuario por su username/email
   */
  async getUserByIdentifier(identifier: string): Promise<IUser | null> {
    const user = await prisma.usuarios.findFirst({
      where: {
        OR: [
          { username: identifier.toLowerCase() },
          { email: identifier }
        ]
      },
      include: {
        UsuarioRoles: {
          where: { activo: true },
          include: { Role: true }
        }
      }
    });

    if (!user) {
      return null;
    }

    return this.getUserById(user.id);
  }

  /**
   * Actualiza la información de un usuario
   */
  async updateUser(userId: number, updateData: Partial<IUser>): Promise<IUser> {
    const existingUser = await this.getUserById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    const updatedUser = await prisma.usuarios.update({
      where: { id: userId },
      data: {
        email: updateData.email,
        activo: updateData.activo,
        afiliado_id: updateData.afiliado_id,
        updated_at: new Date()
      }
    });

    const result = await this.getUserById(updatedUser.id);
    if (!result) {
      throw new Error('Error retrieving updated user');
    }

    return result;
  }

  /**
   * Cambia la contraseña de un usuario
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await prisma.usuarios.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verificar contraseña actual
    const isCurrentValid = await HashUtil.comparePassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      throw new Error('Current password is incorrect');
    }

    // Validar nueva contraseña
    const validation = HashUtil.validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors?.join(', ') || 'Invalid password'}`);
    }

    // Actualizar contraseña
    const newPasswordHash = await HashUtil.hashPassword(newPassword);
    await prisma.usuarios.update({
      where: { id: userId },
      data: { 
        password_hash: newPasswordHash,
        updated_at: new Date()
      }
    });

    return true;
  }

  /**
   * Valida si un token es válido (implementación básica)
   */
  async validateToken(token: string): Promise<boolean> {
    // TODO: Implementar cache de tokens invalidados (Redis)
    // Por ahora solo verificamos que el token sea válido estructuralmente
    try {
      const { JwtUtil } = await import('../utils');
      JwtUtil.verifyToken(token);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Invalida un token (logout)
   */
  async invalidateToken(token: string): Promise<boolean> {
    // TODO: Implementar blacklist de tokens en Redis
    // Por ahora solo retornamos true
    console.log('Token invalidated:', token.substring(0, 20) + '...');
    return true;
  }

  /**
   * Renueva un token JWT
   */
  async refreshToken(userId: number): Promise<string> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.activo) {
      throw new Error('User account is inactive');
    }

    const { JwtUtil } = await import('../utils');
    return JwtUtil.generateToken(user);
  }

  /**
   * Verifica si un usuario tiene un permiso específico
   */
  async hasPermission(userId: number, requiredPermissions: string | string[]): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    // Si tiene permiso 'all', puede hacer todo
    if (user.permisos.includes(Permission.ALL)) {
      return true;
    }

    // Verificar si tiene al menos uno de los permisos requeridos
    return permissions.some(permission => user.permisos.includes(permission as Permission));
  }

  /**
   * Valida la fortaleza de una contraseña
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const result = HashUtil.validatePassword(password);
    return {
      isValid: result.isValid,
      errors: result.errors || []
    };
  }

  /**
   * Cambia la contraseña de un usuario
   */
  async changeUserPassword(userId: number, newPassword: string): Promise<IUser> {
    // Validar nueva contraseña
    const validation = HashUtil.validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors?.join(', ') || 'Invalid password'}`);
    }

    // Actualizar contraseña
    const newPasswordHash = await HashUtil.hashPassword(newPassword);
    await prisma.usuarios.update({
      where: { id: userId },
      data: { 
        password_hash: newPasswordHash
      }
    });

    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found after password change');
    }
    return user;
  }

  /**
   * Obtiene un usuario por su username
   */
  async getUserByUsername(username: string): Promise<IUser | null> {
    try {
      const user = await prisma.usuarios.findUnique({
        where: { username: username.toLowerCase() },
        include: {
          UsuarioRoles: {
            where: { activo: true },
            include: { Role: true }
          },
          Afiliado: true
        }
      });

      if (!user) return null;

      return this.buildUserObject(user);
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  /**
   * Construye un objeto IUser desde datos de Prisma
   */
  private buildUserObject(user: any): IUser {
    const roles = user.UsuarioRoles?.map((ur: any) => ur.Role?.nombre).filter(Boolean) || [];
    const permisosSet = new Set<string>();
    
    for (const ur of user.UsuarioRoles || []) {
      if (ur.Role && ur.Role.permisos) {
        try {
          const perms = ur.Role.permisos;
          if (Array.isArray(perms)) {
            perms.forEach(p => p && typeof p === 'string' && permisosSet.add(p));
          } else if (typeof perms === 'string') {
            const parsed = JSON.parse(perms);
            if (Array.isArray(parsed)) {
              parsed.forEach(p => p && typeof p === 'string' && permisosSet.add(p));
            }
          }
        } catch (error) {
          console.warn('Error parsing permissions for role:', ur.Role.nombre, error);
        }
      }
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email || '',
      afiliado_id: user.afiliado_id,
      roles: roles as Role[],
      permisos: Array.from(permisosSet) as Permission[],
      activo: user.activo || undefined,
      ultimo_acceso: user.ultimo_acceso || undefined,
      created_at: user.created_at || undefined,
      updated_at: user.updated_at || undefined,
      afiliado: user.Afiliado
    };
  }
}

// Exportar instancia singleton
export const authService = new AuthService();
export default authService;
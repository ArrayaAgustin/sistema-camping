import { 
  IUser, 
  ILoginRequest, 
  IRegisterRequest, 
  IAuthResponse,
  ILoginResponse,
  ICreateUserResponse 
} from '../../types';

/**
 * Interface para el servicio de autenticación
 * Define el contrato que debe cumplir cualquier implementación de AuthService
 */
export interface IAuthService {
  /**
   * Autentica un usuario con sus credenciales
   * @param credentials - Credenciales de login (username/email y password)
   * @returns Datos del usuario autenticado y token
   */
  authenticateCredentials(credentials: ILoginRequest): Promise<ILoginResponse>;

  /**
   * Registra un nuevo usuario en el sistema
   * @param userData - Datos del usuario a registrar
   * @returns Usuario creado y token de autenticación
   */
  registerUser(userData: IRegisterRequest): Promise<IAuthResponse>;

  /**
   * Crea un nuevo usuario (solo para administradores)
   * @param userData - Datos del usuario a crear
   * @param createdBy - ID del usuario que crea (admin)
   * @returns Confirmación del usuario creado
   */
  createUser(userData: Partial<IUser>, createdBy: number): Promise<ICreateUserResponse>;

  /**
   * Obtiene un usuario por su ID
   * @param userId - ID del usuario
   * @returns Datos del usuario o null si no existe
   */
  getUserById(userId: number): Promise<IUser | null>;

  /**
   * Obtiene un usuario por su username/email
   * @param identifier - Username o email del usuario
   * @returns Datos del usuario o null si no existe
   */
  getUserByIdentifier(identifier: string): Promise<IUser | null>;

  /**
   * Actualiza la información de un usuario
   * @param userId - ID del usuario a actualizar
   * @param updateData - Datos a actualizar
   * @returns Usuario actualizado
   */
  updateUser(userId: number, updateData: Partial<IUser>): Promise<IUser>;

  /**
   * Cambia la contraseña de un usuario
   * @param userId - ID del usuario
   * @param currentPassword - Contraseña actual
   * @param newPassword - Nueva contraseña
   * @returns Confirmación del cambio
   */
  changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean>;

  /**
   * Valida si un token es válido y no ha expirado
   * @param token - Token JWT a validar
   * @returns True si el token es válido
   */
  validateToken(token: string): Promise<boolean>;

  /**
   * Invalida un token (logout)
   * @param token - Token a invalidar
   * @returns Confirmación de invalidación
   */
  invalidateToken(token: string): Promise<boolean>;

  /**
   * Renueva un token JWT
   * @param userId - ID del usuario
   * @returns Nuevo token JWT
   */
  refreshToken(userId: number): Promise<string>;
}
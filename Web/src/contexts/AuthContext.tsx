import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

interface User {
  id: number;
  username: string;
  email: string | null;
  roles: string[];
  permisos: string[];
  activo?: boolean;
  persona_id?: number | null;
  must_change_password?: boolean;
  campings?: { camping_id: number; rol: string }[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (...permisos: string[]) => boolean;
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeUser = (rawUser: any): User => ({
    ...rawUser,
    roles: (rawUser.roles || []).map((role: string) => role.toLowerCase()),
    permisos: rawUser.permisos || [],
    persona_id: rawUser.persona_id ?? null,
    must_change_password: rawUser.must_change_password ?? false,
  });

  // Recuperar datos del localStorage al inicializar
  useEffect(() => {
    const savedUser = localStorage.getItem('camping-user');

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as User;
      setUser(normalizeUser(parsedUser));
    }

    const bootstrap = async () => {
      try {
        const profile = await authService.getProfile();
        if (profile?.data) {
          const normalized = normalizeUser(profile.data);
          setUser(normalized);
          localStorage.setItem('camping-user', JSON.stringify(normalized));
        }
      } catch (error) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('camping-user');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login(username, password);

      if (data?.token && data?.user) {
        setUser(normalizeUser(data.user));
        setToken(null);
        
        // Guardar usuario en localStorage
        localStorage.setItem('camping-user', JSON.stringify(normalizeUser(data.user)));
      } else {
        throw new Error('Error al iniciar sesión');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout().catch(() => undefined);
    setUser(null);
    setToken(null);
    localStorage.removeItem('camping-user');
  };

  const hasRole = (...roles: string[]) => {
    if (!user?.roles?.length) return false;
    const normalized = roles.map((role) => role.toLowerCase());
    return normalized.some((role) => user.roles.includes(role));
  };

  const hasPermission = (...permisos: string[]) => {
    if (!user?.permisos?.length) return false;
    const normalized = permisos.map((permiso) => permiso.toLowerCase());
    return normalized.some((permiso) => user.permisos.includes(permiso));
  };

  const updateUser = (partial: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem('camping-user', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasRole,
    hasPermission,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
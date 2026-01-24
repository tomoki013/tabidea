/**
 * Authentication related types
 */

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  authProvider: 'google' | 'twitter' | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export type AuthProvider = 'google' | 'twitter';

export interface LoginOptions {
  provider: AuthProvider;
  redirectTo?: string;
}

export interface AuthError {
  code: string;
  message: string;
}

/**
 * Authentication and user profile type definitions
 */

import { Language } from './quiz';

export interface User {
  id: string;
  email: string;
  name: string;
  buddyId?: string;
  age?: number;
  grade?: string;
  preferredLanguage?: Language;
  phone?: string;
  phoneCountry?: string;
  birthDate?: string;
  createdAt: string;
  profileComplete?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  birthDate: string;
  grade: string;
  preferredLanguage?: Language;
}

export interface AuthResponse {
  user: User;
  /** Deprecated — session is stored in httpOnly cookie. */
  token?: string;
}

export interface SocialLoginData {
  provider: 'google' | 'apple';
  token: string;
  email: string;
  name: string;
}



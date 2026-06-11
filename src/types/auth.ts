/**
 * Authentication and user profile type definitions
 */

import { Language } from './quiz';

export interface User {
  id: string;
  email: string;
  name: string;
  age?: number;
  grade?: string;
  preferredLanguage?: Language;
  phone?: string;
  birthDate?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  age?: number;
  grade?: string;
  preferredLanguage?: Language;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SocialLoginData {
  provider: 'google' | 'apple';
  token: string;
  email: string;
  name: string;
}



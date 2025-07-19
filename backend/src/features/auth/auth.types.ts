
import type { User, USER_ROLES } from '@user/user.types'
export interface LoginServiceSuccess {
  success: true
  user: User
  token: string
}

export interface LoginServiceError {
  success: false
  error: string
}

export type LoginServiceResponse = LoginServiceSuccess | LoginServiceError

export interface VerifyServiceSuccess {
  user: User
  isAuthenticated: true
}

export interface VerifyServiceError {
  error: string
  isAuthenticated: false
}

export type VerifyServiceResponse = VerifyServiceSuccess | VerifyServiceError

export interface LogoutServiceSuccess {
  success: true
  message: string
}

export interface LogoutServiceError {
  success: false
  error: string
}
export type LogoutServiceResponse = LogoutServiceSuccess | LogoutServiceError

export interface CreateUserRequest {
  username: string
  password: string
  role: USER_ROLES
  image_path?: string | null
}

export interface CreateUserResponse {
  id: number
  username: string
  role: USER_ROLES
  image_path: string | null
}

export interface ErrorResponse {
  error: string
  message: string
  code: string
}

/** Login Types */
export interface LoginSuccess {
  success: true
  user: User
}

export interface LoginError {
  error: string
}

export interface LoginBody {
  username: string // minLength: 1, maxLength: 50
  password: string // minLength: 2, maxLength: 100
}

/** Verify Types */
export interface VerifySuccess {
  user: User
  isAuthenticated: true
}

export interface VerifyError {
  error: string
  isAuthenticated: false
}

/** Logout Types */
export interface LogoutSuccess {
  success: true
  message: string
}

export interface LogoutError {
  success: false
  error: string
}

// Union types pour les réponses
export type LoginResponse = LoginSuccess | LoginError
export type VerifyResponse = VerifySuccess | VerifyError
export type LogoutResponse = LogoutSuccess | LogoutError

// Type guards helpers (optionnel)
export function isLoginSuccess (
  response: LoginResponse
): response is LoginSuccess {
  return 'success' in response && response.success === true
}

export function isVerifySuccess (
  response: VerifyResponse
): response is VerifySuccess {
  return 'isAuthenticated' in response && response.isAuthenticated === true
}

export function isLogoutSuccess (
  response: LogoutResponse
): response is LogoutSuccess {
  return 'success' in response && response.success === true
}

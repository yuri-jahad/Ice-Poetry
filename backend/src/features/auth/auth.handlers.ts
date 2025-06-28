import { sanitizeInput } from '@shared/shared.helpers'
// auth.handlers.ts
import {
  login as loginService,
  logout as logoutService,
  verify as verifyService
} from '@auth/auth.services'

import { createSecureCookie, mapAuthErrorToStatus } from '@auth/auth.helpers'
import type { InferHandler } from 'elysia';

import type {
  LoginResponse,
  VerifyResponse,
  LogoutResponse
} from '@auth/auth.types'

/**
 * Login route handler
 * Handles only HTTP concerns (request/response)
 * Optimized: input validation, service delegation, proper error mapping
 */


// Types pour le body de login
interface LoginBody {
  username: string
  password: string
}

type Set = {
  status?: number
  headers?: Record<string, string>
}

type JWTMethods = {
  sign: (payload: any) => Promise<string>
  verify: (token: string) => Promise<any>
}

interface LoginParams {
  body: LoginBody
  set: Set
  jwt: JWTMethods
}

export async function login ({ jwt, body, set }: any): Promise<LoginResponse> {
  const pseudo = sanitizeInput(body?.username)
  const password = sanitizeInput(body?.password)

  if (!pseudo || !password) {
    set.status = 401
    return { error: 'Username and password are required' }
  }

  const result = await loginService(pseudo, password, jwt)

  if (!result.success) {
    set.status = mapAuthErrorToStatus(result.error)
    return { error: result.error }
  }

  const cookie = createSecureCookie(result.token)
  set.headers = {
    ...set.headers,
    'Set-Cookie': cookie
  }

  set.status = 200

  return {
    success: true,
    user: result.user
  }
}

/**
 * Verify route handler
 * Handles only HTTP concerns
 * Optimized: service delegation, proper response structure
 */



export function verify ({ user, isAuthenticated, set }: any): VerifyResponse {
  try {
    const result = verifyService(user, isAuthenticated)

    if (!result.isAuthenticated) {
      set.status = mapAuthErrorToStatus(result.error)
      return {
        error: result.error,
        isAuthenticated: false
      }
    }

    set.status = 200
    return {
      user: result.user,
      isAuthenticated: true
    }
  } catch (error) {
    console.error('Unexpected error in verify handler:', error)
    set.status = 500
    return {
      error: 'Internal server error',
      isAuthenticated: false
    }
  }
}

/**
 * Logout route handler
 * Handles only HTTP concerns
 * Optimized: service delegation, consistent error handling
 */
export function logout ({ cookie, set }: any): LogoutResponse {
  try {
    // Delegate business logic to service
    const result = logoutService()

    if (!result.success) {
      set.status = mapAuthErrorToStatus(result.error)
      return {
        error: result.error,
        success: false
      }
    }

    // Handle HTTP concerns (cookie removal)
    if (cookie?.auth_token) {
      cookie.auth_token.remove()
    }

    set.status = 200
    return {
      message: result.message,
      success: true
    }
  } catch (error) {
    console.error('Unexpected error in logout handler:', error)
    set.status = 500
    return {
      error: 'Internal server error',
      success: false
    }
  }
}

// auth.service.ts
import type { UserClient } from '@user/user.types'
import type {
  LoginServiceResponse,
  LogoutServiceResponse,
  VerifyServiceResponse
} from '@auth/auth.types'
import { authenticateUser } from '@user/user.repositories'
import { createToken, mapToUserClient } from '@auth/auth.helpers'

export async function login (
  username: string,
  password: string,
  jwt: any
): Promise<LoginServiceResponse> {
  try {
    if (!process.env.JWT_SECRET) {
      return { success: false, error: 'Server configuration error' }
    }
    const user = await authenticateUser(username, password)

    if (!user) {
      return { success: false, error: 'Invalid credentials' }
    }

    const userClient = mapToUserClient(user)

    const token = await createToken(userClient, jwt)

    console.log(`User connected: ${username}`)

    return {
      success: true,
      user: userClient,
      token
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Server error during login' }
  }
}

export function verify (
  user: UserClient | null,
  isAuthenticated: boolean
): VerifyServiceResponse {
  if (!user || !isAuthenticated) {
    return {
      error: 'Not authenticated',
      isAuthenticated: false
    }
  }

  return {
    user,
    isAuthenticated: true
  }
}

export function logout (): LogoutServiceResponse {
  try {
    return {
      success: true,
      message: 'Logout successful'
    }
  } catch (error) {
    console.error('Logout error:', error)
    return {
      success: false,
      error: 'Error during logout'
    }
  }
}

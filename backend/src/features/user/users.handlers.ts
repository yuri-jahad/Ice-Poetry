import type {
  CreateUserRequest,
  CreateUserResponse,
  ErrorResponse
} from '@auth/auth.types'
import { getUserByUsername } from '@user/user.repositories'
import { createUser } from '@user/user.services'

export const createUserHandler = async ({
  body,
  set
}: {
  body: CreateUserRequest
  set: { status: number }
}): Promise<
  | {
      success: true
      data: CreateUserResponse
      message: string
    }
  | ErrorResponse
> => {
  try {
    const exists = await getUserByUsername(body.username)
    if (exists) {
      set.status = 409
      return {
        error: 'User already exists',
        message: `A user with username "${body.username}" already exists`,
        code: 'USER_ALREADY_EXISTS'
      }
    }
    const newUser = await createUser(body) // ou createUserWithInsertable(body)
    if (!newUser) {
      set.status = 500
      return {
        error: 'Internal server error',
        message: 'Failed to create user',
        code: 'USER_CREATION_FAILED'
      }
    }
    const userResponse: CreateUserResponse = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      image_path: newUser.image_path
    }

    return {
      success: true,
      data: userResponse,
      message: 'User created successfully'
    }
  } catch (error) {
    console.error('Error in createUserHandler:', error)
    set.status = 500
    return {
      error: 'Internal server error',
      message: 'An unexpected error occurred while creating the user',
      code: 'INTERNAL_ERROR'
    }
  }
}

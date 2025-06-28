import type { USERS, USERS_ROLES } from '@database/database.types'
import type { Static } from '@sinclair/typebox'

import {
  UserRolesSchema,
  UserClientSchema,
  CreateUserRequestSchema,
  CreateUserResponseSchema,
  ErrorResponseSchema
} from '@user/user.schemas'

export interface UserBase {
  id: number
  username: string
  role: USERS_ROLES
}

export type UserServer = USERS
export type UserRoles = Static<typeof UserRolesSchema>
export type UserClient = Static<typeof UserClientSchema>
export type CreateUserRequest = Static<typeof CreateUserRequestSchema>
export type CreateUserResponse = Static<typeof CreateUserResponseSchema>
export type ErrorResponse = Static<typeof ErrorResponseSchema>



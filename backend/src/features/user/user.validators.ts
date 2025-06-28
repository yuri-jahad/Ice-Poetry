import {
  CreateUserRequestSchema,
  ErrorResponseSchema,
  CreateUserResponseSchema
} from '@user/user.schemas'

export const createUserValidator = {
  body: CreateUserRequestSchema,
  response: {
    201: CreateUserResponseSchema,
    400: ErrorResponseSchema,
    409: ErrorResponseSchema,
    500: ErrorResponseSchema
  }
}

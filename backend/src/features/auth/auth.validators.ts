import {
  LogoutSuccessSchema,
  LogoutErrorSchema,
  LoginSuccessSchema,
  LoginBodySchema,
  LoginErrorSchema,
  VerifyErrorSchema,
  VerifySuccessSchema,
} from "@auth/auth.schemas";

export const loginValidator = {
  body: LoginBodySchema,
  response: {
    200: LoginSuccessSchema,
    401: LoginErrorSchema,
    500: LoginErrorSchema,
  },
} 
console.log('LoginBodySchema:', LoginBodySchema)
console.log('LoginSuccessSchema:', LoginSuccessSchema)
console.log('LoginErrorSchema:', LoginErrorSchema)

export const verifyValidator = {
  response: { 200: VerifySuccessSchema, 401: VerifyErrorSchema },
} 

export const logoutValidator = {
  response: {
    200: LogoutSuccessSchema,
    404: LogoutErrorSchema,
  },
} 

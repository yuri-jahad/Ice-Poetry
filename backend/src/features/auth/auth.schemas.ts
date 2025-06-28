import { t } from 'elysia'

import { UserClientSchema } from '@user/user.schemas'

/** Login Schemas */
export const LoginSuccessSchema = t.Object({
  success: t.Literal(true),
  user: UserClientSchema
})

export const LoginErrorSchema = t.Object({
  error: t.String()
})

export const LoginBodySchema = t.Object({
  username: t.String({
    minLength: 1,
    maxLength: 50,
    error: 'Username requis (1-50 caractères)'
  }),
  password: t.String({
    minLength: 2,
    maxLength: 100,
    error: 'Password requis (min 2 caractères)'
  })
})

/** Verify Schemas */
export const VerifySuccessSchema = t.Object({
  user: UserClientSchema,
  isAuthenticated: t.Literal(true)
})

export const VerifyErrorSchema = t.Object({
  error: t.String(),
  isAuthenticated: t.Literal(false)
})

/** Logout Schemas */
export const LogoutSuccessSchema = t.Object({
  success: t.Literal(true),
  message: t.String()
})

export const LogoutErrorSchema = t.Object({
  success: t.Literal(false),
  error: t.String()
})



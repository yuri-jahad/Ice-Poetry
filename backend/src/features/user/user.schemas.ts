import { t } from "elysia";

export const UserRolesSchema = t.Union([
  t.Literal("Guest"),
  t.Literal("Moderator"),
  t.Literal("Administrator"),
]);

export const UserClientSchema = t.Object({
  username: t.String(),
  role: UserRolesSchema,
  avatar: t.String(),
  id: t.Integer({ minimum: 1 }),
});

export const CreateUserRequestSchema = t.Object({
  username: t.String({
    minLength: 3,
    maxLength: 50,
    pattern: '^[a-zA-Z0-9_-]+$',
    error:
      'Username must be 3-50 characters, letters/numbers/hyphens/underscores only'
  }),
  password: t.String({
    minLength: 2,
    maxLength: 128,
    error: 'Password must be 2-128 characters'
  }),
  role: t.Union(
    [t.Literal('Guest'), t.Literal('Moderator'), t.Literal('Administrator')],
    {
      error: 'Role must be Guest, Moderator, or Administrator'
    }
  ),
  image_path: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()]))
})

export const CreateUserResponseSchema = t.Object({
  success: t.Literal(true),
  data: t.Object({
    id: t.Number(),
    username: t.String(),
    role: t.Union([
      t.Literal('Guest'),
      t.Literal('Moderator'),
      t.Literal('Administrator')
    ]),
    image_path: t.Union([t.String(), t.Null()])
  }),
  message: t.String()
})

export const ErrorResponseSchema = t.Object({
  error: t.String(),
  message: t.String(),
  code: t.String()
})

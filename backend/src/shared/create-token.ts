import type { UserClient } from '@user/user.types'
import type { JWTPayload } from '@shared/shared.types'

export async function createToken (user: UserClient, jwt: any): Promise<string> {
  const payload: JWTPayload = {
    username: user.username,
    role: user.role,
    avatar: user.avatar,
    id: user.id
  }

  return jwt.sign(payload, {
    exp: '2h'
  })
}

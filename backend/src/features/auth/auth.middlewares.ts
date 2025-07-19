import { getUserById } from '@user/user.repositories'
import { mapToUserClient } from './auth.helpers'

export const authMiddleware = async ({ cookie, jwt }: any) => {
  const authToken = cookie.auth_token.value
  if (!authToken) {
    return { isAuthenticated: false, user: null }
  }

  const tokenPayload = await jwt.verify(authToken)
  if (!tokenPayload) {
    return { isAuthenticated: false, user: null }
  }

  const userFromDb = await getUserById(tokenPayload.id)
  if (!userFromDb) {
    return { isAuthenticated: false, user: null }
  }

  const safeUserData = mapToUserClient(userFromDb)

  return { isAuthenticated: true, user: safeUserData }
}

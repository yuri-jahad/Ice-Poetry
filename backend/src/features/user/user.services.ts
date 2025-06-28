import type { CreateUserRequest } from '@auth/auth.types'
import type { USERS } from '@database/database.types'
import { insertUserFixed } from '@auth/auth.repositories'


export async function createUser (userData: CreateUserRequest): Promise<USERS | null> {
  try {
    const hashedPassword = await Bun.password.hash(userData.password, {
      algorithm: 'bcrypt',
      cost: 12
    })
    const userToInsert: Omit<USERS, 'id'> = {
      username: userData.username,
      password: hashedPassword,
      role: userData.role,
      image_path: userData.image_path || null
    }

    const newUser = await insertUserFixed(userToInsert)
    return newUser
  } catch (error) {
    console.error('Error creating user:', error)
    return null
  }
}

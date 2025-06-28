import type { USERS } from '@database/database.types'
import { db } from '@database/database.config'

/**
 * Version corrigée de insertUser (pour remplacer la tienne)
 */
export async function insertUserFixed(data:any): Promise<USERS | null> {
    try {
      const newUser = await db
        .insertInto('USERS')
        .values(data)
        .returning([
          'id',
          'username',
          'password',
          'role',
          'image_path'
        ])
        .executeTakeFirst()
  
      return newUser || null
    } catch (error) {
      console.error('Error inserting user:', error)
      return null
    }
  }
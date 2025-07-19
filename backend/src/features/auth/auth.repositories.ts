
import { db } from '@database/database.config'
import type { User } from '@user/user.types';


export async function insertUserFixed(data:any): Promise<User | null> {
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
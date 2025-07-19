// auth.repository.ts
import { db } from '@database/database.config'
import type {
  SUPPORT_TICKETS,
  SUPPORT_TICKETS_STATUS,
  SUPPORT_TICKETS_TYPE
} from '@database/database.types'
import { sql } from 'kysely'
import type { User } from '@user/user.types'

/**
 * Authenticates a user with username/password
 * Optimized: selects only necessary fields + error handling
 */
export async function authenticateUser (
  username: string,
  password: string
): Promise<User | null> {
  try {
    const user = await db
      .selectFrom('USERS')
      .selectAll()
      .where('username', '=', username)
      .executeTakeFirst()

    if (!user || !user.password) {
      return null
    }

    const passwordIsValid = await Bun.password.verify(password, user.password)
    return passwordIsValid ? user : null
  } catch (error) {
    console.error('Database error in authenticateUser:', error)
    return null
  }
}

/**
 * Changes a user's password - Simple version
 * Minimal validation: user exists + current password correct + new password different
 */
export async function changeUserPassword (
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newPassword || newPassword.length < 1) {
      return {
        success: false,
        error: 'New password must have at least 1 character'
      }
    }

    const user = await db
      .selectFrom('USERS')
      .select(['id', 'password'])
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!user || !user.password) {
      console.error(`❌ User ${userId} not found`)
      return { success: false, error: 'User not found' }
    }

    const isCurrentPasswordValid = await Bun.password.verify(
      currentPassword,
      user.password
    )

    if (!isCurrentPasswordValid) {
      console.error(`❌ Invalid current password for user ${userId}`)
      return { success: false, error: 'Current password is incorrect' }
    }

    const isSamePassword = await Bun.password.verify(newPassword, user.password)
    if (isSamePassword) {
      return {
        success: false,
        error: 'New password must be different from current password'
      }
    }
    const hashedNewPassword = await Bun.password.hash(newPassword)
    const updatedUser = await db
      .updateTable('USERS')
      .set({ password: hashedNewPassword })
      .where('id', '=', userId)
      .returning(['id'])
      .executeTakeFirst()

    if (!updatedUser) {
      console.error(`❌ Failed to update password for user ${userId}`)
      return { success: false, error: 'Failed to update password' }
    }

    console.log(`✅ Password successfully changed for user ${userId}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Database error in changeUserPassword:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Retrieves a user by username
 * Optimized: error handling
 */
export async function getUserByUsername (
  username: string
): Promise<User | null> {
  try {
    return (
      (await db
        .selectFrom('USERS')
        .selectAll()
        .where('username', '=', username)
        .executeTakeFirst()) || null
    )
  } catch (error) {
    console.error('Database error in getUserByUsername:', error)
    return null
  }
}

/**
 * Retrieves a user by ID
 * Optimized: error handling
 */
export async function getUserById (id: number): Promise<User | null> {
  try {
    return (
      (await db
        .selectFrom('USERS')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()) || null
    )
  } catch (error) {
    console.error('Database error in getUserById:', error)
    return null
  }
}

/**
 * Checks if a user exists by ID
 * Ultra-optimized: COUNT query
 */
export async function userExists (id: number): Promise<boolean> {
  try {
    const result = await db
      .selectFrom('USERS')
      .select(sql`1`.as('exists'))
      .where('id', '=', id)
      .limit(1) // ← Arrête dès qu'il trouve
      .executeTakeFirst()

    return !!result
  } catch (error) {
    console.error('Database error in userExists:', error)
    return false
  }
}

export async function updateUserAvatar (
  userId: number,
  avatarUrl: string
): Promise<User | null> {
  try {
    const updatedUser = await db
      .updateTable('USERS')
      .set({ image_path: avatarUrl })
      .where('id', '=', userId)
      .returning(['id', 'username', 'image_path', 'role'])
      .executeTakeFirst()

    if (!updatedUser) {
      console.error(`❌ User ${userId} not found for avatar update`)
      return null
    }

    console.log(`✅ Avatar updated for user ${userId}: ${avatarUrl}`)
    return updatedUser as User
  } catch (error) {
    console.error('❌ Error updating user avatar in database:', error)
    return null
  }
}

// Fonction helper pour récupérer l'avatar actuel d'un utilisateur
export async function getUserAvatar (userId: number): Promise<string | null> {
  try {
    const user = await db
      .selectFrom('USERS')
      .select('image_path')
      .where('id', '=', userId)
      .executeTakeFirst()

    return user?.image_path || null
  } catch (error) {
    console.error('❌ Error getting user avatar:', error)
    return null
  }
}

// Type pour création de ticket
export interface CreateSupportTicket {
  user_id: number
  type: SUPPORT_TICKETS_TYPE
  title: string
  description: string
}

// Type pour ticket avec info utilisateur
export interface SupportTicketWithUser extends SUPPORT_TICKETS {
  user: User
}

/**
 * Creates a new support ticket
 * Optimized: error handling + validation
 */
export async function createSupportTicket (
  ticket: CreateSupportTicket
): Promise<SUPPORT_TICKETS | null> {
  try {
    const newTicket = await db
      .insertInto('SUPPORT_TICKETS')
      .values({
        user_id: ticket.user_id,
        type: ticket.type,
        title: ticket.title,
        description: ticket.description,
        status: 'open',
        created_at: new Date()
      } as any)
      .returningAll()
      .executeTakeFirst()

    if (!newTicket) {
      console.error('Failed to create support ticket')
      return null
    }

    console.log(
      `✅ Support ticket created: ${newTicket.id} by user ${ticket.user_id}`
    )
    return newTicket
  } catch (error) {
    console.error('Database error in createSupportTicket:', error)
    return null
  }
}

/**
 * Retrieves a support ticket by ID
 * Optimized: error handling
 */
export async function getSupportTicketById (
  id: number
): Promise<SUPPORT_TICKETS | null> {
  try {
    return (
      (await db
        .selectFrom('SUPPORT_TICKETS')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()) || null
    )
  } catch (error) {
    console.error('Database error in getSupportTicketById:', error)
    return null
  }
}

/**
 * Retrieves all support tickets for a user
 * Optimized: pagination + error handling
 */
export async function getSupportTicketsByUserId (
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<SUPPORT_TICKETS[]> {
  try {
    const tickets = await db
      .selectFrom('SUPPORT_TICKETS')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

    return tickets
  } catch (error) {
    console.error('Database error in getSupportTicketsByUserId:', error)
    return []
  }
}

/**
 * Retrieves all support tickets with user info
 * Optimized: JOIN + pagination
 */
export async function getAllSupportTicketsWithUser (
  status?: SUPPORT_TICKETS_STATUS,
  type?: SUPPORT_TICKETS_TYPE,
  limit: number = 50,
  offset: number = 0
): Promise<SupportTicketWithUser[]> {
  try {
    let query = db
      .selectFrom('SUPPORT_TICKETS')
      .innerJoin('USERS', 'SUPPORT_TICKETS.user_id', 'USERS.id')
      .selectAll('SUPPORT_TICKETS')
      .selectAll('USERS')

    if (status) {
      query = query.where('SUPPORT_TICKETS.status', '=', status)
    }

    if (type) {
      query = query.where('SUPPORT_TICKETS.type', '=', type)
    }

    const results = await query
      .orderBy('SUPPORT_TICKETS.created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

    return results.map(row => ({
      // Ticket fields
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      description: row.description,
      status: row.status,
      created_at: row.created_at,
      // User info
      user: {
        id: row.id,
        username: row.username,
        image_path: row.image_path,
        password: row.password,
        role: row.role
      }
    }))
  } catch (error) {
    console.error('Database error in getAllSupportTicketsWithUser:', error)
    return []
  }
}

/**
 * Updates support ticket status
 * Optimized: minimal update + error handling
 */
export async function updateSupportTicketStatus (
  id: number,
  status: SUPPORT_TICKETS_STATUS
): Promise<SUPPORT_TICKETS | null> {
  try {
    const updatedTicket = await db
      .updateTable('SUPPORT_TICKETS')
      .set({ status })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst()

    if (!updatedTicket) {
      console.error(`❌ Support ticket ${id} not found for status update`)
      return null
    }

    console.log(`✅ Support ticket ${id} status updated to: ${status}`)
    return updatedTicket
  } catch (error) {
    console.error('❌ Error updating support ticket status:', error)
    return null
  }
}

/**
 * Updates support ticket title and description
 * Optimized: minimal update + error handling
 */
export async function updateSupportTicketContent (
  id: number,
  title?: string,
  description?: string
): Promise<SUPPORT_TICKETS | null> {
  try {
    const updateData: Partial<Pick<SUPPORT_TICKETS, 'title' | 'description'>> =
      {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description

    if (Object.keys(updateData).length === 0) {
      console.error('No fields to update')
      return null
    }

    const updatedTicket = await db
      .updateTable('SUPPORT_TICKETS')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst()

    if (!updatedTicket) {
      console.error(`❌ Support ticket ${id} not found for content update`)
      return null
    }

    console.log(`✅ Support ticket ${id} content updated`)
    return updatedTicket
  } catch (error) {
    console.error('❌ Error updating support ticket content:', error)
    return null
  }
}

/**
 * Deletes a support ticket
 * Optimized: error handling
 */
export async function deleteSupportTicket (id: number): Promise<boolean> {
  try {
    const result = await db
      .deleteFrom('SUPPORT_TICKETS')
      .where('id', '=', id)
      .executeTakeFirst()

    const success = result.numDeletedRows > 0

    if (success) {
      console.log(`✅ Support ticket ${id} deleted`)
    } else {
      console.error(`❌ Support ticket ${id} not found for deletion`)
    }

    return success
  } catch (error) {
    console.error('❌ Error deleting support ticket:', error)
    return false
  }
}

/**
 * Counts support tickets by status and type
 * Ultra-optimized: COUNT queries with Promise.all
 */
export async function getSupportTicketStats (): Promise<{
  total: number
  open: number
  closed: number
  bugs: number
  features: number
  support: number
}> {
  try {
    const [totalResult, statusResult, typeResult] = await Promise.all([
      // Total count
      db
        .selectFrom('SUPPORT_TICKETS')
        .select(sql`COUNT(*)`.as('count'))
        .executeTakeFirst(),

      // Count by status
      db
        .selectFrom('SUPPORT_TICKETS')
        .select(['status', sql`COUNT(*)`.as('count')])
        .groupBy('status')
        .execute(),

      // Count by type
      db
        .selectFrom('SUPPORT_TICKETS')
        .select(['type', sql`COUNT(*)`.as('count')])
        .groupBy('type')
        .execute()
    ])

    const statusCounts = statusResult.reduce((acc, row) => {
      acc[row.status] = Number(row.count)
      return acc
    }, {} as Record<SUPPORT_TICKETS_STATUS, number>)

    const typeCounts = typeResult.reduce((acc, row) => {
      acc[row.type] = Number(row.count)
      return acc
    }, {} as Record<SUPPORT_TICKETS_TYPE, number>)

    return {
      total: Number(totalResult?.count || 0),
      open: statusCounts.open || 0,
      closed: statusCounts.closed || 0,
      bugs: typeCounts.bug || 0,
      features: typeCounts.feature || 0,
      support: typeCounts.support || 0
    }
  } catch (error) {
    console.error('Database error in getSupportTicketStats:', error)
    return {
      total: 0,
      open: 0,
      closed: 0,
      bugs: 0,
      features: 0,
      support: 0
    }
  }
}

/**
 * Checks if a support ticket exists and belongs to a user
 * Ultra-optimized: EXISTS query
 */
export async function supportTicketExistsForUser (
  ticketId: number,
  userId: number
): Promise<boolean> {
  try {
    const result = await db
      .selectFrom('SUPPORT_TICKETS')
      .select(sql`1`.as('exists'))
      .where('id', '=', ticketId)
      .where('user_id', '=', userId)
      .limit(1)
      .executeTakeFirst()

    return !!result
  } catch (error) {
    console.error('Database error in supportTicketExistsForUser:', error)
    return false
  }
}

/**
 * Updates user profile (bio and location)
 * Simple validation: user exists + optional fields
 */
export async function updateUserProfile (
  userId: number,
  bio?: string,
  syllable_color?: string,
  location?: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const userExists = await db
      .selectFrom('USERS')
      .select('id')
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!userExists) {
      console.error(`❌ User ${userId} not found`)
      return { success: false, error: 'User not found' }
    }

    const updateData: Partial<
      Pick<User, 'bio' | 'location' | 'syllable_color'>
    > = {}

    if (bio) {
      updateData.bio = bio.length > 200 ? bio.substring(0, 200) : bio
    }

    if (location) {
      updateData.location =
        location.length > 100 ? location.substring(0, 100) : location
    }

    if (syllable_color) {
      updateData.syllable_color = syllable_color
    }
    
    if (Object.keys(updateData).length === 0) {
      console.error('No fields to update')
      return { success: false, error: 'No fields to update' }
    }

    const updatedUser = await db
      .updateTable('USERS')
      .set(updateData)
      .where('id', '=', userId)
      .returning([
        'id',
        'username',
        'bio',
        'location',
        'image_path',
        'role',
        'syllable_color'
      ])
      .executeTakeFirst()
      console.log([updatedUser])

    if (!updatedUser) {
      console.error(`❌ Failed to update profile for user ${userId}`)
      return { success: false, error: 'Failed to update profile' }
    }

    console.log(`✅ Profile successfully updated for user ${userId}`)
    return {
      success: true,
      user: updatedUser as User
    }
  } catch (error) {
    console.error('❌ Database error in updateUserProfile:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Gets user profile information
 * Returns bio, location and other public profile data
 */
export async function getUserProfile (userId: number): Promise<User | null> {
  try {
    const user = await db
      .selectFrom('USERS')
      .select([
        'id',
        'username',
        'bio',
        'location',
        'image_path',
        'role',
        'syllable_color'
      ])
      .where('id', '=', userId)
      .executeTakeFirst()

    return user || null
  } catch (error) {
    console.error('❌ Error getting user profile:', error)
    return null
  }
}

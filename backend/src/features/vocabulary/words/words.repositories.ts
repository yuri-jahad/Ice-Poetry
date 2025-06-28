import { db } from '@database/database.config'
import { createTagFlags } from '@words/words.helpers'
import { sql } from 'kysely'
import {
  addWordToCache,
} from '@lists/lists.services'

/**
 * Retrieves existing words from a list of word names
 */
export async function getExistingWords (wordNames: string[]): Promise<string[]> {
  try {
    if (wordNames.length === 0) return []

    const results = await db
      .selectFrom('WORDS')
      .select('word')
      .where('word', 'in', wordNames)
      .execute()

    return results.map(row => row.word)
  } catch (error) {
    console.error('Database error in getExistingWords:', error)
    return []
  }
}

/**
 * Inserts multiple words into database
 */
export async function insertWords (
  wordsData: Array<{
    name: string
    tags: string[]
    creator_id: number
  }>
): Promise<{ insertedCount: number; insertedIds: number[] }> {
  try {
    const userInfo = await db
      .selectFrom('USERS')
      .select(['username', 'role', 'image_path'])
      .where('id', '=', wordsData[0].creator_id)
      .executeTakeFirstOrThrow()

    const insertPromises = wordsData.map(async ({ name, tags, creator_id }) => {
      const tagFlags = createTagFlags(tags)

      const result = await db
        .insertInto('WORDS')
        .values({
          word: name,
          ...tagFlags,
          creator_id
        } as any)
        .returning(['id', 'word', 'created_at'])
        .executeTakeFirstOrThrow()

      addWordToCache({
        ...result,
        creator_id,
        tags,
        username: userInfo.username,
        role: userInfo.role,
        image_path: userInfo.image_path || ''
      })

      return result
    })

    const results = await Promise.all(insertPromises)
    return {
      insertedCount: results.length,
      insertedIds: results.map(r => r.id)
    }
  } catch (error) {
    console.error('Database error in insertWords:', error)
    throw error
  }
}

export async function wordExists (wordId: number): Promise<boolean> {
  try {
    const result = await db
      .selectFrom('WORDS')
      .select(sql<boolean>`COUNT(*) > 0`.as('exists'))
      .where('id', '=', wordId)
      .executeTakeFirstOrThrow()

    return result.exists
  } catch (error) {
    console.error('Database error in wordExists:', error)
    return false
  }
}

export async function updateWord (
  tagFlags: object,
  wordId: number
): Promise<boolean> {
  try {
    const wordPresent = await wordExists(wordId)

    if (!wordPresent) {
      console.warn(`Word with id ${wordId} does not exist`)
      return false
    }

    const result = await db
      .updateTable('WORDS')
      .set(tagFlags)
      .where('WORDS.id', '=', wordId)
      .execute()

    return result.length > 0 && result[0].numUpdatedRows > 0
  } catch (error) {
    console.error('Database error in updateWord:', error)
    return false
  }
}

export async function countWordsByPattern (
  searchTerm: string
): Promise<number | null> {
  try {
    const likePattern = `%${searchTerm}%`

    const result = await db
      .selectFrom('WORDS')
      .select(sql<number>`COUNT(1)`.as('total'))
      .where('WORDS.word', 'like', likePattern)
      .executeTakeFirst()

    return result?.total || 0
  } catch (error) {
    console.error('Database error in countWordsByPattern:', error)
    return null
  }
}

// repositories/words.repositories.ts
export const deleteWordById = async (
  id: number
): Promise<{
  success: boolean
  deletedCount: number
}> => {
  try {
    const result = await db
      .deleteFrom('WORDS')
      .where('WORDS.id', '=', id)
      .execute()

    const deletedCount = Number(result[0]?.numDeletedRows || 0)

    return {
      success: deletedCount > 0,
      deletedCount
    }
  } catch (error) {
    console.error('Error deleting word:', error)
    throw new Error('Failed to delete word')
  }
}


export async function searchWordsByPattern (
  searchTerm: string,
  limit: number = 10
) {
  try {
    const likePattern = `%${searchTerm}%`
    const exactTerm = searchTerm.toLowerCase()
    const prefixPattern = `${searchTerm}%`
    const suffixPattern = `%${searchTerm}`

    const dataResult = await db
      .selectFrom('WORDS')
      .innerJoin('USERS', 'WORDS.creator_id', 'USERS.id')
      .select([
        'WORDS.id',
        'WORDS.created_at',
        'WORDS.word',
        'WORDS.creator_id',
        'USERS.username',
        'USERS.image_path',
        'WORDS.is_adverb',
        'WORDS.is_demonym',
        'WORDS.is_animal',
        'WORDS.is_verb'
      ] as any)
      .where('WORDS.word', 'like', likePattern)
      .orderBy(
        sql`CASE 
          WHEN LOWER("WORDS"."word") = ${exactTerm} THEN 1
          WHEN "WORDS"."word" ILIKE ${prefixPattern} THEN 2  
          WHEN "WORDS"."word" ILIKE ${suffixPattern} THEN 3
          ELSE 4
        END`
      )
      .orderBy(sql`LENGTH("WORDS"."word")`)
      .orderBy('WORDS.word')
      .limit(limit)
      .execute()

    return dataResult
  } catch (error) {
    console.error('Database error in searchWordsByPattern:', error)
    return null
  }
}

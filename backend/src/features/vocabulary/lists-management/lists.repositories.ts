import { db } from '@database/database.config'
import { sql } from 'kysely'

export async function loadDictionary () {
  try {
    const response = await db
      .selectFrom('WORDS')
      .innerJoin('USERS', 'USERS.id', 'WORDS.creator_id')
      .select([
        'WORDS.id',
        'WORDS.word',
        'WORDS.is_adverb',
        'WORDS.is_demonym',
        'WORDS.is_animal',
        'WORDS.is_verb',
        'WORDS.creator_id',
        'WORDS.created_at',
        'USERS.id as user_id',
        'USERS.image_path',
        'USERS.role',
        'USERS.username'
      ])
      .execute()

    console.log('Dictionary loaded')
    return response
  } catch (e) {
    console.error('Error Dictionary not loading', e)
    return null
  }
}

export async function loadAllListsDetails () {
  try {
    // 1. Une seule requête pour récupérer les colonnes + le premier sample
    const sampleRow = await db
      .selectFrom('WORDS')
      .selectAll()
      .limit(1)
      .executeTakeFirst()

    if (!sampleRow) return { listNames: [], counts: {} }

    const listNames = Object.keys(sampleRow).filter(
      col => col.startsWith('is_') || col === 'word'
    )
    const result = await db
      .selectFrom('WORDS')
      .select([
        sql<number>`COUNT(*)`.as('word_count'),
        ...listNames
          .filter(name => name !== 'word')
          .map(name =>
            sql<number>`SUM(CASE WHEN ${sql.ref(
              name
            )} = 1 THEN 1 ELSE 0 END)`.as(`${name}_count`)
          )
      ])
      .executeTakeFirst()

    // 4. Transformer en format attendu
    const counts = {
      word: result?.word_count || 0,
      ...Object.fromEntries(
        listNames
          .filter(name => name !== 'word')
          .map(name => [name, result?.[`${name}_count`] || 0])
      )
    }

    return {
      listNames,
      counts
    }
  } catch (error) {
    console.error('Erreur lors de getCountLists:', error)
    return { listNames: [], counts: {} }
  }
}

export type Dictionary = NonNullable<Awaited<ReturnType<typeof loadDictionary>>>
export type DictionaryWord = Dictionary[0]
export type ListNames = NonNullable<Awaited<ReturnType<typeof loadAllListsDetails>>>

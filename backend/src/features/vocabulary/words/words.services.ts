import type {
  WordDetails,
 AddWordsService
} from '@words/words.types'
import { userExists } from '@user/user.repositories'
import {
  getExistingWords,
  insertWords,
  updateWord
} from '@words/words.repositories'
import { processWords, filterNewWords, createTagFlags } from '@words/words.helpers'
import {
  getCachedData,
  searchWordObjects,
  updateWordToCache
} from '@lists/lists.services'
import type {
  SearchResult,
  SearchParams
} from '@lists/lists.services'
import { db } from '@database/database.config' // ← Import manquant

// Helper function pour extraire le message d'erreur
function getErrorMessage (error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

// Helper function pour extraire le code d'erreur
function getErrorCode (error: unknown): string | undefined {
  if (error instanceof Error && 'code' in error) {
    return (error as any).code
  }
  return undefined
}

export async function addWordsService (
  wordsDetails: WordDetails[],
  creator_id: number
): Promise<AddWordsService> {
  try {
    console.log('Adding words:', { wordsDetails, creator_id })

    const userFound = await userExists(creator_id)
    if (!userFound) {
      return {
        success: false,
        message: 'User not found',
        words: [],
        inserted: 0,
        skipped: 0
      }
    }

    const validWordsMap = processWords(wordsDetails)
    if (!validWordsMap.size) {
      return {
        success: false,
        message: 'No valid words provided',
        words: [],
        inserted: 0,
        skipped: 0
      }
    }

    const wordNames = Array.from(validWordsMap.keys())
    const existingWords = await getExistingWords(wordNames)
    const newWordsEntries = filterNewWords(validWordsMap, existingWords)

    if (!newWordsEntries.length) {
      return {
        success: true,
        message: 'All words already exist',
        words: [],
        inserted: 0,
        skipped: validWordsMap.size
      }
    }

    const wordsToInsert = newWordsEntries.map(([name, tags]) => ({
      name,
      tags,
      creator_id
    }))

    const totalInserted:any = await insertWords(wordsToInsert)

    console.log(`✅ Successfully added ${newWordsEntries.length} words`)

    return {
      success: true,
      message: `${newWordsEntries.length} word(s) added successfully`,
      words: newWordsEntries.map(([name, tags]) => ({ name, tags })),
      inserted: newWordsEntries.length,
      skipped: validWordsMap.size - newWordsEntries.length,
      totalInsertedRows: totalInserted
    }
  } catch (error) {
    console.error('❌ Error adding words:', error)

    const errorMessage = getErrorMessage(error)
    const errorCode = getErrorCode(error)

    if (errorMessage.includes('duplicate') || errorCode === 'ER_DUP_ENTRY') {
      return {
        success: false,
        message: 'Some words already exist',
        words: [],
        inserted: 0,
        skipped: 0
      }
    }

    return {
      success: false,
      message: 'Server error while adding words',
      words: [],
      inserted: 0,
      skipped: 0
    }
  }
}

export async function updateWordService (
  wordWithTags: { tags: string[]; name: string },
  id: number
): Promise<{
  message: string
  wordWithTags: { tags: string[]; name: string }
}> {
  try {
    if (!wordWithTags.tags || !wordWithTags.name || !id) {
      throw new Error('Required fields missing')
    }

    const tagFlags = createTagFlags(wordWithTags.tags)
    const updateData = {
      word: wordWithTags.name,
      ...tagFlags
    }

    const success = await updateWord(updateData, id)
    updateWordToCache(tagFlags, updateData.word, id)

    if (!success) {
      throw new Error('Word not found')
    }

    console.log(`✅ Successfully updated word ${id}`)

    return {
      message: 'Word updated successfully',
      wordWithTags
    }
  } catch (error) {
    console.error('❌ Error updating word:', error)
    const errorMessage = getErrorMessage(error)
    throw new Error(errorMessage)
  }
}

export async function deleteWordService (wordId: number): Promise<{
  success: boolean
  data?: { id: number; message: string }
  error?: string
}> {
  try {
    if (!wordId || typeof wordId !== 'number') {
      return {
        success: false,
        error: 'Invalid word ID'
      }
    }

    const result = await db
      .deleteFrom('WORDS')
      .where('WORDS.id', '=', wordId)
      .execute()

    const rowsDeleted = Number(result[0].numDeletedRows)

    if (rowsDeleted === 0) {
      return {
        success: false,
        error: 'Word not found'
      }
    }

    // Remove from cache after successful DB deletion

    console.log(`✅ Successfully deleted word ${wordId}`)

    return {
      success: true,
      data: {
        id: wordId,
        message: 'Word deleted successfully'
      }
    }
  } catch (error) {
    console.error('❌ Error in deleteWordService:', error)

    const errorMessage = getErrorMessage(error)

    if (errorMessage.includes('constraint')) {
      return { success: false, error: 'Cannot delete word with dependencies' }
    }

    if (errorMessage.includes('connection')) {
      return { success: false, error: 'Database connection error' }
    }

    return { success: false, error: 'Internal server error' }
  }
}

export function removeWordFromCache (wordId: number): boolean {
  const { dictionary } = getCachedData()
  if (!dictionary) return false

  const index = dictionary.findIndex(word => word.id === wordId)

  console.log(index, "MOTS TROUVEEEEEEEEEEEEE", {wordId})
  if (index !== -1) {
    dictionary.splice(index, 1)
    console.log(`✅ Removed word ${wordId} from cache`)
    return true
  }

  console.log(`⚠️ Word ${wordId} not found in cache`)
  return false
}

export async function searchWordsWithUsersService (
  searchParams: SearchParams
): Promise<{
  success: boolean
  data?: SearchResult
  error?: string
}> {
  try {
    // Validation
    if (!searchParams || !searchParams.pattern) {
      return {
        success: false,
        error: 'Invalid search parameters'
      }
    }

    const result = searchWordObjects(searchParams)

    if (!result || !result.data) {
      return {
        success: false,
        error: 'Search operation failed'
      }
    }

    console.log(
      `✅ Found ${result.total} results for "${searchParams.pattern}"`
    )

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('❌ Error in searchWordsService:', error)

    const errorMessage = getErrorMessage(error)

    if (errorMessage.includes('Invalid')) {
      return { success: false, error: 'Invalid search parameters' }
    }

    if (errorMessage.includes('timeout')) {
      return { success: false, error: 'Search timeout' }
    }

    return { success: false, error: 'Internal server error' }
  }
}

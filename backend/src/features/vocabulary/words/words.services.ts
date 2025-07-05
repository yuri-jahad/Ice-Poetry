import type { WordDetails, AddWordsService } from '@words/words.types'
import { userExists } from '@user/user.repositories'
import {
  getExistingWords,
  insertWords,
  updateWord
} from '@words/words.repositories'
import {
  processWords,
  filterNewWords,
  createTagFlags
} from '@words/words.helpers'
import {
  getCachedData,
  searchWordObjects,
  updateWordToCache
} from '@lists/lists.services'
import type { SearchResult, SearchParams } from '@lists/lists.services'
import { db } from '@database/database.config' // ← Import manquant
import { insertUserFixed } from '@auth/auth.repositories'

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



export interface TotalInsertedRows {
  insertedCount: number
  insertedIds: number[]
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
        message: 'Utilisateur non trouvé',
        words: [],
        inserted: 0,
        skipped: 0
      }
    }

    const validWordsMap = processWords(wordsDetails)
    if (!validWordsMap.size) {
      return {
        success: false,
        message: 'Aucun mot valide fourni',
        words: [],
        inserted: 0,
        skipped: 0
      }
    }

    const wordNames = Array.from(validWordsMap.keys())
    const existingWords = await getExistingWords(wordNames)
    const newWordsEntries = filterNewWords(validWordsMap, existingWords)
    const skippedCount = validWordsMap.size - newWordsEntries.length

    // Cas où tous les mots existent déjà
    if (!newWordsEntries.length) {
      const allWordsNames = Array.from(validWordsMap.keys())
      const skippedList =
        allWordsNames.length <= 3
          ? allWordsNames.join(', ')
          : `${allWordsNames.slice(0, 3).join(', ')} et ${
              allWordsNames.length - 3
            } autre${allWordsNames.length - 3 > 1 ? 's' : ''}`

      return {
        success: true,
        message: `Tous les mots existent déjà (${validWordsMap.size} mot${
          validWordsMap.size > 1 ? 's' : ''
        })`,
        detailedMessage: `⚠️ Mots ignorés (déjà existants) : ${skippedList}`,
        words: [],
        inserted: 0,
        skipped: validWordsMap.size,
        addedWords: [],
        skippedWords: allWordsNames
      }
    }

    const wordsToInsert = newWordsEntries.map(([name, tags]) => ({
      name,
      tags,
      creator_id
    }))

    const totalInserted: TotalInsertedRows = await insertWords(wordsToInsert)
    console.log(totalInserted, 'total')

    console.log(`✅ Successfully added ${newWordsEntries.length} words`)

    // Construire les messages détaillés
    const addedWords = newWordsEntries.map(([name]) => name)
    const skippedWords = wordNames.filter(name => !addedWords.includes(name))

    // Message détaillé avec listes
    let detailedMessage = ''

    if (addedWords.length > 0) {
      const addedList =
        addedWords.length <= 5
          ? addedWords.join(', ')
          : `${addedWords.slice(0, 5).join(', ')} et ${
              addedWords.length - 5
            } autre${addedWords.length - 5 > 1 ? 's' : ''}`

      detailedMessage += `✅ Mots ajoutés : ${addedList}`
    }

    if (skippedCount > 0) {
      const skippedList =
        skippedWords.length <= 3
          ? skippedWords.join(', ')
          : `${skippedWords.slice(0, 3).join(', ')} et ${
              skippedWords.length - 3
            } autre${skippedWords.length - 3 > 1 ? 's' : ''}`

      if (detailedMessage) detailedMessage += '\n'
      detailedMessage += `⚠️ Mots ignorés (déjà existants) : ${skippedList}`
    }

    // Message de synthèse pour l'UI
    const summaryMessage =
      addedWords.length === 1
        ? '1 mot ajouté avec succès'
        : `${addedWords.length} mots ajoutés avec succès`

    const finalMessage =
      skippedCount > 0
        ? `${summaryMessage} • ${skippedCount} mot${
            skippedCount > 1 ? 's' : ''
          } ignoré${skippedCount > 1 ? 's' : ''}`
        : summaryMessage

    return {
      success: true,
      message: finalMessage,
      detailedMessage: detailedMessage,
      words: newWordsEntries.map(([name, tags]) => ({ name, tags })),
      inserted: newWordsEntries.length,
      skipped: skippedCount,
      totalInsertedRows: totalInserted,
      addedWords: addedWords,
      skippedWords: skippedWords
    }
  } catch (error) {
    console.error('❌ Error adding words:', error)

    const errorMessage = getErrorMessage(error)
    const errorCode = getErrorCode(error)

    if (errorMessage.includes('duplicate') || errorCode === 'ER_DUP_ENTRY') {
      return {
        success: false,
        message: 'Certains mots existent déjà',
        detailedMessage:
          '❌ Erreur : Mots en doublon détectés dans la base de données',
        words: [],
        inserted: 0,
        skipped: 0,
        addedWords: [],
        skippedWords: []
      }
    }

    return {
      success: false,
      message: "Erreur serveur lors de l'ajout des mots",
      detailedMessage: `❌ Erreur technique : ${
        errorMessage || 'Erreur inconnue'
      }`,
      words: [],
      inserted: 0,
      skipped: 0,
      addedWords: [],
      skippedWords: []
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

  console.log(index, 'MOTS TROUVEEEEEEEEEEEEE', { wordId })
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

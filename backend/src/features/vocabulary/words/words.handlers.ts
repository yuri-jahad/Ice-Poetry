import { db } from '@database/database.config'
import { addWordsService, updateWordService } from '@words/words.services'
import { mapWordErrorToStatus } from '@words/words.helpers'
import {
  searchWordObjects,
  searchWords,
  type SearchParams
} from '@lists/lists.services'
import { testPerformance } from '@/shared/shared.helpers'
import type {
  UpdateWordBody,
  AddWordsBody, 
  FindWordListBody,
  DeleteWordResponse,
  UpdateWordParams,
  DeleteWordParams,
  FindWordResponse,
  AddWordsResponse,
  UpdateWordResponse
} from '@words/words.types'

export function findWords ({ set, body }: any): FindWordResponse {
  try {
    const searchParams: SearchParams = body.searchParams
    const result = searchWords(searchParams)

    if (result.total) {
      set.status = 200
      return {
        success: true as const,
        data: result.data,
        pattern: searchParams.pattern,
        listname: searchParams.listname,
        total: result.total,
        hasMore: result.hasMore,
        timestamp: new Date().toISOString()
      }
    } else {
      set.status = 200
      return {
        success: true as const,
        data: [`No words found.`],
        pattern: searchParams.pattern,
        hasMore: 0,
        listname: searchParams.listname,
        total: result?.total || 0,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    console.log(`💥 Handler errored at: ${performance.now()}`)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Error in findWordsHandler:', errorMessage)
    set.status = mapWordErrorToStatus('Internal server error')
    return {
      error: 'Server error',
      timestamp: new Date().toISOString()
    }
  }
}

export async function addWords ({
  body,
  set
}: {
  body: AddWordsBody
  set: any
}): Promise<AddWordsResponse> {
  try {
    const { wordsDetails, creator_id } = body
    const result = await addWordsService(wordsDetails, creator_id)

    if (result.success) {
      set.status = mapWordErrorToStatus(result.message)
      return {
        error: result.message,
        timestamp: new Date().toISOString()
      }
    }

    set.status = 201
    return {
      success: true as const,
      message: 'Words added successfully',
      data: result,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Error in addWords:', errorMessage)
    set.status = mapWordErrorToStatus('Server error while adding words')
    return {
      error: 'Server error while adding words',
      timestamp: new Date().toISOString()
    }
  }
}

export async function updateWord ({
  params,
  body,
  set
}: {
  params: UpdateWordParams
  body: UpdateWordBody
  set: any
}): Promise<UpdateWordResponse> {
  try {
    const id = parseInt(params.id)
    const { wordWithTags } = body

    const result = await updateWordService(wordWithTags, id)
    set.status = 200
    return {
      success: true as const,
      message: result.message,
      wordWithTags: result.wordWithTags,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Error in updateWord:', errorMessage)
    set.status = mapWordErrorToStatus(errorMessage)
    return {
      error: errorMessage,
      timestamp: new Date().toISOString()
    }
  }
}

export async function findWordList ({
  body,
  set
}: {
  body: FindWordListBody
  set: any
}): Promise<FindWordResponse> {
  try {
    const searchParams: SearchParams = {
      pattern: body.pattern,
      listname: body.listname || ''
    }

    if (!searchParams || !searchParams.pattern) {
      const errorMessage = 'Invalid search parameters'
      set.status = mapWordErrorToStatus(errorMessage)
      return {
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    }

    const result = searchWordObjects(searchParams)

    // Result validation
    if (!result || !result.data) {
      const errorMessage = 'Search operation failed'
      set.status = mapWordErrorToStatus(errorMessage)
      return {
        error: 'Internal error during search',
        timestamp: new Date().toISOString()
      }
    }

    // Log results
    console.log(
      `✅ Found ${result.total} results for "${searchParams.pattern}"`
    )

    // Success response
    set.status = 200
    return {
      success: true as const,
      listname: searchParams.listname,
      pattern: searchParams.pattern,
      data: result.data,
      total: result.total,
      hasMore: result.hasMore,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Error in getWordList:', errorMessage)

    const mappedError = errorMessage.includes('timeout')
      ? 'Search timeout'
      : 'Internal server error'

    set.status = mapWordErrorToStatus(mappedError)
    return {
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }
  }
}

export async function deleteWord ({
  params,
  set
}: {
  params: DeleteWordParams
  set: any
}): Promise<DeleteWordResponse> {
  try {
    const id = parseInt(params.wordId)

    if (!id || typeof id !== 'number') {
      const errorMessage = 'Invalid word ID'
      set.status = mapWordErrorToStatus(errorMessage)
      return {
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    }

    const result = await db
      .deleteFrom('WORDS')
      .where('WORDS.id', '=', id)
      .execute()

    const rowsDeleted = Number(result[0].numDeletedRows)

    if (rowsDeleted === 0) {
      const errorMessage = 'Word not found'
      set.status = mapWordErrorToStatus(errorMessage)
      return {
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    }

    console.log(`✅ Word ${id} deleted successfully`)
    set.status = 200
    return {
      success: true as const,
      message: 'Word deleted successfully',
      wordId: id,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ Error in deleteWord:', errorMessage)

    const mappedError = errorMessage.includes('constraint')
      ? 'Cannot delete word with dependencies'
      : 'Internal server error'

    set.status = mapWordErrorToStatus(mappedError)
    return {
      error: mappedError,
      timestamp: new Date().toISOString()
    }
  }
}

import {
  getDefinitionsOptimized,
  getDefinitionsByNameAndSource,
  getDefinitionsBySpecificSource,
  getDefinitionsByNameOptimized
} from '@definitions/definitions.services'
import type {
  DefinitionResponse,
  SpecificSourceResponse,
} from '@definitions/definitions.types'

/**
 * GET /api/definitions/word/:wordId
 */
export const getDefinitionsByIdHandler = async ({
  params,
  set
}: any): Promise<DefinitionResponse> => {
  try {
    const wordId = params.wordId
    const result = await getDefinitionsOptimized(Number(wordId))

    if (!result) {
      set.status = 404
      return {
        error: 'Word not found',
        message: `No word found with ID ${wordId}`,
        code: 'WORD_NOT_FOUND'
      }
    }

    return {
      success: true as const,
      data: result,
      has_definitions: result.definitions.length > 0,
      fallback_used: !!result.fallback_source,
      definitions_count: result.definitions.length,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error in getDefinitionsByIdHandler:', error)
    set.status = 500
    return {
      error: 'Internal server error',
      message: 'Failed to fetch definitions',
      code: 'DEFINITIONS_FETCH_ERROR'
    }
  }
}

/**
 * GET /api/definitions/word-name/:word
 */
export const getDefinitionsByNameHandler = async ({
  params,
  set
}: any): Promise<DefinitionResponse> => {
  try {
    const wordName = decodeURIComponent(params.word).toLowerCase().trim()
    const result = await getDefinitionsByNameOptimized(wordName)

    if (!result) {
      set.status = 404
      return {
        error: 'Word not found',
        message: `No word found with name "${wordName}"`,
        code: 'WORD_NOT_FOUND'
      }
    }

    return {
      success: true as const,
      data: result,
      has_definitions: result.definitions.length > 0,
      fallback_used: !!result.fallback_source,
      definitions_count: result.definitions.length,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error in getDefinitionsByNameHandler:', error)
    set.status = 500
    return {
      error: 'Internal server error',
      message: 'Failed to fetch definitions',
      code: 'DEFINITIONS_FETCH_ERROR'
    }
  }
}

/**
 * GET /api/definitions/word/:wordId/source/:sourceId
 */
export const getDefinitionsBySpecificSourceHandler = async ({
  params,
  set
}: any): Promise<SpecificSourceResponse> => {
  try {
    const { wordId, sourceId } = params

    const validSources = [1, 2, 3, 5, 6, 7]
    const sourceNames = {
      1: 'Wiktionnaire',
      2: 'Universalis',
      3: 'Cordial',
      5: 'Larousse',
      6: 'LeDictionnaire',
      7: 'Robert'
    } as const

    if (!validSources.includes(sourceId)) {
      set.status = 400
      return {
        error: 'Invalid source ID',
        message: `Source ID ${sourceId} is not valid. Valid sources: ${validSources.join(
          ', '
        )}`,
        code: 'INVALID_SOURCE_ID'
      }
    }

    const result = await getDefinitionsBySpecificSource(wordId, sourceId)

    if (!result) {
      set.status = 404
      return {
        error: 'Word not found',
        message: `No word found with ID ${wordId}`,
        code: 'WORD_NOT_FOUND'
      }
    }

    return {
      success: true as const,
      data: result,
      definitions_count: result.definitions.length,
      source_requested: {
        id: sourceId,
        name: sourceNames[sourceId as keyof typeof sourceNames]
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error in getDefinitionsBySpecificSourceHandler:', error)
    set.status = 500
    return {
      error: 'Internal server error',
      message: 'Failed to fetch definitions from specific source',
      code: 'SPECIFIC_SOURCE_FETCH_ERROR'
    }
  }
}

/**
 * GET /api/definitions/word-name/:word/source/:sourceId
 */
export const getDefinitionsByNameAndSourceHandler = async ({
  params,
  set
}: any): Promise<SpecificSourceResponse> => {
  try {
    const wordName = decodeURIComponent(params.word).toLowerCase().trim()
    const sourceId = params.sourceId

    const validSources = [1, 2, 3, 5, 6, 7]
    const sourceNames = {
      1: 'Wiktionnaire',
      2: 'Universalis',
      3: 'Cordial',
      5: 'Larousse',
      6: 'LeDictionnaire',
      7: 'Robert'
    } as const

    if (!validSources.includes(sourceId)) {
      set.status = 400
      return {
        error: 'Invalid source ID',
        message: `Source ID ${sourceId} is not valid. Valid sources: ${validSources.join(
          ', '
        )}`,
        code: 'INVALID_SOURCE_ID'
      }
    }

    const result = await getDefinitionsByNameAndSource(wordName, sourceId)

    if (!result) {
      set.status = 404
      return {
        error: 'Word not found',
        message: `No word found with name "${wordName}"`,
        code: 'WORD_NOT_FOUND'
      }
    }

    return {
      success: true as const,
      data: result,
      definitions_count: result.definitions.length,
      source_requested: {
        id: sourceId,
        name: sourceNames[sourceId as keyof typeof sourceNames]
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error in getDefinitionsByNameAndSourceHandler:', error)
    set.status = 500
    return {
      error: 'Internal server error',
      message: 'Failed to fetch definitions from specific source',
      code: 'SPECIFIC_SOURCE_FETCH_ERROR'
    }
  }
}

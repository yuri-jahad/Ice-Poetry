import { db } from '@database/database.config'
import {
  getDefinitionsQuery,
  getDefinitionsByWordNameQuery
} from '@definitions/definitions.repositories'
import { testPerformance } from '@/shared/shared.helpers'
import type { DefDetails } from './definitions.types';

const SOURCE_PRIORITY_ORDER = [7, 5, 2, 1, 3, 6] // Robert, Larousse, Universalis, Wiktionnaire, Cordial, LeDictionnaire

const SOURCE_MAP = {
  1: 'Wiktionnaire',
  2: 'Universalis',
  3: 'Cordial',
  5: 'Larousse',
  6: 'LeDictionnaire',
  7: 'Robert'
} as const

// Sources accessibles par défaut (peut être configuré)
const ACCESSIBLE_SOURCES = [1, 2, 3, 5, 6, 7] // Toutes accessibles par défaut

function sortDefinitionsByPriority (definitions: DefDetails[]): DefDetails[] {
  // Créer un Map pour accès O(1)
  const priorityMap = new Map(
    SOURCE_PRIORITY_ORDER.map((id, index) => [id, index])
  )

  return definitions.sort((a, b) => {
    const priorityA = priorityMap.get(a.source_id) ?? 999
    const priorityB = priorityMap.get(b.source_id) ?? 999
    return priorityA - priorityB
  })
}

/**
 * Récupère les définitions d'un mot par son nom avec fallback intelligent
 * @param wordName - Nom du mot
 * @returns Définitions triées par priorité ou source de fallback
 */
export async function getDefinitionsByNameOptimized (wordName: string) {
  try {
    // Requête unique optimisée avec toutes les jointures
    const results = await getDefinitionsByWordNameQuery(wordName).execute()

    if (results.length === 0) {
      // Vérifier si le mot existe sans définitions
      const word = await db
        .selectFrom('WORDS')
        .select(['id', 'word', 'created_at', 'creator_id'])
        .where('word', '=', wordName)
        .executeTakeFirst()

      if (!word) return null
      return null
    }

    // Extraire les informations du mot (première ligne)
    const firstResult = results[0]
    const wordDetails = {
      id: firstResult.word_id,
      word: firstResult.word,
      created_at: firstResult.word_created_at,
      creator_id: firstResult.creator_id
    }

    // Transformer et trier les définitions
    const definitions = results.map(r => ({
      id: r.id,
      word_id: r.word_id,
      definition: r.definition,
      source_id: r.source_id,
      source_name: r.source_name,
      created_at: r.created_at
    }))

    const sortedDefinitions = sortDefinitionsByPriority(definitions)
    return {
      word_details: wordDetails,
      definitions: sortedDefinitions
    }
  } catch (error) {
    console.error('Error in getDefinitionsByNameOptimized:', error)
    return null
  }
}



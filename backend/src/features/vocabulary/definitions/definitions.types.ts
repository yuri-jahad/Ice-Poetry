/**
 *  Definitions with wordByName
 */

export interface WordDetails {
  id: number
  word: string
  created_at: Date
  creator_id: number | null
}

export interface DefDetails {
  id: number
  word_id: number
  definition: string
  source_id: number
  source_name: string
  created_at: Date
}

export interface FallbackSource {
  id: number
  name: string
  accessible: boolean
}

export interface DefByNameSuccess {
  success: true
  word_details: WordDetails
  definitions: DefDetails[]
  definitions_count: number
  timestamp: string
}

export interface DefByNameError {
  error: string
  message: string
  code?: string // Optional
}

export type DefByNameResponse = DefByNameSuccess | DefByNameError

export const VALID_SOURCE_IDS = [1, 2, 3, 5, 6, 7] as const

export const SOURCE_NAMES = {
  1: 'Wiktionnaire',
  2: 'Universalis',
  3: 'Cordial',
  5: 'Larousse',
  6: 'LeDictionnaire',
  7: 'Robert'
} as const

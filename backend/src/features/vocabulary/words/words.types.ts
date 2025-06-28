import type { USERS_ROLES } from '@database/database.types'

export interface WordDetailsInsert {
  id: number
  word: string
  created_at: Date
  creator_id: number
  tags: string[]
  username: string
  role: USERS_ROLES
  image_path: string
}

/** Update Word */
export interface UpdateWordServiceSuccess {
  success: true
  message: string
  wordWithTags: WordWithTags
}

export interface UpdateWordServiceError {
  success: false
  error: string
}

export interface UpdateWordError {
  error: string
  timestamp: string
  code?: string
}

/** Delete Word */
export interface DeleteWordServiceSuccess {
  success: true
  message: string
  deletedWordId: number
}

export interface DeleteWordServiceError {
  success: false
  error: string
}

export interface DeleteWordError {
  error: string
  timestamp: string
  code?: string
}

/** Find Words */
export interface FindWordsServiceSuccess {
  success: true
  data: any[]
  pattern: string
  listname: string
  total: number
  hasMore: number
}

export interface FindWordsServiceError {
  success: false
  error: string
}

export interface FindWordsSuccess {
  success: true
  data: any[]
  pattern: string
  listname: string
  total: number
  hasMore: number
  timestamp: string
}

export interface FindWordsError {
  error: string
  timestamp: string
}

/** Add Words */
export interface AddWordsService {
  success: boolean
  message: string
  words: any[]
  inserted: number
  skipped: number
  totalInsertedRows?: any
}

export interface AddWordsError {
  error: string
  timestamp: string
}

/** Service Responses */
export type UpdateWordServiceResponse =
  | UpdateWordServiceSuccess
  | UpdateWordServiceError

export type DeleteWordServiceResponse =
  | DeleteWordServiceSuccess
  | DeleteWordServiceError
export type FindWordsServiceResponse =
  | FindWordsServiceSuccess
  | FindWordsServiceError


export interface UpdateWordParams {
  id: string;
}

export interface DeleteWordParams {
  id: string; 
}

export interface FindWordBody {
  searchParams: {
    pattern: string // minLength: 1
    listname: string // minLength: 1
  }
}

export interface FindWordListBody {
  pattern: string // minLength: 1
  listname?: string // Optional
}

export interface AddWordsBody {
  words_details: Array<{
    name: string // minLength: 1
    tags: string[]
  }>
  creator_id: number // minimum: 1
}

export interface UpdateWordBody {
  wordWithTags: {
    name: string // minLength: 2
    tags: string[]
  }
}

// ===============================
// DATA TYPES
// ===============================

export interface WordData {
  id: number
  word: string
  creator_id: number
  created_at: string // ISO date string
  user_id: number
  username: string
  role: string
  image_path: string
  // Tag flags
  is_adverb: number
  is_demonym: number
  is_animal: number
  is_verb: number
}

export interface SearchResult {
  data: WordData[]
  total: number
  hasMore: boolean
  global: number
}

// ===============================
// SUCCESS RESPONSE TYPES
// ===============================

export interface FindWordSuccess {
  success: true
  data: string[] // Array de mots ou messages
  pattern: string
  listname: string
  total: number
  hasMore: number
  timestamp: string
}

export interface FindWordListSuccess {
  success: true
  listname: string
  pattern: string
  timestamp: string
  data: string[] // Array de mots ou messages
  count: number
  total: number
  hasMore?: boolean // Optional
}

export interface AddWordsSuccess {
  success: true
  message: string
  data: {
    success: boolean
    message: string
    words: Array<{
      name: string
      tags: string[]
    }>
    inserted: number
    skipped: number
    totalInsertedRows?: number // Optional
  }
  timestamp: string
}

export interface UpdateWordSuccess {
  success: true
  message: string
  wordWithTags: {
    name: string
    tags: string[]
  }
  timestamp: string
}

export interface DeleteWordSuccess {
  success: true
  message: string
  wordId: number
  timestamp: string
}

// ===============================
// ERROR TYPES
// ===============================

export interface WordError {
  error: string
  timestamp: string
  code?: string // Optional
}

export interface ValidationError {
  error: string
  timestamp: string
  details?: string[] // Optional
}

// ===============================
// UNION RESPONSE TYPES
// ===============================

export type FindWordResponse = FindWordSuccess | WordError
export type FindWordListResponse = FindWordListSuccess | WordError
export type AddWordsResponse = AddWordsSuccess | WordError
export type UpdateWordResponse = UpdateWordSuccess | WordError
export type DeleteWordResponse = DeleteWordSuccess | WordError

// ===============================
// TYPE GUARDS
// ===============================

export function isFindWordSuccess (
  response: FindWordResponse
): response is FindWordSuccess {
  return 'success' in response && response.success === true
}

export function isFindWordListSuccess (
  response: FindWordListResponse
): response is FindWordListSuccess {
  return 'success' in response && response.success === true
}

export function isAddWordsSuccess (
  response: AddWordsResponse
): response is AddWordsSuccess {
  return 'success' in response && response.success === true
}

export function isUpdateWordSuccess (
  response: UpdateWordResponse
): response is UpdateWordSuccess {
  return 'success' in response && response.success === true
}

export function isDeleteWordSuccess (
  response: DeleteWordResponse
): response is DeleteWordSuccess {
  return 'success' in response && response.success === true
}

export function isWordError (response: any): response is WordError {
  return 'error' in response && typeof response.error === 'string'
}

// ===============================
// HELPER TYPES
// ===============================

export type WordWithTags = {
  name: string
  tags: string[]
}

export type WordDetails = {
  name: string
  tags: string[]
}

export type SearchParams = {
  pattern: string
  listname: string
}

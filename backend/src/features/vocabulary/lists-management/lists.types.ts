import type {
  Dictionary,
  ListNames
} from '@/features/vocabulary/lists-management/lists.repositories'
import {
  SyllablesRequestSchema,
  SyllableDataPointSchema,
  ComparativeDataPointSchema,
  SingleListResponseSchema,
  AllListsResponseSchema,
  ComparativeResponseSchema,
  PieResponseSchema,
  SyllablesSuccessSchema,
  SyllablesErrorSchema,
  SyllableItemSchema,
  AlphabetItemSchema,
  LengthItemSchema,
  UniqueLettersItemSchema,
  ChartDataErrorSchema,
  ChartDataResponseSchema,
  ChartDataSuccessSchema
} from '@lists/lists.schemas'

export interface RechartsData {
  occ: RechartsOcc
  alphabet: AlphabetStats
  lengths: LengthStats
  uniqueLetters: UniqueLettersStats
}

export interface DictionaryCache {
  dictionary: Dictionary | null
  allListsDetails: ListNames | null
  occurrences: Occurrences | null
  recharts: RechartsData | null
}

export type UniqueLettersStats = Record<
  string,
  Array<{ uniqueLetters: number; count: number }>
>

export type Occurrences = Record<string, Record<string, number>>

export type RechartsOcc = Record<
  string,
  Array<{ syllable: string; count: number }>
>

export type AlphabetStats = Record<
  string,
  Array<{ letter: string; count: number }>
>

export type LengthStats = Record<
  string,
  Array<{ length: number; count: number }>
>

// tagFlags, name, wordId

export type TagFlags = Record<string, 0 | 1>

export interface UpdateWordWordDetails {
  tagFlags: TagFlags
  wordId: number
  name: string
}

export type ChartFormatType = 'single' | 'pie' | 'comparative'

export type SyllablesResponseUnion =
  | SingleListResponse
  | AllListsResponse
  | ComparativeResponse
  | PieResponse

export type SyllablesRequest = typeof SyllablesRequestSchema.static
export type SyllableDataPoint = typeof SyllableDataPointSchema.static
export type ComparativeDataPoint = typeof ComparativeDataPointSchema.static
export type SingleListResponse = typeof SingleListResponseSchema.static
export type AllListsResponse = typeof AllListsResponseSchema.static
export type ComparativeResponse = typeof ComparativeResponseSchema.static
export type PieResponse = typeof PieResponseSchema.static
export type SyllablesSuccess = typeof SyllablesSuccessSchema.static
export type SyllablesError = typeof SyllablesErrorSchema.static
export type SyllableItem = typeof SyllableItemSchema.static
export type AlphabetItem = typeof AlphabetItemSchema.static
export type LengthItem = typeof LengthItemSchema.static
export type UniqueLettersItem = typeof UniqueLettersItemSchema.static
export type ChartDataResponse = typeof ChartDataResponseSchema.static
export type ChartDataError = typeof ChartDataErrorSchema.static
export type ChartDataSuccess = typeof ChartDataSuccessSchema.static

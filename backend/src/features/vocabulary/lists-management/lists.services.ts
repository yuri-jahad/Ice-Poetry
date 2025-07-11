import { loadDictionary, loadAllListsDetails } from '@lists/lists.repositories'
import { createTagFlags, cut } from '@words/words.helpers'

import type {
  AllListsResponse,
  Occurrences,
  RechartsData,
  RechartsOcc,
  AlphabetStats,
  DictionaryCache,
  LengthStats,
  UniqueLettersStats,
  ChartFormatType,
  ChartDataResponse
} from '@lists/lists.types'

import type { WordDetailsInsert } from '@words/words.types'
import type {
  SyllablesResponseUnion,
  ComparativeResponse,
  PieResponse,
  SingleListResponse
} from '@lists/lists.types'
import { shuffle } from '@/shared/shared.helpers'

const cache: DictionaryCache = {
  dictionary: null,
  allListsDetails: null,
  occurrences: null,
  recharts: null
}

function generateAndCacheOcc (): {
  occurrences: Occurrences
  recharts: RechartsData
} {
  const { dictionary, allListsDetails } = cache // ✅ Utiliser allListsDetails
  if (!dictionary || !allListsDetails)
    return {
      occurrences: {},
      recharts: { occ: {}, alphabet: {}, lengths: {}, uniqueLetters: {} }
    }

  // ✅ Extraire les listNames depuis allListsDetails
  const listNames = Object.keys(allListsDetails.counts)

  const occ: Record<string, Record<string, number>> = Object.fromEntries(
    [...listNames].map(name => [name, {}])
  )

  // Statistiques alphabétiques, de longueur et lettres uniques
  const alphabetStats: Record<
    string,
    Record<string, number>
  > = Object.fromEntries([...listNames].map(name => [name, {}]))

  const lengthStats: Record<
    string,
    Record<number, number>
  > = Object.fromEntries([...listNames].map(name => [name, {}]))

  const uniqueLettersStats: Record<
    string,
    Record<number, number>
  > = Object.fromEntries([...listNames].map(name => [name, {}]))

  const len = dictionary.length
  const listLen = listNames.length

  for (let i = 0; i < len; i++) {
    const entry = dictionary[i]
    const syllables = cut(entry.word)
    const firstLetter = entry.word.charAt(0).toUpperCase()
    const wordLength = entry.word.length
    const uniqueLettersCount = new Set(entry.word.toLowerCase()).size

    alphabetStats.word[firstLetter] = (alphabetStats.word[firstLetter] || 0) + 1
    lengthStats.word[wordLength] = (lengthStats.word[wordLength] || 0) + 1
    uniqueLettersStats.word[uniqueLettersCount] =
      (uniqueLettersStats.word[uniqueLettersCount] || 0) + 1

    if (syllables) {
      const syllableArray = Array.from(syllables)
      const wordOcc = occ.word

      for (let k = 0, sLen = syllableArray.length; k < sLen; k++) {
        const syllable = syllableArray[k]
        wordOcc[syllable] = (wordOcc[syllable] || 0) + 1
      }
    }

    for (let j = 0; j < listLen; j++) {
      const listName = listNames[j]
      if (entry[listName as keyof typeof entry] === 1) {
        alphabetStats[listName][firstLetter] =
          (alphabetStats[listName][firstLetter] || 0) + 1
        lengthStats[listName][wordLength] =
          (lengthStats[listName][wordLength] || 0) + 1
        uniqueLettersStats[listName][uniqueLettersCount] =
          (uniqueLettersStats[listName][uniqueLettersCount] || 0) + 1

        if (syllables) {
          const listOcc = occ[listName]
          const syllableArray = Array.from(syllables)

          for (let k = 0, sLen = syllableArray.length; k < sLen; k++) {
            const syllable = syllableArray[k]
            listOcc[syllable] = (listOcc[syllable] || 0) + 1
          }
        }
      }
    }
  }

  const rechartsOcc: RechartsOcc = {}
  const rechartsAlphabet: AlphabetStats = {}
  const rechartsLengths: LengthStats = {}
  const rechartsUniqueLetters: UniqueLettersStats = {}

  for (const listName of ['word', ...listNames]) {
    const o = {} as any
    for (let key in occ[listName]) {
      const value = occ[listName][key]
      o[value] = (o[value] || 0) + 1
    }
    //@ts-ignore
    rechartsOcc[listName] = Object.entries(o)
      .map(([wordsPerSyllable, syllablesWithCount]) => ({
        wordsPerSyllable,
        syllablesWithCount
      }))
      .sort(
        (a, b) => parseInt(a.wordsPerSyllable) - parseInt(b.wordsPerSyllable)
      )

    rechartsAlphabet[listName] = Object.entries(alphabetStats[listName])
      .map(([letter, count]) => ({ letter, count }))
      .sort((a, b) => a.letter.localeCompare(b.letter))

    rechartsLengths[listName] = Object.entries(lengthStats[listName])
      .map(([length, count]) => ({ length: parseInt(length), count }))
      .sort((a, b) => a.length - b.length)

    rechartsUniqueLetters[listName] = Object.entries(
      uniqueLettersStats[listName]
    )
      .map(([uniqueCount, count]) => ({
        uniqueLetters: parseInt(uniqueCount),
        count
      }))
      .sort((a, b) => a.uniqueLetters - b.uniqueLetters)
  }

  const rechartsData: RechartsData = {
    occ: rechartsOcc,
    alphabet: rechartsAlphabet,
    lengths: rechartsLengths,
    uniqueLetters: rechartsUniqueLetters
  }

  cache.occurrences = occ
  cache.recharts = rechartsData

  return { occurrences: occ, recharts: rechartsData }
}

// ✅ Fonction pour récupérer les listNames depuis allListsDetails
export function getCachedListNames () {
  if (!cache.allListsDetails?.listNames) return []
  return cache.allListsDetails.listNames
}

// ✅ Fonction pour récupérer les counts
export function getCachedListsCounts () {
  if (!cache.allListsDetails?.counts) return {}
  return cache.allListsDetails.counts
}

export async function refreshAll (): Promise<DictionaryCache> {
  cache.dictionary = null
  cache.allListsDetails = null // ✅ Correction
  cache.occurrences = null
  cache.recharts = null

  const [dictionary, allListsDetails] = await Promise.all([
    loadDictionary(),
    loadAllListsDetails()
  ])

  if (!dictionary || !allListsDetails) {
    return {
      dictionary: null,
      allListsDetails: null, // ✅ Correction
      occurrences: null,
      recharts: null
    }
  }

  cache.dictionary = dictionary
  cache.allListsDetails = allListsDetails // ✅ Correction

  const { occurrences, recharts } = generateAndCacheOcc()

  return { dictionary, allListsDetails, occurrences, recharts } // ✅ Correction
}

export function isAllLoaded (): boolean {
  return (
    cache.dictionary !== null &&
    cache.allListsDetails !== null && // ✅ Correction
    cache.occurrences !== null &&
    cache.recharts !== null
  )
}

export function getCachedData (): DictionaryCache {
  return { ...cache }
}

export function getCachedRecharts (): RechartsData | null {
  return cache.recharts
}

export function getCachedRechartsOcc (listName?: string) {
  if (!cache.recharts?.occ) return listName ? [] : {}
  return listName ? cache.recharts.occ[listName] || [] : cache.recharts.occ
}

export function getCachedRechartsAlphabet (listName?: string) {
  if (!cache.recharts?.alphabet) return listName ? [] : {}
  return listName
    ? cache.recharts.alphabet[listName] || []
    : cache.recharts.alphabet
}

export function getCachedRechartsLengths (listName?: string) {
  if (!cache.recharts?.lengths) return listName ? [] : {}
  return listName
    ? cache.recharts.lengths[listName] || []
    : cache.recharts.lengths
}

export function getCachedRechartsUniqueLetters (listName?: string) {
  if (!cache.recharts?.uniqueLetters) return listName ? [] : {}
  return listName
    ? cache.recharts.uniqueLetters[listName] || []
    : cache.recharts.uniqueLetters
}

export function clearCache (): void {
  cache.dictionary = null
  cache.allListsDetails = null // ✅ Correction
  cache.occurrences = null
  cache.recharts = null
}

export interface SearchParams {
  listname: string
  pattern: string
}

export interface SearchResult {
  global: number
  data: string[]
  total: number
  hasMore: number
}

export function searchWordObjects (p: SearchParams): SearchResult {
  const d = cache.dictionary
  if (!d)
    return {
      global: 0,
      data: [],
      total: 0,
      hasMore: 0
    }

  let re
  try {
    re = new RegExp(p.pattern)
  } catch {
    return {
      global: 0,
      data: [],
      total: 0,
      hasMore: 0
    }
  }

  const r: any[] = []
  const s = performance.now()
  const l = d.length
  const k = p.listname
  let exact: any = null

  for (let i = 0; i < l; ++i) {
    if ((i & 63) === 0 && performance.now() - s > 200) break

    const e = d[i]
    const w = e.word
    //@ts-ignore

    if (e[k] && re.test(w)) {
      if (w === p.pattern) {
        exact = e
      } else {
        r.push(e)
      }
    }
  }

  if (exact) r.unshift(exact)
  const q = r.slice(0, 50)

  return {
    global: l,
    data: q,
    total: r.length,
    hasMore: r.length - q.length
  }
}

export function searchWords (p: SearchParams): SearchResult {
  const d = cache.dictionary
  if (!d) return { global: 0, data: [], total: 0, hasMore: 0 }

  let re
  try {
    re = new RegExp(p.pattern)
  } catch {
    return { global: d.length, data: [], total: 0, hasMore: 0 }
  }

  const r: string[] = []
  const s = performance.now()
  const l = d.length
  const k = p.listname
  let exact: string | null = null

  for (let i = 0; i < l; ++i) {
    if ((i & 63) === 0 && performance.now() - s > 200) break

    const e = d[i]
    const w = e.word
    //@ts-ignore

    if (e[k] && re.test(w)) {
      if (w === p.pattern) {
        exact = w
      } else {
        r.push(w)
      }
    }
  }

  if (exact) r.unshift(exact)
  const q = r.slice(0, 20)

  return {
    global: l,
    data: q,
    total: r.length,
    hasMore: r.length - q.length
  }
}

export function addWordToCache (wordsDetailsInsert: WordDetailsInsert) {
  const { dictionary } = cache
  if (!dictionary) return

  const tagFlags = createTagFlags(wordsDetailsInsert.tags)

  dictionary.push({
    id: wordsDetailsInsert.id,
    word: wordsDetailsInsert.word,
    creator_id: wordsDetailsInsert.creator_id,
    created_at: wordsDetailsInsert.created_at,
    user_id: wordsDetailsInsert.creator_id,
    username: wordsDetailsInsert.username,
    role: wordsDetailsInsert.role,
    image_path: wordsDetailsInsert.image_path,
    ...tagFlags
  })
}

export function getChartDataFast (): ChartDataResponse | null {
  const recharts = getCachedRecharts()
  if (!recharts?.occ) return null

  const occEntries = Object.entries(recharts.occ)

  const result = {
    alphabet: recharts.alphabet,
    lengths: recharts.lengths,
    uniqueLetters: recharts.uniqueLetters,
    occ: {
      bottom: {} as Record<string, any[]>
    }
  }

  for (let i = 0, len = occEntries.length; i < len; i++) {
    const [listName, syllables] = occEntries[i]
    const arr = syllables as any[]
    const arrLen = arr.length
    result.occ.bottom[listName] = arrLen > 50 ? arr.slice(0, 50) : arr
  }

  return result
}
//@ts-ignore

export function updateWordToCache (tagFlags, name, wordId) {
  const { dictionary } = cache
  if (!dictionary) return

  for (let i = 0; i < dictionary.length; i++) {
    if (dictionary[i].id === wordId) {
      dictionary[i] = {
        ...dictionary[i],
        ...tagFlags,
        word: name
      }
    }
  }
}
//@ts-ignore

export function deleteWordFromCache (wordId) {
  const { dictionary } = cache
  if (!dictionary) return false

  for (let i = 0; i < dictionary.length; i++) {
    if (dictionary[i].id === wordId) {
      const deletedWord = dictionary[i]
      dictionary.splice(i, 1)
      return deletedWord
    }
  }

  return null
}

// Le reste des fonctions reste identique...
export interface SyllablesParams {
  page?: number
  limit?: number
  order?: 'asc' | 'desc'
  listName?: string
  format?: ChartFormatType
  lists?: string[]
}

export interface SyllablesResponse {
  data: any[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
  format: ChartFormatType
  lists?: string[]
}

export function getSyllablesData (
  params: SyllablesParams = {}
): SyllablesResponseUnion | null {
  const {
    page = 1,
    limit = 10,
    order = 'desc',
    listName,
    format = 'single',
    lists = []
  } = params

  const occ = cache.recharts?.occ

  if (!occ) {
    return null
  }

  switch (format) {
    case 'single':
      return getSingleListData(occ, page, limit, order, listName)
    case 'comparative':
      return getComparativeData(occ, page, limit, lists)
    case 'pie':
      return getPieData(occ, limit, listName || 'word')
    default:
      return getSingleListData(occ, page, limit, order, listName)
  }
}

function getSingleListData (
  occ: any,
  page: number,
  limit: number,
  order: 'asc' | 'desc',
  listName?: string
): SingleListResponse | AllListsResponse {
  if (listName) {
    const listOcc = occ[listName]
    if (!listOcc) {
      return createEmptySingleResponse(page, limit, [listName])
    }

    const sorted = [...listOcc].sort((a, b) =>
      order === 'desc' ? b.count - a.count : a.count - b.count
    )

    return paginateAndFormatSingle(sorted, page, limit, [listName])
  } else {
    const result: Record<string, SingleListResponse> = {}

    for (const [currentListName, syllables] of Object.entries(occ) as any) {
      const sorted = [...syllables].sort((a, b) =>
        order === 'desc' ? b.count - a.count : a.count - b.count
      )

      result[currentListName] = paginateAndFormatSingle(sorted, page, limit, [
        currentListName
      ])
    }

    return {
      data: result,
      total: Object.keys(occ).length,
      page,
      limit,
      totalPages: 1,
      hasMore: false,
      format: 'single'
    }
  }
}

function getComparativeData (
  occ: any,
  page: number,
  limit: number,
  requestedLists: string[]
): ComparativeResponse {
  const listsToUse =
    requestedLists.length > 0 ? requestedLists : Object.keys(occ)

  const allSyllables = new Set<string>()
  listsToUse.forEach(listName => {
    if (occ[listName]) {
      occ[listName].forEach((item: any) => allSyllables.add(item.syllable))
    }
  })

  const comparativeData = Array.from(allSyllables).map(syllable => {
    const dataPoint: any = {
      name: syllable,
      syllable: syllable
    }

    listsToUse.forEach(listName => {
      if (occ[listName]) {
        const found = occ[listName].find(
          (item: any) => item.syllable === syllable
        )
        dataPoint[listName] = found ? found.count : 0
      }
    })

    return dataPoint
  })

  comparativeData.sort((a, b) => {
    const totalA = listsToUse.reduce(
      (sum, listName) => sum + (a[listName] || 0),
      0
    )
    const totalB = listsToUse.reduce(
      (sum, listName) => sum + (b[listName] || 0),
      0
    )
    return totalB - totalA
  })

  return paginateComparative(comparativeData, page, limit, listsToUse)
}

function getPieData (occ: any, limit: number, listName: string): PieResponse {
  const listOcc = occ[listName]
  if (!listOcc) {
    return createEmptyPieResponse(limit, [listName])
  }

  const sorted = [...listOcc].sort((a, b) => b.count - a.count).slice(0, limit)
  const total = sorted.reduce((sum, item) => sum + item.count, 0)

  const pieData = sorted.map(item => ({
    name: item.syllable,
    value: item.count,
    percentage: ((item.count / total) * 100).toFixed(1),
    syllable: item.syllable,
    count: item.count
  }))

  return {
    data: pieData,
    total: listOcc.length,
    page: 1,
    limit,
    totalPages: 1,
    hasMore: false,
    format: 'pie',
    lists: [listName]
  }
}

function paginateAndFormatSingle (
  data: any[],
  page: number,
  limit: number,
  lists: string[]
): SingleListResponse {
  const rechartsData = data.map(item => ({
    name: item.syllable,
    value: item.count,
    syllable: item.syllable,
    count: item.count
  }))

  const total = data.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedData = rechartsData.slice(startIndex, endIndex)
  const hasMore = endIndex < total

  return {
    data: paginatedData,
    total,
    page,
    limit,
    totalPages,
    hasMore,
    format: 'single',
    lists
  }
}

function paginateComparative (
  data: any[],
  page: number,
  limit: number,
  lists: string[]
): ComparativeResponse {
  const total = data.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedData = data.slice(startIndex, endIndex)
  const hasMore = endIndex < total

  return {
    data: paginatedData,
    total,
    page,
    limit,
    totalPages,
    hasMore,
    format: 'comparative',
    lists
  }
}

function createEmptySingleResponse (
  page: number,
  limit: number,
  lists: string[]
): SingleListResponse {
  return {
    data: [],
    total: 0,
    page,
    limit,
    totalPages: 0,
    hasMore: false,
    format: 'single',
    lists
  }
}

function createEmptyPieResponse (limit: number, lists: string[]): PieResponse {
  return {
    data: [],
    total: 0,
    page: 1,
    limit,
    totalPages: 0,
    hasMore: false,
    format: 'pie',
    lists
  }
}

function paginateAndFormat (
  data: any[],
  page: number,
  limit: number,
  format: ChartFormatType,
  lists: string[]
): SyllablesResponse {
  const rechartsData = data.map(item => ({
    name: item.syllable,
    value: item.count,
    syllable: item.syllable,
    count: item.count
  }))

  return paginateData(rechartsData, page, limit, format, lists)
}

function paginateData (
  data: any[],
  page: number,
  limit: number,
  format: ChartFormatType,
  lists: string[]
): SyllablesResponse {
  const total = data.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit

  const paginatedData = data.slice(startIndex, endIndex)
  const hasMore = endIndex < total

  return {
    data: paginatedData,
    total,
    page,
    limit,
    totalPages,
    hasMore,
    format,
    lists
  }
}

await refreshAll()

function isStringNumber (str: string): boolean {
  return Number.isFinite(Number(str)) && str.trim() !== ''
}

export function searchSyllables (p: SearchParams) {
  const { occurrences } = getCachedData()
  if (!occurrences || !occurrences[p.listname]) {
    return { global: 0, data: [], total: 0, hasMore: 0 }
  }

  const keys = Object.keys(occurrences[p.listname])
  const len = keys.length

  if (len === 0) {
    return { global: 0, data: [], total: 0, hasMore: 0 }
  }

  if (isStringNumber(p.pattern)) {
    const target = +p.pattern
    const matches = []
    for (let i = 0; i < len; i++) {
      if (occurrences[p.listname][keys[i]] === target) {
        matches.push(keys[i])
      }
    }

    for (let i = matches.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      //@ts-ignore
      const temp = matches[i]
      matches[i] = matches[j]
      matches[j] = temp
    }

    console.log(matches)
    return {
      global: len,
      data: matches.slice(0, 20),
      total: matches.length,
      hasMore: Math.max(0, matches.length - 20)
    }
  }

  let re
  try {
    re = new RegExp(p.pattern)
  } catch {
    return { global: len, data: [], total: 0, hasMore: 0 }
  }

  const matches = []
  let exact = null
  const start = performance.now()

  for (let i = 0; i < len; i++) {
    if ((i & 63) === 0 && performance.now() - start > 200) break

    const key = keys[i]
    if (occurrences[p.listname][key] && re.test(key)) {
      if (key === p.pattern) {
        exact = key
      } else {
        matches.push(key)
      }
    }
  }

  for (let i = matches.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    //@ts-ignore

    const temp = matches[i]
    matches[i] = matches[j]
    matches[j] = temp
  }

  const result = exact ? [exact, ...matches] : matches

  
  return {
    global: len,
    data: shuffle(result).slice(0, 20),
    total: result.length,
    hasMore: Math.max(0, result.length - 20)
  }
}

searchSyllables({ pattern: '0', listname: 'word' })

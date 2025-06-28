import { t } from 'elysia'

const regNum = '^[0-9]+$'

export const UpdateWordParamsSchema = t.Object({
  id: t.String({
    pattern: regNum
  })
})

export const DeleteWordParamsSchema = t.Object({
  wordId: t.String({ pattern: regNum }) 
})

export const FindWordBodySchema = t.Object({
  searchParams: t.Object({
    pattern: t.String({ minLength: 1 }),
    listname: t.String({ minLength: 1 })
  })
})

export const FindWordListBodySchema = t.Object({
  pattern: t.String({ minLength: 1 }),
  listname: t.Optional(t.String()) // Si optionnel
})

export const AddWordsBodySchema = t.Object({
  wordsDetails: t.Array(
    t.Object({
      name: t.String({ minLength: 1 }),
      tags: t.Array(t.String())
    })
  ),
  creator_id: t.Number({ minimum: 1 })
})

export const UpdateWordBodySchema = t.Object({
  wordWithTags: t.Object({
    name: t.String({ minLength: 2 }),
    tags: t.Array(t.String())
  })
})

// ===============================
// RESPONSE SCHEMAS
// ===============================

export const WordDataSchema = t.Object({
  id: t.Number(),
  word: t.String(),
  creator_id: t.Number(),
  created_at: t.String(), // ISO date
  user_id: t.Number(),
  username: t.String(),
  role: t.String(),
  image_path: t.String(),
  // Tag flags
  is_adverb: t.Number(),
  is_demonym: t.Number(),
  is_animal: t.Number(),
  is_verb: t.Number()
})

export const SearchResultSchema = t.Object({
  data: t.Array(WordDataSchema),
  total: t.Number(),
  hasMore: t.Boolean(),
  global: t.Number()
})

export const FindWordSuccessSchema = t.Object({
  success: t.Literal(true),
  listname: t.String(),
  pattern: t.String(),
  data: t.Array(t.String()), // Array de mots ou messages
  timestamp: t.String(),
  total: t.Number(),
  hasMore: t.Number()
})

export const FindWordListSuccessSchema = t.Object({
  success: t.Literal(true),
  listname: t.String(),
  pattern: t.String(),
  timestamp: t.String(),
  data: t.Array(t.String()), // Array de mots ou messages
  total: t.Number(),
  hasMore: t.Number()
})

export const AddWordsSuccessSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    success: t.Boolean(),
    message: t.String(),
    words: t.Array(
      t.Object({
        name: t.String(),
        tags: t.Array(t.String())
      })
    ),
    inserted: t.Number(),
    skipped: t.Number(),
    totalInsertedRows: t.Optional(t.Number())
  }),
  timestamp: t.String()
})

export const UpdateWordSuccessSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  wordWithTags: t.Object({
    name: t.String(),
    tags: t.Array(t.String())
  }),
  timestamp: t.String()
})

export const DeleteWordSuccessSchema = t.Object({
  success: t.Literal(true),
  message: t.String(),
  wordId: t.Number(),
  timestamp: t.String()
})

// ===============================
// ERROR SCHEMAS
// ===============================

export const ErrorSchema = t.Object({
  error: t.String(),
  timestamp: t.String(),
  code: t.Optional(t.String())
})

export const ValidationErrorSchema = t.Object({
  error: t.String(),
  timestamp: t.String(),
  details: t.Optional(t.Array(t.String()))
})

// ===============================
// RESPONSE UNIONS
// ===============================

export const FindWordResponseSchema = t.Union([
  FindWordSuccessSchema,
  ErrorSchema
])

export const FindWordListResponseSchema = t.Union([
  FindWordListSuccessSchema,
  ErrorSchema
])

export const AddWordsResponseSchema = t.Union([
  AddWordsSuccessSchema,
  ErrorSchema
])

export const UpdateWordResponseSchema = t.Union([
  UpdateWordSuccessSchema,
  ErrorSchema
])

export const DeleteWordResponseSchema = t.Union([
  DeleteWordSuccessSchema,
  ErrorSchema
])

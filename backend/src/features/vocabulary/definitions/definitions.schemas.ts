import { t } from 'elysia'

export const DefinitionResultSchema = t.Object({
  id: t.Number(),
  word_id: t.Number(),
  definition: t.String(),
  source_id: t.Number(),
  source_name: t.String(),
  created_at: t.Date()
})

export const WordInfoSchema = t.Object({
  id: t.Number(),
  word: t.String(),
  created_at: t.Date(),
  creator_id: t.Union([t.Number(), t.Null()])
})

export const FallbackSourceSchema = t.Object({
  id: t.Number(),
  name: t.String(),
  accessible: t.Boolean()
})

export const WordDefinitionsResultSchema = t.Object({
  word: WordInfoSchema,
  definitions: t.Array(DefinitionResultSchema),
  fallback_source: t.Optional(FallbackSourceSchema)
})

export const SpecificSourceResultSchema = t.Object({
  word: WordInfoSchema,
  definitions: t.Array(DefinitionResultSchema)
})

export const ErrorSchema = t.Object({
  error: t.String(),
  message: t.String(),
  code: t.Optional(t.String())
})

export const SuccessResponseSchema = t.Object({
  success: t.Literal(true),
  data: WordDefinitionsResultSchema,
  has_definitions: t.Boolean(),
  fallback_used: t.Boolean(),
  definitions_count: t.Number(),
  timestamp: t.String()
})

export const SpecificSourceResponseSchema = t.Object({
  success: t.Literal(true),
  data: SpecificSourceResultSchema,
  definitions_count: t.Number(),
  source_requested: t.Object({
    id: t.Number(),
    name: t.String()
  }),
  timestamp: t.String()
})
export const WordIdParamsSchema = t.Object({
  wordId: t.Numeric({
    minimum: 1
  })
})

export const WordNameParamsSchema = t.Object({
  word: t.String({
    minLength: 1,
    maxLength: 100,
    pattern: "^[a-zA-ZÀ-ÿ\\-'\\s]+$",
    error: 'Word must be 1-100 characters, letters only'
  })
})

export const SourceIdParamsSchema = t.Object({
  sourceId: t.Numeric({
    minimum: 1,
    maximum: 10, // Limite raisonnable pour tes sources
    error: 'Source ID must be a positive number between 1 and 10'
  })
})

export const WordIdAndSourceParamsSchema = t.Object({
  wordId: t.Numeric({
    minimum: 1,
    error: 'Word ID must be a positive number'
  }),
  sourceId: t.Numeric({
    minimum: 1,
    maximum: 10,
    error: 'Source ID must be a positive number between 1 and 10'
  })
})

export const WordNameAndSourceParamsSchema = t.Object({
  word: t.String({
    minLength: 1,
    maxLength: 100,
    pattern: "^[a-zA-ZÀ-ÿ\\-'\\s]+$",
    error: 'Word must be 1-100 characters, letters only'
  }),
  sourceId: t.Numeric({
    minimum: 1,
    maximum: 10,
    error: 'Source ID must be a positive number between 1 and 10'
  })
})

export const ValidSourceIdSchema = t.Union(
  [
    t.Literal(1), // Wiktionnaire
    t.Literal(2), // Universalis
    t.Literal(3), // Cordial
    t.Literal(5), // Larousse
    t.Literal(6), // LeDictionnaire
    t.Literal(7) // Robert
  ],
  {
    error:
      'Source ID must be one of: 1 (Wiktionnaire), 2 (Universalis), 3 (Cordial), 5 (Larousse), 6 (LeDictionnaire), 7 (Robert)'
  }
)

// Schema strict pour word ID + source valide
export const StrictWordIdAndSourceParamsSchema = t.Object({
  wordId: t.Numeric({
    minimum: 1,
    error: 'Word ID must be a positive number'
  }),
  sourceId: ValidSourceIdSchema
})

// Schema strict pour word name + source valide
export const StrictWordNameAndSourceParamsSchema = t.Object({
  word: t.String({
    minLength: 1,
    maxLength: 100,
    pattern: "^[a-zA-ZÀ-ÿ\\-'\\s]+$",
    error: 'Word must be 1-100 characters, letters only'
  }),
  sourceId: ValidSourceIdSchema
})

// Schema flexible qui accepte success OU error
export const FlexibleResponseSchema = t.Union([
  // Success response
  t.Object({
    success: t.Literal(true),
    data: t.Any(),
    has_definitions: t.Boolean(),
    fallback_used: t.Boolean(),
    definitions_count: t.Number(),
    timestamp: t.String()
  }),
  // Error response
  t.Object({
    error: t.String(),
    message: t.String(),
    code: t.String()
  })
])

export const FlexibleSpecificSourceResponseSchema = t.Union([
  t.Object({
    success: t.Literal(true),
    data: t.Any(),
    definitions_count: t.Number(),
    source_requested: t.Object({
      id: t.Number(),
      name: t.String()
    }),
    timestamp: t.String()
  }),
  // Error response
  t.Object({
    error: t.String(),
    message: t.String(),
    code: t.String()
  })
])

import { t } from 'elysia'
export const SyllablesRequestSchema = t.Object(
  {
    page: t.Optional(t.Number({ minimum: 1, default: 1 })),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 10 })),
    order: t.Optional(
      t.Union([t.Literal('asc'), t.Literal('desc')], { default: 'desc' })
    ),
    listName: t.Optional(t.String()),
    format: t.Union(
      [t.Literal('single'), t.Literal('comparative'), t.Literal('pie')],
      { default: 'single' }
    ),
    lists: t.Optional(
      t.Array(t.String(), { description: 'Required for comparative format' })
    )
  },
  {
    // Validation conditionnelle au niveau du schéma
    additionalProperties: false,
    description: 'Syllables request parameters'
  }
)

/** Syllable Data Point Schema */
export const SyllableDataPointSchema = t.Object({
  name: t.String(),
  value: t.Number(),
  syllable: t.String(),
  count: t.Number(),
  percentage: t.Optional(t.String()) // Pour format pie
})

/** Comparative Data Point Schema */
export const ComparativeDataPointSchema = t.Object(
  {
    name: t.String(),
    syllable: t.String()
    // + propriétés dynamiques pour chaque liste
  },
  { additionalProperties: true }
)

/** Single List Response Schema */
export const SingleListResponseSchema = t.Object({
  data: t.Array(SyllableDataPointSchema),
  total: t.Number(),
  page: t.Number(),
  limit: t.Number(),
  totalPages: t.Number(),
  hasMore: t.Boolean(),
  format: t.Literal('single'),
  lists: t.Optional(t.Array(t.String()))
})

/** All Lists Response Schema */
export const AllListsResponseSchema = t.Object({
  data: t.Record(t.String(), SingleListResponseSchema),
  total: t.Number(),
  page: t.Number(),
  limit: t.Number(),
  totalPages: t.Number(),
  hasMore: t.Boolean(),
  format: t.Literal('single')
})

/** Comparative Response Schema */
export const ComparativeResponseSchema = t.Object({
  data: t.Array(ComparativeDataPointSchema),
  total: t.Number(),
  page: t.Number(),
  limit: t.Number(),
  totalPages: t.Number(),
  hasMore: t.Boolean(),
  format: t.Literal('comparative'),
  lists: t.Array(t.String())
})

/** Pie Chart Response Schema */
export const PieResponseSchema = t.Object({
  data: t.Array(
    t.Object({
      name: t.String(),
      value: t.Number(),
      percentage: t.String(),
      syllable: t.String(),
      count: t.Number()
    })
  ),
  total: t.Number(),
  page: t.Number(),
  limit: t.Number(),
  totalPages: t.Number(),
  hasMore: t.Boolean(),
  format: t.Literal('pie'),
  lists: t.Array(t.String())
})

/** Success Response Schema (Union) */
export const SyllablesSuccessSchema = t.Union([
  SingleListResponseSchema,
  AllListsResponseSchema,
  ComparativeResponseSchema,
  PieResponseSchema
])

/** Error Response Schema */
export const SyllablesErrorSchema = t.Object({
  error: t.String(),
  message: t.Optional(t.String()),
  code: t.Optional(t.String())
})


export const SyllableItemSchema = t.Object({
  syllable: t.String(),
  count: t.Number()
})

export const AlphabetItemSchema = t.Object({
  letter: t.String(),
  count: t.Number()
})

export const LengthItemSchema = t.Object({
  length: t.Number(),
  count: t.Number()
})

export const UniqueLettersItemSchema = t.Object({
  uniqueLetters: t.Number(),
  count: t.Number()
})

// Schema simplifié basé sur tes types existants
export const ChartDataResponseSchema = t.Object({
  alphabet: t.Record(t.String(), t.Array(AlphabetItemSchema)),
  lengths: t.Record(t.String(), t.Array(LengthItemSchema)),
  uniqueLetters: t.Record(t.String(), t.Array(UniqueLettersItemSchema)),
  occ: t.Object({
    bottom: t.Record(t.String(), t.Array(SyllableItemSchema))
  })
})

export const ChartDataErrorSchema = t.Object({
  error: t.String(),
  message: t.Optional(t.String()),
  code: t.Optional(t.String())
})

export const ChartDataSuccessSchema = t.Object({
  success: t.Literal(true),
  data: ChartDataResponseSchema,
  timestamp: t.String()
})

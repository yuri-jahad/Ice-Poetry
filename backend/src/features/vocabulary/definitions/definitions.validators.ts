import {
  ErrorSchema,
  FlexibleResponseSchema,
  FlexibleSpecificSourceResponseSchema,
  WordIdParamsSchema,
  WordNameParamsSchema,
  WordIdAndSourceParamsSchema,
  WordNameAndSourceParamsSchema,
  StrictWordIdAndSourceParamsSchema,
  StrictWordNameAndSourceParamsSchema
} from '@definitions/definitions.schemas'

export const getDefinitionsByIdValidator = {
  params: WordIdParamsSchema,
  response: {
    200: FlexibleResponseSchema,
    404: ErrorSchema,
    500: ErrorSchema
  }
}

export const getDefinitionsByNameValidator = {
  params: WordNameParamsSchema, 
  response: {
    200: FlexibleResponseSchema,
    404: ErrorSchema, 
    500: ErrorSchema
  }
}

export const getDefinitionsBySpecificSourceValidator = {
  params: StrictWordIdAndSourceParamsSchema, 
  response: {
    200: FlexibleSpecificSourceResponseSchema,
    400: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema
  }
}

export const getDefinitionsByNameAndSourceValidator = {
  params: StrictWordNameAndSourceParamsSchema, 
  response: {
    200: FlexibleSpecificSourceResponseSchema,
    400: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema
  }
}

import {
  AddWordsBodySchema,
  AddWordsSuccessSchema,
  ErrorSchema,
  FindWordSuccessSchema,
  FindWordBodySchema,
  FindWordListBodySchema,
  DeleteWordParamsSchema,
  DeleteWordSuccessSchema,
  UpdateWordBodySchema,  
  UpdateWordSuccessSchema,
  UpdateWordParamsSchema
} from "@words/words.schemas";

export const findWordValidator = {
  body: FindWordBodySchema,
  response: {
    200: FindWordSuccessSchema,
    400: ErrorSchema,
    408: ErrorSchema,
    500: ErrorSchema,
  },
};

export const findWordListValidator = {
  body: FindWordListBodySchema,
  response: {
    200: FindWordListBodySchema,
    400: ErrorSchema,
    500: ErrorSchema,
  },
};

export const addWordsValidator = {
  body: AddWordsBodySchema,
  response: {
    201: AddWordsSuccessSchema,
    400: ErrorSchema,
    404: ErrorSchema,
    409: ErrorSchema,
    500: ErrorSchema,
  },
};

export const updateWordValidator = {
  params: UpdateWordParamsSchema, 
  body: UpdateWordBodySchema,
  response: {
    200: UpdateWordSuccessSchema,
    400: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
};

export const deleteWordValidator = {
  params: DeleteWordParamsSchema,
  response: {
    200: DeleteWordSuccessSchema,
    400: ErrorSchema,
    404: ErrorSchema,
    409: ErrorSchema,
    500: ErrorSchema,
  },
};
import {
  SyllablesErrorSchema,
  SyllablesRequestSchema,
  SyllablesSuccessSchema,
  ChartDataErrorSchema,
  ChartDataSuccessSchema
} from '@lists/lists.schemas'

export const syllablesValidator = {
  body: SyllablesRequestSchema,
  response: {
    200: SyllablesSuccessSchema,
    400: SyllablesErrorSchema,
    404: SyllablesErrorSchema,
    500: SyllablesErrorSchema
  }
}

export const getChartDataValidator = {
  response: {
    200: ChartDataSuccessSchema,
    404: ChartDataErrorSchema,
    500: ChartDataErrorSchema
  }
}

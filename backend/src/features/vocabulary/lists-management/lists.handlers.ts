import { getChartDataFast, getSyllablesData } from '@lists/lists.services'
import type { SyllablesResponseUnion } from '@lists/lists.types'
import type { SyllablesRequest } from './lists.types'

export async function getSyllablesHandler ({
  body
}: {
  body: SyllablesRequest
}): Promise<SyllablesResponseUnion> {
  const params = {
    page: body.page || 1,
    limit: body.limit || 10,
    order: body.order || 'desc',
    listName: body.listName,
    format: body.format || 'single',
    lists: body.lists || []
  }

  const result = getSyllablesData(params)

  if (!result) {
    throw new Error('Syllables data is not loaded or cache is empty')
  }

  return result
}



import { db } from "@database/database.config"

export const getDefinitionsQuery = (wordId: number) =>
  db
    .selectFrom('DEFINITIONS as d')
    .innerJoin('DICTIONARY_SOURCES as ds', 'ds.id', 'd.source_id')
    .select([
      'd.id',
      'd.word_id',
      'd.definition',
      'd.source_id',
      'd.created_at',
      'ds.name as source_name'
    ])
    .where('d.word_id', '=', wordId)
    .orderBy('d.source_id', 'asc') 

export const getDefinitionsByWordNameQuery = (wordName: string) =>
  db
    .selectFrom('DEFINITIONS as d')
    .innerJoin('WORDS as w', 'w.id', 'd.word_id')
    .innerJoin('DICTIONARY_SOURCES as ds', 'ds.id', 'd.source_id')
    .select([
      'd.id',
      'd.word_id',
      'd.definition',
      'd.source_id',
      'd.created_at',
      'ds.name as source_name',
      'w.word',
      'w.created_at as word_created_at',
      'w.creator_id'
    ])
    .where('w.word', '=', wordName)
    .orderBy('d.source_id', 'asc')

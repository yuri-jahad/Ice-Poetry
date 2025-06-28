export const VALIDATION_PATTERNS = {
  NUMERIC: '^[0-9]+$',
  USERNAME: '^[a-zA-Z0-9_-]+$'
} as const

export const SOURCE_IDS = {
  WIKTIONNAIRE: 1,
  UNIVERSALIS: 2,
  CORDIAL: 3,
  LAROUSSE: 5,
  LE_DICTIONNAIRE: 6,
  ROBERT: 7
} as const

export const SOURCE_NAMES = {
  [SOURCE_IDS.WIKTIONNAIRE]: 'Wiktionnaire',
  [SOURCE_IDS.UNIVERSALIS]: 'Universalis'
  // ...
} as const
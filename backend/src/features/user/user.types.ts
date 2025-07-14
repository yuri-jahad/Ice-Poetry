export type USER_ROLES = 'Demo' | 'Guest' | 'Moderator' | 'Administrator'

export interface User {
  id: number
  username: string
  role: USER_ROLES
  bio?: string | null
  syllable_color?: string
  password?: string
  location?: string | null
  image_path: string | null
}

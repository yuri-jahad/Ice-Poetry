import type { CreateUserRequest } from '@auth/auth.types'
import type { USERS } from '@database/database.types'
import { insertUserFixed } from '@auth/auth.repositories'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export async function createUser (
  userData: CreateUserRequest
): Promise<USERS | null> {
  try {
    const hashedPassword = await Bun.password.hash(userData.password, {
      algorithm: 'bcrypt',
      cost: 12
    })
    const userToInsert: Omit<USERS, 'id'> = {
      username: userData.username,
      password: hashedPassword,
      role: userData.role,
      image_path: userData.image_path || null
    }

    const newUser = await insertUserFixed(userToInsert)
    return newUser
  } catch (error) {
    console.error('Error creating user:', error)
    return null
  }
}

export class AvatarService {
  private static uploadCount = 0
  private static monthlyReset = new Date().getMonth()
  private static readonly MONTHLY_LIMIT = 500

  /**
   * 📊 Récupère le vrai usage depuis l'API Cloudinary
   */
  private static async getRealUploadCount (): Promise<number> {
    try {
      const usage = await cloudinary.api.usage()
      // Utilisez la métrique appropriée selon votre plan Cloudinary
      const count = usage.resources || usage.transformations || 0

      // S'assurer que c'est bien un nombre
      const numericCount = Number(count)
      return isNaN(numericCount) ? this.uploadCount : numericCount
    } catch (error) {
      console.warn('⚠️ Cannot fetch real usage from Cloudinary:', error)
      return this.uploadCount // fallback sur le compteur local
    }
  }

  /**
   * 🔍 Vérifie si une image existe déjà sur Cloudinary
   */
  private static async imageExists (publicId: string): Promise<boolean> {
    try {
      await cloudinary.api.resource(`avatars/${publicId}`)
      return true
    } catch (error: any) {
      if (error.error?.http_code === 404) {
        return false // Image n'existe pas
      }
      // Autre erreur - on assume qu'elle n'existe pas pour éviter les blocages
      console.warn(`⚠️ Error checking image existence: ${error.message}`)
      return false
    }
  }

  /**
   * ✅ Vérification hybride des limites mensuelles
   */
  static async canUpload (): Promise<boolean> {
    const currentMonth = new Date().getMonth()

    // Reset du compteur chaque mois
    if (currentMonth !== this.monthlyReset) {
      this.uploadCount = 0
      this.monthlyReset = currentMonth
      console.log('🔄 Monthly counter reset')
    }

    try {
      // Vérification hybride : API Cloudinary + compteur local
      const realUsage = await this.getRealUploadCount()
      console.log(
        `📊 Real Cloudinary usage: ${realUsage}/${this.MONTHLY_LIMIT}`
      )
      console.log(`📊 Local counter: ${this.uploadCount}/${this.MONTHLY_LIMIT}`)

      return realUsage < this.MONTHLY_LIMIT
    } catch (error) {
      console.warn('⚠️ Fallback to local counter due to API error')
      return this.uploadCount < this.MONTHLY_LIMIT
    }
  }

  /**
   * 📤 Upload optimisé avec overwrite forcé et gestion intelligente des crédits
   */
  static async uploadAvatar (userId: number, file: Buffer, mimeType: string) {
    console.log(`🔄 Attempting to upload avatar for user ${userId}`)

    // 🔍 Vérifications des variables d'environnement
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('CLOUDINARY_CLOUD_NAME not configured in .env file')
    }
    if (!process.env.CLOUDINARY_API_KEY) {
      throw new Error('CLOUDINARY_API_KEY not configured in .env file')
    }
    if (!process.env.CLOUDINARY_API_SECRET) {
      throw new Error('CLOUDINARY_API_SECRET not configured in .env file')
    }

    // 📊 Vérification hybride des limites
    const canUploadResult = await this.canUpload()
    if (!canUploadResult) {
      throw new Error(
        'Monthly upload limit reached. Please try again next month.'
      )
    }

    const base64File = `data:${mimeType};base64,${file.toString('base64')}`

    try {
      // 🔥 PUBLIC_ID FIXE pour garantir l'overwrite
      const publicId = `user_${userId}` // ← PAS de timestamp !

      console.log(
        `🗂️ Using fixed public_id: ${publicId} (will overwrite existing)`
      )
      console.log('🔑 Cloudinary config:', {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY
          ? `${process.env.CLOUDINARY_API_KEY.substring(0, 6)}...`
          : 'MISSING',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
      })

      // 🔍 Vérifier si l'image existe déjà pour déterminer si c'est un overwrite
      const isOverwrite = await this.imageExists(publicId)

      if (isOverwrite) {
        console.log(
          `♻️ Image exists - this will be an overwrite (no additional credit)`
        )
      } else {
        console.log(`➕ New image - will consume 1 credit`)
      }

      const uploadResult = await cloudinary.uploader.upload(base64File, {
        folder: 'avatars',
        public_id: publicId, // ← Toujours le même = overwrite automatique
        transformation: [
          {
            width: 200,
            height: 200,
            crop: 'fill',
            gravity: 'face',
            quality: 80, // Optimisé pour la taille et la qualité
            format: 'webp' // Format moderne plus léger
          }
        ],
        overwrite: true,
        invalidate: true,
        resource_type: 'image'
      })

      // 📈 Mise à jour du compteur local seulement si nouvelle image
      if (!isOverwrite) {
        this.uploadCount++
        console.log(
          `📈 New upload counted. Local count: ${this.uploadCount}/${this.MONTHLY_LIMIT}`
        )
      } else {
        console.log(
          `♻️ Overwrite - no credit consumed. Local count remains: ${this.uploadCount}/${this.MONTHLY_LIMIT}`
        )
      }

      console.log(
        `✅ Avatar ${
          isOverwrite ? 'replaced' : 'uploaded'
        } successfully for user ${userId}`
      )
      console.log(`📊 Upload result:`, uploadResult.secure_url)

      // 📊 Afficher le vrai usage après upload
      try {
        const realUsageAfter = await this.getRealUploadCount()
        console.log(
          `📊 Real Cloudinary usage after upload: ${realUsageAfter}/${this.MONTHLY_LIMIT}`
        )
      } catch (error) {
        console.log(
          `📊 Local count after upload: ${this.uploadCount}/${this.MONTHLY_LIMIT}`
        )
      }

      return uploadResult
    } catch (error: any) {
      console.error('❌ Cloudinary upload error:', error)

      if (error.message?.includes('api_key')) {
        throw new Error(
          'Cloudinary API key is missing or invalid. Check your .env configuration.'
        )
      }
      if (
        error.message?.includes('quota') ||
        error.message?.includes('credits') ||
        error.message?.includes('limit')
      ) {
        throw new Error(
          'Monthly upload limit reached on Cloudinary. Please try again next month.'
        )
      }

      throw new Error(`Upload failed: ${error.message || 'Unknown error'}`)
    }
  }

  /**
   * 🖼️ Génération d'URLs optimisées
   */
  static getAvatarUrl (
    userId: number,
    size: 'small' | 'medium' | 'large' = 'large'
  ): string {
    const sizes = {
      small: { width: 50, height: 50 },
      medium: { width: 100, height: 100 },
      large: { width: 200, height: 200 }
    }

    return cloudinary.url(`avatars/user_${userId}`, {
      ...sizes[size],
      crop: 'fill',
      gravity: 'face',
      quality: 80,
      format: 'webp',
      secure: true,
      // Fallback vers avatar par défaut si pas d'image
      flags: 'fallback_image',
      default_image: 'default-avatar.png'
    })
  }

  /**
   * 📊 Statistiques d'utilisation pour monitoring (version améliorée)
   */
  static async getUsageStats () {
    try {
      const realUsage = await this.getRealUploadCount()
      const cloudinaryUsage = await cloudinary.api.usage()

      // S'assurer que tous les nombres sont valides
      const safeRealUsage = Number(realUsage) || 0
      const safeLocalCount = Number(this.uploadCount) || 0

      return {
        uploadsThisMonth: safeRealUsage,
        localCount: safeLocalCount,
        remainingUploads: Math.max(0, this.MONTHLY_LIMIT - safeRealUsage),
        percentageUsed: Math.round((safeRealUsage / this.MONTHLY_LIMIT) * 100),
        resetDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ).toISOString(),
        isNearLimit: safeRealUsage > 400,
        cloudinaryData: {
          resources: Number(cloudinaryUsage.resources) || 0,
          transformations: Number(cloudinaryUsage.transformations) || 0,
          storage: Number(cloudinaryUsage.storage) || 0
        }
      }
    } catch (error) {
      // Fallback en cas d'erreur API - s'assurer que tous sont des nombres
      const safeLocalCount = Number(this.uploadCount) || 0

      return {
        uploadsThisMonth: safeLocalCount,
        localCount: safeLocalCount,
        remainingUploads: Math.max(0, this.MONTHLY_LIMIT - safeLocalCount),
        percentageUsed: Math.round((safeLocalCount / this.MONTHLY_LIMIT) * 100),
        resetDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ).toISOString(),
        isNearLimit: safeLocalCount > 400,
        error: 'Could not fetch Cloudinary usage data'
      }
    }
  }

  /**
   * 🔍 Vérification si un avatar existe
   */
  static async avatarExists (userId: number): Promise<boolean> {
    return await this.imageExists(`user_${userId}`)
  }

  /**
   * 🗑️ Méthode pour supprimer un avatar
   */
  static async deleteAvatar (userId: number): Promise<boolean> {
    try {
      console.log(`🗑️ Attempting to delete avatar for user ${userId}`)

      const result = await cloudinary.uploader.destroy(`avatars/user_${userId}`)

      if (result.result === 'ok') {
        console.log(`✅ Avatar deleted for user ${userId}`)

        // Afficher l'usage après suppression
        try {
          const realUsage = await this.getRealUploadCount()
          console.log(
            `📊 Usage after deletion: ${realUsage}/${this.MONTHLY_LIMIT}`
          )
        } catch (error) {
          console.log(
            `📊 Local count: ${this.uploadCount}/${this.MONTHLY_LIMIT}`
          )
        }

        return true
      } else {
        console.log(`⚠️ Avatar not found or already deleted for user ${userId}`)
        return false
      }
    } catch (error) {
      console.error(`❌ Error deleting avatar for user ${userId}:`, error)
      return false
    }
  }

  /**
   * 🔄 Reset manuel du compteur local (pour debug/maintenance)
   */
  static resetLocalCounter () {
    this.uploadCount = 0
    console.log('🔄 Local upload counter reset to 0')
  }
}

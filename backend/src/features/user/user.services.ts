import type { CreateUserRequest } from '@auth/auth.types'

import { insertUserFixed } from '@auth/auth.repositories'
import { v2 as cloudinary } from 'cloudinary'
import type { User } from '@user/user.types'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export async function createUser (
  userData: CreateUserRequest
): Promise<User | null> {
  try {
    const hashedPassword = await Bun.password.hash(userData.password, {
      algorithm: 'bcrypt',
      cost: 12
    })
    const userToInsert: Omit<User, 'id'> = {
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

// 🎯 Types pour une meilleure sécurité de type
interface UploadResult {
  secure_url: string
  public_id: string
  format: string
  width: number
  height: number
  bytes: number
  resource_type: string
  optimized_urls: OptimizedUrls
  is_overwrite: boolean
}

interface OptimizedUrls {
  webp?: string
  avif?: string
  mp4?: string
  webm?: string
  poster?: string
  original: string
}

interface UsageStats {
  uploadsThisMonth: number
  localCount: number
  remainingUploads: number
  percentageUsed: number
  resetDate: string
  isNearLimit: boolean
  cloudinaryData?: {
    resources: number
    transformations: number
    storage: number
  }
  error?: string
}

interface MediaTypeConfig {
  resource_type: 'image' | 'video'
  transformations: any[]
  eager_transformations: any[]
  formats: string[]
}

export class AvatarService {
  private static uploadCount = 0
  private static monthlyReset = new Date().getMonth()
  private static readonly MONTHLY_LIMIT = 500

  private static readonly MEDIA_CONFIGS: Record<string, MediaTypeConfig> = {
    image: {
      resource_type: 'image',
      transformations: [
        {
          width: 200,
          height: 200,
          crop: 'fill',
          gravity: 'face',
          quality: 'auto:good',
          format: 'auto',
          dpr: 'auto',
          fetch_format: 'auto'
        }
      ],
      eager_transformations: [
        { format: 'webp', quality: 'auto:good' },
        { format: 'avif', quality: 'auto:good' },
        { format: 'jpg', quality: 'auto:good' }
      ],
      formats: ['webp', 'avif', 'jpg']
    },
    gif: {
      resource_type: 'video',
      transformations: [
        {
          width: 200,
          height: 200,
          crop: 'fill',
          gravity: 'center',
          quality: 'auto:good',
          video_codec: 'auto',
          format: 'auto',
          flags: 'streaming_attachment',
          bit_rate: '400k',
          fps: 12
        }
      ],
      eager_transformations: [
        { format: 'mp4', video_codec: 'h264', quality: 'auto:good' },
        { format: 'webm', video_codec: 'vp9', quality: 'auto:good' },
        { format: 'jpg', video_sampling: 'auto' } // Poster frame
      ],
      formats: ['mp4', 'webm', 'jpg']
    },

    video: {
      resource_type: 'video',
      transformations: [
        {
          width: 200,
          height: 200,
          crop: 'fill',
          gravity: 'center',
          quality: 'auto:good',
          video_codec: 'auto',
          bit_rate: '500k',
          fps: 15
        }
      ],
      eager_transformations: [
        { format: 'mp4', video_codec: 'h264' },
        { format: 'webm', video_codec: 'vp9' },
        { format: 'jpg', video_sampling: 'auto' }
      ],
      formats: ['mp4', 'webm', 'jpg']
    }
  }

  // 🧩 Cache pour éviter les appels API répétés
  private static cache = new Map<string, { data: any; timestamp: number }>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * 💾 Système de cache intelligent
   */
  private static getCached<T> (key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T
    }
    this.cache.delete(key)
    return null
  }

  private static setCache (key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * 🔍 Détection intelligente du type de média
   */
  private static detectMediaType (
    mimeType: string,
    fileName?: string
  ): 'image' | 'gif' | 'video' {
    // Vérification par MIME type d'abord
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType === 'image/gif') return 'gif'

    // Vérification par extension de fichier
    if (fileName) {
      const ext = fileName.toLowerCase().split('.').pop()
      if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return 'video'
      if (ext === 'gif') return 'gif'
    }

    return 'image'
  }

  /**
   * 🌐 Génération intelligente d'URLs optimisées
   */
  private static generateOptimizedUrls (
    publicId: string,
    mediaType: string,
    originalFormat: string
  ): OptimizedUrls {
    const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}`
    const basePath = `${baseUrl}/${
      mediaType === 'video' ? 'video' : 'image'
    }/upload`
    const baseTransform = 'w_200,h_200,c_fill,g_face,q_auto:good'

    const urls: OptimizedUrls = {
      original: `${basePath}/${baseTransform}/${publicId}.${originalFormat}`
    }

    // 🖼️ URLs pour images
    if (mediaType === 'image') {
      urls.webp = `${basePath}/${baseTransform},f_webp/${publicId}.webp`
      urls.avif = `${basePath}/${baseTransform},f_avif/${publicId}.avif`
    }

    // 🎬 URLs pour vidéos/GIFs
    if (mediaType === 'gif' || mediaType === 'video') {
      urls.mp4 = `${baseUrl}/video/upload/${baseTransform},f_mp4,vc_h264,br_400k,fps_12/${publicId}.mp4`
      urls.webm = `${baseUrl}/video/upload/${baseTransform},f_webm,vc_vp9,br_400k,fps_12/${publicId}.webm`
      urls.poster = `${baseUrl}/video/upload/${baseTransform},f_jpg,so_auto/${publicId}.jpg`
    }

    return urls
  }

  /**
   * 🔧 Validation des variables d'environnement avec cache
   */
  private static validateCloudinaryConfig (): void {
    const cacheKey = 'cloudinary-config-validated'
    const cached = this.getCached<boolean>(cacheKey)

    if (cached) return

    const requiredEnvVars = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET'
    ]

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`${envVar} not configured in .env file`)
      }
    }

    this.setCache(cacheKey, true)
  }

  /**
   * 📊 Récupération optimisée de l'usage réel avec cache
   */
  private static async getRealUploadCount (): Promise<number> {
    const cacheKey = 'real-upload-count'
    const cached = this.getCached<number>(cacheKey)

    if (cached !== null) return cached

    try {
      const usage = await cloudinary.api.usage()
      const count = usage.resources || usage.transformations || 0
      const numericCount = Number(count)
      const finalCount = isNaN(numericCount) ? this.uploadCount : numericCount

      // Cache court pour l'usage (1 minute)
      this.cache.set(cacheKey, {
        data: finalCount,
        timestamp: Date.now() - (this.CACHE_TTL - 60000)
      })

      return finalCount
    } catch (error) {
      console.warn('⚠️ Cannot fetch real usage from Cloudinary:', error)
      return this.uploadCount
    }
  }

  /**
   * 🔍 Vérification d'existence avec cache
   */
  private static async imageExists (publicId: string): Promise<boolean> {
    const cacheKey = `image-exists-${publicId}`
    const cached = this.getCached<boolean>(cacheKey)

    if (cached !== null) return cached

    try {
      await cloudinary.api.resource(`avatars/${publicId}`)
      this.setCache(cacheKey, true)
      return true
    } catch (error: any) {
      const exists = error.error?.http_code !== 404
      if (error.error?.http_code === 404) {
        this.setCache(cacheKey, false)
      }

      if (error.error?.http_code !== 404) {
        console.warn(`⚠️ Error checking image existence: ${error.message}`)
      }

      return exists
    }
  }

  /**
   * ✅ Vérification hybride des limites avec cache intelligent
   */
  static async canUpload (): Promise<boolean> {
    const currentMonth = new Date().getMonth()

    // Reset mensuel automatique
    if (currentMonth !== this.monthlyReset) {
      this.uploadCount = 0
      this.monthlyReset = currentMonth
      this.cache.clear() // Clear cache lors du reset mensuel
      console.log('🔄 Monthly counter reset and cache cleared')
    }

    try {
      const realUsage = await this.getRealUploadCount()
      console.log(
        `📊 Usage check - Real: ${realUsage}/${this.MONTHLY_LIMIT}, Local: ${this.uploadCount}/${this.MONTHLY_LIMIT}`
      )

      return realUsage < this.MONTHLY_LIMIT
    } catch (error) {
      console.warn('⚠️ Fallback to local counter due to API error')
      return this.uploadCount < this.MONTHLY_LIMIT
    }
  }

  /**
   * 📤 Upload ultra-optimisé avec support multi-format
   */
  static async uploadAvatar (
    userId: number,
    file: Buffer,
    mimeType: string,
    fileName?: string
  ): Promise<UploadResult> {
    console.log(`🚀 Starting optimized avatar upload for user ${userId}`)

    // 🔧 Validations
    this.validateCloudinaryConfig()

    const canUploadResult = await this.canUpload()
    if (!canUploadResult) {
      throw new Error(
        'Monthly upload limit reached. Please try again next month.'
      )
    }

    // 🎯 Détection et configuration
    const mediaType = this.detectMediaType(mimeType, fileName)
    const config = this.MEDIA_CONFIGS[mediaType] || this.MEDIA_CONFIGS.image
    const publicId = `user_${userId}`

    console.log(`📱 Detected media type: ${mediaType} (${mimeType})`)

    // 🔍 Vérification d'existence
    const isOverwrite = await this.imageExists(publicId)
    console.log(
      `${isOverwrite ? '♻️ Replacing' : '➕ Creating'} avatar (${mediaType})`
    )

    try {
      const base64File = `data:${mimeType};base64,${file.toString('base64')}`

      // 🚀 Configuration d'upload optimisée
      const uploadOptions = {
        folder: 'avatars',
        public_id: publicId,
        resource_type: config.resource_type,
        transformation: config.transformations,
        overwrite: true,
        invalidate: true,
        use_filename: false,
        unique_filename: false,
        // 🎯 Génération eager pour formats optimisés
        eager: config.eager_transformations.map(transform => ({
          transformation: { ...config.transformations[0], ...transform }
        })),
        eager_async: false, // Génération synchrone pour disponibilité immédiate
        // 🗂️ Métadonnées utiles
        context: {
          user_id: userId.toString(),
          upload_type: 'avatar',
          media_type: mediaType,
          timestamp: new Date().toISOString()
        }
      }

      console.log(
        `🔧 Upload config: ${config.resource_type} with ${config.eager_transformations.length} eager formats`
      )

      // 📤 Upload principal
      const uploadResult = await cloudinary.uploader.upload(
        base64File,
        uploadOptions
      )

      // 📊 Gestion du compteur intelligent
      if (!isOverwrite) {
        this.uploadCount++
        console.log(
          `📈 Credit consumed. Count: ${this.uploadCount}/${this.MONTHLY_LIMIT}`
        )
      } else {
        console.log(
          `♻️ Overwrite - no credit consumed. Count: ${this.uploadCount}/${this.MONTHLY_LIMIT}`
        )
      }

      // 🌐 Génération des URLs optimisées
      const optimizedUrls = this.generateOptimizedUrls(
        publicId,
        config.resource_type,
        uploadResult.format
      )

      // 🗑️ Invalidation cache
      this.cache.delete(`image-exists-${publicId}`)
      this.cache.delete('real-upload-count')

      const result: UploadResult = {
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        bytes: uploadResult.bytes,
        resource_type: uploadResult.resource_type,
        optimized_urls: optimizedUrls,
        is_overwrite: isOverwrite
      }

      console.log(
        `✅ Avatar ${isOverwrite ? 'replaced' : 'uploaded'} successfully`
      )
      console.log(`🔗 Main URL: ${result.secure_url}`)
      console.log(
        `🌐 Optimized formats: ${Object.keys(optimizedUrls)
          .filter(k => k !== 'original')
          .join(', ')}`
      )
      console.log(
        `💾 Saved ~${this.calculateSavings(
          uploadResult.bytes,
          mediaType
        )}% bandwidth`
      )

      // 📊 Affichage usage final
      try {
        const realUsage = await this.getRealUploadCount()
        console.log(
          `📊 Real usage after upload: ${realUsage}/${this.MONTHLY_LIMIT}`
        )
      } catch (error) {
        console.log(`📊 Local count: ${this.uploadCount}/${this.MONTHLY_LIMIT}`)
      }

      return result
    } catch (error: any) {
      console.error('❌ Optimized upload error:', error)

      // 🚨 Gestion d'erreurs améliorée
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
      if (error.message?.includes('timeout')) {
        throw new Error('Upload timeout. Please try again with a smaller file.')
      }
      if (error.message?.includes('format')) {
        throw new Error(
          'Unsupported file format. Please use JPEG, PNG, GIF, WebP, or MP4.'
        )
      }

      throw new Error(`Upload failed: ${error.message || 'Unknown error'}`)
    }
  }

  /**
   * 📊 Calcul des économies de bande passante
   */
  private static calculateSavings (
    originalBytes: number,
    mediaType: string
  ): number {
    const savings = {
      image: 30, // WebP/AVIF vs JPEG/PNG
      gif: 80, // MP4/WebM vs GIF
      video: 20 // Compression optimisée
    }
    return savings[mediaType as keyof typeof savings] || 0
  }

  /**
   * 🖼️ Génération d'URLs avec détection automatique du format optimal
   */
  static getAvatarUrl (
    userId: number,
    size: 'small' | 'medium' | 'large' = 'large',
    preferredFormat?: 'webp' | 'avif' | 'mp4' | 'webm' | 'auto'
  ): string {
    const sizes = {
      small: { width: 50, height: 50 },
      medium: { width: 100, height: 100 },
      large: { width: 200, height: 200 }
    }

    const baseConfig = {
      ...sizes[size],
      crop: 'fill',
      gravity: 'face',
      quality: 'auto:good',
      secure: true,
      flags: 'fallback_image',
      default_image: 'default-avatar.png'
    }

    // 🎯 Format intelligent basé sur le support navigateur
    if (preferredFormat === 'auto' || !preferredFormat) {
      return cloudinary.url(`avatars/user_${userId}`, {
        ...baseConfig,
        format: 'auto', // Cloudinary choisit automatiquement
        fetch_format: 'auto'
      })
    }

    return cloudinary.url(`avatars/user_${userId}`, {
      ...baseConfig,
      format: preferredFormat
    })
  }

  /**
   * 🌐 Génération d'un set complet d'URLs pour différents formats
   */
  static getOptimizedAvatarUrls (
    userId: number,
    size: 'small' | 'medium' | 'large' = 'large'
  ): OptimizedUrls {
    const publicId = `user_${userId}`
    const mediaType = 'image' // On assume image par défaut, pourrait être détecté

    return this.generateOptimizedUrls(`avatars/${publicId}`, mediaType, 'auto')
  }

  /**
   * 📊 Statistiques avancées avec métriques de performance
   */
  static async getUsageStats (): Promise<UsageStats> {
    const cacheKey = 'usage-stats'
    const cached = this.getCached<UsageStats>(cacheKey)

    if (cached) return cached

    try {
      const realUsage = await this.getRealUploadCount()
      const cloudinaryUsage = await cloudinary.api.usage()

      const safeRealUsage = Number(realUsage) || 0
      const safeLocalCount = Number(this.uploadCount) || 0

      const stats: UsageStats = {
        uploadsThisMonth: safeRealUsage,
        localCount: safeLocalCount,
        remainingUploads: Math.max(0, this.MONTHLY_LIMIT - safeRealUsage),
        percentageUsed: Math.round((safeRealUsage / this.MONTHLY_LIMIT) * 100),
        resetDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ).toISOString(),
        isNearLimit: safeRealUsage > this.MONTHLY_LIMIT * 0.8, // 80% du limit
        cloudinaryData: {
          resources: Number(cloudinaryUsage.resources) || 0,
          transformations: Number(cloudinaryUsage.transformations) || 0,
          storage: Number(cloudinaryUsage.storage) || 0
        }
      }

      // Cache pendant 2 minutes
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now() - (this.CACHE_TTL - 120000)
      })

      return stats
    } catch (error) {
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
        isNearLimit: safeLocalCount > this.MONTHLY_LIMIT * 0.8,
        error: 'Could not fetch Cloudinary usage data'
      }
    }
  }

  /**
   * 🔍 Vérification d'existence publique
   */
  static async avatarExists (userId: number): Promise<boolean> {
    return await this.imageExists(`user_${userId}`)
  }

  /**
   * 🗑️ Suppression optimisée avec nettoyage cache
   */
  static async deleteAvatar (userId: number): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting avatar for user ${userId}`)

      const publicId = `user_${userId}`

      // 🚀 Suppression en parallèle des différents formats
      const deletePromises = [
        cloudinary.uploader.destroy(`avatars/${publicId}`, {
          resource_type: 'image'
        }),
        cloudinary.uploader.destroy(`avatars/${publicId}`, {
          resource_type: 'video'
        })
      ]

      const results = await Promise.allSettled(deletePromises)
      const successful = results.some(
        result => result.status === 'fulfilled' && result.value.result === 'ok'
      )

      if (successful) {
        console.log(`✅ Avatar deleted for user ${userId}`)

        // 🗑️ Nettoyage cache
        this.cache.delete(`image-exists-${publicId}`)
        this.cache.delete('real-upload-count')
        this.cache.delete('usage-stats')

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
   * 🔄 Utilitaires de maintenance
   */
  static resetLocalCounter (): void {
    this.uploadCount = 0
    console.log('🔄 Local upload counter reset to 0')
  }

  static clearCache (): void {
    this.cache.clear()
    console.log('🗑️ Cache cleared')
  }

  static getCacheStats (): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * 🩺 Health check pour monitoring
   */
  static async healthCheck (): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    cloudinary_api: boolean
    upload_capacity: boolean
    cache_size: number
    errors: string[]
  }> {
    const errors: string[] = []
    let cloudinaryApi = false
    let uploadCapacity = false

    try {
      // Test API Cloudinary
      await cloudinary.api.ping()
      cloudinaryApi = true
    } catch (error) {
      errors.push('Cloudinary API unreachable')
    }

    try {
      // Test capacité d'upload
      uploadCapacity = await this.canUpload()
      if (!uploadCapacity) {
        errors.push('Upload limit reached')
      }
    } catch (error) {
      errors.push('Cannot check upload capacity')
    }

    const status =
      errors.length === 0
        ? 'healthy'
        : errors.length === 1
        ? 'degraded'
        : 'unhealthy'

    const z = {
      status,
      cloudinary_api: cloudinaryApi,
      upload_capacity: uploadCapacity,
      cache_size: this.cache.size,
      errors
    } as any

    console.log(z)
    return z
  }
}

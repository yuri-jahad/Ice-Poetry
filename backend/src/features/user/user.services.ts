import { unlink, mkdir, readdir, access } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import type { CreateUserRequest } from '@auth/auth.types'
import { insertUserFixed } from '@auth/auth.repositories'
import type { User } from '@user/user.types'

// 🎯 Types pour compatibilité avec votre code existant
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
  webm?: string
  original: string
  small?: string
  medium?: string
  large?: string
}

interface UsageStats {
  uploadsThisMonth: number
  localCount: number
  remainingUploads: number
  percentageUsed: number
  resetDate: string
  isNearLimit: boolean
  diskUsage: {
    totalFiles: number
    totalSizeMB: number
    averageCompressionRatio: number
    estimatedSavingsMB: number
  }
  error?: string
}

// 🚀 SERVICE AVATAR LOCAL SIMPLIFIÉ - 2 images par utilisateur max
export class AvatarService {
  private static uploadCount = 0
  private static monthlyReset = new Date().getMonth()
  private static readonly MONTHLY_LIMIT = 10000
  private static readonly UPLOAD_DIR = './public/uploads/avatars'
  private static readonly TEMP_DIR = './public/uploads/temp'
  private static readonly BASE_URL =
    process.env.BASE_URL || 'http://localhost:3000'
  private static readonly MAX_SIZE = 10 * 1024 * 1024 // 10MB
  private static ffmpegAvailable: boolean | null = null

  // 🎯 Configuration simplifiée - seulement 2 tailles
  private static readonly AVATAR_SIZES = {
    small: { width: 50, height: 50, quality: 80 },
    medium: { width: 150, height: 150, quality: 85 }
  }

  // 🧩 Cache intelligent
  private static cache = new Map<string, { data: any; timestamp: number }>()
  private static readonly CACHE_TTL = 10 * 60 * 1000 // 10 minutes

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

  private static async ensureUploadDir (): Promise<void> {
    try {
      await access(this.UPLOAD_DIR)
    } catch {
      await mkdir(this.UPLOAD_DIR, { recursive: true })
    }

    try {
      await access(this.TEMP_DIR)
    } catch {
      await mkdir(this.TEMP_DIR, { recursive: true })
    }
  }

  /**
   * 🔧 Vérification de la disponibilité de FFmpeg
   */
  private static async checkFFmpeg (): Promise<boolean> {
    if (this.ffmpegAvailable !== null) {
      return this.ffmpegAvailable
    }

    try {
      const child = spawn('ffmpeg', ['-version'], { stdio: 'pipe' })
      const result = await new Promise<boolean>(resolve => {
        child.on('close', code => resolve(code === 0))
        child.on('error', () => resolve(false))
        setTimeout(() => {
          child.kill()
          resolve(false)
        }, 3000)
      })

      this.ffmpegAvailable = result
      console.log(`🎬 FFmpeg ${result ? 'available' : 'not available'}`)
      return result
    } catch {
      this.ffmpegAvailable = false
      return false
    }
  }

  /**
   * 🎬 Exécution de commande FFmpeg
   */
  private static async runFFmpeg (args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('ffmpeg', args, { stdio: 'pipe' })

      let stderr = ''
      child.stderr?.on('data', data => {
        stderr += data.toString()
      })

      child.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
        }
      })

      child.on('error', error => {
        reject(error)
      })

      setTimeout(() => {
        child.kill()
        reject(new Error('FFmpeg timeout'))
      }, 30000)
    })
  }

  /**
   * 🔍 Détection du type de média
   */
  private static detectMediaType (mimeType: string): 'image' | 'gif' | 'video' {
    if (mimeType === 'image/gif') return 'gif'
    if (mimeType.startsWith('video/')) return 'video'
    return 'image'
  }

  /**
   * 🗑️ Nettoyage complet des anciens avatars d'un utilisateur
   */
  private static async deleteOldAvatars (userId: number): Promise<void> {
    try {
      const files = await readdir(this.UPLOAD_DIR)
      const userFiles = files.filter(
        file =>
          file.startsWith(`user_${userId}_`) ||
          file.startsWith(`user_${userId}.`)
      )

      if (userFiles.length > 0) {
        await Promise.all(
          userFiles.map(file =>
            unlink(join(this.UPLOAD_DIR, file)).catch(() => null)
          )
        )
        console.log(
          `🗑️ Cleaned ${userFiles.length} old avatar files for user ${userId}`
        )
      }
    } catch (error) {
      console.warn('Could not clean old avatars:', error)
    }
  }

  /**
   * 🎞️ Traitement optimisé des GIFs/Vidéos avec FFmpeg
   */
  private static async processAnimatedMedia (
    inputBuffer: Buffer,
    userId: number,
    timestamp: number,
    mediaType: 'gif' | 'video'
  ): Promise<{ processed: Record<string, Buffer>; metadata: any }> {
    const ffmpegAvailable = await this.checkFFmpeg()
    if (!ffmpegAvailable) {
      throw new Error(
        'FFmpeg is required for GIF/Video processing but not available'
      )
    }

    const tempInput = join(
      this.TEMP_DIR,
      `input_${userId}_${timestamp}.${mediaType === 'gif' ? 'gif' : 'mp4'}`
    )
    await Bun.write(tempInput, inputBuffer)

    const processed: Record<string, Buffer> = {}
    const baseFilename = `user_${userId}_${timestamp}`

    try {
      // 🎯 Génération des 2 tailles optimisées en WebM (meilleur format pour animations)
      for (const [size, config] of Object.entries(this.AVATAR_SIZES)) {
        const outputFile = join(this.UPLOAD_DIR, `${baseFilename}_${size}.webm`)

        await this.runFFmpeg([
          '-i',
          tempInput,
          '-vf',
          `scale=${config.width}:${config.height}:flags=lanczos`,
          '-c:v',
          'libvpx-vp9',
          '-crf',
          '30',
          '-b:v',
          '0',
          '-pix_fmt',
          'yuva420p',
          '-an', // Pas d'audio
          '-f',
          'webm',
          '-y',
          outputFile
        ])

        const buffer = await Bun.file(outputFile).arrayBuffer()
        processed[size] = Buffer.from(buffer)
      }

      return {
        processed,
        metadata: {
          width: this.AVATAR_SIZES.medium.width,
          height: this.AVATAR_SIZES.medium.height,
          format: 'webm',
          originalSize: inputBuffer.length,
          compressedSizes: Object.fromEntries(
            Object.entries(processed).map(([key, buffer]) => [
              key,
              buffer.length
            ])
          )
        }
      }
    } finally {
      await unlink(tempInput).catch(() => null)
    }
  }

  /**
   * 🖼️ Traitement optimisé des images statiques
   */
  private static async processStaticImage (
    inputBuffer: Buffer,
    userId: number,
    timestamp: number
  ): Promise<{ processed: Record<string, Buffer>; metadata: any }> {
    const image = sharp(inputBuffer)
    const metadata = await image.metadata()
    const processed: Record<string, Buffer> = {}
    const baseFilename = `user_${userId}_${timestamp}`

    console.log(
      `📊 Processing ${metadata.format} ${metadata.width}x${
        metadata.height
      } (${(inputBuffer.length / 1024).toFixed(1)}KB)`
    )

    // 🎯 Génération des 2 tailles optimisées
    for (const [size, config] of Object.entries(this.AVATAR_SIZES)) {
      const baseImage = image.clone().resize(config.width, config.height, {
        fit: 'cover',
        position: 'centre'
      })

      // Essayer AVIF d'abord (meilleur format), puis WebP, puis JPEG
      let buffer: Buffer
      let format: string
      let extension: string

      try {
        // 1. AVIF (meilleur compression)
        buffer = await baseImage
          .clone()
          .avif({
            quality: config.quality,
            effort: 6
          })
          .toBuffer()
        format = 'avif'
        extension = 'avif'
      } catch {
        try {
          // 2. WebP (fallback)
          buffer = await baseImage
            .clone()
            .webp({
              quality: config.quality,
              effort: 6
            })
            .toBuffer()
          format = 'webp'
          extension = 'webp'
        } catch {
          // 3. JPEG (compatibilité maximale)
          buffer = await baseImage
            .clone()
            .jpeg({
              quality: config.quality,
              progressive: true
            })
            .toBuffer()
          format = 'jpeg'
          extension = 'jpg'
        }
      }

      // Sauvegarde du fichier
      const filename = `${baseFilename}_${size}.${extension}`
      await Bun.write(join(this.UPLOAD_DIR, filename), buffer)
      processed[size] = buffer

      console.log(
        `✅ Generated ${size} avatar: ${filename} (${(
          buffer.length / 1024
        ).toFixed(1)}KB, ${format})`
      )
    }

    return {
      processed,
      metadata: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: 'optimized',
        originalSize: inputBuffer.length,
        compressedSizes: Object.fromEntries(
          Object.entries(processed).map(([key, buffer]) => [key, buffer.length])
        )
      }
    }
  }

  /**
   * 🌐 Génération d'URLs optimisées simplifiées
   */
  private static generateOptimizedUrls (
    userId: number,
    timestamp: number,
    format: string
  ): OptimizedUrls {
    const baseUrl = `${this.BASE_URL}/uploads/avatars`
    const baseFilename = `user_${userId}_${timestamp}`
    const extension = format === 'webm' ? 'webm' : 'avif' // Prioriser AVIF pour les images

    return {
      original: `${baseUrl}/${baseFilename}_medium.${extension}`,
      small: `${baseUrl}/${baseFilename}_small.${extension}`,
      medium: `${baseUrl}/${baseFilename}_medium.${extension}`,
      large: `${baseUrl}/${baseFilename}_medium.${extension}`, // Même que medium pour compatibilité
      webp: `${baseUrl}/${baseFilename}_medium.${extension}`,
      avif:
        format !== 'webm'
          ? `${baseUrl}/${baseFilename}_medium.${extension}`
          : undefined,
      webm:
        format === 'webm'
          ? `${baseUrl}/${baseFilename}_medium.${extension}`
          : undefined
    }
  }

  /**
   * 📤 Upload principal simplifié
   */
  static async uploadAvatar (
    userId: number,
    file: Buffer,
    mimeType: string,
    fileName?: string
  ): Promise<UploadResult> {
    if (file.length > this.MAX_SIZE) {
      throw new Error('File too large. Maximum 10MB allowed.')
    }

    await this.ensureUploadDir()

    try {
      const mediaType = this.detectMediaType(mimeType)
      const timestamp = Date.now()

      console.log(`📁 Detected media type: ${mediaType}`)

      await this.deleteOldAvatars(userId)

      let processed: Record<string, Buffer>
      let metadata: any
      let finalFormat: string

      if (mediaType === 'gif' || mediaType === 'video') {
        const result = await this.processAnimatedMedia(
          file,
          userId,
          timestamp,
          mediaType
        )
        processed = result.processed
        metadata = result.metadata
        finalFormat = 'webm'
      } else {
        const result = await this.processStaticImage(file, userId, timestamp)
        processed = result.processed
        metadata = result.metadata
        finalFormat = 'avif'
      }

      this.uploadCount++

      const optimizedUrls = this.generateOptimizedUrls(
        userId,
        timestamp,
        finalFormat
      )

      const mainSize = metadata.compressedSizes.medium

      const result: UploadResult = {
        secure_url: optimizedUrls.medium!,
        public_id: `user_${userId}`,
        format: finalFormat,
        width: metadata.width,
        height: metadata.height,
        bytes: mainSize,
        resource_type: mediaType,
        optimized_urls: optimizedUrls,
        is_overwrite: true
      }

      console.log({result})

      this.setCache(`avatar-${userId}`, result)
      this.setCache(`all-urls-${userId}`, optimizedUrls)
      return result
    } catch (error: any) {
      console.error('❌ Upload error:', error)
      throw new Error(`Upload failed: ${error.message}`)
    }
  }

  /**
   * 🗑️ Suppression d'avatar
   */
  static async deleteAvatar (userId: number): Promise<boolean> {
    try {
      await this.deleteOldAvatars(userId)

      // Nettoyage cache
      this.cache.delete(`avatar-${userId}`)
      this.cache.delete(`all-urls-${userId}`)
      this.cache.delete(`image-exists-user_${userId}`)

      console.log(`✅ Deleted avatar for user ${userId}`)
      return true
    } catch (error) {
      console.error(`❌ Delete error for user ${userId}:`, error)
      return false
    }
  }

  static async deleteAvatarFast (userId: number): Promise<boolean> {
    return this.deleteAvatar(userId)
  }

  /**
   * ⚡ Vérifications rapides
   */
  static async canUpload (): Promise<boolean> {
    const currentMonth = new Date().getMonth()
    if (currentMonth !== this.monthlyReset) {
      this.uploadCount = 0
      this.monthlyReset = currentMonth
    }
    return this.uploadCount < this.MONTHLY_LIMIT
  }

  static async canUploadFast (): Promise<boolean> {
    return this.canUpload()
  }

  /**
   * 📊 Stats d'usage
   */
  static async getUsageStatsFast (): Promise<UsageStats> {
    const cacheKey = 'usage-stats'
    const cached = this.getCached<UsageStats>(cacheKey)
    if (cached) return cached

    try {
      const files = await readdir(this.UPLOAD_DIR)
      const avatarFiles = files.filter(
        file =>
          file.startsWith('user_') &&
          (file.endsWith('.webm') ||
            file.endsWith('.avif') ||
            file.endsWith('.webp') ||
            file.endsWith('.jpg'))
      )

      let totalSize = 0
      for (const file of avatarFiles) {
        try {
          const fileSize = await Bun.file(join(this.UPLOAD_DIR, file)).size
          totalSize += fileSize
        } catch {
          continue
        }
      }

      const uniqueUsers = new Set(avatarFiles.map(file => file.split('_')[1]))
        .size

      const stats: UsageStats = {
        uploadsThisMonth: this.uploadCount,
        localCount: uniqueUsers,
        remainingUploads: Math.max(0, this.MONTHLY_LIMIT - this.uploadCount),
        percentageUsed: Math.round(
          (this.uploadCount / this.MONTHLY_LIMIT) * 100
        ),
        resetDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ).toISOString(),
        isNearLimit: this.uploadCount > this.MONTHLY_LIMIT * 0.8,
        diskUsage: {
          totalFiles: avatarFiles.length,
          totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
          averageCompressionRatio: 85,
          estimatedSavingsMB:
            Math.round(((totalSize * 5.67) / 1024 / 1024) * 100) / 100
        }
      }

      this.setCache(cacheKey, stats)
      return stats
    } catch (error) {
      return {
        uploadsThisMonth: this.uploadCount,
        localCount: 0,
        remainingUploads: this.MONTHLY_LIMIT,
        percentageUsed: 0,
        resetDate: new Date().toISOString(),
        isNearLimit: false,
        diskUsage: {
          totalFiles: 0,
          totalSizeMB: 0,
          averageCompressionRatio: 0,
          estimatedSavingsMB: 0
        }
      }
    }
  }

  static async getUsageStatsAccurate (): Promise<UsageStats> {
    return this.getUsageStatsFast()
  }

  /**
   * 🖼️ Génération d'URLs
   */
  static getAvatarUrl (
    userId: number,
    size: 'small' | 'medium' | 'large' = 'medium',
    preferredFormat?: 'webp' | 'avif' | 'webm' | 'auto'
  ): string {
    const cached = this.getCached<UploadResult>(`avatar-${userId}`)
    if (cached?.optimized_urls) {
      const requestedSize = size === 'large' ? 'medium' : size
      return (
        cached.optimized_urls[requestedSize] ||
        cached.optimized_urls.medium ||
        cached.secure_url
      )
    }

    return `${this.BASE_URL}/api/avatar/default?size=${size}`
  }

  static getOptimizedAvatarUrls (userId: number): OptimizedUrls {
    const cached = this.getCached<OptimizedUrls>(`all-urls-${userId}`)
    if (cached) return cached

    const defaultUrl = `${this.BASE_URL}/api/avatar/default`
    return {
      original: defaultUrl,
      small: defaultUrl,
      medium: defaultUrl,
      large: defaultUrl
    }
  }

  static getAllOptimizedUrls (userId: number): {
    large: OptimizedUrls
    medium: OptimizedUrls
    small: OptimizedUrls
  } {
    const urls = this.getOptimizedAvatarUrls(userId)
    return { large: urls, medium: urls, small: urls }
  }

  /**
   * 🔍 Vérification d'existence
   */
  static async avatarExists (userId: number): Promise<boolean> {
    const cacheKey = `avatar-exists-${userId}`
    const cached = this.getCached<boolean>(cacheKey)
    if (cached !== null) return cached

    try {
      const files = await readdir(this.UPLOAD_DIR)
      const hasAvatar = files.some(
        file =>
          file.startsWith(`user_${userId}_`) &&
          (file.endsWith('.webm') ||
            file.endsWith('.avif') ||
            file.endsWith('.webp') ||
            file.endsWith('.jpg'))
      )

      this.setCache(cacheKey, hasAvatar)
      return hasAvatar
    } catch {
      return false
    }
  }

  /**
   * 🔧 Utilitaires
   */
  static resetLocalCounter (): void {
    this.uploadCount = 0
    console.log('🔄 Upload counter reset')
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

  static async cleanupUserTransformations (userId: number): Promise<void> {
    console.log(`✅ No cleanup needed for local files (user ${userId})`)
  }
}

// 🔧 Fonction de création d'utilisateur (inchangée)
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

// ✅ Export pour compatibilité parfaite
export { AvatarService as CompressedAvatarService }

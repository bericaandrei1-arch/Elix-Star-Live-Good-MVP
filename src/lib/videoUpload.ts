// Video Upload Pipeline with Compression & Validation

import { supabase } from './supabase';
import { trackEvent } from './analytics';

export interface UploadProgress {
  stage: 'validating' | 'compressing' | 'uploading' | 'processing' | 'complete';
  progress: number; // 0-100
  message: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  size: number;
  format: string;
}

// Configuration
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_DURATION = 180; // 3 minutes (in seconds)
const ALLOWED_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm'];
const TARGET_BITRATE = 2500000; // 2.5 Mbps
const TARGET_RESOLUTION = { width: 1080, height: 1920 }; // 9:16 aspect ratio

export class VideoUploadService {
  private onProgressCallback: ((progress: UploadProgress) => void) | null = null;

  /**
   * Register callback for upload progress updates
   */
  onProgress(callback: (progress: UploadProgress) => void) {
    this.onProgressCallback = callback;
  }

  private updateProgress(stage: UploadProgress['stage'], progress: number, message: string) {
    if (this.onProgressCallback) {
      this.onProgressCallback({ stage, progress, message });
    }
  }

  /**
   * Validate video file before upload
   */
  async validateVideo(file: File): Promise<VideoMetadata> {
    this.updateProgress('validating', 10, 'Validating video...');

    // Check file type
    if (!ALLOWED_FORMATS.includes(file.type)) {
      throw new Error(`Invalid format. Allowed: ${ALLOWED_FORMATS.join(', ')}`);
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Get video metadata
    const metadata = await this.getVideoMetadata(file);

    // Check duration
    if (metadata.duration > MAX_DURATION) {
      throw new Error(`Video too long. Maximum: ${MAX_DURATION} seconds`);
    }

    this.updateProgress('validating', 30, 'Validation complete');
    return metadata;
  }

  /**
   * Get video metadata using browser API
   */
  private getVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size,
          format: file.type,
        });
      };

      video.onerror = () => {
        reject(new Error('Failed to read video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload video to storage
   */
  async uploadVideo(
    file: File,
    userId: string,
    metadata: { description: string; hashtags: string[]; isPrivate: boolean }
  ): Promise<string> {
    try {
      // Validate
      const videoMeta = await this.validateVideo(file);

      this.updateProgress('uploading', 40, 'Uploading video...');

      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'mp4';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      this.updateProgress('uploading', 70, 'Upload complete');

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('user-content').getPublicUrl(filePath);

      this.updateProgress('processing', 80, 'Creating video record...');

      // Create video record in database
      const { data: videoData, error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: userId,
          video_url: publicUrl,
          thumbnail_url: await this.generateThumbnail(file),
          description: metadata.description,
          is_private: metadata.isPrivate,
          duration: Math.round(videoMeta.duration),
          width: videoMeta.width,
          height: videoMeta.height,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Add hashtags
      if (metadata.hashtags.length > 0) {
        await this.addHashtags(videoData.id, metadata.hashtags);
      }

      this.updateProgress('complete', 100, 'Video uploaded successfully!');

      trackEvent('video_upload', {
        video_id: videoData.id,
        duration: videoMeta.duration,
        size_mb: (file.size / 1024 / 1024).toFixed(2),
      });

      return videoData.id;
    } catch (error) {
      console.error('Upload failed:', error);
      trackEvent('video_upload_failed', { error: String(error) });
      throw error;
    }
  }

  /**
   * Generate thumbnail from video
   */
  private async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2); // 1 second or halfway
      };

      video.onseeked = async () => {
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(async blob => {
            if (!blob) {
              reject(new Error('Failed to generate thumbnail'));
              return;
            }

            // Upload thumbnail
            const fileName = `thumb-${Date.now()}.jpg`;
            const { error } = await supabase.storage
              .from('user-content')
              .upload(`thumbnails/${fileName}`, blob);

            if (error) {
              reject(error);
              return;
            }

            const {
              data: { publicUrl },
            } = supabase.storage.from('user-content').getPublicUrl(`thumbnails/${fileName}`);

            resolve(publicUrl);
          }, 'image/jpeg', 0.85);
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => {
        reject(new Error('Failed to load video for thumbnail'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Add hashtags to video
   */
  private async addHashtags(videoId: string, hashtags: string[]) {
    // Clean and normalize hashtags
    const cleanTags = hashtags.map(tag => tag.toLowerCase().replace(/[^a-z0-9_]/g, ''));

    // Insert or update hashtags
    for (const tag of cleanTags) {
      const { data: existingTag } = await supabase
        .from('hashtags')
        .select('tag')
        .eq('tag', tag)
        .single();

      if (!existingTag) {
        await supabase.from('hashtags').insert({ tag, use_count: 1 });
      } else {
        // Increment use count using RPC or fetch current + 1
        const { data: current } = await supabase.from('hashtags').select('use_count').eq('tag', tag).single();
        if (current) {
          await supabase.from('hashtags').update({ use_count: current.use_count + 1 }).eq('tag', tag);
        }
      }

      // Link video to hashtag
      await supabase.from('video_hashtags').insert({ video_id: videoId, hashtag: tag });
    }
  }
}

export const videoUploadService = new VideoUploadService();

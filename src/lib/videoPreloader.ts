// Video Preloader for smooth scrolling

class VideoPreloader {
  private preloadedVideos = new Map<string, HTMLVideoElement>();
  private maxPreloaded = 3;

  preload(videoUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already preloaded
      if (this.preloadedVideos.has(videoUrl)) {
        resolve();
        return;
      }

      // Create video element
      const video = document.createElement('video');
      video.src = videoUrl;
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;

      video.addEventListener('canplaythrough', () => {
        this.preloadedVideos.set(videoUrl, video);
        this.cleanup();
        resolve();
      }, { once: true });

      video.addEventListener('error', () => {
        reject(new Error(`Failed to preload video: ${videoUrl}`));
      }, { once: true });

      // Start loading
      video.load();
    });
  }

  preloadNext(videoUrls: string[]) {
    const urlsToPreload = videoUrls.slice(0, this.maxPreloaded);
    urlsToPreload.forEach(url => {
      this.preload(url).catch(() => {
        // Fail silently
      });
    });
  }

  getPreloaded(videoUrl: string): HTMLVideoElement | null {
    return this.preloadedVideos.get(videoUrl) || null;
  }

  cleanup() {
    // Remove oldest entries if we exceed max
    if (this.preloadedVideos.size > this.maxPreloaded) {
      const entries = Array.from(this.preloadedVideos.entries());
      const toRemove = entries.slice(0, entries.length - this.maxPreloaded);
      toRemove.forEach(([url]) => {
        this.preloadedVideos.delete(url);
      });
    }
  }

  clear() {
    this.preloadedVideos.clear();
  }
}

export const videoPreloader = new VideoPreloader();

// Performance monitoring and optimization utilities
export class PerformanceMonitor {
    static measurePageLoad() {
      if (typeof window !== 'undefined' && 'performance' in window) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            
            const metrics = {
              dns: perfData.domainLookupEnd - perfData.domainLookupStart,
              tcp: perfData.connectEnd - perfData.connectStart,
              ttfb: perfData.responseStart - perfData.requestStart,
              download: perfData.responseEnd - perfData.responseStart,
              dom: perfData.domComplete - perfData.domLoading,
              loadComplete: perfData.loadEventEnd - perfData.loadEventStart
            };
  
            console.log('Performance Metrics:', metrics);
            
            // Send to analytics if needed
            if (process.env.NODE_ENV === 'production') {
              // gtag('event', 'page_load_time', { value: metrics.loadComplete });
            }
          }, 0);
        });
      }
    }
  
    static measureLCP() {
      if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            console.log('LCP:', entry.startTime);
            // Send to analytics
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      }
    }
  
    static measureFID() {
      if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            console.log('FID:', entry.processingStart - entry.startTime);
            // Send to analytics
          }
        }).observe({ entryTypes: ['first-input'] });
      }
    }
  }
  
  // Image optimization utilities
  export class ImageOptimizer {
    static getOptimizedImageUrl(src: string, width: number, quality = 75): string {
      if (src.includes('image.tmdb.org')) {
        // Use TMDB's image resizing
        return src.replace('/w500', `/w${width}`);
      }
      
      // Use Next.js image optimization for other images
      return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
    }
  
    static preloadCriticalImages(imageUrls: string[]) {
      if (typeof window !== 'undefined') {
        imageUrls.forEach(url => {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = url;
          document.head.appendChild(link);
        });
      }
    }
  }
  
  // Memory management
  export class MemoryManager {
    private static cache = new Map();
    
    static setCache(key: string, value: any, ttl = 300000) { // 5 minutes default
      const expiry = Date.now() + ttl;
      this.cache.set(key, { value, expiry });
      
      // Clean up expired entries
      this.cleanup();
    }
    
    static getCache(key: string) {
      const item = this.cache.get(key);
      if (!item) return null;
      
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        return null;
      }
      
      return item.value;
    }
    
    private static cleanup() {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          this.cache.delete(key);
        }
      }
    }
  }
  
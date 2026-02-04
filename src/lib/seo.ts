// SEO & Meta Tags Configuration

export interface PageMeta {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'video.other' | 'profile';
}

/**
 * Update page meta tags dynamically
 */
export function updatePageMeta(meta: PageMeta) {
  const { title, description, image, url, type = 'website' } = meta;

  // Update title
  document.title = title ? `${title} | Elix Star` : 'Elix Star - Live Good';

  // Update or create meta tags
  setMetaTag('description', description);
  setMetaTag('og:title', title);
  setMetaTag('og:description', description);
  setMetaTag('og:type', type);

  if (image) {
    setMetaTag('og:image', image);
    setMetaTag('twitter:image', image);
  }

  if (url) {
    setMetaTag('og:url', url);
    setMetaTag('twitter:url', url);
  }

  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
}

/**
 * Helper to set or update a meta tag
 */
function setMetaTag(property: string, content: string) {
  const isOg = property.startsWith('og:');
  const attr = isOg ? 'property' : 'name';
  
  let element = document.querySelector(`meta[${attr}="${property}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, property);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

/**
 * Pre-defined meta for common pages
 */
export const PAGE_META = {
  home: {
    title: 'Home',
    description: 'Discover trending videos, live streams, and connect with creators on Elix Star',
  },
  discover: {
    title: 'Discover',
    description: 'Explore trending videos, hashtags, and find new creators to follow',
  },
  live: {
    title: 'Live',
    description: 'Watch live streams, join battles, and interact with creators in real-time',
  },
  profile: (username: string) => ({
    title: `@${username}`,
    description: `Check out @${username}'s videos and live streams on Elix Star`,
    type: 'profile' as const,
  }),
  video: (description: string, thumbnailUrl: string) => ({
    title: description.slice(0, 60),
    description: description.slice(0, 160),
    image: thumbnailUrl,
    type: 'video.other' as const,
  }),
  inbox: {
    title: 'Inbox',
    description: 'View your notifications and messages',
  },
  settings: {
    title: 'Settings',
    description: 'Manage your account settings and preferences',
  },
};

/**
 * Generate JSON-LD structured data for video
 */
export function generateVideoStructuredData(video: {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: number;
  creator: { name: string; url: string };
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    duration: `PT${video.duration}S`,
    contentUrl: `https://elixstar.live/video/${video.id}`,
    embedUrl: `https://elixstar.live/video/${video.id}`,
    author: {
      '@type': 'Person',
      name: video.creator.name,
      url: video.creator.url,
    },
  };

  // Add or update script tag
  let script = document.querySelector('script[type="application/ld+json"]');
  
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(structuredData);
}

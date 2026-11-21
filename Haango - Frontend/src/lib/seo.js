export const SITE_URL = 'https://haango.in';

export const SEO_PAGES = {
  '/': {
    title: 'Find a Verified Buddy for Outings in India | Haango',
    description: 'Find verified buddies for coffee, movies, dining and local outings across major Indian cities. Browse profiles and plan your next outing with Haango.',
  },
  '/explore': {
    title: 'Explore Verified Buddies for Outings | Haango',
    description: 'Browse verified Haango buddy profiles and find company for coffee, dining, movies, shopping and local outings.',
  },
  '/experience': {
    title: 'Discover Local Experiences with Haango',
    description: 'Explore activities and local experiences to enjoy with a verified Haango buddy, from coffee and dining to movies and city outings.',
  },
  '/how-it-works': {
    title: 'How Haango Works | Find and Book a Buddy',
    description: 'See how to browse verified profiles, choose an activity and book a Haango buddy for your next local outing.',
  },
  '/safety': {
    title: 'Safety at Haango | Meet with Confidence',
    description: 'Learn about Haango verification, secure bookings, public meetup recommendations and the tools available to support safer outings.',
  },
  '/about': {
    title: 'About Haango | Social Companionship for Outings',
    description: 'Learn about Haango, a platform for finding verified companions for coffee, activities and local outings.',
  },
  '/become-buddy': {
    title: 'Become a Haango Buddy | Flexible Outing Work',
    description: 'Apply to become a Haango buddy, share activities you enjoy and set your availability on your own schedule.',
  },
  '/blog': {
    title: 'Haango Blog | Stories, Ideas and Updates',
    description: 'Read stories, ideas and updates from Haango about companionship, local experiences and community.',
  },
  '/faq': {
    title: 'Haango FAQs | Bookings, Buddies and Safety',
    description: 'Find answers to common questions about Haango accounts, buddy profiles, bookings, payments and safety.',
  },
  '/contact': {
    title: 'Contact Haango | Get in Touch',
    description: 'Contact Haango for questions, feedback or help with your account, booking or experience on the platform.',
  },
  '/support': {
    title: 'Haango Support | Booking and Account Help',
    description: 'Get help with Haango bookings, payments, account access and other questions about using the platform.',
  },
  '/community-guidelines': {
    title: 'Haango Community Guidelines',
    description: "Read Haango's community standards for respectful, considerate interactions between members.",
  },
  '/buddy-guidelines': {
    title: 'Haango Buddy Guidelines',
    description: 'Review the expectations and guidelines for people who offer companionship through Haango.',
  },
  '/privacy-policy': {
    title: 'Haango Privacy Policy',
    description: 'Read how Haango handles personal information when you use the platform, its features and support services.',
  },
  '/terms': {
    title: 'Haango Terms of Service',
    description: 'Review the terms and conditions that apply when using the Haango platform and services.',
  },
  '/cancellation-policy': {
    title: 'Haango Cancellation and Refund Policy',
    description: 'Understand Haango booking cancellations, refunds and payment holds before making a booking.',
  },
};

export const SEO_NO_INDEX_PAGES = {
  '/profile': {
    title: 'Buddy Profile | Haango',
    description: 'View a Haango buddy profile and details for your next outing.',
    robots: 'noindex,nofollow',
  },
  '/booking': {
    title: 'Book a Buddy | Haango',
    description: 'Review your selected buddy and booking details on Haango.',
    robots: 'noindex,nofollow',
  },
  '/messages': {
    title: 'Messages | Haango',
    description: 'View your private conversations on Haango.',
    robots: 'noindex,nofollow',
  },
  '/dashboard': {
    title: 'Your Haango Dashboard',
    description: 'Manage your Haango account and profile.',
    robots: 'noindex,nofollow',
  },
  '/referrals': {
    title: 'Your Haango Referrals',
    description: 'View your referral activity in your Haango account.',
    robots: 'noindex,nofollow',
  },
  '/bookings': {
    title: 'Your Haango Bookings',
    description: 'View and manage your bookings in your Haango account.',
    robots: 'noindex,nofollow',
  },
  '/buddy-bookings': {
    title: 'Buddy Bookings | Haango',
    description: 'Manage booking requests in your Haango buddy account.',
    robots: 'noindex,nofollow',
  },
  '/buddy-dashboard': {
    title: 'Buddy Dashboard | Haango',
    description: 'Manage your Haango buddy profile and activity.',
    robots: 'noindex,nofollow',
  },
  '/unsubscribe': {
    title: 'Email Preferences | Haango',
    description: 'Manage your email preferences for Haango communications.',
    robots: 'noindex,nofollow',
  },
  '/login': {
    title: 'Sign In to Haango',
    description: 'Sign in to manage your Haango account and bookings.',
    robots: 'noindex,nofollow',
  },
  '/signup': {
    title: 'Create a Haango Account',
    description: 'Create an account to find or become a verified Haango buddy.',
    robots: 'noindex,nofollow',
  },
  '/admin': {
    title: 'Haango Admin',
    description: 'Haango administration workspace.',
    robots: 'noindex,nofollow',
  },
};

function setMeta(attribute, key, content) {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (content == null) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', String(content));
}

export function setPageSeo({
  title,
  description,
  canonicalPath,
  image,
  robots,
  type = 'website',
  structuredData,
} = {}) {
  if (title) document.title = title;
  if (description !== undefined) setMeta('name', 'description', description || null);
  setMeta('name', 'robots', robots || 'index,follow');

  if (title) {
    setMeta('property', 'og:title', title);
    setMeta('name', 'twitter:title', title);
  }
  if (description) {
    setMeta('property', 'og:description', description);
    setMeta('name', 'twitter:description', description);
  } else {
    setMeta('property', 'og:description', null);
    setMeta('name', 'twitter:description', null);
  }
  const imageUrl = image ? new URL(image, SITE_URL).toString() : null;
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:image', imageUrl);
  setMeta('name', 'twitter:image', imageUrl);
  setMeta('name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary');

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  const candidateCanonicalUrl = new URL(canonicalPath || window.location.pathname, SITE_URL);
  const canonicalUrlObject = new URL(candidateCanonicalUrl.pathname, SITE_URL);
  if (canonicalUrlObject.pathname !== '/') {
    canonicalUrlObject.pathname = canonicalUrlObject.pathname.replace(/\/+$/, '');
  }
  const canonicalUrl = canonicalUrlObject.toString();
  canonical.setAttribute('href', canonicalUrl);
  setMeta('property', 'og:url', canonicalUrl);

  const existingStructuredData = document.head.querySelector('script[data-haango-seo]');
  if (existingStructuredData) existingStructuredData.remove();
  const structuredDataItems = (Array.isArray(structuredData) ? structuredData : [structuredData])
    .filter(Boolean);
  if (structuredDataItems.length) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-haango-seo', 'true');
    script.textContent = JSON.stringify(structuredDataItems.length === 1 ? structuredDataItems[0] : structuredDataItems);
    document.head.appendChild(script);
  }
}

export function createSlug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'haango';
}

export function createBuddyProfilePath(buddy) {
  const id = String(buddy?.id || buddy?._id || '');
  if (!id) return '/profile';
  return `/buddies/${createSlug(buddy.name || buddy.displayName)}-${id}`;
}

export function extractIdFromSeoParam(param) {
  const value = String(param || '');
  const match = value.match(/([a-f\d]{24})$/i);
  return match?.[1] || value;
}

export function createBreadcrumbStructuredData(pathname, labels = {}) {
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) return null;

  const items = [{
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: 'https://haango.in/',
  }];

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    items.push({
      '@type': 'ListItem',
      position: index + 2,
      name: labels[segment] || segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
      item: `https://haango.in${currentPath}`,
    });
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

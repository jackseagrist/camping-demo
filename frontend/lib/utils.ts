export const getSiteURL = () => {
  // In production, use the NEXT_PUBLIC_SITE_URL environment variable
  // or fallback to the Vercel URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // Check for Vercel environment
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  // In development, use localhost
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://baselodge.vercel.app';
};

export const getRedirectURL = (path: string = '/dashboard') => {
  // Always use relative URLs in production
  if (process.env.NODE_ENV === 'production') {
    return path;
  }

  // In development, we can use the full URL
  const baseUrl = getSiteURL();
  return `${baseUrl}${path}`;
}; 
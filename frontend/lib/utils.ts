export const getSiteURL = () => {
  // Debug logging
  console.log('Environment:', process.env.NODE_ENV);
  console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
  console.log('NEXT_PUBLIC_VERCEL_URL:', process.env.NEXT_PUBLIC_VERCEL_URL);

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
  // Debug logging
  console.log('Getting redirect URL for path:', path);
  
  // Always use relative URLs in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Production environment - using relative path:', path);
    return path;
  }

  // In development, we can use the full URL
  const baseUrl = getSiteURL();
  const fullUrl = `${baseUrl}${path}`;
  console.log('Development environment - using full URL:', fullUrl);
  return fullUrl;
}; 
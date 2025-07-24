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
  
  // OAuth providers require full URLs, so always return complete URLs
  const baseUrl = getSiteURL();
  const fullUrl = `${baseUrl}${path}`;
  console.log('Returning full URL for OAuth:', fullUrl);
  return fullUrl;
}; 

// Cookie management utilities
export const cookieUtils = {
  // Set a cookie with the given name, value, and expiration days
  setCookie: (name: string, value: string, days: number) => {
    if (typeof window === 'undefined') return;
    
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  },

  // Get a cookie by name
  getCookie: (name: string) => {
    if (typeof window === 'undefined') return null;
    
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? match[2] : null;
  },

  // Delete a cookie by name
  deleteCookie: (name: string) => {
    if (typeof window === 'undefined') return;
    
    document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  },

  // Reset cookie preferences and show the consent banner again
  resetCookiePreferences: () => {
    if (typeof window === 'undefined') return;
    
    // Clear existing cookies
    cookieUtils.deleteCookie('baselodge-cookie-consent');
    cookieUtils.deleteCookie('baselodge-cookie-rejected');
    
    // Reload the page to show the consent banner again
    window.location.reload();
  },

  // Check if analytics is allowed
  isAnalyticsAllowed: () => {
    if (typeof window === 'undefined') return false;
    
    const consentCookie = cookieUtils.getCookie('baselodge-cookie-consent');
    const rejectionCookie = cookieUtils.getCookie('baselodge-cookie-rejected');
    
    return consentCookie && !rejectionCookie ? true : false;
  }
}; 
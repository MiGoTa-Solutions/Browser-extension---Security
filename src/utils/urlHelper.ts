export const normalizeHostname = (url: string): string | null => {
  try {
    if (!url) return null;
    // Handle input like "google.com" by adding protocol temporarily
    const urlToParse = url.startsWith('http') ? url : `https://${url}`;
    const hostname = new URL(urlToParse).hostname.toLowerCase();
    return hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
};

export const isDomainMatch = (currentHost: string, lockedHost: string): boolean => {
  const current = normalizeHostname(currentHost);
  const locked = normalizeHostname(lockedHost);
  if (!current || !locked) return false;
  
  return current === locked || current.endsWith('.' + locked);
};
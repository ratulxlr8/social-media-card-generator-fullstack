export const SCRAPER_CONFIG = {
  // Request timeout in milliseconds
  TIMEOUT: 15000,
  
  // Maximum head content size to prevent memory issues
  MAX_HEAD_SIZE: 100000,
  
  // User agent for requests
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
  // Request headers
  HEADERS: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  },
  
  // Blocked domains for security
  BLOCKED_DOMAINS: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '10.',
    '192.168.',
    '172.16.',
  ],
  
  // Allowed protocols
  ALLOWED_PROTOCOLS: ['http:', 'https:'],
} as const;
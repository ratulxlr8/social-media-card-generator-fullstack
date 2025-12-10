export class ScrapingError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ScrapingError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Maps common HTTP errors to user-friendly messages
 */
export function getErrorMessage(error: unknown): { message: string; statusCode: number } {
  if (error instanceof ScrapingError) {
    return { message: error.message, statusCode: error.statusCode };
  }
  
  if (error instanceof ValidationError) {
    return { message: error.message, statusCode: 400 };
  }
  
  if (error instanceof NetworkError) {
    return { message: error.message, statusCode: error.statusCode || 500 };
  }
  
  if (error instanceof Error) {
    // Handle common fetch errors
    if (error.message.includes('fetch')) {
      if (error.message.includes('timeout') || error.message.includes('aborted')) {
        return { message: 'Request timeout - the website took too long to respond', statusCode: 408 };
      }
      if (error.message.includes('network')) {
        return { message: 'Network error - unable to reach the website', statusCode: 503 };
      }
    }
    
    // Handle HTTP status errors
    if (error.message.includes('HTTP 403')) {
      return { message: 'Access forbidden - the website blocked our request', statusCode: 403 };
    }
    if (error.message.includes('HTTP 404')) {
      return { message: 'Page not found', statusCode: 404 };
    }
    if (error.message.includes('HTTP 500')) {
      return { message: 'The target website is experiencing issues', statusCode: 502 };
    }
    
    return { message: error.message, statusCode: 500 };
  }
  
  return { message: 'An unexpected error occurred', statusCode: 500 };
}
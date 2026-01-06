// Helper function to get master admin token from localStorage
export function getMasterAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('master_admin_token')
}

/**
 * Helper function to make authenticated API calls to master endpoints
 * Note: If the global fetch interceptor is set up (via setupMasterApiInterceptor),
 * it will automatically handle 401 errors and token refresh. This function
 * is mainly for convenience and adding the Authorization header.
 * 
 * The interceptor will:
 * - Detect 401 responses from /api/master/* calls
 * - Attempt to refresh the token
 * - Retry the request with the new token
 * - Redirect to login if refresh fails
 */
export async function masterApiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getMasterAuthToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  // Use fetch - the interceptor will handle 401 errors automatically
  // If interceptor is not set up, this will just make a normal fetch call
  return fetch(url, {
    ...options,
    headers,
  })
}


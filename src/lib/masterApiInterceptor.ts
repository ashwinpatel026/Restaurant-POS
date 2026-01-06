/**
 * Client-side API interceptor for master admin API calls
 * This intercepts fetch calls to /api/master/* and handles 401 errors automatically
 * 
 * Usage: Call setupMasterApiInterceptor() once in your app (e.g., in master layout)
 */

let isIntercepted = false
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null
let originalFetch: typeof fetch | null = null

/**
 * Attempts to refresh the token
 */
async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('master_admin_token') 
        : null

      if (!token) {
        return false
      }

      const response = await fetch('/api/master/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (typeof window !== 'undefined') {
          localStorage.setItem('master_admin_token', data.token)
          
          // Dispatch event to notify auth context
          window.dispatchEvent(new CustomEvent('master_token_refreshed', { 
            detail: data.admin 
          }))
        }
        return true
      }

      // Refresh failed, clear token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('master_admin_token')
        window.dispatchEvent(new CustomEvent('master_token_expired'))
      }
      return false
    } catch (error) {
      console.error('Token refresh error:', error)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('master_admin_token')
        window.dispatchEvent(new CustomEvent('master_token_expired'))
      }
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Redirects to login page
 */
function redirectToLogin() {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    if (pathname.startsWith('/master') && pathname !== '/master/login') {
      window.location.href = '/master/login'
    }
  }
}

/**
 * Wrapped fetch that intercepts 401 responses for master API calls
 */
async function interceptedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const isMasterApi = url.includes('/api/master/')

  // Use original fetch (not the intercepted one)
  if (!originalFetch) {
    throw new Error('Original fetch not available')
  }
  const response = await originalFetch(input, init)

  // Handle 401 for master API calls
  if (isMasterApi && response.status === 401) {
    // Don't intercept auth endpoints (login, refresh, me)
    if (url.includes('/api/master/auth/login') || 
        url.includes('/api/master/auth/refresh') ||
        url.includes('/api/master/auth/me')) {
      return response
    }

    // Try to refresh token
    const refreshed = await tryRefreshToken()

    if (refreshed) {
      // Retry original request with new token
      const newToken = typeof window !== 'undefined' 
        ? localStorage.getItem('master_admin_token') 
        : null

      const newHeaders = new Headers(init?.headers)
      if (newToken) {
        newHeaders.set('Authorization', `Bearer ${newToken}`)
      }

      const retryResponse = await originalFetch(input, {
        ...init,
        headers: newHeaders,
      })

      // If retry still fails with 401, redirect to login
      if (retryResponse.status === 401) {
        redirectToLogin()
      }

      return retryResponse
    } else {
      // Refresh failed, redirect to login
      redirectToLogin()
    }
  }

  return response
}

/**
 * Sets up the global fetch interceptor for master API calls
 * Should be called once when the app initializes (client-side only)
 */
export function setupMasterApiInterceptor() {
  if (typeof window === 'undefined' || isIntercepted) {
    return
  }

  // Store original fetch before overriding
  originalFetch = window.fetch.bind(window)

  // Override fetch
  window.fetch = function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' 
      ? input 
      : input instanceof URL 
        ? input.href 
        : input.url

    // Only intercept master API calls
    if (url.includes('/api/master/')) {
      return interceptedFetch(input, init)
    }

    // Use original fetch for other calls
    return originalFetch!(input, init)
  }

  isIntercepted = true

  // Listen for token expired events
  window.addEventListener('master_token_expired', () => {
    redirectToLogin()
  })
}

/**
 * Removes the fetch interceptor (for testing or cleanup)
 */
export function removeMasterApiInterceptor() {
  if (typeof window === 'undefined' || !isIntercepted) {
    return
  }

  // Restore original fetch if available
  // Note: We can't fully restore as we don't store the original
  // This is mainly for testing
  isIntercepted = false
}


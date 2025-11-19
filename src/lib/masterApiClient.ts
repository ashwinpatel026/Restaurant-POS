// Helper function to get master admin token from localStorage
export function getMasterAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('master_admin_token')
}

// Helper function to make authenticated API calls to master endpoints
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

  return fetch(url, {
    ...options,
    headers,
  })
}


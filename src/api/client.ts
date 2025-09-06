import axios from 'axios'

// Environment-specific API base URL configuration:
// - Local dev: Use relative paths (/api/v1) for Vite proxy
// - Test: Use relative paths (/api/v1) for MSW intercept
// - Production: Use absolute URLs (https://...)
const env = import.meta.env.VITE_ENV
const isLocalOrTest = env === 'local' || env === 'test'

const apiBaseUrl = isLocalOrTest 
  ? import.meta.env.VITE_API_BASE 
  : import.meta.env.VITE_API_BASE_URL

if (!apiBaseUrl) {
  throw new Error(
    `API base URL not configured. Missing ${isLocalOrTest ? 'VITE_API_BASE' : 'VITE_API_BASE_URL'} environment variable.`
  )
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Send cookies with requests
})

import axios from 'axios'

// Base URL strategy:
// - Dev/Test: use relative path '/api/v1' so Vite proxy/MSW handle routing
// - Prod: use absolute URL from VITE_API_BASE_URL
const apiBaseUrl = import.meta.env.DEV ? '/api/v1' : import.meta.env.VITE_API_BASE_URL

if (!import.meta.env.DEV && !apiBaseUrl) {
  throw new Error('API base URL not configured. Set VITE_API_BASE_URL for production builds.')
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Send cookies with requests
})

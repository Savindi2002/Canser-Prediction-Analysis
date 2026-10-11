
const API_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      error.detail || `Request failed (${response.status})`
    )
  }

  return response.json()
}

export const getHealth = () => request('/health')

export const getMetrics = () => request('/metrics')

export const predictCancer = (patient) =>
  request('/predict', {
    method: 'POST',
    body: JSON.stringify(patient),
  })

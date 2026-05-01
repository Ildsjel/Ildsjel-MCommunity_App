export interface ApiError {
  message: string
  detail?: string
  status?: number
}

/**
 * Normalise any thrown value (Axios error, Error, string, unknown) into a
 * user-safe message string. Checks Axios's nested `response.data.detail`
 * (FastAPI) and `response.data.error` (slowapi 429) before falling back
 * to the generic Error message.
 */
export function getErrorMessage(err: unknown, fallback = 'Unexpected error'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  const e = err as { response?: { data?: { detail?: string; error?: string } }; message?: string }
  return e.response?.data?.detail || e.response?.data?.error || e.message || fallback
}

export function toApiError(err: unknown, fallback = 'Unexpected error'): ApiError {
  const e = err as { response?: { data?: { detail?: string; error?: string }; status?: number } }
  return {
    message: getErrorMessage(err, fallback),
    detail: e.response?.data?.detail || e.response?.data?.error,
    status: e.response?.status,
  }
}

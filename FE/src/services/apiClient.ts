export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5120').replace(/\/$/, '');

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  _retried?: boolean;
};

function getAccessToken(): string | null {
  return localStorage.getItem('inkflow_access_token');
}

function clearSession(): void {
  localStorage.removeItem('inkflow_user');
  localStorage.removeItem('inkflow_access_token');
  localStorage.removeItem('inkflow_refresh_token');
}

// Tự đổi refresh token lấy access token mới. Gọi fetch trực tiếp để tránh
// vòng lặp import với authApi. Trả về true nếu refresh thành công.
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('inkflow_refresh_token');
  if (!refreshToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
        if (!data.accessToken) return false;
        localStorage.setItem('inkflow_access_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('inkflow_refresh_token', data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, headers, _retried, ...requestOptions } = options;
  const token = auth ? getAccessToken() : null;
  const isFormData = requestOptions.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  // Access token hết hạn: thử refresh một lần rồi gọi lại request gốc.
  if (response.status === 401 && auth && !_retried) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
    clearSession();
  }

  if (!response.ok) {
    const body = await response.text();
    let message = body;

    try {
      const parsed = JSON.parse(body) as { message?: string; title?: string; error?: string };
      message = parsed.message || parsed.title || parsed.error || body;
    } catch {
      // Keep the plain text body.
    }

    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

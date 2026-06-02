export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5120').replace(/\/$/, '');

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

function getAccessToken(): string | null {
  return localStorage.getItem('inkflow_access_token');
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...requestOptions } = options;
  const token = auth ? getAccessToken() : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

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

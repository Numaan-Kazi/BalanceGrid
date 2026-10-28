// Dynamically resolve base API URL from environment variable
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return '/api';
  }
  const trimmed = envUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('balance_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('balance_token', token);
    } else {
      localStorage.removeItem('balance_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private resolveUrl(endpoint: string): string {
    const baseUrl = getBaseUrl();
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (normalizedEndpoint.startsWith('/api/') || normalizedEndpoint === '/api') {
      const baseWithoutApi = baseUrl.replace(/\/api$/, '');
      return `${baseWithoutApi}${normalizedEndpoint}`;
    }

    return `${baseUrl}${normalizedEndpoint}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.resolveUrl(endpoint);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Sends HTTP-only cookies
    });

    if (response.status === 401) {
      // Clear local token on unauthorized
      this.setToken(null);
    }

    if (!response.ok) {
      let errorMessage = 'An unexpected error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Check if response is empty or CSV file download
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      return (await response.text()) as unknown as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();


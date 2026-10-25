const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(endpoint, options = {}) {
  const headers = { ...options.headers };

  // FormData: hayaan ang browser na mag-set ng multipart boundary.
  // JSON requests: gamitin ang application/json.
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  } else if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] =
      headers['Content-Type'] ||
      headers['content-type'] ||
      'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const contentType = response.headers.get('content-type') || '';

  const data = contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(
      data?.message || `Request failed with status ${response.status}`
    );
  }

  return data;
}

export { API_BASE_URL };

export default apiRequest;
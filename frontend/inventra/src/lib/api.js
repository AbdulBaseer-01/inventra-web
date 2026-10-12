const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationMessage = data.errors
      ?.map((error) => `${error.path ? `${error.path}: ` : ""}${error.message}`)
      .join(" ");
    const error = new Error(data.message || validationMessage || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function authenticatedRequest(path, options = {}) {
  try {
    return await apiRequest(path, options);
  } catch (error) {
    if (error.status !== 401) throw error;

    await apiRequest("/api/auth/refresh", { method: "POST" });
    return apiRequest(path, options);
  }
}

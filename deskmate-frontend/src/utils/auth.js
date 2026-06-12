// src/utils/auth.js
// -------------------------------------------------------
// Helper functions untuk manajemen token JWT
// Dipakai di seluruh aplikasi frontend
// -------------------------------------------------------

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Token Storage ──────────────────────────────────────
// Cek localStorage dulu (remember me), lalu sessionStorage

export function getToken() {
  return localStorage.getItem("dm_token") || sessionStorage.getItem("dm_token");
}

export function getRole() {
  return localStorage.getItem("dm_role") || sessionStorage.getItem("dm_role") || "employee";
}

export function getFullName() {
  return localStorage.getItem("dm_full_name") || sessionStorage.getItem("dm_full_name") || "";
}

export function getAvatarUrl() {
  return localStorage.getItem("dm_avatar_url") || sessionStorage.getItem("dm_avatar_url") || "";
}

export function getUserId() {
  return localStorage.getItem("dm_user_id") || sessionStorage.getItem("dm_user_id") || "";
}

export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  ["dm_token", "dm_refresh_token", "dm_user_id", "dm_email", "dm_role", "dm_full_name", "dm_avatar_url"].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

// ── API Fetch Helper ───────────────────────────────────
// Wrapper fetch yang otomatis menyertakan Authorization header

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "ngrok-skip-browser-warning": "true",
    ...(options.headers || {}),
  };

  // Jangan set Content-Type untuk FormData (browser atur otomatis)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Token expired → logout otomatis
  if (res.status === 401) {
    logout();
    window.location.href = "/login";
    return null;
  }

  return res;
}

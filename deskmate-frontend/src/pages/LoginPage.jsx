// src/pages/LoginPage.jsx
// -------------------------------------------------------
// Halaman Login DeskMate
// Sesuai desain screenshot: card putih di tengah, background abu-abu
// Integrasi dengan backend: POST /api/v1/auth/login
// -------------------------------------------------------

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Login gagal. Periksa email dan password Anda.");
        return;
      }

      // Simpan token
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("dm_token", data.access_token);
      storage.setItem("dm_refresh_token", data.refresh_token);
      storage.setItem("dm_user_id", data.user_id);
      storage.setItem("dm_email", data.email);

      // Ambil profil untuk cek role
      const profileRes = await fetch(`${API_URL}/api/v1/profiles/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const profile = await profileRes.json();
      storage.setItem("dm_role", profile.role || "employee");
      storage.setItem("dm_full_name", profile.full_name || "");

      // Arahkan ke dashboard
      navigate("/dashboard");
    } catch (err) {
      setError("Tidak dapat terhubung ke server. Pastikan server berjalan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
                fill="#2563EB"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 style={styles.title}>Log in to DeskMate</h1>
        <p style={styles.subtitle}>Welcome back! Please enter your details.</p>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
              onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
            />
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
              onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
            />
          </div>

          {/* Remember & Forgot */}
          <div style={styles.rowBetween}>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={styles.checkbox}
              />
              Remember for 30 days
            </label>
            <button
              type="button"
              style={styles.forgotBtn}
              onClick={() => alert("Hubungi administrator untuk reset password.")}
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.signInBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <span style={styles.loadingRow}>
                <span style={styles.spinner} /> Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </button>

          {/* Divider */}
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <span style={styles.dividerLine} />
          </div>

          {/* Google Button */}
          <button
            type="button"
            style={styles.googleBtn}
            onClick={() => alert("Google Sign In belum dikonfigurasi.")}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footer}>
          Don't have an account?{" "}
          <button
            type="button"
            style={styles.signUpBtn}
            onClick={() => navigate("/register")}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    padding: "20px",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: "16px",
    padding: "40px 36px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  },
  logoIcon: {
    width: "52px",
    height: "52px",
    background: "#EFF6FF",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    margin: "0 0 6px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6B7280",
    textAlign: "center",
    margin: "0 0 24px 0",
  },
  errorBox: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#DC2626",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  errorIcon: {
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #D1D5DB",
    fontSize: "14px",
    color: "#111827",
    outline: "none",
    transition: "border-color 0.15s",
    background: "#FFFFFF",
  },
  rowBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#374151",
    cursor: "pointer",
  },
  checkbox: {
    width: "15px",
    height: "15px",
    accentColor: "#2563EB",
    cursor: "pointer",
  },
  forgotBtn: {
    background: "none",
    border: "none",
    fontSize: "13px",
    color: "#2563EB",
    cursor: "pointer",
    padding: "0",
    fontWeight: "500",
  },
  signInBtn: {
    background: "#2563EB",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "11px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.15s",
    width: "100%",
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  spinner: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "4px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#E5E7EB",
  },
  dividerText: {
    fontSize: "13px",
    color: "#9CA3AF",
  },
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#FFFFFF",
    border: "1px solid #D1D5DB",
    borderRadius: "8px",
    padding: "10px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    cursor: "pointer",
    transition: "background 0.15s",
    width: "100%",
  },
  footer: {
    textAlign: "center",
    fontSize: "13px",
    color: "#6B7280",
    marginTop: "20px",
    marginBottom: "0",
  },
  signUpBtn: {
    background: "none",
    border: "none",
    fontSize: "13px",
    color: "#2563EB",
    fontWeight: "600",
    cursor: "pointer",
    padding: "0",
  },
};

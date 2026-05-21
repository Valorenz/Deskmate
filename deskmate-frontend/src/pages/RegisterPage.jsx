// src/pages/RegisterPage.jsx
// -------------------------------------------------------
// Halaman Register DeskMate
// Integrasi dengan backend: POST /api/v1/auth/register
// -------------------------------------------------------

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Registrasi gagal. Coba lagi.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Tidak dapat terhubung ke server.");
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
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#2563EB"/>
            </svg>
          </div>
        </div>

        {success ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.title}>Registrasi Berhasil!</h2>
            <p style={styles.subtitle}>Akun Anda telah dibuat. Silakan login.</p>
            <button style={styles.signInBtn} onClick={() => navigate("/login")}>
              Kembali ke Login
            </button>
          </div>
        ) : (
          <>
            <h1 style={styles.title}>Buat Akun Baru</h1>
            <p style={styles.subtitle}>Isi data diri Anda untuk mendaftar.</p>

            {error && (
              <div style={styles.errorBox}>
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleRegister} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Nama Lengkap</label>
                <input
                  name="full_name" type="text" placeholder="Budi Santoso"
                  value={form.full_name} onChange={handleChange} required
                  style={styles.input}
                  onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email</label>
                <input
                  name="email" type="email" placeholder="kamu@epson.co.id"
                  value={form.email} onChange={handleChange} required
                  style={styles.input}
                  onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Password</label>
                <input
                  name="password" type="password" placeholder="Min. 6 karakter"
                  value={form.password} onChange={handleChange} required
                  style={styles.input}
                  onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Konfirmasi Password</label>
                <input
                  name="confirm" type="password" placeholder="Ulangi password"
                  value={form.confirm} onChange={handleChange} required
                  style={styles.input}
                  onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                />
              </div>
              <button
                type="submit" disabled={loading}
                style={{ ...styles.signInBtn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? "Mendaftar..." : "Sign up"}
              </button>
            </form>

            <p style={styles.footer}>
              Sudah punya akun?{" "}
              <button type="button" style={styles.linkBtn} onClick={() => navigate("/login")}>
                Sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: "20px" },
  card: { background: "#FFFFFF", borderRadius: "16px", padding: "40px 36px", width: "100%", maxWidth: "400px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  logoWrap: { display: "flex", justifyContent: "center", marginBottom: "20px" },
  logoIcon: { width: "52px", height: "52px", background: "#EFF6FF", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  title: { fontSize: "22px", fontWeight: "700", color: "#111827", textAlign: "center", margin: "0 0 6px 0" },
  subtitle: { fontSize: "14px", color: "#6B7280", textAlign: "center", margin: "0 0 24px 0" },
  errorBox: { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#DC2626", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "14px", fontWeight: "500", color: "#374151" },
  input: { padding: "10px 14px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "14px", color: "#111827", outline: "none", transition: "border-color 0.15s", background: "#FFFFFF" },
  signInBtn: { background: "#2563EB", color: "#FFFFFF", border: "none", borderRadius: "8px", padding: "11px", fontSize: "15px", fontWeight: "600", cursor: "pointer", width: "100%" },
  footer: { textAlign: "center", fontSize: "13px", color: "#6B7280", marginTop: "20px", marginBottom: "0" },
  linkBtn: { background: "none", border: "none", fontSize: "13px", color: "#2563EB", fontWeight: "600", cursor: "pointer", padding: "0" },
  successBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" },
  successIcon: { width: "56px", height: "56px", background: "#D1FAE5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: "#059669" },
};

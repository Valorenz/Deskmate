// src/pages/RegisterPage.jsx
// -------------------------------------------------------
// Internal Personnel Onboarding Page
// Koneksi Backend:
// - POST /api/v1/auth/register
// -------------------------------------------------------
'use client';

import { useState, useEffect } from "react";
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
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
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

  // ── FITUR CURSOR SPARKS (GEMINI STYLE EFFECT) ──
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (Math.random() > 0.25) return;

      const spark = document.createElement('div');
      spark.className = 'cursor-spark';

      const size = Math.random() * 8 + 4;
      spark.style.width = `${size}px`;
      spark.style.height = `${size}px`;

      spark.style.left = `${e.clientX}px`;
      spark.style.top = `${e.clientY}px`;

      const colors = [
        'radial-gradient(circle, #8ab4f8 10%, rgba(138,180,248,0) 80%)',
        'radial-gradient(circle, #c58af9 10%, rgba(197,138,249,0) 80%)',
        'radial-gradient(circle, #f382ac 10%, rgba(243,130,172,0) 80%)',
        'radial-gradient(circle, #a8dab5 10%, rgba(168,218,181,0) 80%)',
      ];
      spark.style.background = colors[Math.floor(Math.random() * colors.length)];

      const driftX = (Math.random() - 0.5) * 60;
      const driftY = (Math.random() - 0.5) * 60;
      spark.style.setProperty('--drift-x', `${driftX}px`);
      spark.style.setProperty('--drift-y', `${driftY}px`);

      document.body.appendChild(spark);

      setTimeout(() => {
        spark.remove();
      }, 800);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EAEEF2] px-4 py-8 font-sans relative overflow-hidden">
      {/* ─── STYLE OVERRIDE FOR HELVETICA NEUE & CURSOR SPARKS ─── */}
      <style>{`
        * {
          font-family: "Helvetica Neue", Helvetica, Arial, sans-serif !important;
        }
        @keyframes spark-fade {
          0% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 0;
          }
          15% {
            transform: translate(0, 0) scale(1) rotate(45deg);
            opacity: 0.95;
          }
          100% {
            transform: translate(var(--drift-x), var(--drift-y)) scale(0) rotate(180deg);
            opacity: 0;
          }
        }
        .cursor-spark {
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: screen;
          animation: spark-fade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          clip-path: polygon(50% 0%, 63% 37%, 100% 50%, 63% 63%, 50% 100%, 37% 63%, 0% 50%, 37% 37%);
        }
      `}</style>

      <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.08)] z-10 relative">
        
        {/* Branding Head EPSON */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#003399] leading-none">
            EPSON
          </h1>
          <span className="text-[10px] sm:text-xs font-bold text-[#6b7280] tracking-widest mt-1.5 block uppercase">
            DESKMATE AI
          </span>
        </div>

        {success ? (
          /* State Sukses Mendaftar */
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#111827]">Registrasi Berhasil!</h2>
            <p className="text-sm text-[#6B7280]">
              Kredensial karyawan baru telah terdaftar di jaringan Epson DeskMate.
            </p>
            <button 
              className="w-full mt-2 rounded-lg bg-[#003399] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#002266] border-none cursor-pointer" 
              onClick={() => navigate("/login")}
            >
              Kembali ke Login
            </button>
          </div>
        ) : (
          <>
            {/* Judul yang Sudah Diselaraskan Sesuai Dokumen Tuan Muda */}
            <div className="text-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-[#1a1f2e]">
                Internal Personnel Onboarding
              </h2>
              <p className="mt-1 text-xs text-[#8a92a3]">
                Register new authorized Epson employee account
              </p>
            </div>

            {/* Error Message Box (Emoji replaced with SVG) */}
            {error && (
              <div className="mb-4 rounded-lg p-2.5 px-3.5 text-xs font-medium bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center gap-2">
                <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form Pendaftaran Internal */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#374151]">Nama Lengkap</label>
                <input
                  name="full_name" type="text" placeholder="Budi Santoso"
                  value={form.full_name} onChange={handleChange} required
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition-all focus:border-[#003399] focus:ring-1 focus:ring-[#003399]"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#374151]">Email Corporate</label>
                <input
                  name="email" type="email" placeholder="kamu@epson.co.id"
                  value={form.email} onChange={handleChange} required
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition-all focus:border-[#003399] focus:ring-1 focus:ring-[#003399]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#374151]">Password</label>
                <input
                  name="password" type="password" placeholder="Min. 6 karakter"
                  value={form.password} onChange={handleChange} required
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition-all focus:border-[#003399] focus:ring-1 focus:ring-[#003399]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#374151]">Konfirmasi Password</label>
                <input
                  name="confirm" type="password" placeholder="Ulangi password internal"
                  value={form.confirm} onChange={handleChange} required
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition-all focus:border-[#003399] focus:ring-1 focus:ring-[#003399]"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full rounded-lg bg-[#003399] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#002266] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-h-[42px] border-none cursor-pointer"
              >
                {loading ? "Mendaftarkan Karyawan..." : "Register Account"}
              </button>
            </form>

            <p className="text-center text-sm text-[#6B7280] mt-5 mb-0">
              Sudah punya akun resmi?{" "}
              <button type="button" className="text-[#003399] font-semibold hover:underline bg-none border-none p-0 cursor-pointer" onClick={() => navigate("/login")}>
                Sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
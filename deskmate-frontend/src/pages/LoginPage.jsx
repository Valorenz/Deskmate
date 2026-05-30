// src/pages/LoginPage.jsx
// -------------------------------------------------------
// Authorized Personnel Login Page
// Koneksi Backend:
// - POST /api/v1/auth/login
// - GET /api/v1/profiles/me
// -------------------------------------------------------
'use client';

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("dm_token", data.access_token);
      storage.setItem("dm_refresh_token", data.refresh_token);
      storage.setItem("dm_user_id", data.user_id);
      storage.setItem("dm_email", data.email);

      const profileRes = await fetch(`${API_URL}/api/v1/profiles/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const profile = await profileRes.json();
      storage.setItem("dm_role", profile.role || "employee");
      storage.setItem("dm_full_name", profile.full_name || "");

      navigate("/dashboard");
    } catch (err) {
      setError("Tidak dapat terhubung ke server. Pastikan server berjalan.");
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

        {/* ── HEADER BRANDING ── */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#003399] leading-none">
            EPSON
          </h1>
          <span className="text-[10px] sm:text-xs font-bold text-[#6b7280] tracking-widest mt-1.5 block uppercase">
            DESKMATE AI
          </span>
        </div>

        {/* ── TITLES ── */}
        <div className="text-center mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-[#1a1f2e]">
            Authorized Access Only
          </h2>
          <p className="mt-1.5 text-sm text-[#8a92a3]">
            Please login with your epson account
          </p>
        </div>

        {/* Error Box (Emoji replaced with SVG) */}
        {error && (
          <div className="mb-4 rounded-lg p-2.5 px-3.5 text-xs font-medium bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center gap-2">
            <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ── FORM & LOGIC ── */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Input Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#374151]">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition-all focus:border-[#003399] focus:ring-1 focus:ring-[#003399]"
            />
          </div>

          {/* Input Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#374151]">
              Password
            </label>
            <div className="relative w-full">
              <input
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-[#D1D5DB] bg-white pl-3.5 pr-12 py-2.5 text-sm text-[#111827] outline-none transition-all focus:border-[#003399] focus:ring-1 focus:ring-[#003399]"
              />

              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#003399] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center border-none bg-transparent cursor-pointer"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember & Forgot */}
          <div className="flex items-center justify-between py-0.5">
            <label className="flex items-center gap-2 text-xs text-[#374151] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-[15px] h-[15px] accent-[#003399] cursor-pointer"
              />
              Remember for 30 days
            </label>
            <button
              type="button"
              onClick={() => alert("Hubungi administrator untuk reset password.")}
              className="text-xs text-[#003399] font-medium hover:underline bg-none border-none p-0 cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#003399] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#002266] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-h-[42px] border-none cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> 
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2.5 my-1">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-xs text-[#9CA3AF]">or</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={() => alert("Google Sign In belum dikonfigurasi.")}
            className="w-full flex items-center justify-center gap-2 bg-white border border-[#D1D5DB] rounded-lg py-2.5 text-sm font-medium text-[#374151] hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-center text-sm text-[#6B7280] mt-5 mb-0">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="bg-none border-none p-0 text-[#003399] font-semibold hover:underline cursor-pointer"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
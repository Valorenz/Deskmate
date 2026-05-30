// src/pages/RegisterPage.jsx
'use client';

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
    <div className="flex min-h-screen items-center justify-center bg-[#EAEEF2] px-4 py-8 font-sans">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        
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
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl text-green-600 font-bold">
              ✓
            </div>
            <h2 className="text-xl font-bold text-[#111827]">Registrasi Berhasil!</h2>
            <p className="text-sm text-[#6B7280]">
              Kredensial karyawan baru telah terdaftar di jaringan Epson DeskMate.
            </p>
            <button 
              className="w-full mt-2 rounded-lg bg-[#003399] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#002266]" 
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

            {/* Error Message Box */}
            {error && (
              <div className="mb-4 rounded-lg p-2.5 px-3.5 text-xs font-medium bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center gap-1.5">
                <span className="text-sm font-bold">⚠</span> {error}
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
                className="w-full rounded-lg bg-[#003399] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#002266] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-h-[42px]"
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
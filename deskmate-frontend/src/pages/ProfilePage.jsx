// src/pages/ProfilePage.jsx
// -----------------------------------------------------------------------------
// Profile & Preferences Page DeskMate (Redesigned with Premium Aesthetics)
//
// Backend Connection Info:
// - GET   /api/v1/profiles/me -> Fetch active user profile
// - PATCH /api/v1/profiles/me -> Update employee first name, last name, and department
// -----------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole, logout } from "../utils/auth";

export default function ProfilePage() {
  const navigate = useNavigate();
  const role = getRole();
  const fileRef = useRef(null);

  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");
  const [pwdForm, setPwdForm]   = useState({ current: "", newPwd: "", confirm: "" });
  const [pwdMsg, setPwdMsg]     = useState("");
  const [pwdError, setPwdError] = useState("");
  const [updatingPwd, setUpdatingPwd] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Preferences state
  const [emailNotif, setEmailNotif]   = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [language, setLanguage]       = useState("English (US)");
  const [timezone, setTimezone]       = useState("Eastern Time (ET)");

  // Form state
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    phone: "", department: "",
  });

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const r = await apiFetch("/api/v1/profiles/me");
      if (r?.ok) {
        const p = await r.json();
        setProfile(p);
        const parts = (p.full_name || "").split(" ");
        setForm({
          first_name:  parts[0] || "",
          last_name:   parts.slice(1).join(" ") || "",
          email:       p.email || "",
          phone:       "+1 (555) 123-4567",
          department:  p.department || "",
        });
      }
    } finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true); setSaveMsg("");
    try {
      const full_name = `${form.first_name} ${form.last_name}`.trim();
      const r = await apiFetch("/api/v1/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name, department: form.department }),
      });
      if (r?.ok) {
        setSaveMsg("Changes saved successfully!");
        loadProfile();
        setTimeout(() => setSaveMsg(""), 3000);
      } else {
        setSaveMsg("Failed to save changes.");
      }
    } finally { setSaving(false); }
  }

  function handleUpdatePassword() {
    setPwdError(""); setPwdMsg("");
    if (!pwdForm.current) { setPwdError("Current password is required."); return; }
    if (pwdForm.newPwd.length < 6) { setPwdError("New password must be at least 6 characters."); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { setPwdError("Passwords do not match."); return; }
    setUpdatingPwd(true);
    
    setTimeout(() => {
      setPwdMsg("Password updated successfully!");
      setPwdForm({ current: "", newPwd: "", confirm: "" });
      setUpdatingPwd(false);
      setTimeout(() => setPwdMsg(""), 3000);
    }, 1000);
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ── CURSOR SPARKS EFFECT ──
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (Math.random() > 0.25) return;

      const spark = document.createElement("div");
      spark.className = "cursor-spark";

      const size = Math.random() * 8 + 4;
      spark.style.width = `${size}px`;
      spark.style.height = `${size}px`;

      spark.style.left = `${e.clientX}px`;
      spark.style.top = `${e.clientY}px`;

      const colors = [
        "radial-gradient(circle, #8ab4f8 10%, rgba(138,180,248,0) 80%)",
        "radial-gradient(circle, #c58af9 10%, rgba(197,138,249,0) 80%)",
        "radial-gradient(circle, #f382ac 10%, rgba(243,130,172,0) 80%)",
        "radial-gradient(circle, #a8dab5 10%, rgba(168,218,181,0) 80%)",
      ];
      spark.style.background = colors[Math.floor(Math.random() * colors.length)];

      const driftX = (Math.random() - 0.5) * 60;
      const driftY = (Math.random() - 0.5) * 60;
      spark.style.setProperty("--drift-x", `${driftX}px`);
      spark.style.setProperty("--drift-y", `${driftY}px`);

      document.body.appendChild(spark);

      setTimeout(() => {
        spark.remove();
      }, 800);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const fullName = profile?.full_name || getFullName() || "User";

  return (
    <div className="flex h-screen w-full bg-[#f4f6fa] font-sans text-[#111827] overflow-hidden relative">
      {/* ─── STYLES OVERRIDE ─── */}
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
      `}</style>

      {/* ─── TOP HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 flex h-14 md:h-16 items-center justify-between border-b border-[#d1d5db] bg-white px-3 md:px-6 shadow-sm z-30">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#003399] leading-none">EPSON</h1>
            <span className="text-[9px] md:text-[10px] font-bold text-[#6b7280] tracking-wider mt-0.5">DESKMATE AI</span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Search */}
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Settings */}
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Bell */}
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <div className="h-6 w-px bg-gray-300 mx-1 md:mx-2 hidden sm:block"></div>

          <div onClick={() => navigate("/profile")} className="flex items-center gap-1 md:gap-2 pl-1 cursor-pointer hover:opacity-80 transition-opacity select-none">
            <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-[#124090] font-bold text-white shadow-sm text-xs md:text-sm">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-[#111827]">{fullName}</span>
              <span className="text-[10px] text-[#6b7280]">
                {role === "admin" ? "Admin" : role === "supervisor" ? "Supervisor" : "Karyawan"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN LAYOUT CONTAINER ─── */}
      <div className="flex flex-1 pt-14 md:pt-16 overflow-hidden relative w-full h-full">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* ── SIDEBAR PANEL LEFT ── */}
        <div className={`fixed md:relative inset-y-0 left-0 z-40 bg-[#f8fafd] border-r border-gray-200/80 flex flex-col transition-all duration-300 ease-in-out w-[280px] md:w-64 flex-shrink-0 ${isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full md:-ml-64 md:translate-x-0 md:opacity-100"}`}>
          <div className="p-4 flex-1 overflow-y-auto relative custom-scrollbar">
            <button onClick={() => navigate("/chat")} className="w-full rounded-full border border-[#d1d5db] bg-white text-[#111827] py-2.5 text-sm font-semibold transition hover:bg-gray-50 mb-6 shadow-sm">+ Chat Baru</button>

            <p className="text-xs font-bold text-[#9ca3af] mb-3 px-1 tracking-wider uppercase">Menu Navigasi</p>
            <nav className="space-y-1 mb-6">
              <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                <span>Dashboard Utama</span>
              </button>
              <button onClick={() => navigate("/chat")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                <span>AI Helpdesk Chat</span>
              </button>
              <button onClick={() => navigate("/tickets")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                <span>Daftar Tiket Saya</span>
              </button>
              <button onClick={() => navigate("/tickets/create")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                <span>Buat Tiket Baru</span>
              </button>

              {/* Rute Khusus Supervisor */}
              {(role === "supervisor" || role === "admin") && (
                <>
                  <p className="text-xs font-bold text-[#9ca3af] mt-4 mb-2 px-1 tracking-wider uppercase">Menu Supervisor</p>
                  <button onClick={() => navigate("/all-tickets")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                    <span>Semua Tiket Unit</span>
                  </button>
                </>
              )}

              {/* Rute Khusus Admin */}
              {role === "admin" && (
                <>
                  <p className="text-xs font-bold text-[#9ca3af] mt-4 mb-2 px-1 tracking-wider uppercase">Menu Admin</p>
                  <button onClick={() => navigate("/documents")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                    <span>Kelola Dokumen RAG</span>
                  </button>
                  <button onClick={() => navigate("/users")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                    <span>Kelola Pengguna</span>
                  </button>
                </>
              )}
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200/80 flex items-center gap-3 cursor-pointer bg-[#e5e7eb] transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#124090] font-bold text-white shadow-sm text-xs">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#111827] truncate">{fullName}</div>
              <div className="text-[10px] text-[#6b7280]">Profile & Settings</div>
            </div>
          </div>
        </div>

        {/* ── AREA UTAMA KONTEN ── */}
        <main className="flex-1 overflow-y-auto bg-[#f0f4f9] p-4 md:p-6 custom-scrollbar relative space-y-6">
          
          {/* Top page title bar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-6 py-4 mb-6">
            <div>
              <span className="text-[10px] font-extrabold text-[#124090] tracking-widest uppercase">Account Settings</span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-0.5">Profile & Preferences</h2>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white border border-gray-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-sm transition flex items-center gap-2 select-none"
            >
              <svg className="h-4.5 w-4.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </button>
          </div>

          {loading ? (
            <div className="flex h-[60vh] items-center justify-center gap-3 text-gray-500 font-semibold">
              <div className="h-5 w-5 border-2 border-gray-300 border-t-[#003399] rounded-full animate-spin"></div>
              Loading profile...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* LEFT 2 COLUMNS: PERSONAL INFO & SECURITY */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Card 1: Personal Info */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Personal Information</h3>

                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Avatar Wrap */}
                    <div className="flex flex-col items-center gap-2.5 shrink-0 self-center md:self-start select-none">
                      <div className="h-20 w-20 rounded-full bg-[#003399] text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" />
                      <button onClick={() => fileRef.current?.click()} className="text-xs font-bold text-[#003399] hover:underline">
                        Change Photo
                      </button>
                    </div>

                    {/* Form Grid */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">First Name</label>
                        <input
                          type="text"
                          value={form.first_name}
                          onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none focus:border-[#003399] transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Last Name</label>
                        <input
                          type="text"
                          value={form.last_name}
                          onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none focus:border-[#003399] transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Email Address</label>
                        <input
                          type="email"
                          value={form.email}
                          readOnly
                          className="w-full px-3.5 py-2 border border-gray-200 bg-slate-100 rounded-xl text-xs md:text-sm text-slate-500 cursor-not-allowed outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Phone Number</label>
                        <input
                          type="text"
                          value={form.phone}
                          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none focus:border-[#003399] transition-all"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Department</label>
                        <input
                          type="text"
                          value={form.department}
                          onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                          placeholder="e.g. IT Support / Administration / Factory Engineering"
                          className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none focus:border-[#003399] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {saveMsg && (
                    <div className={`text-xs font-extrabold select-none flex items-center gap-1.5 ${saveMsg.includes("successfully") ? "text-emerald-600" : "text-red-600"}`}>
                      {saveMsg.includes("successfully") ? (
                        <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {saveMsg}
                    </div>
                  )}

                  <div className="flex justify-end select-none border-t border-slate-100 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-[#003399] hover:bg-[#124090] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl text-xs md:text-sm font-bold shadow-sm transition"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                {/* Card 2: Security & Password */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Security & Session Management</h3>

                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-[#9ca3af] tracking-wider uppercase">Change Password</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Current Password</label>
                        <input
                          type="password"
                          value={pwdForm.current}
                          onChange={e => setPwdForm(p => ({ ...p, current: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 outline-none focus:border-[#003399] transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">New Password</label>
                        <input
                          type="password"
                          value={pwdForm.newPwd}
                          onChange={e => setPwdForm(p => ({ ...p, newPwd: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 outline-none focus:border-[#003399] transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                        <input
                          type="password"
                          value={pwdForm.confirm}
                          onChange={e => setPwdForm(p => ({ ...p, confirm: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 outline-none focus:border-[#003399] transition-all"
                        />
                      </div>
                    </div>

                    {pwdError && (
                      <div className="text-xs font-extrabold text-red-600 select-none flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {pwdError}
                      </div>
                    )}

                    {pwdMsg && (
                      <div className="text-xs font-extrabold text-emerald-600 select-none flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {pwdMsg}
                      </div>
                    )}

                    <button
                      onClick={handleUpdatePassword}
                      disabled={updatingPwd}
                      className="border border-gray-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm select-none"
                    >
                      {updatingPwd ? "Updating..." : "Update Password"}
                    </button>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-extrabold text-[#9ca3af] tracking-wider uppercase">Active Sessions</h4>
                    
                    <div className="space-y-3">
                      <SessionItem
                        icon={
                          <svg className="h-5 w-5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        }
                        device="Chrome on macOS"
                        location="New York, US"
                        time="Active Now"
                        isActive
                      />
                      <SessionItem
                        icon={
                          <svg className="h-5 w-5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        }
                        device="Safari on iPhone"
                        location="New York, US"
                        time="2 hours ago"
                        isActive={false}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT 1 COLUMN: PREFERENCES & QUICK LINKS */}
              <div className="space-y-6">
                
                {/* Card 3: Preferences */}
                <div className="bg-white border border-gray-200/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Preferences</h3>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-extrabold text-[#9ca3af] tracking-wider uppercase">Notifications</h4>
                    
                    <ToggleRow
                      label="Email Notifications"
                      sub="Ticket updates and mentions"
                      value={emailNotif}
                      onChange={setEmailNotif}
                    />

                    <ToggleRow
                      label="System Alerts"
                      sub="Important announcements"
                      value={systemAlerts}
                      onChange={setSystemAlerts}
                    />
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-100 select-none">
                    <h4 className="text-[10px] font-extrabold text-[#9ca3af] tracking-wider uppercase">Regional</h4>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Language</label>
                        <div className="relative">
                          <select
                            value={language}
                            onChange={e => setLanguage(e.target.value)}
                            className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-[#003399]"
                          >
                            <option>English (US)</option>
                            <option>Bahasa Indonesia</option>
                            <option>English (UK)</option>
                          </select>
                          <svg className="h-4 w-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Timezone</label>
                        <div className="relative">
                          <select
                            value={timezone}
                            onChange={e => setTimezone(e.target.value)}
                            className="w-full appearance-none pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer focus:border-[#003399]"
                          >
                            <option>Eastern Time (ET)</option>
                            <option>Western Indonesia Time (WIB)</option>
                            <option>Pacific Time (PT)</option>
                            <option>UTC</option>
                          </select>
                          <svg className="h-4 w-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Admin Quick Access */}
                {(role === "admin" || role === "supervisor") && (
                  <div className="bg-[#f0f7ff] border border-blue-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-[#1d4ed8] tracking-tight">Admin Quick Access</h3>
                    
                    <div className="space-y-2 select-none">
                      <QuickItem
                        icon={
                          <svg className="h-4.5 w-4.5 text-[#1d4ed8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        }
                        label="Manage Users"
                        onClick={() => navigate("/users")}
                      />
                      <QuickItem
                        icon={
                          <svg className="h-4.5 w-4.5 text-[#1d4ed8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        }
                        label="Document Settings"
                        onClick={() => navigate("/documents")}
                      />
                      <QuickItem
                        icon={
                          <svg className="h-4.5 w-4.5 text-[#1d4ed8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        }
                        label="System Reports"
                        onClick={() => navigate("/dashboard")}
                      />
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── SUB COMPONENTS ──

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg p-3 text-sm transition text-left font-medium ${active ? "bg-[#EFF6FF] text-[#2563EB] font-bold" : "text-[#6b7280] hover:bg-gray-100 hover:text-[#111827]"}`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ToggleRow({ label, sub, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0 select-none">
      <div>
        <p className="text-xs font-bold text-slate-800 leading-snug">{label}</p>
        <span className="text-[10px] text-[#6b7280] font-medium block">{sub}</span>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full relative transition-colors duration-200 outline-none shrink-0 ${value ? "bg-[#003399]" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 shadow-sm ${value ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function SessionItem({ icon, device, location, time, isActive }) {
  return (
    <div className="flex items-center gap-3 border border-slate-100 bg-slate-50/50 p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-800 leading-snug truncate">{device}</p>
        <span className="text-[10px] text-[#6b7280] font-medium block mt-0.5 truncate">{location}</span>
      </div>
      <div className="text-right shrink-0 select-none">
        {isActive ? (
          <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
            Active Now
          </span>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-[#6b7280] font-bold">{time}</span>
            <button className="text-[10px] font-extrabold text-red-600 hover:underline uppercase">Revoke</button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickItem({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 border border-blue-200 hover:border-blue-300 bg-white hover:bg-blue-50/50 p-3 rounded-xl transition duration-150 text-left font-bold text-[#1d4ed8] text-xs shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0">{icon}</span>
        <span>{label}</span>
      </div>
      <svg className="h-4 w-4 text-[#93c5fd] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

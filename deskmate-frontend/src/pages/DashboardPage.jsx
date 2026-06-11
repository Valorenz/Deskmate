// src/pages/DashboardPage.jsx
// -------------------------------------------------------
// Employee Dashboard DeskMate (Redesigned with Premium Chatbot Aesthetics)
// Sesuai desain screenshot: sidebar kiri, stat cards, quick actions,
// recent tickets, system alerts, user profile card, Epson Brand Guideline
// -------------------------------------------------------

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole, getAvatarUrl, logout } from "../utils/auth";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ open: 0, awaiting: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const role = getRole();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Ambil profil
      const profileRes = await apiFetch("/api/v1/profiles/me");
      if (profileRes?.ok) {
        const p = await profileRes.json();
        setProfile(p);
      }

      // Ambil stats riil
      const statsRes = await apiFetch("/api/v1/tickets/stats/employee");
      if (statsRes?.ok) {
        setStats(await statsRes.json());
      }

      // Ambil tiket
      const ticketRes = await apiFetch("/api/v1/tickets/?size=5");
      if (ticketRes?.ok) {
        const data = await ticketRes.json();
        const items = data.items || [];
        setTickets(items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const statusBadge = (status) => {
    const map = {
      open: { label: "Open", bg: "#DBEAFE", color: "#1D4ED8" },
      in_progress: { label: "Awaiting Response", bg: "#FEF9C3", color: "#B45309" },
      resolved: { label: "Resolved", bg: "#DCFCE7", color: "#15803D" },
      closed: { label: "Closed", bg: "#F3F4F6", color: "#6B7280" },
    };
    const s = map[status] || map.open;
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}>
        {s.label}
      </span>
    );
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Replacement for raw priority emojis
  const renderPriorityBadge = (priority) => {
    if (priority === "critical" || priority === "high") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md uppercase shrink-0">
          <svg className="h-3 w-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          HIGH
        </span>
      );
    }
    if (priority === "medium") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md uppercase shrink-0">
          <svg className="h-3 w-3 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          MID
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md uppercase shrink-0">
        <svg className="h-3 w-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        LOW
      </span>
    );
  };

  const fullName = profile?.full_name || getFullName() || "User";

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
        'radial-gradient(circle, #8ab4f8 10%, rgba(138,180,248,0) 80%)', // Blue
        'radial-gradient(circle, #c58af9 10%, rgba(197,138,249,0) 80%)', // Purple
        'radial-gradient(circle, #f382ac 10%, rgba(243,130,172,0) 80%)', // Pink
        'radial-gradient(circle, #a8dab5 10%, rgba(168,218,181,0) 80%)', // Green
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
    <div className="flex h-screen w-full bg-[#f4f6fa] font-sans text-[#111827] overflow-hidden relative">
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

      {/* ─── TOP HEADER (MATCHES CHATBOT HEADER) ─── */}
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
          {/* Search Button */}
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Settings Button */}
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Bell / Toggle Panel Button */}
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <div className="h-6 w-px bg-gray-300 mx-1 md:mx-2 hidden sm:block"></div>

          <div onClick={() => navigate("/profile")} className="flex items-center gap-1 md:gap-2 pl-1 cursor-pointer hover:opacity-80 transition-opacity select-none">
            {profile?.avatar_url || getAvatarUrl() ? (
              <img src={profile?.avatar_url || getAvatarUrl()} alt="Avatar" className="flex h-8 w-8 md:h-9 md:w-9 rounded-full object-cover shadow-sm border border-slate-200" />
            ) : (
              <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-[#124090] font-bold text-white shadow-sm text-xs md:text-sm">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
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
        <div className={`fixed md:relative inset-y-0 left-0 z-40 bg-[#f8fafd] border-r border-gray-200/80 flex flex-col transition-all duration-300 ease-in-out w-[280px] md:w-64 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full md:-ml-64 md:translate-x-0 md:opacity-100'}`}>
          <div className="p-4 flex-1 overflow-y-auto relative">
            <button onClick={() => navigate("/chat")} className="w-full rounded-full border border-[#d1d5db] bg-white text-[#111827] py-2.5 text-sm font-semibold transition hover:bg-gray-50 mb-6 shadow-sm">+ Chat Baru</button>

            <p className="text-xs font-bold text-[#9ca3af] mb-3 px-1 tracking-wider uppercase">Menu Navigasi</p>
            <nav className="space-y-1 mb-6">
              <span className="flex items-center gap-3 bg-[#e5e7eb] text-[#111827] rounded-lg p-3 text-sm font-semibold cursor-default">
                <span>Dashboard Utama</span>
              </span>
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

          <div className="p-4 border-t border-gray-200/80 flex items-center gap-3 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => navigate("/profile")}>
            {profile?.avatar_url || getAvatarUrl() ? (
              <img src={profile?.avatar_url || getAvatarUrl()} alt="Avatar" className="h-8 w-8 rounded-full object-cover shadow-sm border border-slate-200" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#124090] font-bold text-white shadow-sm text-xs">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#111827] truncate">{fullName}</div>
              <div className="text-[10px] text-[#6b7280]">Profile & Settings</div>
            </div>
          </div>
        </div>

        {/* ── AREA UTAMA KONTEN DASHBOARD (PREMIUM CORPORATE DECK STYLE) ── */}
        <main className="flex-1 overflow-y-auto bg-[#f0f4f9] p-4 md:p-6 space-y-6">

          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-[#124090] tracking-widest uppercase">Epson Management Hub</span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">Dashboard Karyawan</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">Kelola antrean bantuan IT helpdesk operasional Anda dan pantuan troubleshoot mesin.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* LEFT COLUMN: STATS, QUICK ACTIONS, RECENT ACTIVITY */}
            <div className="lg:col-span-2 space-y-6">

              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">Open Tickets</span>
                    <h3 className="text-3xl font-black text-slate-800 mt-1">{loading ? "—" : stats.open}</h3>
                    <p className="text-[10px] text-[#6b7280] mt-1">Dalam antrean bantuan</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>

                <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 tracking-wider uppercase">Awaiting Response</span>
                    <h3 className="text-3xl font-black text-slate-800 mt-1">{loading ? "—" : stats.awaiting}</h3>
                    <p className="text-[10px] text-[#6b7280] mt-1">Menunggu respon teknisi</p>
                  </div>
                  <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-green-600 tracking-wider uppercase">Resolved Tickets</span>
                    <h3 className="text-3xl font-black text-slate-800 mt-1">{loading ? "—" : stats.resolved}</h3>
                    <p className="text-[10px] text-[#6b7280] mt-1">Telah sukses diselesaikan</p>
                  </div>
                  <div className="h-10 w-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-extrabold text-slate-400 tracking-wider mb-4 uppercase">Akses Cepat</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <button onClick={() => navigate("/tickets/create")} className="flex items-center gap-4 bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md rounded-2xl p-4 transition-all duration-300 text-left w-full cursor-pointer group">
                    <div className="h-11 w-11 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-[#124090] text-xl font-bold flex items-center justify-center transition-colors">
                      <svg className="h-5 w-5 text-[#124090]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800">Buat Tiket Baru</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Laporkan masalah teknis ke IT</p>
                    </div>
                  </button>

                  <button onClick={() => navigate("/chat")} className="flex items-center gap-4 bg-gradient-to-br from-[#124090] via-[#003399] to-[#8ab4f8] hover:shadow-lg rounded-2xl p-4 transition-all duration-300 text-left w-full cursor-pointer group">
                    <div className="h-11 w-11 rounded-xl bg-white/20 text-white text-xl flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">AI Helpdesk Chat</h4>
                      <p className="text-xs text-white/85 mt-0.5">Konsultasi solusi instan mesin</p>
                    </div>
                  </button>

                </div>
              </div>

              {/* Recent Ticket Activity */}
              <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                  <h3 className="text-xs font-bold text-[#9ca3af] tracking-wider uppercase">Aktivitas Tiket Terbaru</h3>
                  <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors" onClick={() => navigate("/tickets")}>Lihat Semua</button>
                </div>

                {loading ? (
                  <div className="text-center py-6 text-sm text-gray-400 flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-gray-300 border-t-[#124090] rounded-full animate-spin"></div>
                    Memuat tiket...
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400 italic">Belum ada aktivitas tiket. Silakan buat tiket pertama Anda!</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {tickets.map((t) => (
                      <div key={t.id} className="flex gap-4 py-3.5 hover:bg-slate-50/50 px-2 rounded-xl transition-all duration-200 cursor-pointer items-start" onClick={() => navigate(`/tickets/${t.id}`)}>
                        <div className="mt-1 shrink-0">
                          {renderPriorityBadge(t.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{t.title}</h4>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.description}</p>
                          <div className="mt-2 flex items-center gap-2">
                            {statusBadge(t.status)}
                            <span className="text-[10px] text-gray-400 font-medium">• #{t.ticket_number}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400 shrink-0 font-medium mt-1">{timeAgo(t.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: SYSTEM ALERTS, PROFILE DECK CARD */}
            <div className="space-y-6">

              {/* System Alerts Deck */}
              <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <h3 className="text-xs font-bold text-[#9ca3af] tracking-wider uppercase">Pemberitahuan Sistem</h3>
                  <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">2</span>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3 items-start p-3 bg-blue-50/40 rounded-xl border border-blue-100/50">
                    <div className="h-7 w-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Pemeliharaan Terjadwal</h4>
                      <p className="text-[11px] text-gray-400 mt-1 leading-normal">Layanan IT akan mengalami pemeliharaan rutin pada Sabtu besok pukul 02:00 - 04:00 WIB.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-gray-100">
                    <div className="h-7 w-7 bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                      <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Kebijakan Baru HR</h4>
                      <p className="text-[11px] text-gray-400 mt-1 leading-normal">Silakan periksa pembaharuan pedoman kerja jarak jauh pada menu kelola dokumen panduan.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Deck Card */}
              <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm flex flex-col items-center select-none">
                {profile?.avatar_url || getAvatarUrl() ? (
                  <img src={profile?.avatar_url || getAvatarUrl()} alt="Avatar" className="h-16 w-16 rounded-full object-cover shadow-md border border-slate-200 mb-4" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-[#124090] text-white flex items-center justify-center text-2xl font-black shadow-sm mb-4">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="text-sm font-black text-slate-800 text-center truncate w-full">{fullName}</h3>
                <p className="text-xs text-gray-400 text-center mt-1 w-full truncate">{profile?.department || "Operasional Manufaktur"}</p>

                <div className="w-full h-px bg-gray-100 my-4" />

                <div className="w-full space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">ID Karyawan</span>
                    <span className="font-bold text-slate-800">{profile?.employee_id || "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Lokasi Kerja</span>
                    <span className="font-bold text-slate-800">Plant B - Epson</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Hak Akses</span>
                    <span className="font-bold text-slate-800 capitalize">{role}</span>
                  </div>
                </div>

                <button onClick={() => setShowLogoutConfirm(true)} className="mt-6 w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-bold transition-colors border-none cursor-pointer">
                  Keluar / Logout
                </button>
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl transform scale-100 transition-all duration-300">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <svg className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <h3 className="text-base font-extrabold text-slate-950 uppercase tracking-wider">Konfirmasi Keluar</h3>
            </div>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">Apakah Anda yakin ingin keluar dari sistem DeskMate? Sesi login aktif Anda saat ini akan diakhiri.</p>
            <div className="flex justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 border border-gray-200 hover:bg-slate-50 text-xs font-bold rounded-xl text-slate-600 transition border-none cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition duration-200 border-none cursor-pointer shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// src/pages/TicketListPage.jsx
// -------------------------------------------------------
// Employee Ticket List DeskMate (Premium Tailwind Version)
// Koneksi Backend:
// - GET /api/v1/profiles/me
// - GET /api/v1/tickets/ (Paginated listing with filters)
// -------------------------------------------------------

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole, getAvatarUrl } from "../utils/auth";

const STATUS_OPTIONS = ["All", "open", "in_progress", "resolved", "closed"];
const PRIORITY_OPTIONS = ["All", "low", "medium", "high", "critical"];

const STATUS_STYLE = {
  open:        { label: "Open",        bg: "#DBEAFE", color: "#1D4ED8" },
  in_progress: { label: "In Progress", bg: "#FEF9C3", color: "#B45309" },
  resolved:    { label: "Resolved",    bg: "#DCFCE7", color: "#15803D" },
  closed:      { label: "Closed",      bg: "#F3F4F6", color: "#6B7280" },
};

export default function TicketListPage() {
  const navigate = useNavigate();
  const role = getRole();

  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selected, setSelected] = useState([]);
  const PAGE_SIZE = 5;

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { loadTickets(); }, [statusFilter, priorityFilter, page]);

  async function loadProfile() {
    const res = await apiFetch("/api/v1/profiles/me");
    if (res?.ok) setProfile(await res.json());
  }

  async function loadTickets() {
    setLoading(true);
    try {
      let url = `/api/v1/tickets/?size=${PAGE_SIZE}&page=${page}`;
      if (statusFilter !== "All") url += `&status=${statusFilter}`;
      if (priorityFilter !== "All") url += `&priority=${priorityFilter}`;

      const res = await apiFetch(url);
      if (res?.ok) {
        const data = await res.json();
        setTickets(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.pages || 1);

        // Stats dari semua tiket
        const allRes = await apiFetch("/api/v1/tickets/?size=100");
        if (allRes?.ok) {
          const allData = await allRes.json();
          const all = allData.items || [];
          setStats({
            total: allData.total || 0,
            open: all.filter((t) => t.status === "open").length,
            resolved: all.filter((t) => t.status === "resolved" || t.status === "closed").length,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredTickets = tickets.filter((t) =>
    search === "" ||
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_number?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelected(selected.length === filteredTickets.length ? [] : filteredTickets.map((t) => t.id));

  const timeAgo = (dateStr) => {
    if (!dateStr) return "—";
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) {
      const d = new Date(dateStr);
      return `Today, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (diff < 172800) {
      const d = new Date(dateStr);
      return `Yesterday, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const renderPriorityBadge = (priority) => {
    if (priority === "critical" || priority === "high") {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-red-600">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          High
        </span>
      );
    }
    if (priority === "medium") {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Medium
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        Low
      </span>
    );
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

  const fullName = profile?.full_name || getFullName() || "User";

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
            className="rounded-lg p-2 text-[#6b7280] hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center border-none bg-transparent cursor-pointer"
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
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center border-none bg-transparent cursor-pointer">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Settings Button */}
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center border-none bg-transparent cursor-pointer">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Bell / Toggle Panel Button */}
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center border-none bg-transparent cursor-pointer">
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
              <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                <span>Dashboard Utama</span>
              </button>
              <button onClick={() => navigate("/chat")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                <span>AI Helpdesk Chat</span>
              </button>
              <span className="flex items-center gap-3 bg-[#e5e7eb] text-[#111827] rounded-lg p-3 text-sm font-semibold cursor-default">
                <span>Daftar Tiket Saya</span>
              </span>
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

        {/* ── AREA UTAMA KONTEN (PREMIUM CORPORATE DECK) ── */}
        <main className="flex-1 overflow-y-auto bg-[#f0f4f9] p-4 md:p-6 space-y-6">
          
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="hover:text-[#124090] cursor-pointer" onClick={() => navigate("/dashboard")}>Home</span>
              <span>/</span>
              <span className="text-[#111827] font-semibold">My Tickets</span>
            </div>
            <div>
              <button 
                onClick={() => navigate("/tickets/create")}
                className="bg-[#124090] hover:bg-[#0e306e] text-white text-xs font-bold px-4 py-2 rounded-xl transition duration-200 shadow-sm border-none cursor-pointer"
              >
                + New Ticket
              </button>
            </div>
          </div>

          {/* Section Header & Stats */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Daftar Tiket Saya</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">Kelola dan pantau seluruh laporan kendala mesin dan IT Anda.</p>
            </div>

            {/* Stat Cards (All Emojis replaced with SVGs) */}
            <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0 shrink-0">
              <div className="bg-white border border-gray-200/60 rounded-xl p-3 px-4 shadow-sm flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="h-4. w-4." fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">TOTAL</div>
                  <div className="text-sm font-bold text-slate-800">{stats.total}</div>
                </div>
              </div>

              <div className="bg-white border border-gray-200/60 rounded-xl p-3 px-4 shadow-sm flex items-center gap-3">
                <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="h-4. w-4. animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">OPEN</div>
                  <div className="text-sm font-bold text-slate-800">{stats.open}</div>
                </div>
              </div>

              <div className="bg-white border border-gray-200/60 rounded-xl p-3 px-4 shadow-sm flex items-center gap-3">
                <div className="h-8 w-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="h-4. w-4." fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">RESOLVED</div>
                  <div className="text-sm font-bold text-slate-800">{stats.resolved}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Card (Corporate Deck Style) */}
          <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden">
            
            {/* Toolbar Filters */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 flex-1 max-w-md w-full">
                <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search tickets by ID, subject..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="bg-transparent border-none outline-none text-xs text-slate-700 w-full placeholder-gray-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 pr-7 text-xs text-slate-700 outline-none cursor-pointer appearance-none font-medium"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>Status: {o === "All" ? "All" : STATUS_STYLE[o]?.label || o}</option>
                    ))}
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">▼</span>
                </div>

                <div className="relative">
                  <select
                    value={priorityFilter}
                    onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                    className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 pr-7 text-xs text-slate-700 outline-none cursor-pointer appearance-none font-medium"
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o} value={o}>Priority: {o.toUpperCase()}</option>
                    ))}
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">▼</span>
                </div>
              </div>
            </div>

            {/* Table Listing */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-10">
                      <input
                        type="checkbox"
                        checked={selected.length === filteredTickets.length && filteredTickets.length > 0}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 accent-[#124090] cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-28">Ticket ID</th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Subject</th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-28">Status</th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-28">Priority</th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-36">Last Updated</th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-24">Assignee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-xs text-gray-400 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 border-2 border-gray-300 border-t-[#124090] rounded-full animate-spin"></div>
                          Loading tickets...
                        </div>
                      </td>
                    </tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center select-none">
                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800">No tickets found</h4>
                          <p className="text-[11px] text-gray-400 mt-0.5">Buat tiket pertama Anda untuk melaporkan keluhan operasional.</p>
                          <button 
                            onClick={() => navigate("/tickets/create")}
                            className="mt-3 bg-[#124090] hover:bg-[#0e306e] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition border-none cursor-pointer shadow-sm"
                          >
                            + New Ticket
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const st = STATUS_STYLE[ticket.status] || STATUS_STYLE.open;
                      const isSelected = selected.includes(ticket.id);
                      return (
                        <tr
                          key={ticket.id}
                          className={`hover:bg-slate-50/40 transition cursor-pointer ${isSelected ? 'bg-blue-50/20' : ''}`}
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                          <td className="p-3.5" onClick={(e) => { e.stopPropagation(); toggleSelect(ticket.id); }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => toggleSelect(ticket.id)} 
                              className="w-3.5 h-3.5 accent-[#124090] cursor-pointer" 
                            />
                          </td>
                          <td className="p-3.5">
                            <span className="text-xs font-black text-[#124090] font-mono">#{ticket.ticket_number}</span>
                          </td>
                          <td className="p-3.5 min-w-[200px]">
                            <div className="text-xs font-bold text-slate-800">{ticket.title}</div>
                            {ticket.category && (
                              <div className="text-[10px] text-gray-400 mt-0.5 font-medium">{ticket.category}</div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {renderPriorityBadge(ticket.priority)}
                          </td>
                          <td className="p-3.5 text-xs text-slate-500 font-medium">
                            {timeAgo(ticket.updated_at || ticket.created_at)}
                          </td>
                          <td className="p-3.5">
                            {ticket.assignee ? (
                              <div className="flex items-center gap-1.5" title={ticket.assignee.full_name}>
                                {ticket.assignee.avatar_url ? (
                                  <img src={ticket.assignee.avatar_url} alt="Avatar" className="w-5. h-5. rounded-full object-cover shadow-sm border border-slate-200" />
                                ) : (
                                  <div className="w-5. h-5. rounded-full bg-[#124090] text-white flex items-center justify-center font-bold text-[10px]">
                                    {ticket.assignee.full_name?.charAt(0)?.toUpperCase()}
                                  </div>
                                )}
                                <span className="text-[10px] text-slate-700 font-bold truncate max-w-[60px]">
                                  {ticket.assignee.full_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
            {!loading && totalItems > 0 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium select-none">
                <span>
                  Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalItems)} to{" "}
                  {Math.min(page * PAGE_SIZE, totalItems)} of {totalItems} entries
                </span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setPage((p) => Math.max(1, p - 1))} 
                    disabled={page === 1}
                    className="h-7 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-slate-600 disabled:opacity-40 transition cursor-pointer flex items-center justify-center font-bold"
                  >
                    ◄
                  </button>
                  {page > 2 && (
                    <>
                      <button onClick={() => setPage(1)} className="h-7 w-7 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-slate-600 cursor-pointer flex items-center justify-center font-bold">1</button>
                      <span className="px-1">...</span>
                    </>
                  )}
                  <span className="h-7 w-7 bg-[#124090] text-white border border-[#124090] rounded-lg flex items-center justify-center font-bold">
                    {page}
                  </span>
                  {page < totalPages && (
                    <>
                      <span className="px-1">...</span>
                      <button onClick={() => setPage(totalPages)} className="h-7 w-7 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-slate-600 cursor-pointer flex items-center justify-center font-bold">{totalPages}</button>
                    </>
                  )}
                  <button 
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                    disabled={page === totalPages}
                    className="h-7 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-slate-600 disabled:opacity-40 transition cursor-pointer flex items-center justify-center font-bold"
                  >
                    ►
                  </button>
                </div>
              </div>
            )}

          </div>

        </main>
      </div>
    </div>
  );
}

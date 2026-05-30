// src/pages/AllTicketsPage.jsx
// -------------------------------------------------------
// Supervisor All Tickets Management Page
// Koneksi Backend:
// - GET /api/v1/profiles/me
// - GET /api/v1/tickets/ (Paginated listing with filters)
// -------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole } from "../utils/auth";

const STATUS_OPTIONS  = ["All", "open", "in_progress", "pending_vendor", "resolved", "closed"];
const PRIORITY_OPTIONS = ["All", "low", "medium", "high", "critical"];

const STATUS_STYLE = {
  open:           { label: "Open",           bg: "#DBEAFE", color: "#1D4ED8" },
  in_progress:    { label: "In Progress",    bg: "#FEF9C3", color: "#B45309" },
  pending_vendor: { label: "Pending Vendor", bg: "#EDE9FE", color: "#6D28D9" },
  resolved:       { label: "Resolved",       bg: "#DCFCE7", color: "#15803D" },
  closed:         { label: "Closed",         bg: "#F3F4F6", color: "#6B7280" },
};

const PRIORITY_STYLE = {
  low:      { label: "Low",      bg: "#F0FDF4", color: "#15803D" },
  medium:   { label: "Medium",   bg: "#FFFBEB", color: "#B45309" },
  high:     { label: "High",     bg: "#FEF2F2", color: "#DC2626" },
  critical: { label: "Critical", bg: "#F5F3FF", color: "#7C3AED" },
};

const SLA_STYLE = {
  due_soon:  { label: "Due in 2h",     color: "#DC2626", bold: true },
  due_days:  { label: "Due in 2 days", color: "#374151" },
  due_tom:   { label: "Due tomorrow",  color: "#B45309" },
  met:       { label: "Met SLA",       color: "#15803D" },
};

const fakeSLA = (ticket) => {
  if (ticket.priority === "critical" || ticket.priority === "high") return SLA_STYLE.due_soon;
  if (ticket.priority === "medium") return SLA_STYLE.due_tom;
  if (ticket.status === "resolved") return SLA_STYLE.met;
  return SLA_STYLE.due_days;
};

const AVATAR_COLORS = ["#2563EB","#7C3AED","#059669","#D97706","#DC2626","#0891B2"];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function AllTicketsPage() {
  const navigate = useNavigate();
  const role = getRole();

  const [profile, setProfile]       = useState(null);
  const [tickets, setTickets]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("All");
  const [priorityFilter, setPriority] = useState("All");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected]     = useState([]);
  const [openMenu, setOpenMenu]     = useState(null);
  const PAGE_SIZE = 10;

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const menuRef = useRef(null);

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { loadTickets(); }, [statusFilter, priorityFilter, page]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadProfile() {
    const r = await apiFetch("/api/v1/profiles/me");
    if (r?.ok) setProfile(await r.json());
  }

  async function loadTickets() {
    setLoading(true);
    try {
      let url = `/api/v1/tickets/?size=${PAGE_SIZE}&page=${page}`;
      if (statusFilter !== "All") url += `&status=${statusFilter}`;
      if (priorityFilter !== "All") url += `&priority=${priorityFilter}`;
      const r = await apiFetch(url);
      if (r?.ok) {
        const d = await r.json();
        setTickets(d.items || []);
        setTotal(d.total || 0);
        setTotalPages(d.pages || 1);
      }
    } finally { setLoading(false); }
  }

  const filtered = tickets.filter(t =>
    !search ||
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_number?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map(t => t.id));

  const timeAgo = (d) => {
    if (!d) return "—";
    const diff = Math.floor((Date.now() - new Date(d)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
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
    <div className="flex h-screen w-full bg-[#f4f6fa] font-sans text-[#111827] overflow-hidden relative" onClick={() => setOpenMenu(null)}>
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
            onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }} 
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
                  <span className="flex items-center gap-3 bg-[#e5e7eb] text-[#111827] rounded-lg p-3 text-sm font-semibold cursor-default">
                    <span>Semua Tiket Unit</span>
                  </span>
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#124090] font-bold text-white shadow-sm text-xs">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#111827] truncate">{fullName}</div>
              <div className="text-[10px] text-[#6b7280]">Profile & Settings</div>
            </div>
          </div>
        </div>

        {/* ── AREA UTAMA KONTEN (PREMIUM CORPORATE DECK) ── */}
        <main className="flex-1 overflow-y-auto bg-[#f0f4f9] p-4 md:p-6 space-y-6">
          
          {/* Breadcrumbs */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="hover:text-[#124090] cursor-pointer" onClick={() => navigate("/dashboard")}>Home</span>
              <span>/</span>
              <span className="text-[#111827] font-semibold">All Tickets</span>
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

          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold text-[#124090] tracking-widest uppercase">Epson Ops Command</span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">Semua Tiket Unit</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">Kelola, delegasikan teknisi, dan pantau SLA seluruh tiket organisasi.</p>
            </div>
          </div>

          {/* Filter Bar Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-[#124090] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm shrink-0">
              {total} Active Tickets
            </div>

            <div className="relative">
              <select 
                value={statusFilter} 
                onChange={e => { setStatus(e.target.value); setPage(1); }} 
                className="bg-white border border-gray-200 rounded-xl px-3.5 py-1.5 pr-7 text-xs text-slate-700 outline-none cursor-pointer appearance-none font-medium"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o} value={o}>Status: {STATUS_STYLE[o]?.label || o}</option>
                ))}
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">▼</span>
            </div>

            <div className="relative">
              <select 
                value={priorityFilter} 
                onChange={e => { setPriority(e.target.value); setPage(1); }} 
                className="bg-white border border-gray-200 rounded-xl px-3.5 py-1.5 pr-7 text-xs text-slate-700 outline-none cursor-pointer appearance-none font-medium"
              >
                {PRIORITY_OPTIONS.map(o => (
                  <option key={o} value={o}>Priority: {o.toUpperCase()}</option>
                ))}
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">▼</span>
            </div>
          </div>

          {/* Table Container Card (Corporate Deck Style) */}
          <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden">
            
            {/* Search toolbar */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 flex-1 max-w-md w-full">
                <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search tickets by subject, description or ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-slate-700 w-full placeholder-gray-400"
                />
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
                        checked={selected.length === filtered.length && filtered.length > 0} 
                        onChange={toggleAll} 
                        className="w-3.5 h-3.5 accent-[#124090] cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Ticket Info</th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-44">Requester</th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-52">Status & Priority</th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-44">Assignee</th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-40">SLA / Updated</th>
                    <th className="p-3.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-10"></th>
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
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-xs text-gray-400 italic">
                        No tickets found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(ticket => {
                      const st  = STATUS_STYLE[ticket.status] || STATUS_STYLE.open;
                      const pr  = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.medium;
                      const sla = fakeSLA(ticket);
                      const isSelected = selected.includes(ticket.id);
                      const reqName = ticket.creator?.full_name || "Unknown";
                      const assigneeName = ticket.assignee?.full_name;
                      return (
                        <tr 
                          key={ticket.id} 
                          className={`hover:bg-slate-50/40 transition cursor-pointer ${isSelected ? 'bg-blue-50/20' : ''}`}
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                          <td className="p-3.5" onClick={e => { e.stopPropagation(); setSelected(p => p.includes(ticket.id) ? p.filter(x=>x!==ticket.id) : [...p, ticket.id]); }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => {}} 
                              className="w-3.5 h-3.5 accent-[#124090] cursor-pointer"
                            />
                          </td>
                          <td className="p-3.5 min-w-[200px]">
                            <div className="text-xs font-bold text-slate-800">{ticket.title}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5 font-medium">#{ticket.ticket_number} • {ticket.category || "General"}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-[10px]" style={{ background: avatarColor(reqName) }}>
                                {reqName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-slate-700 font-bold truncate max-w-[120px]">{reqName}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{ background: pr.bg, color: pr.color }}>{pr.label}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {assigneeName ? (
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full text-white flex items-center justify-center font-bold text-[9px]" style={{ background: avatarColor(assigneeName) }}>
                                  {assigneeName.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs text-slate-700 font-bold truncate max-w-[120px]">{assigneeName}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="text-xs font-semibold" style={{ color: sla.color }}>{sla.label}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{timeAgo(ticket.updated_at || ticket.created_at)}</div>
                          </td>
                          <td className="p-3.5 relative" onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === ticket.id ? null : ticket.id); }}>
                            <button className="text-gray-400 hover:text-slate-800 transition font-bold p-1">⋮</button>
                            {openMenu === ticket.id && (
                              <div ref={menuRef} className="absolute right-2.5 top-9 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-40 z-50 text-left">
                                <button onClick={() => navigate(`/tickets/${ticket.id}`)} className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 border-none bg-transparent cursor-pointer">View Details</button>
                                <button className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 border-none bg-transparent cursor-pointer">Assign to Me</button>
                                <button className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5 border-t border-gray-100 border-none bg-transparent cursor-pointer">Close Ticket</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {!loading && total > 0 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium select-none">
                <span>Showing {Math.min((page-1)*PAGE_SIZE+1, total)} to {Math.min(page*PAGE_SIZE, total)} of {total} tickets</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setPage(p => Math.max(1,p-1))} 
                    disabled={page===1}
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
                    onClick={() => setPage(p => Math.min(totalPages,p+1))} 
                    disabled={page===totalPages}
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

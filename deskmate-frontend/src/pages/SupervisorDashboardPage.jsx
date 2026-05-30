// src/pages/SupervisorDashboardPage.jsx
// -------------------------------------------------------
// Supervisor Dashboard DeskMate (Redesigned with Premium Chatbot Aesthetics)
// Sesuai desain screenshot: 4 stat cards, line chart ticket trends,
// donut chart SLA compliance, team performance table, quick actions, Tailwind CSS
// -------------------------------------------------------

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole, logout } from "../utils/auth";

// ── Mini Line Chart (SVG) ──────────────────────────────
function LineChart({ data, color = "#2563EB", height = 120 }) {
  if (!data || data.length === 0) return null;
  const w = 400, h = height, pad = 20;
  const max = Math.max(...data) || 1;
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const area = `M${pts[0]} ` + pts.slice(1).map(p => `L${p}`).join(" ") +
    ` L${w - pad},${h - pad} L${pad},${h - pad} Z`;
  const line = `M${pts[0]} ` + pts.slice(1).map(p => `L${p}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Donut Chart (SVG) ──────────────────────────────────
function DonutChart({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 60, cx = 80, cy = 80, stroke = 28;
  let offset = 0;
  const circumference = 2 * Math.PI * r;
  const arcs = segments.map((seg) => {
    const pct = seg.value / total;
    const dash = pct * circumference;
    const arc = { ...seg, dash, offset, pct };
    offset += dash;
    return arc;
  });
  return (
    <svg viewBox="0 0 160 160" style={{ width: 160, height: 160 }}>
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={stroke}
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={-arc.offset + circumference * 0.25}
          strokeLinecap="butt"
        />
      ))}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="white" />
    </svg>
  );
}

export default function SupervisorDashboardPage() {
  const navigate = useNavigate();
  const role = getRole();
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, overdue: 0, unassigned: 0, avgResponse: "1.4h" });
  const [trendFilter, setTrendFilter] = useState("Last 7 Days");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Mock trend data (7 days)
  const trendData = [32, 45, 58, 62, 48, 35, 20];
  const trendLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Mock team data
  const teamData = [
    { name: "Mark Johnson", open: 12, resolved: 45, csat: "4.8/5", status: "Online", color: "#2563EB" },
    { name: "Sarah Connor", open: 18, resolved: 38, csat: "4.9/5", status: "Busy",   color: "#7C3AED" },
    { name: "James Wilson", open: 8,  resolved: 52, csat: "4.7/5", status: "Offline", color: "#059669" },
  ];

  const slaSegments = [
    { value: 75, color: "#22C55E", label: "Met SLA" },
    { value: 15, color: "#F59E0B", label: "Near Breach" },
    { value: 10, color: "#EF4444", label: "Breached" },
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const pr = await apiFetch("/api/v1/profiles/me");
      if (pr?.ok) setProfile(await pr.json());

      const tr = await apiFetch("/api/v1/tickets/?size=100");
      if (tr?.ok) {
        const data = await tr.json();
        const items = data.items || [];
        setTickets(items.slice(0, 5));
        setStats({
          total: data.total || 0,
          overdue: items.filter((t) => t.priority === "critical" || t.priority === "high").length,
          unassigned: items.filter((t) => !t.assigned_to).length,
          avgResponse: "1.4h",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const statusBadge = (status) => {
    const map = {
      Online: { bg: "#DCFCE7", color: "#15803D" },
      Busy: { bg: "#FEF9C3", color: "#B45309" },
      Offline: { bg: "#F3F4F6", color: "#6B7280" }
    };
    const st = map[status] || map.Offline;
    return (
      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
        {status}
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#124090] font-bold text-white shadow-sm text-xs">
              {fullName.charAt(0).toUpperCase()}
            </div>
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
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">Supervisor Dashboard</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">Analisis performa penyelesaian SLA, beban kerja tim helpdesk IT, dan kelola eskalasi.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => navigate("/all-tickets")} className="bg-[#124090] hover:bg-[#0e306e] text-white text-xs font-bold px-4 py-2 rounded-xl transition duration-200 shadow-sm border-none cursor-pointer">
                + Semua Tiket Unit
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            
            {/* ── STAT CARDS ROW ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">All Open Tickets</span>
                  <h3 className="text-3xl font-black text-slate-800 mt-1">{loading ? "—" : stats.total}</h3>
                  <p className="text-[10px] text-[#6b7280] mt-1">Total beban tiket aktif</p>
                </div>
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </div>

              <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-red-600 tracking-wider uppercase">Overdue / SLA Breaches</span>
                  <h3 className="text-3xl font-black text-slate-800 mt-1">{loading ? "—" : stats.overdue}</h3>
                  <p className="text-[10px] text-[#6b7280] mt-1">Tingkat eskalasi kritis</p>
                </div>
                <div className="h-10 w-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 tracking-wider uppercase">Unassigned</span>
                  <h3 className="text-3xl font-black text-slate-800 mt-1">{loading ? "—" : stats.unassigned}</h3>
                  <p className="text-[10px] text-[#6b7280] mt-1">Belum ditangani teknisi</p>
                </div>
                <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>

              <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-green-600 tracking-wider uppercase">Avg Response Time</span>
                  <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.avgResponse}</h3>
                  <p className="text-[10px] text-[#6b7280] mt-1">Waktu tanggap SLA rata-rata</p>
                </div>
                <div className="h-10 w-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ── CHARTS ROW ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Line Chart Card */}
              <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#111827]">Ticket Volume Trends</h3>
                  <div className="relative">
                    <select value={trendFilter} onChange={(e) => setTrendFilter(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-[#374151] outline-none cursor-pointer pr-6 appearance-none">
                      <option>Last 7 Days</option>
                      <option>Last 30 Days</option>
                      <option>Last 90 Days</option>
                    </select>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#9ca3af] pointer-events-none">▼</span>
                  </div>
                </div>

                <div className="flex gap-2 items-stretch mt-6">
                  <div className="flex flex-col justify-between text-[10px] text-gray-400 pb-5 text-right w-6 shrink-0">
                    {[60, 50, 40, 30, 20, 10].map((v) => (
                      <span key={v}>{v}</span>
                    ))}
                  </div>
                  <div className="flex-1">
                    <LineChart data={trendData} color="#124090" height={180} />
                    <div className="flex justify-between mt-2 pl-4 text-[10px] text-gray-400">
                      {trendLabels.map((l) => <span key={l}>{l}</span>)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Donut Chart Card */}
              <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#111827]">SLA Compliance Rate</h3>
                  <div className="relative">
                    <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-[#374151] outline-none cursor-pointer pr-6 appearance-none">
                      <option>All Departments</option>
                      <option>IT & Network</option>
                      <option>HR</option>
                      <option>Facilities</option>
                    </select>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#9ca3af] pointer-events-none">▼</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
                  <DonutChart segments={slaSegments} />
                  <div className="flex flex-col gap-3 justify-center">
                    {slaSegments.map((seg) => (
                      <div key={seg.label} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: seg.color }} />
                        <span className="text-xs font-semibold text-slate-700">{seg.label} ({seg.value}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── BOTTOM ROW (TEAM PERFORMANCE & QUICK ACTIONS) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Team Performance Table Card */}
              <div className="lg:col-span-2 bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-[#9ca3af] tracking-wider uppercase">Team Performance</h3>
                  <button onClick={() => navigate("/tickets")} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors border-none bg-transparent cursor-pointer">
                    View Full Report
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider border-b border-gray-100">Agent</th>
                        <th className="p-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider border-b border-gray-100">Open Tickets</th>
                        <th className="p-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider border-b border-gray-100">Resolved (7D)</th>
                        <th className="p-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider border-b border-gray-100">CSAT Rate</th>
                        <th className="p-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider border-b border-gray-100">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {teamData.map((agent) => (
                        <tr key={agent.name} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0" style={{ background: agent.color }}>
                                {agent.name.charAt(0)}
                              </div>
                              <span className="text-xs font-bold text-slate-800">{agent.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-slate-600 font-semibold">{agent.open}</td>
                          <td className="p-3 text-xs text-slate-600 font-semibold">{agent.resolved}</td>
                          <td className="p-3 text-xs text-slate-600 font-semibold">{agent.csat}</td>
                          <td className="p-3">{statusBadge(agent.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#9ca3af] tracking-wider uppercase mb-4">Quick Actions</h3>
                  
                  <div className="space-y-3">
                    <button onClick={() => navigate("/tickets")} className="w-full flex items-center gap-3 p-3 border border-gray-100 hover:border-blue-400 hover:shadow-sm rounded-xl transition duration-200 text-left bg-white cursor-pointer group">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                        <svg className="h-4 w-4 text-[#124090]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-slate-700 flex-1">View All Tickets</span>
                      <span className="text-gray-400 text-xs font-bold group-hover:translate-x-1 transition-transform">→</span>
                    </button>

                    <button onClick={() => navigate("/all-tickets")} className="w-full flex items-center gap-3 p-3 border border-gray-100 hover:border-blue-400 hover:shadow-sm rounded-xl transition duration-200 text-left bg-white cursor-pointer group">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                        <svg className="h-4 w-4 text-[#124090]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-slate-700 flex-1">Reassign Tickets</span>
                      <span className="text-gray-400 text-xs font-bold group-hover:translate-x-1 transition-transform">→</span>
                    </button>

                    <button onClick={() => navigate("/documents")} className="w-full flex items-center gap-3 p-3 border border-gray-100 hover:border-blue-400 hover:shadow-sm rounded-xl transition duration-200 text-left bg-white cursor-pointer group">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-blue-50">
                        <svg className="h-4 w-4 text-[#124090]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-slate-700 flex-1">Internal Guidelines</span>
                      <span className="text-gray-400 text-xs font-bold group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-gray-100 rounded-xl mt-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SLA Status Info</h4>
                  <p className="text-[11px] text-[#6b7280] leading-relaxed mt-1">92% dari tiket terselesaikan dalam batas waktu SLA disepakati minggu ini.</p>
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
}

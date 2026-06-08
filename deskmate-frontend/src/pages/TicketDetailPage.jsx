// src/pages/TicketDetailPage.jsx
// -----------------------------------------------------------------------------
// Ticket Detail Page DeskMate (Redesigned with Unified Chatbot Aesthetics)
//
// Backend Connection Info:
// - GET  /api/v1/profiles/me          -> Fetch active user profile
// - GET  /api/v1/tickets/{id}         -> Fetch ticket detailed record
// - POST /api/v1/tickets/{id}/comments -> Submit new employee comment or internal note
// -----------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch, getFullName, getRole, logout } from "../utils/auth";

const STATUS_STYLE = {
  open:        { label: "Open",        bg: "#DBEAFE", color: "#1D4ED8" },
  in_progress: { label: "In Progress", bg: "#FEF9C3", color: "#B45309" },
  resolved:    { label: "Resolved",    bg: "#DCFCE7", color: "#15803D" },
  closed:      { label: "Closed",      bg: "#F3F4F6", color: "#6B7280" },
};

const PRIORITY_STYLE = {
  low:      { label: "Low Priority",      color: "#15803D", dot: "#22C55E", bg: "#DCFCE7" },
  medium:   { label: "Medium Priority",   color: "#B45309", dot: "#F59E0B", bg: "#FEF9C3" },
  high:     { label: "High Priority",     color: "#DC2626", dot: "#EF4444", bg: "#FEF2F2" },
  critical: { label: "Critical Priority", color: "#7C3AED", dot: "#8B5CF6", bg: "#F5F3FF" },
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const justCreated = searchParams.get("created") === "true";
  const navigate = useNavigate();
  const role = getRole();
  const commentRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("conversation");
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(justCreated);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Dynamic states
  const [staffMembers, setStaffMembers] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const attachmentInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadTicket();
    if (justCreated) {
      const timer = setTimeout(() => setShowSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [id]);

  useEffect(() => {
    if (role === "supervisor" || role === "admin") {
      loadStaffMembers();
    }
  }, [role]);

  async function loadStaffMembers() {
    try {
      const res = await apiFetch("/api/v1/profiles/");
      if (res?.ok) {
        const all = await res.json();
        const staff = all.filter(p => p.role === "admin" || p.role === "supervisor");
        setStaffMembers(staff);
      }
    } catch (err) {
      console.error("Gagal memuat staf:", err);
    }
  }

  async function updateTicketField(field, value) {
    try {
      const res = await apiFetch(`/api/v1/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      if (res?.ok) {
        loadTicket();
      } else {
        console.error(`Gagal memperbarui field ${field}`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || uploadingFile) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`/api/v1/tickets/${id}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (res?.ok) {
        loadTicket();
      } else {
        const errData = await res.json();
        console.error("Gagal mengunggah lampiran:", errData?.detail || res.statusText);
      }
    } catch (err) {
      console.error("Error mengunggah berkas:", err);
    } finally {
      setUploadingFile(false);
    }
  }

  async function loadProfile() {
    const res = await apiFetch("/api/v1/profiles/me");
    if (res?.ok) setProfile(await res.json());
  }

  async function loadTicket() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/tickets/${id}`);
      if (res?.ok) {
        const data = await res.json();
        setTicket(data);
        setComments(data.comments || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitComment() {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/v1/tickets/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newComment, is_internal: isInternal }),
      });
      if (res?.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment("");
        setIsInternal(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function escalateTicket() {
    navigate(`/tickets/create?session_id=`);
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fullName = profile?.full_name || getFullName() || "User";

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

  const st = ticket ? STATUS_STYLE[ticket.status] || STATUS_STYLE.open : STATUS_STYLE.open;
  const pr = ticket ? PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.medium : PRIORITY_STYLE.medium;

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
              <button onClick={() => navigate("/tickets")} className="w-full flex items-center gap-3 text-[#111827] bg-[#e5e7eb] rounded-lg p-3 text-sm font-semibold text-left">
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

        {/* ── AREA UTAMA KONTEN ── */}
        <main className="flex-1 overflow-y-auto bg-[#f0f4f9] p-4 md:p-6 custom-scrollbar relative">
          {/* Success toast */}
          {showSuccess && (
            <div className="fixed top-20 right-6 bg-emerald-50 border border-emerald-300 rounded-xl px-5 py-3 text-sm text-emerald-800 font-bold z-50 shadow-lg flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tiket berhasil dibuat! Tim kami akan segera menangani masalah Anda.
            </div>
          )}

          {/* Breadcrumb & Quick Nav */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs md:text-sm text-[#6b7280] font-medium select-none">
              <span className="hover:text-[#003399] cursor-pointer transition-colors" onClick={() => navigate("/tickets")}>Tickets</span>
              <span>
                <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <span className="text-slate-900 font-bold">#{ticket?.ticket_number}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex h-[60vh] items-center justify-center gap-3 text-gray-500 font-semibold">
              <div className="h-5 w-5 border-2 border-gray-300 border-t-[#003399] rounded-full animate-spin"></div>
              Loading ticket...
            </div>
          ) : !ticket ? (
            <div className="flex h-[60vh] items-center justify-center text-gray-500 font-bold">
              Ticket not found.
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── TICKET HEADER CARD ── */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-4">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 select-none">
                      <span className="text-[10px] md:text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        #{ticket.ticket_number}
                      </span>
                      <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                      <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5" style={{ background: pr.bg, color: pr.color }}>
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: pr.dot }} />
                        {pr.label}
                      </span>
                    </div>

                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                      {ticket.title}
                    </h1>

                    <p className="text-xs text-[#6b7280]">
                      Reported by <span className="font-bold text-slate-800">{ticket.creator?.full_name || "Unknown"}</span> on {formatDate(ticket.created_at)}
                    </p>
                  </div>

                  {/* SLA ROW */}
                  <div className="flex gap-4 self-start bg-slate-50 border border-slate-200/60 rounded-xl p-3 md:p-4 shrink-0 select-none">
                    <div className="space-y-1 text-right">
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">FIRST RESPONSE SLA</span>
                      <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1 justify-end">
                        <span className="h-2 w-2 bg-emerald-500 rounded-full shrink-0" />
                        Met (15m)
                      </span>
                    </div>
                    <div className="w-px bg-slate-200" />
                    <div className="space-y-1 text-right">
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">RESOLUTION SLA</span>
                      <span className="text-xs font-extrabold text-amber-600 flex items-center gap-1 justify-end">
                        <svg className="h-3.5 w-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        4h 15m remaining
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── CORE GRID LAYOUT ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* LEFT 2 COLUMNS: CONTENT TABS & MESSAGES */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm flex flex-col min-w-0">
                    {/* Tabs bar */}
                    <div className="flex border-b border-gray-200 bg-slate-50 px-2 select-none">
                      {["conversation", "activity_log", "attachments"].map((tab) => (
                        <button
                          key={tab}
                          className={`py-3 px-4 font-bold text-xs md:text-sm border-b-2 transition-all duration-150 outline-none ${
                            activeTab === tab
                              ? "border-[#003399] text-[#003399] font-black"
                              : "border-transparent text-[#6b7280] hover:text-slate-800"
                          }`}
                          onClick={() => setActiveTab(tab)}
                        >
                          {tab === "conversation" && "Conversation"}
                          {tab === "activity_log" && "Activity Log"}
                          {tab === "attachments" && `Attachments (${ticket.attachment_ids?.length || 0})`}
                        </button>
                      ))}
                    </div>

                    {/* Tab contents */}
                    <div className="p-5 flex-1 min-h-[300px]">
                      
                      {/* Tab 1: Conversation */}
                      {activeTab === "conversation" && (
                        <div className="space-y-6">
                          {/* Original description card */}
                          <CommentItem
                            name={ticket.creator?.full_name || "User"}
                            date={formatDate(ticket.created_at)}
                            content={ticket.description}
                            isInternal={false}
                            isFirst
                          />

                          {/* Comments list */}
                          {comments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center select-none text-slate-400">
                              <svg className="h-10 w-10 text-slate-300 mb-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span className="text-sm font-semibold text-slate-400">Belum ada tanggapan. Jadilah yang pertama merespons.</span>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {comments.map((c) => (
                                <CommentItem
                                  key={c.id}
                                  name={c.author?.full_name || "User"}
                                  date={formatDate(c.created_at)}
                                  content={c.content}
                                  isInternal={c.is_internal}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab 2: Activity Log */}
                      {activeTab === "activity_log" && (
                        <div className="space-y-4">
                          <ActivityItem
                            icon={
                              <svg className="h-4 w-4 text-[#003399]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            }
                            text={`Tiket #${ticket.ticket_number} dibuat`}
                            date={formatDate(ticket.created_at)}
                          />
                          {ticket.assignee && (
                            <ActivityItem
                              icon={
                                <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              }
                              text={`Ditugaskan ke teknisi ${ticket.assignee.full_name}`}
                              date={formatDate(ticket.updated_at)}
                            />
                          )}
                          {ticket.status !== "open" && (
                            <ActivityItem
                              icon={
                                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
                                </svg>
                              }
                              text={`Status tiket diperbarui menjadi ${ticket.status}`}
                              date={formatDate(ticket.updated_at)}
                            />
                          )}
                        </div>
                      )}

                      {/* Tab 3: Attachments */}
                      {activeTab === "attachments" && (
                        <div className="space-y-3">
                          {!ticket.attachment_ids?.length ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 select-none">
                              <svg className="h-10 w-10 text-slate-300 mb-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="text-sm font-semibold text-slate-400">Tidak ada lampiran pada tiket ini.</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {ticket.attachment_ids.map((attId, i) => (
                                <div key={i} className="flex items-center gap-3 border border-gray-200/80 rounded-xl p-3 bg-slate-50 hover:bg-slate-100/70 transition-colors">
                                  <svg className="h-5 w-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800 truncate">Attachment_{i + 1}</p>
                                    <span className="text-[10px] text-[#6b7280] block">Format Berkas</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT 1 COLUMN: SIDE PANEL METADATA & ACTIONS */}
                <div className="space-y-6">
                  {/* Actions Area */}
                  <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm space-y-4">
                    <button
                      onClick={() => commentRef.current?.focus()}
                      className="w-full bg-[#003399] hover:bg-[#124090] text-white py-2.5 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <svg className="h-4 w-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Add Comment
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="file"
                        ref={attachmentInputRef}
                        onChange={handleFileUpload}
                        style={{ display: "none" }}
                      />
                      <button
                        onClick={() => attachmentInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="flex items-center justify-center gap-1.5 border border-gray-300 hover:bg-slate-50 py-2 rounded-xl text-xs font-bold text-slate-700 transition disabled:opacity-50"
                      >
                        <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {uploadingFile ? "Attaching..." : "Attach"}
                      </button>
                      <button
                        onClick={escalateTicket}
                        className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 py-2 rounded-xl text-xs font-bold text-red-600 transition"
                      >
                        <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Escalate
                      </button>
                    </div>

                    {(role === "supervisor" || role === "admin") && ticket.assigned_to !== profile?.id && (
                      <button
                        onClick={() => updateTicketField("assigned_to", profile.id)}
                        className="w-full border border-[#003399] hover:bg-blue-50 text-[#003399] py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        Assign to Me
                      </button>
                    )}

                    {ticket.status !== "closed" && (
                      <button
                        onClick={() => updateTicketField("status", "closed")}
                        className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        Close Ticket
                      </button>
                    )}

                    {/* New Comment Text Box */}
                    <div className="border border-gray-200/80 rounded-xl p-3 bg-slate-50/50 space-y-3">
                      <textarea
                        ref={commentRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Tulis balasan atau instruksi bantuan..."
                        className="w-full bg-transparent text-xs text-slate-800 outline-none resize-none placeholder-gray-400"
                        rows={4}
                      />

                      <div className="flex items-center justify-between">
                        <div>
                          {(role === "supervisor" || role === "admin") && (
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isInternal}
                                onChange={(e) => setIsInternal(e.target.checked)}
                                className="accent-[#003399] h-3.5 w-3.5 rounded"
                              />
                              <span className="text-[10px] font-bold text-amber-600 uppercase">Internal note</span>
                            </label>
                          )}
                        </div>

                        <button
                          onClick={submitComment}
                          disabled={!newComment.trim() || submitting}
                          className="bg-[#003399] hover:bg-[#124090] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          {submitting ? "Sending..." : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Info Card */}
                  <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm space-y-4">
                    <h3 className="text-xs font-extrabold text-[#9ca3af] tracking-wider uppercase">Ticket Details</h3>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-500">Assignee</span>
                        {role === "admin" || role === "supervisor" ? (
                          <select
                            value={ticket.assigned_to || ""}
                            onChange={(e) => updateTicketField("assigned_to", e.target.value || null)}
                            className="border border-gray-200 rounded-lg p-1 text-xs text-slate-800 bg-white font-semibold outline-none cursor-pointer max-w-[150px]"
                          >
                            <option value="">Unassigned</option>
                            {staffMembers.map(m => (
                              <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-slate-700">{ticket.assignee?.full_name || "Unassigned"}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-500">Category</span>
                        {role === "admin" || role === "supervisor" ? (
                          <select
                            value={ticket.category || ""}
                            onChange={(e) => updateTicketField("category", e.target.value || null)}
                            className="border border-gray-200 rounded-lg p-1 text-xs text-slate-800 bg-white font-semibold outline-none cursor-pointer max-w-[150px]"
                          >
                            <option value="IT Support">IT Support</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Human Resources">Human Resources</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Finance">Finance</option>
                            <option value="Facilities">Facilities</option>
                            <option value="General">General</option>
                          </select>
                        ) : (
                          <span className="text-xs font-bold text-slate-700">{ticket.category || "General"}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-500">Priority</span>
                        {role === "admin" || role === "supervisor" ? (
                          <select
                            value={ticket.priority || "medium"}
                            onChange={(e) => updateTicketField("priority", e.target.value)}
                            className="border border-gray-200 rounded-lg p-1 text-xs text-slate-800 bg-white font-semibold outline-none cursor-pointer"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        ) : (
                          <span className="text-xs font-bold flex items-center gap-1" style={{ color: pr.color }}>
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: pr.dot }} />
                            {ticket.priority ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) : "Medium"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-semibold text-slate-500">Status</span>
                        <select
                          value={ticket.status}
                          onChange={(e) => updateTicketField("status", e.target.value)}
                          className="border border-gray-200 rounded-lg p-1 text-xs text-slate-800 bg-white font-semibold outline-none cursor-pointer"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Watchers Card */}
                  <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between select-none">
                      <h3 className="text-xs font-extrabold text-[#9ca3af] tracking-wider uppercase">Watchers (2)</h3>
                      <button className="text-xs font-bold text-[#003399] hover:underline">+ Add</button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-[10px] select-none">D</div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 font-bold text-white text-[10px] select-none">S</div>
                    </div>
                  </div>

                  {/* Related Knowledge Base */}
                  <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm space-y-4">
                    <h3 className="text-xs font-extrabold text-[#9ca3af] tracking-wider uppercase">Related Knowledge Base</h3>

                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex items-start gap-2 text-[#003399] hover:underline cursor-pointer">
                        <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>How to request new hardware</span>
                      </div>
                      <div className="flex items-start gap-2 text-[#003399] hover:underline cursor-pointer">
                        <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Desk equipment standards</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── SUB COMPONENTS ──

function CommentItem({ name, date, content, isInternal, isFirst }) {
  const initial = name?.charAt(0)?.toUpperCase() || "U";
  const avatarBg = isFirst ? "bg-[#003399]" : isInternal ? "bg-amber-500" : "bg-purple-600";
  return (
    <div className="flex gap-3 items-start">
      <div className={`h-8 w-8 rounded-full text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm ${avatarBg}`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-900">{name}</span>
          <span className="text-[10px] text-[#6b7280]">{date}</span>
          {isInternal && (
            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md uppercase">
              INTERNAL NOTE
            </span>
          )}
        </div>
        <div className={`p-3.5 rounded-xl text-xs text-slate-700 leading-relaxed border ${isInternal ? "bg-amber-50/50 border-amber-200" : "bg-slate-50/50 border-gray-200"}`}>
          {content}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ icon, text, date }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-3 text-xs">
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 font-semibold text-slate-700">{text}</span>
      <span className="text-[10px] text-[#6b7280] shrink-0">{date}</span>
    </div>
  );
}

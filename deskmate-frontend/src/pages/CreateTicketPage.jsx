// src/pages/CreateTicketPage.jsx
// -------------------------------------------------------
// Create New Ticket Form Page
// Koneksi Backend:
// - GET /api/v1/profiles/me
// - GET /api/v1/chat/sessions/{sessionId}/messages (Optional summary generation)
// - POST /api/v1/tickets/ (Saves the new ticket request)
// -------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, getFullName, getRole } from "../utils/auth";

const CATEGORIES = [
  "IT & Network", "Hardware", "Software", "HR & Policies",
  "Finance", "Facilities", "Security", "Other",
];

const PRIORITIES = [
  { value: "low",      label: "Low - Minor inconvenience" },
  { value: "medium",   label: "Medium - Partially blocking work" },
  { value: "high",     label: "High - Blocking work" },
  { value: "critical", label: "Critical - System down" },
];

const SYSTEMS = [
  "GlobalProtect VPN", "Microsoft 365", "SAP ERP", "Slack",
  "Jira", "GitHub", "Printer / Scanner", "PC / Laptop", "Other",
];

export default function CreateTicketPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: "IT & Network",
    priority: "medium",
    system: "",
    description: "",
  });
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const role = getRole();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  useEffect(() => {
    loadProfile();
    if (sessionId) loadAiSummary();
  }, [sessionId]);

  async function loadProfile() {
    const res = await apiFetch("/api/v1/profiles/me");
    if (res?.ok) setProfile(await res.json());
  }

  async function loadAiSummary() {
    const res = await apiFetch(`/api/v1/chat/sessions/${sessionId}/messages`);
    if (res?.ok) {
      const msgs = await res.json();
      if (msgs.length > 0) {
        const firstUserMsg = msgs.find((m) => m.role === "user");
        if (firstUserMsg) {
          setAiSummary(
            `User is experiencing: "${firstUserMsg.content}". ` +
            `This ticket was escalated from an AI chat session.`
          );
          setShowAiSummary(true);
          setForm((prev) => ({ ...prev, subject: firstUserMsg.content.slice(0, 80) }));
        }
      }
    }
  }

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index) =>
    setAttachments((prev) => prev.filter((_, i) => i !== index));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.subject.trim()) { setError("Subject wajib diisi."); return; }
    if (!form.description.trim()) { setError("Description wajib diisi."); return; }

    setSubmitting(true);
    try {
      const body = {
        title: form.subject,
        description: form.description,
        category: form.category,
        priority: form.priority,
        chat_session_id: sessionId || null,
        attachment_ids: [],
      };

      const res = await apiFetch("/api/v1/tickets/", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res?.ok) {
        const ticket = await res.json();
        navigate(`/tickets/${ticket.id}?created=true`);
      } else {
        const data = await res?.json();
        setError(data?.detail || "Gagal membuat tiket. Coba lagi.");
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSubmitting(false);
    }
  }

  const applyFormat = (tag) => {
    const textarea = document.getElementById("desc-textarea");
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.description.substring(start, end);
    let replacement = "";
    if (tag === "b") replacement = `**${selected}**`;
    else if (tag === "i") replacement = `_${selected}_`;
    else if (tag === "u") replacement = `__${selected}__`;
    else if (tag === "ul") replacement = `\n• ${selected}`;
    else if (tag === "ol") replacement = `\n1. ${selected}`;
    const newVal = form.description.substring(0, start) + replacement + form.description.substring(end);
    handleChange("description", newVal);
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
              <span className="flex items-center gap-3 bg-[#e5e7eb] text-[#111827] rounded-lg p-3 text-sm font-semibold cursor-default">
                <span>Buat Tiket Baru</span>
              </span>

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

        {/* ── AREA UTAMA KONTEN (PREMIUM CORPORATE DECK) ── */}
        <main className="flex-1 overflow-y-auto bg-[#f0f4f9] p-4 md:p-6 space-y-6">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="hover:text-[#124090] cursor-pointer" onClick={() => navigate("/dashboard")}>Home</span>
            <span>/</span>
            <span className="hover:text-[#124090] cursor-pointer" onClick={() => navigate("/tickets")}>My Tickets</span>
            <span>/</span>
            <span className="text-[#111827] font-semibold">New Ticket</span>
          </div>

          <div className="max-w-3xl">
            <div className="mb-6">
              <span className="text-[10px] font-extrabold text-[#124090] tracking-widest uppercase">IT & Facilities Escalation</span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">Buat Tiket Baru</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">Laporkan masalah teknis operasional Anda untuk penanganan cepat dari tim IT Epson.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Card Container */}
              <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm space-y-5">
                
                {/* AI Summary Banner (Replaced raw emojis with clean SVG sparkles) */}
                {showAiSummary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start select-text">
                    <div className="h-5 w-5 bg-[#124090] text-white rounded-full flex items-center justify-center shrink-0">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[10px] font-extrabold text-[#124090] tracking-wider uppercase">AI SUMMARY FROM CHAT</h4>
                      <p className="text-xs text-slate-700 mt-1 leading-normal font-medium">{aiSummary}</p>
                    </div>
                    <button type="button" className="text-gray-400 hover:text-slate-700 transition font-bold text-sm leading-none border-none bg-transparent cursor-pointer" onClick={() => setShowAiSummary(false)}>✕</button>
                  </div>
                )}

                {/* Error Box (Emoji replaced with SVG) */}
                {error && (
                  <div className="rounded-xl p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2">
                    <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Subject Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    placeholder="Contoh: Paper jam berulang pada printer L1800..."
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#124090] focus:ring-1 focus:ring-[#124090]"
                  />
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category / Department <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                        value={form.category}
                        onChange={(e) => handleChange("category", e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 pr-8 text-xs text-slate-700 outline-none cursor-pointer appearance-none font-semibold"
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">▼</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Priority</label>
                    <div className="relative">
                      <select
                        value={form.priority}
                        onChange={(e) => handleChange("priority", e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 pr-8 text-xs text-slate-700 outline-none cursor-pointer appearance-none font-semibold"
                      >
                        {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">▼</span>
                    </div>
                  </div>
                </div>

                {/* Related System */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Related System / Service</label>
                  <div className="relative">
                    <select
                      value={form.system}
                      onChange={(e) => handleChange("system", e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 pr-8 text-xs text-slate-700 outline-none cursor-pointer appearance-none font-semibold"
                    >
                      <option value="">Select a system...</option>
                      {SYSTEMS.map((sys) => <option key={sys} value={sys}>{sys}</option>)}
                    </select>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">▼</span>
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description <span className="text-red-500">*</span></label>
                  
                  {/* Text Toolbar */}
                  <div className="flex gap-1.5 p-2 bg-slate-50 border border-gray-200 border-b-none rounded-t-xl select-none">
                    <button type="button" className="p-1 px-2.5 font-bold hover:bg-slate-200/60 rounded text-xs transition border-none bg-transparent cursor-pointer text-slate-700" onClick={() => applyFormat("b")}>B</button>
                    <button type="button" className="p-1 px-2.5 italic hover:bg-slate-200/60 rounded text-xs transition border-none bg-transparent cursor-pointer text-slate-700" onClick={() => applyFormat("i")}>I</button>
                    <button type="button" className="p-1 px-2.5 underline hover:bg-slate-200/60 rounded text-xs transition border-none bg-transparent cursor-pointer text-slate-700" onClick={() => applyFormat("u")}>U</button>
                    <div className="w-px bg-gray-300 mx-1"></div>
                    <button type="button" className="p-1 px-2 hover:bg-slate-200/60 rounded text-xs transition border-none bg-transparent cursor-pointer text-slate-700" onClick={() => applyFormat("ul")}>List Bullet</button>
                    <button type="button" className="p-1 px-2 hover:bg-slate-200/60 rounded text-xs transition border-none bg-transparent cursor-pointer text-slate-700" onClick={() => applyFormat("ol")}>List Angka</button>
                  </div>

                  <textarea
                    id="desc-textarea"
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Describe your issue in detail. Include steps to reproduce, error messages, and any relevant context..."
                    required
                    rows={8}
                    className="w-full rounded-b-xl border border-gray-200 bg-white p-3.5 text-xs text-slate-800 outline-none resize-y transition focus:border-[#124090] focus:ring-1 focus:ring-[#124090] leading-relaxed"
                  />
                </div>

                {/* Attachments */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attachments</label>
                  
                  {/* Dropzone Area (Emoji replaced with SVG icon) */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#124090"; }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      const files = Array.from(e.dataTransfer.files);
                      setAttachments((prev) => [...prev, ...files]);
                    }}
                    className="border-2 border-dashed border-gray-200 bg-slate-50 hover:bg-slate-100/50 hover:border-[#124090] transition rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer select-none"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="h-10 w-10 bg-slate-200/60 rounded-full flex items-center justify-center mb-2">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-slate-700 text-center"><span className="text-[#124090] hover:underline">Click to upload</span> or drag and drop</p>
                    <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, PDF up to 5MB</p>
                  </div>

                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((file, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 border border-gray-200 rounded-xl p-2.5 px-4 shadow-sm select-text">
                          <span className="text-xs font-bold text-slate-700 truncate pr-4">📎 {file.name}</span>
                          <button type="button" className="text-gray-400 hover:text-red-600 transition font-bold text-base leading-none border-none bg-transparent cursor-pointer" onClick={() => removeAttachment(i)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Action Controls */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 select-none">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-5 py-2.5 border border-gray-200 hover:bg-slate-50 text-xs font-bold rounded-xl text-slate-600 transition border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-[#124090] hover:bg-[#0e306e] text-white text-xs font-bold rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer shadow-sm"
                  >
                    {submitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </div>

              </div>

            </form>
          </div>

        </main>
      </div>
    </div>
  );
}

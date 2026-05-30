// src/pages/DocumentManagementPage.jsx
// -----------------------------------------------------------------------------
// Admin Document Management Page DeskMate (Redesigned with Premium Aesthetics)
//
// Backend Connection Info:
// - GET  /api/v1/profiles/me       -> Fetch active user profile
// - GET  /api/v1/documents/        -> Fetch paginated RAG knowledge base documents
// - POST /api/v1/documents/upload -> Upload new document (PDF, TXT, MD) and trigger RAG vector indexing
// -----------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole, logout } from "../utils/auth";

const INDEXING_STYLE = {
  indexed:    { label: "Active",      bg: "#DCFCE7", color: "#15803D" },
  pending:    { label: "Pending",     bg: "#FEF9C3", color: "#B45309" },
  processing: { label: "Processing",  bg: "#DBEAFE", color: "#1D4ED8" },
  failed:     { label: "Failed",      bg: "#FEF2F2", color: "#DC2626" },
};

const VISIBILITY_STYLE = {
  SOP:      { label: "All Employees", bg: "#DBEAFE", color: "#1D4ED8" },
  FAQ:      { label: "All Employees", bg: "#DBEAFE", color: "#1D4ED8" },
  Manual:   { label: "IT Staff Only", bg: "#EDE9FE", color: "#6D28D9" },
  Safety:   { label: "All Employees", bg: "#DBEAFE", color: "#1D4ED8" },
  default:  { label: "All Employees", bg: "#DBEAFE", color: "#1D4ED8" },
};

export default function DocumentManagementPage() {
  const navigate   = useNavigate();
  const fileRef    = useRef(null);
  const role       = getRole();

  const [profile, setProfile]     = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", category: "SOP", description: "", file: null });
  const [uploadError, setUploadError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadProfile();
    loadDocuments();
  }, [page]);

  async function loadProfile() {
    const r = await apiFetch("/api/v1/profiles/me");
    if (r?.ok) setProfile(await r.json());
  }

  async function loadDocuments() {
    setLoading(true);
    try {
      const r = await apiFetch(`/api/v1/documents/?only_indexed=false&size=${PAGE_SIZE}&page=${page}`);
      if (r?.ok) {
        const d = await r.json();
        const items = Array.isArray(d) ? d : (d.items || []);
        setDocuments(items);
        setTotal(Array.isArray(d) ? d.length : (d.total || items.length));
        if (items.length > 0 && !selected) setSelected(items[0]);
      }
    } finally { setLoading(false); }
  }

  async function handleUpload() {
    if (!uploadForm.title || !uploadForm.file) { setUploadError("Judul dan file wajib diisi."); return; }
    setUploading(true); setUploadError("");
    try {
      const form = new FormData();
      form.append("title", uploadForm.title);
      form.append("category", uploadForm.category);
      if (uploadForm.description) form.append("description", uploadForm.description);
      form.append("file", uploadForm.file);
      const r = await apiFetch("/api/v1/documents/upload", { method: "POST", body: form });
      if (r?.ok) {
        setShowUploadModal(false);
        setUploadForm({ title: "", category: "SOP", description: "", file: null });
        loadDocuments();
      } else {
        const d = await r?.json();
        setUploadError(d?.detail || "Upload gagal.");
      }
    } finally { setUploading(false); }
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filtered = documents.filter(d =>
    !search || d.title?.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(1)} MB`;
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const indexStyle = (status) => INDEXING_STYLE[status] || INDEXING_STYLE.pending;
  const visStyle = (cat) => VISIBILITY_STYLE[cat] || VISIBILITY_STYLE.default;

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

  // Vector SVG helper based on document mime-type
  const renderDocIcon = (mimeType) => {
    let color = "text-[#6B7280]";
    if (mimeType === "application/pdf") color = "text-red-500";
    else if (mimeType === "text/plain") color = "text-amber-500";
    else if (mimeType === "text/markdown") color = "text-slate-500";
    else if (mimeType?.includes("document")) color = "text-blue-500";

    return (
      <svg className={`h-8 w-8 ${color} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const getDocTypeLabel = (mimeType) => {
    if (mimeType === "application/pdf") return "PDF Document";
    if (mimeType === "text/plain") return "Text File";
    if (mimeType === "text/markdown") return "Markdown";
    if (mimeType?.includes("document")) return "Word Document";
    return "Document";
  };

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
                  <button onClick={() => navigate("/documents")} className="w-full flex items-center gap-3 text-[#111827] bg-[#e5e7eb] rounded-lg p-3 text-sm font-semibold text-left">
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
        <main className="flex-1 flex flex-col overflow-hidden bg-[#f0f4f9]">
          {/* Top page title bar */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shrink-0">
            <div>
              <span className="text-[10px] font-extrabold text-[#124090] tracking-widest uppercase">Admin Panel</span>
              <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight mt-0.5">Document Management</h2>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-[#003399] hover:bg-[#124090] text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-sm transition flex items-center gap-2 select-none"
            >
              <svg className="h-4 w-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Document
            </button>
          </div>

          {/* Sub Body split view */}
          <div className="flex flex-1 overflow-hidden w-full">
            
            {/* LEFT PANEL: Document Table List */}
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar gap-4 min-w-0">
              
              {/* Filter bar */}
              <div className="flex items-center justify-between gap-4 flex-wrap select-none shrink-0">
                <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3.5 py-2 shadow-sm">
                  <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search knowledge base..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="border-none bg-transparent outline-none text-xs md:text-sm text-slate-800 placeholder-gray-400 w-full"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="bg-white border border-gray-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1">
                    All Folders
                    <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button className="bg-white border border-gray-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1">
                    Tags
                    <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button className="bg-white border border-gray-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold transition">
                    Status
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm shrink-0">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-gray-200 select-none">
                      <th className="p-3 w-10 text-center">
                        <input type="checkbox" className="accent-[#003399] rounded h-3.5 w-3.5 cursor-pointer" />
                      </th>
                      <th className="p-3 text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">DOCUMENT TITLE</th>
                      <th className="p-3 text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">TYPE</th>
                      <th className="p-3 text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">VISIBILITY</th>
                      <th className="p-3 text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">LAST UPDATED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-slate-400 font-semibold text-xs md:text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 border-2 border-gray-300 border-t-[#003399] rounded-full animate-spin"></div>
                            Loading documents...
                          </div>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 font-semibold text-xs md:text-sm">
                          No documents found. Upload your first document!
                        </td>
                      </tr>
                    ) : filtered.map(doc => {
                      const isActive = selected?.id === doc.id;
                      const vs = visStyle(doc.category);
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelected(doc)}
                          className={`border-b border-slate-100 hover:bg-slate-50/55 transition-colors cursor-pointer ${isActive ? "bg-blue-50/50 border-l-4 border-l-[#003399]" : "border-l-4 border-l-transparent"}`}
                        >
                          <td className="p-3 w-10 text-center" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" className="accent-[#003399] rounded h-3.5 w-3.5 cursor-pointer" />
                          </td>
                          <td className="p-3">
                            <div className="flex items-start gap-2.5">
                              {renderDocIcon(doc.file_type)}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs md:text-sm font-bold text-slate-800 truncate leading-snug">{doc.title}</p>
                                <p className="text-[10px] text-[#6b7280] mt-0.5 font-medium">
                                  {doc.category}{doc.description ? ` • ${doc.description.slice(0, 30)}...` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-xs font-bold text-slate-500">{getDocTypeLabel(doc.file_type)}</span>
                          </td>
                          <td className="p-3 select-none">
                            <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: vs.bg, color: vs.color }}>
                              {vs.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="text-xs font-bold text-slate-800">{formatDate(doc.indexed_at || doc.created_at)}</div>
                            <div className="text-[10px] text-[#6b7280] font-medium mt-0.5">by {doc.uploader?.full_name?.split(" ")[0] || "Admin"}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && total > 0 && (
                <div className="flex items-center justify-between py-2 flex-wrap gap-4 select-none shrink-0">
                  <span className="text-xs font-semibold text-slate-500">
                    Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)} to {Math.min(page * PAGE_SIZE, total)} of {total} documents
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 bg-white border border-gray-300 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition text-slate-700"
                    >
                      Previous
                    </button>
                    {[1, 2, 3].map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`h-7 w-7 rounded-lg text-xs font-extrabold transition ${p === page ? "bg-[#003399] text-white" : "bg-white border border-gray-300 hover:bg-slate-50 text-slate-700"}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1 bg-white border border-gray-300 hover:bg-slate-50 rounded-lg text-xs font-bold transition text-slate-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL: Document Details View */}
            {selected && (
              <div className="w-[300px] md:w-80 border-l border-gray-200 bg-white p-5 md:p-6 overflow-y-auto custom-scrollbar shrink-0 flex flex-col gap-6">
                
                {/* Details Header */}
                <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
                  {renderDocIcon(selected.file_type)}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-sm font-black text-slate-900 leading-snug tracking-tight">{selected.title}</h3>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 block">
                      {getDocTypeLabel(selected.file_type)} • {formatSize(selected.file_size_bytes)}
                    </span>
                  </div>
                </div>

                {/* Indexing details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-extrabold text-[#9ca3af] tracking-wider uppercase">Document Details</h4>
                  
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Status</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase" style={{ background: indexStyle(selected.indexing_status).bg, color: indexStyle(selected.indexing_status).color }}>
                        ● {indexStyle(selected.indexing_status).label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Version</span>
                      <span className="text-slate-800 font-bold">v2.4</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Last Updated</span>
                      <span className="text-slate-800 font-bold text-right truncate pl-2">
                        {selected.indexed_at ? new Date(selected.indexed_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Uploaded By</span>
                      <div className="flex items-center gap-1.5 pl-2 select-none">
                        <div className="h-5 w-5 bg-purple-600 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center">S</div>
                        <span className="text-slate-800 font-bold">{selected.uploader?.full_name || "Admin"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-[#9ca3af] tracking-wider uppercase">Description</h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {selected.description || "No description provided."}
                  </p>
                </div>

                {/* Permissions & Tags */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-extrabold text-[#9ca3af] tracking-wider uppercase">Visibility & Tags</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase">Permissions</span>
                      <div className="flex flex-wrap gap-1.5 select-none">
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">● All Employees</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">🤖 AI Chat Enabled</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase">Tags</span>
                      <div className="flex flex-wrap gap-1.5 items-center select-none">
                        {(selected.category ? [selected.category, "IT", "Hardware"] : ["General"]).map((t, i) => (
                          <span key={i} className="text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                        <button className="text-[10px] font-bold text-[#003399] hover:underline">+ Add</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Button */}
                <div className="space-y-3 pt-4 border-t border-slate-100 select-none">
                  <button className="w-full bg-[#003399] hover:bg-[#124090] text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                    <svg className="h-3.5 w-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit Metadata
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-center gap-1 border border-gray-300 hover:bg-slate-50 py-1.5 rounded-xl text-[10px] md:text-xs font-bold text-slate-700 transition">
                      <svg className="h-3.5 w-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Replace File
                    </button>
                    <button className="flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 border border-red-200 py-1.5 rounded-xl text-[10px] md:text-xs font-bold text-red-600 transition">
                      <svg className="h-3.5 w-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Archive
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── UPLOAD MODAL ── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-base md:text-lg font-black text-[#111827]">Upload Document</h2>
              <button onClick={() => setShowUploadModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#111827] transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error box */}
            {uploadError && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs font-bold text-red-600 flex items-center gap-1.5">
                <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {uploadError}
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Document Title *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. SOP Troubleshooting Printer L-Series"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none focus:border-[#003399] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 bg-white outline-none cursor-pointer"
                >
                  <option value="SOP">SOP</option>
                  <option value="FAQ">FAQ</option>
                  <option value="Manual">Manual</option>
                  <option value="Safety">Safety</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Tulis deskripsi singkat mengenai isi dokumen..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none resize-none focus:border-[#003399] transition-all"
                  rows={3}
                />
              </div>

              {/* Custom Upload Area Dropzone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">File (PDF / TXT / MD) *</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-[#003399] rounded-xl p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center cursor-pointer select-none text-center"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={e => setUploadForm(p => ({ ...p, file: e.target.files[0] }))}
                  />
                  {uploadForm.file ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-[#003399]">
                      <svg className="h-5 w-5 text-[#003399]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {uploadForm.file.name} ({formatSize(uploadForm.file.size)})
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-center">
                        <svg className="h-8 w-8 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        <span className="text-[#003399] hover:underline">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-[10px] text-[#6b7280]">PDF, TXT, MD — max 20MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 select-none">
              <button
                onClick={() => setShowUploadModal(false)}
                className="border border-gray-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-[#003399] hover:bg-[#124090] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {uploading ? "Uploading..." : "Upload & Index"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

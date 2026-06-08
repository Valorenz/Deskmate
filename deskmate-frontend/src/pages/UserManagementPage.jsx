// src/pages/UserManagementPage.jsx
// -----------------------------------------------------------------------------
// Admin User Management Page DeskMate (Redesigned with Premium Aesthetics)
//
// Backend Connection Info:
// - GET   /api/v1/profiles/me          -> Fetch active user profile
// - POST  /api/v1/auth/register        -> Create a new employee user account (via Admin invite form)
// - PATCH /api/v1/profiles/{id}/admin  -> Update employee user roles and account active status
// -----------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole, getAvatarUrl, logout } from "../utils/auth";

const ROLE_STYLE = {
  admin:      { label: "Admin",      bg: "#EDE9FE", color: "#6D28D9" },
  supervisor: { label: "Supervisor", bg: "#DBEAFE", color: "#1D4ED8" },
  employee:   { label: "Employee",   bg: "#F3F4F6", color: "#374151" },
};

const STATUS_STYLE = {
  active:      { label: "Active",      dot: "#22C55E", color: "#15803D" },
  pending:     { label: "Pending",     dot: "#F59E0B", color: "#B45309" },
  deactivated: { label: "Deactivated", dot: "#9CA3AF", color: "#6B7280" },
};

const AVATAR_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2", "#DB2777"];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function UserManagementPage() {
  const navigate = useNavigate();
  const role = getRole();

  const [profile, setProfile]       = useState(null);
  const [users, setUsers]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [page, setPage]             = useState(1);
  const [openMenu, setOpenMenu]     = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: "", email: "", password: "", role: "employee" });
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting]     = useState(false);
  const [stats, setStats]           = useState({ total: 0, active: 0, admins: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });
  
  // Dynamic department state
  const [departments, setDepartments] = useState([]);
  
  // Audit log modal states
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Send message modal states
  const [showSendMsgModal, setShowSendMsgModal] = useState(false);
  const [msgRecipient, setMsgRecipient] = useState(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgError, setMsgError] = useState("");
  const [msgSuccess, setMsgSuccess] = useState("");

  const PAGE_SIZE = 10;

  useEffect(() => {
    loadProfile();
    loadUsers();
  }, [page, roleFilter, deptFilter, search]);

  useEffect(() => {
    async function loadDepts() {
      try {
        const r = await apiFetch("/api/v1/profiles/");
        if (r?.ok) {
          const all = await r.json();
          const uniqueDepts = [...new Set(all.map(u => u.department).filter(Boolean))];
          setDepartments(uniqueDepts);
        }
      } catch (err) {
        console.error("Gagal memuat list departemen", err);
      }
    }
    loadDepts();
  }, []);

  async function loadProfile() {
    const r = await apiFetch("/api/v1/profiles/me");
    if (r?.ok) setProfile(await r.json());
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "All Roles") {
        params.append("role", roleFilter);
      }
      if (deptFilter !== "All Departments") {
        params.append("department", deptFilter);
      }
      if (search) {
        params.append("search", search);
      }
      
      const r = await apiFetch(`/api/v1/profiles/?${params.toString()}`);
      if (r?.ok) {
        const data = await r.json();
        setUsers(data);
        const activeCount = data.filter(u => u.is_active).length;
        const adminCount = data.filter(u => u.role === "admin").length;
        setStats({
          total: data.length,
          active: activeCount,
          admins: adminCount
        });
        setTotal(data.length);
      } else {
        console.error("Gagal memuat daftar pengguna.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLogs() {
    setLoadingAudit(true);
    try {
      const r = await apiFetch("/api/v1/profiles/audit-logs");
      if (r?.ok) {
        setAuditLogs(await r.json());
      } else {
        console.error("Gagal memuat audit log.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  }

  async function handleSendMessage() {
    if (!msgSubject || !msgBody) {
      setMsgError("Subjek dan isi pesan wajib diisi.");
      return;
    }
    setSendingMsg(true);
    setMsgError("");
    setMsgSuccess("");
    try {
      const r = await apiFetch(`/api/v1/profiles/${msgRecipient.id}/send-message`, {
        method: "POST",
        body: JSON.stringify({ subject: msgSubject, content: msgBody }),
      });
      if (r?.ok) {
        setMsgSuccess("Pesan email berhasil dikirim!");
        setTimeout(() => {
          setShowSendMsgModal(false);
          setMsgRecipient(null);
        }, 1500);
      } else {
        const d = await r?.json();
        setMsgError(d?.detail || "Gagal mengirim pesan.");
      }
    } catch (err) {
      setMsgError("Error koneksi ke server.");
    } finally {
      setSendingMsg(false);
    }
  }

  async function handleInvite() {
    if (!inviteForm.email || !inviteForm.password || !inviteForm.full_name) {
      setInviteError("Semua field wajib diisi."); return;
    }
    setInviting(true); setInviteError("");
    try {
      const r = await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(inviteForm),
      });
      if (r?.ok) {
        setShowInviteModal(false);
        setInviteForm({ full_name: "", email: "", password: "", role: "employee" });
        loadUsers();
      } else {
        const d = await r?.json();
        setInviteError(d?.detail || "Gagal mengundang user.");
      }
    } finally { setInviting(false); }
  }

  async function updateUserRole(userId, newRole) {
    await apiFetch(`/api/v1/profiles/${userId}/admin`, {
      method: "PATCH",
      body: JSON.stringify({ role: newRole }),
    });
    loadUsers();
  }

  async function toggleUserActive(userId, currentActive) {
    await apiFetch(`/api/v1/profiles/${userId}/admin`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !currentActive }),
    });
    loadUsers();
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getUserStatus = (user) => {
    if (!user.is_active && !user.employee_id) return "pending";
    if (!user.is_active) return "deactivated";
    return "active";
  };

  const getLastLogin = (user) => {
    if (!user.is_active) return "Deactivated";
    if (!user.updated_at) return "Never";
    return new Date(user.updated_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const filtered = users;
  const startIndex = (page - 1) * PAGE_SIZE;
  const paginatedUsers = filtered.slice(startIndex, startIndex + PAGE_SIZE);

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
    <div className="flex h-screen w-full bg-[#f4f6fa] font-sans text-[#111827] overflow-hidden relative" onClick={() => setOpenMenu(null)}>
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
                  <button onClick={() => navigate("/users")} className="w-full flex items-center gap-3 text-[#111827] bg-[#e5e7eb] rounded-lg p-3 text-sm font-semibold text-left">
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

        {/* ── AREA UTAMA KONTEN ── */}
        <main className="flex-1 overflow-y-auto bg-[#f0f4f9] p-4 md:p-6 custom-scrollbar relative space-y-6">
          
          {/* Top page title bar */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-[#124090] tracking-widest uppercase">Admin Panel</span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">User Management</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">Manage user access, roles, and permissions across your organization.</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-[#003399] hover:bg-[#124090] text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-sm transition flex items-center gap-2 select-none"
            >
              <svg className="h-4.5 w-4.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Invite User
            </button>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">Total Users</span>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.total}</h3>
              <p className="text-[10px] text-[#6b7280] mt-1">Registered employee accounts</p>
            </div>
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">Active Users</span>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.active}</h3>
              <p className="text-[10px] text-[#6b7280] mt-1">Operational profiles</p>
            </div>
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-purple-600 tracking-wider uppercase">Admins</span>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.admins}</h3>
              <p className="text-[10px] text-[#6b7280] mt-1">With absolute hub authority</p>
            </div>
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Audit Log</span>
                <button
                  onClick={() => { loadAuditLogs(); setShowAuditModal(true); }}
                  className="text-xs font-extrabold text-[#003399] hover:underline mt-2 flex items-center gap-1"
                >
                  View Activity
                  <svg className="h-3.5 w-3.5 text-[#003399] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
              <div className="h-10 w-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Search & Filters Group */}
          <div className="flex items-center justify-between gap-4 flex-wrap select-none shrink-0">
            <div className="flex-1 min-w-[240px] flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 shadow-sm">
              <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border-none bg-transparent outline-none text-xs md:text-sm text-slate-800 placeholder-gray-400 w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option>All Roles</option>
                  <option>admin</option>
                  <option>supervisor</option>
                  <option>employee</option>
                </select>
                <svg className="h-4 w-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <div className="relative">
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option>All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <svg className="h-4 w-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* User List Table Card */}
          <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-gray-200 select-none">
                  <th className="p-3 md:p-4 text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">User</th>
                  <th className="p-3 md:p-4 text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">Role</th>
                  <th className="p-3 md:p-4 text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">Department</th>
                  <th className="p-3 md:p-4 text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">Status</th>
                  <th className="p-3 md:p-4 text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">Last Login</th>
                  <th className="p-3 md:p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-semibold text-xs md:text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 border-2 border-gray-300 border-t-[#003399] rounded-full animate-spin"></div>
                        Loading users...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold text-xs md:text-sm">
                      No users found.
                    </td>
                  </tr>
                ) : paginatedUsers.map(user => {
                  const userStatus = getUserStatus(user);
                  const st = STATUS_STYLE[userStatus];
                  const rl = ROLE_STYLE[user.role] || ROLE_STYLE.employee;
                  const lastLogin = getLastLogin(user);
                  return (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors">
                      {/* Profile & Name */}
                      <td className="p-3 md:p-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="h-9 w-9 rounded-full object-cover shadow-sm border border-slate-200 shrink-0" />
                          ) : (
                            <div
                              className="h-9 w-9 rounded-full text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-inner select-none"
                              style={{ background: avatarColor(user.full_name) }}
                            >
                              {user.full_name?.slice(0, 2).toUpperCase() || "U"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p
                              className="text-xs md:text-sm font-bold text-slate-800 truncate leading-snug"
                              style={{ textDecoration: userStatus === "deactivated" ? "line-through" : "none" }}
                            >
                              {user.full_name}
                            </p>
                            <p className="text-[10px] text-[#6b7280] font-medium truncate mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3 md:p-4 select-none">
                        <span className="text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: rl.bg, color: rl.color }}>
                          {rl.label}
                        </span>
                      </td>

                      {/* Dept */}
                      <td className="p-3 md:p-4">
                        <span className="text-xs font-bold text-slate-600">{user.department || "—"}</span>
                      </td>

                      {/* Status */}
                      <td className="p-3 md:p-4 select-none">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: st.dot }} />
                          <span className="text-xs font-extrabold" style={{ color: st.color }}>{st.label}</span>
                        </div>
                      </td>

                      {/* Last login */}
                      <td className="p-3 md:p-4">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-700">{lastLogin}</span>
                          {userStatus === "pending" && (
                            <button className="text-[10px] font-extrabold text-[#003399] hover:underline uppercase">Resend</button>
                          )}
                          {userStatus === "deactivated" && (
                            <button onClick={() => toggleUserActive(user.id, false)} className="text-[10px] font-extrabold text-emerald-600 hover:underline uppercase">
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Kebab action dropdown */}
                      <td className="p-3 md:p-4 relative" onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === user.id ? null : user.id); }}>
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-gray-100 hover:text-slate-700 transition">
                          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openMenu === user.id && (
                          <div className="absolute right-4 top-10 bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-[160px] overflow-hidden select-none animate-fade-in text-xs font-bold text-slate-700">
                            <button onClick={() => navigate(`/profile?user_id=${user.id}`)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition flex items-center gap-2">
                              <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Profile
                            </button>
                            <button onClick={() => { updateUserRole(user.id, user.role === "admin" ? "employee" : "admin"); setOpenMenu(null); }} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition flex items-center gap-2">
                              <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
                              </svg>
                              Change Role
                            </button>
                            <button
                              onClick={() => {
                                setMsgRecipient(user);
                                setShowSendMsgModal(true);
                                setMsgSubject("");
                                setMsgBody("");
                                setMsgError("");
                                setMsgSuccess("");
                                setOpenMenu(null);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition flex items-center gap-2"
                            >
                              <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Send Message
                            </button>
                            <div className="h-px bg-slate-100" />
                            <button
                              onClick={() => { toggleUserActive(user.id, user.is_active); setOpenMenu(null); }}
                              className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition flex items-center gap-2 font-black ${user.is_active ? "text-red-600" : "text-emerald-600"}`}
                            >
                              {user.is_active ? (
                                <>
                                  <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Reactivate
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 select-none flex-wrap gap-4">
              <span className="text-xs font-semibold text-slate-500">
                Showing {filtered.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + PAGE_SIZE, filtered.length)} of {filtered.length} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition text-slate-700"
                >
                  Previous
                </button>
                <button
                  disabled={startIndex + PAGE_SIZE >= filtered.length}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition text-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── INVITE MODAL ── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 select-none">
              <h2 className="text-base md:text-lg font-black text-[#111827]">Invite New User</h2>
              <button onClick={() => setShowInviteModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#111827] transition-colors">
                <svg className="h-5 w-5 animate-spin-once" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error banner */}
            {inviteError && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs font-bold text-red-600 flex items-center gap-1.5 select-none">
                <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {inviteError}
              </div>
            )}

            {/* Modal Body Form */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  value={inviteForm.full_name}
                  onChange={e => setInviteForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Nama lengkap karyawan"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none focus:border-[#003399] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Email *</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="karyawan@epson.co.id"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none focus:border-[#003399] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Password Sementara *</label>
                <input
                  type="password"
                  value={inviteForm.password}
                  onChange={e => setInviteForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 6 karakter"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none focus:border-[#003399] transition-all"
                />
              </div>

              <div className="space-y-1.5 select-none">
                <label className="text-xs font-bold text-slate-700">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 bg-white outline-none cursor-pointer"
                >
                  <option value="employee">Employee</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 select-none">
              <button
                onClick={() => setShowInviteModal(false)}
                className="border border-gray-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="bg-[#003399] hover:bg-[#124090] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {inviting ? "Inviting..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT LOGS MODAL ── */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setShowAuditModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 select-none">
              <h2 className="text-base md:text-lg font-black text-[#111827]">Email Audit Logs (Last 50 Logs)</h2>
              <button onClick={() => setShowAuditModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#111827] transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar text-left">
              {loadingAudit ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                  <div className="h-4 w-4 border-2 border-gray-300 border-t-[#003399] rounded-full animate-spin"></div>
                  Loading audit logs...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-semibold">
                  No email audit logs found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <th className="p-3 font-bold text-slate-500 uppercase">Recipient</th>
                        <th className="p-3 font-bold text-slate-500 uppercase">Subject</th>
                        <th className="p-3 font-bold text-slate-500 uppercase">Template</th>
                        <th className="p-3 font-bold text-slate-500 uppercase">Status</th>
                        <th className="p-3 font-bold text-slate-500 uppercase">Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => (
                        <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-700">{log.recipient_email}</td>
                          <td className="p-3 text-slate-600">{log.subject}</td>
                          <td className="p-3 text-slate-500 font-mono">{log.template_name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${log.status === "sent" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                              {log.status}
                            </span>
                            {log.error_message && (
                              <p className="text-[10px] text-red-500 mt-1 max-w-xs truncate" title={log.error_message}>
                                {log.error_message}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-slate-500">
                            {log.sent_at ? new Date(log.sent_at).toLocaleString("id-ID") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="bg-[#003399] hover:bg-[#124090] text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEND MESSAGE MODAL ── */}
      {showSendMsgModal && msgRecipient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => { setShowSendMsgModal(false); setMsgRecipient(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 select-none">
              <h2 className="text-base md:text-lg font-black text-[#111827]">Send Message to {msgRecipient.full_name}</h2>
              <button onClick={() => { setShowSendMsgModal(false); setMsgRecipient(null); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#111827] transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {msgError && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs font-bold text-red-600 flex items-center gap-1.5 select-none">
                <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {msgError}
              </div>
            )}

            {msgSuccess && (
              <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs font-bold text-emerald-600 flex items-center gap-1.5 select-none">
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {msgSuccess}
              </div>
            )}

            <div className="p-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Recipient Email</label>
                <input
                  type="text"
                  value={msgRecipient.email}
                  disabled
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs md:text-sm text-slate-400 bg-slate-50 outline-none cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Subject *</label>
                <input
                  type="text"
                  value={msgSubject}
                  onChange={e => setMsgSubject(e.target.value)}
                  placeholder="Subject of the message"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none focus:border-[#003399] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Content *</label>
                <textarea
                  value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  placeholder="Write your custom message here..."
                  rows={5}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-gray-400 outline-none focus:border-[#003399] transition-all custom-scrollbar resize-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 select-none">
              <button
                onClick={() => { setShowSendMsgModal(false); setMsgRecipient(null); }}
                className="border border-gray-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMsg}
                className="bg-[#003399] hover:bg-[#124090] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {sendingMsg ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

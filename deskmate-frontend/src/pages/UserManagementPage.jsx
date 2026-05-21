// src/pages/UserManagementPage.jsx
// -------------------------------------------------------
// Admin User Management DeskMate
// Sesuai desain: stat cards, search+filter, tabel user
// dengan role badge, status, last login, kebab menu
// -------------------------------------------------------

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole } from "../utils/auth";

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

const AVATAR_COLORS = ["#2563EB","#7C3AED","#059669","#D97706","#DC2626","#0891B2","#DB2777"];
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
  const PAGE_SIZE = 10;

  useEffect(() => { loadProfile(); loadUsers(); }, [page, roleFilter, deptFilter]);

  async function loadProfile() {
    const r = await apiFetch("/api/v1/profiles/me");
    if (r?.ok) setProfile(await r.json());
  }

  async function loadUsers() {
    setLoading(true);
    try {
      // Fetch all profiles via admin endpoint
      const r = await apiFetch(`/api/v1/profiles/me`);
      // Since we don't have a list-all-users endpoint yet,
      // we simulate with available data
      // In production, add GET /api/v1/profiles/ for admin
      const mockUsers = [
        { id: "1", full_name: "Sarah Connor",  email: "sarah.c@company.com",  role: "admin",      department: "IT Support",       is_active: true,  employee_id: "EPS-001" },
        { id: "2", full_name: "Michael Chang",  email: "m.chang@company.com",  role: "supervisor", department: "Engineering",       is_active: true,  employee_id: "EPS-002" },
        { id: "3", full_name: "Emily Davis",    email: "e.davis@company.com",  role: "employee",   department: "Human Resources",  is_active: false, employee_id: null },
        { id: "4", full_name: "James Wilson",   email: "j.wilson@company.com", role: "employee",   department: "Marketing",        is_active: false, employee_id: "EPS-004" },
      ];

      // Try to get real profile data for current user and supplement with mock
      if (r?.ok) {
        const me = await r.json();
        mockUsers[0] = { ...mockUsers[0], full_name: me.full_name || "Admin User", email: me.employee_id || "admin@company.com", department: me.department || "IT Support" };
      }

      setUsers(mockUsers);
      setTotal(248); // mock total
      setStats({ total: 248, active: 235, admins: 12 });
    } finally { setLoading(false); }
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

  const getUserStatus = (user) => {
    if (!user.is_active && !user.employee_id) return "pending";
    if (!user.is_active) return "deactivated";
    return "active";
  };

  const getLastLogin = (user) => {
    if (!user.is_active && !user.employee_id) return "Never";
    if (!user.is_active) return "Oct 12, 2023";
    const hours = Math.floor(Math.random() * 24);
    if (hours === 0) return "Just now";
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return "Yesterday, 14:30";
  };

  const filtered = users.filter(u =>
    (!search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) &&
    (roleFilter === "All Roles" || u.role === roleFilter.toLowerCase()) &&
    (deptFilter === "All Departments" || u.department === deptFilter)
  );

  return (
    <div style={s.root} onClick={() => setOpenMenu(null)}>
      {/* ── SIDEBAR ── */}
      <aside style={s.sidebar}>
        <div style={s.sidebarLogo}>
          <div style={s.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#2563EB"/>
            </svg>
          </div>
          <span style={s.logoText}>DeskMate</span>
        </div>
        <nav style={s.nav}>
          <NavItem icon="🏠" label="Employee Dashboard" onClick={() => navigate("/dashboard")} />
          <NavItem icon="🤖" label="AI Chat Interface" onClick={() => navigate("/chat")} />
          <NavItem icon="☰" label="Employee Ticket List" onClick={() => navigate("/tickets")} />
          <NavItem icon="+" label="Create Ticket Form" onClick={() => navigate("/tickets/create")} />
          <div style={s.navSection}>ADMIN</div>
          <NavItem icon="📁" label="Admin Document Management" onClick={() => navigate("/documents")} />
          <NavItem icon="👥" label="Admin User Management" active />
          <NavItem icon="👤" label="Profile" onClick={() => navigate("/profile")} />
        </nav>
        <div style={s.sidebarFooter} onClick={() => navigate("/profile")}>
          <div style={s.avatarSmall}>{profile?.full_name?.charAt(0)?.toUpperCase() || "U"}</div>
          <div>
            <div style={s.footerName}>{profile?.full_name || getFullName() || "User"}</div>
            <div style={s.footerSub}>Admin</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <h1 style={s.pageTitle}>User Management</h1>
          <div style={s.topbarRight}>
            <button style={s.bellBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button style={s.inviteBtn} onClick={() => setShowInviteModal(true)}>
              👥 Invite User
            </button>
          </div>
        </div>

        <div style={s.content}>
          {/* Section header */}
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Users</h2>
            <p style={s.sectionSub}>Manage user access, roles, and permissions across your organization.</p>
          </div>

          {/* Stat cards */}
          <div style={s.statRow}>
            <StatCard label="Total Users" value={stats.total} />
            <StatCard label="Active" value={stats.active} />
            <StatCard label="Admins" value={stats.admins} />
            <div style={s.auditCard}>
              <div style={s.auditLabel}>Audit Log</div>
              <button style={s.auditBtn} onClick={() => {}}>
                View Activity →
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div style={s.filterRow}>
            <div style={s.searchWrap}>
              <span style={s.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={s.searchInput}
              />
            </div>
            <div style={s.filterGroup}>
              <div style={s.selectWrap}>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={s.filterSelect}>
                  <option>All Roles</option>
                  <option>admin</option>
                  <option>supervisor</option>
                  <option>employee</option>
                </select>
                <span style={s.selectArrow}>▾</span>
              </div>
              <div style={s.selectWrap}>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={s.filterSelect}>
                  <option>All Departments</option>
                  <option>IT Support</option>
                  <option>Engineering</option>
                  <option>Human Resources</option>
                  <option>Marketing</option>
                  <option>Finance</option>
                  <option>Facilities</option>
                </select>
                <span style={s.selectArrow}>▾</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={s.tableCard}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>User</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Department</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Last Login</th>
                  <th style={{...s.th, width: 36}}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={s.emptyCell}><span style={s.spinner}/> Loading users...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={s.emptyCell}>No users found.</td></tr>
                ) : filtered.map(user => {
                  const userStatus = getUserStatus(user);
                  const st = STATUS_STYLE[userStatus];
                  const rl = ROLE_STYLE[user.role] || ROLE_STYLE.employee;
                  const lastLogin = getLastLogin(user);
                  return (
                    <tr key={user.id} style={s.tr}>
                      {/* User */}
                      <td style={s.td}>
                        <div style={s.userCell}>
                          <div style={{...s.userAvatar, background: avatarColor(user.full_name)}}>
                            {user.full_name?.slice(0,2).toUpperCase() || "U"}
                          </div>
                          <div>
                            <div style={{...s.userName, color: user.is_active || userStatus === "pending" ? "#111827" : "#9CA3AF", textDecoration: userStatus === "deactivated" ? "line-through" : "none"}}>
                              {user.full_name}
                            </div>
                            <div style={s.userEmail}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Role badge */}
                      <td style={s.td}>
                        <span style={{...s.roleBadge, background: rl.bg, color: rl.color}}>{rl.label}</span>
                      </td>
                      {/* Department */}
                      <td style={s.td}>
                        <span style={s.deptText}>{user.department || "—"}</span>
                      </td>
                      {/* Status */}
                      <td style={s.td}>
                        <div style={s.statusCell}>
                          <span style={{...s.statusDot, background: st.dot}}/>
                          <span style={{fontSize: 13, color: st.color}}>{st.label}</span>
                        </div>
                      </td>
                      {/* Last login */}
                      <td style={s.td}>
                        <div style={s.lastLoginCell}>
                          <span style={s.lastLoginText}>{lastLogin}</span>
                          {/* Inline action for special statuses */}
                          {userStatus === "pending" && (
                            <button style={s.resendBtn}>Resend</button>
                          )}
                          {userStatus === "deactivated" && (
                            <button style={s.reactivateBtn} onClick={() => toggleUserActive(user.id, false)}>
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                      {/* Kebab menu */}
                      <td style={{...s.td, position: "relative"}} onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === user.id ? null : user.id); }}>
                        <button style={s.kebabBtn}>⋮</button>
                        {openMenu === user.id && (
                          <div style={s.dropdown}>
                            <button style={s.dropItem} onClick={() => navigate(`/profile`)}>👁 View Profile</button>
                            <button style={s.dropItem} onClick={() => { updateUserRole(user.id, user.role === "admin" ? "employee" : "admin"); setOpenMenu(null); }}>
                              🔄 Change Role
                            </button>
                            <button style={s.dropItem}>✉ Send Message</button>
                            <div style={s.dropDivider}/>
                            <button style={{...s.dropItem, color: "#DC2626"}} onClick={() => { toggleUserActive(user.id, user.is_active); setOpenMenu(null); }}>
                              {user.is_active ? "🚫 Deactivate" : "✅ Reactivate"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={s.pagination}>
              <span style={s.pageInfo}>Showing 1 to {Math.min(PAGE_SIZE, filtered.length)} of {stats.total} users</span>
              <div style={s.pageButtons}>
                <button style={s.pageNavBtn} disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))}>Previous</button>
                <button style={s.pageNavBtn} onClick={() => setPage(p => p+1)}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── INVITE MODAL ── */}
      {showInviteModal && (
        <div style={s.modalOverlay} onClick={() => setShowInviteModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Invite New User</h2>
              <button style={s.modalClose} onClick={() => setShowInviteModal(false)}>×</button>
            </div>
            {inviteError && <div style={s.errorBox}>⚠ {inviteError}</div>}
            <div style={s.modalBody}>
              <div style={s.fieldGroup}>
                <label style={s.label}>Full Name *</label>
                <input type="text" value={inviteForm.full_name} onChange={e => setInviteForm(p=>({...p,full_name:e.target.value}))}
                  placeholder="Nama lengkap karyawan" style={s.input}
                  onFocus={e=>e.target.style.borderColor="#2563EB"} onBlur={e=>e.target.style.borderColor="#D1D5DB"}/>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Email *</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm(p=>({...p,email:e.target.value}))}
                  placeholder="karyawan@epson.co.id" style={s.input}
                  onFocus={e=>e.target.style.borderColor="#2563EB"} onBlur={e=>e.target.style.borderColor="#D1D5DB"}/>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Password Sementara *</label>
                <input type="password" value={inviteForm.password} onChange={e => setInviteForm(p=>({...p,password:e.target.value}))}
                  placeholder="Min. 6 karakter" style={s.input}
                  onFocus={e=>e.target.style.borderColor="#2563EB"} onBlur={e=>e.target.style.borderColor="#D1D5DB"}/>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Role</label>
                <select value={inviteForm.role} onChange={e => setInviteForm(p=>({...p,role:e.target.value}))} style={s.select}>
                  <option value="employee">Employee</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setShowInviteModal(false)}>Cancel</button>
              <button style={{...s.submitBtn, opacity: inviting?0.7:1}} onClick={handleInvite} disabled={inviting}>
                {inviting ? "Inviting..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} tr:hover td{background:#F9FAFB}`}</style>
    </div>
  );
}

// ── Sub Components ──────────────────────────────────────
function NavItem({ icon, label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button style={{...s.navItem, background:active?"#EFF6FF":hovered?"#F9FAFB":"transparent", color:active?"#2563EB":"#374151", fontWeight:active?600:400}}
      onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <span style={s.navIcon}>{icon}</span>
      <span style={s.navLabel}>{label}</span>
    </button>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={s.statCard}>
      <div style={s.statLabel}>{label}</div>
      <div style={s.statValue}>{value}</div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────
const s = {
  root: { display: "flex", minHeight: "100vh", background: "#F3F4F6", fontFamily: "'DM Sans','Segoe UI',sans-serif" },
  sidebar: { width: 200, background: "#FFFFFF", borderRight: "1px solid #E5E7EB", display: "flex", flexDirection: "column", flexShrink: 0 },
  sidebarLogo: { display: "flex", alignItems: "center", gap: 10, padding: "18px 16px", borderBottom: "1px solid #F3F4F6" },
  logoIcon: { width: 32, height: 32, background: "#EFF6FF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 15, fontWeight: 700, color: "#111827" },
  nav: { flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 },
  navSection: { fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", padding: "12px 8px 4px", textTransform: "uppercase" },
  navItem: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left", width: "100%", transition: "background 0.12s" },
  navIcon: { fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 },
  navLabel: { fontSize: 13, lineHeight: 1.3 },
  sidebarFooter: { padding: "12px 14px", borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  avatarSmall: { width: 32, height: 32, borderRadius: "50%", background: "#2563EB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 },
  footerName: { fontSize: 13, fontWeight: 600, color: "#111827" },
  footerSub: { fontSize: 11, color: "#9CA3AF" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "auto" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "#FFFFFF", borderBottom: "1px solid #E5E7EB" },
  pageTitle: { fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 },
  topbarRight: { display: "flex", alignItems: "center", gap: 10 },
  bellBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" },
  inviteBtn: { background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  content: { padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 16 },
  sectionHeader: { marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" },
  sectionSub: { fontSize: 13, color: "#6B7280", margin: 0 },
  statRow: { display: "flex", gap: 12 },
  statCard: { flex: 1, background: "#FFFFFF", borderRadius: 10, border: "1px solid #E5E7EB", padding: "16px 20px" },
  statLabel: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: 700, color: "#111827" },
  auditCard: { flex: 1, background: "#FFFFFF", borderRadius: 10, border: "1px solid #E5E7EB", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  auditLabel: { fontSize: 13, color: "#6B7280" },
  auditBtn: { background: "none", border: "none", fontSize: 13, color: "#2563EB", fontWeight: 600, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 },
  filterRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  searchWrap: { flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 12px" },
  searchIcon: { fontSize: 13 },
  searchInput: { border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#374151", fontFamily: "inherit", flex: 1 },
  filterGroup: { display: "flex", gap: 8 },
  selectWrap: { position: "relative" },
  filterSelect: { padding: "8px 28px 8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, color: "#374151", background: "#FFFFFF", appearance: "none", cursor: "pointer", fontFamily: "inherit" },
  selectArrow: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#9CA3AF", pointerEvents: "none" },
  tableCard: { background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#FFFFFF" },
  th: { padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#374151", textAlign: "left", borderBottom: "1px solid #E5E7EB" },
  tr: { borderBottom: "1px solid #F3F4F6", transition: "background 0.1s" },
  td: { padding: "12px 16px", verticalAlign: "middle" },
  userCell: { display: "flex", alignItems: "center", gap: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 600, marginBottom: 2 },
  userEmail: { fontSize: 11, color: "#9CA3AF" },
  roleBadge: { fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20 },
  deptText: { fontSize: 13, color: "#374151" },
  statusCell: { display: "flex", alignItems: "center", gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  lastLoginCell: { display: "flex", alignItems: "center", gap: 10 },
  lastLoginText: { fontSize: 13, color: "#374151" },
  resendBtn: { fontSize: 11, fontWeight: 600, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" },
  reactivateBtn: { fontSize: 11, fontWeight: 600, color: "#15803D", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" },
  kebabBtn: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6B7280", padding: "0 4px", lineHeight: 1 },
  dropdown: { position: "absolute", right: 8, top: "100%", background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 160, overflow: "hidden" },
  dropItem: { display: "block", width: "100%", padding: "8px 14px", border: "none", background: "transparent", fontSize: 13, color: "#374151", cursor: "pointer", textAlign: "left", fontFamily: "inherit" },
  dropDivider: { height: 1, background: "#F3F4F6" },
  pagination: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #F3F4F6" },
  pageInfo: { fontSize: 12, color: "#6B7280" },
  pageButtons: { display: "flex", gap: 8 },
  pageNavBtn: { padding: "6px 16px", border: "1px solid #E5E7EB", background: "#FFFFFF", borderRadius: 6, fontSize: 13, color: "#374151", cursor: "pointer", fontFamily: "inherit" },
  emptyCell: { padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13 },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2px solid #E5E7EB", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.6s linear infinite", marginRight: 8 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 },
  modal: { background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #F3F4F6" },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 },
  modalClose: { background: "none", border: "none", fontSize: 20, color: "#9CA3AF", cursor: "pointer", padding: 0, lineHeight: 1 },
  modalBody: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  modalFooter: { padding: "14px 24px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "flex-end", gap: 10 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  input: { padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" },
  select: { padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", outline: "none", fontFamily: "inherit", background: "#FFFFFF" },
  errorBox: { margin: "0 24px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626" },
  cancelBtn: { padding: "9px 20px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#FFFFFF", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer" },
  submitBtn: { padding: "9px 20px", borderRadius: 8, border: "none", background: "#2563EB", fontSize: 13, fontWeight: 600, color: "#FFFFFF", cursor: "pointer" },
};

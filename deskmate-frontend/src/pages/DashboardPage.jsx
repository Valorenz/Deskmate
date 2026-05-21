// src/pages/DashboardPage.jsx
// -------------------------------------------------------
// Employee Dashboard DeskMate
// Sesuai desain screenshot: sidebar kiri, stat cards, quick actions,
// recent tickets, system alerts, user profile card
// -------------------------------------------------------

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole, logout } from "../utils/auth";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ open: 0, awaiting: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const role = getRole();

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

      // Ambil tiket
      const ticketRes = await apiFetch("/api/v1/tickets/?size=5");
      if (ticketRes?.ok) {
        const data = await ticketRes.json();
        const items = data.items || [];
        setTickets(items);
        setStats({
          open: items.filter((t) => t.status === "open").length,
          awaiting: items.filter((t) => t.status === "in_progress").length,
          resolved: items.filter((t) => t.status === "resolved" || t.status === "closed").length,
        });
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

  const priorityIcon = (priority) => {
    if (priority === "critical" || priority === "high") return "⚡";
    if (priority === "medium") return "🖥";
    return "✓";
  };

  return (
    <div style={s.root}>
      {/* ── SIDEBAR ── */}
      <aside style={s.sidebar}>
        {/* Logo */}
        <div style={s.sidebarLogo}>
          <div style={s.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#2563EB"/>
            </svg>
          </div>
          <span style={s.logoText}>DeskMate</span>
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          <NavItem icon="🏠" label="Employee Dashboard" active onClick={() => navigate("/dashboard")} />
          <NavItem icon="🤖" label="AI Chat Interface" onClick={() => navigate("/chat")} />
          <NavItem icon="☰" label="Employee Ticket List" onClick={() => navigate("/tickets")} />
          <NavItem icon="+" label="Create Ticket Form" onClick={() => navigate("/tickets/create")} />

          {(role === "admin" || role === "supervisor") && (
            <>
              <div style={s.navSection}>ADMIN</div>
              <NavItem icon="📄" label="Admin Document Management" onClick={() => navigate("/documents")} />
              <NavItem icon="⚙" label="Admin User Management" onClick={() => navigate("/users")} />
            </>
          )}
        </nav>

        {/* User footer */}
        <div style={s.sidebarFooter} onClick={() => navigate("/profile")} title="Profile & Settings">
          <div style={s.avatarSmall}>
            {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.footerName}>{profile?.full_name || getFullName() || "User"}</div>
            <div style={s.footerSub}>Profile & Settings</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={s.main}>
        {/* Header */}
        <div style={s.header}>
          <h1 style={s.pageTitle}>Employee Dashboard</h1>
          <button style={s.bellBtn} title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </div>

        {/* Content grid */}
        <div style={s.contentGrid}>
          {/* LEFT COLUMN */}
          <div style={s.leftCol}>
            {/* Stat cards */}
            <div style={s.statRow}>
              <StatCard
                label="Open Tickets"
                value={loading ? "—" : stats.open}
                sub="↑ 2 since yesterday"
                icon="💬"
                iconBg="#DBEAFE"
              />
              <StatCard
                label="Awaiting Response"
                value={loading ? "—" : stats.awaiting}
                sub="Needs attention soon"
                icon="⏳"
                iconBg="#FEF9C3"
              />
              <StatCard
                label="Resolved (7d)"
                value={loading ? "—" : stats.resolved}
                sub="Great work this week"
                icon="✓"
                iconBg="#DCFCE7"
                iconColor="#15803D"
              />
            </div>

            {/* Quick Actions */}
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Quick Actions</h2>
              <div style={s.actionRow}>
                <button style={s.actionCardWhite} onClick={() => navigate("/tickets/create")}>
                  <div style={s.actionIconWhite}>＋</div>
                  <div>
                    <div style={s.actionLabel}>Create Ticket</div>
                    <div style={s.actionSub}>Report an issue</div>
                  </div>
                </button>
                <button style={s.actionCardBlue} onClick={() => navigate("/chat")}>
                  <div style={s.actionIconBlue}>🤖</div>
                  <div>
                    <div style={s.actionLabelBlue}>UX Pilot AI Chat</div>
                    <div style={s.actionSubBlue}>Get instant help</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Ticket Activity */}
            <div style={s.section}>
              <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Recent Ticket Activity</h2>
                <button style={s.viewAll} onClick={() => navigate("/tickets")}>View All</button>
              </div>

              {loading ? (
                <div style={s.emptyState}>Memuat tiket...</div>
              ) : tickets.length === 0 ? (
                <div style={s.emptyState}>Belum ada tiket. Buat tiket pertama Anda!</div>
              ) : (
                <div style={s.ticketList}>
                  {tickets.map((t) => (
                    <div key={t.id} style={s.ticketItem} onClick={() => navigate(`/tickets/${t.id}`)}>
                      <div style={s.ticketIcon}>{priorityIcon(t.priority)}</div>
                      <div style={s.ticketContent}>
                        <div style={s.ticketTitle}>{t.title}</div>
                        <div style={s.ticketDesc}>{t.description?.slice(0, 60)}...</div>
                        <div style={{ marginTop: 6 }}>{statusBadge(t.status)}</div>
                      </div>
                      <div style={s.ticketTime}>{timeAgo(t.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={s.rightCol}>
            {/* System Alerts */}
            <div style={s.card}>
              <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>System Alerts</h2>
                <span style={s.alertBadge}>2</span>
              </div>
              <div style={s.alertList}>
                <AlertItem
                  icon="ℹ"
                  iconBg="#DBEAFE"
                  title="Scheduled Maintenance"
                  desc="IT systems will be down this Saturday from 2AM to 4AM EST."
                />
                <AlertItem
                  icon="📄"
                  iconBg="#F3F4F6"
                  title="New HR Policy Document"
                  desc="Please review the updated remote work guidelines in Document Management."
                />
              </div>
            </div>

            {/* Profile Card */}
            <div style={s.profileCard}>
              <div style={s.avatarLarge}>
                {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div style={s.profileName}>{profile?.full_name || getFullName() || "User"}</div>
              <div style={s.profileDept}>{profile?.department || "Manufacturing Operations"}</div>
              <div style={s.profileDivider} />
              <div style={s.profileRow}>
                <span style={s.profileKey}>Employee ID</span>
                <span style={s.profileVal}>{profile?.employee_id || "—"}</span>
              </div>
              <div style={s.profileRow}>
                <span style={s.profileKey}>Location</span>
                <span style={s.profileVal}>Plant B</span>
              </div>
              <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub Components ─────────────────────────────────────

function NavItem({ icon, label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        ...s.navItem,
        background: active ? "#EFF6FF" : hovered ? "#F9FAFB" : "transparent",
        color: active ? "#2563EB" : "#374151",
        fontWeight: active ? 600 : 400,
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={s.navIcon}>{icon}</span>
      <span style={s.navLabel}>{label}</span>
    </button>
  );
}

function StatCard({ label, value, sub, icon, iconBg, iconColor = "#2563EB" }) {
  return (
    <div style={s.statCard}>
      <div style={s.statTop}>
        <div>
          <div style={s.statLabel}>{label}</div>
          <div style={s.statValue}>{value}</div>
        </div>
        <div style={{ ...s.statIconWrap, background: iconBg }}>
          <span style={{ fontSize: 18, color: iconColor }}>{icon}</span>
        </div>
      </div>
      <div style={s.statSub}>{sub}</div>
    </div>
  );
}

function AlertItem({ icon, iconBg, title, desc }) {
  return (
    <div style={s.alertItem}>
      <div style={{ ...s.alertIcon, background: iconBg }}>{icon}</div>
      <div>
        <div style={s.alertTitle}>{title}</div>
        <div style={s.alertDesc}>{desc}</div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────
const s = {
  root: { display: "flex", minHeight: "100vh", background: "#F3F4F6", fontFamily: "'DM Sans','Segoe UI',sans-serif" },

  // Sidebar
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
  footerName: { fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  footerSub: { fontSize: 11, color: "#9CA3AF" },

  // Main
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 0", marginBottom: 4 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 },
  bellBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center" },

  // Content
  contentGrid: { display: "flex", gap: 20, padding: "16px 24px 24px", flex: 1 },
  leftCol: { flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 },
  rightCol: { width: 220, display: "flex", flexDirection: "column", gap: 16, flexShrink: 0 },

  // Stat cards
  statRow: { display: "flex", gap: 12 },
  statCard: { flex: 1, background: "#FFFFFF", borderRadius: 12, padding: "16px", border: "1px solid #E5E7EB" },
  statTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  statLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 700, color: "#111827" },
  statIconWrap: { width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  statSub: { fontSize: 12, color: "#6B7280" },

  // Section
  section: { background: "#FFFFFF", borderRadius: 12, padding: 16, border: "1px solid #E5E7EB" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 },
  viewAll: { background: "none", border: "none", fontSize: 12, color: "#2563EB", cursor: "pointer", fontWeight: 500, padding: 0 },

  // Quick Actions
  actionRow: { display: "flex", gap: 12 },
  actionCardWhite: { flex: 1, background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: "14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" },
  actionIconWhite: { width: 32, height: 32, background: "#F3F4F6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 },
  actionCardBlue: { flex: 1, background: "#2563EB", border: "none", borderRadius: 10, padding: "14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" },
  actionIconBlue: { width: 32, height: 32, background: "rgba(255,255,255,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 },
  actionLabel: { fontSize: 13, fontWeight: 600, color: "#111827" },
  actionSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  actionLabelBlue: { fontSize: 13, fontWeight: 600, color: "#FFFFFF" },
  actionSubBlue: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  // Ticket list
  ticketList: { display: "flex", flexDirection: "column", gap: 0 },
  ticketItem: { display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #F3F4F6", cursor: "pointer", alignItems: "flex-start" },
  ticketIcon: { width: 32, height: 32, background: "#F3F4F6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginTop: 2 },
  ticketContent: { flex: 1, minWidth: 0 },
  ticketTitle: { fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 },
  ticketDesc: { fontSize: 12, color: "#6B7280", lineHeight: 1.4 },
  ticketTime: { fontSize: 11, color: "#9CA3AF", flexShrink: 0, marginTop: 2 },
  emptyState: { fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "20px 0" },

  // Right column
  card: { background: "#FFFFFF", borderRadius: 12, padding: 16, border: "1px solid #E5E7EB" },
  alertBadge: { background: "#2563EB", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 10 },
  alertList: { display: "flex", flexDirection: "column", gap: 12 },
  alertItem: { display: "flex", gap: 10, alignItems: "flex-start" },
  alertIcon: { width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 },
  alertTitle: { fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 2 },
  alertDesc: { fontSize: 11, color: "#6B7280", lineHeight: 1.4 },

  // Profile card
  profileCard: { background: "#FFFFFF", borderRadius: 12, padding: 16, border: "1px solid #E5E7EB", display: "flex", flexDirection: "column", alignItems: "center" },
  avatarLarge: { width: 60, height: 60, borderRadius: "50%", background: "#2563EB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, marginBottom: 10 },
  profileName: { fontSize: 14, fontWeight: 700, color: "#111827", textAlign: "center" },
  profileDept: { fontSize: 12, color: "#6B7280", marginTop: 2, marginBottom: 12, textAlign: "center" },
  profileDivider: { width: "100%", height: 1, background: "#F3F4F6", marginBottom: 12 },
  profileRow: { display: "flex", justifyContent: "space-between", width: "100%", marginBottom: 8 },
  profileKey: { fontSize: 12, color: "#6B7280" },
  profileVal: { fontSize: 12, fontWeight: 600, color: "#111827" },
  logoutBtn: { marginTop: 12, width: "100%", padding: "8px", background: "#FEF2F2", color: "#DC2626", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

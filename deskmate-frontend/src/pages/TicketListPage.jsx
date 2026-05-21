// src/pages/TicketListPage.jsx
// -------------------------------------------------------
// Employee Ticket List DeskMate
// Sesuai desain screenshot: breadcrumb, stat cards,
// search & filter bar, tabel tiket dengan pagination
// -------------------------------------------------------

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole } from "../utils/auth";

const STATUS_OPTIONS = ["All", "open", "in_progress", "resolved", "closed"];
const PRIORITY_OPTIONS = ["All", "low", "medium", "high", "critical"];

const STATUS_STYLE = {
  open:        { label: "Open",        bg: "#DBEAFE", color: "#1D4ED8" },
  in_progress: { label: "In Progress", bg: "#FEF9C3", color: "#B45309" },
  resolved:    { label: "Resolved",    bg: "#DCFCE7", color: "#15803D" },
  closed:      { label: "Closed",      bg: "#F3F4F6", color: "#6B7280" },
};

const PRIORITY_STYLE = {
  low:      { color: "#15803D", dot: "#22C55E" },
  medium:   { color: "#B45309", dot: "#F59E0B" },
  high:     { color: "#DC2626", dot: "#EF4444" },
  critical: { color: "#7C3AED", dot: "#8B5CF6" },
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

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div style={s.pagination}>
        <span style={s.pageInfo}>
          Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalItems)} to{" "}
          {Math.min(page * PAGE_SIZE, totalItems)} of {totalItems} entries
        </span>
        <div style={s.pageButtons}>
          <button style={s.pageBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {start > 1 && <><button style={s.pageBtn} onClick={() => setPage(1)}>1</button><span style={s.pageDots}>...</span></>}
          {pages.map((p) => (
            <button
              key={p}
              style={{ ...s.pageBtn, ...(p === page ? s.pageBtnActive : {}) }}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          {end < totalPages && <><span style={s.pageDots}>...</span><button style={s.pageBtn} onClick={() => setPage(totalPages)}>{totalPages}</button></>}
          <button style={s.pageBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
        </div>
      </div>
    );
  };

  return (
    <div style={s.root}>
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
          <NavItem icon="☰" label="Employee Ticket List" active />
          <NavItem icon="+" label="Create Ticket Form" onClick={() => navigate("/tickets/create")} />
          {(role === "admin" || role === "supervisor") && (
            <>
              <div style={s.navSection}>ADMIN</div>
              <NavItem icon="📄" label="Admin Document Management" onClick={() => navigate("/documents")} />
              <NavItem icon="⚙" label="Admin User Management" onClick={() => navigate("/users")} />
            </>
          )}
        </nav>
        <div style={s.sidebarFooter} onClick={() => navigate("/profile")}>
          <div style={s.avatarSmall}>{profile?.full_name?.charAt(0)?.toUpperCase() || "U"}</div>
          <div>
            <div style={s.footerName}>{profile?.full_name || getFullName() || "User"}</div>
            <div style={s.footerSub}>Profile & Settings</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <div style={s.breadcrumb}>
            <span style={s.breadHome} onClick={() => navigate("/dashboard")}>Home</span>
            <span style={s.breadSep}>›</span>
            <span style={s.breadCurrent}>My Tickets</span>
          </div>
          <div style={s.topbarRight}>
            <button style={s.bellBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button style={s.newTicketBtn} onClick={() => navigate("/tickets/create")}>
              + New Ticket
            </button>
          </div>
        </div>

        <div style={s.content}>
          {/* Page header + stats */}
          <div style={s.pageHeader}>
            <div>
              <h1 style={s.pageTitle}>My Tickets</h1>
              <p style={s.pageSub}>Manage and track your IT and HR requests.</p>
            </div>
            <div style={s.statCards}>
              <StatChip icon="📨" label="TOTAL" value={stats.total} color="#2563EB" bg="#EFF6FF" />
              <StatChip icon="🟡" label="OPEN" value={stats.open} color="#B45309" bg="#FEF9C3" />
              <StatChip icon="✅" label="RESOLVED" value={stats.resolved} color="#15803D" bg="#DCFCE7" />
            </div>
          </div>

          {/* Table card */}
          <div style={s.tableCard}>
            {/* Toolbar */}
            <div style={s.toolbar}>
              <div style={s.searchWrap}>
                <span style={s.searchIcon}>🔍</span>
                <input
                  type="text"
                  placeholder="Search tickets by ID, subject..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  style={s.searchInput}
                />
              </div>
              <div style={s.filterRow}>
                {/* Status filter */}
                <div style={s.filterWrap}>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    style={s.filterSelect}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>Status: {o === "All" ? "All" : STATUS_STYLE[o]?.label || o}</option>
                    ))}
                  </select>
                  <span style={s.filterArrow}>▾</span>
                </div>
                {/* Priority filter */}
                <div style={s.filterWrap}>
                  <select
                    value={priorityFilter}
                    onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                    style={s.filterSelect}
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o} value={o}>Priority: {o}</option>
                    ))}
                  </select>
                  <span style={s.filterArrow}>▾</span>
                </div>
                <button style={s.exportBtn}>
                  ↓ Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    <th style={{ ...s.th, width: 36 }}>
                      <input
                        type="checkbox"
                        checked={selected.length === filteredTickets.length && filteredTickets.length > 0}
                        onChange={toggleSelectAll}
                        style={s.checkbox}
                      />
                    </th>
                    <th style={{ ...s.th, width: 100 }}>TICKET ID</th>
                    <th style={s.th}>SUBJECT</th>
                    <th style={{ ...s.th, width: 120 }}>STATUS</th>
                    <th style={{ ...s.th, width: 100 }}>PRIORITY</th>
                    <th style={{ ...s.th, width: 160 }}>
                      LAST UPDATED ↓
                    </th>
                    <th style={{ ...s.th, width: 80 }}>ASSIGN</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={s.emptyCell}>
                        <div style={s.loadingRow}>
                          <span style={s.spinner} /> Loading tickets...
                        </div>
                      </td>
                    </tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={s.emptyCell}>
                        <div style={s.emptyState}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>🎫</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>No tickets found</div>
                          <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>Create your first ticket to get started</div>
                          <button style={{ ...s.newTicketBtn, marginTop: 12 }} onClick={() => navigate("/tickets/create")}>
                            + New Ticket
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const st = STATUS_STYLE[ticket.status] || STATUS_STYLE.open;
                      const pr = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.medium;
                      const isSelected = selected.includes(ticket.id);
                      return (
                        <tr
                          key={ticket.id}
                          style={{ ...s.tr, background: isSelected ? "#F0F7FF" : "#FFFFFF" }}
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                          <td style={s.td} onClick={(e) => { e.stopPropagation(); toggleSelect(ticket.id); }}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(ticket.id)} style={s.checkbox} />
                          </td>
                          <td style={s.td}>
                            <span style={s.ticketNum}>#{ticket.ticket_number}</span>
                          </td>
                          <td style={s.td}>
                            <div style={s.ticketTitle}>{ticket.title}</div>
                            <div style={s.ticketMeta}>
                              {ticket.category && <span>{ticket.category}</span>}
                            </div>
                          </td>
                          <td style={s.td}>
                            <span style={{ ...s.statusBadge, background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </td>
                          <td style={s.td}>
                            <span style={s.priorityRow}>
                              <span style={{ ...s.priorityDot, background: pr.dot }} />
                              <span style={{ color: pr.color, textTransform: "capitalize", fontSize: 13 }}>
                                {ticket.priority?.charAt(0).toUpperCase() + ticket.priority?.slice(1)}
                              </span>
                            </span>
                          </td>
                          <td style={s.td}>
                            <span style={s.dateText}>{timeAgo(ticket.updated_at || ticket.created_at)}</span>
                          </td>
                          <td style={s.td}>
                            {ticket.assignee ? (
                              <div style={s.assigneeAvatar} title={ticket.assignee.full_name}>
                                {ticket.assignee.full_name?.charAt(0)?.toUpperCase()}
                              </div>
                            ) : (
                              <span style={s.unassigned}>Unassigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalItems > 0 && renderPagination()}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub Components ──────────────────────────────────────
function NavItem({ icon, label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{ ...s.navItem, background: active ? "#EFF6FF" : hovered ? "#F9FAFB" : "transparent", color: active ? "#2563EB" : "#374151", fontWeight: active ? 600 : 400 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={s.navIcon}>{icon}</span>
      <span style={s.navLabel}>{label}</span>
    </button>
  );
}

function StatChip({ icon, label, value, color, bg }) {
  return (
    <div style={{ ...s.statChip, background: bg }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.05em" }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{value}</div>
      </div>
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
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #E5E7EB", background: "#FFFFFF" },
  breadcrumb: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  breadHome: { color: "#6B7280", cursor: "pointer" },
  breadSep: { color: "#D1D5DB" },
  breadCurrent: { color: "#111827", fontWeight: 500 },
  topbarRight: { display: "flex", alignItems: "center", gap: 10 },
  bellBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" },
  newTicketBtn: { background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  content: { padding: "20px 24px", flex: 1 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" },
  pageSub: { fontSize: 13, color: "#6B7280", margin: 0 },
  statCards: { display: "flex", gap: 8 },
  statChip: { display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, border: "1px solid #E5E7EB" },
  tableCard: { background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #F3F4F6", gap: 12, flexWrap: "wrap" },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 12px" },
  searchIcon: { fontSize: 13, flexShrink: 0 },
  searchInput: { border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#374151", flex: 1, fontFamily: "inherit" },
  filterRow: { display: "flex", gap: 8, alignItems: "center" },
  filterWrap: { position: "relative" },
  filterSelect: { padding: "7px 28px 7px 10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12, color: "#374151", background: "#FFFFFF", appearance: "none", cursor: "pointer", fontFamily: "inherit" },
  filterArrow: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#9CA3AF", pointerEvents: "none" },
  exportBtn: { padding: "7px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#FFFFFF", fontSize: 12, color: "#374151", cursor: "pointer", fontFamily: "inherit" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#F9FAFB" },
  th: { padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#6B7280", textAlign: "left", letterSpacing: "0.04em", borderBottom: "1px solid #F3F4F6", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #F9FAFB", cursor: "pointer", transition: "background 0.1s" },
  td: { padding: "12px 14px", verticalAlign: "middle" },
  checkbox: { width: 14, height: 14, accentColor: "#2563EB", cursor: "pointer" },
  ticketNum: { fontSize: 12, fontWeight: 700, color: "#2563EB", fontFamily: "monospace" },
  ticketTitle: { fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 },
  ticketMeta: { fontSize: 11, color: "#9CA3AF" },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 },
  priorityRow: { display: "flex", alignItems: "center", gap: 6 },
  priorityDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  dateText: { fontSize: 12, color: "#374151" },
  assigneeAvatar: { width: 26, height: 26, borderRadius: "50%", background: "#2563EB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 },
  unassigned: { fontSize: 11, color: "#9CA3AF" },
  emptyCell: { padding: "40px 20px", textAlign: "center" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center" },
  loadingRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#6B7280", fontSize: 13 },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2px solid #E5E7EB", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.6s linear infinite" },
  pagination: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #F3F4F6" },
  pageInfo: { fontSize: 12, color: "#6B7280" },
  pageButtons: { display: "flex", gap: 4, alignItems: "center" },
  pageBtn: { minWidth: 30, height: 30, border: "1px solid #E5E7EB", background: "#FFFFFF", borderRadius: 6, fontSize: 13, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" },
  pageBtnActive: { background: "#2563EB", color: "#FFFFFF", borderColor: "#2563EB" },
  pageDots: { fontSize: 13, color: "#9CA3AF", padding: "0 4px" },
};

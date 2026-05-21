// src/pages/AllTicketsPage.jsx
// -------------------------------------------------------
// Supervisor / All Tickets Management DeskMate
// Sesuai desain: filter chips, tabel dengan requester avatar,
// status+priority inline badges, assignee, SLA indicator, kebab menu
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

// Fake SLA for display since backend doesn't have SLA field yet
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

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { loadTickets(); }, [statusFilter, priorityFilter, page]);

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
    if (diff < 86400) return `${Math.floor(diff/3600)} hr${Math.floor(diff/3600)>1?"s":""} ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  const renderPages = () => {
    const pages = [];
    const show = 3;
    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + show - 1);
    if (end - start < show - 1) start = Math.max(1, end - show + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <div style={s.pagination}>
        <span style={s.pageInfo}>Showing {Math.min((page-1)*PAGE_SIZE+1, total)} to {Math.min(page*PAGE_SIZE, total)} of {total} tickets</span>
        <div style={s.pageButtons}>
          <button style={s.pageNavBtn} onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← Previous</button>
          {start > 1 && <><button style={s.pageBtn} onClick={() => setPage(1)}>1</button><span style={s.pageDots}>...</span></>}
          {pages.map(p => (
            <button key={p} style={{...s.pageBtn, ...(p===page?s.pageBtnActive:{})}} onClick={() => setPage(p)}>{p}</button>
          ))}
          {end < totalPages && <><span style={s.pageDots}>...</span><button style={s.pageBtn} onClick={() => setPage(totalPages)}>{totalPages}</button></>}
          <button style={s.pageNavBtn} onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
        </div>
      </div>
    );
  };

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
          <NavItem icon="🏠" label="Supervisor Dashboard" onClick={() => navigate("/dashboard")} />
          <NavItem icon="🤖" label="AI Chat Interface" onClick={() => navigate("/chat")} />
          <NavItem icon="☰" label="Employee Ticket List" onClick={() => navigate("/tickets")} />
          <NavItem icon="+" label="Create Ticket Form" onClick={() => navigate("/tickets/create")} />
          <NavItem icon="🎫" label="All Tickets" active />
          <div style={s.navSection}>ADMIN</div>
          <NavItem icon="📄" label="Admin Document Management" onClick={() => navigate("/documents")} />
          <NavItem icon="⚙" label="Admin User Management" onClick={() => navigate("/users")} />
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
          <h1 style={s.pageTitle}>All Tickets</h1>
          <div style={s.topbarRight}>
            <button style={s.bellBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button style={s.newTicketBtn} onClick={() => navigate("/tickets/create")}>+ New Ticket</button>
          </div>
        </div>

        <div style={s.content}>
          {/* Header */}
          <div style={s.contentHeader}>
            <div>
              <h2 style={s.contentTitle}>Tickets Management</h2>
              <p style={s.contentSub}>Manage and assign all incoming organizational tickets.</p>
            </div>
            {/* Search + export */}
            <div style={s.searchRow}>
              <div style={s.searchWrap}>
                <span style={s.searchIcon}>🔍</span>
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={s.searchInput}
                />
              </div>
              <button style={s.exportBtn} title="Export">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Filter chips */}
          <div style={s.filterBar}>
            <div style={s.activeChip}>{total} Active Tickets</div>
            <FilterDrop label="Status" options={STATUS_OPTIONS} value={statusFilter} onChange={v => { setStatus(v); setPage(1); }}
              display={v => STATUS_STYLE[v]?.label || v} />
            <FilterDrop label="Priority" options={PRIORITY_OPTIONS} value={priorityFilter} onChange={v => { setPriority(v); setPage(1); }}
              display={v => PRIORITY_STYLE[v]?.label || v} />
            <FilterDrop label="Department" options={["All", "IT & Network", "HR", "Facilities", "Finance"]} value="All" onChange={() => {}} display={v => v} />
            <FilterDrop label="Assignee" options={["All", "Unassigned", "Mark J.", "Sarah C."]} value="All" onChange={() => {}} display={v => v} />
            <button style={s.moreFiltersBtn}>▼ More Filters</button>
          </div>

          {/* Table */}
          <div style={s.tableCard}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={{...s.th, width: 36}}>
                    <input type="checkbox" checked={selected.length===filtered.length&&filtered.length>0} onChange={toggleAll} style={s.checkbox}/>
                  </th>
                  <th style={s.th}>TICKET INFO</th>
                  <th style={s.th}>REQUESTER</th>
                  <th style={s.th}>STATUS & PRIORITY</th>
                  <th style={s.th}>ASSIGNEE</th>
                  <th style={s.th}>SLA / UPDATED</th>
                  <th style={{...s.th, width: 36}}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={s.emptyCell}>
                    <span style={s.spinner}/> Loading...
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={s.emptyCell}>No tickets found.</td></tr>
                ) : filtered.map(ticket => {
                  const st  = STATUS_STYLE[ticket.status] || STATUS_STYLE.open;
                  const pr  = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.medium;
                  const sla = fakeSLA(ticket);
                  const isSelected = selected.includes(ticket.id);
                  const reqName = ticket.creator?.full_name || "Unknown";
                  const assigneeName = ticket.assignee?.full_name;
                  return (
                    <tr key={ticket.id} style={{...s.tr, background: isSelected ? "#F0F7FF" : "#FFFFFF"}}
                      onClick={() => navigate(`/tickets/${ticket.id}`)}>
                      <td style={s.td} onClick={e => { e.stopPropagation(); setSelected(p => p.includes(ticket.id) ? p.filter(x=>x!==ticket.id) : [...p, ticket.id]); }}>
                        <input type="checkbox" checked={isSelected} onChange={()=>{}} style={s.checkbox}/>
                      </td>
                      {/* Ticket info */}
                      <td style={s.td}>
                        <div style={s.ticketTitle}>{ticket.title}</div>
                        <div style={s.ticketMeta}>#{ticket.ticket_number} • {ticket.category || "General"}</div>
                      </td>
                      {/* Requester */}
                      <td style={s.td}>
                        <div style={s.requesterCell}>
                          <div style={{...s.reqAvatar, background: avatarColor(reqName)}}>{reqName.charAt(0).toUpperCase()}</div>
                          <span style={s.reqName}>{reqName}</span>
                        </div>
                      </td>
                      {/* Status & Priority */}
                      <td style={s.td}>
                        <div style={s.statusPriorityCell}>
                          <span style={{...s.badge, background: st.bg, color: st.color}}>{st.label} ▾</span>
                          <span style={{...s.badge, background: pr.bg, color: pr.color}}>{pr.label}</span>
                        </div>
                      </td>
                      {/* Assignee */}
                      <td style={s.td}>
                        {assigneeName ? (
                          <div style={s.assigneeCell}>
                            <div style={{...s.assignAvatar, background: avatarColor(assigneeName)}}>{assigneeName.charAt(0).toUpperCase()}</div>
                            <span style={s.assignName}>{assigneeName.split(" ")[0]} {assigneeName.split(" ")[1]?.charAt(0)}.</span>
                          </div>
                        ) : (
                          <span style={s.unassigned}>👤 Unassigned</span>
                        )}
                      </td>
                      {/* SLA / Updated */}
                      <td style={s.td}>
                        <div style={{...s.slaText, color: sla.color, fontWeight: sla.bold ? 700 : 400}}>{sla.label}</div>
                        <div style={s.updatedText}>{timeAgo(ticket.updated_at || ticket.created_at)}</div>
                      </td>
                      {/* Kebab menu */}
                      <td style={s.td} onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === ticket.id ? null : ticket.id); }}>
                        <button style={s.kebabBtn}>⋮</button>
                        {openMenu === ticket.id && (
                          <div style={s.dropdown}>
                            <button style={s.dropItem} onClick={() => navigate(`/tickets/${ticket.id}`)}>👁 View</button>
                            <button style={s.dropItem}>👤 Assign</button>
                            <button style={s.dropItem}>🔄 Change Status</button>
                            <div style={s.dropDivider}/>
                            <button style={{...s.dropItem, color: "#DC2626"}}>🗑 Close Ticket</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && total > 0 && renderPages()}
          </div>
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} tr:hover td{background:#F9FAFB}`}</style>
    </div>
  );
}

// ── Sub Components ──────────────────────────────────────
function NavItem({ icon, label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button style={{...s.navItem, background: active?"#EFF6FF":hovered?"#F9FAFB":"transparent", color: active?"#2563EB":"#374151", fontWeight: active?600:400}}
      onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <span style={s.navIcon}>{icon}</span>
      <span style={s.navLabel}>{label}</span>
    </button>
  );
}

function FilterDrop({ label, options, value, onChange, display }) {
  return (
    <div style={s.filterWrap}>
      <select value={value} onChange={e => onChange(e.target.value)} style={s.filterSelect}>
        {options.map(o => <option key={o} value={o}>{value !== "All" && o === value ? display(o) : `${label}${value !== "All" && o === "All" ? "" : ""}`}{o === "All" ? `: All` : ` ▾`}{o !== "All" && o === value ? "" : ""}</option>)}
        {/* Simpler approach */}
      </select>
      <div style={s.filterChip}>
        {label}{value !== "All" ? `: ${display(value)}` : ""} <span style={{fontSize:9}}>▾</span>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────
const s = {
  root: { display: "flex", minHeight: "100vh", background: "#F3F4F6", fontFamily: "'DM Sans','Segoe UI',sans-serif", position: "relative" },
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
  newTicketBtn: { background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  content: { padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 14 },
  contentHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 },
  contentTitle: { fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 4px" },
  contentSub: { fontSize: 13, color: "#6B7280", margin: 0 },
  searchRow: { display: "flex", gap: 8, alignItems: "center" },
  searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 12px", minWidth: 200 },
  searchIcon: { fontSize: 13 },
  searchInput: { border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#374151", fontFamily: "inherit", width: 160 },
  exportBtn: { background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center" },
  filterBar: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  activeChip: { background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20 },
  filterWrap: { position: "relative" },
  filterSelect: { position: "absolute", inset: 0, opacity: 0, cursor: "pointer", zIndex: 1 },
  filterChip: { background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 20, fontSize: 12, color: "#374151", padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" },
  moreFiltersBtn: { background: "none", border: "none", fontSize: 12, color: "#6B7280", cursor: "pointer", padding: "5px 8px" },
  tableCard: { background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#F9FAFB" },
  th: { padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#6B7280", textAlign: "left", letterSpacing: "0.05em", borderBottom: "1px solid #F3F4F6", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #F9FAFB", cursor: "pointer", transition: "background 0.1s" },
  td: { padding: "12px 14px", verticalAlign: "middle", position: "relative" },
  checkbox: { width: 14, height: 14, accentColor: "#2563EB", cursor: "pointer" },
  ticketTitle: { fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 3 },
  ticketMeta: { fontSize: 11, color: "#9CA3AF" },
  requesterCell: { display: "flex", alignItems: "center", gap: 7 },
  reqAvatar: { width: 26, height: 26, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  reqName: { fontSize: 13, color: "#374151" },
  statusPriorityCell: { display: "flex", gap: 6, flexWrap: "wrap" },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, cursor: "pointer" },
  assigneeCell: { display: "flex", alignItems: "center", gap: 7 },
  assignAvatar: { width: 24, height: 24, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 },
  assignName: { fontSize: 12, color: "#374151" },
  unassigned: { fontSize: 12, color: "#9CA3AF" },
  slaText: { fontSize: 12, fontWeight: 600, marginBottom: 2 },
  updatedText: { fontSize: 11, color: "#9CA3AF" },
  kebabBtn: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6B7280", padding: "0 4px", lineHeight: 1 },
  dropdown: { position: "absolute", right: 8, top: "100%", background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 160, overflow: "hidden" },
  dropItem: { display: "block", width: "100%", padding: "8px 14px", border: "none", background: "transparent", fontSize: 13, color: "#374151", cursor: "pointer", textAlign: "left", fontFamily: "inherit" },
  dropDivider: { height: 1, background: "#F3F4F6" },
  emptyCell: { padding: "32px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 13 },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2px solid #E5E7EB", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.6s linear infinite", marginRight: 8 },
  pagination: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #F3F4F6", flexWrap: "wrap", gap: 8 },
  pageInfo: { fontSize: 12, color: "#6B7280" },
  pageButtons: { display: "flex", gap: 4, alignItems: "center" },
  pageNavBtn: { padding: "5px 12px", border: "1px solid #E5E7EB", background: "#FFFFFF", borderRadius: 6, fontSize: 12, color: "#374151", cursor: "pointer", fontFamily: "inherit" },
  pageBtn: { minWidth: 30, height: 30, border: "1px solid #E5E7EB", background: "#FFFFFF", borderRadius: 6, fontSize: 13, color: "#374151", cursor: "pointer", fontFamily: "inherit" },
  pageBtnActive: { background: "#2563EB", color: "#FFFFFF", borderColor: "#2563EB" },
  pageDots: { fontSize: 13, color: "#9CA3AF", padding: "0 4px" },
};

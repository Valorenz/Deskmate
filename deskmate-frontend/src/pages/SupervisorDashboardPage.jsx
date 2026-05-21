// src/pages/SupervisorDashboardPage.jsx
// -------------------------------------------------------
// Supervisor Dashboard DeskMate
// Sesuai desain screenshot: 4 stat cards, line chart ticket trends,
// donut chart SLA compliance, team performance table, quick actions
// -------------------------------------------------------

import { useState, useEffect, useRef } from "react";
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
  // segments: [{value, color, label}]
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

  useEffect(() => { loadData(); }, []);

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
    } finally {
      setLoading(false);
    }
  }

  const statusBadge = (status) => {
    const map = { Online: { bg: "#DCFCE7", color: "#15803D" }, Busy: { bg: "#FEF9C3", color: "#B45309" }, Offline: { bg: "#F3F4F6", color: "#6B7280" } };
    const st = map[status] || map.Offline;
    return <span style={{ ...s.statusBadge, background: st.bg, color: st.color }}>{status}</span>;
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
          <NavItem icon="🏠" label="Supervisor Dashboard" active />
          <NavItem icon="🤖" label="AI Chat Interface" onClick={() => navigate("/chat")} />
          <NavItem icon="☰" label="Employee Ticket List" onClick={() => navigate("/tickets")} />
          <NavItem icon="+" label="Create Ticket Form" onClick={() => navigate("/tickets/create")} />
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
        {/* Header */}
        <div style={s.header}>
          <h1 style={s.pageTitle}>Supervisor Dashboard</h1>
          <div style={s.headerRight}>
            <button style={s.bellBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button style={s.newReportBtn}>+ New Report</button>
          </div>
        </div>

        <div style={s.content}>
          {/* ── STAT CARDS ── */}
          <div style={s.statRow}>
            <StatCard
              label="ALL OPEN TICKETS"
              value={loading ? "—" : stats.total}
              trend="+12%"
              trendUp
              icon="📨"
              iconBg="#EFF6FF"
            />
            <StatCard
              label="OVERDUE / SLA BREACHES"
              value={loading ? "—" : stats.overdue}
              trend="+4%"
              trendUp
              trendBad
              icon="⚠"
              iconBg="#FEF2F2"
              iconColor="#DC2626"
            />
            <StatCard
              label="UNASSIGNED"
              value={loading ? "—" : stats.unassigned}
              trend="-8%"
              trendUp={false}
              icon="👤"
              iconBg="#F5F3FF"
              iconColor="#7C3AED"
            />
            <StatCard
              label="AVG RESPONSE TIME"
              value="1.4h"
              trend="-15m"
              trendUp={false}
              icon="⏱"
              iconBg="#F0FDF4"
              iconColor="#15803D"
            />
          </div>

          {/* ── CHARTS ROW ── */}
          <div style={s.chartsRow}>
            {/* Line Chart */}
            <div style={s.chartCard}>
              <div style={s.chartHeader}>
                <h2 style={s.chartTitle}>Ticket Volume Trends</h2>
                <div style={s.filterWrap}>
                  <select value={trendFilter} onChange={(e) => setTrendFilter(e.target.value)} style={s.filterSelect}>
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Last 90 Days</option>
                  </select>
                  <span style={s.filterArrow}>▾</span>
                </div>
              </div>

              {/* Y-axis labels */}
              <div style={s.lineChartWrap}>
                <div style={s.yAxis}>
                  {[60, 50, 40, 30, 20, 10].map((v) => (
                    <span key={v} style={s.yLabel}>{v}</span>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <LineChart data={trendData} color="#2563EB" height={180} />
                  {/* X-axis */}
                  <div style={s.xAxis}>
                    {trendLabels.map((l) => <span key={l} style={s.xLabel}>{l}</span>)}
                  </div>
                </div>
              </div>
            </div>

            {/* Donut Chart */}
            <div style={s.chartCard}>
              <div style={s.chartHeader}>
                <h2 style={s.chartTitle}>SLA Compliance</h2>
                <div style={s.filterWrap}>
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={s.filterSelect}>
                    <option>All Departments</option>
                    <option>IT & Network</option>
                    <option>HR</option>
                    <option>Facilities</option>
                  </select>
                  <span style={s.filterArrow}>▾</span>
                </div>
              </div>
              <div style={s.donutWrap}>
                <DonutChart segments={slaSegments} />
                <div style={s.donutLegend}>
                  {slaSegments.map((seg) => (
                    <div key={seg.label} style={s.legendItem}>
                      <span style={{ ...s.legendDot, background: seg.color }} />
                      <span style={s.legendLabel}>{seg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── BOTTOM ROW ── */}
          <div style={s.bottomRow}>
            {/* Team Performance */}
            <div style={s.teamCard}>
              <div style={s.teamHeader}>
                <h2 style={s.chartTitle}>Team Performance</h2>
                <button style={s.viewReportBtn} onClick={() => navigate("/tickets")}>View Full Report</button>
              </div>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    <th style={s.th}>AGENT</th>
                    <th style={s.th}>OPEN</th>
                    <th style={s.th}>RESOLVED (7D)</th>
                    <th style={s.th}>CSAT</th>
                    <th style={s.th}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.map((agent) => (
                    <tr key={agent.name} style={s.tr}>
                      <td style={s.td}>
                        <div style={s.agentCell}>
                          <div style={{ ...s.agentAvatar, background: agent.color }}>
                            {agent.name.charAt(0)}
                          </div>
                          <span style={s.agentName}>{agent.name}</span>
                        </div>
                      </td>
                      <td style={s.td}><span style={s.tdText}>{agent.open}</span></td>
                      <td style={s.td}><span style={s.tdText}>{agent.resolved}</span></td>
                      <td style={s.td}><span style={s.tdText}>{agent.csat}</span></td>
                      <td style={s.td}>{statusBadge(agent.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Actions */}
            <div style={s.quickCard}>
              <h2 style={s.chartTitle}>Quick Actions</h2>
              <div style={s.quickList}>
                <QuickAction icon="☰" label="View All Tickets" onClick={() => navigate("/tickets")} />
                <QuickAction icon="🔄" label="Reassign Tickets" onClick={() => navigate("/tickets")} />
                <QuickAction icon="📄" label="Internal Guidelines" onClick={() => navigate("/documents")} />
              </div>
            </div>
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

function StatCard({ label, value, trend, trendUp, trendBad, icon, iconBg, iconColor = "#2563EB" }) {
  const trendColor = trendBad ? (trendUp ? "#DC2626" : "#15803D") : (trendUp ? "#DC2626" : "#15803D");
  const trendArrow = trendUp ? "↑" : "↓";
  return (
    <div style={s.statCard}>
      <div style={s.statTop}>
        <div style={s.statLabel}>{label}</div>
        <div style={{ ...s.statIconWrap, background: iconBg }}>
          <span style={{ fontSize: 16, color: iconColor }}>{icon}</span>
        </div>
      </div>
      <div style={s.statValue}>{value}</div>
      <div style={{ ...s.statTrend, color: trendColor }}>
        {trendArrow} {trend}
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{ ...s.quickItem, background: hovered ? "#F9FAFB" : "#FFFFFF" }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.quickIcon}>{icon}</div>
      <span style={s.quickLabel}>{label}</span>
      <span style={s.quickArrow}>→</span>
    </button>
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
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 0" },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  bellBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" },
  newReportBtn: { background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  content: { padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 16 },

  // Stat cards
  statRow: { display: "flex", gap: 12 },
  statCard: { flex: 1, background: "#FFFFFF", borderRadius: 12, padding: "16px", border: "1px solid #E5E7EB" },
  statTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  statLabel: { fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.4, maxWidth: 100 },
  statIconWrap: { width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statValue: { fontSize: 32, fontWeight: 700, color: "#111827", lineHeight: 1.1, marginBottom: 4 },
  statTrend: { fontSize: 12, fontWeight: 600 },

  // Charts
  chartsRow: { display: "flex", gap: 16 },
  chartCard: { flex: 1, background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", padding: "16px 20px" },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 },
  filterWrap: { position: "relative" },
  filterSelect: { padding: "5px 24px 5px 10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12, color: "#374151", background: "#FFFFFF", appearance: "none", cursor: "pointer", fontFamily: "inherit" },
  filterArrow: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "#9CA3AF", pointerEvents: "none" },
  lineChartWrap: { display: "flex", gap: 8, alignItems: "stretch" },
  yAxis: { display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: 20, gap: 0 },
  yLabel: { fontSize: 10, color: "#9CA3AF", textAlign: "right", lineHeight: 1 },
  xAxis: { display: "flex", justifyContent: "space-between", paddingLeft: 4, marginTop: 2 },
  xLabel: { fontSize: 10, color: "#9CA3AF" },
  donutWrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "8px 0" },
  donutLegend: { display: "flex", flexDirection: "column", gap: 10 },
  legendItem: { display: "flex", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  legendLabel: { fontSize: 12, color: "#374151" },

  // Bottom row
  bottomRow: { display: "flex", gap: 16 },
  teamCard: { flex: 1, background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", padding: "16px 20px", overflow: "hidden" },
  teamHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  viewReportBtn: { background: "none", border: "none", fontSize: 12, color: "#2563EB", fontWeight: 500, cursor: "pointer", padding: 0 },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#F9FAFB" },
  th: { padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #F3F4F6" },
  tr: { borderBottom: "1px solid #F9FAFB" },
  td: { padding: "10px 10px", verticalAlign: "middle" },
  tdText: { fontSize: 13, color: "#374151" },
  agentCell: { display: "flex", alignItems: "center", gap: 8 },
  agentAvatar: { width: 28, height: 28, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  agentName: { fontSize: 13, fontWeight: 600, color: "#111827" },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },

  // Quick actions
  quickCard: { width: 220, background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", padding: "16px", flexShrink: 0 },
  quickList: { display: "flex", flexDirection: "column", gap: 6, marginTop: 12 },
  quickItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, cursor: "pointer", transition: "background 0.12s", width: "100%", textAlign: "left" },
  quickIcon: { width: 28, height: 28, background: "#F3F4F6", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 },
  quickLabel: { flex: 1, fontSize: 13, fontWeight: 500, color: "#374151" },
  quickArrow: { fontSize: 14, color: "#9CA3AF" },
};

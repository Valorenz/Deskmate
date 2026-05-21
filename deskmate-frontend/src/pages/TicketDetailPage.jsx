// src/pages/TicketDetailPage.jsx
// -------------------------------------------------------
// Ticket Detail DeskMate
// Sesuai desain screenshot: header tiket, SLA indicators,
// tab conversation/activity/attachments, comment list,
// right panel: add comment, ticket details, knowledge base
// -------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch, getFullName, getRole, getUserId } from "../utils/auth";

const STATUS_STYLE = {
  open:        { label: "Open",        bg: "#DBEAFE", color: "#1D4ED8" },
  in_progress: { label: "In Progress", bg: "#FEF9C3", color: "#B45309" },
  resolved:    { label: "Resolved",    bg: "#DCFCE7", color: "#15803D" },
  closed:      { label: "Closed",      bg: "#F3F4F6", color: "#6B7280" },
};

const PRIORITY_STYLE = {
  low:      { label: "Low Priority",      color: "#15803D", dot: "#22C55E" },
  medium:   { label: "Medium Priority",   color: "#B45309", dot: "#F59E0B" },
  high:     { label: "High Priority",     color: "#DC2626", dot: "#EF4444" },
  critical: { label: "Critical Priority", color: "#7C3AED", dot: "#8B5CF6" },
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

  useEffect(() => {
    loadProfile();
    loadTicket();
    if (justCreated) setTimeout(() => setShowSuccess(false), 4000);
  }, [id]);

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
        // Ambil komentar dari ticket
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

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  if (loading) return (
    <div style={{ ...s.root }}>
      <Sidebar profile={profile} role={role} navigate={navigate} />
      <main style={s.main}>
        <div style={s.loadingState}>
          <span style={s.spinner} /> Loading ticket...
        </div>
      </main>
    </div>
  );

  if (!ticket) return (
    <div style={s.root}>
      <Sidebar profile={profile} role={role} navigate={navigate} />
      <main style={s.main}>
        <div style={s.loadingState}>Ticket not found.</div>
      </main>
    </div>
  );

  const st = STATUS_STYLE[ticket.status] || STATUS_STYLE.open;
  const pr = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.medium;

  return (
    <div style={s.root}>
      <Sidebar profile={profile} role={role} navigate={navigate} activeItem="tickets" />

      <main style={s.main}>
        {/* Success toast */}
        {showSuccess && (
          <div style={s.toast}>
            ✅ Tiket berhasil dibuat! Tim kami akan segera menangani masalah Anda.
          </div>
        )}

        {/* Breadcrumb */}
        <div style={s.topbar}>
          <div style={s.breadcrumb}>
            <span style={s.breadLink} onClick={() => navigate("/tickets")}>Tickets</span>
            <span style={s.breadSep}>›</span>
            <span style={s.breadCurrent}>#{ticket.ticket_number}</span>
          </div>
          <button style={s.bellBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </div>

        <div style={s.content}>
          {/* ── TICKET HEADER CARD ── */}
          <div style={s.headerCard}>
            <div style={s.headerTop}>
              <div style={s.headerLeft}>
                <div style={s.badgeRow}>
                  <span style={s.ticketNumBadge}>#{ticket.ticket_number}</span>
                  <span style={{ ...s.statusBadge, background: st.bg, color: st.color }}>{st.label}</span>
                  <span style={s.priorityBadge}>
                    <span style={{ ...s.priorityDot, background: pr.dot }} />
                    {pr.label}
                  </span>
                </div>
                <h1 style={s.ticketTitle}>{ticket.title}</h1>
                <p style={s.ticketMeta}>
                  Reported by {ticket.creator?.full_name || "Unknown"} on {formatDate(ticket.created_at)}
                </p>
              </div>
              <div style={s.slaRow}>
                <div style={s.slaCard}>
                  <div style={s.slaLabel}>FIRST RESPONSE SLA</div>
                  <div style={s.slaValue}>
                    <span style={s.slaGreen}>● Met (15m)</span>
                  </div>
                </div>
                <div style={s.slaCard}>
                  <div style={s.slaLabel}>RESOLUTION SLA</div>
                  <div style={s.slaValue}>
                    <span style={s.slaOrange}>⏱ 4h 15m remaining</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div style={s.body}>
            {/* Left: Conversation */}
            <div style={s.leftCol}>
              {/* Tabs */}
              <div style={s.tabBar}>
                {["conversation", "activity_log", "attachments"].map((tab) => (
                  <button
                    key={tab}
                    style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "conversation" && "Conversation"}
                    {tab === "activity_log" && "Activity Log"}
                    {tab === "attachments" && `Attachments (${ticket.attachment_ids?.length || 0})`}
                  </button>
                ))}
              </div>

              {/* Conversation */}
              {activeTab === "conversation" && (
                <div style={s.conversationArea}>
                  {/* Original description */}
                  <CommentItem
                    name={ticket.creator?.full_name || "User"}
                    date={formatDate(ticket.created_at)}
                    content={ticket.description}
                    isInternal={false}
                    isFirst
                  />

                  {/* Comments */}
                  {comments.length === 0 ? (
                    <div style={s.noComments}>No replies yet. Be the first to respond.</div>
                  ) : (
                    comments.map((c) => (
                      <CommentItem
                        key={c.id}
                        name={c.author?.full_name || "User"}
                        date={formatDate(c.created_at)}
                        content={c.content}
                        isInternal={c.is_internal}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === "activity_log" && (
                <div style={s.conversationArea}>
                  <ActivityItem icon="🎫" text={`Ticket #${ticket.ticket_number} created`} date={formatDate(ticket.created_at)} />
                  {ticket.assignee && (
                    <ActivityItem icon="👤" text={`Assigned to ${ticket.assignee.full_name}`} date={formatDate(ticket.updated_at)} />
                  )}
                  {ticket.status !== "open" && (
                    <ActivityItem icon="🔄" text={`Status changed to ${ticket.status}`} date={formatDate(ticket.updated_at)} />
                  )}
                </div>
              )}

              {activeTab === "attachments" && (
                <div style={s.conversationArea}>
                  {!ticket.attachment_ids?.length ? (
                    <div style={s.noComments}>No attachments on this ticket.</div>
                  ) : (
                    <div style={{ padding: 16 }}>
                      {ticket.attachment_ids.map((id, i) => (
                        <div key={i} style={s.attachItem}>📎 Attachment {i + 1}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Actions + Details */}
            <div style={s.rightCol}>
              {/* Add Comment */}
              <button style={s.addCommentBtn} onClick={() => commentRef.current?.focus()}>
                💬 Add Comment
              </button>
              <div style={s.actionBtns}>
                <button style={s.attachBtn}>📎 Attach</button>
                <button style={s.escalateBtn} onClick={escalateTicket}>🚀 Escalate</button>
              </div>

              {/* Comment input */}
              <div style={s.commentBox}>
                <textarea
                  ref={commentRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  style={s.commentTextarea}
                  rows={3}
                />
                {(role === "supervisor" || role === "admin") && (
                  <label style={s.internalCheck}>
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      style={{ accentColor: "#F59E0B" }}
                    />
                    <span style={{ fontSize: 12, color: "#B45309" }}>Internal note</span>
                  </label>
                )}
                <button
                  style={{ ...s.submitCommentBtn, opacity: (!newComment.trim() || submitting) ? 0.5 : 1 }}
                  onClick={submitComment}
                  disabled={!newComment.trim() || submitting}
                >
                  {submitting ? "Sending..." : "Send"}
                </button>
              </div>

              {/* Divider */}
              <div style={s.divider} />

              {/* Ticket Details */}
              <div style={s.detailSection}>
                <div style={s.detailTitle}>Ticket Details</div>

                <div style={s.detailRow}>
                  <span style={s.detailKey}>Assignee</span>
                  <div style={s.selectWrap}>
                    <select style={s.detailSelect} defaultValue={ticket.assignee?.full_name || ""}>
                      <option value="">{ticket.assignee?.full_name || "Unassigned"}</option>
                    </select>
                    <span style={s.selectArrow}>▾</span>
                  </div>
                </div>

                <div style={s.detailRow}>
                  <span style={s.detailKey}>Category</span>
                  <div style={s.selectWrap}>
                    <select style={s.detailSelect} defaultValue={ticket.category || ""}>
                      <option>{ticket.category || "Uncategorized"}</option>
                    </select>
                    <span style={s.selectArrow}>▾</span>
                  </div>
                </div>

                <div style={s.detailRow}>
                  <span style={s.detailKey}>Priority</span>
                  <span style={{ ...s.priorityBadgeSmall, color: pr.color }}>
                    <span style={{ ...s.priorityDot, background: pr.dot }} />
                    {ticket.priority?.charAt(0).toUpperCase() + ticket.priority?.slice(1)}
                  </span>
                </div>

                <div style={s.detailRow}>
                  <span style={s.detailKey}>Status</span>
                  <span style={{ ...s.statusBadge, background: st.bg, color: st.color, fontSize: 11 }}>
                    {st.label}
                  </span>
                </div>
              </div>

              <div style={s.divider} />

              {/* Watchers */}
              <div style={s.detailSection}>
                <div style={s.watchersRow}>
                  <span style={s.detailTitle}>Watchers (2)</span>
                  <button style={s.addWatcherBtn}>+ Add</button>
                </div>
                <div style={s.watcherAvatars}>
                  <div style={{ ...s.watcherAvatar, background: "#2563EB" }}>D</div>
                  <div style={{ ...s.watcherAvatar, background: "#7C3AED" }}>S</div>
                </div>
              </div>

              <div style={s.divider} />

              {/* Related Knowledge Base */}
              <div style={s.detailSection}>
                <div style={s.detailTitle}>Related Knowledge Base</div>
                <div style={s.kbList}>
                  <div style={s.kbItem}>📄 How to request new hardware</div>
                  <div style={s.kbItem}>📄 Desk equipment standards</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Sub Components ──────────────────────────────────────

function Sidebar({ profile, role, navigate, activeItem }) {
  return (
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
        <NavItem icon="☰" label="Employee Ticket List" active onClick={() => navigate("/tickets")} />
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
  );
}

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

function CommentItem({ name, date, content, isInternal, isFirst }) {
  const initial = name?.charAt(0)?.toUpperCase() || "U";
  const avatarBg = isFirst ? "#2563EB" : isInternal ? "#F59E0B" : "#7C3AED";
  return (
    <div style={s.commentItem}>
      <div style={{ ...s.commentAvatar, background: avatarBg }}>{initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.commentHeader}>
          <span style={s.commentName}>{name}</span>
          <span style={s.commentDate}>{date}</span>
          {isInternal && <span style={s.internalBadge}>INTERNAL NOTE</span>}
        </div>
        <div style={{ ...s.commentBody, background: isInternal ? "#FFFBEB" : "#FFFFFF", border: isInternal ? "1px solid #FDE68A" : "1px solid #E5E7EB" }}>
          {content}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ icon, text, date }) {
  return (
    <div style={s.activityItem}>
      <span style={s.activityIcon}>{icon}</span>
      <span style={s.activityText}>{text}</span>
      <span style={s.activityDate}>{date}</span>
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
  loadingState: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, height: "100%", color: "#6B7280", fontSize: 14 },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid #E5E7EB", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.6s linear infinite" },
  toast: { position: "fixed", top: 16, right: 16, background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#15803D", fontWeight: 500, zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", background: "#FFFFFF", borderBottom: "1px solid #E5E7EB" },
  breadcrumb: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  breadLink: { color: "#6B7280", cursor: "pointer" },
  breadSep: { color: "#D1D5DB" },
  breadCurrent: { color: "#111827", fontWeight: 500 },
  bellBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" },
  content: { padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 16 },
  headerCard: { background: "#FFFFFF", borderRadius: 12, padding: "20px 24px", border: "1px solid #E5E7EB" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  headerLeft: { flex: 1, minWidth: 0 },
  badgeRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  ticketNumBadge: { fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#6B7280", background: "#F3F4F6", padding: "2px 8px", borderRadius: 4 },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 },
  priorityBadge: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#DC2626" },
  priorityBadgeSmall: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600 },
  priorityDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  ticketTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 6px" },
  ticketMeta: { fontSize: 12, color: "#6B7280", margin: 0 },
  slaRow: { display: "flex", gap: 16, flexShrink: 0 },
  slaCard: { textAlign: "right" },
  slaLabel: { fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em", marginBottom: 4 },
  slaValue: { fontSize: 13, fontWeight: 600 },
  slaGreen: { color: "#15803D" },
  slaOrange: { color: "#D97706" },
  body: { display: "flex", gap: 16, flex: 1 },
  leftCol: { flex: 1, background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 },
  tabBar: { display: "flex", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" },
  tab: { padding: "10px 18px", border: "none", background: "transparent", fontSize: 13, color: "#6B7280", cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: -1, fontFamily: "inherit" },
  tabActive: { color: "#2563EB", borderBottomColor: "#2563EB", fontWeight: 600, background: "#FFFFFF" },
  conversationArea: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 },
  noComments: { textAlign: "center", color: "#9CA3AF", fontSize: 13, padding: "20px 0" },
  commentItem: { display: "flex", gap: 10, alignItems: "flex-start" },
  commentAvatar: { width: 32, height: 32, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 2 },
  commentHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  commentName: { fontSize: 13, fontWeight: 700, color: "#111827" },
  commentDate: { fontSize: 11, color: "#9CA3AF" },
  internalBadge: { fontSize: 10, fontWeight: 700, color: "#B45309", background: "#FEF9C3", border: "1px solid #FDE68A", padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" },
  commentBody: { padding: "12px 14px", borderRadius: 8, fontSize: 13, color: "#374151", lineHeight: 1.6 },
  activityItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #F3F4F6", fontSize: 13 },
  activityIcon: { fontSize: 16, flexShrink: 0 },
  activityText: { flex: 1, color: "#374151" },
  activityDate: { fontSize: 11, color: "#9CA3AF", flexShrink: 0 },
  attachItem: { padding: "10px 12px", background: "#F9FAFB", borderRadius: 8, fontSize: 13, color: "#374151", marginBottom: 8 },
  rightCol: { width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 },
  addCommentBtn: { background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" },
  actionBtns: { display: "flex", gap: 8 },
  attachBtn: { flex: 1, background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px", fontSize: 12, color: "#374151", cursor: "pointer" },
  escalateBtn: { flex: 1, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px", fontSize: 12, color: "#DC2626", cursor: "pointer" },
  commentBox: { background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 8 },
  commentTextarea: { border: "none", outline: "none", resize: "none", fontSize: 12, color: "#374151", fontFamily: "inherit", lineHeight: 1.5, width: "100%" },
  internalCheck: { display: "flex", alignItems: "center", gap: 6, cursor: "pointer" },
  submitCommentBtn: { background: "#2563EB", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "flex-end" },
  divider: { height: 1, background: "#F3F4F6" },
  detailSection: { background: "#FFFFFF", borderRadius: 10, border: "1px solid #E5E7EB", padding: "14px" },
  detailTitle: { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 12 },
  detailRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  detailKey: { fontSize: 12, color: "#6B7280" },
  selectWrap: { position: "relative" },
  detailSelect: { padding: "4px 24px 4px 8px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 12, color: "#374151", background: "#FFFFFF", appearance: "none", cursor: "pointer", fontFamily: "inherit", maxWidth: 110 },
  selectArrow: { position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "#9CA3AF", pointerEvents: "none" },
  watchersRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  addWatcherBtn: { background: "none", border: "none", fontSize: 12, color: "#2563EB", cursor: "pointer", fontWeight: 500, padding: 0 },
  watcherAvatars: { display: "flex", gap: 4 },
  watcherAvatar: { width: 26, height: 26, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 },
  kbList: { display: "flex", flexDirection: "column", gap: 6 },
  kbItem: { fontSize: 12, color: "#2563EB", cursor: "pointer", lineHeight: 1.4 },
};

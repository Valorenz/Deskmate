// src/pages/ChatPage.jsx
// -------------------------------------------------------
// AI Chat Interface DeskMate
// Sesuai desain screenshot: sidebar kiri, tab sesi, area chat,
// input bar, context & actions panel kanan
// -------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole, logout } from "../utils/auth";

const PROMPTS = [
  "I need help resetting my password",
  "My VPN keeps disconnecting",
  "How do I request new software?",
  "Show me HR remote work policy",
];

export default function ChatPage() {
  const navigate = useNavigate();
  const role = getRole();
  const messagesEndRef = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  useEffect(() => { loadInitial(); }, []);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  async function loadInitial() {
    // Profil
    const pr = await apiFetch("/api/v1/profiles/me");
    if (pr?.ok) setProfile(await pr.json());

    // Sesi chat
    const sr = await apiFetch("/api/v1/chat/sessions");
    if (sr?.ok) {
      const data = await sr.json();
      setSessions(data);
    }

    // Tiket aktif
    const tr = await apiFetch("/api/v1/tickets/?status=open&size=5");
    if (tr?.ok) {
      const data = await tr.json();
      setTickets(data.items || []);
    }
  }

  async function createSession(title = null) {
    const res = await apiFetch("/api/v1/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    if (res?.ok) {
      const session = await res.json();
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      setMessages([]);
      return session;
    }
    return null;
  }

  async function switchSession(session) {
    setActiveSession(session);
    setLoadingMsgs(true);
    const res = await apiFetch(`/api/v1/chat/sessions/${session.id}/messages`);
    if (res?.ok) setMessages(await res.json());
    setLoadingMsgs(false);
  }

  async function closeSession(sessionId, e) {
    e.stopPropagation();
    const res = await apiFetch(`/api/v1/chat/sessions/${sessionId}`, { method: "DELETE" });
    if (res?.ok || res?.status === 204) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    }
  }

  async function sendMessage(content) {
    if (!content.trim() || sending) return;

    let session = activeSession;
    if (!session) {
      session = await createSession();
      if (!session) return;
    }

    setInput("");
    setSending(true);

    // Tambah pesan user langsung ke UI
    const tempUserMsg = {
      id: "temp-user-" + Date.now(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Tambah loading indicator AI
    const tempAiId = "temp-ai-" + Date.now();
    setMessages((prev) => [...prev, { id: tempAiId, role: "assistant", content: "...", loading: true, created_at: new Date().toISOString() }]);

    try {
      const form = new FormData();
      form.append("content", content);
      form.append("attachment_ids", "[]");

      const res = await apiFetch(
        `/api/v1/chat/sessions/${session.id}/messages`,
        { method: "POST", body: form }
      );

      if (res?.ok) {
        const data = await res.json();
        // Ganti pesan temp dengan data real
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== tempAiId && m.id !== tempUserMsg.id)
            .concat([data.user_message, data.ai_message])
        );
        // Update judul sesi jika baru
        setSessions((prev) =>
          prev.map((s) =>
            s.id === session.id ? { ...s, title: data.user_message?.content?.slice(0, 30) || s.title } : s
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAiId
              ? { ...m, content: "Maaf, terjadi kesalahan. Coba lagi.", loading: false }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAiId
            ? { ...m, content: "Tidak dapat terhubung ke server.", loading: false }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }

  async function createTicketFromChat() {
    if (!activeSession || messages.length === 0) {
      navigate("/tickets/create");
      return;
    }
    navigate(`/tickets/create?session_id=${activeSession.id}`);
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
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
          <NavItem icon="🤖" label="AI Chat Interface" active />
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
        <div style={s.sidebarFooter} onClick={() => navigate("/profile")}>
          <div style={s.avatarSmall}>{profile?.full_name?.charAt(0)?.toUpperCase() || "U"}</div>
          <div>
            <div style={s.footerName}>{profile?.full_name || getFullName() || "User"}</div>
            <div style={s.footerSub}>Profile & Settings</div>
          </div>
        </div>
      </aside>

      {/* ── CENTER ── */}
      <div style={s.center}>
        {/* Header */}
        <div style={s.header}>
          <h1 style={s.pageTitle}>AI Helpdesk Assistant</h1>
          <button style={s.bellBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </div>

        {/* Session tabs */}
        <div style={s.tabBar}>
          {sessions.slice(0, 4).map((session) => (
            <button
              key={session.id}
              style={{ ...s.tab, ...(activeSession?.id === session.id ? s.tabActive : {}) }}
              onClick={() => switchSession(session)}
            >
              <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session.title || "New Chat"}
              </span>
              <span style={s.tabClose} onClick={(e) => closeSession(session.id, e)}>×</span>
            </button>
          ))}
          <button style={s.newChatBtn} onClick={() => createSession()}>
            + New Chat
          </button>
        </div>

        {/* Chat area */}
        <div style={s.chatArea}>
          {!activeSession ? (
            /* Empty state */
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>🤖</div>
              <h2 style={s.emptyTitle}>How can I help you today?</h2>
              <p style={s.emptySubtitle}>
                Ask me about IT issues, HR policies, or request a new service ticket.
              </p>
              <div style={s.promptsLabel}>Try these prompts:</div>
              <div style={s.prompts}>
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    style={s.promptBtn}
                    onClick={() => { createSession(p.slice(0, 30)).then(() => sendMessage(p)); }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : loadingMsgs ? (
            <div style={s.emptyState}>
              <div style={s.loadingDots}>
                <span style={s.dot} />
                <span style={{ ...s.dot, animationDelay: "0.2s" }} />
                <span style={{ ...s.dot, animationDelay: "0.4s" }} />
              </div>
            </div>
          ) : (
            /* Messages */
            <div style={s.messages}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={s.inputBar}>
          <button style={s.attachBtn} title="Lampirkan gambar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            onKeyDown={handleKeyDown}
            placeholder="Describe your issue or ask a question..."
            style={s.textarea}
            rows={1}
            disabled={sending}
          />
          <button
            style={{ ...s.sendBtn, opacity: (!input.trim() || sending) ? 0.5 : 1 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div style={s.inputFooter}>
          <span style={s.disclaimer}>AI can make mistakes. Verify important information.</span>
          <button style={s.clearBtn} onClick={() => { setMessages([]); setActiveSession(null); }}>
            🗑 Clear Chat
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <aside style={s.rightPanel}>
        <h3 style={s.panelTitle}>Context & Actions</h3>

        {/* Create Ticket */}
        <button style={s.createTicketBtn} onClick={createTicketFromChat}>
          <span style={{ marginRight: 8 }}>🎫</span>
          Create Ticket from Chat
        </button>
        <p style={s.createTicketSub}>
          Automatically summarizes this conversation into a new support ticket.
        </p>

        {/* Suggested Knowledge */}
        <div style={s.panelSection}>SUGGESTED KNOWLEDGE</div>
        <div style={s.knowledgeList}>
          <KnowledgeItem icon="📄" title="Password Reset Guidelines" meta="IT Security • Updated 2w ago" />
          <KnowledgeItem icon="🌐" title="VPN Troubleshooting Steps" meta="Network Ops • Updated 1m ago" />
        </div>

        {/* Active Tickets */}
        <div style={s.panelSection}>YOUR ACTIVE TICKETS</div>
        {tickets.length === 0 ? (
          <div style={s.noTickets}>Tidak ada tiket aktif</div>
        ) : (
          tickets.map((t) => (
            <div
              key={t.id}
              style={s.ticketCard}
              onClick={() => navigate(`/tickets/${t.id}`)}
            >
              <div style={s.ticketNum}>{t.ticket_number}</div>
              <div style={s.ticketMeta}>
                <span style={s.ticketTitle}>{t.title?.slice(0, 30)}</span>
                <span style={s.ticketOpen}>Open</span>
              </div>
            </div>
          ))
        )}
      </aside>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

// ── Sub Components ──────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  if (msg.loading) {
    return (
      <div style={{ ...s.msgRow, justifyContent: "flex-start" }}>
        <div style={s.aiBubble}>
          <span style={s.loadingDot1}>●</span>
          <span style={s.loadingDot2}>●</span>
          <span style={s.loadingDot3}>●</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...s.msgRow, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && <div style={s.aiAvatar}>🤖</div>}
      <div style={isUser ? s.userBubble : s.aiBubble}>
        <div style={s.msgContent}>{msg.content}</div>
        {msg.source_documents?.length > 0 && (
          <div style={s.sources}>
            📎 Sumber: {msg.source_documents.map((d) => d.title).join(", ")}
          </div>
        )}
      </div>
    </div>
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

function KnowledgeItem({ icon, title, meta }) {
  return (
    <div style={s.knowledgeItem}>
      <div style={s.knowledgeIcon}>{icon}</div>
      <div>
        <div style={s.knowledgeTitle}>{title}</div>
        <div style={s.knowledgeMeta}>{meta}</div>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────
const s = {
  root: { display: "flex", height: "100vh", background: "#F3F4F6", fontFamily: "'DM Sans','Segoe UI',sans-serif", overflow: "hidden" },

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
  footerName: { fontSize: 13, fontWeight: 600, color: "#111827" },
  footerSub: { fontSize: 11, color: "#9CA3AF" },

  // Center
  center: { flex: 1, display: "flex", flexDirection: "column", background: "#FFFFFF", overflow: "hidden", borderRight: "1px solid #E5E7EB" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #F3F4F6" },
  pageTitle: { fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 },
  bellBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center" },

  // Tabs
  tabBar: { display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderBottom: "1px solid #F3F4F6", overflowX: "auto" },
  tab: { display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: 12, color: "#374151", cursor: "pointer", whiteSpace: "nowrap", maxWidth: 160 },
  tabActive: { background: "#EFF6FF", borderColor: "#BFDBFE", color: "#2563EB" },
  tabClose: { fontSize: 14, color: "#9CA3AF", lineHeight: 1, marginLeft: 2 },
  newChatBtn: { padding: "4px 12px", borderRadius: 20, border: "1px dashed #D1D5DB", background: "transparent", fontSize: 12, color: "#6B7280", cursor: "pointer", whiteSpace: "nowrap" },

  // Chat
  chatArea: { flex: 1, overflow: "auto", padding: "16px 20px" },
  emptyState: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 },
  emptySubtitle: { fontSize: 13, color: "#6B7280", margin: "4px 0 16px", textAlign: "center" },
  promptsLabel: { fontSize: 12, color: "#9CA3AF", marginBottom: 10 },
  prompts: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 500 },
  promptBtn: { padding: "7px 14px", borderRadius: 20, border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: 12, color: "#374151", cursor: "pointer" },
  messages: { display: "flex", flexDirection: "column", gap: 12 },
  msgRow: { display: "flex", gap: 8, alignItems: "flex-end" },
  aiAvatar: { width: 28, height: 28, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 },
  userBubble: { background: "#2563EB", color: "#fff", padding: "10px 14px", borderRadius: "16px 16px 4px 16px", maxWidth: "70%", fontSize: 13, lineHeight: 1.5 },
  aiBubble: { background: "#F3F4F6", color: "#111827", padding: "10px 14px", borderRadius: "16px 16px 16px 4px", maxWidth: "75%", fontSize: 13, lineHeight: 1.5 },
  msgContent: { whiteSpace: "pre-wrap" },
  sources: { fontSize: 11, color: "#6B7280", marginTop: 6, paddingTop: 6, borderTop: "1px solid #E5E7EB" },
  loadingDot1: { animation: "bounce 1.2s infinite", animationDelay: "0s", color: "#9CA3AF", marginRight: 2 },
  loadingDot2: { animation: "bounce 1.2s infinite", animationDelay: "0.2s", color: "#9CA3AF", marginRight: 2 },
  loadingDot3: { animation: "bounce 1.2s infinite", animationDelay: "0.4s", color: "#9CA3AF" },
  loadingDots: { display: "flex", gap: 4, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#9CA3AF", display: "inline-block", animation: "bounce 1.2s infinite" },

  // Input
  inputBar: { display: "flex", alignItems: "flex-end", gap: 8, padding: "12px 16px", borderTop: "1px solid #F3F4F6" },
  attachBtn: { background: "none", border: "none", cursor: "pointer", padding: "8px", borderRadius: 8, display: "flex", alignItems: "center", flexShrink: 0 },
  textarea: { flex: 1, border: "1px solid #E5E7EB", borderRadius: 10, padding: "9px 13px", fontSize: 13, color: "#111827", outline: "none", resize: "none", fontFamily: "inherit", maxHeight: 120, overflowY: "auto", lineHeight: 1.5 },
  sendBtn: { width: 36, height: 36, borderRadius: 8, background: "#2563EB", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  inputFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px" },
  disclaimer: { fontSize: 11, color: "#9CA3AF" },
  clearBtn: { background: "none", border: "none", fontSize: 11, color: "#9CA3AF", cursor: "pointer", padding: 0 },

  // Right panel
  rightPanel: { width: 220, background: "#FFFFFF", borderLeft: "1px solid #E5E7EB", padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flexShrink: 0 },
  panelTitle: { fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 4px" },
  createTicketBtn: { display: "flex", alignItems: "center", justifyContent: "center", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" },
  createTicketSub: { fontSize: 11, color: "#6B7280", margin: "0 0 4px", lineHeight: 1.4 },
  panelSection: { fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 },
  knowledgeList: { display: "flex", flexDirection: "column", gap: 8 },
  knowledgeItem: { display: "flex", gap: 8, alignItems: "flex-start", padding: "8px", background: "#F9FAFB", borderRadius: 8, cursor: "pointer" },
  knowledgeIcon: { fontSize: 16, flexShrink: 0 },
  knowledgeTitle: { fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 2 },
  knowledgeMeta: { fontSize: 11, color: "#9CA3AF" },
  ticketCard: { background: "#F9FAFB", borderRadius: 8, padding: "10px", cursor: "pointer", marginBottom: 4 },
  ticketNum: { fontSize: 11, fontWeight: 700, color: "#2563EB", marginBottom: 4 },
  ticketMeta: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  ticketTitle: { fontSize: 12, color: "#374151", flex: 1, marginRight: 4 },
  ticketOpen: { fontSize: 10, fontWeight: 600, color: "#15803D", background: "#DCFCE7", padding: "1px 6px", borderRadius: 4 },
  noTickets: { fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "12px 0" },
};

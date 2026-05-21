// src/pages/CreateTicketPage.jsx
// -------------------------------------------------------
// Create New Ticket Form DeskMate
// Sesuai desain screenshot: AI summary banner, form lengkap,
// rich text description, attachment upload
// -------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, getFullName, getRole, logout } from "../utils/auth";

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

  useEffect(() => {
    loadProfile();
    if (sessionId) loadAiSummary();
  }, [sessionId]);

  async function loadProfile() {
    const res = await apiFetch("/api/v1/profiles/me");
    if (res?.ok) setProfile(await res.json());
  }

  async function loadAiSummary() {
    // Ambil pesan dari sesi untuk buat summary
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

  // Simple rich text toolbar actions
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
          <NavItem icon="☰" label="Employee Ticket List" onClick={() => navigate("/tickets")} />
          <NavItem icon="+" label="Create Ticket Form" active />
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
        {/* Header */}
        <div style={s.header}>
          <h1 style={s.pageTitle}>Create New Ticket</h1>
          <button style={s.bellBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </div>

        <div style={s.formWrap}>
          <form onSubmit={handleSubmit}>
            {/* Card */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Ticket Details</h2>
                <p style={s.cardSub}>Please provide as much detail as possible to help us resolve your issue quickly.</p>
              </div>

              {/* AI Summary Banner */}
              {showAiSummary && (
                <div style={s.aiBanner}>
                  <div style={s.aiBannerTop}>
                    <span style={s.aiLabel}>🤖 AI SUMMARY FROM CHAT</span>
                    <button type="button" style={s.aiBannerClose} onClick={() => setShowAiSummary(false)}>×</button>
                  </div>
                  <p style={s.aiBannerText}>{aiSummary}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={s.errorBox}>⚠ {error}</div>
              )}

              {/* Subject */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Subject <span style={s.required}>*</span></label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  placeholder="Brief description of your issue"
                  style={s.input}
                  required
                  onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                />
              </div>

              {/* Category & Priority */}
              <div style={s.row2}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Category / Department <span style={s.required}>*</span></label>
                  <div style={s.selectWrap}>
                    <select
                      value={form.category}
                      onChange={(e) => handleChange("category", e.target.value)}
                      style={s.select}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span style={s.selectArrow}>▾</span>
                  </div>
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Priority</label>
                  <div style={s.selectWrap}>
                    <select
                      value={form.priority}
                      onChange={(e) => handleChange("priority", e.target.value)}
                      style={s.select}
                    >
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <span style={s.selectArrow}>▾</span>
                  </div>
                </div>
              </div>

              {/* Related System */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Related System / Service</label>
                <div style={s.selectWrap}>
                  <select
                    value={form.system}
                    onChange={(e) => handleChange("system", e.target.value)}
                    style={s.select}
                  >
                    <option value="">Select a system...</option>
                    {SYSTEMS.map((sys) => <option key={sys} value={sys}>{sys}</option>)}
                  </select>
                  <span style={s.selectArrow}>▾</span>
                </div>
              </div>

              {/* Description */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Description <span style={s.required}>*</span></label>
                {/* Toolbar */}
                <div style={s.toolbar}>
                  {[
                    { tag: "b",  icon: "B",  bold: true },
                    { tag: "i",  icon: "I",  italic: true },
                    { tag: "u",  icon: "U",  underline: true },
                    { tag: "ul", icon: "≡" },
                    { tag: "ol", icon: "1≡" },
                    { tag: "link", icon: "🔗" },
                  ].map((btn) => (
                    <button
                      key={btn.tag}
                      type="button"
                      style={s.toolbarBtn}
                      onClick={() => applyFormat(btn.tag)}
                      title={btn.tag}
                    >
                      <span style={{
                        fontWeight: btn.bold ? 700 : 400,
                        fontStyle: btn.italic ? "italic" : "normal",
                        textDecoration: btn.underline ? "underline" : "none",
                      }}>
                        {btn.icon}
                      </span>
                    </button>
                  ))}
                </div>
                <textarea
                  id="desc-textarea"
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Describe your issue in detail. Include steps to reproduce, error messages, and any relevant context..."
                  style={s.textarea}
                  rows={7}
                  required
                  onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                />
              </div>

              {/* Attachments */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Attachments</label>
                <div
                  style={s.dropzone}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#2563EB"; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = "#D1D5DB"; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = "#D1D5DB";
                    const files = Array.from(e.dataTransfer.files);
                    setAttachments((prev) => [...prev, ...files]);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  <div style={s.dropzoneIcon}>☁</div>
                  <p style={s.dropzoneText}>
                    <span style={s.dropzoneLink}>Click to upload</span> or drag and drop
                  </p>
                  <p style={s.dropzoneSub}>PNG, JPG, PDF up to 5MB</p>
                </div>

                {attachments.length > 0 && (
                  <div style={s.attachList}>
                    {attachments.map((file, i) => (
                      <div key={i} style={s.attachItem}>
                        <span style={s.attachName}>📎 {file.name}</span>
                        <button type="button" style={s.attachRemove} onClick={() => removeAttachment(i)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit buttons */}
              <div style={s.btnRow}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

// ── Sub Component ──────────────────────────────────────
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
  footerName: { fontSize: 13, fontWeight: 600, color: "#111827" },
  footerSub: { fontSize: 11, color: "#9CA3AF" },

  // Main
  main: { flex: 1, display: "flex", flexDirection: "column" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 0" },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 },
  bellBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" },

  // Form
  formWrap: { padding: "16px 24px 32px", maxWidth: 760 },
  card: { background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" },
  cardHeader: { padding: "20px 24px 16px", borderBottom: "1px solid #F3F4F6" },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 4px" },
  cardSub: { fontSize: 13, color: "#6B7280", margin: 0 },

  // AI Banner
  aiBanner: { margin: "16px 24px 0", background: "#F0F7FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 14px" },
  aiBannerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  aiLabel: { fontSize: 10, fontWeight: 700, color: "#2563EB", letterSpacing: "0.05em" },
  aiBannerClose: { background: "none", border: "none", fontSize: 16, color: "#9CA3AF", cursor: "pointer", padding: 0, lineHeight: 1 },
  aiBannerText: { fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.5 },

  // Error
  errorBox: { margin: "12px 24px 0", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626" },

  // Fields
  fieldGroup: { padding: "16px 24px 0", display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  required: { color: "#EF4444" },
  input: { padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", outline: "none", transition: "border-color 0.15s" },
  row2: { display: "flex", gap: 16, padding: "16px 24px 0" },
  selectWrap: { position: "relative" },
  select: { width: "100%", padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", outline: "none", appearance: "none", background: "#FFFFFF", cursor: "pointer" },
  selectArrow: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9CA3AF", pointerEvents: "none" },

  // Toolbar
  toolbar: { display: "flex", gap: 2, padding: "6px 8px", background: "#F9FAFB", border: "1px solid #D1D5DB", borderRadius: "8px 8px 0 0", borderBottom: "none" },
  toolbarBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 4, fontSize: 13, color: "#374151" },
  textarea: { padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: "0 0 8px 8px", fontSize: 13, color: "#111827", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, transition: "border-color 0.15s" },

  // Dropzone
  dropzone: { border: "1.5px dashed #D1D5DB", borderRadius: 8, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", transition: "border-color 0.15s", background: "#FAFAFA" },
  dropzoneIcon: { fontSize: 28, color: "#9CA3AF", marginBottom: 8 },
  dropzoneText: { fontSize: 13, color: "#374151", margin: "0 0 4px", textAlign: "center" },
  dropzoneLink: { color: "#2563EB", fontWeight: 600 },
  dropzoneSub: { fontSize: 12, color: "#9CA3AF", margin: 0 },
  attachList: { marginTop: 10, display: "flex", flexDirection: "column", gap: 6 },
  attachItem: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F3F4F6", borderRadius: 6, padding: "6px 10px" },
  attachName: { fontSize: 12, color: "#374151" },
  attachRemove: { background: "none", border: "none", fontSize: 16, color: "#9CA3AF", cursor: "pointer", padding: 0 },

  // Buttons
  btnRow: { display: "flex", gap: 10, justifyContent: "flex-end", padding: "20px 24px" },
  cancelBtn: { padding: "9px 20px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#FFFFFF", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer" },
  submitBtn: { padding: "9px 24px", borderRadius: 8, border: "none", background: "#2563EB", fontSize: 13, fontWeight: 600, color: "#FFFFFF", cursor: "pointer" },
};

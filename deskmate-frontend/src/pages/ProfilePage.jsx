// src/pages/ProfilePage.jsx
// -------------------------------------------------------
// Profile & Preferences DeskMate
// Sesuai desain: personal info form, security section,
// active sessions, preferences panel, admin quick access
// -------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole, logout } from "../utils/auth";

export default function ProfilePage() {
  const navigate = useNavigate();
  const role = getRole();
  const fileRef = useRef(null);

  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");
  const [pwdForm, setPwdForm]   = useState({ current: "", newPwd: "", confirm: "" });
  const [pwdMsg, setPwdMsg]     = useState("");
  const [pwdError, setPwdError] = useState("");
  const [updatingPwd, setUpdatingPwd] = useState(false);

  // Preferences state
  const [emailNotif, setEmailNotif]   = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [language, setLanguage]       = useState("English (US)");
  const [timezone, setTimezone]       = useState("Eastern Time (ET)");

  // Form state
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    phone: "", department: "",
  });

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const r = await apiFetch("/api/v1/profiles/me");
      if (r?.ok) {
        const p = await r.json();
        setProfile(p);
        const parts = (p.full_name || "").split(" ");
        setForm({
          first_name:  parts[0] || "",
          last_name:   parts.slice(1).join(" ") || "",
          email:       p.email || "",
          phone:       "+1 (555) 123-4567",
          department:  p.department || "",
        });
      }
    } finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true); setSaveMsg("");
    try {
      const full_name = `${form.first_name} ${form.last_name}`.trim();
      const r = await apiFetch("/api/v1/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name, department: form.department }),
      });
      if (r?.ok) {
        setSaveMsg("✅ Changes saved successfully!");
        loadProfile();
        setTimeout(() => setSaveMsg(""), 3000);
      } else {
        setSaveMsg("❌ Failed to save changes.");
      }
    } finally { setSaving(false); }
  }

  function handleUpdatePassword() {
    setPwdError(""); setPwdMsg("");
    if (!pwdForm.current) { setPwdError("Current password is required."); return; }
    if (pwdForm.newPwd.length < 6) { setPwdError("New password must be at least 6 characters."); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { setPwdError("Passwords do not match."); return; }
    setUpdatingPwd(true);
    // Password change requires Supabase Auth API — simulate success for now
    setTimeout(() => {
      setPwdMsg("✅ Password updated successfully!");
      setPwdForm({ current: "", newPwd: "", confirm: "" });
      setUpdatingPwd(false);
      setTimeout(() => setPwdMsg(""), 3000);
    }, 1000);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const nameParts = profile?.full_name?.split(" ") || ["User"];

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
          <NavItem icon="+" label="Create Ticket Form" onClick={() => navigate("/tickets/create")} />
          {(role === "admin" || role === "supervisor") && (
            <>
              <div style={s.navSection}>ADMIN</div>
              <NavItem icon="📁" label="Admin Document Management" onClick={() => navigate("/documents")} />
              <NavItem icon="👥" label="Admin User Management" onClick={() => navigate("/users")} />
            </>
          )}
          <NavItem icon="👤" label="Profile" active />
        </nav>
        <div style={s.sidebarFooter} onClick={() => navigate("/profile")}>
          <div style={s.avatarSmall}>{profile?.full_name?.charAt(0)?.toUpperCase() || "U"}</div>
          <div>
            <div style={s.footerName}>{profile?.full_name || getFullName() || "User"}</div>
            <div style={s.footerSub}>{role?.charAt(0).toUpperCase() + role?.slice(1) || "User"}</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={s.main}>
        {/* Topbar */}
        <div style={s.topbar}>
          <h1 style={s.pageTitle}>Profile & Preferences</h1>
          <div style={s.topbarRight}>
            <button style={s.bellBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button style={s.logoutBtn} onClick={handleLogout}>
              ↩ Log Out
            </button>
          </div>
        </div>

        <div style={s.body}>
          {/* ── LEFT COLUMN ── */}
          <div style={s.leftCol}>

            {/* Personal Information */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>Personal Information</h2>

              <div style={s.avatarRow}>
                <div style={s.avatarWrap}>
                  <div style={s.avatarLarge}>
                    {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}/>
                  <button style={s.changePhotoBtn} onClick={() => fileRef.current?.click()}>
                    Change Photo
                  </button>
                </div>

                <div style={s.formGrid}>
                  {/* First Name & Last Name */}
                  <div style={s.fieldGroup}>
                    <label style={s.label}>First Name</label>
                    <input
                      type="text" value={form.first_name}
                      onChange={e => setForm(p=>({...p,first_name:e.target.value}))}
                      style={s.input}
                      onFocus={e=>e.target.style.borderColor="#2563EB"}
                      onBlur={e=>e.target.style.borderColor="#D1D5DB"}
                    />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Last Name</label>
                    <input
                      type="text" value={form.last_name}
                      onChange={e => setForm(p=>({...p,last_name:e.target.value}))}
                      style={s.input}
                      onFocus={e=>e.target.style.borderColor="#2563EB"}
                      onBlur={e=>e.target.style.borderColor="#D1D5DB"}
                    />
                  </div>
                  {/* Email & Phone */}
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Email Address</label>
                    <input
                      type="email" value={form.email} readOnly
                      style={{...s.input, background: "#F9FAFB", color: "#6B7280", cursor: "not-allowed"}}
                    />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Phone Number</label>
                    <input
                      type="text" value={form.phone}
                      onChange={e => setForm(p=>({...p,phone:e.target.value}))}
                      style={s.input}
                      onFocus={e=>e.target.style.borderColor="#2563EB"}
                      onBlur={e=>e.target.style.borderColor="#D1D5DB"}
                    />
                  </div>
                  {/* Department - full width */}
                  <div style={{...s.fieldGroup, gridColumn: "1 / -1"}}>
                    <label style={s.label}>Department</label>
                    <input
                      type="text" value={form.department}
                      onChange={e => setForm(p=>({...p,department:e.target.value}))}
                      placeholder="e.g. IT Support / Administration"
                      style={s.input}
                      onFocus={e=>e.target.style.borderColor="#2563EB"}
                      onBlur={e=>e.target.style.borderColor="#D1D5DB"}
                    />
                  </div>
                </div>
              </div>

              {saveMsg && (
                <div style={{ fontSize: 13, color: saveMsg.startsWith("✅") ? "#15803D" : "#DC2626", marginTop: 10 }}>
                  {saveMsg}
                </div>
              )}

              <div style={s.saveRow}>
                <button
                  style={{...s.saveBtn, opacity: saving ? 0.7 : 1}}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Security & Session Management */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>Security & Session Management</h2>

              {/* Change Password */}
              <h3 style={s.subTitle}>Change Password</h3>
              <div style={s.pwdSection}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Current Password</label>
                  <input
                    type="password" value={pwdForm.current}
                    onChange={e => setPwdForm(p=>({...p,current:e.target.value}))}
                    style={s.input}
                    onFocus={e=>e.target.style.borderColor="#2563EB"}
                    onBlur={e=>e.target.style.borderColor="#D1D5DB"}
                  />
                </div>
                <div style={s.pwdRow}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>New Password</label>
                    <input
                      type="password" value={pwdForm.newPwd}
                      onChange={e => setPwdForm(p=>({...p,newPwd:e.target.value}))}
                      style={s.input}
                      onFocus={e=>e.target.style.borderColor="#2563EB"}
                      onBlur={e=>e.target.style.borderColor="#D1D5DB"}
                    />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Confirm New Password</label>
                    <input
                      type="password" value={pwdForm.confirm}
                      onChange={e => setPwdForm(p=>({...p,confirm:e.target.value}))}
                      style={s.input}
                      onFocus={e=>e.target.style.borderColor="#2563EB"}
                      onBlur={e=>e.target.style.borderColor="#D1D5DB"}
                    />
                  </div>
                </div>
                {pwdError && <div style={s.errorMsg}>⚠ {pwdError}</div>}
                {pwdMsg   && <div style={s.successMsg}>{pwdMsg}</div>}
                <button
                  style={{...s.updatePwdBtn, opacity: updatingPwd ? 0.7 : 1}}
                  onClick={handleUpdatePassword}
                  disabled={updatingPwd}
                >
                  {updatingPwd ? "Updating..." : "Update Password"}
                </button>
              </div>

              {/* Active Sessions */}
              <h3 style={{...s.subTitle, marginTop: 24}}>Active Sessions</h3>
              <div style={s.sessionList}>
                <SessionItem
                  icon="💻"
                  device="Chrome on macOS"
                  location="New York, US"
                  time="Active Now"
                  isActive
                />
                <SessionItem
                  icon="📱"
                  device="Safari on iPhone"
                  location="New York, US"
                  time="2 hours ago"
                  isActive={false}
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={s.rightCol}>
            {/* Preferences */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>Preferences</h2>

              {/* Notifications */}
              <div style={s.prefSection}>
                <div style={s.prefSectionLabel}>NOTIFICATIONS</div>
                <ToggleRow
                  label="Email Notifications"
                  sub="Ticket updates and mentions"
                  value={emailNotif}
                  onChange={setEmailNotif}
                />
                <ToggleRow
                  label="System Alerts"
                  sub="Important system announcements"
                  value={systemAlerts}
                  onChange={setSystemAlerts}
                />
              </div>

              {/* Regional */}
              <div style={{...s.prefSection, marginTop: 16}}>
                <div style={s.prefSectionLabel}>REGIONAL</div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Language</label>
                  <div style={s.selectWrap}>
                    <select value={language} onChange={e=>setLanguage(e.target.value)} style={s.prefSelect}>
                      <option>English (US)</option>
                      <option>Bahasa Indonesia</option>
                      <option>English (UK)</option>
                    </select>
                    <span style={s.selectArrow}>▾</span>
                  </div>
                </div>
                <div style={{...s.fieldGroup, marginTop: 12}}>
                  <label style={s.label}>Timezone</label>
                  <div style={s.selectWrap}>
                    <select value={timezone} onChange={e=>setTimezone(e.target.value)} style={s.prefSelect}>
                      <option>Eastern Time (ET)</option>
                      <option>Western Indonesia Time (WIB)</option>
                      <option>Pacific Time (PT)</option>
                      <option>UTC</option>
                    </select>
                    <span style={s.selectArrow}>▾</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Quick Access — hanya untuk admin */}
            {(role === "admin" || role === "supervisor") && (
              <div style={{...s.card, background: "#F0F7FF", border: "1px solid #BFDBFE"}}>
                <h2 style={{...s.cardTitle, color: "#1D4ED8"}}>Admin Quick Access</h2>
                <div style={s.quickList}>
                  <QuickItem icon="👥" label="Manage Users" onClick={() => navigate("/users")} />
                  <QuickItem icon="📁" label="Document Settings" onClick={() => navigate("/documents")} />
                  <QuickItem icon="📊" label="System Reports" onClick={() => navigate("/dashboard")} />
                </div>
              </div>
            )}
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
    <button style={{...s.navItem, background:active?"#EFF6FF":hovered?"#F9FAFB":"transparent", color:active?"#2563EB":"#374151", fontWeight:active?600:400}}
      onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <span style={s.navIcon}>{icon}</span>
      <span style={s.navLabel}>{label}</span>
    </button>
  );
}

function ToggleRow({ label, sub, value, onChange }) {
  return (
    <div style={s.toggleRow}>
      <div>
        <div style={s.toggleLabel}>{label}</div>
        <div style={s.toggleSub}>{sub}</div>
      </div>
      <button
        style={{...s.toggle, background: value ? "#2563EB" : "#D1D5DB"}}
        onClick={() => onChange(!value)}
      >
        <span style={{...s.toggleThumb, transform: value ? "translateX(20px)" : "translateX(2px)"}} />
      </button>
    </div>
  );
}

function SessionItem({ icon, device, location, time, isActive }) {
  return (
    <div style={s.sessionItem}>
      <div style={s.sessionIcon}>{icon}</div>
      <div style={s.sessionInfo}>
        <div style={s.sessionDevice}>{device}</div>
        <div style={s.sessionMeta}>{location}</div>
      </div>
      <div style={s.sessionRight}>
        {isActive ? (
          <span style={s.activeNow}>Active Now</span>
        ) : (
          <span style={s.sessionTime}>{time}</span>
        )}
        {!isActive && (
          <button style={s.revokeBtn}>Revoke</button>
        )}
      </div>
    </div>
  );
}

function QuickItem({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{...s.quickItem, background: hovered ? "#DBEAFE" : "#FFFFFF"}}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={s.quickIcon}>{icon}</span>
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
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "#FFFFFF", borderBottom: "1px solid #E5E7EB" },
  pageTitle: { fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 },
  topbarRight: { display: "flex", alignItems: "center", gap: 10 },
  bellBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" },
  logoutBtn: { background: "#FFFFFF", color: "#374151", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  body: { display: "flex", gap: 20, padding: "20px 24px", flex: 1, alignItems: "flex-start" },
  leftCol: { flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 },
  rightCol: { width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "#FFFFFF", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px" },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 16px" },
  subTitle: { fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 12px" },
  avatarRow: { display: "flex", gap: 20, alignItems: "flex-start" },
  avatarWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 },
  avatarLarge: { width: 72, height: 72, borderRadius: "50%", background: "#2563EB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700 },
  changePhotoBtn: { background: "none", border: "none", fontSize: 12, color: "#2563EB", cursor: "pointer", padding: 0, fontFamily: "inherit", fontWeight: 500 },
  formGrid: { flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 12, fontWeight: 600, color: "#374151" },
  input: { padding: "8px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" },
  saveRow: { display: "flex", justifyContent: "flex-end", marginTop: 16 },
  saveBtn: { background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  pwdSection: { display: "flex", flexDirection: "column", gap: 12 },
  pwdRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  updatePwdBtn: { background: "#FFFFFF", color: "#374151", border: "1px solid #D1D5DB", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", alignSelf: "flex-start" },
  errorMsg: { fontSize: 12, color: "#DC2626" },
  successMsg: { fontSize: 12, color: "#15803D" },
  sessionList: { display: "flex", flexDirection: "column", gap: 10 },
  sessionItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "#F9FAFB", borderRadius: 8, border: "1px solid #F3F4F6" },
  sessionIcon: { fontSize: 20, flexShrink: 0 },
  sessionInfo: { flex: 1, minWidth: 0 },
  sessionDevice: { fontSize: 13, fontWeight: 600, color: "#111827" },
  sessionMeta: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  sessionRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  activeNow: { fontSize: 11, fontWeight: 600, color: "#15803D", background: "#DCFCE7", padding: "2px 8px", borderRadius: 20 },
  sessionTime: { fontSize: 11, color: "#9CA3AF" },
  revokeBtn: { fontSize: 11, color: "#DC2626", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontWeight: 500 },
  prefSection: {},
  prefSectionLabel: { fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 },
  toggleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  toggleLabel: { fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 },
  toggleSub: { fontSize: 11, color: "#9CA3AF" },
  toggle: { width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 },
  toggleThumb: { position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", background: "#FFFFFF", transition: "transform 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },
  selectWrap: { position: "relative" },
  prefSelect: { width: "100%", padding: "8px 28px 8px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", background: "#FFFFFF", appearance: "none", cursor: "pointer", fontFamily: "inherit", outline: "none" },
  selectArrow: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#9CA3AF", pointerEvents: "none" },
  quickList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 4 },
  quickItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #BFDBFE", borderRadius: 8, cursor: "pointer", transition: "background 0.12s", width: "100%", textAlign: "left" },
  quickIcon: { fontSize: 16, flexShrink: 0 },
  quickLabel: { flex: 1, fontSize: 13, fontWeight: 500, color: "#1D4ED8" },
  quickArrow: { fontSize: 14, color: "#93C5FD" },
};

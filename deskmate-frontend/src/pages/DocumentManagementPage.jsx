// src/pages/DocumentManagementPage.jsx
// -------------------------------------------------------
// Admin Document Management DeskMate
// Sesuai desain: split view - daftar dokumen kiri,
// detail panel kanan, upload button, filter bar
// -------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getFullName, getRole } from "../utils/auth";

const DOC_ICONS = {
  "application/pdf": { icon: "📕", color: "#DC2626", label: "PDF Document" },
  "text/plain":      { icon: "📄", color: "#F59E0B", label: "Text File" },
  "text/markdown":   { icon: "📝", color: "#6B7280", label: "Markdown" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { icon: "📘", color: "#2563EB", label: "Word Document" },
  default:           { icon: "📄", color: "#6B7280", label: "Document" },
};

const INDEXING_STYLE = {
  indexed:    { label: "Active",      bg: "#DCFCE7", color: "#15803D" },
  pending:    { label: "Pending",     bg: "#FEF9C3", color: "#B45309" },
  processing: { label: "Processing",  bg: "#DBEAFE", color: "#1D4ED8" },
  failed:     { label: "Failed",      bg: "#FEF2F2", color: "#DC2626" },
};

const VISIBILITY_STYLE = {
  SOP:      { label: "All Employees", bg: "#DBEAFE", color: "#1D4ED8" },
  FAQ:      { label: "All Employees", bg: "#DBEAFE", color: "#1D4ED8" },
  Manual:   { label: "IT Staff Only", bg: "#EDE9FE", color: "#6D28D9" },
  Safety:   { label: "All Employees", bg: "#DBEAFE", color: "#1D4ED8" },
  default:  { label: "All Employees", bg: "#DBEAFE", color: "#1D4ED8" },
};

export default function DocumentManagementPage() {
  const navigate   = useNavigate();
  const fileRef    = useRef(null);
  const role       = getRole();

  const [profile, setProfile]     = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", category: "SOP", description: "", file: null });
  const [uploadError, setUploadError] = useState("");
  const PAGE_SIZE = 10;

  useEffect(() => { loadProfile(); loadDocuments(); }, [page]);

  async function loadProfile() {
    const r = await apiFetch("/api/v1/profiles/me");
    if (r?.ok) setProfile(await r.json());
  }

  async function loadDocuments() {
    setLoading(true);
    try {
      const r = await apiFetch(`/api/v1/documents/?only_indexed=false&size=${PAGE_SIZE}&page=${page}`);
      if (r?.ok) {
        const d = await r.json();
        const items = Array.isArray(d) ? d : (d.items || []);
        setDocuments(items);
        setTotal(Array.isArray(d) ? d.length : (d.total || items.length));
        if (items.length > 0 && !selected) setSelected(items[0]);
      }
    } finally { setLoading(false); }
  }

  async function handleUpload() {
    if (!uploadForm.title || !uploadForm.file) { setUploadError("Judul dan file wajib diisi."); return; }
    setUploading(true); setUploadError("");
    try {
      const form = new FormData();
      form.append("title", uploadForm.title);
      form.append("category", uploadForm.category);
      if (uploadForm.description) form.append("description", uploadForm.description);
      form.append("file", uploadForm.file);
      const r = await apiFetch("/api/v1/documents/upload", { method: "POST", body: form });
      if (r?.ok) {
        setShowUploadModal(false);
        setUploadForm({ title: "", category: "SOP", description: "", file: null });
        loadDocuments();
      } else {
        const d = await r?.json();
        setUploadError(d?.detail || "Upload gagal.");
      }
    } finally { setUploading(false); }
  }

  const filtered = documents.filter(d =>
    !search || d.title?.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(1)} MB`;
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const docIcon = (type) => DOC_ICONS[type] || DOC_ICONS.default;
  const indexStyle = (status) => INDEXING_STYLE[status] || INDEXING_STYLE.pending;
  const visStyle = (cat) => VISIBILITY_STYLE[cat] || VISIBILITY_STYLE.default;

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
          <div style={s.navSection}>ADMIN</div>
          <NavItem icon="📁" label="Admin Document Management" active />
          <NavItem icon="⚙" label="Admin User Management" onClick={() => navigate("/users")} />
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
          <h1 style={s.pageTitle}>Document Management</h1>
          <div style={s.topbarRight}>
            <button style={s.bellBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button style={s.uploadBtn} onClick={() => setShowUploadModal(true)}>
              ↑ Upload Document
            </button>
          </div>
        </div>

        <div style={s.body}>
          {/* ── LEFT: Document List ── */}
          <div style={s.listPanel}>
            {/* Filter bar */}
            <div style={s.filterBar}>
              <div style={s.searchWrap}>
                <span style={s.searchIcon}>🔍</span>
                <input
                  type="text"
                  placeholder="Search knowledge base..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={s.searchInput}
                />
              </div>
              <button style={s.filterChip}>📁 All Folders ▾</button>
              <button style={s.filterChip}>🏷 Tags ▾</button>
              <button style={s.filterChip}>▼ Status</button>
            </div>

            {/* Table */}
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    <th style={{...s.th, width: 32}}>
                      <input type="checkbox" style={s.checkbox}/>
                    </th>
                    <th style={s.th}>DOCUMENT TITLE</th>
                    <th style={s.th}>TYPE</th>
                    <th style={s.th}>VISIBILITY</th>
                    <th style={s.th}>LAST UPDATED</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={s.emptyCell}><span style={s.spinner}/> Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} style={s.emptyCell}>No documents found. Upload your first document!</td></tr>
                  ) : filtered.map(doc => {
                    const ic = docIcon(doc.file_type);
                    const is = indexStyle(doc.indexing_status);
                    const vs = visStyle(doc.category);
                    const isActive = selected?.id === doc.id;
                    return (
                      <tr key={doc.id}
                        style={{...s.tr, background: isActive ? "#EFF6FF" : "#FFFFFF", borderLeft: isActive ? "3px solid #2563EB" : "3px solid transparent"}}
                        onClick={() => setSelected(doc)}
                      >
                        <td style={s.td} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" style={s.checkbox}/>
                        </td>
                        <td style={s.td}>
                          <div style={s.docTitleCell}>
                            <span style={{...s.docIcon, color: ic.color}}>{ic.icon}</span>
                            <div>
                              <div style={s.docTitle}>{doc.title}</div>
                              <div style={s.docMeta}>{doc.category}{doc.description ? ` • ${doc.description.slice(0, 20)}` : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td style={s.td}><span style={s.typeText}>{ic.label}</span></td>
                        <td style={s.td}>
                          <span style={{...s.visBadge, background: vs.bg, color: vs.color}}>{vs.label}</span>
                        </td>
                        <td style={s.td}>
                          <div style={s.dateText}>{formatDate(doc.indexed_at || doc.created_at)}</div>
                          <div style={s.uploadedBy}>by {doc.uploader?.full_name?.split(" ")[0] || "Admin"}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && total > 0 && (
              <div style={s.pagination}>
                <span style={s.pageInfo}>Showing {Math.min((page-1)*PAGE_SIZE+1, total)} to {Math.min(page*PAGE_SIZE, total)} of {total} documents</span>
                <div style={s.pageButtons}>
                  <button style={s.pageNavBtn} onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← Previous</button>
                  {[1,2,3].map(p => (
                    <button key={p} style={{...s.pageBtn, ...(p===page?s.pageBtnActive:{})}} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button style={s.pageNavBtn} onClick={() => setPage(p => p+1)}>Next →</button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Detail Panel ── */}
          {selected && (
            <div style={s.detailPanel}>
              {/* Doc header */}
              <div style={s.detailHeader}>
                <span style={{fontSize: 28, color: docIcon(selected.file_type).color}}>
                  {docIcon(selected.file_type).icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.detailTitle}>{selected.title}</div>
                  <div style={s.detailSubtitle}>
                    {docIcon(selected.file_type).label} • {formatSize(selected.file_size_bytes)}
                  </div>
                </div>
              </div>

              {/* Document Details */}
              <div style={s.section}>
                <div style={s.sectionTitle}>DOCUMENT DETAILS</div>
                <DetailRow label="Status">
                  <span style={{...s.indexBadge, background: indexStyle(selected.indexing_status).bg, color: indexStyle(selected.indexing_status).color}}>
                    ● {indexStyle(selected.indexing_status).label}
                  </span>
                </DetailRow>
                <DetailRow label="Version"><span style={s.detailVal}>v2.4</span></DetailRow>
                <DetailRow label="Last Updated">
                  <span style={s.detailVal}>{selected.indexed_at ? new Date(selected.indexed_at).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}</span>
                </DetailRow>
                <DetailRow label="Uploaded By">
                  <div style={s.uploaderCell}>
                    <div style={{...s.uploaderAvatar, background: "#7C3AED"}}>S</div>
                    <span style={s.detailVal}>{selected.uploader?.full_name || "Admin"}</span>
                  </div>
                </DetailRow>
              </div>

              {/* Description */}
              <div style={s.section}>
                <div style={s.sectionTitle}>DESCRIPTION</div>
                <p style={s.descText}>{selected.description || "No description provided."}</p>
              </div>

              {/* Visibility & Tags */}
              <div style={s.section}>
                <div style={s.sectionTitle}>VISIBILITY & TAGS</div>
                <div style={s.subLabel}>Permissions</div>
                <div style={s.tagRow}>
                  <span style={{...s.tag, background: "#DBEAFE", color: "#1D4ED8"}}>● All Employees</span>
                  <span style={{...s.tag, background: "#DCFCE7", color: "#15803D"}}>🤖 AI Chat Enabled</span>
                </div>
                <div style={{...s.subLabel, marginTop: 10}}>Tags</div>
                <div style={s.tagRow}>
                  {(selected.category ? [selected.category, "IT", "Hardware"] : ["General"]).map((t, i) => (
                    <span key={i} style={s.tagGray}>{t}</span>
                  ))}
                  <button style={s.addTagBtn}>+ Add</button>
                </div>
              </div>

              {/* Action buttons */}
              <div style={s.actionBtns}>
                <button style={s.editBtn}>✏ Edit Metadata</button>
                <div style={s.actionRow2}>
                  <button style={s.replaceBtn}>📎 Replace File</button>
                  <button style={s.archiveBtn}>🗄 Archive</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── UPLOAD MODAL ── */}
      {showUploadModal && (
        <div style={s.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Upload Document</h2>
              <button style={s.modalClose} onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            {uploadError && <div style={s.errorBox}>⚠ {uploadError}</div>}
            <div style={s.modalBody}>
              <div style={s.fieldGroup}>
                <label style={s.label}>Document Title *</label>
                <input type="text" value={uploadForm.title} onChange={e => setUploadForm(p=>({...p,title:e.target.value}))}
                  placeholder="Contoh: SOP Pengoperasian Mesin A3" style={s.input}
                  onFocus={e=>e.target.style.borderColor="#2563EB"} onBlur={e=>e.target.style.borderColor="#D1D5DB"}/>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Category</label>
                <select value={uploadForm.category} onChange={e=>setUploadForm(p=>({...p,category:e.target.value}))} style={s.select}>
                  <option value="SOP">SOP</option>
                  <option value="FAQ">FAQ</option>
                  <option value="Manual">Manual</option>
                  <option value="Safety">Safety</option>
                </select>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Description</label>
                <textarea value={uploadForm.description} onChange={e=>setUploadForm(p=>({...p,description:e.target.value}))}
                  placeholder="Deskripsi singkat isi dokumen..." style={s.textarea} rows={3}/>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>File (PDF / TXT / MD) *</label>
                <div style={s.dropzone} onClick={() => fileRef.current?.click()}>
                  <input ref={fileRef} type="file" accept=".pdf,.txt,.md" style={{display:"none"}}
                    onChange={e => setUploadForm(p=>({...p, file: e.target.files[0]}))}/>
                  {uploadForm.file ? (
                    <div>📎 {uploadForm.file.name} ({formatSize(uploadForm.file.size)})</div>
                  ) : (
                    <div>
                      <div style={{fontSize:24,marginBottom:6}}>☁</div>
                      <div style={{fontSize:13}}><span style={{color:"#2563EB",fontWeight:600}}>Click to upload</span> or drag and drop</div>
                      <div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>PDF, TXT, MD — max 20MB</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setShowUploadModal(false)}>Cancel</button>
              <button
                style={{...s.submitBtn, opacity: uploading?0.7:1, cursor: uploading?"not-allowed":"pointer"}}
                onClick={handleUpload} disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload & Index"}
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

function DetailRow({ label, children }) {
  return (
    <div style={s.detailRow}>
      <span style={s.detailKey}>{label}</span>
      {children}
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
  uploadBtn: { background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  body: { display: "flex", flex: 1, overflow: "hidden" },

  // List panel
  listPanel: { flex: 1, display: "flex", flexDirection: "column", padding: "16px", gap: 12, overflow: "auto" },
  filterBar: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  searchWrap: { flex: 1, minWidth: 160, display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "7px 12px" },
  searchIcon: { fontSize: 13 },
  searchInput: { border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#374151", fontFamily: "inherit", flex: 1 },
  filterChip: { background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 20, fontSize: 12, color: "#374151", padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" },
  tableWrap: { background: "#FFFFFF", borderRadius: 10, border: "1px solid #E5E7EB", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#F9FAFB" },
  th: { padding: "9px 12px", fontSize: 11, fontWeight: 700, color: "#6B7280", textAlign: "left", letterSpacing: "0.05em", borderBottom: "1px solid #F3F4F6" },
  tr: { borderBottom: "1px solid #F9FAFB", cursor: "pointer", transition: "background 0.1s" },
  td: { padding: "10px 12px", verticalAlign: "middle" },
  checkbox: { width: 14, height: 14, accentColor: "#2563EB", cursor: "pointer" },
  docTitleCell: { display: "flex", alignItems: "flex-start", gap: 8 },
  docIcon: { fontSize: 20, flexShrink: 0, marginTop: 1 },
  docTitle: { fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 },
  docMeta: { fontSize: 11, color: "#9CA3AF" },
  typeText: { fontSize: 12, color: "#6B7280" },
  visBadge: { fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20 },
  dateText: { fontSize: 12, color: "#374151" },
  uploadedBy: { fontSize: 11, color: "#9CA3AF" },
  pagination: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", flexWrap: "wrap", gap: 8 },
  pageInfo: { fontSize: 12, color: "#6B7280" },
  pageButtons: { display: "flex", gap: 4, alignItems: "center" },
  pageNavBtn: { padding: "5px 12px", border: "1px solid #E5E7EB", background: "#FFFFFF", borderRadius: 6, fontSize: 12, color: "#374151", cursor: "pointer", fontFamily: "inherit" },
  pageBtn: { minWidth: 30, height: 30, border: "1px solid #E5E7EB", background: "#FFFFFF", borderRadius: 6, fontSize: 13, color: "#374151", cursor: "pointer" },
  pageBtnActive: { background: "#2563EB", color: "#FFFFFF", borderColor: "#2563EB" },

  // Detail panel
  detailPanel: { width: 240, background: "#FFFFFF", borderLeft: "1px solid #E5E7EB", padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 },
  detailHeader: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #F3F4F6" },
  detailTitle: { fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.4 },
  detailSubtitle: { fontSize: 11, color: "#6B7280", marginTop: 3 },
  section: { paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #F3F4F6" },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 },
  detailRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  detailKey: { fontSize: 12, color: "#6B7280" },
  detailVal: { fontSize: 12, fontWeight: 500, color: "#374151", textAlign: "right" },
  indexBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
  uploaderCell: { display: "flex", alignItems: "center", gap: 6 },
  uploaderAvatar: { width: 20, height: 20, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 },
  descText: { fontSize: 12, color: "#374151", lineHeight: 1.6, margin: 0 },
  subLabel: { fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6 },
  tagRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  tag: { fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20 },
  tagGray: { fontSize: 11, color: "#374151", background: "#F3F4F6", padding: "3px 9px", borderRadius: 20 },
  addTagBtn: { fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontFamily: "inherit" },
  actionBtns: { display: "flex", flexDirection: "column", gap: 8, marginTop: 4 },
  editBtn: { background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" },
  actionRow2: { display: "flex", gap: 8 },
  replaceBtn: { flex: 1, background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px", fontSize: 12, color: "#374151", cursor: "pointer" },
  archiveBtn: { flex: 1, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px", fontSize: 12, color: "#DC2626", cursor: "pointer" },

  // Modal
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 },
  modal: { background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #F3F4F6" },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 },
  modalClose: { background: "none", border: "none", fontSize: 20, color: "#9CA3AF", cursor: "pointer", padding: 0, lineHeight: 1 },
  modalBody: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  modalFooter: { padding: "14px 24px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "flex-end", gap: 10 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  input: { padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", outline: "none", fontFamily: "inherit" },
  select: { padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", outline: "none", fontFamily: "inherit", background: "#FFFFFF" },
  textarea: { padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, color: "#111827", outline: "none", resize: "vertical", fontFamily: "inherit" },
  dropzone: { border: "1.5px dashed #D1D5DB", borderRadius: 8, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", background: "#FAFAFA", fontSize: 13, color: "#374151", textAlign: "center" },
  errorBox: { margin: "0 24px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626" },
  cancelBtn: { padding: "9px 20px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#FFFFFF", fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer" },
  submitBtn: { padding: "9px 20px", borderRadius: 8, border: "none", background: "#2563EB", fontSize: 13, fontWeight: 600, color: "#FFFFFF", cursor: "pointer" },
  emptyCell: { padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: 13 },
  spinner: { display: "inline-block", width: 14, height: 14, border: "2px solid #E5E7EB", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.6s linear infinite", marginRight: 8 },
};

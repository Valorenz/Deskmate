// src/pages/ChatPage.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChatPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [tickets, setTickets] = useState([]);
  
  // ── FITUR DINAMISASI PROFIL ──
  const [fullName, setFullName] = useState("User");

  // ── FITUR GEMINI: Pinned Sesi & Dropdown Trigger ──
  const [pinnedSessions, setPinnedSessions] = useState(() => {
    const saved = localStorage.getItem('dm_pinned_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeMenuId, setActiveMenuId] = useState(null);

  // ── FITUR GAMBAR: Image Management Logistik ──
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Halo, Teknisi. Saya DeskMate AI. Ada kendala teknis atau kode error mesin yang bisa saya bantu identifikasi hari ini?', image: null }
  ]);

  const messagesEndRef = useRef(null);

  // Auto-scroll area chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, imagePreview]);

  // Deteksi klik luar untuk menutup dropdown menu titik tiga
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sinkronisasi data sematan ke LocalStorage
  useEffect(() => {
    localStorage.setItem('dm_pinned_sessions', JSON.stringify(pinnedSessions));
  }, [pinnedSessions]);

  // Load awal riwayat sesi, data tiket aktif, dan profil asli user
  const loadInitialData = async () => {
    const token = localStorage.getItem('dm_token') || sessionStorage.getItem('dm_token');
    if (!token) return;

    const savedName = localStorage.getItem('dm_full_name') || sessionStorage.getItem('dm_full_name');
    if (savedName) setFullName(savedName);

    try {
      // 1. Fetch Sesi Percakapan
      const sessionRes = await fetch('http://localhost:8000/api/v1/chat/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setSessions(sessionData);
      }

      // 2. Fetch Tiket Aktif
      const ticketRes = await fetch('http://localhost:8000/api/v1/tickets/?status=open&size=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ticketRes.ok) {
        const ticketData = await ticketRes.json();
        setTickets(ticketData.items || []);
      }
    } catch (err) {
      console.error("Gagal sinkronisasi data internal backend", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Kontrol Pin & Unpin Percakapan
  const togglePinSession = (id, e) => {
    e.stopPropagation();
    setPinnedSessions((prev) => 
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
    setActiveMenuId(null);
  };

  // Penghapusan Sesi via API Backend
  const closeSession = async (id, e) => {
    e.stopPropagation();
    setActiveMenuId(null);
    const token = localStorage.getItem('dm_token') || sessionStorage.getItem('dm_token');
    if (!token) return;

    if (!confirm("Apakah Tuan Muda yakin ingin menghapus riwayat percakapan ini?")) return;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/chat/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok || res.status === 204) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        setPinnedSessions((prev) => prev.filter((sid) => sid !== id));
        
        if (sessionId === id) {
          setSessionId(null);
          setMessages([{ role: 'ai', content: 'Sesi telah dihapus. Sesi baru dimulai. Ada kendala teknis lain yang bisa dibantu?', image: null }]);
        }
      } else {
        alert("Gagal menghapus sesi dari database pusat.");
      }
    } catch (err) {
      console.error("Koneksi sirkuit API bermasalah", err);
    }
  };

  // Upload Gambar & Validasi Berkas Maksimal 5MB
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran berkas melebihi 5MB. Batas sistem internal Epson.");
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Membuka Sesi Lama
  const loadOldSession = async (id) => {
    const token = localStorage.getItem('dm_token') || sessionStorage.getItem('dm_token');
    if (!token) return;

    setSessionId(id);
    setIsTyping(true);
    handleRemoveImage();

    try {
      const res = await fetch(`http://localhost:8000/api/v1/chat/sessions/${id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const formattedMessages = data.map((msg) => ({
          role: msg.role === 'assistant' ? 'ai' : 'user',
          content: msg.content,
          image: msg.attachment_ids && msg.attachment_ids.length > 0 ? 'ada' : null
        }));

        setMessages(formattedMessages.length > 0 ? formattedMessages : [
          { role: 'ai', content: 'Sesi ini kosong. Silakan ketik pesan untuk memulai.', image: null }
        ]);
      }
    } catch (err) {
      setMessages([{ role: 'ai', content: 'Gagal memuat riwayat pesan.', image: null }]);
    } {
      setIsTyping(false);
    }
    
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Pengiriman Pesan ke AI (Multipart Form-Data)
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage || isTyping) return;

    const userText = input;
    const currentPreview = imagePreview;
    
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userText, image: currentPreview }]);
    setIsTyping(true);
    handleRemoveImage();

    const token = localStorage.getItem('dm_token') || sessionStorage.getItem('dm_token');
    if (!token) {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Akses ditolak: Token tidak ditemukan. Harap login kembali.', image: null }]);
      setIsTyping(false);
      return;
    }

    try {
      let currentSessionId = sessionId;

      if (!currentSessionId) {
        const sessionRes = await fetch('http://localhost:8000/api/v1/chat/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: userText ? userText.substring(0, 40) : 'Eskalasi Gambar' })
        });

        if (!sessionRes.ok) throw new Error('Gagal membuat sesi baru.');
        const sessionData = await sessionRes.json();
        currentSessionId = sessionData.id;
        setSessionId(currentSessionId);
        loadInitialData();
      }

      const formData = new FormData();
      formData.append('content', userText);

      let targetUrl = `http://localhost:8000/api/v1/chat/sessions/${currentSessionId}/messages`;

      if (selectedImage) {
        formData.append('image', selectedImage);
        targetUrl += '/with-image';
      } else {
        formData.append('attachment_ids', '[]');
      }

      const messageRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!messageRes.ok) throw new Error('Gagal mengirim pesan ke AI.');
      const messageData = await messageRes.json();

      setMessages((prev) => [...prev, { role: 'ai', content: messageData.ai_message.content, image: null }]);

    } catch (error) {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Koneksi ke server pusat terputus.', image: null }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    handleRemoveImage();
    setMessages([{ role: 'ai', content: 'Sesi baru dimulai. Ada kendala teknis lain yang bisa dibantu?', image: null }]);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const createTicketFromChat = () => {
    if (!sessionId || messages.length === 0) {
      navigate("/tickets/create");
      return;
    }
    navigate(`/tickets/create?session_id=${sessionId}`);
  };

  // Filter List Sesi Sidebar ala Gemini Sorting
  const pinnedList = sessions.filter(s => pinnedSessions.includes(s.id));
  const regularList = sessions.filter(s => !pinnedSessions.includes(s.id));

  return (
    <div className="flex h-screen w-full bg-white font-sans text-[#111827] overflow-hidden">

      {/* ─── TOP HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 flex h-14 md:h-16 items-center justify-between border-b border-[#d1d5db] bg-white px-3 md:px-6 shadow-sm z-30">
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="rounded-lg p-2 text-[#6b7280] hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#003399] leading-none">EPSON</h1>
            <span className="text-[9px] md:text-[10px] font-bold text-[#6b7280] tracking-wider mt-0.5">DESKMATE AI</span>
          </div>
        </div>

        {/* Profil Header Dinamis */}
        <div className="flex items-center gap-1 md:gap-2">
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
          <button className="rounded-full p-2.5 text-[#6b7280] hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
          <div className="h-6 w-px bg-gray-300 mx-1 md:mx-2 hidden sm:block"></div>
          
          <div onClick={() => navigate("/profile")} className="flex items-center gap-1 md:gap-2 pl-1 cursor-pointer hover:opacity-80 transition-opacity select-none">
            <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-[#124090] font-bold text-white shadow-sm text-xs md:text-sm">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-[#111827]">{fullName}</span>
              <span className="text-[10px] text-[#6b7280]">PM / Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN LAYOUT CONTAINER ─── */}
      <div className="flex flex-1 pt-14 md:pt-16 overflow-hidden relative w-full">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* ── SIDEBAR PANEL LEFT ── */}
        <div className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto bg-[#f9fafb] border-r border-[#d1d5db] flex flex-col transition-transform duration-300 ease-in-out w-[280px] md:w-64 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-4 flex-1 overflow-y-auto relative">
            <button onClick={handleNewChat} className="w-full rounded-full border border-[#d1d5db] bg-white text-[#111827] py-2.5 text-sm font-semibold transition hover:bg-gray-50 mb-6 shadow-sm">+ Percakapan Baru</button>
            
            <p className="text-xs font-bold text-[#9ca3af] mb-3 px-1 tracking-wider uppercase">Menu Navigasi</p>
            <nav className="space-y-1 mb-6">
              <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                <span className="text-base">🏠</span><span>Dashboard Utama</span>
              </button>
              <span className="flex items-center gap-3 bg-[#e5e7eb] text-[#111827] rounded-lg p-3 text-sm font-semibold cursor-default">
                <span className="text-base">💬</span><span>AI Helpdesk Chat</span>
              </span>
              <button onClick={() => navigate("/tickets")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                <span className="text-base">📋</span><span>Daftar Tiket Saya</span>
              </button>
              <button onClick={() => navigate("/tickets/create")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                <span className="text-base">➕</span><span>Buat Tiket Baru</span>
              </button>

              {/* Rute Khusus Supervisor */}
              {((localStorage.getItem('dm_role') || sessionStorage.getItem('dm_role')) === 'supervisor' || 
                (localStorage.getItem('dm_role') || sessionStorage.getItem('dm_role')) === 'admin') && (
                <>
                  <p className="text-xs font-bold text-[#9ca3af] mt-4 mb-2 px-1 tracking-wider uppercase">Menu Supervisor</p>
                  <button onClick={() => navigate("/all-tickets")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                    <span className="text-base">🗂️</span><span>Semua Tiket Unit</span>
                  </button>
                </>
              )}

              {/* Rute Khusus Admin */}
              {((localStorage.getItem('dm_role') || sessionStorage.getItem('dm_role')) === 'admin') && (
                <>
                  <p className="text-xs font-bold text-[#9ca3af] mt-4 mb-2 px-1 tracking-wider uppercase">Menu Admin</p>
                  <button onClick={() => navigate("/documents")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                    <span className="text-base">📄</span><span>Kelola Dokumen RAG</span>
                  </button>
                  <button onClick={() => navigate("/users")} className="w-full flex items-center gap-3 text-[#6b7280] hover:bg-gray-100 hover:text-[#111827] rounded-lg p-3 text-sm font-medium transition text-left">
                    <span className="text-base">⚙️</span><span>Kelola Pengguna</span>
                  </button>
                </>
              )}
            </nav>

            {/* KELOMPOK TERSEMAT (PINNED CHAT) */}
            {pinnedList.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-bold text-[#9ca3af] mb-2 px-1 tracking-wider uppercase flex items-center gap-1">📌 Tersemat</p>
                <div className="space-y-1.5">
                  {pinnedList.map((s) => (
                    <div 
                      key={s.id} 
                      onClick={() => loadOldSession(s.id)} 
                      className={`relative flex items-center justify-between rounded-lg p-2.5 cursor-pointer border transition ${sessionId === s.id ? 'bg-white border-[#124090] shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-200'}`}
                    >
                      <div className="min-w-0 flex-1 pr-1">
                        <p className="text-xs font-semibold text-[#111827] truncate">{s.title || 'Percakapan Tanpa Judul'}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === s.id ? null : s.id); }} className="text-gray-400 hover:text-[#124090] p-1 text-xs font-bold">•••</button>
                      {activeMenuId === s.id && (
                        <div ref={menuRef} className="absolute right-2 top-9 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-36 z-50 text-left">
                          <button onClick={(e) => togglePinSession(s.id, e)} className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5">📌 Lepas Pin</button>
                          <button onClick={(e) => closeSession(s.id, e)} className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5 border-t border-gray-100">🗑 Hapus</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KELOMPOK RIWAYAT STANDAR */}
            <p className="text-xs font-bold text-[#9ca3af] mb-2 px-1 tracking-wider uppercase">Riwayat Percakapan</p>
            <div className="space-y-1.5">
              {sessions.length === 0 ? (
                <p className="text-xs text-gray-400 px-1 italic">Belum ada riwayat.</p>
              ) : (
                regularList.map((s) => (
                  <div 
                    key={s.id} 
                    onClick={() => loadOldSession(s.id)} 
                    className={`relative flex items-center justify-between rounded-lg p-2.5 cursor-pointer border transition ${sessionId === s.id ? 'bg-white border-[#124090] shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-200'}`}
                  >
                    <div className="min-w-0 flex-1 pr-1">
                      <p className="text-xs font-medium text-[#111827] truncate">{s.title || 'Percakapan Tanpa Judul'}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === s.id ? null : s.id); }} className="text-gray-400 hover:text-[#124090] p-1 text-xs font-bold">•••</button>
                    {activeMenuId === s.id && (
                      <div ref={menuRef} className="absolute right-2 top-9 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-36 z-50 text-left">
                        <button onClick={(e) => togglePinSession(s.id, e)} className="w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5">📌 Pin Keatas</button>
                        <button onClick={(e) => closeSession(s.id, e)} className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5 border-t border-gray-100">🗑 Hapus</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── AREA UTAMA: KONTEN CHAT CENTER ── */}
        <div className="flex-1 flex flex-col bg-white relative min-w-0 h-full">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-36 md:pb-40">
            
            {/* RENDER KONDISIONAL CHAT KOSONG PILIHAN PREMIUM TUAN MUDA */}
            {!sessionId ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-4 select-none my-auto">
                {/* WATERMARK BRANDING ELEGAN */}
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-300 mb-2 font-sans">
                  DeskMate
                </h2>
                
                <h3 className="text-xl md:text-2xl font-bold text-[#111827] mt-4">
                  How can I help you today?
                </h3>
                <p className="mt-2 text-sm text-[#6b7280] max-w-md">
                  Ask me about IT issues, HR policies, or request a new service ticket.
                </p>

                <div className="mt-8">
                  <p className="text-xs font-semibold text-[#9ca3af] tracking-wider uppercase mb-4">
                    Try these prompts:
                  </p>
                  <div className="flex flex-wrap gap-2.5 justify-center max-w-xl">
                    <button onClick={() => setInput("I need help resetting my password")} className="px-4 py-2.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-[#374151] hover:bg-gray-50 hover:border-gray-300 transition shadow-sm cursor-pointer">I need help resetting my password</button>
                    <button onClick={() => setInput("My VPN keeps disconnecting")} className="px-4 py-2.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-[#374151] hover:bg-gray-50 hover:border-gray-300 transition shadow-sm cursor-pointer">My VPN keeps disconnecting</button>
                    <button onClick={() => setInput("How do I request new software?")} className="px-4 py-2.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-[#374151] hover:bg-gray-50 hover:border-gray-300 transition shadow-sm cursor-pointer">How do I request new software?</button>
                    <button onClick={() => setInput("Show me HR remote work policy")} className="px-4 py-2.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-[#374151] hover:bg-gray-50 hover:border-gray-300 transition shadow-sm cursor-pointer">Show me HR remote work policy</button>
                  </div>
                </div>
              </div>
            ) : (
              /* ALUR CHAT BUBBLE */
              messages.map((msg, index) => (
                <div key={index} className="flex w-full">
                  {msg.role === 'user' ? (
                    <div className="ml-auto flex flex-col items-end gap-1.5 max-w-[85%] md:max-w-2xl w-full">
                      {msg.image && (
                        <img src={msg.image} alt="User Attachment" className="max-w-full rounded-2xl border border-gray-200 shadow-sm mb-1 object-cover max-h-48" />
                      )}
                      {msg.content && (
                        <div className="rounded-2xl md:rounded-3xl rounded-br-sm bg-[#124090] px-4 md:px-5 py-3 md:py-3.5 text-white shadow-sm text-right">
                          <p className="text-sm leading-relaxed text-left">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex max-w-[90%] md:max-w-3xl gap-3 md:gap-4 py-2">
                      <div className="flex h-7 w-7 md:h-8 md:w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#003399] text-white shadow-sm mt-0.5">
                        <span className="text-[9px] md:text-[10px] font-bold tracking-widest">AI</span>
                      </div>
                      <div className="pt-1 text-[#111827]">
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {isTyping && (
              <div className="flex max-w-[90%] md:max-w-3xl gap-3 md:gap-4 py-2 opacity-50">
                <div className="flex h-7 w-7 md:h-8 md:w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#003399] text-white mt-0.5"><span className="text-[9px] md:text-[10px] font-bold tracking-widest">AI</span></div>
                <div className="pt-1.5 text-[#111827] flex items-center gap-1">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* AREA INPUT UTAMA */}
          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-white via-white to-transparent">
            <div className="max-w-3xl mx-auto flex flex-col bg-[#f9fafb] border border-[#d1d5db] rounded-3xl p-1.5 md:p-2 shadow-sm focus-within:border-[#124090] focus-within:ring-1 focus-within:ring-[#124090] transition-all">
              
              {imagePreview && (
                <div className="relative inline-block ml-3 mt-2 mb-1 w-16 h-16 rounded-xl border border-gray-300 overflow-hidden bg-white shadow-sm">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={handleRemoveImage} className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold transition">✕</button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center w-full relative">
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTyping}
                  className="p-2.5 text-[#6b7280] hover:text-[#124090] transition-colors rounded-full hover:bg-gray-200/50 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Lampirkan Foto Komponen / Error"
                >
                  <svg className="h-5 w-5 transform rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isTyping}
                  placeholder={selectedImage ? "Tambahkan catatan keluhan..." : "Tanyakan panduan teknis pada DeskMate..."}
                  className="flex-1 bg-transparent px-2 text-sm text-[#111827] outline-none min-w-0"
                />

                <button
                  type="submit"
                  disabled={isTyping || (!input.trim() && !selectedImage)}
                  className="ml-1 aspect-square p-2 rounded-full bg-[#124090] text-white flex items-center justify-center transition hover:bg-[#0e306e] disabled:opacity-30 min-w-[36px]"
                >
                  <svg className="h-4 w-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9-7-9-7v14z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── PANEL KANAN: CONTEXT & ACTIONS ── */}
        <aside className="hidden lg:flex flex-col w-60 bg-[#f9fafb] border-l border-[#d1d5db] p-4 gap-4 overflow-y-auto flex-shrink-0 h-full">
          <div>
            <h3 className="text-sm font-bold text-[#111827] mb-1">Context & Actions</h3>
            <p className="text-[11px] text-[#6b7280] leading-relaxed">Kelola kebutuhan tiket dan rujukan dokumen logis mesin di sini.</p>
          </div>

          <div className="border-b border-gray-200 pb-3">
            <button 
              onClick={createTicketFromChat}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#124090] text-white py-2.5 text-xs font-bold shadow-sm transition hover:bg-[#0e306e]"
            >
              <span>🎫</span> Create Ticket from Chat
            </button>
            <p className="text-[10px] text-[#6b7280] mt-1.5 text-center leading-normal">Otomatis merangkum riwayat obrolan ini menjadi tiket baru.</p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold text-[#9ca3af] tracking-wider uppercase">Suggested Knowledge</p>
            <div className="space-y-1.5">
              <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-2.5 cursor-pointer hover:border-[#124090] transition shadow-2zm">
                <span className="text-sm">📄</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#111827] truncate">Password Reset Guidelines</p>
                  <p className="text-[9px] text-[#9ca3af]">IT Security • Updated 2w ago</p>
                </div>
              </div>
              <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-2.5 cursor-pointer hover:border-[#124090] transition shadow-2zm">
                <span className="text-sm">🌐</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#111827] truncate">VPN Troubleshooting Steps</p>
                  <p className="text-[9px] text-[#9ca3af]">Network Ops • Updated 1m ago</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <p className="text-[10px] font-bold text-[#9ca3af] tracking-wider uppercase">Your Active Tickets</p>
            <div className="space-y-2">
              {tickets.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-2 border border-dashed border-gray-200 rounded-xl bg-white italic">Tidak ada tiket aktif</div>
              ) : (
                tickets.map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="bg-white border border-gray-200 rounded-xl p-2.5 cursor-pointer hover:border-[#124090] transition shadow-2zm"
                  >
                    <p className="text-[10px] font-bold text-[#124090]">{t.ticket_number}</p>
                    <div className="flex justify-between items-center gap-1.5 mt-1">
                      <p className="text-xs text-[#374151] truncate flex-1">{t.title}</p>
                      <span className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md">Open</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
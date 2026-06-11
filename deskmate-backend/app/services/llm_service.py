# app/services/llm_service.py
# -------------------------------------------------------
# Cara kerja:
# LLMService adalah wrapper di atas Gemini API.
# Ia bertugas:
# 1. Membangun prompt yang terstruktur (system + context + history + query)
# 2. Mengirim ke Gemini dan mendapatkan respons
# 3. Menganalisis gambar via Gemini Vision (multimodal)
# 4. Melacak jumlah token yang dipakai
#
# Pemisahan ini penting: rag_service.py hanya perlu memanggil
# llm_service tanpa tahu detail API Gemini sama sekali.
# -------------------------------------------------------

import base64
import logging
import time
from dataclasses import dataclass

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from app.core.config import settings
from app.services.vector_service import RetrievedChunk

logger = logging.getLogger("deskmate.llm")


@dataclass
class LLMResponse:
    """Hasil respons dari Gemini."""
    content: str
    tokens_used: int
    latency_ms: int


# ── System Prompt ─────────────────────────────────────────────────
# Ini adalah "kepribadian" dan aturan main chatbot DeskMate.
# Dikirim di setiap request sebagai konteks awal.
SYSTEM_PROMPT = """Anda adalah DeskMate, asisten AI helpdesk untuk PT. Indonesia Epson Industry.

Tugas utama Anda:
- Membantu karyawan melakukan troubleshooting masalah operasional secara mandiri
- Menjawab pertanyaan berdasarkan dokumen SOP dan FAQ perusahaan yang diberikan
- Memberikan instruksi yang jelas, terstruktur, dan mudah dipahami

Aturan yang WAJIB diikuti:
1. Jawab HANYA berdasarkan konteks dokumen yang diberikan. Jangan mengarang informasi.
2. PENGECUALIAN UNTUK SAPAAN: Jika pengguna HANYA menyapa (seperti "halo", "hai", "selamat pagi", "terima kasih"), balaslah sapaan tersebut dengan ramah sebagai DeskMate dan tanyakan kendala apa yang bisa Anda bantu. 
3. UNTUK PERTANYAAN TEKNIS/FAKTA: Jika pengguna bertanya tentang masalah teknis atau fakta, dan informasinya TIDAK ADA di konteks dokumen, katakan dengan jelas:
   "Maaf, saya tidak menemukan informasi tentang hal tersebut di dokumen yang tersedia. Silakan buat tiket helpdesk agar supervisor dapat membantu Anda."
4. Gunakan bahasa Indonesia yang formal namun ramah dan mudah dipahami.
5. Jika ada langkah-langkah, tampilkan dalam format bernomor.
6. Jika ada peringatan keselamatan (safety) dalam dokumen, SELALU sebutkan dengan jelas.
7. Jangan pernah menyarankan tindakan yang bisa membahayakan keselamatan karyawan.

Format respons yang dianjurkan:
- Langsung ke inti jawaban, tidak perlu basa-basi panjang
- Gunakan poin/nomor untuk instruksi bertahap
- Akhiri dengan konfirmasi apakah jawaban membantu atau perlu eskalasi tiket"""


class LLMService:
    """Wrapper Gemini API untuk generasi teks dan analisis gambar."""

    def __init__(self):
        self._llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2,      # Rendah = respons lebih konsisten & faktual
            max_output_tokens=2048,
            # Safety settings: matikan filter yang terlalu agresif untuk konteks industri
            #safety_settings={
             #   "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
              #  "HARM_CATEGORY_HARASSMENT": "BLOCK_MEDIUM_AND_ABOVE",
            #},
        )
        logger.info(f"LLMService initialized with model: {settings.GEMINI_MODEL}")

    def _build_context_block(self, retrieved_chunks: list[RetrievedChunk]) -> str:
        """
        Mengubah list chunk dokumen menjadi blok teks konteks
        yang akan disertakan dalam prompt ke Gemini.

        Format yang jelas membantu Gemini memahami bahwa
        informasi ini adalah "sumber kebenaran" untuk menjawab.
        """
        if not retrieved_chunks:
            return "Tidak ada dokumen relevan yang ditemukan."

        context_parts = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            page_info = f" (Halaman {chunk.page})" if chunk.page else ""
            context_parts.append(
                f"[Dokumen {i}: {chunk.title}{page_info} | Relevansi: {chunk.score:.0%}]\n"
                f"{chunk.content}"
            )

        return "\n\n---\n\n".join(context_parts)

    def _build_history_messages(
        self, history: list[dict]
    ) -> list[HumanMessage | AIMessage]:
        """
        Mengubah riwayat chat dari database menjadi format
        yang dipahami LangChain/Gemini.

        history = [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        """
        messages = []
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
        return messages

    @retry(
        stop=stop_after_attempt(3),           # Coba maksimal 3 kali
        wait=wait_exponential(min=1, max=10), # Tunggu 1s, 2s, 4s... antar retry
        reraise=True,
    )
    async def generate_answer(
        self,
        query: str,
        retrieved_chunks: list[RetrievedChunk],
        chat_history: list[dict] | None = None,
    ) -> LLMResponse:
        """
        Menghasilkan jawaban berdasarkan query user dan konteks dokumen.

        Alur prompt yang dikirim ke Gemini:
        1. System prompt (kepribadian & aturan DeskMate)
        2. Konteks dokumen relevan dari ChromaDB
        3. Riwayat percakapan (agar Gemini ingat konteks sebelumnya)
        4. Pertanyaan terbaru dari user

        Args:
            query            : Pertanyaan terbaru dari user
            retrieved_chunks : Hasil pencarian dari ChromaDB
            chat_history     : Riwayat pesan sebelumnya dalam sesi ini

        Returns:
            LLMResponse dengan konten jawaban, jumlah token, dan latensi
        """
        start_time = time.time()

        # Bangun konteks dari dokumen yang ditemukan
        context = self._build_context_block(retrieved_chunks)

        # Bangun prompt akhir yang dikirim ke Gemini
        user_prompt = (
            f"KONTEKS DOKUMEN PERUSAHAAN:\n"
            f"{'='*50}\n"
            f"{context}\n"
            f"{'='*50}\n\n"
            f"PERTANYAAN KARYAWAN:\n{query}"
        )

        # Susun urutan pesan: system → history → user query terbaru
        messages = [SystemMessage(content=SYSTEM_PROMPT)]

        if chat_history:
            # Ambil maksimal 10 pesan terakhir untuk menghemat token
            recent_history = chat_history[-10:]
            messages.extend(self._build_history_messages(recent_history))

        messages.append(HumanMessage(content=user_prompt))

        # Kirim ke Gemini
        logger.info(f"Sending request to Gemini. Chunks: {len(retrieved_chunks)}, History: {len(chat_history or [])}")
        response = await self._llm.ainvoke(messages)

        latency_ms = int((time.time() - start_time) * 1000)

        # Hitung token yang dipakai (dari response metadata Gemini)
        tokens_used = 0
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            tokens_used = response.usage_metadata.get("total_token_count", 0)

        logger.info(f"Gemini responded in {latency_ms}ms, tokens: {tokens_used}")

        return LLMResponse(
            content=response.content,
            tokens_used=tokens_used,
            latency_ms=latency_ms,
        )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10), reraise=True)
    async def analyze_image(
        self,
        image_data: bytes,
        media_type: str = "image/jpeg",
        context: str = "",
    ) -> str:
        """
        Menganalisis gambar menggunakan kemampuan multimodal Gemini Vision.
        Digunakan untuk:
        1. Mendeskripsikan gambar yang dikirim karyawan saat chat/tiket
        2. Mendeskripsikan gambar dalam dokumen SOP untuk diindeks ke ChromaDB

        Args:
            image_data  : Raw bytes dari file gambar
            media_type  : MIME type gambar ('image/jpeg', 'image/png', dll)
            context     : Konteks tambahan untuk memandu analisis

        Returns:
            String deskripsi detail gambar dalam Bahasa Indonesia
        """
        # Encode gambar ke base64 untuk dikirim ke Gemini
        image_base64 = base64.b64encode(image_data).decode("utf-8")

        prompt_text = (
            "Deskripsikan gambar ini secara detail dalam Bahasa Indonesia. "
            "Fokus pada: komponen yang terlihat, kondisi peralatan/mesin, "
            "teks atau kode yang tampak, indikator lampu/status, dan "
            "informasi teknis lain yang relevan untuk keperluan troubleshooting industri."
        )

        if context:
            prompt_text += f"\n\nKonteks tambahan: {context}"

        # Gemini Vision menerima pesan multimodal: teks + gambar
        message = HumanMessage(content=[
            {"type": "text", "text": prompt_text},
            {
                "type": "image_url",
                "image_url": {"url": f"data:{media_type};base64,{image_base64}"},
            },
        ])

        response = await self._llm.ainvoke([message])
        return response.content

    async def generate_session_title(self, first_message: str) -> str:
        """
        Membuat judul sesi chat otomatis dari pesan pertama user.
        Contoh: "Mesin A3 error E-204 tidak bisa print" → "Troubleshooting Error E-204 Mesin A3"
        """
        message = HumanMessage(
            content=(
                f"Buatkan judul singkat (maksimal 8 kata) dalam Bahasa Indonesia "
                f"untuk sesi chat helpdesk berdasarkan pertanyaan berikut:\n\n"
                f'"{first_message}"\n\n'
                f"Jawab HANYA dengan judulnya saja, tanpa tanda kutip atau penjelasan tambahan."
            )
        )
        response = await self._llm.ainvoke([message])
        # Bersihkan tanda kutip jika ada
        return response.content.strip().strip('"').strip("'")


# Singleton instance
llm_service = LLMService()

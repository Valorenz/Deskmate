# app/services/rag_service.py
# -------------------------------------------------------
# RAG = Retrieval-Augmented Generation
#
# Cara kerja pipeline lengkap:
#
#  User bertanya
#       ↓
#  [1. RETRIEVE] VectorService mencari chunk dokumen relevan
#       ↓
#  [2. AUGMENT]  Chunk dijadikan konteks tambahan dalam prompt
#       ↓
#  [3. GENERATE] LLMService mengirim prompt+konteks ke Gemini
#       ↓
#  Jawaban dikembalikan ke user
#
# RAGService adalah orkestrator: ia mengkoordinasikan
# VectorService dan LLMService tanpa tahu detail implementasinya.
# -------------------------------------------------------

import logging
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatMessage, ChatSession
from app.models.document import Document
from app.services.llm_service import LLMResponse, llm_service
from app.services.vector_service import RetrievedChunk, vector_service

logger = logging.getLogger("deskmate.rag")


@dataclass
class RAGResult:
    """Hasil lengkap dari pipeline RAG."""
    answer: str
    source_chunks: list[RetrievedChunk]
    tokens_used: int
    latency_ms: int
    was_retrieved: bool   # True jika ada dokumen relevan yang ditemukan


class RAGService:
    """
    Orkestrator pipeline RAG untuk DeskMate.
    Menggabungkan pencarian dokumen (VectorService)
    dengan generasi jawaban (LLMService).
    """

    async def _get_active_collections(self, db: AsyncSession) -> list[str]:
        """
        Mengambil nama semua ChromaDB collection dari dokumen
        yang sudah terindeks dan masih aktif.

        Ini penting agar RAG mencari di SEMUA dokumen yang relevan,
        bukan hanya satu dokumen tertentu.
        """
        result = await db.execute(
            select(Document.chroma_collection)
            .where(
                Document.indexing_status == "indexed",
                Document.is_active == True,
                Document.chroma_collection.is_not(None),
            )
        )
        collections = result.scalars().all()
        return [c for c in collections if c]

    async def _get_chat_history(
        self,
        session_id: uuid.UUID,
        db: AsyncSession,
        limit: int = 10,
    ) -> list[dict]:
        """
        Mengambil riwayat chat dari database untuk dikirim
        ke Gemini sebagai konteks percakapan sebelumnya.

        Membatasi history ke N pesan terakhir untuk menghemat token.
        """
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        messages = result.scalars().all()

        # Balik urutan: dari lama ke baru
        messages = list(reversed(messages))

        return [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

    async def answer(
        self,
        query: str,
        session_id: uuid.UUID,
        db: AsyncSession,
        top_k: int = 5,
    ) -> RAGResult:
        """
        Pipeline utama RAG: terima query, cari dokumen, hasilkan jawaban.

        Args:
            query      : Pertanyaan dari user
            session_id : ID sesi chat untuk mengambil riwayat
            db         : Database session
            top_k      : Jumlah chunk terbaik yang diambil dari ChromaDB

        Returns:
            RAGResult berisi jawaban, sumber dokumen, dan metadata
        """
        logger.info(f"RAG query: '{query[:80]}...' | session: {session_id}")

        # ── Langkah 1: Ambil semua collection aktif ───────────────
        active_collections = await self._get_active_collections(db)

        if not active_collections:
            logger.warning("Tidak ada dokumen yang terindeks di ChromaDB.")

        # ── Langkah 2: Cari chunk dokumen yang relevan ────────────
        retrieved_chunks: list[RetrievedChunk] = []
        if active_collections:
            retrieved_chunks = await vector_service.search(
                query=query,
                collection_names=active_collections,
                top_k=top_k,
                score_threshold=0.4,   # Buang chunk dengan relevansi < 40%
            )
            logger.info(f"Retrieved {len(retrieved_chunks)} relevant chunks")

        # ── Langkah 3: Ambil riwayat percakapan ───────────────────
        chat_history = await self._get_chat_history(session_id, db)

        # ── Langkah 4: Generate jawaban via Gemini ─────────────────
        llm_response: LLMResponse = await llm_service.generate_answer(
            query=query,
            retrieved_chunks=retrieved_chunks,
            chat_history=chat_history,
        )

        return RAGResult(
            answer=llm_response.content,
            source_chunks=retrieved_chunks,
            tokens_used=llm_response.tokens_used,
            latency_ms=llm_response.latency_ms,
            was_retrieved=len(retrieved_chunks) > 0,
        )

    async def answer_with_image(
        self,
        query: str,
        session_id: uuid.UUID,
        image_data: bytes,
        media_type: str,
        db: AsyncSession,
    ) -> RAGResult:
        """
        Varian RAG yang menerima gambar sebagai input tambahan.
        Digunakan saat karyawan melampirkan foto mesin/error saat bertanya.

        Alur:
        1. Gemini Vision menganalisis gambar → menghasilkan deskripsi
        2. Deskripsi gambar + query digabung → dicari di ChromaDB
        3. Pipeline RAG normal berjalan dengan konteks yang diperkaya
        """
        logger.info(f"RAG with image query | session: {session_id}")

        # Langkah 1: Analisis gambar dengan Gemini Vision
        image_description = await llm_service.analyze_image(
            image_data=image_data,
            media_type=media_type,
            context=query,
        )
        logger.info(f"Image analyzed: {image_description[:100]}...")

        # Langkah 2: Gabungkan deskripsi gambar dengan query teks
        # Query gabungan ini lebih kaya konteks untuk pencarian di ChromaDB
        enriched_query = (
            f"{query}\n\n"
            f"[Deskripsi gambar yang dilampirkan user: {image_description}]"
        )

        # Langkah 3: Jalankan pipeline RAG normal dengan query yang diperkaya
        return await self.answer(
            query=enriched_query,
            session_id=session_id,
            db=db,
        )

    async def index_document_content(
        self,
        doc_id: str,
        title: str,
        content: str,
        collection_name: str,
        category: str | None = None,
    ) -> list[str]:
        """
        Wrapper untuk mengindeks konten dokumen teks ke ChromaDB.
        Dipanggil oleh documents router setelah file berhasil diupload & diparsing.
        """
        return await vector_service.index_document(
            doc_id=doc_id,
            title=title,
            content=content,
            collection_name=collection_name,
            category=category,
        )

    async def index_image_from_document(
        self,
        doc_id: str,
        image_id: str,
        image_data: bytes,
        media_type: str,
        collection_name: str,
        page_number: int | None = None,
        doc_title: str = "",
    ) -> tuple[str, str]:
        """
        Menganalisis gambar dari dokumen SOP dan mengindeks deskripsinya.
        Mengembalikan (description, chunk_id).
        """
        # Gemini Vision → deskripsi teks
        description = await llm_service.analyze_image(
            image_data=image_data,
            media_type=media_type,
            context=f"Ini adalah gambar dari dokumen SOP: {doc_title}",
        )

        # Deskripsi → embedding → ChromaDB
        chunk_id = await vector_service.index_image_description(
            doc_id=doc_id,
            image_id=image_id,
            description=description,
            collection_name=collection_name,
            page_number=page_number,
            title=doc_title,
        )

        return description, chunk_id


# Singleton instance
rag_service = RAGService()

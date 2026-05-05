# app/services/vector_service.py
# -------------------------------------------------------
# Cara kerja ChromaDB dalam konteks RAG:
#
# 1. Dokumen teks dipecah jadi potongan kecil (chunks)
# 2. Setiap chunk diubah jadi vektor angka (embedding)
#    oleh model embedding Gemini
# 3. Vektor disimpan di ChromaDB beserta teks aslinya
# 4. Saat user bertanya, pertanyaan juga diubah jadi vektor
# 5. ChromaDB mencari vektor yang paling "dekat" (similar)
# 6. Teks dari chunk yang mirip dikembalikan sebagai konteks
#
# Pencarian ini bukan keyword search — tapi pencarian MAKNA.
# "mesin mati total" bisa menemukan chunk yang berisi
# "unit tidak merespons dan layar gelap" karena maknanya mirip.
# -------------------------------------------------------

import logging
import uuid
from dataclasses import dataclass

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import settings

logger = logging.getLogger("deskmate.vector")


@dataclass
class RetrievedChunk:
    """Satu potongan dokumen yang ditemukan saat pencarian."""
    chunk_id: str
    doc_id: str
    title: str
    content: str
    page: int | None
    score: float          # Similarity score: 1.0 = identik, 0.0 = tidak relevan


class VectorService:
    """
    Service untuk semua operasi ChromaDB:
    - Menyimpan embeddings dokumen baru
    - Mencari dokumen relevan berdasarkan query
    - Menghapus embeddings dokumen yang dihapus/diperbarui
    """

    def __init__(self):
        # Inisialisasi ChromaDB client (persistent = data tersimpan ke disk)
        self._client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIRECTORY,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        # Model embedding dari Google — mengubah teks menjadi vektor 768 dimensi
        # Model ini sama yang dipakai saat indexing DAN saat query,
        # agar hasil pencarian konsisten
        self._embedding_model = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=settings.GEMINI_API_KEY,
            task_type="retrieval_document",  # Optimized untuk dokumen panjang
        )

        self._query_embedding_model = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=settings.GEMINI_API_KEY,
            task_type="retrieval_query",     # Optimized untuk query pendek
        )

        # Text splitter: memecah dokumen panjang menjadi chunk-chunk kecil
        # chunk_size    = maksimal karakter per chunk
        # chunk_overlap = tumpang tindih antar chunk untuk menjaga konteks
        #
        # Contoh dengan chunk_overlap=200:
        # Chunk 1: "...langkah 3 adalah menekan tombol A. Langkah 4..."
        # Chunk 2: "...Langkah 4 adalah menunggu 5 detik. Langkah 5..."
        # 200 karakter terakhir chunk 1 muncul lagi di awal chunk 2
        # Ini mencegah konteks penting "terpotong" di tengah chunk
        self._text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        logger.info(f"VectorService initialized. ChromaDB path: {settings.CHROMA_PERSIST_DIRECTORY}")

    def _get_or_create_collection(self, collection_name: str) -> chromadb.Collection:
        """
        Mendapatkan atau membuat collection ChromaDB.
        Collection = grup embeddings untuk satu dokumen atau satu kategori.
        Kita pakai satu collection per dokumen agar mudah dihapus per-dokumen.
        """
        return self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},  # Cosine similarity untuk teks
        )

    async def index_document(
        self,
        doc_id: str,
        title: str,
        content: str,
        collection_name: str,
        category: str | None = None,
        page_number: int | None = None,
    ) -> list[str]:
        """
        Memecah teks dokumen menjadi chunks, membuat embeddings,
        dan menyimpannya ke ChromaDB.

        Returns:
            List chunk_id yang berhasil disimpan
        """
        logger.info(f"Indexing document: {title} ({doc_id})")

        # Langkah 1: Pecah teks menjadi chunks
        chunks = self._text_splitter.split_text(content)
        if not chunks:
            logger.warning(f"Document {doc_id} menghasilkan 0 chunks, dilewati.")
            return []

        logger.info(f"  Dokumen dipecah menjadi {len(chunks)} chunks")

        # Langkah 2: Buat embedding untuk semua chunks sekaligus (batch)
        # Lebih efisien daripada embed satu per satu
        embeddings = await self._embedding_model.aembed_documents(chunks)

        # Langkah 3: Siapkan data untuk disimpan ke ChromaDB
        chunk_ids = []
        documents = []
        metadatas = []
        ids = []

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_id = f"{doc_id}_chunk_{i}"
            chunk_ids.append(chunk_id)
            ids.append(chunk_id)
            documents.append(chunk)
            metadatas.append({
                "doc_id": doc_id,
                "title": title,
                "category": category or "general",
                "chunk_index": i,
                "total_chunks": len(chunks),
                "page_number": page_number or 0,
            })

        # Langkah 4: Simpan ke ChromaDB
        collection = self._get_or_create_collection(collection_name)
        collection.upsert(   # upsert = insert atau update jika sudah ada
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        logger.info(f"  ✅ {len(chunk_ids)} chunks berhasil diindeks untuk: {title}")
        return chunk_ids

    async def index_image_description(
        self,
        doc_id: str,
        image_id: str,
        description: str,
        collection_name: str,
        page_number: int | None = None,
        title: str = "",
    ) -> str:
        """
        Mengindeks deskripsi gambar (hasil analisis Gemini Vision) ke ChromaDB.
        Deskripsi gambar diperlakukan seperti chunk teks biasa.

        Returns:
            chunk_id yang disimpan
        """
        chunk_id = f"img_{image_id}"
        embedding = await self._embedding_model.aembed_documents([description])

        collection = self._get_or_create_collection(collection_name)
        collection.upsert(
            ids=[chunk_id],
            documents=[description],
            embeddings=embedding,
            metadatas=[{
                "doc_id": doc_id,
                "image_id": image_id,
                "title": title,
                "is_image": True,
                "page_number": page_number or 0,
                "category": "image_description",
            }],
        )

        logger.info(f"  ✅ Deskripsi gambar {image_id} berhasil diindeks")
        return chunk_id

    async def search(
        self,
        query: str,
        collection_names: list[str],
        top_k: int = 5,
        score_threshold: float = 0.4,
    ) -> list[RetrievedChunk]:
        """
        Mencari chunks paling relevan dari satu atau beberapa collection.

        Args:
            query           : Pertanyaan dari user
            collection_names: Collection mana saja yang dicari
            top_k           : Jumlah hasil terbaik yang dikembalikan
            score_threshold : Minimal similarity score (0.0-1.0).
                              Chunk dengan score di bawah ini dibuang.

        Returns:
            List RetrievedChunk, diurutkan dari paling relevan
        """
        if not collection_names:
            return []

        # Buat embedding dari query user
        query_embedding = await self._query_embedding_model.aembed_query(query)

        all_results: list[RetrievedChunk] = []

        for col_name in collection_names:
            try:
                collection = self._client.get_collection(col_name)
            except Exception:
                # Collection belum ada (dokumen belum diindeks), lewati
                logger.warning(f"Collection '{col_name}' tidak ditemukan, dilewati.")
                continue

            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k, collection.count()),
                include=["documents", "metadatas", "distances"],
            )

            if not results["ids"] or not results["ids"][0]:
                continue

            for i, chunk_id in enumerate(results["ids"][0]):
                # ChromaDB mengembalikan "distance", bukan "similarity"
                # distance = 0 berarti identik, distance = 1 berarti sangat berbeda
                # Kita konversi: similarity = 1 - distance
                distance = results["distances"][0][i]
                similarity = 1.0 - distance

                if similarity < score_threshold:
                    continue  # Buang hasil yang kurang relevan

                metadata = results["metadatas"][0][i]
                all_results.append(RetrievedChunk(
                    chunk_id=chunk_id,
                    doc_id=metadata.get("doc_id", ""),
                    title=metadata.get("title", ""),
                    content=results["documents"][0][i],
                    page=metadata.get("page_number") or None,
                    score=round(similarity, 4),
                ))

        # Urutkan dari yang paling relevan, ambil top_k terbaik
        all_results.sort(key=lambda x: x.score, reverse=True)
        return all_results[:top_k]

    async def delete_document(self, collection_name: str) -> bool:
        """
        Menghapus seluruh collection (semua chunks dari satu dokumen).
        Dipanggil saat dokumen dihapus atau diperbarui.
        """
        try:
            self._client.delete_collection(collection_name)
            logger.info(f"Collection '{collection_name}' berhasil dihapus.")
            return True
        except Exception as e:
            logger.error(f"Gagal menghapus collection '{collection_name}': {e}")
            return False

    def get_collection_stats(self, collection_name: str) -> dict:
        """Statistik collection untuk monitoring."""
        try:
            col = self._client.get_collection(collection_name)
            return {"name": collection_name, "count": col.count(), "exists": True}
        except Exception:
            return {"name": collection_name, "count": 0, "exists": False}


# Singleton instance — satu VectorService untuk seluruh aplikasi
# Ini penting agar koneksi ChromaDB tidak dibuat berulang kali
vector_service = VectorService()

# app/services/email_service.py
# -------------------------------------------------------
# Cara kerja:
# Menggunakan aiosmtplib (SMTP async) untuk mengirim email
# notifikasi tanpa memblokir event loop FastAPI.
#
# Setiap notifikasi punya template HTML sendiri.
# Semua pengiriman dicatat ke tabel email_logs untuk audit.
# -------------------------------------------------------

import logging
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.email_log import EmailLog

logger = logging.getLogger("deskmate.email")


# ── HTML Email Templates ───────────────────────────────────────────

def _template_ticket_created(ticket_number: str, title: str, priority: str) -> str:
    priority_color = {
        "low": "#3ecf8e", "medium": "#f9c74f",
        "high": "#f96060", "critical": "#ff3030"
    }.get(priority, "#c9d1e0")
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d0f14;color:#c9d1e0;border-radius:10px;overflow:hidden;">
      <div style="background:#13161e;padding:24px 28px;border-bottom:2px solid {priority_color};">
        <h2 style="margin:0;color:#eef2ff;font-size:18px;">🎫 Tiket Helpdesk Dibuat</h2>
      </div>
      <div style="padding:24px 28px;">
        <p>Tiket Anda telah berhasil dibuat dan sedang menunggu penanganan.</p>
        <div style="background:#1a1e29;border-radius:8px;padding:16px;margin:16px 0;">
          <div style="font-size:12px;color:#5a6478;font-family:monospace;">NOMOR TIKET</div>
          <div style="font-size:22px;color:#4f9cf9;font-family:monospace;font-weight:600;">{ticket_number}</div>
          <div style="margin-top:12px;font-size:12px;color:#5a6478;">JUDUL MASALAH</div>
          <div style="font-size:14px;color:#eef2ff;">{title}</div>
          <div style="margin-top:12px;font-size:12px;color:#5a6478;">PRIORITAS</div>
          <div style="font-size:13px;color:{priority_color};font-weight:600;text-transform:uppercase;">{priority}</div>
        </div>
        <p style="font-size:12px;color:#5a6478;">Tim kami akan segera menghubungi Anda. Pantau status tiket di aplikasi DeskMate.</p>
      </div>
      <div style="background:#13161e;padding:14px 28px;font-size:11px;color:#5a6478;text-align:center;">
        DeskMate — PT. Indonesia Epson Industry Internal Helpdesk
      </div>
    </div>"""


def _template_ticket_assigned(
    ticket_number: str, title: str, assignee_name: str
) -> str:
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d0f14;color:#c9d1e0;border-radius:10px;overflow:hidden;">
      <div style="background:#13161e;padding:24px 28px;border-bottom:2px solid #4f9cf9;">
        <h2 style="margin:0;color:#eef2ff;font-size:18px;">👷 Tiket Sedang Ditangani</h2>
      </div>
      <div style="padding:24px 28px;">
        <p>Kabar baik! Tiket Anda <strong style="color:#4f9cf9;">{ticket_number}</strong> kini sedang ditangani oleh tim kami.</p>
        <div style="background:#1a1e29;border-radius:8px;padding:16px;margin:16px 0;">
          <div style="font-size:12px;color:#5a6478;">DITANGANI OLEH</div>
          <div style="font-size:16px;color:#3ecf8e;font-weight:600;">👤 {assignee_name}</div>
          <div style="margin-top:12px;font-size:12px;color:#5a6478;">MASALAH</div>
          <div style="font-size:14px;color:#eef2ff;">{title}</div>
        </div>
        <p style="font-size:12px;color:#5a6478;">Anda akan mendapat notifikasi ketika masalah berhasil diselesaikan.</p>
      </div>
      <div style="background:#13161e;padding:14px 28px;font-size:11px;color:#5a6478;text-align:center;">
        DeskMate — PT. Indonesia Epson Industry Internal Helpdesk
      </div>
    </div>"""


def _template_ticket_resolved(
    ticket_number: str, title: str, resolved_by: str
) -> str:
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d0f14;color:#c9d1e0;border-radius:10px;overflow:hidden;">
      <div style="background:#13161e;padding:24px 28px;border-bottom:2px solid #3ecf8e;">
        <h2 style="margin:0;color:#eef2ff;font-size:18px;">✅ Tiket Berhasil Diselesaikan</h2>
      </div>
      <div style="padding:24px 28px;">
        <p>Masalah Anda telah diselesaikan. Terima kasih atas kesabaran Anda.</p>
        <div style="background:#1a1e29;border-radius:8px;padding:16px;margin:16px 0;">
          <div style="font-size:12px;color:#5a6478;">NOMOR TIKET</div>
          <div style="font-size:18px;color:#4f9cf9;font-family:monospace;font-weight:600;">{ticket_number}</div>
          <div style="margin-top:12px;font-size:12px;color:#5a6478;">MASALAH</div>
          <div style="font-size:14px;color:#eef2ff;">{title}</div>
          <div style="margin-top:12px;font-size:12px;color:#5a6478;">DISELESAIKAN OLEH</div>
          <div style="font-size:14px;color:#3ecf8e;font-weight:600;">{resolved_by}</div>
        </div>
        <p style="font-size:12px;color:#5a6478;">Jika masalah belum sepenuhnya terselesaikan, silakan buat tiket baru di aplikasi DeskMate.</p>
      </div>
      <div style="background:#13161e;padding:14px 28px;font-size:11px;color:#5a6478;text-align:center;">
        DeskMate — PT. Indonesia Epson Industry Internal Helpdesk
      </div>
    </div>"""


def _template_new_ticket_supervisor(
    ticket_number: str, title: str, creator_name: str,
    department: str, priority: str
) -> str:
    priority_color = {
        "low": "#3ecf8e", "medium": "#f9c74f",
        "high": "#f96060", "critical": "#ff3030"
    }.get(priority, "#c9d1e0")
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d0f14;color:#c9d1e0;border-radius:10px;overflow:hidden;">
      <div style="background:#13161e;padding:24px 28px;border-bottom:2px solid {priority_color};">
        <h2 style="margin:0;color:#eef2ff;font-size:18px;">🔔 Tiket Baru Masuk</h2>
      </div>
      <div style="padding:24px 28px;">
        <p>Ada tiket helpdesk baru yang membutuhkan penanganan Anda.</p>
        <div style="background:#1a1e29;border-radius:8px;padding:16px;margin:16px 0;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <div style="font-size:11px;color:#5a6478;">NOMOR TIKET</div>
              <div style="color:#4f9cf9;font-family:monospace;font-weight:600;">{ticket_number}</div>
            </div>
            <div>
              <div style="font-size:11px;color:#5a6478;">PRIORITAS</div>
              <div style="color:{priority_color};font-weight:600;text-transform:uppercase;">{priority}</div>
            </div>
            <div>
              <div style="font-size:11px;color:#5a6478;">DIBUAT OLEH</div>
              <div style="color:#eef2ff;">{creator_name}</div>
            </div>
            <div>
              <div style="font-size:11px;color:#5a6478;">DEPARTEMEN</div>
              <div style="color:#eef2ff;">{department}</div>
            </div>
          </div>
          <div style="margin-top:14px;">
            <div style="font-size:11px;color:#5a6478;">JUDUL MASALAH</div>
            <div style="color:#eef2ff;font-size:15px;font-weight:500;">{title}</div>
          </div>
        </div>
        <p style="font-size:12px;color:#5a6478;">Login ke DeskMate untuk mengambil dan menangani tiket ini.</p>
      </div>
      <div style="background:#13161e;padding:14px 28px;font-size:11px;color:#5a6478;text-align:center;">
        DeskMate — PT. Indonesia Epson Industry Internal Helpdesk
      </div>
    </div>"""


def _template_report(stats: dict, is_weekly: bool) -> str:
    team_rows = ""
    for agent in stats.get("team_performance", []):
        team_rows += f"""
        <tr>
          <td style="padding:10px;font-size:13px;border-bottom:1px solid #1a1e29;color:#eef2ff;text-align:left;">👤 {agent['name']}</td>
          <td style="padding:10px;font-size:13px;border-bottom:1px solid #1a1e29;color:#4f9cf9;text-align:center;font-weight:bold;">{agent['open']}</td>
          <td style="padding:10px;font-size:13px;border-bottom:1px solid #1a1e29;color:#3ecf8e;text-align:center;font-weight:bold;">{agent['resolved']}</td>
        </tr>
        """
        
    report_title = "Laporan Mingguan Helpdesk (Weekly Report)" if is_weekly else "Laporan Harian Helpdesk (Daily Report)"
    report_desc = "Rangkuman tren, SLA, dan penanganan tiket helpdesk mingguan" if is_weekly else "Rangkuman status tiket harian DeskMate"
    
    return f"""
    <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#0d0f14;color:#c9d1e0;border-radius:10px;overflow:hidden;">
      <div style="background:#13161e;padding:24px 28px;border-bottom:2px solid #003399;">
        <h2 style="margin:0;color:#eef2ff;font-size:18px;">📊 {report_title}</h2>
        <span style="font-size:11px;color:#5a6478;">{report_desc}</span>
      </div>
      <div style="padding:24px 28px;">
        <p style="margin-top:0;">Berikut adalah rangkuman performa bantuan IT helpdesk per tanggal <strong>{stats.get('date', 'hari ini')}</strong>:</p>
        
        <table style="width:100%;border-collapse:collapse;margin:16px 0;text-align:center;">
          <tr>
            <td style="width:50%;padding:10px;">
              <div style="background:#1a1e29;border-radius:8px;padding:12px;">
                <div style="font-size:10px;color:#5a6478;text-transform:uppercase;font-weight:bold;">Total Tiket Aktif</div>
                <div style="font-size:26px;color:#4f9cf9;font-weight:bold;margin-top:4px;">{stats.get('total_open', 0)}</div>
              </div>
            </td>
            <td style="width:50%;padding:10px;">
              <div style="background:#1a1e29;border-radius:8px;padding:12px;">
                <div style="font-size:10px;color:#5a6478;text-transform:uppercase;font-weight:bold;">Belum Ditugaskan</div>
                <div style="font-size:26px;color:#f9c74f;font-weight:bold;margin-top:4px;">{stats.get('unassigned', 0)}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:10px;">
              <div style="background:#1a1e29;border-radius:8px;padding:12px;">
                <div style="font-size:10px;color:#5a6478;text-transform:uppercase;font-weight:bold;">Tiket Kritis / High</div>
                <div style="font-size:26px;color:#f96060;font-weight:bold;margin-top:4px;">{stats.get('overdue', 0)}</div>
              </div>
            </td>
            <td style="padding:10px;">
              <div style="background:#1a1e29;border-radius:8px;padding:12px;">
                <div style="font-size:10px;color:#5a6478;text-transform:uppercase;font-weight:bold;">Avg Response Time</div>
                <div style="font-size:26px;color:#3ecf8e;font-weight:bold;margin-top:4px;">{stats.get('avg_response_time', '1.4h')}</div>
              </div>
            </td>
          </tr>
        </table>

        <h4 style="color:#eef2ff;margin-bottom:8px;border-bottom:1px solid #1c2333;padding-bottom:4px;">📈 Kepatuhan SLA Kategori</h4>
        <div style="background:#1a1e29;border-radius:8px;padding:14px;margin-bottom:20px;text-align:center;">
          <span style="font-size:12px;color:#3ecf8e;font-weight:bold;margin-right:15px;">Met SLA: {stats.get('sla', {}).get('met', 0)}%</span>
          <span style="font-size:12px;color:#f9c74f;font-weight:bold;margin-right:15px;">Near Breach: {stats.get('sla', {}).get('near_breach', 0)}%</span>
          <span style="font-size:12px;color:#f96060;font-weight:bold;">Breached: {stats.get('sla', {}).get('breached', 0)}%</span>
        </div>

        <h4 style="color:#eef2ff;margin-bottom:8px;border-bottom:1px solid #1c2333;padding-bottom:4px;">👥 Performa Agen Helpdesk</h4>
        <table style="width:100%;border-collapse:collapse;margin-top:8px;text-align:center;">
          <thead>
            <tr style="background:#13161e;">
              <th style="padding:10px;font-size:11px;color:#5a6478;text-align:left;text-transform:uppercase;">Nama Agen</th>
              <th style="padding:10px;font-size:11px;color:#5a6478;text-align:center;text-transform:uppercase;">Open</th>
              <th style="padding:10px;font-size:11px;color:#5a6478;text-align:center;text-transform:uppercase;">Resolved</th>
            </tr>
          </thead>
          <tbody>
            {team_rows or '<tr><td colspan="3" style="padding:10px;font-size:12px;text-align:center;color:#5a6478;">Tidak ada agen aktif</td></tr>'}
          </tbody>
        </table>
        
        <p style="font-size:12px;color:#5a6478;margin-top:24px;">Silakan login ke aplikasi DeskMate untuk melihat laporan detail operasional pabrik.</p>
      </div>
      <div style="background:#13161e;padding:14px 28px;font-size:11px;color:#5a6478;text-align:center;">
        DeskMate — PT. Indonesia Epson Industry Internal Helpdesk
      </div>
    </div>"""


# ── Core Email Sender ──────────────────────────────────────────────

class EmailService:
    """Service pengiriman email via SMTP async."""

    async def _send(
        self,
        to_email: str,
        subject: str,
        html_body: str,
    ) -> bool:
        """
        Mengirim satu email via SMTP.
        Mengembalikan True jika berhasil, False jika gagal.
        """
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning("SMTP credentials belum dikonfigurasi. Email tidak dikirim.")
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = settings.EMAIL_FROM
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
            logger.info(f"✅ Email terkirim ke {to_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"❌ Gagal kirim email ke {to_email}: {e}")
            return False

    async def _send_and_log(
        self,
        db: AsyncSession,
        to_email: str,
        subject: str,
        html_body: str,
        template_name: str,
        recipient_id: str | None = None,
    ) -> None:
        """
        Mengirim email DAN mencatat hasilnya ke tabel email_logs.
        Selalu dipanggil dengan db session agar log tersimpan.
        """
        import uuid
        success = await self._send(to_email, subject, html_body)

        log = EmailLog(
            recipient_id=uuid.UUID(recipient_id) if recipient_id else None,
            recipient_email=to_email,
            subject=subject,
            template_name=template_name,
            status="sent" if success else "failed",
            sent_at=datetime.now(timezone.utc) if success else None,
            error_message=None if success else "SMTP delivery failed",
        )
        db.add(log)

    # ── Public notification methods ────────────────────────────────

    async def notify_ticket_created(
        self,
        db: AsyncSession,
        to_email: str,
        recipient_id: str,
        ticket_number: str,
        title: str,
        priority: str,
    ) -> None:
        """Kirim konfirmasi ke karyawan bahwa tiketnya berhasil dibuat."""
        await self._send_and_log(
            db=db,
            to_email=to_email,
            subject=f"[DeskMate] Tiket {ticket_number} Berhasil Dibuat",
            html_body=_template_ticket_created(ticket_number, title, priority),
            template_name="ticket_created",
            recipient_id=recipient_id,
        )

    async def notify_supervisor_new_ticket(
        self,
        db: AsyncSession,
        supervisor_email: str,
        ticket_number: str,
        title: str,
        creator_name: str,
        department: str,
        priority: str,
    ) -> None:
        """Kirim notifikasi ke supervisor bahwa ada tiket baru."""
        await self._send_and_log(
            db=db,
            to_email=supervisor_email,
            subject=f"[DeskMate] Tiket Baru: {ticket_number} ({priority.upper()})",
            html_body=_template_new_ticket_supervisor(
                ticket_number, title, creator_name, department, priority
            ),
            template_name="ticket_new_supervisor",
        )

    async def notify_ticket_assigned(
        self,
        db: AsyncSession,
        to_email: str,
        recipient_id: str,
        ticket_number: str,
        title: str,
        assignee_name: str,
    ) -> None:
        """Kirim notifikasi ke karyawan bahwa tiketnya sudah diambil supervisor."""
        await self._send_and_log(
            db=db,
            to_email=to_email,
            subject=f"[DeskMate] Tiket {ticket_number} Sedang Ditangani",
            html_body=_template_ticket_assigned(ticket_number, title, assignee_name),
            template_name="ticket_assigned",
            recipient_id=recipient_id,
        )

    async def notify_ticket_resolved(
        self,
        db: AsyncSession,
        to_email: str,
        recipient_id: str,
        ticket_number: str,
        title: str,
        resolved_by: str,
    ) -> None:
        """Kirim notifikasi ke karyawan bahwa tiketnya sudah diselesaikan."""
        await self._send_and_log(
            db=db,
            to_email=to_email,
            subject=f"[DeskMate] Tiket {ticket_number} Berhasil Diselesaikan ✅",
            html_body=_template_ticket_resolved(ticket_number, title, resolved_by),
            template_name="ticket_resolved",
            recipient_id=recipient_id,
        )

    async def send_daily_report(
        self,
        db: AsyncSession,
        to_email: str,
        stats: dict,
    ) -> None:
        """Kirim Laporan Harian (Daily Report) ke Supervisor/Admin."""
        await self._send_and_log(
            db=db,
            to_email=to_email,
            subject=f"[DeskMate] Daily Report Helpdesk — {stats.get('date', '')}",
            html_body=_template_report(stats, is_weekly=False),
            template_name="daily_report",
        )

    async def send_weekly_report(
        self,
        db: AsyncSession,
        to_email: str,
        stats: dict,
    ) -> None:
        """Kirim Laporan Mingguan (Weekly Report) ke Supervisor/Admin."""
        await self._send_and_log(
            db=db,
            to_email=to_email,
            subject=f"[DeskMate] Weekly Report Helpdesk — {stats.get('date', '')}",
            html_body=_template_report(stats, is_weekly=True),
            template_name="weekly_report",
        )

    async def send_custom_message(
        self,
        db: AsyncSession,
        to_email: str,
        recipient_id: str,
        subject: str,
        content: str,
        sender_name: str,
    ) -> None:
        """Kirim pesan kustom dari admin ke karyawan."""
        html_body = f"""
        <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d0f14;color:#c9d1e0;border-radius:10px;overflow:hidden;border:1px solid #1f2937;">
          <div style="background:#13161e;padding:24px 28px;border-bottom:2px solid #003399;">
            <h2 style="margin:0;color:#eef2ff;font-size:18px;">✉️ Pesan IT Helpdesk</h2>
          </div>
          <div style="padding:24px 28px;">
            <p>Halo,</p>
            <p>Anda menerima pesan penting dari administrator IT Helpdesk <strong>{sender_name}</strong>:</p>
            <div style="background:#1a1e29;border-radius:8px;padding:16px;margin:16px 0;line-height:1.6;color:#eef2ff;font-size:14px;white-space:pre-wrap;border:1px solid #374151;">
{content}
            </div>
            <p style="font-size:12px;color:#5a6478;">Silakan balas pesan ini langsung via email atau hubungi tim IT Support di internal.</p>
          </div>
          <div style="background:#13161e;padding:14px 28px;font-size:11px;color:#5a6478;text-align:center;">
            DeskMate — PT. Indonesia Epson Industry Internal Helpdesk
          </div>
        </div>"""
        await self._send_and_log(
            db=db,
            to_email=to_email,
            subject=f"[DeskMate] {subject}",
            html_body=html_body,
            template_name="custom_message",
            recipient_id=recipient_id,
        )


# Singleton instance
email_service = EmailService()

"""
Email Service — sends transactional emails via Resend (https://resend.com).

Render blocks outbound SMTP, so we use the Resend HTTP API (port 443) instead.
Set RESEND_API_KEY in your environment; RESEND_FROM_EMAIL defaults to
noreply@grimr.dev (requires grimr.dev to be verified in the Resend dashboard).
"""
import resend
import secrets
from app.config.settings import settings


class EmailService:
    """Service for sending emails via Resend"""

    @staticmethod
    def _client() -> None:
        """Configure the Resend SDK with the API key."""
        resend.api_key = settings.RESEND_API_KEY

    # ------------------------------------------------------------------ #
    # Token helpers                                                        #
    # ------------------------------------------------------------------ #

    @staticmethod
    def generate_verification_token() -> str:
        """Generate a secure verification token."""
        return secrets.token_urlsafe(32)

    # ------------------------------------------------------------------ #
    # Public send methods                                                  #
    # ------------------------------------------------------------------ #

    @staticmethod
    async def send_verification_email(email: str, token: str, handle: str):
        """Send an email-verification link to a newly registered user."""
        if not settings.RESEND_API_KEY:
            print(f"📧 [DEV MODE] Verification email for {email}")
            print(f"   Token: {token}")
            print(f"   Link: {settings.FRONTEND_URL}/auth/verify-email?token={token}")
            return

        verification_link = f"{settings.FRONTEND_URL}/auth/verify-email?token={token}"
        subject = "Verify your Grimr account"

        html = EmailService._base_layout(f"""
            <h1 style="color:#8D021F;font-family:Georgia,serif;text-align:center;">
                Welcome to Grimr
            </h1>
            <p style="color:#EAEAEA;font-size:16px;">Hey {handle},</p>
            <p style="color:#888888;font-size:14px;">
                Thanks for joining the Metal community! Before you can start discovering
                compatible Metalheads, we need to verify your email address.
            </p>
            <div style="text-align:center;margin:30px 0;">
                <a href="{verification_link}"
                   style="background-color:#8D021F;color:#F9F9F9;padding:15px 40px;
                          text-decoration:none;border-radius:4px;font-weight:bold;
                          display:inline-block;">
                    Verify Email
                </a>
            </div>
            <p style="color:#888888;font-size:12px;">
                Or copy and paste this link:<br>
                <span style="color:#8D021F;">{verification_link}</span>
            </p>
            <p style="color:#888888;font-size:12px;margin-top:30px;">
                This link will expire in 24 hours. If you didn't create an account,
                you can safely ignore this email.
            </p>
        """)

        text = (
            f"Welcome to Grimr, {handle}!\n\n"
            f"Verify your email:\n{verification_link}\n\n"
            f"Link expires in 24 hours.\n\n---\nGrimr - Metalheads Connect"
        )

        EmailService._send(email, subject, html, text)

    @staticmethod
    async def send_register_collision_email(email: str, handle: str):
        """
        Notify an existing user that someone tried to register with their email.
        Prevents account-enumeration via the registration endpoint.
        """
        if not settings.RESEND_API_KEY:
            print(f"📧 [DEV MODE] Register-collision email for {email} (handle: {handle})")
            return

        login_link = f"{settings.FRONTEND_URL}/auth/login"
        reset_link = f"{settings.FRONTEND_URL}/auth/reset-password"
        subject = "Someone tried to register with your Grimr email"

        html = EmailService._base_layout(f"""
            <h1 style="color:#8D021F;font-family:Georgia,serif;text-align:center;">
                Account already exists
            </h1>
            <p style="color:#EAEAEA;font-size:16px;">Hey {handle},</p>
            <p style="color:#888888;font-size:14px;">
                Someone just tried to create a new Grimr account with this email address,
                but you already have one. If that was you, sign in or reset your password.
            </p>
            <div style="text-align:center;margin:30px 0;">
                <a href="{login_link}"
                   style="background-color:#8D021F;color:#F9F9F9;padding:15px 40px;
                          text-decoration:none;border-radius:4px;font-weight:bold;
                          display:inline-block;margin-right:8px;">
                    Sign in
                </a>
                <a href="{reset_link}"
                   style="background-color:transparent;color:#EAEAEA;padding:15px 40px;
                          text-decoration:none;border-radius:4px;font-weight:bold;
                          display:inline-block;border:1px solid #333333;">
                    Reset password
                </a>
            </div>
            <p style="color:#888888;font-size:12px;margin-top:30px;">
                If this wasn't you, no action is needed — we did not create a new account
                and your existing one is unchanged.
            </p>
        """)

        text = (
            f"Hey {handle},\n\n"
            f"Someone tried to register with your email.\n\n"
            f"Sign in:        {login_link}\n"
            f"Reset password: {reset_link}\n\n"
            f"If this wasn't you, ignore this email.\n\n---\nGrimr - Metalheads Connect"
        )

        EmailService._send(email, subject, html, text)

    @staticmethod
    async def send_password_reset_email(email: str, token: str, handle: str):
        """Send a password-reset link."""
        if not settings.RESEND_API_KEY:
            print(f"📧 [DEV MODE] Password reset email for {email}")
            print(f"   Token: {token}")
            print(f"   Link: {settings.FRONTEND_URL}/auth/reset-password/confirm?token={token}")
            return

        reset_link = f"{settings.FRONTEND_URL}/auth/reset-password/confirm?token={token}"
        subject = "Reset your Grimr password"

        html = EmailService._base_layout(f"""
            <h1 style="color:#8D021F;font-family:Georgia,serif;text-align:center;">
                Password Reset
            </h1>
            <p style="color:#EAEAEA;font-size:16px;">Hey {handle},</p>
            <p style="color:#888888;font-size:14px;">
                We received a request to reset your password. Click the button below
                to create a new password.
            </p>
            <div style="text-align:center;margin:30px 0;">
                <a href="{reset_link}"
                   style="background-color:#8D021F;color:#F9F9F9;padding:15px 40px;
                          text-decoration:none;border-radius:4px;font-weight:bold;
                          display:inline-block;">
                    Reset Password
                </a>
            </div>
            <p style="color:#888888;font-size:12px;">
                Or copy and paste this link:<br>
                <span style="color:#8D021F;">{reset_link}</span>
            </p>
            <p style="color:#888888;font-size:12px;margin-top:30px;">
                This link will expire in 1 hour. If you didn't request a reset,
                you can safely ignore this email.
            </p>
        """)

        text = (
            f"Hey {handle},\n\n"
            f"Reset your password:\n{reset_link}\n\n"
            f"Link expires in 1 hour.\n\n---\nGrimr - Metalheads Connect"
        )

        EmailService._send(email, subject, html, text)

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _base_layout(body_html: str) -> str:
        """Wrap content in the standard Grimr dark-theme email shell."""
        return f"""
        <html>
        <body style="background-color:#0A0A0A;color:#EAEAEA;font-family:Arial,sans-serif;padding:20px;">
            <div style="max-width:600px;margin:0 auto;background-color:#1C1C1E;
                        border:1px solid #333333;border-radius:8px;padding:40px;">
                {body_html}
                <hr style="border:none;border-top:1px solid #333333;margin:30px 0;">
                <p style="color:#666666;font-size:11px;text-align:center;">
                    Grimr - Metalheads Connect
                </p>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def _send(to_email: str, subject: str, html: str, text: str) -> None:
        """Send via the Resend API (synchronous HTTP call)."""
        EmailService._client()
        try:
            resend.Emails.send({
                "from": settings.RESEND_FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html,
                "text": text,
            })
            print(f"✅ Email sent to {to_email}")
        except Exception as e:
            print(f"❌ Failed to send email to {to_email}: {e}")
            raise

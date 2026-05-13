"""
Email Service for sending verification and notification emails
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config.settings import settings
import secrets
from datetime import datetime, timedelta


class EmailService:
    """Service for sending emails"""
    
    @staticmethod
    def generate_verification_token() -> str:
        """Generate a secure verification token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    async def send_verification_email(email: str, token: str, handle: str):
        """
        Send email verification link
        
        Args:
            email: User's email address
            token: Verification token
            handle: User's handle
        """
        if not settings.SMTP_ENABLED:
            print(f"📧 [DEV MODE] Verification email for {email}")
            print(f"   Token: {token}")
            print(f"   Link: {settings.FRONTEND_URL}/auth/verify?token={token}")
            return
        
        subject = "Verify your Grimr account"
        verification_link = f"{settings.FRONTEND_URL}/auth/verify?token={token}"
        
        html_content = f"""
        <html>
        <body style="background-color: #0A0A0A; color: #EAEAEA; font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1C1C1E; border: 1px solid #333333; border-radius: 8px; padding: 40px;">
                <h1 style="color: #8D021F; font-family: Georgia, serif; text-align: center;">
                    Welcome to Grimr
                </h1>
                <p style="color: #EAEAEA; font-size: 16px;">
                    Hey {handle},
                </p>
                <p style="color: #888888; font-size: 14px;">
                    Thanks for joining the Metal community! Before you can start discovering compatible Metalheads, 
                    we need to verify your email address.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_link}" 
                       style="background-color: #8D021F; color: #F9F9F9; padding: 15px 40px; 
                              text-decoration: none; border-radius: 4px; font-weight: bold; 
                              display: inline-block;">
                        Verify Email
                    </a>
                </div>
                <p style="color: #888888; font-size: 12px;">
                    Or copy and paste this link into your browser:<br>
                    <span style="color: #8D021F;">{verification_link}</span>
                </p>
                <p style="color: #888888; font-size: 12px; margin-top: 30px;">
                    This link will expire in 24 hours. If you didn't create an account, 
                    you can safely ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #333333; margin: 30px 0;">
                <p style="color: #666666; font-size: 11px; text-align: center;">
                    Grimr - Metalheads Connect<br>
                    Letterboxd meets Bandcamp for Metal
                </p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Welcome to Grimr, {handle}!
        
        Thanks for joining the Metal community! Please verify your email address by clicking the link below:
        
        {verification_link}
        
        This link will expire in 24 hours.
        
        If you didn't create an account, you can safely ignore this email.
        
        ---
        Grimr - Metalheads Connect
        """
        
        await EmailService._send_email(email, subject, html_content, text_content)
    
    @staticmethod
    async def send_register_collision_email(email: str, handle: str):
        """
        Notify a user that someone tried to register with their email.

        Sent in place of the old "Email already registered" 400 response so
        the registration endpoint cannot be used to enumerate accounts. The
        legitimate owner learns out-of-band that a registration attempt was
        made; an attacker without inbox access learns nothing.

        Args:
            email: User's email address (the address that was already registered)
            handle: Handle of the existing account
        """
        if not settings.SMTP_ENABLED:
            print(f"📧 [DEV MODE] Register-collision email for {email}")
            print(f"   Existing handle: {handle}")
            return

        subject = "Someone tried to register with your Grimr email"
        login_link = f"{settings.FRONTEND_URL}/auth/login"
        reset_link = f"{settings.FRONTEND_URL}/auth/reset-password"

        html_content = f"""
        <html>
        <body style="background-color: #0A0A0A; color: #EAEAEA; font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1C1C1E; border: 1px solid #333333; border-radius: 8px; padding: 40px;">
                <h1 style="color: #8D021F; font-family: Georgia, serif; text-align: center;">
                    Account already exists
                </h1>
                <p style="color: #EAEAEA; font-size: 16px;">
                    Hey {handle},
                </p>
                <p style="color: #888888; font-size: 14px;">
                    Someone just tried to create a new Grimr account with this email address,
                    but you already have one. If that was you, you can sign in below — or
                    reset your password if you've forgotten it.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{login_link}"
                       style="background-color: #8D021F; color: #F9F9F9; padding: 15px 40px;
                              text-decoration: none; border-radius: 4px; font-weight: bold;
                              display: inline-block; margin-right: 8px;">
                        Sign in
                    </a>
                    <a href="{reset_link}"
                       style="background-color: transparent; color: #EAEAEA; padding: 15px 40px;
                              text-decoration: none; border-radius: 4px; font-weight: bold;
                              display: inline-block; border: 1px solid #333333;">
                        Reset password
                    </a>
                </div>
                <p style="color: #888888; font-size: 12px; margin-top: 30px;">
                    If this wasn't you, no action is needed — we did not create a new account
                    and your existing one is unchanged.
                </p>
                <hr style="border: none; border-top: 1px solid #333333; margin: 30px 0;">
                <p style="color: #666666; font-size: 11px; text-align: center;">
                    Grimr - Metalheads Connect
                </p>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Hey {handle},

        Someone just tried to create a new Grimr account with this email address,
        but you already have one.

        If that was you:
          - Sign in:        {login_link}
          - Reset password: {reset_link}

        If this wasn't you, no action is needed — we did not create a new account
        and your existing one is unchanged.

        ---
        Grimr - Metalheads Connect
        """

        await EmailService._send_email(email, subject, html_content, text_content)

    @staticmethod
    async def send_password_reset_email(email: str, token: str, handle: str):
        """
        Send password reset link
        
        Args:
            email: User's email address
            token: Reset token
            handle: User's handle
        """
        if not settings.SMTP_ENABLED:
            print(f"📧 [DEV MODE] Password reset email for {email}")
            print(f"   Token: {token}")
            print(f"   Link: {settings.FRONTEND_URL}/auth/reset-password?token={token}")
            return
        
        subject = "Reset your Grimr password"
        reset_link = f"{settings.FRONTEND_URL}/auth/reset-password?token={token}"
        
        html_content = f"""
        <html>
        <body style="background-color: #0A0A0A; color: #EAEAEA; font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1C1C1E; border: 1px solid #333333; border-radius: 8px; padding: 40px;">
                <h1 style="color: #8D021F; font-family: Georgia, serif; text-align: center;">
                    Password Reset
                </h1>
                <p style="color: #EAEAEA; font-size: 16px;">
                    Hey {handle},
                </p>
                <p style="color: #888888; font-size: 14px;">
                    We received a request to reset your password. Click the button below to create a new password:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #8D021F; color: #F9F9F9; padding: 15px 40px; 
                              text-decoration: none; border-radius: 4px; font-weight: bold; 
                              display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #888888; font-size: 12px;">
                    Or copy and paste this link into your browser:<br>
                    <span style="color: #8D021F;">{reset_link}</span>
                </p>
                <p style="color: #888888; font-size: 12px; margin-top: 30px;">
                    This link will expire in 1 hour. If you didn't request a password reset, 
                    you can safely ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #333333; margin: 30px 0;">
                <p style="color: #666666; font-size: 11px; text-align: center;">
                    Grimr - Metalheads Connect
                </p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Password Reset Request
        
        Hey {handle},
        
        We received a request to reset your password. Click the link below to create a new password:
        
        {reset_link}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, you can safely ignore this email.
        
        ---
        Grimr - Metalheads Connect
        """
        
        await EmailService._send_email(email, subject, html_content, text_content)
    
    @staticmethod
    async def _send_email(to_email: str, subject: str, html_content: str, text_content: str):
        """
        Internal method to send email via SMTP
        
        Args:
            to_email: Recipient email
            subject: Email subject
            html_content: HTML version of email
            text_content: Plain text version of email
        """
        message = MIMEMultipart("alternative")
        message["From"] = settings.SMTP_FROM_EMAIL
        message["To"] = to_email
        message["Subject"] = subject
        
        # Attach both plain text and HTML versions
        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        message.attach(part1)
        message.attach(part2)
        
        try:
            # Port 587 uses STARTTLS (start_tls=True).
            # Port 465 uses implicit TLS (use_tls=True).
            # Gmail standard is 587 + STARTTLS — do not mix them up.
            use_implicit_tls = settings.SMTP_PORT == 465
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USERNAME,
                password=settings.SMTP_PASSWORD,
                use_tls=use_implicit_tls,
                start_tls=not use_implicit_tls,
            )
            print(f"✅ Email sent to {to_email}")
        except Exception as e:
            print(f"❌ Failed to send email to {to_email}: {e}")
            raise


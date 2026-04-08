// src/services/email.service.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Forcer l'utilisation d'IPv4 pour éviter les problèmes ENETUNREACH
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            // ⬇️ Force IPv4 pour contourner les blocages IPv6 (Render, etc.)
            connectionTimeout: 10000,
            socketTimeout: 10000,
            family: 4, // ← clé importante
        });
    }

    // ── OTP de connexion (2FA obligatoire) ────────────────────
    async sendOtpEmail(to, otpCode, name) {
        await this.transporter.sendMail({
            from: `"NextLearn Saint-Jean" <${process.env.SMTP_USER}>`,
            to,
            subject: `🔐 ${otpCode} — Votre code de connexion NextLearn`,
            html: this._otpTemplate({ name, otpCode })
        });
    }

    // ── Vérification email à l'inscription ────────────────────
    async sendVerificationEmail(to, token, name) {
        const verifyUrl = `${process.env.APP_URL || 'https://nextlearn-api-v1.onrender.com'}/api/auth/verify-email/${token}`;
        await this.transporter.sendMail({
            from: `"NextLearn Saint-Jean" <${process.env.SMTP_USER}>`,
            to,
            subject: 'Activez votre compte NextLearn',
            html: this._template({
                title: 'Activez votre compte',
                name,
                body: `Merci de rejoindre <strong>NextLearn</strong>, la bibliothèque académique de Saint-Jean. Cliquez ci-dessous pour activer votre compte.`,
                btnText: 'Activer mon compte',
                btnUrl: verifyUrl,
                note: 'Ce lien expire dans 24 heures.'
            })
        });
    }

    // ── Réinitialisation de mot de passe ──────────────────────
    async sendPasswordResetEmail(to, token, name) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8100'}/auth/login?token=${token}`;
        await this.transporter.sendMail({
            from: `"NextLearn Saint-Jean" <${process.env.SMTP_USER}>`,
            to,
            subject: 'Réinitialisation de votre mot de passe — NextLearn',
            html: this._template({
                title: 'Réinitialiser votre mot de passe',
                name,
                body: `Vous avez demandé la réinitialisation de votre mot de passe NextLearn. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.`,
                btnText: 'Réinitialiser mon mot de passe',
                btnUrl: resetUrl,
                note: 'Ce lien expire dans 1 heure. Si vous n\'avez pas fait cette demande, ignorez cet email et votre compte reste sécurisé.'
            })
        });
    }

    // ── Template OTP ──────────────────────────────────────────
    _otpTemplate({ name, otpCode }) {
        const digits = otpCode.split('');
        const digitBoxes = digits.map(d =>
            `<span style="display:inline-block;width:40px;height:52px;line-height:52px;text-align:center;background:#f1f5f9;border:2px solid #e2e8f0;border-radius:10px;font-size:1.6rem;font-weight:900;color:#1a497d;font-family:monospace;margin:0 3px;">${d}</span>`
        ).join('');

        return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">

    <div style="background:linear-gradient(135deg,#0d2b4e 0%,#1a497d 60%,#2d7dd2 100%);padding:32px;text-align:center;">
      <div style="width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
        <span style="font-size:28px;">🔐</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:1.4rem;font-weight:800;">NextLearn</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:0.82rem;">Code de vérification</p>
    </div>

    <div style="padding:32px 28px 24px;">
      <p style="margin:0 0 6px;color:#334155;font-size:0.95rem;">Bonjour <strong>${name}</strong>,</p>
      <p style="margin:0 0 28px;color:#475569;font-size:0.88rem;line-height:1.6;">
        Voici votre code de vérification pour vous connecter à <strong>NextLearn</strong>.
        Entrez ce code dans l'application pour finaliser votre connexion.
      </p>

      <div style="text-align:center;margin-bottom:10px;">
        ${digitBoxes}
      </div>
      <p style="text-align:center;margin:8px 0 24px;font-size:0.8rem;color:#ef4444;font-weight:600;">
        ⏱ Ce code expire dans <strong>10 minutes</strong>
      </p>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px 16px;">
        <p style="margin:0;color:#9a3412;font-size:0.78rem;line-height:1.5;">
          ⚠️ <strong>Ne partagez jamais ce code.</strong> NextLearn ne vous le demandera jamais par téléphone ou email.
          Si vous n'avez pas tenté de connexion, changez immédiatement votre mot de passe.
        </p>
      </div>
    </div>

    <div style="background:#f8fafc;padding:14px 28px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:0.72rem;">© ${new Date().getFullYear()} NextLearn · Saint-Jean Ingénieur & Management</p>
    </div>
  </div>
</body>
</html>`;
    }

    // ── Template générique (bouton) ───────────────────────────
    _template({ title, name, body, btnText, btnUrl, note }) {
        return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">

    <div style="background:linear-gradient(135deg,#0d2b4e 0%,#1a497d 60%,#2d7dd2 100%);padding:32px;text-align:center;">
      <div style="width:60px;height:60px;border-radius:16px;background:rgba(255,255,255,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
        <span style="font-size:28px;">📚</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:1.4rem;font-weight:800;">NextLearn</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:0.82rem;">Saint-Jean Ingénieur & Management</p>
    </div>

    <div style="padding:32px 28px 24px;">
      <h2 style="margin:0 0 14px;color:#1a497d;font-size:1.15rem;font-weight:700;">${title}</h2>
      <p style="margin:0 0 6px;color:#334155;font-size:0.95rem;">Bonjour <strong>${name}</strong>,</p>
      <p style="margin:0 0 28px;color:#475569;font-size:0.88rem;line-height:1.65;">${body}</p>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${btnUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a497d,#2d7dd2);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:0.92rem;box-shadow:0 4px 16px rgba(26,73,125,0.3);">
          ${btnText}
        </a>
      </div>
      <p style="margin:0;color:#94a3b8;font-size:0.76rem;text-align:center;">${note}</p>
    </div>

    <div style="background:#f8fafc;padding:14px 28px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:0.72rem;">© ${new Date().getFullYear()} NextLearn · Saint-Jean Ingénieur & Management</p>
    </div>
  </div>
</body>
</html>`;
    }
}

module.exports = new EmailService();
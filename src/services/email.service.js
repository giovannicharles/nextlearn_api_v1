// src/services/email.service.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendVerificationEmail(to, token, name) {
        const verifyUrl = `${process.env.APP_URL || 'https://nextlearn-api.onrender.com'}/api/auth/verify-email/${token}`;

        await this.transporter.sendMail({
            from: `"NextLearn Saint-Jean" <${process.env.SMTP_USER}>`,
            to,
            subject: 'Vérifiez votre email — NextLearn',
            html: this._template({
                title: 'Vérifiez votre email',
                name,
                body: `Merci de vous être inscrit sur <strong>NextLearn</strong>. Cliquez sur le bouton ci-dessous pour activer votre compte.`,
                btnText: 'Activer mon compte',
                btnUrl: verifyUrl,
                note: 'Ce lien expire dans 24 heures.'
            })
        });
    }

    async sendPasswordResetEmail(to, token, name) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8100'}/auth/reset-password?token=${token}`;

        await this.transporter.sendMail({
            from: `"NextLearn Saint-Jean" <${process.env.SMTP_USER}>`,
            to,
            subject: 'Réinitialisation de mot de passe — NextLearn',
            html: this._template({
                title: 'Réinitialiser votre mot de passe',
                name,
                body: `Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.`,
                btnText: 'Réinitialiser mon mot de passe',
                btnUrl: resetUrl,
                note: 'Ce lien expire dans 1 heure. Si vous n\'avez pas fait cette demande, ignorez cet email.'
            })
        });
    }

    _template({ title, name, body, btnText, btnUrl, note }) {
        return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d2b4e,#1a497d);padding:36px 32px;text-align:center;">
      <div style="width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:32px;">📚</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:1.5rem;font-weight:800;letter-spacing:-0.5px;">NextLearn</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.65);font-size:0.85rem;">Saint-Jean Ingénieur & Management</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 32px 24px;">
      <h2 style="margin:0 0 16px;color:#1a497d;font-size:1.25rem;font-weight:700;">${title}</h2>
      <p style="margin:0 0 8px;color:#334155;font-size:0.95rem;">Bonjour <strong>${name}</strong>,</p>
      <p style="margin:0 0 28px;color:#475569;font-size:0.9rem;line-height:1.65;">${body}</p>
      
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${btnUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a497d,#2d7dd2);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:0.95rem;box-shadow:0 4px 16px rgba(26,73,125,0.35);">
          ${btnText}
        </a>
      </div>

      <p style="margin:0;color:#94a3b8;font-size:0.78rem;text-align:center;">${note}</p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:0.75rem;">© ${new Date().getFullYear()} NextLearn · Saint-Jean Ingénieur & Management</p>
    </div>
  </div>
</body>
</html>`;
    }
}

module.exports = new EmailService();
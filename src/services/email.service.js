// src/services/email.service.js
const nodemailer = require('nodemailer');
const dns = require('dns').promises;

class EmailService {
    constructor() {
        this.transporter = null;
        this._ready      = false;
        this._init();
    }

    // ── Init asynchrone (Ethereal en dev si pas de SMTP configuré) ──
    async _init() {
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (smtpUser && smtpPass) {
            try {
                // Configuration améliorée pour Gmail
                this.transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_PORT === '465', // true pour 465, false pour autres ports
                    auth: { 
                        user: smtpUser, 
                        pass: smtpPass,
                        // Pour Gmail, il est recommandé d'utiliser OAuth2 ou un "mot de passe d'application"
                        // Si vous utilisez un mot de passe normal, assurez-vous d'avoir activé "l'accès aux applications moins sécurisées"
                    },
                    tls: {
                        rejectUnauthorized: false // Évite les erreurs de certificat
                    },
                    connectionTimeout: 30000, // Augmenté à 30s
                    socketTimeout: 30000,     // Augmenté à 30s
                });
                
                // Vérifier la connexion
                await this.transporter.verify();
                this._ready = true;
                console.log('✅ Email service initialisé (SMTP réel)');
            } catch (error) {
                console.error('❌ Erreur lors de l\'initialisation SMTP:', error.message);
                // En cas d'erreur, basculer sur Ethereal
                this._initEthereal();
            }
        } else {
            this._initEthereal();
        }
    }

    // ── Initialisation Ethereal ───────────────────────────────
    async _initEthereal() {
        console.warn('⚠️  SMTP_USER/SMTP_PASS non définis ou erreur SMTP → mode développement (Ethereal)');
        try {
            const testAccount = await nodemailer.createTestAccount();
            this.transporter  = nodemailer.createTransport({
                host:   'smtp.ethereal.email',
                port:   587,
                secure: false,
                auth:   { user: testAccount.user, pass: testAccount.pass },
            });
            this._ready = true;
            console.log('📧 Ethereal prêt — voir les emails sur https://ethereal.email');
            console.log(`   Compte: ${testAccount.user} / ${testAccount.pass}`);
        } catch (e) {
            console.error('❌ Impossible de créer un compte Ethereal:', e.message);
            this._ready = false;
        }
    }

    // ── Attendre que le transporteur soit prêt ────────────────
    async _getTransporter() {
        if (this._ready && this.transporter) return this.transporter;
        
        // Attendre jusqu'à 10s (augmenté)
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 500));
            if (this._ready && this.transporter) return this.transporter;
        }
        throw new Error('Service email indisponible. Configurez SMTP_USER et SMTP_PASS dans .env');
    }

    // ── OTP de connexion ──────────────────────────────────────
    async sendOtpEmail(to, otpCode, name) {
        try {
            const transport = await this._getTransporter();
            const from      = `"NextLearn" <${process.env.SMTP_USER || 'nextlearn@ethereal.email'}>`;

            const info = await transport.sendMail({
                from,
                to,
                subject: `${otpCode} — Code de connexion NextLearn`,
                html:    this._otpTemplate({ name, otpCode }),
            });

            // En dev, afficher l'URL de preview et le code dans les logs
            if (!process.env.SMTP_USER) {
                console.log(`📧 [DEV] OTP preview: ${nodemailer.getTestMessageUrl(info)}`);
                console.log(`   Code OTP envoyé à ${to}: ${otpCode}`);
            }
            
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi de l\'email OTP:', error.message);
            throw new Error(`Impossible d'envoyer l'email: ${error.message}`);
        }
    }

    // ── Vérification email à l'inscription ────────────────────
    async sendVerificationEmail(to, token, name) {
        try {
            const transport = await this._getTransporter();
            const from      = `"NextLearn" <${process.env.SMTP_USER || 'nextlearn@ethereal.email'}>`;
            const verifyUrl = `${process.env.APP_URL || 'https://nextlearn-api-v1.onrender.com'}/api/auth/verify-email/${token}`;

            const info = await transport.sendMail({
                from,
                to,
                subject: 'Activez votre compte NextLearn',
                html:    this._template({
                    title:   'Activez votre compte',
                    name,
                    body:    `Merci de rejoindre <strong>NextLearn</strong>, la bibliothèque académique de Saint-Jean. Cliquez ci-dessous pour activer votre compte.`,
                    btnText: 'Activer mon compte',
                    btnUrl:  verifyUrl,
                    note:    'Ce lien expire dans 24 heures.',
                }),
            });

            if (!process.env.SMTP_USER) {
                console.log(`📧 [DEV] Verification preview: ${nodemailer.getTestMessageUrl(info)}`);
            }
            
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi de l\'email de vérification:', error.message);
            throw new Error(`Impossible d'envoyer l'email: ${error.message}`);
        }
    }

    // ── Réinitialisation de mot de passe ──────────────────────
    async sendPasswordResetEmail(to, token, name) {
        try {
            const transport = await this._getTransporter();
            const from      = `"NextLearn" <${process.env.SMTP_USER || 'nextlearn@ethereal.email'}>`;
            const resetUrl  = `${process.env.FRONTEND_URL || 'http://localhost:8100'}/auth/login?token=${token}`;

            const info = await transport.sendMail({
                from,
                to,
                subject: 'Réinitialisation de votre mot de passe — NextLearn',
                html:    this._template({
                    title:   'Réinitialiser votre mot de passe',
                    name,
                    body:    `Vous avez demandé la réinitialisation de votre mot de passe NextLearn. Cliquez ci-dessous pour choisir un nouveau mot de passe.`,
                    btnText: 'Réinitialiser mon mot de passe',
                    btnUrl:  resetUrl,
                    note:    'Ce lien expire dans 1 heure. Si vous n\'avez pas fait cette demande, ignorez cet email.',
                }),
            });

            if (!process.env.SMTP_USER) {
                console.log(`📧 [DEV] Reset preview: ${nodemailer.getTestMessageUrl(info)}`);
                console.log(`   Token pour ${to}: ${token}`);
            }
            
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi de l\'email de réinitialisation:', error.message);
            throw new Error(`Impossible d'envoyer l'email: ${error.message}`);
        }
    }

    // ── Template OTP ──────────────────────────────────────────
    _otpTemplate({ name, otpCode }) {
        const digitBoxes = otpCode.split('').map(d =>
            `<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;` +
            `background:#f1f5f9;border:2px solid #e2e8f0;border-radius:10px;font-size:1.7rem;font-weight:900;` +
            `color:#1a497d;font-family:'Courier New',monospace;margin:0 3px;">${d}</span>`
        ).join('');

        return `<!DOCTYPE html><html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#0d2b4e,#1a497d,#2d7dd2);padding:32px;text-align:center;">
    <div style="width:64px;height:64px;border-radius:18px;background:rgba(255,255,255,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;"><span style="font-size:30px;">🔐</span></div>
    <h1 style="margin:0;color:#fff;font-size:1.5rem;font-weight:800;">NextLearn</h1>
    <p style="margin:5px 0 0;color:rgba(255,255,255,0.6);font-size:0.82rem;">Code de vérification</p>
  </div>
  <div style="padding:32px 28px 24px;">
    <p style="margin:0 0 8px;color:#334155;font-size:0.95rem;">Bonjour <strong>${name}</strong>,</p>
    <p style="margin:0 0 28px;color:#475569;font-size:0.88rem;line-height:1.65;">Voici votre code de vérification pour vous connecter à <strong>NextLearn</strong>.</p>
    <div style="text-align:center;margin:0 0 12px;">${digitBoxes}</div>
    <p style="text-align:center;margin:0 0 24px;font-size:0.8rem;color:#ef4444;font-weight:600;">⏱ Ce code expire dans <strong>10 minutes</strong></p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px 16px;">
      <p style="margin:0;color:#9a3412;font-size:0.78rem;line-height:1.5;">⚠️ <strong>Ne partagez jamais ce code.</strong> Si vous n'avez pas tenté de connexion, changez votre mot de passe immédiatement.</p>
    </div>
  </div>
  <div style="background:#f8fafc;padding:14px 28px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:0.72rem;">© ${new Date().getFullYear()} NextLearn · Saint-Jean Ingénieur & Management</p>
  </div>
</div>
</body></html>`;
    }

    // ── Template générique (avec bouton lien) ─────────────────
    _template({ title, name, body, btnText, btnUrl, note }) {
        return `<!DOCTYPE html><html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#0d2b4e,#1a497d,#2d7dd2);padding:32px;text-align:center;">
    <div style="width:64px;height:64px;border-radius:18px;background:rgba(255,255,255,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;"><span style="font-size:30px;">📚</span></div>
    <h1 style="margin:0;color:#fff;font-size:1.5rem;font-weight:800;">NextLearn</h1>
    <p style="margin:5px 0 0;color:rgba(255,255,255,0.6);font-size:0.82rem;">Saint-Jean Ingénieur & Management</p>
  </div>
  <div style="padding:32px 28px 24px;">
    <h2 style="margin:0 0 14px;color:#1a497d;font-size:1.15rem;font-weight:700;">${title}</h2>
    <p style="margin:0 0 6px;color:#334155;font-size:0.95rem;">Bonjour <strong>${name}</strong>,</p>
    <p style="margin:0 0 28px;color:#475569;font-size:0.88rem;line-height:1.65;">${body}</p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${btnUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a497d,#2d7dd2);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:0.92rem;">${btnText}</a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:0.76rem;text-align:center;">${note}</p>
  </div>
  <div style="background:#f8fafc;padding:14px 28px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:0.72rem;">© ${new Date().getFullYear()} NextLearn · Saint-Jean Ingénieur & Management</p>
  </div>
</div>
</body></html>`;
    }
}

module.exports = new EmailService();
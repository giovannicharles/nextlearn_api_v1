// src/services/email.service.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this._ready      = false;
        this._mode       = 'none'; // 'smtp' | 'ethereal' | 'log'
        this._init();
    }

    // ── Init asynchrone ───────────────────────────────────────
    async _init() {
        const smtpUser = "ebodegiovanni@gmail.com";
        const smtpPass = "nyaj cesd jykb oxqu";
        // const smtpUser = process.env.SMTP_USER;
        // const smtpPass = process.env.SMTP_PASS;

        if (smtpUser && smtpPass) {
            // ── Mode SMTP réel (production configurée) ────────
            try {
                this.transporter = nodemailer.createTransport({
                    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
                    port:   parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_PORT === '465',
                    auth:   { user: smtpUser, pass: smtpPass },
                    tls:    { rejectUnauthorized: false },
                    connectionTimeout: 15000,
                    socketTimeout:     15000,
                });
                await this.transporter.verify();
                this._ready = true;
                this._mode  = 'smtp';
                console.log('✅ Email service initialisé (SMTP réel)');
            } catch (err) {
                console.error('❌ Erreur SMTP, basculement en mode log:', err.message);
                this._enableLogMode();
            }

        } else if (process.env.NODE_ENV !== 'production') {
            // ── Mode Ethereal (développement local uniquement) ─
            try {
                const testAccount = await nodemailer.createTestAccount();
                this.transporter  = nodemailer.createTransport({
                    host:   'smtp.ethereal.email',
                    port:   587,
                    secure: false,
                    auth:   { user: testAccount.user, pass: testAccount.pass },
                });
                this._ready = true;
                this._mode  = 'ethereal';
                console.log('📧 Ethereal prêt (dev) — https://ethereal.email');
                console.log(`   Compte: ${testAccount.user}`);
            } catch (e) {
                console.warn('⚠️ Ethereal indisponible, mode log activé:', e.message);
                this._enableLogMode();
            }

        } else {
            // ── Mode log (production sans SMTP configuré) ─────
            // Pas d'erreur, pas de timeout — le code apparaît dans les logs Render
            this._enableLogMode();
        }
    }

    _enableLogMode() {
        this._ready = true;
        this._mode  = 'log';
        console.warn('📋 Email service en mode LOG — les codes apparaissent dans les logs serveur');
        console.warn('   → Configurez SMTP_USER et SMTP_PASS dans votre .env pour les vrais emails');
    }

    // ── Envoyer via le transporteur ou logger ─────────────────
    async _send(mailOptions) {
        if (this._mode === 'log') {
            // En mode log : simuler un délai réaliste puis afficher dans les logs
            await new Promise(r => setTimeout(r, 50));
            console.log('');
            console.log('═══════════════════════════════════════');
            console.log('📧 [EMAIL LOG MODE]');
            console.log(`   À      : ${mailOptions.to}`);
            console.log(`   Sujet  : ${mailOptions.subject}`);
            if (mailOptions._otpCode) {
                console.log(`   CODE OTP : ${mailOptions._otpCode}`);
            }
            if (mailOptions._resetToken) {
                console.log(`   RESET TOKEN : ${mailOptions._resetToken}`);
            }
            console.log('═══════════════════════════════════════');
            console.log('');
            return { messageId: `log-${Date.now()}` };
        }

        // Attendre que le transporteur soit prêt (max 8s)
        for (let i = 0; i < 16; i++) {
            if (this._ready && this.transporter) break;
            await new Promise(r => setTimeout(r, 500));
        }
        if (!this._ready || !this.transporter) {
            throw new Error('Service email non disponible');
        }

        const info = await this.transporter.sendMail(mailOptions);

        if (this._mode === 'ethereal') {
            console.log(`📧 [DEV] Preview: ${nodemailer.getTestMessageUrl(info)}`);
        }

        return info;
    }

    // ── OTP de connexion ──────────────────────────────────────
    async sendOtpEmail(to, otpCode, name) {
        const from = `"NextLearn" <${process.env.SMTP_USER || 'nextlearn@app.local'}>`;

        await this._send({
            from,
            to,
            subject:   `${otpCode} — Code de connexion NextLearn`,
            html:      this._otpTemplate({ name, otpCode }),
            _otpCode:  otpCode, // utilisé par le mode log
        });
    }

    // ── Vérification email ────────────────────────────────────
    async sendVerificationEmail(to, token, name) {
        const from      = `"NextLearn" <${process.env.SMTP_USER || 'nextlearn@app.local'}>`;
        const verifyUrl = `${process.env.APP_URL || 'https://nextlearn-api-v1.onrender.com'}/api/auth/verify-email/${token}`;

        await this._send({
            from,
            to,
            subject: 'Activez votre compte NextLearn',
            html:    this._template({
                title:   'Activez votre compte',
                name,
                body:    `Merci de rejoindre <strong>NextLearn</strong>. Cliquez ci-dessous pour activer votre compte.`,
                btnText: 'Activer mon compte',
                btnUrl:  verifyUrl,
                note:    'Ce lien expire dans 24 heures.',
            }),
        });
    }

    // ── Reset mot de passe ────────────────────────────────────
    async sendPasswordResetEmail(to, token, name) {
        const from     = `"NextLearn" <${process.env.SMTP_USER || 'nextlearn@app.local'}>`;
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8100'}/auth/login?token=${token}`;

        await this._send({
            from,
            to,
            subject:      'Réinitialisation de votre mot de passe — NextLearn',
            html:         this._template({
                title:   'Réinitialiser votre mot de passe',
                name,
                body:    `Vous avez demandé la réinitialisation de votre mot de passe. Cliquez ci-dessous.`,
                btnText: 'Réinitialiser mon mot de passe',
                btnUrl:  resetUrl,
                note:    'Ce lien expire dans 1 heure.',
            }),
            _resetToken: token, // utilisé par le mode log
        });
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
      <p style="margin:0;color:#9a3412;font-size:0.78rem;line-height:1.5;">⚠️ <strong>Ne partagez jamais ce code.</strong></p>
    </div>
  </div>
  <div style="background:#f8fafc;padding:14px 28px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:0.72rem;">© ${new Date().getFullYear()} NextLearn · Saint-Jean</p>
  </div>
</div>
</body></html>`;
    }

    // ── Template générique ────────────────────────────────────
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
    <p style="margin:0;color:#94a3b8;font-size:0.72rem;">© ${new Date().getFullYear()} NextLearn · Saint-Jean</p>
  </div>
</div>
</body></html>`;
    }
}

module.exports = new EmailService();
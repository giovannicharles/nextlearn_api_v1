import nodemailer from 'nodemailer';
import dns from 'node:dns';
import { MailerService, EmailOptions } from './mailer.interface';
import env from '../../config/env';

// Forcer la résolution DNS en IPv4 pour éviter ENETUNREACH en IPv6
// (problème courant sur Render et autres PaaS qui ne routent pas l'IPv6)
dns.setDefaultResultOrder('ipv4first');

export class SmtpMailerService implements MailerService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const smtpHost = env.SMTP_HOST || (env.SMTP_USER?.endsWith('@gmail.com') ? 'smtp.gmail.com' : undefined);
    if (smtpHost && env.SMTP_USER && env.SMTP_PASS) {
      console.log(`[SMTP] Configuration SMTP détectée`);
      console.log(`[SMTP] Host: ${smtpHost}`);
      console.log(`[SMTP] Port: ${env.SMTP_PORT}`);
      console.log(`[SMTP] User: ${env.SMTP_USER}`);
      
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: { timeout: 10000 },
      });
      
      console.log(`[SMTP] Transporter SMTP créé avec succès`);
    } else {
      console.warn(`[SMTP] Configuration SMTP incomplète - emails non envoyés`);
      console.warn(`[SMTP] Host: ${smtpHost || 'non défini'}`);
      console.warn(`[SMTP] User: ${env.SMTP_USER || 'non défini'}`);
      console.warn(`[SMTP] Pass: ${env.SMTP_PASS ? 'défini' : 'non défini'}`);
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      console.log(`[SMTP] Transporter non configuré - Email non envoyé`);
      console.log(`[SMTP] To: ${options.to}, Subject: ${options.subject}`);
      return;
    }

    console.log(`[SMTP] Préparation envoi email à: ${options.to}`);
    console.log(`[SMTP] From: ${env.SMTP_USER}`);
    console.log(`[SMTP] Subject: ${options.subject}`);

    try {
      const result = await this.transporter.sendMail({
        from: env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`[SMTP] Email envoyé avec succès. Message ID:`, result.messageId);
    } catch (error) {
      console.error(`[SMTP] Erreur lors de l'envoi:`, error);
      console.error(`[SMTP] Détails de l'erreur:`, error instanceof Error ? error.message : error);
      throw new Error(`SMTP error: ${error instanceof Error ? error.message : error}`);
    }
  }

  async sendOtpEmail(email: string, otp: string, recipientName: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Code de vérification NextLearn</h2>
        <p>Bonjour ${recipientName},</p>
        <p>Votre code de vérification est :</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Ce code expire dans 10 minutes.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Votre code de vérification NextLearn',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, recipientName: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:4200'}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Réinitialisation du mot de passe</h2>
        <p>Bonjour ${recipientName},</p>
        <p>Cliquez sur le lien pour réinitialiser : <a href="${resetUrl}">${resetUrl}</a></p>
        <p>Ce lien expire dans 1 heure.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Réinitialisation du mot de passe NextLearn',
      html,
    });
  }

  async sendEmailVerification(email: string, verificationToken: string, recipientName: string): Promise<void> {
    const verifyUrl = `${process.env.APP_URL || 'http://localhost:4200'}/verify-email?token=${verificationToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Vérification de votre email</h2>
        <p>Bonjour ${recipientName},</p>
        <p>Vérifiez votre email : <a href="${verifyUrl}">${verifyUrl}</a></p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Vérification de votre email NextLearn',
      html,
    });
  }
}

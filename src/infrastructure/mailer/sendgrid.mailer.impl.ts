import sgMail from '@sendgrid/mail';
import { MailerService } from './mailer.interface';
import env from '../../config/env';

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  console.log('[SendGrid] API Key configurée (premiers caractères):', env.SENDGRID_API_KEY.substring(0, 10) + '...');
} else {
  console.warn('[SendGrid] SENDGRID_API_KEY non définie - emails non envoyés');
}

export class SendGridMailerService implements MailerService {
  async sendEmail(options: any): Promise<void> {
    if (!env.SENDGRID_API_KEY) {
      console.log(`[EMAIL LOG] SENDGRID_API_KEY non définie - Email non envoyé`);
      console.log(`[EMAIL LOG] To: ${options.to}, Subject: ${options.subject}`);
      return;
    }

    console.log(`[SendGrid] Préparation envoi email à: ${options.to}`);
    console.log(`[SendGrid] From: noreply@nextlearn.cm`);
    console.log(`[SendGrid] Subject: ${options.subject}`);

    try {
      const result = await sgMail.send({
        to: options.to,
        from: 'noreply@nextlearn.cm',
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`[SendGrid] Email envoyé avec succès. Message ID:`, result[0]?.headers?.['x-message-id']);
    } catch (error) {
      console.error(`[SendGrid] Erreur lors de l'envoi:`, error);
      if (error instanceof Error && 'response' in error) {
        console.error(`[SendGrid] Response body:`, JSON.stringify((error as any).response?.body, null, 2));
      }
      throw new Error(`SendGrid error: ${error instanceof Error ? error.message : error}`);
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
        <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
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
        <p>Vous avez demandé une réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour réinitialiser :</p>
        <a href="${resetUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
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
        <p>Veuillez vérifier votre adresse email en cliquant sur le lien ci-dessous :</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Vérifier mon email
        </a>
        <p>Ce lien expire dans 24 heures.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Vérification de votre email NextLearn',
      html,
    });
  }
}

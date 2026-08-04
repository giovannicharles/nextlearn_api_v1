export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface MailerService {
  sendEmail(options: EmailOptions): Promise<void>;
  sendOtpEmail(email: string, otp: string, recipientName: string): Promise<void>;
  sendPasswordResetEmail(email: string, resetToken: string, recipientName: string): Promise<void>;
  sendEmailVerification(email: string, verificationToken: string, recipientName: string): Promise<void>;
}

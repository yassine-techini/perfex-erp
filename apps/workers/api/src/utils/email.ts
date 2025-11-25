/**
 * Email Service
 * Handles email sending with console.log in development
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export class EmailService {
  private environment: string;
  private fromEmail: string;

  constructor(environment: string = 'production', fromEmail: string = 'noreply@perfex.com') {
    this.environment = environment;
    this.fromEmail = fromEmail;
  }

  /**
   * Send email - logs to console in development, sends real email in production
   */
  async send(options: EmailOptions): Promise<void> {
    const email = {
      from: options.from || this.fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    if (this.environment === 'development') {
      // Log to console in development
      console.log('📧 ==================== EMAIL ====================');
      console.log('From:', email.from);
      console.log('To:', email.to);
      console.log('Subject:', email.subject);
      console.log('---');
      if (email.text) {
        console.log('Text:', email.text);
      }
      if (email.html) {
        console.log('HTML:', email.html);
      }
      console.log('================================================\n');
      return;
    }

    // TODO: Implement actual email sending for production
    // Could use Resend, SendGrid, AWS SES, etc.
    console.warn('Email sending not implemented for production yet:', email);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    await this.send({
      to,
      subject: 'Welcome to Perfex ERP!',
      text: `Hi ${firstName},\n\nWelcome to Perfex ERP! Your account has been created successfully.\n\nGet started by logging in at: ${this.getAppUrl()}\n\nBest regards,\nThe Perfex Team`,
      html: `
        <h2>Welcome to Perfex ERP!</h2>
        <p>Hi ${firstName},</p>
        <p>Welcome to Perfex ERP! Your account has been created successfully.</p>
        <p><a href="${this.getAppUrl()}">Get started by logging in</a></p>
        <p>Best regards,<br>The Perfex Team</p>
      `,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.getAppUrl()}/reset-password?token=${resetToken}`;

    await this.send({
      to,
      subject: 'Password Reset Request',
      text: `You requested a password reset.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(to: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${this.getAppUrl()}/verify-email?token=${verificationToken}`;

    await this.send({
      to,
      subject: 'Verify Your Email Address',
      text: `Please verify your email address by clicking the link below:\n${verificationUrl}\n\nThis link will expire in 24 hours.`,
      html: `
        <h2>Verify Your Email Address</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
      `,
    });
  }

  /**
   * Send passwordless login link
   */
  async sendPasswordlessLoginEmail(to: string, loginToken: string): Promise<void> {
    const loginUrl = `${this.getAppUrl()}/auth/passwordless?token=${loginToken}`;

    await this.send({
      to,
      subject: 'Your Login Link',
      text: `Click the link below to log in to your account:\n${loginUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <h2>Your Login Link</h2>
        <p>Click the link below to log in to your account:</p>
        <p><a href="${loginUrl}">Log In</a></p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }

  /**
   * Get app URL based on environment
   */
  private getAppUrl(): string {
    switch (this.environment) {
      case 'development':
        return 'https://dev.perfex-web-dev.pages.dev';
      case 'staging':
        return 'https://staging.perfex-web-staging.pages.dev';
      case 'production':
        return 'https://perfex-web.pages.dev';
      default:
        return 'http://localhost:3000';
    }
  }
}

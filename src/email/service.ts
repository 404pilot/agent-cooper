import nodemailer from 'nodemailer';
import { logger } from '../logger';

export interface EmailConfig {
  gmailUser: string;
  gmailAppPassword: string;
  to: string[];
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private from: string;
  private to: string[];

  constructor(config: EmailConfig) {
    this.from = config.gmailUser;
    this.to = config.to;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.gmailUser, pass: config.gmailAppPassword },
    });
  }

  async send(subject: string, body: string): Promise<void> {
    const recipients = this.to.join(', ');
    logger.info('Sending email', { subject, to: recipients });
    await this.transporter.sendMail({
      from: this.from,
      to: recipients,
      subject,
      text: body,
    });
    logger.info('Email sent');
  }
}

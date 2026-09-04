import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "AI Social Manager <noreply@aisocialmanager.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface WelcomeEmailData {
  name: string;
  email: string;
  verifyUrl: string;
}

interface PasswordResetData {
  name: string;
  resetUrl: string;
  expiresIn: string;
}

interface PostScheduledData {
  name: string;
  platform: string;
  content: string;
  scheduledAt: string;
  dashboardUrl: string;
}

interface WeeklyReportData {
  name: string;
  weekStart: string;
  weekEnd: string;
  stats: {
    postsPublished: number;
    totalReach: number;
    engagement: number;
    followersGained: number;
  };
  topPost: {
    content: string;
    platform: string;
    likes: number;
    comments: number;
  };
  dashboardUrl: string;
}

interface InvoiceData {
  name: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  invoiceUrl: string;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function baseTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
        .stat-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin: 10px 0;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${content}
      </div>
    </body>
    </html>
  `;
}

function headerSection(title: string): string {
  return `
    <div class="header">
      <h1>${title}</h1>
    </div>
  `;
}

function footerSection(): string {
  return `
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} AI Social Manager. All rights reserved.</p>
      <p>
        <a href="${APP_URL}/settings/notifications">Notification Preferences</a> |
        <a href="${APP_URL}/privacy">Privacy Policy</a>
      </p>
    </div>
  `;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();
    const recipients = Array.isArray(options.to) ? options.to.join(", ") : options.to;
    
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      attachments: options.attachments,
    });
    
    console.log(`Email sent to ${recipients}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  const html = baseTemplate(`
    ${headerSection("Welcome to AI Social Manager!")}
    <div class="content">
      <h2>Hi ${data.name},</h2>
      <p>Welcome to AI Social Manager! We're excited to have you on board.</p>
      <p>To get started, please verify your email address by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${data.verifyUrl}" class="button">Verify Email Address</a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <h3>What's next?</h3>
      <ul>
        <li>Connect your social media accounts</li>
        <li>Create your first AI-powered post</li>
        <li>Schedule content for the week</li>
        <li>Track your analytics dashboard</li>
      </ul>
    </div>
    ${footerSection()}
  `);

  return sendEmail({
    to: data.email,
    subject: "Welcome to AI Social Manager - Verify Your Email",
    html,
  });
}

export async function sendPasswordResetEmail(
  data: PasswordResetData
): Promise<boolean> {
  const html = baseTemplate(`
    ${headerSection("Password Reset Request")}
    <div class="content">
      <h2>Hi ${data.name},</h2>
      <p>We received a request to reset your password.</p>
      <p>Click the button below to create a new password:</p>
      <p style="text-align: center;">
        <a href="${data.resetUrl}" class="button">Reset Password</a>
      </p>
      <p>This link will expire in ${data.expiresIn}.</p>
      <p>If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
    </div>
    ${footerSection()}
  `);

  return sendEmail({
    to: data.email,
    subject: "Reset Your Password - AI Social Manager",
    html,
  });
}

export async function sendPostScheduledEmail(
  data: PostScheduledData
): Promise<boolean> {
  const html = baseTemplate(`
    ${headerSection("Post Scheduled Successfully")}
    <div class="content">
      <h2>Hi ${data.name},</h2>
      <p>Your post has been scheduled successfully!</p>
      <div class="stat-box">
        <p><strong>Platform:</strong> ${data.platform}</p>
        <p><strong>Scheduled for:</strong> ${data.scheduledAt}</p>
        <p><strong>Content:</strong></p>
        <p style="font-style: italic; color: #666;">"${data.content.substring(0, 200)}${data.content.length > 200 ? "..." : ""}"</p>
      </div>
      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">View in Dashboard</a>
      </p>
    </div>
    ${footerSection()}
  `);

  return sendEmail({
    to: data.email,
    subject: `Post Scheduled for ${data.platform} - AI Social Manager`,
    html,
  });
}

export async function sendWeeklyReportEmail(
  data: WeeklyReportData
): Promise<boolean> {
  const html = baseTemplate(`
    ${headerSection("Your Weekly Analytics Report")}
    <div class="content">
      <h2>Hi ${data.name},</h2>
      <p>Here's your weekly performance summary (${data.weekStart} - ${data.weekEnd}):</p>
      
      <div class="stat-box">
        <h3 style="margin-top: 0;">Performance Overview</h3>
        <table width="100%" cellpadding="10">
          <tr>
            <td>
              <div class="stat-value">${data.stats.postsPublished}</div>
              <div>Posts Published</div>
            </td>
            <td>
              <div class="stat-value">${data.stats.totalReach.toLocaleString()}</div>
              <div>Total Reach</div>
            </td>
            <td>
              <div class="stat-value">${data.stats.engagement.toFixed(1)}%</div>
              <div>Engagement Rate</div>
            </td>
            <td>
              <div class="stat-value">+${data.stats.followersGained}</div>
              <div>New Followers</div>
            </td>
          </tr>
        </table>
      </div>
      
      ${data.topPost ? `
        <div class="stat-box">
          <h3 style="margin-top: 0;">Top Performing Post</h3>
          <p><strong>Platform:</strong> ${data.topPost.platform}</p>
          <p style="font-style: italic; color: #666;">"${data.topPost.content.substring(0, 150)}..."</p>
          <p>❤️ ${data.topPost.likes.toLocaleString()} likes · 💬 ${data.topPost.comments.toLocaleString()} comments</p>
        </div>
      ` : ""}
      
      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">View Full Report</a>
      </p>
    </div>
    ${footerSection()}
  `);

  return sendEmail({
    to: data.email,
    subject: `Weekly Analytics Report - ${data.weekStart} to ${data.weekEnd}`,
    html,
  });
}

export async function sendInvoiceEmail(data: InvoiceData): Promise<boolean> {
  const html = baseTemplate(`
    ${headerSection("Invoice")}
    <div class="content">
      <h2>Hi ${data.name},</h2>
      <p>Your invoice is ready.</p>
      
      <div class="stat-box">
        <table width="100%">
          <tr>
            <td><strong>Invoice Number:</strong></td>
            <td>${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td><strong>Amount:</strong></td>
            <td>$${(data.amount / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>Due Date:</strong></td>
            <td>${data.dueDate}</td>
          </tr>
        </table>
      </div>
      
      <p style="text-align: center;">
        <a href="${data.invoiceUrl}" class="button">View Invoice</a>
      </p>
    </div>
    ${footerSection()}
  `);

  return sendEmail({
    to: data.email,
    subject: `Invoice ${data.invoiceNumber} - AI Social Manager`,
    html,
  });
}

export async function sendBulkEmail(
  recipients: Array<{ email: string; name: string }>,
  subject: string,
  getContent: (name: string) => string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const html = baseTemplate(getContent(recipient.name));
    const success = await sendEmail({
      to: recipient.email,
      subject,
      html,
    });
    
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

export function generateUnsubscribeUrl(email: string, token: string): string {
  return `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

export function generateEmailVerificationToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

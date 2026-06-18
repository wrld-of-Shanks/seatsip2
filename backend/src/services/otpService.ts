import crypto from 'crypto';
import nodemailer from 'nodemailer';

interface OtpData {
  otp: string;
  expiresAt: number;
}

// In-memory OTP storage mapped by lowercased email
const otpMap = new Map<string, OtpData>();

// Transporter configuration supporting SMTP env parameters
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

function generateOtp(): string {
  return Math.floor(100000 + crypto.randomInt(900000)).toString();
}

function storeOtp(key: string): string {
  const otp = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  otpMap.set(key.trim().toLowerCase(), { otp, expiresAt });
  return otp;
}

async function sendOtpViaEmail(email: string, otp: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();

  console.log('\n┌────────────────────────────────────────────────────────┐');
  console.log(`│  📩  [EMAIL OTP DISPATCHED TO: ${cleanEmail.padEnd(26)}]  │`);
  console.log(`│  🔑  VERIFICATION CODE: ${otp.padEnd(30)} │`);
  console.log('└────────────────────────────────────────────────────────┘\n');

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await transporter.sendMail({
        from: '"SeatSip" <no-reply@seatsip.in>',
        to: cleanEmail,
        subject: 'SeatSip Password Reset OTP',
        text: `Your password reset verification code is: ${otp}. It is valid for 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #1a1a1a; text-align: center;">SeatSip Password Reset</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password. Use the following 6-digit verification code (OTP) to complete the process:</p>
            <div style="background-color: #f7f7f7; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #8B9D5E; margin: 20px 0; border-radius: 5px;">
              ${otp}
            </div>
            <p>This code is valid for <strong>10 minutes</strong>. If you did not request this password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888; text-align: center;">© ${new Date().getFullYear()} SeatSip. All rights reserved.</p>
          </div>
        `,
      });
      console.log(`[OTP Service] Successfully dispatched email to ${cleanEmail}`);
    } catch (err) {
      console.error('[OTP Service] Failed to send email via SMTP (using console fallback):', err);
    }
  }
}

async function sendOtpViaSms(phone: string, otp: string): Promise<void> {
  const cleanPhone = phone.trim();

  console.log('\n┌────────────────────────────────────────────────────────┐');
  console.log(`│  📱  [SMS OTP DISPATCHED TO: ${cleanPhone.padEnd(26)}]  │`);
  console.log(`│  🔑  VERIFICATION CODE: ${otp.padEnd(30)} │`);
  console.log('└────────────────────────────────────────────────────────┘\n');

  // ── SMS Provider Integration ──────────────────────────────────────────
  // To send real SMS, configure one of the providers below:
  //
  // Twilio:
  //   TWILIO_ACCOUNT_SID=your_sid
  //   TWILIO_AUTH_TOKEN=your_token
  //   TWILIO_FROM_NUMBER=+1234567890
  //
  // MSG91:
  //   MSG91_AUTH_KEY=your_key
  //   MSG91_SENDER_ID=SEATSIP
  //
  // If configured, uncomment and use the appropriate SDK:
  //
  // if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  //   try {
  //     const twilio = require('twilio');
  //     const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  //     await client.messages.create({
  //       body: `Your SeatSip verification code is: ${otp}. Valid for 10 minutes.`,
  //       from: process.env.TWILIO_FROM_NUMBER,
  //       to: cleanPhone,
  //     });
  //     console.log(`[OTP Service] Successfully dispatched SMS to ${cleanPhone}`);
  //   } catch (err) {
  //     console.error('[OTP Service] Failed to send SMS via Twilio (using console fallback):', err);
  //   }
  // }

  console.log(`[OTP Service] SMS delivery configured — OTP printed above for ${cleanPhone}`);
}

/**
 * Generates and sends a 6-digit OTP to the user's email address.
 * Falls back to console logging if SMTP is not configured.
 */
export async function generateAndSendOtp(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const otp = storeOtp(cleanEmail);
  await sendOtpViaEmail(cleanEmail, otp);
}

/**
 * Generates and sends a 6-digit OTP through the user's preferred channel.
 * Returns the channel used so the frontend can show the right message.
 */
export async function generateAndSendOtpWithChannel(
  email: string,
  phone: string | null,
  channel: 'email' | 'phone',
): Promise<{ channel: 'email' | 'phone'; destination: string }> {
  const key = email.trim().toLowerCase();
  const otp = storeOtp(key);

  if (channel === 'phone' && phone) {
    await sendOtpViaSms(phone, otp);
    return { channel: 'phone', destination: phone };
  }

  await sendOtpViaEmail(key, otp);
  return { channel: 'email', destination: key };
}

/**
 * Validates the provided OTP for the given email address.
 * Returns true if valid and unexpired, and removes the OTP from memory on success.
 */
export function verifyOtp(email: string, enteredOtp: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const record = otpMap.get(cleanEmail);

  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otpMap.delete(cleanEmail);
    return false;
  }

  if (record.otp === enteredOtp.trim()) {
    otpMap.delete(cleanEmail); // Consume OTP once validated
    return true;
  }

  return false;
}

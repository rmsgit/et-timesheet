'use server';
/**
 * @fileOverview An email sending utility using Nodemailer.
 *
 * - sendEmail - A function that handles sending an email with a PDF attachment.
 * - SendEmailInput - The input type for the sendEmail function.
 */

import { z } from 'zod';
import * as nodemailer from 'nodemailer';

const SendEmailInputSchema = z.object({
  to: z.string().email().describe("The recipient's email address."),
  subject: z.string().describe('The subject of the email.'),
  text: z.string().describe('The plain text body of the email.'),
  pdfBase64: z.string().describe('The PDF content as a Base64 encoded string.'),
  pdfFileName: z.string().describe('The desired file name for the PDF attachment.'),
});

export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export async function sendEmail(input: SendEmailInput): Promise<{ success: boolean; message: string }> {
    try {
        const validationResult = SendEmailInputSchema.safeParse(input);
        if (!validationResult.success) {
            console.error('Invalid input for sendEmail:', validationResult.error.flatten());
            return { success: false, message: 'Invalid input provided for sending email.' };
        }
        
        const { to, subject, text, pdfBase64, pdfFileName } = validationResult.data;
        
        // Log payload size for debugging
        const payloadSizeKb = Math.round(pdfBase64.length * 0.75 / 1024);
        console.log(`Attempting to send email to ${to} (${payloadSizeKb} KB attachment)`);

        const smtpUser = process.env.GMAIL_SMTP_USER;
        const smtpPass = process.env.GMAIL_SMTP_PASS;

        if (!smtpUser || !smtpPass || smtpUser === 'your-gmail-address@gmail.com') {
          console.error('Email sending failed: GMAIL_SMTP_USER or GMAIL_SMTP_PASS environment variables are not set or configured correctly.');
          return { 
            success: false, 
            message: 'Email server configuration is incomplete. Please ensure GMAIL_SMTP_USER and GMAIL_SMTP_PASS (App Password) are set in the environment variables.' 
          };
        }

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const mailOptions = {
          from: `"Editors Table" <${smtpUser}>`,
          to: to,
          subject: subject,
          text: text,
          attachments: [
            {
              filename: pdfFileName,
              content: pdfBase64,
              encoding: 'base64',
              contentType: 'application/pdf',
            },
          ],
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Message sent: ${info.messageId}`);
        return { success: true, message: `Email successfully sent to ${to}.` };

    } catch (error: any) {
      console.error('CRITICAL: Error in sendEmail server action:', error);
      
      let errorDetail = 'Unknown Error';
      if (error && typeof error.message === 'string') {
        errorDetail = error.message;
      }

      // Handle common Nodemailer / SMTP errors with better messages
      if (errorDetail.includes('EAUTH') || errorDetail.includes('Invalid login')) {
        return { success: false, message: 'Authentication failed. Please check if your Gmail App Password is correct and valid.' };
      }
      
      return { 
        success: false, 
        message: `Failed to send email: ${errorDetail}` 
      };
    }
}

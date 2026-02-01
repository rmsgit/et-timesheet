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

        const smtpUser = process.env.GMAIL_SMTP_USER;
        const smtpPass = process.env.GMAIL_SMTP_PASS;

        if (!smtpUser || !smtpPass || smtpUser === 'your-gmail-address@gmail.com') {
          console.error('Email sending failed: GMAIL_SMTP_USER or GMAIL_SMTP_PASS environment variables are not set correctly.');
          return { success: false, message: 'Server is not configured for sending emails. Please contact an administrator.' };
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

        // Fire and forget: Don't await the sendMail promise.
        // Instead, use a callback to log the result in the background.
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(`Background email sending to ${to} failed:`, error);
            } else {
                console.log(`Background email to ${to} sent successfully: ${info.response}`);
            }
        });

        // Immediately return success to the client.
        return { success: true, message: `Email sending to ${to} has been initiated.` };

    } catch (error: any) {
      // This will now only catch errors from the setup, not from sendMail itself.
      console.error('Error in sendEmail server action setup:', error);
      let errorMessage = 'Failed to initiate email sending. Check server logs for details.';
      if (error && typeof error.message === 'string') {
        errorMessage = error.message;
      }
      return { success: false, message: errorMessage };
    }
}

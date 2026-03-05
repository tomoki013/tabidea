'use server'

import nodemailer from 'nodemailer';

type ContactFieldErrorCode =
  | 'name_required'
  | 'email_required'
  | 'email_invalid'
  | 'subject_required'
  | 'message_required';

type ContactMessageCode =
  | 'validation_failed'
  | 'submitted'
  | 'submitted_dev'
  | 'send_failed';

export type ContactState = {
  success: boolean;
  message: ContactMessageCode | '';
  errors?: {
    name?: ContactFieldErrorCode[];
    email?: ContactFieldErrorCode[];
    subject?: ContactFieldErrorCode[];
    message?: ContactFieldErrorCode[];
  };
};

export async function sendContactEmail(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const subject = formData.get('subject') as string;
  const message = formData.get('message') as string;

  // Simple validation
  const errors: ContactState['errors'] = {};
  if (!name || name.trim() === '') {
    errors.name = ['name_required'];
  }
  if (!email || email.trim() === '') {
    errors.email = ['email_required'];
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ['email_invalid'];
  }
  if (!subject || subject.trim() === '') {
    errors.subject = ['subject_required'];
  }
  if (!message || message.trim() === '') {
    errors.message = ['message_required'];
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: 'validation_failed',
      errors,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Send to self
      replyTo: email, // Reply to the sender
      subject: `[Contact] ${subject} (${name})`,
      text: `
A new contact inquiry was received.

[Name]
${name}

[Email]
${email}

[Subject]
${subject}

[Message]
${message}
      `,
      html: `
        <h2>A new contact inquiry was received</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <br/>
        <h3>Message</h3>
        <p style="white-space: pre-wrap;">${message}</p>
      `,
    };

    // If env vars are not set (e.g. in dev without setup), we might want to fail gracefully or log
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        console.warn('GMAIL_USER or GMAIL_PASS environment variables are not set.');
        // For development/preview where env might be missing, we can simulate success or fail.
        // Given the instructions, the user *will* set them, so if they are missing here, it's an error.
        // However, to allow UI testing without crashing, we might return a specific error.
        if (process.env.NODE_ENV === 'development') {
             console.log('Simulating email send in development:', mailOptions);
             return { success: true, message: 'submitted_dev' };
        }
        throw new Error('Server configuration error: Missing email credentials.');
    }

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'submitted',
    };
  } catch (error) {
    console.error('Email send failed:', error);
    return {
      success: false,
      message: 'send_failed',
    };
  }
}

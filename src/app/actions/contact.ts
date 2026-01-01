'use server'

import nodemailer from 'nodemailer';

export type ContactState = {
  success: boolean;
  message: string;
  errors?: {
    name?: string[];
    email?: string[];
    subject?: string[];
    message?: string[];
  };
};

export async function sendContactEmail(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const subject = formData.get('subject') as string;
  const message = formData.get('message') as string;

  // Simple validation
  const errors: ContactState['errors'] = {};
  if (!name || name.trim() === '') {
    errors.name = ['お名前を入力してください'];
  }
  if (!email || email.trim() === '') {
    errors.email = ['メールアドレスを入力してください'];
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ['有効なメールアドレスを入力してください'];
  }
  if (!subject || subject.trim() === '') {
    errors.subject = ['件名を入力してください'];
  }
  if (!message || message.trim() === '') {
    errors.message = ['お問い合わせ内容を入力してください'];
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: '入力内容に誤りがあります。',
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
      subject: `[お問い合わせ] ${subject} (${name}様)`,
      text: `
お問い合わせがありました。

【お名前】
${name}

【メールアドレス】
${email}

【件名】
${subject}

【本文】
${message}
      `,
      html: `
        <h2>お問い合わせがありました</h2>
        <p><strong>お名前:</strong> ${name}</p>
        <p><strong>メールアドレス:</strong> ${email}</p>
        <p><strong>件名:</strong> ${subject}</p>
        <br/>
        <h3>本文</h3>
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
             return { success: true, message: '送信しました（開発モード: 実際には送信されていません）' };
        }
        throw new Error('Server configuration error: Missing email credentials.');
    }

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'お問い合わせを受け付けました。確認メールは送信されませんが、担当者が確認次第ご連絡いたします。',
    };
  } catch (error) {
    console.error('Email send failed:', error);
    return {
      success: false,
      message: '送信に失敗しました。時間をおいて再度お試しください。',
    };
  }
}

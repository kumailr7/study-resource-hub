const axios = require('axios');

const sendInvitationEmail = async (email, invitationToken, invitedByName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://hub.devops-dojo.ninja';
  const inviteLink = `${frontendUrl}/signup?token=${invitationToken}&email=${encodeURIComponent(email)}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited!</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited! 🎉</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Join the Study Resource Hub</p>
        </div>
        
        <div style="background: #f9f9f9; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
          <p style="margin: 0 0 15px 0;">Hello,</p>
          <p style="margin: 0 0 15px 0;"><strong>${invitedByName || 'An admin'}</strong> has invited you to join the Study Resource Hub.</p>
          <p style="margin: 0 0 20px 0;">Click the button below to create your account and get started:</p>
          
          <a href="${inviteLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">Accept Invitation</a>
          
          <p style="margin: 20px 0 0 0; font-size: 13px; color: #666;">This invitation expires in 7 days.</p>
        </div>
        
        <div style="text-align: center; font-size: 12px; color: #999; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
          <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} Study Resource Hub</p>
        </div>
      </body>
    </html>
  `;

  const fromEmail = process.env.MAILERSEND_FROM_EMAIL || 'invitations@devops-dojo.ninja';
  const fromName = process.env.MAILERSEND_FROM_NAME || 'Study Resource Hub';

  try {
    console.log('Sending email to:', email);
    console.log('From:', fromEmail);
    console.log('API Key present:', !!process.env.MAILERSEND_API_KEY);
    
    const response = await axios.post(
      'https://api.mailersend.com/v1/email',
      {
        from: { email: fromEmail, name: fromName },
        to: [{ email }],
        subject: "You're invited to join Study Resource Hub!",
        html: emailHtml
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('MailerSend email sent successfully:', response.data);
    return { success: true, messageId: response.data };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error('MailerSend error response:', JSON.stringify(error.response?.data, null, 2));
    console.error('MailerSend error status:', error.response?.status);
    console.error('MailerSend error:', errorDetails);
    return { success: false, error: errorDetails };
  }
};

module.exports = { sendInvitationEmail };
import { Resend } from 'resend';
import "dotenv/config";

if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not defined");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (sendTo: string, subject: string, html: string) => {
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: sendTo,
      subject: subject,
      html: html,
    });
    if (error) {
        return console.error({ error });
      }
    
      return data;
}   

export default sendEmail;

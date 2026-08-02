# Resend Mail - Email Client for Resend.

The problem was simple: every new business address usually means another paid mailbox.

`support@` · `hello@` · `billing@` · `jobs@`

That gets expensive fast & become complex to manage.

I'm not sure this is how @resend expected it to be used, but this is an end-to-end email client on top of @resend where you can create free business mailboxes, send and receive emails, and manage everything in between.

https://github.com/user-attachments/assets/eca7b3c6-c516-4e2b-a64c-1f2c82897404

## Features

- Create multiple business emails (Mailboxes)
- Conversation threads for related replies
- Inbox, starred, sent, drafts, spam, trash, and all-mail views
- Rich-text compose 
- Replies, forwards, and mailbox signatures
- Send, receive, preview, forward, and download attachments
- Search or filter by sender, recipient, subject, date, read status, folder, and attachments
- Email history and mailbox data stored in a PostgreSQL database you control
- Responsive layout for smaller screens

## How it works

1. Buy a domain.
2. Create a [Resend](https://resend.com/) account and verify your domain.
3. Clone this project locally, or deploy it to Vercel or another platform.

   ```bash
   git clone https://github.com/yasir-ali9/resend-mail
   cd resend-mail
   ```

4. Update the PostgreSQL connection string (Neon works well), Resend API key, optional webhook secret, and login password (if you want to deploy) in `.env`.

   ```env
   DATABASE_URL="" # Required - PostgreSQL connection string (Neon works).
   RESEND_API_KEY="" # Required - Use to authenticate, send, receive, and manage emails.
   RESEND_WEBHOOK_SECRET="" # Optional - Webhook secret if you need real-time syncing.
   PASSWORD="" # Optional - Password to access the app only when you want to deploy.
   ```

5. Then run:

   ```bash
   npm i
   npm run db:push
   npm run dev
   ```

6. Create addresses or mailboxes like:

   ```text
   support@
   hello@
   billing@
   jobs@
   anything@
   ```

7. Start sending and receiving emails. You will get a pure Gmail-like experience.

> Note: There may be limitations. I'm still exploring whether this is the right approach and where its limits are, but it works perfectly for me.

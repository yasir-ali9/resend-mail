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
- Connect multiple Resend accounts as isolated workspaces
- Three-step setup for app access, Resend account selection, and verified domain selection
- Dashboard mailboxes isolated to the account and domain selected in the signed session
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

4. Configure PostgreSQL, the app password, and separate session and credential-encryption secrets in `.env`.

   ```env
   DATABASE_URL="" # Required - PostgreSQL connection string (Neon works).
   PASSWORD="" # Required - Password used to unlock this installation.
   SESSION_SECRET="" # Required - Long random value used to sign sessions.
   CREDENTIAL_ENCRYPTION_KEY="" # Required - Long random value used to encrypt Resend credentials.
   ```

   Generate a separate random value for each secret:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Keep `SESSION_SECRET` and `CREDENTIAL_ENCRYPTION_KEY` stable after deployment. Changing the session secret signs users out; changing the credential-encryption key requires replacing each Resend API key from **Manage Resend accounts**.

5. Then run:

   ```bash
   npm i
   npm run db:push
   npm run dev
   ```

6. Complete the centered setup flow: unlock the app, connect or choose a Resend account, then choose one of that account's verified domains. Sending-only and domain-restricted keys cannot list the domains or received emails required by this app.

7. Create addresses or mailboxes like:

   ```text
   support@
   hello@
   billing@
   jobs@
   anything@
   ```

8. Start sending and receiving emails. The dashboard shows mailboxes only from the selected account and domain. Use the left-panel menu to return to the account or domain selection step.

Resend does not expose the account owner's name or email through an API key. The account name entered during setup is a local label used to make switching clear. If another key can be identified as belonging to an already-connected Resend account, the app directs you to switch to that account instead of creating a duplicate.

For real-time updates, manage the account during step 2, copy its webhook endpoint into Resend, and save the webhook signing secret there.

> Note: There may be limitations. I'm still exploring whether this is the right approach and where its limits are, but it works perfectly for me.

## Credits

Thanks to [Resend](https://resend.com/) for making sending and receiving email possible with ease.

## License

Released under the [MIT License](./LICENSE).

export const BUILT_IN_CHANGELOG_TEMPLATE_ID = "built_in_changelog";

export const changelogTemplate = {
  id: BUILT_IN_CHANGELOG_TEMPLATE_ID,
  name: "Product changelog",
  subject: "Resend Mail — templates, layers, and a better sending flow",
  description: "Editorial product update with feature sections and a summary.",
  html: `<!doctype html>
<html dir="ltr" lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta
      name="format-detection"
      content="telephone=no,address=no,email=no,date=no,url=no"
    />
    <title>Resend Mail changelog</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-content { padding: 32px 16px 24px !important; }
      }
    </style>
  </head>
  <body
    dir="ltr"
    lang="en"
    style="margin: 0; padding: 0; word-spacing: normal; background-color: #ffffff"
  >
    <div
      style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent"
    >
      Templates, layers, HTML import, and a complete preview-and-send flow.
    </div>
    <div
      role="article"
      aria-label="Resend Mail product changelog"
      style="margin: 0 auto; max-width: 680px; background-color: #ffffff"
    >
      <table
        role="presentation"
        width="100%"
        border="0"
        cellpadding="0"
        cellspacing="0"
        style="width: 100%; border-collapse: collapse"
      >
        <tbody>
          <tr>
            <td class="email-content" style="padding: 40px 16px 24px">
              <table
                role="presentation"
                width="100%"
                border="0"
                cellpadding="0"
                cellspacing="0"
                style="
                  width: 100%;
                  border-collapse: collapse;
                  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif;
                  font-size: 17px;
                  line-height: 25px;
                  color: #222222;
                "
              >
                <tbody>
                  <tr>
                    <td
                      align="left"
                      style="padding: 0; font-size: 13px; line-height: 20px; font-weight: 700; letter-spacing: 0.02em"
                    >
                      Resend Mail
                    </td>
                  </tr>
                  <tr>
                    <td height="40" style="height: 40px; line-height: 40px">
                      &nbsp;
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="left"
                      style="padding: 0 0 8px; font-size: 13px; line-height: 20px; color: #8a8a8a"
                    >
                      September 2026
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="left"
                      style="padding: 0 0 4px; font-weight: 700"
                    >
                      Better ways to work with email.
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 16px">
                      Resend Mail started as a focused inbox for creating free
                      business mailboxes on top of Resend. It now brings the
                      full email workflow together, from receiving a message
                      to turning it into a reusable template and sending it
                      again.
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 8px 0 32px">
                      <img
                        src="https://images.unsplash.com/photo-1484902945377-bd2a38e625cd?auto=format&amp;fit=crop&amp;w=1296&amp;h=700&amp;q=80"
                        width="648"
                        alt="Blue mountains reflected in a calm lake"
                        style="display: block; width: 100%; max-width: 648px; height: auto; border: 0; border-radius: 8px; outline: none; text-decoration: none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="left"
                      style="padding: 0 0 4px; font-weight: 700"
                    >
                      Templates, from draft to delivery
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 16px">
                      Create a template from scratch, import complete HTML and
                      CSS, or clone any email from your inbox, sent mail, or
                      another folder. The editor keeps the original layout,
                      images, and styling intact while autosaving every change.
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 8px 0 32px">
                      <img
                        src="https://images.unsplash.com/photo-1499289944739-7707f1ae6fbf?auto=format&amp;fit=crop&amp;w=1296&amp;h=700&amp;q=80"
                        width="648"
                        alt="A mountain peak catching the first light"
                        style="display: block; width: 100%; max-width: 648px; height: auto; border: 0; border-radius: 8px; outline: none; text-decoration: none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="left"
                      style="padding: 0 0 4px; font-weight: 700"
                    >
                      Editing that understands structure
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 16px">
                      Navigate the real HTML hierarchy through the layers
                      panel, edit text directly on the canvas, use contextual
                      actions to clone or reorder elements, and switch to
                      source when you need complete control. The resizable
                      canvas makes responsive checks part of the same flow.
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 8px 0 32px">
                      <img
                        src="https://images.unsplash.com/photo-1523248948644-586f1ab2a83e?auto=format&amp;fit=crop&amp;w=1296&amp;h=700&amp;q=80"
                        width="648"
                        alt="Layered blue mountains beside a quiet lake"
                        style="display: block; width: 100%; max-width: 648px; height: auto; border: 0; border-radius: 8px; outline: none; text-decoration: none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="left"
                      style="padding: 0 0 4px; font-weight: 700"
                    >
                      Preview and send, in one flow
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 16px">
                      Move from editing to a clean, interactive preview with
                      From, To, Cc, Bcc, and Subject ready above the email.
                      Links work as expected, the sender stays tied to the
                      active mailbox, and the exact saved HTML is delivered
                      through Resend and recorded in Sent.
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 16px 0 32px">
                      <div
                        style="height: 1px; border-top: 1px solid #e6e6e6; font-size: 1px; line-height: 1px"
                      >&nbsp;</div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="left"
                      style="padding: 0 0 4px; font-weight: 700"
                    >
                      Feature summary
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 8px">
                      <ul style="margin: 1em 0; padding-left: 40px">
                        <li>Multiple business mailboxes on verified domains</li>
                        <li>Threaded inbox, sent, drafts, spam, trash, and all mail</li>
                        <li>Rich compose, replies, forwards, and signatures</li>
                        <li>Preview, forwarding, and downloads for attachments</li>
                        <li>Search and filters across the complete mailbox</li>
                        <li>Isolated Resend accounts and domain workspaces</li>
                        <li>Reusable HTML templates with visual and source editing</li>
                        <li>PostgreSQL-backed email history you control</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 16px">
                      Resend Mail is open source and continues to get better
                      with every release.
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 16px">
                      <table
                        role="presentation"
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        style="border-collapse: collapse"
                      >
                        <tbody>
                          <tr>
                            <td align="center" style="border-radius: 8px; background-color: #111111">
                              <a
                                href="https://github.com/yasir-ali9/resend-mail"
                                target="_blank"
                                rel="noopener noreferrer"
                                style="display: inline-block; padding: 12px 20px; border-radius: 8px; background-color: #111111; color: #ffffff; font-size: 15px; line-height: 21px; font-weight: 500; text-decoration: none"
                              >
                                Explore Resend Mail
                              </a>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 16px 0">
                      <div
                        style="height: 1px; border-top: 1px solid #e6e6e6; font-size: 1px; line-height: 1px"
                      >&nbsp;</div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="left"
                      style="padding: 0; font-size: 13px; line-height: 20px; color: #8a8a8a"
                    >
                      Resend Mail &middot; Open source email client for Resend
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
</html>`,
} as const;

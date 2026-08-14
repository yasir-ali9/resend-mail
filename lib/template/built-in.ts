import { changelogTemplate } from "@/lib/template/built-ins/changelog";

export const BUILT_IN_TEMPLATE_ID = "built_in_welcome";

export const builtInTemplate = {
  id: BUILT_IN_TEMPLATE_ID,
  name: "Warm welcome",
  subject: "Welcome — your space is ready",
  description: "Clean, thoughtful welcome email ready to make your own.",
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
    <title>Welcome</title>
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
      Everything you need to get started is ready.
    </div>
    <div
      role="article"
      aria-label="Welcome email"
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
                      Example Inc.
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
                      style="padding: 0 0 4px; font-weight: 700"
                    >
                      Welcome.
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 16px">
                      We are glad you are here. Your account is ready, and
                      everything you need to get started is waiting for you.
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 8px 0 24px">
                      <img
                        src="https://images.unsplash.com/photo-1784012980517-005c26585344?auto=format&amp;fit=crop&amp;w=1360&amp;q=80"
                        width="648"
                        alt="A calm and welcoming reception space"
                        style="display: block; width: 100%; max-width: 648px; height: auto; border: 0; border-radius: 8px; outline: none; text-decoration: none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="left"
                      style="padding: 0 0 4px; font-weight: 700"
                    >
                      Start with the essentials
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 16px">
                      Take a moment to explore your space, invite your team,
                      and shape the experience around the way you work.
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
                                href="https://example.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                style="display: inline-block; padding: 12px 20px; border-radius: 8px; background-color: #111111; color: #ffffff; font-size: 15px; line-height: 21px; font-weight: 500; text-decoration: none"
                              >
                                Get started
                              </a>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 16px 0 24px">
                      <div
                        style="height: 1px; border-top: 1px solid #e6e6e6; font-size: 1px; line-height: 1px"
                      >&nbsp;</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 16px">
                      Need a hand? Reply to this email and we will help.
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding: 0 0 16px">
                      Warmly,<br />The team
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
                      Your company &middot; 123 Main Street &middot; Your city
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

export const builtInTemplates = [builtInTemplate, changelogTemplate] as const;

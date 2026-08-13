import sanitizeHtml from "sanitize-html";

const MAX_TEMPLATE_HTML_LENGTH = 2_000_000;

const allowedTags = [
  "html", "head", "body", "title", "meta", "style",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  "div", "span", "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
  "a", "img", "strong", "b", "em", "i", "u", "s", "strike", "small", "sup", "sub",
  "blockquote", "pre", "code", "ul", "ol", "li",
];

const globalAttributes = [
  "id", "class", "style", "title", "align", "valign", "dir", "lang", "role",
  "width", "height", "bgcolor", "background", "border", "cellpadding", "cellspacing",
  "aria-label", "data-template-element",
];

const allowedAttributes: sanitizeHtml.IOptions["allowedAttributes"] = {
  "*": globalAttributes,
  html: ["lang", "dir"],
  meta: ["charset", "name", "content", "http-equiv"],
  a: ["href", "target", "rel", "name", ...globalAttributes],
  img: ["src", "srcset", "sizes", "alt", ...globalAttributes],
  table: ["summary", ...globalAttributes],
  td: ["colspan", "rowspan", ...globalAttributes],
  th: ["colspan", "rowspan", "scope", ...globalAttributes],
  col: ["span", ...globalAttributes],
};

export function sanitizeTemplateHtml(input: string) {
  const trimmed = input.trim().slice(0, MAX_TEMPLATE_HTML_LENGTH);
  if (!trimmed) return createBlankTemplateHtml();

  const withoutDangerousCss = trimmed
    .replace(/@import\s+[^;]+;?/gi, "")
    .replace(/(?:expression|javascript|vbscript)\s*\(/gi, "")
    .replace(/-moz-binding\s*:[^;}]+;?/gi, "")
    .replace(/behavior\s*:[^;}]+;?/gi, "");
  const withoutDangerousUrls = withoutDangerousCss.replace(
    /url\s*\(\s*(["']?)\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^)]*\)/gi,
    "none",
  );
  const withoutTrackers = withoutDangerousUrls.replace(
    /<img\b(?=[^>]*(?:width\s*=\s*["']?1["']?|height\s*=\s*["']?1["']?|display\s*:\s*none|visibility\s*:\s*hidden))[^>]*>/gi,
    "",
  );

  const clean = sanitizeHtml(withoutTrackers, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ["http", "https", "mailto", "tel", "cid", "data"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto", "tel"],
      img: ["http", "https", "cid", "data"],
    },
    allowProtocolRelative: false,
    parseStyleAttributes: false,
    parser: { lowerCaseTags: true },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.href?.startsWith("http")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {}),
        },
      }),
    },
    exclusiveFilter(frame) {
      return (
        frame.tag === "img" &&
        (!frame.attribs.src || isLikelyTrackingImage(frame.attribs))
      );
    },
  });

  return ensureEmailDocument(clean);
}

export function templateHtmlToText(html: string) {
  const withBreaks = html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li|tr|table)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ");

  return sanitizeHtml(withBreaks, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function createBlankTemplateHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Untitled template</title>
</head>
<body style="margin:0;padding:40px 16px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:10px;">
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;font-size:28px;line-height:36px;">Start writing</h1>
          <p style="margin:0;font-size:15px;line-height:24px;color:#52525b;">Select an element to edit its content and properties.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ensureEmailDocument(html: string) {
  const doctype = "<!doctype html>";
  if (/<html[\s>]/i.test(html)) {
    return `${doctype}\n${html.replace(/<!doctype[^>]*>/gi, "").trim()}`;
  }

  return `${doctype}\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html}</body></html>`;
}

function isLikelyTrackingImage(attributes: Record<string, string>) {
  const width = Number.parseInt(attributes.width ?? "", 10);
  const height = Number.parseInt(attributes.height ?? "", 10);
  const style = attributes.style?.toLowerCase() ?? "";
  return (
    (Number.isFinite(width) && width <= 1) ||
    (Number.isFinite(height) && height <= 1) ||
    /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\D|$)/.test(style)
  );
}

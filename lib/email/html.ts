const blockedElements =
  /<(script|style|iframe|object|embed|form|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const htmlTags = /<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi;
const htmlAttributes =
  /([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;

const allowedTags = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "div",
  "em",
  "font",
  "i",
  "li",
  "ol",
  "p",
  "span",
  "strike",
  "strong",
  "u",
  "ul",
]);

const voidTags = new Set(["br"]);
const allowedAlignments = new Set(["left", "center", "right", "justify"]);
const allowedFontFamilies = new Set([
  "arial",
  "courier new",
  "georgia",
  "helvetica",
  "monospace",
  "sans-serif",
  "serif",
  "times new roman",
]);

export function plainTextToHtml(text: string) {
  if (!text) {
    return "";
  }

  return text
    .split(/\r?\n/)
    .map((line) => escapeHtml(line) || "<br>")
    .join("<br>");
}

export function sanitizeEditorHtml(html: string) {
  if (!html.trim()) {
    return "";
  }

  return html
    .replace(blockedElements, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(htmlTags, (token, rawTag: string, rawAttributes: string) => {
      const tag = rawTag.toLowerCase();

      if (!allowedTags.has(tag)) {
        return "";
      }

      if (token.startsWith("</")) {
        return voidTags.has(tag) ? "" : `</${tag}>`;
      }

      const attributes = sanitizeAttributes(tag, rawAttributes);
      return `<${tag}${attributes}>`;
    });
}

function sanitizeAttributes(tag: string, rawAttributes: string) {
  const attributes = new Map<string, string>();

  for (const match of rawAttributes.matchAll(htmlAttributes)) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";

    if (name === "style") {
      const style = sanitizeStyle(value);
      if (style) {
        attributes.set("style", style);
      }
      continue;
    }

    if (
      name === "align" &&
      allowedAlignments.has(value.toLowerCase()) &&
      ["div", "p"].includes(tag)
    ) {
      attributes.set("align", value.toLowerCase());
      continue;
    }

    if (tag === "a" && name === "href") {
      const href = sanitizeHref(value);
      if (href) {
        attributes.set("href", href);
        attributes.set("rel", "noopener noreferrer");
        attributes.set("target", "_blank");
      }
      continue;
    }

    if (tag === "font" && name === "face") {
      const family = normalizeFontFamily(value);
      if (family) {
        attributes.set("face", family);
      }
      continue;
    }

    if (tag === "font" && name === "size" && /^[1-7]$/.test(value)) {
      attributes.set("size", value);
      continue;
    }

    if (tag === "font" && name === "color" && isSafeColor(value)) {
      attributes.set("color", value);
    }
  }

  return [...attributes.entries()]
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
}

function sanitizeStyle(style: string) {
  const declarations: string[] = [];

  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) {
      continue;
    }

    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();

    if (
      property === "text-align" &&
      allowedAlignments.has(value.toLowerCase())
    ) {
      declarations.push(`text-align:${value.toLowerCase()}`);
    } else if (property === "color" && isSafeColor(value)) {
      declarations.push(`color:${value}`);
    } else if (
      property === "font-size" &&
      /^(?:[8-9]|1[0-9]|2[0-4])px$/i.test(value)
    ) {
      declarations.push(`font-size:${value.toLowerCase()}`);
    } else if (property === "font-family") {
      const family = normalizeFontFamily(value);
      if (family) {
        declarations.push(`font-family:${family}`);
      }
    } else if (
      property === "font-weight" &&
      /^(?:bold|normal|[4-7]00)$/i.test(value)
    ) {
      declarations.push(`font-weight:${value.toLowerCase()}`);
    } else if (
      property === "font-style" &&
      /^(?:italic|normal)$/i.test(value)
    ) {
      declarations.push(`font-style:${value.toLowerCase()}`);
    } else if (
      property === "text-decoration" &&
      /^(?:none|underline|line-through)$/i.test(value)
    ) {
      declarations.push(`text-decoration:${value.toLowerCase()}`);
    }
  }

  return declarations.join(";");
}

function sanitizeHref(value: string) {
  const trimmed = value.trim();

  if (/^(?:https?:|mailto:)/i.test(trimmed)) {
    return trimmed;
  }

  return "";
}

function normalizeFontFamily(value: string) {
  const family = value
    .split(",")[0]
    ?.trim()
    .replace(/^['"]|['"]$/g, "")
    .toLowerCase();

  return family && allowedFontFamilies.has(family) ? family : "";
}

function isSafeColor(value: string) {
  return (
    /^#[0-9a-f]{3,8}$/i.test(value) ||
    /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(value) ||
    /^[a-z]{3,20}$/i.test(value)
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

export type FormatCommand =
  | "bold"
  | "createLink"
  | "fontName"
  | "fontSize"
  | "foreColor"
  | "indent"
  | "insertOrderedList"
  | "insertUnorderedList"
  | "italic"
  | "justifyCenter"
  | "justifyFull"
  | "justifyLeft"
  | "justifyRight"
  | "outdent"
  | "redo"
  | "removeFormat"
  | "underline"
  | "undo"
  | "unlink";

export interface EditorValue {
  html: string;
  text: string;
}

export function readEditorValue(editor: HTMLElement): EditorValue {
  const text = editor.innerText
    .replaceAll("\u00a0", " ")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  const rawHtml = editor.innerHTML.trim();
  const html = /^(?:<br>|<div><br><\/div>)$/i.test(rawHtml)
    ? ""
    : rawHtml;

  return { html, text };
}

export function normalizeLink(value: string) {
  const link = value.trim();

  if (!link) {
    return "";
  }

  if (/^(?:https?:|mailto:)/i.test(link)) {
    return link;
  }

  return `https://${link}`;
}

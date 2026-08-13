import type { ElementKind } from "./types";

export function createElement(document: Document, kind: ElementKind) {
  if (kind === "text") {
    const element = document.createElement("p");
    element.textContent = "Write something meaningful.";
    element.style.cssText =
      "margin:0 0 16px;font-size:15px;line-height:24px;color:#52525b;";
    return element;
  }
  if (kind === "button") {
    const table = document.createElement("table");
    table.setAttribute("role", "presentation");
    table.innerHTML =
      '<tbody><tr><td style="border-radius:7px;background:#18181b"><a href="https://example.com" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Button text</a></td></tr></tbody>';
    return table;
  }
  if (kind === "image") {
    const image = document.createElement("img");
    image.src = "https://placehold.co/600x300/png";
    image.alt = "Describe this image";
    image.style.cssText =
      "display:block;width:100%;max-width:600px;height:auto;";
    return image;
  }
  if (kind === "divider") {
    const divider = document.createElement("hr");
    divider.style.cssText =
      "margin:24px 0;border:0;border-top:1px solid #e4e4e7;";
    return divider;
  }
  const table = document.createElement("table");
  table.setAttribute("role", "presentation");
  table.setAttribute("width", "100%");
  table.innerHTML =
    '<tbody><tr><td style="padding:24px;background:#f4f4f5"><p style="margin:0;font-size:15px;line-height:24px">New section</p></td></tr></tbody>';
  return table;
}

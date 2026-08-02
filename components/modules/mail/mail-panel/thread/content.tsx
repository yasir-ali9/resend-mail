"use client";

import { useCallback, useRef, useState } from "react";

interface EmailContentProps {
  html?: string | null;
  text: string;
  subject: string;
}

const documentPolicy = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "font-src data:",
  "img-src https: data: cid: blob:",
  "media-src data: blob:",
  "style-src 'unsafe-inline'",
].join("; ");

const documentHead = `
  <meta http-equiv="Content-Security-Policy" content="${documentPolicy}">
  <meta name="referrer" content="no-referrer">
  <meta name="color-scheme" content="light">
  <style>
    :root { color-scheme: light; }
    html {
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      color: #202124;
      overflow: hidden;
    }
    body {
      box-sizing: border-box;
      margin: 0;
      padding: 24px 18px;
      overflow-wrap: anywhere;
      overflow: hidden;
    }
    @media (max-width: 640px) {
      body {
        padding: 18px 10px;
      }
    }
    *, *::before, *::after { box-sizing: inherit; }
    blockquote {
      margin: 0 0 0 0.8ex;
      padding-left: 1ex;
      border-left: 1px solid #cccccc;
    }
    img, video, table { max-width: 100%; }
    img { height: auto; }
    pre { white-space: pre-wrap; }
    ::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    ::-webkit-scrollbar-track {
      background: transparent !important;
    }
    ::-webkit-scrollbar-thumb {
      background: #d8dae4 !important;
      border-radius: 99px;
      border: 1px solid #e8e9f0 !important;
    }
    ::-webkit-scrollbar-thumb:hover,
    ::-webkit-scrollbar-thumb:active {
      background: #cbcdda !important;
    }
  </style>
`;

export function EmailContent({
  html,
  text,
  subject,
}: EmailContentProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(420);
  const resizeIframe = useCallback(() => {
    const iframe = iframeRef.current;
    const documentElement = iframe?.contentDocument?.documentElement;
    const body = iframe?.contentDocument?.body;

    if (!documentElement || !body) {
      return;
    }

    setIframeHeight(
      Math.max(
        120,
        documentElement.scrollHeight,
        body.scrollHeight,
        documentElement.offsetHeight,
        body.offsetHeight,
      ),
    );
  }, []);
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    const body = iframe?.contentDocument?.body;

    resizeIframe();
    window.requestAnimationFrame(resizeIframe);
    window.setTimeout(resizeIframe, 250);

    if (!body) {
      return;
    }

    const images = Array.from(body.querySelectorAll("img"));
    for (const image of images) {
      image.addEventListener("load", resizeIframe, { once: true });
      image.addEventListener("error", resizeIframe, { once: true });
    }
  }, [resizeIframe]);

  if (!html?.trim()) {
    return (
      <p className="max-w-full break-words whitespace-pre-wrap py-6 text-[13px] leading-6 text-fg-50 [overflow-wrap:anywhere]">
        {text || "This email has no content."}
      </p>
    );
  }

  return (
    <div className="py-4">
      <iframe
        ref={iframeRef}
        title={`Email content: ${subject}`}
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
        srcDoc={createEmailDocument(html)}
        onLoad={handleIframeLoad}
        style={{ height: iframeHeight }}
        className="w-full rounded-md border-0 bg-bk-100"
      />
      <p className="mt-2 text-[9px] text-fg-70">
        Email content is isolated. Scripts, forms, and navigation are blocked.
      </p>
    </div>
  );
}

function createEmailDocument(html: string) {
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${documentHead}`);
  }

  if (/<html[\s>]/i.test(html)) {
    return html.replace(
      /<html([^>]*)>/i,
      `<html$1><head>${documentHead}</head>`,
    );
  }

  return `<!doctype html>
    <html>
      <head>${documentHead}</head>
      <body>${html}</body>
    </html>`;
}

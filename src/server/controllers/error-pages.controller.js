'use strict';

function requestWantsHtml(req) {
  const accept = String(req.headers?.accept || '');
  return accept.includes('text/html');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildErrorPageHtml({ statusCode, title, message, requestPath }) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeRequestPath = escapeHtml(requestPath);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${statusCode} ${safeTitle} | Hope Apartments</title>
    <style>
      :root {
        --bg: #f4efe5;
        --panel: rgba(255, 250, 242, 0.88);
        --ink: #1b1712;
        --muted: #5f5548;
        --line: rgba(127, 100, 62, 0.18);
        --brand: #d98e2c;
        --brand-dark: #a45b08;
        --shadow: rgba(59, 46, 28, 0.14);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        color: var(--ink);
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(217, 142, 44, 0.18), transparent 32%),
          radial-gradient(circle at 85% 15%, rgba(82, 60, 31, 0.12), transparent 28%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.35), transparent 18%),
          var(--bg);
      }

      main {
        width: min(720px, 100%);
        padding: 32px;
        border: 1px solid var(--line);
        border-radius: 28px;
        background:
          linear-gradient(180deg, rgba(255, 251, 246, 0.92), rgba(255, 247, 236, 0.82)),
          var(--panel);
        box-shadow: 0 32px 70px var(--shadow);
      }

      .eyebrow {
        margin: 0 0 10px;
        color: var(--brand-dark);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.6rem, 7vw, 4.8rem);
        line-height: 0.9;
        font-family: Georgia, serif;
      }

      h2 {
        margin: 10px 0 0;
        font-size: clamp(1.4rem, 4vw, 2rem);
        font-family: Georgia, serif;
      }

      p {
        color: var(--muted);
        line-height: 1.7;
      }

      code {
        padding: 0.18rem 0.42rem;
        border-radius: 999px;
        background: rgba(217, 142, 44, 0.12);
        color: var(--brand-dark);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 150px;
        padding: 12px 18px;
        border-radius: 999px;
        border: 1px solid transparent;
        text-decoration: none;
        font-weight: 700;
      }

      .btn-primary {
        background: linear-gradient(135deg, var(--brand), #f3b35a);
        color: #22180d;
      }

      .btn-secondary {
        border-color: rgba(164, 91, 8, 0.28);
        background: rgba(255, 248, 237, 0.7);
        color: var(--brand-dark);
      }

      .meta {
        margin-top: 22px;
        padding-top: 18px;
        border-top: 1px solid var(--line);
        font-size: 0.95rem;
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Hope Apartments</p>
      <h1>${statusCode}</h1>
      <h2>${safeTitle}</h2>
      <p>${safeMessage}</p>
      <div class="actions">
        <a class="btn btn-primary" href="/">Go Home</a>
        <a class="btn btn-secondary" href="/admin/login">Admin Login</a>
        <a class="btn btn-secondary" href="/docs/public">Partner Docs</a>
      </div>
      <p class="meta">Request path: <code>${safeRequestPath}</code></p>
    </main>
  </body>
</html>`;
}

function sendErrorPage(res, { statusCode, title, message, requestPath }) {
  return res
    .status(statusCode)
    .type('html')
    .send(
      buildErrorPageHtml({
        statusCode,
        title,
        message,
        requestPath,
      })
    );
}

module.exports = {
  requestWantsHtml,
  sendErrorPage,
};

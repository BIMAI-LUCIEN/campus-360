import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const escapeHtml = (input: string) =>
  input.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

const isSafeScheme = (url: string): boolean => {
  // Only allow our mobile scheme to be used as the redirect target.
  return /^campus-bordes:\/\//.test(url);
};

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = (searchParams.get('token') || '').slice(0, 500);
  const error = (searchParams.get('error') || '').slice(0, 500);

  // Validate token shape: alphanumerics + dot/underscore/dash only.
  const tokenSafe = /^[A-Za-z0-9._\-]+$/.test(token) ? token : '';
  const errorSafe = /^[A-Za-z0-9._\- ]+$/.test(error) ? error : '';

  let redirectUrl = 'campus-bordes://reset-password';
  if (tokenSafe) {
    redirectUrl += `?token=${encodeURIComponent(tokenSafe)}`;
  } else if (errorSafe) {
    redirectUrl += `?error=${encodeURIComponent(errorSafe)}`;
  }

  if (!isSafeScheme(redirectUrl)) {
    return new NextResponse('Invalid request.', { status: 400 });
  }

  // All user-controlled values go through escapeHtml before being placed in the
  // HTML body. redirectUrl itself is already constrained to the campus-bordes
  // scheme but we still escape it for belt-and-braces protection.
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Redirection...</title>
        <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f4f7fb;
            color: #1e293b;
          }
          .card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            text-align: center;
          }
          a {
            display: inline-block;
            margin-top: 1rem;
            color: #0284c7;
            text-decoration: none;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Redirection en cours vers Campus-Bordes...</h2>
          <p>Si vous n'etes pas redirige automatiquement, <a href="${escapeHtml(redirectUrl)}">cliquez ici</a>.</p>
        </div>
        <script>
          window.location.replace(${JSON.stringify(redirectUrl)});
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Defensive: tell the browser this is a static HTML redirect.
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}

import { formatTrainingDate, parseTrainingDate } from './training-date.util';

/** Fields required to render the hospital certificate HTML template. */
export interface CertificateHtmlInput {
  EmployeeFullName?: string | null;
  EmployeeID: string;
  CourseName: string;
  SessionDate?: string | null;
  ExpiresAt?: string | null;
  CertificateNumber?: string | null;
}

function escapeHtml(value: string | null | undefined): string {
  if (value == null) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSessionDate(raw?: string | null): string {
  if (!raw) {
    return '';
  }
  const parsed = parseTrainingDate(raw);
  if (parsed) {
    return formatTrainingDate(parsed) || raw;
  }
  return raw;
}

/** Builds the full RTL certificate HTML document (wkhtmltopdf on backend). */
export function buildCertificateHtml(input: CertificateHtmlInput): string {
  const name = escapeHtml(input.EmployeeFullName || '');
  const course = escapeHtml(input.CourseName || '');
  const identity = escapeHtml(input.EmployeeID || '');
  const session = escapeHtml(formatSessionDate(input.SessionDate));
  const validUntil = escapeHtml(formatSessionDate(input.ExpiresAt));

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>תעודת סיום קורס — מרכז רפואי צפון</title>
  <style>
    :root {
      --navy: #183e54;
      --blue: #3098c3;
      --gold: #b89451;
      --ink: #213d4e;
      --muted: #62717b;
      --rule: #dce4e7;
    }

    * { box-sizing: border-box; }

    @page { size: A4 portrait; margin: 0; }

    html, body { margin: 0; padding: 0; }

    body {
      direction: rtl;
      background: #e9eef1;
      color: var(--ink);
      font-family: Arial, "Segoe UI", Tahoma, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      isolation: isolate;
      overflow: hidden;
      margin: 28px auto;
      background: #fff;
      box-shadow: 0 16px 48px rgba(24, 62, 84, .13);
    }

    /* Fine frame and small corner accents stay outside the text area. */
    .page-frame {
      position: absolute;
      inset: 11mm;
      border: 1px solid var(--rule);
      pointer-events: none;
    }

    .page-frame::before, .page-frame::after {
      content: "";
      position: absolute;
      width: 17mm;
      height: 17mm;
    }

    .page-frame::before {
      top: -1px;
      right: -1px;
      border-top: 2px solid var(--gold);
      border-right: 2px solid var(--gold);
    }

    .page-frame::after {
      bottom: -1px;
      left: -1px;
      border-bottom: 2px solid var(--gold);
      border-left: 2px solid var(--gold);
    }

    .corner { position: absolute; width: 0; height: 0; }
    .corner-top {
      top: 0; left: 0;
      border-top: 37mm solid var(--navy);
      border-right: 37mm solid transparent;
    }
    .corner-top::after {
      content: "";
      position: absolute;
      top: -37mm; left: 0;
      width: 0; height: 0;
      border-top: 25mm solid var(--blue);
      border-right: 25mm solid transparent;
    }
    .corner-bottom {
      right: 0; bottom: 0;
      border-bottom: 30mm solid var(--navy);
      border-left: 30mm solid transparent;
    }
    .corner-bottom::after {
      content: "";
      position: absolute;
      right: 0; bottom: -30mm;
      width: 0; height: 0;
      border-bottom: 19mm solid var(--gold);
      border-left: 19mm solid transparent;
    }

    .sheet-content {
      position: relative;
      z-index: 1;
      height: 100%;
      padding: 22mm 25mm 23mm;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10mm;
      flex: 0 0 30mm;
      padding-bottom: 7mm;
      border-bottom: 1px solid var(--rule);
    }

    .header-logo { display: block; max-width: 62mm; max-height: 23mm; }
    .header-logo img {
      display: block;
      width: auto;
      height: auto;
      max-width: 62mm;
      max-height: 23mm;
      object-fit: contain;
      color: var(--navy);
      font-size: 18px;
    }

    .header-label {
      margin: 0;
      padding-right: 4mm;
      border-right: 2px solid var(--gold);
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
      white-space: nowrap;
    }

    .certificate-content {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 9mm 0 6mm;
    }

    .cert-title {
      margin: 0;
      font-size: 50px;
      line-height: 1.2;
      font-weight: 700;
      color: var(--navy);
    }
    .cert-sub { margin: 12px 0 0; font-size: 19px; color: var(--muted); }
    .cert-name {
      max-width: 100%;
      margin: 18px 0 0;
      font-size: 42px;
      font-weight: 700;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }
    .cert-id {
      margin: 10px 0 0;
      font-size: 17px;
      line-height: 1.5;
      color: var(--muted);
    }
    .number { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }

    .ornament {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 54mm;
      margin: 25px 0 23px;
      flex: 0 0 auto;
    }
    .ornament::before, .ornament::after {
      content: "";
      height: 1px;
      flex: 1;
      background: var(--gold);
    }
    .ornament span {
      display: block;
      width: 6px;
      height: 6px;
      background: var(--gold);
      transform: rotate(45deg);
    }

    .cert-course-label { margin: 0; font-size: 20px; line-height: 1.5; color: var(--muted); }
    .cert-course {
      max-width: 100%;
      margin: 10px 0 0;
      font-size: 44px;
      line-height: 1.3;
      font-weight: 700;
      color: var(--navy);
      overflow-wrap: anywhere;
    }

    .validity-block {
      display: flex;
      align-items: baseline;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
      max-width: 100%;
      margin-top: 27px;
      font-size: 18px;
      line-height: 1.5;
    }
    .validity-label { color: var(--muted); }
    .validity-value {
      min-width: 32mm;
      padding: 0 5px 4px;
      border-bottom: 1px solid var(--gold);
      color: var(--navy);
      font-weight: 700;
    }

    .footer { flex: 0 0 auto; margin-top: 7mm; }
    .footer-fields {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      justify-content: center;
      gap: 22mm;
      flex-wrap: nowrap;
      text-align: center;
    }
    .signature-block, .date-block { width: 65mm; flex: 0 1 65mm; min-width: 0; }
    .signature-image-wrapper, .date-value {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      height: 23mm;
      padding: 0 3mm 3mm;
      margin: 0 0 3mm;
      border-bottom: 1px solid #9aabb5;
    }
    .signature-image { display: block; max-width: 55mm; max-height: 19mm; object-fit: contain; }
    .signer-name { display: block; margin-bottom: 4px; font-size: 17px; font-weight: 700; }
    .signature-label, .date-label { margin: 0; font-size: 14px; line-height: 1.5; color: var(--muted); }
    .date-value { font-size: 20px; font-weight: 700; line-height: 1.5; overflow-wrap: anywhere; }
    .date-only { justify-content: center; }

    @media screen and (max-width: 820px) {
      /* Preserve the A4 composition; narrow screens can scroll horizontally. */
      .page { margin: 12px; }
    }

    @media print {
      html, body { width: 210mm; height: 297mm; background: #fff; }
      .page { margin: 0; box-shadow: none; break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- Template fragment: interpolate using the same JavaScript template literal as the original. -->
  <article class="page" aria-labelledby="certificate-title">
    <div class="corner corner-top" aria-hidden="true"></div>
    <div class="corner corner-bottom" aria-hidden="true"></div>
    <div class="page-frame" aria-hidden="true"></div>

    <div class="sheet-content">
      <header class="header">
        <div class="header-logo">
          <img src="http://srv-ipracticom/RCF_WS/CoursesImages/tzafon-logo.png" alt="מרכז רפואי צפון">
        </div>
        <p class="header-label">תעודת סיום קורס</p>
      </header>

      <main class="certificate-content">
        <h1 class="cert-title" id="certificate-title">זאת לתעודה</h1>
        <p class="cert-sub">כי</p>
        <p class="cert-name"><bdi>${name}</bdi></p>
        <p class="cert-id">ת״ז: <bdi class="number" dir="ltr">${identity}</bdi></p>

        <div class="ornament" aria-hidden="true"><span></span></div>

        <p class="cert-course-label">עבר/ה בהצלחה קורס:</p>
        <h2 class="cert-course"><bdi>${course}</bdi></h2>
        <div class="validity-block">
          <span class="validity-label">תוקף עד:</span>
          <bdi class="validity-value number" dir="ltr">${validUntil}</bdi>
        </div>
      </main>

      <footer class="footer">
        <div class="footer-fields ${['ACLS', 'BLS'].includes(String(course).trim().toUpperCase()) ? '' : 'date-only'}">
          ${['ACLS', 'BLS'].includes(String(course).trim().toUpperCase()) ? `
          <div class="signature-block">
            <div class="signature-image-wrapper">
              <img class="signature-image"
                   src="/assets/images/resuscitation-coordinator-signature.png"
                   alt="חתימת מתאם תחום ההחייאה">
            </div>
            <span class="signer-name">עלאא ח'יר</span>
            <p class="signature-label">חתימת מתאם תחום ההחייאה</p>
          </div>
          ` : ''}

          <div class="date-block">
            <div class="date-value"><bdi class="number" dir="ltr">${session}</bdi></div>
            <p class="date-label">תאריך</p>
          </div>
        </div>
      </footer>
    </div>
  </article>
</body>
</html>
`;
}

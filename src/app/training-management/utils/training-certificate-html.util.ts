import { formatTrainingDate, parseTrainingDate } from './training-date.util';

/** Fields required to render the hospital certificate HTML template. */
export interface CertificateHtmlInput {
  EmployeeFullName?: string | null;
  EmployeeID: string;
  CourseName: string;
  SessionDate?: string | null;
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

  return `<!DOCTYPE html><html dir="rtl" lang="he"><head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<meta charset="utf-8"/>
<style>
    @page { size: A4 portrait; margin: 0; }
    html, body {
        font-family: Arial, Tahoma, 'Segoe UI', sans-serif;
        margin: 0; padding: 0;
        width: 210mm; min-height: 297mm; height: 297mm;
        background: #ffffff;
        position: relative;
        overflow: hidden;
    }
    .triangle-top-blue { position: absolute; top: 0; left: 0; width: 0; height: 0; border-top: 350px solid #35A1D6; border-right: 800px solid transparent; z-index: 1; }
    .triangle-top-gold { position: absolute; top: 0; left: 0; width: 0; height: 0; border-top: 250px solid #D6A848; border-right: 600px solid transparent; z-index: 2; }
    .triangle-bot-gold { position: absolute; bottom: 0; right: 0; width: 0; height: 0; border-bottom: 350px solid #D6A848; border-left: 800px solid transparent; z-index: 1; }
    .triangle-bot-blue { position: absolute; bottom: 0; right: 0; width: 0; height: 0; border-bottom: 250px solid #35A1D6; border-left: 600px solid transparent; z-index: 2; }
    .content-wrapper {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 10; padding: 50px 80px;
        display: block; text-align: center;
    }
    .header-logos { width: 100%; height: 120px; margin-bottom: 20px; }
    .logo-right { float: right; width: 180px; height: 100px; text-align: right; }
    .logo-left { float: left; width: 120px; height: 120px; text-align: left; }
    .logo-right img, .logo-left img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .clear { clear: both; }
    .cert-title { font-size: 56px; font-weight: 900; color: #2a2a2a; margin-top: 20px; letter-spacing: 1px; }
    .cert-sub { font-size: 26px; font-weight: bold; color: #555; margin-top: 15px; }
    .cert-name { font-size: 52px; font-weight: 900; color: #333; margin-top: 40px; }
    .cert-id { font-size: 24px; font-weight: bold; color: #333; margin-top: 10px; }
    .cert-course-label { font-size: 32px; font-weight: bold; color: #888; margin-top: 60px; }
    .cert-course { font-size: 65px; font-weight: 900; color: #333; margin-top: 5px; line-height: 1.1; }
    .footer { position: absolute; bottom: 80px; left: 80px; right: 80px; }
    .signatures { width: 100%; height: 120px; }
    .sig-block-right { float: right; width: 240px; text-align: center; }
    .sig-block-left { float: left; width: 240px; text-align: center; }
    .sig-line { border-bottom: 2px solid #222; height: 70px; margin-bottom: 15px; position: relative; }
    .sig-name { font-size: 22px; font-weight: bold; color: #222; margin-bottom: 5px; }
    .sig-title { font-size: 18px; font-weight: bold; color: #555; }
    .date-block { width: 200px; margin: 0 auto; text-align: center; clear: both; padding-top: 20px; }
    .date-val { font-size: 22px; font-weight: bold; color: #222; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 8px; }
    .date-label { font-size: 20px; font-weight: bold; color: #222; }
</style>
</head><body>
<div class="triangle-top-blue"></div>
<div class="triangle-top-gold"></div>
<div class="triangle-bot-gold"></div>
<div class="triangle-bot-blue"></div>
<div class="content-wrapper">
<div class="header-logos">
<div class="logo-right"></div>
<div class="logo-left"></div>
<div class="clear"></div>
</div>
<div class="cert-title">זאת לתעודה</div>
<div class="cert-sub">כי</div>
<div class="cert-name">${name}</div>
<div class="cert-id">ת&quot;ז: ${identity}</div>
<div class="cert-course-label">השתתף/ה בקורס</div>
<div class="cert-course">${course}</div>
<div class="footer">
<div class="signatures">
<div class="sig-block-right">
<div class="sig-line"></div>
<div class="sig-name">גב' מלכה אמר-מדמון</div>
<div class="sig-title">מנהלת הסיעוד</div>
</div>
<div class="sig-block-left">
<div class="sig-line"></div>
<div class="sig-name">ד&quot;ר נועם יהודאי</div>
<div class="sig-title">מנהל המרכז הרפואי</div>
</div>
</div>
<div class="date-block">
<div class="date-val">${session}</div>
<div class="date-label">תאריך</div>
</div>
</div>
</div>
</body></html>`;
}

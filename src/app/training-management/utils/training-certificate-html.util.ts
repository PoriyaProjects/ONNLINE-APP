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
<html dir="rtl" lang="he">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta charset="utf-8"/>

    <style>
        /* 1. Reset and Print Setup */
        * {
            box-sizing: border-box;
        }

        @page {
            size: A4 portrait;
            margin: 0; /* Ensures edge-to-edge printing */
        }

        html,
        body {
            font-family: Arial, Tahoma, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 0;
            /* A subtle gray background to see the paper boundaries on a monitor */
            background: #e0e0e0; 
            direction: rtl;
        }

        /* 2. The Physical Paper Wrapper */
        .page {
            width: 210mm;
            height: 297mm;
            background: #ffffff;
            margin: 0 auto; /* Centers the paper on the screen */
            position: relative;
            overflow: hidden; /* Clips the background triangles so they don't break the page */
        }

        /* 3. Strip screen styling for the actual printer */
        @media print {
            html, body {
                background: #ffffff;
            }
            .page {
                margin: 0;
                box-shadow: none;
            }
        }

        /* =========================
           BACKGROUND DECORATIONS
           ========================= */

        .triangle-top-blue {
            position: absolute;
            top: 0;
            left: 0;
            width: 0;
            height: 0;
            border-top: 350px solid #35A1D6;
            border-right: 800px solid transparent;
            z-index: 1;
        }

        .triangle-top-gold {
            position: absolute;
            top: 0;
            left: 0;
            width: 0;
            height: 0;
            border-top: 250px solid #D6A848;
            border-right: 600px solid transparent;
            z-index: 2;
        }

        .triangle-bot-gold {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 0;
            height: 0;
            border-bottom: 350px solid #D6A848;
            border-left: 800px solid transparent;
            z-index: 1;
        }

        .triangle-bot-blue {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 0;
            height: 0;
            border-bottom: 250px solid #35A1D6;
            border-left: 600px solid transparent;
            z-index: 2;
        }

        /* =========================
           MAIN CONTENT
           ========================= */

        .content-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10;
            padding: 35px 80px 50px;
            text-align: center;
        }

        /* =========================
           LOGO
           ========================= */

        .header-logo {
            width: 100%;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 35px;
        }

        .header-logo img {
            display: block;
            max-width: 260px;
            max-height: 135px;
            width: auto;
            height: auto;
            object-fit: contain;
        }

        /* =========================
           CERTIFICATE CONTENT
           ========================= */

        .cert-title {
            font-size: 56px;
            line-height: 1;
            font-weight: 900;
            color: #2a2a2a;
            margin-top: 10px;
            letter-spacing: 1px;
        }

        .cert-sub {
            font-size: 26px;
            font-weight: bold;
            color: #555;
            margin-top: 14px;
        }

        .cert-name {
            font-size: 52px;
            line-height: 1.1;
            font-weight: 900;
            color: #333;
            margin-top: 32px;
        }

        .cert-id {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-top: 10px;
        }

        .cert-course-label {
            font-size: 30px;
            font-weight: bold;
            color: #888;
            margin-top: 45px;
        }

        .cert-course {
            font-size: 60px;
            line-height: 1.1;
            font-weight: 900;
            color: #333;
            margin-top: 5px;
        }

        /* =========================
           VALID UNTIL
           ========================= */

        .validity-block {
            margin-top: 30px;
            text-align: center;
        }

        .validity-label {
            display: inline-block;
            font-size: 23px;
            font-weight: bold;
            color: #555;
            margin-left: 8px;
        }

        .validity-value {
            display: inline-block;
            min-width: 150px;
            padding: 0 8px 6px;
            border-bottom: 2px solid #333;
            font-size: 25px;
            font-weight: 800;
            color: #222;
        }

        /* =========================
           FOOTER
           ========================= */

        .footer {
            position: absolute;
            bottom: 78px;
            left: 80px;
            right: 80px;
            z-index: 20;
        }

        .footer-fields {
            width: 100%;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            direction: rtl;
        }

        .footer-fields.date-only {
            justify-content: center;
        }

        /* =========================
           SIGNATURE
           ========================= */

        .signature-block {
            width: 300px;
            text-align: center;
        }

        .signature-image-wrapper {
            height: 75px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            border-bottom: 2px solid #222;
            margin-bottom: 12px;
            padding-bottom: 4px;
        }

        .signature-image {
            display: block;
            max-width: 230px;
            max-height: 70px;
            width: auto;
            height: auto;
            object-fit: contain;
        }

        .signature-label {
            font-size: 21px;
            font-weight: bold;
            color: #222;
            line-height: 1.3;
        }

        /* =========================
           DATE
           ========================= */

        .date-block {
            width: 220px;
            text-align: center;
        }

        .date-value {
            min-height: 32px;
            padding-bottom: 7px;
            border-bottom: 2px solid #222;
            font-size: 22px;
            font-weight: bold;
            color: #222;
            margin-bottom: 10px;
        }

        .date-label {
            font-size: 21px;
            font-weight: bold;
            color: #222;
        }
    </style>
</head>

<body>

    <!-- EVERYTHING IS NOW WRAPPED IN THE .page CONTAINER -->
    <div class="page">
    
        <!-- Decorative background -->
        <div class="triangle-top-blue"></div>
        <div class="triangle-top-gold"></div>

        <div class="triangle-bot-gold"></div>
        <div class="triangle-bot-blue"></div>

        <div class="content-wrapper">

            <!-- =========================
                 TZAFON MEDICAL CENTER LOGO
                 ========================= -->

            <div class="header-logo">
                <img
                    src="http://srv-ipracticom/RCF_WS/CoursesImages/tzafon-logo.png"
                    alt="מרכז רפואי צפון"
                />
            </div>

            <!-- =========================
                 CERTIFICATE
                 ========================= -->

            <div class="cert-title">
                זאת לתעודה
            </div>

            <div class="cert-sub">
                כי
            </div>

            <div class="cert-name">
                ${name}
            </div>

            <div class="cert-id">
                ת&quot;ז: ${identity}
            </div>

            <div class="cert-course-label">
                עבר/ה בהצלחה קורס:
            </div>

            <div class="cert-course">
                ${course}
            </div>

            <!-- =========================
                 VALID UNTIL
                 ========================= -->

            <div class="validity-block">

                <span class="validity-label">
                    תוקף עד:
                </span>

                <span class="validity-value">
                    ${validUntil}
                </span>

            </div>

            <!-- =========================
                 FOOTER
                 ========================= -->

            <div class="footer">

                <div class="footer-fields ${String(course).trim().toUpperCase() === 'ACLS' ? '' : 'date-only'}">

                    <!--
                        Show resuscitation coordinator signature
                        ONLY for ACLS/BLS certificates.
                    -->

                    ${
                        String(course).trim().toUpperCase() === 'ACLS' || String(course).trim().toUpperCase() === 'BLS'
                            ? `
                                <div class="signature-block">

                                    <div class="signature-image-wrapper">
                                        <img
                                            class="signature-image"
                                            src="/assets/images/resuscitation-coordinator-signature.png"
                                            alt="חתימת מתאם תחום ההחייאה"
                                        />
                                        עלאא ח'יר
                                    </div>

                                    <div class="signature-label">
                                        חתימת מתאם תחום ההחייאה
                                    </div>

                                </div>
                            `
                            : ''
                    }

                    <!-- Date - always visible -->
                    <div class="date-block">

                        <div class="date-value">
                            ${session}
                        </div>

                        <div class="date-label">
                            תאריך
                        </div>

                    </div>

                </div>

            </div>

        </div> <!-- End content-wrapper -->

    </div> <!-- End .page wrapper -->

</body>
</html>`;
}

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
        /* =========================
           RESET + PRINT
           ========================= */

        * {
            box-sizing: border-box;
        }

        @page {
            size: A4 portrait;
            margin: 0;
        }

        html,
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, Tahoma, 'Segoe UI', sans-serif;
            background: #e0e0e0;
            direction: rtl;
        }

        /* =========================
           A4 PAGE
           ========================= */

        .page {
            width: 210mm;
            height: 297mm;
            background: #ffffff;
            margin: 0 auto;
            position: relative;
            overflow: hidden;
        }

        @media print {
            html,
            body {
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
           LOGO
           ========================= */

        .header-logo {
            position: absolute;

            /* Logo closer to the top-right corner */
            top: 24px;
            right: 32px;

            z-index: 30;

            display: flex;
            align-items: flex-start;
            justify-content: flex-end;
        }

        .header-logo img {
            display: block;

            max-width: 250px;
            max-height: 115px;

            width: auto;
            height: auto;

            object-fit: contain;
        }

        /* =========================
           MAIN CERTIFICATE CONTENT
           ========================= */

        .content-wrapper {
            position: absolute;

            top: 0;
            right: 0;
            bottom: 0;
            left: 0;

            z-index: 10;

            /*
             * Use almost the entire sheet instead of having the
             * certificate stuck near the top.
             */
            padding: 120px 65px 185px;

            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            text-align: center;
        }

        .certificate-content {
            width: 100%;
            max-width: 720px;

            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        /* =========================
           CERTIFICATE TEXT
           ========================= */

        .cert-title {
            font-size: 56px;
            line-height: 1;
            font-weight: 900;
            color: #2a2a2a;

            margin: 0;

            letter-spacing: 1px;
        }

        .cert-sub {
            font-size: 26px;
            font-weight: bold;
            color: #555;

            margin-top: 18px;
        }

        .cert-name {
            font-size: 52px;
            line-height: 1.1;
            font-weight: 900;
            color: #333;

            margin-top: 35px;
        }

        .cert-id {
            font-size: 24px;
            font-weight: bold;
            color: #333;

            margin-top: 12px;
        }

        .cert-course-label {
            font-size: 30px;
            font-weight: bold;
            color: #888;

            margin-top: 48px;
        }

        .cert-course {
            font-size: 60px;
            line-height: 1.1;
            font-weight: 900;
            color: #333;

            margin-top: 8px;

            max-width: 100%;
        }

        /* =========================
           VALID UNTIL
           ========================= */

        .validity-block {
            margin-top: 32px;
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

            /*
             * Keep the footer inside the printable page,
             * while giving it enough width for both fields.
             */
            bottom: 65px;
            left: 65px;
            right: 65px;

            z-index: 20;
        }

        /*
         * Signature + date ALWAYS stay on the SAME ROW.
         */
        .footer-fields {
            width: 100%;

            display: flex;
            flex-direction: row;
            align-items: flex-end;
            justify-content: center;

            gap: 90px;

            direction: rtl;

            flex-wrap: nowrap;
        }

        /*
         * If the certificate has no signature,
         * center the date by itself.
         */
        .footer-fields.date-only {
            justify-content: center;
        }

        /* =========================
           SIGNATURE
           ========================= */

        .signature-block {
            width: 300px;
            flex: 0 0 300px;

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
            width: 240px;
            flex: 0 0 240px;

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

    <div class="page">

        <!-- Decorative background -->
        <div class="triangle-top-blue"></div>
        <div class="triangle-top-gold"></div>

        <div class="triangle-bot-gold"></div>
        <div class="triangle-bot-blue"></div>


        <!-- =========================
             LOGO
             ========================= -->

        <div class="header-logo">
            <img
                src="http://srv-ipracticom/RCF_WS/CoursesImages/tzafon-logo.png"
                alt="מרכז רפואי צפון"
            />
        </div>


        <!-- =========================
             MAIN CERTIFICATE
             ========================= -->

        <div class="content-wrapper">

            <div class="certificate-content">

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
                    ת"ז: ${identity}
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

            </div>

        </div>


        <!-- =========================
             FOOTER
             ========================= -->

        <div class="footer">

            <div
                class="footer-fields ${
                    ['ACLS', 'BLS'].includes(
                        String(course).trim().toUpperCase()
                    )
                        ? ''
                        : 'date-only'
                }"
            >

                <!--
                    Signature is displayed for
                    ACLS and BLS certificates.
                -->

                ${
                    ['ACLS', 'BLS'].includes(
                        String(course).trim().toUpperCase()
                    )
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


                <!-- =========================
                     DATE
                     ========================= -->

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

    </div>

</body>

</html>`;
}

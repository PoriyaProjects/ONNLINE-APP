import { buildCertificateHtml } from './training-certificate-html.util';

describe('buildCertificateHtml', () => {
  it('escapes HTML in user fields', () => {
    const html = buildCertificateHtml({
      EmployeeFullName: '<script>alert(1)</script>',
      EmployeeID: '100',
      CourseName: 'BLS & ACLS',
      SessionDate: '2026-08-01',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('BLS &amp; ACLS');
  });

  it('includes Hebrew title and employee identity', () => {
    const html = buildCertificateHtml({
      EmployeeFullName: 'ישראל ישראלי',
      EmployeeID: '123456789',
      CourseName: 'הדרכת BLS',
      SessionDate: '2026-08-01',
    });
    expect(html).toContain('זאת לתעודה');
    expect(html).toContain('ישראל ישראלי');
    expect(html).toContain('123456789');
    expect(html).toContain('הדרכת BLS');
    expect(html).toContain('dir="rtl"');
  });

  it('renders formatted ExpiresAt as validUntil', () => {
    const html = buildCertificateHtml({
      EmployeeFullName: 'Test',
      EmployeeID: '100',
      CourseName: 'BLS',
      SessionDate: '2026-08-01',
      ExpiresAt: '2028-08-01',
    });
    expect(html).toContain('תוקף עד:');
    expect(html).toContain('2028-08-01');
  });
});

/**
 * PayLeef — Tax Invoice PDF Generator
 * Format: PL-YYYYNNNN (FY-based, resets April 1)
 * Produces a GST-compliant Indian tax invoice via PDFKit
 */

const PDFDocument = require('pdfkit');

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

// ── Dinmind company details (seller) ─────────────────────────────────────────
const SELLER = {
  name:    'Dinmind Infotech Pvt Ltd',
  address: 'Chennai, Tamil Nadu',
  gstin:   process.env.DINMIND_GSTIN   || '33XXXXX0000X1ZX',
  pan:     process.env.DINMIND_PAN     || 'XXXXX0000X',
  state:   'Tamil Nadu',
  stateCode: '33',
  email:   'dinesh@dinmind.in',
  phone:   '+91-9500-168-031',
  website: 'www.dinmind.com',
};

const BRAND_COLOR  = '#1A7A4A';
const NAVY         = '#0F172A';
const SLATE        = '#64748B';
const LIGHT        = '#F1F5F9';

/**
 * Generate tax invoice PDF buffer
 * @param {Object} invoice - invoice record from DB
 * @param {Object} order   - payment_orders record
 * @returns {Promise<Buffer>}
 */
function generateInvoicePDF(invoice, order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PW = doc.page.width;
      const PH = doc.page.height;
      const ML = 40;
      const W  = PW - 80;

      // ── Header band ───────────────────────────────────────────────────────
      doc.rect(0, 0, PW, 90).fill(NAVY);
      doc.rect(0, 86, PW, 4).fill(BRAND_COLOR);

      // Company name left
      doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
         .text(SELLER.name, ML, 16, { width: W - 160 });
      doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.65)')
         .text(`${SELLER.address}  ·  GSTIN: ${SELLER.gstin}  ·  PAN: ${SELLER.pan}`, ML, 40, { width: W - 160 });
      doc.fontSize(7).fillColor('rgba(255,255,255,0.45)')
         .text(`${SELLER.email}  ·  ${SELLER.phone}  ·  ${SELLER.website}`, ML, 53, { width: W - 160 });

      // Invoice badge right
      doc.rect(PW - 168, 10, 128, 68).fill('rgba(255,255,255,0.08)');
      doc.fillColor(BRAND_COLOR).fontSize(9).font('Helvetica-Bold')
         .text('TAX INVOICE', PW - 164, 18, { width: 120, align: 'center' });
      doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
         .text(invoice.invoice_number, PW - 164, 30, { width: 120, align: 'center' });
      doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.6)')
         .text(new Date(invoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
           PW - 164, 52, { width: 120, align: 'center' });

      let y = 104;

      // ── Billed To + Order Details ─────────────────────────────────────────
      const col1 = ML, col2 = ML + W / 2 + 10;

      doc.rect(ML, y, W / 2 - 5, 100).fill(LIGHT);
      doc.rect(col2 - 5, y, W / 2 - 5, 100).fill(LIGHT);

      // Billed To
      doc.fillColor(SLATE).fontSize(7.5).font('Helvetica-Bold')
         .text('BILLED TO', col1 + 10, y + 8);
      doc.fillColor(NAVY).fontSize(10).font('Helvetica-Bold')
         .text(invoice.customer_name || '—', col1 + 10, y + 20);
      doc.fillColor(NAVY).fontSize(8.5).font('Helvetica')
         .text(invoice.company_name || '', col1 + 10, y + 34);
      if (invoice.billing_address) {
        doc.fillColor(SLATE).fontSize(8).font('Helvetica')
           .text(invoice.billing_address, col1 + 10, y + 46, { width: W / 2 - 30 });
      }
      if (invoice.gst_number) {
        doc.fillColor(SLATE).fontSize(8).font('Helvetica')
           .text(`GSTIN: ${invoice.gst_number}`, col1 + 10, y + 80);
      }
      doc.fillColor(SLATE).fontSize(8).font('Helvetica')
         .text(invoice.customer_email || '', col1 + 10, y + 88);

      // Order Details
      const pairs = [
        ['Invoice No.',  invoice.invoice_number],
        ['Date',         new Date(invoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
        ['Order ID',     order.razorpay_order_id || '—'],
        ['Payment ID',   order.razorpay_payment_id || '—'],
        ['Plan',         invoice.plan_name || 'PayLeef Subscription'],
        ['Payment Mode', 'Online (Razorpay)'],
      ];
      doc.fillColor(SLATE).fontSize(7.5).font('Helvetica-Bold')
         .text('ORDER DETAILS', col2 + 5, y + 8);
      pairs.forEach(([k, v], i) => {
        const ry = y + 20 + i * 13;
        doc.fillColor(SLATE).fontSize(7.5).font('Helvetica').text(k, col2 + 5, ry, { width: 70 });
        doc.fillColor(NAVY).fontSize(7.5).font('Helvetica').text(v || '—', col2 + 78, ry, { width: W / 2 - 90 });
      });

      y += 112;

      // ── Line items table ──────────────────────────────────────────────────
      // Header
      doc.rect(ML, y, W, 22).fill(NAVY);
      const cols = [
        { x: ML + 8,      w: 300, label: 'DESCRIPTION',    align: 'left'  },
        { x: ML + 308,    w: 80,  label: 'SAC CODE',       align: 'center'},
        { x: ML + 388,    w: 90,  label: 'AMOUNT (₹)',     align: 'right' },
        { x: ML + W - 80, w: 72,  label: 'TOTAL (₹)',      align: 'right' },
      ];
      cols.forEach(c => {
        doc.fillColor('white').fontSize(7.5).font('Helvetica-Bold')
           .text(c.label, c.x, y + 7, { width: c.w, align: c.align });
      });
      y += 22;

      // Line item
      doc.rect(ML, y, W, 32).fill('#F8FAFC');
      doc.rect(ML, y, W, 32).lineWidth(0.3).stroke('#E2E8F0');
      const planDesc = invoice.plan_name || 'PayLeef Subscription';
      doc.fillColor(NAVY).fontSize(9).font('Helvetica-Bold').text(planDesc, ML + 8, y + 8, { width: 296 });
      doc.fillColor(SLATE).fontSize(7.5).font('Helvetica').text('Software Subscription — 1 Month', ML + 8, y + 20, { width: 296 });
      doc.fillColor(SLATE).fontSize(8).font('Helvetica')
         .text('998313', ML + 308, y + 12, { width: 80, align: 'center' }); // SAC code for software services
      doc.fillColor(NAVY).fontSize(9).font('Helvetica')
         .text(INR(invoice.base_amount), ML + 388, y + 12, { width: 90, align: 'right' });
      doc.fillColor(NAVY).fontSize(9).font('Helvetica')
         .text(INR(invoice.base_amount), ML + W - 80, y + 12, { width: 72, align: 'right' });
      y += 32;

      // ── Tax summary ───────────────────────────────────────────────────────
      const taxRows = [];
      if (Number(invoice.cgst_amount) > 0) {
        taxRows.push(['CGST @ 9%', INR(invoice.cgst_amount)]);
        taxRows.push(['SGST @ 9%', INR(invoice.sgst_amount)]);
      } else if (Number(invoice.igst_amount) > 0) {
        taxRows.push(['IGST @ 18%', INR(invoice.igst_amount)]);
      }

      const summaryX = ML + W - 240;
      const summaryW = 240;

      // Subtotal
      doc.rect(summaryX, y, summaryW, 20).fill('#F8FAFC').lineWidth(0.3).stroke('#E2E8F0');
      doc.fillColor(SLATE).fontSize(8).font('Helvetica')
         .text('Sub-Total', summaryX + 8, y + 6, { width: 140 });
      doc.fillColor(NAVY).fontSize(8).font('Helvetica')
         .text(INR(invoice.base_amount), summaryX + 8, y + 6, { width: summaryW - 16, align: 'right' });
      y += 20;

      // Tax rows
      taxRows.forEach(([label, amt]) => {
        doc.rect(summaryX, y, summaryW, 20).fill('#F8FAFC').lineWidth(0.3).stroke('#E2E8F0');
        doc.fillColor(SLATE).fontSize(8).font('Helvetica')
           .text(label, summaryX + 8, y + 6, { width: 140 });
        doc.fillColor(NAVY).fontSize(8).font('Helvetica')
           .text(amt, summaryX + 8, y + 6, { width: summaryW - 16, align: 'right' });
        y += 20;
      });

      // Grand total
      doc.rect(summaryX, y, summaryW, 28).fill(BRAND_COLOR);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text('TOTAL AMOUNT', summaryX + 8, y + 8, { width: 130 });
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
         .text(INR(invoice.total_amount), summaryX + 8, y + 8, { width: summaryW - 16, align: 'right' });
      y += 36;

      // Amount in words
      y += 8;
      doc.fillColor(SLATE).fontSize(7.5).font('Helvetica-Bold')
         .text('Amount in Words: ', ML, y, { continued: true });
      doc.font('Helvetica').fillColor(NAVY)
         .text(amountInWords(Math.round(invoice.total_amount)) + ' Only');
      y += 14;

      // ── GST note ─────────────────────────────────────────────────────────
      if (!invoice.gst_number) {
        doc.rect(ML, y, W, 18).fill('#FEF9C3');
        doc.fillColor('#92400E').fontSize(7.5).font('Helvetica')
           .text('Note: GST not applicable for this invoice as GSTIN was not provided by the customer.', ML + 8, y + 5, { width: W - 16 });
        y += 22;
      }

      // ── Declaration ───────────────────────────────────────────────────────
      y += 10;
      doc.moveTo(ML, y).lineTo(ML + W, y).lineWidth(0.5).stroke('#CBD5E1');
      y += 12;
      doc.fillColor(SLATE).fontSize(7.5).font('Helvetica')
         .text('Declaration: We hereby declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.', ML, y, { width: W - 180 });

      // Signature block
      doc.rect(ML + W - 160, y - 8, 160, 60).fill('#F8FAFC').lineWidth(0.3).stroke('#E2E8F0');
      doc.fillColor(SLATE).fontSize(7.5).font('Helvetica-Bold')
         .text('For Dinmind Infotech Pvt Ltd', ML + W - 155, y - 2, { width: 150, align: 'center' });
      doc.moveTo(ML + W - 155, y + 38).lineTo(ML + W - 10, y + 38).lineWidth(0.5).stroke('#CBD5E1');
      doc.fillColor(SLATE).fontSize(7).font('Helvetica')
         .text('Authorised Signatory', ML + W - 155, y + 42, { width: 145, align: 'center' });

      y += 70;

      // ── Footer ────────────────────────────────────────────────────────────
      doc.moveTo(ML, y).lineTo(ML + W, y).lineWidth(0.5).stroke('#E2E8F0');
      y += 6;
      doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica')
         .text(
           `This is a computer-generated invoice. No physical signature required. ` +
           `SAC Code 998313 — Software Subscription Service. Subject to Chennai jurisdiction.`,
           ML, y, { width: W, align: 'center' }
         );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── Indian number words ───────────────────────────────────────────────────────
function amountInWords(amount) {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens  = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function toWords(n) {
    if (n === 0) return '';
    if (n < 20)  return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
    if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
    return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
  }
  return 'Rupees ' + (toWords(amount) || 'Zero');
}

// ── FY year helper ────────────────────────────────────────────────────────────
function getFYYear(date = new Date()) {
  const month = date.getMonth() + 1; // 1-12
  return month >= 4 ? date.getFullYear() : date.getFullYear() - 1;
}

module.exports = { generateInvoicePDF, getFYYear };

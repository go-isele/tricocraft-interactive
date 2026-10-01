// Generates a proforma invoice (before payment/LPO approval) or a tax
// invoice (once invoiced/paid, optionally carrying a KRA e-TIMS fiscal
// number) as a real downloadable PDF, using pdfkit — a pure-JS PDF library
// with no native build step, so it's safe on any Node host.

const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const siteConfig = require('./site-config');

const LOGO_PATH = path.join(__dirname, '..', 'public', 'img', 'triocraft-icon.png');
const NAVY = siteConfig.brand.navy;
const ORANGE = siteConfig.brand.orange;

/**
 * @param {{ order:object, client:object, kind: 'proforma'|'tax_invoice', fiscal?: {invoiceNumber:string, qrDataUrl?:string, controlNumber?:string, simulated?:boolean}, category?: {name:string, service_code:string} }} params
 * @returns {Promise<Buffer>}
 */
function generateInvoicePdf({ order, client, kind, fiscal, category }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const isTax = kind === 'tax_invoice';
    const docTitle = isTax ? 'TAX INVOICE' : 'PROFORMA INVOICE';
    const unitPrice = order.quoted_price || order.calculated_unit_price || 0;
    const total = unitPrice * order.quantity;

    // v5 — real brand mark + canonical navy/orange in the PDF header.
    const hasLogo = fs.existsSync(LOGO_PATH);
    const textX = hasLogo ? 100 : 50;
    if (hasLogo) doc.image(LOGO_PATH, 50, 42, { width: 42 });
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(20).text('TrioCraft Brands Ltd', textX, 45, { continued: false });
    doc.font('Helvetica').fontSize(9).fillColor('#555')
      .text(siteConfig.address, textX)
      .text(`${siteConfig.email}  ·  ${siteConfig.phoneDisplay}`, textX)
      .moveDown(1.2);
    doc.x = 50;

    doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(15).text(docTitle);
    doc.font('Helvetica').fontSize(9).fillColor('#555')
      .text(`Order Reference: TC-ORD-${order.id}`)
      .text(`Date: ${new Date().toLocaleDateString('en-KE')}`);
    if (order.invoice_number) doc.text(`Invoice No: ${order.invoice_number}`);
    if (isTax && fiscal && fiscal.invoiceNumber) {
      doc.text(`KRA e-TIMS Fiscal No: ${fiscal.invoiceNumber}${fiscal.simulated ? '  (SIMULATED — not a real KRA fiscal receipt)' : ''}`);
      if (fiscal.controlNumber) doc.text(`Control No: ${fiscal.controlNumber}`);
    }
    if (order.invoice_due_date) doc.text(`Due Date: ${order.invoice_due_date}`);
    doc.moveDown(1);

    doc.fillColor('#000').font('Helvetica-Bold').fontSize(11).text('Bill To');
    doc.font('Helvetica').fontSize(10)
      .text(client.company || client.name)
      .text(client.name)
      .text(client.email);
    if (client.kra_pin) doc.text(`KRA PIN: ${client.kra_pin}`);
    doc.moveDown(1);

    // Line-item table
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 320, tableTop, { width: 50, align: 'right' });
    doc.text('Unit Price (KES)', 370, tableTop, { width: 90, align: 'right' });
    doc.text('Total (KES)', 460, tableTop, { width: 90, align: 'right' });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#ccc').stroke();

    let rowY = tableTop + 22;
    doc.font('Helvetica').fontSize(10);
    doc.text(order.title, 50, rowY, { width: 260 });
    doc.text(String(order.quantity), 320, rowY, { width: 50, align: 'right' });
    doc.text(unitPrice.toLocaleString(), 370, rowY, { width: 90, align: 'right' });
    doc.text(total.toLocaleString(), 460, rowY, { width: 90, align: 'right' });

    // v6 — every line item now tags its Service Category (A–K, from the
    // 11-division capability statement taxonomy — see db/seed.js) so an
    // institutional/bidding reviewer can map this invoice straight back to
    // the capability statement's service divisions.
    if (category && category.service_code) {
      rowY += 14;
      doc.fontSize(8.5).fillColor(ORANGE).text(`  Service Category ${category.service_code} — ${category.name}`, 50, rowY, { width: 400 });
      doc.fillColor('#000').fontSize(10);
    }

    if (order.options_json) {
      try {
        const opts = JSON.parse(order.options_json);
        opts.forEach((o) => {
          rowY += 16;
          doc.fontSize(8.5).fillColor('#666').text(`  ${o.optionName}: ${o.valueLabel}`, 50, rowY, { width: 260 });
        });
        doc.fillColor('#000').fontSize(10);
      } catch (e) { /* malformed options_json — skip line-item detail */ }
    }

    rowY += 26;
    doc.moveTo(50, rowY).lineTo(550, rowY).strokeColor('#ccc').stroke();
    rowY += 10;
    doc.font('Helvetica-Bold').text('Total Due', 370, rowY, { width: 90, align: 'right' });
    doc.text(`KES ${total.toLocaleString()}`, 460, rowY, { width: 90, align: 'right' });

    rowY += 30;
    doc.font('Helvetica').fontSize(9).fillColor('#555');
    if (order.payment_terms && order.payment_terms !== 'due_on_delivery') {
      const termsLabel = { net30: 'Net 30 days', net60: 'Net 60 days', net90: 'Net 90 days' }[order.payment_terms] || order.payment_terms;
      doc.text(`Payment Terms: ${termsLabel}${order.lpo_number ? ' · LPO No: ' + order.lpo_number : ''}`, 50, rowY);
      rowY += 14;
    }
    if (!isTax) {
      doc.text('This is a proforma invoice for reference only — not a demand for payment. A tax invoice will follow once the order is formally invoiced.', 50, rowY, { width: 500 });
    } else {
      doc.text('Thank you for your business. Please quote the invoice/order reference with any payment.', 50, rowY, { width: 500 });
    }

    // v5 — KRA e-TIMS QR. In simulated mode this encodes a payload that says
    // "SIMULATED" in plain text and is not a KRA verification link, so it
    // can never be mistaken for a genuine fiscal signature if scanned.
    if (isTax && fiscal && fiscal.qrDataUrl) {
      try {
        const base64 = fiscal.qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuf = Buffer.from(base64, 'base64');
        const qrY = rowY + 30;
        doc.image(qrBuf, 460, qrY, { width: 90 });
        doc.font('Helvetica-Bold').fontSize(7.5)
          .fillColor(fiscal.simulated ? '#B84A17' : '#555')
          .text(fiscal.simulated ? 'SIMULATED — NOT A REAL\nKRA VERIFICATION CODE' : 'Scan to verify with KRA e-TIMS', 455, qrY + 92, { width: 100, align: 'center' });
      } catch (e) { /* QR render failed upstream — skip silently, invoice still valid without it */ }
    }

    doc.end();
  });
}

module.exports = { generateInvoicePdf };

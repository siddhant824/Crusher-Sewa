const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 48;
const TOP = 760;
const LINE_HEIGHT = 18;

const escapePdfText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const pushLine = (commands, text, x, y, fontSize = 11) => {
  commands.push(`BT /F1 ${fontSize} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`);
};

const buildPdf = (commands) => {
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
};

export const buildInvoicePdfBuffer = (invoice) => {
  const order = invoice.order || {};
  const contractor = invoice.contractor || order.contractor || {};
  const items = order.items || [];
  const commands = [];

  commands.push("0.13 0.60 0.56 rg");
  commands.push(`0 ${PAGE_HEIGHT - 110} ${PAGE_WIDTH} 110 re f`);
  commands.push("1 1 1 rg");
  pushLine(commands, "Crusher Sewa Invoice", LEFT, TOP, 22);
  pushLine(commands, invoice.invoiceNumber || "Invoice", LEFT, TOP - 28, 14);

  commands.push("0 0 0 rg");
  pushLine(commands, `Generated: ${new Date(invoice.generatedAt || invoice.createdAt || Date.now()).toLocaleString()}`, LEFT, TOP - 90, 11);
  pushLine(commands, `Bill To: ${contractor.name || "Contractor"}`, LEFT, TOP - 112, 12);
  pushLine(commands, `Email: ${contractor.email || "-"}`, LEFT, TOP - 132, 11);
  pushLine(commands, `Order Total: ${formatCurrency(invoice.totalAmount || order.totalAmount)}`, 330, TOP - 112, 12);
  pushLine(commands, `Payment Status: ${order.paymentStatus || "-"}`, 330, TOP - 132, 11);

  let currentY = TOP - 190;
  pushLine(commands, "Materials", LEFT, currentY, 14);
  currentY -= 24;

  commands.push("0.95 0.96 0.97 rg");
  commands.push(`${LEFT} ${currentY - 8} 516 24 re f`);
  commands.push("0 0 0 rg");
  pushLine(commands, "#", LEFT + 8, currentY, 10);
  pushLine(commands, "Material", LEFT + 34, currentY, 10);
  pushLine(commands, "Qty", 320, currentY, 10);
  pushLine(commands, "Rate", 400, currentY, 10);
  pushLine(commands, "Subtotal", 480, currentY, 10);

  currentY -= 28;

  items.forEach((item, index) => {
    const materialName = item.materialName || "-";
    const quantityText = `${Number(item.quantity || 0).toFixed(2)} ${item.unit || ""}`.trim();
    pushLine(commands, String(index + 1), LEFT + 8, currentY, 10);
    pushLine(commands, materialName, LEFT + 34, currentY, 10);
    pushLine(commands, quantityText, 320, currentY, 10);
    pushLine(commands, formatCurrency(item.ratePerCuMetre), 400, currentY, 10);
    pushLine(commands, formatCurrency(item.subtotal), 480, currentY, 10);
    currentY -= 20;
  });

  currentY -= 18;
  pushLine(commands, `Subtotal: ${formatCurrency(invoice.subtotalAmount || invoice.totalAmount || order.totalAmount)}`, 360, currentY, 11);
  currentY -= 20;
  pushLine(commands, `Total: ${formatCurrency(invoice.totalAmount || order.totalAmount)}`, 360, currentY, 13);

  currentY -= 42;
  pushLine(commands, "Thank you for choosing Crusher Sewa.", LEFT, currentY, 11);
  currentY -= 18;
  pushLine(commands, "This invoice was generated digitally for your material supply order.", LEFT, currentY, 10);

  return buildPdf(commands);
};

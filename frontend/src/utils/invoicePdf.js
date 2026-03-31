const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 42;
const RIGHT = 553;

const escapePdfText = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const formatMoney = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const drawText = (text, x, y, size = 12, font = "F1", color = [0.11, 0.14, 0.17]) => {
  const [r, g, b] = color;

  return `BT
${r} ${g} ${b} rg
/${font} ${size} Tf
1 0 0 1 ${x} ${y} Tm
(${escapePdfText(text)}) Tj
ET`;
};

const drawLine = (x1, y1, x2, y2, width = 1) => `${width} w
${x1} ${y1} m
${x2} ${y2} l
S`;

const drawRect = (x, y, width, height, color, strokeColor = null) => {
  const [r, g, b] = color;
  const fillCommand = `${r} ${g} ${b} rg
${x} ${y} ${width} ${height} re
f`;

  if (!strokeColor) {
    return fillCommand;
  }

  const [sr, sg, sb] = strokeColor;
  return `${r} ${g} ${b} rg
${sr} ${sg} ${sb} RG
${x} ${y} ${width} ${height} re
B`;
};

const wrapText = (text, maxChars = 30) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
};

const buildPdfContent = (invoice) => {
  const commands = [];
  const generatedAt = new Date(invoice.generatedAt).toLocaleString();
  const items = invoice.order?.items || [];

  commands.push(drawRect(0, PAGE_HEIGHT - 120, PAGE_WIDTH, 120, [0.1, 0.6, 0.56]));
  commands.push(drawText("Crusher Sewa", LEFT, PAGE_HEIGHT - 62, 24, "F2", [1, 1, 1]));
  commands.push(drawText("Construction Material Invoice", LEFT, PAGE_HEIGHT - 88, 11, "F1", [1, 1, 1]));
  commands.push(drawText("INVOICE", RIGHT - 118, PAGE_HEIGHT - 60, 22, "F2", [1, 1, 1]));
  commands.push(drawText(invoice.invoiceNumber || "-", RIGHT - 118, PAGE_HEIGHT - 86, 12, "F1", [1, 1, 1]));

  commands.push(drawRect(LEFT, PAGE_HEIGHT - 205, 236, 66, [0.97, 0.98, 0.99], [0.87, 0.9, 0.93]));
  commands.push(drawRect(LEFT + 250, PAGE_HEIGHT - 205, 261, 66, [0.97, 0.98, 0.99], [0.87, 0.9, 0.93]));

  commands.push(drawText("BILL TO", LEFT + 14, PAGE_HEIGHT - 160, 10, "F2", [0.4, 0.46, 0.52]));
  commands.push(drawText(invoice.contractor?.name || "-", LEFT + 14, PAGE_HEIGHT - 182, 16, "F2"));
  commands.push(drawText(invoice.contractor?.email || "-", LEFT + 14, PAGE_HEIGHT - 200, 11, "F1", [0.34, 0.39, 0.44]));

  commands.push(drawText("INVOICE DETAILS", LEFT + 264, PAGE_HEIGHT - 160, 10, "F2", [0.4, 0.46, 0.52]));
  commands.push(drawText(`Generated: ${generatedAt}`, LEFT + 264, PAGE_HEIGHT - 182, 11, "F1", [0.34, 0.39, 0.44]));
  commands.push(drawText(`Order Total: ${formatMoney(invoice.totalAmount)}`, LEFT + 264, PAGE_HEIGHT - 200, 11, "F1", [0.34, 0.39, 0.44]));

  const tableTop = PAGE_HEIGHT - 252;
  const tableHeaderHeight = 28;
  const rowHeight = 28;
  const itemX = LEFT + 12;
  const materialX = LEFT + 62;
  const qtyX = 320;
  const rateX = 414;
  const subtotalX = 474;

  commands.push(drawText("MATERIALS", LEFT, tableTop + 18, 11, "F2", [0.4, 0.46, 0.52]));
  commands.push(drawRect(LEFT, tableTop - tableHeaderHeight, RIGHT - LEFT, tableHeaderHeight, [0.95, 0.96, 0.97]));
  commands.push(drawText("Item", itemX, tableTop - 18, 10, "F2", [0.37, 0.42, 0.47]));
  commands.push(drawText("Material", materialX, tableTop - 18, 10, "F2", [0.37, 0.42, 0.47]));
  commands.push(drawText("Qty", qtyX + 8, tableTop - 18, 10, "F2", [0.37, 0.42, 0.47]));
  commands.push(drawText("Rate", rateX + 8, tableTop - 18, 10, "F2", [0.37, 0.42, 0.47]));
  commands.push(drawText("Subtotal", subtotalX + 8, tableTop - 18, 10, "F2", [0.37, 0.42, 0.47]));

  let rowY = tableTop - tableHeaderHeight;

  items.forEach((item, index) => {
    const rowBottom = rowY - rowHeight;
    if (index % 2 === 0) {
      commands.push(drawRect(LEFT, rowBottom, RIGHT - LEFT, rowHeight, [0.99, 0.99, 0.99]));
    }

    const materialLines = wrapText(item.materialName, 22);
    commands.push(drawText(String(index + 1), itemX, rowBottom + 10, 10, "F2"));
    commands.push(drawText(materialLines[0], materialX, rowBottom + 10, 10, "F1"));
    if (materialLines[1]) {
      commands.push(drawText(materialLines[1], materialX, rowBottom + 2, 9, "F1"));
    }
    commands.push(
      drawText(
        `${Number(item.quantity).toFixed(2)} ${item.unit || ""}`.trim(),
        qtyX + 8,
        rowBottom + 10,
        10,
        "F1"
      )
    );
    commands.push(drawText(formatMoney(item.ratePerCuMetre), rateX + 8, rowBottom + 10, 10, "F1"));
    commands.push(drawText(formatMoney(item.subtotal), subtotalX + 8, rowBottom + 10, 10, "F2"));
    commands.push(drawLine(LEFT, rowBottom, RIGHT, rowBottom, 0.5));
    rowY = rowBottom;
  });

  commands.push(drawLine(LEFT, tableTop - tableHeaderHeight, RIGHT, tableTop - tableHeaderHeight, 0.8));
  commands.push(drawLine(LEFT, rowY, RIGHT, rowY, 0.8));
  commands.push(drawLine(LEFT, tableTop - tableHeaderHeight, LEFT, rowY, 0.8));
  commands.push(drawLine(RIGHT, tableTop - tableHeaderHeight, RIGHT, rowY, 0.8));

  const totalsBoxY = rowY - 122;
  commands.push(drawRect(332, totalsBoxY, 179, 86, [0.97, 0.98, 0.99], [0.87, 0.9, 0.93]));
  commands.push(drawText("Subtotal", 348, totalsBoxY + 58, 11, "F1", [0.34, 0.39, 0.44]));
  commands.push(drawText(formatMoney(invoice.subtotalAmount), 430, totalsBoxY + 58, 11, "F1"));
  commands.push(drawLine(348, totalsBoxY + 44, 495, totalsBoxY + 44, 0.5));
  commands.push(drawText("Total", 348, totalsBoxY + 22, 13, "F2"));
  commands.push(drawText(formatMoney(invoice.totalAmount), 418, totalsBoxY + 22, 13, "F2"));

  commands.push(drawText("Thank you for choosing Crusher Sewa.", LEFT, totalsBoxY + 16, 11, "F2", [0.22, 0.27, 0.32]));
  commands.push(
    drawText(
      "This invoice was generated digitally for construction material supply records.",
      LEFT,
      totalsBoxY - 2,
      9,
      "F1",
      [0.45, 0.49, 0.54]
    )
  );

  return commands.join("\n");
};

export const downloadInvoicePdf = (invoice) => {
  const stream = buildPdfContent(invoice);
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj",
    `4 0 obj << /Length ${stream.length} >> stream
${stream}
endstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefPosition = pdf.length;
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n 
`;
  });

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefPosition}
%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

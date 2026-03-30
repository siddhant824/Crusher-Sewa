const escapePdfText = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const buildPdfContent = (lines) => {
  const textCommands = lines
    .map((line, index) => `1 0 0 1 50 ${770 - index * 22} Tm (${escapePdfText(line)}) Tj`)
    .join("\n");

  return `BT
/F1 12 Tf
${textCommands}
ET`;
};

export const downloadInvoicePdf = (invoice) => {
  const lines = [
    `Crusher Sewa Invoice - ${invoice.invoiceNumber}`,
    `Generated: ${new Date(invoice.generatedAt).toLocaleString()}`,
    `Contractor: ${invoice.contractor?.name || "-"}`,
    `Email: ${invoice.contractor?.email || "-"}`,
    " ",
    "Materials:",
    ...((invoice.order?.items || []).flatMap((item) => [
      `${item.materialName} | Qty: ${Number(item.quantity).toFixed(2)} ${item.unit} | Rate: Rs. ${Number(item.ratePerCuMetre).toFixed(2)} | Subtotal: Rs. ${Number(item.subtotal).toFixed(2)}`,
    ])),
    " ",
    `Subtotal: Rs. ${Number(invoice.subtotalAmount || 0).toFixed(2)}`,
    `Total: Rs. ${Number(invoice.totalAmount || 0).toFixed(2)}`,
  ];

  const stream = buildPdfContent(lines);
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${stream.length} >> stream
${stream}
endstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
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

import { ERPRecord } from "../types";
import { jsPDF } from "jspdf";

// Export records to CSV format with Excel BOM (UTF-8)
export function exportToCSV(records: ERPRecord[]): void {
  const headers = [
    "ORDEM",
    "NF",
    "KILOS",
    "LAVAÇÃO",
    "GRADES",
    "CAIXAS",
    "OBSERVAÇÃO"
  ];

  const rows = records.map(rec => [
    `"${rec.order.replace(/"/g, '""')}"`,
    `"${(rec.nf || "").replace(/"/g, '""')}"`,
    rec.kg.toFixed(2),
    `"${rec.washing.replace(/"/g, '""')}"`,
    rec.crates.toString(),
    (rec.boxes ?? 0).toString(),
    `"${(rec.obs || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n");

  // UTF-8 BOM to prevent accents issue in Excel
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const today = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `ERP_Conferencia_Rovitex_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export records to tabular PDF with clean corporate styling containing all 6 requested columns
export function exportToPDF(records: ERPRecord[]): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const nowString = new Date().toLocaleString("pt-BR");
  
  // Header
  doc.setFillColor(15, 23, 42); // slate-900 color
  doc.rect(0, 0, 210, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ROVITEX - RELATÓRIO DE CONFERÊNCIA", 12, 11);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("Controle de Recebimento: Ordem, NF, Kilos, Lavação, Grades, Caixas e Observação", 12, 19);
  doc.text(`Gerado em: ${nowString}`, 145, 15);
  
  // Summary boxes
  const totalWeight = records.reduce((sum, r) => sum + r.kg, 0);
  const totalCrates = records.reduce((sum, r) => sum + r.crates, 0);
  const totalBoxes = records.reduce((sum, r) => sum + (r.boxes ?? 0), 0);
  
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(10, 35, 190, 18, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Lançamentos: ${records.length}`, 12, 46);
  doc.text(`Kilo Total: ${totalWeight.toFixed(2)} kg`, 48, 46);
  doc.text(`Grades Total: ${totalCrates} gds`, 102, 46);
  doc.text(`Caixas Total: ${totalBoxes} cx`, 155, 46);
  
  // Table header
  const tableTop = 60;
  doc.setFillColor(51, 65, 85); // slate-700
  doc.rect(10, tableTop, 190, 8, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  
  // X positions for all 7 columns nicely spanning 190mm (margin starts at 10, ends at 200)
  const colPositions = {
    order: 12,
    nf: 36,
    kg: 53,
    washing: 71,
    crates: 104,
    boxes: 120,
    obs: 138
  };
  
  doc.text("ORDEM", colPositions.order, tableTop + 5);
  doc.text("NF", colPositions.nf, tableTop + 5);
  doc.text("KILOS", colPositions.kg, tableTop + 5);
  doc.text("LAVAÇÃO", colPositions.washing, tableTop + 5);
  doc.text("GRADES", colPositions.crates, tableTop + 5);
  doc.text("CAIXAS", colPositions.boxes, tableTop + 5);
  doc.text("OBSERVAÇÃO", colPositions.obs, tableTop + 5);
  
  // Table Rows
  let currentY = tableTop + 8;
  const rowHeight = 8;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42); // slate-900
  
  records.forEach((rec, idx) => {
    // Zebra striping
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(10, currentY, 190, rowHeight, "F");
    }
    
    // Draw cells
    doc.setFont("helvetica", "bold", 8);
    doc.text(truncateText(rec.order, 14), colPositions.order, currentY + 5);
    
    doc.setFont("helvetica", "normal", 8);
    doc.text(truncateText(rec.nf || "---", 11), colPositions.nf, currentY + 5);
    
    doc.setFont("helvetica", "bold", 8);
    doc.text(`${rec.kg.toFixed(2)}` + " kg", colPositions.kg, currentY + 5);
    
    doc.setFont("helvetica", "normal", 8);
    doc.text(truncateText(rec.washing, 15), colPositions.washing, currentY + 5);
    
    doc.setFont("helvetica", "bold", 8);
    doc.text(rec.crates.toString() + " gds", colPositions.crates, currentY + 5);
    doc.text((rec.boxes ?? 0).toString() + " cx", colPositions.boxes, currentY + 5);
    
    doc.setFont("helvetica", "normal", 7.5);
    doc.text(truncateText(rec.obs || "---", 22), colPositions.obs, currentY + 5);
    
    currentY += rowHeight;
    
    // Page breaking constraint
    if (currentY > 240 && idx < records.length - 1) {
      doc.addPage();
      currentY = 20;
      
      // Reprint header in subsequent pages
      doc.setFillColor(51, 65, 85);
      doc.rect(10, currentY, 190, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold", 8);
      
      doc.text("ORDEM", colPositions.order, currentY + 5);
      doc.text("NF", colPositions.nf, currentY + 5);
      doc.text("KILOS", colPositions.kg, currentY + 5);
      doc.text("LAVAÇÃO", colPositions.washing, currentY + 5);
      doc.text("GRADES", colPositions.crates, currentY + 5);
      doc.text("CAIXAS", colPositions.boxes, currentY + 5);
      doc.text("OBSERVAÇÃO", colPositions.obs, currentY + 5);
      
      currentY += 8;
      doc.setFont("helvetica", "normal", 8);
      doc.setTextColor(15, 23, 42);
    }
  });
  
  // Footer with signature line
  const footerY = 255;
  doc.setLineWidth(0.3);
  doc.setDrawColor(148, 163, 184); // slate-400
  
  // Line
  doc.line(40, footerY, 170, footerY);
  doc.setFont("helvetica", "bold", 8.5);
  doc.text("Visto de Conferência - Recebimento Rovitex", 72, footerY + 5);
  
  // Page number footer
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Relatório emitido pela Ficha de Recebimento Simplificada local.", 12, 285);
  
  doc.save(`ERP_Relatorio_Rovitex_${new Date().toISOString().split("T")[0]}.pdf`);
}

// Export records to a beautiful self-contained HTML document
export function exportToHTML(records: ERPRecord[]): void {
  const nowString = new Date().toLocaleString("pt-BR");
  const totalWeight = records.reduce((sum, r) => sum + r.kg, 0);
  const totalCrates = records.reduce((sum, r) => sum + r.crates, 0);
  const totalBoxes = records.reduce((sum, r) => sum + (r.boxes ?? 0), 0);

  const rowsHtml = records.map((rec, idx) => `
    <tr class="${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-200">
      <td class="px-6 py-4 font-bold text-slate-900">${rec.order}</td>
      <td class="px-6 py-4 text-slate-700">${rec.nf || "---"}</td>
      <td class="px-6 py-4 font-semibold text-emerald-600">${rec.kg.toFixed(2)} kg</td>
      <td class="px-6 py-4 text-slate-700 font-medium">${rec.washing}</td>
      <td class="px-6 py-4 font-bold text-amber-600">${rec.crates} gds</td>
      <td class="px-6 py-4 font-bold text-indigo-650">${rec.boxes ?? 0} cx</td>
      <td class="px-6 py-4 text-slate-500 max-w-[200px] truncate">${rec.obs || "---"}</td>
    </tr>
  `).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROVITEX - Relatório de Conferência</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body {
        background-color: white !important;
        color: black !important;
      }
      .no-print {
        display: none !important;
      }
      .print-shadow-none {
        box-shadow: none !important;
      }
      .print-border {
        border: 1px solid #cbd5e1 !important;
      }
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-900 font-sans min-h-screen p-4 md:p-8">
  <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print-shadow-none print-border">
    <!-- Header -->
    <div class="bg-slate-900 text-white p-6 md:p-8 relative">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
            ROVITEX - Relatório de Conferência
          </h1>
          <p class="text-xs md:text-sm text-slate-300 mt-1 font-medium">
            Ficha de Recebimento Simplificada: Ordem, NF, Kilos, Lavação, Grades e Observação
          </p>
        </div>
        <div class="flex flex-col items-start md:items-end text-xs text-slate-400 font-mono">
          <span>Gerado em: ${nowString}</span>
          <span class="text-emerald-400 font-bold mt-1">Conferência Local Confirmada</span>
        </div>
      </div>
      <div class="absolute top-4 right-4 no-print">
        <button onclick="window.print()" class="bg-emerald-600 hover:bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / Salvar PDF
        </button>
      </div>
    </div>

    <!-- Summary Statistics -->
    <div class="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50 border-b border-slate-200">
      <div class="p-4 text-center sm:text-left">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Lançamentos</span>
        <div class="text-lg font-bold text-slate-800 mt-1">${records.length} OPs</div>
      </div>
      <div class="p-4 text-center sm:text-left">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Kilo Acumulado</span>
        <div class="text-lg font-black text-emerald-600 mt-1">${totalWeight.toFixed(2)} kg</div>
      </div>
      <div class="p-4 text-center sm:text-left">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Grades Total</span>
        <div class="text-lg font-black text-amber-600 mt-1">${totalCrates} gds</div>
      </div>
      <div class="p-4 text-center sm:text-left">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Caixas Total</span>
        <div class="text-lg font-black text-indigo-650 mt-1">${totalBoxes} cx</div>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs md:text-sm">
        <thead>
          <tr class="bg-slate-100 border-b-2 border-slate-200">
            <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider">Ordem</th>
            <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider">NF</th>
            <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider">Kilo</th>
            <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider">Lavação</th>
            <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider">Grades</th>
            <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider">Caixas</th>
            <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider">Observação</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `
            <tr>
              <td colspan="7" class="px-6 py-12 text-center text-slate-400 italic">
                Nenhum registro de conferência encontrado no histórico.
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>

    <!-- Signatures -->
    <div class="p-8 border-t border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center">
      <div class="w-64 border-t border-slate-400 mt-8 pt-2">
        <span class="text-xs font-bold text-slate-800">Assinatura de Conferência</span>
        <p class="text-[10px] text-slate-500 mt-0.5">Recebimento Rovitex</p>
      </div>
      <div class="mt-8 text-[9px] text-slate-400">
        Este documento foi exportado a partir do terminal simplificado de recepção corporativa offline.
      </div>
    </div>
  </div>

  <div class="text-center mt-6 no-print text-[11px] text-slate-500">
    <p>Para obter os melhores resultados, selecione "Salvar como PDF" ou "Imprimir" nas opções de destino acima.</p>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const today = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `ERP_Relatorio_Rovitex_${today}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function truncateText(str: string, maxLength: number): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 2) + "..";
}

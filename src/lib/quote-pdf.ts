import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { QuoteDetailData, QuoteLine } from "@/hooks/useQuoteDetail";

/** Catégorisation des lignes pour les blocs PDF */
const CATEGORY_GROUPS: Array<{
  key: string;
  title: string;
  match: (cat: string | null) => boolean;
}> = [
  { key: "device", title: "Appareil de chauffage", match: (c) => c === "device" },
  { key: "flue", title: "Fumisterie / Conduits", match: (c) => c === "flue" },
  { key: "labor", title: "Main d'œuvre", match: (c) => c === "labor" },
  { key: "option", title: "Options et divers", match: (c) => c === "option" || c === "misc" },
];
const FALLBACK_GROUP = { key: "other", title: "Autres" };

function pickLabel(line: QuoteLine): string {
  return (
    (line.customer_label && line.customer_label.trim()) ||
    (line.display_label && line.display_label.trim()) ||
    (line.normalized_label_snapshot && line.normalized_label_snapshot.trim()) ||
    line.label ||
    "—"
  );
}

function pickTechnical(line: QuoteLine): string | null {
  const meta = (line.metadata ?? {}) as Record<string, unknown>;
  const td = meta["technical_description"];
  if (typeof td === "string" && td.trim()) return td.trim();
  return null;
}

function fmtMoney(n: number): string {
  return (
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
  );
}

function fmtDate(d: string): string {
  try {
    return format(new Date(d), "d MMMM yyyy", { locale: fr });
  } catch {
    return d;
  }
}

export interface GeneratePdfOptions {
  quote: QuoteDetailData;
  lines: QuoteLine[];
  totalHt: number;
  totalTtc: number;
  showSectionTotals?: boolean;
}

export function generateQuotePdf({
  quote,
  lines,
  totalHt,
  totalTtc,
  showSectionTotals = true,
}: GeneratePdfOptions): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DEVIS", margin, 50);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${quote.quote_number}`, margin, 68);
  doc.text(`Date : ${fmtDate(quote.quote_date)}`, margin, 82);
  doc.text(`Validité : ${fmtDate(quote.expiry_date)}`, margin, 96);

  // Client
  doc.setFont("helvetica", "bold");
  doc.text("Client", pageWidth - margin - 200, 68);
  doc.setFont("helvetica", "normal");
  doc.text(quote.customer.name, pageWidth - margin - 200, 82);
  if (quote.property) {
    const addr = [
      quote.property.address_line1,
      [quote.property.postal_code, quote.property.city].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    if (addr) doc.text(addr, pageWidth - margin - 200, 96);
  }

  // Filter item lines only, group by category
  const itemLines = lines.filter((l) => l.line_type === "item");
  const grouped = new Map<string, { title: string; lines: QuoteLine[] }>();
  for (const g of CATEGORY_GROUPS) grouped.set(g.key, { title: g.title, lines: [] });
  grouped.set(FALLBACK_GROUP.key, { title: FALLBACK_GROUP.title, lines: [] });

  for (const l of itemLines) {
    const cat = l.line_category;
    const g = CATEGORY_GROUPS.find((g) => g.match(cat));
    if (g) grouped.get(g.key)!.lines.push(l);
    else grouped.get(FALLBACK_GROUP.key)!.lines.push(l);
  }

  let cursorY = 130;

  // Render each group as a table
  const orderedKeys = [...CATEGORY_GROUPS.map((g) => g.key), FALLBACK_GROUP.key];
  for (const key of orderedKeys) {
    const grp = grouped.get(key)!;
    if (grp.lines.length === 0) continue;

    // Block title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, cursorY, pageWidth - margin * 2, 20, "F");
    doc.text(grp.title, margin + 8, cursorY + 14);
    cursorY += 24;

    const body = grp.lines.flatMap((l) => {
      const label = pickLabel(l);
      const tech = pickTechnical(l);
      const cellLabel = tech ? `${label}\n${tech}` : label;
      const unitLabel = l.unit ?? "";
      return [[
        cellLabel,
        String(l.qty),
        unitLabel,
        fmtMoney(l.unit_price_ht),
        `${l.vat_rate}%`,
        fmtMoney(l.qty * l.unit_price_ht),
      ]];
    });

    autoTable(doc, {
      startY: cursorY,
      head: [["Désignation", "Qté", "Unité", "PU HT", "TVA", "Total HT"]],
      body,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 5, valign: "top" },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 40, halign: "right" },
        2: { cellWidth: 45 },
        3: { cellWidth: 70, halign: "right" },
        4: { cellWidth: 40, halign: "right" },
        5: { cellWidth: 75, halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0 && typeof data.cell.raw === "string") {
          const parts = (data.cell.raw as string).split("\n");
          if (parts.length > 1) {
            data.cell.text = parts;
          }
        }
      },
    });

    // @ts-ignore — jspdf-autotable adds lastAutoTable
    cursorY = (doc as any).lastAutoTable.finalY + 6;

    if (showSectionTotals) {
      const subtotal = grp.lines.reduce((s, l) => s + l.qty * l.unit_price_ht, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const txt = `Sous-total ${grp.title} : ${fmtMoney(subtotal)}`;
      const w = doc.getTextWidth(txt);
      doc.text(txt, pageWidth - margin - w, cursorY + 10);
      cursorY += 18;
    }

    // Separator
    doc.setDrawColor(220);
    doc.line(margin, cursorY + 4, pageWidth - margin, cursorY + 4);
    cursorY += 16;

    // Page break if needed
    if (cursorY > doc.internal.pageSize.getHeight() - 160) {
      doc.addPage();
      cursorY = 60;
    }
  }

  // Totals
  const totalVat = totalTtc - totalHt;
  if (cursorY > doc.internal.pageSize.getHeight() - 140) {
    doc.addPage();
    cursorY = 60;
  }
  const tx = pageWidth - margin - 200;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Total HT", tx, cursorY + 14);
  doc.text(fmtMoney(totalHt), pageWidth - margin, cursorY + 14, { align: "right" });
  doc.text("TVA", tx, cursorY + 30);
  doc.text(fmtMoney(totalVat), pageWidth - margin, cursorY + 30, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total TTC", tx, cursorY + 50);
  doc.text(fmtMoney(totalTtc), pageWidth - margin, cursorY + 50, { align: "right" });

  return doc;
}
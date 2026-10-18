import { useCallback, useState } from "react";
import { useCupStore } from "../stores/cupStore";
import { useUIStore } from "../stores/uiStore";
import { categoryLabel, divisionLabel } from "../utils/constants";
import { formatCupPoints, formatHitFactor } from "../utils/hitFactor";
import { nativeSaveAs, saveBlobToDevice, formatDateLong, MARGIN, TITLE_SIZE, SUBTITLE_SIZE, TABLE_STYLE } from "../utils/exportUtils";
import { loadPdfFonts, setBoldFont, setRegularFont } from "../utils/pdfFont";
import { triggerPrint } from "../utils/print";
import { useTranslation } from "react-i18next";
import type { CupResultRow, CupResultsPayload, CupScoringMode } from "../types/cup";

export type CupTab = 'byDivision' | 'overall' | 'byCategory' | 'byTag';

interface SaveProps { open: boolean; filename: string; blob: Blob; extension: string }

const TAB_SUFFIX: Record<CupTab, string> = {
  byDivision: 'by_division',
  overall: 'overall',
  byCategory: 'by_category',
  byTag: 'by_tag',
};

interface CupExportCell {
  text: string;
  strike?: boolean;
}

interface CupExportHeadCell {
  content: string;
  colSpan?: number;
  rowSpan?: number;
}

interface CupExportSection {
  title: string;
  subtitle?: string;
  head: string[];
  headRows: CupExportHeadCell[][];
  rows: (string | CupExportCell)[][];
}

function rowCells(r: CupResultRow, hasDivision: boolean, mode: CupScoringMode, matches: { id: string }[]): (string | CupExportCell)[] {
  const cells: (string | CupExportCell)[] = [
    String(r.position),
    `${r.first_name} ${r.last_name}`,
    ...(hasDivision ? [divisionLabel(r.division)] : []),
  ];
  for (const m of matches) {
    const mr = r.matches.find((x) => x.match_id === m.id);
    if (!mr || mr.status === 'none') {
      cells.push(...(mode === 'hit_factor' ? ['', ''] : ['']));
      continue;
    }
    const cell: CupExportCell = { text: '—', strike: mr.status === 'excluded' };
    if (mode === 'hit_factor') {
      if (mr.net_points != null) cell.text = formatCupPoints(mr.net_points, '—');
      cells.push({ ...cell });
      if (mr.time != null) cell.text = mr.time.toFixed(2);
      cells.push(cell);
    } else {
      if (mr.points != null) cell.text = formatCupPoints(mr.points, '—');
      cells.push(cell);
    }
  }
  cells.push(`${Number(r.match_percent).toFixed(2)}%`);
  if (mode === 'hit_factor') {
    cells.push(r.net_points != null ? formatCupPoints(r.net_points) : '—', r.time?.toFixed(2) ?? '—', formatHitFactor(r.hit_factor, '—'));
  } else {
    cells.push(r.match_points != null ? formatCupPoints(r.match_points) : '—');
  }
  return cells;
}

function buildHead(hasDivision: boolean, mode: CupScoringMode, matches: any[], t: (key: string, opts?: any) => string): string[] {
  const pts = t('cups.colPts');
  const timeLabel = t('results.time');
  const head = [
    t('results.position'),
    t('results.shooter'),
    ...(hasDivision ? [t('results.division')] : []),
  ];
  for (let i = 0; i < matches.length; i++) {
    if (mode === 'hit_factor') {
      head.push(`${i + 1}. ${pts}`, `${i + 1}. ${timeLabel}`);
    } else {
      head.push(`${i + 1}. ${pts}`);
    }
  }
  head.push(t('results.matchPercent'));
  if (mode === 'hit_factor') {
    head.push(`${t('cups.colTotal')} ${pts}`, `${t('cups.colTotal')} ${timeLabel}`, 'HF');
  } else {
    head.push(`${t('cups.colTotal')} ${pts}`);
  }
  return head;
}

/** Three grouped header rows for PDF: Match spanning numbered groups, % and Total. */
function buildHeadRows(hasDivision: boolean, mode: CupScoringMode, matches: any[], t: (key: string, opts?: any) => string): CupExportHeadCell[][] {
  const colsPerMatch = mode === 'hit_factor' ? 2 : 1;
  const totalCols = mode === 'hit_factor' ? 3 : 1;
  const row1: CupExportHeadCell[] = [
    { content: t('results.position'), rowSpan: 3 },
    { content: t('results.shooter'), rowSpan: 3 },
    ...(hasDivision ? [{ content: t('results.division'), rowSpan: 3 }] : []),
    { content: t('cups.colMatch'), colSpan: matches.length * colsPerMatch },
    { content: t('results.matchPercent'), rowSpan: 3 },
    { content: t('cups.colTotal'), colSpan: totalCols },
  ];
  const row2: CupExportHeadCell[] = matches.map((_, i) => ({ content: `${i + 1}.`, colSpan: colsPerMatch }));
  const pts = t('cups.colPts');
  const timeLabel = t('results.time');
  const row3: CupExportHeadCell[] = [
    ...matches.flatMap(() => (mode === 'hit_factor' ? [{ content: pts }, { content: timeLabel }] : [{ content: pts }])),
    ...(mode === 'hit_factor' ? [{ content: pts }, { content: timeLabel }, { content: 'HF' }] : [{ content: pts }]),
  ];
  return [row1, row2, row3];
}

function buildSections(
  tab: CupTab,
  payload: CupResultsPayload | null,
  limit: number | null,
  t: (key: string, opts?: any) => string,
): CupExportSection[] {
  if (!payload) return [];
  const mode = payload.scoring_mode;
  const hasDivision = tab === 'overall';
  const head = buildHead(hasDivision, mode, payload.matches, t);
  const headRows = buildHeadRows(hasDivision, mode, payload.matches, t);
  const sectionRows = (rows: CupResultRow[]) => {
    const sliced = limit != null ? rows.slice(0, limit) : rows;
    return sliced.map((r) => rowCells(r, hasDivision, mode, payload.matches));
  };

  const sections: CupExportSection[] = [];

  if (tab === 'byDivision') {
    for (const [division, rows] of Object.entries(payload.results.byDivision).sort(([a], [b]) => a.localeCompare(b))) {
      sections.push({ title: divisionLabel(division), head, headRows, rows: sectionRows(rows) });
    }
  } else if (tab === 'overall') {
    sections.push({ title: t('results.overall'), head, headRows, rows: sectionRows(payload.results.overall) });
  } else if (tab === 'byCategory') {
    for (const [cat, divisions] of Object.entries(payload.results.byCategory)
      .filter(([cat]) => cat !== 'regular')
      .sort(([a], [b]) => a.localeCompare(b))) {
      for (const [division, rows] of Object.entries(divisions).sort(([a], [b]) => a.localeCompare(b))) {
        sections.push({
          title: categoryLabel(cat),
          subtitle: divisionLabel(division),
          head,
          headRows,
          rows: sectionRows(rows),
        });
      }
    }
  } else {
    for (const [tag, divisions] of Object.entries(payload.results.byTag).sort(([a], [b]) => a.localeCompare(b))) {
      for (const [division, rows] of Object.entries(divisions).sort(([a], [b]) => a.localeCompare(b))) {
        sections.push({ title: tag, subtitle: divisionLabel(division), head, headRows, rows: sectionRows(rows) });
      }
    }
  }

  return sections;
}

function hasExcluded(sections: CupExportSection[]): boolean {
  return sections.some((s) => s.rows.some((row) => row.some((cell) => typeof cell !== 'string' && cell?.strike)));
}

function lastMatchDate(matches: { date: string }[] | undefined): string | undefined {
  const last = matches && matches.length > 0 ? matches[matches.length - 1] : undefined;
  return last?.date;
}

const STRIKE_CHAR = '\u0336';

function strikeThroughText(text: string): string {
  return text
    .split('')
    .map((ch) => (ch === ' ' ? ch : ch + STRIKE_CHAR))
    .join('');
}

function cellCSV(cell: string | CupExportCell | undefined): string {
  if (cell == null) return '';
  if (typeof cell === 'string') return cell;
  return cell.strike ? strikeThroughText(cell.text) : cell.text;
}

function cellHTML(cell: string | CupExportCell | undefined): string {
  if (cell == null) return '';
  if (typeof cell === 'string') return cell;
  return cell.strike ? `<s>${cell.text}</s>` : cell.text;
}

function cellText(cell: string | CupExportCell | undefined): string {
  if (cell == null) return '';
  return typeof cell === 'string' ? cell : cell.text;
}

const useCupExport = (activeTab: CupTab, limit: number | null) => {
  const { t } = useTranslation();
  const [saveModal, setSaveModal] = useState<SaveProps | null>(null);
  const addToast = useUIStore((s) => s.addToast);
  const results = useCupStore((s) => s.results);

  const cupName = results?.cup?.name || 'Cup';
  const baseName = cupName.replace(/[^a-zA-Z0-9]/g, '_');
  const tabSuffix = TAB_SUFFIX[activeTab];

  const handlePrint = useCallback(() => { triggerPrint(); }, []);

  const showSaveDialog = useCallback(async (blob: Blob, defaultName: string, extension: string, types: { description: string; accept: Record<string, string[]> }[], successKey: string) => {
    const nativeOk = await nativeSaveAs(blob, defaultName, types);
    if (nativeOk) {
      addToast(t(successKey), 'success');
      return;
    }
    setSaveModal({ open: true, filename: defaultName, blob, extension });
  }, [addToast, t]);

  const confirmSave = async () => {
    if (!saveModal) return;
    const { blob, extension } = saveModal;
    const filename = saveModal.filename.endsWith(`.${extension}`)
      ? saveModal.filename
      : `${saveModal.filename}.${extension}`;
    setSaveModal(null);
    // On device this writes to Documents/IPSCScore/; in the browser it downloads.
    const saved = await saveBlobToDevice(blob, filename);
    addToast(t(saved ? 'results.fileExported' : 'results.exportFailed'), saved ? 'success' : 'error');
  };

  const handleCSV = useCallback(async () => {
    try {
      const sections = buildSections(activeTab, results, limit, t);
      const lines: string[] = [];
      const org = results?.matches?.[0]?.organization || '';
      const date = lastMatchDate(results?.matches);
      lines.push(`Cup: ${cupName} (${org})`);
      lines.push(`Matches: ${results?.matches?.length ?? 0}  |  Minimum: ${results?.minimum_matches ?? 0}`);
      if (hasExcluded(sections)) lines.push(t('cups.excludedNote'));
      if (date) lines.push(`Date: ${formatDateLong(date)}`);
      lines.push('');
      for (const section of sections) {
        if (section.subtitle) {
          lines.push(`--- ${section.title} (${section.subtitle}) ---`);
        } else {
          lines.push(`--- ${section.title} ---`);
        }
        lines.push(section.head.join(';'));
        for (const row of section.rows) {
          lines.push(row.map((cell) => cellCSV(cell)).join(';'));
        }
        lines.push('');
      }
      const csv = '\uFEFF' + lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      await showSaveDialog(blob, `${baseName}_${tabSuffix}.csv`, 'csv', [
        { description: 'CSV file', accept: { 'text/csv': ['.csv'] } },
      ], 'results.csvExported');
    } catch (err: any) { addToast(err.message, 'error'); }
  }, [activeTab, results, limit, cupName, baseName, tabSuffix, showSaveDialog, addToast, t]);

  const handleHTML = useCallback(async () => {
    try {
      const sections = buildSections(activeTab, results, limit, t);
      const date = lastMatchDate(results?.matches);
      const parts: string[] = [];
      parts.push(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${cupName} Results</title>
<style>
body{font-family:Arial,sans-serif;margin:20px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:8px;text-align:left;white-space:nowrap}
th{background:#f4f4f4}
tr:nth-child(even){background:#f9f9f9}
.section{margin-bottom:24px;page-break-after:always}
.section:last-child{page-break-after:auto}
.section h2{margin:0 0 12px}
.section h3{margin:16px 0 8px;color:#555}
</style></head><body>
<h1>${cupName} ${results?.matches?.[0]?.organization ? `(${results.matches[0].organization})` : ''}</h1>
<p>Matches: ${results?.matches?.length ?? 0} | Minimum: ${results?.minimum_matches ?? 0}${date ? ` | Date: ${formatDateLong(date)}` : ''}${hasExcluded(sections) ? ` | ${t('cups.excludedNote')}` : ''}</p>`);
      for (const section of sections) {
        parts.push(`<div class="section"><h2>${section.title}</h2>`);
        if (section.subtitle) parts.push(`<h3>${section.subtitle}</h3>`);
        parts.push(`<table><tr>${section.head.map((h) => `<th>${h}</th>`).join('')}</tr>`);
        for (const row of section.rows) {
          parts.push(`<tr>${row.map((cell) => `<td>${cellHTML(cell)}</td>`).join('')}</tr>`);
        }
        parts.push('</table></div>');
      }
      parts.push('</body></html>');
      const blob = new Blob([parts.join('\n')], { type: 'text/html' });
      await showSaveDialog(blob, `${baseName}_${tabSuffix}.html`, 'html', [
        { description: 'HTML file', accept: { 'text/html': ['.html'] } },
      ], 'results.htmlExported');
    } catch (err: any) { addToast(err.message, 'error'); }
  }, [activeTab, results, limit, cupName, baseName, tabSuffix, showSaveDialog, addToast, t]);

  const handlePDF = useCallback(async () => {
    try {
      const sections = buildSections(activeTab, results, limit, t);
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      await loadPdfFonts(doc);
      const org = results?.matches?.[0]?.organization || '';
      const date = lastMatchDate(results?.matches);

      const drawHeader = (data?: any) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        setBoldFont(doc); doc.setFontSize(16);
        doc.text(cupName, pageWidth / 2, 8, { align: 'center' });
        setRegularFont(doc); doc.setFontSize(9);
        const subtitle = [org, formatDateLong(date)].filter(Boolean).join(' • ');
        if (subtitle) doc.text(subtitle, pageWidth / 2, 13, { align: 'center' });
        doc.setDrawColor(0); doc.line(MARGIN, 16, pageWidth - MARGIN, 16);
        if (data?.settings) data.settings.startY = 20;
      };

      drawHeader();
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (i > 0) { doc.addPage(); drawHeader(); }
        setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
        doc.text(section.title, MARGIN, 32);
        let startY = 36;
        if (section.subtitle) {
          setRegularFont(doc); doc.setFontSize(SUBTITLE_SIZE);
          doc.text(section.subtitle, MARGIN, startY);
          startY += 6;
        }
        setRegularFont(doc);
        const colsPerMatch = results?.scoring_mode === 'hit_factor' ? 2 : 1;
        const hasDivisionCol = section.headRows[0].length === 6;
        const totalStartCol = (hasDivisionCol ? 3 : 2) + (results?.matches?.length ?? 0) * colsPerMatch + 1;
        const strikeCells = new Set<string>();
        section.rows.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            if (typeof cell !== 'string' && cell.strike) strikeCells.add(`${rowIndex}:${colIndex}`);
          });
        });
        autoTable(doc, {
          ...TABLE_STYLE,
          startY,
          margin: { left: MARGIN, right: MARGIN },
          styles: { ...TABLE_STYLE.styles, fontSize: 8, cellPadding: 1.5, valign: 'middle' },
          headStyles: { ...TABLE_STYLE.headStyles, fontSize: 7.5, cellPadding: 1.5 },
          head: section.headRows,
          body: section.rows.map((row) => row.map(cellText)),
          columnStyles: {
            [totalStartCol]: { lineColor: [0, 0, 0], lineWidth: { left: 0.6 } },
          },
          didDrawCell: (data: any) => {
            if (data.section !== 'body') return;
            if (!strikeCells.has(`${data.row.index}:${data.column.index}`)) return;
            const text = data.cell.text.join(' ');
            const width = data.doc.getTextWidth(text);
            if (width <= 0) return;
            const textPos = data.cell.getTextPos();
            const strikeY = data.cell.y + data.cell.height / 2;
            data.doc.setLineWidth(0.2);
            data.doc.setDrawColor(0);
            data.doc.line(textPos.x, strikeY, textPos.x + width, strikeY);
          },
          didDrawPage: (data: any) => { drawHeader(data); },
        });
      }
      const pdfBlob = doc.output('blob');
      await showSaveDialog(pdfBlob, `${baseName}_${tabSuffix}.pdf`, 'pdf', [
        { description: 'PDF file', accept: { 'application/pdf': ['.pdf'] } },
      ], 'results.pdfExported');
    } catch (err: any) {
      console.error('Cup PDF export error:', err);
      addToast(err.message, 'error');
    }
  }, [activeTab, results, limit, cupName, baseName, tabSuffix, showSaveDialog, addToast, t]);

  return { handlePrint, handlePDF, handleCSV, handleHTML, saveModal, setSaveModal, confirmSave };
};

export default useCupExport;
import * as XLSX from "xlsx";

interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExcelColumn[],
  fileName: string
) {
  // Build header row
  const headers = columns.map((c) => c.header);

  // Build data rows
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return "";
      return val;
    })
  );

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width || 15 }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Veri");

  // Download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

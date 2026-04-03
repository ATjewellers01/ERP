/**
 * Specific calculation for Karat-based logic (22K, 20K, 18K)
 * Formula: AlloyConversion[I] - ProductionPlanning[P] + DepartmentIssue[L] - KarigarIssue[H]
 * 
 * @param karat "22K" | "20K" | "18K"
 * @param alloyRows Raw Alloy Conversion data
 * @param prodRows Raw Production Planning data
 * @param issueRows Raw Department Issue data
 * @param karigarRows Raw Karigar Issue data
 * @returns Total calculated stock for the given karat
 */
export const calculateKaratStock = (
  karat: "22K" | "20K" | "18K",
  alloyRows: any[][],
  prodRows: any[][],
  issueRows: any[][],
  karigarRows: any[][]
): number => {
  let total = 0;

  // Term 1 (+): Alloy Conversion (OutputWeight, Column I -> Index 8)
  alloyRows.slice(6).forEach((row) => {
    if (String(row[3] || "").trim().toUpperCase() === karat) {
      total += parseFloat(row[8] || 0);
    }
  });

  // Term 2 (-): Production Planning (IssueWeight, Column P -> Index 15)
  prodRows.slice(6).forEach((row) => {
    if (String(row[3] || "").trim().toUpperCase() === karat) {
      total -= parseFloat(row[15] || 0);
    }
  });

  // Term 3 (+): Department Issue (Planned 1, Column L -> Index 11) assuming Q -> Index 16 is Karat
  issueRows.slice(6).forEach((row) => {
    if (String(row[16] || "").trim().toUpperCase() === karat) {
      total += parseFloat(row[11] || 0);
    }
  });

  // Term 4 (-): Karigar Issue (Direct Metal, Column H -> Index 7)
  karigarRows.slice(1).forEach((row) => {
    if (String(row[3] || "").trim().toUpperCase() === karat) {
      total -= parseFloat(row[7] || 0);
    }
  });

  return total;
};

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { fetchAllSheetsParallel, fetchSheet, invalidateCache, ALL_SHEETS } from "../services/api";
import { calculateKaratStock } from "../utils/calculations";

export type UserRole = "Admin" | "Production Head" | "Dept Manager" | "Karigar" | "QC";

export type JobStage = "Created" | "Issued" | "In Progress" | "Returned" | "Completed";

// interface User {
//   username: string;
//   role: UserRole;
// }


interface User {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  pageAccess: string[];
}

export interface JobDepartment {
  id: string;
  dept: string;
  plannedWeight: string;
  allowedWastage: string;
  issuedWeight?: number;
  returnedWeight?: number;
  status?: "Pending" | "Issued" | "Returned" | "Completed";
  karigarAssigned?: string;
  meltingType?: string;
  expectedReturn?: string;
  scrapExpected?: string;
  authorizedBy?: string;
  colL?: any; // Column L (index 11) - Planned 1
  colM?: any; // Column M (index 12) - Actual 1
  masterColM?: string;
  masterColN?: string;
  planned2?: any; // Column R (index 17) - Planned 2
  actual2?: any;  // Column S (index 18) - Actual 2
  finishedWeight?: number; // Column U (index 20)
  scrapWeight?: number;    // Column V (index 21)
  dustWeight?: number;     // Column W (index 22)
  metalLoss?: number;      // Column X (index 23)
  returnType?: string;     // Column Y (index 24)
  recovery?: number;       // (Calculated or from Column Z?)
  shortage?: number;       // (Calculated or from Column AA?)
  countNo?: string;        // Column C (index 2)
  remainingWeight?: string; // Column Q (index 16)
  returnAttempts?: ReturnAttempt[];
}

export interface ReturnAttempt {
  attemptDate: Date;
  finishedPartsWeight: string;
  scrapWeight: string;
  dustWeight: string;
  metalLoss: string;
  recovery: number;
  shortage: number;
}

export interface Job {
  jobId: string;
  orderNo: string;
  designCode: string;
  customer: string;
  totalWeight: string;
  metalType: string;
  departments: JobDepartment[];
  stage: JobStage;
  issuedVia?: "karigar" | "department";
  karigarName?: string;
  category?: string;
  remainingWeight?: string; // Column Q (index 16)
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcurementEntry {
  serialNo: string;
  customerName: string;
  invoiceNumber: string;
  grossWeight: string;
  purity: string;
  storageLocation: string;
  date: string;
  assayFileName: string | null;
  assayFileUrl: string | null;
}

export interface ConversionEntry {
  id: string;
  serialNo: string;
  timestamp: string;
  batchNumber: string;
  productionPlan: string;
  targetKarat: string;
  inputWeight: string;
  purity: string;
  outputWeight: string;
  expectedOutput: string;
  lossWeight: string;
  lossPercent: string;
  date: string;
}

export interface DepartmentReturnEntry {
  timestamp: string;
  returnNo: string;
  isNumber: string;
  serialNo: string;
  orderNo: string;
  finishedNet: string;
  scrapMetal: string;
  dustWeight: string;
  metalLoss: string;
  returnType: string;
}

export interface DepartmentIssueEntry {
  [x: string]: any;
  timestamp: string;
  isNumber: string;
  serialNo: string;
  orderNo: string;
  issuedWeight: string;
  karigarName: string;
  authorizedBy: string;
  dept?: string;
  planned2?: string;
  actual2?: string;
}

export interface LiveDepartmentStock {
  [karat: string]: {
    Die: number;
    Taar: number;
    Chain: number;
    KDM: number;
  };
}

interface AppContextType {
  user: User | null;
  // login: (username: string, password: string, role: UserRole) => boolean;
  setProcurementEntries: React.Dispatch<React.SetStateAction<ProcurementEntry[]>>;
  isAuthLoading: boolean;

  login: (username: string, password: string) => Promise<boolean>;

  logout: () => void;
  stockData: StockData;
  updateStock: (updates: Partial<StockData>) => void;
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  addJob: (job: Job) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  getJobByOrderNo: (orderNo: string) => Job | undefined;
  getJobById: (jobId: string) => Job | undefined;
  procurementEntries: ProcurementEntry[];
  addProcurementEntry: (entry: ProcurementEntry) => void;
  conversionEntries: ConversionEntry[];
  addConversionEntry: (entry: ConversionEntry) => void;
  setConversionEntries: React.Dispatch<React.SetStateAction<ConversionEntry[]>>;
  karigarLedger: any[];
  setKarigarLedger: React.Dispatch<React.SetStateAction<any[]>>;
  productionOrders: any[];
  setProductionOrders: React.Dispatch<React.SetStateAction<any[]>>;
  masterKarigars: string[];
  masterAuthorizers: string[];
  fetchAllData: (force?: boolean) => Promise<void>;
  departmentIssues: DepartmentIssueEntry[];
  setDepartmentIssues: React.Dispatch<React.SetStateAction<DepartmentIssueEntry[]>>;
  departmentReturns: DepartmentReturnEntry[];
  setDepartmentReturns: React.Dispatch<React.SetStateAction<DepartmentReturnEntry[]>>;
  alloyStock: { "22K": number; "20K": number; "18K": number };
  liveDepartmentStock: LiveDepartmentStock;
}

interface StockData {
  stock24K: number;
  stock24K_999: number;  // 99.9% purity
  stock24K_995: number;  // 99.50% purity
  stock22K: number;
  stock20K: number;
  stock18K: number;
  scrapBalance: number;
  conversionLoss: number;
}

// ➕ Added Helper: map a metal type string to a karat key for stock calculations
export const getKaratKey = (metalType: string): "22K" | "20K" | "18K" | null => {
  const mt = String(metalType || "").toUpperCase();
  if (mt.includes("22") || mt.includes("91")) return "22K";
  if (mt.includes("20") || mt.includes("84") || mt.includes("83")) return "20K";
  if (mt.includes("18") || mt.includes("76") || mt.includes("75")) return "18K";
  return null;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  /**
   * isAuthLoading: true only during the FIRST load, so the app shows a
   * global spinner once. After that, refreshes happen silently in the
   * background via isRefreshing (unused in UI but prevents flicker).
   */
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isInitialLoad = React.useRef(true);

  // Initialize stockData with defaults
  const [stockData, setStockData] = useState<StockData>({
    stock24K: 0,
    stock24K_999: 0,
    stock24K_995: 0,
    stock22K: 0,
    stock20K: 0,
    stock18K: 0,
    scrapBalance: 0,
    conversionLoss: 0,
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [departmentIssues, setDepartmentIssues] = useState<DepartmentIssueEntry[]>([]);
  const [departmentReturns, setDepartmentReturns] = useState<DepartmentReturnEntry[]>([]);
  const [procurementEntries, setProcurementEntries] = useState<ProcurementEntry[]>([]);
  const [conversionEntries, setConversionEntries] = useState<ConversionEntry[]>([]);
  const [karigarLedger, setKarigarLedger] = useState<any[]>([]);
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [masterKarigars, setMasterKarigars] = useState<string[]>([]);
  const [masterAuthorizers, setMasterAuthorizers] = useState<string[]>([]);
  const [liveDepartmentStock, setLiveDepartmentStock] = useState<LiveDepartmentStock>({
    "22K": { Die: 0, Taar: 0, Chain: 0, KDM: 0 },
    "20K": { Die: 0, Taar: 0, Chain: 0, KDM: 0 },
    "18K": { Die: 0, Taar: 0, Chain: 0, KDM: 0 },
  });

  /**
   * fetchAllData — central data loader.
   *
   * OPTIMIZED:  Uses the api.ts cache layer.
   *  • First call: hits the batch endpoint (1 HTTP request for all sheets).
   *  • Subsequent calls (e.g., after a form submit): only sheets whose cache
   *    was invalidated via invalidateCache(sheetName) will be re-fetched;
   *    the rest come from cache.
   *  • Loading state: isAuthLoading only blocks the UI on the first load.
   *    After that, refreshes are silent (no page-level spinner).
   */
  const fetchAllData = useCallback(async (force = false) => {
    if (isInitialLoad.current) {
      setIsAuthLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      // Restore user session from localStorage
      const savedUser = localStorage.getItem("erp_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem("erp_user");
        }
      }

      // Initialize accumulation variables
      let totalStock24K_999 = 0, totalStock24K_995 = 0;
      let totalStock22K = 0, totalStock20K = 0, totalStock18K = 0;
      let used999 = 0, used995 = 0;

      // ── 1. Batch-fetch all sheets (1 HTTP call on first load, cache hits
      //       after that — only invalidated sheets re-fetch from network) ──
      const sheets = await fetchAllSheetsParallel(ALL_SHEETS, force);

      // Resolve individual sheet results from batch or fetch individually
      // sheets[sheetName] already has { success, data } structure from backend
      const resolveSheet = (sheetName: string) =>
        sheets[sheetName] ?? { success: false, data: [] };

      const procResult = resolveSheet("24K Metal Stock");
      const convResult = resolveSheet("Alloy Converstion");
      const prodResult = resolveSheet("Production Planning");
      const returnResult = resolveSheet("Department Issue Return");
      const karigarResult = resolveSheet("Karigar Issue");
      const orderResult = resolveSheet("Production Orders");
      const issueResult = resolveSheet("Department Issue");
      const masterResult = resolveSheet("Master Drop Down");
      const mainCalcResult = resolveSheet("Main Calculation");

      // 0. Process Main Calculation (Live Department Stocks)
      if (mainCalcResult && mainCalcResult.success) {
        const rows = mainCalcResult.data as any[][];
        const newLiveStock: LiveDepartmentStock = {
          "22K": { Die: 0, Taar: 0, Chain: 0, KDM: 0 },
          "20K": { Die: 0, Taar: 0, Chain: 0, KDM: 0 },
          "18K": { Die: 0, Taar: 0, Chain: 0, KDM: 0 },
        };

        // Looking for rows matching Metaltype (e.g. 22K, 20K, 18K) in Column Q (index 16)
        rows.forEach(row => {
          const type = String(row[16] || "").trim().toUpperCase();
          if (newLiveStock[type]) {
            newLiveStock[type].Die = parseFloat(row[17]) || 0;
            newLiveStock[type].Taar = parseFloat(row[18]) || 0;
            newLiveStock[type].Chain = parseFloat(row[19]) || 0;
            newLiveStock[type].KDM = parseFloat(row[20]) || 0;
          }
        });
        setLiveDepartmentStock(newLiveStock);
      }

      // 2. Process Procurement Entries (24K Metal Stock)
      if (procResult.success) {
        const rows = procResult.data;
        const formatted = rows
          .slice(6)
          .filter((row: any) => row[1] && String(row[1]).trim() !== "")
          .map((row: any) => {
            const weight = parseFloat(row[4]) || 0;
            const rawP = row[5];
            let pNum = 0;
            if (typeof rawP === "number") pNum = rawP * 100;
            else if (typeof rawP === "string") pNum = parseFloat(rawP.replace("%", ""));

            if (pNum >= 99.85) totalStock24K_999 += weight;
            else if (pNum >= 99.4) totalStock24K_995 += weight;

            return {
              serialNo: row[1] || "",
              customerName: row[2] || "",
              invoiceNumber: row[3] || "",
              grossWeight: row[4] || "",
              purity: typeof rawP === "number" ? `${(rawP * 100).toFixed(2)}%` : rawP,
              storageLocation: row[6] || "",
              date: row[7] ? new Date(row[7]).toLocaleDateString("en-GB") : "",
              assayFileName: null,
              assayFileUrl: row[8] || null,
            };
          }).reverse();
        setProcurementEntries(formatted);
      }

      // 3. Process Alloy Conversion
      if (convResult.success) {
        const rows = convResult.data;
        const formatted = rows
          .slice(6)
          .filter((row: any) => row[1]) // serial exist hona chahiye
          .map((row: any) => {
            const expected = parseFloat(row[7] || 0);
            const lossWeight = parseFloat(row[9] || 0);
            const lossPercent = expected > 0 ? ((lossWeight / expected) * 100).toFixed(2) : "0";

            return {
              id: `CON-${row[1]}`,
              serialNo: row[1] || "",
              timestamp: row[0] ? new Date(row[0]).toLocaleTimeString() : "",
              productionPlan: row[2] || "",
              targetKarat: row[3] || "",
              batchNumber: row[4] || "",
              inputWeight: row[5] || "",
              purity: typeof row[6] === "number" ? `${(row[6] * 100).toFixed(1)}%` : row[6] || "",
              expectedOutput: row[7] || "",
              outputWeight: row[8] || "",
              lossWeight: row[9] || "",
              lossPercent: lossPercent,
              date: row[0] ? new Date(row[0]).toLocaleDateString("en-GB") : "",
            };
          });

        setConversionEntries(formatted.reverse());

        // Accumulate 24K Usage only (Term 1)
        rows.slice(6).filter((row: any) => row[1]).forEach((row: any) => {
          const rawPurity = row[6]; // Column G = Purity
          const input24K = parseFloat(row[5] || 0); // Column F = 24K Input used

          let purityNum = 0;
          if (typeof rawPurity === "number") purityNum = rawPurity * 100;
          else if (typeof rawPurity === "string") purityNum = parseFloat(rawPurity.replace("%", ""));

          if (purityNum >= 99.85) used999 += input24K;
          else if (purityNum >= 99.4) used995 += input24K;
        });

        // Deduct used 24K from total
        totalStock24K_999 = Math.max(0, totalStock24K_999 - used999);
        totalStock24K_995 = Math.max(0, totalStock24K_995 - used995);
      }

      // 3.5 Process Department Issue (New Sheet)
      const allIssuesMap: Record<string, any> = {};
      if (issueResult.success) {
        const rows = issueResult.data as any[][];

        // 🔹 Populate departmentIssues for raw ledger (History)
        const issues: DepartmentIssueEntry[] = rows.slice(6)
          .filter(row => row[1] && String(row[1]).trim() !== "")
          .map(row => ({
            timestamp: String(row[0] || ""),
            isNumber: String(row[1] || ""),
            serialNo: String(row[2] || ""),
            orderNo: String(row[3] || ""),
            issuedWeight: String(row[4] || ""),
            karigarName: String(row[5] || ""),
            authorizedBy: String(row[6] || ""),
            dept: String(row[15] || ""),
            planned2: String(row[7] || ""),
            actual2: String(row[8] || ""),
            finishedNet: String(row[10] || "0"),
          })).reverse();
        setDepartmentIssues(issues);

        rows.slice(6)
          .filter(row => row[1] && String(row[1]).trim() !== "")
          .forEach((row) => {
            const serialNo = String(row[2]);
            const key = serialNo;
            allIssuesMap[key] = {
              timestamp: row[0],
              issueNo: row[1],
              orderNo: row[3],
              issuedWeight: parseFloat(row[4]) || 0,
              karigarName: row[5],
              authorizedBy: row[6],
              planned2: row[7] || "", // Column H (7) - Mark as 'Issued' for Pending logic
              actual2: row[8] || "",   // Column I (8) - Mark as 'Returned' for History logic
              finishedNet: parseFloat(row[10]) || 0, // Column K (10) - Finished Net for Stock
              meltingType: String(row[16] || ""), // Column Q (16) - Melting Type
            };
          });
      }

      // 4. Process Return Attempts & Flat Returns List
      const allReturnAttemptsMap: Record<string, any[]> = {};
      if (returnResult.success) {
        const rows = returnResult.data as any[][];
        const flatReturns: DepartmentReturnEntry[] = rows.slice(1)
          .filter(row => row[2] && String(row[2]).trim() !== "")
          .map(row => ({
            timestamp: String(row[0] || ""),
            returnNo: String(row[1] || ""),
            isNumber: String(row[2] || ""),
            serialNo: String(row[3] || ""),
            orderNo: String(row[4] || ""),
            finishedNet: String(row[5] || ""),
            scrapMetal: String(row[6] || ""),
            dustWeight: String(row[7] || ""),
            metalLoss: String(row[8] || ""),
            returnType: String(row[9] || ""),
          })).reverse();
        setDepartmentReturns(flatReturns);

        rows
          .slice(1)
          .filter((row) => row[2] && String(row[2]).trim() !== "")
          .forEach((row) => {
            const isNo = String(row[2]); // IS-NO is col C (index 2)
            if (!allReturnAttemptsMap[isNo]) {
              allReturnAttemptsMap[isNo] = [];
            }
            allReturnAttemptsMap[isNo].push({
              finishedPartsWeight: String(row[5] || "0"),
              scrapWeight: String(row[6] || "0"),
              dustWeight: String(row[7] || "0"),
              metalLoss: String(row[8] || "0"),
              recovery: 0, // Calculated later
              shortage: 0, // Calculated later
              returnType: String(row[9] || ""),
              timestamp: String(row[0] || ""),
            });
          });
      }

      // 5. Build Production Planning (Jobs)
      if (prodResult.success) {
        const rows = prodResult.data as any[][];
        const jobGroups: Record<string, any> = {};

        rows
          .slice(6)
          .filter((row) => row[1] && String(row[1]).trim() !== "")
          .forEach((row) => {
            const serialNo = String(row[1]);
            if (!jobGroups[serialNo]) {
              jobGroups[serialNo] = {
                jobId: `JOB-${serialNo}`,
                orderNo: row[2],
                metalType: row[3],      // col[3] = Melting Type
                designCode: row[6],     // col[6] = Design Code
                totalWeight: row[7],    // col[7] = Total Weight (g)
                customer: row[8],       // col[8] = Customer
                createdAt: row[0] ? new Date(row[0]) : new Date(),
                updatedAt: row[0] ? new Date(row[0]) : new Date(),
                karigarName: row[4],    // col[4] = Karigar Name
                category: row[5],       // col[5] = Category
                remainingWeight: row[16], // col[16] = Remaining Weight (Column Q)
                departments: [],
                stage: "Created",
                _deptCount: 0,
              };
            }

            jobGroups[serialNo]._deptCount = (jobGroups[serialNo]._deptCount || 0) + 1;
            const countNo = jobGroups[serialNo]._deptCount;

            const issuedWeight = parseFloat(row[15]) || 0; // col[15] = Issue Weight (was 16)

            // Link Return Attempts and calculate recovery/shortage
            const matchingAttempts = allReturnAttemptsMap[`${serialNo}-${countNo}`] || [];
            const processedAttempts = matchingAttempts.map(att => {
              const finished = parseFloat(att.finishedPartsWeight) || 0;
              const scrap = parseFloat(att.scrapWeight) || 0;
              const dust = parseFloat(att.dustWeight) || 0;
              const loss = parseFloat(att.metalLoss) || 0;
              const entryTotal = finished + scrap + dust + loss;
              const divisor = issuedWeight || 1;
              return {
                ...att,
                recovery: parseFloat(((entryTotal / divisor) * 100).toFixed(2)),
                shortage: parseFloat((divisor - entryTotal).toFixed(2))
              };
            });

            const deptAlloc: JobDepartment = {
              id: `${serialNo}-${countNo}`,
              dept: row[9] || "",            // col[9] = Dept (Column J)
              plannedWeight: row[10],  // col[10] = Planned (g)
              allowedWastage: row[11], // col[11] = Wastage %
              colL: row[12],           // col[12] = Padding col
              colM: row[13],           // col[13] = Padding col
              masterColM: row[12],     // Column M: assigned At
              masterColN: row[13],     // Column N: issued At
              issuedWeight: 0,         // Will be merged from issueData
              karigarAssigned: "",     // Will be merged from issueData
              authorizedBy: "",        // Will be merged from issueData
              returnType: row[5],      // col[5] = Category/Return Type
              countNo: String(countNo),
              status: "Pending",
              returnAttempts: processedAttempts,
              remainingWeight: row[16] || "0.000", // col[16] = Remaining Weight (Column Q)
              expectedReturn: row[10] ? (parseFloat(row[10]) * (1 - (parseFloat(row[11]) || 2) / 100)).toFixed(3) : "0.000",
            };

            // 🔹 MERGE ISSUE DATA FROM NEW SHEET
            // We use serialNo as a lookup (Assuming one active issuance per serial no for now)
            const issueData = allIssuesMap[serialNo];
            if (issueData) {
              const isNo = issueData.issueNo;
              deptAlloc.status = "Issued";
              deptAlloc.issuedWeight = issueData.issuedWeight;

              // Link Return Attempts using IS-NO
              const matchingAttempts = allReturnAttemptsMap[isNo] || [];
              deptAlloc.returnAttempts = matchingAttempts.map(att => {
                const finished = parseFloat(att.finishedPartsWeight) || 0;
                const scrap = parseFloat(att.scrapWeight) || 0;
                const dust = parseFloat(att.dustWeight) || 0;
                const loss = parseFloat(att.metalLoss) || 0;
                const entryTotal = finished + scrap + dust + loss;
                const divisor = parseFloat(issueData.issuedWeight) || 1;
                return {
                  ...att,
                  recovery: parseFloat(((entryTotal / divisor) * 100).toFixed(2)),
                  shortage: parseFloat((divisor - entryTotal).toFixed(2))
                };
              });

              // Calculate cumulative returned weight for Stock Summary
              deptAlloc.returnedWeight = (issueData.finishedNet || 0) + (deptAlloc.returnAttempts.reduce((sum, att) => {
                return sum + (parseFloat(att.scrapWeight) || 0)
                  + (parseFloat(att.dustWeight) || 0)
                  + (parseFloat(att.metalLoss) || 0);
              }, 0));

              deptAlloc.finishedWeight = issueData.finishedNet || 0;
              deptAlloc.scrapWeight = deptAlloc.returnAttempts.reduce((sum, att) => sum + (parseFloat(att.scrapWeight) || 0), 0);

              deptAlloc.karigarAssigned = issueData.karigarName;
              deptAlloc.authorizedBy = issueData.authorizedBy;
              deptAlloc.planned2 = issueData.planned2;
              deptAlloc.actual2 = issueData.actual2;
              deptAlloc.colM = issueData.timestamp;
            }

            const m_raw = row[12];
            const n_raw = row[13];
            const isFullyComplete = m_raw && String(m_raw).trim() !== "" && n_raw && String(n_raw).trim() !== "";
            if (isFullyComplete) deptAlloc.status = "Completed";
            else if (deptAlloc.issuedWeight && deptAlloc.issuedWeight > 0) deptAlloc.status = "Issued";

            jobGroups[serialNo].departments.push(deptAlloc);
          });

        const jobList = Object.values(jobGroups).map((group: any) => {
          const hasIssued = group.departments.some((d: any) => d.status === "Issued");
          const allCompleted = group.departments.every((d: any) => d.status === "Completed");
          if (allCompleted) group.stage = "Completed";
          else if (hasIssued) group.stage = "Issued";
          return group;
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        setJobs(jobList);

        // Deduct issued dept weights (Disabled — already handled by Term 2)
        /*
        jobList.forEach((job: any) => {
          job.departments.forEach((dept: any) => {
            const issued = dept.issuedWeight || 0;
            if (issued <= 0) return;
            const mt = String(job.metalType || "");
            if (mt === "24K_999" || mt.includes("99.9")) totalStock24K_999 = Math.max(0, totalStock24K_999 - issued);
            else if (mt === "24K_995" || mt.includes("99.5")) totalStock24K_995 = Math.max(0, totalStock24K_995 - issued);
            else if (mt === "22K" || mt.includes("22K")) totalStock22K = Math.max(0, totalStock22K - issued);
            else if (mt === "20K" || mt.includes("20K")) totalStock20K = Math.max(0, totalStock20K - issued);
            else if (mt === "18K" || mt.includes("18K")) totalStock18K = Math.max(0, totalStock18K - issued);
          });
        });
        */

        // Build IS-NO -> metal type map from local allIssuesMap + jobGroups (avoids stale state)
        const isNoToMetalType: Record<string, string> = {};
        Object.entries(allIssuesMap).forEach(([serialNo, issueData]: [string, any]) => {
          const job = jobGroups[serialNo];
          if (job && issueData.issueNo) {
            isNoToMetalType[issueData.issueNo] = job.metalType;
          }
        });

        // ➖ Subtract scrap weight from stock cards (use local flatReturns, not stale state)
        if (returnResult.success) {
          const returnRows = returnResult.data as any[][];
          returnRows.slice(1)
            .filter(row => row[2] && String(row[2]).trim() !== "")
            .forEach(row => {
              const isNo = String(row[2]);  // IS-NO from Department Return col C
              const scrap = parseFloat(row[6]) || 0;
              if (scrap > 0) {
                const metalType = isNoToMetalType[isNo];
                if (metalType) {
                  if (metalType.includes("22K")) totalStock22K += scrap;
                  else if (metalType.includes("20K")) totalStock20K += scrap;
                  else if (metalType.includes("18K")) totalStock18K += scrap;
                  else if (metalType.includes("99.9")) totalStock24K_999 += scrap;
                  else if (metalType.includes("99.5")) totalStock24K_995 += scrap;
                }
              }
            });
        }
      }

      // 6. Process Karigar Ledger
      if (karigarResult.success) {
        const rows = karigarResult.data.slice(1);
        const formatted = rows
          .filter((row: any) => row[1] && String(row[1]).trim() !== "")
          .map((row: any, idx: number) => {
            const depts = [];
            if (parseFloat(row[8]) > 0) depts.push({ dept: "Die", issuedWeight: parseFloat(row[8]), status: "Issued" });
            if (parseFloat(row[9]) > 0) depts.push({ dept: "Chain", issuedWeight: parseFloat(row[9]), status: "Issued" });
            if (parseFloat(row[10]) > 0) depts.push({ dept: "Taar", issuedWeight: parseFloat(row[10]), status: "Issued" });
            if (parseFloat(row[11]) > 0) depts.push({ dept: "KDM", issuedWeight: parseFloat(row[11]), status: "Issued" });

            return {
              id: `LEDGER-${idx}`,
              jobId: row[1],
              orderNo: row[1],
              updatedAt: row[0],
              karigarName: row[4],
              meltingType: row[3],
              totalWeight: row[2],
              metalWeight: row[7],
              authorizedPerson: row[6],
              expectedDeliveryDate: row[5],
              departments: depts,
              stage: "Issued"
            };
          });
        setKarigarLedger(formatted.reverse());

        // Deduct Karigar Ledger issues from total stock to ensure accurate 24K card values
        rows.forEach((row: any) => {
          const mt = String(row[3] || "").trim().toUpperCase(); // Column D = Melting Type
          const weight = parseFloat(row[2]) || 0; // Total weight for 24K
          if (weight <= 0) return;

          if (mt === "24K_999" || mt.includes("99.9")) totalStock24K_999 = Math.max(0, totalStock24K_999 - weight);
          else if (mt === "24K_995" || mt.includes("99.5")) totalStock24K_995 = Math.max(0, totalStock24K_995 - weight);
        });
      }

      // 7. Process Production Orders
      if (orderResult.success) {
        setProductionOrders(
          orderResult.data
            .slice(1)
            .filter((row: any) => row[1] && String(row[1]).trim() !== "")
        );
      }

      // 8. Process Master Drop Down (Karigar list and Authorizer list)
      if (masterResult.success) {
        const rows = masterResult.data;
        const karigars = rows
          .slice(1)
          .map((row: any) => row[1]) // Column B
          .filter((name: any) => name && String(name).trim() !== "");
        setMasterKarigars(Array.from(new Set(karigars as string[])));

        const authorizers = rows
          .slice(1)
          .map((row: any) => row[2]) // Column C
          .filter((name: any) => name && String(name).trim() !== "");
        setMasterAuthorizers(Array.from(new Set(authorizers as string[])));
      }

      // 9. Calculate final stock totals using reusable utility for Karats
      // Formula: Total = AlloyConversion[I] - ProductionPlanning[P] + DepartmentIssue[L] - KarigarIssue[H]
      const total22K = calculateKaratStock("22K", convResult.data, prodResult.data, issueResult.data, karigarResult.data);
      const total20K = calculateKaratStock("20K", convResult.data, prodResult.data, issueResult.data, karigarResult.data);
      const total18K = calculateKaratStock("18K", convResult.data, prodResult.data, issueResult.data, karigarResult.data);

      let totalScrapFromReturns = 0;
      let totalLossFromReturns = 0;

      departmentReturns.forEach(r => {
        totalScrapFromReturns += parseFloat(r.scrapMetal) || 0;
        totalLossFromReturns += parseFloat(r.metalLoss) || 0;
      });

      setStockData({
        stock24K: totalStock24K_999 + totalStock24K_995,
        stock24K_999: totalStock24K_999,
        stock24K_995: totalStock24K_995,
        stock22K: total22K,
        stock20K: total20K,
        stock18K: total18K,
        scrapBalance: totalScrapFromReturns,
        conversionLoss: totalLossFromReturns,
      });

    } catch (error) {
      console.error("Data fetch error:", error);
    } finally {
      if (isInitialLoad.current) {
        setIsAuthLoading(false);
        isInitialLoad.current = false;
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      // Use cached Login Master if fresh (avoids re-downloading on every
      // login attempt); fetchSheet will use cache if the TTL hasn't expired.
      const result = await fetchSheet("Login Master");

      if (!result.success) {
        console.error("Sheet error:", (result as any).error);
        return false;
      }

      const rows = result.data;

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const sheetUsername = row[1]; // Column B
        const sheetPassword = row[3]; // Column D
        const sheetRole = row[4];     // Column E
        const sheetUserId = row[0];   // Column A
        const sheetEmail = row[2];    // Column C
        const sheetPageAccess = row[5]; // Column F


        let parsedPageAccess: string[] = [];

        if (typeof sheetPageAccess === "string" && sheetPageAccess.trim() !== "") {
          parsedPageAccess = sheetPageAccess
            .split(",")
            .map((p: string) => p.trim());
        }

        if (
          sheetUsername === username &&
          sheetPassword === password
        ) {
          const userData = {
            userId: sheetUserId,
            username: sheetUsername,
            email: sheetEmail,
            role: sheetRole as UserRole,
            pageAccess: parsedPageAccess,
          };

          setUser(userData);
          localStorage.setItem("erp_user", JSON.stringify(userData));
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("erp_user");
  };


  const updateStock = (updates: Partial<StockData>) => {
    setStockData((prev) => {
      const merged = { ...prev, ...updates };
      // Clamp all stock values to minimum 0 — stock can never go negative
      return {
        ...merged,
        stock24K: Math.max(0, merged.stock24K),
        stock24K_999: Math.max(0, merged.stock24K_999),
        stock24K_995: Math.max(0, merged.stock24K_995),
        stock22K: Math.max(0, merged.stock22K),
        stock20K: Math.max(0, merged.stock20K),
        stock18K: Math.max(0, merged.stock18K),
        scrapBalance: Math.max(0, merged.scrapBalance),
      };
    });
  };

  const addJob = (job: Job) => {
    setJobs((prev) => [...prev, job]);
  };

  const updateJob = (jobId: string, updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.jobId === jobId) {
          return { ...job, ...updates, updatedAt: new Date() };
        }
        return job;
      })
    );
  };

  const getJobByOrderNo = (orderNo: string) => {
    return jobs.find((job) => job.orderNo === orderNo);
  };

  const getJobById = (jobId: string) => {
    return jobs.find((job) => job.jobId === jobId);
  };

  const addProcurementEntry = (entry: ProcurementEntry) => {
    setProcurementEntries(prev => [entry, ...prev]);
  };

  const addConversionEntry = (entry: ConversionEntry) => {
    setConversionEntries(prev => [entry, ...prev]);
  };

  const alloyStock = useMemo(() => {
    const totals = { "22K": 0, "20K": 0, "18K": 0 };

    // ➕ STEP 1: Add Output from AlloyConversion entries
    conversionEntries.forEach((entry) => {
      const key = getKaratKey(entry.targetKarat);
      if (key) {
        totals[key] += parseFloat(entry.outputWeight as string) || 0;
      }
    });

    // ➕ STEP 2: Adjustment from Jobs (Issued and Scrap Returns)
    jobs.forEach((job) => {
      job.departments.forEach((dept) => {
        const effectiveMetal = dept.meltingType || job.metalType;
        const key = getKaratKey(effectiveMetal);
        if (!key) return;

        // Subtract issued weight
        totals[key] -= dept.issuedWeight || 0;

        // Add scrap weight (User requested PLUS)
        totals[key] += dept.scrapWeight || 0;
      });
    });

    // Clamp to 0
    (Object.keys(totals) as Array<keyof typeof totals>).forEach((k) => {
      totals[k] = Math.max(0, totals[k]);
    });

    return totals;
  }, [conversionEntries, jobs]);

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthLoading,
        login,
        logout,
        stockData,
        updateStock,
        jobs,
        setJobs,
        addJob,
        updateJob,
        getJobByOrderNo,
        getJobById,
        procurementEntries,
        addProcurementEntry,
        setProcurementEntries,
        conversionEntries,
        addConversionEntry,
        setConversionEntries,
        karigarLedger,
        setKarigarLedger,
        productionOrders,
        setProductionOrders,
        masterKarigars,
        masterAuthorizers,
        fetchAllData,
        departmentIssues,
        setDepartmentIssues,
        departmentReturns,
        setDepartmentReturns,
        alloyStock,
        liveDepartmentStock,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    // During development, hot reload might temporarily cause this
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.warn("useApp called outside AppProvider - returning safe defaults");
      // Return a dummy context to prevent crash during HMR
      return {
        user: null,
        // login: () => false,
        login: async () => false,
        logout: () => { },
        stockData: {
          stock24K: 0,
          stock24K_999: 0,
          stock24K_995: 0,
          stock22K: 0,
          stock20K: 0,
          stock18K: 0,
          scrapBalance: 0,
          conversionLoss: 0,
        },
        isAuthLoading: true,
        updateStock: () => { },
        jobs: [],
        setJobs: () => { },
        addJob: () => { },
        updateJob: () => { },
        getJobByOrderNo: () => undefined,
        getJobById: () => undefined,
        procurementEntries: [],
        setProcurementEntries: () => { },
        addProcurementEntry: () => { },
        conversionEntries: [],
        setConversionEntries: () => { },
        addConversionEntry: () => { },
        setKarigarLedger: () => { },
        karigarLedger: [],
        productionOrders: [],
        setProductionOrders: () => { },
        masterKarigars: [],
        masterAuthorizers: [],
        fetchAllData: async () => { },
        alloyStock: { "22K": 0, "20K": 0, "18K": 0 },
        departmentIssues: [],
        setDepartmentIssues: () => { },
        departmentReturns: [],
        setDepartmentReturns: () => { },
        liveDepartmentStock: {
          "22K": { Die: 0, Taar: 0, Chain: 0, KDM: 0 },
          "20K": { Die: 0, Taar: 0, Chain: 0, KDM: 0 },
          "18K": { Die: 0, Taar: 0, Chain: 0, KDM: 0 },
        },
      } as AppContextType;
    }
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
import { useState, useRef, useMemo, useEffect } from "react";
import {
  UserCheck, Save, CheckCircle, Printer, X, Scale,
  ClipboardList, Search, User, Briefcase, LayoutGrid,
  Activity, Plus, ChevronRight, Package, Clock, ArrowRight,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { fetchSheet, invalidateCache } from "../services/api";

export const KarigarIssue = () => {
  // Use context data directly — no need to fetch separately
  const { updateStock, stockData, user, jobs, addJob, updateJob, fetchAllData,
    karigarLedger, setKarigarLedger, productionOrders, alloyStock, liveDepartmentStock } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const hasRefreshed = useRef(false);
  useEffect(() => {
    if (!hasRefreshed.current) {
      hasRefreshed.current = true;
      const refreshData = async () => {
        await fetchAllData(true);
      };
      refreshData();
      // Show loading for 1 second for instant feel
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, []);

  const [karigars, setKarigars] = useState<string[]>([]);
  const [authorizers, setAuthorizers] = useState<string[]>([]);

  useEffect(() => {
    fetchSheet("Master Drop Down").then((result) => {
      if (!result.success) return;
      const rows: any[][] = result.data;
      const kList: string[] = [];
      const aList: string[] = [];
      rows.slice(1).forEach((row) => {
        const k = row[1]; // Column B — Karigar Name
        const a = row[2]; // Column C — Authorized Person Name
        if (k && String(k).trim()) kList.push(String(k).trim());
        if (a && String(a).trim()) aList.push(String(a).trim());
      });
      setKarigars([...new Set(kList)]);
      setAuthorizers([...new Set(aList)]);
    });
  }, []);

  const dynamicDepartments = useMemo(() => {
    const names = new Set<string>();
    jobs.forEach(job => {
      job.departments.forEach(d => {
        if (d.dept) names.add(String(d.dept).trim());
      });
    });
    const standard = ["Die", "Chain", "Taar", "KDM"];
    // Always include standard departments for Karigar Issue to match UI inputs
    const result = [...standard];

    // Add any other departments found in jobs
    Array.from(names).forEach(n => {
      if (!standard.includes(n)) result.push(n);
    });
    return result;
  }, [jobs]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showSlip, setShowSlip] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [savedJobData, setSavedJobData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [jobId, setJobId] = useState("");
  const [orderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [karigarName, setKarigarName] = useState("");
  const [meltingType, setMeltingType] = useState("");
  const [authorizedPerson, setAuthorizedPerson] = useState("");
  const [metalWeight, setMetalWeight] = useState("");
  const [departmentWeights, setDepartmentWeights] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  // karigarLedger now comes from context — no local state needed

  // productionOrders now comes from context — no local state needed
  const [orderSearchText, setOrderSearchText] = useState("");
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const orderDropdownRef = useRef<HTMLDivElement>(null);

  const slipRef = useRef<HTMLDivElement>(null);

  const totalDepartmentWeight = useMemo(() => {
    let total = parseFloat(metalWeight) || 0;
    Object.values(departmentWeights).forEach(w => { total += parseFloat(w) || 0; });
    return total;
  }, [departmentWeights, metalWeight]);

  const isWeightExceeded = useMemo(() =>
    !!totalWeight && totalDepartmentWeight > parseFloat(totalWeight),
    [totalDepartmentWeight, totalWeight]
  );

  const getMeltingTypeLabel = (mt: string) => {
    const map: Record<string, string> = {
      "24K_999": "24K (99.9%)", "24K_995": "24K (99.5%)",
      "22K": "22K", "20K": "20K", "18K": "18K",
    };
    return map[mt] || mt;
  };

  const formatTimestamp = (raw: string) => {
    if (!raw) return "—";
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        const dd = d.getDate().toString().padStart(2, "0");
        const mm = (d.getMonth() + 1).toString().padStart(2, "0");
        const yyyy = d.getFullYear();
        const hh = d.getHours().toString().padStart(2, "0");
        const min = d.getMinutes().toString().padStart(2, "0");
        const ss = d.getSeconds().toString().padStart(2, "0");
        return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
      }
    } catch { /* fall through */ }
    return raw;
  };

  // Only keep the click-outside handler — data comes from AppContext
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orderDropdownRef.current && !orderDropdownRef.current.contains(event.target as Node)) {
        setIsOrderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const handleOrderSelect = (selectedOrderNo: string) => {
    const order = productionOrders.find(o => o[1] === selectedOrderNo);
    if (order) {
      setJobId(selectedOrderNo);
      const weight = order[16] ? String(order[16]) : "";
      setTotalWeight(weight);
      const newWeights: Record<string, string> = {};
      dynamicDepartments.forEach(d => { newWeights[d] = ""; });
      setDepartmentWeights(newWeights);

      let metalType = "22K";
      const meltingVal = String(order[4] || "").toUpperCase();
      if (meltingVal.includes("84") || meltingVal.includes("20K")) metalType = "20K";
      else if (meltingVal.includes("76") || meltingVal.includes("75") || meltingVal.includes("18K")) metalType = "18K";
      setMeltingType(metalType);
    } else {
      setJobId(selectedOrderNo);
    }
    setOrderSearchText(selectedOrderNo);
    setIsOrderDropdownOpen(false);
  };

  const pendingJobs = useMemo(() => jobs.filter(j => j.stage === "Created"), [jobs]);

  const issuedJobsRows = useMemo(() => {
    return karigarLedger.filter(job => {
      const q = searchQuery.toLowerCase();
      const match = !q ||
        String(job.orderNo).toLowerCase().includes(q) ||
        String(job.karigarName).toLowerCase().includes(q) ||
        job.departments.some((d: any) => d.dept && d.dept.toLowerCase().includes(q));
      return match;
    });
  }, [karigarLedger, searchQuery]);

  const stats = useMemo(() => {
    const totalIssued = issuedJobsRows.reduce((s: number, j: any) =>
      s + j.departments.reduce((a: number, d: any) => a + (d.issuedWeight || 0), 0), 0);
    const totalPending = pendingJobs.length;
    const totalInProgress = issuedJobsRows.length;
    return { totalIssued, totalPending, totalInProgress };
  }, [issuedJobsRows, pendingJobs]);

  const handleDepartmentWeightChange = (dept: string, value: string) => {
    if (!meltingType) { alert("⚠️ Select Melting Type first!"); return; }
    if (!totalWeight) { alert("⚠️ Enter Total Weight first!"); return; }
    
    if (value) {
      const entered = parseFloat(value) || 0;
      
      // 1. Check against order total weight
      const metal = parseFloat(metalWeight) || 0;
      const otherDepts = Object.entries(departmentWeights)
        .filter(([k]) => k !== dept)
        .reduce((s, [, w]) => s + (parseFloat(w as string) || 0), 0);

      if (metal + otherDepts + entered > parseFloat(totalWeight)) {
        alert(`⚠️ Total allocated weight (${(metal + otherDepts + entered).toFixed(3)}g) exceeds order weight (${totalWeight}g)!`);
        return;
      }

      // 2. Check against live department stock
      const stockKey = meltingType as keyof typeof liveDepartmentStock;
      const deptKey = dept as keyof typeof liveDepartmentStock["22K"];
      const availableStock = liveDepartmentStock[stockKey]?.[deptKey] || 0;

      if (entered > availableStock) {
        alert(`⚠️ Insufficient ${dept} stock! Available: ${availableStock.toFixed(3)}g`);
        return;
      }
    }
    setDepartmentWeights({ ...departmentWeights, [dept]: value });
  };

  const handleMetalWeightChange = (value: string) => {
    if (!meltingType) { alert("⚠️ Select Melting Type first!"); return; }
    if (!totalWeight) { alert("⚠️ Enter Total Weight first!"); return; }
    if (value) {
      const entered = parseFloat(value) || 0;
      const depts = Object.values(departmentWeights).reduce((s, w) => s + (parseFloat(w as string) || 0), 0);

      if (depts + entered > parseFloat(totalWeight)) {
        alert(`⚠️ Total allocated weight (${(depts + entered).toFixed(3)}g) exceeds order weight (${totalWeight}g)!`);
        return;
      }

      const stocks: Record<string, number> = {
        "24K_999": stockData.stock24K_999, "24K_995": stockData.stock24K_995,
        "22K": stockData.stock22K, "20K": stockData.stock20K, "18K": stockData.stock18K,
      };
      if (entered > (stocks[meltingType] || 0)) {
        alert(`⚠️ Insufficient ${getMeltingTypeLabel(meltingType)} stock!`); return;
      }
    }
    setMetalWeight(value);
  };

  const resetForm = () => {
    setJobId(""); setExpectedDeliveryDate(""); setTotalWeight("");
    setKarigarName(""); setMeltingType(""); setAuthorizedPerson("");
    setMetalWeight(""); setDepartmentWeights({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const day = now.getDate().toString().padStart(2, "0");
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const year = now.getFullYear();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      let totalIssuedWeight = parseFloat(metalWeight) || 0;

      // Build list of departments that have issued weight in this form
      const deptsWeightEntry = dynamicDepartments
        .filter(dept => parseFloat(departmentWeights[dept as keyof typeof departmentWeights]) > 0)
        .map(dept => {
          const weight = parseFloat(departmentWeights[dept as keyof typeof departmentWeights]);
          return {
            dept,
            weight
          };
        });

      // Build issued departments structure for jobs and savedJobData
      const issuedDepts = deptsWeightEntry.map(entry => {
        const weight = entry.weight;
        totalIssuedWeight += weight;
        return {
          id: `${jobId}-${entry.dept}-${Date.now()}`,
          dept: entry.dept,
          plannedWeight: weight.toFixed(3),
          allowedWastage: "2",
          issuedWeight: weight,
          remainingWeight: weight.toFixed(3),
          status: "Issued" as const,
          karigarAssigned: karigarName,
          meltingType,
          expectedReturn: (weight * 0.98).toFixed(3),
          scrapExpected: (weight * 0.02).toFixed(3),
          authorizedBy: authorizedPerson || user?.username || "Admin",
          masterColM: timestamp, // Instant appear in Department Issue Pending
        };
      });

      // Try to update the matching job if it exists in context
      const originalJob = jobs.find(j => j.jobId === jobId || j.orderNo === jobId);
      if (originalJob) {
        const updatedDepartments = originalJob.departments.map(deptAlloc => {
          const weight = parseFloat(departmentWeights[deptAlloc.dept as keyof typeof departmentWeights]) || 0;
          if (weight > 0) {
            return {
              ...deptAlloc,
              issuedWeight: weight,
              remainingWeight: weight.toFixed(3),
              status: "Issued" as const,
              karigarAssigned: karigarName,
              meltingType,
              expectedReturn: (weight * 0.98).toFixed(3),
              scrapExpected: (weight * 0.02).toFixed(3),
              authorizedBy: authorizedPerson || user?.username || "Admin",
              masterColM: timestamp, // Instant appear in Department Issue Pending
            };
          }
          return deptAlloc;
        });
        updateJob(originalJob.jobId, { departments: updatedDepartments, stage: "Issued", issuedVia: "karigar", updatedAt: new Date() });
        totalIssuedWeight = parseFloat(metalWeight) || 0;
        updatedDepartments.forEach(d => { if (d.issuedWeight) totalIssuedWeight += d.issuedWeight; });
      } else {
        // New standalone karigar issue — add as a new job entry tagged with issuedVia
        const newJobId = `KI-${Date.now()}`;
        addJob({
          jobId: newJobId,
          orderNo: jobId,
          designCode: "",
          customer: "",
          totalWeight: totalIssuedWeight.toFixed(3),
          metalType: meltingType,
          departments: issuedDepts,
          stage: "Issued",
          issuedVia: "karigar",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // --- SHEET SUBMISSION (New Logic) ---
      // --- SHEET SUBMISSION (New Logic) ---

      const sheetRow = [
        timestamp,                    // A: Timestamp
        jobId,                        // B: Order No.
        totalIssuedWeight.toFixed(3), // C: Total Weight
        meltingType,                  // D: Melting Type
        karigarName,                  // E: Karigar Name
        expectedDeliveryDate,         // F: Expected Delivery
        authorizedPerson,             // G: Authorized By
        metalWeight || "0",           // H: Direct Metal
        departmentWeights["Die"] || "0",   // I: Die
        departmentWeights["Chain"] || "0",   // J: Chain
        departmentWeights["Taar"] || "0",   // K: Taar
        departmentWeights["KDM"] || "0",   // L: KDM
      ];

      // --- OPTIMISTIC UI UPDATE for instant feedback ---
      // 1. Deduct Direct Metal (g) from the alloy conversion stock.
      const directMetal = parseFloat(metalWeight) || 0;
      const stockMap: Record<string, keyof typeof stockData> = {
        "24K_999": "stock24K_999", "24K_995": "stock24K_995",
        "22K": "stock22K", "20K": "stock20K", "18K": "stock18K",
      };
      const stockUpdates: Partial<typeof stockData> = {};
      if (directMetal > 0 && meltingType && stockMap[meltingType]) {
        (stockUpdates as any)[stockMap[meltingType]] = (stockData as any)[stockMap[meltingType]] - directMetal;
        updateStock(stockUpdates);
      }

      // 2. Add to Ledger Optimistically
      const depts = [];
      const dWeights = departmentWeights as any;
      if (parseFloat(metalWeight) > 0) depts.push({ dept: "Direct Metal", issuedWeight: parseFloat(metalWeight), status: "Issued" });
      dynamicDepartments.forEach(dept => {
        const w = parseFloat(departmentWeights[dept]);
        if (w > 0) depts.push({ dept, issuedWeight: w, status: "Issued" });
      });

      const newEntry = {
        id: `LEDGER-NEW-${Date.now()}`,
        jobId: jobId,
        orderNo: jobId,
        updatedAt: timestamp,
        karigarName: karigarName,
        meltingType: meltingType,
        totalWeight: totalIssuedWeight.toFixed(3),
        metalWeight: metalWeight,
        authorizedPerson: authorizedPerson,
        expectedDeliveryDate: expectedDeliveryDate,
        departments: depts,
        stage: "Issued"
      };

      setKarigarLedger([newEntry, ...karigarLedger]);

      setSavedJobData({
        jobId, orderNo: jobId,
        karigarName, meltingType, metalWeight: metalWeight ? parseFloat(metalWeight).toFixed(3) : "0.000",
        totalWeight: totalIssuedWeight.toFixed(3),
        departments: issuedDepts,
        issueDate: new Date().toLocaleDateString("en-IN"),
        issuedBy: user?.username || "Admin",
        orderDate, expectedDeliveryDate, authorizedPerson,
      });

      // 3. Instant UI feedback + Fast Loading
      setShowSuccess(true);
      setShowSlip(true);
      
      // Show loading overlay for 1 second (fast loading pattern)
      setLedgerLoading(true);
      setTimeout(() => {
        setLedgerLoading(false);
        setShowIssueModal(false);
        resetForm();
        setShowSuccess(false);
      }, 1000);
      
      setIsSubmitting(false);

      // 4. Background Data Sync (Fire & Forget)
      fetch(
        "https://script.google.com/macros/s/AKfycbygSkpwhyYTjKeO5LRz06kTXMaM0mLMDwLNNaUR_rBItSshetknhJHGWuAJ3a2CMrX4/exec",
        {
          method: "POST",
          body: new URLSearchParams({
            action: "insert",
            sheetName: "Karigar Issue",
            rowData: JSON.stringify(sheetRow),
          }),
        }
      )
        .then(() => {
          invalidateCache("Karigar Issue");
          setTimeout(() => fetchAllData(true), 1200);
        })
        .catch((sheetErr) => console.error("Sheet submission failed:", sheetErr));
    } catch (err) {
      console.error("Karigar Issue failed:", err);
      alert("Something went wrong while issuing the job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintSlip = () => {
    if (!slipRef.current) return;
    const pw = window.open("", "_blank");
    if (pw) {
      pw.document.write(`
        <html>
          <head>
            <title>Karigar Issue Slip - ${savedJobData?.jobId || ""}</title>
            <style>
              @page { size: A4; margin: 0; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; padding: 20mm 15mm; font-size: 11px; line-height: 1.5; color: #111827; }
              h1 { margin: 0; }
              table { width: 100%; border-collapse: collapse; }
              th { background-color: #2563EB; color: white; text-align: left; padding: 8px 16px; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
              td { padding: 8px 16px; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
              tbody tr:nth-child(even) { background-color: #F9FAFB; }
              .total-row { background-color: #EFF6FF; border-top: 2px solid #2563EB; }
              .total-row td { font-weight: 600; color: #1D4ED8; }
              .header-section { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #2563EB; }
              .badge { background-color: #2563EB; color: white; padding: 4px 12px; display: inline-block; border-radius: 4px; font-weight: 600; font-size: 11px; letter-spacing: 0.05em; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; margin-bottom: 24px; }
              .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
              .info-label { color: #374151; font-weight: 600; }
              .info-value { color: #111827; }
              .section-title { background-color: #F3F4F6; padding: 6px 12px; border-radius: 4px; font-weight: 600; font-size: 11px; margin-bottom: 10px; }
              .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; }
              .sig-box { border-top: 2px solid #111827; padding-top: 8px; text-align: center; }
              .sig-name { font-weight: 600; margin-top: 4px; }
              .sig-label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; }
              .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #D1D5DB; background: #F9FAFB; padding: 12px; border-radius: 4px; text-align: center; font-size: 10px; color: #6B7280; }
            </style>
          </head>
          <body>
            <div class="header-section">
              <h1 style="font-size:16px;font-weight:700;margin-bottom:4px;">Handmade Jewellery Manufacturing Unit</h1>
              <p style="font-size:10px;color:#6B7280;">Near City Center, Main Road, Mumbai - 400001</p>
              <p style="font-size:10px;color:#6B7280;margin-bottom:10px;">Phone: +91 98765 43210 | Email: info@atjewellery.com</p>
              <span class="badge">KARIGAR ISSUE SLIP</span>
            </div>

            <div class="info-grid">
              <div class="info-row"><span class="info-label">Order ID:</span><span class="info-value">${savedJobData?.jobId || ""}</span></div>
              <div class="info-row"><span class="info-label">Issue Date:</span><span class="info-value">${savedJobData?.issueDate || ""}</span></div>
              <div class="info-row"><span class="info-label">Order Date:</span><span class="info-value">${savedJobData?.orderDate || ""}</span></div>
              <div class="info-row"><span class="info-label">Expected Delivery:</span><span class="info-value">${savedJobData?.expectedDeliveryDate || ""}</span></div>
              <div class="info-row"><span class="info-label">Karigar Name:</span><span class="info-value">${savedJobData?.karigarName || ""}</span></div>
              <div class="info-row"><span class="info-label">Metal Type:</span><span class="info-value">${getMeltingTypeLabel(savedJobData?.meltingType || "")}</span></div>
              <div class="info-row"><span class="info-label">Authorized By:</span><span class="info-value">${savedJobData?.authorizedPerson || ""}</span></div>
              <div class="info-row"><span class="info-label">Issued By:</span><span class="info-value">${savedJobData?.issuedBy || ""}</span></div>
            </div>

            <p class="section-title">Department Details</p>
            <table>
              <thead><tr><th>Department</th><th style="text-align:right">Issued Weight (g)</th></tr></thead>
              <tbody>
                ${savedJobData?.metalWeight && parseFloat(savedJobData.metalWeight) > 0
          ? `<tr><td>Direct Metal</td><td style="text-align:right">${savedJobData.metalWeight}</td></tr>`
          : ""}
                ${(savedJobData?.departments || []).map((d: any, i: number) =>
            `<tr style="background:${i % 2 === 0 ? "#F9FAFB" : "white"}"><td>${d.dept}</td><td style="text-align:right">${d.issuedWeight.toFixed(3)}</td></tr>`
          ).join("")}
                <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${savedJobData?.totalWeight || "0.000"}g</td></tr>
              </tbody>
            </table>

            <div class="signatures">
              <div class="sig-box"><p class="sig-label">Received By (Karigar)</p><p class="sig-name">${savedJobData?.karigarName || ""}</p></div>
              <div class="sig-box"><p class="sig-label">Authorized By</p><p class="sig-name">${savedJobData?.authorizedPerson || ""}</p></div>
            </div>

            <div class="footer">
              <strong>Note:</strong> This is a computer-generated slip. Generated on: ${new Date().toLocaleDateString("en-IN")}
            </div>
          </body>
        </html>
      `);
      pw.document.close();
      pw.print();
    }
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-57px-28px-2rem)] md:h-[calc(100vh-57px-28px-3rem)] relative animate-in fade-in duration-500">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-gray-600">Loading fresh data...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50/60 rounded-full blur-3xl -z-10 opacity-70" />

          {/* Success Modal */}
          {showSuccess && (
            <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-4">
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-orange-200">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Work Issued</h3>
                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mt-1">Assignment Record Generated</p>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-[12px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Weight Issued</p>
                    <span className="text-4xl font-black text-amber-600 tracking-tighter">
                      {savedJobData ? parseFloat(savedJobData.totalWeight).toFixed(3) : "0.000"}g
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-full origin-left animate-shrink" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-3 mb-4">
            <div className="flex flex-col gap-3">
              {/* Top Row: Icon + Title + Button */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-200 shrink-0">
                    <UserCheck className="w-4 h-4 text-white shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-black text-gray-900 uppercase tracking-tight truncate">Karigar Assignment</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Issue work to karigars</p>
                  </div>
                </div>
                <button
                  onClick={() => { resetForm(); setShowIssueModal(true); }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-[11px] font-black uppercase shadow-lg shadow-orange-200 hover:shadow-xl active:scale-95 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">Assign</span>
                </button>
              </div>
              
              {/* Bottom Row: Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text" placeholder="Search orders, karigar..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Title + Badge */}
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-orange-600 shrink-0" />
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-[13px] uppercase tracking-tight whitespace-nowrap">Issuance Ledger</h3>
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[12px] font-bold rounded-md shrink-0">{issuedJobsRows.length}</span>
                  </div>
                </div>

                {/* Right: Search Only (Button removed - use page header button) */}
                <div className="flex items-center gap-2 flex-1 sm:flex-none">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 shrink-0" />
                    <input
                      type="text" placeholder="Search..." value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-bold outline-none focus:ring-2 focus:ring-orange-50 min-w-[120px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
              {/* Professional Loading Overlay */}
              {ledgerLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-5 flex items-center gap-4">
                    <div className="w-6 h-6 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Updating...</span>
                  </div>
                </div>
              )}

              {/* Desktop Table */}
              <table className="hidden md:table w-full text-base">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Timestamp", "Order / Job ID", "Karigar", "Metal", "Issued Wt", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[13px] font-bold text-gray-400 uppercase tracking-wider first:rounded-tl last:rounded-tr">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {issuedJobsRows.map(job => {
                    const firstDept = job.departments.find((d: any) => d.karigarAssigned);
                    const totalIssued = job.departments.reduce((s: number, d: any) => s + (d.issuedWeight || 0), 0);
                    return (
                      <tr key={job.id} className="hover:bg-amber-50/30 transition-colors group">
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-[12px] text-gray-900">{formatTimestamp(job.updatedAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3 text-orange-400 shrink-0" />
                            <div>
                              <p className="text-[13px] text-gray-900">{job.orderNo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
                              <User className="w-3 h-3 text-amber-600" />
                            </div>
                            <span className="text-[13px] text-gray-800 uppercase">{job.karigarName || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[13px] rounded-full border border-yellow-100">
                            {getMeltingTypeLabel(job.meltingType || "")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-orange-600">{parseFloat(job.totalWeight).toFixed(3)}<span className="text-[13px] text-gray-400 ml-0.5">g</span></span>
                        </td>

                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => {
                              setSavedJobData({ ...job, issueDate: formatTimestamp(job.updatedAt), issuedBy: job.authorizedPerson || "Admin" });
                              setShowSlip(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg border border-transparent hover:border-orange-100 transition-all"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-4">
                {issuedJobsRows.map(job => (
                  <div key={job.id} className="bg-white rounded-xl p-4 border-2 border-orange-300 active:border-orange-500 active:bg-amber-50/30 transition-all">
                    {/* Top Row: Order ID + Print Button */}
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h4 className="text-[15px] font-black text-gray-900 uppercase tracking-tight">{job.orderNo}</h4>
                        <p className="text-[11px] font-mono text-gray-400 uppercase tracking-tighter mt-0.5">{job.jobId}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSavedJobData({ ...job, issueDate: formatTimestamp(job.updatedAt), issuedBy: job.authorizedPerson || "Admin" });
                          setShowSlip(true);
                        }}
                        className="p-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-100 hover:bg-orange-100 transition-all shrink-0"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Middle Section: Karigar + Metal */}
                    <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-100">
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 font-bold">Karigar</p>
                        <p className="text-[13px] font-semibold text-gray-800 uppercase mt-0.5 truncate">{job.karigarName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 font-bold">Metal Type</p>
                        <span className="inline-flex items-center px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[11px] rounded-full border border-yellow-100 mt-0.5 font-bold">
                          {getMeltingTypeLabel(job.meltingType || "")}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Weight + Timestamp */}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 font-bold">Total Weight</p>
                        <p className="text-[16px] font-black text-orange-600 mt-0.5">{parseFloat(job.totalWeight).toFixed(3)}<span className="text-[12px] text-gray-400 ml-0.5">g</span></p>
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium">{formatTimestamp(job.updatedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Slip Sidebar */}
          {showSlip && savedJobData && (
            <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-[150] border-l border-gray-100 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-sm">
                    <Printer className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Issue Slip</h3>
                </div>
                <button onClick={() => setShowSlip(false)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
                <div ref={slipRef} className="bg-white p-8 shadow-sm rounded-xl border border-gray-200">
                  <div className="text-center pb-5 border-b-2 border-amber-500 mb-6">
                    <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase">Karigar Issue Slip</h1>
                    <p className="text-[13px] text-gray-400 font-bold uppercase tracking-widest mt-1">Assignment Voucher</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6 text-[13px]">
                    {[
                      { label: "Job ID", value: savedJobData.jobId },
                      { label: "Issue Date", value: savedJobData.issueDate, right: true },
                      { label: "Order No", value: savedJobData.orderNo || "N/A" },
                      { label: "Karigar", value: savedJobData.karigarName, right: true },
                      { label: "Melting", value: getMeltingTypeLabel(savedJobData.meltingType) },
                      { label: "Issued By", value: savedJobData.issuedBy, right: true },
                    ].map((item, i) => (
                      <div key={i} className={item.right ? "text-right" : ""}>
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                        <p className="font-black text-gray-900 uppercase">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mb-6 overflow-hidden rounded-lg border border-gray-100">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr>
                          <th className="py-2 px-3 text-left bg-amber-500 text-white font-bold uppercase text-[13px]">Department</th>
                          <th className="py-2 px-3 text-right bg-amber-500 text-white font-bold uppercase text-[13px]">Weight (g)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedJobData.departments?.map((d: any, i: number) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-2 px-3 font-bold">{d.dept}</td>
                            <td className="py-2 px-3 text-right font-black">{(d.issuedWeight || 0).toFixed(3)}g</td>
                          </tr>
                        ))}
                        {parseFloat(savedJobData.metalWeight) > 0 && (
                          <tr className="border-b border-gray-50">
                            <td className="py-2 px-3 font-bold italic">Direct Metal</td>
                            <td className="py-2 px-3 text-right font-black">{parseFloat(savedJobData.metalWeight).toFixed(3)}g</td>
                          </tr>
                        )}
                        <tr className="bg-amber-50">
                          <td className="py-2.5 px-3 font-black text-amber-700 uppercase">Grand Total</td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-700">{parseFloat(savedJobData.totalWeight).toFixed(3)}g</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between pt-10 border-t border-gray-200 mt-8">
                    {["Karigar Signature", "Authorized By"].map(label => (
                      <div key={label} className="text-center">
                        <div className="h-10 w-28 mb-1 border-b border-gray-300" />
                        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-white">
                <button onClick={handlePrintSlip} className="w-full py-3 bg-gray-900 text-white rounded-xl font-black uppercase text-[12px] tracking-widest hover:bg-orange-500 transition-all shadow-lg flex items-center justify-center gap-2">
                  <Printer className="w-4 h-4" />Generate Official Slip
                </button>
              </div>
            </div>
          )}

          {/* Issue Modal */}
          {showIssueModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowIssueModal(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-5 duration-300">
                {/* Modal Header */}
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-100">
                      <UserCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">New Karigar Assignment</h3>
                      <p className="text-[13px] text-gray-400 uppercase tracking-widest">Enter order info · Assign karigar · Allocate weights</p>
                    </div>
                  </div>
                  <button onClick={() => setShowIssueModal(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0" autoComplete="off">
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left Column */}
                      <div className="space-y-5">
                        {/* Step 1: Order Info */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                            <h4 className="text-[12px] text-gray-500 uppercase tracking-widest">1. Order Info</h4>
                          </div>
                          <div>
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Job / Order ID *</label>
                            <div className="relative" ref={orderDropdownRef}>
                              <input
                                type="text"
                                value={isOrderDropdownOpen ? orderSearchText : jobId}
                                onChange={(e) => {
                                  setOrderSearchText(e.target.value);
                                  setIsOrderDropdownOpen(true);
                                  if (!e.target.value) setJobId("");
                                }}
                                onFocus={() => {
                                  setIsOrderDropdownOpen(true);
                                  setOrderSearchText("");
                                }}
                                placeholder={jobId || "Enter order or job ID"}
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-orange-100"
                                required={!jobId}
                              />
                              {isOrderDropdownOpen && (
                                <div className="absolute z-[110] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                                  {productionOrders
                                    .filter(order => order[1]?.toLowerCase().includes(orderSearchText.toLowerCase()))
                                    .map((order, idx) => (
                                      <div
                                        key={`${order[1]}-${idx}`}
                                        onClick={() => handleOrderSelect(order[1])}
                                        className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-[13px] font-bold text-gray-700 transition-colors"
                                      >
                                        {order[1]}
                                      </div>
                                    ))}
                                  {productionOrders.filter(order => order[1]?.toLowerCase().includes(orderSearchText.toLowerCase())).length === 0 && (
                                    <div className="px-4 py-3 text-[12px] text-gray-500 text-center uppercase tracking-widest font-black opacity-40 italic">No orders found</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Total Weight (G) *</label>
                              <input type="number" value={totalWeight} onChange={e => {
                                setTotalWeight(e.target.value);
                              }} required step="0.001" min="0" placeholder="0.000"
                                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-orange-100 font-mono font-bold" />
                            </div>
                            <div>
                              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Melting Type *</label>
                              {productionOrders.some(o => o[1] === jobId) ? (
                                <div className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 h-[41px] flex items-center">
                                  {getMeltingTypeLabel(meltingType)}
                                </div>
                              ) : (
                                <select value={meltingType} onChange={e => setMeltingType(e.target.value)} required
                                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-orange-100">
                                  <option value="">Select…</option>
                                  <option value="24K_999">24K (99.9%)</option>
                                  <option value="24K_995">24K (99.5%)</option>
                                  <option value="22K">22K</option>
                                  <option value="20K">20K</option>
                                  <option value="18K">18K</option>
                                </select>
                              )}
                            </div>
                          </div>

                          {/* Live stock display when melting type is selected */}
                          {meltingType && (() => {
                            const stockMap: Record<string, { label: string; value: number }[]> = {
                              "24K_999": [
                                { label: "99.9% 24K Stock", value: stockData.stock24K_999 },
                              ],
                              "24K_995": [
                                { label: "99.5% 24K Stock", value: stockData.stock24K_995 },
                              ],
                              "22K": [{ label: "Total 22K Stock", value: alloyStock["22K"] }],
                              "20K": [{ label: "Total 20K Stock", value: alloyStock["20K"] }],
                              "18K": [{ label: "Total 18K Stock", value: alloyStock["18K"] }],
                            };
                            const stocks = stockMap[meltingType] || [];
                            return (
                              <div className="pt-1">
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Available Metal Stock</p>
                                <div className="flex flex-wrap gap-2">
                                  {stocks.map(s => (
                                    <div key={s.label} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-[12px] w-full ${s.value <= 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                                      }`}>
                                      <span className="text-gray-600">{s.label}</span>
                                      <span className={`font-semibold tabular-nums ${s.value <= 0 ? "text-red-600" : "text-amber-700"
                                        }`}>
                                        {s.value.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} g
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Step 2: Assignment */}
                        <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                            <h4 className="text-[12px] text-gray-500 uppercase tracking-widest">2. Assignment Details</h4>
                          </div>
                          <div>
                            <label className="text-[12px] text-gray-400 uppercase tracking-widest mb-1.5 block">Karigar Name *</label>
                            <select value={karigarName} onChange={e => setKarigarName(e.target.value)} required
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-orange-100">
                              <option value="">Select karigar…</option>
                              {karigars.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Expected Delivery *</label>
                              <input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} required
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-orange-100 font-bold" />
                            </div>
                            <div>
                              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Authorized By *</label>
                              <select value={authorizedPerson} onChange={e => setAuthorizedPerson(e.target.value)} required
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-orange-100 font-bold">
                                <option value="">Select authorized person…</option>
                                {authorizers.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-5">
                        {/* Live Department Stock Table - Matching Screenshot */}
                        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 mt-2 mb-4 shadow-sm">
                          <table className="w-full text-[12px] border-collapse">
                            <thead>
                              <tr className="bg-[#D9E9F9] border-b border-gray-300">
                                <th colSpan={5} className="py-2.5 font-black text-gray-800 uppercase tracking-tight text-center">Live Department</th>
                              </tr>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                {["Metaltype", "Die", "Taar", "Chain", "KDM"].map(h => (
                                  <th key={h} className="px-2 py-2 text-center font-black text-gray-900 border-r border-gray-200 last:border-r-0 tracking-widest uppercase">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {["22K", "20K", "18K"].map((type) => {
                                const isMatching = meltingType === type;
                                const stockDataForType = liveDepartmentStock[type as keyof typeof liveDepartmentStock] || { Die: 0, Taar: 0, Chain: 0, KDM: 0 };
                                return (
                                  <tr key={type} className={`transition-colors ${isMatching ? "bg-amber-100 font-bold" : "bg-white hover:bg-gray-50"}`}>
                                    <td className="px-2 py-2 text-center font-black border-r border-gray-200 h-10">{type}</td>
                                    <td className="px-2 py-3 text-center border-r border-gray-200 font-medium">{stockDataForType.Die.toFixed(2)}</td>
                                    <td className="px-2 py-3 text-center border-r border-gray-200 font-medium">{stockDataForType.Taar.toFixed(2)}</td>
                                    <td className="px-2 py-3 text-center border-r border-gray-200 font-medium">{stockDataForType.Chain.toFixed(2)}</td>
                                    <td className="px-2 py-3 text-center last:border-r-0 font-medium">{stockDataForType.KDM.toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Step 3: Weights */}
                        <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                            <h4 className="text-[12px] text-gray-500 uppercase tracking-widest">3. Allocate Weights</h4>
                          </div>

                          <div>
                            <label className="text-[11px] font-black text-orange-600 uppercase tracking-widest mb-1.5 block italic">Direct Metal (G)</label>
                            <div className="relative">
                              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-400" />
                              <input type="number" value={metalWeight} onChange={e => handleMetalWeightChange(e.target.value)}
                                step="0.001" placeholder="0.000"
                                className="w-full pl-9 pr-3 py-2.5 bg-orange-50/40 border border-orange-100 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-orange-100 font-mono font-bold" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            {["Die", "Chain", "Taar", "KDM"].map(dept => {
                              const stockKey = (meltingType || "22K") as keyof typeof liveDepartmentStock;
                              const deptKey = dept as keyof typeof liveDepartmentStock["22K"];
                              const availableStock = liveDepartmentStock[stockKey]?.[deptKey] || 0;
                              const hasStock = availableStock > 0;
                              return (
                                <div key={dept}>
                                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                                    {dept} (G)
                                    {hasStock && (
                                      <span className="text-[10px] text-green-600 font-bold ml-1 italic">
                                        (MAX: {availableStock.toFixed(3)}G)
                                      </span>
                                    )}
                                  </label>
                                  <input type="number" value={departmentWeights[dept as keyof typeof departmentWeights]}
                                    onChange={e => handleDepartmentWeightChange(dept, e.target.value)}
                                    step="0.001" placeholder="0.000"
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-orange-100 font-mono font-bold"
                                  />
                                  {!hasStock && meltingType && (
                                    <p className="text-[10px] text-red-500 font-black mt-1 uppercase tracking-widest animate-pulse">Insufficient Stock</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-end gap-3 bg-white shrink-0">
                    <button type="button" onClick={() => setShowIssueModal(false)}
                      className="px-4 py-2 text-[12px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-700 transition-colors">
                      Discard
                    </button>
                    <button type="submit"
                      disabled={!jobId || totalDepartmentWeight === 0 || isWeightExceeded || isSubmitting}
                      className="px-6 py-2 bg-orange-500 text-white rounded-lg text-[12px] font-bold uppercase shadow-sm hover:bg-orange-600 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50">
                      <Save className="w-3.5 h-3.5" />
                      {isSubmitting ? "Submitting..." : "Confirm Assignment"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default KarigarIssue;
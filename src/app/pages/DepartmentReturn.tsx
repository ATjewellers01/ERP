import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeftRight,
  CheckCircle,
  AlertTriangle,
  Search,
  Scale,
  TrendingDown,
  ChevronRight,
  ClipboardList,
  Briefcase,
  History,
  Filter,
  X,
  User,
  Clock,
  Loader2
} from "lucide-react";
import { useApp, DepartmentReturnEntry, DepartmentIssueEntry } from "../context/AppContext";
import { invalidateCache } from "../services/api";

export const DepartmentReturn = () => {
  const {
    stockData, updateStock, fetchAllData, updateJob, jobs,
    departmentReturns, setDepartmentReturns,
    departmentIssues, setDepartmentIssues
  } = useApp();

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

  const [selectedIssueNumber, setSelectedIssueNumber] = useState("");
  const [formData, setFormData] = useState({
    finishedPartsWeight: "",
    scrapWeight: "",
    dustWeight: "",
    metalLoss: "",
  });
  const [returnCloseStatus, setReturnCloseStatus] = useState<"PartlyReturn" | "CompleteReturn">("PartlyReturn");
  const [recovery, setRecovery] = useState(0);
  const [shortage, setShortage] = useState(0);
  const [showVarianceAlert, setShowVarianceAlert] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<{ recovery: number, issuedWeight: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper functions
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date || "—");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const hasValue = (val: any) => {
    if (val === undefined || val === null) return false;
    const s = String(val).trim();
    return s !== "";
  };

  // Global return statistics
  const returnStats = useMemo(() => {
    let totalPendingWeight = 0;
    let totalCompletedIssueWeight = 0;
    let totalCompletedReturnTotal = 0;
    let openTransCount = 0;

    departmentIssues.forEach((issue) => {
      const isPending = hasValue(issue.planned2) && !hasValue(issue.actual2);
      const isCompleted = hasValue(issue.planned2) && hasValue(issue.actual2);

      if (isPending) {
        totalPendingWeight += parseFloat(issue.issuedWeight as any) || 0;
        openTransCount++;
      } else if (isCompleted) {
        // Sum up all return attempts for this issue to get its actual recovery data
        const matchingReturns = departmentReturns.filter(r => r.isNumber === issue.isNumber);
        const returnTotal = matchingReturns.reduce((sum, r) =>
          sum + (parseFloat(r.finishedNet) || 0) + (parseFloat(r.scrapMetal) || 0) + (parseFloat(r.dustWeight) || 0) + (parseFloat(r.metalLoss) || 0)
          , 0);

        totalCompletedIssueWeight += parseFloat(issue.issuedWeight as any) || 0;
        totalCompletedReturnTotal += returnTotal;
      }
    });

    const avgRecovery = totalCompletedIssueWeight > 0 ? (totalCompletedReturnTotal / totalCompletedIssueWeight) * 100 : 0;

    return {
      pending: totalPendingWeight.toFixed(3),
      completed: totalCompletedReturnTotal.toFixed(3),
      recovery: avgRecovery > 0 ? avgRecovery.toFixed(3) : "0.000",
      jobs: openTransCount,
    };
  }, [departmentIssues, departmentReturns]);

  // Filter for History Ledger (Department Issue Return Sheet)
  const filteredHistory = useMemo(() => {
    if (activeTab !== "history") return [];
    return departmentReturns.filter((issue) => {
      const matchSearch =
        issue.orderNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.serialNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.isNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.returnNo?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [departmentReturns, searchQuery, activeTab]);

  const filteredPendingIssues = useMemo(() => {
    if (activeTab !== "pending") return [];
    return departmentIssues.filter((issue) => {
      // Must not be returned (actual2 must be empty)
      if (hasValue(issue.actual2)) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        issue.isNumber?.toLowerCase().includes(q) ||
        issue.orderNo?.toLowerCase().includes(q) ||
        issue.serialNo?.toLowerCase().includes(q) ||
        issue.karigarName?.toLowerCase().includes(q)
      );
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [departmentIssues, searchQuery, activeTab]);

  const selectedIssue = useMemo(() => {
    return departmentIssues.find(i => i.isNumber === selectedIssueNumber) || null;
  }, [departmentIssues, selectedIssueNumber]);

  const selectedIssueReturnAttempts = useMemo(() => {
    if (!selectedIssueNumber) return [];
    return departmentReturns.filter((ret) => ret.isNumber === selectedIssueNumber).reverse();
  }, [departmentReturns, selectedIssueNumber]);

  // Calculate recovery and shortage — cumulative (all past attempts + current form)
  useEffect(() => {
    if (selectedIssue) {
      const finished = parseFloat(formData.finishedPartsWeight) || 0;
      const scrap = parseFloat(formData.scrapWeight) || 0;
      const dust = parseFloat(formData.dustWeight) || 0;
      const metalLoss = parseFloat(formData.metalLoss) || 0;
      const currentEntryTotal = finished + scrap + dust + metalLoss;

      const pastTotal = selectedIssueReturnAttempts.reduce((sum: number, a: any) => {
        return sum + (parseFloat(a.finishedNet) || 0)
          + (parseFloat(a.scrapMetal) || 0)
          + (parseFloat(a.dustWeight) || 0)
          + (parseFloat(a.metalLoss) || 0);
      }, 0);

      const cumulativeReturned = pastTotal + currentEntryTotal;
      const issuedWeight = parseFloat(selectedIssue.issuedWeight) || 1;
      const shortageAmount = issuedWeight - cumulativeReturned;
      const recoveryPercent = (cumulativeReturned / issuedWeight) * 100;

      setShortage(parseFloat(shortageAmount.toFixed(3)));
      setRecovery(parseFloat(recoveryPercent.toFixed(3)));
      setShowVarianceAlert(currentEntryTotal > 0 && recoveryPercent < 98);
    }
  }, [formData, selectedIssue, selectedIssueReturnAttempts]);

  const handleIssueSelect = (isNumber: string) => {
    setSelectedIssueNumber(isNumber);
    setFormData({
      finishedPartsWeight: "",
      scrapWeight: "",
      dustWeight: "",
      metalLoss: ""
    });
    setReturnCloseStatus("PartlyReturn");
    setRecovery(0);
    setShortage(0);
    setShowVarianceAlert(false);
    setShowReturnModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || isSubmitting) return;

    const isComplete = returnCloseStatus === "CompleteReturn";
    const now = new Date();
    const timestamp = `${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getDate().toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

    setIsSubmitting(true);

    try {
      // 1️⃣ Optimistic Local Update (Instant UI)
      if (isComplete) {
        const scrap = parseFloat(formData.scrapWeight) || 0;
        const metalTypeFromIssue = selectedIssue.meltingType || selectedIssue.metalType;
        const stockUpdates: Partial<typeof stockData> = {};
        if (scrap > 0 && metalTypeFromIssue) {
          switch (metalTypeFromIssue) {
            case "24K_999": stockUpdates.stock24K_999 = stockData.stock24K_999 + scrap; break;
            case "24K_995": stockUpdates.stock24K_995 = stockData.stock24K_995 + scrap; break;
            case "22K": stockUpdates.stock22K = stockData.stock22K + scrap; break;
            case "20K": stockUpdates.stock20K = stockData.stock20K + scrap; break;
            case "18K": stockUpdates.stock18K = stockData.stock18K + scrap; break;
          }
        }
        updateStock(stockUpdates);

        // 1.05 Optimistic Department Issue Status Update
        setDepartmentIssues((prev: DepartmentIssueEntry[]) =>
          prev.map(issue => issue.isNumber === selectedIssue.isNumber ? { ...issue, actual2: timestamp } : issue)
        );
      }

      // 1.1 Status update is now handled by the background fetch (preventing flicker)


      // Calculate next predicted Return Number (RN-XXX)
      const numericParts = departmentReturns
        .map(r => {
          const match = r.returnNo?.match(/RN-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));
      const maxNum = numericParts.length > 0 ? Math.max(...numericParts) : 0;
      const nextRN = `RN-${String(maxNum + 1).padStart(3, '0')}`;

      // 1.2 Add to departmentReturns locally
      const newReturnEntry: DepartmentReturnEntry = {
        timestamp,
        returnNo: nextRN,
        isNumber: selectedIssue.isNumber,
        serialNo: selectedIssue.serialNo,
        orderNo: selectedIssue.orderNo,
        finishedNet: formData.finishedPartsWeight || "0",
        scrapMetal: formData.scrapWeight || "0",
        dustWeight: formData.dustWeight || "0",
        metalLoss: formData.metalLoss || "0",
        returnType: returnCloseStatus
      };
      // 1.3 Update the global job state to show completion instantly
      const job = jobs.find(j => j.jobId === `JOB-${selectedIssue.serialNo}`);
      if (job) {
        const updatedDepts = job.departments.map(d => {
          if (d.dept === selectedIssue.dept && d.status === "Issued") {
            return { ...d, status: (isComplete ? "Completed" : "Issued") as "Completed" | "Issued" };
          }
          return d;
        });
        updateJob(job.jobId, {
          departments: updatedDepts,
          stage: isComplete ? "Completed" : "Issued",
          // Note: We don't need to rebuild the whole department array here 
          // because the Pending/History tabs in this view already refresh 
          // using the departmentIssues state we updated above.
        });
      }

      setDepartmentReturns((prev: DepartmentReturnEntry[]) => [newReturnEntry, ...prev]);

      // 2️⃣ Instant UI Feedback - Close modal & update state immediately
      setShowReturnModal(false);
      setSelectedIssueNumber("");
      setFormData({ finishedPartsWeight: "", scrapWeight: "", dustWeight: "", metalLoss: "" });
      setReturnCloseStatus("PartlyReturn");
      setLastSubmission({ recovery: recovery, issuedWeight: parseFloat(selectedIssue.issuedWeight) || 0 });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // 3️⃣ Background API Submission (Fire and forget)
      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbygSkpwhyYTjKeO5LRz06kTXMaM0mLMDwLNNaUR_rBItSshetknhJHGWuAJ3a2CMrX4/exec";

      const insertRowData = [
        timestamp,
        "", // Backend auto-generates serial number RN-XXX
        selectedIssue.isNumber,
        selectedIssue.serialNo,
        selectedIssue.orderNo,
        formData.finishedPartsWeight || "",
        formData.scrapWeight || "",
        formData.dustWeight || "",
        formData.metalLoss || "",
        returnCloseStatus
      ];

      const insertForm = new FormData();
      insertForm.append("action", "insert");
      insertForm.append("sheetName", "Department Issue Return");
      insertForm.append("rowData", JSON.stringify(insertRowData));

      // Promises for parallel background execution
      const backgroundTasks: Promise<any>[] = [
        fetch(SCRIPT_URL, { method: "POST", body: insertForm })
      ];

      if (isComplete) {
        // Need to find the exact rowIndex to update the master issue record
        const updateTask = async () => {
          const sheetRes = await fetch(`${SCRIPT_URL}?sheet=Department%20Issue`);
          const sheetResult = await sheetRes.json();
          if (!sheetResult.success) throw new Error("Sheet fetch failed");

          const rows = sheetResult.data as any[][];
          let rowIndex = -1;
          for (let i = 0; i < rows.length; i++) {
            if (String(rows[i][1]) === String(selectedIssue.isNumber)) {
              rowIndex = i + 1;
              break;
            }
          }

          if (rowIndex !== -1) {
            const updates = { 8: timestamp }; // Column I
            const updateIssueForm = new FormData();
            updateIssueForm.append("action", "batchUpdate");
            updateIssueForm.append("sheetName", "Department Issue");
            updateIssueForm.append("rowIndex", rowIndex.toString());
            updateIssueForm.append("updates", JSON.stringify(updates));
            await fetch(SCRIPT_URL, { method: "POST", body: updateIssueForm });
          }
        };
        backgroundTasks.push(updateTask());
      }

      Promise.all(backgroundTasks)
        .then(() => {
          invalidateCache("Department Issue");
          invalidateCache("Department Issue Return");
          setTimeout(() => fetchAllData(true), 1200);
        })
        .catch(console.error);

    } catch (error) {
      console.error("Failed to submit return optimistically.", error);
    } finally {
      setIsSubmitting(false);
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
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -z-10 opacity-60" />

          {showSuccess && (() => {
            const isLowRecovery = (lastSubmission?.recovery ?? 100) < 100;
            return (
              <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-white animate-in zoom-in-95 duration-300">
                  <div className="text-center space-y-4">
                    <div className={`mx-auto flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br shadow-xl ${isLowRecovery ? "from-red-500 to-red-700 shadow-red-200" : "from-green-500 to-emerald-700 shadow-green-200"}`}>
                      {isLowRecovery ? <AlertTriangle className="h-10 w-10 text-white" /> : <CheckCircle className="h-10 w-10 text-white" />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Receipt Recorded</h3>
                      <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mt-1">Digital Ledger Updated Successfully</p>
                    </div>
                    <div className={`rounded-2xl p-4 border ${isLowRecovery ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                      <p className="text-[12px] font-black text-gray-500 uppercase tracking-widest mb-1">Final Recovery</p>
                      <span className={`text-4xl font-black tracking-tighter ${isLowRecovery ? "text-red-600" : "text-green-600"}`}>{lastSubmission?.recovery.toFixed(3)}%</span>
                      <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-wider">vs {(lastSubmission?.issuedWeight || 0).toFixed(3)}g issued</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}



          {showVarianceAlert && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 mx-1">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="text-base font-black text-red-900 uppercase tracking-tight">Critical Variance Detected</p>
                <p className="text-[12px] font-bold text-red-600/70 uppercase tracking-widest leading-relaxed">Recovery is {recovery}% (Threshold: 98%). flagged for audit.</p>
              </div>
            </div>
          )}

          {showReturnModal && selectedIssue && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowReturnModal(false)} />
              <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center"><ArrowLeftRight className="w-3.5 h-3.5 text-white" /></div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">New Receipt Entry</h3>
                      <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{selectedIssue.orderNo} · {selectedIssue.isNumber}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowReturnModal(false)} className="p-1 hover:bg-gray-100 rounded-md transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                  <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-[12px]">
                      <div>
                        <p className="font-bold text-gray-400 uppercase tracking-widest">Order / IS-NO</p>
                        <p className="font-black text-gray-900">{selectedIssue.orderNo} ({selectedIssue.isNumber})</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-400 uppercase tracking-widest">Karigar / Wt</p>
                        <p className="font-black text-gray-900 uppercase">{selectedIssue.karigarName} · {selectedIssue.issuedWeight}g</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className={`px-3 py-2 rounded-lg border flex flex-col ${shortage > 0 ? 'bg-red-50/50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                        <span className="text-[11px] font-bold text-gray-400 uppercase">Shortage</span>
                        <span className={`text-base font-black ${shortage > 0 ? 'text-red-600' : 'text-gray-900'}`}>{shortage.toFixed(3)}g</span>
                      </div>
                      <div className={`px-3 py-2 rounded-lg border flex flex-col ${recovery > 100 || showVarianceAlert ? 'bg-red-50/50 border-red-100' : 'bg-green-50/50 border-green-100'}`}>
                        <span className="text-[11px] font-bold text-gray-400 uppercase">Recovery</span>
                        <span className={`text-base font-black ${recovery > 100 || showVarianceAlert ? 'text-red-600' : 'text-green-700'}`}>{recovery}%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Finished Net *", name: "finishedPartsWeight" },
                        { label: "Scrap Metal", name: "scrapWeight" },
                        { label: "Dust Weight", name: "dustWeight" },
                        { label: "Metal Loss", name: "metalLoss" },
                      ].map((field) => (
                        <div key={field.name} className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-0.5">{field.label}</label>
                          <input
                            type="number"
                            name={field.name}
                            value={(formData as any)[field.name]}
                            onChange={handleChange}
                            required={field.name === "finishedPartsWeight" && selectedIssueReturnAttempts.length === 0}
                            step="0.001"
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-orange-500 bg-gray-50"
                            placeholder="0.000"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Return Type</label>
                      <select
                        value={returnCloseStatus}
                        onChange={e => setReturnCloseStatus(e.target.value as any)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-semibold"
                      >
                        <option value="PartlyReturn">Partly Return (Partial)</option>
                        <option value="CompleteReturn">Complete Return (Close Transaction)</option>
                      </select>
                    </div>

                    {selectedIssueReturnAttempts.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Past Submissions</p>
                        {selectedIssueReturnAttempts.map((attempt: any, idx) => (
                          <div key={idx} className="bg-gray-50 p-2 rounded-lg text-[11px] border border-gray-100 flex justify-between">
                            <span className="text-gray-500">{formatDate(attempt.timestamp)}</span>
                            <span className="font-bold text-gray-900">{attempt.finishedNet}g Result · {attempt.returnType}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-3 border-t flex flex-col items-end gap-2">
                      <div className="flex justify-end gap-2 w-full">
                        <button type="button" onClick={() => setShowReturnModal(false)} className="px-4 py-1.5 text-gray-400 font-bold text-[13px] uppercase transition-colors hover:text-gray-600">Cancel</button>
                        <button
                          type="submit"
                          disabled={(!formData.finishedPartsWeight && selectedIssueReturnAttempts.length === 0) || isSubmitting}
                          className="px-6 py-1.5 bg-orange-500 text-white rounded-lg font-bold text-[13px] uppercase shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-orange-600"
                        >
                          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          {isSubmitting ? "Saving..." : "Record Entry"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 transition-all">
            <div className="px-4 py-2 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-100">
                  <ClipboardList className="w-3.5 h-3.5 text-orange-600" />
                  <span className="text-[12px] font-black text-orange-700 uppercase">Records: {activeTab === 'pending' ? filteredPendingIssues.length : filteredHistory.length}</span>
                </div>
                <div className="relative group w-full max-w-[240px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders, karigar, is-no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-bold outline-none focus:ring-2 focus:ring-orange-50 focus:border-orange-400 transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                  <button onClick={() => setActiveTab("pending")} className={`px-4 py-1.5 rounded-md text-[12px] font-black uppercase tracking-wider transition-all ${activeTab === "pending" ? "bg-white text-orange-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>Pending</button>
                  <button onClick={() => setActiveTab("history")} className={`px-4 py-1.5 rounded-md text-[12px] font-black uppercase tracking-wider transition-all ${activeTab === "history" ? "bg-white text-orange-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>History</button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {/* Desktop Table */}
              <table className="hidden md:table w-full text-left border-collapse">
                <thead className="bg-[#fcfcfc] border-b border-gray-100 sticky top-0 z-10">
                  {activeTab === "pending" ? (
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">IS-Number</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">Order / Serial</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">Karigar</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Issued Wt</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Timestamp</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  ) : (
                    <tr className="bg-blue-50/30 text-blue-900 border-b border-blue-100">
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest">Return #</th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest">IS-Number</th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest">Order / Serial</th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-center">Finished Net</th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-center">Scrap</th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-center">Dust Wt</th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-center">Metal Loss</th>
                      <th className="px-4 py-3 text-[11px) font-black uppercase tracking-widest text-center">Status</th>
                      <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-right">Date</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {activeTab === "pending" ? (
                    filteredPendingIssues.map((issue) => (
                      <tr key={issue.isNumber} className="hover:bg-orange-50/20 transition-colors group">
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[11px] font-black rounded border border-orange-100 uppercase">{issue.isNumber}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-black text-gray-900 uppercase">{issue.orderNo}</span>
                            <span className="text-[11px] font-mono text-gray-400 truncate w-32 tracking-tighter">{issue.serialNo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-black text-gray-700 uppercase text-[12px]">{issue.karigarName}</td>
                        <td className="px-4 py-3 text-center font-mono text-[13px] font-black text-orange-600">{issue.issuedWeight}g</td>
                        <td className="px-4 py-3 text-center text-[12px] text-gray-500">{formatDate(issue.timestamp)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleIssueSelect(issue.isNumber)} className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-orange-600 active:scale-95 transition-all">Receipt</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredHistory.map((ret, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/10 transition-colors group">
                        <td className="px-4 py-3"><span className="text-[12px] font-black text-blue-600 uppercase tracking-tighter">{ret.returnNo}</span></td>
                        <td className="px-4 py-3 text-[12px] font-bold text-gray-500">{ret.isNumber}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-black text-gray-900 font-mono tracking-tighter uppercase">{ret.orderNo}</span>
                            <span className="text-[11px] font-mono text-gray-400 truncate w-24 tracking-tighter">{ret.serialNo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-[13px] font-black text-gray-900">{ret.finishedNet}g</td>
                        <td className="px-4 py-3 text-center font-mono text-[13px] font-black text-orange-600">{ret.scrapMetal || '0.000'}g</td>
                        <td className="px-4 py-3 text-center font-mono text-[13px] font-black text-gray-500">{ret.dustWeight || '0.000'}g</td>
                        <td className="px-4 py-3 text-center font-mono text-[13px] font-black text-red-600">{ret.metalLoss || '0.000'}g</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase border ${String(ret.returnType).toUpperCase().includes('COMPLETE') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                            {ret.returnType || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] text-gray-500">{formatDate(ret.timestamp)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Mobile View */}
              <div className="md:hidden space-y-3 p-4 bg-white">
                {activeTab === "pending" ? (
                  filteredPendingIssues.map((issue) => (
                    <div key={issue.isNumber} className="bg-white rounded-xl p-4 border-2 border-gray-200 active:border-orange-300 active:bg-orange-50/30 transition-all" onClick={() => handleIssueSelect(issue.isNumber)}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="inline-block px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-black rounded uppercase border border-orange-100 mb-1">{issue.isNumber}</span>
                          <h4 className="text-[14px] font-black text-gray-900 uppercase tracking-tight">{issue.orderNo}</h4>
                          <p className="text-[11px] font-mono text-gray-400 uppercase tracking-tighter truncate w-40">{issue.serialNo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[14px] font-black text-orange-600">{issue.issuedWeight}g</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(issue.timestamp)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[12px] font-black uppercase text-gray-700 bg-gray-50 p-2 rounded-lg">
                        <span>{issue.karigarName}</span>
                        <ChevronRight className="w-4 h-4 text-orange-400" />
                      </div>
                    </div>
                  ))
                ) : (
                  filteredHistory.map((ret, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 border-2 border-gray-200 active:border-blue-300 active:bg-blue-50/30 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase border border-blue-100 mb-1">{ret.returnNo}</span>
                          <h4 className="text-[14px] font-black text-gray-900 uppercase tracking-tight">{ret.orderNo}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-[14px] font-black text-gray-900">F.Net: {ret.finishedNet}g</p>
                          <p className="text-[11px] font-bold text-orange-600">Scrap: {ret.scrapMetal || '0.000'}g</p>
                          <div className="flex gap-2 justify-end text-[10px] font-bold mt-0.5">
                            <span className="text-gray-500">Dust: {ret.dustWeight || '0.000'}g</span>
                            <span className="text-red-600">Loss: {ret.metalLoss || '0.000'}g</span>
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{formatDate(ret.timestamp)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-black">
                        <span className="text-gray-400 uppercase tracking-tighter">{ret.isNumber}</span>
                        <span className={`px-2 py-0.5 rounded border ${String(ret.returnType).toUpperCase().includes('COMPLETE') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                          {ret.returnType}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DepartmentReturn;
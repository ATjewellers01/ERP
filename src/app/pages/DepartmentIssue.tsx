import { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowRightLeft,
  CheckCircle,
  TrendingUp,
  Package,
  Clock,
  CheckSquare,
  AlertCircle,
  Plus,
  Search,
  X,
  User,
  Layers,
  Briefcase,
  Activity,
  History,
  ChevronRight,
  Eye,
  Printer,
  Download,
  Layout,
  FileText,
  Loader2
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { fetchSheet, invalidateCache } from "../services/api";

export const DepartmentIssue = () => {
  const {
    stockData,
    updateStock,
    jobs,
    updateJob,
    fetchAllData,
    conversionEntries,
    departmentIssues,
    setDepartmentIssues,
    departmentReturns,
    alloyStock,
    masterKarigars,
    masterAuthorizers,
    mainBreakdown
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

  const [showModal, setShowModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [
    selectedJobDeptId,
    setSelectedJobDeptId,
  ] = useState("");

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [activeTab, setActiveTab] = useState<"Pending" | "History">("Pending");
 const [formData, setFormData] = useState({
    goldIssued: "",
    karigarAssigned: "",
    meltingType: "22K",
    authorizedBy: "",
    remainingWeightOverride: "",
    displayRemaining: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [showBreakdownView, setShowBreakdownView] = useState(false);
  const [selectedJobIdForBreakdown, setSelectedJobIdForBreakdown] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Always derive the latest live version of the breakdown job from context
  const liveJobForBreakdown = useMemo(() => {
    if (!selectedJobIdForBreakdown) return null;
    return jobs.find(j => j.jobId === selectedJobIdForBreakdown) ?? null;
  }, [jobs, selectedJobIdForBreakdown]);

  // Derive history for the history table
  const allJobDepts = useMemo(() => {
    return jobs.flatMap(job =>
      job.departments.map(dept => ({
        ...dept,
        jobId: job.jobId,
        orderNo: job.orderNo,
        jobMetalType: job.metalType,
        customer: job.customer,
        jobCreatedAt: job.createdAt
      }))
    ).sort((a, b) => new Date(b.jobCreatedAt).getTime() - new Date(a.jobCreatedAt).getTime());
  }, [jobs]);

  const filteredHistory = useMemo(() => {
    return departmentIssues.filter(issue => {
      const q = search.toLowerCase();
      return !q ||
        issue.orderNo.toLowerCase().includes(q) ||
        issue.serialNo.toLowerCase().includes(q) ||
        issue.karigarName.toLowerCase().includes(q) ||
        issue.isNumber.toLowerCase().includes(q);
    });
  }, [departmentIssues, search]);

  const filteredGroupedJobs = useMemo(() => {
    return jobs.filter(job => {
      const q = search.toLowerCase();
      const matchSearch = !q || job.orderNo.toLowerCase().includes(q) || job.jobId.toLowerCase().includes(q) || (job.customer && job.customer.toLowerCase().includes(q));
      const matchDept = !filterDept || job.departments.some(d => d.dept === filterDept);

      const matchStatusFilter = filterStatus
        ? (filterStatus === "Pending" ? job.departments.some(d => d.status === "Pending")
          : filterStatus === "Issued" ? job.departments.some(d => d.status === "Issued")
            : filterStatus === "Returned" ? job.departments.some(d => d.status === "Returned")
              : true)
        : true;

      // Pending tab: Show jobs that have departments with Col M but NOT Col N
      const hasPending = job.departments.some(d => parseFloat(d.remainingWeight || "0") > 0);
      const hasHistory = job.departments.some(d => parseFloat(d.remainingWeight || "0") <= 0 && hasValue(d.masterColN));
      const matchTab = activeTab === "Pending" ? hasPending : hasHistory;

      return matchSearch && matchDept && matchStatusFilter && matchTab;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs, search, filterDept, filterStatus, activeTab]);

  // Helper to check if a value is not null/empty
  function hasValue(val: any) {
    if (val === undefined || val === null) return false;
    const s = String(val).trim();
    return s !== "" && s !== "null" && s !== "undefined";
  }

const availableJobs = useMemo(() => {
  return jobs.filter((job) =>
    job.departments.some((dept) => 
      hasValue(dept.masterColM) && parseFloat(dept.remainingWeight || "0") > 0
    ),
  );
}, [jobs]);

  const filteredJobsForSelection = useMemo(() => {
    if (!selectedDept) return availableJobs;
  return availableJobs.filter((job) =>
  job.departments.some(
    (dept) =>
      dept.dept === selectedDept &&
      hasValue(dept.masterColM) && 
      parseFloat(dept.remainingWeight || "0") > 0,
  ),
);
  }, [availableJobs, selectedDept]);

  const selectedJob = jobs.find(
    (job) => job.jobId === selectedJobId,
  );

  const selectedDeptData = useMemo(() => {
    if (!selectedJob || !selectedJobDeptId) return null;
    return selectedJob.departments.find((d) => d.id === selectedJobDeptId);
  }, [selectedJob, selectedJobDeptId]);

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const completeJobs = jobs.filter(
      (job) =>
        job.departments.length > 0 &&
        job.departments.every(
          (dept) =>
            dept.status === "Returned" ||
            dept.status === "Completed",
        ),
    ).length;

    const pendingJobs = jobs.filter((job) =>
      job.departments.some((dept) => hasValue(dept.masterColM) && !hasValue(dept.masterColN)),
    ).length;

    const dynamicDeptNames = Array.from(new Set(jobs.flatMap(j => j.departments.map(d => d.dept)).filter(d => d && String(d).trim() !== "")));
    const deptNames = dynamicDeptNames.length > 0 ? dynamicDeptNames : ["Die", "Taar", "Chain", "KDM", "Direct Karigar"];

    const deptStats = deptNames.map(
      (deptName) => {
        // Include ALL departments for historical summary, but we'll flag active ones
        const allDepts = jobs.flatMap((job) =>
          job.departments
            .filter((d) => d.dept === deptName)
            .map((d) => ({
              ...d,
              jobMetalType: job.metalType,
            }))
        );

        const totalCount = allDepts.length;
        // Issue Pending: Assigned (Col M) but not yet Issued (Col N)
       const issuePending = allDepts.filter((d) => 
  hasValue(d.masterColM) && parseFloat(d.remainingWeight || "0") > 0
).length;
        // Return Pending: Is currently 'Issued'
        const returnPending = allDepts.filter((d) => d.status === "Issued").length;

        // Weight Issued (Blue) = Total historical issued weight from Department Issue sheet
        const totalIssuePendingWeight = departmentIssues
          .filter(issue => allDepts.some(d => d.id === issue.serialNo))
          .reduce((sum, issue) => sum + (parseFloat(issue.issuedWeight) || 0), 0);

        // Planned (Gray) = Total planned weight across ALL jobs (historical volume)
        const totalPlannedWeight = allDepts.reduce(
          (sum, d) => sum + (parseFloat(d.plannedWeight) || 0), 0);

        // Weight Returned (Orange) = Total finishedWeight ever returned to this department
        const totalReturnPendingWeight = allDepts
          .reduce((sum, d) => sum + (d.finishedWeight || 0), 0);

        const meltingTypes = ["24K", "22K", "20K", "18K"];
        const meltingTypeBreakdown = meltingTypes
          .map((metalType) => {
            const depts = allDepts.filter((d) => d.jobMetalType === metalType);
            return {
              type: metalType,
              count: depts.length,
              totalWeight: depts.reduce((sum, d) => sum + (parseFloat(d.plannedWeight) || 0), 0),
              issuePendingCount: depts.filter((d) => hasValue(d.masterColM) && !hasValue(d.masterColN)).length,
              issuePendingWeight: depts.filter((d) => hasValue(d.masterColM) && !hasValue(d.masterColN)).reduce((sum, d) => sum + (parseFloat(d.plannedWeight) || 0), 0),
              returnPendingCount: depts.filter((d) => d.status === "Issued").length,
              returnPendingWeight: depts.filter((d) => d.status === "Issued").reduce((sum, d) => sum + (d.issuedWeight || 0), 0),
            };
          })
          .filter((m) => m.count > 0);

        return {
          name: deptName,
          totalCount,
          issuePending,
          returnPending,
          totalIssuePendingWeight,
          totalPlannedWeight,
          totalReturnPendingWeight,
          meltingTypeBreakdown,
        };
      },
    );

    return {
      totalJobs,
      completeJobs,
      pendingJobs,
      deptStats,
    };
  }, [jobs]);

  const handleDeptChange = (dept: string) => {
    setSelectedDept(dept);
    setSelectedJobId("");
    setSelectedJobDeptId("");
  };

  const overrideDeptSelection = (dept: string) => {
    setSelectedDept(dept);
  };

  const handleJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
    setSelectedJobDeptId("");
    const job = jobs.find((j) => j.jobId === jobId);
    setFormData({
      goldIssued: "",
      karigarAssigned: "",
      meltingType: job?.metalType || "22K",
      authorizedBy: "",
      remainingWeightOverride: "",
      displayRemaining: "",
    });
  };

  const handleJobDeptChange = (deptId: string) => {
    setSelectedJobDeptId(deptId);
    const job = jobs.find((j) => j.jobId === selectedJobId);
    if (job) {
      const dept = job.departments.find((d) => d.id === deptId);
      if (dept) {
        const remaining = parseFloat(dept.remainingWeight || "0");
     setFormData({
  ...formData,
  goldIssued: "",
  remainingWeightOverride: remaining > 0 ? remaining.toFixed(3) : "0.000",
  displayRemaining: remaining > 0 ? remaining.toFixed(3) : "0.000",
  meltingType: job.metalType || "22K"
});
      }
    }
  };

 const handleIssueGoldDirectly = (item: any) => {
    setSelectedJobId(item.jobId);
    setSelectedDept(item.dept);
    setSelectedJobDeptId(item.id);

    const remaining = parseFloat(item.remainingWeight || "0");
    setFormData({
      goldIssued: "",
      remainingWeightOverride: remaining > 0 ? remaining.toFixed(3) : "0.000",
      displayRemaining: remaining > 0 ? remaining.toFixed(3) : "0.000", // 👈 ADD
      karigarAssigned: "",
      meltingType: item.jobMetalType || "22K",
      authorizedBy: "",
    });

    setShowModal(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "goldIssued") {
      const enteredWeight = parseFloat(value) || 0;

      let availableStock = 0;
      if (formData.meltingType === "24K") availableStock = stockData.stock24K;
      else if (formData.meltingType === "22K") availableStock = alloyStock["22K"];
      else if (formData.meltingType === "20K") availableStock = alloyStock["20K"];
      else if (formData.meltingType === "18K") availableStock = alloyStock["18K"];

      if (enteredWeight > availableStock) {
        alert(`Insufficient ${formData.meltingType} stock! Available: ${availableStock}g`);
        return;
      }

      // Use the visible Remaining Weight field for validation
      const visibleRemaining = parseFloat(formData.remainingWeightOverride) || 0;
      if (enteredWeight > visibleRemaining + 0.001) {
        alert(`Issue weight (${enteredWeight}g) exceeds the visible remaining weight (${visibleRemaining.toFixed(3)}g)!`);
        return;
      }
    }
    if (name === "goldIssued") {
  const originalRemaining = parseFloat(formData.remainingWeightOverride) || 0;
  const newDisplay = Math.max(0, originalRemaining - (parseFloat(value) || 0));
  setFormData({
    ...formData,
    goldIssued: value,
    displayRemaining: newDisplay.toFixed(3),
  });
} else {
  setFormData({ ...formData, [name]: value });
}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.authorizedBy) { alert("Please select an authorizer"); return; }
    if (!selectedJobDeptId) { alert("Please select a department"); return; }

    const issuedWeight = parseFloat(formData.goldIssued) || 0;
    const remainingWeight = parseFloat(formData.remainingWeightOverride || "0");

    if (issuedWeight <= 0) {
      alert("Please enter a valid weight to issue.");
      return;
    }

    if (issuedWeight > remainingWeight + 0.001) {
      alert(`Cannot issue ${issuedWeight}g. The current remaining weight is ${remainingWeight.toFixed(3)}g.`);
      return;
    }

    setIsSubmitting(true);
    setIsLoading(true);

    try {
      const updates: any = {};

      if (formData.meltingType === "24K") updates.stock24K = stockData.stock24K - issuedWeight;
      else if (formData.meltingType === "22K") updates.stock22K = stockData.stock22K - issuedWeight;
      else if (formData.meltingType === "20K") updates.stock20K = stockData.stock20K - issuedWeight;
      else if (formData.meltingType === "18K") updates.stock18K = stockData.stock18K - issuedWeight;

      updateStock(updates);

      const job = jobs.find((j) => j.jobId === selectedJobId);

      if (job) {
        const dept = job.departments.find(d => d.id === selectedJobDeptId);

        const now = new Date();
        const timestamp =
          (now.getMonth() + 1).toString().padStart(2, "0") + "/" +
          now.getDate().toString().padStart(2, "0") + "/" +
          now.getFullYear() + " " +
          now.getHours().toString().padStart(2, "0") + ":" +
          now.getMinutes().toString().padStart(2, "0") + ":" +
          now.getSeconds().toString().padStart(2, "0");

        const sheetSerial = job.jobId.replace("JOB-", "");

        // Calculate next predicted Issue Number (IS-XXX)
        const numericParts = departmentIssues
          .map(i => {
            const match = i.isNumber?.match(/IS-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(n => !isNaN(n));
        const maxNum = numericParts.length > 0 ? Math.max(...numericParts) : 0;
        const nextIS = `IS-${String(maxNum + 1).padStart(3, '0')}`;

        // 1️⃣ Optimistic Local Update
        const updatedDepartments = job.departments.map((d) => {
          if (d.id === selectedJobDeptId) {
            const currentRemaining = parseFloat(formData.remainingWeightOverride || "0");
            const currentIssued = d.issuedWeight || 0;
            const newRemaining = Math.max(0, currentRemaining - issuedWeight);
            const isFullyIssued = newRemaining <= 0.001;

            return {
              ...d,
              status: "Issued" as const,
              issuedWeight: currentIssued + issuedWeight,
              remainingWeight: newRemaining.toFixed(3),
              karigarAssigned: formData.karigarAssigned,
              meltingType: formData.meltingType,
              authorizedBy: formData.authorizedBy,
              colM: timestamp,
              masterColN: isFullyIssued ? timestamp : d.masterColN,
            };
          }
          return d;
        });

        updateJob(job.jobId, {
          departments: updatedDepartments,
          stage: "Issued",
          issuedVia: "department"
        });

        const newIssueEntry = {
          timestamp,
          isNumber: nextIS,
          serialNo: sheetSerial,
          orderNo: job.orderNo,
          issuedWeight: parseFloat(formData.goldIssued).toFixed(3),
          karigarName: formData.karigarAssigned,
          authorizedBy: formData.authorizedBy,
          dept: selectedDept,
          meltingType: formData.meltingType
        };
        setDepartmentIssues((prev: any) => [newIssueEntry, ...prev]);

        // 2️⃣ Sync with Server (Critical)
        try {
          const rowData = [
            timestamp,
            "",
            sheetSerial,
            job.orderNo,
            parseFloat(issuedWeight.toString()).toFixed(3),
            formData.karigarAssigned,
            formData.authorizedBy,
            "", "", "", "", "", "", "", "",
            selectedDept,
          ];

          const form = new FormData();
          form.append("action", "insert");
          form.append("sheetName", "Department Issue");
          form.append("rowData", JSON.stringify(rowData));

          await fetch("https://script.google.com/macros/s/AKfycbygSkpwhyYTjKeO5LRz06kTXMaM0mLMDwLNNaUR_rBItSshetknhJHGWuAJ3a2CMrX4/exec", {
            method: "POST",
            body: form
          });

          invalidateCache("Department Issue");
          invalidateCache("Production Planning");

          // Update Planning Row
          const res = await fetch(`https://script.google.com/macros/s/AKfycbygSkpwhyYTjKeO5LRz06kTXMaM0mLMDwLNNaUR_rBItSshetknhJHGWuAJ3a2CMrX4/exec?sheet=Production%20Planning`);
          const result = await res.json();
          
          if (result.success) {
            const rows = result.data as any[][];
            let rowIndex = -1;
            for (let i = 6; i < rows.length; i++) {
              if (String(rows[i][1]) === String(sheetSerial) && String(rows[i][9]) === String(selectedDept)) {
                rowIndex = i + 1; break;
              }
            }

            if (rowIndex !== -1) {
              const currentIssued = parseFloat(rows[rowIndex-1][15]) || 0;
              const totalIssued = (currentIssued + issuedWeight).toFixed(3);
              const newRemainingWeight = Math.max(0, (parseFloat(formData.remainingWeightOverride) || 0) - issuedWeight).toFixed(3);

              const updateCell = async (columnIndex: string, value: string) => {
                const updateForm = new FormData();
                updateForm.append("action", "updateCell");
                updateForm.append("sheetName", "Production Planning");
                updateForm.append("rowIndex", rowIndex.toString());
                updateForm.append("columnIndex", columnIndex);
                updateForm.append("value", value);
                await fetch("https://script.google.com/macros/s/AKfycbygSkpwhyYTjKeO5LRz06kTXMaM0mLMDwLNNaUR_rBItSshetknhJHGWuAJ3a2CMrX4/exec", { method: "POST", body: updateForm });
              };

              await Promise.all([
                updateCell("14", timestamp),
                updateCell("16", totalIssued),
                updateCell("17", newRemainingWeight)
              ]);
            }
          }

          // 3️⃣ Instant Feedback (Turn off loader here)
          setIsLoading(false);
          setShowModal(false);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);

          // 4️⃣ Background Refresh (Ensures consistency)
          fetchAllData(true).catch(e => console.error("BG Refresh failed", e));

        } catch (syncErr) {
          console.error("Sync error:", syncErr);
          setIsLoading(false);
          alert("Data saved locally but server sync delayed. It will update automatically.");
        }
      }
    } catch (error) {
      console.error("Error submitting issue:", error);
      alert("Error submitting issue. Please try again.");
      setIsLoading(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  const formatDate = (date: any) => {
    return new Date(date).toLocaleDateString("en-US", { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const formatTime = (date: any) => {
    return new Date(date).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className={`flex flex-col gap-4 h-[calc(100vh-57px-28px-2rem)] md:h-[calc(100vh-57px-28px-3rem)] relative ${showBreakdownView ? 'overflow-hidden' : ''}`}>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-gray-600">Loading fresh data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Success Modal */}
          {showSuccess && (
            <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-sm text-center animate-in zoom-in duration-300">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Issue Confirmed!</h3>
                <p className="text-base text-gray-500 mb-6">Department ledger and stock have been updated successfully.</p>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 animate-[shrink_4s_linear_forwards]" />
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-12">
            {/* Summary Dashboard: Left Stats + Right Table */}
            <div className="flex flex-col lg:flex-row gap-4 px-1">
              {/* Left Side Boxes */}
              <div className="flex flex-col gap-3 w-full lg:w-52 shrink-0">
                {[
                  { label: "Total Orders", value: stats.totalJobs, unit: "Jobs", icon: Package, color: "orange" },
                  { label: "Pending", value: stats.pendingJobs, unit: "Dept", icon: Clock, color: "amber" },
                  { label: "Complete", value: stats.completeJobs, unit: "Jobs", icon: CheckSquare, color: "orange" },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-[#fffbeb] p-3 rounded-xl border border-orange-100/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-3 -top-3 w-16 h-16 bg-orange-200/10 rounded-full group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-bold text-orange-800/60 uppercase tracking-widest leading-none">{stat.label}</p>
                        <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center shadow-md shadow-orange-100">
                          <stat.icon className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                      <p className="text-xl font-bold text-gray-900 tracking-tight leading-none">
                        {stat.value}
                        <span className="text-[12px] ml-1 text-gray-400 font-bold">{stat.unit}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

             {/* Right Side Table Section */}
<div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
  <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
    <div className="flex items-center gap-2">
      <TrendingUp className="w-4 h-4 text-orange-600" />
      <h3 className="font-bold text-gray-900 text-[13px] uppercase tracking-tight">
        Department Wise Breakdown
      </h3>
    </div>
    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[11px] font-black rounded-lg uppercase tracking-tighter shrink-0">
      Live Summary
    </span>
  </div>

  <div className="overflow-x-auto flex-1 custom-scrollbar">
    {/* Desktop Table */}
    <table className="hidden md:table w-full text-sm table-fixed border-collapse">
      <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="px-4 py-3 text-left font-bold text-gray-500 text-[12px] uppercase tracking-wider">
            Department
          </th>
          <th className="px-4 py-3 text-center font-bold text-gray-500 text-[12px] uppercase tracking-wider">
            Issue Pend.
          </th>
          <th className="px-4 py-3 text-center font-bold text-gray-500 text-[12px] uppercase tracking-wider">
            Ret. Pend.
          </th>
          <th className="px-4 py-3 text-center font-bold text-blue-600/70 text-[12px] uppercase tracking-wider">
            Wght Iss (g)
          </th>
          <th className="px-4 py-3 text-center font-bold text-orange-600/70 text-[12px] uppercase tracking-wider">
            Wght Ret (g)
          </th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-100 bg-white">
        {mainBreakdown.total.map((dept) => [
          <tr
            key={dept.dept}
            onClick={() =>
              setExpandedDept(expandedDept === dept.dept ? null : dept.dept)
            }
            className="hover:bg-amber-50/40 transition-all duration-200 border-b border-gray-50 last:border-0 group cursor-pointer"
          >
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-[13px] tracking-tight group-hover:text-amber-600 transition-colors uppercase">
                  {dept.dept}
                </span>
                <Activity className="w-3 h-3 text-gray-200" />
              </div>
            </td>

            <td className="px-4 py-3.5 text-center">
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-blue-50 text-blue-600 font-bold text-[12px] border border-blue-100 shadow-xs">
                {dept.issuePending}
              </span>
            </td>

            <td className="px-4 py-3.5 text-center">
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-orange-50 text-orange-600 font-bold text-[12px] border border-orange-100 shadow-xs">
                {dept.returnPending}
              </span>
            </td>

            <td className="px-4 py-3.5 text-center font-bold text-blue-600 text-[13px]">
              {dept.issuePendingWeight.toFixed(3)}
            </td>

            <td className="px-4 py-3.5 text-center font-bold text-orange-600 text-[13px]">
              {dept.returnPendingWeight.toFixed(3)}
            </td>
          </tr>,

          expandedDept === dept.dept && (
            <tr key={`${dept.dept}-details`} className="bg-gray-50/50">
              <td colSpan={5} className="px-6 py-4">
                <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
                  <div className="px-4 py-2 border-b border-orange-50 bg-orange-50/20 flex justify-between items-center">
                    <span className="text-[11px] font-black text-orange-700 uppercase tracking-widest">
                      Melting Type Breakdown for {dept.dept}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      Sheet Data Verified
                    </span>
                  </div>

                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-2 text-center text-[10px] font-black text-gray-500 uppercase">
                          Issue Pend.
                        </th>
                        <th className="px-4 py-2 text-center text-[10px] font-black text-gray-500 uppercase">
                          Ret. Pend.
                        </th>
                        <th className="px-4 py-2 text-center text-[10px] font-black text-blue-600 uppercase">
                          Wght Iss (g)
                        </th>
                        <th className="px-4 py-2 text-center text-[10px] font-black text-orange-600 uppercase">
                          Wght Ret (g)
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-50">
                      {(["22K", "20K", "18K"] as const).map((type) => {
                        const typeData = mainBreakdown[type].find(
                          (d) => d.dept === dept.dept
                        );
                        if (!typeData) return null;

                        return (
                          <tr key={type}>
                            <td className="px-4 py-2 text-[12px] font-black text-gray-900">
                              {type}
                            </td>
                            <td className="px-4 py-2 text-center text-[12px] font-bold text-blue-600">
                              {typeData.issuePending}
                            </td>
                            <td className="px-4 py-2 text-center text-[12px] font-bold text-orange-600">
                              {typeData.returnPending}
                            </td>
                            <td className="px-4 py-2 text-center text-[12px] font-bold text-blue-700">
                              {typeData.issuePendingWeight.toFixed(3)}
                            </td>
                            <td className="px-4 py-2 text-center text-[12px] font-bold text-orange-700">
                              {typeData.returnPendingWeight.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          ),
        ])}
      </tbody>
    </table>
  </div>
</div>
            </div>

            {/* 2. History Section - Mobile Friendly */}
            <div className="space-y-3 px-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-orange-600" />
                    <h3 className="font-bold text-gray-900 text-[13px] uppercase tracking-tight">Issuance Record Ledger</h3>
                  </div>
                  <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveTab("Pending")}
                      className={`px-4 py-1 text-[12px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === "Pending" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setActiveTab("History")}
                      className={`px-4 py-1 text-[12px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === "History" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      History
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative group shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Quick search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-bold outline-none focus:ring-2 focus:ring-orange-50 w-40 sm:w-56 transition-all"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-bold uppercase outline-none focus:ring-2 focus:ring-orange-50 shrink-0"
                  >
                    <option value="">Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Issued">Issued</option>
                    <option value="Returned">Returned</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-2">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar min-h-[400px]">
                  <table className="w-full text-left table-auto">
                    <colgroup>
                      {activeTab === "Pending" ? (
                        <>
                          <col className="w-28" /><col className="w-32" /><col className="w-40" /><col className="w-20" /><col className="w-24" /><col className="w-24" /><col className="w-28" /><col className="w-24" />
                        </>
                      ) : (
                        <>
                          <col className="w-28" /><col className="w-24" /><col className="w-32" /><col className="w-24" /><col className="w-32" /><col className="w-24" /><col className="w-32" />
                        </>
                      )}
                    </colgroup>
                    <thead className="sticky top-0 z-20 bg-white shadow-sm border-b border-gray-200">
                      {activeTab === "Pending" ? (
                        <tr>
                          <th className="px-4 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-4 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Order / Job ID</th>
                          <th className="px-4 py-3 text-center text-[12px] font-bold text-gray-500 uppercase tracking-wider">Departments</th>
                          <th className="px-4 py-3 text-center text-[12px] font-bold text-gray-500 uppercase tracking-wider">Metal</th>
                          <th className="px-4 py-3 text-center text-[12px] font-bold text-gray-500 uppercase tracking-wider">Weight</th>
                          <th className="px-4 py-3 text-center text-[12px] font-bold text-amber-600 uppercase tracking-wider">Remaining</th>

                          <th className="px-4 py-3 text-right text-[12px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="px-4 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                          <th className="px-4 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Issue No</th>
                          <th className="px-4 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Order / Serial</th>
                          <th className="px-4 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Department</th>
                          <th className="px-4 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Karigar</th>
                          <th className="px-4 py-3 text-center text-[12px] font-bold text-gray-500 uppercase tracking-wider">Issue Weight</th>
                          <th className="px-4 py-3 text-[12px] font-bold text-gray-500 uppercase tracking-wider">Authorized By</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {activeTab === "Pending" ? (
                        filteredGroupedJobs.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-32 text-center">
                              <div className="flex flex-col items-center gap-2 opacity-40">
                                <History className="w-12 h-12 text-gray-300" />
                                <p className="text-base font-bold text-gray-400">No pending records found</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredGroupedJobs.map((job) => {
                            const issuedCount = job.departments.filter(d => d.status !== 'Pending').length;
                            const totalCount = job.departments.length;
                            const isFullyIssued = issuedCount === totalCount && totalCount > 0;

                            return (
                              <tr key={job.jobId} className="hover:bg-amber-50/40 transition-all duration-200 border-b border-gray-50 last:border-0 group">
                                <td className="px-4 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-[13px] text-gray-900">{formatDate(job.createdAt)}</span>
                                    <span className="text-[12px] text-gray-400 group-hover:text-amber-600 transition-colors uppercase tracking-tight">{formatTime(job.createdAt)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <Briefcase className="w-2.5 h-2.5 text-orange-500" />
                                      <span className="text-[13px] text-gray-900">{job.orderNo}</span>
                                    </div>
                                    <span className="text-[13px] font-mono text-gray-400 uppercase tracking-tighter truncate w-32 ml-4 group-hover:text-gray-600 transition-colors">{job.jobId}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-wrap gap-1 justify-center">
                                    {job.departments.map((d, i) => (
                                      <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${d.status !== 'Pending' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                        {d.dept}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span className="inline-flex items-center px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[12px] rounded-full border border-yellow-100">{job.metalType}</span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-[13px] text-gray-900">{job.totalWeight}</span>
                                    <span className="text-[13px] text-gray-400 uppercase tracking-tighter">g</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[13px] font-bold text-amber-600">
                                      {Math.max(0, job.departments.reduce((sum: number, d: any) => sum + (parseFloat(d.remainingWeight) || 0), 0)).toFixed(3)}
                                    </span>
                                    <span className="text-[10px] text-amber-400 uppercase tracking-tighter font-bold">Total Bal</span>
                                  </div>
                                </td>

                                <td className="px-4 py-4 text-right">
                                  <div className="flex flex-col gap-1.5 items-end">
                                    <div className="flex flex-wrap gap-1 justify-end">
                                    {job.departments.map((dept) => (
                                      <button
                                        key={dept.id}
                                        onClick={() => handleIssueGoldDirectly({ ...dept, jobId: job.jobId, jobMetalType: job.metalType })}
                                        className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-sm transition-colors whitespace-nowrap"
                                      >
                                        Issue {dept.dept}
                                      </button>
                                    ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )
                      ) : (
                        filteredHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-32 text-center">
                              <div className="flex flex-col items-center gap-2 opacity-40">
                                <History className="w-12 h-12 text-gray-300" />
                                <p className="text-base font-bold text-gray-400">No history records found</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredHistory.map((issue, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/40 transition-all duration-200 border-b border-gray-50 last:border-0 group">
                              <td className="px-4 py-4">
                                <div className="flex flex-col">
                                  <span className="text-[13px] text-gray-900">{formatDate(issue.timestamp)}</span>
                                  <span className="text-[12px] text-gray-400 uppercase tracking-tight">{formatTime(issue.timestamp)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-[13px] font-bold text-blue-600 uppercase">{issue.isNumber}</span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col">
                                  <span className="text-[13px] text-gray-900 font-bold">{issue.orderNo}</span>
                                  <span className="text-[12px] font-mono text-gray-400 uppercase tracking-tighter truncate w-32 ml-4">{issue.serialNo}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-700 text-[11px] font-bold rounded border border-gray-100 uppercase tracking-tight">
                                  {issue.dept || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3 text-gray-400" />
                                  <span className="text-[13px] text-gray-900">{issue.karigarName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="text-[13px] font-bold text-gray-900">{issue.issuedWeight}g</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-[13px] text-gray-600">{issue.authorizedBy}</span>
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="md:hidden divide-y divide-gray-100">
                  {activeTab === "Pending" ? (
                    filteredGroupedJobs.length === 0 ? (
                      <div className="px-5 py-12 text-center text-gray-400 italic text-base">No pending records found.</div>
                    ) : (
                      filteredGroupedJobs.map((job) => {
                        const issuedCount = job.departments.filter(d => d.status !== 'Pending').length;
                        const totalCount = job.departments.length;
                        const isFullyIssued = issuedCount === totalCount && totalCount > 0;

                        return (
                          <div key={job.jobId} className="p-5 space-y-5">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-lg border border-blue-100 shadow-inner">
                                  {String(job.orderNo ?? "").slice(-1)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-base font-black text-gray-900 uppercase tracking-tight">{job.orderNo}</h4>
                                  </div>
                                  <p className="text-[12px] font-mono text-gray-400 uppercase tracking-tighter">{job.jobId}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[12px] font-black text-gray-900 tracking-tight">{formatDate(job.createdAt)}</p>
                                <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">{formatTime(job.createdAt)}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-gray-50/50 p-3 rounded-xl text-center border border-gray-100 shadow-sm">
                                <p className="text-[12px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Metal</p>
                                <span className="text-[12px] font-black text-amber-700 uppercase tracking-tighter">{job.metalType}</span>
                              </div>
                              <div className="bg-gray-50/50 p-3 rounded-xl text-center border border-gray-100 shadow-sm">
                                <p className="text-[12px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Weight</p>
                                <span className="text-[12px] font-black text-gray-900 uppercase tracking-tighter">{job.totalWeight}g</span>
                              </div>
                              <div className="bg-gray-50/50 p-3 rounded-xl text-center border border-gray-100 shadow-sm">
                                <p className="text-[12px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Stock</p>
                                <span className="text-[12px] font-black text-blue-600 uppercase tracking-tighter">Issued</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-6 pt-2">
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[13px] font-black text-gray-400 uppercase tracking-widest">Issuance</span>
                                  <span className="text-[13px] font-black text-blue-600">{issuedCount}/{totalCount} Depts</span>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-50 shadow-inner">
                                  <div
                                    className={`h-full transition-all duration-700 ${isFullyIssued ? "bg-green-500" : "bg-blue-600"}`}
                                    style={{ width: `${(issuedCount / totalCount) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 pt-2">
                              <div className="flex flex-wrap gap-2">
                                {job.departments.map((dept) => {
                                  const isPending = parseFloat(dept.remainingWeight || '0') > 0.001;
                                  if (!isPending) return null;
                                  return (
                                    <button
                                      key={dept.id}
                                      onClick={() => handleIssueGoldDirectly({ ...dept, jobId: job.jobId, jobMetalType: job.metalType })}
                                      className="flex-1 py-1.5 bg-orange-500 text-white text-[11px] font-black rounded-lg uppercase tracking-wider shadow-sm text-center"
                                    >
                                      Issue {dept.dept}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    filteredHistory.length === 0 ? (
                      <div className="px-5 py-12 text-center text-gray-400 italic text-base">No history records found.</div>
                    ) : (
                      filteredHistory.map((issue, idx) => (
                        <div key={idx} className="p-5 space-y-4 bg-white hover:bg-blue-50/30 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-black rounded-md uppercase border border-blue-100 mb-2">
                                {issue.isNumber}
                              </span>
                              <h4 className="text-base font-black text-gray-900 uppercase tracking-tight">{issue.orderNo}</h4>
                              <p className="text-[11px] font-mono text-gray-400 uppercase tracking-tighter">{issue.serialNo}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] font-bold text-gray-900">{formatDate(issue.timestamp)}</p>
                              <p className="text-[11px] font-medium text-gray-400 uppercase">{formatTime(issue.timestamp)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Karigar</p>
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-blue-500" />
                                <span className="text-[13px] font-bold text-gray-900 truncate">{issue.karigarName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Activity className="w-3 h-3 text-amber-500" />
                                <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">{issue.dept}</span>
                              </div>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Issued Weight</p>
                              <span className="text-[15px] font-black text-blue-600">{issue.issuedWeight}g</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Authorized By</span>
                            <span className="text-[11px] font-black text-gray-700">{issue.authorizedBy}</span>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Issue Gold Modal */}
          {showModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-5 duration-300">
                {/* Minimal Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                      <ArrowRightLeft className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 text-base uppercase tracking-tight">Issue Metal to Dept</h3>
                    </div>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-900" />
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden" autoComplete="off">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Step 1: Department & Job */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                        <h4 className="text-[12px] font-medium text-gray-400 uppercase tracking-widest">Department Targets</h4>
                      </div>

                      {/* Dept Filter Tabs in Modal */}
                      <div className="flex gap-2 mb-4 bg-gray-50 p-1 rounded-lg overflow-x-auto custom-scrollbar">
                        {stats.deptStats
                          .filter(dept => !selectedDept || dept.name === selectedDept)
                          .map((dept) => (
                            <button
                              key={dept.name}
                              type="button"
                              onClick={() => setSelectedDept(dept.name)}
                              className={`px-4 py-1.5 rounded-md text-[13px] font-medium uppercase tracking-widest transition-all whitespace-nowrap ${selectedDept === dept.name ? "bg-white shadow-xs text-orange-600 border border-gray-100" : "text-gray-400 hover:text-gray-600"}`}
                            >
                              {dept.name}
                            </button>
                          ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-normal text-gray-500 uppercase px-1">Choose Job Order *</label>
                          <select
                            value={selectedJobId}
                            onChange={(e) => handleJobChange(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 text-base font-normal border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm bg-white"
                          >
                            <option value="">Select job</option>
                            {filteredJobsForSelection.map((job) => (
                              <option key={job.jobId} value={job.jobId}>{job.orderNo} | {job.jobId}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-normal text-gray-500 uppercase px-1">Choose Department *</label>
                          <select
                            value={selectedJobDeptId}
                            onChange={(e) => handleJobDeptChange(e.target.value)}
                            required
                            disabled={!selectedJobId}
                            className="w-full px-4 py-2.5 text-base font-normal border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none bg-white transition-all shadow-sm disabled:opacity-50"
                          >
                            <option value="">Select department</option>
                            {selectedJob?.departments
                              .filter((d) => hasValue(d.masterColM) && parseFloat(d.remainingWeight || "0") > 0 && (!selectedDept || d.dept === selectedDept))
                              .map((dept) => {
                                const rem = Math.max(0, parseFloat(dept.remainingWeight || "0"));
                                return (
                                  <option key={dept.id} value={dept.id}>
                                    {dept.dept} (Rem: {rem.toFixed(3)}g)
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Weight Details */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                        <h4 className="text-[12px] font-medium text-gray-400 uppercase tracking-widest">Weight & Calculation</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-normal text-gray-500 uppercase px-1">Issue Weight (g) *</label>
                          <input
                            type="number"
                            name="goldIssued"
                            value={formData.goldIssued}
                            onChange={handleChange}
                            required
                            min="0.001"
                            step="0.001"
                            className="w-full px-4 py-2.5 text-base font-normal rounded-xl outline-none border transition-all bg-blue-50/30 border-blue-100 text-blue-700 focus:ring-blue-100"
                            placeholder="0.000"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-normal text-gray-500 uppercase px-1">Remaining Weight (g)</label>
                          <input
                            type="number"
                            name="remainingWeightOverride"
                            value={formData.remainingWeightOverride}
                            onChange={handleChange}
                            min="0.001"
                            step="0.001"
                            className="w-full px-4 py-2.5 text-base font-bold rounded-xl outline-none border transition-all bg-amber-50 border-amber-200 text-amber-900 focus:ring-amber-100"
                            placeholder="0.000"
                          />
                        </div>
                      </div>

                      {/* Stock Info Snippet */}
                      <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
                          <span className="text-[13px] font-medium text-orange-700 uppercase tracking-widest">Available {formData.meltingType} Stock</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-medium text-orange-800">
                            {(formData.meltingType === "24K" ? stockData.stock24K :
                              formData.meltingType === "22K" ? alloyStock["22K"] :
                                formData.meltingType === "20K" ? alloyStock["20K"] : alloyStock["18K"]).toFixed(3)}
                          </span>
                          <span className="text-[13px] font-normal text-orange-600/60 uppercase">g</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Assignment */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                          <h4 className="text-[12px] font-medium text-gray-400 uppercase tracking-widest">Manager Approval</h4>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-normal text-gray-500 uppercase px-1">Select Karigar *</label>
                          <select
                            name="karigarAssigned"
                            value={formData.karigarAssigned}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 text-base font-normal border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none bg-white"
                          >
                            <option value="">Select Karigar</option>
                            {masterKarigars.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-normal text-gray-500 uppercase px-1">Authorized By *</label>
                          <select
                            name="authorizedBy"
                            value={formData.authorizedBy}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 text-base font-normal border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none bg-white"
                          >
                            <option value="">Select Authorizer</option>
                            {masterAuthorizers.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-[12px] font-normal text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !formData.goldIssued || parseFloat(formData.goldIssued) <= 0}
                      className={`px-6 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed`}
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      {isSubmitting ? "Issuing..." : "Confirm Issue"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Job Breakdown View (New Page Interface from Image) */}
          {showBreakdownView && liveJobForBreakdown && (
            <div className="absolute inset-0 z-[60] flex flex-col bg-white animate-in fade-in slide-in-from-right duration-300 ring-1 ring-gray-200">
              {/* Top Navigation Bar */}
              <div className="px-4 py-2.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between bg-white shrink-0 gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowBreakdownView(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-all"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400 rotate-180" />
                  </button>
                  <div>
                    <h2 className="text-base font-black text-gray-900 uppercase">Processing Ledger</h2>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-lg flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-orange-400 uppercase tracking-widest">ID</span>
                      <span className="text-[12px] font-bold text-orange-700">{liveJobForBreakdown.orderNo}</span>
                    </div>
                    <div className="w-px h-5 bg-orange-200" />
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-orange-400 uppercase tracking-widest">Weight</span>
                      <span className="text-[12px] font-bold text-orange-700">{liveJobForBreakdown.totalWeight}g</span>
                    </div>
                    <div className="w-px h-5 bg-orange-200" />
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-orange-400 uppercase tracking-widest">Remaining</span>
                      <span className="text-[12px] font-bold text-orange-700">{liveJobForBreakdown.remainingWeight || "0.000"}g</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBreakdownView(false)}
                    className="p-1.5 bg-gray-100 text-gray-500 rounded-md hover:bg-gray-200 transition-all shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* List Content - Compact Cards */}
              <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 space-y-2 custom-scrollbar">
                {liveJobForBreakdown.departments
                  .map((dept: any) => (
                    <div
                      key={dept.id}
                      className="bg-white rounded-lg border border-gray-100 shadow-xs hover:shadow-sm transition-all p-3 flex flex-col sm:flex-row sm:items-center gap-4 group"
                    >
                      {/* 1. Meta Info */}
                      <div className="flex flex-col w-24 shrink-0 px-2 border-r border-gray-50">
                        <span className="text-[12px] font-bold text-gray-900 tracking-tight">{formatDate(liveJobForBreakdown.createdAt)}</span>
                        <span className="text-[12px] font-bold text-gray-400 uppercase">{formatTime(liveJobForBreakdown.createdAt)}</span>
                      </div>

                      {/* 2. Dept & Metal Pill */}
                      <div className="flex items-center gap-2 w-44">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[13px] font-bold rounded-md uppercase border border-blue-100/50">
                          {dept.dept}
                        </span>
                        <span className="px-2 py-0.5 bg-yellow-50 text-amber-700 text-[12px] font-bold rounded-md border border-yellow-100/50 uppercase">
                          {liveJobForBreakdown.metalType}
                        </span>
                      </div>

                      {/* 3. Weight Section */}
                      <div className="flex-1 flex flex-col items-center">
                        <span className={`text-base font-black ${dept.status === 'Pending' ? 'text-gray-400' : 'text-blue-600'}`}>
                          {dept.status === 'Pending' ? parseFloat(dept.plannedWeight).toFixed(3) : dept.issuedWeight.toFixed(3)}<span className="text-[12px] ml-0.5">g</span>
                        </span>
                        <span className="text-[12px] font-bold text-gray-300 uppercase tracking-widest leading-none">
                          {dept.status === 'Pending' ? 'Planned Target' : 'Actually Issued'}
                        </span>
                      </div>

                      {/* 4. Karigar Info */}
                      <div className="flex-1">
                        {dept.status === 'Pending' ? (
                          <span className="text-[12px] italic font-bold text-gray-300 uppercase tracking-widest">Not yet assigned</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-50 rounded-md flex items-center justify-center">
                              <User className="w-3 h-3 text-gray-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-gray-700 truncate">{dept.karigarAssigned}</p>
                              {dept.colM && (
                                <p className="text-[12px] font-bold text-green-600 uppercase flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Verified
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 5. Action Section */}
                      <div className="sm:w-36 shrink-0 flex justify-end">
                        {dept.status === 'Pending' ? (
                          <button
                            onClick={() => {
                              setSelectedJobId(liveJobForBreakdown.jobId);
                              handleIssueGoldDirectly({
                                ...dept,
                                jobId: liveJobForBreakdown.jobId,
                                jobMetalType: liveJobForBreakdown.metalType
                              });
                            }}
                            className="px-4 py-1.5 bg-orange-500 text-white text-[13px] font-bold rounded-md uppercase tracking-widest shadow-sm hover:bg-orange-600 active:scale-95 transition-all w-full text-center"
                          >
                            Issue Gold
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-[12px] font-bold rounded-md border border-green-100 uppercase tracking-widest w-full justify-center">
                            <CheckCircle className="w-3 h-3" />
                            Issued
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Ledger Footer Area */}
              <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
                <div className="text-[12px] text-gray-400 font-bold uppercase tracking-widest italic">
                  Job Summary Ledger | Record Count: {liveJobForBreakdown.departments.length}
                </div>
                <button
                  onClick={() => setShowBreakdownView(false)}
                  className="px-6 py-1.5 bg-gray-900 text-white rounded-md text-[12px] font-bold uppercase tracking-widest shadow-sm hover:bg-gray-800 transition-all active:scale-95"
                >
                  Exit Review
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
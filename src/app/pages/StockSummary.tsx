import { useState, useMemo, useEffect, useRef } from "react";
import {
  Layers,
  Package,
  TrendingUp,
  AlertTriangle,
  Factory,
  Users,
  Flame,
  FileText,
  UserCheck,
  BarChart3,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useApp } from "../context/AppContext";

export const StockSummary = () => {
  const { jobs, stockData, liveDepartmentStock, fetchAllData } = useApp();
  const hasRefreshed = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh data on mount and when navigating to this page (only once per session)
  useEffect(() => {
    if (!hasRefreshed.current) {
      hasRefreshed.current = true;
      const refreshData = async () => {
        await fetchAllData(true);
      };
      refreshData();
      const interval = setInterval(() => refreshData(), 1000);
      // Show loading for 1 second
      setTimeout(() => setIsLoading(false), 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // ─── Dynamic Departments derived from backend data ────────────────────────
  const deptNames = useMemo(() => {
    const names = new Set<string>();
    jobs.forEach(job => {
      job.departments.forEach(d => {
        if (d.dept && String(d.dept).trim() !== "") {
          names.add(String(d.dept).trim());
        }
      });
    });
    // Ensure standard order if they exist, otherwise append others
    const standard = ["Die", "Taar", "Chain", "KDM", "Direct Karigar"];
    const result = standard.filter(s => names.has(s));
    Array.from(names).forEach(n => {
      if (!standard.includes(n)) result.push(n);
    });
    return result.length > 0 ? result : standard;
  }, [jobs]);

  useEffect(() => {
    console.log("StockSummary - Data from Sheets:", {
      jobs,
      stockData,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [jobs, stockData]);

  const hasValue = (val: any) => {
    if (val === undefined || val === null) return false;
    const s = String(val).trim();
    return s !== "";
  };

  // ─── Department-wise stock grouped by metal type (from Main Calculation) ───────────────────────────
  const departmentStockSummary = useMemo(() => {
    const deptNamesList = ["Die", "Taar", "Chain", "KDM"];
    const metalTypes = ["22K", "20K", "18K"] as const;

    return deptNamesList.map((deptName) => {
      const metalTypeData = metalTypes.map((metalType) => {
        const availableStock = liveDepartmentStock[metalType]?.[deptName as keyof typeof liveDepartmentStock["22K"]] || 0;
        // For live data, issued stock is 0 (not tracked in Main Calculation)
        const issuedStock = 0;
        const totalStock = availableStock + issuedStock;

        return {
          metalType,
          count: 0,
          availableStock,
          issuedStock,
          totalStock,
        };
      }).filter(m => m.availableStock > 0 || m.issuedStock > 0);

      const deptTotals = metalTypeData.reduce(
        (acc, item) => ({
          availableStock: acc.availableStock + item.availableStock,
          issuedStock: acc.issuedStock + item.issuedStock,
          totalStock: acc.totalStock + item.totalStock,
        }),
        { availableStock: 0, issuedStock: 0, totalStock: 0 }
      );

      return {
        name: deptName,
        metalTypeData,
        deptTotals,
        hasActivity: metalTypeData.length > 0,
      };
    });
  }, [liveDepartmentStock]);

  // ─── System-wide totals by metal type ──────────────────────────────────────
  const systemWideByMetalType = useMemo(() => {
    const metalTypes = [
      { key: "24K_999", label: "24K (99.9%)", rawStock: stockData.stock24K_999 },
      { key: "24K_995", label: "24K (99.50%)", rawStock: stockData.stock24K_995 },
      { key: "22K", label: "22K", rawStock: stockData.stock22K },
      { key: "20K", label: "20K", rawStock: stockData.stock20K },
      { key: "18K", label: "18K", rawStock: stockData.stock18K },
    ];

    return metalTypes.map((metalType) => {
      let departmentAvailable = 0;
      let departmentIssued = 0;

      departmentStockSummary.forEach((dept) => {
        const matchingData = dept.metalTypeData.find(
          (m) => m.metalType === metalType.label
        );
        if (matchingData) {
          departmentAvailable += matchingData.availableStock;
          departmentIssued += matchingData.issuedStock;
        }
      });

      return {
        metalType: metalType.label,
        rawStock: metalType.rawStock,
        departmentAvailable,
        departmentIssued,
        totalInSystem: metalType.rawStock + departmentAvailable + departmentIssued,
      };
    });
  }, [stockData, departmentStockSummary]);

  // ─── Grand totals ──────────────────────────────────────────────────────────
  const grandTotals = useMemo(() => {
    const rawStockTotal =
      stockData.stock24K_999 +
      stockData.stock24K_995 +
      stockData.stock22K +
      stockData.stock20K +
      stockData.stock18K;

    const deptAvailableTotal = departmentStockSummary.reduce(
      (sum, dept) => sum + dept.deptTotals.availableStock,
      0
    );

    const deptIssuedTotal = departmentStockSummary.reduce(
      (sum, dept) => sum + dept.deptTotals.issuedStock,
      0
    );

    return {
      rawStock: rawStockTotal,
      departmentAvailable: deptAvailableTotal,
      departmentIssued: deptIssuedTotal,
      totalInSystem: rawStockTotal + deptAvailableTotal + deptIssuedTotal,
    };
  }, [stockData, departmentStockSummary]);

  // ─── Department Issue Stats ──────────────────────────────────────────────
  const deptIssueStats = useMemo(() => {
    return deptNames.map((deptName) => {
      const allActiveDepts = jobs.flatMap((job) =>
        job.departments
          .filter((d) => d.dept === deptName && d.status !== "Completed" && d.status !== "Returned")
          .map((d) => ({ ...d, jobMetalType: job.metalType }))
      );

      const totalCount = allActiveDepts.length;
      const issuePending = allActiveDepts.filter((d) => d.status === "Pending").length;
      const returnPending = allActiveDepts.filter((d) => d.status === "Issued").length;

      // Match DepartmentIssue.tsx: Issue Pending Wt = Sum of issuedWeight for Issued status
      const totalIssuePendingWeight = allActiveDepts
        .filter((d) => d.status === "Issued")
        .reduce((sum, d) => sum + (d.issuedWeight || 0), 0);

      const totalPlannedWeight = allActiveDepts.reduce(
        (sum, d) => sum + (parseFloat(d.plannedWeight) || 0),
        0
      );

      // Match DepartmentIssue.tsx: Return Pending Wt = Sum of finishedWeight for all active depts
      const totalReturnPendingWeight = allActiveDepts
        .reduce((sum, d) => sum + (d.finishedWeight || 0), 0);

      const meltingTypeBreakdown = ["24K_999", "24K_995", "22K", "20K", "18K"]
        .map((metalType) => {
          const depts = allActiveDepts.filter((d) => d.jobMetalType === metalType);
          let displayType = metalType;
          if (metalType === "24K_999") displayType = "24K (99.9%)";
          else if (metalType === "24K_995") displayType = "24K (99.50%)";

          return {
            type: displayType,
            count: depts.length,
            totalWeight: depts.reduce(
              (sum, d) => sum + (parseFloat(d.plannedWeight) || 0),
              0
            ),
            issuePendingCount: depts.filter((d) => d.status === "Pending").length,
            issuePendingWeight: depts
              .filter((d) => d.status === "Pending")
              .reduce((sum, d) => sum + (parseFloat(d.plannedWeight) || 0), 0),
            returnPendingCount: depts.filter((d) => d.status === "Issued").length,
            returnPendingWeight: depts
              .filter((d) => d.status === "Issued")
              .reduce((sum, d) => sum + (d.issuedWeight || 0), 0),
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
    });
  }, [jobs, deptNames]);

  // ─── Karigar Stats derived from live jobs ─────────────────────────────────
  const karigarIssueStats = useMemo(() => {
    const karigarData: Record<
      string,
      {
        totalJobs: number;
        totalWeight: number;
        pendingJobs: number;
        completedJobs: number;
        metalTypeBreakdown: Record<string, { count: number; weight: number }>;
      }
    > = {};

    jobs.forEach((job) => {
      job.departments.forEach((dept) => {
        const karigarName = String(dept.karigarAssigned || "").trim();
        if (karigarName && karigarName !== "") {
          if (!karigarData[karigarName]) {
            karigarData[karigarName] = {
              totalJobs: 0,
              totalWeight: 0,
              pendingJobs: 0,
              completedJobs: 0,
              metalTypeBreakdown: {},
            };
          }

          const stats = karigarData[karigarName];
          stats.totalJobs++;

          const weight = parseFloat(String(dept.plannedWeight)) || 0;
          stats.totalWeight += weight;

          // Follow the standard R/S logic for consistency
          const isPending = hasValue(dept.masterColM) && !hasValue(dept.masterColN);
          const isCompleted = hasValue(dept.masterColM) && hasValue(dept.masterColN);

          if (isPending) stats.pendingJobs++;
          if (isCompleted) stats.completedJobs++;

          let metalDisplay = job.metalType;
          if (metalDisplay === "24K_999") metalDisplay = "24K (99.9%)";
          else if (metalDisplay === "24K_995") metalDisplay = "24K (99.50%)";

          if (!stats.metalTypeBreakdown[metalDisplay]) {
            stats.metalTypeBreakdown[metalDisplay] = { count: 0, weight: 0 };
          }
          stats.metalTypeBreakdown[metalDisplay].count++;
          stats.metalTypeBreakdown[metalDisplay].weight += weight;
        }
      });
    });

    return Object.entries(karigarData).map(([name, data]) => ({
      karigarName: name,
      ...data,
      metalTypeBreakdown: Object.entries(data.metalTypeBreakdown).map(([type, breakStat]) => ({
        metalType: type,
        count: breakStat.count,
        weight: breakStat.weight,
      })),
    })).sort((a, b) => b.totalWeight - a.totalWeight);
  }, [jobs]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const fmt2 = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const fmt3 = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const stockCards = [
    {
      label: "24K (99.9%)",
      value: stockData.stock24K_999,
      sublabel: "Highest Purity",
      gradient: "from-yellow-400 to-amber-500",
      ring: "ring-yellow-200",
      textColor: "text-amber-900",
    },
    {
      label: "24K (99.50%)",
      value: stockData.stock24K_995,
      sublabel: "Standard Purity",
      gradient: "from-yellow-300 to-yellow-500",
      ring: "ring-yellow-100",
      textColor: "text-yellow-900",
    },
    {
      label: "22K",
      value: stockData.stock22K,
      sublabel: "91.80% Purity",
      gradient: "from-orange-300 to-orange-500",
      ring: "ring-orange-100",
      textColor: "text-orange-900",
    },
    {
      label: "20K",
      value: stockData.stock20K,
      sublabel: "83.50% Purity",
      gradient: "from-rose-300 to-rose-500",
      ring: "ring-rose-100",
      textColor: "text-rose-900",
    },
    {
      label: "18K",
      value: stockData.stock18K,
      sublabel: "75.20% Purity",
      gradient: "from-red-400 to-red-600",
      ring: "ring-red-100",
      textColor: "text-red-900",
    },
    // {
    //   label: "Scrap Metal",
    //   value: stockData.scrapBalance,
    //   sublabel: "Returned Scrap",
    //   gradient: "from-slate-400 to-slate-600",
    //   ring: "ring-slate-100",
    //   textColor: "text-slate-900",
    // },
  ];

  return (
    <div className="max-w-7xl space-y-6">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-gray-600">Loading fresh data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Page Header ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Stock Summary</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1 ml-13 pl-[52px]">
                System-wide stock overview by metal type &amp; department
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">Live Data</span>
            </div>
          </div>

          {/* ── Grand Total KPI Strip ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Raw Metal Stock",
                value: grandTotals.rawStock,
                color: "bg-slate-700",
                light: "bg-slate-50",
                border: "border-slate-200",
                text: "text-slate-700",
              },
              {
                label: "Dept Available",
                value: grandTotals.departmentAvailable,
                color: "bg-emerald-600",
                light: "bg-emerald-50",
                border: "border-emerald-200",
                text: "text-emerald-700",
              },
              {
                label: "Issued Stock",
                value: grandTotals.departmentIssued,
                color: "bg-orange-500",
                light: "bg-orange-50",
                border: "border-orange-200",
                text: "text-orange-600",
              },
              {
                label: "Total in System",
                value: grandTotals.totalInSystem,
                color: "bg-gradient-to-r from-blue-600 to-indigo-600",
                light: "bg-blue-50",
                border: "border-blue-200",
                text: "text-blue-700",
                big: true,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className={`relative ${kpi.light} border ${kpi.border} rounded-xl p-4 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
              >
                <div
                  className={`absolute top-0 left-0 w-1 h-full ${kpi.color} rounded-l-xl`}
                />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-3">
                  {kpi.label}
                </p>
                <p
                  className={`mt-1 ml-3 font-bold ${kpi.big ? "text-2xl" : "text-xl"} ${kpi.text}`}
                >
                  {fmt3(kpi.value)}
                  <span className="text-sm font-medium ml-1">g</span>
                </p>
              </div>
            ))}
          </div>

          {/* ── Current Metal Stock ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold text-white">
                  Current Metal Stock — Alloy Conversion
                </h3>
              </div>
              <div className="flex items-center gap-2 bg-black/10 px-3 py-1 rounded-full border border-white/20">
                <span className="text-xs font-bold text-white/80 uppercase">System Loss:</span>
                <span className="text-sm font-black text-white">{stockData.conversionLoss.toFixed(3)}g</span>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {stockCards.map((card) => (
                <div
                  key={card.label}
                  className={`relative rounded-xl overflow-hidden ring-2 ${card.ring} shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1`}
                >
                  <div className={`bg-gradient-to-br ${card.gradient} p-3`}>
                    <p className="text-white/90 text-xs font-semibold">{card.label}</p>
                  </div>
                  <div className="bg-white px-3 py-3">
                    <p className={`text-xl font-bold ${card.textColor}`}>
                      {fmt2(card.value)}
                      <span className="text-sm ml-0.5">g</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{card.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── System-Wide by Metal Type ─────────────────────────────────────── */}
          {/* <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-white" />
          <h3 className="text-base font-bold text-white">
            System-Wide Stock by Metal Type
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Metal Type", "Raw Stock (g)", "Dept Available (g)", "Issued (g)", "Total in System (g)"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide ${i === 0 ? "text-left" : "text-right"
                        }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {systemWideByMetalType.map((item) => (
                <tr
                  key={item.metalType}
                  className="hover:bg-gray-50 transition-colors duration-100"
                >
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      {item.metalType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-gray-700">
                    {fmt3(item.rawStock)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-emerald-700">
                    {fmt3(item.departmentAvailable)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-orange-600">
                    {fmt3(item.departmentIssued)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {fmt3(item.totalInSystem)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200">
                <td className="py-3 px-4 text-sm font-bold text-gray-900">GRAND TOTAL</td>
                <td className="py-3 px-4 text-right text-sm font-bold text-gray-900">
                  {fmt3(grandTotals.rawStock)}
                </td>
                <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">
                  {fmt3(grandTotals.departmentAvailable)}
                </td>
                <td className="py-3 px-4 text-right text-sm font-bold text-orange-600">
                  {fmt3(grandTotals.departmentIssued)}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-extrabold text-blue-700">
                    {fmt3(grandTotals.totalInSystem)} g
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div> */}

          {/* ── Created Orders Department-wise Breakdown ──────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-white" />
              <h3 className="text-base font-bold text-white">
                Created Orders — Department Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {[
                      { label: "Department", align: "left" },
                      { label: "Issue Pending", align: "center" },
                      { label: "Return Pending", align: "center" },
                      { label: "Issue Pending Wt (g)", align: "right" },
                      { label: "Return Pending Wt (g)", align: "right" },
                      { label: "Total Planned Wt (g)", align: "right" },
                      { label: "Total Jobs", align: "center" },
                    ].map((col) => (
                      <th
                        key={col.label}
                        className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-${col.align}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deptIssueStats.map((dept) => (
                    <tr
                      key={dept.name}
                      className="hover:bg-gray-50 transition-colors duration-100"
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900 text-sm">{dept.name}</span>
                        {dept.meltingTypeBreakdown.length > 0 && (
                          <span className="ml-2 text-xs text-gray-400">
                            {dept.meltingTypeBreakdown.length} types
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                          {dept.issuePending}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm">
                          {dept.returnPending}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-blue-700">
                        {dept.totalIssuePendingWeight.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-orange-600">
                        {dept.totalReturnPendingWeight.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-700">
                        {dept.totalPlannedWeight.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm">
                          {dept.totalCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Metal Type Breakdown */}
            {deptIssueStats.some((dept) => dept.meltingTypeBreakdown.length > 0) && (
              <div className="border-t border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <h4 className="text-sm font-semibold text-gray-700">
                    Metal Type Breakdown by Department
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deptIssueStats
                    .filter((dept) => dept.meltingTypeBreakdown.length > 0)
                    .map((dept) => (
                      <div key={dept.name} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                          <h5 className="text-sm font-bold text-gray-800">{dept.name}</h5>
                        </div>
                        <div className="space-y-2">
                          {dept.meltingTypeBreakdown.map((mt) => (
                            <div
                              key={mt.type}
                              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow duration-150"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-gray-800">{mt.type}</span>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                                  {mt.count} jobs
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500">Total</span>
                                  <span className="font-bold text-gray-800">{mt.totalWeight.toFixed(3)}g</span>
                                </div>
                                <div className="flex justify-between items-center text-xs bg-blue-50 rounded px-2 py-1">
                                  <span className="text-blue-600 font-medium">Issue Pending</span>
                                  <span className="font-bold text-blue-700">
                                    {mt.issuePendingWeight.toFixed(3)}g ({mt.issuePendingCount})
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs bg-orange-50 rounded px-2 py-1">
                                  <span className="text-orange-600 font-medium">Return Pending</span>
                                  <span className="font-bold text-orange-700">
                                    {mt.returnPendingWeight.toFixed(3)}g ({mt.returnPendingCount})
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Karigar Issue Report ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-6 py-4 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-white" />
              <h3 className="text-base font-bold text-white">Karigar Issue Report</h3>
            </div>
            {karigarIssueStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <UserCheck className="w-8 h-8 text-gray-300" />
                </div>
                <h4 className="text-base font-semibold text-gray-700 mb-1">
                  No Karigar Issue Data
                </h4>
                <p className="text-sm text-gray-400">
                  No work has been issued to karigars yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        { label: "Karigar Name", align: "left" },
                        { label: "Total Jobs", align: "center" },
                        { label: "Total Weight (g)", align: "right" },
                        { label: "Pending", align: "center" },
                        { label: "Completed", align: "center" },
                      ].map((col) => (
                        <th
                          key={col.label}
                          className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-${col.align}`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {karigarIssueStats.map((karigar: any) => (
                      <tr
                        key={karigar.karigarName}
                        className="hover:bg-gray-50 transition-colors duration-100"
                      >
                        <td className="py-3 px-4 font-semibold text-sm text-gray-900">
                          {karigar.karigarName}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                            {karigar.totalJobs}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-gray-800">
                          {karigar.totalWeight.toFixed(3)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm">
                            {karigar.pendingJobs}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                            {karigar.completedJobs}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Department-wise Stock Details ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 flex items-center gap-3">
              <Factory className="w-5 h-5 text-white" />
              <h3 className="text-base font-bold text-white">
                Live Department Stock — by Metal Type
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-3 px-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest w-36">
                      Metaltype
                    </th>
                    {["Die", "Taar", "Chain", "KDM"].map((dept) => (
                      <th
                        key={dept}
                        className="py-3 px-5 text-center text-xs font-bold text-gray-500 uppercase tracking-widest"
                      >
                        {dept}
                      </th>
                    ))}
                    <th className="py-3 px-5 text-center text-xs font-bold text-gray-500 uppercase tracking-widest bg-purple-50">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(["22K", "20K", "18K"] as const).map((metal) => {
                    const die = liveDepartmentStock[metal]?.["Die"] || 0;
                    const taar = liveDepartmentStock[metal]?.["Taar"] || 0;
                    const chain = liveDepartmentStock[metal]?.["Chain"] || 0;
                    const kdm = liveDepartmentStock[metal]?.["KDM"] || 0;
                    const rowTotal = die + taar + chain + kdm;
                    const metalColors: Record<string, string> = {
                      "22K": "bg-amber-50 text-amber-700 border-amber-200",
                      "20K": "bg-rose-50 text-rose-700 border-rose-200",
                      "18K": "bg-red-50 text-red-700 border-red-200",
                    };
                    return (
                      <tr key={metal} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold border ${metalColors[metal]}`}>
                            {metal}
                          </span>
                        </td>
                        {[die, taar, chain, kdm].map((val, i) => (
                          <td key={i} className="py-4 px-5 text-center">
                            <span className={`text-base font-bold ${val > 0 ? "text-gray-900" : "text-gray-300"}`}>
                              {fmt2(val)}
                            </span>
                            <span className="text-xs text-gray-400 ml-0.5">g</span>
                          </td>
                        ))}
                        <td className="py-4 px-5 text-center bg-purple-50">
                          <span className="text-base font-black text-purple-700">{fmt2(rowTotal)}</span>
                          <span className="text-xs text-purple-400 ml-0.5">g</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-200">
                    <td className="py-3 px-5 text-sm font-black text-gray-700 uppercase tracking-wide">
                      Total
                    </td>
                    {(["Die", "Taar", "Chain", "KDM"] as const).map((dept) => {
                      const colTotal =
                        (liveDepartmentStock["22K"]?.[dept] || 0) +
                        (liveDepartmentStock["20K"]?.[dept] || 0) +
                        (liveDepartmentStock["18K"]?.[dept] || 0);
                      return (
                        <td key={dept} className="py-3 px-5 text-center">
                          <span className="text-sm font-black text-gray-800">{fmt2(colTotal)}</span>
                          <span className="text-xs text-gray-400 ml-0.5">g</span>
                        </td>
                      );
                    })}
                    <td className="py-3 px-5 text-center bg-purple-100">
                      <span className="text-sm font-black text-purple-800">
                        {fmt2(
                          (["Die", "Taar", "Chain", "KDM"] as const).reduce((s, d) =>
                            s + (["22K", "20K", "18K"] as const).reduce((ss, m) => ss + (liveDepartmentStock[m]?.[d] || 0), 0)
                            , 0)
                        )}
                      </span>
                      <span className="text-xs text-purple-500 ml-0.5">g</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>


          {/* ── Legend ───────────────────────────────────────────────────────────── */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Legend
            </h4>
            <div className="flex flex-wrap gap-4">
              {[
                {
                  color: "bg-gray-700",
                  label: "Raw Metal Stock",
                  desc: "Stock in Alloy Conversion",
                },
                {
                  color: "bg-emerald-600",
                  label: "Available Stock",
                  desc: "Completed dept returns",
                },
                {
                  color: "bg-orange-500",
                  label: "Issued Stock",
                  desc: "Issued, not yet returned",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                  <div>
                    <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                    <span className="text-xs text-gray-400 ml-1">— {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
import { useState, useEffect, useMemo, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Flame,
  Search,
  Plus,
  X,
  FileText,
  TrendingUp,
  Gem,
  Coins,
  Landmark,
  Calendar,
  Eye,
  Settings
} from "lucide-react";
import { useApp, type ConversionEntry } from "../context/AppContext";
import { invalidateCache } from "../services/api";

// Helper: map a metal type string to a karat key
const getKaratKey = (metalType: string): "22K" | "20K" | "18K" | null => {
  const mt = String(metalType || "").toUpperCase();
  if (mt.includes("22") || mt.includes("91")) return "22K";
  if (mt.includes("20") || mt.includes("84") || mt.includes("83")) return "20K";
  if (mt.includes("18") || mt.includes("76") || mt.includes("75")) return "18K";
  return null;
};

export const AlloyConversion = () => {
  // const { stockData, updateStock, conversionEntries, addConversionEntry } = useApp();
  const { stockData, updateStock, conversionEntries, setConversionEntries, fetchAllData, jobs, alloyStock } = useApp();

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

  const scrapTotals = alloyStock;

  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [formData, setFormData] = useState({
    productionPlan: "",
    targetKarat: "22K",
    batchNumber: "",
    input24KPurity: "99.9",
    input24KWeight: "",
    actualOutputWeight: "",
    meltingLossWeight: "",
  });

  // Filters
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterKarat, setFilterKarat] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [alloyFormula, setAlloyFormula] = useState({
    alloy: 0,
    silver: 0,
    zinc: 0,
    expectedOutput: 0,
  });

  const [actualLoss, setActualLoss] = useState(0);

  // Calculate alloy formula when input weight or target karat changes
  useEffect(() => {
    if (formData.input24KWeight && formData.productionPlan) {
      const inputWeight = parseFloat(formData.input24KWeight);
      const inputPurity = parseFloat(formData.input24KPurity);

      let alloyRatio = 0;
      let silverRatio = 0;
      let zincRatio = 0;

      // JEWELLERY PLAN CALCULATIONS (PP-2024-001)
      if (formData.productionPlan === "PP-2024-001") {
        if (formData.targetKarat === "22K") {
          if (inputPurity === 99.9) {
            alloyRatio = 0.0823;
            silverRatio = 0.007;
            zincRatio = 0.0;
          } else if (inputPurity === 99.5) {
            alloyRatio = 0.07687;
            silverRatio = 0.007;
            zincRatio = 0.0;
          }
        } else if (formData.targetKarat === "20K") {
          if (inputPurity === 99.9) {
            alloyRatio = 0.1476;
            silverRatio = 0.05;
            zincRatio = 0.0;
          } else if (inputPurity === 99.5) {
            alloyRatio = 0.14161;
            silverRatio = 0.05;
            zincRatio = 0.0;
          }
        } else if (formData.targetKarat === "18K") {
          if (inputPurity === 99.9) {
            alloyRatio = 0.19787;
            silverRatio = 0.09995;
            zincRatio = 0.03196;
          } else if (inputPurity === 99.5) {
            alloyRatio = 0.19388;
            silverRatio = 0.09791;
            zincRatio = 0.03134;
          }
        }
      }
      // KDM CALCULATIONS (PP-2024-002)
      else if (formData.productionPlan === "PP-2024-002") {
        if (formData.targetKarat === "22K") {
          if (inputPurity === 99.9) {
            alloyRatio = 0.0;
            silverRatio = 0.0;
            zincRatio = 0.0893;
          } else if (inputPurity === 99.5) {
            alloyRatio = 0.0;
            silverRatio = 0.0;
            zincRatio = 0.0838;
          }
        } else if (formData.targetKarat === "20K") {
          if (inputPurity === 99.9) {
            alloyRatio = 0.0926;
            silverRatio = 0.015;
            zincRatio = 0.09;
          } else if (inputPurity === 99.5) {
            alloyRatio = 0.0866;
            silverRatio = 0.015;
            zincRatio = 0.09;
          }
        }
      }
      // BANGLE CALCULATIONS (PP-2024-003)
      else if (formData.productionPlan === "PP-2024-003") {
        if (formData.targetKarat === "22K") {
          if (inputPurity === 99.9) {
            alloyRatio = 0.0893;
            silverRatio = 0.0;
            zincRatio = 0.0;
          } else if (inputPurity === 99.5) {
            alloyRatio = 0.0838;
            silverRatio = 0.0;
            zincRatio = 0.0;
          }
        } else if (formData.targetKarat === "20K") {
          if (inputPurity === 99.9) {
            alloyRatio = 0.1976;
            silverRatio = 0.0;
            zincRatio = 0.0;
          } else if (inputPurity === 99.5) {
            alloyRatio = 0.1916;
            silverRatio = 0.0;
            zincRatio = 0.0;
          }
        } else if (formData.targetKarat === "18K") {
          if (inputPurity === 99.9) {
            alloyRatio = 0.19787;
            silverRatio = 0.09995;
            zincRatio = 0.03196;
          } else if (inputPurity === 99.5) {
            alloyRatio = 0.19388;
            silverRatio = 0.09791;
            zincRatio = 0.03134;
          }
        }
      }

      const alloy = inputWeight * alloyRatio;
      const silver = inputWeight * silverRatio;
      const zinc = inputWeight * zincRatio;
      const totalAlloy = alloy + silver + zinc;
      const expectedOutput = inputWeight + totalAlloy;

      setAlloyFormula({
        alloy: parseFloat(alloy.toFixed(3)),
        silver: parseFloat(silver.toFixed(3)),
        zinc: parseFloat(zinc.toFixed(3)),
        expectedOutput: parseFloat(expectedOutput.toFixed(3)),
      });
    }
  }, [
    formData.input24KWeight,
    formData.targetKarat,
    formData.input24KPurity,
    formData.productionPlan,
  ]);



  // Centralized in AppContext
  /*
  const fetchConversionData = async () => { ... }
  */

  // Calculate actual loss when actual output weight changes
  useEffect(() => {
    if (formData.actualOutputWeight && formData.input24KWeight) {
      const actualOutput = parseFloat(formData.actualOutputWeight);
      const expectedOutput = alloyFormula.expectedOutput;
      const meltingLossWeight = expectedOutput - actualOutput;
      const loss = (meltingLossWeight / expectedOutput) * 100;

      setActualLoss(parseFloat(loss.toFixed(3)));
      setFormData((prev) => ({
        ...prev,
        meltingLossWeight: meltingLossWeight.toFixed(3),
      }));
    }
  }, [formData.actualOutputWeight, formData.input24KWeight, alloyFormula]);

  // 🔴 REAL-TIME STOCK VALIDATION - Check on input change
  useEffect(() => {
    let errorMsg = "";

    if (formData.input24KWeight && formData.input24KPurity) {
      const input24K = parseFloat(formData.input24KWeight) || 0;
      const purity = parseFloat(formData.input24KPurity);

      if (purity === 99.9) {
        if ((stockData.stock24K_999 || 0) <= 0) {
          errorMsg = `ALERT: No 99.9% 24K stock available!\n\nAvailable: 0.00g\n\nPlease add 24K metal stock first before recording conversion.`;
        } else if (input24K > (stockData.stock24K_999 || 0)) {
          errorMsg = `ALERT: Insufficient 99.9% 24K stock!\n\nRequested: ${input24K}g\nAvailable: ${stockData.stock24K_999 || 0}g\n\nPlease add 24K metal stock first before recording conversion.`;
        }
      } else if (purity === 99.5) {
        if ((stockData.stock24K_995 || 0) <= 0) {
          errorMsg = `ALERT: No 99.5% 24K stock available!\n\nAvailable: 0.00g\n\nPlease add 24K metal stock first before recording conversion.`;
        } else if (input24K > (stockData.stock24K_995 || 0)) {
          errorMsg = `ALERT: Insufficient 99.5% 24K stock!\n\nRequested: ${input24K}g\nAvailable: ${stockData.stock24K_995 || 0}g\n\nPlease add 24K metal stock first before recording conversion.`;
        }
      }
    }

    if (errorMsg) {
      setErrorMessage(errorMsg);
      setShowError(true);
    } else {
      setShowError(false);
      setErrorMessage("");
    }
  }, [formData.input24KWeight, formData.input24KPurity, stockData.stock24K_999, stockData.stock24K_995]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input24K = parseFloat(formData.input24KWeight) || 0;
    const purity = parseFloat(formData.input24KPurity);

    // 🔴 CRITICAL STOCK VALIDATION (POPUPS)
    // Check if stock card has no value (zero or empty)
    if (purity === 99.9 && (stockData.stock24K_999 || 0) <= 0) {
      const msg = `ALERT: No 99.9% 24K stock available!\n\nRequested: ${input24K}g\nAvailable: ${stockData.stock24K_999 || 0}g\n\nPlease add 24K metal stock first before recording conversion.`;
      setErrorMessage(msg);
      setShowError(true);
      return; // ⛔ STOP SUBMISSION
    }

    if (purity === 99.5 && (stockData.stock24K_995 || 0) <= 0) {
      const msg = `ALERT: No 99.5% 24K stock available!\n\nRequested: ${input24K}g\nAvailable: ${stockData.stock24K_995 || 0}g\n\nPlease add 24K metal stock first before recording conversion.`;
      setErrorMessage(msg);
      setShowError(true);
      return; // ⛔ STOP SUBMISSION
    }

    // Check if requested amount exceeds available stock
    if (purity === 99.9 && input24K > (stockData.stock24K_999 || 0)) {
      const msg = `ALERT: Insufficient 99.9% 24K stock!\n\nRequested: ${input24K}g\nAvailable: ${stockData.stock24K_999 || 0}g\n\nPlease add 24K metal stock first before recording conversion.`;
      setErrorMessage(msg);
      setShowError(true);
      return; // ⛔ STOP SUBMISSION
    }

    if (purity === 99.5 && input24K > (stockData.stock24K_995 || 0)) {
      const msg = `ALERT: Insufficient 99.5% 24K stock!\n\nRequested: ${input24K}g\nAvailable: ${stockData.stock24K_995 || 0}g\n\nPlease add 24K metal stock first before recording conversion.`;
      setErrorMessage(msg);
      setShowError(true);
      return; // ⛔ STOP SUBMISSION
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const actualOutput = parseFloat(formData.actualOutputWeight) || 0;
      const now = new Date();

      const day = now.getDate().toString().padStart(2, "0");
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const year = now.getFullYear();

      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");

      const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      const displayDate = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      const productionPlanName =
        formData.productionPlan === "PP-2024-001"
          ? "Jewellery Plan"
          : formData.productionPlan === "PP-2024-002"
            ? "KDM"
            : "Bangle";

      // (Optimistic Updates intentionally removed. The UI will explicitly wait for background sync)
      // 3️⃣ Instant UI Feedback
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setIsSubmitting(false);
      setIsSyncing(true);

      // 4️⃣ Background Execution (Sheet Insert)
      const backgroundTask = async () => {
        const rowData = [
          timestamp,                         // Column A
          "",                                // Column B (Backend assigns serial)
          productionPlanName,                // Column C
          formData.targetKarat,              // Column D
          formData.batchNumber,              // Column E
          formData.input24KWeight,           // Column F
          `${formData.input24KPurity}%`,     // Column G
          alloyFormula.expectedOutput,       // Column H
          formData.actualOutputWeight,       // Column I
          formData.meltingLossWeight,        // Column J
        ];

        await fetch(
          "https://script.google.com/macros/s/AKfycbygSkpwhyYTjKeO5LRz06kTXMaM0mLMDwLNNaUR_rBItSshetknhJHGWuAJ3a2CMrX4/exec",
          {
            method: "POST",
            body: new URLSearchParams({
              action: "insert",
              sheetName: "Alloy Converstion",
              rowData: JSON.stringify(rowData),
            }),
          }
        );

        invalidateCache("Alloy Converstion");
        invalidateCache("24K Metal Stock");
        setTimeout(async () => {
           try {
             await fetchAllData(true);
           } catch(e) {
             console.error(e);
           } finally {
             setIsSyncing(false);
           }
        }, 1200);
      };

      backgroundTask().catch((err) => {
        console.error("Conversion Background Error:", err);
        setIsSyncing(false);
      });

    } catch (error) {
      console.error("Conversion Error:", error);
      console.error("Save error:", error);
      setIsSubmitting(false);
    }
  };

  const hasFilters = search || filterPlan || filterKarat || filterDate;
  const clearFilters = () => { setSearch(""); setFilterPlan(""); setFilterKarat(""); setFilterDate(""); };

  const filteredEntries = useMemo(() => conversionEntries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.batchNumber.toLowerCase().includes(q) || e.productionPlan.toLowerCase().includes(q);
    const matchPlan = !filterPlan || e.productionPlan === filterPlan;
    const matchKarat = !filterKarat || e.targetKarat === filterKarat;
    const matchDate = !filterDate || (() => {
      const d = new Date(e.date);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return iso === filterDate;
    })();
    return matchSearch && matchPlan && matchKarat && matchDate;
  }), [conversionEntries, search, filterPlan, filterKarat, filterDate]);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-57px-28px-2rem)] md:h-[calc(100vh-57px-28px-3rem)]">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-gray-600">
              Loading fresh data...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Success Overlay */}
          {showSuccess && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
              <div className="relative flex flex-col items-center gap-3 bg-white/90 backdrop-blur-md border border-green-100 rounded-2xl shadow-2xl px-10 py-8 animate-[fadeIn_0.2s_ease]">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-base font-bold text-gray-900">
                  Conversion Recorded!
                </p>
                <p className="text-base text-gray-500">
                  Stock ledger has been updated.
                </p>
              </div>
            </div>
          )}

          {/* Stock Cards Row - Matching GoldProcurement Style */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            {[
              {
                label: "99.9% 24K",
                value: stockData.stock24K_999,
                color: "yellow",
                icon: Gem,
              },
              {
                label: "99.5% 24K",
                value: stockData.stock24K_995,
                color: "orange",
                icon: Coins,
              },
              {
                label: "Total 22K",
                value: stockData.stock22K,
                color: "amber",
                icon: Landmark,
              },
              {
                label: "Total 20K",
                value: stockData.stock20K,
                color: "orange",
                icon: TrendingUp,
              },
              {
                label: "Total 18K",
                value: stockData.stock18K,
                color: "orange",
                icon: Flame,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`relative overflow-hidden p-3 md:p-4 bg-gradient-to-br from-${item.color}-50 to-${item.color}-100 border border-${item.color}-200 rounded-xl shadow-sm`}
              >
                <div
                  className={`absolute -right-3 -top-3 w-16 h-16 bg-${item.color}-200/40 rounded-full`}
                />
                <p
                  className={`text-[12px] md:text-base font-semibold text-${item.color}-800 uppercase tracking-wide mb-1.5`}
                >
                  {item.label}
                </p>
                <div className="flex items-center justify-between gap-2 relative">
                  <div>
                    <p className="text-lg md:text-xl font-bold text-gray-900 leading-none">
                      {fmt(item.value)}
                      <span className="text-[12px] md:text-base font-semibold text-gray-500 ml-1">
                        g
                      </span>
                    </p>
                  </div>
                  <div
                    className={`w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-${item.color}-400 to-${item.color}-600 rounded-lg flex items-center justify-center shadow`}
                  >
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* All Entries Table Section - Fully Matched to GoldProcurement */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">
            {/* Desktop Toolbar - Single Row */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 overflow-x-auto">
              <FileText className="w-4 h-4 text-amber-600 shrink-0" />
              <h3 className="font-semibold text-gray-900 text-base whitespace-nowrap shrink-0">
                All Entries
              </h3>
              {conversionEntries.length > 0 && (
                <span className="shrink-0 text-base font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {conversionEntries.length}
                </span>
              )}

              <div className="w-px h-5 bg-gray-200 shrink-0 mx-1" />

              {/* Search */}
              <div className="relative shrink-0 w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search batch or plan…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none bg-white font-medium"
                />
              </div>

              {/* Filters */}
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="shrink-0 text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 outline-none w-32 font-medium"
              >
                <option value="">All Plans</option>
                <option value="Jewellery Plan">Jewellery Plan</option>
                <option value="KDM">KDM</option>
                <option value="Bangle">Bangle</option>
              </select>

              <select
                value={filterKarat}
                onChange={(e) => setFilterKarat(e.target.value)}
                className="shrink-0 text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 outline-none w-24 font-medium"
              >
                <option value="">All Karats</option>
                <option value="22K">22K</option>
                <option value="20K">20K</option>
                <option value="18K">18K</option>
              </select>

              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="shrink-0 text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 outline-none w-36 font-medium"
              />

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="shrink-0 flex items-center gap-1 px-2 py-1.5 text-[13px] font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}

              <button
                onClick={() => setShowModal(true)}
                className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg text-[13px] font-bold shadow shadow-amber-400/30 hover:shadow-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Conversion</span>
              </button>
            </div>

            {/* Mobile Toolbar */}
            <div className="md:hidden flex flex-col gap-3 px-4 py-3 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-gray-900 text-base">
                    All Entries
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg text-[12px] font-bold shadow-md shadow-amber-400/20"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search batch or plan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none bg-gray-50/50"
                />
              </div>
            </div>

            {/* List Content - Scrollable Table */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-base table-auto">
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      {[
                        "Timestamp",
                        "Serial No",
                        "Production Plan",
                        "Target Karat",
                        "Batch Number",
                        "24K Input (G)",
                        "Purity (%)",
                        "Expected Output",
                        "Actual Output (g) *",
                        "Actual Loss",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-center text-[12px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-100 last:border-r-0"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {/* Syncing Loader Row */}
                    {isSyncing && (
                      <tr className="animate-pulse">
                        <td colSpan={10} className="py-2.5 bg-amber-50/50 border-b border-amber-100">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin"></div>
                            <span className="text-[13px] font-bold text-amber-800">
                              Saving Data & Syncing Stock...
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-2 opacity-40">
                            <FileText className="w-10 h-10" />
                            <p className="text-base font-medium">
                              No Data Found
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-amber-50/40 transition-all duration-200 border-b border-gray-50 last:border-0 group"
                        >
                          <td className="px-6 py-4 text-center whitespace-nowrap border-r border-gray-50 last:border-r-0">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[13px] text-gray-800">
                                {entry.date}
                              </span>
                              <span className="text-[12px] text-gray-400 group-hover:text-amber-600 transition-colors uppercase tracking-tight">
                                {entry.timestamp}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center border-r border-gray-50 last:border-r-0">
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-900 text-[12px] rounded-lg border border-gray-200 shadow-sm">
                              {entry.serialNo}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center border-r border-gray-50 last:border-r-0">
                            <p className="text-gray-900 text-[13px]">
                              {entry.productionPlan}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-center border-r border-gray-50 last:border-r-0">
                            <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-[12px] rounded-full border border-blue-100">
                              {entry.targetKarat}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center border-r border-gray-50 last:border-r-0">
                            <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 text-amber-700 text-[12px] rounded-lg border border-amber-100 shadow-sm">
                              {entry.batchNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center border-r border-gray-50 last:border-r-0">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-gray-900 text-base">
                                {entry.inputWeight}
                              </span>
                              <span className="text-[12px] text-gray-400">
                                g
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center border-r border-gray-50 last:border-r-0">
                            <span className="inline-flex items-center px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[12px] rounded-full border border-yellow-100">
                              {entry.purity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center border-r border-gray-50 last:border-r-0">
                            <div className="flex items-center justify-center gap-1 opacity-80">
                              <span className="text-gray-600 text-[13px]">
                                {entry.expectedOutput}
                              </span>
                              <span className="text-[13px] text-gray-400 uppercase">
                                g
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center border-r border-gray-50 last:border-r-0">
                            <div className="flex items-center justify-center gap-1 bg-green-50/50 rounded-lg py-1">
                              <span className="text-green-600 text-base">
                                {entry.outputWeight}
                              </span>
                              <span className="text-[12px] text-green-400">
                                g
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center border-r border-gray-50 last:border-r-0">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1">
                                <span className="text-red-600 text-[13px]">
                                  {entry.lossWeight}
                                </span>
                                <span className="text-[13px] text-red-300 uppercase">
                                  g
                                </span>
                              </div>
                              <span
                                className={`text-[12px] px-1.5 rounded-full ${parseFloat(entry.lossPercent) > 1 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"}`}
                              >
                                {entry.lossPercent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {/* Syncing Loader Mobile */}
                {isSyncing && (
                  <div className="flex items-center justify-center gap-2 py-2.5 bg-amber-50/50 rounded-xl border border-amber-100 animate-pulse">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin"></div>
                    <span className="text-[13px] font-bold text-amber-800">
                      Syncing Stock...
                    </span>
                  </div>
                )}
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[12px] font-bold rounded-full">
                        {entry.batchNumber}
                      </span>
                      <span className="text-[12px] text-gray-400">
                        {entry.date}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">
                        {entry.productionPlan}
                      </h4>
                      <p className="text-[12px] text-blue-600 font-bold">
                        {entry.targetKarat} Target
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                      <div>
                        <p className="text-[12px] uppercase text-gray-400 font-bold">
                          Input (24K)
                        </p>
                        <p className="text-base font-bold text-gray-900">
                          {entry.inputWeight}g [{entry.purity}]
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] uppercase text-gray-400 font-bold">
                          Output
                        </p>
                        <p className="text-base font-bold text-green-600">
                          {entry.outputWeight}g
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-[12px]">
                      <span className="font-bold text-gray-500 uppercase">
                        Melting Loss
                      </span>
                      <span className="font-bold text-red-500">
                        {entry.lossWeight}g ({entry.lossPercent}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New Conversion Modal - Fully Matched to GoldProcurement Modal Style */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowModal(false)}
              />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0 z-20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        New Alloy Conversion
                      </h3>
                      <p className="text-base text-gray-500">
                        Record a new gold purity melting process
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body & Footer Wrapper */}
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col flex-1 min-h-0"
                  autoComplete="off"
                >
                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Configuration */}
                      <div>
                        <label className="block text-base font-bold text-gray-600 uppercase mb-1.5 px-1">
                          Production Plan *
                        </label>
                        <select
                          name="productionPlan"
                          value={formData.productionPlan}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                        >
                          <option value="">Select plan</option>
                          <option value="PP-2024-001">Jewellery Plan</option>
                          <option value="PP-2024-002">KDM</option>
                          <option value="PP-2024-003">Bangle</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-base font-bold text-gray-600 uppercase mb-1.5 px-1">
                          Target Karat *
                        </label>
                        <select
                          name="targetKarat"
                          value={formData.targetKarat}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                        >
                          <option value="22K">22K (91.80% purity)</option>
                          <option value="20K">20K (83.50% purity)</option>
                          <option value="18K">18K (75.20% purity)</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-base font-bold text-gray-600 uppercase mb-1.5 px-1">
                          Batch Number *
                        </label>
                        <input
                          type="text"
                          name="batchNumber"
                          value={formData.batchNumber}
                          onChange={handleChange}
                          required
                          placeholder="Enter batch number (e.g. BT-001)"
                          className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                        />
                      </div>

                      {/* Input Weights */}
                      <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl col-span-2 grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <h4 className="text-[13px] font-bold text-amber-800 uppercase tracking-wider mb-2">
                            Input Specification
                          </h4>
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-amber-700 uppercase mb-1.5 px-1">
                            24K Input Weight (g) *
                          </label>
                          <input
                            type="number"
                            name="input24KWeight"
                            value={formData.input24KWeight}
                            onChange={handleChange}
                            required
                            step="0.001"
                            className="w-full px-3 py-2 text-base border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none pr-8"
                            placeholder="0.000"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-bold text-amber-700 uppercase mb-1.5 px-1">
                            Purity (24K) *
                          </label>
                          <select
                            name="input24KPurity"
                            value={formData.input24KPurity}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 text-base border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                          >
                            <option value="99.9">99.9%</option>
                            <option value="99.5">99.5%</option>
                          </select>
                        </div>
                      </div>

                      {/* Formula Preview (Compact) */}
                      {formData.input24KWeight && formData.productionPlan && (
                        <div className="col-span-2 bg-blue-600 rounded-2xl p-4 text-white shadow-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider">
                              <Settings className="w-3.5 h-3.5" /> Required
                              Formula
                            </h4>
                            <div className="px-2 py-0.5 bg-white/20 rounded text-[12px] font-bold whitespace-normal">
                              AUTO-CALCULATED
                            </div>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            <div className="text-center">
                              <p className="text-[13px] opacity-70 font-bold uppercase">
                                24K Input
                              </p>
                              <p className="text-base font-bold">
                                {formData.input24KWeight || "0"}g
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[13px] opacity-70 font-bold uppercase">
                                Alloy
                              </p>
                              <p className="text-base font-bold">
                                {alloyFormula.alloy}g
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[13px] opacity-70 font-bold uppercase">
                                Silver
                              </p>
                              <p className="text-base font-bold">
                                {alloyFormula.silver}g
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[13px] opacity-70 font-bold uppercase">
                                Zinc
                              </p>
                              <p className="text-base font-bold">
                                {alloyFormula.zinc}g
                              </p>
                            </div>
                            <div className="text-center border-l border-white/20 pl-2">
                              <p className="text-[13px] opacity-70 font-bold uppercase">
                                Expected
                              </p>
                              <p className="text-base font-bold">
                                {alloyFormula.expectedOutput}g
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actual Output */}
                      <div className="col-span-2 pt-2">
                        <label className="block text-base font-bold text-gray-600 uppercase mb-1.5 px-1">
                          Actual Output Weight (g) *
                        </label>
                        <input
                          type="number"
                          name="actualOutputWeight"
                          value={formData.actualOutputWeight}
                          onChange={handleChange}
                          required
                          step="0.001"
                          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                          placeholder="0.000"
                        />
                        {formData.actualOutputWeight && (
                          <div className="mt-2 flex items-center justify-between px-2">
                            <span className="text-[12px] font-bold text-gray-400 uppercase">
                              Estimated Loss:
                            </span>
                            <span
                              className={`text-base font-bold ${actualLoss > 1 ? "text-red-500" : "text-red-600"}`}
                            >
                              {formData.meltingLossWeight}g ({actualLoss}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {showError && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-base font-bold animate-in shake duration-500">
                        <AlertTriangle className="w-4 h-4" />
                        {errorMessage}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl text-base font-bold hover:bg-gray-100 transition-colors"
                    >
                      Discard
                    </button>
                    {/* <button
                  type="submit"
                  className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl text-base font-bold shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all"
                >
                  Confirm & Update Stock
                </button> */}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex-1 py-2 rounded-xl text-base font-bold shadow-lg transition-all
    ${
      isSubmitting
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-gradient-to-r from-amber-500 to-yellow-600 shadow-amber-500/30 hover:shadow-xl"
    } text-white`}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg
                            className="animate-spin h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            />
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        "Confirm & Update Stock"
                      )}
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
import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  CheckCircle,
  Search,
  X,
  FileText,
  Settings,
  Briefcase,
  User,
  Target,
  Layers,
  Clock,
  ArrowRight,
  Filter,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import {
  useApp,
  type JobDepartment,
  type Job,
} from "../context/AppContext";
import { invalidateCache, fetchSheet } from "../services/api";

export const JobCreation = () => {
  const { stockData, updateStock, addJob, jobs, setJobs, productionOrders, fetchAllData, masterKarigars, liveDepartmentStock } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [karigars, setKarigars] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const hasRefreshed = useRef(false);

  // Initial load with fast loading pattern (1 second)
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

  useEffect(() => {
    fetchSheet("Master Drop Down").then((result) => {
      if (!result.success) return;
      const rows: any[][] = result.data;
      const kList: string[] = [];
      rows.slice(1).forEach((row) => {
        const k = row[1]; // Column B — Karigar Name
        if (k && String(k).trim()) kList.push(String(k).trim());
      });
      setKarigars([...new Set(kList)]);
    });
  }, []);

  const [formData, setFormData] = useState({
    orderNo: "",
    designCode: "",
    karigarName: "",
    category: "",
    customer: "",
    totalWeight: "",
    metalType: "22K",
  });

  const [orderSearchText, setOrderSearchText] = useState("");
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const orderDropdownRef = useRef<HTMLDivElement>(null);

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
      let metalType = "22K";
      const meltingVal = String(order[4]).toUpperCase();
      if (meltingVal.includes("84") || meltingVal.includes("20K")) metalType = "20K";
      else if (meltingVal.includes("76") || meltingVal.includes("75") || meltingVal.includes("18K")) metalType = "18K";

      setFormData({
        ...formData,
        orderNo: selectedOrderNo,
        karigarName: order[7] || "",
        category: order[3] || "",
        customer: order[2] || "",
        totalWeight: order[16] ? String(order[16]) : "",
        metalType: metalType
      });
      setDepartments([
        {
          id: Date.now().toString(),
          dept: "Die",
          plannedWeight: order[16] ? String(order[16]) : "",
          allowedWastage: "",
          status: "Pending",
        },
      ]);
    } else {
      setFormData({
        ...formData,
        orderNo: selectedOrderNo,
      });
    }
    setOrderSearchText(selectedOrderNo);
    setIsOrderDropdownOpen(false);
  };

  const [departments, setDepartments] = useState<
    JobDepartment[]
  >([
    {
      id: "1",
      dept: "",
      plannedWeight: "",
      allowedWastage: "",
      status: "Pending",
    },
  ]);

  const dynamicDeptNames = useMemo(() => {
    const names = new Set<string>();
    jobs.forEach(job => {
      job.departments.forEach(d => {
        if (d.dept) names.add(String(d.dept).trim());
      });
    });
    const standard = ["Die", "Taar", "Chain", "KDM"];
    const result = standard.filter(s => names.has(s));
    Array.from(names).forEach(n => {
      if (!standard.includes(n)) result.push(n);
    });
    return result.length > 0 ? result : standard;
  }, [jobs]);

  const [jobId, setJobId] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (name === "totalWeight") {
      setDepartments(prevDepts => prevDepts.map(d => ({
        ...d,
        plannedWeight: value
      })));
    }
  };

  useEffect(() => {
    if (formData.orderNo === "STOCK-BASED") {
      // Only reset if departments are empty or just the initial default single empty row
      const isDefaultOrEmpty = departments.length === 0 ||
        (departments.length === 1 && departments[0].dept === "" && departments[0].plannedWeight === "");

      if (isDefaultOrEmpty) {
        setDepartments([
          {
            id: Date.now().toString(),
            dept: "",
            plannedWeight: "",
            allowedWastage: "",
            status: "Pending",
          },
        ]);
      }
    }
  }, [formData.orderNo]);

  const handleDepartmentChange = (
    id: string,
    field: string,
    value: string,
  ) => {
    if (field === "plannedWeight" && formData.totalWeight) {
      const totalWeight = parseFloat(formData.totalWeight);
      const currentPlannedWeight = parseFloat(value) || 0;

      const otherDeptsTotalWeight = departments
        .filter(dept => dept.id !== id)
        .reduce((sum, dept) => sum + (parseFloat(dept.plannedWeight) || 0), 0);

      const newTotalPlannedWeight = otherDeptsTotalWeight + currentPlannedWeight;

      if (newTotalPlannedWeight > totalWeight) {
        alert(
          `⚠️ Warning: Total Planned Weight (${newTotalPlannedWeight.toFixed(3)}g) cannot exceed Total Weight (${totalWeight.toFixed(3)}g)!\n\nRemaining available weight: ${(totalWeight - otherDeptsTotalWeight).toFixed(3)}g`
        );
        return;
      }
    }

    if (field === "dept") {
      const isStockDept = ["Taar", "Chain", "KDM"].includes(value);
      const isOrderDept = value === "Die";

      if (isStockDept) {
        setFormData(prev => ({
          ...prev,
          orderNo: "STOCK-BASED",
          customer: "Internal Stock"
        }));
        setDepartments(prev => prev.map(d =>
          d.id === id ? { ...d, plannedWeight: formData.totalWeight, allowedWastage: "0", dept: value } : d
        ));
      } else if (isOrderDept) {
        setFormData(prev => ({
          ...prev,
          orderNo: prev.orderNo === "STOCK-BASED" ? "" : prev.orderNo,
          customer: prev.customer === "Internal Stock" ? "" : prev.customer
        }));
      }
    }

    setDepartments(
      departments.map((dept) =>
        dept.id === id ? { ...dept, [field]: value } : dept,
      ),
    );
  };

  const addDepartment = () => {
    setDepartments([
      ...departments,
      {
        id: (departments.length + 1).toString(),
        dept: "",
        plannedWeight: formData.totalWeight,
        allowedWastage: "",
        status: "Pending",
      },
    ]);
  };

  const removeDepartment = (id: string) => {
    if (departments.length > 1) {
      setDepartments(
        departments.filter((dept) => dept.id !== id),
      );
    }
  };

  const generateJobId = () => {
    const newJobId = `JOB-${Date.now()}`;
    setJobId(newJobId);
  };

  const lowStockAlerts = useMemo(() => {
    const deptNames = ["Taar", "Chain", "KDM"] as const;
    const alerts: {
      dept: string;
      available: number;
      isLow: boolean;
      breakdown: { "22K": number; "20K": number; "18K": number }
    }[] = [];

    deptNames.forEach((deptName) => {
      const v22 = liveDepartmentStock["22K"]?.[deptName] || 0;
      const v20 = liveDepartmentStock["20K"]?.[deptName] || 0;
      const v18 = liveDepartmentStock["18K"]?.[deptName] || 0;

      const available = v22 + v20 + v18;
      const isLow = available < 100;

      alerts.push({
        dept: deptName,
        available,
        isLow,
        breakdown: { "22K": v22, "20K": v20, "18K": v18 }
      });
    });

    return alerts;
  }, [liveDepartmentStock]);

  const openNewModal = () => {
    setFormData({
      orderNo: "",
      designCode: "",
      karigarName: "",
      category: "",
      customer: "",
      totalWeight: "",
      metalType: "22K",
    });
    setDepartments([
      {
        id: "1",
        dept: "",
        plannedWeight: "",
        allowedWastage: "",
        status: "Pending",
      },
    ]);
    setOrderSearchText("");
    setShowModal(true);
  };

  const handleLowStockAction = (deptName: string) => {
    setFormData({
      ...formData,
      orderNo: "STOCK-BASED",
      customer: "Internal Stock",
      designCode: "",
      category: "",
      totalWeight: "100.000"
    });
    setDepartments([
      {
        id: "1",
        dept: deptName,
        plannedWeight: "100.000",
        allowedWastage: "0",
        status: "Pending",
      },
    ]);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsSyncing(true); // Start syncing immediately for inline feedback

    try {
      const now = new Date();
      const day = now.getDate().toString().padStart(2, "0");
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const year = now.getFullYear();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      // (Optimistic Updates intentionally removed. The UI will explicitly wait for background sync)

      // 2️⃣ Instant UI Feedback - Close modal & show success immediately
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
          orderNo: "", designCode: "", karigarName: "",
          category: "", customer: "", totalWeight: "", metalType: "22K",
        });
        setDepartments([{ id: "1", dept: "Die", plannedWeight: "", allowedWastage: "", status: "Pending" }]);
      }, 1200); // Shortened duration to match refresh cycle

      // 3️⃣ Background API Submission (Promise.all - NO await blocking)
      const submitPromises = departments.map((dept) => {
        const rowData = [
          timestamp,
          "", // Backend auto-generates serial number
          formData.orderNo,
          formData.metalType,
          formData.karigarName,
          formData.category,
          formData.designCode,
          formData.totalWeight,
          formData.customer,
          dept.dept || "",
          dept.plannedWeight,
          dept.allowedWastage,
        ];

        return fetch(
          "https://script.google.com/macros/s/AKfycbygSkpwhyYTjKeO5LRz06kTXMaM0mLMDwLNNaUR_rBItSshetknhJHGWuAJ3a2CMrX4/exec",
          {
            method: "POST",
            body: new URLSearchParams({
              action: "insert",
              sheetName: "Production Planning",
              rowData: JSON.stringify(rowData),
            }),
          }
        );
      });

      Promise.all(submitPromises)
        .then(async () => {
          invalidateCache("Production Planning");
          // Wait for sheet to settle and fetch fresh data
          await new Promise(r => setTimeout(r, 1200));
          await fetchAllData(true);
        })
        .catch((err) => {
          console.error("Background sync failed:", err);
        })
        .finally(() => {
          setIsSyncing(false);
        });

    } catch (error) {
      console.error("Production Save Error:", error);
      alert("Something went wrong while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const q = search.toLowerCase();
      const matchSearch = !q || job.orderNo.toLowerCase().includes(q) || job.customer.toLowerCase().includes(q) || job.jobId.toLowerCase().includes(q);
      const matchStage = !filterStage || job.stage === filterStage;
      return matchSearch && matchStage;
    });
  }, [jobs, search, filterStage]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: 'long', day: '2-digit', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const totalPlannedWeight = departments.reduce(
    (sum, dept) => sum + (parseFloat(dept.plannedWeight) || 0),
    0,
  );

  return (
    <div className="flex flex-col gap-4 h-auto md:h-[calc(100vh-57px-28px-3rem)]">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-gray-600">Loading fresh data...</p>
          </div>
        </div>
      ) : (
        <>


          {lowStockAlerts.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {lowStockAlerts.map(alert => (
                <div key={alert.dept} className="flex-1 min-w-[280px] flex items-center justify-between bg-white border-2 border-red-50 rounded-2xl p-4 shadow-sm hover:border-amber-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alert.isLow ? "bg-red-50" : "bg-green-50"}`}>
                      {alert.isLow ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {alert.isLow ? "Low Stock:" : "Stock Ready:"} {alert.dept}
                      </h4>
                   
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-bold">
                        <span className="text-red-600">22K: {alert.breakdown["22K"].toFixed(3)}g</span>
                        <span className="text-red-600">20K: {alert.breakdown["20K"].toFixed(3)}g</span>
                        <span className="text-red-600">18K: {alert.breakdown["18K"].toFixed(3)}g</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLowStockAction(alert.dept)}
                    className={`px-3 py-1.5 text-white text-[12px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm shrink-0
                  ${alert.isLow ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Plan Stock
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Header Section */}
          <div className="flex items-center justify-between">
            
          </div>

          {/* Success Overlay */}
          {showSuccess && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
              <div className="relative flex flex-col items-center gap-3 bg-white/90 backdrop-blur-md border border-green-100 rounded-2xl shadow-2xl px-10 py-8 animate-in fade-in zoom-in duration-300">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-base font-bold text-gray-900">Production Plan Created Successfully!</p>
                <p className="text-base text-gray-500">Order successfully moved to production.</p>
              </div>
            </div>
          )}

          {/* Main Table Interface */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 md:overflow-hidden md:flex-1 md:min-h-0 flex flex-col">

            {/* Toolbar */}
            <div className="sticky top-0 z-10 px-3 py-3 border-b border-gray-100 bg-white md:bg-gray-50/60">
              <div className="flex flex-col gap-3">
                {/* Top Row: Title + Button */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 text-base whitespace-nowrap truncate">Production Planning</h3>
                    </div>
                    {jobs.length > 0 && (
                      <span className="text-[12px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
                        {jobs.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={openNewModal}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg text-[11px] font-black uppercase shadow shadow-amber-400/30 hover:shadow-lg active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">New Plan</span>
                  </button>
                </div>
                
                {/* Bottom Row: Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search order, customer or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none bg-white font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="md:flex-1 md:min-h-0 md:overflow-y-auto custom-scrollbar relative">
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-base table-fixed">
                  <colgroup>
                    <col className="w-28" /> {/* Timestamp */}
                    <col className="w-32" /> {/* Order Details */}
                    <col className="w-28" /> {/* Karigar */}
                    <col className="w-28" /> {/* Category */}
                    <col className="w-32" /> {/* Customer */}
                    <col className="w-28" /> {/* Design Code */}
                    <col className="w-24" /> {/* Total Weight */}
                    <col className="w-20" /> {/* Melting */}
                    <col className="w-32" /> {/* Department */}
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                    <tr>
                      {[
                        "Timestamp",
                        "Order Details",
                        "Karigar",
                        "Category",
                        "Customer",
                        "Design Code",
                        "Total Weight",
                        "Melting",
                        "Department",
                      ].map((h) => (
                        <th key={h} className="px-4 py-3 text-center text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {/* Syncing Loader Row */}
                    {isSyncing && (
                      <tr>
                        <td colSpan={9} className="py-2.5 bg-amber-50/50 border-b border-amber-100">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin"></div>
                            <span className="text-[13px] font-bold text-amber-800">Saving Data...</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-2 opacity-40">
                            <Briefcase className="w-10 h-10" />
                            <p className="text-base font-medium text-gray-500">No job orders found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map((job) => (
                        <tr key={job.jobId} className="hover:bg-amber-50/40 transition-all duration-200 group">
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[13px] text-gray-800">{formatDate(job.createdAt)}</span>
                              <span className="text-[12px] text-gray-400 group-hover:text-amber-600 transition-colors uppercase">{formatTime(job.createdAt)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-900 text-[12px] rounded-lg border border-gray-200 shadow-sm">{job.orderNo}</span>
                              <span className="text-[13px] text-gray-400 mt-1 font-mono uppercase tracking-tighter">{job.jobId}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-gray-900 text-[13px] font-medium">{job.karigarName || "-"}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-gray-900 text-[13px] font-medium">{job.category || "-"}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <User className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="text-gray-900 text-[13px] whitespace-normal break-words">{job.customer || "N/A"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-base font-medium text-gray-600">{job.designCode || "—"}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-gray-900 text-base">{parseFloat(String(job.totalWeight || 0)).toFixed(3)}</span>
                              <span className="text-[12px] text-gray-400">g</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-[12px] rounded-full border border-blue-100">{job.metalType}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {job.departments.map((d, i) => (
                                <span key={i} className="text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">
                                  {d.dept || "—"}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-3">
                {/* Syncing Loader Card */}
                {isSyncing && (
                  <div className="py-3 px-4 bg-amber-50/50 border-2 border-dashed border-amber-200 rounded-xl flex items-center justify-center gap-2 animate-pulse">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin"></div>
                    <span className="text-sm font-bold text-amber-800 uppercase tracking-widest">Saving Data...</span>
                  </div>
                )}
                {filteredJobs.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Briefcase className="w-10 h-10" />
                      <p className="text-base font-medium text-gray-500">No job orders found</p>
                    </div>
                  </div>
                ) : (
                  filteredJobs.map((job) => (
                    <div key={job.jobId} className="bg-white rounded-xl p-4 border-2 border-orange-200 shadow-sm space-y-3">
                      {/* Card Header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-900 text-[11px] rounded-lg border border-gray-200 font-mono uppercase">
                              {job.jobId}
                            </span>
                            <span className="text-[11px] text-gray-400">{formatTime(job.createdAt)}</span>
                          </div>
                          <h4 className="text-[14px] font-black text-gray-900 uppercase tracking-tight truncate">{job.orderNo}</h4>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] rounded-full border border-blue-100 shrink-0">
                          {job.metalType}
                        </span>
                      </div>

                      {/* Card Content */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-[11px] uppercase text-gray-400 font-bold">Customer</p>
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{job.customer || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-gray-400 font-bold">Weight</p>
                          <p className="text-[13px] font-bold text-gray-900">{parseFloat(String(job.totalWeight || 0)).toFixed(3)}g</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-gray-400 font-bold">Karigar</p>
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{job.karigarName || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-gray-400 font-bold">Category</p>
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{job.category || "-"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] uppercase text-gray-400 font-bold">Departments</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {job.departments.map((d, i) => (
                              <span key={i} className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">
                                {d.dept || "—"}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* New Job Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-100 transition-all">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0 z-20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Create Production Planning</h3>
                      <p className="text-base text-gray-500">Allocate orders to production departments</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body & Footer Wrapper */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0" autoComplete="off">
                  {/* Content Area - Scrollable */}
                  <div className="p-4 space-y-2.5 overflow-y-auto flex-1 min-h-0">

                    {/* Basic Details Section */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">
                          {formData.orderNo === "STOCK-BASED" ? "Stock Details" : "Job Details"}
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2.5 gap-y-2">
                        <div>
                          <label className="block text-[12px] font-semibold text-gray-600 mb-0.5 px-1">Order No *</label>
                          {formData.orderNo === "STOCK-BASED" ? (
                            <div className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-xl bg-gray-50 text-gray-900 font-bold shadow-sm">
                              STOCK-BASED
                            </div>
                          ) : (
                            <div className="relative" ref={orderDropdownRef}>
                              <input
                                type="text"
                                value={isOrderDropdownOpen ? orderSearchText : formData.orderNo}
                                onChange={(e) => {
                                  setOrderSearchText(e.target.value);
                                  setIsOrderDropdownOpen(true);
                                  if (!e.target.value) {
                                    setFormData({ ...formData, orderNo: "" });
                                  }
                                }}
                                onFocus={() => {
                                  setIsOrderDropdownOpen(true);
                                  setOrderSearchText("");
                                }}
                                placeholder={formData.orderNo || "Search Order..."}
                                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium shadow-sm transition-all text-left"
                                required={!formData.orderNo}
                              />
                              {isOrderDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                                  {productionOrders
                                    .filter(order => {
                                      const colS = parseFloat(String(order[18] ?? 0));
                                      return colS > 0 && order[1]?.toLowerCase().includes(orderSearchText.toLowerCase());
                                    })
                                    .map((order, idx) => (
                                      <div
                                        key={`${order[1]}-${idx}`}
                                        onClick={() => handleOrderSelect(order[1])}
                                        className="px-3 py-2 hover:bg-amber-50 cursor-pointer text-[13px] font-medium text-gray-700 transition-colors border-b border-gray-50 last:border-0"
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className="font-bold text-amber-700">{order[1]}</span>
                                          <span className="text-[11px] text-gray-400">{order[3]}</span>
                                        </div>
                                        <div className="text-[11px] text-gray-500 truncate">{order[2]}</div>
                                      </div>
                                    ))}
                                  {productionOrders.filter(order => {
                                    const colS = parseFloat(String(order[18] ?? 0));
                                    return colS > 0 && order[1]?.toLowerCase().includes(orderSearchText.toLowerCase());
                                  }).length === 0 && (
                                    <div className="px-3 py-2 text-xs text-gray-500 text-center">No orders found</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[12px] font-semibold text-gray-600 mb-0.5 px-1">Melting Type *</label>
                          <select
                            name="metalType"
                            value={formData.metalType}
                            onChange={handleChange}
                            required
                            className="w-full px-2.5 py-1.5 text-[13px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium shadow-sm transition-all"
                          >
                            <option value="22K">22K (91.80% purity)</option>
                            <option value="20K">20K (83.50% purity)</option>
                            <option value="18K">18K (75.20% purity)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[12px] font-semibold text-gray-600 mb-0.5 px-1">Total Weight (g) *</label>
                          <input
                            type="number"
                            name="totalWeight"
                            value={formData.totalWeight}
                            onChange={handleChange}
                            required
                            step="0.01"
                            placeholder="0.000"
                            className="w-full px-2.5 py-1.5 text-[13px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium shadow-sm transition-all"
                          />
                        </div>

                        {formData.orderNo !== "STOCK-BASED" && (
                          <>
                            <div>
                              <label className="block text-[12px] font-semibold text-gray-600 mb-0.5 px-1">Category</label>
                              {formData.orderNo !== "STOCK-BASED" && formData.orderNo !== "" ? (
                                <div className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-xl bg-gray-100 text-gray-900 font-bold shadow-sm">
                                  {formData.category || "No Category"}
                                </div>
                              ) : (
                                <select
                                  name="category"
                                  value={formData.category}
                                  onChange={handleChange}
                                  className="w-full px-2.5 py-1.5 text-[13px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium shadow-sm transition-all"
                                >
                                  <option value="">Select Category</option>
                                  <option value="Ring">Ring</option>
                                  <option value="Chain">Chain</option>
                                  <option value="Bangles">Bangles</option>
                                  <option value="Necklace">Necklace</option>
                                  <option value="Earrings">Earrings</option>
                                  <option value="Other">Other</option>
                                </select>
                              )}
                            </div>
                            <div>
                              <label className="block text-[12px] font-semibold text-gray-600 mb-0.5 px-1">Design Code</label>
                              <input
                                type="text"
                                name="designCode"
                                value={formData.designCode}
                                onChange={handleChange}
                                placeholder="DES-XXXX"
                                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium shadow-sm transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[12px] font-semibold text-gray-600 mb-0.5 px-1">Karigar Name</label>
                              <input
                                type="text"
                                name="karigarName"
                                value={formData.karigarName}
                                onChange={handleChange}
                                placeholder="Karigar Name"
                                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium shadow-sm transition-all"
                              />
                            </div>
                            <div className="col-span-1 lg:col-span-3">
                              <label className="block text-[12px] font-semibold text-gray-600 mb-0.5 px-1">Customer</label>
                              <input
                                type="text"
                                name="customer"
                                value={formData.customer}
                                onChange={handleChange}
                                placeholder="Customer name"
                                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium shadow-sm transition-all"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Department Details Section */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Department</h4>
                      </div>

                      <div className="space-y-2">
                        {departments.map((dept, index) => (
                          <div
                            key={dept.id}
                            className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-200 relative group transition-all"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 px-0.5 tracking-tight">Dept *</label>
                                {formData.orderNo !== "STOCK-BASED" && index === 0 ? (
                                  <div className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-gray-100 text-gray-900 font-bold shadow-sm">
                                    Die
                                  </div>
                                ) : (
                                  <select
                                    value={dept.dept}
                                    onChange={(e) => handleDepartmentChange(dept.id, "dept", e.target.value)}
                                    required
                                    className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold shadow-sm appearance-none"
                                  >
                                    <option value="">Select</option>
                                    <option value="Die">Die</option>
                                    <option value="Taar">Taar</option>
                                    <option value="Chain">Chain</option>
                                    <option value="KDM">KDM</option>
                                    <option value="Direct Karigar">Direct Karigar</option>
                                  </select>
                                )}
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 px-0.5 tracking-tight">Planned (g) *</label>
                                <input
                                  type="number"
                                  value={dept.plannedWeight}
                                  onChange={(e) => handleDepartmentChange(dept.id, "plannedWeight", e.target.value)}
                                  required
                                  step="0.001"
                                  min="0"
                                  placeholder="0.000"
                                  className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold shadow-sm transition-all"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 px-0.5 tracking-tight">Wastage %</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={dept.allowedWastage}
                                    onChange={(e) => handleDepartmentChange(dept.id, "allowedWastage", e.target.value)}
                                    step="0.1"
                                    placeholder="0.0"
                                    className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-bold shadow-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary Section */}
                    <div className="bg-amber-600 rounded-xl p-4 text-white shadow-lg overflow-hidden relative group">
                      <div className="absolute right-0 top-0 opacity-10 scale-150 rotate-12 transition-transform duration-700 group-hover:rotate-45">
                        <Target className="w-16 h-16" />
                      </div>
                      <div className="flex items-center justify-between relative z-10">
                        <div>
                          <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mb-0.5">Total Dept Weight</p>
                          <h4 className="text-lg font-black">{totalPlannedWeight.toFixed(3)}<span className="text-[12px] ml-1 opacity-70">g</span></h4>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mb-0.5">Total Weight</p>
                          <div className="flex items-center gap-2 justify-end">
                            <span className={`text-[13px] font-black px-2 py-0.5 rounded-full ${Math.abs(totalPlannedWeight - parseFloat(formData.totalWeight || '0')) < 0.001 ? 'bg-white/20' : 'bg-red-500/30 border border-red-500/50'}`}>
                              {formData.totalWeight || '0.000'}g
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Fixed at Bottom */}
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-1.5 px-4 border border-gray-300 text-gray-700 rounded-lg text-[13px] font-bold hover:bg-white hover:shadow-sm active:scale-[0.98] transition-all"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex-[2] py-1.5 px-4 rounded-lg text-[13px] font-bold shadow-lg transition-all
                    ${isSubmitting
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-amber-500 to-yellow-600 shadow-amber-500/30 hover:shadow-amber-500/40"
                        } text-white flex items-center justify-center gap-2`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        "Save Production Planning"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Department Details Modal */}
          {showDeptModal && selectedJob && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeptModal(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Layers className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Department Details</h3>
                      <p className="text-[12px] text-gray-500 font-bold uppercase tracking-tight">Order: {selectedJob.orderNo} | ID: {selectedJob.jobId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeptModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 bg-gray-50/30">
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-base">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase">Department</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase">Planned Wt</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase">Wastage %</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                        {selectedJob.departments.map((dept, idx) => (
                          <tr key={dept.id || idx} className="hover:bg-amber-50/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${dept.status === 'Completed' ? 'bg-green-500' :
                                  dept.status === 'Issued' ? 'bg-blue-500' : 'bg-amber-400'
                                  }`} />
                                <span className="font-extrabold">{dept.dept}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{parseFloat(dept.plannedWeight).toFixed(3)}g</td>
                            <td className="px-4 py-3 text-right text-gray-500 font-bold">{dept.allowedWastage}%</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[13px] font-black uppercase ${dept.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                dept.status === 'Issued' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {dept.status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-amber-50/50 border-t border-amber-100">
                        <tr>
                          <td className="px-4 py-3 font-black text-amber-900 uppercase italic">Total Allocated</td>
                          <td className="px-4 py-3 text-right font-black text-amber-900 font-mono">
                            {selectedJob.departments.reduce((sum, d) => sum + (parseFloat(d.plannedWeight) || 0), 0).toFixed(3)}g
                          </td>
                          <td colSpan={2} className="px-4 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end shrink-0">
                  <button
                    onClick={() => setShowDeptModal(false)}
                    className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-widest text-[12px] hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

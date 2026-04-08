import { useState, useRef, useMemo, useEffect } from "react";
import { Upload, CheckCircle, Calendar, Plus, X, Eye, FileText, TrendingUp, Gem, Coins, Landmark, Search } from "lucide-react";
import { useApp, ProcurementEntry } from "../context/AppContext";
import { fetchSheet, invalidateCache } from "../services/api";

const emptyForm = {
  customerName: "",
  invoiceNumber: "",
  grossWeight: "",
  purity: "99.9",
  storageLocation: "",
};

export const GoldProcurement = () => {
  // const { stockData, updateStock, procurementEntries, addProcurementEntry } = useApp();
  const { stockData, updateStock, procurementEntries, setProcurementEntries, fetchAllData } = useApp();

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [assayFile, setAssayFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch Storage Locations from Master Drop Down sheet (Column A)
  const [storageLocations, setStorageLocations] = useState<string[]>([]);
  useEffect(() => {
    fetchSheet("Master Drop Down").then((result) => {
      if (!result.success) return;
      const locs: string[] = [];
      result.data.slice(1).forEach((row: any[]) => {
        const v = row[0]; // Column A
        if (v && String(v).trim()) locs.push(String(v).trim());
      });
      setStorageLocations([...new Set(locs)]);
    });
  }, []);


  // ── Filter state ──
  const [search, setSearch] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterPurity, setFilterPurity] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Unique options derived from entries
  const customerOptions = useMemo(() => [...new Set(procurementEntries.map(e => e.customerName))], [procurementEntries]);
  const locationOptions = useMemo(() => [...new Set(procurementEntries.map(e => e.storageLocation))], [procurementEntries]);

  // Filtered entries
  const filteredEntries = useMemo(() => procurementEntries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.customerName.toLowerCase().includes(q) || e.invoiceNumber.toLowerCase().includes(q) || e.serialNo.toLowerCase().includes(q);
    const matchCustomer = !filterCustomer || e.customerName === filterCustomer;
    const matchPurity = !filterPurity || e.purity === filterPurity;
    const matchLocation = !filterLocation || e.storageLocation === filterLocation;
    const matchDate = !filterDate || (() => {
      const d = new Date(e.date);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return iso === filterDate;
    })();
    return matchSearch && matchCustomer && matchPurity && matchLocation && matchDate;
  }), [procurementEntries, search, filterCustomer, filterPurity, filterLocation, filterDate]);


  useEffect(() => {
    // fetchData(); // No longer needed
  }, []);

  // Centralized in AppContext
  /*
  const fetchData = async () => { ... }
  */



  const hasFilters = search || filterCustomer || filterPurity || filterLocation || filterDate;
  const clearFilters = () => { setSearch(""); setFilterCustomer(""); setFilterPurity(""); setFilterLocation(""); setFilterDate(""); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setAssayFile(e.target.files[0]);
  };

  const openModal = () => { setFormData(emptyForm); setAssayFile(null); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setFormData(emptyForm); setAssayFile(null); };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const displayDate = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // (Optimistic Updates intentionally removed. The UI will explicitly wait for background sync)

      // 3️⃣ Instant UI Feedback
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setIsSubmitting(false);
      setIsSyncing(true);

      // 4️⃣ Background Execution (File Upload + Sheet Insert)
      const backgroundTask = async () => {
        let fileUrl = "";

        if (assayFile) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(assayFile);
            reader.onload = () => resolve(reader.result as string);
          });

          const uploadRes = await fetch(
            "https://script.google.com/macros/s/AKfycbygSkpwhyYTjKeO5LRz06kTXMaM0mLMDwLNNaUR_rBItSshetknhJHGWuAJ3a2CMrX4/exec",
            {
              method: "POST",
              body: new URLSearchParams({
                action: "uploadFile",
                base64Data: base64,
                fileName: assayFile.name,
                mimeType: assayFile.type,
                folderId: "1tL2FuBP5PRc56qd0FayfFN_F-kIpQUlI",
              }),
            }
          );

          const uploadResult = await uploadRes.json();
          if (uploadResult.success) {
            fileUrl = uploadResult.fileUrl;
          }
        }

        const day = now.getDate().toString().padStart(2, "0");
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const year = now.getFullYear();
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");
        const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

        const rowData = [
          timestamp,               // Column A
          "",                      // Column B (Backend handles serial generation)
          formData.customerName,   // Column C
          formData.invoiceNumber,  // Column D
          formData.grossWeight,    // Column E
          `${formData.purity}%`,   // Column F
          formData.storageLocation,// Column G
          displayDate,             // Column H
          fileUrl || "",           // Column I
        ];

        await fetch(
          "https://script.google.com/macros/s/AKfycbygSkpwhyYTjKeO5LRz06kTXMaM0mLMDwLNNaUR_rBItSshetknhJHGWuAJ3a2CMrX4/exec",
          {
            method: "POST",
            body: new URLSearchParams({
              action: "insert",
              sheetName: "24K Metal Stock",
              rowData: JSON.stringify(rowData),
            }),
          }
        );

        invalidateCache("24K Metal Stock");
        setTimeout(async () => {
          try {
            await fetchAllData(true);
          } catch(e) {
            console.error(e);
          } finally {
            setIsSyncing(false);
          }
        }, 400);
      };

      backgroundTask().catch((err) => {
        console.error("Procurement Background Error:", err);
        setIsSyncing(false);
      });

    } catch (error) {
      console.error("Procurement Error:", error);
      alert("Something went wrong processing your request.");
      setIsSubmitting(false);
    }
  };


  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-57px-28px-2rem)] md:h-[calc(100vh-57px-28px-3rem)]">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-gray-600">Loading fresh data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Success Overlay ── */}
          {showSuccess && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
              <div className="relative flex flex-col items-center gap-3 bg-white/90 backdrop-blur-md border border-green-100 rounded-2xl shadow-2xl px-10 py-8 animate-[fadeIn_0.2s_ease]">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-base font-bold text-gray-900">Procurement Recorded!</p>
                <p className="text-base text-gray-500">24K ledger has been updated.</p>
              </div>
            </div>
          )}

          {/* ── Stock Cards Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            <div className="relative overflow-hidden p-3 md:p-4 bg-gradient-to-br from-yellow-50 to-amber-100 border border-yellow-200 rounded-xl shadow-sm">
              <div className="absolute -right-3 -top-3 w-16 h-16 bg-yellow-200/40 rounded-full" />
              <p className="text-base font-semibold text-amber-800 uppercase tracking-wide mb-1.5">99.9% 24K Stock</p>
              <div className="flex items-center justify-between gap-2 relative">
                <div>
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 leading-none">
                    {fmt(stockData.stock24K_999)}
                    <span className="text-base md:text-base font-semibold text-gray-500 ml-1">g</span>
                  </p>
                </div>
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow">
                  <Gem className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden p-3 md:p-4 bg-gradient-to-br from-orange-50 to-yellow-100 border border-orange-200 rounded-xl shadow-sm">
              <div className="absolute -right-3 -top-3 w-16 h-16 bg-orange-200/40 rounded-full" />
              <p className="text-base font-semibold text-orange-800 uppercase tracking-wide mb-1.5">99.5% 24K Stock</p>
              <div className="flex items-center justify-between gap-2 relative">
                <div>
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 leading-none">
                    {fmt(stockData.stock24K_995)}
                    <span className="text-base md:text-base font-semibold text-gray-500 ml-1">g</span>
                  </p>
                </div>
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-xl flex items-center justify-center shadow">
                  <Coins className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              </div>
            </div>

            <div className="col-span-2 lg:col-span-1 relative overflow-hidden p-3 md:p-4 bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-200 rounded-xl shadow-sm">
              <div className="absolute -right-3 -top-3 w-16 h-16 bg-amber-200/40 rounded-full" />
              <div className="flex items-center gap-1.5 mb-1.5 relative">
                <TrendingUp className="w-3 h-3 text-amber-600" />
                <p className="text-base font-semibold text-amber-800 uppercase tracking-wide">Total 24K Stock</p>
              </div>
              <div className="flex items-center justify-between gap-2 relative">
                <div>
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 leading-none">
                    {fmt(stockData.stock24K)}
                    <span className="text-base md:text-base font-semibold text-gray-500 ml-1">g</span>
                  </p>
                </div>
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow">
                  <Landmark className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Procurement History ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">

            {/* Desktop Filter Bar */}
            <div className="hidden md:flex flex-col gap-2 px-4 pt-3 pb-2.5 border-b border-gray-100 bg-gray-50/60">

              {/* Row 1 — Title + Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <h3 className="font-semibold text-gray-900 text-base whitespace-nowrap">All Entries</h3>
                  {procurementEntries.length > 0 && (
                    <span className="text-base font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {procurementEntries.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={openModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg text-[13px] font-bold shadow shadow-amber-400/30 hover:shadow-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Procurement
                </button>
              </div>

              {/* Row 2 — Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[160px] max-w-[220px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customer, invoice…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none bg-white font-medium"
                  />
                </div>

                {/* Customer */}
                <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}
                  className="flex-1 min-w-[130px] max-w-[180px] text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 outline-none font-medium">
                  <option value="">All Customers</option>
                  {customerOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Purity */}
                <select value={filterPurity} onChange={e => setFilterPurity(e.target.value)}
                  className="flex-1 min-w-[110px] max-w-[150px] text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 outline-none font-medium">
                  <option value="">All Purity</option>
                  <option value="99.90%">99.90%</option>
                  <option value="99.50%">99.50%</option>
                </select>

                {/* Location */}
                <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
                  className="flex-1 min-w-[130px] max-w-[180px] text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 outline-none font-medium">
                  <option value="">All Locations</option>
                  {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>

                {/* Date */}
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="flex-1 min-w-[140px] max-w-[170px] text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 outline-none font-medium"
                />

                {/* Clear */}
                {hasFilters && (
                  <button onClick={clearFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap">
                    <X className="w-3 h-3" /> Clear Filters
                  </button>
                )}
              </div>
            </div>


            {/* Mobile Header Bar */}
            <div className="md:hidden flex flex-col gap-3 px-4 py-3 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-gray-900 text-base">All Entries</h3>
                </div>
                <button onClick={openModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg text-base font-bold shadow-md shadow-amber-400/20">
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers, invoice..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none bg-gray-50/50"
                />
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-base table-fixed">
                  <colgroup>
                    <col className="w-24" /><col className="w-36" /><col className="w-32" /><col className="w-28" /><col className="w-20" /><col className="w-32" /><col className="w-32" /><col className="w-32" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      {["Serial No", "Customer Name", "Invoice Number", "Gross Weight", "Purity %", "Storage Location", "Date", "Assay Certification"].map((h) => (
                        <th key={h} className="px-4 py-3 text-center text-base font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {/* Syncing Loader Row */}
                    {isSyncing && (
                      <tr>
                        <td colSpan={8} className="py-2.5 bg-amber-50/50 border-b border-amber-100">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin"></div>
                            <span className="text-[13px] font-bold text-amber-800">Saving Data...</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-14 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="w-8 h-8 text-gray-300" />
                            <p className="text-base font-medium text-gray-500">No entries found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry) => (
                        <tr key={entry.serialNo} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-800 text-[12px] rounded-full">{entry.serialNo}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-900">{entry.customerName}</td>
                          <td className="px-4 py-3 text-center text-gray-600 font-mono text-base">{entry.invoiceNumber}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-amber-700">{entry.grossWeight}</span>
                            <span className="text-gray-400 text-base ml-0.5">g</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-800 text-base rounded-full">{entry.purity}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">{entry.storageLocation}</td>
                          <td className="px-4 py-3 text-center text-gray-500 text-base">{entry.date}</td>
                          <td className="px-4 py-3 text-center">
                            {entry.assayFileUrl ? (
                              <a
                                href={entry.assayFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-base"
                              >
                                <Eye className="w-3 h-3" /> View
                              </a>
                            ) : <span className="text-base text-gray-400">—</span>}
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
                  <div className="flex items-center justify-center gap-2 py-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin"></div>
                    <span className="text-[13px] font-bold text-amber-800">Saving to Sheet...</span>
                  </div>
                )}
                {filteredEntries.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-gray-300" />
                    <p className="text-gray-500 text-base">No entries found</p>
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <div key={entry.serialNo} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[12px] font-bold rounded-full">{entry.serialNo}</span>
                        <span className="text-[12px] text-gray-400">{entry.date}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">{entry.customerName}</h4>
                        <p className="text-base text-gray-500 font-mono mt-0.5">{entry.invoiceNumber}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-[12px] uppercase text-gray-400 font-bold">Weight</p>
                          <p className="text-base font-bold text-amber-700">{entry.grossWeight}g</p>
                        </div>
                        <div>
                          <p className="text-[12px] uppercase text-gray-400 font-bold">Purity</p>
                          <p className="text-base font-bold text-gray-900">{entry.purity}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-[13px] text-gray-600">
                          <Landmark className="w-3 h-3" /> {entry.storageLocation}
                        </div>
                        {entry.assayFileUrl && (
                          <a
                            href={entry.assayFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[13px] text-blue-600 font-bold"
                          >
                            <Eye className="w-3 h-3" /> Assay
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Modal ── */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">New Procurement Entry</h3>
                      <p className="text-base text-gray-500">Fill in the details to record gold procurement</p>
                    </div>
                  </div>
                  <button onClick={closeModal} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="p-4 space-y-3" autoComplete="off">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-base font-semibold text-gray-700 mb-1">Customer Name *</label>
                      <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} required autoFocus placeholder="Enter customer name" className="w-full px-3 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-700 mb-1">Invoice Number *</label>
                      <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} required placeholder="INV-XXXX" className="w-full px-3 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-700 mb-1">Gross Weight (g) *</label>
                      <input type="number" name="grossWeight" value={formData.grossWeight} onChange={handleChange} required step="0.01" min="0.01" placeholder="0.000" className="w-full px-3 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-700 mb-1">Purity % *</label>
                      <select name="purity" value={formData.purity} onChange={handleChange} required className="w-full px-3 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                        <option value="99.9">99.9% (24K)</option>
                        <option value="99.5">99.5% (24K)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-700 mb-1">Storage Location *</label>
                      <select name="storageLocation" value={formData.storageLocation} onChange={handleChange} required className="w-full px-3 py-2 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                        <option value="">Select location</option>
                        {storageLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-700 mb-1">Date</label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 text-base font-medium flex items-center justify-between">
                        <span>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Assay Upload */}
                  <div>
                    <label className="block text-base font-semibold text-gray-700 mb-1">Assay Certificate (Optional)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center hover:border-amber-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <input ref={fileInputRef} type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                      <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      {assayFile ? <p className="text-base font-semibold text-amber-700">{assayFile.name}</p> : <p className="text-base text-gray-400">Click to upload (PDF, JPG, PNG)</p>}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={closeModal} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl text-base font-semibold hover:bg-gray-50">Cancel</button>

                    {/* <button type="submit" className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl text-base font-bold shadow-lg shadow-amber-500/30">Approve & Record</button> */}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex-1 py-2 rounded-xl text-base font-bold shadow-lg transition-all
    ${isSubmitting
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
                        "Approve & Record"
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

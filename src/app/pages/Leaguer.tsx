import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { 
  Loader2, 
  Search, 
  RefreshCw, 
  BookOpen, 
  User, 
  ChevronRight, 
  X,
  FileText,
  Scale,
  Activity
} from "lucide-react";

interface KarigarSummary {
  karigarName: string;
  meltingType: string;
  // 22K Columns
  die22K: number;
  chain22K: number;
  taar22K: number;
  kdm22K: number;
  // 20K Columns
  die20K: number;
  chain20K: number;
  taar20K: number;
  kdm20K: number;
  // 18K Columns
  die18K: number;
  chain18K: number;
  taar18K: number;
  kdm18K: number;
  
  totalIssue: number;
  totalReturn: number;
  totalAvailable: number;
  records: any[];
}

export const Leaguer = () => {
  const { karigarLedger, karigarMainWeights, fetchAllData } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedKarigar, setSelectedKarigar] = useState<KarigarSummary | null>(null);

  // Modal Filters
  const [modalOrderSearch, setModalOrderSearch] = useState("");
  const [modalIssueDate, setModalIssueDate] = useState("");
  const [modalExpectedDate, setModalExpectedDate] = useState("");

  const handleRefresh = async () => {
    setLoading(true);
    await fetchAllData(true);
    setLoading(false);
  };

  // Process data to get summary rows based on Main Calculation entries
  const summaryData = useMemo(() => {
    // First, pre-calculate ledger sums for each unique Karigar across all melting types
    const ledgerSums: Record<string, { 
      die22K: number; chain22K: number; taar22K: number; kdm22K: number;
      die20K: number; chain20K: number; taar20K: number; kdm20K: number;
      die18K: number; chain18K: number; taar18K: number; kdm18K: number;
      records: any[] 
    }> = {};
    
    karigarLedger.forEach((entry) => {
      const type = String(entry.meltingType || "").toUpperCase();
      const name = entry.karigarName || "Unknown";
      
      if (!ledgerSums[name]) {
        ledgerSums[name] = { 
          die22K: 0, chain22K: 0, taar22K: 0, kdm22K: 0,
          die20K: 0, chain20K: 0, taar20K: 0, kdm20K: 0,
          die18K: 0, chain18K: 0, taar18K: 0, kdm18K: 0,
          records: [] 
        };
      }
      
      const sums = ledgerSums[name];
      const dieVal = parseFloat(entry.die) || 0;
      const chainVal = parseFloat(entry.chain) || 0;
      const taarVal = parseFloat(entry.taar) || 0;
      const kdmVal = parseFloat(entry.kdm) || 0;

      if (type.includes("22K")) {
        sums.die22K += dieVal;
        sums.chain22K += chainVal;
        sums.taar22K += taarVal;
        sums.kdm22K += kdmVal;
      } else if (type.includes("20K")) {
        sums.die20K += dieVal;
        sums.chain20K += chainVal;
        sums.taar20K += taarVal;
        sums.kdm20K += kdmVal;
      } else if (type.includes("18K")) {
        sums.die18K += dieVal;
        sums.chain18K += chainVal;
        sums.taar18K += taarVal;
        sums.kdm18K += kdmVal;
      }
      
      // Store record if it matches any of the types for drilldown
      if (type.includes("22K") || type.includes("20K") || type.includes("18K")) {
        sums.records.push(entry);
      }
    });

    // Create a row for every entry in karigarMainWeights
    return karigarMainWeights.map((mainEntry, idx) => {
      const name = mainEntry.karigarName;
      // Find the corresponding ledger sums (case-insensitive)
      const ledgerKey = Object.keys(ledgerSums).find(k => k.toLowerCase() === name.toLowerCase()) || "";
      const sums = ledgerSums[ledgerKey] || { 
        die22K: 0, chain22K: 0, taar22K: 0, kdm22K: 0,
        die20K: 0, chain20K: 0, taar20K: 0, kdm20K: 0,
        die18K: 0, chain18K: 0, taar18K: 0, kdm18K: 0,
        records: [] 
      };

      return {
        id: `row-${idx}`,
        karigarName: name,
        meltingType: "MULTI", // Multiple types summarized
        die22K: sums.die22K,
        chain22K: sums.chain22K,
        taar22K: sums.taar22K,
        kdm22K: sums.kdm22K,
        die20K: sums.die20K,
        chain20K: sums.chain20K,
        taar20K: sums.taar20K,
        kdm20K: sums.kdm20K,
        die18K: sums.die18K,
        chain18K: sums.chain18K,
        taar18K: sums.taar18K,
        kdm18K: sums.kdm18K,
        totalIssue: mainEntry.totalIssue,
        totalReturn: mainEntry.totalReturn,
        totalAvailable: mainEntry.totalAvailable,
        records: sums.records,
      };
    }).sort((a, b) => a.karigarName.localeCompare(b.karigarName));
  }, [karigarLedger, karigarMainWeights]);

  const filteredSummary = useMemo(() => {
    if (!searchTerm.trim()) return summaryData;
    const term = searchTerm.toLowerCase();
    return summaryData.filter((s) => 
      s.karigarName.toLowerCase().includes(term)
    );
  }, [summaryData, searchTerm]);

  // Modal Filtered Records
  const filteredModalRecords = useMemo(() => {
    if (!selectedKarigar) return [];
    return selectedKarigar.records.filter(record => {
      const matchesOrder = record.orderNo.toLowerCase().includes(modalOrderSearch.toLowerCase());
      
      const normalizeDate = (d: any) => {
        if (!d) return "";
        try {
          const dateObj = new Date(d);
          if (isNaN(dateObj.getTime())) return String(d).trim();
          
          // Use local date components to avoid timezone shifts from toISOString()
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (e) {
          return String(d).trim();
        }
      };

      const recordIssueDate = normalizeDate(record.updatedAt);
      const matchesIssueDate = !modalIssueDate || recordIssueDate === modalIssueDate;
      
      const recordExpectedDate = normalizeDate(record.expectedDeliveryDate);
      const matchesExpectedDate = !modalExpectedDate || recordExpectedDate === modalExpectedDate;

      return matchesOrder && matchesIssueDate && matchesExpectedDate;
    });
  }, [selectedKarigar, modalOrderSearch, modalIssueDate, modalExpectedDate]);

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Karigar Leaguer</h1>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">22K Metal Summary Report</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Karigar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent w-full md:w-64 transition-all outline-none"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="overflow-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-4 text-left text-[11px] font-black text-gray-500 uppercase tracking-[0.1em] sticky left-0 bg-gray-50 z-30 whitespace-nowrap">Karigar Name</th>
                  
                  {/* 22K Group */}
                  <th className="px-4 py-4 text-right text-[11px] font-black text-blue-600 uppercase tracking-[0.1em] whitespace-nowrap">22K Die</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-blue-600 uppercase tracking-[0.1em] whitespace-nowrap">22K Chain</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-blue-600 uppercase tracking-[0.1em] whitespace-nowrap">22K Taar</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-blue-600 uppercase tracking-[0.1em] whitespace-nowrap">22K KDM</th>
                  
                  {/* 20K Group */}
                  <th className="px-4 py-4 text-right text-[11px] font-black text-purple-600 uppercase tracking-[0.1em] whitespace-nowrap">20K Die</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-purple-600 uppercase tracking-[0.1em] whitespace-nowrap">20K Chain</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-purple-600 uppercase tracking-[0.1em] whitespace-nowrap">20K Taar</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-purple-600 uppercase tracking-[0.1em] whitespace-nowrap">20K KDM</th>
                  
                  {/* 18K Group */}
                  <th className="px-4 py-4 text-right text-[11px] font-black text-indigo-600 uppercase tracking-[0.1em] whitespace-nowrap">18K Die</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-indigo-600 uppercase tracking-[0.1em] whitespace-nowrap">18K Chain</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-indigo-600 uppercase tracking-[0.1em] whitespace-nowrap">18K Taar</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-indigo-600 uppercase tracking-[0.1em] whitespace-nowrap">18K KDM</th>

                  <th className="px-4 py-4 text-right text-[11px] font-black text-blue-700 uppercase tracking-[0.1em] whitespace-nowrap">Total Issue</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-emerald-700 uppercase tracking-[0.1em] whitespace-nowrap">Total Return</th>
                  <th className="px-4 py-4 text-right text-[11px] font-black text-amber-700 uppercase tracking-[0.1em] whitespace-nowrap">Available Balance</th>
                  <th className="px-4 py-4 text-center text-[11px] font-black text-gray-500 uppercase tracking-[0.1em]">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && summaryData.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Compiling Leaguer Data...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredSummary.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                          <Activity className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-base font-bold text-gray-400">No leaguer records found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSummary.map((summary, idx) => (
                    <tr 
                      key={idx} 
                      className="group hover:bg-amber-50/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedKarigar(summary);
                        setModalOrderSearch("");
                        setModalIssueDate("");
                        setModalExpectedDate("");
                      }}
                    >
                      <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white group-hover:bg-amber-50 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-gray-900">{summary.karigarName}</span>
                        </div>
                      </td>
                      
                      {/* 22K Values */}
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.die22K.toFixed(3)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.chain22K.toFixed(3)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.taar22K.toFixed(3)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.kdm22K.toFixed(3)}</td>

                      {/* 20K Values */}
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.die20K.toFixed(3)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.chain20K.toFixed(3)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.taar20K.toFixed(3)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.kdm20K.toFixed(3)}</td>

                      {/* 18K Values */}
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.die18K.toFixed(3)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.chain18K.toFixed(3)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.taar18K.toFixed(3)}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-600">{summary.kdm18K.toFixed(3)}</td>

                      <td className="px-4 py-4 text-right font-black text-blue-700">
                        {summary.totalIssue.toFixed(3)}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-emerald-700">
                        {summary.totalReturn.toFixed(3)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-block px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-black">
                          {summary.totalAvailable.toFixed(3)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center">
                          <button className="p-1.5 hover:bg-amber-200 rounded-lg transition-colors text-amber-600">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedKarigar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-none">{selectedKarigar.karigarName}</h2>
                  <p className="text-xs text-white/80 mt-1 font-medium">Detailed Transaction History (22K)</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedKarigar(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Filters Strip */}
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Order No.</label>
                <select
                  value={modalOrderSearch}
                  onChange={(e) => setModalOrderSearch(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none transition-all appearance-none cursor-pointer font-bold text-gray-700 shadow-sm"
                >
                  <option value="">All Orders</option>
                  {Array.from(new Set(selectedKarigar.records.map(r => r.orderNo))).sort().map(orderNo => (
                    <option key={orderNo} value={orderNo}>{orderNo}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Issue Date</label>
                <input
                  type="date"
                  value={modalIssueDate}
                  onChange={(e) => setModalIssueDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold text-gray-700 shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Expected Date</label>
                <input
                  type="date"
                  value={modalExpectedDate}
                  onChange={(e) => setModalExpectedDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold text-gray-700 shadow-sm"
                />
              </div>
              <div className="pb-0.5">
                <button
                  onClick={() => {
                    setModalOrderSearch("");
                    setModalIssueDate("");
                    setModalExpectedDate("");
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-2"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left font-black text-gray-400 uppercase tracking-widest text-[10px]">Order No</th>
                    <th className="pb-3 text-left font-black text-gray-400 uppercase tracking-widest text-[10px]">Melting Type</th>
                    <th className="pb-3 text-left font-black text-gray-400 uppercase tracking-widest text-[10px]">Issue Date</th>
                    <th className="pb-3 text-left font-black text-gray-400 uppercase tracking-widest text-[10px]">Expected Date</th>
                    <th className="pb-3 text-right font-black text-gray-400 uppercase tracking-widest text-[10px]">Issue Weight</th>
                    <th className="pb-3 text-right font-black text-gray-400 uppercase tracking-widest text-[10px]">Ghat Jama</th>
                    <th className="pb-3 text-right font-black text-gray-400 uppercase tracking-widest text-[10px]">Ghat Wastage</th>
                    <th className="pb-3 text-right font-black text-gray-400 uppercase tracking-widest text-[10px]">Total Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredModalRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Activity className="w-8 h-8 text-gray-200" />
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No matching transactions found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredModalRecords.map((record, rIdx) => (
                      <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 font-bold text-blue-600 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          {record.orderNo}
                        </td>
                        <td className="py-4 font-black text-gray-600 text-[10px]">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200">
                            {record.meltingType || "-"}
                          </span>
                        </td>
                        <td className="py-4 text-gray-500 font-bold whitespace-nowrap">
                          {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-4 text-gray-500 font-bold whitespace-nowrap">
                          {record.expectedDeliveryDate ? (
                            isNaN(Date.parse(record.expectedDeliveryDate)) 
                              ? record.expectedDeliveryDate 
                              : new Date(record.expectedDeliveryDate).toLocaleDateString()
                          ) : "-"}
                        </td>
                        <td className="py-4 text-right font-bold text-blue-600">
                          {parseFloat(record.totalWeight || 0).toFixed(3)}g
                        </td>
                        <td className="py-4 text-right font-bold text-emerald-600">
                          {parseFloat(record.ghatJamaWeight || 0).toFixed(3)}g
                        </td>
                        <td className="py-4 text-right font-bold text-orange-600">
                          {parseFloat(record.ghatWastage || 0).toFixed(3)}g
                        </td>
                        <td className="py-4 text-right font-black text-gray-900">
                          <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg">
                            <Scale className="w-3 h-3 text-gray-400" />
                            {parseFloat(record.totalWeight || 0).toFixed(3)}g
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedKarigar(null)}
                className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all shadow-sm active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

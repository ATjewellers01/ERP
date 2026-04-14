import { useEffect, useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { fetchSheet, invalidateCache } from "../services/api";
import { Loader2, Search, RefreshCw } from "lucide-react";

interface KarigarReceiptRow {
  orderNo: string;
  totalWeight: string;
  meltingType: string;
  karigarName: string;
  expectedDelivery: string;
  authorizedBy: string;
  voucherNumber: string;
  pcs: string;
  ghatJamaWeight: string;
  ghatMelting: string;
  ghatWastage: string;
  fineWeight: string;
}

export const KarigarReceipt = () => {
  const { user } = useApp();
  const [receipts, setReceipts] = useState<KarigarReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async (force = false) => {
    try {
      setLoading(true);
      if (force) {
        invalidateCache("Karigar Issue");
      }

      const result = await fetchSheet("Karigar Issue", force);

      if (result.success && result.data) {
        const rows = result.data.slice(1); // Skip header row

        const formatted: KarigarReceiptRow[] = rows
          .filter((row: any) => row[13] && String(row[13]).trim() !== "") // Column N is not null/empty
          .map((row: any) => {
            // Format Expected Delivery date from ISO string to YYYY-MM-DD
            let expectedDelivery = String(row[5] || "");
            if (expectedDelivery && expectedDelivery.includes("T")) {
              expectedDelivery = expectedDelivery.split("T")[0];
            }

            return {
              orderNo: String(row[1] || ""),           // Column B
              totalWeight: String(row[2] || ""),       // Column C
              meltingType: String(row[3] || ""),       // Column D
              karigarName: String(row[4] || ""),       // Column E
              expectedDelivery: expectedDelivery,      // Column F - Formatted
              authorizedBy: String(row[6] || ""),      // Column G
              voucherNumber: String(row[15] || ""),    // Column P
              pcs: String(row[16] || ""),              // Column Q
              ghatJamaWeight: String(row[17] || ""),   // Column R
              ghatMelting: String(row[18] || ""),      // Column S
              ghatWastage: String(row[19] || ""),      // Column T
              fineWeight: String(row[20] || ""),       // Column U
            };
          });

        setReceipts(formatted);
      }
    } catch (error) {
      console.error("Error fetching karigar receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const filteredReceipts = useMemo(() => {
    if (!searchTerm.trim()) return receipts;
    const term = searchTerm.toLowerCase();
    return receipts.filter(
      (r) =>
        r.orderNo.toLowerCase().includes(term) ||
        r.karigarName.toLowerCase().includes(term) ||
        r.voucherNumber.toLowerCase().includes(term) ||
        r.meltingType.toLowerCase().includes(term)
    );
  }, [receipts, searchTerm]);

  const totalPcs = useMemo(
    () =>
      filteredReceipts.reduce((sum, r) => sum + (parseFloat(r.pcs) || 0), 0),
    [filteredReceipts]
  );

  const totalFineWeight = useMemo(
    () =>
      filteredReceipts.reduce(
        (sum, r) => sum + (parseFloat(r.fineWeight) || 0),
        0
      ),
    [filteredReceipts]
  );

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 md:py-5">
        <div className="flex items-start md:items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">KR</span>
              </span>
              Karigar Receipt
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track received items from Karigar Issue
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-600 font-medium">Total Entries</p>
            <p className="text-xl font-bold text-blue-900 mt-1">
              {filteredReceipts.length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-xs text-green-600 font-medium">Total Pcs</p>
            <p className="text-xl font-bold text-green-900 mt-1">
              {totalPcs.toFixed(0)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg px-4 py-3">
            <p className="text-xs text-purple-600 font-medium">Fine Weight</p>
            <p className="text-xl font-bold text-purple-900 mt-1">
              {totalFineWeight.toFixed(3)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg px-4 py-3">
            <p className="text-xs text-orange-600 font-medium">Search</p>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Order, Karigar..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1">
          {/* Desktop Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="hidden md:table w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Order No.
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Total Weight
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Melting Type
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Karigar Name
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Expected Delivery
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Authorized By
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Voucher Number
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Pcs
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Ghat Jama
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Ghat Melting
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Ghat Wastage
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Fine Weight
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                        <p className="text-sm text-gray-500">
                          Loading receipts...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-16 text-center">
                      <p className="text-sm text-gray-500">
                        {searchTerm
                          ? "No receipts match your search"
                          : "No receipts found"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((receipt, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-amber-50/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {receipt.orderNo}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {receipt.totalWeight}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md">
                          {receipt.meltingType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {receipt.karigarName}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {receipt.expectedDelivery}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">
                        {receipt.authorizedBy}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">
                          {receipt.voucherNumber || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">
                        {receipt.pcs || "0"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {receipt.ghatJamaWeight || "0"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {receipt.ghatMelting || "0"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {receipt.ghatWastage || "0"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-purple-700">
                        {receipt.fineWeight || "0"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex-1 overflow-auto p-3 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-sm text-gray-500">Loading receipts...</p>
              </div>
            ) : filteredReceipts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-gray-500">
                  {searchTerm ? "No receipts match your search" : "No receipts found"}
                </p>
              </div>
            ) : (
              filteredReceipts.map((receipt, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-4 border-2 border-amber-200 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-base">
                        {receipt.orderNo || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {receipt.karigarName}
                      </p>
                    </div>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">
                      {receipt.voucherNumber || "N/A"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Melting Type</p>
                      <p className="font-medium text-gray-900">
                        {receipt.meltingType}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Weight</p>
                      <p className="font-medium text-gray-900">
                        {receipt.totalWeight}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expected Delivery</p>
                      <p className="font-medium text-gray-900">
                        {receipt.expectedDelivery}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Authorized By</p>
                      <p className="font-medium text-gray-900">
                        {receipt.authorizedBy}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Pcs</p>
                        <p className="font-bold text-gray-900 text-sm">
                          {receipt.pcs || "0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">
                          Ghat Jama
                        </p>
                        <p className="font-semibold text-gray-900 text-xs">
                          {receipt.ghatJamaWeight || "0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">
                          Ghat Melt
                        </p>
                        <p className="font-semibold text-gray-900 text-xs">
                          {receipt.ghatMelting || "0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">
                          Fine
                        </p>
                        <p className="font-bold text-purple-700 text-sm">
                          {receipt.fineWeight || "0"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

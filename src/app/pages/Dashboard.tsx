import { useApp } from "../context/AppContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ShieldCheck,
  Package,
  Clock,
  CheckSquare,
  Activity,
  User,
  Zap,
  LayoutDashboard,
  ChevronRight,
  Database,
  ArrowUpRight,
  Target,
  FlaskConical,
  Scale
} from "lucide-react";
import { useState, useMemo } from "react";

export const Dashboard = () => {
  const { user, stockData, jobs } = useApp();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Derive Real-Time Data from Jobs
  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const pendingJobs = jobs.filter(j => j.stage === "Created").length;
    const completedJobs = jobs.filter(j => j.stage === "Completed").length;

    // Recovery by Department
    const depts = ["Die", "Taar", "Chain", "KDM"];
    const deptRecovery = depts.map(deptName => {
      const allReturns = jobs.flatMap(j => j.departments)
        .filter(d => d.dept === deptName && d.status === "Returned");

      const totalIssued = allReturns.reduce((sum, d) => sum + (d.issuedWeight || 0), 0);
      const totalReturned = allReturns.reduce((sum, d) => sum + (d.returnedWeight || 0), 0);

      return {
        name: deptName,
        recovery: totalIssued > 0 ? (totalReturned / totalIssued) * 100 : 0
      };
    }).filter(d => d.recovery > 0);

    // Karigar Rankings
    const karigarMap = new Map();
    jobs.flatMap(j => j.departments).forEach(d => {
      if (d.status === "Returned" && d.karigarAssigned) {
        const current = karigarMap.get(d.karigarAssigned) || { totalIssued: 0, totalReturned: 0, count: 0 };
        current.totalIssued += (d.issuedWeight || 0);
        current.totalReturned += (d.returnedWeight || 0);
        current.count += 1;
        karigarMap.set(d.karigarAssigned, current);
      }
    });

    const karigarRankings = Array.from(karigarMap.entries()).map(([name, data]) => ({
      name,
      recovery: data.totalIssued > 0 ? parseFloat(((data.totalReturned / data.totalIssued) * 100).toFixed(3)) : 0,
      jobs: data.count
    })).sort((a, b) => b.recovery - a.recovery);

    const topKarigars = karigarRankings.slice(0, 5);
    const bottomKarigars = [...karigarRankings].reverse().slice(0, 5);

    // Gold Issued Recently
    const goldIssuedRecently = jobs.flatMap(j => j.departments)
      .filter(d => d.status === "Issued")
      .map(d => ({
        dept: d.dept,
        weight: d.issuedWeight || 0,
        karigar: d.karigarAssigned,
        time: "Just now"
      })).slice(0, 4);

    // Dynamic Alerts
    const alerts = [];
    if (stockData.stock24K < 100) alerts.push({ type: "high", message: "Low Stock: 24K Gold critical level", time: "2m", severity: "high" });
    if (stockData.conversionLoss > 1.5) alerts.push({ type: "medium", message: "Efficiency Warning: High loss in KDM unit", time: "15m", severity: "medium" });

    return {
      totalJobs,
      pendingJobs,
      completedJobs,
      deptRecovery,
      topKarigars,
      bottomKarigars,
      goldIssuedRecently,
      alerts
    };
  }, [jobs, stockData]);

  const handleResetAllData = () => {
    window.location.reload();
  };

  const SummaryCard = ({ title, value, unit, icon: Icon, color, trend }: any) => (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-700 bg-${color}-600`} />
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${color}-50 text-${color}-600 group-hover:bg-${color}-600 group-hover:text-white transition-colors duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900 leading-none">
              {typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: value % 1 !== 0 ? 3 : 0, maximumFractionDigits: 3 }) : value}
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase">{unit}</span>
          </div>
        </div>
      </div>
    
    </div>
  );

  const isAdmin = user?.role === "Admin";

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-57px-28px-2rem)] md:h-[calc(100vh-57px-28px-3rem)]">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 px-1">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">
              {isAdmin ? "Factory Control Tower" : "Department Hub"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                <User className="w-2.5 h-2.5" />
                {user?.username}
              </span>
              <span className="text-[10px] text-gray-400 font-bold italic">• Real-time metal telemetry</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-4 py-2 text-right border-r border-gray-50">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Global Purity</p>
            <p className="text-xs font-black text-emerald-600">99.99% <span className="text-[8px] text-gray-400">Target</span></p>
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="p-3 hover:bg-rose-50 hover:text-rose-600 text-gray-400 rounded-xl transition-all duration-300"
            title="Emergency System Clear"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Primary Scrollable Dashboard Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-12">

        {/* Row 1: High-Priority Stock Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Fine Gold (24K)" value={stockData.stock24K} unit="g" icon={Zap} color="amber" trend={-0.8} />
          <SummaryCard title="Production (22K)" value={stockData.stock22K} unit="g" icon={Package} color="blue" trend={1.2} />
          <SummaryCard title="Production (18K)" value={stockData.stock18K} unit="g" icon={Activity} color="indigo" trend={1.4} />
          <SummaryCard title="Wastage Pool" value={stockData.scrapBalance} unit="g" icon={Scale} color="emerald" trend={-5.6} />
        </div>

        {/* Row 2: Secondary Process Cards & Alert Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Process Pipeline Overview (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-around gap-4 group">
            <div className="text-center md:text-left">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Job Pipeline</h3>
              <p className="text-xl font-black text-gray-900">{stats.totalJobs} Active Orders</p>
            </div>
            <div className="h-px md:h-12 w-12 md:w-px bg-gray-100" />
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs mb-2 mx-auto">{stats.pendingJobs}</div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Queued</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-200 hidden md:block" />
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs mb-2 mx-auto">{stats.pendingJobs + stats.completedJobs > 0 ? stats.totalJobs - stats.pendingJobs - stats.completedJobs : 0}</div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In Progress</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-200 hidden md:block" />
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs mb-2 mx-auto">{stats.completedJobs}</div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ready</span>
              </div>
            </div>
            <div className="h-px md:h-12 w-12 md:w-px bg-gray-100" />
            <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
              View Full Queue
            </button>
          </div>

          {/* Live Alerts (4 cols) */}
          <div className="lg:col-span-4 bg-gray-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <AlertTriangle className="w-12 h-12 text-rose-500 animate-pulse" />
            </div>
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Urgent Dispatch</h3>
            <div className="space-y-3">
              {stats.alerts.length === 0 ? (
                <div className="flex items-center gap-3 text-emerald-400 py-4">
                  <CheckSquare className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest">No production blocks detected</span>
                </div>
              ) : (
                stats.alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl group/alert hover:bg-white/10 transition-all border border-white/5 hover:border-white/10">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-white leading-tight uppercase">{alert.message}</p>
                      <span className="text-[8px] font-bold text-gray-500 uppercase">{alert.time} ago</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Row 3: recovery Analytics & Recent Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Efficiency Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Department Efficiency</h3>
                <p className="text-lg font-black text-gray-900">Recovery Benchmarks</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Recovery %</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-rose-200 rounded-full" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Threshold</span>
                </div>
              </div>
            </div>
            <div className="flex-1 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.deptRecovery}>
                  <defs>
                    <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} dy={10} />
                  <YAxis domain={[94, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900, fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="recovery" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRec)" />
                  {/* Benchmark Reference Line */}
                  <Bar dataKey="recovery" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40}>
                    {stats.deptRecovery.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.recovery >= 98.3 ? "#10b981" : "#6366f1"} />
                    ))}
                  </Bar>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Ledger Logs */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Database className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight">Vault Issuance</h3>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-1">
              {stats.goldIssuedRecently.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale pt-12">
                  <Scale className="w-12 h-12 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center italic">Awaiting movement records...</p>
                </div>
              ) : (
                stats.goldIssuedRecently.map((item, i) => (
                  <div key={i} className="group/log relative pl-6 pb-4 last:pb-0 border-l border-gray-100 hover:border-indigo-400 transition-colors">
                    <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-white border-2 border-indigo-500 group-hover/log:scale-125 transition-transform" />
                    <div className="flex items-center justify-between group-hover/log:translate-x-1 transition-transform">
                      <div>
                        <p className="text-[11px] font-black text-gray-900 uppercase">{item.dept} Deployment</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User className="w-2.5 h-2.5 text-gray-300" />
                          <span className="text-[9px] font-bold text-gray-400 uppercase">{item.karigar || "Auto-Assign"}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-indigo-600">{item.weight.toFixed(3)}g</p>
                        <span className="text-[8px] font-black text-gray-300 uppercase">{item.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="mt-6 w-full py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
              Open Full Ledger
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Row 4: Talent performance Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Top Talent Spotlight */}
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 border border-indigo-500 shadow-xl shadow-indigo-200 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <FlaskConical className="w-32 h-32 rotate-12 group-hover:scale-125 transition-transform duration-700" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <h3 className="text-xs font-black text-indigo-100 uppercase tracking-widest mb-2">Elite Skill Matrix</h3>
                <p className="text-3xl font-black mb-6">Master Artistry<br />Performance</p>
                <div className="space-y-4">
                  {stats.topKarigars.slice(0, 3).map((k, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center font-black">#{i + 1}</div>
                        <div>
                          <p className="text-sm font-black uppercase tracking-tight">{k.name}</p>
                          <p className="text-[10px] font-bold text-indigo-200">{k.jobs} Perfect Refines</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black">{k.recovery}%</p>
                        <div className="w-24 h-1 bg-white/20 rounded-full mt-1">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${k.recovery}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {stats.topKarigars.length === 0 && <p className="text-xs font-bold text-indigo-300 italic py-8">Benchmarking artistry protocols...</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Optimization Required (Bottom 5) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col group">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-tighter">Variance Detection</h3>
                <p className="text-lg font-black text-gray-900">Optimization Targets</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {stats.bottomKarigars.slice(0, 4).map((k, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl hover:bg-rose-50/30 transition-colors border border-transparent hover:border-rose-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 tracking-tighter">#{i + 1}</div>
                    <p className="text-xs font-black text-gray-700 uppercase">{k.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">{k.recovery}% Efficiency</span>
                    <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-rose-300 transition-colors" />
                  </div>
                </div>
              ))}
              {stats.bottomKarigars.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center pt-8 text-center">
                  <CheckSquare className="w-10 h-10 text-emerald-200 mb-3" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global efficiency targets met</p>
                </div>
              )}
            </div>
            <button className="mt-6 w-full py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest border border-gray-100 rounded-2xl hover:border-rose-200 hover:text-rose-600 transition-all">
              Initiate Audit Review
            </button>
          </div>
        </div>

      </div>

      {/* Emergency Reset Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in duration-300 border border-gray-100">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-3xl bg-rose-50 text-rose-600 mb-6 shadow-xl shadow-rose-100 rotate-12">
              <RotateCcw className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Master Override?</h3>
            <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
              You are about to initiate a <span className="text-rose-600 font-bold uppercase tracking-tight underline">protocol zero reset</span>. All ledger history, vaults, and job states will be permanently purged.
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full bg-gray-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 active:scale-95 transition-all"
                onClick={handleResetAllData}
              >
                Confirm Deletion
              </button>
              <button
                className="w-full bg-white text-gray-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100 hover:bg-gray-50 transition-all"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
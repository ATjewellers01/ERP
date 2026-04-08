import { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router";
import { useApp } from "../context/AppContext";
import {
  LayoutDashboard,
  Package,
  Flame,
  ClipboardList,
  ArrowRightLeft,
  ArrowLeftRight,
  UserCheck,
  FileText,
  LogOut,
  Menu,
  X,
  Gem,
  Settings,
  KeyRound,
} from "lucide-react";

export const Layout = () => {
  const { user, logout, isAuthLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navigation = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      roles: ["Admin", "Production Head", "Dept Manager", "Karigar", "QC", "user"],
    },
    {
      name: "24k Metal Stock",
      path: "/procurement",
      icon: Package,
      roles: ["Admin", "Production Head", "user"],
    },
    {
      name: "Alloy Conversion",
      path: "/alloy-conversion",
      icon: Flame,
      roles: ["Admin", "Production Head", "user"],
    },
    {
      name: "Production Planning",
      path: "/job-creation",
      icon: ClipboardList,
      roles: ["Admin", "Production Head", "Dept Manager", "user"],
    },
    {
      name: "Department Issue",
      path: "/department-issue",
      icon: ArrowRightLeft,
      roles: ["Admin", "Production Head", "Dept Manager", "user"],
    },
    {
      name: "Department Receipt",
      path: "/department-return",
      icon: ArrowLeftRight,
      roles: ["Admin", "Production Head", "Dept Manager", "Karigar", "user"],
    },
    {
      name: "Karigar Issue",
      path: "/karigar-issue",
      icon: UserCheck,
      roles: ["Admin", "Production Head", "Dept Manager", "user"],
    },
    {
      name: "Stock Summary",
      path: "/stock-summary",
      icon: FileText,
      roles: ["Admin", "Production Head", "Dept Manager", "user"],
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
      roles: ["Admin", "user"],
    },
    {
      name: "License",
      path: "/license",
      icon: KeyRound,
      roles: ["Admin", "Production Head", "Dept Manager", "Karigar", "QC", "user"],
    },
  ];

  const allowedNavigation = navigation.filter((item) => {
    if (!user) return false;
    const hasRole = item.roles.includes(user.role);
    const hasPageAccess =
      user.pageAccess.includes("All") || user.pageAccess.includes(item.name);
    return hasRole && hasPageAccess;
  });

  // Bottom tab bar shows first 5 allowed items
  const bottomTabs = allowedNavigation.slice(0, 5);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Global Loading Overlay ────────────────────── */}
      {isAuthLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-md transition-all duration-500">
          <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-amber-100 rounded-full" />
              <div className="absolute inset-0 w-24 h-24 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                  <Gem className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight uppercase">Initializing ERP</h2>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-widest animate-pulse">Syncing Secure Data...</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          {/* Left: Hamburger (mobile) + Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Gem className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-semibold text-gray-900 leading-tight">
                  AT PLUS ERP
                </h1>
                <p className="text-xs text-gray-500">Handmade Jewellery Unit</p>
              </div>
            </div>
          </div>

          {/* Right: User info + Logout */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar Overlay ────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeSidebar}
          />

          {/* Drawer */}
          <aside className="absolute top-0 left-0 h-full w-72 bg-white shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center">
                  <Gem className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">AT PLUS ERP</p>
                  <p className="text-xs text-gray-500">Handmade Jewellery Unit</p>
                </div>
              </div>
              <button
                onClick={closeSidebar}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User badge */}
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
              <p className="text-sm font-semibold text-amber-900">{user?.username}</p>
              <p className="text-xs text-amber-700">{user?.role}</p>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {allowedNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${isActive
                      ? "bg-amber-500 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Logout at bottom */}
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 h-[calc(100vh-57px-28px)] sticky top-[57px] self-start overflow-y-auto">
          <nav className="p-4 space-y-0.5">
            {allowedNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${isActive
                    ? "bg-amber-50 text-amber-900"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 min-w-0 overflow-y-auto h-[calc(100vh-57px-28px)] pb-10 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Tab Bar ─────────────────────── */}
      <nav className="md:hidden fixed bottom-7 left-0 right-0 z-40 bg-white border-t border-gray-200 flex">
        {bottomTabs.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${isActive ? "text-amber-600" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight text-center px-1 truncate w-full text-center">
                {item.name.split(" ")[0]}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-500 rounded-b-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Fixed Footer ─────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 h-7 flex items-center justify-center bg-white border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Powered by{" "}
          <a
            href="https://www.botivate.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-amber-600 hover:text-amber-700 hover:underline transition-colors"
          >
            Botivate
          </a>
        </p>
      </footer>
    </div>
  );
};
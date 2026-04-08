import { createBrowserRouter } from "react-router";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { GoldProcurement } from "./pages/GoldProcurement";
import { AlloyConversion } from "./pages/AlloyConversion";
import { JobCreation } from "./pages/JobCreation";
import { DepartmentIssue } from "./pages/DepartmentIssue";
import { KarigarIssue } from "./pages/KarigarIssue";
import { DepartmentReturn } from "./pages/DepartmentReturn";
import { StockSummary } from "./pages/StockSummary";
import { Settings } from "./pages/Settings";
import { License } from "./pages/License";
import { NotFound } from "./pages/NotFound";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootLayout } from "./components/RootLayout";

// Wrapper components to defer rendering until inside AppProvider
const DashboardPage = () => (
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
);

const ProcurementPage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "user"]}>
    <GoldProcurement />
  </ProtectedRoute>
);

const AlloyConversionPage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "user"]}>
    <AlloyConversion />
  </ProtectedRoute>
);

const JobCreationPage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager", "user"]}>
    <JobCreation />
  </ProtectedRoute>
);

const DepartmentIssuePage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager", "user"]}>
    <DepartmentIssue />
  </ProtectedRoute>
);

const KarigarIssuePage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager", "user"]}>
    <KarigarIssue />
  </ProtectedRoute>
);

const DepartmentReturnPage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager", "Karigar", "user"]}>
    <DepartmentReturn />
  </ProtectedRoute>
);

const StockSummaryPage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager", "user"]}>
    <StockSummary />
  </ProtectedRoute>
);

const SettingsPage = () => (
  <ProtectedRoute allowedRoles={["Admin", "user"]}>
    <Settings />
  </ProtectedRoute>
);

const LicensePage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager", "Karigar", "QC", "user"]}>
    <License />
  </ProtectedRoute>
);

// ERP Router Configuration - Using Component prop to defer evaluation
export const createRouter = () => createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      {
        index: true,
        Component: Login,
      },
      {
        Component: Layout,
        children: [
          {
            path: "dashboard",
            Component: DashboardPage,
          },
          {
            path: "procurement",
            Component: ProcurementPage,
          },
          {
            path: "alloy-conversion",
            Component: AlloyConversionPage,
          },
          {
            path: "job-creation",
            Component: JobCreationPage,
          },
          {
            path: "department-issue",
            Component: DepartmentIssuePage,
          },
          {
            path: "karigar-issue",
            Component: KarigarIssuePage,
          },
          {
            path: "department-return",
            Component: DepartmentReturnPage,
          },
          {
            path: "stock-summary",
            Component: StockSummaryPage,
          },
          {
            path: "settings",
            Component: SettingsPage,
          },
          {
            path: "license",
            Component: LicensePage,
          },
        ],
      },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
]);

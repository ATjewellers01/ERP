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
  <ProtectedRoute allowedRoles={["Admin", "Production Head"]}>
    <GoldProcurement />
  </ProtectedRoute>
);

const AlloyConversionPage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head"]}>
    <AlloyConversion />
  </ProtectedRoute>
);

const JobCreationPage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager"]}>
    <JobCreation />
  </ProtectedRoute>
);

const DepartmentIssuePage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager"]}>
    <DepartmentIssue />
  </ProtectedRoute>
);

const KarigarIssuePage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager"]}>
    <KarigarIssue />
  </ProtectedRoute>
);

const DepartmentReturnPage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager", "Karigar"]}>
    <DepartmentReturn />
  </ProtectedRoute>
);

const StockSummaryPage = () => (
  <ProtectedRoute allowedRoles={["Admin", "Production Head", "Dept Manager"]}>
    <StockSummary />
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
        ],
      },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
]);

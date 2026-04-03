// import { Navigate } from "react-router";
// import { useApp, UserRole } from "../context/AppContext";

// interface ProtectedRouteProps {
//   children: React.ReactNode;
//   allowedRoles?: UserRole[];
// }

// export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
//   children, 
//   allowedRoles 
// }) => {
//   const { user } = useApp();

//   if (!user) {
//     return <Navigate to="/" replace />;
//   }

//   if (allowedRoles && !allowedRoles.includes(user.role)) {
//     return <Navigate to="/dashboard" replace />;
//   }

//   return <>{children}</>;
// };

import { Navigate } from "react-router";
import { useApp, UserRole } from "../context/AppContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles
}) => {
  const { user, isAuthLoading } = useApp();

  if (isAuthLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
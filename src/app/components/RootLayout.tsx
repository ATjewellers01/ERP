import { Outlet } from "react-router";
import { Suspense } from "react";

// Root layout for all routes
export const RootLayout = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Outlet />
    </Suspense>
  );
};
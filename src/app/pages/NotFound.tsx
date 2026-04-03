import { useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-amber-100 rounded-full mb-6">
          <AlertTriangle className="w-12 h-12 text-amber-600" />
        </div>
        <h1 className="text-4xl font-semibold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-yellow-700 transition-all shadow-lg shadow-amber-500/30"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

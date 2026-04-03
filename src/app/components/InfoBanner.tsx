import { Info, X } from "lucide-react";
import { useState } from "react";

export const InfoBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-gradient-to-br from-amber-500 to-yellow-600 text-white rounded-xl shadow-2xl p-5 z-50 animate-in slide-in-from-bottom-5">
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold mb-2">Demo Credentials</p>
          <div className="text-sm space-y-1 opacity-90">
            <p>Username: <span className="font-mono">any username</span></p>
            <p>Password: <span className="font-mono">password</span></p>
            <p className="mt-2 pt-2 border-t border-white/30">
              Try different roles to see role-based access control in action!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

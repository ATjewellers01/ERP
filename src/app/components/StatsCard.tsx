import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  unit: string;
  change?: number;
  bgColor: string;
  icon?: React.ReactNode;
}

export const StatsCard = ({ 
  title, 
  value, 
  unit, 
  change, 
  bgColor,
  icon
}: StatsCardProps) => (
  <div className={`${bgColor} rounded-xl p-6 shadow-sm border border-gray-100 relative overflow-hidden`}>
    {icon && (
      <div className="absolute top-4 right-4 opacity-10">
        {icon}
      </div>
    )}
    <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
    <div className="flex items-baseline gap-2">
      <p className="text-3xl font-semibold text-gray-900">
        {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <span className="text-lg text-gray-600">{unit}</span>
    </div>
    {change !== undefined && (
      <div className="flex items-center gap-1 mt-2">
        {change >= 0 ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
        <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {Math.abs(change).toFixed(2)}%
        </span>
        <span className="text-xs text-gray-500 ml-1">vs last week</span>
      </div>
    )}
  </div>
);
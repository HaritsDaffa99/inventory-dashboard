"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Metric {
  label: string
  value: number | string
  change?: number
  trend?: "up" | "down" | "neutral"
}

interface StockLevel {
  name: string
  quantity: number
  date?: string
  id?: number | string
  // Additional properties with explicit types
  category?: string
  unit?: string
  status?: string
}

interface ExpiryItem {
  name: string
  quantity: number
  expiryDate: string
  id?: number | string
  // Additional properties with explicit types
  category?: string
  daysRemaining?: number
  batchNumber?: string
}

interface TopItem {
  id?: number | string
  name: string
  quantity: number
  usage?: number
  // Additional properties with explicit types
  category?: string
  lastRestocked?: string
  turnoverRate?: number
}

interface LowStockItem {
  id?: number | string
  name: string
  quantity: number
  minRequired?: number
  // Additional properties with explicit types
  category?: string
  daysUntilDepletion?: number
  reorderStatus?: string
}

interface ConditionItem {
  category: string
  value: number
  // Additional properties with explicit types
  percentage?: number
  count?: number
  label?: string
}

interface MovementItem {
  id?: number | string
  name: string
  date?: string
  quantity?: number
  type?: string
  // Additional properties with explicit types
  source?: string
  destination?: string
  status?: string
}

// Union types for flexible data structures
type MetricsData = Record<string, Metric> | Metric[] | Record<string, unknown>;
type StockLevelData = StockLevel[] | Record<string, StockLevel> | Record<string, unknown>;
type ExpiryData = ExpiryItem[] | Record<string, ExpiryItem> | Record<string, unknown>;
type TopItemData = TopItem[] | Record<string, TopItem> | Record<string, unknown>;
type LowStockData = LowStockItem[] | Record<string, LowStockItem> | Record<string, unknown>;
type ConditionData = ConditionItem[] | Record<string, ConditionItem> | Record<string, unknown>;
type MovementData = MovementItem[] | Record<string, MovementItem> | Record<string, unknown>;

interface DebugPanelProps {
  metrics: MetricsData;
  stockLevels?: StockLevelData;
  expiryData?: ExpiryData;
  topItems?: TopItemData;
  lowStockItems?: LowStockData;
  conditionData?: ConditionData;
  recentMovements?: MovementData;
}

export function UnitDebugPanel({
  metrics,
  stockLevels,
  expiryData,
  topItems,
  lowStockItems,
  conditionData,
  recentMovements
}: DebugPanelProps) {
  // Helper function to safely get length of any data structure
  const getDataLength = (data: unknown): string => {
    if (!data) return "❌ Missing";
    
    if (Array.isArray(data)) {
      return `✅ ${data.length} items`;
    }
    
    if (typeof data === 'object' && data !== null) {
      return `✅ ${Object.keys(data).length} keys`;
    }
    
    return "✅ 1 item";
  };

  // Detailed info about what data is actually loaded
  const dataInfo = {
    metrics: getDataLength(metrics),
    stockLevels: getDataLength(stockLevels),
    expiryData: getDataLength(expiryData),
    topItems: getDataLength(topItems),
    lowStockItems: getDataLength(lowStockItems),
    conditionData: getDataLength(conditionData),
    recentMovements: getDataLength(recentMovements)
  }

  // Get counts of loaded vs missing data
  const loadedCount = Object.values(dataInfo).filter(v => v.includes("✅")).length;
  const totalCount = Object.values(dataInfo).length;

  return (
    <Card className="border-2 border-amber-100">
      <CardHeader className="bg-amber-50 pb-2">
        <CardTitle className="text-sm">Debug: Data Load Status ({loadedCount}/{totalCount} loaded)</CardTitle>
      </CardHeader>
      <CardContent className="p-3 text-xs">
        <ul>
          {Object.entries(dataInfo).map(([key, value]) => (
            <li key={key} className={`mb-1 ${value.includes("❌") ? "text-red-600" : "text-green-600"}`}>
              <strong>{key}:</strong> {value}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
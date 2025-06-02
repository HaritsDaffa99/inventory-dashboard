"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Lightbulb, RefreshCw, Loader2, ChevronDown, ChevronUp, TrendingUp, ScrollText, CheckCircle } from "lucide-react"
import { getUnitInsights } from "@/lib/actions/unit-ai-insights"

interface Metric {
  label: string
  value: number | string
  change?: number
  trend?: "up" | "down" | "neutral"
}

interface InventoryItem {
  id: number
  name: string
  quantity: number
  category?: string
}

// Types that match what the unit detail page actually provides
interface ConditionDataItem {
  category?: string
  name?: string
  value?: number
  quantity?: number
  percentage?: number
}

interface ExpiryDataItem {
  id?: number
  name?: string
  expiryDate?: string
  quantity?: number
  daysUntilExpiry?: number
}

interface TopMedicineItem {
  id?: number
  name?: string
  quantity?: number
  value?: number
  usage?: number
}

interface LowStockItemInput {
  id?: number
  name?: string
  quantity?: number
  minRequired?: number
}

interface StockHistoryPoint {
  date: string
  quantity: number
  medicineId?: number
  medicineName?: string
}

// Types that the AI insights function expects
interface UnitMetrics {
  totalMedicines: number
  totalValue: number
  lowStockCount: number
  expiringCount: number
  averageConsumption: number
}

interface InventorySummary {
  totalItems: number
  totalValue: number
  categories: string[]
  averageStockLevel: number
}

interface ConditionData {
  condition: string
  count: number
  percentage: number
}

interface ExpiryData {
  medicineId: number
  medicineName: string
  expiryDate: string
  quantity: number
  daysUntilExpiry: number
}

interface TopMedicine {
  medicineId: number
  medicineName: string
  quantity: number
  value: number
}

interface LowStockItem {
  medicineId: number
  medicineName: string
  currentStock: number
  minimumStock: number
  deficit: number
}

interface StockHistoryEntry {
  date: string
  quantity: number
  medicineId: number
  medicineName: string
}

interface UnitAIInsightsPanelProps {
  unitId: number
  unitName: string
  metrics: Metric[]
  selectedMedicines: number[]
  inventorySummary?: InventoryItem[]
  conditionData?: ConditionDataItem[]  // Changed to accept actual input type
  stockHistory?: StockHistoryPoint[]
  expiryData?: ExpiryDataItem[]        // Changed to accept actual input type
  topMedicines?: TopMedicineItem[]     // Changed to accept actual input type
  lowStockItems?: LowStockItemInput[]  // Changed to accept actual input type
  isLoading?: boolean
}

interface InsightsData {
  summary: string
  keyPoints: string[]
  recommendations: string[]
  trends: string[]
}

export function UnitAIInsightsPanel({
  unitId,
  unitName,
  metrics,
  selectedMedicines,
  inventorySummary,
  conditionData,
  stockHistory,
  expiryData,
  topMedicines,
  lowStockItems,
  isLoading: externalLoading
}: UnitAIInsightsPanelProps) {
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Helper function to safely extract numeric values from metrics
  const getMetricValue = useCallback((label: string): number => {
    const metric = metrics.find(m => m.label.toLowerCase().includes(label.toLowerCase()))
    const value = metric?.value
    return typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) || 0 : 0)
  }, [metrics])

  // Memoize transformed metrics to prevent unnecessary recalculations
  const transformedMetrics = useMemo((): UnitMetrics => {
    return {
      totalMedicines: getMetricValue('total') || getMetricValue('medicine') || inventorySummary?.length || 0,
      totalValue: getMetricValue('value') || getMetricValue('stock value') || 0,
      lowStockCount: lowStockItems?.length || getMetricValue('low stock') || 0,
      expiringCount: expiryData?.length || getMetricValue('expiring') || 0,
      averageConsumption: getMetricValue('consumption') || getMetricValue('average') || 0,
    }
  }, [getMetricValue, inventorySummary?.length, lowStockItems?.length, expiryData?.length])

  // Memoize transformed inventory summary
  const transformedInventorySummary = useMemo((): InventorySummary | undefined => {
    if (!inventorySummary) return undefined
    
    return {
      totalItems: inventorySummary.length,
      totalValue: inventorySummary.reduce((sum, item) => sum + (item.quantity || 0), 0),
      categories: [...new Set(inventorySummary.map(item => item.category || 'Unknown').filter(Boolean))],
      averageStockLevel: inventorySummary.length > 0
        ? inventorySummary.reduce((sum, item) => sum + (item.quantity || 0), 0) / inventorySummary.length
        : 0
    }
  }, [inventorySummary])

  // Transform data to match expected types
  const transformConditionData = useCallback((items: ConditionDataItem[]): ConditionData[] => {
    return items.map(item => ({
      condition: item.category || item.name || 'Unknown',
      count: item.value || item.quantity || 0,
      percentage: item.percentage || 0
    }))
  }, [])

  const transformExpiryData = useCallback((items: ExpiryDataItem[]): ExpiryData[] => {
    return items.map(item => ({
      medicineId: item.id || 0,
      medicineName: item.name || 'Unknown Medicine',
      expiryDate: item.expiryDate || '',
      quantity: item.quantity || 0,
      daysUntilExpiry: item.daysUntilExpiry || 0
    }))
  }, [])

  const transformTopMedicines = useCallback((items: TopMedicineItem[]): TopMedicine[] => {
    return items.map(item => ({
      medicineId: item.id || 0,
      medicineName: item.name || 'Unknown Medicine',
      quantity: item.quantity || 0,
      value: item.value || item.usage || 0
    }))
  }, [])

  const transformLowStockItems = useCallback((items: LowStockItemInput[]): LowStockItem[] => {
    return items.map(item => ({
      medicineId: item.id || 0,
      medicineName: item.name || 'Unknown Medicine',
      currentStock: item.quantity || 0,
      minimumStock: item.minRequired || 0,
      deficit: (item.minRequired || 0) - (item.quantity || 0)
    }))
  }, [])

  const transformStockHistory = useCallback((items: StockHistoryPoint[]): StockHistoryEntry[] => {
    return items.map(item => ({
      date: item.date,
      quantity: item.quantity,
      medicineId: item.medicineId || 0,
      medicineName: item.medicineName || 'Unknown Medicine'
    }))
  }, [])

  // Define generateInsights with useCallback
  const generateInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const analysisData = {
        unitId,
        unitName,
        metrics: transformedMetrics,
        selectedMedicines,
        inventorySummary: transformedInventorySummary,
        conditionData: conditionData ? transformConditionData(conditionData) : undefined,
        stockHistory: stockHistory ? transformStockHistory(stockHistory) : undefined,
        expiryData: expiryData ? transformExpiryData(expiryData) : undefined,
        topMedicines: topMedicines ? transformTopMedicines(topMedicines) : undefined,
        lowStockItems: lowStockItems ? transformLowStockItems(lowStockItems) : undefined
      }

      const response = await getUnitInsights(analysisData)

      if (response.success && response.data) {
        setInsights(response.data)
        setLastRefreshed(new Date())
      } else {
        setError(response.error || "Failed to generate insights")
      }
    } catch (error) {
      console.error("Error generating unit insights:", error)
      setError("An error occurred while generating insights")
    } finally {
      setIsLoading(false)
    }
  }, [
    unitId,
    unitName,
    transformedMetrics,
    selectedMedicines,
    transformedInventorySummary,
    conditionData,
    stockHistory,
    expiryData,
    topMedicines,
    lowStockItems,
    transformConditionData,
    transformExpiryData,
    transformTopMedicines,
    transformLowStockItems,
    transformStockHistory
  ])

  // Generate insights when data changes or component mounts
  useEffect(() => {
    if (!externalLoading && metrics && metrics.length > 0) {
      generateInsights()
    }
  }, [metrics, selectedMedicines, unitId, externalLoading, generateInsights])

  function formatLastRefreshed() {
    if (!lastRefreshed) return ""
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(lastRefreshed)
  }

  return (
    <Card className="border-2 border-blue-50 shadow-md">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-white pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <CardTitle className="text-lg">Unit AI Insights: {unitName}</CardTitle>
              <CardDescription>Smart analysis of unit inventory data</CardDescription>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {lastRefreshed && (
              <span className="text-xs text-gray-500">
                Last updated: {formatLastRefreshed()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={generateInsights}
              disabled={isLoading}
              className="h-8 px-3"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Analyzing {unitName} inventory data...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 rounded-md text-red-800 text-sm">
              {error}
            </div>
          ) : insights ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Summary Section */}
                <div>
                  <div className="flex items-center mb-3">
                    <ScrollText className="h-4 w-4 text-blue-600 mr-2" />
                    <h4 className="font-semibold text-gray-800">Executive Summary</h4>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 p-3 rounded-md">
                    {insights.summary}
                  </p>
                </div>

                <Separator />

                {/* Key Points */}
                {insights.keyPoints && insights.keyPoints.length > 0 && (
                  <div>
                    <div className="flex items-center mb-3">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <h4 className="font-semibold text-gray-800">Key Findings</h4>
                    </div>
                    <ul className="space-y-2">
                      {insights.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-700">
                          <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Separator />

                {/* Trends */}
                {insights.trends && insights.trends.length > 0 && (
                  <div>
                    <div className="flex items-center mb-3">
                      <TrendingUp className="h-4 w-4 text-purple-600 mr-2" />
                      <h4 className="font-semibold text-gray-800">Trends & Patterns</h4>
                    </div>
                    <ul className="space-y-2">
                      {insights.trends.map((trend, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-700">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                          {trend}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Separator />

                {/* Recommendations */}
                {insights.recommendations && insights.recommendations.length > 0 && (
                  <div>
                    <div className="flex items-center mb-3">
                      <Lightbulb className="h-4 w-4 text-orange-600 mr-2" />
                      <h4 className="font-semibold text-gray-800">Recommendations</h4>
                    </div>
                    <ul className="space-y-2">
                      {insights.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-700">
                          <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Lightbulb className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 text-center">
                Click &quot;Refresh&quot; to generate AI insights for {unitName}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
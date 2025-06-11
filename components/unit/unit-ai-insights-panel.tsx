"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Lightbulb, RefreshCw, Loader2, ChevronDown, ChevronUp, TrendingUp, ScrollText, CheckCircle, Sparkles } from "lucide-react"
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
  conditionData?: ConditionDataItem[]
  stockHistory?: StockHistoryPoint[]
  expiryData?: ExpiryDataItem[]
  topMedicines?: TopMedicineItem[]
  lowStockItems?: LowStockItemInput[]
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
  const [hasBeenGenerated, setHasBeenGenerated] = useState(false)

  // 🚀 NEW: Request cancellation refs
  const currentRequestRef = useRef<{ cancelled: boolean } | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 🚀 NEW: Track parameters for staleness detection
  const lastGeneratedParamsRef = useRef<{
    selectedMedicines: number[];
    metricsCount: number;
    totalMedicines: number;
  } | null>(null)

  // Helper function to safely extract numeric values from metrics
  const getMetricValue = (label: string): number => {
    const metric = metrics.find(m => m.label.toLowerCase().includes(label.toLowerCase()))
    const value = metric?.value
    return typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) || 0 : 0)
  }

  // Transform data functions
  const transformedMetrics = (): UnitMetrics => {
    return {
      totalMedicines: getMetricValue('total') || getMetricValue('medicine') || inventorySummary?.length || 0,
      totalValue: getMetricValue('value') || getMetricValue('stock value') || 0,
      lowStockCount: lowStockItems?.length || getMetricValue('low stock') || 0,
      expiringCount: expiryData?.length || getMetricValue('expiring') || 0,
      averageConsumption: getMetricValue('consumption') || getMetricValue('average') || 0,
    }
  }

  const transformedInventorySummary = (): InventorySummary | undefined => {
    if (!inventorySummary) return undefined
    
    return {
      totalItems: inventorySummary.length,
      totalValue: inventorySummary.reduce((sum, item) => sum + (item.quantity || 0), 0),
      categories: [...new Set(inventorySummary.map(item => item.category || 'Unknown').filter(Boolean))],
      averageStockLevel: inventorySummary.length > 0
        ? inventorySummary.reduce((sum, item) => sum + (item.quantity || 0), 0) / inventorySummary.length
        : 0
    }
  }

  // Transform data to match expected types
  const transformConditionData = (items: ConditionDataItem[]): ConditionData[] => {
    return items.map(item => ({
      condition: item.category || item.name || 'Unknown',
      count: item.value || item.quantity || 0,
      percentage: item.percentage || 0
    }))
  }

  const transformExpiryData = (items: ExpiryDataItem[]): ExpiryData[] => {
    return items.map(item => ({
      medicineId: item.id || 0,
      medicineName: item.name || 'Unknown Medicine',
      expiryDate: item.expiryDate || '',
      quantity: item.quantity || 0,
      daysUntilExpiry: item.daysUntilExpiry || 0
    }))
  }

  const transformTopMedicines = (items: TopMedicineItem[]): TopMedicine[] => {
    return items.map(item => ({
      medicineId: item.id || 0,
      medicineName: item.name || 'Unknown Medicine',
      quantity: item.quantity || 0,
      value: item.value || item.usage || 0
    }))
  }

  const transformLowStockItems = (items: LowStockItemInput[]): LowStockItem[] => {
    return items.map(item => ({
      medicineId: item.id || 0,
      medicineName: item.name || 'Unknown Medicine',
      currentStock: item.quantity || 0,
      minimumStock: item.minRequired || 0,
      deficit: (item.minRequired || 0) - (item.quantity || 0)
    }))
  }

  const transformStockHistory = (items: StockHistoryPoint[]): StockHistoryEntry[] => {
    return items.map(item => ({
      date: item.date,
      quantity: item.quantity,
      medicineId: item.medicineId || 0,
      medicineName: item.medicineName || 'Unknown Medicine'
    }))
  }

  // 🚀 COMPLETELY MANUAL: No useEffect, no useCallback, no auto-triggers
  const generateInsights = async (retryCount = 0) => {
    console.log("🎯 Manual unit AI generation triggered by user for:", unitName)
    
    // Cancel any existing request
    if (currentRequestRef.current) {
      currentRequestRef.current.cancelled = true
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    // Create new request tracker
    const requestTracker = { cancelled: false }
    currentRequestRef.current = requestTracker

    if (requestTracker.cancelled) return

    setIsLoading(true)
    setError(null)

    try {
      // Small delay for processing stability
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      if (requestTracker.cancelled) return

      const analysisData = {
        unitId,
        unitName,
        metrics: transformedMetrics(),
        selectedMedicines,
        inventorySummary: transformedInventorySummary(),
        conditionData: conditionData ? transformConditionData(conditionData) : undefined,
        stockHistory: stockHistory ? transformStockHistory(stockHistory) : undefined,
        expiryData: expiryData ? transformExpiryData(expiryData) : undefined,
        topMedicines: topMedicines ? transformTopMedicines(topMedicines) : undefined,
        lowStockItems: lowStockItems ? transformLowStockItems(lowStockItems) : undefined
      }

      console.log("🤖 Sending unit request to Gemini API:", {
        unitId,
        unitName,
        selectedMedicines: selectedMedicines.length,
        metricsCount: metrics.length,
        timestamp: new Date().toISOString()
      })

      const response = await getUnitInsights(analysisData)

      if (requestTracker.cancelled) return

      if (response.success && response.data) {
        setInsights(response.data)
        setLastRefreshed(new Date())
        setHasBeenGenerated(true)

        // Track parameters for staleness detection
        lastGeneratedParamsRef.current = {
          selectedMedicines: [...selectedMedicines],
          metricsCount: metrics.length,
          totalMedicines: transformedMetrics().totalMedicines,
        }

        console.log("✅ Unit AI insights generated successfully for:", unitName)
      } else {
        console.error("❌ Unit Gemini API error:", response.error)

        // Retry logic for API errors
        if (response.error && (response.error.includes("API") || response.error.includes("network")) && retryCount < 2) {
          console.log(`🔄 Retrying unit Gemini API call... Attempt ${retryCount + 1}`)

          retryTimeoutRef.current = setTimeout(() => {
            if (!requestTracker.cancelled) {
              generateInsights(retryCount + 1)
            }
          }, 2000 * (retryCount + 1))
          return
        }

        setError(response.error || "Failed to generate unit insights")
      }
    } catch (error) {
      if (requestTracker.cancelled) return

      console.error("❌ Error calling unit Gemini API:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Retry for network errors
      if ((errorMessage.includes("network") || errorMessage.includes("fetch")) && retryCount < 2) {
        console.log(`🔄 Retrying unit Gemini API call... Attempt ${retryCount + 1}`)

        retryTimeoutRef.current = setTimeout(() => {
          if (!requestTracker.cancelled) {
            generateInsights(retryCount + 1)
          }
        }, 2000 * (retryCount + 1))
        return
      }

      setError("Failed to connect to AI service")
    } finally {
      if (!requestTracker.cancelled) {
        setIsLoading(false)
      }
    }
  }

  // 🚀 EXPLICIT: Manual handlers - no auto-triggering
  const handleGenerateInsights = () => {
    console.log("👆 User clicked 'Generate Unit Insights' button for:", unitName)
    generateInsights(0)
  }

  const handleRefreshInsights = () => {
    console.log("👆 User clicked 'Refresh Unit Insights' button for:", unitName)
    generateInsights(0)
  }

  // 🚀 REMOVED: Auto-generation useEffect - No more automatic generation!
  // useEffect(() => { ... }, [metrics, selectedMedicines, unitId, externalLoading, generateInsights])

  // Check if data has changed since last generation
  const isDataStale = () => {
    if (!lastGeneratedParamsRef.current || !hasBeenGenerated) return false

    const lastParams = lastGeneratedParamsRef.current
    const currentTotalMedicines = transformedMetrics().totalMedicines

    // Check medicines selection change
    if (lastParams.selectedMedicines.length !== selectedMedicines.length) return true
    if (!lastParams.selectedMedicines.every(id => selectedMedicines.includes(id))) return true

    // Check metrics count change
    if (lastParams.metricsCount !== metrics.length) return true

    // Check significant medicines count change (>10% difference)
    if (lastParams.totalMedicines && currentTotalMedicines) {
      const percentChange = Math.abs((currentTotalMedicines - lastParams.totalMedicines) / lastParams.totalMedicines)
      if (percentChange > 0.1) return true
    }

    return false
  }

  function formatLastRefreshed() {
    if (!lastRefreshed) return ""
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(lastRefreshed)
  }

  const dataStale = isDataStale()

  return (
    <Card className="border-2 border-blue-50 shadow-md">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-white pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <CardTitle className="text-lg">Unit AI Insights: {unitName}</CardTitle>
              <CardDescription>
                🎯 Click to generate smart analysis (No auto-generation)
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Last refreshed info */}
            {lastRefreshed && (
              <div className="text-right">
                <span className="text-xs text-gray-500 block">
                  Generated: {formatLastRefreshed()}
                </span>
                {dataStale && (
                  <span className="text-xs text-orange-500 block">
                    ⚠️ Data changed
                  </span>
                )}
              </div>
            )}

            {/* Generate button for first time */}
            {!hasBeenGenerated && !isLoading && (
              <Button
                onClick={handleGenerateInsights}
                disabled={isLoading || externalLoading}
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Generate Insights
              </Button>
            )}

            {/* Refresh button for subsequent times */}
            {hasBeenGenerated && (
              <Button
                variant={dataStale ? "default" : "outline"}
                size="sm"
                onClick={handleRefreshInsights}
                disabled={isLoading || externalLoading}
                className={`h-8 px-3 ${dataStale ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                {dataStale ? 'Update Insights' : 'Refresh'}
              </Button>
            )}

            {/* Expand/collapse button */}
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
          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">
                🤖 Calling Gemini AI API for {unitName}...
              </p>
              <p className="text-xs text-gray-500">
                This may take 3-10 seconds
              </p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="space-y-3">
              <div className="p-4 bg-red-50 rounded-md text-red-800 text-sm">
                <div className="font-medium">Unit AI Generation Failed</div>
                <div className="mt-1">{error}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshInsights}
                disabled={isLoading}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : insights ? (
            /* Success State with Insights */
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Staleness Warning */}
                {dataStale && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <div className="flex items-center text-sm text-orange-800">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      <span>Your unit data has changed since these insights were generated. Click &quot;Update Insights&quot; for fresh analysis.</span>
                    </div>
                  </div>
                )}

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
            /* Initial State - No Insights Yet */
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="bg-blue-50 p-6 rounded-full">
                <Sparkles className="h-12 w-12 text-blue-600" />
              </div>
              <div className="text-center space-y-2">
                <h4 className="font-medium text-gray-800">Ready for Unit AI Analysis</h4>
                <p className="text-sm text-gray-600 max-w-md">
                  Generate intelligent insights about <strong>{unitName}</strong> inventory data.
                  <strong> No automatic generation</strong> - only when you request it.
                </p>
              </div>
              <Button
                onClick={handleGenerateInsights}
                disabled={isLoading || externalLoading}
                className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Unit AI Insights
              </Button>
              <p className="text-xs text-gray-400">
                💡 This will call Gemini AI API only when you click
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
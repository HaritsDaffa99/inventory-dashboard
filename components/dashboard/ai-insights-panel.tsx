"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Lightbulb, RefreshCw, Loader2, ChevronDown, ChevronUp, TrendingUp, ScrollText, CheckCircle, Sparkles } from "lucide-react"
import { getDashboardInsights } from "@/lib/actions/ai-insights"

// Updated interfaces to match expected structure
interface MetricsData {
  totalInventory?: { value: number; change: number; };
  stockValue?: { value: number; change: number; };
  expiringItems?: { value: number; change: number; };
  [key: string]: unknown;
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  value?: number;
  [key: string]: unknown;
}

interface ConditionData {
  name: string;
  value: number;
  percentage: number;
  categories?: string[];
  status?: string;
  [key: string]: unknown;
}

interface AIInsightsPanelProps {
  metrics: MetricsData;
  selectedMedicines: number[];
  conditionData?: ConditionData;
  topReceivedItems?: InventoryItem[];
  topDispensedItems?: InventoryItem[];
  topItemsByQuantity?: InventoryItem[];
}

export function AIInsightsPanel({
  metrics,
  selectedMedicines,
  conditionData,
  topReceivedItems,
  topDispensedItems,
  topItemsByQuantity,
}: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<{
    summary: string;
    keyPoints: string[];
    recommendations: string[];
    trends: string[];
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [hasBeenGenerated, setHasBeenGenerated] = useState(false)

  // 🚀 Request cancellation
  const currentRequestRef = useRef<{ cancelled: boolean } | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 🚀 Track parameters for staleness detection
  const lastGeneratedParamsRef = useRef<{
    selectedMedicines: number[];
    metricsValue?: number;
  } | null>(null)

  // 🚀 COMPLETELY MANUAL: No useEffect, no useCallback, no auto-triggers
  const generateInsights = async (retryCount = 0) => {
    console.log("🎯 Manual AI generation triggered by user")
    
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
        metrics,
        selectedMedicines,
        conditionData: conditionData ? [conditionData] : undefined,
        topReceivedItems,
        topDispensedItems,
        topItemsByQuantity
      }
      
      console.log("🤖 Sending request to Gemini API:", {
        selectedMedicines: selectedMedicines.length,
        hasMetrics: !!metrics,
        timestamp: new Date().toISOString()
      })
      
      const response = await getDashboardInsights(analysisData)
      
      if (requestTracker.cancelled) return
      
      if (response.success && response.data) {
        setInsights(response.data)
        setLastRefreshed(new Date())
        setHasBeenGenerated(true)
        
        // Track parameters for staleness detection
        lastGeneratedParamsRef.current = {
          selectedMedicines: [...selectedMedicines],
          metricsValue: metrics.totalInventory?.value || 0
        }
        
        console.log("✅ AI insights generated successfully")
      } else if (response.error) {
        console.error("❌ Gemini API error:", response.error)
        
        // Retry logic for API errors
        if ((response.error.includes("API") || response.error.includes("network")) && retryCount < 2) {
          console.log(`🔄 Retrying Gemini API call... Attempt ${retryCount + 1}`)
          
          retryTimeoutRef.current = setTimeout(() => {
            if (!requestTracker.cancelled) {
              generateInsights(retryCount + 1)
            }
          }, 2000 * (retryCount + 1))
          return
        }
        
        setError(response.error || "Failed to generate insights")
      }
    } catch (error) {
      if (requestTracker.cancelled) return
      
      console.error("❌ Error calling Gemini API:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      // Retry for network errors
      if ((errorMessage.includes("network") || errorMessage.includes("fetch")) && retryCount < 2) {
        console.log(`🔄 Retrying Gemini API call... Attempt ${retryCount + 1}`)
        
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
    console.log("👆 User clicked 'Generate Insights' button")
    generateInsights(0)
  }

  const handleRefreshInsights = () => {
    console.log("👆 User clicked 'Refresh' button")
    generateInsights(0)
  }

  // Check if data has changed since last generation
  const isDataStale = () => {
    if (!lastGeneratedParamsRef.current || !hasBeenGenerated) return false
    
    const lastParams = lastGeneratedParamsRef.current
    const currentMetricsValue = metrics.totalInventory?.value || 0
    
    // Check medicines selection change
    if (lastParams.selectedMedicines.length !== selectedMedicines.length) return true
    if (!lastParams.selectedMedicines.every(id => selectedMedicines.includes(id))) return true
    
    // Check significant metrics change (>5%)
    if (lastParams.metricsValue && currentMetricsValue) {
      const percentChange = Math.abs((currentMetricsValue - lastParams.metricsValue) / lastParams.metricsValue)
      if (percentChange > 0.05) return true
    }
    
    return false
  }

  const formatLastRefreshed = () => {
    if (!lastRefreshed) return "";
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(lastRefreshed);
  }

  const dataStale = isDataStale()

  return (
    <Card className="border-2 border-blue-50 shadow-md">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-white pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">AI Insights</h3>
              <p className="text-sm text-gray-600">
                🎯 Click to generate smart analysis (No auto-generation)
              </p>
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                🤖 Calling Gemini AI API...
              </p>
              <p className="text-xs text-gray-500">
                This may take 3-10 seconds
              </p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="space-y-3">
              <div className="p-4 bg-red-50 rounded-md text-red-800 text-sm">
                <div className="font-medium">AI Generation Failed</div>
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
                      <span>Your data has changed since these insights were generated. Click &quot;Update Insights&quot; for fresh analysis.</span>
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
                <h4 className="font-medium text-gray-800">Ready for AI Analysis</h4>
                <p className="text-sm text-gray-600 max-w-md">
                  Generate intelligent insights about your inventory data. 
                  <strong> No automatic generation</strong> - only when you request it.
                </p>
              </div>
              <Button
                onClick={handleGenerateInsights}
                disabled={isLoading}
                className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Insights
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
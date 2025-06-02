"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Lightbulb, RefreshCw, Loader2, ChevronDown, ChevronUp, TrendingUp, ScrollText, CheckCircle } from "lucide-react"
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
  conditionData?: ConditionData; // Keep as single object for the prop
  topReceivedItems?: InventoryItem[];
  topDispensedItems?: InventoryItem[];
  topItemsByQuantity?: InventoryItem[];
  isLoading?: boolean;
}

export function AIInsightsPanel({
  metrics,
  selectedMedicines,
  conditionData,
  topReceivedItems,
  topDispensedItems,
  topItemsByQuantity,
  isLoading: externalLoading
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

  const generateInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const analysisData = {
        metrics,
        selectedMedicines,
        conditionData: conditionData ? [conditionData] : undefined, // Convert to array
        topReceivedItems,
        topDispensedItems,
        topItemsByQuantity
      }
      
      const response = await getDashboardInsights(analysisData)
      
      if (response.success && response.data) {
        setInsights(response.data)
        setLastRefreshed(new Date())
      } else {
        setError(response.error || "Failed to generate insights")
      }
    } catch (error) {
      console.error("Error generating insights:", error)
      setError("An error occurred while generating insights")
    } finally {
      setIsLoading(false)
    }
  }, [metrics, selectedMedicines, conditionData, topReceivedItems, topDispensedItems, topItemsByQuantity]);

  // Generate insights when data changes or component mounts
  useEffect(() => {
    if (!externalLoading && metrics) {
      generateInsights()
    }
  }, [externalLoading, metrics, generateInsights]);

  function formatLastRefreshed() {
    if (!lastRefreshed) return "";
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(lastRefreshed);
  }

  return (
    <Card className="border-2 border-blue-50 shadow-md">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-white pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">AI Insights</h3>
              <p className="text-sm text-gray-600">Smart analysis of your inventory data</p>
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
              <p className="text-sm text-gray-600">Analyzing your inventory data...</p>
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
                Click &quot;Refresh&quot; to generate AI insights based on your inventory data
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
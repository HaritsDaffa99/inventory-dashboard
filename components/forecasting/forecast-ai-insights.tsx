"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lightbulb, RefreshCw, Loader2, ScrollText, CheckCircle, AlertTriangle, Boxes } from "lucide-react"
import { getForecastInsights } from "@/lib/actions/forecast-insights"
import type { ForecastResult, ForecastInsights } from "@/lib/forecasting/types"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ForecastAIInsightsProps {
  forecastResult: ForecastResult
  isLoading?: boolean
}

export function ForecastAIInsights({
  forecastResult,
  isLoading: externalLoading
}: ForecastAIInsightsProps) {
  const [insights, setInsights] = useState<ForecastInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState("summary")

  const generateInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await getForecastInsights(forecastResult)
      
      if (response.success && response.data) {
        setInsights(response.data)
        setLastRefreshed(new Date())
      } else {
        setError(response.error || "Failed to generate insights")
      }
    } catch (error) {
      console.error("Error generating forecast insights:", error)
      setError("An error occurred while generating insights")
    } finally {
      setIsLoading(false)
    }
  }, [forecastResult]);

  // Generate insights when forecast result changes
  useEffect(() => {
    if (forecastResult && !externalLoading) {
      generateInsights()
    }
  }, [forecastResult, externalLoading, generateInsights])

  function formatLastRefreshed() {
    if (!lastRefreshed) return ""
    
    const now = new Date()
    const diffMs = now.getTime() - lastRefreshed.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "just now"
    if (diffMins === 1) return "1 minute ago"
    if (diffMins < 60) return `${diffMins} minutes ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return "1 hour ago"
    if (diffHours < 24) return `${diffHours} hours ago`
    
    return lastRefreshed.toLocaleString()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="space-y-1.5 flex-1">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span>AI Inventory Insights</span>
            {lastRefreshed && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                Updated {formatLastRefreshed()}
              </Badge>
            )}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8 gap-1"
            onClick={generateInsights}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-6">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={generateInsights}>
                Try Again
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary/80" />
              <p className="text-sm text-muted-foreground">
                Analyzing forecast data and generating detailed inventory recommendations...
              </p>
            </div>
          ) : insights ? (
            <div className="space-y-6">
              <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 mb-4">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly Plan</TabsTrigger>
                  <TabsTrigger value="risks">Risk Factors</TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ScrollText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-base">Executive Summary</h3>
                    </div>
                    <div className="mt-3 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm leading-relaxed">{insights.executiveSummary}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="recommendations" className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <h3 className="font-semibold text-base">Stock Recommendations</h3>
                    </div>
                    <div className="mt-3 space-y-3">
                      {insights.stockRecommendations.map((rec, i) => (
                        <div key={i} className="p-3 border rounded-lg bg-card">
                          <div className="flex gap-2">
                            <span className="text-green-500 font-medium text-sm mt-0.5">#{i + 1}</span>
                            <p className="text-sm leading-relaxed">{rec}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="monthly" className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Boxes className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold text-base">Monthly Stock Requirements</h3>
                    </div>
                    <div className="mt-3 space-y-3">
                      {insights.monthlyStockPlan.map((plan, i) => (
                        <div key={i} className="p-4 border rounded-lg bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm text-primary">{plan.month}</h4>
                            <Badge variant="outline" className="text-xs">
                              Month {i + 1}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Recommended Stock:</span>
                              <span className="font-medium">{plan.recommendedStock}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Expected Usage:</span>
                              <span className="font-medium">{plan.expectedUsage}</span>
                            </div>
                            <div className="pt-2 border-t">
                              <p className="text-sm"><strong>Action:</strong> {plan.orderAction}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="risks" className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <h3 className="font-semibold text-base">Risk Factors</h3>
                    </div>
                    <div className="mt-3 space-y-3">
                      {insights.riskFactors.map((risk, i) => (
                        <div key={i} className="p-3 border rounded-lg bg-card border-red-200">
                          <div className="flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm leading-relaxed">{risk}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Lightbulb className="h-8 w-8 text-yellow-500/80" />
              <p className="text-sm text-muted-foreground">
                Click &ldquo;Refresh&rdquo; to analyze forecast data and generate detailed inventory recommendations.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
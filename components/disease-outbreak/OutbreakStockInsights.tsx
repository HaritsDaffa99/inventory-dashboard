"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Shield, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  TrendingUp,
  RefreshCw,
  Clock
} from "lucide-react"
import { getOutbreakStockInsights } from "@/lib/actions/outbreak-stock-insights"

interface OutbreakStockInsightsProps {
  outbreakForecast: {
    severity: string
    timeline: string
    diseaseCategory: string
    affectedPopulation?: number
    outbreakVelocity?: number
    doublingTime?: string
    epidemicCurve?: string
  }
  stockData: {
    medicines: Array<{
      id: number
      name: string
      currentQuantity: number
      weeklyConsumption: number
      daysRemaining: number
      category: string
      unitName?: string
      expiryDate?: string
    }>
    totalUnits: number
    totalValue?: number
  }
  diseaseCategory: string
  isLoading?: boolean
}

interface StockInsights {
  summary: string
  keyFindings: string[]
  recommendations: string[]
  riskMitigation: string[]
}

export function OutbreakStockInsights({
  outbreakForecast,
  stockData,
  diseaseCategory,
  isLoading: externalLoading
}: OutbreakStockInsightsProps) {
  const [insights, setInsights] = useState<StockInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("summary")
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const generateInsights = useCallback(async () => {
    console.log("🎯 Generating outbreak stock insights...")
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await getOutbreakStockInsights({
        outbreakForecast,
        currentStock: stockData,
        selectedCategory: diseaseCategory
      })
      
      if (response.success && response.data) {
        setInsights(response.data)
        setLastRefreshed(new Date())
        console.log("✅ Successfully generated stock insights")
      } else {
        setError(response.error || "Failed to generate stock preparedness insights")
        console.error("❌ Failed to generate insights:", response.error)
      }
    } catch (error) {
      const errorMessage = "An error occurred while analyzing stock preparedness"
      setError(errorMessage)
      console.error("❌ Error in generateInsights:", error)
    } finally {
      setIsLoading(false)
    }
  }, [outbreakForecast, stockData, diseaseCategory])

  const getPreparednessLevel = () => {
    if (!insights) return null
    
    const summary = insights.summary.toLowerCase()
    if (summary.includes('critical') || summary.includes('insufficient')) {
      return { level: 'Critical', color: 'destructive' as const, icon: AlertTriangle }
    } else if (summary.includes('moderate') || summary.includes('adequate')) {
      return { level: 'Moderate', color: 'default' as const, icon: CheckCircle }
    } else if (summary.includes('well') || summary.includes('prepared')) {
      return { level: 'Good', color: 'default' as const, icon: Shield }
    }
    return { level: 'Unknown', color: 'secondary' as const, icon: Package }
  }

  const formatLastRefreshed = () => {
    if (!lastRefreshed) return ""
    
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - lastRefreshed.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
    
    return lastRefreshed.toLocaleDateString()
  }

  const preparednessInfo = getPreparednessLevel()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-orange-500" />
            <div>
              <CardTitle className="text-xl">Stock Preparedness Analysis</CardTitle>
              <CardDescription>
                AI-powered assessment of inventory readiness for {diseaseCategory} outbreak
              </CardDescription>
            </div>
            {preparednessInfo && insights && (
              <Badge variant={preparednessInfo.color} className="ml-2">
                <preparednessInfo.icon className="h-3 w-3 mr-1" />
                {preparednessInfo.level}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {lastRefreshed && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {formatLastRefreshed()}
              </div>
            )}
            
            <Button
              onClick={generateInsights}
              disabled={isLoading || externalLoading}
              size="sm"
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : insights ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Analysis
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Preparedness
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!insights && !isLoading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              Click &quot;Analyze Preparedness&quot; to get AI-powered insights on your stock readiness for the forecasted outbreak.
            </p>
          </div>
        )}

        {insights && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="findings" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Key Findings
              </TabsTrigger>
              <TabsTrigger value="procurement" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                Procurement
              </TabsTrigger>
              <TabsTrigger value="risks" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Risk Mitigation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <div className="prose prose-sm max-w-none">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Overall Preparedness Assessment
                  </h4>
                  <p className="text-sm leading-relaxed">{insights.summary}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="findings" className="mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Key Analysis Results</h4>
                {insights.keyFindings.map((finding, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{finding}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="procurement" className="mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Recommended Actions</h4>
                {insights.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Package className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{recommendation}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="risks" className="mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Risk Mitigation Strategies</h4>
                {insights.riskMitigation.map((risk, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{risk}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
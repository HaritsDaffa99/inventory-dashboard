"use client"

import { useState, useEffect } from "react"
import { generateOutbreakForecasts } from "@/lib/actions/outbreak-forecasting"
import type { OutbreakForecast } from "@/lib/forecasting/outbreak-types"
import ForecastControls from "./ForecastControls"
import ForecastChart from "./ForecastChart"
import EarlyWarningIndicators from "./EarlyWarningIndicators" // ✅ ADD: Import EarlyWarningIndicators
import { AlertTriangle, Activity } from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // ✅ ADD: Import Tabs
import Link from "next/link"

export default function OutbreakForecast() {
  const [forecasts, setForecasts] = useState<OutbreakForecast[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prophetStatus, setProphetStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')
  const [modelPerformance, setModelPerformance] = useState<{
    model_type: string
    generation_time: number
  }>({ model_type: 'threshold', generation_time: 0 })
  const [selectedCategory, setSelectedCategory] = useState<string>('') // ✅ ADD: Selected category state

  // Check Prophet API availability
  useEffect(() => {
    const checkProphetStatus = async () => {
      try {
        const response = await fetch('http://localhost:8000/disease-outbreak/health')
        if (response.ok) {
          setProphetStatus('available')
        } else {
          setProphetStatus('unavailable')
        }
      } catch {
        setProphetStatus('unavailable')
      }
    }
    checkProphetStatus()
  }, [])

  const handleGenerate = async (params: {
    selectedUnits: number[]
    forecastMonths: number
    useProphet: boolean
  }) => {
    setIsLoading(true)
    setError(null)
    const startTime = Date.now()

    try {
      const forecastPeriod = params.forecastMonths === 3 ? '3_MONTHS' : 
                           params.forecastMonths === 6 ? '6_MONTHS' : '12_MONTHS'

      const forecastResult = await generateOutbreakForecasts(params.selectedUnits, {
        analysis_period_months: 24,
        forecast_horizon_months: params.forecastMonths,
        seasonal_adjustment: true,
        geographic_analysis: true,
        confidence_threshold: 70,
        alert_sensitivity: 'MEDIUM',
        use_prophet: params.useProphet && prophetStatus === 'available'
      })

      const endTime = Date.now()
      const generationTime = (endTime - startTime) / 1000

      if (forecastResult.success && forecastResult.data) {
        const filteredForecasts = forecastResult.data.filter(f => f.forecast_period === forecastPeriod)
        setForecasts(filteredForecasts)
        
        // ✅ ADD: Set default selected category to first one with early warning data
        const categoryWithEarlyWarning = filteredForecasts.find(f => f.early_warning)
        if (categoryWithEarlyWarning && !selectedCategory) {
          setSelectedCategory(categoryWithEarlyWarning.category_id)
        }
        
        setModelPerformance({
          model_type: params.useProphet ? 'AI Analysis' : 'Statistical Analysis',
          generation_time: generationTime
        })
      } else {
        setError(forecastResult.error || "Failed to generate analysis")
      }
    } catch {
      setError("Failed to analyze disease patterns")
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ ADD: Get available categories for dropdown
  const availableCategories = forecasts
    .filter(f => f.early_warning)
    .map(f => ({
      id: f.category_id,
      name: f.category_name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }))

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Activity className="w-6 h-6" />
            Disease Outbreak Prediction
          </CardTitle>
          <div className="text-sm text-blue-800 space-y-1">
            <p>🦠 <strong>Purpose:</strong> Predict disease outbreak patterns for early warning</p>
            <p>📊 <strong>Method:</strong> Analyze medicine usage trends as disease indicators</p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Note:</strong> This predicts disease outbreaks, not medicine inventory needs. 
                For stock planning, use <Link href="/dashboard/forecasting" className="underline">Medicine Forecasting</Link>.
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Controls */}
      <ForecastControls
        onGenerate={handleGenerate}
        isLoading={isLoading}
        prophetStatus={prophetStatus}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error: {error}</span>
          </div>
        </div>
      )}

      {/* ✅ NEW: Tabbed Interface for Results */}
      {forecasts.length > 0 && (
        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="charts">📊 Forecast Charts</TabsTrigger>
            <TabsTrigger value="early-warning">⚡ Early Warning Indicators</TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-0">
            <ForecastChart
              forecasts={forecasts}
              isLoading={isLoading}
              modelType={modelPerformance.model_type}
              generationTime={modelPerformance.generation_time}
            />
          </TabsContent>

          <TabsContent value="early-warning" className="space-y-0">
            {/* ✅ ADD: Category Selection for Early Warning */}
            {availableCategories.length > 1 && (
              <Card className="mb-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm">Select Category for Early Warning Analysis</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    {availableCategories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* ✅ ADD: Early Warning Indicators Component */}
            <EarlyWarningIndicators
              forecasts={forecasts}
              selectedCategory={selectedCategory || availableCategories[0]?.id}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* ✅ FALLBACK: Show charts only if no forecasts (original behavior) */}
      {forecasts.length === 0 && (
        <ForecastChart
          forecasts={forecasts}
          isLoading={isLoading}
          modelType={modelPerformance.model_type}
          generationTime={modelPerformance.generation_time}
        />
      )}
    </div>
  )
}
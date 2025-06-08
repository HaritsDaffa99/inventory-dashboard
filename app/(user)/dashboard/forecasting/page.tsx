"use client"

import { useState } from "react"
import { ForecastFilters } from "@/components/forecasting/forecast-filters"
import { ForecastChart } from "@/components/forecasting/forecast-chart"
import { ForecastMetrics } from "@/components/forecasting/forecast-metrics"
import { ForecastTable } from "@/components/forecasting/forecast-table"
import { ForecastAIInsights } from "@/components/forecasting/forecast-ai-insights"
import type { ForecastResult } from "@/lib/forecasting/types"

export default function ForecastingPage() {
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null)

  const handleForecastGenerated = (result: ForecastResult) => {
    setForecastResult(result)
  }

  return (
    <div className="container mx-auto p-6 space-y-8 overflow-hidden">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Medicine Usage Forecasting</h1>
        <p className="text-muted-foreground">
          Predict future medicine usage patterns using advanced Prophet time series analysis. Choose from three model
          modes:
          <strong> Fast</strong> (seconds), <strong> Enhanced</strong> (1-2 min), or <strong> Comprehensive</strong> (5+
          min) based on your speed vs accuracy needs.
        </p>
      </div>

      {/* Forecast Parameters */}
      <ForecastFilters onForecastGenerated={handleForecastGenerated} />

      {/* Results */}
      {forecastResult && forecastResult.success && (
        <div className="space-y-8  ">
          {/* Metrics Cards */}
          <ForecastMetrics forecastResult={forecastResult} />

          {/* Chart */}
          <div className="">
            <ForecastChart forecastResult={forecastResult} />
          </div>
          
          {/* AI Insights */}
          <ForecastAIInsights forecastResult={forecastResult} />

          {/* Detailed Table */}
          <ForecastTable forecastResult={forecastResult} />
        </div>
      )} 
    </div>
  )
}
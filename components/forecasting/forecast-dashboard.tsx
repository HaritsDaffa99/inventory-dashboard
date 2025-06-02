"use client"

import { useState } from "react"
import { ForecastFilters } from "./forecast-filters"
import { ForecastChart } from "./forecast-chart"
import { ForecastMetrics } from "./forecast-metrics"
import { ForecastRecommendations } from "./forecast-recommendations"
import type { ForecastResult } from "@/lib/forecasting/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Info } from "lucide-react"

export function ForecastDashboard() {
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  const handleForecastGenerated = (result: ForecastResult) => {
    console.log("Forecast result received:", result)
    
    if (result.success) {
      setForecastResult(result)
      setError(null)
      setDebugInfo(`Forecast generated successfully using ${result.model_type}`)
    } else {
      setError(result.error || "Failed to generate forecast")
      setForecastResult(null)
      setDebugInfo(`Forecast failed: ${result.error}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ForecastFilters onForecastGenerated={handleForecastGenerated} />

      {/* Debug Info */}
      {debugInfo && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{debugInfo}</AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div>{error}</div>
              <div className="text-sm opacity-80">
                Troubleshooting tips:
                <ul className="list-disc list-inside mt-1">
                  <li>Check if Python service is running on port 8000</li>
                  <li>Verify database connection</li>
                  <li>Ensure sufficient historical data exists</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {forecastResult && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Forecast generated successfully using {forecastResult.model_type} model with{" "}
            {forecastResult.summary.data_points} months of historical data.
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {forecastResult && (
        <div className="space-y-6">
          {/* Metrics */}
          <ForecastMetrics forecastResult={forecastResult} />

          {/* Chart */}
          <ForecastChart forecastResult={forecastResult} />

          {/* Recommendations */}
          <ForecastRecommendations forecastResult={forecastResult} />
        </div>
      )}
    </div>
  )
}
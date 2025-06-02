"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from "recharts"
import type { ForecastResult } from "@/lib/forecasting/types"
import { TrendingUp } from "lucide-react"

interface ForecastChartProps {
  forecastResult: ForecastResult
}

export function ForecastChart({ forecastResult }: ForecastChartProps) {
  // Combine historical and forecast data for the chart
  const chartData = [
    ...forecastResult.historical_data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      historical: item.usage,
      forecast: null,
      lower_ci: null,
      upper_ci: null,
      type: "historical",
    })),
    ...forecastResult.forecast_data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      historical: null,
      forecast: item.forecasted_usage,
      lower_ci: item.lower_ci,
      upper_ci: item.upper_ci,
      type: "forecast",
    })),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Prophet Forecast Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} style={{ overflow: 'visible' }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                formatter={(value, name) => {
                  if (value === null) return [null, name]
                  return [Number(value).toFixed(2), name]
                }}
              />
              <Legend />

              {/* Historical data line */}
              <Line
                type="monotone"
                dataKey="historical"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                name="Historical Usage"
                connectNulls={false}
              />

              {/* Forecast line */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 4 }}
                name="Prophet Forecast"
                connectNulls={false}
              />

              {/* Confidence interval area */}
              <Area
                type="monotone"
                dataKey="upper_ci"
                stackId="1"
                stroke="none"
                fill="hsl(var(--destructive))"
                fillOpacity={0.1}
                name="Upper CI"
              />
              <Area
                type="monotone"
                dataKey="lower_ci"
                stackId="1"
                stroke="none"
                fill="hsl(var(--background))"
                fillOpacity={1}
                name="Lower CI"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span>Historical Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded-full"></div>
            <span>Prophet Forecast</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive/20 rounded-full"></div>
            <span>95% Confidence Interval</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
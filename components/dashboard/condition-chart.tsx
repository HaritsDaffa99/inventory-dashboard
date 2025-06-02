"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { getItemConditionDistribution } from "@/lib/actions/medicine"

interface ConditionChartProps {
  selectedMedicines: number[]
}

interface ChartData {
  name: string
  value: number
  percentage: number
}

const COLORS = {
  Good: "#4ade80", // green
  "Minor Damage": "#fbbf24", // yellow
  "Major Damage": "#f87171", // red
  Expired: "#c084fc", // purple
  Lost: "#9ca3af", // gray
}

export function ConditionChart({ selectedMedicines }: ConditionChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    async function fetchData() {
      setIsLoading(true)
      try {
        // Make sure we're passing a valid array to the server action
        const medicineIds = selectedMedicines && selectedMedicines.length > 0 ? selectedMedicines : undefined

        const response = await getItemConditionDistribution(
          undefined, // unitId is undefined for the overview page
          medicineIds,
        )
        if (response.success && response.data) {
          setChartData(response.data)
        }
      } catch (error) {
        console.error("Error fetching condition data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedMedicines, mounted])

  const CustomTooltip = ({ 
    active, 
    payload 
  }: { 
    active?: boolean; 
    payload?: Array<{ payload: ChartData }> 
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-2 border rounded-md shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{`Count: ${data.value}`}</p>
          <p className="text-sm">{`Percentage: ${data.percentage.toFixed(1)}%`}</p>
        </div>
      )
    }
    return null
  }

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return null
  }

  return (
    <Card className="h-full" id="condition-chart">
      <CardHeader>
        <CardTitle>Item Condition Distribution</CardTitle>
        <CardDescription>Percentage of items by current condition</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p>Loading chart data...</p>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "#9ca3af"} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

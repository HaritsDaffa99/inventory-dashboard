"use client"

import { useState, useEffect, useRef } from "react"
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
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // 🚀 IMPROVED: Use ref to track current request and enable proper cancellation
  const currentRequestRef = useRef<{ cancelled: boolean } | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // 🚀 IMPROVED: Better request cancellation when selectedMedicines changes
  useEffect(() => {
    if (!mounted) return

    // Cancel any existing request and timeout
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

    async function fetchData(retryCount = 0) {
      // Check if request was cancelled before starting
      if (requestTracker.cancelled) return

      setIsLoading(true)
      setError(null)
      
      try {
        // Add a small delay for initial load to let connections stabilize
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        // Check if request was cancelled during delay
        if (requestTracker.cancelled) return

        // Make sure we're passing a valid array to the server action
        const medicineIds = selectedMedicines && selectedMedicines.length > 0 ? selectedMedicines : undefined

        const response = await getItemConditionDistribution(
          undefined, // unitId is undefined for the overview page
          medicineIds,
        )

        // 🚀 CRITICAL: Check if request was cancelled after API call
        if (requestTracker.cancelled) return

        if (response.success && response.data) {
          setChartData(response.data)
        } else if (response.error) {
          console.error("Error fetching condition data:", response.error)
          
          // Check if it's a connection error and retry
          if (response.error.includes("Can't reach database server") && retryCount < 3) {
            console.log(`Retrying condition chart connection... Attempt ${retryCount + 1}`)
            
            retryTimeoutRef.current = setTimeout(() => {
              if (!requestTracker.cancelled) {
                fetchData(retryCount + 1)
              }
            }, 1000 * (retryCount + 1)) // Exponential backoff
            return
          }
          
          setError(response.error)
        }
      } catch (error) {
        // Check if request was cancelled during error handling
        if (requestTracker.cancelled) return
        
        console.error("Error fetching condition data:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        
        // Check if it's a connection error and retry
        if (errorMessage.includes("Can't reach database server") && retryCount < 3) {
          console.log(`Retrying condition chart connection... Attempt ${retryCount + 1}`)
          
          retryTimeoutRef.current = setTimeout(() => {
            if (!requestTracker.cancelled) {
              fetchData(retryCount + 1)
            }
          }, 1000 * (retryCount + 1)) // Exponential backoff
          return
        }
        
        setError(`Failed to fetch condition data: ${errorMessage}`)
      } finally {
        // Only update loading state if request wasn't cancelled
        if (!requestTracker.cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    // 🚀 IMPROVED: Cleanup function
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [selectedMedicines, mounted])

  // 🚀 IMPROVED: Manual retry function that respects cancellation
  const handleRetry = () => {
    // Cancel any existing request
    if (currentRequestRef.current) {
      currentRequestRef.current.cancelled = true
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    // Create new request
    const requestTracker = { cancelled: false }
    currentRequestRef.current = requestTracker
    
    setError(null)
    
    async function retryFetch() {
      if (requestTracker.cancelled) return
      
      setIsLoading(true)
      
      try {
        const medicineIds = selectedMedicines && selectedMedicines.length > 0 ? selectedMedicines : undefined

        const response = await getItemConditionDistribution(
          undefined, // unitId is undefined for the overview page
          medicineIds,
        )

        if (requestTracker.cancelled) return

        if (response.success && response.data) {
          setChartData(response.data)
        } else if (response.error) {
          setError(response.error)
        }
      } catch (error) {
        if (requestTracker.cancelled) return
        setError(`Failed to fetch condition data: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        if (!requestTracker.cancelled) {
          setIsLoading(false)
        }
      }
    }

    retryFetch()
  }

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
    return (
      <Card className="h-full" id="condition-chart">
        <CardHeader>
          <CardTitle>Item Condition Distribution</CardTitle>
          <CardDescription>Percentage of items by current condition</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-pulse">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
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
            <div className="space-y-2 text-center">
              <div className="animate-pulse">Loading condition data...</div>
              <p className="text-sm text-muted-foreground">
                🚀 Smart condition analysis with cancellation
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-red-500 space-y-4">
            <p className="text-center max-w-md">{error}</p>
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
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
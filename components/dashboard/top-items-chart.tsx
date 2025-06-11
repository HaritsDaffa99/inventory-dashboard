"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { getTopReceivedItems, getTopDispensedItems } from "@/lib/actions/medicine"

interface TopItemsChartProps {
  selectedMedicines: number[]
}

interface ChartData {
  name: string
  value: number
  id: number
}

export function TopItemsChart({ selectedMedicines }: TopItemsChartProps) {
  const [activeTab, setActiveTab] = useState("received")
  const [receivedData, setReceivedData] = useState<ChartData[]>([])
  const [dispensedData, setDispensedData] = useState<ChartData[]>([])
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

        // 🚀 IMPROVED: Fetch both datasets but check cancellation between calls
        const receivedResponse = await getTopReceivedItems(
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        )

        // Check if request was cancelled after first API call
        if (requestTracker.cancelled) return

        const dispensedResponse = await getTopDispensedItems(
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        )

        // 🚀 CRITICAL: Check if request was cancelled after both API calls
        if (requestTracker.cancelled) return

        // Process received data
        if (receivedResponse.success && receivedResponse.data) {
          setReceivedData(receivedResponse.data)
        } else if (receivedResponse.error) {
          console.error("Error in received data:", receivedResponse.error)
          
          // Check for connection errors and retry
          if (receivedResponse.error.includes("Can't reach database server") && retryCount < 3) {
            console.log(`Retrying chart connection... Attempt ${retryCount + 1}`)
            
            retryTimeoutRef.current = setTimeout(() => {
              if (!requestTracker.cancelled) {
                fetchData(retryCount + 1)
              }
            }, 1000 * (retryCount + 1)) // Exponential backoff
            return
          }
          
          setError(receivedResponse.error)
        }

        // Process dispensed data
        if (dispensedResponse.success && dispensedResponse.data) {
          setDispensedData(dispensedResponse.data)
        } else if (dispensedResponse.error) {
          console.error("Error in dispensed data:", dispensedResponse.error)
          
          // Check for connection errors and retry
          if (dispensedResponse.error.includes("Can't reach database server") && retryCount < 3) {
            console.log(`Retrying chart connection... Attempt ${retryCount + 1}`)
            
            retryTimeoutRef.current = setTimeout(() => {
              if (!requestTracker.cancelled) {
                fetchData(retryCount + 1)
              }
            }, 1000 * (retryCount + 1)) // Exponential backoff
            return
          }
          
          setError(dispensedResponse.error)
        }

      } catch (error) {
        // Check if request was cancelled during error handling
        if (requestTracker.cancelled) return
        
        console.error("Error fetching top items chart data:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        
        // Check for connection errors and retry
        if (errorMessage.includes("Can't reach database server") && retryCount < 3) {
          console.log(`Retrying chart connection... Attempt ${retryCount + 1}`)
          
          retryTimeoutRef.current = setTimeout(() => {
            if (!requestTracker.cancelled) {
              fetchData(retryCount + 1)
            }
          }, 1000 * (retryCount + 1)) // Exponential backoff
          return
        }
        
        setError(`Failed to fetch chart data: ${errorMessage}`)
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
        const receivedResponse = await getTopReceivedItems(
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        )

        if (requestTracker.cancelled) return

        const dispensedResponse = await getTopDispensedItems(
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        )

        if (requestTracker.cancelled) return

        if (receivedResponse.success && receivedResponse.data) {
          setReceivedData(receivedResponse.data)
        } else if (receivedResponse.error) {
          setError(receivedResponse.error)
        }

        if (dispensedResponse.success && dispensedResponse.data) {
          setDispensedData(dispensedResponse.data)
        } else if (dispensedResponse.error && !error) {
          setError(dispensedResponse.error)
        }
      } catch (error) {
        if (requestTracker.cancelled) return
        setError(`Failed to fetch chart data: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        if (!requestTracker.cancelled) {
          setIsLoading(false)
        }
      }
    }

    retryFetch()
  }

  // Custom tooltip for the chart
  const CustomTooltip = ({ 
    active, 
    payload 
  }: {
    active?: boolean;
    payload?: Array<{
      value: number;
      payload: ChartData;
    }>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-2 border rounded-md shadow-sm">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-sm">{`Quantity: ${payload[0].value}`}</p>
        </div>
      )
    }
    return null
  }

  // Format medicine names for better display
  const formatXAxis = (value: string) => {
    // If name is too long, truncate it
    if (value.length > 12) {
      return value.substring(0, 12) + "..."
    }
    return value
  }

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return (
      <Card className="h-full w-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Top 10 Received & Dispensed Items</CardTitle>
          <CardDescription>Items with highest receipt and dispensing quantities</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pt-0 overflow-hidden">
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-pulse">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full w-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Top 10 Received & Dispensed Items</CardTitle>
        <CardDescription>Items with highest receipt and dispensing quantities</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0 overflow-hidden">
        <Tabs defaultValue="received" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="received">Top 10 Received</TabsTrigger>
            <TabsTrigger value="dispensed">Top 10 Dispensed</TabsTrigger>
          </TabsList>
          <TabsContent value="received" className="flex-1 mt-2 data-[state=active]:flex data-[state=active]:flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="space-y-2 text-center">
                  <div className="animate-pulse">Loading chart data...</div>
                  <p className="text-sm text-muted-foreground">
                    🚀 Optimized charts with request cancellation
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500 space-y-4">
                <p className="text-center max-w-md">{error}</p>
                <button 
                  onClick={handleRetry}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : receivedData.length > 0 ? (
              <div className="h-full min-h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={receivedData}
                    margin={{
                      top: 10,
                      right: 5,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tickFormatter={formatXAxis}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                      tickMargin={15}
                    />
                    <YAxis 
                      width={70} 
                      tick={{ fontSize: 12 }}
                      domain={[0, 'dataMax']}
                      tickCount={7}
                      axisLine={{ stroke: "#000" }}
                      tickLine={{ stroke: "#000" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#60a5fa" name="Quantity" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="dispensed" className="flex-1 mt-2 data-[state=active]:flex data-[state=active]:flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="space-y-2 text-center">
                  <div className="animate-pulse">Loading chart data...</div>
                  <p className="text-sm text-muted-foreground">
                    🚀 Optimized charts with request cancellation
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500 space-y-4">
                <p className="text-center max-w-md">{error}</p>
                <button 
                  onClick={handleRetry}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : dispensedData.length > 0 ? (
              <div className="h-full min-h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dispensedData}
                    margin={{
                      top: 10,
                      right: 5,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tickFormatter={formatXAxis}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                      tickMargin={15}
                    />
                    <YAxis 
                      width={70} 
                      tick={{ fontSize: 12 }}
                      domain={[0, 'dataMax']}
                      tickCount={7}
                      axisLine={{ stroke: "#000" }}
                      tickLine={{ stroke: "#000" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#f472b6" name="Quantity" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
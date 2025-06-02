"use client"

import { useState, useEffect } from "react"
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

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch data when selectedMedicines changes or tab changes
  useEffect(() => {
    if (!mounted) return

    async function fetchData() {
      setIsLoading(true)
      setError(null)
      try {
        // Always fetch both datasets to avoid loading state when switching tabs
        const receivedResponse = await getTopReceivedItems(selectedMedicines.length > 0 ? selectedMedicines : undefined)

        const dispensedResponse = await getTopDispensedItems(
          selectedMedicines.length > 0 ? selectedMedicines : undefined,
        )

        if (receivedResponse.success && receivedResponse.data) {
          setReceivedData(receivedResponse.data)
        } else if (receivedResponse.error) {
          console.error("Error in received data:", receivedResponse.error)
          setError(receivedResponse.error)
        }

        if (dispensedResponse.success && dispensedResponse.data) {
          setDispensedData(dispensedResponse.data)
        } else if (dispensedResponse.error) {
          console.error("Error in dispensed data:", dispensedResponse.error)
          setError(dispensedResponse.error)
        }
      } catch (error) {
        console.error("Error fetching top items data:", error)
        setError(`Failed to fetch data: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedMedicines, mounted])

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
    return null
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
                <p>Loading chart data...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-500">
                <p>{error}</p>
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
                <p>Loading chart data...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-500">
                <p>{error}</p>
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
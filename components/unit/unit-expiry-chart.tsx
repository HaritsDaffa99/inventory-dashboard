"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { getMedicinesApproachingExpiry } from "@/lib/actions/unit-stock-history"
import { Button } from "@/components/ui/button"
import { List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface UnitExpiryChartProps {
  unitId: number
  selectedMedicines: number[]
}

interface ExpiryData {
  id: number              // This is persediaanId
  stokOpnameId: number    // Add this field
  name: string
  code: string
  quantity: number
  unit: string
  daysRemaining: number
  expiryDate: Date
  nusp: string  
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload: {
      fullName: string
      nusp: string
      unit: string
    }
    value: number
  }>
}

export function UnitExpiryChart({ unitId, selectedMedicines }: UnitExpiryChartProps) {
  const [expiryData, setExpiryData] = useState<ExpiryData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // State variables for enhanced functionality
  const [expandedView, setExpandedView] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    async function fetchData() {
      setIsLoading(true)
      try {
        const response = await getMedicinesApproachingExpiry(
          unitId,
          selectedMedicines.length > 0 ? selectedMedicines : undefined,
        )
        if (response.success && response.data) {
          setExpiryData(response.data)
        } else {
          setError(response.error || "Failed to fetch expiry data")
        }
      } catch (error) {
        console.error("Error fetching expiry data:", error)
        setError("An error occurred while fetching expiry data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [unitId, selectedMedicines, mounted])

  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(1)
  }, [expiryData])

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    )
  }

  // Sort data by days remaining
  const sortedData = [...expiryData].sort((a, b) => a.daysRemaining - b.daysRemaining)
  
  // Calculate pagination or use expanded view
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const indexOfLastItem = expandedView ? sortedData.length : currentPage * itemsPerPage
  const indexOfFirstItem = expandedView ? 0 : indexOfLastItem - itemsPerPage
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem)

  // Format data for the chart
  const chartData = currentItems.map((item) => {
    // Truncate and format medicine name for better readability
    let formattedName = item.name

    // If name is too long, truncate it and add the code in a new line
    if (formattedName.length > 20) {
      formattedName = `${formattedName.substring(0, 20)}...`
    }

    // Add code in brackets for identification
    formattedName = `${formattedName} [${item.code}]`

    return {
      key: item.stokOpnameId,
      name: formattedName,
      fullName: item.name,
      code: item.code,
      quantity: item.quantity,
      daysRemaining: item.daysRemaining,
      unit: item.unit,
      nusp: item.nusp,
    }
  })

  // Pagination functions
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToFirstPage = () => goToPage(1)
  const goToLastPage = () => goToPage(totalPages)
  const goToPreviousPage = () => goToPage(currentPage - 1)
  const goToNextPage = () => goToPage(currentPage + 1)

  // Find the maximum quantity to set appropriate scale for X-axis
  const maxQuantity = chartData.length > 0 ? Math.max(...chartData.map((item) => item.quantity)) : 100

  // Round up to nearest 10, 100, or 1000 depending on the magnitude
  const getAxisMaximum = (value: number) => {
    if (value <= 10) return 10
    if (value <= 100) return Math.ceil(value / 10) * 10
    if (value <= 1000) return Math.ceil(value / 100) * 100
    return Math.ceil(value / 1000) * 1000
  }

  const xAxisMaximum = getAxisMaximum(maxQuantity)

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-background p-2 border rounded-md shadow-sm">
          <p className="font-medium">{item.fullName}</p>
          <p className="text-sm">{`Code: ${item.nusp}`}</p>
          <p className="text-sm">{`Quantity: ${payload[0].value} ${item.unit}`}</p>
          <p className="text-sm">{`Days Remaining: ${payload[1].value}`}</p>
        </div>
      )
    }
    return null
  }

  // Calculate chart height based on number of items
  const getChartHeight = () => {
    const itemCount = chartData.length
    if (expandedView) {
      // For expanded view, allocate at least 50px per item, with a minimum of 300px
      return Math.max(300, itemCount * 50)
    }
    // For paginated view, 50px per item with min 300px
    return Math.max(300, itemCount * 50)
  }

  return (
    <Card className="h-full unit-expiry-chart">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Medicines Approaching Expiry</CardTitle>
          <CardDescription>Medicines that will expire within 1 year</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setExpandedView(!expandedView)
              // Reset to page 1 when toggling view
              setCurrentPage(1)
            }}
          >
            <List className="h-4 w-4 mr-1" />
            {expandedView ? "Paginated View" : "View All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p>Loading chart data...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px] text-red-500">
            <p>{error}</p>
          </div>
        ) : expiryData.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">
              {expandedView 
                ? `Showing all ${sortedData.length} medicines` 
                : `Showing ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, sortedData.length)} of ${sortedData.length} medicines`}
            </div>
            <div
              className={expandedView && chartData.length > 10 ? "overflow-y-auto pr-2" : ""}
              style={{ maxHeight: expandedView ? "600px" : "auto" }}
            >
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 30,
                    left: 5,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    domain={[0, xAxisMaximum]}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      return value.length > 18 ? `${value.substring(0, 15)}...` : value
                    }}
                    orientation="right"
                    yAxisId={0}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="quantity" fill="#60a5fa" name="Quantity" />
                  <Bar dataKey="daysRemaining" fill="#fbbf24" name="Days Remaining" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pagination controls */}
            {!expandedView && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={goToFirstPage} 
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={goToPreviousPage} 
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={goToNextPage} 
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={goToLastPage} 
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No medicines approaching expiry</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
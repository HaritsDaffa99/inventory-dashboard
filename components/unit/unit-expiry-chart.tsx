"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { getMedicinesApproachingExpiry } from "@/lib/actions/unit-stock-history"
import { Button } from "@/components/ui/button"
import { List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react"

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
  expiryDate: Date | null // ✅ Updated to match backend (Date | null instead of Date)
  nusp: string  
}

interface ChartDataItem {
  key: number
  name: string
  fullName: string
  code: string
  quantity: number
  daysRemaining: number
  unit: string
  nusp: string
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload: ChartDataItem
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

  // 🚀 NEW: Request cancellation refs
  const currentRequestRef = useRef<{ cancelled: boolean } | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // 🚀 OPTIMIZED: Fetch with request cancellation and retry logic
  useEffect(() => {
    if (!mounted) return

    async function fetchData(retryCount = 0) {
      // Cancel any existing request
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

      // Check if request was cancelled before starting
      if (requestTracker.cancelled) return

      setIsLoading(true)
      setError(null)
      
      try {
        console.log("📅 Fetching expiry data for unit:", unitId, "medicines:", selectedMedicines.length)
        
        const response = await getMedicinesApproachingExpiry(
          unitId,
          selectedMedicines.length > 0 ? selectedMedicines : undefined,
        )
        
        // 🚀 CRITICAL: Check if request was cancelled after API call
        if (requestTracker.cancelled) {
          console.log("🚫 Expiry chart request cancelled")
          return
        }
        
        if (response.success && response.data) {
          // 🚀 FIXED: Transform data to handle potential type mismatches
          const transformedData: ExpiryData[] = response.data.map(item => ({
            ...item,
            expiryDate: item.expiryDate, // Already Date | null from backend
            daysRemaining: item.daysRemaining || 0, // Ensure number
          }))
          
          setExpiryData(transformedData)
          console.log("✅ Expiry data loaded:", transformedData.length, "medicines")
        } else {
          console.error("❌ Expiry chart API error:", response.error)
          
          // Retry logic for network errors
          if (response.error && (response.error.includes("network") || response.error.includes("fetch")) && retryCount < 2) {
            console.log(`🔄 Retrying expiry chart fetch... Attempt ${retryCount + 1}`)
            
            retryTimeoutRef.current = setTimeout(() => {
              if (!requestTracker.cancelled) {
                fetchData(retryCount + 1)
              }
            }, 1000 * (retryCount + 1))
            return
          }
          
          setError(response.error || "Failed to fetch expiry data")
        }
      } catch (error) {
        // Check if request was cancelled during error handling
        if (requestTracker.cancelled) {
          console.log("🚫 Expiry chart request cancelled during error")
          return
        }
        
        console.error("❌ Error fetching expiry data:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        
        // Retry for network errors
        if ((errorMessage.includes("network") || errorMessage.includes("fetch")) && retryCount < 2) {
          console.log(`🔄 Retrying expiry chart fetch... Attempt ${retryCount + 1}`)
          
          retryTimeoutRef.current = setTimeout(() => {
            if (!requestTracker.cancelled) {
              fetchData(retryCount + 1)
            }
          }, 1000 * (retryCount + 1))
          return
        }
        
        setError("An error occurred while fetching expiry data")
      } finally {
        // Only update loading state if request wasn't cancelled
        if (!requestTracker.cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    // 🚀 NEW: Cleanup function to cancel requests
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.cancelled = true
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [unitId, selectedMedicines, mounted])

  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(1)
  }, [expiryData])

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Medicines Approaching Expiry</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Initializing chart...</p>
          </div>
        </CardContent>
      </Card>
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
  const chartData: ChartDataItem[] = currentItems.map((item) => {
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

  // 🚀 IMPROVED: Custom tooltip with better error handling
  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-background p-3 border rounded-md shadow-lg">
          <p className="font-medium text-sm">{item.fullName}</p>
          <p className="text-xs text-gray-600">{`Code: ${item.nusp}`}</p>
          <p className="text-xs">{`Quantity: ${payload[0].value} ${item.unit}`}</p>
          <p className="text-xs">{`Days Remaining: ${item.daysRemaining}`}</p>
          {item.daysRemaining <= 30 && (
            <p className="text-xs text-red-600 font-medium">⚠️ Expires Soon</p>
          )}
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
          <CardTitle className="flex items-center gap-2">
            Medicines Approaching Expiry
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Medicines that will expire within 1 year
            {selectedMedicines.length > 0 && (
              <span className="text-blue-600"> • Filtered by {selectedMedicines.length} selected medicines</span>
            )}
          </CardDescription>
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
            disabled={isLoading}
          >
            <List className="h-4 w-4 mr-1" />
            {expandedView ? "Paginated View" : "View All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[300px] space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600">Loading expiry chart...</p>
            <p className="text-xs text-gray-500">
              🚀 Using optimized database queries
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[300px] space-y-3">
            <div className="text-red-500 text-center">
              <p className="font-medium">Failed to load expiry chart</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : expiryData.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="text-sm text-muted-foreground flex items-center justify-between">
              <span>
                {expandedView 
                  ? `Showing all ${sortedData.length} medicines` 
                  : `Showing ${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, sortedData.length)} of ${sortedData.length} medicines`}
              </span>
              {sortedData.some(item => item.daysRemaining <= 30) && (
                <span className="text-red-600 text-xs font-medium">
                  ⚠️ {sortedData.filter(item => item.daysRemaining <= 30).length} expire within 30 days
                </span>
              )}
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
                  <Bar 
                    dataKey="quantity" 
                    fill="#60a5fa" 
                    name="Quantity"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar 
                    dataKey="daysRemaining" 
                    fill="#fbbf24" 
                    name="Days Remaining"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pagination controls */}
            {!expandedView && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
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
                  <span className="text-sm mx-2">
                    {currentPage} / {totalPages}
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
          <div className="flex flex-col items-center justify-center h-[300px] space-y-3">
            <div className="bg-green-50 p-6 rounded-full">
              <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-800">Great! No Medicines Expiring Soon</p>
              <p className="text-sm text-muted-foreground mt-1">
                All medicines have sufficient shelf life (&gt;1 year)
              </p>
              {selectedMedicines.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  ✓ Based on {selectedMedicines.length} selected medicines
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
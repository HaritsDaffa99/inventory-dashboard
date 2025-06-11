"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react"
import { getLowStockWarnings } from "@/lib/actions/unit-stock-history"

interface UnitLowStockTableProps {
  unitId: number
  selectedMedicines: number[]
  unitName: string
}

// 🚀 FIXED: Updated interface to match backend response exactly
interface LowStockData {
  id: number
  name: string
  code: string
  currentStock: number
  unit: string
  minimumThreshold: number
  status: string
  expiryDate: Date | null // ✅ Changed from Date | undefined to Date | null
  daysRemaining: number | null
}

export function UnitLowStockTable({ unitId, selectedMedicines, unitName }: UnitLowStockTableProps) {
  const [lowStockItems, setLowStockItems] = useState<LowStockData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

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
        console.log("🏥 Fetching low stock warnings for unit:", unitId, "medicines:", selectedMedicines.length)
        
        const response = await getLowStockWarnings(
          unitId, 
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        )
        
        // 🚀 CRITICAL: Check if request was cancelled after API call
        if (requestTracker.cancelled) {
          console.log("🚫 Low stock request cancelled")
          return
        }
        
        if (response.success && response.data) {
          // 🚀 FIXED: Transform data to handle null -> undefined conversion if needed
          const transformedData: LowStockData[] = response.data.map(item => ({
            ...item,
            // Keep as is since we updated the interface to match backend
            expiryDate: item.expiryDate, // Date | null
            daysRemaining: item.daysRemaining, // number | null
          }))
          
          setLowStockItems(transformedData)
          console.log("✅ Low stock warnings loaded:", transformedData.length)
        } else {
          console.error("❌ Low stock API error:", response.error)
          
          // Retry logic for network errors
          if (response.error && (response.error.includes("network") || response.error.includes("fetch")) && retryCount < 2) {
            console.log(`🔄 Retrying low stock fetch... Attempt ${retryCount + 1}`)
            
            retryTimeoutRef.current = setTimeout(() => {
              if (!requestTracker.cancelled) {
                fetchData(retryCount + 1)
              }
            }, 1000 * (retryCount + 1))
            return
          }
          
          setError(response.error || "Failed to fetch low stock warnings")
        }
      } catch (error) {
        // Check if request was cancelled during error handling
        if (requestTracker.cancelled) {
          console.log("🚫 Low stock request cancelled during error")
          return
        }
        
        console.error("❌ Error fetching low stock warnings:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        
        // Retry for network errors
        if ((errorMessage.includes("network") || errorMessage.includes("fetch")) && retryCount < 2) {
          console.log(`🔄 Retrying low stock fetch... Attempt ${retryCount + 1}`)
          
          retryTimeoutRef.current = setTimeout(() => {
            if (!requestTracker.cancelled) {
              fetchData(retryCount + 1)
            }
          }, 1000 * (retryCount + 1))
          return
        }
        
        setError("An error occurred while fetching low stock warnings")
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

  // Get status badge based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Low Stock & Expiring Soon":
        return <Badge className="bg-red-500 text-white">Critical</Badge>
      case "Low Stock":
        return <Badge className="bg-amber-500 text-white">Low Stock</Badge>
      case "Expiring Soon":
        return <Badge className="bg-blue-500 text-white">Expiring</Badge>
      default:
        return <Badge className="bg-green-500 text-white">Good</Badge>
    }
  }

  // 🚀 IMPROVED: Format expiry date safely
  const formatExpiryDate = (expiryDate: Date | null) => {
    if (!expiryDate) return "N/A"
    
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(expiryDate))
    } catch {
      return "Invalid Date"
    }
  }

  // 🚀 IMPROVED: Format days remaining safely
  const formatDaysRemaining = (daysRemaining: number | null) => {
    if (daysRemaining === null || daysRemaining === undefined) return "N/A"
    
    if (daysRemaining <= 0) return "Expired"
    if (daysRemaining === 1) return "1 day"
    if (daysRemaining < 30) return `${daysRemaining} days`
    if (daysRemaining < 365) return `${Math.round(daysRemaining / 30)} months`
    return `${Math.round(daysRemaining / 365)} years`
  }

  // Pagination calculations
  const totalPages = Math.ceil(lowStockItems.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = lowStockItems.slice(indexOfFirstItem, indexOfLastItem)

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1)
  }, [lowStockItems])

  // Pagination functions
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToFirstPage = () => goToPage(1)
  const goToLastPage = () => goToPage(totalPages)
  const goToPreviousPage = () => goToPage(currentPage - 1)
  const goToNextPage = () => goToPage(currentPage + 1)

  // Don't render anything on the server, only on the client
  if (!mounted) { 
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Low Stock Warning</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <p>Initializing...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Low Stock Warning in {unitName}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
        <CardDescription>
          Medicines requiring replenishment
          {selectedMedicines.length > 0 && (
            <span className="text-blue-600"> • Filtered by {selectedMedicines.length} selected medicines</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[200px] space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600">Loading low stock warnings...</p>
            <p className="text-xs text-gray-500">
              🚀 Using optimized database queries
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[200px] space-y-3">
            <div className="text-red-500 text-center">
              <p className="font-medium">Failed to load low stock warnings</p>
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
        ) : lowStockItems.length > 0 ? (
          <>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min. Threshold</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Days to Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.expiryDate && (
                            <div className="text-xs text-gray-500">
                              Expires: {formatExpiryDate(item.expiryDate)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                          {item.code}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.currentStock <= 10 ? "text-red-600 font-semibold" : ""}>
                          {item.currentStock} {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {item.minimumThreshold} {item.unit}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {formatDaysRemaining(item.daysRemaining)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, lowStockItems.length)} of {lowStockItems.length} items
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
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
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
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] space-y-3">
            <div className="bg-green-50 p-6 rounded-full">
              <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-800">Great! No Low Stock Items</p>
              <p className="text-sm text-muted-foreground mt-1">
                All medicines in {unitName} have sufficient stock levels
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
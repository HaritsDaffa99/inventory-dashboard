"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Trophy, TrendingUp } from "lucide-react"
import { getTopMedicinesInUnit } from "@/lib/actions/unit-stock-history"

interface UnitTopMedicinesTableProps {
  unitId: number
  selectedMedicines: number[]
  unitName: string
}

interface MedicineData {
  id: number
  name: string
  code: string
  stock: number
  unit: string
  status: string
}

// ✅ FIXED: Correct component name and export
export function UnitTopMedicinesTable({ unitId, selectedMedicines, unitName }: UnitTopMedicinesTableProps) {
  const [medicines, setMedicines] = useState<MedicineData[]>([])
  const [filteredMedicines, setFilteredMedicines] = useState<MedicineData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

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
        console.log("🏆 Fetching top medicines for unit:", unitId, "medicines:", selectedMedicines.length)
        
        const response = await getTopMedicinesInUnit(
          unitId,
          selectedMedicines.length > 0 ? selectedMedicines : undefined,
        )
        
        // 🚀 CRITICAL: Check if request was cancelled after API call
        if (requestTracker.cancelled) {
          console.log("🚫 Top medicines request cancelled")
          return
        }
        
        if (response.success && response.data) {
          // ✅ Data transformation with error handling
          const transformedData: MedicineData[] = response.data.map(item => ({
            ...item,
            stock: item.stock || 0, // Ensure stock is always a number
            status: item.status || "Unknown", // Ensure status is always a string
          }))
          
          setMedicines(transformedData)
          setFilteredMedicines(transformedData)
          console.log("✅ Top medicines loaded:", transformedData.length)
        } else {
          console.error("❌ Top medicines API error:", response.error)
          
          // Retry logic for network errors
          if (response.error && (response.error.includes("network") || response.error.includes("fetch")) && retryCount < 2) {
            console.log(`🔄 Retrying top medicines fetch... Attempt ${retryCount + 1}`)
            
            retryTimeoutRef.current = setTimeout(() => {
              if (!requestTracker.cancelled) {
                fetchData(retryCount + 1)
              }
            }, 1000 * (retryCount + 1))
            return
          }
          
          setError(response.error || "Failed to fetch top medicines")
        }
      } catch (error) {
        // Check if request was cancelled during error handling
        if (requestTracker.cancelled) {
          console.log("🚫 Top medicines request cancelled during error")
          return
        }
        
        console.error("❌ Error fetching top medicines:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        
        // Retry for network errors
        if ((errorMessage.includes("network") || errorMessage.includes("fetch")) && retryCount < 2) {
          console.log(`🔄 Retrying top medicines fetch... Attempt ${retryCount + 1}`)
          
          retryTimeoutRef.current = setTimeout(() => {
            if (!requestTracker.cancelled) {
              fetchData(retryCount + 1)
            }
          }, 1000 * (retryCount + 1))
          return
        }
        
        setError("An error occurred while fetching top medicines")
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

  // 🚀 OPTIMIZED: Filter medicines with debouncing effect
  useEffect(() => {
    if (!mounted) return

    // Debounce search for better performance
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() === "") {
        setFilteredMedicines(medicines)
      } else {
        const query = searchQuery.toLowerCase()
        const filtered = medicines.filter(
          (medicine) => 
            medicine.name.toLowerCase().includes(query) || 
            medicine.code.toLowerCase().includes(query)
        )
        setFilteredMedicines(filtered)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, medicines, mounted])

  // 🚀 IMPROVED: Get status badge with better styling
  const getStatusBadge = (status: string, stock: number) => {
    // Enhanced logic based on both status and stock
    if (status === "Out of Stock" || stock === 0) {
      return <Badge className="bg-red-500 text-white">Out of Stock</Badge>
    } else if (stock < 10) {
      return <Badge className="bg-orange-500 text-white">Low Stock</Badge>
    } else if (stock < 50) {
      return <Badge className="bg-yellow-500 text-white">Medium Stock</Badge>
    } else {
      return <Badge className="bg-green-500 text-white">Available</Badge>
    }
  }

  // 🚀 NEW: Get ranking badge
  const getRankingBadge = (index: number) => {
    const rank = index + 1
    if (rank === 1) {
      return <Badge className="bg-yellow-500 text-white flex items-center gap-1"><Trophy className="h-3 w-3" />#1</Badge>
    } else if (rank === 2) {
      return <Badge className="bg-gray-400 text-white">#2</Badge>
    } else if (rank === 3) {
      return <Badge className="bg-amber-600 text-white">#3</Badge>
    } else {
      return <Badge variant="outline">#{rank}</Badge>
    }
  }

  // 🚀 IMPROVED: Format stock numbers with commas
  const formatStock = (stock: number, unit: string) => {
    return `${stock.toLocaleString()} ${unit}`
  }

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Top 5 Medicines in {unitName}</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Initializing...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Top 5 Medicines in {unitName}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
        <CardDescription>
          Based on stock quantity
          {selectedMedicines.length > 0 && (
            <span className="text-blue-600"> • Filtered by {selectedMedicines.length} selected medicines</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search medicines by name or code..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[300px] space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Loading top medicines...</p>
              <p className="text-xs text-gray-500">
                🚀 Using optimized database queries
              </p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="flex flex-col items-center justify-center h-[300px] space-y-3">
              <div className="text-red-500 text-center">
                <p className="font-medium">Failed to load top medicines</p>
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
          ) : filteredMedicines.length > 0 ? (
            /* Data Table */
            <div className="space-y-3">
              {/* Search Results Info */}
              {searchQuery && (
                <div className="text-sm text-muted-foreground">
                  {filteredMedicines.length === medicines.length 
                    ? `Showing all ${medicines.length} medicines`
                    : `Found ${filteredMedicines.length} of ${medicines.length} medicines`
                  }
                </div>
              )}

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Stock Quantity</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMedicines.map((medicine, index) => (
                      <TableRow key={medicine.id} className="hover:bg-gray-50">
                        <TableCell className="text-center">
                          {getRankingBadge(index)}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-medium">{medicine.name}</div>
                            {medicine.stock > 1000 && (
                              <div className="text-xs text-green-600">High Volume</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {medicine.code}
                          </code>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={medicine.stock > 100 ? "text-green-600" : medicine.stock > 10 ? "text-orange-600" : "text-red-600"}>
                            {formatStock(medicine.stock, medicine.unit)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(medicine.status, medicine.stock)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ❌ REMOVED: Summary Info Section */}
              
            </div>
          ) : searchQuery ? (
            /* No Search Results */
            <div className="flex flex-col items-center justify-center h-[300px] space-y-3">
              <div className="bg-gray-50 p-6 rounded-full">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-800">No medicines found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different search term or clear the filter
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="mt-2"
                >
                  Clear Search
                </Button>
              </div>
            </div>
          ) : (
            /* No Data State */
            <div className="flex flex-col items-center justify-center h-[300px] space-y-3">
              <div className="bg-blue-50 p-6 rounded-full">
                <TrendingUp className="h-12 w-12 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-800">No medicines found in {unitName}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This unit currently has no medicine inventory data
                </p>
                {selectedMedicines.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    📋 Based on {selectedMedicines.length} selected medicines
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
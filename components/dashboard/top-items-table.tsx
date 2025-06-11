"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getTopItemsByQuantity } from "@/lib/actions/medicine"

interface TopItemsTableProps {
  selectedMedicines: number[]
}

interface ItemData {
  id: number
  name: string
  code: string
  quantity: number
  unit: string
  status: string
}

export function TopItemsTable({ selectedMedicines }: TopItemsTableProps) {
  const [items, setItems] = useState<ItemData[]>([])
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

        const response = await getTopItemsByQuantity(
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        )

        // 🚀 CRITICAL: Check if request was cancelled after API call
        if (requestTracker.cancelled) return

        if (response.success && response.data) {
          setItems(response.data)
        } else if (response.error) {
          console.error("Error fetching top items:", response.error)
          
          // Check if it's a connection error and retry
          if (response.error.includes("Can't reach database server") && retryCount < 3) {
            console.log(`Retrying connection... Attempt ${retryCount + 1}`)
            
            // 🚀 IMPROVED: Use ref for timeout to allow proper cleanup
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
        
        console.error("Error fetching top items data:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        
        // Check if it's a connection error and retry
        if (errorMessage.includes("Can't reach database server") && retryCount < 3) {
          console.log(`Retrying connection... Attempt ${retryCount + 1}`)
          
          // 🚀 IMPROVED: Use ref for timeout to allow proper cleanup
          retryTimeoutRef.current = setTimeout(() => {
            if (!requestTracker.cancelled) {
              fetchData(retryCount + 1)
            }
          }, 1000 * (retryCount + 1)) // Exponential backoff
          return
        }
        
        setError(`Failed to fetch data: ${errorMessage}`)
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
        const response = await getTopItemsByQuantity(
          selectedMedicines.length > 0 ? selectedMedicines : undefined
        )

        if (requestTracker.cancelled) return

        if (response.success && response.data) {
          setItems(response.data)
        } else if (response.error) {
          setError(response.error)
        }
      } catch (error) {
        if (requestTracker.cancelled) return
        setError(`Failed to fetch data: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        if (!requestTracker.cancelled) {
          setIsLoading(false)
        }
      }
    }

    retryFetch()
  }

  // Get badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Good":
        return <Badge className="bg-green-500">Good</Badge>
      case "Fair":
        return <Badge className="bg-yellow-500">Fair</Badge>
      case "Poor":
        return <Badge className="bg-red-500">Poor</Badge>
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>
    }
  }

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Top 10 Items by Quantity</CardTitle>
          <CardDescription>Items with highest stock levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-pulse">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top 10 Items by Quantity</CardTitle>
        <CardDescription>Items with highest stock levels</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="space-y-2 text-center">
              <div className="animate-pulse">Loading data...</div>
              <p className="text-sm text-muted-foreground">
                🚀 Fast loading with optimized queries
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-red-500 space-y-4">
            <p className="text-center max-w-md">{error}</p>
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : items.length > 0 ? (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.quantity)} {item.unit}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
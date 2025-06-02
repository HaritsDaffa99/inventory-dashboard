"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { getLowStockWarnings } from "@/lib/actions/unit-stock-history"

interface UnitLowStockTableProps {
  unitId: number
  selectedMedicines: number[]
  unitName: string
}

interface LowStockData {
  id: number
  name: string
  code: string
  currentStock: number
  unit: string
  minimumThreshold: number
  status: string
  expiryDate?: Date
  nusp?: string
  daysRemaining?: number | null
}

export function UnitLowStockTable({ unitId, selectedMedicines, unitName }: UnitLowStockTableProps) {
  const [lowStockItems, setLowStockItems] = useState<LowStockData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch low stock items when unit or selected medicines change
  useEffect(() => {
    if (!mounted) return

    async function fetchData() {
      setIsLoading(true)
      try {
        const response = await getLowStockWarnings(unitId, selectedMedicines.length > 0 ? selectedMedicines : undefined)
        if (response.success && response.data) {
          setLowStockItems(response.data)
        } else {
          setError(response.error || "Failed to fetch low stock warnings")
        }
      } catch (error) {
        console.error("Error fetching low stock warnings:", error)
        setError("An error occurred while fetching low stock warnings")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [unitId, selectedMedicines, mounted])

  // Get status badge based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Low Stock & Expiring Soon":
        return <Badge className="bg-red-500">Low Stock & Expiring Soon</Badge>
      case "Low Stock":
        return <Badge className="bg-amber-500">Low Stock</Badge>
      case "Expiring Soon":
        return <Badge className="bg-blue-500">Expiring Soon</Badge>
      default:
        return <Badge className="bg-green-500">Good</Badge>
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(lowStockItems.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = lowStockItems.slice(indexOfFirstItem, indexOfLastItem)

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
    return null
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Low Stock Warning in {unitName}</CardTitle>
        <CardDescription>Medicines requiring replenishment</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <p>Loading data...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[200px] text-red-500">
            <p>{error}</p>
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
                    <TableHead className="text-right">Minimum Threshold</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.code}</TableCell>
                      <TableCell className="text-right">{item.currentStock}</TableCell>
                      <TableCell className="text-right">{item.minimumThreshold}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
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
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={goToNextPage} 
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={goToLastPage} 
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-muted-foreground">No low stock items found</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
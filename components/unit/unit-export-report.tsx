"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Download, FileSpreadsheet, Loader2 } from "lucide-react"
import {
  getUnitMetrics,
} from "@/lib/actions/unit-metrics"
import { 
  getMedicinesApproachingExpiry,
  getTopMedicinesInUnit,
  getLowStockWarnings,
  getUnitStockHistory
} from "@/lib/actions/unit-stock-history"
import { getItemConditionDistribution } from "@/lib/actions/medicine"

interface UnitExportReportProps {
  unitId: number
  unitName: string
  selectedMedicines: number[]
}

interface MetricsData {
  totalInventory: { value: number; change: number }
  totalReceipts: { value: number; change: number }
  totalDispensed: { value: number; change: number }
  expiredMedicines: { value: number; change: number }
}

interface ConditionData {
  name: string
  value: number
  percentage: number
}

interface StockHistoryData {
  month: string
  value: number
}

interface ExpiryData {
  id: number
  name: string
  code: string
  quantity: number
  daysRemaining: number
  expiryDate: Date
}

interface TopMedicineData {
  id: number
  name: string
  code: string
  stock: number
  unit: string
  status: string
}

interface LowStockData {
  id: number
  name: string
  code: string
  currentStock: number
  minimumThreshold: number
  status: string
}

interface ExportData {
  metrics?: MetricsData
  conditionData?: ConditionData[]
  stockHistory?: StockHistoryData[]
  approachingExpiryItems?: ExpiryData[]
  topItems?: TopMedicineData[]
  lowStockItems?: LowStockData[]
}

export function UnitExportReport({ unitId, unitName, selectedMedicines }: UnitExportReportProps) {
  const [includeMetrics, setIncludeMetrics] = useState(true)
  const [includeTopItems, setIncludeTopItems] = useState(true)
  const [includeConditionData, setIncludeConditionData] = useState(true)
  const [includeExpiryData, setIncludeExpiryData] = useState(true)
  const [includeStockHistory, setIncludeStockHistory] = useState(true)
  const [includeLowStockData, setIncludeLowStockData] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [exportData, setExportData] = useState<ExportData | null>(null)

  // Format date for filename
  const formatDate = () => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  // Fetch data for export - breaking it down into steps
  const fetchExportData = async () => {
    setIsExporting(true)
    const data: ExportData = {}
    
    try {
      // Validate unitId
      if (!unitId) {
        console.error("Unit ID is missing")
        setIsExporting(false)
        return null
      }

      // Ensure we have a valid number for unitId
      const safeUnitId = Number(unitId)
      
      // Ensure selectedMedicines is an array
      const safeMedicines = Array.isArray(selectedMedicines) ? [...selectedMedicines] : []
      const medicinesParam = safeMedicines.length > 0 ? safeMedicines : undefined

      // Step 1: Fetch metrics data
      if (includeMetrics) {
        try {
          const metricsResponse = await getUnitMetrics(safeUnitId, medicinesParam)
          if (metricsResponse?.success) {
            data.metrics = metricsResponse.data as MetricsData
          }
        } catch (error) {
          console.error("Failed to fetch metrics:", error)
        }
      }

      // Step 2: Fetch condition data
      if (includeConditionData) {
        try {
          const conditionResponse = await getItemConditionDistribution(safeUnitId, safeMedicines)
          if (conditionResponse?.success) {
            data.conditionData = conditionResponse.data as ConditionData[]
          }
        } catch (error) {
          console.error("Failed to fetch condition data:", error)
        }
      }

      // Step 3: Fetch expiry data
      if (includeExpiryData) {
        try {
          const expiryResponse = await getMedicinesApproachingExpiry(safeUnitId, medicinesParam)
          if (expiryResponse?.success) {
            data.approachingExpiryItems = expiryResponse.data as ExpiryData[]
          }
        } catch (error) {
          console.error("Failed to fetch expiry data:", error)
        }
      }

      // Step 4: Fetch stock history data
      if (includeStockHistory) {
        try {
          const stockHistoryResponse = await getUnitStockHistory(safeUnitId)
          if (stockHistoryResponse?.success) {
            data.stockHistory = stockHistoryResponse.data as StockHistoryData[]
          }
        } catch (error) {
          console.error("Failed to fetch stock history:", error)
        }
      }

      // Step 5: Fetch top items data
      if (includeTopItems) {
        try {
          const topMedicinesResponse = await getTopMedicinesInUnit(safeUnitId, medicinesParam)
          if (topMedicinesResponse?.success) {
            data.topItems = topMedicinesResponse.data as TopMedicineData[]
          }
        } catch (error) {
          console.error("Failed to fetch top medicines data:", error)
        }
      }

      // Step 6: Fetch low stock items
      if (includeLowStockData) {
        try {
          const lowStockResponse = await getLowStockWarnings(safeUnitId, medicinesParam)
          if (lowStockResponse?.success) {
            data.lowStockItems = lowStockResponse.data as LowStockData[]
          }
        } catch (error) {
          console.error("Failed to fetch low stock items:", error)
        }
      }

      setExportData(data)
      return data
    } catch (error) {
      console.error("Error in fetchExportData:", error)
      setIsExporting(false)
      return null
    }
  }

  // Generate CSV content
  const generateCSVData = (data: ExportData) => {
    const csvData: string[][] = []
    
    // Add report title and date
    csvData.push([`${unitName}`])
    csvData.push(["Generated on:", new Date().toLocaleString()])
    csvData.push([]) // Empty row for spacing

    // Add metrics data if available
    if (includeMetrics && data.metrics) {
      csvData.push(["Unit Metrics Summary"])
      csvData.push(["Metric", "Value", "Change (%)"])
      
      // Safely access metrics data
      const metrics = data.metrics
      
      csvData.push([
        "Total Inventory",
        metrics.totalInventory?.value?.toString() || "0",
        metrics.totalInventory?.change?.toString() || "0.0",
      ])
      
      csvData.push([
        "Received Items (30d)",
        metrics.totalReceipts?.value?.toString() || "0",
        metrics.totalReceipts?.change?.toString() || "0.0",
      ])
      
      csvData.push([
        "Dispensed Items (30d)",
        metrics.totalDispensed?.value?.toString() || "0",
        metrics.totalDispensed?.change?.toString() || "0.0",
      ])
      
      csvData.push([
        "Expiring Soon (90d)",
        metrics.expiredMedicines?.value?.toString() || "0",
        metrics.expiredMedicines?.change?.toString() || "0.0",
      ])
      
      csvData.push([]) // Empty row for spacing
    }

    // Add stock history data if available
    if (includeStockHistory && Array.isArray(data.stockHistory)) {
      csvData.push(["Stock History"])
      csvData.push(["Month", "Stock Level"])
      
      data.stockHistory.forEach((item: StockHistoryData) => {
        csvData.push([
          item.month || "Unknown",
          item.value?.toString() || "0"
        ])
      })
      
      csvData.push([]) // Empty row for spacing
    }

    // Add medicines approaching expiry data if available
    if (includeExpiryData && Array.isArray(data.approachingExpiryItems)) {
      csvData.push(["Medicines Approaching Expiry"])
      csvData.push(["Medicine Name", "Code", "Quantity", "Days Remaining", "Expiry Date"])
      
      // Sort by days remaining (ascending)
      const sortedItems = [...data.approachingExpiryItems]
        .sort((a, b) => a.daysRemaining - b.daysRemaining)
      
      sortedItems.forEach((item: ExpiryData) => {
        const expiryDate = item.expiryDate ? 
          new Date(item.expiryDate).toLocaleDateString() : 
          "Unknown"
          
        csvData.push([
          item.name || "Unknown",
          item.code || "-",
          item.quantity?.toString() || "0",
          item.daysRemaining?.toString() || "0",
          expiryDate
        ])
      })
      
      csvData.push([]) // Empty row for spacing
    }

    // Add condition data if available
    if (includeConditionData && Array.isArray(data.conditionData)) {
      csvData.push(["Item Condition Distribution"])
      csvData.push(["Condition", "Count", "Percentage (%)"])
      
      data.conditionData.forEach((item: ConditionData) => {
        csvData.push([
          item.name || "Unknown",
          item.value?.toString() || "0",
          (item.percentage || 0).toFixed(1),
        ])
      })
      
      csvData.push([]) // Empty row for spacing
    }

    // Add top items by quantity if available
    if (includeTopItems && Array.isArray(data.topItems)) {
      csvData.push(["Top Medicines by Quantity"])
      csvData.push(["Medicine Name", "Code", "Stock", "Unit", "Status"])
      
      data.topItems.forEach((item: TopMedicineData) => {
        csvData.push([
          item.name || "Unknown",
          item.code || "-",
          item.stock?.toString() || "0",
          item.unit || "Unit",
          item.status || "Unknown",
        ])
      })
      
      csvData.push([]) // Empty row for spacing
    }

    // Add low stock items if available
    if (includeLowStockData && Array.isArray(data.lowStockItems)) {
      csvData.push(["Low Stock Items"])
      csvData.push(["Item Name", "Code", "Current Stock", "Minimum Threshold", "Status"])
      
      data.lowStockItems.forEach((item: LowStockData) => {
        csvData.push([
          item.name || "Unknown",
          item.code || "-",
          item.currentStock?.toString() || "0",
          item.minimumThreshold?.toString() || "0",
          item.status || "Low Stock",
        ])
      })
    }

    return csvData
  }

  // Export to CSV
  const exportToCSV = async () => {
    setIsExporting(true)
    
    try {
      // Fetch data (or use cached data if already fetched)
      const data = exportData || await fetchExportData()
      
      if (!data) {
        alert("Failed to fetch export data. Please try again.")
        setIsExporting(false)
        return
      }

      // Generate CSV data
      const csvData = generateCSVData(data)
      
      // Convert to CSV format
      const csvContent = csvData.map((row) => 
        row.map((cell) => 
          typeof cell === 'string' ? 
            `"${cell.replace(/"/g, '""')}"` : 
            `"${cell}"`
        ).join(",")
      ).join("\n")
      
      // Create blob and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `${unitName.replace(/\s+/g, "-")}-report-${formatDate()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Close dialog
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error exporting to CSV:", error)
      alert("An error occurred while exporting. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  // Handle dialog open to prefetch data
  const handleOpenDialog = () => {
    setIsDialogOpen(true)
    // Reset export data when opening dialog
    setExportData(null)
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2" onClick={handleOpenDialog}>
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Unit Report</DialogTitle>
          <DialogDescription>Choose the content to include in your CSV report.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="metrics-csv"
              checked={includeMetrics}
              onCheckedChange={(checked) => setIncludeMetrics(checked as boolean)}
            />
            <Label htmlFor="metrics-csv">Include metrics summary</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="stock-history-csv"
              checked={includeStockHistory}
              onCheckedChange={(checked) => setIncludeStockHistory(checked as boolean)}
            />
            <Label htmlFor="stock-history-csv">Include stock history</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="expiry-csv"
              checked={includeExpiryData}
              onCheckedChange={(checked) => setIncludeExpiryData(checked as boolean)}
            />
            <Label htmlFor="expiry-csv">Include medicines approaching expiry</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="items-csv"
              checked={includeTopItems}
              onCheckedChange={(checked) => setIncludeTopItems(checked as boolean)}
            />
            <Label htmlFor="items-csv">Include top medicines</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="condition-csv"
              checked={includeConditionData}
              onCheckedChange={(checked) => setIncludeConditionData(checked as boolean)}
            />
            <Label htmlFor="condition-csv">Include condition distribution</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="lowstock-csv"
              checked={includeLowStockData}
              onCheckedChange={(checked) => setIncludeLowStockData(checked as boolean)}
            />
            <Label htmlFor="lowstock-csv">Include low stock items</Label>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={exportToCSV} disabled={isExporting} className="flex items-center gap-2">
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
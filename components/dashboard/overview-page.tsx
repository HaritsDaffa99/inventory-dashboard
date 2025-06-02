"use client"

import { useState, useEffect, useTransition } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OverviewCards } from "@/components/dashboard/overview-cards"
import { ConditionSection } from "@/components/dashboard/condition-section"
import { ItemsSection } from "@/components/dashboard/items-section"
import { TablesSection } from "@/components/dashboard/tables-section"
import { NotificationBell } from "@/components/notification/notification-bell"
import { getUnits, getDashboardMetrics } from "@/lib/actions/medicine"
import { ExportReport } from "@/components/dashboard/export-report"
import { AIInsightsPanel } from "@/components/dashboard/ai-insights-panel"

// Types based on your Prisma schema
interface Unit {
  id: number
  namaUnit: string
  kodeUnit: string
  akronim: string
  levelUnit: number
}

// Updated interface to allow null values for change properties
interface DashboardMetrics {
  totalReceipts: {
    value: number
    change: number | null
  }
  totalDispensed: {
    value: number
    change: number | null
  }
  availableStock: {
    value: number
    change: number | null
  }
  stockToConsumptionRatio: {
    value: number
    change: number | null
  }
}

export function OverviewPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string>("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedMedicines, setSelectedMedicines] = useState<number[]>([])

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch units and metrics on component mount
  useEffect(() => {
    if (!mounted) return

    async function fetchData() {
      try {
        setIsLoading(true)

        // Use startTransition to avoid blocking the UI
        startTransition(async () => {
          // Fetch units
          const unitsResponse = await getUnits()
          if (unitsResponse.success && unitsResponse.data) {
            setUnits(unitsResponse.data)
          }

          // Fetch dashboard metrics
          const metricsResponse = await getDashboardMetrics()
          if (metricsResponse.success && metricsResponse.data) {
            setMetrics(metricsResponse.data)
          }

          setIsLoading(false)
        })
      } catch (error) {
        console.error("Error fetching data:", error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [mounted])

  // Handle medicine selection from filter
  const handleMedicineSelectionChange = (medicineIds: number[]) => {
    setSelectedMedicines(medicineIds)
  }

  // Handle unit selection
  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId)

    // If a specific unit is selected (not overview), navigate to the unit detail page
    if (unitId !== "overview") {
      // Based on your directory structure, the correct path is:
      window.location.href = `/dashboard/unit/${unitId}`
    }
  }

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return null
  }

  // Transform metrics data for AI Insights Panel - always return an object, never undefined
  const transformedMetrics = {
    totalInventory: metrics ? {
      value: metrics.availableStock.value,
      change: metrics.availableStock.change ?? 0
    } : { value: 0, change: 0 },
    stockValue: metrics ? {
      value: metrics.stockToConsumptionRatio.value,
      change: metrics.stockToConsumptionRatio.change ?? 0
    } : { value: 0, change: 0 },
    expiringItems: { value: 0, change: 0 } // Default value
  }

  // Create default metrics for ExportReport when metrics is null
  const defaultMetrics: DashboardMetrics = {
    totalReceipts: { value: 0, change: 0 },
    totalDispensed: { value: 0, change: 0 },
    availableStock: { value: 0, change: 0 },
    stockToConsumptionRatio: { value: 0, change: 0 }
  }

  return (
    <div className="min-h-screen bg-background w-full">
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
            <p className="text-muted-foreground">Monitor inventory across all units</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportReport metrics={metrics || defaultMetrics} selectedMedicines={selectedMedicines} />
            <NotificationBell />
            <Select value={selectedUnitId} onValueChange={handleUnitChange} disabled={isLoading || isPending}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id.toString()}>
                    {unit.namaUnit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <OverviewCards metrics={metrics} isLoading={isLoading || isPending} />

        <ConditionSection onMedicineSelectionChange={handleMedicineSelectionChange} />

        <ItemsSection selectedMedicines={selectedMedicines} />

        <TablesSection selectedMedicines={selectedMedicines} />
        
        {/* Add AI Insights Panel with transformed metrics */}
        <AIInsightsPanel
          metrics={transformedMetrics}
          selectedMedicines={selectedMedicines}
          isLoading={isLoading || isPending}
        />
      </div>
    </div>
  )
}
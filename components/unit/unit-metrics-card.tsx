"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getUnitMetrics } from "@/lib/actions/unit-metrics"
import { ArrowDown, ArrowUp, Package, ShoppingCart, Truck, AlertTriangle, Minus } from "lucide-react"

interface UnitMetricsCardsProps {
  unitId: string | number
  selectedMedicines?: number[]
}

interface MetricsData {
  totalInventory: { value: number; change: number }
  totalReceipts: { value: number; change: number }
  totalDispensed: { value: number; change: number }
  expiredMedicines: { value: number; change: number }
}

export function UnitMetricsCards({ unitId }: UnitMetricsCardsProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchMetrics = async () => {
      setLoading(true)
      try {
        console.log("Fetching metrics for unitId:", unitId)

        const response = await getUnitMetrics(unitId)
        console.log("Metrics response:", response)

        if (response && response.success && response.data) {
          setMetrics(response.data as MetricsData)
          setError(null)
        } else {
          setError(response?.error || "Failed to fetch metrics")
          console.error("Failed to fetch metrics:", response)
          // Set default metrics to avoid null/undefined errors
          setMetrics({
            totalInventory: { value: 0, change: 0 },
            totalReceipts: { value: 0, change: 0 },
            totalDispensed: { value: 0, change: 0 },
            expiredMedicines: { value: 0, change: 0 },
          })
        }
      } catch (err) {
        console.error("Error in fetchMetrics:", err)
        setError("An error occurred while fetching metrics")
        // Set default metrics to avoid null/undefined errors
        setMetrics({
          totalInventory: { value: 0, change: 0 },
          totalReceipts: { value: 0, change: 0 },
          totalDispensed: { value: 0, change: 0 },
          expiredMedicines: { value: 0, change: 0 },
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [unitId, mounted]) // Added mounted to dependency array

  // Format number with commas
  const formatNumber = (num: number) => {
    if (num === undefined || num === null) return "0"
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Inventory Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : error ? (
            <div className="text-sm text-red-500">Error loading data</div>
          ) : (
            <>
              <div className="text-2xl font-bold">{formatNumber(metrics?.totalInventory?.value || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {(metrics?.totalInventory?.change || 0) > 0 ? (
                  <span className="flex items-center text-green-600">
                    <ArrowUp className="mr-1 h-3 w-3" />
                    {(metrics?.totalInventory?.change || 0).toFixed(1)}% from last month
                  </span>
                ) : (metrics?.totalInventory?.change || 0) < 0 ? (
                  <span className="flex items-center text-red-600">
                    <ArrowDown className="mr-1 h-3 w-3" />
                    {Math.abs(metrics?.totalInventory?.change || 0).toFixed(1)}% from last month
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500">
                    <Minus className="mr-1 h-3 w-3" />
                    0.0% from last month
                  </span>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Received Items Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Received Items (This Month)</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : error ? (
            <div className="text-sm text-red-500">Error loading data</div>
          ) : (
            <>
              <div className="text-2xl font-bold">{formatNumber(metrics?.totalReceipts?.value || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {(metrics?.totalReceipts?.change || 0) > 0 ? (
                  <span className="flex items-center text-green-600">
                    <ArrowUp className="mr-1 h-3 w-3" />
                    {(metrics?.totalReceipts?.change || 0).toFixed(1)}% from last month
                  </span>
                ) : (metrics?.totalReceipts?.change || 0) < 0 ? (
                  <span className="flex items-center text-red-600">
                    <ArrowDown className="mr-1 h-3 w-3" />
                    {Math.abs(metrics?.totalReceipts?.change || 0).toFixed(1)}% from last month
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500">
                    <Minus className="mr-1 h-3 w-3" />
                    0.0% from last month
                  </span>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dispensed Items Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dispensed Items (This Month)</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : error ? (
            <div className="text-sm text-red-500">Error loading data</div>
          ) : (
            <>
              <div className="text-2xl font-bold">{formatNumber(metrics?.totalDispensed?.value || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {(metrics?.totalDispensed?.change || 0) > 0 ? (
                  <span className="flex items-center text-green-600">
                    <ArrowUp className="mr-1 h-3 w-3" />
                    {(metrics?.totalDispensed?.change || 0).toFixed(1)}% from last month
                  </span>
                ) : (metrics?.totalDispensed?.change || 0) < 0 ? (
                  <span className="flex items-center text-red-600">
                    <ArrowDown className="mr-1 h-3 w-3" />
                    {Math.abs(metrics?.totalDispensed?.change || 0).toFixed(1)}% from last month
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500">
                    <Minus className="mr-1 h-3 w-3" />
                    0.0% from last month
                  </span>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Expiring Soon Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expiring Soon (90d)</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-[100px]" />
          ) : error ? (
            <div className="text-sm text-red-500">Error loading data</div>
          ) : (
            <>
              <div className="text-2xl font-bold">{formatNumber(metrics?.expiredMedicines?.value || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {(metrics?.expiredMedicines?.change || 0) > 0 ? (
                  <span className="flex items-center text-amber-600">
                    <ArrowUp className="mr-1 h-3 w-3" />
                    {(metrics?.expiredMedicines?.change || 0).toFixed(1)}% from last month
                  </span>
                ) : (metrics?.expiredMedicines?.change || 0) < 0 ? (
                  <span className="flex items-center text-green-600">
                    <ArrowDown className="mr-1 h-3 w-3" />
                    {Math.abs(metrics?.expiredMedicines?.change || 0).toFixed(1)}% from last month
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500">
                    <Minus className="mr-1 h-3 w-3" />
                    0.0% from last month
                  </span>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
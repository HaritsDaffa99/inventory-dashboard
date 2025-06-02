"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { getUnitInventorySummary } from "@/lib/actions/unit-metrics"
import { Package, CheckCircle, AlertTriangle } from "lucide-react"

interface UnitInventorySummaryProps {
  unitId: number
}

interface InventorySummary {
  uniqueMedicines: number
  available: number
  damagedOrExpired: number
}

export function UnitInventorySummary({ unitId }: UnitInventorySummaryProps) {
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Fix hydration issues by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch inventory summary for the unit
  useEffect(() => {
    if (!mounted) return

    async function fetchInventorySummary() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await getUnitInventorySummary(unitId)
        if (response.success && response.data) {
          setInventorySummary(response.data)
        } else {
          // Type-safe way to access error property
          setError('error' in response ? response.error : "Failed to fetch inventory summary")
        }
      } catch (error) {
        console.error("Error fetching inventory summary:", error)
        setError("An error occurred while fetching inventory summary")
      } finally {
        setIsLoading(false)
      }
    }

    fetchInventorySummary()
  }, [unitId, mounted])

  // Don't render anything on the server, only on the client
  if (!mounted) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <div className="flex flex-col items-center">
                <div className="text-sm text-muted-foreground">Unique Medicines</div>
                <div className="h-8 w-16 animate-pulse bg-muted rounded mt-2"></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-sm text-muted-foreground">Available</div>
                <div className="h-8 w-16 animate-pulse bg-muted rounded mt-2"></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-sm text-muted-foreground">Damaged/Expired</div>
                <div className="h-8 w-16 animate-pulse bg-muted rounded mt-2"></div>
              </div>
            </>
          ) : error ? (
            <div className="col-span-3 text-center text-red-500 py-4">{error}</div>
          ) : inventorySummary ? (
            <>
              <div className="flex flex-col items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Package className="h-4 w-4 mr-1" />
                  Unique Medicines
                </div>
                <div className="text-4xl font-bold mt-2">{inventorySummary.uniqueMedicines}</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Available
                </div>
                <div className="text-4xl font-bold mt-2 text-green-600">{inventorySummary.available}</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Damaged/Expired
                </div>
                <div className="text-4xl font-bold mt-2 text-red-500">{inventorySummary.damagedOrExpired}</div>
              </div>
            </>
          ) : (
            <div className="col-span-3 text-center text-muted-foreground py-4">No inventory data available</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
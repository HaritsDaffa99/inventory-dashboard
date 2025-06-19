"use client"

import { useState, useEffect } from "react"
import OutbreakForecast from "@/components/disease-outbreak/outbreak-forecast"
import { Loader2 } from "lucide-react"
import { getStockDataForOutbreak } from "@/lib/actions/stock-data"

interface StockMedicine {
  id: number
  name: string
  currentQuantity: number
  weeklyConsumption: number
  daysRemaining: number
  category: string
  unitName?: string
  expiryDate?: string
}

interface StockData {
  medicines: StockMedicine[]
  totalUnits: number
  totalValue?: number
}

export default function DiseaseOutbreakPage() {
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [isLoadingStock, setIsLoadingStock] = useState(true)
  const [stockError, setStockError] = useState<string | null>(null)

  // Fetch stock data for outbreak preparedness analysis
  useEffect(() => {
    const fetchStockData = async () => {
      try {
        console.log("📊 Fetching stock data for outbreak analysis...")
        
        // ✅ FIXED: Call server action directly (not API route)
        const data = await getStockDataForOutbreak()
        
        console.log("✅ Stock data loaded successfully:", data)
        setStockData(data)
        
      } catch (error) {
        console.error("❌ Error fetching stock data:", error)
        setStockError(error instanceof Error ? error.message : 'Failed to load stock data')
      } finally {
        setIsLoadingStock(false)
      }
    }

    fetchStockData()
  }, [])

  // Add debug logging to see what's happening
  console.log("🔍 Current state:", {
    stockData: stockData ? `${stockData.medicines.length} medicines` : 'null',
    isLoadingStock,
    stockError
  })

  if (isLoadingStock) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading outbreak analysis data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <OutbreakForecast 
        stockData={stockData} 
        stockError={stockError}
      />
    </div>
  )
}
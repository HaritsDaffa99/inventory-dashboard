"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// Add this new function to get a single medicine by ID
export async function getMedicine(medicineId: string) {
  try {
    const medicine = await prisma.persediaan.findUnique({
      where: {
        id: parseInt(medicineId), // Convert string to number since your ID is number
      },
      select: {
        id: true,
        namaPersediaan: true,
        kodePersediaan: true,
        tipe: true,
      },
    })

    if (!medicine) {
      return {
        success: false,
        error: "Medicine not found",
        data: null,
      }
    }

    // Transform to match the expected interface in stock-chart.tsx
    const transformedMedicine = {
      id: medicine.id.toString(), // Convert back to string for compatibility
      medicine_name: medicine.namaPersediaan,
      transaction_status: "Current", // Default status since this isn't in your schema
    }

    return {
      success: true,
      data: transformedMedicine,
    }
  } catch (error) {
    console.error("Error fetching medicine:", error)
    return {
      success: false,
      error: `Failed to fetch medicine: ${error instanceof Error ? error.message : "Unknown error"}`,
      data: null,
    }
  }
}

// Add this new function to get medicines for a specific unit
export async function getUnitMedicines(unitId: number) {
  try {
    // Get all persediaan IDs that have stock in this unit
    const stockItems = await prisma.stokOpname.findMany({
      where: {
        unitId: unitId,
      },
      select: {
        persediaanId: true,
      },
      distinct: ["persediaanId"],
    })

    // Extract the persediaanIds
    const persediaanIds = stockItems.map((item) => item.persediaanId)

    // Get the persediaan details for these IDs
    const medicines = await prisma.persediaan.findMany({
      where: {
        id: {
          in: persediaanIds,
        },
      },
      orderBy: {
        namaPersediaan: "asc",
      },
    })

    return {
      success: true,
      data: medicines,
    }
  } catch (error) {
    console.error("Error fetching unit medicines:", error)
    return {
      success: false,
      error: `Failed to fetch unit medicines: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getStockOpnameByUnit(unitId: number) {
  try {
    const stockData = await prisma.stokOpname.findMany({
      where: {
        unitId: unitId,
      },
      include: {
        persediaan: {
          select: {
            namaPersediaan: true,
            kodePersediaan: true,
            tipe: true, // Changed from jenisPersediaan to tipe
          },
        },
        satuan: {
          select: {
            satuan: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    })

    return {
      data: stockData,
      success: true,
    }
  } catch (error) {
    console.error("Error fetching stock data:", error)
    return {
      success: false,
      error: `Failed to fetch stock data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// 🚀 OPTIMIZED: Single aggregate query instead of multiple queries
export async function getItemConditionDistribution(unitId?: number, persediaanIds?: number[]) {
  try {
    // Build the StokOpname query
    const stockOpnameQuery: Prisma.StokOpnameWhereInput = {}

    if (unitId) {
      stockOpnameQuery.unitId = unitId
    }

    if (persediaanIds && persediaanIds.length > 0) {
      stockOpnameQuery.persediaanId = { in: persediaanIds }
    }

    // 🚀 OPTIMIZED: Single aggregate query instead of multiple queries
    const stockOpname = await prisma.stokOpname.aggregate({
      _sum: {
        jumlah: true,        // Total items
        hilang: true,        // Lost
        rusakRingan: true,   // Minor Damage
        usang: true,         // Expired
        rusakBerat: true,    // Major Damage
      },
      where: stockOpnameQuery,
    })

    const totalItems = stockOpname._sum.jumlah || 0
    const damaged = {
      "Minor Damage": stockOpname._sum.rusakRingan || 0,
      "Major Damage": stockOpname._sum.rusakBerat || 0,
      "Expired": stockOpname._sum.usang || 0,
      "Lost": stockOpname._sum.hilang || 0,
    }

    const totalDamaged = Object.values(damaged).reduce((sum, val) => sum + val, 0)
    const goodItems = Math.max(0, totalItems - totalDamaged)

    // 🚀 OPTIMIZED: Build result directly without additional queries
    const chartData = [
      { name: "Good", value: goodItems, percentage: totalItems > 0 ? (goodItems / totalItems) * 100 : 0 },
      ...Object.entries(damaged).map(([condition, count]) => ({
        name: condition,
        value: count,
        percentage: totalItems > 0 ? (count / totalItems) * 100 : 0,
      }))
    ]

    return {
      success: true,
      data: chartData,
    }
  } catch (error) {
    console.error("Error fetching item condition distribution:", error)
    return {
      success: false,
      error: `Failed to fetch item condition distribution: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getAllPersediaan() {
  try {
    const persediaan = await prisma.persediaan.findMany({
      orderBy: {
        namaPersediaan: "asc",
      },
    })

    return {
      success: true,
      data: persediaan,
    }
  } catch (error) {
    console.error("Error fetching persediaan:", error)
    return {
      success: false,
      error: `Failed to fetch persediaan: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getUnits() {
  try {
    const units = await prisma.unit.findMany({
      where: {
        temp: false, // Only get active units
      },
      orderBy: {
        namaUnit: "asc",
      },
    })

    return {
      data: units,
      success: true,
    }
  } catch (error) {
    console.error("Error fetching units:", error)
    return {
      success: false,
      error: `Failed to fetch units: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getDashboardMetrics() {
  try {
    // Get current date and calculate first day of current and previous month
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // First day of current month in UTC
    const firstDayCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1))
    
    // First day of next month in UTC (used to get the end of current month)
    const firstDayNextMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 1))
    
    // First day of previous month in UTC
    const firstDayPreviousMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1))
    
    // Debug date ranges
    console.log({
      firstDayCurrentMonth: firstDayCurrentMonth.toISOString(),
      firstDayNextMonth: firstDayNextMonth.toISOString(),
      firstDayPreviousMonth: firstDayPreviousMonth.toISOString(),
    })

    // Get receipts for current month
    const currentMonthReceipts = await prisma.penerimaan.findMany({
      where: {
        tanggalPenerimaan: {
          gte: firstDayCurrentMonth,
          lt: firstDayNextMonth,
        },
      },
      include: {
        rincianPenerimaan: {
          select: {
            jumlah: true, // Changed from banyak to jumlah
          },
        },
      },
    })

    // Get receipts for previous month
    const previousMonthReceipts = await prisma.penerimaan.findMany({
      where: {
        tanggalPenerimaan: {
          gte: firstDayPreviousMonth,
          lt: firstDayCurrentMonth,
        },
      },
      include: {
        rincianPenerimaan: {
          select: {
            jumlah: true, // Changed from banyak to jumlah
          },
        },
      },
    })

    // Get dispensed items for current month
    const currentMonthDispensed = await prisma.pengeluaran.findMany({
      where: {
        tanggalSah: {
          gte: firstDayCurrentMonth,
          lt: firstDayNextMonth,
        },
      },
      include: {
        rincianPengeluaran: {
          select: {
            banyak: true,
          },
        },
      },
    })

    // Get dispensed items for previous month
    const previousMonthDispensed = await prisma.pengeluaran.findMany({
      where: {
        tanggalSah: {
          gte: firstDayPreviousMonth,
          lt: firstDayCurrentMonth,
        },
      },
      include: {
        rincianPengeluaran: {
          select: {
            banyak: true,
          },
        },
      },
    })

    // Calculate total receipts for current month
    const receiptsCurrentMonth = currentMonthReceipts.reduce((total, receipt) => {
      return total + receipt.rincianPenerimaan.reduce((sum, item) => sum + (item.jumlah || 0), 0)
    }, 0)

    // Calculate total receipts for previous month
    const receiptsPreviousMonth = previousMonthReceipts.reduce((total, receipt) => {
      return total + receipt.rincianPenerimaan.reduce((sum, item) => sum + (item.jumlah || 0), 0)
    }, 0)

    // Calculate total dispensed for current month
    const dispensedCurrentMonth = currentMonthDispensed.reduce((total, dispensed) => {
      return total + dispensed.rincianPengeluaran.reduce((sum, item) => sum + (item.banyak || 0), 0)
    }, 0)

    // Calculate total dispensed for previous month
    const dispensedPreviousMonth = previousMonthDispensed.reduce((total, dispensed) => {
      return total + dispensed.rincianPengeluaran.reduce((sum, item) => sum + (item.banyak || 0), 0)
    }, 0)

    // Get current stock from stokOpname
    const currentStock = await prisma.stokOpname.aggregate({
      _sum: {
        jumlah: true,
      },
    })

    // Calculate percentage changes
    const receiptChange =
      receiptsPreviousMonth > 0 ? ((receiptsCurrentMonth - receiptsPreviousMonth) / receiptsPreviousMonth) * 100 : 0

    const dispensedChange =
      dispensedPreviousMonth > 0
        ? ((dispensedCurrentMonth - dispensedPreviousMonth) / dispensedPreviousMonth) * 100
        : 0

    // Calculate stock-to-consumption ratio (current stock / monthly consumption)
    const stockToConsumptionRatio =
      dispensedCurrentMonth > 0 ? (currentStock._sum.jumlah || 0) / dispensedCurrentMonth : 0

    // Calculate previous month's stock-to-consumption ratio for comparison
    const previousMonthStockOpname = await prisma.stokOpname.aggregate({
      _sum: {
        jumlah: true,
      },
    })

    const previousStockToConsumptionRatio =
      dispensedPreviousMonth > 0 ? (previousMonthStockOpname._sum.jumlah || 0) / dispensedPreviousMonth : 0

    const stockToConsumptionChange =
      previousStockToConsumptionRatio > 0
        ? ((stockToConsumptionRatio - previousStockToConsumptionRatio) / previousStockToConsumptionRatio) * 100
        : 0

    // Return formatted metrics
    return {
      success: true,
      data: {
        totalReceipts: {
          value: receiptsCurrentMonth,
          change: receiptChange,
        },
        totalDispensed: {
          value: dispensedCurrentMonth,
          change: dispensedChange,
        },
        availableStock: {
          value: currentStock._sum.jumlah || 0,
          change: null,
        },
        stockToConsumptionRatio: {
          value: stockToConsumptionRatio,
          change: stockToConsumptionChange,
        },
      },
    }
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error)
    return {
      success: false,
      error: `Failed to fetch dashboard metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// 🚀 OPTIMIZED: Single query with joins instead of groupBy + Promise.all
export async function getTopReceivedItems(selectedMedicines?: number[]) {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    const firstDayCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1))
    const firstDayNextMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 1))

    const whereClause: Prisma.RincianPenerimaanWhereInput = {
      temp: false,
      penerimaan: {
        tanggalPenerimaan: {
          gte: firstDayCurrentMonth,
          lt: firstDayNextMonth,
        }
      }
    }

    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      }
    }

    // 🚀 OPTIMIZED: Single query with joins instead of groupBy + Promise.all
    const topItemsWithDetails = await prisma.rincianPenerimaan.findMany({
      where: whereClause,
      include: {
        persediaan: {
          select: {
            id: true,
            namaPersediaan: true,
            kodePersediaan: true,
            tipe: true,
          },
        },
      },
      orderBy: {
        jumlah: 'desc',
      },
    })

    // 🚀 OPTIMIZED: Group by persediaanId in memory
    const groupedData = topItemsWithDetails.reduce((acc, item) => {
      const existing = acc.find(x => x.persediaanId === item.persediaanId)
      if (existing) {
        existing.totalJumlah += item.jumlah || 0
      } else {
        acc.push({
          persediaanId: item.persediaanId,
          persediaan: item.persediaan,
          totalJumlah: item.jumlah || 0
        })
      }
      return acc
    }, [] as Array<{
      persediaanId: number,
      persediaan: {
        id: number;
        namaPersediaan: string;
        kodePersediaan: string;
        tipe: string;
      } | null,
      totalJumlah: number
    }>)

    // Sort and take top 10
    const top10 = groupedData
      .sort((a, b) => b.totalJumlah - a.totalJumlah)
      .slice(0, 10)

    const result = top10.map((item) => ({
      id: item.persediaanId,
      name: item.persediaan ? `${item.persediaan.namaPersediaan}` : `Item #${item.persediaanId}`,
      value: item.totalJumlah,
    }))

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error("Error fetching top received items:", error)
    return {
      success: false,
      error: `Failed to fetch top received items: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// 🚀 OPTIMIZED: Single query with joins instead of groupBy + Promise.all
export async function getTopDispensedItems(selectedMedicines?: number[]) {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    const firstDayCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1))
    const firstDayNextMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 1))

    const whereClause: Prisma.RincianPengeluaranWhereInput = {
      pengeluaran: {
        tanggalSah: {
          gte: firstDayCurrentMonth,
          lt: firstDayNextMonth,
        },
        temp: false
      }
    }

    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      }
    }

    // 🚀 OPTIMIZED: Single query with joins instead of groupBy + Promise.all
    const topItemsWithDetails = await prisma.rincianPengeluaran.findMany({
      where: whereClause,
      include: {
        persediaan: {
          select: {
            id: true,
            namaPersediaan: true,
            kodePersediaan: true,
            tipe: true,
          },
        },
      },
      orderBy: {
        banyak: 'desc',
      },
    })

    // 🚀 OPTIMIZED: Group by persediaanId in memory
    const groupedData = topItemsWithDetails.reduce((acc, item) => {
      const existing = acc.find(x => x.persediaanId === item.persediaanId)
      if (existing) {
        existing.totalBanyak += item.banyak || 0
      } else {
        acc.push({
          persediaanId: item.persediaanId,
          persediaan: item.persediaan,
          totalBanyak: item.banyak || 0
        })
      }
      return acc
    }, [] as Array<{
      persediaanId: number,
      persediaan: {
        id: number;
        namaPersediaan: string;
        kodePersediaan: string;
        tipe: string;
      } | null,
      totalBanyak: number
    }>)

    // Sort and take top 10
    const top10 = groupedData
      .sort((a, b) => b.totalBanyak - a.totalBanyak)
      .slice(0, 10)

    const result = top10.map((item) => ({
      id: item.persediaanId,
      name: item.persediaan ? `${item.persediaan.namaPersediaan}` : `Item #${item.persediaanId}`,
      value: item.totalBanyak,
    }))

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error("Error fetching top dispensed items:", error)
    return {
      success: false,
      error: `Failed to fetch top dispensed items: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// 🚀 OPTIMIZED: Removed raw query test and kept single query optimization
export async function getTopItemsByQuantity(selectedMedicines?: number[]) {
  try {
    // 🚀 REMOVED: Unnecessary raw query test
    // await prisma.$queryRaw`SELECT 1`
    
    // Create the base query for StokOpname
    const whereClause: Prisma.StokOpnameWhereInput = {}

    // If selectedMedicines is provided, filter by those IDs
    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      }
    }

    // 🚀 OPTIMIZATION: Single query with all joins instead of 4 separate queries
    const stockDataWithDetails = await prisma.stokOpname.findMany({
      where: whereClause,
      include: {
        persediaan: {
          select: {
            id: true,
            namaPersediaan: true,
            kodePersediaan: true,
            tipe: true,
          },
        },
        satuan: {
          select: {
            satuan: true,
          },
        },
      },
      orderBy: {
        jumlah: 'desc',
      },
    })

    // 🚀 OPTIMIZATION: Group by persediaanId in memory instead of database groupBy
    const groupedData = stockDataWithDetails.reduce((acc, item) => {
      const existing = acc.find(x => x.persediaanId === item.persediaanId)
      if (existing) {
        // Sum quantities for same medicine from different locations
        existing.totalQuantity += item.jumlah
        existing.totalDamaged += (item.rusakRingan || 0) + (item.rusakBerat || 0) + (item.usang || 0) + (item.hilang || 0)
      } else {
        // First occurrence of this medicine
        acc.push({
          persediaanId: item.persediaanId,
          persediaan: item.persediaan,
          satuan: item.satuan,
          totalQuantity: item.jumlah,
          totalDamaged: (item.rusakRingan || 0) + (item.rusakBerat || 0) + (item.usang || 0) + (item.hilang || 0)
        })
      }
      return acc
    }, [] as Array<{
      persediaanId: number,
      persediaan: {
        id: number;
        namaPersediaan: string;
        kodePersediaan: string;
        tipe: string;
      } | null,
      satuan: {
        satuan: string;
      } | null,
      totalQuantity: number,
      totalDamaged: number
    }>)

    // Sort by total quantity and take top 10
    const top10 = groupedData
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10)

    // 🚀 OPTIMIZATION: Calculate condition inline instead of separate queries
    const transformedData = top10.map((item) => {
      // Calculate condition based on damage ratio (no more getItemCondition calls!)
      let status = "Good"
      if (item.totalQuantity > 0) {
        const damageRatio = item.totalDamaged / item.totalQuantity
        if (damageRatio > 0.5) status = "Poor"      // More than 50% damaged
        else if (damageRatio > 0.2) status = "Fair" // More than 20% damaged
      }
      
      return {
        id: item.persediaanId,
        name: item.persediaan?.namaPersediaan || 'Unknown',
        code: item.persediaan?.kodePersediaan || 'N/A',
        quantity: item.totalQuantity,
        unit: item.satuan?.satuan || 'pcs',
        status,
      }
    })

    return {
      success: true,
      data: transformedData,
    }
  } catch (error) {
    console.error("Error fetching top items by quantity:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("Can't reach database server")) {
        return {
          success: false,
          error: "Database connection failed. Please check your internet connection and try again.",
          data: [],
        }
      }
    }
    
    return {
      success: false,
      error: `Failed to fetch top items by quantity: ${error instanceof Error ? error.message : "Unknown error"}`,
      data: [],
    }
  }
}

// 🚀 OPTIMIZED: Single query with joins instead of groupBy + Promise.all
export async function getTopReceiptLocations() {
  try {
    // 🚀 OPTIMIZED: Single query with joins instead of groupBy + Promise.all
    const topUnitsWithDetails = await prisma.penerimaan.findMany({
      include: {
        unit: {
          select: {
            id: true,
            namaUnit: true,
          },
        },
      },
    })

    // 🚀 OPTIMIZED: Group by unitId in memory
    const groupedData = topUnitsWithDetails.reduce((acc, penerimaan) => {
      const existing = acc.find(x => x.unitId === penerimaan.unitId)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({
          unitId: penerimaan.unitId,
          unit: penerimaan.unit,
          count: 1
        })
      }
      return acc
    }, [] as Array<{
      unitId: number,
      unit: {
        id: number;
        namaUnit: string;
      } | null,
      count: number
    }>)

    // Sort and take top 10
    const top10 = groupedData
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const totalCount = topUnitsWithDetails.length

    const result = top10.map((item) => {
      const percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0
      return {
        id: item.unitId,
        name: item.unit ? item.unit.namaUnit : `Unit #${item.unitId}`,
        count: item.count,
        percentage: percentage.toFixed(1),
      }
    })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error("Error fetching top receipt locations:", error)
    return {
      success: false,
      error: `Failed to fetch top receipt locations: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// 🚀 OPTIMIZED: Single query with joins instead of groupBy + Promise.all
export async function getTopDispensedLocations() {
  try {
    // 🚀 OPTIMIZED: Single query with joins instead of groupBy + Promise.all
    const topUnitsWithDetails = await prisma.pengeluaran.findMany({
      include: {
        unit: {
          select: {
            id: true,
            namaUnit: true,
          },
        },
      },
    })

    // 🚀 OPTIMIZED: Group by unitId in memory
    const groupedData = topUnitsWithDetails.reduce((acc, pengeluaran) => {
      const existing = acc.find(x => x.unitId === pengeluaran.unitId)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({
          unitId: pengeluaran.unitId,
          unit: pengeluaran.unit,
          count: 1
        })
      }
      return acc
    }, [] as Array<{
      unitId: number,
      unit: {
        id: number;
        namaUnit: string;
      } | null,
      count: number
    }>)

    // Sort and take top 10
    const top10 = groupedData
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const totalCount = topUnitsWithDetails.length

    const result = top10.map((item) => {
      const percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0
      return {
        id: item.unitId,
        name: item.unit ? item.unit.namaUnit : `Unit #${item.unitId}`,
        count: item.count,
        percentage: percentage.toFixed(1),
      }
    })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error("Error fetching top dispensed locations:", error)
    return {
      success: false,
      error: `Failed to fetch top dispensed locations: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
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

// Modify the existing function to handle null or undefined persediaanIds properly
export async function getItemConditionDistribution(unitId?: number, persediaanIds?: number[]) {
  try {
    // Get all kondisi (conditions) for reference
    const kondisiList = await prisma.kondisi.findMany()

    // Build the where clause first
    const whereClause: Prisma.RincianPenerimaanWhereInput = {
      temp: false,
    }

    // If unitId is provided, filter by that unit
    if (unitId) {
      whereClause.unitId = unitId
    }

    // If persediaanIds is provided and is a non-empty array, filter by those IDs
    if (persediaanIds && Array.isArray(persediaanIds) && persediaanIds.length > 0) {
      whereClause.persediaanId = {
        in: persediaanIds,
      }
    }

    // Get all rincianPenerimaan records with their conditions
    const rincianPenerimaan = await prisma.rincianPenerimaan.findMany({
      where: whereClause,
      include: {
        kondisi: {
          select: {
            kondisi: true,
          },
        },
      },
    })

    // Group by kondisi and count
    const conditionCounts: Record<string, number> = {}

    // Initialize with all possible conditions
    kondisiList.forEach((kondisiItem) => {
      conditionCounts[kondisiItem.kondisi] = 0
    })

    // Count items by condition - now kondisi should be available
    rincianPenerimaan.forEach((item) => {
      if (item.kondisi?.kondisi) {
        const kondisiName = item.kondisi.kondisi
        conditionCounts[kondisiName] = (conditionCounts[kondisiName] || 0) + (item.banyak || 0)
      }
    })

    // Build the StokOpname query
    const stockOpnameQuery: Prisma.StokOpnameWhereInput = {}

    // Add unitId filter if provided
    if (unitId) {
      stockOpnameQuery.unitId = unitId
    }

    // Add persediaanId filter if provided
    if (persediaanIds && persediaanIds.length > 0) {
      stockOpnameQuery.persediaanId = { in: persediaanIds }
    }

    // Get data from StokOpname for damaged/lost items
    const stockOpname = await prisma.stokOpname.aggregate({
      _sum: {
        hilang: true, // Lost
        rusakRingan: true, // Minor Damage
        usang: true, // Expired
        rusakBerat: true, // Major Damage
      },
      where: stockOpnameQuery,
    })

    // Map StokOpname fields to condition categories
    const stockOpnameConditions = {
      Good: 0, // We'll calculate this after
      "Minor Damage": stockOpname._sum.rusakRingan || 0,
      "Major Damage": stockOpname._sum.rusakBerat || 0,
      Expired: stockOpname._sum.usang || 0,
      Lost: stockOpname._sum.hilang || 0,
    }

    // Calculate "Good" condition as the difference between total and damaged/lost
    const totalFromStokOpname = await prisma.stokOpname.aggregate({
      _sum: {
        jumlah: true,
      },
      where: stockOpnameQuery,
    })

    const totalItems = totalFromStokOpname._sum.jumlah || 0
    const damagedOrLostItems =
      (stockOpnameConditions["Minor Damage"] || 0) +
      (stockOpnameConditions["Major Damage"] || 0) +
      (stockOpnameConditions["Expired"] || 0) +
      (stockOpnameConditions["Lost"] || 0)

    stockOpnameConditions["Good"] = Math.max(0, totalItems - damagedOrLostItems)

    // Format data for the chart
    const chartData = Object.entries(stockOpnameConditions).map(([condition, count]) => ({
      name: condition,
      value: count,
      percentage: totalItems > 0 ? (count / totalItems) * 100 : 0,
    }))

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

export async function getTopReceivedItems(selectedMedicines?: number[]) {
  try {
    // Get current date and calculate first day of current and next month
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    // First day of current month in UTC
    const firstDayCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1))
    
    // First day of next month in UTC (used to get the end of current month)
    const firstDayNextMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 1))

    // Create the base query with date filter
    const whereClause: Prisma.RincianPenerimaanWhereInput = {
      temp: false,
      penerimaan: {
        tanggalPenerimaan: {
          gte: firstDayCurrentMonth,
          lt: firstDayNextMonth,
        }
      }
    }

    // If selectedMedicines is provided, filter by those IDs
    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      }
    }

    // Query to get top received items, using jumlah column instead of banyak
    const topItems = await prisma.rincianPenerimaan.groupBy({
      by: ["persediaanId"],
      where: whereClause,
      _sum: {
        jumlah: true, // Using jumlah instead of banyak
      },
      orderBy: {
        _sum: {
          jumlah: "desc", // Using jumlah instead of banyak
        },
      },
      take: 10,
    })

    // Get the persediaan details for each item
    const itemsWithDetails = await Promise.all(
      topItems.map(async (item) => {
        const persediaan = await prisma.persediaan.findUnique({
          where: {
            id: item.persediaanId,
          },
          select: {
            namaPersediaan: true,
            kodePersediaan: true,
            tipe: true,
          },
        })

        return {
          id: item.persediaanId,
          name: persediaan ? `${persediaan.namaPersediaan}` : `Item #${item.persediaanId}`,
          value: item._sum.jumlah || 0, // Using jumlah instead of banyak
        }
      }),
    )

    return {
      success: true,
      data: itemsWithDetails,
    }
  } catch (error) {
    console.error("Error fetching top received items:", error)
    return {
      success: false,
      error: `Failed to fetch top received items: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getTopDispensedItems(selectedMedicines?: number[]) {
  try {
    // Get current date and calculate first day of current and next month
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    // First day of current month in UTC
    const firstDayCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1))
    
    // First day of next month in UTC (used to get the end of current month)
    const firstDayNextMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 1))

    // Create the base query with date filter
    const whereClause: Prisma.RincianPengeluaranWhereInput = {
      pengeluaran: {
        tanggalSah: {
          gte: firstDayCurrentMonth,
          lt: firstDayNextMonth,
        },
        temp: false
      }
    }

    // If selectedMedicines is provided, filter by those IDs
    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      }
    }

    // Query to get top dispensed items
    const topItems = await prisma.rincianPengeluaran.groupBy({
      by: ["persediaanId"],
      where: whereClause,
      _sum: {
        banyak: true,
      },
      orderBy: {
        _sum: {
          banyak: "desc",
        },
      },
      take: 10,
    })

    // Get the persediaan details for each item
    const itemsWithDetails = await Promise.all(
      topItems.map(async (item) => {
        const persediaan = await prisma.persediaan.findUnique({
          where: {
            id: item.persediaanId,
          },
          select: {
            namaPersediaan: true,
            kodePersediaan: true,
            tipe: true,
          },
        })

        return {
          id: item.persediaanId,
          name: persediaan ? `${persediaan.namaPersediaan}` : `Item #${item.persediaanId}`,
          value: item._sum.banyak || 0,
        }
      }),
    )

    return {
      success: true,
      data: itemsWithDetails,
    }
  } catch (error) {
    console.error("Error fetching top dispensed items:", error)
    return {
      success: false,
      error: `Failed to fetch top dispensed items: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// New function to get top 10 items by quantity
export async function getTopItemsByQuantity(selectedMedicines?: number[]) {
  try {
    // Create the base query
    const whereClause: Prisma.StokOpnameWhereInput = {}

    // If selectedMedicines is provided, filter by those IDs
    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      }
    }

    // Query to get top items by quantity from StokOpname
    const topItems = await prisma.stokOpname.groupBy({
      by: ["persediaanId"],
      where: whereClause,
      _sum: {
        jumlah: true,
      },
      orderBy: {
        _sum: {
          jumlah: "desc",
        },
      },
      take: 10,
    })

    // Get the persediaan details and satuan for each item
    const itemsWithDetails = await Promise.all(
      topItems.map(async (item) => {
        const persediaan = await prisma.persediaan.findUnique({
          where: {
            id: item.persediaanId,
          },
          select: {
            namaPersediaan: true,
            kodePersediaan: true,
          },
        })

        // Get the satuan (unit) for this item
        const stockOpname = await prisma.stokOpname.findFirst({
          where: {
            persediaanId: item.persediaanId,
          },
          include: {
            satuan: true,
          },
        })

        // Get the condition status
        const condition = await getItemCondition(item.persediaanId)

        return {
          id: item.persediaanId,
          name: persediaan ? persediaan.namaPersediaan : `Item #${item.persediaanId}`,
          code: persediaan ? persediaan.kodePersediaan : "-",
          quantity: item._sum.jumlah || 0,
          unit: stockOpname?.satuan?.satuan || "Unit",
          status: condition,
        }
      }),
    )

    return {
      success: true,
      data: itemsWithDetails,
    }
  } catch (error) {
    console.error("Error fetching top items by quantity:", error)
    return {
      success: false,
      error: `Failed to fetch top items by quantity: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// Helper function to get item condition
async function getItemCondition(persediaanId: number): Promise<string> {
  try {
    const stockOpname = await prisma.stokOpname.findFirst({
      where: {
        persediaanId: persediaanId,
      },
      select: {
        jumlah: true,
        rusakRingan: true,
        rusakBerat: true,
        usang: true,
        hilang: true,
      },
    })

    if (!stockOpname) return "Unknown"

    const total = stockOpname.jumlah || 0
    const damaged =
      (stockOpname.rusakRingan || 0) +
      (stockOpname.rusakBerat || 0) +
      (stockOpname.usang || 0) +
      (stockOpname.hilang || 0)

    // If more than 50% is damaged, consider it "Poor"
    if (damaged > total * 0.5) return "Poor"
    // If more than 20% is damaged, consider it "Fair"
    if (damaged > total * 0.2) return "Fair"
    // Otherwise, it's "Good"
    return "Good"
  } catch (error) {
    console.error("Error getting item condition:", error)
    return "Unknown"
  }
}

// Updated function to get top 10 locations for receipts using unitId instead of lokasiId
export async function getTopReceiptLocations() {
  try {
    // Query to get top units from Penerimaan
    const topUnits = await prisma.penerimaan.groupBy({
      by: ["unitId"], // Using unitId instead of lokasiId
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    })

    // Get the total count for percentage calculation
    const totalCount = await prisma.penerimaan.count()

    // Get the unit details for each entry
    const unitsWithDetails = await Promise.all(
      topUnits.map(async (unit) => {
        const unitDetails = await prisma.unit.findUnique({
          where: {
            id: unit.unitId,
          },
          select: {
            namaUnit: true,
          },
        })

        const count = unit._count.id
        const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0

        return {
          id: unit.unitId,
          name: unitDetails ? unitDetails.namaUnit : `Unit #${unit.unitId}`,
          count: count,
          percentage: percentage.toFixed(1),
        }
      }),
    )

    return {
      success: true,
      data: unitsWithDetails,
    }
  } catch (error) {
    console.error("Error fetching top receipt locations:", error)
    return {
      success: false,
      error: `Failed to fetch top receipt locations: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// Updated function to get top 10 locations for dispensed items using unitId
export async function getTopDispensedLocations() {
  try {
    // Query to get top units from Pengeluaran
    const topUnits = await prisma.pengeluaran.groupBy({
      by: ["unitId"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    })

    // Get the total count for percentage calculation
    const totalCount = await prisma.pengeluaran.count()

    // Get the unit details for each entry
    const unitsWithDetails = await Promise.all(
      topUnits.map(async (unit) => {
        const unitDetails = await prisma.unit.findUnique({
          where: {
            id: unit.unitId,
          },
          select: {
            namaUnit: true,
          },
        })

        const count = unit._count.id
        const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0

        return {
          id: unit.unitId,
          name: unitDetails ? unitDetails.namaUnit : `Unit #${unit.unitId}`,
          count: count,
          percentage: percentage.toFixed(1),
        }
      }),
    )

    return {
      success: true,
      data: unitsWithDetails,
    }
  } catch (error) {
    console.error("Error fetching top dispensed locations:", error)
    return {
      success: false,
      error: `Failed to fetch top dispensed locations: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
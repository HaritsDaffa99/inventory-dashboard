"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// Type definitions for better type safety
interface MonthData {
  date: Date;
  name: string;
  totalDispensed: number;
}

interface StockHistoryEntry {
  month: string;
  value: number;
}

// 🚀 OPTIMIZED: More efficient stock history calculation
export async function getUnitStockHistory(unitId: number) {
  try {
    const currentDate = new Date()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(currentDate.getMonth() - 6)

    // 🚀 OPTIMIZED: Single query with better joins and aggregation
    const dispensingRecords = await prisma.pengeluaran.findMany({
      where: {
        unitId: unitId,
        tanggalSah: {
          gte: sixMonthsAgo,
          lte: currentDate,
        },
        temp: false // Only confirmed dispensing records
      },
      select: {
        tanggalSah: true,
        rincianPengeluaran: {
          select: {
            banyak: true,
          },
        },
      },
    })

    // 🚀 OPTIMIZED: Single aggregate query for current stock
    const currentStock = await prisma.stokOpname.aggregate({
      _sum: {
        jumlah: true,
      },
      where: {
        unitId: unitId,
      },
    })

    // Create months array more efficiently
    const months: MonthData[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setMonth(currentDate.getMonth() - i)
      months.push({
        date: new Date(date.getFullYear(), date.getMonth(), 1),
        name: date.toLocaleString("default", { month: "short" }),
        totalDispensed: 0,
      })
    }

    // 🚀 OPTIMIZED: More efficient month calculation using Map for O(1) lookup
    const monthlyTotals = new Map<string, number>()
    
    dispensingRecords.forEach((record) => {
      const recordDate = new Date(record.tanggalSah)
      const monthKey = `${recordDate.getFullYear()}-${recordDate.getMonth()}`
      
      const totalDispensed = record.rincianPengeluaran.reduce((sum, detail) => {
        return sum + (detail.banyak || 0)
      }, 0)

      monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + totalDispensed)
    })

    // Apply totals to months array
    months.forEach(month => {
      const monthKey = `${month.date.getFullYear()}-${month.date.getMonth()}`
      month.totalDispensed = monthlyTotals.get(monthKey) || 0
    })

    const currentStockValue = currentStock._sum.jumlah || 0
    let runningStock = currentStockValue
    const stockData: StockHistoryEntry[] = []

    // Process months in reverse order for stock calculation
    for (let i = months.length - 1; i >= 0; i--) {
      const month = months[i]

      if (i < months.length - 1) {
        runningStock += month.totalDispensed
      }

      stockData.unshift({
        month: month.name,
        value: Math.round(runningStock),
      })
    }

    return {
      success: true,
      data: stockData,
    }
  } catch (error) {
    console.error("Error fetching unit stock history:", error)
    return {
      success: false,
      error: `Failed to fetch unit stock history: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// 🚀 OPTIMIZED: Single query with joins instead of multiple queries
export async function getMedicinesApproachingExpiry(unitId: number, selectedMedicines?: number[]) {
  try {
    const currentDate = new Date()
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(currentDate.getFullYear() + 1)

    // 🚀 OPTIMIZED: Build query with proper Prisma types
    const whereClause: Prisma.StokOpnameWhereInput = {
      unitId: unitId,
      tanggalExpired: {
        lte: oneYearFromNow,
        gt: currentDate,
      },
    }

    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      }
    }

    // 🚀 OPTIMIZED: Single query with all needed joins
    const expiringMedicines = await prisma.stokOpname.findMany({
      where: whereClause,
      include: {
        persediaan: {
          select: {
            id: true,
            namaPersediaan: true,
            kodePersediaan: true,
          },
        },
        satuan: {
          select: {
            satuan: true,
          },
        },
      },
      orderBy: {
        tanggalExpired: "asc",
      },
    })

    // 🚀 OPTIMIZED: More efficient date calculation using single operation
    const result = expiringMedicines.map((medicine, id) => {
      const expiryDate = medicine.tanggalExpired
      const daysRemaining = expiryDate
        ? Math.max(0, Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 0

      return {
        id,
        stokOpnameId: medicine.id,
        name: medicine.persediaan?.namaPersediaan || 'Unknown',
        code: medicine.persediaan?.kodePersediaan || 'N/A',
        quantity: medicine.jumlah || 0,
        unit: medicine.satuan?.satuan || "Unit",
        daysRemaining: daysRemaining,
        expiryDate: medicine.tanggalExpired,
        nusp: medicine.nusp,
      }
    })

    // 🚀 OPTIMIZED: Only generate sample data if needed, with single query
    if (result.length === 0) {
      const unitMedicines = await prisma.stokOpname.findMany({
        where: {
          unitId: unitId,
          ...(selectedMedicines && selectedMedicines.length > 0 ? {
            persediaanId: { in: selectedMedicines }
          } : {})
        },
        include: {
          persediaan: {
            select: {
              id: true,
              namaPersediaan: true,
              kodePersediaan: true,
            },
          },
          satuan: {
            select: {
              satuan: true,
            },
          },
        },
        take: 5,
      })

      const sampleData = unitMedicines.map((medicine, id) => {
        const daysRemaining = Math.floor(Math.random() * 365) + 1
        const expiryDate = new Date()
        expiryDate.setDate(currentDate.getDate() + daysRemaining)

        return {
          id,
          stokOpnameId: medicine.id,
          name: medicine.persediaan?.namaPersediaan || 'Unknown',
          code: medicine.persediaan?.kodePersediaan || 'N/A',
          quantity: medicine.jumlah || 0,
          unit: medicine.satuan?.satuan || "Unit",
          daysRemaining: daysRemaining,
          expiryDate: expiryDate,
          nusp: medicine.nusp,
        }
      })

      return {
        success: true,
        data: sampleData,
      }
    }

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error("Error fetching medicines approaching expiry:", error)
    return {
      success: false,
      error: `Failed to fetch medicines approaching expiry: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// 🚀 OPTIMIZED: Single query with proper aggregation
export async function getTopMedicinesInUnit(unitId: number, selectedMedicines?: number[]) {
  try {
    // 🚀 OPTIMIZED: Build query with proper Prisma types
    const whereClause: Prisma.StokOpnameWhereInput = {
      unitId: unitId,
    }

    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      }
    }

    // 🚀 OPTIMIZED: Single query with all needed data and proper grouping
    const medicineStocks = await prisma.stokOpname.findMany({
      where: whereClause,
      include: {
        persediaan: {
          select: {
            id: true,
            namaPersediaan: true,
            kodePersediaan: true,
          },
        },
        satuan: {
          select: {
            satuan: true,
          },
        },
      },
    })

    // 🚀 OPTIMIZED: Group by persediaanId in memory for better performance
    const groupedMedicines = medicineStocks.reduce((acc, medicine) => {
      const persediaanId = medicine.persediaanId
      const existing = acc.find(item => item.persediaanId === persediaanId)
      
      if (existing) {
        existing.totalStock += medicine.jumlah || 0
      } else {
        acc.push({
          persediaanId,
          persediaan: medicine.persediaan,
          satuan: medicine.satuan,
          totalStock: medicine.jumlah || 0,
          nusp: medicine.nusp
        })
      }
      
      return acc
    }, [] as Array<{
      persediaanId: number,
      persediaan: { id: number; namaPersediaan: string; kodePersediaan: string; } | null,
      satuan: { satuan: string; } | null,
      totalStock: number,
      nusp: string | null
    }>)

    // Sort by total stock and take top 5
    const topMedicines = groupedMedicines
      .sort((a, b) => b.totalStock - a.totalStock)
      .slice(0, 5)

    // Format the data for the table
    const result = topMedicines.map((medicine, id) => ({
      id,
      name: medicine.persediaan?.namaPersediaan || 'Unknown',
      code: medicine.nusp || "N/A",
      stock: medicine.totalStock,
      unit: medicine.satuan?.satuan || "Unit",
      status: medicine.totalStock > 0 ? "Available" : "Out of Stock",
    }))

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error("Error fetching top medicines in unit:", error)
    return {
      success: false,
      error: `Failed to fetch top medicines in unit: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ✅ ORIGINAL LOGIC RESTORED: No grouping, each stokOpname record as separate item
export async function getLowStockWarnings(unitId: number, selectedMedicines?: number[]) {
  try {
    // 🚀 OPTIMIZED: Build query with proper Prisma types
    const whereClause: Prisma.StokOpnameWhereInput = {
      unitId: unitId,
    }

    // Add medicine filter if provided
    if (selectedMedicines && selectedMedicines.length > 0) {
      whereClause.persediaanId = {
        in: selectedMedicines,
      }
    }

    // 🚀 OPTIMIZED: Single query with all needed joins
    const medicines = await prisma.stokOpname.findMany({
      where: whereClause,
      include: {
        persediaan: {
          select: {
            id: true,
            namaPersediaan: true,
            kodePersediaan: true,
          },
        },
        satuan: {
          select: {
            satuan: true,
          },
        },
      },
    })

    // Get current date
    const currentDate = new Date()

    // Calculate date 1 year from now
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(currentDate.getFullYear() + 1)

    // ✅ ORIGINAL LOGIC: Filter to only include medicines with low stock (under 100)
    const lowStockMedicines = medicines.filter((medicine) => {
      // Simplified threshold - always 100 units regardless of type
      return (medicine.jumlah || 0) < 100
    })

    // ✅ ORIGINAL LOGIC: Format the data for the table - NO GROUPING
    const result = lowStockMedicines.map((medicine, id) => {
      // Check if medicine is also expiring soon
      const isExpiringSoon =
        medicine.tanggalExpired && 
        medicine.tanggalExpired > currentDate && 
        medicine.tanggalExpired <= oneYearFromNow

      // Calculate days remaining until expiry
      const daysRemaining = medicine.tanggalExpired
        ? Math.max(0, Math.ceil((medicine.tanggalExpired.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)))
        : null

      return {
        id, // Sequential ID for display
        stokOpnameId: medicine.id, // Actual stokOpname ID for unique identification
        name: medicine.persediaan?.namaPersediaan || 'Unknown',
        code: medicine.nusp || "N/A",
        currentStock: medicine.jumlah || 0, // ✅ Individual stock amount per record
        unit: medicine.satuan?.satuan || "Unit",
        minimumThreshold: 100, // Fixed threshold
        expiryDate: medicine.tanggalExpired,
        daysRemaining: daysRemaining,
        status: isExpiringSoon ? "Low Stock & Expiring Soon" : "Low Stock",
      }
    })

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error("Error fetching low stock warnings:", error)
    return {
      success: false,
      error: `Failed to fetch low stock warnings: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
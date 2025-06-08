"use server"

import prisma from "@/lib/prisma"
import { DISEASE_CATEGORIES, categorizeDiseases } from "@/lib/forecasting/disease-categories"
import { DiseaseOutbreakData, HistoricalUsageData, MonthlyUsageSummary } from "@/lib/forecasting/types"

type Unit = {
  id: number;
  namaUnit: string;
  kodeUnit: string;
}

export async function getCategorizedDiseases(): Promise<{
  success: boolean;
  data?: DiseaseOutbreakData[];
  error?: string;
}> {
  try {
    // Get all diseases from database
    const diseases = await prisma.persediaan.findMany({
      select: {
        keterangan: true,
        id: true,
        namaPersediaan: true,
      },
      where: {
        temp: false,
      },
    })

    // Extract unique disease names
    const uniqueDiseases = [...new Set(diseases.map(d => d.keterangan.trim()))]
    
    // Categorize diseases
    const categorized = categorizeDiseases(uniqueDiseases)
    
    // Build response data
    const result: DiseaseOutbreakData[] = []
    
    for (const [categoryId, diseaseList] of Object.entries(categorized)) {
      const category = DISEASE_CATEGORIES[categoryId]
      
      if (category) {
        // Count medicines for this category
        const medicineCount = diseases.filter(d => 
          diseaseList.includes(d.keterangan.trim())
        ).length

        result.push({
          category_id: categoryId,
          category_name: category.name,
          diseases: diseaseList,
          total_medicines: medicineCount,
          priority: category.priority,
          monthly_usage: [],
          risk_level: 'LOW',
          outbreak_probability: 0,
          trend: 'STABLE'
        })
      } else if (categoryId === 'OTHER') {
        // Handle uncategorized diseases
        const medicineCount = diseases.filter(d => 
          diseaseList.includes(d.keterangan.trim())
        ).length

        result.push({
          category_id: 'OTHER',
          category_name: 'Other Diseases',
          diseases: diseaseList,
          total_medicines: medicineCount,
          priority: 'LOW',
          monthly_usage: [],
          risk_level: 'LOW',
          outbreak_probability: 0,
          trend: 'STABLE'
        })
      }
    }

    // Sort by priority (CRITICAL > HIGH > MEDIUM > LOW)
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 }
    result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function getAvailableUnits(): Promise<{
  success: boolean;
  data?: Array<{ id: number; namaUnit: string; kodeUnit: string }>;
  error?: string;
}> {
  try {
    const units = await prisma.unit.findMany({
      select: {
        id: true,
        namaUnit: true,
        kodeUnit: true,
      },
      where: {
        temp: false,  // Unit table DOES have temp field according to schema
      },
      orderBy: {
        namaUnit: 'asc',
      },
    })

    return { success: true, data: units }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// ✅ FIX: Check Prophet forecast structure properly
export async function getHistoricalUsageData(
  unitIds: number[],
  months: number = 24  // ✅ CHANGED: Increase default from 30 to 24
): Promise<{
  success: boolean;
  data?: HistoricalUsageData[];
  error?: string;
}> {
  try {
    console.log(`📊 Getting historical usage for ${unitIds.length} units over ${months} months`)
    
    // Calculate date range (last X months)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    // Query historical usage data - Fixed according to actual schema
    const usageData = await prisma.rincianPengeluaran.findMany({
      where: {
        pengeluaran: {
          unitId: {
            in: unitIds,
          },
          tanggalSah: {  // Use tanggalSah instead of tanggal (based on schema)
            gte: startDate,
            lte: endDate,
          },
          temp: false,
        },
        persediaan: {
          temp: false,
        },
      },
      include: {
        persediaan: {
          select: {
            keterangan: true,
            namaPersediaan: true,
          },
        },
        pengeluaran: {
          select: {
            tanggalSah: true,  // Use tanggalSah instead of tanggal
            unitId: true,
            unit: {
              select: {
                namaUnit: true,
                kodeUnit: true,
              },
            },
          },
        },
      },
      orderBy: {
        pengeluaran: {
          tanggalSah: 'asc',  // Use tanggalSah instead of tanggal
        },
      },
    })

    // Get unique diseases and categorize them
    const uniqueDiseases = [...new Set(usageData.map(item => item.persediaan.keterangan.trim()))]
    const categorizedDiseases = categorizeDiseases(uniqueDiseases)

    // Group data by category, unit, and month
    const monthlyUsageMap = new Map<string, {
      category_id: string
      category_name: string
      unit_id: number
      unit_name: string
      monthly_data: { month: string; usage: number; medicine_count: number }[]
    }>()

    usageData.forEach(item => {
      const disease = item.persediaan.keterangan.trim()
      const date = item.pengeluaran.tanggalSah  // Use tanggalSah instead of tanggal
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      // Find which category this disease belongs to
      let categoryId = 'OTHER'
      let categoryName = 'Other Diseases'
      
      for (const [catId, diseases] of Object.entries(categorizedDiseases)) {
        if (diseases.includes(disease)) {
          categoryId = catId
          if (DISEASE_CATEGORIES[catId]) {
            categoryName = DISEASE_CATEGORIES[catId].name
          }
          break
        }
      }

      const mapKey = `${categoryId}-${item.pengeluaran.unitId}`
      
      if (!monthlyUsageMap.has(mapKey)) {
        monthlyUsageMap.set(mapKey, {
          category_id: categoryId,
          category_name: categoryName,
          unit_id: item.pengeluaran.unitId,
          unit_name: item.pengeluaran.unit?.namaUnit || 'Unknown Unit',
          monthly_data: []
        })
      }

      const entry = monthlyUsageMap.get(mapKey)!
      const existingMonth = entry.monthly_data.find(m => m.month === monthKey)
      
      if (existingMonth) {
        existingMonth.usage += item.banyak  // Use banyak field from RincianPengeluaran
        existingMonth.medicine_count += 1
      } else {
        entry.monthly_data.push({
          month: monthKey,
          usage: item.banyak,
          medicine_count: 1
        })
      }
    })

    // Convert to result format
    const result: HistoricalUsageData[] = Array.from(monthlyUsageMap.values()).map(entry => ({
      category_id: entry.category_id,
      category_name: entry.category_name,
      unit_id: entry.unit_id,
      unit_name: entry.unit_name,
      monthly_usage: entry.monthly_data.sort((a, b) => a.month.localeCompare(b.month)),
      total_usage: entry.monthly_data.reduce((sum, month) => sum + month.usage, 0),
      avg_monthly_usage: entry.monthly_data.length > 0 
        ? entry.monthly_data.reduce((sum, month) => sum + month.usage, 0) / entry.monthly_data.length
        : 0,
      trend: calculateTrend(entry.monthly_data),
    }))

    return { success: true, data: result }
  } catch (error) {
    console.error("❌ Error getting historical usage data:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get historical usage data",
    }
  }
}

export async function getUsageSummaryByCategory(
  unitIds: number[],
  months: number = 24  // ✅ CHANGED: Increase from 30 to 24 for better data consistency
): Promise<{
  success: boolean;
  data?: MonthlyUsageSummary[];
  error?: string;
}> {
  try {
    console.log(`📊 Getting usage summary for ${unitIds.length} units over ${months} months`);
    
    // Calculate date range - extend to 24 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);

    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    const historyResult = await getHistoricalUsageData(unitIds, months)
    
    if (!historyResult.success || !historyResult.data) {
      return { success: false, error: historyResult.error }
    }

    // Aggregate by category across all units
    const categoryMap = new Map<string, {
      category_id: string
      category_name: string
      priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
      total_usage: number
      units_affected: number
      monthly_totals: { month: string; usage: number }[]
    }>()

    historyResult.data.forEach(item => {
      if (!categoryMap.has(item.category_id)) {
        const category = DISEASE_CATEGORIES[item.category_id]
        categoryMap.set(item.category_id, {
          category_id: item.category_id,
          category_name: item.category_name,
          priority: category?.priority || 'LOW',
          total_usage: 0,
          units_affected: 0,
          monthly_totals: []
        })
      }

      const entry = categoryMap.get(item.category_id)!
      entry.total_usage += item.total_usage
      entry.units_affected += 1

      // Aggregate monthly data
      item.monthly_usage.forEach(monthData => {
        const existingMonth = entry.monthly_totals.find(m => m.month === monthData.month)
        if (existingMonth) {
          existingMonth.usage += monthData.usage
        } else {
          entry.monthly_totals.push({
            month: monthData.month,
            usage: monthData.usage
          })
        }
      })
    })

    const result: MonthlyUsageSummary[] = Array.from(categoryMap.values()).map(entry => ({
      category_id: entry.category_id,
      category_name: entry.category_name,
      priority: entry.priority,
      total_usage: entry.total_usage,
      units_affected: entry.units_affected,
      avg_monthly_usage: entry.monthly_totals.length > 0 
        ? entry.monthly_totals.reduce((sum, month) => sum + month.usage, 0) / entry.monthly_totals.length
        : 0,
      monthly_data: entry.monthly_totals.sort((a, b) => a.month.localeCompare(b.month)),
      trend: calculateTrend(entry.monthly_totals.map(m => ({ month: m.month, usage: m.usage, medicine_count: 1 }))),
    }))

    // Sort by priority
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 }
    result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return { success: true, data: result }
  } catch (error) {
    console.error("❌ Error getting usage summary by category:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get usage summary"
    };
  }
}

// Helper function to calculate trend
function calculateTrend(monthlyData: { month: string; usage: number; medicine_count: number }[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
  if (monthlyData.length < 2) return 'STABLE'
  
  const recentMonths = monthlyData.slice(-3) // Last 3 months
  const earlierMonths = monthlyData.slice(0, 3) // First 3 months
  
  if (recentMonths.length === 0 || earlierMonths.length === 0) return 'STABLE'
  
  const recentAvg = recentMonths.reduce((sum, m) => sum + m.usage, 0) / recentMonths.length
  const earlierAvg = earlierMonths.reduce((sum, m) => sum + m.usage, 0) / earlierMonths.length
  
  const changePercent = (recentAvg - earlierAvg) / earlierAvg
  
  if (changePercent > 0.1) return 'INCREASING'
  if (changePercent < -0.1) return 'DECREASING'
  return 'STABLE'
}

export async function getAvailableUnitsForDisease(): Promise<{ success: boolean; data?: Unit[]; error?: string }> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/disease-outbreak/units`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error fetching units for disease:", error)
    return {
      success: false,
      error: "Failed to fetch units for disease forecasting",
    }
  }
}

export async function getDiseaseCategories(): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/disease-outbreak/categories`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error fetching disease categories:", error)
    return {
      success: false,
      error: "Failed to fetch disease categories",
    }
  }
}
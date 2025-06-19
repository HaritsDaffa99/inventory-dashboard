"use server"

import  prisma  from "@/lib/prisma"

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

export async function getStockDataForOutbreak(): Promise<StockData> {
  try {
    console.log("📊 Fetching stock data for outbreak analysis...")

    // Get current stock data from StokOpname with related medicine and unit info
    const stockOpnameData = await prisma.stokOpname.findMany({
      where: {
        tahun: new Date().getFullYear(), // Current year
        jumlah: {
          gt: 0 // Only medicines with stock
        }
      },
      include: {
        persediaan: {
          include: {
            satuan: true
          }
        },
        unit: true
      },
      orderBy: {
        jumlah: 'desc' // Order by quantity descending
      }
    })

    console.log(`📋 Found ${stockOpnameData.length} stock records`)

    // Transform data for outbreak analysis
    const medicines: StockMedicine[] = stockOpnameData.map((stock) => {
      // Calculate weekly consumption (pengeluaran divided by weeks in year)
      const weeklyConsumption = stock.pengeluaran / 52 || 1 // Avoid division by zero
      
      // Calculate days remaining based on current stock and consumption
      const daysRemaining = weeklyConsumption > 0 
        ? Math.round((stock.jumlah / weeklyConsumption) * 7) 
        : 999 // If no consumption, assume long-lasting

      // Categorize medicine based on type or level
      const category = categorizeMedicine(stock.persediaan.namaPersediaan, stock.persediaan.tipe)

      return {
        id: stock.persediaanId,
        name: stock.persediaan.namaPersediaan,
        currentQuantity: stock.jumlah,
        weeklyConsumption: Math.round(weeklyConsumption * 100) / 100, // Round to 2 decimals
        daysRemaining: Math.min(daysRemaining, 999), // Cap at 999 days
        category: category,
        unitName: stock.unit?.namaUnit || 'Unknown Unit',
        expiryDate: stock.tanggalExpired?.toISOString() || undefined
      }
    })

    // Get unique units count
    const uniqueUnits = new Set(stockOpnameData.map(stock => stock.unitId))
    const totalUnits = uniqueUnits.size

    // Calculate total stock value (if available)
    const totalValue = stockOpnameData.reduce((sum, stock) => {
      // You might have a price field, for now using quantity as proxy
      return sum + stock.jumlah
    }, 0)

    console.log(`✅ Processed ${medicines.length} medicines from ${totalUnits} units`)

    return {
      medicines,
      totalUnits,
      totalValue
    }

  } catch (error) {
    console.error("❌ Error fetching stock data:", error)
    throw new Error("Failed to fetch stock data for outbreak analysis")
  }
}

// Helper function to categorize medicines for outbreak analysis
function categorizeMedicine(medicineName: string, medicineType: string): string {
  const name = medicineName.toLowerCase()
  const type = medicineType.toLowerCase()

  // Emergency/Zoonotic disease medicines
  if (name.includes('antibiotik') || name.includes('antibiotic') || 
      name.includes('amoxicillin') || name.includes('ciprofloxacin') ||
      name.includes('doxycycline') || type.includes('antibiotik')) {
    return 'Emergency/Zoonotic Diseases'
  }

  // Vaccine-preventable diseases
  if (name.includes('vaksin') || name.includes('vaccine') || 
      name.includes('imunisasi') || type.includes('vaksin')) {
    return 'Vaccine-Preventable Diseases'
  }

  // Respiratory diseases
  if (name.includes('bronkodilator') || name.includes('bronchodilator') ||
      name.includes('salbutamol') || name.includes('prednisolon') ||
      name.includes('dexamethasone') || name.includes('oksigen') ||
      type.includes('respiratory')) {
    return 'Respiratory Diseases'
  }

  // Routine childhood immunization
  if (name.includes('polio') || name.includes('bcg') || 
      name.includes('hepatitis') || name.includes('dpt') ||
      type.includes('imunisasi')) {
    return 'Routine Childhood Immunization'
  }

  // Antiviral medicines
  if (name.includes('antiviral') || name.includes('oseltamivir') ||
      name.includes('tamiflu') || type.includes('antiviral')) {
    return 'Emergency/Zoonotic Diseases'
  }

  // Pain management and fever
  if (name.includes('paracetamol') || name.includes('ibuprofen') ||
      name.includes('aspirin') || type.includes('analgesik')) {
    return 'General Medicine'
  }

  // Default category
  return 'General Medicine'
}

// Helper function to get stock data for specific disease categories
export async function getStockDataByCategory(category: string): Promise<StockMedicine[]> {
  try {
    const allStockData = await getStockDataForOutbreak()
    
    return allStockData.medicines.filter(medicine => 
      medicine.category.toLowerCase() === category.toLowerCase()
    )
  } catch (error) {
    console.error("❌ Error fetching stock data by category:", error)
    throw new Error(`Failed to fetch stock data for category: ${category}`)
  }
}

// Helper function to get critical stock items (low inventory)
export async function getCriticalStockItems(): Promise<StockMedicine[]> {
  try {
    const allStockData = await getStockDataForOutbreak()
    
    // Filter medicines with less than 30 days supply
    return allStockData.medicines.filter(medicine => 
      medicine.daysRemaining < 30
    ).sort((a, b) => a.daysRemaining - b.daysRemaining) // Sort by most critical first
  } catch (error) {
    console.error("❌ Error fetching critical stock items:", error)
    throw new Error("Failed to fetch critical stock items")
  }
}
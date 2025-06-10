import { type NextRequest, NextResponse } from "next/server"
import  prisma  from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { unitId, medicineId } = await request.json()

    if (!unitId || !medicineId) {
      return NextResponse.json({ success: false, error: "Unit ID and Medicine ID are required" }, { status: 400 })
    }

    // Get historical dispensing data from database
    const historicalData = await prisma.rincianPengeluaran.findMany({
      where: {
        persediaanId: medicineId,
        pengeluaran: {
          unitId: unitId,
        },
      },
      include: {
        pengeluaran: true,
      },
      orderBy: {
        pengeluaran: {
          tanggalSah: "asc",
        },
      },
    })

    if (historicalData.length === 0) {
      return NextResponse.json(
        { success: false, error: "No historical data found for this unit-medicine combination" },
        { status: 404 },
      )
    }

    // Group by month and calculate monthly usage
    const monthlyUsage = new Map<string, number>()

    historicalData.forEach((record: typeof historicalData[0]) => {
      const month = record.pengeluaran.tanggalSah.toISOString().substring(0, 7) // YYYY-MM
      const currentUsage = monthlyUsage.get(month) || 0
      monthlyUsage.set(month, currentUsage + record.banyak)
    })

    const monthlyData = Array.from(monthlyUsage.entries())
      .map(([month, usage]) => ({
        date: `${month}-01`,
        usage: usage,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: monthlyData,
      totalRecords: historicalData.length,
      monthlyRecords: monthlyData.length,
    })
  } catch (error) {
    console.error("Error fetching historical data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch historical data" }, { status: 500 })
  }
}
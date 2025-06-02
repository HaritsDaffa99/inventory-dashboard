import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const { unitId: unitIdParam } = await params
    const unitId = Number.parseInt(unitIdParam)

    if (isNaN(unitId)) {
      return NextResponse.json({ success: false, error: "Invalid unit ID" }, { status: 400 })
    }

    const medicines = await prisma.persediaan.findMany({
      where: {
        rincianPenerimaan: {
          some: {
            unitId: unitId,
          },
        },
      },
      select: {
        id: true,
        namaPersediaan: true,
        kodePersediaan: true,
      },
      distinct: ["id"],
    })

    return NextResponse.json({
      success: true,
      data: medicines,
    })
  } catch (error) {
    console.error("Error fetching medicines:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch medicines" }, { status: 500 })
  }
}
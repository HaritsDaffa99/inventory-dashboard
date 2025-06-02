import { type NextRequest, NextResponse } from "next/server"
import { getUnitMedicines } from "@/lib/actions/forecasting"

export async function GET(request: NextRequest, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId: unitIdParam } = await params
    const unitId = Number.parseInt(unitIdParam)

    if (!unitId) {
      return NextResponse.json({ success: false, error: "Invalid unit ID" }, { status: 400 })
    }

    const result = await getUnitMedicines(unitId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching medicines:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
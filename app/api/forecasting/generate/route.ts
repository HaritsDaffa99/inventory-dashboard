import { type NextRequest, NextResponse } from "next/server"

const PYTHON_API_URL =  "http://127.0.0.1:8000"

export async function POST(request: NextRequest) {
  try {
    const { unitId, medicineId, periods = 6 } = await request.json()

    if (!unitId || !medicineId) {
      return NextResponse.json({ success: false, error: "Unit ID and Medicine ID are required" }, { status: 400 })
    }

    console.log(`Generating forecast for Unit ${unitId}, Medicine ${medicineId}, Periods ${periods}`)

    // Step 1: Get historical data from our database
    const dataResponse = await fetch(`${request.nextUrl.origin}/api/forecasting/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, medicineId }),
    })

    if (!dataResponse.ok) {
      const errorData = await dataResponse.json()
      return NextResponse.json(
        { success: false, error: errorData.error || "Failed to fetch historical data" },
        { status: 400 },
      )
    }

    const { data: historicalData } = await dataResponse.json()

    if (!historicalData || historicalData.length < 6) {
      return NextResponse.json(
        { success: false, error: "Need at least 6 months of historical data for forecasting" },
        { status: 400 },
      )
    }

    console.log(`Found ${historicalData.length} months of historical data`)

    // Step 2: Send data to Python API for ARIMA/SARIMA processing
    const pythonResponse = await fetch(`${PYTHON_API_URL}/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unit_id: unitId,
        medicine_id: medicineId,
        historical_data: historicalData,
        periods: periods,
        train_test_split: 0.8,
      }),
    })

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text()
      console.error("Python API error:", errorText)
      return NextResponse.json(
        { success: false, error: `Python API error: ${pythonResponse.status} - ${errorText}` },
        { status: 500 },
      )
    }

    const forecastResult = await pythonResponse.json()

    if (!forecastResult.success) {
      return NextResponse.json(
        { success: false, error: forecastResult.error || "Forecast generation failed" },
        { status: 500 },
      )
    }

    console.log(`✅ Forecast generated successfully using ${forecastResult.model_type}`)

    return NextResponse.json(forecastResult)
  } catch (error) {
    console.error("Error in forecast generation:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error during forecast generation" },
      { status: 500 },
    )
  }
}

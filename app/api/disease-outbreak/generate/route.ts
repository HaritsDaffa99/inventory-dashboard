import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API_URL = 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🤖 Disease Outbreak API Route - Received request')
    console.log('📊 Request body structure:', {
      categories: body.categories?.length || 0,
      periods: body.periods,
      sampleCategory: body.categories?.[0] ? {
        category_id: body.categories[0].category_id,
        dataPoints: body.categories[0].historical_data?.length || 0
      } : null
    })

    // ✅ ADD: Validate request structure
    if (!body.categories || !Array.isArray(body.categories)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request: categories array is required'
      }, { status: 400 })
    }

    // Health check first
    const healthResponse = await fetch(`${PYTHON_API_URL}/health`)
    if (!healthResponse.ok) {
      throw new Error('Python API health check failed')
    }

    console.log(`✅ Python API is available, sending ${body.categories.length} categories`)

    // Call the actual forecast endpoint
    const response = await fetch(`${PYTHON_API_URL}/disease-outbreak/batch-forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Python API error: ${response.status} - ${errorText}`)
      throw new Error(`Python API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log(`✅ Disease outbreak forecast completed: ${result.successful_forecasts}/${result.total_categories} successful`)

    // ✅ Add better response logging around line 35
    // ✅ ADD: Log sample forecast results
    if (result.forecasts) {
      const sampleCategories = Object.keys(result.forecasts).slice(0, 2)
      sampleCategories.forEach(categoryId => {
        const forecast = result.forecasts[categoryId]
        if (forecast.outbreak_analysis) {
          console.log(`📊 ${categoryId}: ${forecast.outbreak_analysis.predicted_outbreaks}/${forecast.outbreak_analysis.forecast_months_total} outbreak months (${forecast.outbreak_analysis.outbreak_probability}%)`)
        }
      })
    }

    // Add logging to see actual response structure
    console.log('🔍 Prophet Response Structure:', JSON.stringify(result.forecasts.RESPIRATORY, null, 2))

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Disease Outbreak API Route error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
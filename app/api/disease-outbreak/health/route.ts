import { NextResponse } from 'next/server'



const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000'

export async function GET() {
  try {
    console.log('🔍 Checking disease outbreak health at:', `${PYTHON_API_URL}/disease-outbreak/health`)
    
    const response = await fetch(`${PYTHON_API_URL}/disease-outbreak/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      console.log('❌ Python API health check failed:', response.status)
      return NextResponse.json(
        { error: 'Python API not available', status: response.status },
        { status: 503 }
      )
    }

    const data = await response.json()
    console.log('✅ Disease outbreak health check successful:', data)
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Health check failed:', error)
    return NextResponse.json(
      { error: 'Python API connection failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    )
  }
}
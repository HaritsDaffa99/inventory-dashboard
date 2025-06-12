import { ProphetServiceRequest, ProphetServiceResponse, SeasonalPattern, TrendAnalysis, AnomalyResult } from '@/lib/forecasting/outbreak-types'

const PROPHET_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000'
const API_BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

// ✅ ADD: Type definitions for Prophet data structures
interface ProphetForecastItem {
  month: string;
  predicted_usage: number;
  lower_bound?: number;
  upper_bound?: number;
  trend?: number;
  seasonal?: number;
  seasonal_component?: number;
  prophet_confidence?: number;
}

interface ProphetSeasonalComponents {
  seasonal_strength?: number;
  yearly_pattern?: Array<{ month: number; relative_risk: number }>;
}

interface ProphetTrendInfo {
  overall_trend?: 'increasing' | 'decreasing' | 'stable';
  trend_strength?: number;
}

interface ProphetDataStructure {
  forecast_data?: ProphetForecastItem[];
  seasonal_components?: ProphetSeasonalComponents;
  trend_info?: ProphetTrendInfo;
}

interface ProphetBatchForecastResponse {
  forecasts?: Record<string, ProphetDataStructure>;
  error?: string;
}

export class ProphetIntegrationService {
  
  static async callProphetAPI(endpoint: string, data: ProphetServiceRequest | { category_id: string; periods: number } | { category_id: string; recent_data: { month: string; usage: number }[] }): Promise<ProphetServiceResponse | AnomalyResult | { error?: string }> {
    try {
      const response = await fetch(`${PROPHET_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Prophet API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Prophet API call failed:', error)
      throw error
    }
  }

  static async generateProphetForecast(
    categoryId: string,
    historicalData: { month: string; usage: number }[],
    periods: number = 12
  ): Promise<ProphetServiceResponse> {
    try {
      // Prepare data for Prophet API
      const requestData: ProphetServiceRequest = {
        category_id: categoryId,
        historical_data: historicalData.map(item => ({
          month: item.month,
          usage: item.usage,
          category_id: categoryId
        })),
        periods
      }

      // Train model and generate forecast
      const trainResult = await this.callProphetAPI('/train-model', requestData)
      
      if ('error' in trainResult && trainResult.error) {
        return { success: false, error: trainResult.error }
      }

      const forecastResult = await this.callProphetAPI('/generate-forecast', {
        category_id: categoryId,
        periods
      })

      if ('error' in forecastResult && forecastResult.error) {
        return { success: false, error: forecastResult.error }
      }

      return { success: true, data: (forecastResult as ProphetServiceResponse).data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Prophet forecast failed' 
      }
    }
  }

  static async detectAnomalies(
    categoryId: string,
    recentData: { month: string; usage: number }[]
  ): Promise<{ success: boolean; data?: AnomalyResult; error?: string }> {
    try {
      const result = await this.callProphetAPI('/detect-anomalies', {
        category_id: categoryId,
        recent_data: recentData
      })

      if ('error' in result && result.error) {
        return { success: false, error: result.error }
      }

      return { success: true, data: result as AnomalyResult }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Anomaly detection failed' 
      }
    }
  }

  static async batchForecast(
    categoriesData: Array<{
      category_id: string
      historical_data: { month: string; usage: number }[]
    }>,
    periods: number = 12
  ): Promise<{ success: boolean; data?: Record<string, ProphetDataStructure>; error?: string }> {
    try {
      console.log(`🚀 Starting batch forecast for ${categoriesData.length} categories`)
      
      // ✅ COPY: Use API route like medicine forecasting
      const response = await fetch(`${API_BASE_URL}/api/disease-outbreak/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: categoriesData,
          periods
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Route error: ${response.status} - ${errorText}`)
      }

      const result: ProphetBatchForecastResponse = await response.json()
      
      if (result.error) {
        return { success: false, error: result.error }
      }

      console.log(`✅ Batch forecast successful`)
      return { success: true, data: result.forecasts }
    } catch (error) {
      console.error(`❌ Batch forecast failed:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Batch forecast failed' 
      }
    }
  }

  static async checkProphetHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${PROPHET_API_URL}/health`)
      return response.ok
    } catch {
      return false
    }
  }

  // ✅ FIX: Helper: Convert Prophet data to seasonal patterns
  static extractSeasonalPattern(prophetData: ProphetDataStructure, categoryId: string): SeasonalPattern {
    const monthlyRisk = prophetData.forecast_data?.map((item: ProphetForecastItem, index: number) => ({
      month: index + 1,
      relative_risk: item.seasonal_component || 1
    })) || []

    // Find peak and low months
    const sortedByRisk = [...monthlyRisk].sort((a, b) => b.relative_risk - a.relative_risk)
    const peakMonths = sortedByRisk.slice(0, 3).map(item => item.month)
    const lowMonths = sortedByRisk.slice(-3).map(item => item.month)

    return {
      category_id: categoryId,
      peak_months: peakMonths,
      low_months: lowMonths,
      seasonal_strength: prophetData.seasonal_components?.seasonal_strength || 0,
      yearly_pattern: monthlyRisk,
      recommendations: this.generateSeasonalRecommendations(categoryId, peakMonths)
    }
  }

  // Helper: Generate seasonal recommendations
  static generateSeasonalRecommendations(categoryId: string, peakMonths: number[]): string[] {
    const recommendations: string[] = []
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const peakNames = peakMonths.map(m => monthNames[m - 1]).join(', ')
    
    recommendations.push(`Peak season typically occurs in: ${peakNames}`)
    
    if (categoryId.includes('RESPIRATORY')) {
      recommendations.push('Increase respiratory medicine stockpile before winter months')
      recommendations.push('Prepare for increased pneumonia and flu cases')
    } else if (categoryId.includes('VACCINE_PREVENTABLE')) {
      recommendations.push('Schedule vaccination campaigns before peak season')
      recommendations.push('Monitor immunization coverage in high-risk populations')
    } else if (categoryId.includes('EMERGENCY_ZOONOTIC')) {
      recommendations.push('Enhance animal bite surveillance during peak months')
      recommendations.push('Ensure rabies vaccines are adequately stocked')
    }

    return recommendations
  }

  // ✅ FIX: Helper: Extract trend analysis
  static extractTrendAnalysis(prophetData: ProphetDataStructure): TrendAnalysis {
    const trendData = prophetData.trend_info || {}
    
    return {
      overall_direction: trendData.overall_trend || 'stable',
      trend_strength: trendData.trend_strength || 0,
      trend_confidence: 0.8, // Default confidence
      changepoints: [], // TODO: Extract from Prophet changepoints
      long_term_prediction: {
        next_year_growth: (trendData.trend_strength || 0) * 12
      }
    }
  }
}
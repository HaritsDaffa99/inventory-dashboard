import { DISEASE_CATEGORIES } from './disease-categories'
import type { OutbreakTrend } from './outbreak-types'
// ✅ Remove unused imports: OutbreakForecast, OutbreakAlert, HistoricalUsageData, MonthlyUsageSummary

export class OutbreakDetectionEngine {
  
  // Calculate outbreak probability based on threshold model
  static calculateOutbreakProbability(
    currentUsage: number,
    historicalAverage: number,
    category: string
  ): number {
    const category_config = DISEASE_CATEGORIES[category]
    if (!category_config) return 0

    const variance = (currentUsage - historicalAverage) / historicalAverage
    const threshold = category_config.outbreakThreshold

    if (variance <= 0) return 0 // No outbreak if usage is decreasing

    // Simple probability calculation based on threshold exceedance
    if (variance >= threshold * 2) return 90 // Very high probability
    if (variance >= threshold * 1.5) return 70 // High probability  
    if (variance >= threshold) return 50 // Medium probability
    if (variance >= threshold * 0.5) return 25 // Low probability
    
    return 10 // Minimal risk
  }

  // Determine risk level based on probability
  static determineRiskLevel(probability: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (probability >= 80) return 'CRITICAL'
    if (probability >= 60) return 'HIGH'
    if (probability >= 30) return 'MEDIUM'
    return 'LOW'
  }

  // Calculate seasonal baseline using simple moving average
  static calculateSeasonalBaseline(
    monthlyData: { month: string; usage: number }[],
    targetMonth: number
  ): number {
    // Find same months from previous years
    const sameMonthData = monthlyData.filter(data => {
      const month = parseInt(data.month.split('-')[1])
      return month === targetMonth
    })

    if (sameMonthData.length === 0) {
      // Fallback to overall average
      return monthlyData.reduce((sum, d) => sum + d.usage, 0) / monthlyData.length
    }

    return sameMonthData.reduce((sum, d) => sum + d.usage, 0) / sameMonthData.length
  }

  // Generate geographic spread risk assessment
  static assessGeographicSpread(affectedUnits: number[]): 'CONTAINED' | 'REGIONAL' | 'WIDESPREAD' {
    if (affectedUnits.length <= 1) return 'CONTAINED'
    if (affectedUnits.length <= 3) return 'REGIONAL'
    return 'WIDESPREAD'
  }

  // Generate recommendations based on risk level and disease category
  static generateRecommendations(
    categoryId: string,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    affectedUnits: number
  ): string[] {
    const category = DISEASE_CATEGORIES[categoryId]
    const recommendations: string[] = []

    if (!category) return recommendations

    // Base recommendations by risk level
    switch (riskLevel) {
      case 'CRITICAL':
        recommendations.push('Immediate intervention required')
        recommendations.push('Deploy emergency response teams')
        recommendations.push('Increase medicine stockpile by 200%')
        break
      case 'HIGH':
        recommendations.push('Enhanced monitoring recommended')
        recommendations.push('Increase medicine stockpile by 100%')
        recommendations.push('Prepare emergency response protocols')
        break
      case 'MEDIUM':
        recommendations.push('Monitor closely for next 30 days')
        recommendations.push('Increase medicine stockpile by 50%')
        break
      case 'LOW':
        recommendations.push('Continue routine monitoring')
        break
    }

    // Category-specific recommendations
    switch (categoryId) {
      case 'EMERGENCY_ZOONOTIC':
        recommendations.push('Check animal control measures')
        recommendations.push('Review bite/exposure protocols')
        break
      case 'VACCINE_PREVENTABLE':
        recommendations.push('Review vaccination coverage')
        recommendations.push('Consider catch-up vaccination campaigns')
        break
      case 'RESPIRATORY':
        recommendations.push('Monitor environmental factors')
        recommendations.push('Review infection control measures')
        break
      case 'CHILDHOOD_IMMUNIZATION':
        recommendations.push('Review routine immunization schedules')
        break
    }

    // Geographic spread recommendations
    if (affectedUnits > 2) {
      recommendations.push('Coordinate inter-unit response')
      recommendations.push('Implement regional monitoring')
    }

    return recommendations
  }

  // Generate alert triggers
  static generateAlertTriggers(
    probability: number,
    variance: number,
    trend: 'INCREASING' | 'DECREASING' | 'STABLE'
  ): string[] {
    const triggers: string[] = []

    if (probability >= 50) {
      triggers.push(`Usage exceeded outbreak threshold (${(variance * 100).toFixed(1)}% increase)`)
    }

    if (trend === 'INCREASING') {
      triggers.push('Increasing trend detected over recent months')
    }

    if (probability >= 80) {
      triggers.push('Multiple units affected simultaneously')
    }

    return triggers
  }

  // Generate forecast trends for next months
  static generateForecastTrends(
    historicalData: { month: string; usage: number }[],
    months: number
  ): OutbreakTrend[] {
    const trends: OutbreakTrend[] = []
    const currentDate = new Date()

    // Simple trend projection based on recent growth rate
    const recentMonths = historicalData.slice(-3)
    const growthRate = recentMonths.length >= 2 
      ? (recentMonths[recentMonths.length - 1].usage - recentMonths[0].usage) / recentMonths[0].usage / recentMonths.length
      : 0

    const lastUsage = historicalData[historicalData.length - 1]?.usage || 0

    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
      const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`
      
      // Simple linear projection with some randomness
      const projectedUsage = Math.max(0, lastUsage * (1 + growthRate * i))
      const baseline = this.calculateSeasonalBaseline(historicalData, forecastDate.getMonth() + 1)
      
      const probability = this.calculateOutbreakProbability(projectedUsage, baseline, 'VACCINE_PREVENTABLE')
      const riskLevel = this.determineRiskLevel(probability)

      trends.push({
        month: monthKey,
        predicted_usage: Math.round(projectedUsage),
        outbreak_probability: probability,
        risk_level: riskLevel,
        confidence_interval: {
          lower: Math.round(projectedUsage * 0.8),
          upper: Math.round(projectedUsage * 1.2)
        }
      })
    }

    return trends
  }
}
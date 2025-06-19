"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, TrendingUp, Clock, Activity, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { OutbreakForecast } from "@/lib/forecasting/outbreak-types"
import { OutbreakStockInsights } from "./OutbreakStockInsights"

interface EarlyWarningIndicatorsProps {
  forecasts: OutbreakForecast[]
  selectedCategory?: string
  stockData?: {
    medicines: Array<{
      id: number
      name: string
      currentQuantity: number
      weeklyConsumption: number
      daysRemaining: number
      category: string
      unitName?: string
      expiryDate?: string
    }>
    totalUnits: number
    totalValue?: number
  }
}

interface VelocityGaugeProps {
  velocity: number
  trend: string
  alertLevel: string
}

interface DoublingTimeProps {
  doublingTime: number | null
  phase: string
  alertLevel: string
}

interface EpidemicCurveProps {
  shape: string
  alertLevel: string
  peakPrediction?: {
    predicted_month: string
    predicted_usage: number
    confidence: string
  } | null
}

interface TrafficLightProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  size?: 'sm' | 'md' | 'lg'
}

// 🚦 Traffic Light Component
function TrafficLight({ level, size = 'md' }: TrafficLightProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-6 h-6'
  }

  const lightConfig = {
    LOW: { color: 'bg-green-500', icon: CheckCircle, textColor: 'text-green-700' },
    MEDIUM: { color: 'bg-yellow-500', icon: AlertCircle, textColor: 'text-yellow-700' },
    HIGH: { color: 'bg-orange-500', icon: AlertTriangle, textColor: 'text-orange-700' },
    CRITICAL: { color: 'bg-red-500', icon: XCircle, textColor: 'text-red-700' }
  }

  const config = lightConfig[level]
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-full ${config.color} ${sizeClasses[size]} animate-pulse`} />
      <Icon className={`${sizeClasses[size]} ${config.textColor}`} />
      <span className={`text-xs font-medium ${config.textColor}`}>{level}</span>
    </div>
  )
}

// 📈 Velocity Gauge Component
function VelocityGauge({ velocity, trend, alertLevel }: VelocityGaugeProps) {
  // Normalize velocity to 0-100 scale for gauge display
  const normalizedVelocity = Math.min(100, Math.max(0, (velocity + 50) * 2)) // Convert -50 to +50 range to 0-100
  
  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'decreasing': return <TrendingUp className="w-4 h-4 text-green-500 rotate-180" />
      default: return <Activity className="w-4 h-4 text-blue-500" />
    }
  }

  const getVelocityColor = (vel: number) => {
    if (vel > 25) return 'bg-red-500'
    if (vel > 15) return 'bg-orange-500'
    if (vel > 5) return 'bg-yellow-500'
    if (vel > -5) return 'bg-blue-500'
    return 'bg-green-500'
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Outbreak Velocity
          </span>
          <TrafficLight level={alertLevel as TrafficLightProps['level']} size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main Velocity Display */}
          <div className="text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              {velocity > 0 ? '+' : ''}{velocity.toFixed(1)}%
              {getTrendIcon(trend)}
            </div>
            <p className="text-xs text-gray-500">per week growth rate</p>
          </div>

          {/* Velocity Gauge */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>-50%</span>
              <span>Stable</span>
              <span>+50%</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`absolute top-0 left-0 h-full transition-all duration-500 ${getVelocityColor(velocity)}`}
                style={{ width: `${normalizedVelocity}%` }}
              />
              {/* Center line for stable point */}
              <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gray-400 opacity-50" />
            </div>
          </div>

          {/* Trend Badge */}
          <div className="flex justify-center">
            <Badge variant={velocity > 15 ? 'destructive' : velocity > 5 ? 'default' : 'secondary'}>
              {trend.charAt(0).toUpperCase() + trend.slice(1)} Trend
            </Badge>
          </div>

          {/* Risk Interpretation */}
          <div className="text-xs text-center text-gray-600">
            {velocity > 25 && "🚨 Rapid outbreak acceleration"}
            {velocity > 15 && velocity <= 25 && "⚠️ High growth rate detected"}
            {velocity > 5 && velocity <= 15 && "📈 Moderate increase trend"}
            {velocity >= -5 && velocity <= 5 && "✅ Stable usage patterns"}
            {velocity < -5 && "📉 Declining usage trend"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ⏰ Doubling Time Component
function DoublingTime({ doublingTime, phase, alertLevel }: DoublingTimeProps) {
  const formatDoublingTime = (days: number | null) => {
    if (!days || days <= 0) return 'N/A'
    
    if (days < 7) return `${Math.round(days)} days`
    if (days < 30) return `${Math.round(days / 7)} weeks`
    if (days < 365) return `${Math.round(days / 30)} months`
    return `${Math.round(days / 365)} years`
  }

  const getPhaseColor = (phase: string) => {
    switch (phase.toLowerCase()) {
      case 'exponential_growth': return 'text-red-600 bg-red-50'
      case 'accelerating': return 'text-orange-600 bg-orange-50'
      case 'linear_growth': return 'text-blue-600 bg-blue-50'
      case 'stable': return 'text-green-600 bg-green-50'
      case 'declining': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getUrgencyLevel = (days: number | null) => {
    if (!days) return 'Monitor'
    if (days <= 7) return 'Critical'
    if (days <= 14) return 'High Priority'
    if (days <= 30) return 'Medium Priority'
    return 'Low Priority'
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Doubling Time
          </span>
          <TrafficLight level={alertLevel as TrafficLightProps['level']} size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main Doubling Time Display */}
          <div className="text-center">
            <div className="text-2xl font-bold">
              {formatDoublingTime(doublingTime)}
            </div>
            <p className="text-xs text-gray-500">to double current usage</p>
          </div>

          {/* Phase Badge */}
          <div className="flex justify-center">
            <Badge className={getPhaseColor(phase)}>
              {phase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          </div>

          {/* Urgency Level */}
          <div className="text-center">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              doublingTime && doublingTime <= 7 ? 'bg-red-100 text-red-700' :
              doublingTime && doublingTime <= 14 ? 'bg-orange-100 text-orange-700' :
              doublingTime && doublingTime <= 30 ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {getUrgencyLevel(doublingTime)}
            </span>
          </div>

          {/* Progress Bar for Visual Representation */}
          {doublingTime && doublingTime > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Immediate</span>
                <span>Long-term</span>
              </div>
              <Progress 
                value={Math.min(100, Math.max(5, 100 - (doublingTime / 365 * 100)))} 
                className="h-2"
              />
            </div>
          )}

          {/* Interpretation */}
          <div className="text-xs text-center text-gray-600">
            {doublingTime && doublingTime <= 7 && "🚨 Immediate intervention needed"}
            {doublingTime && doublingTime > 7 && doublingTime <= 30 && "⚠️ Enhanced monitoring recommended"}
            {doublingTime && doublingTime > 30 && doublingTime <= 365 && "📊 Standard monitoring sufficient"}
            {doublingTime && doublingTime > 365 && "✅ Normal growth patterns"}
            {!doublingTime && "📈 No exponential growth detected"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 📊 Epidemic Curve Component
function EpidemicCurve({ shape, alertLevel, peakPrediction }: EpidemicCurveProps) {
  const getShapeIcon = (shape: string) => {
    switch (shape.toLowerCase()) {
      case 'exponential': return '📈'
      case 'linear': return '📊'
      case 'stable': return '➡️'
      case 'declining': return '📉'
      case 'accelerating': return '🚀'
      default: return '📊'
    }
  }

  const getShapeDescription = (shape: string) => {
    switch (shape.toLowerCase()) {
      case 'exponential': return 'Rapid exponential growth pattern'
      case 'linear': return 'Steady linear increase pattern'
      case 'stable': return 'Stable pattern with minimal variation'
      case 'declining': return 'Decreasing trend pattern'
      case 'accelerating': return 'Accelerating growth pattern'
      default: return 'Pattern analysis in progress'
    }
  }

  const getShapeColor = (shape: string) => {
    switch (shape.toLowerCase()) {
      case 'exponential': return 'text-red-600 bg-red-50 border-red-200'
      case 'accelerating': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'linear': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'stable': return 'text-green-600 bg-green-50 border-green-200'
      case 'declining': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Epidemic Curve
          </span>
          <TrafficLight level={alertLevel as TrafficLightProps['level']} size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Shape Display */}
          <div className="text-center">
            <div className="text-3xl mb-1">
              {getShapeIcon(shape)}
            </div>
            <div className={`text-sm font-medium px-3 py-1 rounded-full border ${getShapeColor(shape)}`}>
              {shape.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-center text-gray-600">
            {getShapeDescription(shape)}
          </p>

          {/* Peak Prediction (if available) */}
          {peakPrediction && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-xs font-medium text-amber-800 mb-1">Peak Prediction</div>
              <div className="text-xs text-amber-700">
                <div>📅 Month: {peakPrediction.predicted_month}</div>
                <div>📊 Usage: {peakPrediction.predicted_usage.toLocaleString()}</div>
                <div>🎯 Confidence: {peakPrediction.confidence}</div>
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          <div className="text-center">
            <div className={`text-xs px-2 py-1 rounded-full font-medium ${
              alertLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
              alertLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
              alertLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {alertLevel} Risk Level
            </div>
          </div>

          {/* Action Recommendations */}
          <div className="text-xs text-center text-gray-600">
            {shape === 'exponential' && "🚨 Consider immediate intervention"}
            {shape === 'accelerating' && "⚠️ Prepare response protocols"}
            {shape === 'linear' && "📊 Continue enhanced monitoring"}
            {shape === 'stable' && "✅ Maintain routine surveillance"}
            {shape === 'declining' && "📉 Monitor for trend reversal"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ✅ DYNAMIC: Calculate early warning based on ACTUAL chart risk levels
function calculateDynamicEarlyWarning(forecast: OutbreakForecast) {
  console.log('🔍 Calculating dynamic early warning for:', forecast.category_name)
  
  // ✅ DYNAMIC: Get threshold from forecast data (not hardcoded)
  const threshold = forecast.outbreak_threshold
  
  if (!threshold || !forecast.prophet_forecast?.forecast_months) {
    console.warn('⚠️ No threshold or forecast data available, using fallback')
    // Fallback to existing early_warning if no threshold data
    return forecast.early_warning || {
      overall_alert_level: 'LOW' as const,
      warning_messages: ['No dynamic analysis available'],
      urgent_actions: ['Generate Prophet forecast for detailed analysis'],
      velocity_analysis: {
        velocity_per_week: 0,
        velocity_trend: 'stable',
        alert_level: 'LOW' as const
      },
      doubling_analysis: {
        doubling_time_days: null,
        epidemic_phase: 'stable',
        doubling_confidence: 0,
        alert_level: 'LOW' as const
      },
      epidemic_curve: {
        curve_shape: 'stable',
        peak_prediction: null,
        intervention_window: null,
        time_to_critical_months: null,
        alert_level: 'LOW' as const
      },
      confidence_summary: {
        velocity_confidence: 0,
        doubling_confidence: 0,
        curve_confidence: 'low'
      }
    }
  }
  
  console.log(`🎯 Using dynamic threshold for ${forecast.category_id}: ${threshold}`)
  
  // ✅ DYNAMIC: Calculate actual risk based on Prophet threshold
  const monthlyRisks = forecast.prophet_forecast.forecast_months.map(month => 
    (month.predicted_usage / threshold) * 100
  )
  
  const avgRisk = monthlyRisks.reduce((sum, risk) => sum + risk, 0) / monthlyRisks.length
  const maxRisk = Math.max(...monthlyRisks)
  const minRisk = Math.min(...monthlyRisks)
  
  console.log(`📊 Risk analysis: avg=${avgRisk.toFixed(1)}%, max=${maxRisk.toFixed(1)}%, min=${minRisk.toFixed(1)}%`)
  
  // ✅ DYNAMIC: Calculate velocity based on actual trend
  const firstHalf = monthlyRisks.slice(0, Math.ceil(monthlyRisks.length / 2))
  const secondHalf = monthlyRisks.slice(Math.ceil(monthlyRisks.length / 2))
  const firstHalfAvg = firstHalf.reduce((sum, risk) => sum + risk, 0) / firstHalf.length
  const secondHalfAvg = secondHalf.reduce((sum, risk) => sum + risk, 0) / secondHalf.length
  
  // Calculate weekly velocity (approximation)
  const monthlyChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
  const weeklyVelocity = monthlyChange / 4 // Convert monthly to weekly
  
  console.log(`📈 Velocity calculation: ${weeklyVelocity.toFixed(1)}% per week`)
  
  // ✅ DYNAMIC: Determine alert levels based on actual calculations
  const getAlertLevel = (risk: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
    if (risk >= 95) return 'CRITICAL'
    if (risk >= 80) return 'HIGH'
    if (risk >= 60) return 'MEDIUM'
    return 'LOW'
  }
  
  const overallAlert = getAlertLevel(maxRisk)
  const velocityAlert = getAlertLevel(avgRisk)
  
  // ✅ DYNAMIC: Calculate doubling time based on actual velocity
  const doublingDays = weeklyVelocity > 0 
    ? Math.log(2) / (Math.log(1 + weeklyVelocity / 100)) * 7 // Weekly to days
    : null
  
  // ✅ DYNAMIC: Determine trend and curve shape
  const getTrend = (velocity: number) => {
    if (velocity > 5) return 'increasing'
    if (velocity < -5) return 'decreasing'
    return 'stable'
  }
  
  const getCurveShape = (velocity: number, avgRisk: number) => {
    if (velocity > 15 && avgRisk > 80) return 'exponential'
    if (velocity > 10 && avgRisk > 70) return 'accelerating'
    if (velocity > 2 && avgRisk > 50) return 'linear'
    if (velocity < -5) return 'declining'
    return 'stable'
  }
  
  const trend = getTrend(weeklyVelocity)
  const curveShape = getCurveShape(weeklyVelocity, avgRisk)
  
  console.log(`🎯 Dynamic analysis complete: ${overallAlert} alert, ${trend} trend, ${curveShape} curve`)
  
  return {
    overall_alert_level: overallAlert,
    warning_messages: [
      `📊 Current usage at ${avgRisk.toFixed(1)}% of outbreak threshold`,
      maxRisk > 80 ? '⚠️ Approaching critical levels' : avgRisk > 60 ? '📈 Elevated risk detected' : '✅ Risk levels within acceptable range',
      `📈 Trend: ${trend} at ${Math.abs(weeklyVelocity).toFixed(1)}% per week`
    ],
    urgent_actions: overallAlert === 'HIGH' || overallAlert === 'CRITICAL'
      ? ['Enhanced monitoring required', 'Prepare response protocols', 'Alert medical teams']
      : overallAlert === 'MEDIUM'
      ? ['Increase monitoring frequency', 'Review prevention protocols']
      : ['Continue routine monitoring'],
    velocity_analysis: {
      velocity_per_week: Math.round(weeklyVelocity * 10) / 10, // Round to 1 decimal
      velocity_trend: trend,
      alert_level: velocityAlert
    },
    doubling_analysis: {
      doubling_time_days: doublingDays ? Math.round(doublingDays) : null,
      epidemic_phase: weeklyVelocity > 10 ? 'accelerating' : weeklyVelocity > 0 ? 'linear_growth' : 'stable',
      doubling_confidence: doublingDays ? (weeklyVelocity > 5 ? 4 : 3) : 0,
      alert_level: doublingDays && doublingDays < 90 ? (doublingDays < 30 ? 'HIGH' : 'MEDIUM') : 'LOW'
    },
    epidemic_curve: {
      curve_shape: curveShape,
      peak_prediction: null, // Could be calculated based on trend
      intervention_window: null,
      time_to_critical_months: null,
      alert_level: getAlertLevel(avgRisk)
    },
    confidence_summary: {
      velocity_confidence: monthlyRisks.length >= 6 ? 4 : 3,
      doubling_confidence: doublingDays ? (weeklyVelocity > 5 ? 4 : 3) : 0,
      curve_confidence: 'high'
    }
  }
}

// 🎯 Main Early Warning Indicators Component
export default function EarlyWarningIndicators({ 
  forecasts, 
  selectedCategory,
  stockData
}: EarlyWarningIndicatorsProps) {
  // Find the selected category or use the first one with data
  const targetForecast = selectedCategory 
    ? forecasts.find(f => f.category_id === selectedCategory)
    : forecasts.find(f => f.outbreak_threshold && f.prophet_forecast?.forecast_months) || forecasts[0]

  if (!targetForecast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Early Warning Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No early warning data available</p>
            <p className="text-xs mt-1">Generate a Prophet AI forecast to see indicators</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ✅ DYNAMIC: Use calculated early warning instead of static data
  const earlyWarning = calculateDynamicEarlyWarning(targetForecast)
  const categoryName = targetForecast.category_name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())

  console.log('🎯 Early Warning Data:', earlyWarning)

  // Transform forecast data for stock insights
  const outbreakForecastData = {
    severity: earlyWarning.overall_alert_level,
    timeline: targetForecast.prophet_forecast?.forecast_months?.[0]?.month || 'Current',
    diseaseCategory: categoryName,
    affectedPopulation: undefined, // Could be calculated from forecast data
    outbreakVelocity: earlyWarning.velocity_analysis.velocity_per_week,
    doublingTime: earlyWarning.doubling_analysis.doubling_time_days?.toString() || 'N/A',
    epidemicCurve: earlyWarning.epidemic_curve.curve_shape
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Early Warning Indicators
          </CardTitle>
          <div className="text-sm text-gray-600">
            Real-time outbreak risk assessment for <span className="font-medium">{categoryName}</span>
          </div>
          
          {/* Overall Alert Level */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium">Overall Alert Level:</span>
            <div className="flex items-center gap-2">
              <TrafficLight level={earlyWarning.overall_alert_level} size="md" />
              <Badge className={`${
                earlyWarning.overall_alert_level === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                earlyWarning.overall_alert_level === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                earlyWarning.overall_alert_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {earlyWarning.overall_alert_level}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Indicator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Velocity Gauge */}
        <VelocityGauge
          velocity={earlyWarning.velocity_analysis.velocity_per_week}
          trend={earlyWarning.velocity_analysis.velocity_trend}
          alertLevel={earlyWarning.velocity_analysis.alert_level}
        />

        {/* Doubling Time */}
        <DoublingTime
          doublingTime={earlyWarning.doubling_analysis.doubling_time_days}
          phase={earlyWarning.doubling_analysis.epidemic_phase}
          alertLevel={earlyWarning.doubling_analysis.alert_level}
        />

        {/* Epidemic Curve */}
        <EpidemicCurve
          shape={earlyWarning.epidemic_curve.curve_shape}
          alertLevel={earlyWarning.epidemic_curve.alert_level}
          peakPrediction={earlyWarning.epidemic_curve.peak_prediction}
        />
      </div>

      {/* Stock Preparedness Analysis - NEW SECTION */}
      {stockData && (
        <OutbreakStockInsights
          outbreakForecast={outbreakForecastData}
          stockData={stockData}
          diseaseCategory={categoryName}
        />
      )}

      {/* Warning Messages & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Warning Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Warning Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {earlyWarning.warning_messages.map((message, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                  <span className="text-gray-700">{message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {earlyWarning.urgent_actions.map((action, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <span className="text-gray-700">{action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Analysis Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">
                {earlyWarning.confidence_summary.velocity_confidence}/5
              </div>
              <div className="text-xs text-gray-500">Velocity Confidence</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {earlyWarning.confidence_summary.doubling_confidence}/5
              </div>
              <div className="text-xs text-gray-500">Doubling Confidence</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {earlyWarning.confidence_summary.curve_confidence.toUpperCase()}
              </div>
              <div className="text-xs text-gray-500">Curve Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
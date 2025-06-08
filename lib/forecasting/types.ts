export interface Unit {
  id: number
  namaUnit: string
  kodeUnit: string
}

export interface Medicine {
  id: number
  namaPersediaan: string
  kodePersediaan: string
}

export interface ForecastData {
  date: string
  forecasted_usage: number
  lower_ci: number
  upper_ci: number
}

export interface ProphetParameters {
  changepoint_prior_scale: number
  seasonality_mode: string
  seasonality_prior_scale: number
}

export interface ForecastSummary {
  total_forecast: number
  avg_monthly: number
  historical_avg: number
  data_points: number
  forecast_period: number
}

export interface Recommendations {
  safety_stock: number
  reorder_point: number
  lead_time_months: number
  service_level: string
}

export interface ModelMetrics {
  rmse?: number
  mae?: number
  mape?: number
  train_size?: number
  test_size?: number
}

export interface HistoricalData {
  date: string
  usage: number
}

export interface ForecastResult {
  success: boolean
  unit_id: number
  medicine_id: number
  model_type: string
  model_parameters: ProphetParameters | Record<string, unknown>
  historical_data: HistoricalData[]
  forecast_data: ForecastData[]
  summary: ForecastSummary
  recommendations: Recommendations
  metrics?: ModelMetrics
  error?: string
}

// Updated interface for AI insights - removed costImplications and changed monthlyPlan structure
export interface ForecastInsights {
  executiveSummary: string
  stockRecommendations: string[]
  monthlyStockPlan: {
    month: string
    recommendedStock: string
    expectedUsage: string
    orderAction: string
  }[]
  riskFactors: string[]
}

// NEW: Disease outbreak types
export interface DiseaseOutbreakData {
  category_id: string
  category_name: string
  diseases: string[]
  total_medicines: number
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  monthly_usage: {
    month: string
    usage: number
    units_affected: number
  }[]
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  outbreak_probability: number
  trend: 'INCREASING' | 'DECREASING' | 'STABLE'
}

export interface OutbreakAlert {
  category_id: string
  category_name: string
  unit_id: number
  unit_name: string
  alert_level: 'WARNING' | 'OUTBREAK' | 'CRITICAL'
  current_usage: number
  baseline_usage: number
  increase_percentage: number
  month: string
  recommendations: string[]
}

export interface HistoricalUsageData {
  category_id: string
  category_name: string
  unit_id: number
  unit_name: string
  monthly_usage: {
    month: string // YYYY-MM format
    usage: number
    medicine_count: number
  }[]
  total_usage: number
  avg_monthly_usage: number
  trend: 'INCREASING' | 'DECREASING' | 'STABLE'
}

export interface MonthlyUsageSummary {
  category_id: string
  category_name: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  total_usage: number
  units_affected: number
  avg_monthly_usage: number
  monthly_data: {
    month: string
    usage: number
  }[]
  trend: 'INCREASING' | 'DECREASING' | 'STABLE'
}
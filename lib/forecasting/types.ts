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

// New interface for AI insights
export interface ForecastInsights {
  executiveSummary: string
  stockRecommendations: string[]
  monthlyPlan: { month: string; recommendation: string }[]
  costImplications: string[]
  riskFactors: string[]
}
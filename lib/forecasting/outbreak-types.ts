export interface OutbreakForecast {
  category_id: string
  category_name: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  forecast_period: '3_MONTHS' | '6_MONTHS' | '12_MONTHS'
  outbreak_probability: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confidence_score: number
  baseline_usage: number
  predicted_usage: number
  variance_percentage: number
  affected_units: number[]
  geographic_spread_risk: 'CONTAINED' | 'REGIONAL' | 'WIDESPREAD'
  alert_triggers: string[]
  recommendations: string[]
  forecast_date: string
  prophet_forecast?: ProphetForecastData
  seasonal_pattern?: SeasonalPattern
  trend_analysis?: TrendAnalysis
  anomaly_detection?: AnomalyResult
  outbreak_threshold?: number
  
  // ✅ PROPERLY TYPED early_warning property:
  early_warning?: {
    overall_alert_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    warning_messages: string[]
    urgent_actions: string[]
    velocity_analysis: {
      velocity_per_week: number
      velocity_trend: string
      alert_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    }
    doubling_analysis: {
      doubling_time_days: number | null
      epidemic_phase: string
      doubling_confidence: number
      alert_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    }
    epidemic_curve: {
      curve_shape: string
      peak_prediction: {
        predicted_month: string
        predicted_usage: number
        confidence: string
      } | null
      intervention_window: {
        months_until_peak: number
        intervention_deadline: string
        urgency: string
      } | null
      time_to_critical_months: number | null
      alert_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    }
    confidence_summary: {
      velocity_confidence: number
      doubling_confidence: number
      curve_confidence: string
    }
  }
}

export interface ProphetForecastData {
  forecast_months: ProphetMonthlyForecast[]
  seasonal_components: {
    yearly_strength: number
    trend_strength: number
    overall_trend: 'increasing' | 'decreasing' | 'stable'
  }
  confidence_intervals: {
    method: 'prophet'
    interval_width: number
  }
  model_performance: {
    mae: number
    mape: number
    training_periods: number
  }
}

export interface ProphetMonthlyForecast {
  month: string
  predicted_usage: number
  lower_bound: number
  upper_bound: number
  trend_component: number
  seasonal_component: number
  prophet_confidence: number
  outbreak_probability: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface SeasonalPattern {
  category_id: string
  peak_months: number[]
  low_months: number[]
  seasonal_strength: number
  yearly_pattern: {
    month: number
    relative_risk: number
  }[]
  recommendations: string[]
}

export interface TrendAnalysis {
  overall_direction: 'increasing' | 'decreasing' | 'stable'
  trend_strength: number
  trend_confidence: number
  changepoints: {
    date: string
    significance: number
    description: string
  }[]
  long_term_prediction: {
    next_year_growth: number
    saturation_point?: number
  }
}

export interface AnomalyResult {
  category_id: string
  detection_method: 'prophet' | 'threshold' | 'hybrid'
  anomalies: AnomalyPoint[]
  summary: {
    total_anomalies: number
    outbreak_signals: number
    false_positive_rate: number
    sensitivity_level: 'LOW' | 'MEDIUM' | 'HIGH'
  }
}

export interface AnomalyPoint {
  month: string
  actual_usage: number
  predicted_usage: number
  lower_bound: number
  upper_bound: number
  deviation_percentage: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  is_outbreak_signal: boolean
  confidence: number
  description: string
}

export interface OutbreakAlert {
  id: string
  category_id: string
  category_name: string
  alert_level: 'WARNING' | 'OUTBREAK' | 'CRITICAL'
  detected_at: string
  affected_units: {
    unit_id: number
    unit_name: string
    usage_increase: number
    risk_contribution: number
  }[]
  description: string
  immediate_actions: string[]
  monitoring_recommendations: string[]
  detection_method?: 'threshold' | 'prophet' | 'hybrid'
  statistical_significance?: number
  seasonal_context?: string
  trend_context?: string
  confidence_level?: number
}

export interface ForecastParameters {
  analysis_period_months: number
  forecast_horizon_months: number
  seasonal_adjustment: boolean
  geographic_analysis: boolean
  confidence_threshold: number
  alert_sensitivity: 'LOW' | 'MEDIUM' | 'HIGH'
  use_prophet?: boolean
  prophet_params?: {
    changepoint_prior_scale: number
    seasonality_prior_scale: number
    interval_width: number
    mcmc_samples?: number
  }
}

export interface OutbreakTrend {
  month: string
  actual_usage?: number
  predicted_usage: number
  outbreak_probability: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confidence_interval: {
    lower: number
    upper: number
  }
  seasonal_component?: number
  trend_component?: number
  prophet_confidence?: number
}

export interface ProphetServiceRequest {
  category_id: string
  historical_data: {
    month: string
    usage: number
    category_id: string
  }[]
  periods?: number
}

export interface ProphetServiceResponse {
  success: boolean
  data?: ProphetForecastData
  error?: string
}
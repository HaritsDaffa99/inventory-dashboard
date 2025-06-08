"use server";
import { ProphetIntegrationService } from "@/lib/forecasting/prophet-integration";
// ✅ FIX: Remove unused prisma import
import { DISEASE_CATEGORIES } from "@/lib/forecasting/disease-categories";
import { OutbreakDetectionEngine } from "@/lib/forecasting/outbreak-engine";
import { getUsageSummaryByCategory } from "@/lib/actions/disease-forecasting";
import type {
  OutbreakForecast,
  OutbreakAlert,
  ForecastParameters,
  ProphetForecastData,
  ProphetMonthlyForecast,
} from "@/lib/forecasting/outbreak-types";

// ✅ ADD: Type definition for category data
interface CategoryUsageData {
  category_id: string;
  category_name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  avg_monthly_usage: number;
  units_affected: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  monthly_data: Array<{
    month: string;
    usage: number;
  }>;
}

// ✅ ADD: Extended Prophet data structure with actual response fields
interface ExtendedProphetDataStructure {
  forecast_data?: Array<{
    month: string;
    predicted_usage: number;
    lower_bound?: number;
    upper_bound?: number;
    trend?: number;
    seasonal?: number;
    seasonal_component?: number;
    prophet_confidence?: number;
  }>;
  seasonal_components?: {
    seasonal_strength?: number;
    yearly_pattern?: Array<{ month: number; relative_risk: number }>;
    yearly_strength?: number; // ✅ ADD: Missing field
    trend_strength?: number;   // ✅ ADD: Missing field
    overall_trend?: 'increasing' | 'decreasing' | 'stable'; // ✅ ADD: Missing field
  };
  trend_info?: {
    overall_trend?: 'increasing' | 'decreasing' | 'stable';
    trend_strength?: number;
  };
  // ✅ ADD: Missing outbreak_analysis field
  outbreak_analysis?: {
    historical_baseline?: number;
    max_predicted_usage?: number;
    predicted_outbreaks?: number;
    forecast_months_total?: number;
    outbreak_probability?: number;
    overall_trend?: 'increasing' | 'decreasing' | 'stable';
  };
  // ✅ ADD: Missing early_warning field
  early_warning?: {
    overall_alert_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    warning_messages: string[];
    urgent_actions: string[];
    velocity_analysis: {
      velocity_per_week: number;
      velocity_trend: string;
      alert_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
    doubling_analysis: {
      doubling_time_days: number | null;
      epidemic_phase: string;
      doubling_confidence: number;
      alert_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
    epidemic_curve: {
      curve_shape: string;
      peak_prediction: {
        predicted_month: string;
        predicted_usage: number;
        confidence: string;
      } | null;
      intervention_window: {
        months_until_peak: number;
        intervention_deadline: string;
        urgency: string;
      } | null;
      time_to_critical_months: number | null;
      alert_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
    confidence_summary: {
      velocity_confidence: number;
      doubling_confidence: number;
      curve_confidence: string;
    };
  };
}

export async function generateOutbreakForecasts(
  unitIds: number[],
  parameters: ForecastParameters = {
    analysis_period_months: 24,
    forecast_horizon_months: 6,
    seasonal_adjustment: true,
    geographic_analysis: true,
    confidence_threshold: 70,
    alert_sensitivity: "MEDIUM",
    use_prophet: false,
  }
): Promise<{
  success: boolean;
  data?: OutbreakForecast[];
  error?: string;
}> {
  try {
    console.log("🚀 Starting outbreak forecast generation");
    console.log(`📊 Parameters: ${unitIds.length} units, ${parameters.analysis_period_months} months history, ${parameters.forecast_horizon_months} months forecast`);

    // Get historical usage data
    const usageResult = await getUsageSummaryByCategory(
      unitIds,
      parameters.analysis_period_months
    );

    if (!usageResult.success || !usageResult.data) {
      return {
        success: false,
        error: usageResult.error || "Failed to get historical data",
      };
    }

    const forecasts: OutbreakForecast[] = [];

    // ✅ Prophet AI Model Processing
    if (parameters.use_prophet) {
      console.log("🤖 Using Prophet AI Model");

      // Prepare data for Prophet batch processing
      const prophetData = usageResult.data.map((categoryData) => ({
        category_id: categoryData.category_id,
        historical_data: categoryData.monthly_data.map((m) => ({
          month: m.month,
          usage: m.usage,
        })),
      }));

      try {
        // Call Prophet batch forecast
        const prophetResult = await ProphetIntegrationService.batchForecast(
          prophetData,
          parameters.forecast_horizon_months
        );

        if (prophetResult.success && prophetResult.data) {
          console.log("✅ Prophet forecasts generated successfully");

          // Process Prophet results
          for (const categoryData of usageResult.data) {
            const category = DISEASE_CATEGORIES[categoryData.category_id];
            if (!category) continue;

            const prophetForecast = prophetResult.data[categoryData.category_id] as ExtendedProphetDataStructure;

            // ✅ FIX: Check Prophet forecast structure properly
            if (prophetForecast && prophetForecast.forecast_data) {
              console.log(`✅ Prophet data available for ${categoryData.category_id}`);

              // ✅ FIX: Use safe fallbacks for outbreak_analysis
              const prophetAnalysis = prophetForecast.outbreak_analysis || {};
              const historicalBaseline = prophetAnalysis.historical_baseline || categoryData.avg_monthly_usage;
              const maxPredicted = prophetAnalysis.max_predicted_usage || categoryData.avg_monthly_usage;

              // Calculate Prophet-based outbreak probability
              const baselineThreshold = historicalBaseline * 1.5;
              const outbreakMonths = prophetForecast.forecast_data.filter(
                (f) => f.predicted_usage > baselineThreshold
              );

              const prophetProbability = Math.round(
                (outbreakMonths.length / prophetForecast.forecast_data.length) * 100
              );

              console.log(`📊 ${categoryData.category_id}: ${outbreakMonths.length}/${prophetForecast.forecast_data.length} outbreak months = ${prophetProbability}%`);

              const riskLevel = OutbreakDetectionEngine.determineRiskLevel(prophetProbability);

              // Enhanced recommendations with Prophet insights
              const baseRecommendations = OutbreakDetectionEngine.generateRecommendations(
                categoryData.category_id,
                riskLevel,
                categoryData.units_affected
              );

              // Add Prophet-specific recommendations
              const prophetRecommendations = [
                ...baseRecommendations,
                `Prophet AI detected ${prophetAnalysis.overall_trend || "stable"} trend`,
                `Forecast confidence: ${prophetForecast.forecast_data[0]?.prophet_confidence || 80}%`,
                `Peak predicted usage: ${maxPredicted}`,
              ];

              // ✅ FIX: Create properly typed ProphetForecastData
              const prophetForecastData: ProphetForecastData = {
                forecast_months: prophetForecast.forecast_data.map((item): ProphetMonthlyForecast => ({
                  month: item.month,
                  predicted_usage: item.predicted_usage,
                  lower_bound: item.lower_bound || item.predicted_usage * 0.8, // ✅ FIX: Provide default
                  upper_bound: item.upper_bound || item.predicted_usage * 1.2, // ✅ FIX: Provide default
                  trend_component: item.trend || 0,
                  seasonal_component: item.seasonal_component || 0,
                  prophet_confidence: item.prophet_confidence || 80,
                  outbreak_probability: (item.predicted_usage / baselineThreshold) * 100,
                  risk_level: OutbreakDetectionEngine.determineRiskLevel(
                    (item.predicted_usage / baselineThreshold) * 100
                  ),
                })),
                // ✅ FIX: Provide all required seasonal_components fields
                seasonal_components: {
                  yearly_strength: prophetForecast.seasonal_components?.yearly_strength || 
                                  prophetForecast.seasonal_components?.seasonal_strength || 0, // ✅ FIX: Provide required field
                  trend_strength: prophetForecast.seasonal_components?.trend_strength || 
                                 prophetForecast.trend_info?.trend_strength || 0, // ✅ FIX: Provide required field
                  overall_trend: prophetForecast.seasonal_components?.overall_trend || 
                                prophetForecast.trend_info?.overall_trend || 'stable', // ✅ FIX: Provide required field
                },
                confidence_intervals: {
                  method: 'prophet',
                  interval_width: 0.8,
                },
                model_performance: {
                  mae: 50, // Default MAE
                  mape: 10, // Default MAPE
                  training_periods: categoryData.monthly_data.length,
                },
              };

              // Create forecast periods
              const forecastPeriods: ("3_MONTHS" | "6_MONTHS" | "12_MONTHS")[] = [
                "3_MONTHS",
                "6_MONTHS", 
                "12_MONTHS"
              ];

              for (const period of forecastPeriods) {
                // ✅ FIX: Safely handle early_warning data
                const earlyWarningData = prophetForecast.early_warning ? {
                  overall_alert_level: prophetForecast.early_warning.overall_alert_level,
                  warning_messages: prophetForecast.early_warning.warning_messages || [],
                  urgent_actions: prophetForecast.early_warning.urgent_actions || [],
                  velocity_analysis: {
                    velocity_per_week: prophetForecast.early_warning.velocity_analysis?.velocity_per_week || 0,
                    velocity_trend: prophetForecast.early_warning.velocity_analysis?.velocity_trend || 'stable',
                    alert_level: prophetForecast.early_warning.velocity_analysis?.alert_level || 'LOW'
                  },
                  doubling_analysis: {
                    doubling_time_days: prophetForecast.early_warning.doubling_analysis?.doubling_time_days || null,
                    epidemic_phase: prophetForecast.early_warning.doubling_analysis?.epidemic_phase || 'stable',
                    doubling_confidence: prophetForecast.early_warning.doubling_analysis?.doubling_confidence || 0,
                    alert_level: prophetForecast.early_warning.doubling_analysis?.alert_level || 'LOW'
                  },
                  epidemic_curve: {
                    curve_shape: prophetForecast.early_warning.epidemic_curve?.curve_shape || 'stable',
                    peak_prediction: prophetForecast.early_warning.epidemic_curve?.peak_prediction || null,
                    intervention_window: prophetForecast.early_warning.epidemic_curve?.intervention_window || null,
                    time_to_critical_months: prophetForecast.early_warning.epidemic_curve?.time_to_critical_months || null,
                    alert_level: prophetForecast.early_warning.epidemic_curve?.alert_level || 'LOW'
                  },
                  confidence_summary: {
                    velocity_confidence: prophetForecast.early_warning.confidence_summary?.velocity_confidence || 0,
                    doubling_confidence: prophetForecast.early_warning.confidence_summary?.doubling_confidence || 0,
                    curve_confidence: prophetForecast.early_warning.confidence_summary?.curve_confidence || 'low'
                  }
                } : undefined;

                forecasts.push({
                  category_id: categoryData.category_id,
                  category_name: categoryData.category_name,
                  priority: categoryData.priority,
                  forecast_period: period,
                  outbreak_probability: Math.max(0, Math.round(prophetProbability)),
                  risk_level: riskLevel,
                  confidence_score: prophetForecast.forecast_data[0]?.prophet_confidence || 80,
                  baseline_usage: Math.round(historicalBaseline),
                  predicted_usage: Math.round(maxPredicted),
                  variance_percentage: Math.round(((maxPredicted - historicalBaseline) / historicalBaseline) * 100),
                  affected_units: unitIds,
                  geographic_spread_risk: OutbreakDetectionEngine.assessGeographicSpread(unitIds),
                  alert_triggers: [
                    `Prophet AI detected ${prophetProbability}% outbreak probability`,
                    `Trend: ${prophetAnalysis.overall_trend || 'stable'}`,
                    `Peak usage: ${maxPredicted}`,
                  ],
                  recommendations: prophetRecommendations,
                  forecast_date: new Date().toISOString(),
                  prophet_forecast: prophetForecastData,
                  outbreak_threshold: baselineThreshold,
                  early_warning: earlyWarningData,
                });
              }
            } else {
              // Fall back to threshold model for this category
              console.warn(`⚠️ Prophet failed for ${categoryData.category_id}, using threshold fallback`);
              
              // Add threshold model forecast for this category
              const thresholdForecast = generateThresholdForecast(categoryData, unitIds);
              forecasts.push(...thresholdForecast);
            }
          }

          // Return Prophet results if successful
          if (forecasts.length > 0) {
            console.log(`🎯 Prophet processing complete: ${forecasts.length} forecasts generated`);
            return { success: true, data: sortForecasts(forecasts) };
          }
        } else {
          throw new Error(prophetResult.error || "Prophet batch forecast failed");
        }
      } catch (prophetError) {
        console.error("❌ Prophet integration failed:", prophetError);
        console.log("🔄 Falling back to threshold model");
        parameters.use_prophet = false;
      }
    }

    // ✅ Threshold Model Processing (fallback or when Prophet is disabled)
    if (!parameters.use_prophet) {
      console.log("⚡ Using Threshold Model");

      for (const categoryData of usageResult.data) {
        const thresholdForecast = generateThresholdForecast(categoryData, unitIds);
        forecasts.push(...thresholdForecast);
      }
    }

    return { success: true, data: sortForecasts(forecasts) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ✅ FIX: Helper function to generate threshold-based forecasts with proper typing
function generateThresholdForecast(
  categoryData: CategoryUsageData, // ✅ FIX: Use proper type instead of any
  unitIds: number[]
): OutbreakForecast[] {
  const category = DISEASE_CATEGORIES[categoryData.category_id];
  if (!category) return [];

  const forecasts: OutbreakForecast[] = [];

  // Calculate current trend and baseline
  // Calculate current trend and baseline
  const recentUsage = categoryData.monthly_data
    .slice(-3)
    .reduce((sum: number, m: { month: string; usage: number }) => sum + m.usage, 0) / 3; // ✅ FIX: Use proper type instead of any
  const historicalAverage = categoryData.avg_monthly_usage;
  const variance = (recentUsage - historicalAverage) / historicalAverage;

  // Calculate outbreak probability
  const outbreakProbability = OutbreakDetectionEngine.calculateOutbreakProbability(
    recentUsage,
    historicalAverage,
    categoryData.category_id
  );

  // Determine risk level
  const riskLevel = OutbreakDetectionEngine.determineRiskLevel(outbreakProbability);

  // Generate recommendations
  const recommendations = OutbreakDetectionEngine.generateRecommendations(
    categoryData.category_id,
    riskLevel,
    categoryData.units_affected
  );

  // Generate alert triggers
  const alertTriggers = OutbreakDetectionEngine.generateAlertTriggers(
    outbreakProbability,
    variance,
    categoryData.trend
  );

  // Assess geographic spread
  const geographicSpread = OutbreakDetectionEngine.assessGeographicSpread(unitIds);

  // Create forecast for different time horizons
  const forecastPeriods: ("3_MONTHS" | "6_MONTHS" | "12_MONTHS")[] = [
    "3_MONTHS",
    "6_MONTHS",
    "12_MONTHS",
  ];

  for (const period of forecastPeriods) {
    const monthsAhead = period === "3_MONTHS" ? 3 : period === "6_MONTHS" ? 6 : 12;

    // Adjust probability based on time horizon
    const timeAdjustedProbability = outbreakProbability * (1 - (monthsAhead - 3) * 0.1);
    const adjustedRiskLevel = OutbreakDetectionEngine.determineRiskLevel(timeAdjustedProbability);

    forecasts.push({
      category_id: categoryData.category_id,
      category_name: categoryData.category_name,
      priority: categoryData.priority,
      forecast_period: period,
      outbreak_probability: Math.max(0, Math.round(timeAdjustedProbability)),
      risk_level: adjustedRiskLevel,
      confidence_score: Math.max(50, 100 - monthsAhead * 5),
      baseline_usage: Math.round(historicalAverage),
      predicted_usage: Math.round(recentUsage),
      variance_percentage: Math.round(variance * 100),
      affected_units: unitIds,
      geographic_spread_risk: geographicSpread,
      alert_triggers: alertTriggers,
      recommendations: recommendations,
      forecast_date: new Date().toISOString(),
    });
  }

  return forecasts;
}

// ✅ ADD: Helper function to sort forecasts
function sortForecasts(forecasts: OutbreakForecast[]): OutbreakForecast[] {
  return forecasts.sort((a, b) => {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return riskOrder[a.risk_level] - riskOrder[b.risk_level];
  });
}

export async function generateOutbreakAlerts(
  unitIds: number[],
  alertThreshold: number = 50
): Promise<{
  success: boolean;
  data?: OutbreakAlert[];
  error?: string;
}> {
  try {
    const forecastResult = await generateOutbreakForecasts(unitIds);

    if (!forecastResult.success || !forecastResult.data) {
      return { success: false, error: forecastResult.error };
    }

    const alerts: OutbreakAlert[] = [];

    // Generate alerts for high-risk forecasts
    for (const forecast of forecastResult.data) {
      if (
        forecast.outbreak_probability >= alertThreshold &&
        forecast.forecast_period === "3_MONTHS"
      ) {
        let alertLevel: "WARNING" | "OUTBREAK" | "CRITICAL";
        if (forecast.risk_level === "CRITICAL") alertLevel = "CRITICAL";
        else if (forecast.risk_level === "HIGH") alertLevel = "OUTBREAK";
        else alertLevel = "WARNING";

        // Get unit details
        const affectedUnits = forecast.affected_units.map((unitId) => ({
          unit_id: unitId,
          unit_name: `Unit ${unitId}`,
          usage_increase: forecast.variance_percentage,
          risk_contribution: forecast.outbreak_probability / forecast.affected_units.length,
        }));

        alerts.push({
          id: `alert-${forecast.category_id}-${Date.now()}`,
          category_id: forecast.category_id,
          category_name: forecast.category_name,
          alert_level: alertLevel,
          detected_at: new Date().toISOString(),
          affected_units: affectedUnits,
          description: `${forecast.category_name} outbreak risk detected with ${forecast.outbreak_probability}% probability`,
          immediate_actions: forecast.recommendations.slice(0, 3),
          monitoring_recommendations: forecast.recommendations.slice(3),
          detection_method: forecast.prophet_forecast ? "prophet" : "threshold",
          statistical_significance: forecast.confidence_score,
          seasonal_context: "Not available with threshold method",
          trend_context: forecast.variance_percentage > 0 ? "Increasing trend detected" : "Stable trend",
          confidence_level: forecast.confidence_score,
        });
      }
    }

    return { success: true, data: alerts };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
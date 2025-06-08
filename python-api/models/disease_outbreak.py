import pandas as pd
import numpy as np
from prophet import Prophet
from typing import Dict, List, Any
import warnings
import logging
from datetime import datetime, timedelta
from scipy import stats  # ✅ ADD: For statistical tests
from scipy.stats import chi2_contingency, normaltest, ttest_1samp  # ✅ ADD: Statistical tests

warnings.filterwarnings('ignore')
logger = logging.getLogger(__name__)

class DiseaseOutbreakModel:
    """
    Disease outbreak forecasting model using Prophet directly
    Specialized for epidemiological outbreak detection and prediction
    """
    
    def __init__(self):
        self.outbreak_models = {}
        self.model = None
        self.last_trained_category = None
        
        # ✅ ADD: Category-specific minimum usage floors
        self.CATEGORY_FLOORS = {
            'RESPIRATORY': 0.15,        # 15% - Always some respiratory issues (asthma, COPD)
            'EMERGENCY_ZOONOTIC': 0.05, # 5% - Rare but must maintain emergency readiness
            'VACCINE_PREVENTABLE': 0.20, # 20% - Routine immunizations continue
            'CHILDHOOD_IMMUNIZATION': 0.25 # 25% - Continuous government programs
        }
    
    # ✅ ADD: Apply realistic floor function
    def apply_realistic_floor(self, predicted_usage: float, category_id: str, historical_average: float) -> float:
        """Apply category-specific minimum usage floors to prevent unrealistic zero predictions"""
        
        floor_rate = self.CATEGORY_FLOORS.get(category_id, 0.10)  # Default 10%
        minimum_usage = historical_average * floor_rate
        
        # Apply floor
        floored_usage = max(predicted_usage, minimum_usage)
        
        if floored_usage != predicted_usage:
            logger.info(f"🔧 Applied floor to {category_id}: {predicted_usage:.1f} → {floored_usage:.1f} (floor: {minimum_usage:.1f})")
        
        return floored_usage
    
    def calculate_dynamic_threshold(self, category_id: str, historical_data: pd.DataFrame) -> float:
        """Calculate disease-specific outbreak threshold using medical standards"""
        
        # Calculate baseline statistics
        mean_usage = historical_data['y'].mean()
        std_usage = historical_data['y'].std()
        
        # Disease-specific threshold configurations based on epidemiological evidence
        DISEASE_THRESHOLDS = {
            'EMERGENCY_ZOONOTIC': {
                'base_multiplier': 1.2,  # Very sensitive - even small increases matter
                'method': 'percentile_95'  # Use 95th percentile of historical data
            },
            'RESPIRATORY': {
                'base_multiplier': 1.5,  # Seasonal variation expected
                'method': 'seasonal_adjusted'  # Account for seasonal patterns
            },
            'VACCINE_PREVENTABLE': {
                'base_multiplier': 1.8,  # Allow for vaccination campaign variations
                'method': 'control_limits'  # Use statistical process control
            },
            'CHILDHOOD_IMMUNIZATION': {
                'base_multiplier': 1.4,  # Routine but important to detect early
                'method': 'control_limits'  # Statistical process control
            }
        }
        
        # Get configuration for this disease category
        config = DISEASE_THRESHOLDS.get(category_id, {
            'base_multiplier': 1.5, 
            'method': 'simple'
        })
        
        logger.info(f"🎯 Calculating dynamic threshold for {category_id} using {config['method']} method")
        
        # Calculate threshold based on method
        if config['method'] == 'percentile_95':
            # Use 95th percentile - good for emergency diseases
            threshold = np.percentile(historical_data['y'], 95)
            logger.info(f"📊 95th percentile threshold: {threshold:.1f}")
            
        elif config['method'] == 'seasonal_adjusted':
            # Adjust for seasonal patterns
            if len(historical_data) >= 12:
                # Group by month and get average for each month
                historical_data['month'] = historical_data['ds'].dt.month
                month_averages = historical_data.groupby('month')['y'].mean()
                current_month = historical_data['ds'].iloc[-1].month
                seasonal_baseline = month_averages.get(current_month, mean_usage)
                threshold = seasonal_baseline * config['base_multiplier']
                logger.info(f"📈 Seasonal adjusted threshold: {threshold:.1f} (month {current_month})")
            else:
                # Fallback to simple multiplier if not enough seasonal data
                threshold = mean_usage * config['base_multiplier']
                logger.info(f"📊 Simple multiplier threshold: {threshold:.1f} (insufficient seasonal data)")
                
        elif config['method'] == 'control_limits':
            # Statistical process control - 2 sigma limits
            threshold = mean_usage + (2 * std_usage)
            logger.info(f"📊 Control limits threshold: {threshold:.1f} (mean + 2σ)")
            
        else:
            # Simple multiplier method (fallback)
            threshold = mean_usage * config['base_multiplier']
            logger.info(f"📊 Simple threshold: {threshold:.1f}")
        
        # Enhanced threshold safety checks
        min_threshold = mean_usage * 1.1  # Minimum 10% increase
        max_threshold = mean_usage * 3.0  # Maximum 300% increase (safety cap)

        # Apply safety bounds
        if threshold < min_threshold:
            logger.warning(f"⚠️ Calculated threshold too low for {category_id}: {threshold:.1f} -> {min_threshold:.1f}")
            final_threshold = min_threshold
        elif threshold > max_threshold:
            logger.warning(f"⚠️ Calculated threshold too high for {category_id}: {threshold:.1f} -> {max_threshold:.1f}")
            final_threshold = max_threshold
        else:
            final_threshold = threshold

        # Additional validation for seasonal adjusted method
        if config['method'] == 'seasonal_adjusted' and final_threshold < mean_usage * 1.2:
            logger.warning(f"⚠️ Seasonal threshold seems too low for {category_id}, increasing to 1.2x average")
            final_threshold = mean_usage * 1.2

        logger.info(f"✅ Final dynamic threshold for {category_id}: {final_threshold:.1f} (method: {config['method']})")
        logger.info(f"   📊 Threshold ratio: {final_threshold/mean_usage:.2f}x average usage")

        return final_threshold
    
    def calculate_outbreak_velocity(self, historical_data: pd.DataFrame, category_id: str) -> Dict[str, Any]:
        """Calculate outbreak velocity and acceleration metrics"""
        
        logger.info(f"🔍 Calculating outbreak velocity for {category_id}")
        
        if len(historical_data) < 4:
            return {
                "velocity_per_week": 0,
                "acceleration": 0,
                "velocity_trend": "insufficient_data",
                "alert_level": "LOW"
            }
        
        # Get recent 4 weeks (or months) of data
        recent_data = historical_data.tail(4).copy()
        recent_data = recent_data.sort_values('ds')
        
        # Calculate week-over-week growth rates
        growth_rates = []
        for i in range(1, len(recent_data)):
            current = recent_data.iloc[i]['y']
            previous = recent_data.iloc[i-1]['y']
            
            if previous > 0:
                growth_rate = ((current - previous) / previous) * 100
                growth_rates.append(growth_rate)
        
        if not growth_rates:
            return {
                "velocity_per_week": 0,
                "acceleration": 0,
                "velocity_trend": "stable",
                "alert_level": "LOW"
            }
        
        # Calculate average velocity (percentage increase per week)
        avg_velocity = np.mean(growth_rates)
        
        # Calculate acceleration (change in velocity)
        if len(growth_rates) >= 2:
            recent_velocity = np.mean(growth_rates[-2:])  # Last 2 periods
            earlier_velocity = np.mean(growth_rates[:-2])  # Earlier periods
            acceleration = recent_velocity - earlier_velocity
        else:
            acceleration = 0
        
        # Determine velocity trend
        if avg_velocity > 25:  # More than 25% increase per week
            velocity_trend = "exponential"
            alert_level = "CRITICAL"
        elif avg_velocity > 15:  # 15-25% increase per week  
            velocity_trend = "accelerating"
            alert_level = "HIGH"
        elif avg_velocity > 5:   # 5-15% increase per week
            velocity_trend = "increasing" 
            alert_level = "MEDIUM"
        elif avg_velocity > -5:  # Stable (-5% to +5%)
            velocity_trend = "stable"
            alert_level = "LOW"
        else:                    # Decreasing
            velocity_trend = "decreasing"
            alert_level = "LOW"
        
        logger.info(f"📈 Velocity analysis: {avg_velocity:.1f}% per week, trend: {velocity_trend}")
        
        return {
            "velocity_per_week": round(avg_velocity, 2),
            "acceleration": round(acceleration, 2),
            "velocity_trend": velocity_trend,
            "alert_level": alert_level,
            "growth_rates": growth_rates,
            "sample_size": len(growth_rates)
        }

    def calculate_doubling_time(self, historical_data: pd.DataFrame, category_id: str) -> Dict[str, Any]:
        """Calculate how fast usage is doubling (epidemic doubling time)"""
        
        logger.info(f"⏱️ Calculating doubling time for {category_id}")
        
        if len(historical_data) < 3:
            return {
                "doubling_time_days": None,
                "doubling_confidence": 0,
                "epidemic_phase": "insufficient_data",
                "alert_level": "LOW"
            }
        
        # Get recent data points for exponential growth calculation
        recent_data = historical_data.tail(6).copy()  # Last 6 periods
        recent_data = recent_data.sort_values('ds')
        
        # Calculate if we're in exponential growth phase
        if len(recent_data) < 3:
            return {
                "doubling_time_days": None,
                "doubling_confidence": 0,
                "epidemic_phase": "insufficient_data", 
                "alert_level": "LOW"
            }
        
        # Fit exponential growth model: y = a * e^(b*t)
        # Using linear regression on log-transformed data: ln(y) = ln(a) + b*t
        
        try:
            # Prepare data (avoid log of zero/negative values)
            y_values = recent_data['y'].values
            y_values = np.maximum(y_values, 0.1)  # Minimum value to avoid log(0)
            
            # Time points (days between measurements, assuming monthly data)
            time_points = np.arange(len(y_values)) * 30  # Assume 30 days between measurements
            
            # Log-linear regression
            log_y = np.log(y_values)
            
            # Calculate growth rate (b coefficient)
            if len(time_points) > 1:
                # Simple linear regression: slope = Σ(xy) - n*mean(x)*mean(y) / Σ(x²) - n*mean(x)²
                x_mean = np.mean(time_points)
                y_mean = np.mean(log_y)
                
                numerator = np.sum(time_points * log_y) - len(time_points) * x_mean * y_mean
                denominator = np.sum(time_points ** 2) - len(time_points) * (x_mean ** 2)
                
                if denominator != 0:
                    growth_rate = numerator / denominator  # Growth rate per day
                else:
                    growth_rate = 0
            else:
                growth_rate = 0
            
            # Calculate doubling time: t_double = ln(2) / growth_rate
            if growth_rate > 0:
                doubling_time_days = np.log(2) / growth_rate
                
                # Calculate confidence based on R-squared
                if len(y_values) >= 3:
                    # Calculate R-squared for confidence measure
                    y_pred = np.exp(np.log(y_values[0]) + growth_rate * time_points)
                    ss_res = np.sum((y_values - y_pred) ** 2)
                    ss_tot = np.sum((y_values - np.mean(y_values)) ** 2)
                    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
                    confidence = max(0, min(100, r_squared * 100))
                else:
                    confidence = 50
            else:
                doubling_time_days = None
                confidence = 0
            
            # Determine epidemic phase and alert level
            if doubling_time_days is not None:
                if doubling_time_days <= 7:      # Doubling every week or faster
                    epidemic_phase = "exponential"
                    alert_level = "CRITICAL"
                elif doubling_time_days <= 14:   # Doubling every 2 weeks
                    epidemic_phase = "rapid_growth"
                    alert_level = "HIGH"
                elif doubling_time_days <= 30:   # Doubling every month
                    epidemic_phase = "moderate_growth"
                    alert_level = "MEDIUM"
                elif doubling_time_days <= 60:   # Doubling every 2 months
                    epidemic_phase = "slow_growth"
                    alert_level = "LOW"
                else:                           # Very slow doubling
                    epidemic_phase = "linear_growth"
                    alert_level = "LOW"
            else:
                epidemic_phase = "no_growth"
                alert_level = "LOW"
            
            # Fixed: Proper f-string formatting
            doubling_display = f"{doubling_time_days:.1f}" if doubling_time_days is not None else "N/A"
            logger.info(f"⏰ Doubling time: {doubling_display} days, phase: {epidemic_phase}")
            
            return {
                "doubling_time_days": round(doubling_time_days, 1) if doubling_time_days else None,
                "doubling_confidence": round(confidence, 1),
                "epidemic_phase": epidemic_phase,
                "alert_level": alert_level,
                "growth_rate_per_day": round(growth_rate * 100, 3) if growth_rate else 0,  # Percentage per day
                "data_points_used": len(y_values)
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Doubling time calculation failed for {category_id}: {str(e)}")
            return {
                "doubling_time_days": None,
                "doubling_confidence": 0,
                "epidemic_phase": "calculation_error",
                "alert_level": "LOW"
            }

    def analyze_epidemic_curve(self, historical_data: pd.DataFrame, forecast_data: List[Dict], category_id: str) -> Dict[str, Any]:
        """Analyze epidemic curve shape and predict critical intervention points"""
        
        logger.info(f"📊 Analyzing epidemic curve for {category_id}")
        
        # Combine historical and forecast data for full curve analysis
        full_timeline = []
        
        # Add historical data
        for _, row in historical_data.iterrows():
            full_timeline.append({
                "date": row['ds'].strftime('%Y-%m-%d'),
                "usage": row['y'],
                "type": "historical"
            })
        
        # Add forecast data
        for forecast_point in forecast_data:
            full_timeline.append({
                "date": f"{forecast_point['month']}-01",
                "usage": forecast_point['predicted_usage'],
                "type": "forecast"
            })
        
        if len(full_timeline) < 4:
            return {
                "curve_shape": "insufficient_data",
                "peak_prediction": None,
                "intervention_window": None,
                "alert_level": "LOW"
            }
        
        # Analyze curve shape
        usage_values = [point['usage'] for point in full_timeline]
        historical_count = len(historical_data)
        
        # Detect curve patterns
        if historical_count >= 3:
            recent_historical = usage_values[:historical_count]
            
            # Check for exponential growth pattern
            if len(recent_historical) >= 3:
                early_avg = np.mean(recent_historical[:len(recent_historical)//2])
                recent_avg = np.mean(recent_historical[len(recent_historical)//2:])
                
                if recent_avg > early_avg * 2:  # More than doubled
                    curve_shape = "exponential"
                    alert_level = "CRITICAL"
                elif recent_avg > early_avg * 1.5:  # 50% increase
                    curve_shape = "accelerating"
                    alert_level = "HIGH"
                elif recent_avg > early_avg * 1.1:  # 10% increase
                    curve_shape = "linear"
                    alert_level = "MEDIUM"
                else:
                    curve_shape = "stable"
                    alert_level = "LOW"
            else:
                curve_shape = "linear"
                alert_level = "MEDIUM"
        else:
            curve_shape = "unknown"
            alert_level = "LOW"
        
        # Predict peak if in exponential/accelerating phase
        peak_prediction = None
        intervention_window = None
        
        if curve_shape in ["exponential", "accelerating"] and len(forecast_data) > 0:
            # Find peak in forecast data
            forecast_usage = [f['predicted_usage'] for f in forecast_data]
            max_index = np.argmax(forecast_usage)
            peak_month = forecast_data[max_index]['month']
            
            peak_prediction = {
                "predicted_month": peak_month,
                "predicted_usage": forecast_usage[max_index],
                "confidence": "medium" if curve_shape == "exponential" else "low"
            }
            
            # Calculate intervention window (before peak)
            if max_index > 0:
                intervention_months = max_index
                intervention_window = {
                    "months_until_peak": intervention_months,
                    "intervention_deadline": forecast_data[min(2, max_index)]['month'],  # 2 months before peak or earlier
                    "urgency": "immediate" if intervention_months <= 2 else "high" if intervention_months <= 4 else "moderate"
                }
        
        # Time to critical level calculation
        current_usage = usage_values[-historical_count] if historical_count > 0 else 0
        critical_threshold = current_usage * 3  # 3x current usage = critical
        
        time_to_critical = None
        for i, forecast_point in enumerate(forecast_data):
            if forecast_point['predicted_usage'] >= critical_threshold:
                time_to_critical = i + 1  # Months to critical
                break
        
        logger.info(f"📈 Curve analysis: {curve_shape} shape, alert level: {alert_level}")
        
        return {
            "curve_shape": curve_shape,
            "alert_level": alert_level,
            "peak_prediction": peak_prediction,
            "intervention_window": intervention_window,
            "time_to_critical_months": time_to_critical,
            "current_usage": round(current_usage, 1),
            "critical_threshold": round(critical_threshold, 1),
            "total_data_points": len(full_timeline),
            "analysis_confidence": "high" if len(full_timeline) >= 8 else "medium" if len(full_timeline) >= 5 else "low"
        }

    def generate_early_warning_alerts(self, velocity_data: Dict, doubling_data: Dict, curve_data: Dict, category_id: str) -> Dict[str, Any]:
        """Generate comprehensive early warning alerts based on all metrics"""
        
        logger.info(f"🚨 Generating early warning alerts for {category_id}")
        
        # Determine overall alert level (highest from all metrics)
        alert_levels = [
            velocity_data.get('alert_level', 'LOW'),
            doubling_data.get('alert_level', 'LOW'),
            curve_data.get('alert_level', 'LOW')
        ]
        
        level_priority = {'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3}
        max_priority = max(level_priority[level] for level in alert_levels)
        overall_alert_level = [k for k, v in level_priority.items() if v == max_priority][0]
        
        # Generate specific warning messages
        warnings = []
        urgent_actions = []
        
        # Velocity warnings
        velocity = velocity_data.get('velocity_per_week', 0)
        if velocity > 25:
            warnings.append(f"🔥 CRITICAL: Usage increasing by {velocity:.1f}% per week (exponential growth)")
            urgent_actions.append("Activate emergency response protocols immediately")
        elif velocity > 15:
            warnings.append(f"⚠️ HIGH: Rapid usage increase ({velocity:.1f}% per week)")
            urgent_actions.append("Prepare emergency response teams")
        elif velocity > 5:
            warnings.append(f"📈 MEDIUM: Usage trending upward ({velocity:.1f}% per week)")
            urgent_actions.append("Increase monitoring frequency")
        
        # Doubling time warnings
        doubling_days = doubling_data.get('doubling_time_days')
        if doubling_days and doubling_days <= 7:
            warnings.append(f"⚡ CRITICAL: Usage doubling every {doubling_days:.1f} days")
            urgent_actions.append("Deploy intervention teams within 48 hours")
        elif doubling_days and doubling_days <= 14:
            warnings.append(f"🕐 HIGH: Usage doubling every {doubling_days:.1f} days")
            urgent_actions.append("Prepare intervention strategy within 1 week")
        elif doubling_days and doubling_days <= 30:
            warnings.append(f"📅 MEDIUM: Usage doubling every {doubling_days:.1f} days")
            urgent_actions.append("Monitor closely and prepare response plan")
        
        # Epidemic curve warnings
        curve_shape = curve_data.get('curve_shape', 'unknown')
        if curve_shape == "exponential":
            warnings.append("📊 CRITICAL: Exponential epidemic curve detected")
            urgent_actions.append("Implement containment measures immediately")
        elif curve_shape == "accelerating":
            warnings.append("📈 HIGH: Accelerating outbreak pattern detected")
            urgent_actions.append("Prepare for rapid escalation")
        
        # Intervention timing
        intervention_window = curve_data.get('intervention_window')
        if intervention_window:
            months_to_peak = intervention_window.get('months_until_peak', 0)
            if months_to_peak <= 2:
                warnings.append(f"⏰ URGENT: Peak predicted in {months_to_peak} months - intervention window closing")
                urgent_actions.append("Implement all available interventions NOW")
            elif months_to_peak <= 4:
                warnings.append(f"📅 Important: Peak predicted in {months_to_peak} months")
                urgent_actions.append("Finalize and deploy intervention plan")
        
        # Time to critical
        time_to_critical = curve_data.get('time_to_critical_months')
        if time_to_critical and time_to_critical <= 3:
            warnings.append(f"🚨 CRITICAL: Usage may reach critical levels in {time_to_critical} months")
            urgent_actions.append("Secure additional resources immediately")
        
        # Remove duplicates and ensure we have at least some content
        warnings = list(dict.fromkeys(warnings))  # Remove duplicates while preserving order
        urgent_actions = list(dict.fromkeys(urgent_actions))
        
        if not warnings:
            warnings.append("📊 Current usage patterns within normal parameters")
        
        if not urgent_actions:
            urgent_actions.append("Continue routine monitoring")
        
        logger.info(f"🎯 Early warning summary: {overall_alert_level} alert with {len(warnings)} warnings")
        
        return {
            "overall_alert_level": overall_alert_level,
            "warning_messages": warnings,
            "urgent_actions": urgent_actions,
            "metrics_summary": {
                "velocity_per_week": velocity,
                "doubling_time_days": doubling_days,
                "epidemic_phase": doubling_data.get('epidemic_phase', 'unknown'),
                "curve_shape": curve_shape,
                "intervention_urgency": intervention_window.get('urgency', 'low') if intervention_window else 'low'
            },
            "confidence_indicators": {
                "velocity_confidence": velocity_data.get('sample_size', 0),
                "doubling_confidence": doubling_data.get('doubling_confidence', 0),
                "curve_confidence": curve_data.get('analysis_confidence', 'low')
            }
        }

    def calculate_statistical_significance(self, historical_data: pd.DataFrame, forecast_data: List[Dict], 
                                         outbreak_threshold: float, category_id: str) -> Dict[str, Any]:
        """Calculate statistical significance of outbreak predictions"""
        
        logger.info(f"📊 Calculating statistical significance for {category_id}")
        
        if len(historical_data) < 6:
            return {
                "p_value": None,
                "significance_level": "insufficient_data",
                "statistical_power": 0,
                "effect_size": 0,
                "confidence_level": "LOW"
            }
        
        try:
            # 1. Chi-square test for outbreak frequency significance
            historical_usage = historical_data['y'].values
            predicted_usage = [f['predicted_usage'] for f in forecast_data]
            
            # Categorize into outbreak vs normal periods
            historical_outbreaks = np.sum(historical_usage > outbreak_threshold)
            historical_normal = len(historical_usage) - historical_outbreaks
            
            predicted_outbreaks = np.sum(np.array(predicted_usage) > outbreak_threshold)
            predicted_normal = len(predicted_usage) - predicted_outbreaks
            
            # Create contingency table
            if historical_outbreaks > 0 and predicted_outbreaks > 0:
                contingency_table = np.array([
                    [historical_outbreaks, historical_normal],
                    [predicted_outbreaks, predicted_normal]
                ])
                
                chi2_stat, p_value, dof, expected = chi2_contingency(contingency_table)
                
                # Calculate effect size (Cramér's V)
                n = np.sum(contingency_table)
                effect_size = np.sqrt(chi2_stat / (n * (min(contingency_table.shape) - 1)))
            else:
                p_value = 1.0  # No significance if no outbreaks detected
                effect_size = 0
            
            # 2. One-sample t-test comparing predicted vs historical mean
            historical_mean = np.mean(historical_usage)
            predicted_mean = np.mean(predicted_usage)
            
            if len(predicted_usage) > 1:
                # Test if predicted values are significantly different from historical mean
                t_stat, t_p_value = ttest_1samp(predicted_usage, historical_mean)
                
                # Use the more conservative p-value
                final_p_value = max(p_value, t_p_value) if p_value is not None else t_p_value
            else:
                final_p_value = p_value if p_value is not None else 1.0
            
            # 3. Determine significance level
            if final_p_value < 0.01:
                significance_level = "highly_significant"
                confidence_level = "VERY_HIGH"
            elif final_p_value < 0.05:
                significance_level = "significant"
                confidence_level = "HIGH"
            elif final_p_value < 0.1:
                significance_level = "marginally_significant"
                confidence_level = "MEDIUM"
            else:
                significance_level = "not_significant"
                confidence_level = "LOW"
            
            # 4. Calculate statistical power (simplified)
            sample_size = len(historical_data)
            if sample_size >= 12:
                statistical_power = min(0.9, 0.5 + (sample_size - 6) * 0.05)
            else:
                statistical_power = max(0.3, sample_size * 0.05)
            
            logger.info(f"📈 Statistical significance: p={final_p_value:.4f}, level={significance_level}")
            
            return {
                "p_value": round(final_p_value, 4),
                "significance_level": significance_level,
                "statistical_power": round(statistical_power, 3),
                "effect_size": round(effect_size, 3),
                "confidence_level": confidence_level,
                "chi2_statistic": chi2_stat if 'chi2_stat' in locals() else None,
                "t_statistic": t_stat if 't_stat' in locals() else None,
                "sample_size": sample_size,
                "outbreak_frequency": {
                    "historical": f"{historical_outbreaks}/{len(historical_usage)}",
                    "predicted": f"{predicted_outbreaks}/{len(predicted_usage)}"
                }
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Statistical significance calculation failed for {category_id}: {str(e)}")
            return {
                "p_value": None,
                "significance_level": "calculation_error",
                "statistical_power": 0,
                "effect_size": 0,
                "confidence_level": "LOW"
            }

    def calculate_enhanced_confidence_intervals(self, historical_data: pd.DataFrame, forecast_data: List[Dict], 
                                              category_id: str) -> Dict[str, Any]:
        """Calculate enhanced confidence intervals using multiple methods"""
        
        logger.info(f"🎯 Calculating enhanced confidence intervals for {category_id}")
        
        if len(historical_data) < 3:
            return {
                "prediction_intervals": [],
                "confidence_intervals": [],
                "bootstrap_intervals": [],
                "interval_method": "insufficient_data",
                "interval_reliability": "LOW"
            }
        
        try:
            historical_usage = historical_data['y'].values
            
            # 1. Calculate prediction intervals (wider - accounts for future uncertainty)
            prediction_intervals = []
            confidence_intervals = []
            bootstrap_intervals = []
            
            for i, forecast_point in enumerate(forecast_data):
                predicted_value = forecast_point['predicted_usage']
                
                # Standard deviation based intervals
                historical_std = np.std(historical_usage)
                historical_mean = np.mean(historical_usage)
                
                # Prediction interval (accounts for model + data uncertainty)
                pred_margin = 1.96 * historical_std * np.sqrt(1 + 1/len(historical_usage))
                prediction_intervals.append({
                    "month": forecast_point['month'],
                    "predicted": predicted_value,
                    "lower_pred": max(0, predicted_value - pred_margin),
                    "upper_pred": predicted_value + pred_margin,
                    "interval_width": 2 * pred_margin
                })
                
                # Confidence interval (model uncertainty only)
                conf_margin = 1.96 * historical_std / np.sqrt(len(historical_usage))
                confidence_intervals.append({
                    "month": forecast_point['month'],
                    "predicted": predicted_value,
                    "lower_conf": max(0, predicted_value - conf_margin),
                    "upper_conf": predicted_value + conf_margin,
                    "interval_width": 2 * conf_margin
                })
                
                # Bootstrap intervals (if enough data)
                if len(historical_usage) >= 6:
                    bootstrap_samples = []
                    n_bootstrap = 1000
                    
                    for _ in range(n_bootstrap):
                        # Resample with replacement
                        bootstrap_sample = np.random.choice(historical_usage, 
                                                          size=len(historical_usage), 
                                                          replace=True)
                        # Simple projection (could be more sophisticated)
                        bootstrap_prediction = np.mean(bootstrap_sample) + (predicted_value - historical_mean)
                        bootstrap_samples.append(bootstrap_prediction)
                    
                    # Calculate percentiles
                    bootstrap_lower = np.percentile(bootstrap_samples, 2.5)
                    bootstrap_upper = np.percentile(bootstrap_samples, 97.5)
                    
                    bootstrap_intervals.append({
                        "month": forecast_point['month'],
                        "predicted": predicted_value,
                        "lower_bootstrap": max(0, bootstrap_lower),
                        "upper_bootstrap": bootstrap_upper,
                        "interval_width": bootstrap_upper - bootstrap_lower
                    })
            
            # Determine best interval method
            if len(historical_usage) >= 12:
                interval_method = "bootstrap_enhanced"
                interval_reliability = "HIGH"
            elif len(historical_usage) >= 6:
                interval_method = "prediction_intervals"
                interval_reliability = "MEDIUM"
            else:
                interval_method = "confidence_basic"
                interval_reliability = "LOW"
            
            # Calculate average interval widths for comparison
            if prediction_intervals:
                avg_prediction_width = np.mean([pi['interval_width'] for pi in prediction_intervals])
                avg_confidence_width = np.mean([ci['interval_width'] for ci in confidence_intervals])
                
                logger.info(f"📏 Average interval widths - Prediction: {avg_prediction_width:.1f}, Confidence: {avg_confidence_width:.1f}")
            
            return {
                "prediction_intervals": prediction_intervals,
                "confidence_intervals": confidence_intervals,
                "bootstrap_intervals": bootstrap_intervals,
                "interval_method": interval_method,
                "interval_reliability": interval_reliability,
                "statistical_summary": {
                    "historical_mean": round(historical_mean, 1),
                    "historical_std": round(historical_std, 1),
                    "coefficient_of_variation": round(historical_std / historical_mean, 3) if historical_mean > 0 else 0,
                    "data_points": len(historical_usage)
                }
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Enhanced confidence interval calculation failed for {category_id}: {str(e)}")
            return {
                "prediction_intervals": [],
                "confidence_intervals": [],
                "bootstrap_intervals": [],
                "interval_method": "calculation_error",
                "interval_reliability": "LOW"
            }

    def perform_integrated_trend_analysis(self, historical_data: pd.DataFrame, forecast_data: List[Dict], 
                                         category_id: str) -> Dict[str, Any]:
        """Perform comprehensive trend analysis using multiple methods"""
        
        logger.info(f"📈 Performing integrated trend analysis for {category_id}")
        
        if len(historical_data) < 4:
            return {
                "trend_methods": [],
                "consensus_trend": "insufficient_data",
                "trend_strength": 0,
                "trend_confidence": 0,
                "seasonality_detected": False
            }
        
        try:
            historical_usage = historical_data['y'].values
            dates = historical_data['ds'].values
            
            trend_methods = []
            
            # 1. Linear Regression Trend
            x = np.arange(len(historical_usage))
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, historical_usage)
            
            if abs(slope) > std_err * 2:  # Significant trend
                linear_trend = "increasing" if slope > 0 else "decreasing"
                linear_strength = abs(r_value)
            else:
                linear_trend = "stable"
                linear_strength = 0
            
            trend_methods.append({
                "method": "linear_regression",
                "trend": linear_trend,
                "strength": round(linear_strength, 3),
                "p_value": round(p_value, 4),
                "slope": round(slope, 3)
            })
            
            # 2. Mann-Kendall Trend Test (non-parametric)
            def mann_kendall_test(data):
                n = len(data)
                s = 0
                
                for i in range(n - 1):
                    for j in range(i + 1, n):
                        if data[j] > data[i]:
                            s += 1
                        elif data[j] < data[i]:
                            s -= 1
                
                # Calculate variance
                var_s = n * (n - 1) * (2 * n + 5) / 18
                
                if s > 0:
                    z = (s - 1) / np.sqrt(var_s)
                    mk_trend = "increasing"
                elif s < 0:
                    z = (s + 1) / np.sqrt(var_s)
                    mk_trend = "decreasing"
                else:
                    z = 0
                    mk_trend = "stable"
                
                mk_p_value = 2 * (1 - stats.norm.cdf(abs(z)))
                
                return mk_trend, abs(z), mk_p_value
            
            mk_trend, mk_z, mk_p = mann_kendall_test(historical_usage)
            mk_strength = min(1.0, mk_z / 3)  # Normalize Z-score
            
            trend_methods.append({
                "method": "mann_kendall",
                "trend": mk_trend,
                "strength": round(mk_strength, 3),
                "p_value": round(mk_p, 4),
                "z_score": round(mk_z, 3)
            })
            
            # 3. Prophet Trend Analysis (using internal trend component)
            if len(historical_usage) >= 6:
                try:
                    # Quick Prophet fit for trend extraction
                    df_prophet = pd.DataFrame({
                        'ds': dates,
                        'y': historical_usage
                    })
                    
                    model = Prophet(yearly_seasonality=False, weekly_seasonality=False, 
                                   daily_seasonality=False, changepoint_prior_scale=0.1)
                    model.fit(df_prophet)
                    
                    # Extract trend component
                    future = model.make_future_dataframe(periods=0)
                    forecast = model.predict(future)
                    trend_values = forecast['trend'].values
                    
                    # Calculate trend slope
                    trend_slope = (trend_values[-1] - trend_values[0]) / len(trend_values)
                    trend_std = np.std(np.diff(trend_values))
                    
                    if abs(trend_slope) > trend_std:
                        prophet_trend = "increasing" if trend_slope > 0 else "decreasing"
                        prophet_strength = min(1.0, abs(trend_slope) / np.mean(historical_usage))
                    else:
                        prophet_trend = "stable"
                        prophet_strength = 0
                    
                    trend_methods.append({
                        "method": "prophet",
                        "trend": prophet_trend,
                        "strength": round(prophet_strength, 3),
                        "slope": round(trend_slope, 3),
                        "changepoints_detected": len(model.changepoints)
                    })
                    
                    # Seasonality detection
                    seasonality_detected = forecast['yearly'].abs().max() > np.std(historical_usage) * 0.1
                    
                except Exception as e:
                    logger.warning(f"Prophet trend analysis failed: {str(e)}")
                    seasonality_detected = False
            else:
                seasonality_detected = False
            
            # 4. Consensus Trend Determination
            trend_votes = [method['trend'] for method in trend_methods]
            trend_strengths = [method['strength'] for method in trend_methods]
            
            # Weight by strength and count votes
            weighted_votes = {}
            for trend, strength in zip(trend_votes, trend_strengths):
                if trend not in weighted_votes:
                    weighted_votes[trend] = 0
                weighted_votes[trend] += strength
            
            consensus_trend = max(weighted_votes, key=weighted_votes.get)
            trend_strength = weighted_votes[consensus_trend] / len(trend_methods)
            
            # Calculate overall confidence
            agreement_ratio = trend_votes.count(consensus_trend) / len(trend_votes)
            avg_strength = np.mean(trend_strengths)
            trend_confidence = (agreement_ratio + avg_strength) / 2
            
            logger.info(f"📊 Trend consensus: {consensus_trend} (strength: {trend_strength:.3f}, confidence: {trend_confidence:.3f})")
            
            return {
                "trend_methods": trend_methods,
                "consensus_trend": consensus_trend,
                "trend_strength": round(trend_strength, 3),
                "trend_confidence": round(trend_confidence, 3),
                "seasonality_detected": seasonality_detected,
                "agreement_ratio": round(agreement_ratio, 3),
                "method_count": len(trend_methods)
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Integrated trend analysis failed for {category_id}: {str(e)}")
            return {
                "trend_methods": [],
                "consensus_trend": "calculation_error",
                "trend_strength": 0,
                "trend_confidence": 0,
                "seasonality_detected": False
            }
    
    def prepare_disease_data(self, category_data: List[Dict]) -> pd.DataFrame:
        """Convert disease category usage data to Prophet format"""
        df_data = []
        
        for record in category_data:
            # Handle different date formats
            if 'month' in record:
                date_str = f"{record['month']}-01"
            elif 'date' in record:
                date_str = record['date']
            else:
                continue
                
            try:
                date_obj = pd.to_datetime(date_str)
                usage = float(record.get('usage', 0))
                
                df_data.append({
                    'ds': date_obj,
                    'y': max(0, usage)  # Ensure non-negative values
                })
            except (ValueError, TypeError) as e:
                logger.warning(f"⚠️ Skipping invalid date/usage: {record} - {e}")
                continue
        
        if not df_data:
            logger.error(f"❌ No valid data points found in category data")
            return pd.DataFrame()
        
        df = pd.DataFrame(df_data)
        df = df.sort_values('ds').reset_index(drop=True)
        
        logger.info(f"📊 Prepared {len(df)} data points for Prophet")
        return df
    
    def perform_early_warning_analysis(self, category_id: str, df: pd.DataFrame, forecast_data: List[Dict], outbreak_threshold: float) -> Dict[str, Any]:
        """Perform early warning system analysis"""
        
        velocity_analysis = self.calculate_outbreak_velocity(df, category_id)
        doubling_analysis = self.calculate_doubling_time(df, category_id)
        curve_analysis = self.analyze_epidemic_curve(df, forecast_data, category_id)
        early_warning = self.generate_early_warning_alerts(velocity_analysis, doubling_analysis, curve_analysis, category_id)
        
        return {
            "overall_alert_level": early_warning["overall_alert_level"],
            "warning_messages": early_warning["warning_messages"],
            "urgent_actions": early_warning["urgent_actions"],
            "velocity_analysis": {
                "velocity_per_week": velocity_analysis["velocity_per_week"],
                "velocity_trend": velocity_analysis["velocity_trend"],
                "alert_level": velocity_analysis["alert_level"]
            },
            "doubling_analysis": {
                "doubling_time_days": doubling_analysis["doubling_time_days"],
                "epidemic_phase": doubling_analysis["epidemic_phase"],
                "doubling_confidence": doubling_analysis["doubling_confidence"],
                "alert_level": doubling_analysis["alert_level"]
            },
            "epidemic_curve": {
                "curve_shape": curve_analysis["curve_shape"],
                "peak_prediction": curve_analysis["peak_prediction"],
                "intervention_window": curve_analysis["intervention_window"],
                "time_to_critical_months": curve_analysis["time_to_critical_months"],
                "alert_level": curve_analysis["alert_level"]
            },
            "confidence_summary": early_warning["confidence_indicators"]
        }
    
    def perform_multi_method_analysis(self, category_id: str, df: pd.DataFrame, forecast_data: List[Dict], 
                                    base_probability: float, outbreak_threshold: float) -> Dict[str, Any]:
        """Perform multi-method probability analysis"""
        
        statistical_significance = self.calculate_statistical_significance(df, forecast_data, outbreak_threshold, category_id)
        enhanced_confidence = self.calculate_enhanced_confidence_intervals(df, forecast_data, category_id)
        integrated_trends = self.perform_integrated_trend_analysis(df, forecast_data, category_id)

        # Adjust probability based on statistical significance
        if statistical_significance["significance_level"] == "highly_significant":
            significance_multiplier = 1.2
        elif statistical_significance["significance_level"] == "significant":
            significance_multiplier = 1.1
        elif statistical_significance["significance_level"] == "marginally_significant":
            significance_multiplier = 1.05
        else:
            significance_multiplier = 0.9

        # Adjust probability based on trend confidence
        trend_multiplier = 1.0
        if integrated_trends["consensus_trend"] == "increasing":
            trend_multiplier = 1.0 + (integrated_trends["trend_confidence"] * 0.3)
        elif integrated_trends["consensus_trend"] == "decreasing":
            trend_multiplier = 1.0 - (integrated_trends["trend_confidence"] * 0.2)

        # Adjust probability based on interval reliability
        if enhanced_confidence["interval_reliability"] == "HIGH":
            confidence_multiplier = 1.1
        elif enhanced_confidence["interval_reliability"] == "MEDIUM":
            confidence_multiplier = 1.0
        else:
            confidence_multiplier = 0.9

        # Calculate multi-method probability
        multi_method_probability = min(100, max(0, 
            base_probability * significance_multiplier * trend_multiplier * confidence_multiplier
        ))

        # Determine final confidence score
        final_confidence = min(100, max(50,
            (statistical_significance.get("statistical_power", 0) * 100 + 
             integrated_trends["trend_confidence"] * 100 + 
             (95 if enhanced_confidence["interval_reliability"] == "HIGH" else 
              80 if enhanced_confidence["interval_reliability"] == "MEDIUM" else 60)) / 3
        ))

        return {
            "base_probability": round(base_probability, 1),
            "enhanced_probability": round(multi_method_probability, 1),
            "statistical_significance": statistical_significance,
            "confidence_analysis": enhanced_confidence,
            "trend_analysis": integrated_trends,
            "probability_adjustments": {
                "significance_factor": round(significance_multiplier, 3),
                "trend_factor": round(trend_multiplier, 3),
                "confidence_factor": round(confidence_multiplier, 3)
            },
            "final_confidence_score": round(final_confidence, 1),
            "analysis_quality": {
                "data_sufficiency": "HIGH" if len(df) >= 12 else "MEDIUM" if len(df) >= 6 else "LOW",
                "statistical_power": statistical_significance.get("statistical_power", 0),
                "trend_confidence": integrated_trends["trend_confidence"],
                "interval_reliability": enhanced_confidence["interval_reliability"]
            }
        }
    
    def extract_trend_info(self, forecast):
        """Extract trend information from Prophet forecast"""
        
        trend_values = forecast['trend'].values
        seasonal_values = forecast.get('yearly', pd.Series([0] * len(forecast))).values
        
        return {
            "overall_trend": "increasing" if trend_values[-1] > trend_values[0] else "stable",
            "trend_strength": (trend_values[-1] - trend_values[0]) / len(trend_values) if len(trend_values) > 0 else 0,
            "seasonal_strength": round(np.std(seasonal_values), 2)
        }
    
    def generate_outbreak_forecast(self, category_id: str, historical_data: List[Dict], periods: int = 12) -> Dict:
        """Generate outbreak forecast using Prophet with enhanced analysis"""
        logger.info(f"🤖 Generating outbreak forecast for category: {category_id}")
        logger.info(f"📊 Historical data points: {len(historical_data)}")
        
        try:
            # Validate input data
            if len(historical_data) < 6:
                return {"error": f"Insufficient data for {category_id}: {len(historical_data)} points (minimum 6 required)"}
            
            # Prepare data for Prophet
            df = self.prepare_disease_data(historical_data)
            
            if df.empty or df['y'].isna().all():
                return {"error": f"No valid usage data for {category_id}"}
            
            logger.info(f"📊 Prepared {len(df)} data points for Prophet")
            logger.info(f"📈 Prophet data prepared: {len(df)} rows, date range: {df['ds'].min()} to {df['ds'].max()}")
            
            # Calculate historical baseline for floor calculations
            historical_baseline = df['y'].mean()
            
            # Train Prophet model
            logger.info(f"🔧 Fitting Prophet model for {category_id}")
            model = Prophet(
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=5.0,  # REDUCED from 10.0
                interval_width=0.8,
                daily_seasonality=False,
                weekly_seasonality=False,
                yearly_seasonality=True
            )
            
            model.fit(df)
            
            # Generate forecast
            logger.info(f"🔮 Making forecast for {periods} periods")
            future = model.make_future_dataframe(periods=periods, freq='M')
            forecast = model.predict(future)
            
            logger.info(f"✅ Forecast generated successfully for {category_id}")
            
            # Extract future predictions (last 'periods' rows)
            future_forecast = forecast.tail(periods)
            
            # ✅ ENHANCED: Apply realistic floors to predictions
            forecast_data = []
            for _, row in future_forecast.iterrows():
                original_usage = max(0, row['yhat'])  # Ensure non-negative
                floored_usage = self.apply_realistic_floor(original_usage, category_id, historical_baseline)
                
                forecast_data.append({
                    'month': row['ds'].strftime('%Y-%m'),
                    'predicted_usage': round(floored_usage),  # ✅ Use floored value
                    'lower_bound': round(max(0, row['yhat_lower'])),
                    'upper_bound': round(max(0, row['yhat_upper'])),
                    'trend': round(row.get('trend', 0)),
                    'seasonal': round(row.get('yearly', 0)),
                    'original_prediction': round(original_usage)  # ✅ Keep original for debugging
                })
            
            # Calculate dynamic threshold
            dynamic_threshold = self.calculate_dynamic_threshold(category_id, df)
            
            # ✅ DEBUG: Show threshold analysis with floored values
            logger.info(f"🔍 DEBUG THRESHOLD ANALYSIS for {category_id}:")
            logger.info(f"   📊 Historical data stats:")
            logger.info(f"      - Count: {len(df)} data points")
            logger.info(f"      - Average usage: {historical_baseline:.1f}")
            logger.info(f"      - Min usage: {df['y'].min():.1f}")
            logger.info(f"      - Max usage: {df['y'].max():.1f}")
            logger.info(f"      - Standard deviation: {df['y'].std():.1f}")
            logger.info(f"   🎯 Outbreak threshold: {dynamic_threshold:.1f}")
            
            # Use floored values for outbreak analysis
            predicted_values = [item['predicted_usage'] for item in forecast_data]
            logger.info(f"   📈 Predicted values (floored): {[int(v) for v in predicted_values]}")
            
            # Calculate outbreak months using floored values
            outbreak_months = []
            for item in forecast_data:
                if item['predicted_usage'] > dynamic_threshold:
                    excess = item['predicted_usage'] - dynamic_threshold
                    percentage_above = (excess / dynamic_threshold) * 100
                    outbreak_months.append({
                        'month': item['month'],
                        'usage': item['predicted_usage'],
                        'excess': excess,
                        'percentage_above': percentage_above
                    })
            
            outbreak_count = len(outbreak_months)
            logger.info(f"   ⚠️ Values above threshold: {outbreak_count}/{periods} months")
            
            for month_data in outbreak_months:
                logger.info(f"      - {month_data['month']}: {month_data['usage']:.0f} (exceeds by {month_data['excess']:.0f})")
            
            # Calculate outbreak probability
            outbreak_probability = (outbreak_count / periods) * 100
            
            # Determine medical interpretation
            if outbreak_probability >= 70:
                medical_interpretation = "CRITICAL - Major outbreak likely"
            elif outbreak_probability >= 40:
                medical_interpretation = "HIGH - Significant outbreak risk"
            elif outbreak_probability >= 20:
                medical_interpretation = "MEDIUM - Moderate outbreak risk"
            else:
                medical_interpretation = "LOW - Normal variation expected"
            
            logger.info(f"🎯 OUTBREAK ANALYSIS RESULTS for {category_id}:")
            logger.info(f"   📈 Forecast months: {periods}")
            logger.info(f"   ⚠️ Outbreak months: {outbreak_count}")
            logger.info(f"   📊 Outbreak probability: {outbreak_probability:.1f}%")
            logger.info(f"   🎭 Outbreak months details:")
            for month_data in outbreak_months:
                logger.info(f"      - {month_data['month']}: {month_data['usage']:.0f} (+{month_data['percentage_above']:.1f}% above threshold)")
            logger.info(f"   🏥 Medical interpretation: {medical_interpretation}")
            
            # Enhanced analysis
            early_warning = self.perform_early_warning_analysis(category_id, df, forecast_data, dynamic_threshold)
            multi_method = self.perform_multi_method_analysis(category_id, df, forecast_data, outbreak_probability, dynamic_threshold)
            
            # Build comprehensive result
            result = {
                'category_id': category_id,
                'forecast_data': forecast_data,
                'outbreak_analysis': {
                    'historical_baseline': round(historical_baseline, 2),
                    'outbreak_threshold': round(dynamic_threshold, 2),
                    'predicted_outbreaks': outbreak_count,
                    'outbreak_months': [m['month'] for m in outbreak_months],
                    'outbreak_probability': round(multi_method['enhanced_probability'], 1),  # Use enhanced probability
                    'max_predicted_usage': max(predicted_values),
                    'overall_trend': 'increasing' if predicted_values[-1] > predicted_values[0] else 'decreasing',
                    'forecast_months_total': periods,
                    'confidence_level': multi_method['final_confidence_score'],  # Use enhanced confidence
                    'medical_interpretation': medical_interpretation,
                    'floor_applied_count': sum(1 for item in forecast_data if 'original_prediction' in item and item['predicted_usage'] != item['original_prediction'])  # ✅ Track floor applications
                },
                'trend_info': self.extract_trend_info(forecast),
                'early_warning': early_warning,
                'multi_method_probability': multi_method
            }
            
            logger.info(f"🎯 Outbreak analysis complete for {category_id}: {outbreak_count} potential outbreak months")
            logger.info(f"✅ Early warning analysis complete: {early_warning['overall_alert_level']} alert level")
            logger.info(f"🔬 Multi-method analysis complete: {multi_method['enhanced_probability']:.1f}% probability with {multi_method['final_confidence_score']:.1f}% confidence")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error generating forecast for {category_id}: {str(e)}")
            return {"error": f"Forecast generation failed for {category_id}: {str(e)}"}
    
    def batch_outbreak_forecast(self, categories_data: List[Dict], periods: int = 12) -> Dict:
        """Generate outbreak forecasts for multiple disease categories"""
        try:
            logger.info(f"🚀 Starting batch forecast for {len(categories_data)} categories")
            results = {}
            successful_forecasts = 0
            
            for category_info in categories_data:
                category_id = category_info.get('category_id')
                historical_data = category_info.get('historical_data', [])
                
                logger.info(f"📊 Processing category: {category_id} with {len(historical_data)} data points")
                
                if not category_id:
                    results[category_id or 'unknown'] = {"error": "Missing category_id"}
                    continue
                
                if not historical_data:
                    results[category_id] = {"error": "Missing historical_data"}
                    continue
                
                # Generate outbreak forecast
                forecast_result = self.generate_outbreak_forecast(category_id, historical_data, periods)
                results[category_id] = forecast_result
                
                if "error" not in forecast_result:
                    successful_forecasts += 1
                    logger.info(f"✅ Successfully generated forecast for {category_id}")
                else:
                    logger.warning(f"⚠️ Failed to generate forecast for {category_id}: {forecast_result.get('error')}")
            
            logger.info(f"🏁 Batch forecast completed: {successful_forecasts}/{len(categories_data)} successful")
            
            return {
                "success": True,
                "forecasts": results,
                "total_categories": len(categories_data),
                "successful_forecasts": successful_forecasts
            }
            
        except Exception as e:
            logger.error(f"❌ Batch outbreak forecast failed: {str(e)}")
            return {
                "success": False,
                "error": f"Batch forecast failed: {str(e)}"
            }
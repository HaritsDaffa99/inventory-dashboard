import pandas as pd
import numpy as np
from prophet import Prophet
from sklearn.metrics import mean_squared_error, mean_absolute_error, mean_absolute_percentage_error
from statsmodels.stats.diagnostic import acorr_ljungbox
import math
import warnings
import logging
from typing import List, Dict, Any, Tuple
from tqdm import tqdm
from itertools import combinations

# Configure logging to suppress verbose Prophet output
logging.getLogger('prophet').setLevel(logging.WARNING)
logging.getLogger('cmdstanpy').setLevel(logging.WARNING)

# Redirect debug output to file instead of console
debug_log = logging.FileHandler('prophet_debug.log')
debug_log.setLevel(logging.DEBUG)
logging.getLogger('prophet').addHandler(debug_log)
logging.getLogger('cmdstanpy').addHandler(debug_log)

# Silence Stan output completely
stan_logger = logging.getLogger('cmdstanpy')
stan_logger.propagate = False

warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class ForecastingModel:
    """
    Prophet-based forecasting model for medicine usage
    Supports three modes: fast, enhanced, and comprehensive
    All modes now support smart medical holidays when enabled
    """
    
    def __init__(self):
        self.model = None
        self.best_params = None
        # Initialize medical intelligence components
        self.vaccine_classifier = self._init_vaccine_classifier()
        self.medical_holidays_cache = None
    
    def _init_vaccine_classifier(self):
        """Initialize vaccine/medicine classification based on real database"""
        return {
            'emergency': [
                'anti-snake venom', 'antivenom', 'snake venom', 'snake',
                'anti-rabies', 'rabies vaccine', 'rabies',
                'anti-tetanus serum', 'ats', 'tetanus serum',
                'anti-diphtheria serum', 'ads', 'diphtheria serum'
            ],
            'routine_immunization': [
                'dpt', 'pentavac', 'combe five', 'bcg',
                'measles-rubella', 'measles', 'rubella',
                'polio', 'ipv', 'nopv2', 'polio vaccine',
                'pcv', 'pneumococcal', 'rotavirus', 'hpv'
            ],
            'hepatitis_prevention': [
                'hepatitis b', 'hb vaccine', 'hbig', 'hepatitis'
            ],
            'covid_vaccines': [
                'covid-19', 'indovac', 'covid vaccine', 'covid'
            ],
            'safety_multipliers': {
                'emergency': 2.0,           # 100% more safety stock
                'routine_immunization': 1.5, # 50% more safety stock
                'hepatitis_prevention': 1.3, # 30% more safety stock
                'covid_vaccines': 1.2,      # 20% more safety stock
                'standard': 1.0             # Normal safety stock
            },
            'category_descriptions': {
                'emergency': 'Emergency/Life-saving medicine',
                'routine_immunization': 'Routine childhood immunization',
                'hepatitis_prevention': 'Hepatitis prevention vaccine',
                'covid_vaccines': 'COVID-19 vaccination',
                'standard': 'Standard medicine/vaccine'
            }
        }
    
    def _create_medical_holidays(self):
        """Create medical-specific holidays for vaccination campaigns and disease seasons"""
        if self.medical_holidays_cache is not None:
            return self.medical_holidays_cache
        
        # Medical holidays based on real healthcare patterns
        medical_holidays_data = [
            # Childhood vaccination seasons
            ('School_Immunization_Drive', '09-01', -14, 14),    # September - back to school
            ('Infant_Vaccination_Peak', '03-15', -7, 7),        # March - new births + catch-up
            
            # Disease outbreak seasons
            ('Flu_Season_Peak', '01-15', -10, 10),              # January - respiratory diseases peak
            ('Measles_Outbreak_Season', '04-15', -14, 14),      # April-May - typical outbreak time
            ('Diarrhea_Season_Peak', '11-01', -7, 7),           # November - rotavirus season starts
            
            # Emergency medicine peaks
            ('Snake_Bite_Season', '06-15', -30, 30),            # June-August - outdoor activity season
            ('Rabies_Risk_Season', '07-15', -21, 21),           # July-September - animal activity peak
            
            # Special campaigns
            ('Hepatitis_B_Campaign', '10-01', -7, 7),           # October - national campaign month
            ('COVID_Booster_Campaign', '12-01', -14, 14),       # December - annual booster drive
        ]
        
        # Create holidays for multiple years
        holidays_list = []
        for year in range(2022, 2028):  # 6 years of holidays
            for holiday_name, date_str, lower_window, upper_window in medical_holidays_data:
                holidays_list.append({
                    'holiday': holiday_name,
                    'ds': pd.to_datetime(f"{year}-{date_str}"),
                    'lower_window': lower_window,
                    'upper_window': upper_window
                })
        
        self.medical_holidays_cache = pd.DataFrame(holidays_list)
        return self.medical_holidays_cache
    
    def _categorize_medicine(self, medicine_id: int, medicine_name: str = ""):
        """Categorize medicine and return category + safety multiplier"""
        search_text = f"{medicine_id} {medicine_name}".lower()
        
        # Check each category
        for category in ['emergency', 'routine_immunization', 'hepatitis_prevention', 'covid_vaccines']:
            keywords = self.vaccine_classifier[category]
            if any(keyword in search_text for keyword in keywords):
                multiplier = self.vaccine_classifier['safety_multipliers'][category]
                description = self.vaccine_classifier['category_descriptions'][category]
                return category, multiplier, description
        
        # Default category
        return 'standard', self.vaccine_classifier['safety_multipliers']['standard'], self.vaccine_classifier['category_descriptions']['standard']
    
    def _get_relevant_holidays(self, medicine_category: str):
        """Get holidays relevant to specific medicine categories"""
        holiday_mapping = {
            'emergency': ['Snake_Bite_Season', 'Rabies_Risk_Season', 'Flu_Season_Peak'],
            'routine_immunization': ['School_Immunization_Drive', 'Infant_Vaccination_Peak', 'Measles_Outbreak_Season'],
            'hepatitis_prevention': ['Hepatitis_B_Campaign', 'School_Immunization_Drive'],
            'covid_vaccines': ['COVID_Booster_Campaign', 'Flu_Season_Peak'],
            'standard': ['Flu_Season_Peak']  # Basic seasonal effect
        }
        
        relevant_holiday_names = holiday_mapping.get(medicine_category, ['Flu_Season_Peak'])
        all_holidays = self._create_medical_holidays()
        
        # Filter holidays to only relevant ones
        return all_holidays[all_holidays['holiday'].isin(relevant_holiday_names)]
    
    def _calculate_smart_safety_stock(self, forecast_std: float, medicine_category: str, safety_multiplier: float):
        """Calculate intelligent safety stock based on medicine criticality"""
        base_safety_factor = 1.65  # Z-score for 95% service level
        smart_safety_stock = base_safety_factor * safety_multiplier * forecast_std
        standard_safety_stock = base_safety_factor * forecast_std
        
        # Determine review frequency and service level based on criticality
        if medicine_category == 'emergency':
            review_frequency = 'Daily'
            service_level = '99.5%'
            max_stockout_risk = '0.1%'
        elif medicine_category in ['routine_immunization', 'hepatitis_prevention']:
            review_frequency = 'Weekly'
            service_level = '98%'
            max_stockout_risk = '1%'
        elif medicine_category == 'covid_vaccines':
            review_frequency = 'Weekly'
            service_level = '97%'
            max_stockout_risk = '1.5%'
        else:
            review_frequency = 'Bi-weekly'
            service_level = '95%'
            max_stockout_risk = '2.5%'
        
        return {
            'smart_safety_stock': round(smart_safety_stock, 2),
            'standard_safety_stock': round(standard_safety_stock, 2),
            'additional_safety_units': round(smart_safety_stock - standard_safety_stock, 2),
            'review_frequency': review_frequency,
            'service_level': service_level,
            'max_stockout_risk': max_stockout_risk
        }

    def prepare_data_for_prophet(self, historical_data: List[Dict]) -> pd.DataFrame:
        """Convert historical data to Prophet format (ds, y columns)"""
        df = pd.DataFrame(historical_data)
        df['ds'] = pd.to_datetime(df['date'])
        df['y'] = df['usage']
        return df[['ds', 'y']].sort_values('ds')
    
    def perform_residual_analysis(self, forecast_df, actual_df):
        """
        Analyze forecast residuals for systematic errors
        
        Parameters:
        -----------
        forecast_df : DataFrame with forecasted values (must have 'ds' and 'yhat' columns)
        actual_df : DataFrame with actual values (must have 'ds' and 'y' columns)
        
        Returns:
        --------
        Dict with residual analysis results
        """
        try:
            # Calculate residuals
            merged_df = pd.merge(
                forecast_df[['ds', 'yhat']], 
                actual_df[['ds', 'y']], 
                on='ds', how='inner'
            )
            
            if len(merged_df) == 0:
                return {
                    "status": "insufficient_data",
                    "message": "No matching data points for residual analysis"
                }
                
            merged_df['residual'] = merged_df['y'] - merged_df['yhat']
            
            # Basic statistical tests
            mean_residual = merged_df['residual'].mean()
            residual_std = merged_df['residual'].std()
            relative_mean_error = abs(mean_residual) / merged_df['y'].mean() if merged_df['y'].mean() > 0 else 0
            
            # Run Ljung-Box test for autocorrelation if we have enough data points
            autocorrelation_detected = False
            p_values = []
            
            if len(merged_df) >= 10:  # Need reasonable number of points for autocorrelation test
                try:
                    # Test for autocorrelation at lags 1, 2 (we're using monthly data typically)
                    lb_result = acorr_ljungbox(merged_df['residual'].values, lags=[1, 2])
                    p_values = lb_result[1].tolist() if isinstance(lb_result, tuple) else []
                    autocorrelation_detected = any(p < 0.05 for p in p_values)
                except Exception as e:
                    print(f"Error in autocorrelation test: {str(e)}")
                    p_values = []
                    autocorrelation_detected = False
            
            # Check for systematic bias
            systematic_bias = relative_mean_error > 0.1  # 10% threshold
            
            # Check for heteroscedasticity (increasing/decreasing variance)
            if len(merged_df) >= 8:  # Need reasonable number of points
                half_point = len(merged_df) // 2
                first_half_std = merged_df['residual'].iloc[:half_point].std()
                second_half_std = merged_df['residual'].iloc[half_point:].std()
                variance_ratio = max(first_half_std, second_half_std) / min(first_half_std, second_half_std) if min(first_half_std, second_half_std) > 0 else 1
                heteroscedastic = variance_ratio > 2.0  # If variance doubled
            else:
                heteroscedastic = False
                variance_ratio = 1.0
            
            return {
                "status": "success",
                "mean_residual": round(mean_residual, 4),
                "residual_std": round(residual_std, 4),
                "relative_mean_error": round(relative_mean_error * 100, 2),  # as percentage
                "autocorrelation": {
                    "detected": autocorrelation_detected,
                    "p_values": [round(p, 4) for p in p_values]
                },
                "systematic_bias": {
                    "detected": systematic_bias,
                    "severity": "high" if relative_mean_error > 0.2 else "medium" if relative_mean_error > 0.1 else "low"
                },
                "heteroscedasticity": {
                    "detected": heteroscedastic,
                    "variance_ratio": round(variance_ratio, 2)
                },
                "recommendations": []
            }
        
        except Exception as e:
            print(f"Error in residual analysis: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def generate_naive_forecast(self, ts: pd.Series, periods: int) -> pd.DataFrame:
        """Generate naive forecast (last value repeated)"""
        last_value = ts.iloc[-1]
        future_dates = pd.date_range(start=ts.index[-1] + pd.Timedelta(days=30), periods=periods, freq='MS')
        
        forecast_df = pd.DataFrame({
            'ds': future_dates,
            'yhat': [last_value] * periods
        })
        
        return forecast_df
    
    def generate_seasonal_naive_forecast(self, ts: pd.Series, periods: int) -> pd.DataFrame:
        """Generate seasonal naive forecast (same month from last year)"""
        # Check if we have at least one year of data
        if len(ts) < 12:
            # Fall back to naive forecast if less than a year of data
            return self.generate_naive_forecast(ts, periods)
        
        future_dates = pd.date_range(start=ts.index[-1] + pd.Timedelta(days=30), periods=periods, freq='MS')
        forecast_values = []
        
        for future_date in future_dates:
            # Find the same month from previous year
            month = future_date.month
            year = future_date.year - 1
            
            # Look for matching month in historical data
            matched_dates = [d for d in ts.index if d.month == month and d.year == year]
            
            if matched_dates:
                # Use the value from same month last year
                forecast_values.append(ts[matched_dates[0]])
            else:
                # Fall back to last value if no match
                forecast_values.append(ts.iloc[-1])
        
        forecast_df = pd.DataFrame({
            'ds': future_dates,
            'yhat': forecast_values
        })
        
        return forecast_df
    
    def generate_moving_average_forecast(self, ts: pd.Series, periods: int, window: int = 3) -> pd.DataFrame:
        """Generate moving average forecast"""
        # Calculate moving average of last 'window' values
        if len(ts) < window:
            window = len(ts)
        
        ma_value = ts.iloc[-window:].mean()
        future_dates = pd.date_range(start=ts.index[-1] + pd.Timedelta(days=30), periods=periods, freq='MS')
        
        forecast_df = pd.DataFrame({
            'ds': future_dates,
            'yhat': [ma_value] * periods
        })
        
        return forecast_df
    
    def compare_with_baselines(self, historical_data: pd.Series, forecast_horizon: int, test_data: pd.DataFrame = None) -> Tuple[Dict, Dict]:
        """
        Compare Prophet forecast with simple baseline models
        
        Parameters:
        -----------
        historical_data : pd.Series
            Time series of historical data
        forecast_horizon : int
            Number of periods to forecast
        test_data : pd.DataFrame, optional
            Test data for validation (must have 'ds' and 'y' columns)
        
        Returns:
        --------
        Tuple of (forecasts, metrics) dictionaries
        """
        try:
            # Create baseline forecasts
            baselines = {
                "naive": self.generate_naive_forecast(historical_data, forecast_horizon),
                "seasonal_naive": self.generate_seasonal_naive_forecast(historical_data, forecast_horizon),
                "moving_avg": self.generate_moving_average_forecast(historical_data, forecast_horizon)
            }
            
            # If we have test data, calculate error metrics
            baseline_errors = {}
            if test_data is not None and len(test_data) > 0:
                for name, forecast in baselines.items():
                    # Align forecast dates with test dates
                    merged = pd.merge(forecast, test_data, on='ds', how='inner')
                    
                    if len(merged) > 0:
                        predictions = merged['yhat'].values
                        actuals = merged['y'].values
                        
                        # Calculate various error metrics
                        mse = mean_squared_error(actuals, predictions)
                        rmse = np.sqrt(mse)
                        mae = mean_absolute_error(actuals, predictions)
                        
                        # Handle MAPE calculation with zeros
                        if np.all(actuals == 0):
                            mape = None
                        else:
                            mask = actuals != 0
                            mape = np.mean(np.abs((actuals[mask] - predictions[mask]) / actuals[mask])) * 100 if np.any(mask) else None
                        
                        baseline_errors[name] = {
                            "rmse": round(rmse, 2),
                            "mae": round(mae, 2),
                            "mape": round(mape, 2) if mape is not None else None
                        }
                    else:
                        baseline_errors[name] = {
                            "rmse": None,
                            "mae": None,
                            "mape": None
                        }
            
            return baselines, baseline_errors
            
        except Exception as e:
            print(f"Error comparing with baselines: {str(e)}")
            return {}, {}
    
    def key_parameter_sensitivity(self, time_series: pd.Series, base_params: Dict) -> Dict:
        """
        Test sensitivity to critical parameters
        
        Parameters:
        -----------
        time_series : pd.Series
            Time series data
        base_params : Dict
            Baseline parameters to vary
        
        Returns:
        --------
        Dict with sensitivity analysis results
        """
        try:
            # Only vary the most impactful parameter (changepoint_prior_scale)
            cp_scale = base_params.get("changepoint_prior_scale", 0.05)
            
            variations = {
                "baseline": base_params.copy(),
                "higher_flexibility": {**base_params, "changepoint_prior_scale": cp_scale * 2},
                "lower_flexibility": {**base_params, "changepoint_prior_scale": max(cp_scale / 2, 0.001)}
            }
            
            # Convert time series to Prophet format
            df = self.prepare_data_for_prophet([{'date': idx, 'usage': val} for idx, val in time_series.items()])
            
            # Train models with parameter variations
            forecasts = {}
            metrics = {}
            
            for name, params in variations.items():
                try:
                    # Create and fit model
                    model = Prophet(
                        yearly_seasonality=True if len(df) > 12 else False,
                        weekly_seasonality=False,
                        daily_seasonality=False,
                        **params
                    )
                    model.fit(df, algorithm='Newton')
                    
                    # Generate forecast
                    future = model.make_future_dataframe(periods=6, freq='MS')
                    forecast = model.predict(future)
                    forecasts[name] = forecast
                    
                    # Calculate a stability score (lower is more stable)
                    stability = (forecast['yhat_upper'] - forecast['yhat_lower']).mean() / forecast['yhat'].mean() if forecast['yhat'].mean() != 0 else 0
                    metrics[name] = {"stability": round(stability, 4)}
                except Exception as e:
                    print(f"Error in sensitivity analysis variation {name}: {str(e)}")
                    continue
            
            # Determine if forecast is sensitive to parameters
            if len(forecasts) >= 2:
                yhat_variations = [forecasts[v]['yhat'].values[-6:] for v in forecasts.keys() if v in forecasts]
                
                if len(yhat_variations) >= 2:
                    max_diff = max([np.max(np.abs(a - b)) for a, b in combinations(yhat_variations, 2)])
                    baseline_mean = forecasts['baseline']['yhat'].mean() if 'baseline' in forecasts else 1
                    
                    is_sensitive = max_diff > 0.1 * baseline_mean if baseline_mean != 0 else False
                    max_variation_pct = (max_diff / baseline_mean) * 100 if baseline_mean != 0 else 0
                else:
                    is_sensitive = False
                    max_variation_pct = 0
            else:
                is_sensitive = False
                max_variation_pct = 0
            
            return {
                "status": "success",
                "is_sensitive": is_sensitive,
                "max_variation_pct": round(max_variation_pct, 2),
                "metrics": metrics,
                "recommendations": [
                    "Consider more conservative parameters" if is_sensitive else "Current parameters are stable"
                ]
            }
            
        except Exception as e:
            print(f"Error in sensitivity analysis: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def evaluate_prophet_model_comprehensive(self, ts, holidays=None, cv_splits: int = 3, horizon_months: int = 3) -> tuple:
        """Evaluate Prophet model with comprehensive cross-validation"""
        
        # Convert to prophet format
        df = self.prepare_data_for_prophet([{'date': idx, 'usage': val} for idx, val in ts.items()])

        # We need at least enough data for training and testing
        if len(df) < 6:
            print("Insufficient data for proper evaluation")
            return None, None, float('inf')

        total_months = len(df)
        test_size = horizon_months

        # Determine number of splits based on data availability
        actual_splits = min(cv_splits, total_months // (test_size * 2))
        if actual_splits < 1:
            actual_splits = 1

        best_params = None
        best_error = float('inf')

        # Try different parameter combinations - EXACT SAME ORDER AS ORIGINAL
        param_combinations = [
            # Simple model with minimal settings
            {'changepoint_prior_scale': 0.05, 'seasonality_mode': 'additive', 'seasonality_prior_scale': 10.0},
            # More flexible trend
            {'changepoint_prior_scale': 0.5, 'seasonality_mode': 'additive', 'seasonality_prior_scale': 10.0},
            # More conservative trend
            {'changepoint_prior_scale': 0.01, 'seasonality_mode': 'additive', 'seasonality_prior_scale': 10.0},
            # Multiplicative seasonality
            {'changepoint_prior_scale': 0.05, 'seasonality_mode': 'multiplicative', 'seasonality_prior_scale': 10.0}
        ]

        print("\nFinding optimal Prophet parameters...")

        for params in tqdm(param_combinations, desc="Testing model configurations"):
            cv_errors = []

            # Manual cross-validation for Prophet
            for i in range(actual_splits):
                # Determine cutoff point for this split
                cutoff_idx = total_months - (i + 1) * test_size
                if cutoff_idx < 6:  # Need at least 6 months for training
                    continue

                # Split into train and test
                train_df = df.iloc[:cutoff_idx].copy()
                test_df = df.iloc[cutoff_idx:cutoff_idx + test_size].copy()

                if len(test_df) == 0:
                    continue

                # Create and fit model
                model = Prophet(
                    yearly_seasonality=True if len(train_df) > 12 else False,
                    weekly_seasonality=False,
                    daily_seasonality=False,
                    holidays=holidays,
                    **params
                )

                try:
                    model.fit(train_df, algorithm='Newton')

                    # Make forecast
                    future = model.make_future_dataframe(periods=len(test_df), freq='MS')
                    forecast = model.predict(future)

                    # Extract predictions for test period
                    predictions = forecast.iloc[-len(test_df):]['yhat'].values
                    actuals = test_df['y'].values

                    # Calculate error - EXACT SAME AS ORIGINAL
                    if np.all(actuals == 0):
                        error = mean_absolute_error(actuals, predictions)
                    else:
                        mask = actuals != 0
                        if np.any(mask):
                            error = mean_absolute_percentage_error(actuals[mask], predictions[mask])
                        else:
                            error = mean_absolute_error(actuals, predictions)

                    cv_errors.append(error)
                except Exception as e:
                    print(f"Error in CV split: {str(e)}")
                    continue

            # Calculate average error across CV splits
            if cv_errors:
                avg_error = sum(cv_errors) / len(cv_errors)
                print(f"  ► Config {params}: Average error = {avg_error:.4f}")

                if avg_error < best_error:
                    best_error = avg_error
                    best_params = params

        if best_params is None:
            print("Could not find suitable Prophet parameters, using defaults")
            best_params = {'changepoint_prior_scale': 0.05, 'seasonality_mode': 'additive', 'seasonality_prior_scale': 10.0}
        else:
            print(f"\nBest configuration found: {best_params} (Error: {best_error:.4f})")

        # Train final model with best params on full dataset
        model = Prophet(
            yearly_seasonality=True if len(df) > 12 else False,
            weekly_seasonality=False,
            daily_seasonality=False,
            holidays=holidays,
            **best_params
        )
        model.fit(df, algorithm='Newton')

        return model, best_params, best_error

    def evaluate_prophet_model_enhanced(self, ts, holidays=None) -> tuple:
        """Evaluate Prophet model with meaningful parameter tuning"""
        
        # Convert to prophet format
        df = self.prepare_data_for_prophet([{'date': idx, 'usage': val} for idx, val in ts.items()])

        # We need at least enough data for training and testing
        if len(df) < 6:
            print("Insufficient data for proper evaluation")
            return None, None, float('inf')

        # Get some basic statistics about the time series to inform parameter selection
        values = ts.values
        std_dev = np.std(values)
        mean_val = np.mean(values)
        cv = std_dev / mean_val if mean_val > 0 else 0  # Coefficient of variation

        print(f"\nTime series analysis: Mean={mean_val:.2f}, StdDev={std_dev:.2f}, CV={cv:.2f}")

        # Dynamically choose parameters based on data characteristics
        if cv > 0.5:  # High variability
            print("High variability detected, testing flexible models")
            param_combinations = [
                # More flexible trend for variable data
                {'changepoint_prior_scale': 0.2, 'seasonality_mode': 'multiplicative'},
                {'changepoint_prior_scale': 0.3, 'seasonality_mode': 'additive'}
            ]
        else:  # Lower variability
            print("Lower variability detected, using more conservative models")
            param_combinations = [
                # More conservative settings for stable data
                {'changepoint_prior_scale': 0.03, 'seasonality_mode': 'additive'},
                {'changepoint_prior_scale': 0.1, 'seasonality_mode': 'additive'}
            ]

        print("Testing data-driven parameter combinations...")

        best_params = None
        best_error = float('inf')

        # Use simplified validation: 70% train, 30% test
        total_months = len(df)
        cutoff_idx = int(total_months * 0.7)

        if cutoff_idx < 6:  # Need at least 6 months for training
            print("Not enough data for validation, using parameters based on data characteristics")
            best_params = param_combinations[0]
        else:
            # Split into train and test
            train_df = df.iloc[:cutoff_idx].copy()
            test_df = df.iloc[cutoff_idx:].copy()

            for params in param_combinations:
                print(f"  Testing configuration: {params}")

                # Create and fit model
                model = Prophet(
                    yearly_seasonality=True if len(train_df) > 12 else False,
                    weekly_seasonality=False,
                    daily_seasonality=False,
                    holidays=holidays,
                    **params
                )

                try:
                    model.fit(train_df, algorithm='Newton')

                    # Make forecast
                    future = model.make_future_dataframe(periods=len(test_df), freq='MS')
                    forecast = model.predict(future)

                    # Extract predictions for test period
                    predictions = forecast.iloc[-len(test_df):]['yhat'].values
                    actuals = test_df['y'].values

                    # Calculate error
                    if np.all(actuals == 0):
                        error = mean_absolute_error(actuals, predictions)
                    else:
                        mask = actuals != 0
                        if np.any(mask):
                            error = mean_absolute_percentage_error(actuals[mask], predictions[mask])
                        else:
                            error = mean_absolute_error(actuals, predictions)

                    print(f"    Error: {error:.4f}")

                    if error < best_error:
                        best_error = error
                        best_params = params

                except Exception as e:
                    print(f"    Error fitting model: {str(e)}")
                    continue

        if best_params is None:
            print("Could not find suitable parameters, using defaults")
            best_params = {'changepoint_prior_scale': 0.1, 'seasonality_mode': 'additive'}
        else:
            print(f"\nSelected configuration: {best_params} (Error: {best_error:.4f})")

        # Add fourier order for enhanced seasonality modeling
        enhanced_params = best_params.copy()
        if len(df) >= 12:  # Only if we have at least a year of data
            print("Adding enhanced seasonality modeling")
            enhanced_params.update({'seasonality_prior_scale': 15.0})

        # Train final model with best params on full dataset
        model = Prophet(
            yearly_seasonality=True if len(df) > 12 else False,
            weekly_seasonality=False,
            daily_seasonality=False,
            holidays=holidays,
            **enhanced_params
        )

        # For enhanced model, set higher Fourier order for better seasonal modeling
        if len(df) >= 12:
            model.add_seasonality(name='yearly', period=365.25, fourier_order=5)

        model.fit(df, algorithm='Newton')

        return model, enhanced_params, best_error

    def evaluate_prophet_model_fast(self, ts, holidays=None) -> tuple:
        """Quickly create a Prophet model with sensible defaults"""
        
        # Convert to prophet format
        df = self.prepare_data_for_prophet([{'date': idx, 'usage': val} for idx, val in ts.items()])

        # We need at least enough data for training
        if len(df) < 6:
            print("Insufficient data for model creation")
            return None, None, None

        # Use default parameters that work reasonably well for most cases
        default_params = {'changepoint_prior_scale': 0.05, 'seasonality_mode': 'additive', 'seasonality_prior_scale': 10.0}

        print("\nCreating Prophet model with default parameters...")

        # Create and fit model with sensible defaults
        model = Prophet(
            yearly_seasonality=True if len(df) > 12 else False,
            weekly_seasonality=False,
            daily_seasonality=False,
            holidays=holidays,
            **default_params
        )

        try:
            model.fit(df, algorithm='Newton')
            return model, default_params, None
        except Exception as e:
            print(f"Error fitting Prophet model: {str(e)}")
            return None, None, None
    
    def generate_forecast(self, unit_id: int, medicine_id: int, historical_data: List[Dict], 
                         periods: int = 6, train_test_split: float = 0.8, 
                         include_holidays: bool = False, model_mode: str = "fast",
                         medicine_name: str = "") -> Dict[str, Any]:
        """
        Generate forecast using Prophet model with specified mode
        All modes now support smart medical holidays when enabled
        """
        try:
            # Convert historical data to time series format like original
            df_data = pd.DataFrame(historical_data)
            df_data['date'] = pd.to_datetime(df_data['date'])
            df_data.set_index('date', inplace=True)
            ts = df_data['usage']
            
            if len(ts) < 6:
                raise ValueError(f"Not enough data. Need at least 6 months, got {len(ts)}")
            
            # Data overview - EXACT SAME AS ORIGINAL
            print(f"\nAnalyzing Medicine {medicine_id} in Unit {unit_id}")
            print(f"Historical data: {len(ts)} months ({ts.index.min().strftime('%Y-%m-%d')} to {ts.index.max().strftime('%Y-%m-%d')})")
            print(f"Average monthly usage: {ts.mean():.2f} units")
            print(f"Forecast period: {periods} months")
            print(f"Model mode: {model_mode.upper()}")
            
            # Convert time series to Prophet format
            df = self.prepare_data_for_prophet([{'date': idx, 'usage': val} for idx, val in ts.items()])
            
            # Split data for validation
            train_size = int(len(df) * train_test_split)
            train_df = df.iloc[:train_size].copy()
            test_df = df.iloc[train_size:].copy()
            has_test = len(test_df) > 0
            
            # Initialize error metrics
            rmse, mae, mape = None, None, None
            
            # NEW: Smart holiday handling for ALL modes
            holidays = None
            medical_insights = None
            
            if include_holidays:
                # Get medicine category and smart holidays for ALL modes
                category, safety_multiplier, category_description = self._categorize_medicine(medicine_id, medicine_name)
                holidays = self._get_relevant_holidays(category)
                
                # Store medical insights for later use (available for all modes now)
                medical_insights = {
                    'category': category,
                    'safety_multiplier': safety_multiplier,
                    'category_description': category_description,
                    'relevant_holidays': len(holidays),
                    'holiday_names': holidays['holiday'].unique().tolist() if not holidays.empty else []
                }
                
                print(f"Medical category: {category_description}")
                print(f"Safety multiplier: {safety_multiplier}x")
                print(f"Smart holidays: {len(holidays)} medical seasons")
            
            # Choose model evaluation method based on selected mode
            if model_mode == "fast":
                # Fast mode - skip complex cross-validation
                prophet_model, best_params, _ = self.evaluate_prophet_model_fast(ts, holidays=holidays)
                model_description = "Fast (Default Parameters)"
            elif model_mode == "enhanced":
                # Enhanced mode - data-aware parameter tuning
                prophet_model, best_params, _ = self.evaluate_prophet_model_enhanced(ts, holidays=holidays)
                model_description = "Enhanced (Data-Driven Parameters)"
            else:  # comprehensive mode
                # Comprehensive mode - full parameter tuning and cross-validation
                prophet_model, best_params, _ = self.evaluate_prophet_model_comprehensive(ts, holidays=holidays)
                model_description = "Comprehensive (Full Optimization)"
            
            # Add medical description if medical insights are available
            if medical_insights:
                model_description += f" + Medical Intelligence ({medical_insights['category_description']})"
            
            if prophet_model is None:
                raise ValueError("Failed to create valid Prophet model")
            
            # Initialize validation results containers
            residual_analysis_results = {}
            baseline_comparison_results = {}
            sensitivity_analysis_results = {}
            
            # Evaluate on holdout test set - EXACT SAME AS ORIGINAL
            if has_test:
                print("\nEvaluating on holdout test data...")
                
                # Create and fit model on training data
                test_model = Prophet(
                    yearly_seasonality=True if len(train_df) > 12 else False,
                    weekly_seasonality=False,
                    daily_seasonality=False,
                    holidays=holidays,
                    **best_params
                )
                test_model.fit(train_df, algorithm='Newton')
                
                # Make forecast for test period
                future_test = test_model.make_future_dataframe(periods=len(test_df), freq='MS')
                forecast_test = test_model.predict(future_test)
                
                # Extract predictions for test period
                test_predictions = forecast_test.iloc[-len(test_df):]['yhat'].values
                test_actuals = test_df['y'].values
                
                # Calculate metrics - EXACT SAME AS ORIGINAL
                mse = mean_squared_error(test_actuals, test_predictions)
                rmse = np.sqrt(mse)
                mae = mean_absolute_error(test_actuals, test_predictions)
                
                # MAPE calculation with handling for zeros - EXACT SAME AS ORIGINAL
                if np.all(test_actuals == 0):
                    mape = np.nan
                else:
                    mask = test_actuals != 0
                    mape = np.mean(np.abs((test_actuals[mask] - test_predictions[mask]) / test_actuals[mask])) * 100 if np.any(mask) else np.nan
                
                # Now run additional validations based on the mode
                # Some validations are only run in more advanced modes to save time
                
                # 1. Always do residual analysis - it's fast and valuable
                residual_analysis_results = self.perform_residual_analysis(
                    forecast_test, test_df
                )
                
                # 2. Baseline comparison - for enhanced and comprehensive modes
                if model_mode in ["enhanced", "comprehensive"]:
                    # Compare with baselines using historical data and test data
                    baseline_forecasts, baseline_metrics = self.compare_with_baselines(
                        ts.iloc[:train_size], len(test_df), test_df
                    )
                    
                    # Format for output
                    baseline_comparison_results = {
                        "models": list(baseline_metrics.keys()),
                        "metrics": baseline_metrics
                    }
                
                # 3. Sensitivity analysis - only for comprehensive mode
                if model_mode == "comprehensive":
                    # Run sensitivity analysis on best parameters
                    sensitivity_analysis_results = self.key_parameter_sensitivity(ts, best_params)
            
            # Generate forecast using model fitted on all data
            print("\nGenerating forecast...")
            future = prophet_model.make_future_dataframe(periods=periods, freq='MS')
            forecast = prophet_model.predict(future)
            
            # Extract forecast components
            forecast_mean = forecast.iloc[-periods:]['yhat'].values
            forecast_lower = forecast.iloc[-periods:]['yhat_lower'].values
            forecast_upper = forecast.iloc[-periods:]['yhat_upper'].values
            forecast_dates = forecast.iloc[-periods:]['ds'].values
            
            # Ensure no negative values in forecast - EXACT SAME AS ORIGINAL
            forecast_mean = np.maximum(forecast_mean, 0)
            forecast_lower = np.maximum(forecast_lower, 0)
            
            # Create forecast dataframe with dates - EXACT SAME ROUNDING AS ORIGINAL
            forecast_data = []
            for i in range(periods):
                forecast_data.append({
                    'date': pd.to_datetime(forecast_dates[i]).strftime('%Y-%m-%d'),
                    'forecasted_usage': round(forecast_mean[i], 2),
                    'lower_ci': round(forecast_lower[i], 2),
                    'upper_ci': round(forecast_upper[i], 2)
                })
            
            # Calculate total forecast and averages
            total_forecast = forecast_mean.sum()
            avg_monthly = forecast_mean.mean()
            
            # Enhanced safety stock calculation when medical insights are available
            if medical_insights:
                # Smart safety stock calculation using medical intelligence
                forecast_std = (forecast_upper - forecast_lower) / 3.92  # Approximation for 95% CI
                avg_std = forecast_std.mean()
                
                safety_stock_info = self._calculate_smart_safety_stock(
                    avg_std, 
                    medical_insights['category'], 
                    medical_insights['safety_multiplier']
                )
                
                safety_stock = safety_stock_info['smart_safety_stock']
                service_level = safety_stock_info['service_level']
                
                # Enhanced recommendations with medical intelligence
                recommendations = {
                    'safety_stock': safety_stock,
                    'standard_safety_stock': safety_stock_info['standard_safety_stock'],
                    'additional_safety_units': safety_stock_info['additional_safety_units'],
                    'reorder_point': round(avg_monthly + safety_stock, 2),
                    'max_stock_level': round((avg_monthly + safety_stock) * 2, 2),
                    'lead_time_months': 1,
                    'service_level': service_level,
                    'review_frequency': safety_stock_info['review_frequency'],
                    'max_stockout_risk': safety_stock_info['max_stockout_risk'],
                    'procurement_urgency': 'High' if medical_insights['category'] == 'emergency' else 'Medium'
                }
                
            else:
                # Original safety stock calculation for modes without holidays
                safety_factor = 1.65  # ~95% service level
                forecast_std = (forecast_upper - forecast_lower) / 3.92  # Approximation for 95% CI
                avg_std = forecast_std.mean()
                safety_stock = safety_factor * avg_std
                
                recommendations = {
                    'safety_stock': round(safety_stock, 2),
                    'reorder_point': round(avg_monthly + safety_stock, 2),
                    'lead_time_months': 1,
                    'service_level': '95%'
                }
            
            # Create results dictionary
            metrics = {}
            if has_test and rmse is not None:
                metrics = {
                    'rmse': round(rmse, 2),
                    'mae': round(mae, 2),
                    'mape': round(mape, 2) if not np.isnan(mape) else None,
                    'train_size': len(train_df),
                    'test_size': len(test_df)
                }
            
            validation_results = {}
            
            # Only include validation results if we have them
            if residual_analysis_results or baseline_comparison_results or sensitivity_analysis_results:
                validation_results = {
                    "residual_analysis": residual_analysis_results if residual_analysis_results else None,
                    "baseline_comparison": baseline_comparison_results if baseline_comparison_results else None,
                    "sensitivity_analysis": sensitivity_analysis_results if sensitivity_analysis_results else None
                }
            
            # Base result structure (same as original)
            result = {
                'success': True,
                'unit_id': unit_id,
                'medicine_id': medicine_id,
                'model_type': f'Prophet ({model_description})',
                'model_parameters': best_params,
                'historical_data': [
                    {'date': row['ds'].strftime('%Y-%m-%d'), 'usage': row['y']}
                    for _, row in df.iterrows()
                ],
                'forecast_data': forecast_data,
                'summary': {
                    'total_forecast': round(total_forecast, 2),
                    'avg_monthly': round(avg_monthly, 2),
                    'historical_avg': round(ts.mean(), 2),
                    'data_points': len(df),
                    'forecast_period': periods
                },
                'recommendations': recommendations,
                'metrics': metrics,
                'validation': validation_results if validation_results else None
            }
            
            # Add medical insights if medical intelligence was used
            if medical_insights:
                result['medical_insights'] = medical_insights
            
            return result
            
        except Exception as e:
            logger.error(f"Prophet forecast generation failed: {str(e)}")
            return {
                'success': False,
                'unit_id': unit_id,
                'medicine_id': medicine_id,
                'model_type': 'Prophet',
                'model_parameters': {},
                'historical_data': [],
                'forecast_data': [],
                'summary': {},
                'recommendations': {},
                'metrics': {},
                'error': str(e)
            }
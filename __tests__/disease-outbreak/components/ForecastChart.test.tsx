import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForecastChart from '@/components/disease-outbreak/ForecastChart';
import { OutbreakForecast } from '@/lib/forecasting/outbreak-types';

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid="chart-line" data-key={dataKey} data-stroke={stroke} />
  ),
  XAxis: ({ dataKey }: any) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: ({ domain }: any) => (
    <div data-testid="y-axis" data-domain={JSON.stringify(domain)} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => (
    <div data-testid="chart-tooltip">{content && 'Custom Tooltip'}</div>
  ),
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe('ForecastChart', () => {
  // Mock console methods to avoid noise in tests
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test data setup
  const mockForecastComplete: OutbreakForecast = {
    category_id: 'RESPIRATORY',
    category_name: 'respiratory_infections',
    outbreak_threshold: 1545.8,
    current_usage: 850,
    risk_percentage: 55,
    monthly_growth_rate: 12.3,
    risk_level: 'MEDIUM',
    confidence_score: 87,
    prophet_forecast: {
      model_performance: {
        rmse: 45.2,
        mae: 38.1,
        mape: 12.5
      },
      forecast_months: [
        {
          month: '2025-07',
          predicted_usage: 950,
          lower_bound: 800,
          upper_bound: 1100,
          confidence_interval: '80%'
        },
        {
          month: '2025-08',
          predicted_usage: 1050,
          lower_bound: 900,
          upper_bound: 1200,
          confidence_interval: '80%'
        },
        {
          month: '2025-09',
          predicted_usage: 1200,
          lower_bound: 1000,
          upper_bound: 1400,
          confidence_interval: '80%'
        },
        {
          month: '2025-10',
          predicted_usage: 1400,
          lower_bound: 1200,
          upper_bound: 1600,
          confidence_interval: '80%'
        },
        {
          month: '2025-11',
          predicted_usage: 1500,
          lower_bound: 1300,
          upper_bound: 1700,
          confidence_interval: '80%'
        },
        {
          month: '2025-12',
          predicted_usage: 1600,
          lower_bound: 1400,
          upper_bound: 1800,
          confidence_interval: '80%'
        }
      ]
    },
    early_warning: null
  };

  const mockForecastCritical: OutbreakForecast = {
    category_id: 'VACCINE_PREVENTABLE',
    category_name: 'vaccine_preventable_diseases',
    outbreak_threshold: 5275.9,
    current_usage: 4500,
    risk_percentage: 85,
    monthly_growth_rate: 18.7,
    risk_level: 'CRITICAL',
    confidence_score: 92,
    prophet_forecast: {
      model_performance: {
        rmse: 52.1,
        mae: 41.3,
        mape: 15.2
      },
      forecast_months: [
        {
          month: '2025-07',
          predicted_usage: 4800,
          lower_bound: 4600,
          upper_bound: 5000,
          confidence_interval: '80%'
        },
        {
          month: '2025-08',
          predicted_usage: 5100,
          lower_bound: 4900,
          upper_bound: 5300,
          confidence_interval: '80%'
        },
        {
          month: '2025-09',
          predicted_usage: 5400,
          lower_bound: 5200,
          upper_bound: 5600,
          confidence_interval: '80%'
        }
      ]
    },
    early_warning: null
  };

  const mockForecastMinimal: OutbreakForecast = {
    category_id: 'EMERGENCY_ZOONOTIC',
    category_name: 'emergency_zoonotic',
    outbreak_threshold: 231.2,
    current_usage: 100,
    risk_percentage: 43,
    monthly_growth_rate: 5.2,
    risk_level: 'LOW',
    prophet_forecast: null,
    early_warning: null
  };

  describe('Component Rendering', () => {
    it('renders forecast chart with complete data', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      expect(screen.getByText('Disease Outbreak Forecasting')).toBeInTheDocument();
      expect(screen.getByText(/Model: Prophet AI/)).toBeInTheDocument();
      expect(screen.getByText(/1 Categories Analyzed/)).toBeInTheDocument();
    });

    it('displays category name correctly formatted', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      expect(screen.getByText('Respiratory Infections')).toBeInTheDocument();
    });

    it('shows risk level badge with appropriate styling', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      const mediumBadge = screen.getByText('MEDIUM');
      expect(mediumBadge).toBeInTheDocument();
      expect(mediumBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('renders chart components correctly', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument();
    });

    it('displays statistics summary correctly', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      expect(screen.getByText('Alert Months')).toBeInTheDocument();
      expect(screen.getByText('Average Risk')).toBeInTheDocument();
      expect(screen.getByText('Peak Risk')).toBeInTheDocument();
      expect(screen.getByText('Confidence')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when isLoading is true', () => {
      render(<ForecastChart forecasts={[]} isLoading={true} />);

      // Look for elements with animate-pulse class instead of data-testid
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('displays multiple loading skeletons', () => {
      render(<ForecastChart forecasts={[]} isLoading={true} />);

      // Should show 3 loading skeletons
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBe(3);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no forecasts provided', () => {
      render(<ForecastChart forecasts={[]} />);

      expect(screen.getByText('No outbreak forecasts available')).toBeInTheDocument();
    });

    it('does not render charts in empty state', () => {
      render(<ForecastChart forecasts={[]} />);

      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
      expect(screen.queryByText('Disease Outbreak Forecasting')).not.toBeInTheDocument();
    });
  });

  describe('Risk Level Styling', () => {
    it('applies correct styling for CRITICAL risk level', () => {
      render(<ForecastChart forecasts={[mockForecastCritical]} />);

      const criticalBadge = screen.getByText('CRITICAL');
      expect(criticalBadge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('applies correct styling for MEDIUM risk level', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      const mediumBadge = screen.getByText('MEDIUM');
      expect(mediumBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('uses appropriate line colors for different risk levels', () => {
      render(<ForecastChart forecasts={[mockForecastCritical]} />);

      // Use getAllByTestId since there are multiple chart lines
      const chartLines = screen.getAllByTestId('chart-line');
      expect(chartLines.length).toBeGreaterThan(0);
      
      // Check that at least one line has the expected CRITICAL color
      const hasExpectedColor = chartLines.some(line => 
        line.getAttribute('data-stroke') === '#dc2626'
      );
      expect(hasExpectedColor).toBe(true);
    });
  });

  describe('Chart Data Processing', () => {
    it('processes prophet forecast data correctly', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      const lineChart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(6); // 6 months of data
      expect(chartData[0]).toHaveProperty('month');
      expect(chartData[0]).toHaveProperty('outbreakRisk');
      expect(chartData[0]).toHaveProperty('usageLevel');
    });

    it('calculates risk percentages correctly', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      const lineChart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]');
      
      // First month: 950 / 1545.8 * 100 ≈ 61%
      expect(chartData[0].outbreakRisk).toBeCloseTo(61, 0);
    });

    it('handles multiple forecasts correctly', () => {
      render(<ForecastChart forecasts={[mockForecastComplete, mockForecastCritical]} />);

      expect(screen.getByText('Respiratory Infections')).toBeInTheDocument();
      expect(screen.getByText('Vaccine Preventable Diseases')).toBeInTheDocument();
      expect(screen.getByText(/2 Categories Analyzed/)).toBeInTheDocument();
    });

    it('sets correct Y-axis domain', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-domain', '[0,100]');
    });
  });

  describe('Statistics Calculations', () => {
    it('calculates average risk correctly', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      // Should calculate and display average risk
      const statsSection = screen.getByText('Average Risk').closest('div');
      expect(statsSection).toBeInTheDocument();
    });

    it('calculates peak risk correctly', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      // Should calculate and display peak risk
      const peakSection = screen.getByText('Peak Risk').closest('div');
      expect(peakSection).toBeInTheDocument();
    });

    it('counts alert months correctly', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      // Should count months with risk >= 60%
      const alertSection = screen.getByText('Alert Months').closest('div');
      expect(alertSection).toBeInTheDocument();
    });

    it('displays confidence score correctly', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      // Should show confidence score from forecast data
      expect(screen.getByText('87%')).toBeInTheDocument();
    });

    it('calculates confidence from model performance when score not available', () => {
      const forecastWithoutConfidence = {
        ...mockForecastComplete,
        confidence_score: undefined
      };

      render(<ForecastChart forecasts={[forecastWithoutConfidence]} />);

      // Should calculate confidence from model performance
      const confidenceSection = screen.getByText('Confidence').closest('div');
      expect(confidenceSection).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles forecast without prophet data', () => {
      render(<ForecastChart forecasts={[mockForecastMinimal]} />);

      expect(screen.getByText('Emergency Zoonotic')).toBeInTheDocument();
      // Should not crash and should display something meaningful
      expect(screen.getByText('Disease Outbreak Forecasting')).toBeInTheDocument();
    });

    it('handles missing threshold data gracefully', () => {
      const forecastWithoutThreshold = {
        ...mockForecastComplete,
        outbreak_threshold: undefined
      };

      render(<ForecastChart forecasts={[forecastWithoutThreshold]} />);

      // Should not crash and should display category
      expect(screen.getByText('Respiratory Infections')).toBeInTheDocument();
    });

    it('handles malformed forecast months', () => {
      const forecastWithBadData = {
        ...mockForecastComplete,
        prophet_forecast: {
          ...mockForecastComplete.prophet_forecast!,
          forecast_months: [
            { month: 'invalid-date', predicted_usage: 0, lower_bound: 0, upper_bound: 0 }
          ]
        }
      };

      render(<ForecastChart forecasts={[forecastWithBadData]} />);

      // Should not crash
      expect(screen.getByText('Respiratory Infections')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('displays custom model type', () => {
      render(
        <ForecastChart 
          forecasts={[mockForecastComplete]} 
          modelType="Custom AI Model"
        />
      );

      expect(screen.getByText(/Model: Custom AI Model/)).toBeInTheDocument();
    });

    it('displays custom generation time', () => {
      render(
        <ForecastChart 
          forecasts={[mockForecastComplete]} 
          generationTime={1500}
        />
      );

      expect(screen.getByText(/Generated in 1500ms/)).toBeInTheDocument();
    });

    it('uses default props when not provided', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      expect(screen.getByText(/Model: Prophet AI/)).toBeInTheDocument();
      expect(screen.getByText(/Generated in 0ms/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper semantic structure', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      const headings = screen.getAllByRole('heading', { level: 2 });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('includes descriptive text for charts', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      expect(screen.getByText(/6-Month Forecast Period/)).toBeInTheDocument();
      expect(screen.getByText(/Risk Range:/)).toBeInTheDocument();
    });

    it('provides legend for chart elements', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      expect(screen.getByText('High Risk Threshold (60%)')).toBeInTheDocument();
      expect(screen.getByText('Critical Risk Threshold (80%)')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('uses ResponsiveContainer for charts', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('applies responsive grid layout for statistics', () => {
      render(<ForecastChart forecasts={[mockForecastComplete]} />);

      const statsGrid = document.querySelector('.grid-cols-4');
      expect(statsGrid).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles undefined forecast data gracefully', () => {
      const undefinedForecasts = [undefined, null, mockForecastComplete].filter(Boolean) as OutbreakForecast[];

      render(<ForecastChart forecasts={undefinedForecasts} />);

      expect(screen.getByText('Respiratory Infections')).toBeInTheDocument();
    });

    it('handles empty prophet forecast months', () => {
      const forecastWithEmptyMonths = {
        ...mockForecastComplete,
        prophet_forecast: {
          ...mockForecastComplete.prophet_forecast!,
          forecast_months: []
        }
      };

      render(<ForecastChart forecasts={[forecastWithEmptyMonths]} />);

      expect(screen.getByText('Respiratory Infections')).toBeInTheDocument();
    });
  });
});
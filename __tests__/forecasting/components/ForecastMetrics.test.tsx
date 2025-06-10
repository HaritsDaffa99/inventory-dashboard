import React from 'react';
import { render, screen } from '@testing-library/react';
import { ForecastMetrics } from '@/components/forecasting/forecast-metrics';
import type { ForecastResult } from '@/lib/forecasting/types';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => (
    <div data-testid="card">{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <div data-testid="card-title" className={className}>{children}</div>
  ),
  CardContent: ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <div data-testid="badge" data-variant={variant} className={className}>
      {children}
    </div>
  ),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  TrendingUp: (props: any) => (
    <div data-testid="trending-up-icon" data-props={JSON.stringify(props)} />
  ),
  TrendingDown: (props: any) => (
    <div data-testid="trending-down-icon" data-props={JSON.stringify(props)} />
  ),
  Activity: (props: any) => (
    <div data-testid="activity-icon" data-props={JSON.stringify(props)} />
  ),
  Calendar: (props: any) => (
    <div data-testid="calendar-icon" data-props={JSON.stringify(props)} />
  ),
  BarChart3: (props: any) => (
    <div data-testid="bar-chart-icon" data-props={JSON.stringify(props)} />
  ),
  Target: (props: any) => (
    <div data-testid="target-icon" data-props={JSON.stringify(props)} />
  ),
  CheckCircle: (props: any) => (
    <div data-testid="check-circle-icon" data-props={JSON.stringify(props)} />
  ),
}));

describe('ForecastMetrics', () => {
  // Sample forecast result with complete data
  const mockForecastResult: ForecastResult = {
    success: true,
    model_type: 'Prophet',
    summary: {
      data_points: 24,
      total_forecast: 1500,
      avg_monthly: 125.5,
      historical_avg: 110.2,
      forecast_period: 12
    },
    model_parameters: {
      changepoint_prior_scale: 0.05,
      seasonality_mode: 'multiplicative',
      seasonality_prior_scale: 10.0
    },
    metrics: {
      rmse: 12.34,
      mae: 8.76,
      mape: 7.5,
      train_size: 20,
      test_size: 4,
      accuracy: 92.5,
      trend: 'increasing',
      seasonal_pattern: 'strong'
    },
    forecast: [],
    confidence_intervals: {}
  };

  // Sample with minimal data
  const minimalForecastResult: ForecastResult = {
    success: true,
    model_type: 'ARIMA',
    summary: {
      data_points: 12,
      total_forecast: 800,
      avg_monthly: 66.7,
      historical_avg: 70.0,
      forecast_period: 6
    },
    forecast: [],
    confidence_intervals: {}
  };

  // Sample with zero historical average (edge case)
  const zeroHistoricalResult: ForecastResult = {
    success: true,
    model_type: 'Prophet',
    summary: {
      data_points: 6,
      total_forecast: 300,
      avg_monthly: 50.0,
      historical_avg: 0,
      forecast_period: 6
    },
    forecast: [],
    confidence_intervals: {}
  };

  describe('Component Rendering', () => {
    it('renders main metrics cards', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      // Should render 4 main metric cards
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it('renders with proper layout structure', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      const container = screen.getAllByTestId('card')[0].parentElement?.parentElement;
      expect(container).toHaveClass('space-y-6');
    });
  });

  describe('Main Metrics Display', () => {
    it('displays total forecast correctly', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('Total Forecast')).toBeInTheDocument();
      expect(screen.getByText('1.500')).toBeInTheDocument(); // Component uses dot formatting
      expect(screen.getByText('Next 12 months')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
    });

    it('displays average monthly with trend indicators', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('Avg Monthly')).toBeInTheDocument();
      expect(screen.getByText('125.5')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      
      // Should show upward trend (125.5 > 110.2)
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      expect(screen.getByText('13.9%')).toBeInTheDocument(); // Trend percentage
      expect(screen.getByText('vs historical')).toBeInTheDocument();
    });

    it('displays historical average correctly', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('Historical Avg')).toBeInTheDocument();
      expect(screen.getByText('110.2')).toBeInTheDocument();
      expect(screen.getByText('Based on 24 months')).toBeInTheDocument();
      expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
    });

    it('displays model type information', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('Model Type')).toBeInTheDocument();
      expect(screen.getByText('Prophet')).toBeInTheDocument();
      
      // Use getAllByTestId since there are multiple target icons
      const targetIcons = screen.getAllByTestId('target-icon');
      expect(targetIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Trend Calculation', () => {
    it('shows upward trend when avg_monthly > historical_avg', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      
      // Color should be green for upward trend
      const trendIcon = screen.getByTestId('trending-up-icon');
      const iconProps = JSON.parse(trendIcon.getAttribute('data-props') || '{}');
      expect(iconProps.className).toContain('text-green-500');
    });

    it('shows downward trend when avg_monthly < historical_avg', () => {
      render(<ForecastMetrics forecastResult={minimalForecastResult} />);

      expect(screen.getByTestId('trending-down-icon')).toBeInTheDocument();
      
      // Color should be red for downward trend
      const trendIcon = screen.getByTestId('trending-down-icon');
      const iconProps = JSON.parse(trendIcon.getAttribute('data-props') || '{}');
      expect(iconProps.className).toContain('text-red-500');
    });

    it('calculates trend percentage correctly', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      // (125.5 - 110.2) / 110.2 * 100 = 13.9%
      expect(screen.getByText('13.9%')).toBeInTheDocument();
    });

    it('handles zero historical average', () => {
      render(<ForecastMetrics forecastResult={zeroHistoricalResult} />);

      // Should show 0.0% when historical average is 0
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
  });

  describe('Prophet Model Parameters', () => {
    it('renders Prophet parameters section when model is Prophet', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('Prophet Model Parameters')).toBeInTheDocument();
      expect(screen.getAllByTestId('target-icon')).toHaveLength(2); // One in main metrics, one in parameters
    });

    it('displays changepoint prior scale parameter', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('0.05')).toBeInTheDocument();
      expect(screen.getByText('Changepoint Prior Scale')).toBeInTheDocument();
      expect(screen.getByText('Controls trend flexibility')).toBeInTheDocument();
    });

    it('displays seasonality mode parameter', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('multiplicative')).toBeInTheDocument();
      expect(screen.getByText('Seasonality Mode')).toBeInTheDocument();
      expect(screen.getByText('How seasonal effects are combined')).toBeInTheDocument();
    });

    it('displays seasonality prior scale parameter', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('10')).toBeInTheDocument(); // Should render as "10"
      expect(screen.getByText('Seasonality Prior Scale')).toBeInTheDocument();
      expect(screen.getByText('Controls seasonality strength')).toBeInTheDocument();
    });

    it('does not render Prophet parameters for non-Prophet models', () => {
      render(<ForecastMetrics forecastResult={minimalForecastResult} />);

      expect(screen.queryByText('Prophet Model Parameters')).not.toBeInTheDocument();
      expect(screen.queryByText('Changepoint Prior Scale')).not.toBeInTheDocument();
    });

    it('renders seasonality badge in model type card', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-variant', 'secondary');
      expect(badge).toHaveTextContent('multiplicative seasonality');
    });
  });

  describe('Model Performance Metrics', () => {
    it('renders performance metrics section when metrics are available', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('Model Performance Metrics')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('displays RMSE metric correctly', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('12.34')).toBeInTheDocument();
      expect(screen.getByText('RMSE')).toBeInTheDocument();
      expect(screen.getByText('Root Mean Square Error')).toBeInTheDocument();
    });

    it('displays MAE metric correctly', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('8.76')).toBeInTheDocument();
      expect(screen.getByText('MAE')).toBeInTheDocument();
      expect(screen.getByText('Mean Absolute Error')).toBeInTheDocument();
    });

    it('displays MAPE metric correctly', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('7.5%')).toBeInTheDocument();
      expect(screen.getByText('MAPE')).toBeInTheDocument();
      expect(screen.getByText('Mean Absolute Percentage Error')).toBeInTheDocument();
    });

    it('displays training and validation information', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByText('Model trained on 20 months, validated on 4 months')).toBeInTheDocument();
    });

    it('does not render performance metrics when not available', () => {
      render(<ForecastMetrics forecastResult={minimalForecastResult} />);

      expect(screen.queryByText('Model Performance Metrics')).not.toBeInTheDocument();
      expect(screen.queryByText('RMSE')).not.toBeInTheDocument();
    });
  });

  describe('Data Formatting and Edge Cases', () => {
    it('formats large numbers with dots (component specific formatting)', () => {
      const largeNumberResult = {
        ...mockForecastResult,
        summary: {
          ...mockForecastResult.summary,
          total_forecast: 1234567
        }
      };

      render(<ForecastMetrics forecastResult={largeNumberResult} />);

      // Component uses dot formatting, not comma formatting
      expect(screen.getByText('1.234.567')).toBeInTheDocument();
    });

    it('handles decimal formatting correctly', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      // Average monthly should show 1 decimal place
      expect(screen.getByText('125.5')).toBeInTheDocument();
      expect(screen.getByText('110.2')).toBeInTheDocument();
      
      // RMSE and MAE should show 2 decimal places
      expect(screen.getByText('12.34')).toBeInTheDocument();
      expect(screen.getByText('8.76')).toBeInTheDocument();
      
      // MAPE should show 1 decimal place with %
      expect(screen.getByText('7.5%')).toBeInTheDocument();
    });

    it('handles undefined/null values with renderValue helper', () => {
      const incompleteResult = {
        ...mockForecastResult,
        model_parameters: {
          changepoint_prior_scale: null,
          seasonality_mode: undefined,
          seasonality_prior_scale: 'invalid'
        }
      };

      render(<ForecastMetrics forecastResult={incompleteResult} />);

      // Should render "N/A" for null/undefined values - use getAllByText since there are multiple
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Layout', () => {
    it('uses responsive grid classes for main metrics', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      const mainGrid = screen.getAllByTestId('card')[0].parentElement;
      expect(mainGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-4');
    });

    it('uses responsive grid classes for parameter sections', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      // Find the grid container by looking for elements with grid classes
      const gridElements = document.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-3.gap-4');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('uses semantic card structure', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('card-header').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('card-title').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('card-content').length).toBeGreaterThan(0);
    });

    it('provides descriptive icons for each metric', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('target-icon').length).toBeGreaterThan(0);
    });

    it('uses appropriate color coding for trends', () => {
      render(<ForecastMetrics forecastResult={mockForecastResult} />);

      const trendIcon = screen.getByTestId('trending-up-icon');
      const iconProps = JSON.parse(trendIcon.getAttribute('data-props') || '{}');
      expect(iconProps.className).toContain('text-green-500');
    });
  });

  describe('Props Handling', () => {
    it('accepts and processes forecastResult prop correctly', () => {
      const customResult = {
        ...mockForecastResult,
        summary: {
          ...mockForecastResult.summary,
          total_forecast: 999,
          avg_monthly: 83.25
        }
      };

      render(<ForecastMetrics forecastResult={customResult} />);

      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('83.3')).toBeInTheDocument(); // Rounded to 1 decimal
    });
  });
});
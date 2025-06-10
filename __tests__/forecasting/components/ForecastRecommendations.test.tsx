import React from 'react';
import { render, screen } from '@testing-library/react';
import { ForecastRecommendations } from '@/components/forecasting/forecast-recommendations';
import type { ForecastResult } from '@/lib/forecasting/types';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => (
    <div data-testid="card-title" className={className}>{children}</div>
  ),
  CardContent: ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: any) => (
    <div data-testid="alert" className={className}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => (
    <div data-testid="alert-description">{children}</div>
  ),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Package: () => <div data-testid="package-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  RefreshCw: () => <div data-testid="refresh-cw-icon" />,
}));

describe('ForecastRecommendations', () => {
  const baseForecastResult: ForecastResult = {
    success: true,
    model_type: 'prophet',
    summary: {
      data_points: 24,
      avg_monthly: 150.0,
      historical_avg: 140.0,
    },
    recommendations: {
      safety_stock: 45.5,
      reorder_point: 85.2,
      lead_time_months: 2,
      service_level: '95%',
    },
    forecast_data: [],
    confidence_intervals: {},
  };

  describe('Component Rendering', () => {
    it('renders forecast recommendations with main components', () => {
      render(<ForecastRecommendations forecastResult={baseForecastResult} />);

      // Should render two main cards
      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(2);

      // Should render card headers and content
      expect(screen.getAllByTestId('card-header')).toHaveLength(2);
      expect(screen.getAllByTestId('card-content')).toHaveLength(2);
    });

    it('renders inventory recommendations card', () => {
      render(<ForecastRecommendations forecastResult={baseForecastResult} />);

      expect(screen.getByText('Inventory Recommendations')).toBeInTheDocument();
      // Use getAllByTestId since there are multiple package icons (title + lead time)
      const packageIcons = screen.getAllByTestId('package-icon');
      expect(packageIcons).toHaveLength(2);
    });

    it('renders insights and recommendations card', () => {
      render(<ForecastRecommendations forecastResult={baseForecastResult} />);

      expect(screen.getByText('Insights & Recommendations')).toBeInTheDocument();
      // Check for at least one info icon
      const infoIcons = screen.getAllByTestId('info-icon');
      expect(infoIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Inventory Recommendations Display', () => {
    it('displays safety stock correctly', () => {
      render(<ForecastRecommendations forecastResult={baseForecastResult} />);

      expect(screen.getByText('Safety Stock')).toBeInTheDocument();
      expect(screen.getByText('46')).toBeInTheDocument(); // 45.5 rounded to 0 decimals
      expect(screen.getByText(/Buffer stock for 95% service level/)).toBeInTheDocument();
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
    });

    it('displays reorder point correctly', () => {
      render(<ForecastRecommendations forecastResult={baseForecastResult} />);

      expect(screen.getByText('Reorder Point')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument(); // 85.2 rounded to 0 decimals
      expect(screen.getByText(/Trigger reorder when stock reaches this level/)).toBeInTheDocument();
      expect(screen.getByTestId('refresh-cw-icon')).toBeInTheDocument();
    });

    it('displays lead time correctly', () => {
      render(<ForecastRecommendations forecastResult={baseForecastResult} />);

      expect(screen.getByText('Lead Time')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText(/Months to receive new stock/)).toBeInTheDocument();
      const packageIcons = screen.getAllByTestId('package-icon');
      expect(packageIcons).toHaveLength(2); // One in title, one in lead time
    });

    it('formats decimal values to whole numbers', () => {
      const decimalForecast: ForecastResult = {
        ...baseForecastResult,
        recommendations: {
          safety_stock: 123.789,
          reorder_point: 456.123,
          lead_time_months: 3,
          service_level: '99%',
        },
      };

      render(<ForecastRecommendations forecastResult={decimalForecast} />);

      expect(screen.getByText('124')).toBeInTheDocument(); // 123.789 rounded
      expect(screen.getByText('456')).toBeInTheDocument(); // 456.123 rounded
    });
  });

  describe('Insights Generation - Increasing Demand', () => {
    it('shows increasing demand warning when forecast > 120% of historical', () => {
      const increasingDemandForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 24,
          avg_monthly: 180.0, // 180 > 140 * 1.2 (168)
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={increasingDemandForecast} />);

      expect(screen.getByText('Increasing Demand')).toBeInTheDocument();
      expect(screen.getByText(/Forecasted usage is significantly higher than historical average/)).toBeInTheDocument();
      expect(screen.getByText(/Consider increasing stock levels/)).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });
  });

  describe('Insights Generation - Decreasing Demand', () => {
    it('shows decreasing demand info when forecast < 80% of historical', () => {
      const decreasingDemandForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 24,
          avg_monthly: 100.0, // 100 < 140 * 0.8 (112)
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={decreasingDemandForecast} />);

      expect(screen.getByText('Decreasing Demand')).toBeInTheDocument();
      expect(screen.getByText(/Forecasted usage is lower than historical average/)).toBeInTheDocument();
      expect(screen.getByText(/You may reduce stock levels/)).toBeInTheDocument();
      // Use getAllByTestId since there are multiple info icons (title + alert)
      const infoIcons = screen.getAllByTestId('info-icon');
      expect(infoIcons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Insights Generation - Stable Demand', () => {
    it('shows stable demand success when forecast is within 80-120% of historical', () => {
      const stableDemandForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 24,
          avg_monthly: 140.0, // Exactly equals historical_avg
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={stableDemandForecast} />);

      expect(screen.getByText('Stable Demand')).toBeInTheDocument();
      expect(screen.getByText(/Forecasted usage is consistent with historical patterns/)).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('shows stable demand for borderline cases within range', () => {
      // Test upper boundary (just under 120%)
      const upperBoundaryForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 24,
          avg_monthly: 167.9, // 167.9 < 140 * 1.2 (168)
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={upperBoundaryForecast} />);
      expect(screen.getByText('Stable Demand')).toBeInTheDocument();
    });
  });

  describe('Insights Generation - Limited Data Warning', () => {
    it('shows limited data warning when data points < 12', () => {
      const limitedDataForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 8,
          avg_monthly: 150.0,
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={limitedDataForecast} />);

      expect(screen.getByText('Limited Historical Data')).toBeInTheDocument();
      expect(screen.getByText(/Only 8 months of data available/)).toBeInTheDocument();
      expect(screen.getByText(/Forecast accuracy may be limited/)).toBeInTheDocument();

      // Should show both stable demand and limited data warnings
      const alertTriangleIcons = screen.getAllByTestId('alert-triangle-icon');
      expect(alertTriangleIcons.length).toBeGreaterThan(0);
    });

    it('does not show limited data warning when data points >= 12', () => {
      const adequateDataForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 12,
          avg_monthly: 150.0,
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={adequateDataForecast} />);

      expect(screen.queryByText('Limited Historical Data')).not.toBeInTheDocument();
      expect(screen.queryByText(/months of data available/)).not.toBeInTheDocument();
    });
  });

  describe('Multiple Insights Combination', () => {
    it('shows both increasing demand and limited data warnings', () => {
      const multipleWarningsForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 6, // Limited data
          avg_monthly: 200.0, // Increasing demand (200 > 140 * 1.2)
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={multipleWarningsForecast} />);

      expect(screen.getByText('Increasing Demand')).toBeInTheDocument();
      expect(screen.getByText('Limited Historical Data')).toBeInTheDocument();
      expect(screen.getByText(/Only 6 months of data available/)).toBeInTheDocument();

      // Should have multiple alert components
      const alerts = screen.getAllByTestId('alert');
      expect(alerts).toHaveLength(2);
    });

    it('shows decreasing demand with adequate data', () => {
      const decreasingWithDataForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 18, // Adequate data
          avg_monthly: 100.0, // Decreasing demand (100 < 140 * 0.8)
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={decreasingWithDataForecast} />);

      expect(screen.getByText('Decreasing Demand')).toBeInTheDocument();
      expect(screen.queryByText('Limited Historical Data')).not.toBeInTheDocument();

      // Should have only one alert
      const alerts = screen.getAllByTestId('alert');
      expect(alerts).toHaveLength(1);
    });
  });

  describe('Alert Styling', () => {
    it('applies correct styling for warning alerts', () => {
      const warningForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 6, // This will trigger a warning
          avg_monthly: 150.0,
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={warningForecast} />);

      const alerts = screen.getAllByTestId('alert');
      const warningAlert = alerts.find(alert => 
        alert.className.includes('border-orange-200') && 
        alert.className.includes('bg-orange-50')
      );
      expect(warningAlert).toBeInTheDocument();
    });

    it('applies correct styling for success alerts', () => {
      const successForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 24, // Adequate data
          avg_monthly: 140.0, // Stable demand
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={successForecast} />);

      const alerts = screen.getAllByTestId('alert');
      const successAlert = alerts.find(alert => 
        alert.className.includes('border-green-200') && 
        alert.className.includes('bg-green-50')
      );
      expect(successAlert).toBeInTheDocument();
    });

    it('applies correct styling for info alerts', () => {
      const infoForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 24,
          avg_monthly: 100.0, // Decreasing demand (info type)
          historical_avg: 140.0,
        },
      };

      render(<ForecastRecommendations forecastResult={infoForecast} />);

      const alerts = screen.getAllByTestId('alert');
      const infoAlert = alerts.find(alert => 
        alert.className.includes('border-blue-200') && 
        alert.className.includes('bg-blue-50')
      );
      expect(infoAlert).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values gracefully', () => {
      const zeroValuesForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 0,
          avg_monthly: 0,
          historical_avg: 0,
        },
        recommendations: {
          safety_stock: 0,
          reorder_point: 0,
          lead_time_months: 0,
          service_level: '95%',
        },
      };

      render(<ForecastRecommendations forecastResult={zeroValuesForecast} />);

      // Use getAllByText since there are multiple "0" values (safety stock, reorder point, lead time)
      const zeroValues = screen.getAllByText('0');
      expect(zeroValues).toHaveLength(3); // safety_stock, reorder_point, lead_time_months
      expect(screen.getByText('Limited Historical Data')).toBeInTheDocument();
    });

    it('handles missing summary properties', () => {
      const missingSummaryForecast: ForecastResult = {
        ...baseForecastResult,
        summary: {
          data_points: 24,
          // Missing avg_monthly and historical_avg
        } as any,
      };

      render(<ForecastRecommendations forecastResult={missingSummaryForecast} />);

      // Should still render the component structure
      expect(screen.getByText('Inventory Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Insights & Recommendations')).toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      const largeNumbersForecast: ForecastResult = {
        ...baseForecastResult,
        recommendations: {
          safety_stock: 999999.9,
          reorder_point: 1234567.8,
          lead_time_months: 999,
          service_level: '99.9%',
        },
      };

      render(<ForecastRecommendations forecastResult={largeNumbersForecast} />);

      expect(screen.getByText('1000000')).toBeInTheDocument(); // 999999.9 rounded
      expect(screen.getByText('1234568')).toBeInTheDocument(); // 1234567.8 rounded
      expect(screen.getByText('999')).toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('uses responsive grid layout for inventory metrics', () => {
      const { container } = render(<ForecastRecommendations forecastResult={baseForecastResult} />);

      const gridContainer = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic structure with proper headings', () => {
      render(<ForecastRecommendations forecastResult={baseForecastResult} />);

      expect(screen.getByText('Safety Stock')).toBeInTheDocument();
      expect(screen.getByText('Reorder Point')).toBeInTheDocument();
      expect(screen.getByText('Lead Time')).toBeInTheDocument();
    });

    it('provides descriptive text for each metric', () => {
      render(<ForecastRecommendations forecastResult={baseForecastResult} />);

      expect(screen.getByText(/Buffer stock for 95% service level/)).toBeInTheDocument();
      expect(screen.getByText(/Trigger reorder when stock reaches this level/)).toBeInTheDocument();
      expect(screen.getByText(/Months to receive new stock/)).toBeInTheDocument();
    });
  });
});
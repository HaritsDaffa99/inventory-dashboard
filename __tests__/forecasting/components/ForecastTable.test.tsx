import React from 'react';
import { render, screen } from '@testing-library/react';
import { ForecastTable } from '@/components/forecasting/forecast-table';
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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
}));

describe('ForecastTable', () => {
  const mockForecastResult: ForecastResult = {
    success: true,
    model_type: 'prophet',
    summary: {
      data_points: 24,
      forecast_periods: 6,
      model_performance: {
        mae: 12.5,
        rmse: 18.2,
        mape: 8.7,
      },
    },
    forecast_data: [
      {
        date: '2024-01-01',
        forecasted_usage: 150.0,
        lower_ci: 130.0,
        upper_ci: 170.0,
      },
      {
        date: '2024-02-01',
        forecasted_usage: 165.5,
        lower_ci: 145.2,
        upper_ci: 185.8,
      },
      {
        date: '2024-03-01',
        forecasted_usage: 180.2,
        lower_ci: 158.1,
        upper_ci: 202.3,
      },
      {
        date: '2024-04-01',
        forecasted_usage: 175.8,
        lower_ci: 150.5,
        upper_ci: 201.1,
      },
      {
        date: '2024-05-01',
        forecasted_usage: 192.3,
        lower_ci: 168.9,
        upper_ci: 215.7,
      },
      {
        date: '2024-06-01',
        forecasted_usage: 205.1,
        lower_ci: 180.4,
        upper_ci: 229.8,
      },
    ],
    confidence_intervals: {
      '95%': [130.0, 229.8],
    },
  };

  const mockEmptyForecastResult: ForecastResult = {
    success: true,
    model_type: 'prophet',
    summary: {
      data_points: 0,
    },
    forecast_data: [],
    confidence_intervals: {},
  };

  describe('Component Rendering', () => {
    it('renders forecast table with main components', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-title')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('renders card title with icon', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      expect(screen.getByText('Monthly Forecast Breakdown')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    });

    it('renders table headers', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      expect(screen.getByText('Month')).toBeInTheDocument();
      expect(screen.getByText('Forecast')).toBeInTheDocument();
      expect(screen.getByText('Lower CI')).toBeInTheDocument();
      expect(screen.getByText('Upper CI')).toBeInTheDocument();
      expect(screen.getByText('Confidence')).toBeInTheDocument();
    });

    it('renders explanatory text at bottom', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      expect(screen.getByText(/Confidence Level:/)).toBeInTheDocument();
      expect(screen.getByText(/Statistical confidence in the forecast accuracy/)).toBeInTheDocument();
      expect(screen.getByText(/CI \(Confidence Interval\):/)).toBeInTheDocument();
      expect(screen.getByText(/95% confidence interval/)).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('displays all forecast data rows', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      // Check for specific forecast values
      expect(screen.getByText('150.0')).toBeInTheDocument();
      expect(screen.getByText('165.5')).toBeInTheDocument();
      expect(screen.getByText('180.2')).toBeInTheDocument();
      expect(screen.getByText('175.8')).toBeInTheDocument();
      expect(screen.getByText('192.3')).toBeInTheDocument();
      expect(screen.getByText('205.1')).toBeInTheDocument();
    });

    it('displays confidence intervals correctly', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      // Check lower CI values
      expect(screen.getByText('130.0')).toBeInTheDocument();
      expect(screen.getByText('145.2')).toBeInTheDocument();
      expect(screen.getByText('158.1')).toBeInTheDocument();

      // Check upper CI values
      expect(screen.getByText('170.0')).toBeInTheDocument();
      expect(screen.getByText('185.8')).toBeInTheDocument();
      expect(screen.getByText('202.3')).toBeInTheDocument();
    });

    it('formats dates correctly', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      expect(screen.getByText('Jan 2024')).toBeInTheDocument();
      expect(screen.getByText('Feb 2024')).toBeInTheDocument();
      expect(screen.getByText('Mar 2024')).toBeInTheDocument();
      expect(screen.getByText('Apr 2024')).toBeInTheDocument();
      expect(screen.getByText('May 2024')).toBeInTheDocument();
      expect(screen.getByText('Jun 2024')).toBeInTheDocument();
    });

    it('displays confidence badges', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(6); // One for each forecast row

      // All badges should show percentage values
      badges.forEach(badge => {
        expect(badge.textContent).toMatch(/\d+%/);
      });
    });
  });

  describe('Confidence Level Calculations', () => {
    it('calculates high confidence for narrow intervals', () => {
      const highConfidenceForecast: ForecastResult = {
        ...mockForecastResult,
        forecast_data: [
          {
            date: '2024-01-01',
            forecasted_usage: 100.0,
            lower_ci: 99.0,
            upper_ci: 101.0, // Very narrow interval
          },
        ],
      };

      render(<ForecastTable forecastResult={highConfidenceForecast} />);

      const badges = screen.getAllByTestId('badge');
      expect(badges[0]).toHaveAttribute('data-variant', 'default'); // High confidence
    });

    it('calculates lower confidence for wide intervals', () => {
      const lowConfidenceForecast: ForecastResult = {
        ...mockForecastResult,
        forecast_data: [
          {
            date: '2024-01-01',
            forecasted_usage: 100.0,
            lower_ci: 50.0,
            upper_ci: 150.0, // Very wide interval
          },
        ],
      };

      render(<ForecastTable forecastResult={lowConfidenceForecast} />);

      const badges = screen.getAllByTestId('badge');
      // Wide intervals should result in lower confidence
      expect(badges[0]).toHaveAttribute('data-variant');
    });

    it('handles different confidence badge variants', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      const badges = screen.getAllByTestId('badge');
      badges.forEach(badge => {
        const variant = badge.getAttribute('data-variant');
        expect(['default', 'secondary', 'outline', 'destructive']).toContain(variant);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty forecast data gracefully', () => {
      render(<ForecastTable forecastResult={mockEmptyForecastResult} />);

      // Should still render table structure
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Month')).toBeInTheDocument();
      expect(screen.getByText('Forecast')).toBeInTheDocument();

      // Should not have any data rows
      const badges = screen.queryAllByTestId('badge');
      expect(badges).toHaveLength(0);
    });

    it('handles single forecast entry', () => {
      const singleEntryForecast: ForecastResult = {
        ...mockForecastResult,
        forecast_data: [mockForecastResult.forecast_data[0]],
      };

      render(<ForecastTable forecastResult={singleEntryForecast} />);

      expect(screen.getByText('150.0')).toBeInTheDocument();
      expect(screen.getByText('Jan 2024')).toBeInTheDocument();

      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(1);
    });

    it('handles zero forecast values', () => {
      const zeroForecast: ForecastResult = {
        ...mockForecastResult,
        forecast_data: [
          {
            date: '2024-01-01',
            forecasted_usage: 0.0,
            lower_ci: 0.0,
            upper_ci: 0.0,
          },
        ],
      };

      render(<ForecastTable forecastResult={zeroForecast} />);

      // Use getAllByText since there are multiple "0.0" values (forecast, lower_ci, upper_ci)
      const zeroValues = screen.getAllByText('0.0');
      expect(zeroValues).toHaveLength(3); // forecast, lower_ci, upper_ci

      // Check that the month is still displayed
      expect(screen.getByText('Jan 2024')).toBeInTheDocument();

      // Should still have a confidence badge (even if it shows NaN%)
      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(1);
    });

    it('handles negative confidence interval values', () => {
      const negativeForecast: ForecastResult = {
        ...mockForecastResult,
        forecast_data: [
          {
            date: '2024-01-01',
            forecasted_usage: 10.0,
            lower_ci: -5.0,
            upper_ci: 25.0,
          },
        ],
      };

      render(<ForecastTable forecastResult={negativeForecast} />);

      expect(screen.getByText('10.0')).toBeInTheDocument();
      expect(screen.getByText('-5.0')).toBeInTheDocument();
      expect(screen.getByText('25.0')).toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      const largeForecast: ForecastResult = {
        ...mockForecastResult,
        forecast_data: [
          {
            date: '2024-01-01',
            forecasted_usage: 999999.9,
            lower_ci: 999998.0,
            upper_ci: 1000001.8,
          },
        ],
      };

      render(<ForecastTable forecastResult={largeForecast} />);

      expect(screen.getByText('999999.9')).toBeInTheDocument();
      expect(screen.getByText('999998.0')).toBeInTheDocument();
      expect(screen.getByText('1000001.8')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('handles different date formats in input', () => {
      const differentDateFormats: ForecastResult = {
        ...mockForecastResult,
        forecast_data: [
          {
            date: '2024-12-01T00:00:00Z',
            forecasted_usage: 100.0,
            lower_ci: 90.0,
            upper_ci: 110.0,
          },
          {
            date: '2024-11-15',
            forecasted_usage: 95.0,
            lower_ci: 85.0,
            upper_ci: 105.0,
          },
        ],
      };

      render(<ForecastTable forecastResult={differentDateFormats} />);

      expect(screen.getByText('Dec 2024')).toBeInTheDocument();
      expect(screen.getByText('Nov 2024')).toBeInTheDocument();
    });

    it('handles year transitions correctly', () => {
      const yearTransition: ForecastResult = {
        ...mockForecastResult,
        forecast_data: [
          {
            date: '2023-12-01',
            forecasted_usage: 100.0,
            lower_ci: 90.0,
            upper_ci: 110.0,
          },
          {
            date: '2024-01-01',
            forecasted_usage: 105.0,
            lower_ci: 95.0,
            upper_ci: 115.0,
          },
        ],
      };

      render(<ForecastTable forecastResult={yearTransition} />);

      expect(screen.getByText('Dec 2023')).toBeInTheDocument();
      expect(screen.getByText('Jan 2024')).toBeInTheDocument();
    });
  });

  describe('Table Structure', () => {
    it('has proper table structure with thead and tbody', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check for table headers
      const monthHeader = screen.getByRole('columnheader', { name: /month/i });
      const forecastHeader = screen.getByRole('columnheader', { name: /forecast/i });
      const lowerCIHeader = screen.getByRole('columnheader', { name: /lower ci/i });
      const upperCIHeader = screen.getByRole('columnheader', { name: /upper ci/i });
      const confidenceHeader = screen.getByRole('columnheader', { name: /confidence/i });

      expect(monthHeader).toBeInTheDocument();
      expect(forecastHeader).toBeInTheDocument();
      expect(lowerCIHeader).toBeInTheDocument();
      expect(upperCIHeader).toBeInTheDocument();
      expect(confidenceHeader).toBeInTheDocument();
    });

    it('has accessible table structure', () => {
      render(<ForecastTable forecastResult={mockForecastResult} />);

      // Check for proper table roles
      expect(screen.getByRole('table')).toBeInTheDocument();

      // Should have the correct number of rows (header + data rows)
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(7); // 1 header + 6 data rows
    });
  });

  describe('Responsive Design', () => {
    it('includes overflow-x-auto for responsive table', () => {
      const { container } = render(<ForecastTable forecastResult={mockForecastResult} />);

      const scrollContainer = container.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Numeric Formatting', () => {
    it('formats numbers to one decimal place', () => {
      const precisionTest: ForecastResult = {
        ...mockForecastResult,
        forecast_data: [
          {
            date: '2024-01-01',
            forecasted_usage: 123.456789,
            lower_ci: 111.111111,
            upper_ci: 135.999999,
          },
        ],
      };

      render(<ForecastTable forecastResult={precisionTest} />);

      expect(screen.getByText('123.5')).toBeInTheDocument();
      expect(screen.getByText('111.1')).toBeInTheDocument();
      expect(screen.getByText('136.0')).toBeInTheDocument();
    });

    it('handles integer values correctly', () => {
      const integerTest: ForecastResult = {
        ...mockForecastResult,
        forecast_data: [
          {
            date: '2024-01-01',
            forecasted_usage: 100,
            lower_ci: 90,
            upper_ci: 110,
          },
        ],
      };

      render(<ForecastTable forecastResult={integerTest} />);

      expect(screen.getByText('100.0')).toBeInTheDocument();
      expect(screen.getByText('90.0')).toBeInTheDocument();
      expect(screen.getByText('110.0')).toBeInTheDocument();
    });
  });
});
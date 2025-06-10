import React from 'react';
import { render, screen } from '@testing-library/react';
import { ForecastChart } from '@/components/forecasting/forecast-chart';
import type { ForecastResult } from '@/lib/forecasting/types';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children, data, margin, style }: any) => (
    <div 
      data-testid="composed-chart"
      data-chart-data={JSON.stringify(data)}
      data-margin={JSON.stringify(margin)}
      style={style}
    >
      {children}
    </div>
  ),
  CartesianGrid: (props: any) => (
    <div data-testid="cartesian-grid" data-props={JSON.stringify(props)} />
  ),
  XAxis: (props: any) => (
    <div data-testid="x-axis" data-props={JSON.stringify(props)} />
  ),
  YAxis: (props: any) => (
    <div data-testid="y-axis" data-props={JSON.stringify(props)} />
  ),
  Tooltip: (props: any) => {
    // Store the formatter function separately and create a test indicator
    const hasFormatter = typeof props.formatter === 'function';
    const serializableProps = {
      ...props,
      formatter: hasFormatter ? 'function' : undefined,
      hasCustomFormatter: hasFormatter
    };
    
    // Store the actual formatter for testing
    if (hasFormatter) {
      (global as any).tooltipFormatter = props.formatter;
    }
    
    return (
      <div 
        data-testid="tooltip" 
        data-props={JSON.stringify(serializableProps)}
        data-has-formatter={hasFormatter}
      />
    );
  },
  Legend: () => <div data-testid="legend" />,
  Line: (props: any) => (
    <div data-testid="line" data-props={JSON.stringify(props)} />
  ),
  Area: (props: any) => (
    <div data-testid="area" data-props={JSON.stringify(props)} />
  ),
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => (
    <div data-testid="card">{children}</div>
  ),
  CardHeader: ({ children }: any) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <div data-testid="card-title" className={className}>{children}</div>
  ),
  CardContent: ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  TrendingUp: (props: any) => (
    <div data-testid="trending-up-icon" data-props={JSON.stringify(props)} />
  ),
}));

describe('ForecastChart', () => {
  // Sample forecast result data for testing
  const mockForecastResult: ForecastResult = {
    success: true,
    model_type: 'prophet',
    summary: { data_points: 24 },
    historical_data: [
      {
        date: '2024-01-01',
        usage: 100
      },
      {
        date: '2024-02-01',
        usage: 120
      },
      {
        date: '2024-03-01',
        usage: 110
      }
    ],
    forecast_data: [
      {
        date: '2024-04-01',
        forecasted_usage: 115,
        lower_ci: 105,
        upper_ci: 125
      },
      {
        date: '2024-05-01',
        forecasted_usage: 130,
        lower_ci: 120,
        upper_ci: 140
      }
    ],
    forecast: [],
    confidence_intervals: {},
    metrics: {
      accuracy: 85.5,
      trend: 'increasing',
      seasonal_pattern: 'strong'
    }
  };

  const emptyForecastResult: ForecastResult = {
    success: true,
    model_type: 'prophet',
    summary: { data_points: 0 },
    historical_data: [],
    forecast_data: [],
    forecast: [],
    confidence_intervals: {},
    metrics: {
      accuracy: 0,
      trend: 'stable',
      seasonal_pattern: 'none'
    }
  };

  beforeEach(() => {
    // Clear the global formatter before each test
    delete (global as any).tooltipFormatter;
  });

  describe('Component Rendering', () => {
    it('renders forecast chart with all components', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-title')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('renders chart title with icon', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      expect(screen.getByText('Prophet Forecast Chart')).toBeInTheDocument();
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      
      const cardTitle = screen.getByTestId('card-title');
      expect(cardTitle).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('renders responsive container with proper dimensions', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      
      // Check container wrapper has correct classes
      const container = screen.getByTestId('responsive-container').parentElement;
      expect(container).toHaveClass('h-96', 'w-full', 'overflow-hidden');
    });
  });

  describe('Chart Components', () => {
    it('renders all chart components', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('renders line components for historical and forecast data', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(2); // Historical and forecast lines
      
      // Check historical line props
      const historicalLine = lines[0];
      const historicalProps = JSON.parse(historicalLine.getAttribute('data-props') || '{}');
      expect(historicalProps.dataKey).toBe('historical');
      expect(historicalProps.name).toBe('Historical Usage');
      expect(historicalProps.connectNulls).toBe(false);
      
      // Check forecast line props
      const forecastLine = lines[1];
      const forecastProps = JSON.parse(forecastLine.getAttribute('data-props') || '{}');
      expect(forecastProps.dataKey).toBe('forecast');
      expect(forecastProps.name).toBe('Prophet Forecast');
      expect(forecastProps.strokeDasharray).toBe('5 5');
    });

    it('renders area components for confidence intervals', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const areas = screen.getAllByTestId('area');
      expect(areas).toHaveLength(2); // Upper and lower CI areas
      
      // Check upper CI area
      const upperArea = areas[0];
      const upperProps = JSON.parse(upperArea.getAttribute('data-props') || '{}');
      expect(upperProps.dataKey).toBe('upper_ci');
      expect(upperProps.stackId).toBe('1');
      expect(upperProps.name).toBe('Upper CI');
      
      // Check lower CI area
      const lowerArea = areas[1];
      const lowerProps = JSON.parse(lowerArea.getAttribute('data-props') || '{}');
      expect(lowerProps.dataKey).toBe('lower_ci');
      expect(lowerProps.stackId).toBe('1');
      expect(lowerProps.name).toBe('Lower CI');
    });
  });

  describe('Chart Configuration', () => {
    it('configures ComposedChart with correct props', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const chart = screen.getByTestId('composed-chart');
      const margin = JSON.parse(chart.getAttribute('data-margin') || '{}');
      
      expect(margin).toEqual({ top: 20, right: 30, left: 20, bottom: 5 });
      expect(chart.style.overflow).toBe('visible');
    });

    it('configures X-axis with correct formatting', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const xAxis = screen.getByTestId('x-axis');
      const props = JSON.parse(xAxis.getAttribute('data-props') || '{}');
      
      expect(props.dataKey).toBe('date');
      expect(props.tick.fontSize).toBe(12);
      expect(props.angle).toBe(-45);
      expect(props.textAnchor).toBe('end');
      expect(props.height).toBe(60);
    });

    it('configures Y-axis with correct formatting', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const yAxis = screen.getByTestId('y-axis');
      const props = JSON.parse(yAxis.getAttribute('data-props') || '{}');
      
      expect(props.tick.fontSize).toBe(12);
    });

    it('configures CartesianGrid with correct styling', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const grid = screen.getByTestId('cartesian-grid');
      const props = JSON.parse(grid.getAttribute('data-props') || '{}');
      
      expect(props.strokeDasharray).toBe('3 3');
      expect(props.className).toBe('opacity-30');
    });

    it('configures Tooltip with correct styling', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const tooltip = screen.getByTestId('tooltip');
      const props = JSON.parse(tooltip.getAttribute('data-props') || '{}');
      
      expect(props.contentStyle).toEqual({
        backgroundColor: "hsl(var(--background))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "6px",
      });
      
      // Check that formatter is present
      expect(props.hasCustomFormatter).toBe(true);
      expect(props.formatter).toBe('function');
    });
  });

  describe('Data Processing', () => {
    it('processes and combines historical and forecast data correctly', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const chart = screen.getByTestId('composed-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      // Should have 5 data points (3 historical + 2 forecast)
      expect(chartData).toHaveLength(5);
      
      // Check historical data structure
      const historicalPoint = chartData[0];
      expect(historicalPoint.historical).toBe(100);
      expect(historicalPoint.forecast).toBeNull();
      expect(historicalPoint.type).toBe('historical');
      expect(historicalPoint.date).toBe('Jan 2024');
      
      // Check forecast data structure
      const forecastPoint = chartData[3];
      expect(forecastPoint.historical).toBeNull();
      expect(forecastPoint.forecast).toBe(115);
      expect(forecastPoint.lower_ci).toBe(105);
      expect(forecastPoint.upper_ci).toBe(125);
      expect(forecastPoint.type).toBe('forecast');
      expect(forecastPoint.date).toBe('Apr 2024');
    });

    it('handles date formatting correctly', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const chart = screen.getByTestId('composed-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      // Verify date formatting
      expect(chartData[0].date).toBe('Jan 2024');
      expect(chartData[1].date).toBe('Feb 2024');
      expect(chartData[2].date).toBe('Mar 2024');
    });

    it('handles empty data gracefully', () => {
      render(<ForecastChart forecastResult={emptyForecastResult} />);

      const chart = screen.getByTestId('composed-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(0);
    });
  });

  describe('Legend and Visual Elements', () => {
    it('renders legend indicators with correct styling', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      // Check legend text
      expect(screen.getByText('Historical Data')).toBeInTheDocument();
      expect(screen.getByText('Prophet Forecast')).toBeInTheDocument();
      expect(screen.getByText('95% Confidence Interval')).toBeInTheDocument();
      
      // Check legend container styling
      const legendContainer = screen.getByText('Historical Data').parentElement?.parentElement;
      expect(legendContainer).toHaveClass('mt-4', 'flex', 'items-center', 'gap-4', 'text-sm', 'text-muted-foreground');
    });

    it('renders color indicators for legend items', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      // Find all legend color indicators
      const indicators = screen.getAllByRole('generic').filter(el => 
        el.className.includes('w-3') && el.className.includes('h-3') && el.className.includes('rounded-full')
      );
      
      expect(indicators.length).toBeGreaterThanOrEqual(3);
      
      // Check specific color classes
      const primaryIndicator = indicators.find(el => el.className.includes('bg-primary'));
      const destructiveIndicator = indicators.find(el => el.className.includes('bg-destructive'));
      const ciIndicator = indicators.find(el => el.className.includes('bg-destructive/20'));
      
      expect(primaryIndicator).toBeInTheDocument();
      expect(destructiveIndicator).toBeInTheDocument();
      expect(ciIndicator).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('uses responsive container for chart', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });

    it('sets correct height and overflow properties', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const chartWrapper = screen.getByTestId('responsive-container').parentElement;
      expect(chartWrapper).toHaveClass('h-96', 'w-full', 'overflow-hidden');
    });
  });

  describe('Tooltip Functionality', () => {
    it('has custom tooltip formatter', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      const tooltip = screen.getByTestId('tooltip');
      
      // Check that the tooltip has a custom formatter
      expect(tooltip).toHaveAttribute('data-has-formatter', 'true');
      
      // Get the actual formatter function from global storage
      const formatter = (global as any).tooltipFormatter;
      expect(typeof formatter).toBe('function');
      
      // Test formatter function
      // Test null value handling
      expect(formatter(null, 'test')).toEqual([null, 'test']);
      
      // Test number formatting
      expect(formatter(123.456, 'usage')).toEqual(['123.46', 'usage']);
      expect(formatter(100, 'forecast')).toEqual(['100.00', 'forecast']);
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML structure', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('provides descriptive chart title', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      expect(screen.getByText('Prophet Forecast Chart')).toBeInTheDocument();
    });

    it('includes visual legend for chart interpretation', () => {
      render(<ForecastChart forecastResult={mockForecastResult} />);

      expect(screen.getByText('Historical Data')).toBeInTheDocument();
      expect(screen.getByText('Prophet Forecast')).toBeInTheDocument();
      expect(screen.getByText('95% Confidence Interval')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('accepts and uses forecastResult prop correctly', () => {
      const customResult = {
        ...mockForecastResult,
        historical_data: [
          { date: '2024-06-01', usage: 200 }
        ],
        forecast_data: [
          { date: '2024-07-01', forecasted_usage: 250, lower_ci: 240, upper_ci: 260 }
        ]
      };

      render(<ForecastChart forecastResult={customResult} />);

      const chart = screen.getByTestId('composed-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData[0].historical).toBe(200);
      expect(chartData[1].forecast).toBe(250);
    });
  });
});
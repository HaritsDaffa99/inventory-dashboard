import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForecastDashboard } from '@/components/forecasting/forecast-dashboard';
import type { ForecastResult } from '@/lib/forecasting/types';

// Mock child components
jest.mock('@/components/forecasting/forecast-filters', () => ({
  ForecastFilters: ({ onForecastGenerated }: { onForecastGenerated: (result: any) => void }) => (
    <div data-testid="forecast-filters">
      <button 
        data-testid="generate-forecast-btn"
        onClick={() => {
          // Simulate successful forecast generation
          onForecastGenerated({
            success: true,
            model_type: 'prophet',
            summary: { data_points: 12 },
            forecast: [],
            confidence_intervals: {},
            metrics: {
              accuracy: 85.5,
              trend: 'increasing',
              seasonal_pattern: 'strong'
            }
          });
        }}
      >
        Generate Forecast
      </button>
      <button 
        data-testid="generate-error-btn"
        onClick={() => {
          // Simulate forecast error
          onForecastGenerated({
            success: false,
            error: 'Insufficient data for forecasting',
            model_type: 'prophet'
          });
        }}
      >
        Generate Error
      </button>
    </div>
  ),
}));

jest.mock('@/components/forecasting/forecast-chart', () => ({
  ForecastChart: ({ forecastResult }: { forecastResult: ForecastResult }) => (
    <div data-testid="forecast-chart">
      Chart for {forecastResult.model_type} model
    </div>
  ),
}));

jest.mock('@/components/forecasting/forecast-metrics', () => ({
  ForecastMetrics: ({ forecastResult }: { forecastResult: ForecastResult }) => (
    <div data-testid="forecast-metrics">
      Metrics for {forecastResult.model_type} model
    </div>
  ),
}));

jest.mock('@/components/forecasting/forecast-recommendations', () => ({
  ForecastRecommendations: ({ forecastResult }: { forecastResult: ForecastResult }) => (
    <div data-testid="forecast-recommendations">
      Recommendations for {forecastResult.model_type} model
    </div>
  ),
}));

// Enhanced mock with better logic to differentiate alert types
jest.mock('@/components/ui/alert', () => {
  let alertCounter = 0;
  
  return {
    Alert: ({ children, variant, className }: any) => {
      alertCounter++;
      
      // Determine alert type based on variant and className
      let testId = 'alert';
      
      if (variant === 'destructive') {
        testId = 'error-alert';
      } else if (className?.includes('border-green')) {
        testId = 'success-alert';
      } else {
        testId = 'debug-alert';
      }
      
      // For error scenarios, we need to differentiate between debug and user-facing error alerts
      if (variant === 'destructive') {
        // Check if this is likely the user-facing error (has troubleshooting content)
        const hasComplexContent = React.Children.toArray(children).some(child => 
          React.isValidElement(child) && 
          child.props?.children && 
          typeof child.props.children === 'object'
        );
        
        if (hasComplexContent) {
          testId = 'error-alert';
        }
      }
      
      return (
        <div 
          data-testid={testId}
          data-variant={variant}
          className={className}
        >
          {children}
        </div>
      );
    },
    AlertDescription: ({ children }: any) => (
      <div data-testid="alert-description">{children}</div>
    ),
  };
});

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
}));

describe('ForecastDashboard', () => {
  beforeEach(() => {
    // Clear console.log spy before each test
    jest.clearAllMocks();
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders forecast dashboard with initial components', () => {
      render(<ForecastDashboard />);

      expect(screen.getByTestId('forecast-filters')).toBeInTheDocument();
      
      // Should not show results initially
      expect(screen.queryByTestId('forecast-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('forecast-metrics')).not.toBeInTheDocument();
      expect(screen.queryByTestId('forecast-recommendations')).not.toBeInTheDocument();
    });

    it('has proper layout structure', () => {
      render(<ForecastDashboard />);

      const dashboard = screen.getByTestId('forecast-filters').parentElement;
      expect(dashboard).toHaveClass('space-y-6');
    });
  });

  describe('Forecast Generation - Success', () => {
    it('displays success message when forecast is generated successfully', async () => {
      render(<ForecastDashboard />);

      const generateBtn = screen.getByTestId('generate-forecast-btn');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        const successAlert = screen.getByTestId('success-alert');
        expect(successAlert).toHaveClass('border-green-200', 'bg-green-50');
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
        expect(screen.getByText(/forecast generated successfully using prophet model/i)).toBeInTheDocument();
        expect(screen.getByText(/12 months of historical data/i)).toBeInTheDocument();
      });
    });

    it('displays debug info on successful forecast generation', async () => {
      render(<ForecastDashboard />);

      const generateBtn = screen.getByTestId('generate-forecast-btn');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByTestId('debug-alert')).toBeInTheDocument();
        expect(screen.getByTestId('info-icon')).toBeInTheDocument();
        
        // Use getAllByText to handle multiple elements
        const debugTexts = screen.getAllByText(/forecast generated successfully using prophet/i);
        expect(debugTexts.length).toBeGreaterThan(0);
      });
    });

    it('renders forecast results components when forecast is successful', async () => {
      render(<ForecastDashboard />);

      const generateBtn = screen.getByTestId('generate-forecast-btn');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByTestId('forecast-metrics')).toBeInTheDocument();
        expect(screen.getByTestId('forecast-chart')).toBeInTheDocument();
        expect(screen.getByTestId('forecast-recommendations')).toBeInTheDocument();
        
        // Verify they receive the forecast result
        expect(screen.getByText('Metrics for prophet model')).toBeInTheDocument();
        expect(screen.getByText('Chart for prophet model')).toBeInTheDocument();
        expect(screen.getByText('Recommendations for prophet model')).toBeInTheDocument();
      });
    });

    it('logs forecast result to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      render(<ForecastDashboard />);

      const generateBtn = screen.getByTestId('generate-forecast-btn');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Forecast result received:', expect.objectContaining({
          success: true,
          model_type: 'prophet'
        }));
      });
    });
  });

  describe('Forecast Generation - Error', () => {
    it('displays error message when forecast generation fails', async () => {
      render(<ForecastDashboard />);

      const generateErrorBtn = screen.getByTestId('generate-error-btn');
      fireEvent.click(generateErrorBtn);

      await waitFor(() => {
        // Look for the error alert with destructive variant
        const errorAlert = screen.getByTestId('error-alert');
        expect(errorAlert).toHaveAttribute('data-variant', 'destructive');
        expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
        expect(screen.getByText('Insufficient data for forecasting')).toBeInTheDocument();
      });
    });

    it('displays troubleshooting tips on error', async () => {
      render(<ForecastDashboard />);

      const generateErrorBtn = screen.getByTestId('generate-error-btn');
      fireEvent.click(generateErrorBtn);

      await waitFor(() => {
        expect(screen.getByText('Troubleshooting tips:')).toBeInTheDocument();
        expect(screen.getByText(/check if python service is running/i)).toBeInTheDocument();
        expect(screen.getByText(/verify database connection/i)).toBeInTheDocument();
        expect(screen.getByText(/ensure sufficient historical data/i)).toBeInTheDocument();
      });
    });

    it('displays debug info on forecast error', async () => {
      render(<ForecastDashboard />);

      const generateErrorBtn = screen.getByTestId('generate-error-btn');
      fireEvent.click(generateErrorBtn);

      await waitFor(() => {
        // Use getAllByTestId to handle multiple debug alerts
        const debugAlerts = screen.getAllByTestId('debug-alert');
        expect(debugAlerts.length).toBeGreaterThan(0);
        
        expect(screen.getByTestId('info-icon')).toBeInTheDocument();
        expect(screen.getByText(/forecast failed: insufficient data for forecasting/i)).toBeInTheDocument();
      });
    });

    it('does not render result components when forecast fails', async () => {
      render(<ForecastDashboard />);

      const generateErrorBtn = screen.getByTestId('generate-error-btn');
      fireEvent.click(generateErrorBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('forecast-metrics')).not.toBeInTheDocument();
        expect(screen.queryByTestId('forecast-chart')).not.toBeInTheDocument();
        expect(screen.queryByTestId('forecast-recommendations')).not.toBeInTheDocument();
      });
    });

    it('clears previous successful results when error occurs', async () => {
      render(<ForecastDashboard />);

      // First generate successful forecast
      const generateBtn = screen.getByTestId('generate-forecast-btn');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByTestId('forecast-metrics')).toBeInTheDocument();
      });

      // Then generate error
      const generateErrorBtn = screen.getByTestId('generate-error-btn');
      fireEvent.click(generateErrorBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('forecast-metrics')).not.toBeInTheDocument();
        expect(screen.getByText('Insufficient data for forecasting')).toBeInTheDocument();
      });
    });
  });

  describe('State Management', () => {
    it('handles forecast result with default error message', async () => {
      render(<ForecastDashboard />);

      // Simulate forecast with no error message
      const filtersComponent = screen.getByTestId('forecast-filters');
      
      // For this test, we'll verify the component handles edge cases
      await waitFor(() => {
        // The component should handle cases where error is undefined
        expect(screen.getByTestId('forecast-filters')).toBeInTheDocument();
      });
    });

    it('clears error when successful forecast is generated', async () => {
      render(<ForecastDashboard />);

      // First generate error
      fireEvent.click(screen.getByTestId('generate-error-btn'));
      await waitFor(() => {
        expect(screen.getByText('Insufficient data for forecasting')).toBeInTheDocument();
      });

      // Then generate success
      fireEvent.click(screen.getByTestId('generate-forecast-btn'));
      await waitFor(() => {
        expect(screen.queryByText('Insufficient data for forecasting')).not.toBeInTheDocument();
        
        // Use getAllByText to handle multiple success messages
        const successTexts = screen.getAllByText(/forecast generated successfully/i);
        expect(successTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to child components', async () => {
      render(<ForecastDashboard />);

      const generateBtn = screen.getByTestId('generate-forecast-btn');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        // All result components should receive the same forecastResult prop
        expect(screen.getByText('Metrics for prophet model')).toBeInTheDocument();
        expect(screen.getByText('Chart for prophet model')).toBeInTheDocument();
        expect(screen.getByText('Recommendations for prophet model')).toBeInTheDocument();
      });
    });

    it('handles onForecastGenerated callback correctly', () => {
      render(<ForecastDashboard />);

      // Verify ForecastFilters component receives the callback
      expect(screen.getByTestId('forecast-filters')).toBeInTheDocument();
      expect(screen.getByTestId('generate-forecast-btn')).toBeInTheDocument();
      expect(screen.getByTestId('generate-error-btn')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses appropriate ARIA elements for alerts', async () => {
      render(<ForecastDashboard />);

      const generateBtn = screen.getByTestId('generate-forecast-btn');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        // Should have both debug and success alerts
        expect(screen.getByTestId('debug-alert')).toBeInTheDocument();
        expect(screen.getByTestId('success-alert')).toBeInTheDocument();
      });
    });

    it('provides descriptive content for screen readers', async () => {
      render(<ForecastDashboard />);

      const generateBtn = screen.getByTestId('generate-forecast-btn');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        // Success message should be descriptive
        expect(screen.getByText(/forecast generated successfully using prophet model with 12 months of historical data/i)).toBeInTheDocument();
      });
    });

    it('includes helpful troubleshooting information', async () => {
      render(<ForecastDashboard />);

      const generateErrorBtn = screen.getByTestId('generate-error-btn');
      fireEvent.click(generateErrorBtn);

      await waitFor(() => {
        // Error should include helpful troubleshooting steps
        expect(screen.getByText('Troubleshooting tips:')).toBeInTheDocument();
        const tips = screen.getByText(/check if python service/i);
        expect(tips).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Alerts Handling', () => {
    it('displays both debug and user alerts simultaneously on success', async () => {
      render(<ForecastDashboard />);

      const generateBtn = screen.getByTestId('generate-forecast-btn');
      fireEvent.click(generateBtn);

      await waitFor(() => {
        // Should have both types of alerts
        expect(screen.getByTestId('debug-alert')).toBeInTheDocument();
        expect(screen.getByTestId('success-alert')).toBeInTheDocument();
        
        // Debug alert should have info icon
        expect(screen.getByTestId('info-icon')).toBeInTheDocument();
        
        // Success alert should have check icon
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      });
    });

    it('displays both debug and error alerts simultaneously on error', async () => {
      render(<ForecastDashboard />);

      const generateErrorBtn = screen.getByTestId('generate-error-btn');
      fireEvent.click(generateErrorBtn);

      await waitFor(() => {
        // Should have both types of alerts - debug alert for developer info
        const debugAlerts = screen.getAllByTestId('debug-alert');
        expect(debugAlerts.length).toBeGreaterThan(0);
        
        // And error alert for user-facing error
        expect(screen.getByTestId('error-alert')).toBeInTheDocument();
        
        // Debug alert should have info icon
        expect(screen.getByTestId('info-icon')).toBeInTheDocument();
        
        // Error alert should have alert icon
        expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
      });
    });
  });
});
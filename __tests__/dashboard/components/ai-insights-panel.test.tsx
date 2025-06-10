import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel';

// Mock UI components
jest.mock('../../../components/ui/card', () => ({
  Card: function MockCard({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div data-testid="card" className={className}>{children}</div>;
  },
  CardContent: function MockCardContent({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div data-testid="card-content" className={className}>{children}</div>;
  },
  CardHeader: function MockCardHeader({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div data-testid="card-header" className={className}>{children}</div>;
  },
}));

jest.mock('../../../components/ui/button', () => ({
  Button: function MockButton({ children, onClick, disabled, variant, size, className }: any) {
    return (
      <button 
        data-testid="button" 
        onClick={onClick} 
        disabled={disabled}
        data-variant={variant}
        data-size={size}
        className={className}
      >
        {children}
      </button>
    );
  },
}));

jest.mock('../../../components/ui/scroll-area', () => ({
  ScrollArea: function MockScrollArea({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div data-testid="scroll-area" className={className}>{children}</div>;
  },
}));

jest.mock('../../../components/ui/separator', () => ({
  Separator: function MockSeparator() {
    return <div data-testid="separator" />;
  },
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Lightbulb: function MockLightbulb({ className }: { className?: string }) {
    return <div data-testid="lightbulb-icon" className={className}></div>;
  },
  RefreshCw: function MockRefreshCw({ className }: { className?: string }) {
    return <div data-testid="refresh-icon" className={className}></div>;
  },
  Loader2: function MockLoader2({ className }: { className?: string }) {
    return <div data-testid="loader-icon" className={className}></div>;
  },
  ChevronDown: function MockChevronDown({ className }: { className?: string }) {
    return <div data-testid="chevron-down-icon" className={className}></div>;
  },
  ChevronUp: function MockChevronUp({ className }: { className?: string }) {
    return <div data-testid="chevron-up-icon" className={className}></div>;
  },
  TrendingUp: function MockTrendingUp({ className }: { className?: string }) {
    return <div data-testid="trending-up-icon" className={className}></div>;
  },
  ScrollText: function MockScrollText({ className }: { className?: string }) {
    return <div data-testid="scroll-text-icon" className={className}></div>;
  },
  CheckCircle: function MockCheckCircle({ className }: { className?: string }) {
    return <div data-testid="check-circle-icon" className={className}></div>;
  },
}));

// Mock AI insights action
jest.mock('../../../lib/actions/ai-insights', () => ({
  getDashboardInsights: jest.fn(),
}));

// Mock console.error to reduce noise
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

import { getDashboardInsights } from '@/lib/actions/ai-insights';

const mockGetDashboardInsights = getDashboardInsights as jest.MockedFunction<typeof getDashboardInsights>;

describe('AIInsightsPanel', () => {
  const mockMetrics = {
    totalInventory: { value: 1000, change: 5.2 },
    stockValue: { value: 50000, change: -2.1 },
    expiringItems: { value: 25, change: 10.5 },
  };

  const mockSelectedMedicines = [1, 2, 3];

  const mockConditionData = {
    name: 'Good',
    value: 85,
    percentage: 85,
    categories: ['Category A', 'Category B'],
    status: 'stable',
  };

  const mockInsights = {
    summary: 'Your inventory is performing well with steady growth patterns.',
    keyPoints: [
      'Stock levels are optimized',
      'Expiring items are within acceptable limits',
      'Top performing items show consistent demand'
    ],
    recommendations: [
      'Consider increasing stock for high-demand items',
      'Monitor expiring items more closely',
      'Implement predictive ordering'
    ],
    trends: [
      'Upward trend in inventory turnover',
      'Seasonal patterns detected in medication demand',
      'Improved stock efficiency over last quarter'
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default successful mock
    mockGetDashboardInsights.mockResolvedValue({
      success: true,
      data: mockInsights,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders AI insights panel header correctly', () => {
    render(
      <AIInsightsPanel 
        metrics={mockMetrics} 
        selectedMedicines={mockSelectedMedicines} 
      />
    );

    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    expect(screen.getByText('Smart analysis of your inventory data')).toBeInTheDocument();
    expect(screen.getByTestId('lightbulb-icon')).toBeInTheDocument();
  });

  it('shows component loads insights automatically when mounted', async () => {
    // Component automatically starts loading insights on mount and completes quickly
    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    // Should eventually show insights after loading
    await waitFor(() => {
      expect(screen.getByText('Executive Summary')).toBeInTheDocument();
    });

    expect(mockGetDashboardInsights).toHaveBeenCalled();
  });

  it('displays loading state when generating insights', async () => {
    mockGetDashboardInsights.mockImplementation(() => new Promise(() => {})); // Never resolves

    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Analyzing your inventory data...')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
  });

  it('displays insights when successfully loaded', async () => {
    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      expect(screen.getByText(mockInsights.summary)).toBeInTheDocument();
    });

    // Check key points
    expect(screen.getByText('Key Findings')).toBeInTheDocument();
    mockInsights.keyPoints.forEach(point => {
      expect(screen.getByText(point)).toBeInTheDocument();
    });

    // Check recommendations
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    mockInsights.recommendations.forEach(rec => {
      expect(screen.getByText(rec)).toBeInTheDocument();
    });

    // Check trends
    expect(screen.getByText('Trends & Patterns')).toBeInTheDocument();
    mockInsights.trends.forEach(trend => {
      expect(screen.getByText(trend)).toBeInTheDocument();
    });
  });

  it('displays error state when insights generation fails', async () => {
    mockGetDashboardInsights.mockResolvedValue({
      success: false,
      error: 'Failed to generate insights',
    });

    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to generate insights')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    mockGetDashboardInsights.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('An error occurred while generating insights')).toBeInTheDocument();
    });
  });

  it('expands and collapses content', async () => {
    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    // Initially expanded
    expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();

    // Click to collapse
    const collapseButton = screen.getByTestId('chevron-up-icon').closest('button');
    
    await act(async () => {
      fireEvent.click(collapseButton!);
    });

    expect(screen.queryByTestId('card-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
  });

  it('disables refresh button while loading', async () => {
    mockGetDashboardInsights.mockImplementation(() => new Promise(() => {})); // Never resolves

    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    const refreshButton = screen.getByText('Refresh').closest('button');
    
    await waitFor(() => {
      expect(refreshButton).toBeDisabled();
    });
  });

  it('displays last refreshed time after successful insights generation', async () => {
    // Mock specific time
    const mockDate = new Date('2023-12-01T10:30:45');
    jest.setSystemTime(mockDate);

    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  it('calls getDashboardInsights with correct data structure', async () => {
    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines}
          conditionData={mockConditionData}
        />
      );
    });

    await waitFor(() => {
      expect(mockGetDashboardInsights).toHaveBeenCalledWith({
        metrics: mockMetrics,
        selectedMedicines: mockSelectedMedicines,
        conditionData: [mockConditionData], // Should be converted to array
        topReceivedItems: undefined,
        topDispensedItems: undefined,
        topItemsByQuantity: undefined,
      });
    });
  });

  it('auto-generates insights when external loading completes', async () => {
    const { rerender } = render(
      <AIInsightsPanel 
        metrics={mockMetrics} 
        selectedMedicines={mockSelectedMedicines}
        isLoading={true}
      />
    );

    // Should not call insights while loading
    expect(mockGetDashboardInsights).not.toHaveBeenCalled();

    // Rerender with loading false
    await act(async () => {
      rerender(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines}
          isLoading={false}
        />
      );
    });

    await waitFor(() => {
      expect(mockGetDashboardInsights).toHaveBeenCalled();
    });
  });

  it('renders all section icons correctly', async () => {
    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('scroll-text-icon')).toBeInTheDocument(); // Summary
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument(); // Key Points
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument(); // Trends
      // Note: Recommendations uses same lightbulb icon as header
    });
  });

  it('handles empty insights sections gracefully', async () => {
    const emptyInsights = {
      summary: 'Summary only',
      keyPoints: [],
      recommendations: [],
      trends: [],
    };

    mockGetDashboardInsights.mockResolvedValue({
      success: true,
      data: emptyInsights,
    });

    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      expect(screen.getByText('Summary only')).toBeInTheDocument();
      
      // Empty sections should not be rendered
      expect(screen.queryByText('Key Findings')).not.toBeInTheDocument();
      expect(screen.queryByText('Recommendations')).not.toBeInTheDocument();
      expect(screen.queryByText('Trends & Patterns')).not.toBeInTheDocument();
    });
  });

  it('can manually refresh insights', async () => {
    // Set up mock to be called multiple times
    let callCount = 0;
    mockGetDashboardInsights.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        success: true,
        data: mockInsights,
      });
    });

    await act(async () => {
      render(
        <AIInsightsPanel 
          metrics={mockMetrics} 
          selectedMedicines={mockSelectedMedicines} 
        />
      );
    });

    // Wait for initial load
    await waitFor(() => {
      expect(callCount).toBe(1);
    });

    // Find and click refresh button
    const refreshButton = screen.getByText('Refresh').closest('button');
    
    await act(async () => {
      fireEvent.click(refreshButton!);
    });

    // Wait for second call
    await waitFor(() => {
      expect(callCount).toBe(2);
    });
  });
});
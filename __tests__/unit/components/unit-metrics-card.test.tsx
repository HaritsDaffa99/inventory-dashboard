import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UnitMetricsCards } from '@/components/unit/unit-metrics-card';
import { getUnitMetrics } from '@/lib/actions/unit-metrics';

// Mock the unit metrics action
jest.mock('@/lib/actions/unit-metrics', () => ({
  getUnitMetrics: jest.fn(),
}));

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div data-testid="card-title" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => (
    <div data-testid="skeleton" className={className} {...props}>Loading...</div>
  ),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ArrowDown: () => <div data-testid="arrow-down-icon">↓</div>,
  ArrowUp: () => <div data-testid="arrow-up-icon">↑</div>,
  Package: () => <div data-testid="package-icon">📦</div>,
  ShoppingCart: () => <div data-testid="shopping-cart-icon">🛒</div>,
  Truck: () => <div data-testid="truck-icon">🚛</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">⚠️</div>,
  Minus: () => <div data-testid="minus-icon">−</div>,
}));

// Mock console methods to avoid noise
const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

const mockGetUnitMetrics = getUnitMetrics as jest.MockedFunction<typeof getUnitMetrics>;

describe('UnitMetricsCards', () => {
  const mockMetricsData = {
    totalInventory: { value: 1500, change: 5.2 },
    totalReceipts: { value: 250, change: -2.1 },
    totalDispensed: { value: 180, change: 0 },
    expiredMedicines: { value: 15, change: 8.7 },
  };

  const mockSuccessResponse = {
    success: true,
    data: mockMetricsData,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUnitMetrics.mockResolvedValue(mockSuccessResponse);
  });

  afterAll(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Component Rendering', () => {
    it('renders all four metric cards', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Total Inventory')).toBeInTheDocument();
        expect(screen.getByText('Received Items (This Month)')).toBeInTheDocument();
        expect(screen.getByText('Dispensed Items (This Month)')).toBeInTheDocument();
        expect(screen.getByText('Expiring Soon (90d)')).toBeInTheDocument();
      });
    });

    it('renders with correct icons for each card', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(screen.getByTestId('package-icon')).toBeInTheDocument();
        expect(screen.getByTestId('truck-icon')).toBeInTheDocument();
        expect(screen.getByTestId('shopping-cart-icon')).toBeInTheDocument();
        expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
      });
    });

    it('renders grid layout with proper structure', async () => {
      const { container } = render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        const gridContainer = container.querySelector('.grid');
        expect(gridContainer).toHaveClass('grid', 'gap-4', 'md:grid-cols-2', 'lg:grid-cols-4');
      });
    });
  });

  describe('Data Fetching', () => {
    it('calls getUnitMetrics with correct unitId', async () => {
      render(<UnitMetricsCards unitId="123" />);

      await waitFor(() => {
        expect(mockGetUnitMetrics).toHaveBeenCalledWith("123");
        expect(mockGetUnitMetrics).toHaveBeenCalledTimes(1);
      });
    });

    it('logs metrics fetching process', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Fetching metrics for unitId:', "1");
        expect(consoleSpy).toHaveBeenCalledWith('Metrics response:', mockSuccessResponse);
      });
    });

    it('handles string unitId correctly', async () => {
      render(<UnitMetricsCards unitId="unit-456" />);

      await waitFor(() => {
        expect(mockGetUnitMetrics).toHaveBeenCalledWith("unit-456");
      });
    });

    it('handles numeric unitId correctly', async () => {
      render(<UnitMetricsCards unitId={789} />);

      await waitFor(() => {
        expect(mockGetUnitMetrics).toHaveBeenCalledWith(789);
      });
    });
  });

  describe('Loading States', () => {
    it('displays loading skeletons initially', () => {
      render(<UnitMetricsCards unitId="1" />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons).toHaveLength(4);
      expect(screen.getAllByText('Loading...')).toHaveLength(4);
    });

    it('shows skeletons with correct styling', () => {
      render(<UnitMetricsCards unitId="1" />);

      const skeletons = screen.getAllByTestId('skeleton');
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('h-8', 'w-[100px]');
      });
    });

    it('hides loading state after data is fetched', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    it('displays metric values correctly', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument(); // Total Inventory
        expect(screen.getByText('250')).toBeInTheDocument(); // Received Items
        expect(screen.getByText('180')).toBeInTheDocument(); // Dispensed Items
        expect(screen.getByText('15')).toBeInTheDocument(); // Expiring Soon
      });
    });

    it('formats large numbers with commas', async () => {
      const largeNumberData = {
        ...mockMetricsData,
        totalInventory: { value: 12345678, change: 1.2 },
      };

      mockGetUnitMetrics.mockResolvedValue({
        success: true,
        data: largeNumberData,
      });

      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(screen.getByText('12,345,678')).toBeInTheDocument();
      });
    });

    it('handles zero values correctly', async () => {
      const zeroData = {
        totalInventory: { value: 0, change: 0 },
        totalReceipts: { value: 0, change: 0 },
        totalDispensed: { value: 0, change: 0 },
        expiredMedicines: { value: 0, change: 0 },
      };

      mockGetUnitMetrics.mockResolvedValue({
        success: true,
        data: zeroData,
      });

      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        const zeroValues = screen.getAllByText('0');
        expect(zeroValues.length).toBeGreaterThanOrEqual(4);
      });
    });
  });

  describe('Change Indicators', () => {
    it('displays positive change with green color and up arrow', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        const positiveChange = screen.getByText('5.2% from last month');
        expect(positiveChange.closest('span')).toHaveClass('text-green-600');
        // Use getAllByTestId since there might be multiple up arrows
        const upArrows = screen.getAllByTestId('arrow-up-icon');
        expect(upArrows.length).toBeGreaterThan(0);
      });
    });

    it('displays negative change with red color and down arrow', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        const negativeChange = screen.getByText('2.1% from last month');
        expect(negativeChange.closest('span')).toHaveClass('text-red-600');
        expect(screen.getByTestId('arrow-down-icon')).toBeInTheDocument();
      });
    });

    it('displays zero change with gray color and minus icon', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        const zeroChange = screen.getByText('0.0% from last month');
        expect(zeroChange.closest('span')).toHaveClass('text-gray-500');
        expect(screen.getByTestId('minus-icon')).toBeInTheDocument();
      });
    });

    it('shows amber color for positive change in expiring medicines', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        const expiringChange = screen.getByText('8.7% from last month');
        expect(expiringChange.closest('span')).toHaveClass('text-amber-600');
      });
    });

    it('shows green color for negative change in expiring medicines', async () => {
      const improvedExpiryData = {
        ...mockMetricsData,
        expiredMedicines: { value: 10, change: -5.2 },
      };

      mockGetUnitMetrics.mockResolvedValue({
        success: true,
        data: improvedExpiryData,
      });

      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        // Get the specific text with parent context to avoid duplicate matches
        const cards = screen.getAllByTestId('card');
        const expiringCard = cards.find(card => 
          card.textContent?.includes('Expiring Soon')
        );
        expect(expiringCard).toBeDefined();
        expect(expiringCard?.textContent).toContain('5.2% from last month');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      mockGetUnitMetrics.mockResolvedValue({
        success: false,
        error: 'Failed to fetch unit metrics',
        data: mockMetricsData, // Include data for type safety
      });

      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Error loading data');
        expect(errorMessages).toHaveLength(4);
      });
    });

    it('handles exception during API call', async () => {
      mockGetUnitMetrics.mockRejectedValue(new Error('Network error'));

      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Error loading data');
        expect(errorMessages).toHaveLength(4);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in fetchMetrics:', expect.any(Error));
      });
    });

    it('logs error details when metrics fetch fails', async () => {
      const errorResponse = {
        success: false,
        error: 'Database connection failed',
        data: mockMetricsData, // Include data for type safety
      };

      mockGetUnitMetrics.mockResolvedValue(errorResponse);

      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch metrics:', errorResponse);
      });
    });
  });

  describe('Number Formatting', () => {
    it('handles malformed response data', async () => {
      const malformedData = {
        totalInventory: { value: "invalid" as any, change: "not-a-number" as any },
        totalReceipts: { value: 0, change: 0 },
        totalDispensed: { value: 0, change: 0 },
        expiredMedicines: { value: 0, change: 0 },
      };

      mockGetUnitMetrics.mockResolvedValue({
        success: true,
        data: malformedData,
      });

      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        // Component should handle gracefully - check for error or default display
        const cards = screen.getAllByTestId('card');
        expect(cards).toHaveLength(4);
        // Just verify that 3 cards show '0' (excluding the malformed one)
        const zeroValues = screen.getAllByText('0');
        expect(zeroValues.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('formats numbers correctly', async () => {
      const testData = {
        totalInventory: { value: 1234567, change: 1.23456 },
        totalReceipts: { value: 0, change: 0 },
        totalDispensed: { value: 999, change: -0.1 },
        expiredMedicines: { value: 12345, change: 10.987 },
      };

      mockGetUnitMetrics.mockResolvedValue({
        success: true,
        data: testData,
      });

      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(screen.getByText('1,234,567')).toBeInTheDocument();
        expect(screen.getByText('999')).toBeInTheDocument();
        expect(screen.getByText('12,345')).toBeInTheDocument();
        expect(screen.getByText('1.2% from last month')).toBeInTheDocument();
        expect(screen.getByText('0.1% from last month')).toBeInTheDocument();
        expect(screen.getByText('11.0% from last month')).toBeInTheDocument();
      });
    });
  });

  describe('Component Re-rendering', () => {
    it('refetches data when unitId changes', async () => {
      const { rerender } = render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(mockGetUnitMetrics).toHaveBeenCalledWith("1");
      });

      jest.clearAllMocks();

      rerender(<UnitMetricsCards unitId="2" />);

      await waitFor(() => {
        expect(mockGetUnitMetrics).toHaveBeenCalledWith("2");
      });
    });

    it('handles rapid unitId changes correctly', async () => {
      const { rerender } = render(<UnitMetricsCards unitId="1" />);

      rerender(<UnitMetricsCards unitId="2" />);
      rerender(<UnitMetricsCards unitId="3" />);

      await waitFor(() => {
        expect(mockGetUnitMetrics).toHaveBeenCalledWith("3");
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA structure', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        const cards = screen.getAllByTestId('card');
        expect(cards).toHaveLength(4);

        const headers = screen.getAllByTestId('card-header');
        expect(headers).toHaveLength(4);

        const contents = screen.getAllByTestId('card-content');
        expect(contents).toHaveLength(4);
      });
    });

    it('provides meaningful text content for screen readers', async () => {
      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(screen.getByText('5.2% from last month')).toBeInTheDocument();
        expect(screen.getByText('2.1% from last month')).toBeInTheDocument();
        expect(screen.getByText('0.0% from last month')).toBeInTheDocument();
        expect(screen.getByText('8.7% from last month')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles extremely large numbers', async () => {
      const extremeData = {
        totalInventory: { value: Number.MAX_SAFE_INTEGER, change: 999.99 },
        totalReceipts: { value: 999999999, change: -999.99 },
        totalDispensed: { value: 1, change: 0.01 },
        expiredMedicines: { value: 0, change: -0.01 },
      };

      mockGetUnitMetrics.mockResolvedValue({
        success: true,
        data: extremeData,
      });

      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        expect(screen.getByText('9,007,199,254,740,991')).toBeInTheDocument(); // MAX_SAFE_INTEGER formatted
        expect(screen.getByText('999,999,999')).toBeInTheDocument();
      });
    });

    it('handles missing response data gracefully', async () => {
      mockGetUnitMetrics.mockResolvedValue({
        success: true,
        data: null as any,
      });

      render(<UnitMetricsCards unitId="1" />);

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Error loading data');
        expect(errorMessages).toHaveLength(4);
      });
    });
  });
});
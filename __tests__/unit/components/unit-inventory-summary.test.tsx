import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UnitInventorySummary } from '@/components/unit/unit-inventory-summary';
import { getUnitInventorySummary } from '@/lib/actions/unit-metrics';

// Mock the unit inventory summary action
jest.mock('@/lib/actions/unit-metrics', () => ({
  getUnitInventorySummary: jest.fn(),
}));

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Package: () => <div data-testid="package-icon">📦</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">✅</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">⚠️</div>,
}));

// Mock console methods to avoid noise
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

const mockGetUnitInventorySummary = getUnitInventorySummary as jest.MockedFunction<typeof getUnitInventorySummary>;

describe('UnitInventorySummary', () => {
  const mockInventoryData = {
    uniqueMedicines: 45,
    available: 320,
    damagedOrExpired: 8,
  };

  const mockSuccessResponse = {
    success: true,
    data: mockInventoryData,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUnitInventorySummary.mockResolvedValue(mockSuccessResponse);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Component Rendering', () => {
    it('renders inventory summary card structure', async () => {
      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('card')).toBeInTheDocument();
        expect(screen.getByTestId('card-content')).toBeInTheDocument();
      });
    });

    it('renders three metric columns', async () => {
      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Unique Medicines')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
        expect(screen.getByText('Damaged/Expired')).toBeInTheDocument();
      });
    });

    it('renders with correct icons for each metric', async () => {
      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('package-icon')).toBeInTheDocument();
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
        expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
      });
    });

    it('renders grid layout with proper styling', async () => {
      const { container } = render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        const gridContainer = container.querySelector('.grid');
        expect(gridContainer).toHaveClass('grid', 'grid-cols-3', 'gap-4');
      });
    });
  });

  describe('Data Fetching', () => {
    it('calls getUnitInventorySummary with correct unitId', async () => {
      render(<UnitInventorySummary unitId={123} />);

      await waitFor(() => {
        expect(mockGetUnitInventorySummary).toHaveBeenCalledWith(123);
        expect(mockGetUnitInventorySummary).toHaveBeenCalledTimes(1);
      });
    });

    it('handles different unitId types correctly', async () => {
      render(<UnitInventorySummary unitId={456} />);

      await waitFor(() => {
        expect(mockGetUnitInventorySummary).toHaveBeenCalledWith(456);
      });
    });

    it('refetches data when unitId changes', async () => {
      const { rerender } = render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(mockGetUnitInventorySummary).toHaveBeenCalledWith(1);
      });

      jest.clearAllMocks();

      rerender(<UnitInventorySummary unitId={2} />);

      await waitFor(() => {
        expect(mockGetUnitInventorySummary).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('Loading States', () => {
    it('displays loading state initially', () => {
      render(<UnitInventorySummary unitId={1} />);

      // Check for loading placeholders
      const loadingElements = screen.getAllByText('Unique Medicines');
      expect(loadingElements).toHaveLength(1);
      
      // Check for animated placeholders
      const animatedElements = document.querySelectorAll('.animate-pulse');
      expect(animatedElements).toHaveLength(3);
    });

    it('shows loading placeholders with correct styling', () => {
      render(<UnitInventorySummary unitId={1} />);

      const loadingPlaceholders = document.querySelectorAll('.h-8.w-16.animate-pulse.bg-muted.rounded.mt-2');
      expect(loadingPlaceholders).toHaveLength(3);
    });

    it('hides loading state after data is fetched', async () => {
      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        const animatedElements = document.querySelectorAll('.animate-pulse');
        expect(animatedElements).toHaveLength(0);
      });
    });

    it('displays labels during loading', () => {
      render(<UnitInventorySummary unitId={1} />);

      expect(screen.getByText('Unique Medicines')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Damaged/Expired')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('displays inventory values correctly', async () => {
      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument(); // Unique Medicines
        expect(screen.getByText('320')).toBeInTheDocument(); // Available
        expect(screen.getByText('8')).toBeInTheDocument(); // Damaged/Expired
      });
    });

    it('applies correct colors to metrics', async () => {
      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        const availableValue = screen.getByText('320');
        expect(availableValue).toHaveClass('text-green-600');

        const damagedValue = screen.getByText('8');
        expect(damagedValue).toHaveClass('text-red-500');

        // Unique medicines should have default styling (no specific color class)
        const uniqueValue = screen.getByText('45');
        expect(uniqueValue).not.toHaveClass('text-green-600', 'text-red-500');
      });
    });

    it('uses correct font styling for values', async () => {
      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        const values = [
          screen.getByText('45'),
          screen.getByText('320'),
          screen.getByText('8')
        ];

        values.forEach(value => {
          expect(value).toHaveClass('text-4xl', 'font-bold', 'mt-2');
        });
      });
    });

    it('handles zero values correctly', async () => {
      const zeroData = {
        uniqueMedicines: 0,
        available: 0,
        damagedOrExpired: 0,
      };

      mockGetUnitInventorySummary.mockResolvedValue({
        success: true,
        data: zeroData,
      });

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        const zeroValues = screen.getAllByText('0');
        expect(zeroValues).toHaveLength(3);
      });
    });

    it('handles large numbers correctly', async () => {
      const largeData = {
        uniqueMedicines: 9999,
        available: 123456,
        damagedOrExpired: 5432,
      };

      mockGetUnitInventorySummary.mockResolvedValue({
        success: true,
        data: largeData,
      });

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('9999')).toBeInTheDocument();
        expect(screen.getByText('123456')).toBeInTheDocument();
        expect(screen.getByText('5432')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      mockGetUnitInventorySummary.mockResolvedValue({
        success: false,
        error: 'Failed to fetch inventory summary',
      });

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch inventory summary')).toBeInTheDocument();
      });
    });

    it('displays error with correct styling', async () => {
      mockGetUnitInventorySummary.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        const errorElement = screen.getByText('Database error');
        expect(errorElement).toHaveClass('col-span-3', 'text-center', 'text-red-500', 'py-4');
      });
    });

    it('handles exception during API call', async () => {
      mockGetUnitInventorySummary.mockRejectedValue(new Error('Network error'));

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('An error occurred while fetching inventory summary')).toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching inventory summary:', expect.any(Error));
      });
    });

    it('handles response without error property', async () => {
      mockGetUnitInventorySummary.mockResolvedValue({
        success: false,
      } as any);

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch inventory summary')).toBeInTheDocument();
      });
    });

    it('clears error when new data is fetched successfully', async () => {
      // First render with error
      mockGetUnitInventorySummary.mockResolvedValue({
        success: false,
        error: 'Initial error',
      });

      const { rerender } = render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Initial error')).toBeInTheDocument();
      });

      // Then render with success
      mockGetUnitInventorySummary.mockResolvedValue(mockSuccessResponse);

      rerender(<UnitInventorySummary unitId={2} />);

      await waitFor(() => {
        expect(screen.queryByText('Initial error')).not.toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });
  });

  describe('Empty Data Handling', () => {
    it('displays error message when inventory summary is null', async () => {
      mockGetUnitInventorySummary.mockResolvedValue({
        success: true,
        data: null,
      });

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        // Based on the actual behavior, null data shows error message
        expect(screen.getByText('Failed to fetch inventory summary')).toBeInTheDocument();
      });
    });

    it('displays error message with correct styling for null data', async () => {
      mockGetUnitInventorySummary.mockResolvedValue({
        success: true,
        data: null,
      });

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        const errorElement = screen.getByText('Failed to fetch inventory summary');
        expect(errorElement).toHaveClass('col-span-3', 'text-center', 'text-red-500', 'py-4');
      });
    });

    it('handles undefined data correctly', async () => {
      mockGetUnitInventorySummary.mockResolvedValue({
        success: true,
        data: undefined,
      });

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        // Based on the actual behavior, undefined data shows error message
        expect(screen.getByText('Failed to fetch inventory summary')).toBeInTheDocument();
      });
    });
  });

  describe('Component Rendering and Mounting', () => {
    it('renders content immediately after mounting', async () => {
      render(<UnitInventorySummary unitId={1} />);

      // Component renders loading state immediately
      expect(screen.getByText('Unique Medicines')).toBeInTheDocument();
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });

    it('fetches data after mounting', async () => {
      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(mockGetUnitInventorySummary).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Component State Management', () => {
    it('manages loading state correctly throughout lifecycle', async () => {
      render(<UnitInventorySummary unitId={1} />);

      // Initially loading
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);

      // After data loads
      await waitFor(() => {
        expect(document.querySelectorAll('.animate-pulse')).toHaveLength(0);
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });

    it('resets loading state when unitId changes', async () => {
      const { rerender } = render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument();
      });

      // Mock delay for next request
      mockGetUnitInventorySummary.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: { uniqueMedicines: 100, available: 500, damagedOrExpired: 10 }
          }), 100)
        )
      );

      rerender(<UnitInventorySummary unitId={2} />);

      // Should show loading state again
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper text content for screen readers', async () => {
      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        // Check that metric labels are readable
        expect(screen.getByText('Unique Medicines')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
        expect(screen.getByText('Damaged/Expired')).toBeInTheDocument();

        // Check that values are readable
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('320')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
      });
    });

    it('maintains proper heading hierarchy', async () => {
      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        const labels = [
          screen.getByText('Unique Medicines'),
          screen.getByText('Available'),
          screen.getByText('Damaged/Expired')
        ];

        labels.forEach(label => {
          expect(label).toHaveClass('text-sm', 'text-muted-foreground');
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles negative values gracefully', async () => {
      const negativeData = {
        uniqueMedicines: -1,
        available: -5,
        damagedOrExpired: -2,
      };

      mockGetUnitInventorySummary.mockResolvedValue({
        success: true,
        data: negativeData,
      });

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('-1')).toBeInTheDocument();
        expect(screen.getByText('-5')).toBeInTheDocument();
        expect(screen.getByText('-2')).toBeInTheDocument();
      });
    });

    it('handles malformed data structure', async () => {
      const malformedData = {
        uniqueMedicines: "invalid",
        available: null,
        damagedOrExpired: undefined,
      };

      mockGetUnitInventorySummary.mockResolvedValue({
        success: true,
        data: malformedData as any,
      });

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        // Component should render the malformed data as-is
        expect(screen.getByText('invalid')).toBeInTheDocument();
      });
    });

    it('handles very large numbers', async () => {
      const largeData = {
        uniqueMedicines: Number.MAX_SAFE_INTEGER,
        available: 999999999999,
        damagedOrExpired: 123456789,
      };

      mockGetUnitInventorySummary.mockResolvedValue({
        success: true,
        data: largeData,
      });

      render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('9007199254740991')).toBeInTheDocument();
        expect(screen.getByText('999999999999')).toBeInTheDocument();
        expect(screen.getByText('123456789')).toBeInTheDocument();
      });
    });
  });

  describe('Component Cleanup', () => {
    it('handles component unmounting gracefully', async () => {
      const { unmount } = render(<UnitInventorySummary unitId={1} />);

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument();
      });

      expect(() => unmount()).not.toThrow();
    });

    it('handles rapid component updates', async () => {
      const { rerender } = render(<UnitInventorySummary unitId={1} />);

      rerender(<UnitInventorySummary unitId={2} />);
      rerender(<UnitInventorySummary unitId={3} />);
      rerender(<UnitInventorySummary unitId={4} />);

      await waitFor(() => {
        expect(mockGetUnitInventorySummary).toHaveBeenCalledWith(4);
      });
    });
  });
});
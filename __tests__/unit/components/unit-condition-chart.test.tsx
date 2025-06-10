import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UnitConditionChart } from '@/components/unit/unit-condition-chart';

// Mock the actions
jest.mock('@/lib/actions/medicine', () => ({
  getItemConditionDistribution: jest.fn(),
}));

// Mock recharts components
jest.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data, dataKey, children }: { data: any[]; dataKey: string; children?: React.ReactNode }) => (
    <div data-testid="pie">
      <div data-testid="pie-data">{JSON.stringify(data)}</div>
      <div data-testid="pie-data-key">{dataKey}</div>
      {/* Render the Cell children */}
      {children}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="pie-cell" data-fill={fill}></div>
  ),
  ResponsiveContainer: ({ children, width, height }: { children: React.ReactNode; width: string; height: number }) => (
    <div data-testid="responsive-container" data-width={width} data-height={height}>
      {children}
    </div>
  ),
  Legend: () => <div data-testid="pie-legend">Legend</div>,
  Tooltip: ({ content }: { content: React.ComponentType<any> }) => (
    <div data-testid="pie-tooltip">Tooltip</div>
  ),
}));

// Import the mocked function
import { getItemConditionDistribution } from '@/lib/actions/medicine';

const mockGetItemConditionDistribution = getItemConditionDistribution as jest.MockedFunction<typeof getItemConditionDistribution>;

describe('UnitConditionChart', () => {
  const mockProps = {
    unitId: 1,
    selectedMedicines: [1, 2, 3],
  };

  const mockConditionData = [
    { name: 'Good', value: 150, percentage: 75.0 },
    { name: 'Minor Damage', value: 30, percentage: 15.0 },
    { name: 'Major Damage', value: 15, percentage: 7.5 },
    { name: 'Expired', value: 5, percentage: 2.5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemConditionDistribution.mockResolvedValue({
      success: true,
      data: mockConditionData,
    });
  });

  describe('Component Rendering', () => {
    it('renders the card with correct title and description', async () => {
      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Item Condition Distribution')).toBeInTheDocument();
        expect(screen.getByText('Percentage of items by current condition')).toBeInTheDocument();
      });
    });

    it('applies correct CSS classes', async () => {
      const { container } = render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        const cardElement = container.querySelector('.unit-condition-chart');
        expect(cardElement).toBeInTheDocument();
        expect(cardElement).toHaveClass('h-full', 'unit-condition-chart');
      });
    });

    it('renders chart components when data is loaded', async () => {
      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        expect(screen.getByTestId('pie')).toBeInTheDocument();
        expect(screen.getByTestId('pie-legend')).toBeInTheDocument();
        expect(screen.getByTestId('pie-tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('calls getItemConditionDistribution with correct parameters', async () => {
      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, [1, 2, 3]);
      });
    });

    it('calls API with undefined when selectedMedicines is empty', async () => {
      render(<UnitConditionChart unitId={1} selectedMedicines={[]} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, undefined);
      });
    });

    it('refetches data when unitId changes', async () => {
      const { rerender } = render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, [1, 2, 3]);
      });

      jest.clearAllMocks();

      rerender(<UnitConditionChart unitId={2} selectedMedicines={[1, 2, 3]} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(2, [1, 2, 3]);
      });
    });

    it('refetches data when selectedMedicines changes', async () => {
      const { rerender } = render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, [1, 2, 3]);
      });

      jest.clearAllMocks();

      rerender(<UnitConditionChart unitId={1} selectedMedicines={[4, 5, 6]} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, [4, 5, 6]);
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state initially', async () => {
      // Mock a delayed response
      mockGetItemConditionDistribution.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockConditionData }), 100))
      );

      render(<UnitConditionChart {...mockProps} />);

      // Should show loading initially
      expect(screen.getByText('Loading chart data...')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText('Loading chart data...')).not.toBeInTheDocument();
      });
    });

    it('shows chart after loading completes', async () => {
      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading chart data...')).not.toBeInTheDocument();
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Data', () => {
    it('passes correct data to pie chart', async () => {
      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        const pieDataElement = screen.getByTestId('pie-data');
        const chartData = JSON.parse(pieDataElement.textContent || '[]');
        expect(chartData).toEqual(mockConditionData);
      });
    });

    it('uses correct dataKey for pie chart', async () => {
      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('pie-data-key')).toHaveTextContent('value');
      });
    });

    it('sets correct responsive container dimensions', async () => {
      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        const container = screen.getByTestId('responsive-container');
        expect(container).toHaveAttribute('data-width', '100%');
        expect(container).toHaveAttribute('data-height', '300');
      });
    });
  });

  describe('Empty Data State', () => {
    it('shows no data message when data is empty', async () => {
      mockGetItemConditionDistribution.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeInTheDocument();
        expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
      });
    });

    it('shows no data message when API returns null data', async () => {
      mockGetItemConditionDistribution.mockResolvedValue({
        success: true,
        data: null,
      });

      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockGetItemConditionDistribution.mockRejectedValue(new Error('API Error'));

      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching condition data:', expect.any(Error));
        // Should show no data message on error
        expect(screen.getByText('No data available')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles failed API responses', async () => {
      mockGetItemConditionDistribution.mockResolvedValue({
        success: false,
        error: 'Failed to fetch data',
      });

      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeInTheDocument();
      });
    });
  });

  describe('Hydration and Mounting', () => {
    it('does not render chart on server side', () => {
      // Mock server-side rendering
      const originalUseEffect = React.useEffect;
      React.useEffect = jest.fn();

      render(<UnitConditionChart {...mockProps} />);

      // Should return null initially (server-side)
      expect(screen.queryByText('Item Condition Distribution')).not.toBeInTheDocument();

      React.useEffect = originalUseEffect;
    });

    it('renders after mounting', async () => {
      render(<UnitConditionChart {...mockProps} />);

      // Should eventually render after mounting
      await waitFor(() => {
        expect(screen.getByText('Item Condition Distribution')).toBeInTheDocument();
      });
    });
  });

  describe('Color Configuration', () => {
    it('renders chart structure and verifies data mapping', async () => {
      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        // Verify the chart data is properly mapped
        const pieDataElement = screen.getByTestId('pie-data');
        const chartData = JSON.parse(pieDataElement.textContent || '[]');
        
        expect(chartData).toHaveLength(mockConditionData.length);
        expect(chartData[0]).toEqual({ name: 'Good', value: 150, percentage: 75.0 });
        expect(chartData[1]).toEqual({ name: 'Minor Damage', value: 30, percentage: 15.0 });
        expect(chartData[2]).toEqual({ name: 'Major Damage', value: 15, percentage: 7.5 });
        expect(chartData[3]).toEqual({ name: 'Expired', value: 5, percentage: 2.5 });
      });
    });

    it('verifies pie chart component structure', async () => {
      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        // Verify that the pie chart structure is correct
        const pieChart = screen.getByTestId('pie-chart');
        const pie = screen.getByTestId('pie');
        
        expect(pieChart).toContainElement(pie);
        expect(pie).toBeInTheDocument();
      });
    });
  });

  describe('Custom Tooltip', () => {
    it('renders tooltip component', async () => {
      render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('pie-tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Component Props Validation', () => {
    it('handles zero unitId', async () => {
      render(<UnitConditionChart unitId={0} selectedMedicines={[]} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(0, undefined);
      });
    });

    it('handles large selectedMedicines array', async () => {
      const largeMedicineArray = Array.from({ length: 100 }, (_, i) => i + 1);
      
      render(<UnitConditionChart unitId={1} selectedMedicines={largeMedicineArray} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, largeMedicineArray);
      });
    });

    it('handles single medicine selection', async () => {
      render(<UnitConditionChart unitId={1} selectedMedicines={[42]} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, [42]);
      });
    });
  });

  describe('Performance', () => {
    it('does not refetch data when props do not change', async () => {
      const { rerender } = render(<UnitConditionChart {...mockProps} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledTimes(1);
      });

      // Re-render with same props
      rerender(<UnitConditionChart {...mockProps} />);

      // Should not call API again
      expect(mockGetItemConditionDistribution).toHaveBeenCalledTimes(1);
    });

    it('handles rapid prop changes efficiently', async () => {
      const { rerender } = render(<UnitConditionChart unitId={1} selectedMedicines={[1]} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, [1]);
      });

      // Multiple rapid changes
      rerender(<UnitConditionChart unitId={1} selectedMedicines={[1, 2]} />);
      rerender(<UnitConditionChart unitId={1} selectedMedicines={[1, 2, 3]} />);
      rerender(<UnitConditionChart unitId={1} selectedMedicines={[1, 2, 3, 4]} />);

      await waitFor(() => {
        // Should have been called for each change
        expect(mockGetItemConditionDistribution).toHaveBeenCalledTimes(4);
      });
    });
  });
});
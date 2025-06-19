import { render, screen, waitFor } from '@testing-library/react';
import { ConditionChart } from '@/components/dashboard/condition-chart';

// Mock UI components
jest.mock('../../../components/ui/card', () => ({
  Card: function MockCard({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) {
    return <div data-testid="card" className={className} id={id}>{children}</div>;
  },
  CardContent: function MockCardContent({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div data-testid="card-content" className={className}>{children}</div>;
  },
  CardHeader: function MockCardHeader({ children }: { children: React.ReactNode }) {
    return <div data-testid="card-header">{children}</div>;
  },
  CardTitle: function MockCardTitle({ children }: { children: React.ReactNode }) {
    return <h3 data-testid="card-title">{children}</h3>;
  },
  CardDescription: function MockCardDescription({ children }: { children: React.ReactNode }) {
    return <p data-testid="card-description">{children}</p>;
  },
}));

// Mock Recharts components
jest.mock('recharts', () => ({
  PieChart: function MockPieChart({ children }: { children: React.ReactNode }) {
    return <div data-testid="pie-chart">{children}</div>;
  },
  Pie: function MockPie({ data, dataKey }: { data: any[], dataKey: string }) {
    return (
      <div data-testid="pie" data-key={dataKey}>
        {data.map((item, index) => (
          <div key={index} data-testid="pie-cell" data-name={item.name} data-value={item.value}>
            {item.name}: {item.value}
          </div>
        ))}
      </div>
    );
  },
  Cell: function MockCell() {
    return <div data-testid="cell" />;
  },
  ResponsiveContainer: function MockResponsiveContainer({ children, width, height }: any) {
    return (
      <div data-testid="responsive-container" data-width={width} data-height={height}>
        {children}
      </div>
    );
  },
  Legend: function MockLegend() {
    return <div data-testid="legend" />;
  },
  Tooltip: function MockTooltip({ content }: { content: React.ComponentType<any> }) {
    return <div data-testid="tooltip" data-content={content?.name || 'CustomTooltip'} />;
  },
}));

// Mock server action
jest.mock('../../../lib/actions/medicine', () => ({
  getItemConditionDistribution: jest.fn(),
}));

import { getItemConditionDistribution } from '@/lib/actions/medicine';

const mockGetItemConditionDistribution = getItemConditionDistribution as jest.MockedFunction<typeof getItemConditionDistribution>;

describe('ConditionChart', () => {
  const mockChartData = [
    { name: 'Good', value: 150, percentage: 75 },
    { name: 'Minor Damage', value: 30, percentage: 15 },
    { name: 'Major Damage', value: 15, percentage: 7.5 },
    { name: 'Expired', value: 3, percentage: 1.5 },
    { name: 'Lost', value: 2, percentage: 1 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful response
    mockGetItemConditionDistribution.mockResolvedValue({
      success: true,
      data: mockChartData,
    });
  });

  it('renders chart header correctly', async () => {
    render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    await waitFor(() => {
      expect(screen.getByTestId('card-title')).toHaveTextContent('Item Condition Distribution');
      expect(screen.getByTestId('card-description')).toHaveTextContent('Percentage of items by current condition');
    });
  });

  it('shows loading state initially', async () => {
    // Delay the response to catch loading state
    mockGetItemConditionDistribution.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockChartData }), 100))
    );

    render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    expect(screen.getByText('Loading condition data...')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading condition data...')).not.toBeInTheDocument();
    });
  });

  it('renders chart when data is loaded successfully', async () => {
    render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    // Check that chart displays the data
    expect(screen.getByTestId('pie')).toHaveAttribute('data-key', 'value');
    
    // Check that all condition types are rendered
    expect(screen.getByText('Good: 150')).toBeInTheDocument();
    expect(screen.getByText('Minor Damage: 30')).toBeInTheDocument();
    expect(screen.getByText('Major Damage: 15')).toBeInTheDocument();
    expect(screen.getByText('Expired: 3')).toBeInTheDocument();
    expect(screen.getByText('Lost: 2')).toBeInTheDocument();
  });

  it('shows no data message when chart data is empty', async () => {
    mockGetItemConditionDistribution.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    mockGetItemConditionDistribution.mockRejectedValue(new Error('API Error'));

    // Mock console.error to prevent test noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch condition data: API Error')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching condition data:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('handles unsuccessful API response', async () => {
    mockGetItemConditionDistribution.mockResolvedValue({
      success: false,
      error: 'Failed to fetch data',
    });

    render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
    });
  });

  it('calls API with correct parameters when selectedMedicines provided', async () => {
    const selectedMedicines = [1, 2, 3];
    
    render(<ConditionChart selectedMedicines={selectedMedicines} />);

    await waitFor(() => {
      expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(
        undefined, // unitId is undefined for overview page
        selectedMedicines
      );
    });
  });

  it('calls API with undefined medicines when empty array provided', async () => {
    render(<ConditionChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(
        undefined, // unitId is undefined for overview page
        undefined // empty array converted to undefined
      );
    });
  });

  it('renders consistently in client-side environment', async () => {
    // Component renders immediately in client environment
    const { container } = render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    // Should render the card structure immediately
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByTestId('card')).toBeInTheDocument();
    
    // Initially shows loading state
    expect(screen.getByText('Loading condition data...')).toBeInTheDocument();

    // Then shows data after loading
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  it('refetches data when selectedMedicines change', async () => {
    const { rerender } = render(<ConditionChart selectedMedicines={[1, 2]} />);

    await waitFor(() => {
      expect(mockGetItemConditionDistribution).toHaveBeenCalledTimes(1);
    });

    // Change selectedMedicines
    rerender(<ConditionChart selectedMedicines={[3, 4, 5]} />);

    await waitFor(() => {
      expect(mockGetItemConditionDistribution).toHaveBeenCalledTimes(2);
      expect(mockGetItemConditionDistribution).toHaveBeenLastCalledWith(
        undefined,
        [3, 4, 5]
      );
    });
  });

  it('sets correct chart dimensions', async () => {
    render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    await waitFor(() => {
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('data-width', '100%');
      expect(container).toHaveAttribute('data-height', '300');
    });
  });

  it('renders correct card structure', async () => {
    render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    await waitFor(() => {
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('h-full');
      expect(card).toHaveAttribute('id', 'condition-chart');
      
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });
  });

  it('applies correct CSS classes to card content', async () => {
    render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    await waitFor(() => {
      const cardContent = screen.getByTestId('card-content');
      expect(cardContent).toHaveClass('pt-2');
    });
  });

  it('handles partial data correctly', async () => {
    const partialData = [
      { name: 'Good', value: 100, percentage: 90 },
      { name: 'Expired', value: 10, percentage: 10 },
    ];

    mockGetItemConditionDistribution.mockResolvedValue({
      success: true,
      data: partialData,
    });

    render(<ConditionChart selectedMedicines={[1]} />);

    await waitFor(() => {
      expect(screen.getByText('Good: 100')).toBeInTheDocument();
      expect(screen.getByText('Expired: 10')).toBeInTheDocument();
      expect(screen.queryByText('Minor Damage')).not.toBeInTheDocument();
    });
  });

  it('renders custom tooltip component', async () => {
    render(<ConditionChart selectedMedicines={[1, 2, 3]} />);

    await waitFor(() => {
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-content', 'CustomTooltip');
    });
  });
});
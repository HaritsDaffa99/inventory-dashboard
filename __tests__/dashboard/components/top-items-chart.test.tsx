import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopItemsChart } from '@/components/dashboard/top-items-chart';

// Add React import for the mocks
const React = require('react');

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
  CardTitle: function MockCardTitle({ children }: { children: React.ReactNode }) {
    return <h3 data-testid="card-title">{children}</h3>;
  },
  CardDescription: function MockCardDescription({ children }: { children: React.ReactNode }) {
    return <p data-testid="card-description">{children}</p>;
  },
}));

jest.mock('../../../components/ui/tabs', () => ({
  Tabs: function MockTabs({ children, value, onValueChange, className, defaultValue }: any) {
    const [activeTab, setActiveTab] = React.useState(defaultValue || 'received');
    
    React.useEffect(() => {
      if (value !== undefined) {
        setActiveTab(value);
      }
    }, [value]);

    const handleTabChange = (newValue: string) => {
      setActiveTab(newValue);
      if (onValueChange) {
        onValueChange(newValue);
      }
    };

    return (
      <div data-testid="tabs" data-value={activeTab} className={className}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { activeTab, onTabChange: handleTabChange });
          }
          return child;
        })}
      </div>
    );
  },
  TabsList: function MockTabsList({ children, className, activeTab, onTabChange }: any) {
    return (
      <div data-testid="tabs-list" className={className}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { activeTab, onTabChange });
          }
          return child;
        })}
      </div>
    );
  },
  TabsTrigger: function MockTabsTrigger({ children, value, activeTab, onTabChange }: any) {
    return (
      <button 
        data-testid={`tab-trigger-${value}`} 
        onClick={() => onTabChange && onTabChange(value)}
        data-active={activeTab === value}
      >
        {children}
      </button>
    );
  },
  TabsContent: function MockTabsContent({ children, value, className, activeTab }: any) {
    const isActive = activeTab === value;
    return (
      <div 
        data-testid={`tab-content-${value}`} 
        className={className}
        style={{ display: isActive ? 'block' : 'none' }}
        data-state={isActive ? 'active' : 'inactive'}
      >
        {isActive ? children : null}
      </div>
    );
  },
}));

// Mock Recharts components with unique IDs
jest.mock('recharts', () => ({
  BarChart: function MockBarChart({ children, data }: { children: React.ReactNode, data: any[] }) {
    const chartId = React.useId();
    return (
      <div data-testid="bar-chart" data-chart-id={chartId} data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    );
  },
  Bar: function MockBar({ dataKey, fill }: { dataKey: string, fill: string }) {
    const barId = React.useId();
    return <div data-testid="bar" data-bar-id={barId} data-key={dataKey} data-fill={fill}></div>;
  },
  XAxis: function MockXAxis({ dataKey }: { dataKey: string }) {
    return <div data-testid="x-axis" data-key={dataKey}></div>;
  },
  YAxis: function MockYAxis() {
    return <div data-testid="y-axis"></div>;
  },
  CartesianGrid: function MockCartesianGrid() {
    return <div data-testid="cartesian-grid"></div>;
  },
  Tooltip: function MockTooltip() {
    return <div data-testid="tooltip"></div>;
  },
  ResponsiveContainer: function MockResponsiveContainer({ children }: { children: React.ReactNode }) {
    return <div data-testid="responsive-container">{children}</div>;
  },
}));

// Mock medicine API
jest.mock('../../../lib/actions/medicine', () => ({
  getTopReceivedItems: jest.fn(),
  getTopDispensedItems: jest.fn(),
}));

import { getTopReceivedItems, getTopDispensedItems } from '@/lib/actions/medicine';

const mockGetTopReceivedItems = getTopReceivedItems as jest.MockedFunction<typeof getTopReceivedItems>;
const mockGetTopDispensedItems = getTopDispensedItems as jest.MockedFunction<typeof getTopDispensedItems>;

describe('TopItemsChart', () => {
  const mockReceivedData = [
    { id: 1, name: 'Paracetamol 500mg', value: 15000 },
    { id: 2, name: 'Amoxicillin 250mg', value: 8500 },
    { id: 3, name: 'Vitamin B Complex', value: 3200 },
  ];

  const mockDispensedData = [
    { id: 1, name: 'Aspirin 100mg', value: 12000 },
    { id: 2, name: 'Ibuprofen 200mg', value: 7500 },
    { id: 3, name: 'Cough Syrup', value: 4500 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful responses
    mockGetTopReceivedItems.mockResolvedValue({
      success: true,
      data: mockReceivedData,
    });
    mockGetTopDispensedItems.mockResolvedValue({
      success: true,
      data: mockDispensedData,
    });
  });

  it('renders chart header correctly', async () => {
    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('card-title')).toHaveTextContent('Top 10 Received & Dispensed Items');
      expect(screen.getByTestId('card-description')).toHaveTextContent('Items with highest receipt and dispensing quantities');
    });
  });

  it('renders tabs structure correctly', async () => {
    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-received')).toHaveTextContent('Top 10 Received');
      expect(screen.getByTestId('tab-trigger-dispensed')).toHaveTextContent('Top 10 Dispensed');
    });
  });

  it('shows loading state initially', async () => {
    // Delay the response to catch loading state
    mockGetTopReceivedItems.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockReceivedData }), 100))
    );
    mockGetTopDispensedItems.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockDispensedData }), 100))
    );

    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
    });
  });

  it('renders received chart when data is loaded', async () => {
    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      
      // Check chart components
      expect(screen.getByTestId('bar')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  it('renders chart with correct data on received tab', async () => {
    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toEqual(mockReceivedData);
      
      // Check bar styling for received data
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-fill', '#60a5fa'); // Blue color for received
    });
  });

  it('switches to dispensed tab correctly', async () => {
    render(<TopItemsChart selectedMedicines={[]} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    // Initially should be on received tab
    expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'received');
    expect(screen.getByTestId('tab-content-received')).toHaveAttribute('data-state', 'active');
    expect(screen.getByTestId('tab-content-dispensed')).toHaveAttribute('data-state', 'inactive');

    // Switch to dispensed tab
    const dispensedTab = screen.getByTestId('tab-trigger-dispensed');
    fireEvent.click(dispensedTab);

    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'dispensed');
      expect(screen.getByTestId('tab-content-dispensed')).toHaveAttribute('data-state', 'active');
      expect(screen.getByTestId('tab-content-received')).toHaveAttribute('data-state', 'inactive');
    });
  });

  it('calls both APIs with undefined when no medicines selected', async () => {
    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(mockGetTopReceivedItems).toHaveBeenCalledWith(undefined);
      expect(mockGetTopDispensedItems).toHaveBeenCalledWith(undefined);
    });
  });

  it('calls both APIs with selected medicines when provided', async () => {
    const selectedMedicines = [1, 2, 3];
    render(<TopItemsChart selectedMedicines={selectedMedicines} />);

    await waitFor(() => {
      expect(mockGetTopReceivedItems).toHaveBeenCalledWith(selectedMedicines);
      expect(mockGetTopDispensedItems).toHaveBeenCalledWith(selectedMedicines);
    });
  });

  it('refetches data when selectedMedicines prop changes', async () => {
    const { rerender } = render(<TopItemsChart selectedMedicines={[1, 2]} />);

    await waitFor(() => {
      expect(mockGetTopReceivedItems).toHaveBeenCalledWith([1, 2]);
      expect(mockGetTopDispensedItems).toHaveBeenCalledWith([1, 2]);
    });

    // Clear mock calls
    mockGetTopReceivedItems.mockClear();
    mockGetTopDispensedItems.mockClear();

    // Rerender with different selectedMedicines
    rerender(<TopItemsChart selectedMedicines={[3, 4, 5]} />);

    await waitFor(() => {
      expect(mockGetTopReceivedItems).toHaveBeenCalledWith([3, 4, 5]);
      expect(mockGetTopDispensedItems).toHaveBeenCalledWith([3, 4, 5]);
    });
  });

  it('displays error state when received API fails', async () => {
    mockGetTopReceivedItems.mockRejectedValue(new Error('Received API Error'));

    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getAllByText('Failed to fetch chart data: Received API Error')).toHaveLength(1);
    });
  });

  it('displays error state when dispensed API fails', async () => {
    mockGetTopDispensedItems.mockRejectedValue(new Error('Dispensed API Error'));

    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getAllByText('Failed to fetch chart data: Dispensed API Error')).toHaveLength(1);
    });
  });

  it('displays error message when received API returns unsuccessful response', async () => {
    mockGetTopReceivedItems.mockResolvedValue({
      success: false,
      error: 'Failed to fetch received items',
    });

    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getAllByText('Failed to fetch received items')).toHaveLength(1);
    });
  });

  it('displays error message when dispensed API returns unsuccessful response', async () => {
    mockGetTopDispensedItems.mockResolvedValue({
      success: false,
      error: 'Failed to fetch dispensed items',
    });

    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getAllByText('Failed to fetch dispensed items')).toHaveLength(1);
    });
  });

  it('displays no data message when received data is empty', async () => {
    mockGetTopReceivedItems.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  it('displays no data message when dispensed data is empty and tab is active', async () => {
    mockGetTopDispensedItems.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<TopItemsChart selectedMedicines={[]} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('tab-trigger-dispensed')).toBeInTheDocument();
    });

    // Switch to dispensed tab first
    const dispensedTab = screen.getByTestId('tab-trigger-dispensed');
    fireEvent.click(dispensedTab);

    // Then check for no data message
    await waitFor(() => {
      expect(screen.getByTestId('tab-content-dispensed')).toHaveAttribute('data-state', 'active');
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  it('applies correct CSS classes to components', async () => {
    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      // Check card classes
      expect(screen.getByTestId('card')).toHaveClass('h-full', 'w-full', 'flex', 'flex-col');
      
      // Check card header classes
      expect(screen.getByTestId('card-header')).toHaveClass('pb-2');
      
      // Check card content classes  
      expect(screen.getByTestId('card-content')).toHaveClass('flex-1', 'pt-0', 'overflow-hidden');
      
      // Check tabs classes
      expect(screen.getByTestId('tabs')).toHaveClass('h-full', 'flex', 'flex-col');
      
      // Check tabs list classes
      expect(screen.getByTestId('tabs-list')).toHaveClass('grid', 'w-full', 'grid-cols-2', 'mb-2');
    });
  });

  it('renders consistently in client-side environment', () => {
    const { container } = render(<TopItemsChart selectedMedicines={[]} />);

    // Component renders immediately in client environment  
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByTestId('card')).toBeInTheDocument();
    
    // Initially shows loading state
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
  });

  it('renders component structure after mounting', async () => {
    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
    });
  });

  it('handles long medicine names in chart data', async () => {
    const longNameData = [
      { id: 1, name: 'Very Long Medicine Name That Should Be Truncated', value: 1000 },
      { id: 2, name: 'Short Name', value: 500 },
    ];

    mockGetTopReceivedItems.mockResolvedValue({
      success: true,
      data: longNameData,
    });

    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      const barChart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toEqual(longNameData);
      // The formatting is handled by the chart component internally
    });
  });

  it('renders both tab contents with correct test ids', async () => {
    render(<TopItemsChart selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-content-received')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-dispensed')).toBeInTheDocument();
    });
  });

  it('fetches both datasets simultaneously on mount', async () => {
    render(<TopItemsChart selectedMedicines={[1, 2, 3]} />);

    // Wait for mounting and API calls
    await waitFor(() => {
      expect(mockGetTopReceivedItems).toHaveBeenCalledWith([1, 2, 3]);
      expect(mockGetTopDispensedItems).toHaveBeenCalledWith([1, 2, 3]);
    });

    // Both should be called exactly once
    expect(mockGetTopReceivedItems).toHaveBeenCalledTimes(1);
    expect(mockGetTopDispensedItems).toHaveBeenCalledTimes(1);
  });

  it('verifies component handles tab switching correctly', async () => {
    render(<TopItemsChart selectedMedicines={[]} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'received');
    });

    // Switch to dispensed tab
    const dispensedTab = screen.getByTestId('tab-trigger-dispensed');
    fireEvent.click(dispensedTab);

    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'dispensed');
    });

    // Switch back to received tab
    const receivedTab = screen.getByTestId('tab-trigger-received');
    fireEvent.click(receivedTab);

    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'received');
    });
  });
});
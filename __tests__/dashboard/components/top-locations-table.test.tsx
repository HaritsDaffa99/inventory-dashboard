import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopLocationsTable } from '@/components/dashboard/top-locations-table';

// Add React import for the mocks
const React = require('react');

// Mock UI components
jest.mock('../../../components/ui/card', () => ({
  Card: function MockCard({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div data-testid="card" className={className}>{children}</div>;
  },
  CardContent: function MockCardContent({ children }: { children: React.ReactNode }) {
    return <div data-testid="card-content">{children}</div>;
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

jest.mock('../../../components/ui/table', () => ({
  Table: function MockTable({ children }: { children: React.ReactNode }) {
    return <table data-testid="table">{children}</table>;
  },
  TableBody: function MockTableBody({ children }: { children: React.ReactNode }) {
    return <tbody data-testid="table-body">{children}</tbody>;
  },
  TableCell: function MockTableCell({ children, className }: { children: React.ReactNode, className?: string }) {
    return <td data-testid="table-cell" className={className}>{children}</td>;
  },
  TableHead: function MockTableHead({ children, className }: { children: React.ReactNode, className?: string }) {
    return <th data-testid="table-head" className={className}>{children}</th>;
  },
  TableHeader: function MockTableHeader({ children }: { children: React.ReactNode }) {
    return <thead data-testid="table-header">{children}</thead>;
  },
  TableRow: function MockTableRow({ children }: { children: React.ReactNode }) {
    return <tr data-testid="table-row">{children}</tr>;
  },
}));

jest.mock('../../../components/ui/tabs', () => ({
  Tabs: function MockTabs({ children, value, onValueChange, className, defaultValue }: any) {
    const [activeTab, setActiveTab] = React.useState(defaultValue || 'receipts');
    
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

// Mock medicine API
jest.mock('../../../lib/actions/medicine', () => ({
  getTopReceiptLocations: jest.fn(),
  getTopDispensedLocations: jest.fn(),
}));

import { getTopReceiptLocations, getTopDispensedLocations } from '@/lib/actions/medicine';

const mockGetTopReceiptLocations = getTopReceiptLocations as jest.MockedFunction<typeof getTopReceiptLocations>;
const mockGetTopDispensedLocations = getTopDispensedLocations as jest.MockedFunction<typeof getTopDispensedLocations>;

describe('TopLocationsTable', () => {
  const mockReceiptData = [
    { id: 1, name: 'Emergency Department', count: 1250, percentage: '25.5' },
    { id: 2, name: 'Internal Medicine', count: 980, percentage: '20.1' },
    { id: 3, name: 'Surgery Unit', count: 760, percentage: '15.6' },
    { id: 4, name: 'Pediatrics', count: 540, percentage: '11.1' },
    { id: 5, name: 'Cardiology', count: 430, percentage: '8.8' },
  ];

  const mockDispensedData = [
    { id: 1, name: 'Outpatient Pharmacy', count: 2100, percentage: '42.0' },
    { id: 2, name: 'Emergency Department', count: 850, percentage: '17.0' },
    { id: 3, name: 'Internal Medicine', count: 720, percentage: '14.4' },
    { id: 4, name: 'ICU', count: 480, percentage: '9.6' },
    { id: 5, name: 'Surgery Unit', count: 350, percentage: '7.0' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful responses
    mockGetTopReceiptLocations.mockResolvedValue({
      success: true,
      data: mockReceiptData,
    });
    mockGetTopDispensedLocations.mockResolvedValue({
      success: true,
      data: mockDispensedData,
    });
  });

  it('renders table header correctly', async () => {
    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByTestId('card-title')).toHaveTextContent('Top 10 Units');
      expect(screen.getByTestId('card-description')).toHaveTextContent('Units with highest receipt and dispensing activity');
    });
  });

  it('renders tabs structure correctly', async () => {
    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-receipts')).toHaveTextContent('Receipts');
      expect(screen.getByTestId('tab-trigger-dispensed')).toHaveTextContent('Dispensed');
    });
  });

  it('shows loading state initially', async () => {
    // Delay the response to catch loading state
    mockGetTopReceiptLocations.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockReceiptData }), 100))
    );
    mockGetTopDispensedLocations.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockDispensedData }), 100))
    );

    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });
  });

  it('renders receipts table when data is loaded', async () => {
    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByTestId('table')).toBeInTheDocument();
      expect(screen.getByTestId('table-header')).toBeInTheDocument();
      expect(screen.getByTestId('table-body')).toBeInTheDocument();
      
      // Check table headers
      expect(screen.getByText('Unit')).toBeInTheDocument();
      expect(screen.getByText('Count')).toBeInTheDocument();
      expect(screen.getByText('Percentage')).toBeInTheDocument();
      
      // Check first few data rows
      expect(screen.getByText('Emergency Department')).toBeInTheDocument();
      expect(screen.getByText('1250')).toBeInTheDocument();
      expect(screen.getByText('25.5%')).toBeInTheDocument();
    });
  });

  it('switches to dispensed tab and renders correct data', async () => {
    render(<TopLocationsTable />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Emergency Department')).toBeInTheDocument();
    });

    // Switch to dispensed tab
    const dispensedTab = screen.getByTestId('tab-trigger-dispensed');
    fireEvent.click(dispensedTab);

    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'dispensed');
      expect(screen.getByTestId('tab-content-dispensed')).toHaveAttribute('data-state', 'active');
      
      // Check dispensed data
      expect(screen.getByText('Outpatient Pharmacy')).toBeInTheDocument();
      expect(screen.getByText('2100')).toBeInTheDocument();
      expect(screen.getByText('42.0%')).toBeInTheDocument();
    });
  });

  it('calls both APIs on mount', async () => {
    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(mockGetTopReceiptLocations).toHaveBeenCalledTimes(1);
      expect(mockGetTopDispensedLocations).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error state when receipt API fails', async () => {
    mockGetTopReceiptLocations.mockRejectedValue(new Error('Receipt API Error'));

    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch data: Receipt API Error')).toBeInTheDocument();
    });
  });

  it('displays error state when dispensed API fails', async () => {
    mockGetTopDispensedLocations.mockRejectedValue(new Error('Dispensed API Error'));

    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch data: Dispensed API Error')).toBeInTheDocument();
    });
  });

  it('displays error message when receipt API returns unsuccessful response', async () => {
    mockGetTopReceiptLocations.mockResolvedValue({
      success: false,
      error: 'Failed to fetch receipt locations',
    });

    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch receipt locations')).toBeInTheDocument();
    });
  });

  it('displays error message when dispensed API returns unsuccessful response', async () => {
    mockGetTopDispensedLocations.mockResolvedValue({
      success: false,
      error: 'Failed to fetch dispensed locations',
    });

    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch dispensed locations')).toBeInTheDocument();
    });
  });

  it('displays no data message when receipts data is empty', async () => {
    mockGetTopReceiptLocations.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  it('displays no data message when dispensed data is empty and tab is active', async () => {
    mockGetTopDispensedLocations.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<TopLocationsTable />);

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

  it('renders all receipt location data correctly', async () => {
    render(<TopLocationsTable />);

    await waitFor(() => {
      // Check all receipt data is rendered
      mockReceiptData.forEach((location) => {
        expect(screen.getByText(location.name)).toBeInTheDocument();
        expect(screen.getByText(location.count.toString())).toBeInTheDocument();
        expect(screen.getByText(`${location.percentage}%`)).toBeInTheDocument();
      });
    });
  });

  it('renders all dispensed location data correctly when tab is switched', async () => {
    render(<TopLocationsTable />);

    // Wait for initial load and switch to dispensed tab
    await waitFor(() => {
      const dispensedTab = screen.getByTestId('tab-trigger-dispensed');
      fireEvent.click(dispensedTab);
    });

    await waitFor(() => {
      // Check all dispensed data is rendered
      mockDispensedData.forEach((location) => {
        expect(screen.getByText(location.name)).toBeInTheDocument();
        expect(screen.getByText(location.count.toString())).toBeInTheDocument();
        expect(screen.getByText(`${location.percentage}%`)).toBeInTheDocument();
      });
    });
  });

  it('applies correct CSS classes to table components', async () => {
    render(<TopLocationsTable />);

    await waitFor(() => {
      // Check card classes
      expect(screen.getByTestId('card')).toHaveClass('h-full');
      
      // Check tabs list classes
      expect(screen.getByTestId('tabs-list')).toHaveClass('grid', 'w-full', 'grid-cols-2', 'mb-4');
      
      // Check table cell classes
      const tableCells = screen.getAllByTestId('table-cell');
      const fontMediumCells = tableCells.filter(cell => cell.className.includes('font-medium'));
      const textRightCells = tableCells.filter(cell => cell.className.includes('text-right'));
      
      expect(fontMediumCells.length).toBeGreaterThan(0); // Unit name cells
      expect(textRightCells.length).toBeGreaterThan(0); // Count and percentage cells
    });
  });

  it('renders consistently in client-side environment', () => {
    const { container } = render(<TopLocationsTable />);

    // Component renders immediately in client environment  
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByTestId('card')).toBeInTheDocument();
    
    // Initially shows loading state
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders component structure after mounting', async () => {
    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
    });
  });

  it('verifies component handles tab switching correctly', async () => {
    render(<TopLocationsTable />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'receipts');
    });

    // Switch to dispensed tab
    const dispensedTab = screen.getByTestId('tab-trigger-dispensed');
    fireEvent.click(dispensedTab);

    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'dispensed');
    });

    // Switch back to receipts tab
    const receiptsTab = screen.getByTestId('tab-trigger-receipts');
    fireEvent.click(receiptsTab);

    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'receipts');
    });
  });

  it('renders table structure correctly', async () => {
    render(<TopLocationsTable />);

    await waitFor(() => {
      // Check table structure
      expect(screen.getByTestId('table')).toBeInTheDocument();
      expect(screen.getByTestId('table-header')).toBeInTheDocument();
      expect(screen.getByTestId('table-body')).toBeInTheDocument();
      
      // Check table rows (header + data rows)
      const tableRows = screen.getAllByTestId('table-row');
      expect(tableRows.length).toBe(mockReceiptData.length + 1); // +1 for header row
      
      // Check table heads (3 columns)
      const tableHeads = screen.getAllByTestId('table-head');
      expect(tableHeads).toHaveLength(3);
    });
  });

  it('handles long unit names gracefully', async () => {
    const longNameData = [
      { id: 1, name: 'Very Long Department Name That Could Potentially Overflow', count: 100, percentage: '10.0' },
      { id: 2, name: 'Short Name', count: 50, percentage: '5.0' },
    ];

    mockGetTopReceiptLocations.mockResolvedValue({
      success: true,
      data: longNameData,
    });

    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByText('Very Long Department Name That Could Potentially Overflow')).toBeInTheDocument();
      expect(screen.getByText('Short Name')).toBeInTheDocument();
    });
  });

  it('handles large numbers in count field', async () => {
    const largeNumberData = [
      { id: 1, name: 'High Volume Unit', count: 999999, percentage: '99.9' },
      { id: 2, name: 'Low Volume Unit', count: 1, percentage: '0.1' },
    ];

    mockGetTopReceiptLocations.mockResolvedValue({
      success: true,
      data: largeNumberData,
    });

    render(<TopLocationsTable />);

    await waitFor(() => {
      expect(screen.getByText('999999')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('99.9%')).toBeInTheDocument();
      expect(screen.getByText('0.1%')).toBeInTheDocument();
    });
  });

  it('fetches both datasets simultaneously on mount', async () => {
    render(<TopLocationsTable />);

    // Wait for mounting and API calls
    await waitFor(() => {
      expect(mockGetTopReceiptLocations).toHaveBeenCalledTimes(1);
      expect(mockGetTopDispensedLocations).toHaveBeenCalledTimes(1);
    });

    // Both should be called without arguments
    expect(mockGetTopReceiptLocations).toHaveBeenCalledWith();
    expect(mockGetTopDispensedLocations).toHaveBeenCalledWith();
  });
});
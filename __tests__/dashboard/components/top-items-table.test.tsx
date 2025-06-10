import { render, screen, waitFor } from '@testing-library/react';
import { TopItemsTable } from '@/components/dashboard/top-items-table';

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
  TableHeader: function MockTableHeader({ children }: { children: React.ReactNode }) {
    return <thead data-testid="table-header">{children}</thead>;
  },
  TableBody: function MockTableBody({ children }: { children: React.ReactNode }) {
    return <tbody data-testid="table-body">{children}</tbody>;
  },
  TableRow: function MockTableRow({ children }: { children: React.ReactNode }) {
    return <tr data-testid="table-row">{children}</tr>;
  },
  TableHead: function MockTableHead({ children, className }: { children: React.ReactNode, className?: string }) {
    return <th data-testid="table-head" className={className}>{children}</th>;
  },
  TableCell: function MockTableCell({ children, className }: { children: React.ReactNode, className?: string }) {
    return <td data-testid="table-cell" className={className}>{children}</td>;
  },
}));

jest.mock('../../../components/ui/badge', () => ({
  Badge: function MockBadge({ children, className }: { children: React.ReactNode, className?: string }) {
    return <span data-testid="badge" className={className}>{children}</span>;
  },
}));

// Mock medicine API
jest.mock('../../../lib/actions/medicine', () => ({
  getTopItemsByQuantity: jest.fn(),
}));

import { getTopItemsByQuantity } from '@/lib/actions/medicine';

const mockGetTopItemsByQuantity = getTopItemsByQuantity as jest.MockedFunction<typeof getTopItemsByQuantity>;

describe('TopItemsTable', () => {
  const mockItems = [
    {
      id: 1,
      name: 'Paracetamol 500mg',
      code: 'PCM001',
      quantity: 15000,
      unit: 'tablets',
      status: 'Good',
    },
    {
      id: 2,
      name: 'Amoxicillin 250mg',
      code: 'AMX002',
      quantity: 8500,
      unit: 'capsules',
      status: 'Fair',
    },
    {
      id: 3,
      name: 'Vitamin B Complex',
      code: 'VBC003',
      quantity: 3200,
      unit: 'tablets',
      status: 'Poor',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful response
    mockGetTopItemsByQuantity.mockResolvedValue({
      success: true,
      data: mockItems,
    });
  });

  it('renders table header correctly', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('card-title')).toHaveTextContent('Top 10 Items by Quantity');
      expect(screen.getByTestId('card-description')).toHaveTextContent('Items with highest stock levels');
    });
  });

  it('shows loading state initially', async () => {
    // Delay the response to catch loading state
    mockGetTopItemsByQuantity.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockItems }), 100))
    );

    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });
  });

  it('renders table with data when loaded', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      expect(screen.getByText('Vitamin B Complex')).toBeInTheDocument();
    });

    // Check table structure
    expect(screen.getByTestId('table')).toBeInTheDocument();
    expect(screen.getByTestId('table-header')).toBeInTheDocument();
    expect(screen.getByTestId('table-body')).toBeInTheDocument();
  });

  it('displays table headers correctly', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByText('Item Name')).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  it('displays item data correctly', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      // Check item names
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      expect(screen.getByText('Vitamin B Complex')).toBeInTheDocument();

      // Check codes
      expect(screen.getByText('PCM001')).toBeInTheDocument();
      expect(screen.getByText('AMX002')).toBeInTheDocument();
      expect(screen.getByText('VBC003')).toBeInTheDocument();

      // Check formatted quantities
      expect(screen.getByText('15,000 tablets')).toBeInTheDocument();
      expect(screen.getByText('8,500 capsules')).toBeInTheDocument();
      expect(screen.getByText('3,200 tablets')).toBeInTheDocument();
    });
  });

  it('renders status badges with correct content', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      const badges = screen.getAllByTestId('badge');
      expect(badges).toHaveLength(3);
      
      // Check badge content
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Fair')).toBeInTheDocument();
      expect(screen.getByText('Poor')).toBeInTheDocument();
    });
  });

  it('renders status badges with correct classes', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      const badges = screen.getAllByTestId('badge');
      
      // Find badges by their text content and check classes
      const goodBadge = badges.find(badge => badge.textContent === 'Good');
      const fairBadge = badges.find(badge => badge.textContent === 'Fair');
      const poorBadge = badges.find(badge => badge.textContent === 'Poor');

      expect(goodBadge).toHaveClass('bg-green-500');
      expect(fairBadge).toHaveClass('bg-yellow-500');
      expect(poorBadge).toHaveClass('bg-red-500');
    });
  });

  it('handles unknown status with default badge', async () => {
    const mockItemsWithUnknownStatus = [
      {
        id: 1,
        name: 'Test Medicine',
        code: 'TST001',
        quantity: 1000,
        unit: 'tablets',
        status: 'Unknown Status',
      },
    ];

    mockGetTopItemsByQuantity.mockResolvedValue({
      success: true,
      data: mockItemsWithUnknownStatus,
    });

    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('Unknown');
      expect(badge).toHaveClass('bg-gray-500');
    });
  });

  it('formats large numbers with commas correctly', async () => {
    const mockItemsWithLargeNumbers = [
      {
        id: 1,
        name: 'Test Medicine 1',
        code: 'TST001',
        quantity: 1000000,
        unit: 'tablets',
        status: 'Good',
      },
      {
        id: 2,
        name: 'Test Medicine 2',
        code: 'TST002',
        quantity: 123456,
        unit: 'capsules',
        status: 'Fair',
      },
    ];

    mockGetTopItemsByQuantity.mockResolvedValue({
      success: true,
      data: mockItemsWithLargeNumbers,
    });

    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByText('1,000,000 tablets')).toBeInTheDocument();
      expect(screen.getByText('123,456 capsules')).toBeInTheDocument();
    });
  });

  it('displays error state when API fails', async () => {
    mockGetTopItemsByQuantity.mockRejectedValue(new Error('API Error'));

    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch data: API Error')).toBeInTheDocument();
    });
  });

  it('displays error message when API returns unsuccessful response', async () => {
    mockGetTopItemsByQuantity.mockResolvedValue({
      success: false,
      error: 'Failed to fetch top items',
    });

    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch top items')).toBeInTheDocument();
    });
  });

  it('displays no data message when items array is empty', async () => {
    mockGetTopItemsByQuantity.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  it('calls API with undefined when no medicines selected', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      expect(mockGetTopItemsByQuantity).toHaveBeenCalledWith(undefined);
    });
  });

  it('calls API with selected medicines when medicines are provided', async () => {
    const selectedMedicines = [1, 2, 3];
    render(<TopItemsTable selectedMedicines={selectedMedicines} />);

    await waitFor(() => {
      expect(mockGetTopItemsByQuantity).toHaveBeenCalledWith(selectedMedicines);
    });
  });

  it('refetches data when selectedMedicines prop changes', async () => {
    const { rerender } = render(<TopItemsTable selectedMedicines={[1, 2]} />);

    await waitFor(() => {
      expect(mockGetTopItemsByQuantity).toHaveBeenCalledWith([1, 2]);
    });

    // Clear mock calls
    mockGetTopItemsByQuantity.mockClear();

    // Rerender with different selectedMedicines
    rerender(<TopItemsTable selectedMedicines={[3, 4, 5]} />);

    await waitFor(() => {
      expect(mockGetTopItemsByQuantity).toHaveBeenCalledWith([3, 4, 5]);
    });
  });

  it('applies correct CSS classes to table elements', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      // Check card classes
      expect(screen.getByTestId('card')).toHaveClass('h-full');

      // Check quantity column alignment
      const quantityHeaders = screen.getAllByTestId('table-head');
      const quantityHeader = quantityHeaders.find(header => header.textContent === 'Quantity');
      expect(quantityHeader).toHaveClass('text-right');

      // Check table cell classes
      const cells = screen.getAllByTestId('table-cell');
      const nameCells = cells.filter(cell => cell.textContent?.includes('mg'));
      expect(nameCells[0]).toHaveClass('font-medium');
    });
  });

  it('renders consistently in client-side environment', () => {
    // Component renders immediately in client environment  
    const { container } = render(<TopItemsTable selectedMedicines={[]} />);

    // Should render the card structure immediately
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByTestId('card')).toBeInTheDocument();
    
    // Initially shows loading state
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders component structure after mounting', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });
  });

  it('maintains proper table structure with border', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      const tableContainer = screen.getByTestId('table').parentElement;
      expect(tableContainer).toHaveClass('border', 'rounded-md');
    });
  });

  it('handles loading states correctly during prop changes', async () => {
    // Start with delay to catch loading state
    mockGetTopItemsByQuantity.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockItems }), 50))
    );

    const { rerender } = render(<TopItemsTable selectedMedicines={[1]} />);

    // Change props while still loading
    rerender(<TopItemsTable selectedMedicines={[2]} />);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    }, { timeout: 100 });

    // Eventually should show data
    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('verifies table data structure and formatting', async () => {
    render(<TopItemsTable selectedMedicines={[]} />);

    await waitFor(() => {
      // Check that all items are rendered
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      expect(screen.getByText('Vitamin B Complex')).toBeInTheDocument();

      // Check that all table rows are present (3 data rows)
      const tableRows = screen.getAllByTestId('table-row');
      // Should have header row + 3 data rows = 4 total
      expect(tableRows.length).toBeGreaterThanOrEqual(3);

      // Verify formatted quantities appear
      expect(screen.getByText('15,000 tablets')).toBeInTheDocument();
      expect(screen.getByText('8,500 capsules')).toBeInTheDocument();
      expect(screen.getByText('3,200 tablets')).toBeInTheDocument();
    });
  });

  it('handles multiple component instances independently', async () => {
    // Test that multiple instances of the component work independently
    const { container: container1 } = render(<TopItemsTable selectedMedicines={[1, 2]} />);
    const { container: container2 } = render(<TopItemsTable selectedMedicines={[3, 4]} />);

    await waitFor(() => {
      // Both should call API with their respective params
      expect(mockGetTopItemsByQuantity).toHaveBeenCalledWith([1, 2]);
      expect(mockGetTopItemsByQuantity).toHaveBeenCalledWith([3, 4]);
    });

    // Both should render independently
    expect(container1.firstChild).toHaveClass('h-full');
    expect(container2.firstChild).toHaveClass('h-full');
  });
});
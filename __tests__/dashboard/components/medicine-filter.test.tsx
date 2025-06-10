import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MedicineFilter } from '@/components/dashboard/medicine-filter';

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

jest.mock('../../../components/ui/checkbox', () => ({
  Checkbox: function MockCheckbox({ id, checked, onCheckedChange }: any) {
    return (
      <input
        data-testid={`checkbox-${id}`}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
    );
  },
}));

jest.mock('../../../components/ui/input', () => ({
  Input: function MockInput({ placeholder, className, value, onChange }: any) {
    return (
      <input
        data-testid="search-input"
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={onChange}
      />
    );
  },
}));

jest.mock('../../../components/ui/scroll-area', () => ({
  ScrollArea: function MockScrollArea({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div data-testid="scroll-area" className={className}>{children}</div>;
  },
}));

jest.mock('lucide-react', () => ({
  Search: function MockSearch({ className }: { className?: string }) {
    return <div data-testid="search-icon" className={className}></div>;
  },
}));

// Mock medicine API
jest.mock('../../../lib/actions/medicine', () => ({
  getAllPersediaan: jest.fn(),
}));

import { getAllPersediaan } from '@/lib/actions/medicine';

const mockGetAllPersediaan = getAllPersediaan as jest.MockedFunction<typeof getAllPersediaan>;

describe('MedicineFilter', () => {
  const mockMedicines = [
    {
      id: 1,
      namaPersediaan: 'Paracetamol 500mg',
      kodePersediaan: 'PCM001',
      tipe: 'Tablet',
    },
    {
      id: 2,
      namaPersediaan: 'Amoxicillin 250mg',
      kodePersediaan: 'AMX002',
      tipe: 'Capsule',
    },
    {
      id: 3,
      namaPersediaan: 'Vitamin B Complex',
      kodePersediaan: 'VBC003',
      tipe: 'Tablet',
    },
  ];

  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful response
    mockGetAllPersediaan.mockResolvedValue({
      success: true,
      data: mockMedicines,
    });
  });

  it('renders filter header correctly', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByTestId('card-title')).toHaveTextContent('Medicine Filter');
      expect(screen.getByTestId('card-description')).toHaveTextContent('Select medicines to filter dashboard data');
    });
  });

  it('shows loading state initially', async () => {
    // Delay the response to catch loading state
    mockGetAllPersediaan.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockMedicines }), 100))
    );

    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Loading medicines...')).toBeInTheDocument();
    });
  });

  it('renders medicines list when data is loaded', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      expect(screen.getByText('Vitamin B Complex')).toBeInTheDocument();
    });

    // Check medicine types are displayed - use getAllByText for duplicates
    expect(screen.getAllByText('Tablet')).toHaveLength(2); // Paracetamol and Vitamin B
    expect(screen.getByText('Capsule')).toBeInTheDocument();
  });

  it('displays error state when API fails', async () => {
    mockGetAllPersediaan.mockRejectedValue(new Error('API Error'));

    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('An error occurred while fetching medicines')).toBeInTheDocument();
    });
  });

  it('displays error message when API returns unsuccessful response', async () => {
    mockGetAllPersediaan.mockResolvedValue({
      success: false,
      error: 'Failed to fetch medicines',
    });

    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch medicines')).toBeInTheDocument();
    });
  });

  it('filters medicines based on search query', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    });

    // Search for "Paracetamol"
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'Paracetamol' } });

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
      expect(screen.queryByText('Vitamin B Complex')).not.toBeInTheDocument();
    });
  });

  it('filters medicines by code', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
    });

    // Search by code "AMX002"
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'AMX002' } });

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      expect(screen.queryByText('Paracetamol 500mg')).not.toBeInTheDocument();
      expect(screen.queryByText('Vitamin B Complex')).not.toBeInTheDocument();
    });
  });

  it('filters medicines by type', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
    });

    // Search by type "Capsule"
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'Capsule' } });

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      expect(screen.queryByText('Paracetamol 500mg')).not.toBeInTheDocument();
      expect(screen.queryByText('Vitamin B Complex')).not.toBeInTheDocument();
    });
  });

  it('shows no results message when search yields no matches', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    });

    // Search for non-existent medicine
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'NonExistentMedicine' } });

    await waitFor(() => {
      expect(screen.getByText('No medicines found')).toBeInTheDocument();
    });
  });

  it('renders component structure after loading completes', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    });

    // Check that checkboxes are rendered
    expect(screen.getByTestId('checkbox-medicine-1')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-medicine-2')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-medicine-3')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-select-all')).toBeInTheDocument();
  });

  it('renders search input with correct attributes', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toHaveAttribute('placeholder', 'Search medicines...');
    expect(searchInput).toHaveClass('pl-8');
  });

  it('renders scroll area for medicines list', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    });

    const scrollArea = screen.getByTestId('scroll-area');
    expect(scrollArea).toHaveClass('h-[300px]', 'pr-4');
  });

  it('renders search icon', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toHaveClass('absolute', 'left-2.5', 'top-2.5', 'h-4', 'w-4', 'text-muted-foreground');
  });

  it('renders consistently in client-side environment', () => {
    // Component renders immediately in client environment  
    const { container } = render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    // Should render the card structure immediately
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByTestId('card')).toBeInTheDocument();
    
    // Initially shows loading state
    expect(screen.getByText('Loading medicines...')).toBeInTheDocument();
  });

  it('case insensitive search works correctly', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    });

    // Search with different case
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'PARACETAMOL' } });

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
    });
  });

  it('clears search correctly', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    
    // Search for something
    fireEvent.change(searchInput, { target: { value: 'Paracetamol' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
    });

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      expect(screen.getByText('Vitamin B Complex')).toBeInTheDocument();
    });
  });

  it('verifies component renders all required elements', async () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    // Check header elements
    expect(screen.getByTestId('card-title')).toBeInTheDocument();
    expect(screen.getByTestId('card-description')).toBeInTheDocument();
    
    // Check search elements
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    // Check all medicines are rendered
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
    expect(screen.getByText('Vitamin B Complex')).toBeInTheDocument();
  });

  it('handles empty medicines list', async () => {
    mockGetAllPersediaan.mockResolvedValue({
      success: true,
      data: [],
    });

    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('No medicines found')).toBeInTheDocument();
    });
  });

  it('maintains proper card structure', () => {
    render(<MedicineFilter onSelectionChange={mockOnSelectionChange} />);

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('h-full');
    
    expect(screen.getByTestId('card-header')).toBeInTheDocument();
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
  });
});
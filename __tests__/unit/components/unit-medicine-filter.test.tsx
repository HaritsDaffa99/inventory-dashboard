import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnitMedicineFilter } from '@/components/unit/unit-medicine-filter';
import { getUnitMedicines } from '@/lib/actions/medicine';

// Mock the action
jest.mock('@/lib/actions/medicine');
const mockGetUnitMedicines = getUnitMedicines as jest.MockedFunction<typeof getUnitMedicines>;

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
}));

// Mock UI components
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id, ...props }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid={id}
      {...props}
    />
  ),
}));

describe('UnitMedicineFilter', () => {
  const mockOnSelectionChange = jest.fn();
  const defaultProps = {
    unitId: 1,
    onSelectionChange: mockOnSelectionChange,
  };

  const mockMedicines = [
    {
      id: 1,
      namaPersediaan: 'Paracetamol 500mg',
      kodePersediaan: 'PAR500',
      tipe: 'Analgesics',
    },
    {
      id: 2,
      namaPersediaan: 'Amoxicillin 250mg',
      kodePersediaan: 'AMX250',
      tipe: 'Antibiotics',
    },
    {
      id: 3,
      namaPersediaan: 'Aspirin 100mg',
      kodePersediaan: 'ASP100',
      tipe: 'Analgesics',
    },
    {
      id: 4,
      namaPersediaan: 'Ibuprofen 400mg',
      kodePersediaan: 'IBU400',
      tipe: 'Anti-inflammatory',
    },
    {
      id: 5,
      namaPersediaan: 'Vitamin C 500mg',
      kodePersediaan: 'VIT500',
      tipe: 'Vitamins',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUnitMedicines.mockResolvedValue({
      success: true,
      data: mockMedicines,
    });
  });

  describe('Component Rendering', () => {
    it('renders the component with correct title and description', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Medicine Filter')).toBeInTheDocument();
        expect(screen.getByText('Select medicines to filter dashboard data')).toBeInTheDocument();
      });
    });

    it('renders search input with placeholder', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search medicines...')).toBeInTheDocument();
      });
    });

    it('renders search icon', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      expect(screen.getByText('Loading medicines...')).toBeInTheDocument();
    });

    it('calls getUnitMedicines with correct unitId', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetUnitMedicines).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Data Display', () => {
    it('displays medicine list after loading', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
        expect(screen.getByText('Aspirin 100mg')).toBeInTheDocument();
        expect(screen.getByText('Ibuprofen 400mg')).toBeInTheDocument();
        expect(screen.getByText('Vitamin C 500mg')).toBeInTheDocument();
      });
    });

    it('displays medicine types correctly', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        // Use getAllByText for duplicated text
        const analgesicsTexts = screen.getAllByText('Analgesics');
        expect(analgesicsTexts).toHaveLength(2); // Paracetamol and Aspirin
        
        expect(screen.getByText('Antibiotics')).toBeInTheDocument();
        expect(screen.getByText('Anti-inflammatory')).toBeInTheDocument();
        expect(screen.getByText('Vitamins')).toBeInTheDocument();
      });
    });

    it('renders select all checkbox', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Select All')).toBeInTheDocument();
      });
    });

    it('renders individual medicine checkboxes', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByLabelText('Amoxicillin 250mg')).toBeInTheDocument();
        expect(screen.getByLabelText('Aspirin 100mg')).toBeInTheDocument();
        expect(screen.getByLabelText('Ibuprofen 400mg')).toBeInTheDocument();
        expect(screen.getByLabelText('Vitamin C 500mg')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters medicines by name', async () => {
      const user = userEvent.setup();
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      await user.type(searchInput, 'paracetamol');

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
        expect(screen.queryByText('Aspirin 100mg')).not.toBeInTheDocument();
      });
    });

    it('filters medicines by code', async () => {
      const user = userEvent.setup();
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      await user.type(searchInput, 'AMX250');

      await waitFor(() => {
        expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
        expect(screen.queryByText('Paracetamol 500mg')).not.toBeInTheDocument();
        expect(screen.queryByText('Aspirin 100mg')).not.toBeInTheDocument();
      });
    });

    it('filters medicines by type', async () => {
      const user = userEvent.setup();
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      await user.type(searchInput, 'analgesics');

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByText('Aspirin 100mg')).toBeInTheDocument();
        expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
        expect(screen.queryByText('Ibuprofen 400mg')).not.toBeInTheDocument();
      });
    });

    it('shows "No medicines found" when search has no results', async () => {
      const user = userEvent.setup();
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      await user.type(searchInput, 'nonexistent medicine');

      await waitFor(() => {
        expect(screen.getByText('No medicines found')).toBeInTheDocument();
        expect(screen.queryByText('Paracetamol 500mg')).not.toBeInTheDocument();
      });
    });

    it('shows all medicines when search is cleared', async () => {
      const user = userEvent.setup();
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      await user.type(searchInput, 'paracetamol');

      await waitFor(() => {
        expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
      });

      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      });
    });
  });

  describe('Selection Functionality', () => {
    it('selects individual medicine and calls onSelectionChange', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Paracetamol 500mg')).toBeInTheDocument();
      });

      const checkbox = screen.getByLabelText('Paracetamol 500mg');
      fireEvent.click(checkbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([1]);
    });

    it('deselects individual medicine and calls onSelectionChange', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Paracetamol 500mg')).toBeInTheDocument();
      });

      const checkbox = screen.getByLabelText('Paracetamol 500mg');
      
      // Select first
      fireEvent.click(checkbox);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([1]);

      // Then deselect
      fireEvent.click(checkbox);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });

    it('selects multiple medicines', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Paracetamol 500mg')).toBeInTheDocument();
      });

      const checkbox1 = screen.getByLabelText('Paracetamol 500mg');
      const checkbox2 = screen.getByLabelText('Amoxicillin 250mg');

      fireEvent.click(checkbox1);
      fireEvent.click(checkbox2);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([1, 2]);
    });

    it('select all functionality works correctly', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Select All')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Select All');
      fireEvent.click(selectAllCheckbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([1, 2, 3, 4, 5]);
    });

    it('deselect all functionality works correctly', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Select All')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Select All');
      
      // Select all first
      fireEvent.click(selectAllCheckbox);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([1, 2, 3, 4, 5]);

      // Then deselect all
      fireEvent.click(selectAllCheckbox);
      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });

    it('updates select all state when individual items are selected', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Paracetamol 500mg')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Select All');
      const checkbox1 = screen.getByLabelText('Paracetamol 500mg');
      const checkbox2 = screen.getByLabelText('Amoxicillin 250mg');
      const checkbox3 = screen.getByLabelText('Aspirin 100mg');
      const checkbox4 = screen.getByLabelText('Ibuprofen 400mg');
      const checkbox5 = screen.getByLabelText('Vitamin C 500mg');

      // Select all individual items
      fireEvent.click(checkbox1);
      fireEvent.click(checkbox2);
      fireEvent.click(checkbox3);
      fireEvent.click(checkbox4);
      fireEvent.click(checkbox5);

      // Select all should be checked
      expect(selectAllCheckbox).toBeChecked();
    });

    it('unchecks select all when one item is deselected', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Select All')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Select All');
      const checkbox1 = screen.getByLabelText('Paracetamol 500mg');

      // Select all first
      fireEvent.click(selectAllCheckbox);
      expect(selectAllCheckbox).toBeChecked();

      // Deselect one item
      fireEvent.click(checkbox1);
      expect(selectAllCheckbox).not.toBeChecked();
    });
  });

  describe('Selection with Search', () => {
    it('select all works with filtered results', async () => {
      const user = userEvent.setup();
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });

      // Filter by analgesics
      const searchInput = screen.getByPlaceholderText('Search medicines...');
      await user.type(searchInput, 'analgesics');

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByText('Aspirin 100mg')).toBeInTheDocument();
        expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
      });

      // Select all filtered items
      const selectAllCheckbox = screen.getByLabelText('Select All');
      fireEvent.click(selectAllCheckbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith([1, 3]); // Only filtered items
    });

    it('maintains selection when search changes', async () => {
      const user = userEvent.setup();
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Paracetamol 500mg')).toBeInTheDocument();
      });

      // Select one item
      const checkbox = screen.getByLabelText('Paracetamol 500mg');
      fireEvent.click(checkbox);

      // Filter to hide the selected item
      const searchInput = screen.getByPlaceholderText('Search medicines...');
      await user.type(searchInput, 'amoxicillin');

      await waitFor(() => {
        expect(screen.queryByText('Paracetamol 500mg')).not.toBeInTheDocument();
        expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      });

      // Clear search to show all items again
      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByLabelText('Paracetamol 500mg')).toBeInTheDocument();
      });

      // Previously selected item should still be selected
      expect(screen.getByLabelText('Paracetamol 500mg')).toBeChecked();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      mockGetUnitMedicines.mockResolvedValue({
        success: false,
        error: 'Failed to fetch medicines',
      });

      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch medicines')).toBeInTheDocument();
      });
    });

    it('displays generic error message when API throws exception', async () => {
      mockGetUnitMedicines.mockRejectedValue(new Error('Network error'));

      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('An error occurred while fetching medicines')).toBeInTheDocument();
      });
    });

    it('applies error styling to error message', async () => {
      mockGetUnitMedicines.mockResolvedValue({
        success: false,
        error: 'Test error',
      });

      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        const errorElement = screen.getByText('Test error');
        expect(errorElement.closest('div')).toHaveClass('text-red-500');
      });
    });
  });

  describe('Empty State', () => {
    it('displays no medicines found when data is empty', async () => {
      mockGetUnitMedicines.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No medicines found')).toBeInTheDocument();
      });
    });

    it('shows select all even when no medicines are available', async () => {
      mockGetUnitMedicines.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No medicines found')).toBeInTheDocument();
      });

      // Component still shows Select All but it's functionally disabled
      expect(screen.getByLabelText('Select All')).toBeInTheDocument();
    });
  });

  describe('Props Changes', () => {
    it('refetches data when unitId changes', async () => {
      const { rerender } = render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetUnitMedicines).toHaveBeenCalledWith(1);
      });

      rerender(<UnitMedicineFilter {...defaultProps} unitId={2} />);

      await waitFor(() => {
        expect(mockGetUnitMedicines).toHaveBeenCalledWith(2);
      });
    });

    it('calls new onSelectionChange callback when prop changes', async () => {
      const newCallback = jest.fn();
      const { rerender } = render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Paracetamol 500mg')).toBeInTheDocument();
      });

      rerender(<UnitMedicineFilter {...defaultProps} onSelectionChange={newCallback} />);

      const checkbox = screen.getByLabelText('Paracetamol 500mg');
      fireEvent.click(checkbox);

      expect(newCallback).toHaveBeenCalledWith([1]);
      expect(mockOnSelectionChange).not.toHaveBeenCalledWith([1]);
    });
  });

  describe('Hydration Protection', () => {
    it('handles client-side rendering correctly', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);
      
      // Component should render loading state initially
      expect(screen.getByText('Loading medicines...')).toBeInTheDocument();
      
      // Then should show data after API call
      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('uses proper label associations for checkboxes', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Select All')).toBeInTheDocument();
        expect(screen.getByLabelText('Paracetamol 500mg')).toBeInTheDocument();
      });

      // Check that labels are properly associated with checkboxes
      const selectAllCheckbox = screen.getByLabelText('Select All');
      const medicineCheckbox = screen.getByLabelText('Paracetamol 500mg');

      expect(selectAllCheckbox).toHaveAttribute('type', 'checkbox');
      expect(medicineCheckbox).toHaveAttribute('type', 'checkbox');
    });

    it('provides accessible search input', async () => {
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search medicines...');
        expect(searchInput).toBeInTheDocument();
        // Input elements have type="text" by default in HTML
        expect(searchInput.tagName.toLowerCase()).toBe('input');
      });
    });

    it('maintains proper focus management', async () => {
      const user = userEvent.setup();
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search medicines...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      await user.click(searchInput);

      expect(searchInput).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('handles large medicine lists efficiently', async () => {
      const largeMedicineList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        namaPersediaan: `Medicine ${i + 1}`,
        kodePersediaan: `MED${i + 1}`,
        tipe: 'Type A',
      }));

      mockGetUnitMedicines.mockResolvedValue({
        success: true,
        data: largeMedicineList,
      });

      const renderStart = performance.now();
      render(<UnitMedicineFilter {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Medicine 1')).toBeInTheDocument();
      });
      
      const renderEnd = performance.now();

      expect(renderEnd - renderStart).toBeLessThan(1000); // Should render in less than 1 second
    });

    it('handles rapid search input changes efficiently', async () => {
      const user = userEvent.setup();
      render(<UnitMedicineFilter {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search medicines...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');

      // Rapid typing
      await user.type(searchInput, 'para', { delay: 10 });

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });
    });
  });
});
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UnitTopMedicinesTable } from '@/components/unit/unit-top-medicines-table';

// Mock the actions
jest.mock('@/lib/actions/unit-stock-history', () => ({
  getTopMedicinesInUnit: jest.fn(),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
}));

// Import the mocked function
import { getTopMedicinesInUnit } from '@/lib/actions/unit-stock-history';

const mockGetTopMedicinesInUnit = getTopMedicinesInUnit as jest.MockedFunction<typeof getTopMedicinesInUnit>;

describe('UnitTopMedicinesTable', () => {
  const mockProps = {
    unitId: 1,
    selectedMedicines: [1, 2, 3],
    unitName: 'ICU',
  };

  const mockMedicinesData = [
    {
      id: 1,
      name: 'Paracetamol 500mg',
      code: 'PAR001',
      stock: 150,
      unit: 'tablets',
      status: 'Available',
    },
    {
      id: 2,
      name: 'Amoxicillin 250mg',
      code: 'AMX001',
      stock: 75,
      unit: 'capsules',
      status: 'Available',
    },
    {
      id: 3,
      name: 'Ibuprofen 400mg',
      code: 'IBU001',
      stock: 0,
      unit: 'tablets',
      status: 'Out of Stock',
    },
    {
      id: 4,
      name: 'Aspirin 100mg',
      code: 'ASP001',
      stock: 200,
      unit: 'tablets',
      status: 'Available',
    },
    {
      id: 5,
      name: 'Metformin 500mg',
      code: 'MET001',
      stock: 120,
      unit: 'tablets',
      status: 'Available',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTopMedicinesInUnit.mockResolvedValue({
      success: true,
      data: mockMedicinesData,
    });
  });

  describe('Component Rendering', () => {
    it('renders the card with correct title and description', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Top 5 Medicines in ICU')).toBeInTheDocument();
        expect(screen.getByText('Based on stock quantity')).toBeInTheDocument();
      });
    });

    it('applies correct CSS classes', async () => {
      const { container } = render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        const cardElement = container.querySelector('.h-full');
        expect(cardElement).toBeInTheDocument();
      });
    });

    it('renders search input with placeholder', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search medicines...');
        expect(searchInput).toBeInTheDocument();
        expect(searchInput).toHaveClass('pl-8');
      });
    });

    it('renders search icon', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      });
    });

    it('renders table headers correctly', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Medicine Name')).toBeInTheDocument();
        expect(screen.getByText('Code')).toBeInTheDocument();
        expect(screen.getByText('Stock')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('calls getTopMedicinesInUnit with correct parameters', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(mockGetTopMedicinesInUnit).toHaveBeenCalledWith(1, [1, 2, 3]);
      });
    });

    it('calls API with undefined when selectedMedicines is empty', async () => {
      render(<UnitTopMedicinesTable {...mockProps} selectedMedicines={[]} />);

      await waitFor(() => {
        expect(mockGetTopMedicinesInUnit).toHaveBeenCalledWith(1, undefined);
      });
    });

    it('refetches data when unitId changes', async () => {
      const { rerender } = render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(mockGetTopMedicinesInUnit).toHaveBeenCalledWith(1, [1, 2, 3]);
      });

      jest.clearAllMocks();

      rerender(<UnitTopMedicinesTable {...mockProps} unitId={2} />);

      await waitFor(() => {
        expect(mockGetTopMedicinesInUnit).toHaveBeenCalledWith(2, [1, 2, 3]);
      });
    });

    it('refetches data when selectedMedicines changes', async () => {
      const { rerender } = render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(mockGetTopMedicinesInUnit).toHaveBeenCalledWith(1, [1, 2, 3]);
      });

      jest.clearAllMocks();

      rerender(<UnitTopMedicinesTable {...mockProps} selectedMedicines={[4, 5, 6]} />);

      await waitFor(() => {
        expect(mockGetTopMedicinesInUnit).toHaveBeenCalledWith(1, [4, 5, 6]);
      });
    });

    it('updates unit name in title', async () => {
      const { rerender } = render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Top 5 Medicines in ICU')).toBeInTheDocument();
      });

      rerender(<UnitTopMedicinesTable {...mockProps} unitName="Emergency" />);

      await waitFor(() => {
        expect(screen.getByText('Top 5 Medicines in Emergency')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state initially', async () => {
      mockGetTopMedicinesInUnit.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockMedicinesData }), 100))
      );

      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Loading medicines...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading medicines...')).not.toBeInTheDocument();
      });
    });

    it('hides loading state after data is loaded', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading medicines...')).not.toBeInTheDocument();
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });
    });
  });

  describe('Medicine Data Display', () => {
    it('displays all medicine data correctly', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        // Check medicine names
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
        expect(screen.getByText('Ibuprofen 400mg')).toBeInTheDocument();

        // Check codes
        expect(screen.getByText('PAR001')).toBeInTheDocument();
        expect(screen.getByText('AMX001')).toBeInTheDocument();
        expect(screen.getByText('IBU001')).toBeInTheDocument();

        // Check stock numbers
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('75')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('displays status badges correctly', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        const availableBadges = screen.getAllByText('Available');
        const outOfStockBadge = screen.getByText('Out of Stock');

        expect(availableBadges).toHaveLength(4);
        expect(outOfStockBadge).toBeInTheDocument();

        // Fix: Check badge colors on the div element itself, not closest span
        expect(outOfStockBadge.closest('div')).toHaveClass('bg-red-500');
        availableBadges.forEach(badge => {
          expect(badge.closest('div')).toHaveClass('bg-green-500');
        });
      });
    });

    it('handles custom status correctly', async () => {
      const customStatusData = [
        {
          ...mockMedicinesData[0],
          status: 'Low Stock',
        },
      ];

      mockGetTopMedicinesInUnit.mockResolvedValue({
        success: true,
        data: customStatusData,
      });

      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        const customBadge = screen.getByText('Low Stock');
        expect(customBadge).toBeInTheDocument();
        // Fix: Check badge colors on the div element itself, not closest span
        expect(customBadge.closest('div')).toHaveClass('bg-gray-500');
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters medicines by name', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      fireEvent.change(searchInput, { target: { value: 'Paracetamol' } });

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
      });
    });

    it('filters medicines by code', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('PAR001')).toBeInTheDocument();
        expect(screen.getByText('AMX001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      fireEvent.change(searchInput, { target: { value: 'AMX' } });

      await waitFor(() => {
        expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
        expect(screen.queryByText('Paracetamol 500mg')).not.toBeInTheDocument();
      });
    });

    it('is case insensitive', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      fireEvent.change(searchInput, { target: { value: 'PARACETAMOL' } });

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });
    });

    it('shows no results when search has no matches', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      fireEvent.change(searchInput, { target: { value: 'NonexistentMedicine' } });

      await waitFor(() => {
        expect(screen.getByText('No medicines found')).toBeInTheDocument();
        expect(screen.queryByText('Paracetamol 500mg')).not.toBeInTheDocument();
      });
    });

    it('resets filter when search is cleared', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      
      // Apply filter
      fireEvent.change(searchInput, { target: { value: 'Paracetamol' } });

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
      });

      // Clear filter
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
      });
    });

    it('maintains search state during data updates', async () => {
      const { rerender } = render(<UnitTopMedicinesTable {...mockProps} />);

      const searchInput = screen.getByPlaceholderText('Search medicines...');
      fireEvent.change(searchInput, { target: { value: 'Paracetamol' } });

      await waitFor(() => {
        expect(searchInput).toHaveValue('Paracetamol');
      });

      // Re-render with different unitName (but same data)
      rerender(<UnitTopMedicinesTable {...mockProps} unitName="Emergency" />);

      await waitFor(() => {
        expect(searchInput).toHaveValue('Paracetamol');
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });
    });
  });

  describe('Empty Data State', () => {
    it('shows no data message when medicines array is empty', async () => {
      mockGetTopMedicinesInUnit.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('No medicines found')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });

    it('shows no data message when API returns null data', async () => {
      mockGetTopMedicinesInUnit.mockResolvedValue({
        success: true,
        data: null,
      });

      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch top medicines')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockGetTopMedicinesInUnit.mockRejectedValue(new Error('API Error'));

      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching top medicines:', expect.any(Error));
        expect(screen.getByText('An error occurred while fetching top medicines')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles failed API responses', async () => {
      mockGetTopMedicinesInUnit.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      });
    });

    it('shows error message with red styling', async () => {
      mockGetTopMedicinesInUnit.mockResolvedValue({
        success: false,
        error: 'Network timeout',
      });

      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        const errorElement = screen.getByText('Network timeout');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement.closest('div')).toHaveClass('text-red-500');
      });
    });
  });

  describe('Hydration and SSR', () => {
    it('returns null before mounting', () => {
      // Mock useEffect to prevent mounting
      const originalUseEffect = React.useEffect;
      React.useEffect = jest.fn();

      const { container } = render(<UnitTopMedicinesTable {...mockProps} />);
      
      expect(container.firstChild).toBeNull();

      React.useEffect = originalUseEffect;
    });

    it('renders content after mounting', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Top 5 Medicines in ICU')).toBeInTheDocument();
      });
    });

    it('does not call API before mounting', () => {
      const originalUseEffect = React.useEffect;
      React.useEffect = jest.fn();

      render(<UnitTopMedicinesTable {...mockProps} />);
      
      expect(mockGetTopMedicinesInUnit).not.toHaveBeenCalled();

      React.useEffect = originalUseEffect;
    });
  });

  describe('Table Layout', () => {
    it('applies correct table styling', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        // Fix: Check the parent div of the table, not the table's closest div
        const tableWrapper = screen.getByRole('table').closest('div')?.parentElement;
        expect(tableWrapper).toHaveClass('border', 'rounded-md');
      });
    });

    it('applies correct cell alignment', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        const stockHeader = screen.getByText('Stock');
        expect(stockHeader).toHaveClass('text-right');

        // Check stock cells are right-aligned
        const stockCells = screen.getAllByRole('cell');
        const stockCell = stockCells.find(cell => cell.textContent === '150');
        expect(stockCell).toHaveClass('text-right');
      });
    });

    it('applies font styling to medicine names', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        const nameCell = screen.getByText('Paracetamol 500mg').closest('td');
        expect(nameCell).toHaveClass('font-medium');
      });
    });
  });

  describe('Performance', () => {
    it('only fetches data after mounting', async () => {
      render(<UnitTopMedicinesTable {...mockProps} />);

      // Should call API after mounting
      await waitFor(() => {
        expect(mockGetTopMedicinesInUnit).toHaveBeenCalledTimes(1);
      });
    });

    it('does not refetch data on unrelated re-renders', async () => {
      const { rerender } = render(<UnitTopMedicinesTable {...mockProps} />);

      await waitFor(() => {
        expect(mockGetTopMedicinesInUnit).toHaveBeenCalledTimes(1);
      });

      // Re-render with same props
      rerender(<UnitTopMedicinesTable {...mockProps} />);

      // Should not call API again
      expect(mockGetTopMedicinesInUnit).toHaveBeenCalledTimes(1);
    });

    it('maintains filtered state during re-renders', async () => {
      const { rerender } = render(<UnitTopMedicinesTable {...mockProps} />);

      // Apply search filter
      const searchInput = screen.getByPlaceholderText('Search medicines...');
      fireEvent.change(searchInput, { target: { value: 'Paracetamol' } });

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
      });

      // Re-render component
      rerender(<UnitTopMedicinesTable {...mockProps} />);

      // Filter should still be applied
      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
      });
    });
  });
});
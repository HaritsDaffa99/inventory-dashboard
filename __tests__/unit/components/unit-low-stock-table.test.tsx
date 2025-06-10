import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnitLowStockTable } from '@/components/unit/unit-low-stock-table';
import { getLowStockWarnings } from '@/lib/actions/unit-stock-history';

// Mock the action
jest.mock('@/lib/actions/unit-stock-history');
const mockGetLowStockWarnings = getLowStockWarnings as jest.MockedFunction<typeof getLowStockWarnings>;

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ChevronLeft: () => <div data-testid="chevron-left" />,
  ChevronRight: () => <div data-testid="chevron-right" />,
  ChevronsLeft: () => <div data-testid="chevrons-left" />,
  ChevronsRight: () => <div data-testid="chevrons-right" />,
}));

describe('UnitLowStockTable', () => {
  const defaultProps = {
    unitId: 1,
    selectedMedicines: [],
    unitName: 'Test Unit',
  };

  const mockLowStockData = [
    {
      id: 1,
      name: 'Paracetamol 500mg',
      code: 'PAR500',
      currentStock: 5,
      unit: 'tablets',
      minimumThreshold: 20,
      status: 'Low Stock',
      expiryDate: new Date('2024-12-31'),
      nusp: 'NSP001',
      daysRemaining: 180,
    },
    {
      id: 2,
      name: 'Amoxicillin 250mg',
      code: 'AMX250',
      currentStock: 3,
      unit: 'capsules',
      minimumThreshold: 15,
      status: 'Low Stock & Expiring Soon',
      expiryDate: new Date('2024-07-15'),
      nusp: 'NSP002',
      daysRemaining: 30,
    },
    {
      id: 3,
      name: 'Aspirin 100mg',
      code: 'ASP100',
      currentStock: 25,
      unit: 'tablets',
      minimumThreshold: 30,
      status: 'Expiring Soon',
      expiryDate: new Date('2024-06-30'),
      nusp: 'NSP003',
      daysRemaining: 15,
    },
    {
      id: 4,
      name: 'Ibuprofen 400mg',
      code: 'IBU400',
      currentStock: 12,
      unit: 'tablets',
      minimumThreshold: 25,
      status: 'Low Stock',
      expiryDate: new Date('2025-01-15'),
      nusp: 'NSP004',
      daysRemaining: 365,
    },
    {
      id: 5,
      name: 'Vitamin C 500mg',
      code: 'VIT500',
      currentStock: 8,
      unit: 'tablets',
      minimumThreshold: 20,
      status: 'Low Stock',
      expiryDate: new Date('2024-11-30'),
      nusp: 'NSP005',
      daysRemaining: 150,
    },
    {
      id: 6,
      name: 'Cetirizine 10mg',
      code: 'CET010',
      currentStock: 40,
      unit: 'tablets',
      minimumThreshold: 50,
      status: 'Good',
      expiryDate: new Date('2025-03-15'),
      nusp: 'NSP006',
      daysRemaining: 450,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLowStockWarnings.mockResolvedValue({
      success: true,
      data: mockLowStockData,
    });
  });

  describe('Component Rendering', () => {
    it('renders the component with correct title and description', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Low Stock Warning in Test Unit')).toBeInTheDocument();
        expect(screen.getByText('Medicines requiring replenishment')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      render(<UnitLowStockTable {...defaultProps} />);

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('calls getLowStockWarnings with correct parameters', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetLowStockWarnings).toHaveBeenCalledWith(1, undefined);
      });
    });

    it('calls getLowStockWarnings with selected medicines when provided', async () => {
      const propsWithSelectedMedicines = {
        ...defaultProps,
        selectedMedicines: [1, 2, 3],
      };

      render(<UnitLowStockTable {...propsWithSelectedMedicines} />);

      await waitFor(() => {
        expect(mockGetLowStockWarnings).toHaveBeenCalledWith(1, [1, 2, 3]);
      });
    });
  });

  describe('Data Display', () => {
    it('displays low stock data in table format', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByText('PAR500')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        
        // Use more specific selectors for values that appear multiple times
        const tableRows = screen.getAllByRole('row');
        const paracetamolRow = tableRows.find(row => row.textContent?.includes('Paracetamol 500mg'));
        expect(paracetamolRow).toHaveTextContent('20'); // minimum threshold for Paracetamol
      });
    });

    it('displays table headers correctly', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Medicine Name')).toBeInTheDocument();
        expect(screen.getByText('Code')).toBeInTheDocument();
        expect(screen.getByText('Current Stock')).toBeInTheDocument();
        expect(screen.getByText('Minimum Threshold')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('displays all low stock items within page limit', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        // Should show first 5 items (itemsPerPage = 5)
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
        expect(screen.getByText('Aspirin 100mg')).toBeInTheDocument();
        expect(screen.getByText('Ibuprofen 400mg')).toBeInTheDocument();
        expect(screen.getByText('Vitamin C 500mg')).toBeInTheDocument();
        
        // Should not show 6th item on first page
        expect(screen.queryByText('Cetirizine 10mg')).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Badges', () => {
    it('displays correct badge for "Low Stock & Expiring Soon" status', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const badge = screen.getByText('Low Stock & Expiring Soon');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-red-500');
      });
    });

    it('displays correct badge for "Low Stock" status', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const badges = screen.getAllByText('Low Stock');
        expect(badges.length).toBeGreaterThan(0);
        badges.forEach(badge => {
          expect(badge).toHaveClass('bg-amber-500');
        });
      });
    });

    it('displays correct badge for "Expiring Soon" status', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const badge = screen.getByText('Expiring Soon');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-blue-500');
      });
    });

    it('displays correct badge for "Good" status', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      // Navigate to second page to see "Good" status item
      await waitFor(() => {
        const nextButton = screen.getByTestId('chevron-right').closest('button');
        if (nextButton && !nextButton.hasAttribute('disabled')) {
          fireEvent.click(nextButton);
        }
      });

      await waitFor(() => {
        const badge = screen.getByText('Good');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-green-500');
      });
    });
  });

  describe('Pagination', () => {
    it('shows correct pagination info', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Showing 1-5 of 6 items')).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('disables previous/first page buttons on first page', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const firstPageButton = screen.getByTestId('chevrons-left').closest('button');
        const previousPageButton = screen.getByTestId('chevron-left').closest('button');

        expect(firstPageButton).toBeDisabled();
        expect(previousPageButton).toBeDisabled();
      });
    });

    it('enables next/last page buttons when there are more pages', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const nextPageButton = screen.getByTestId('chevron-right').closest('button');
        const lastPageButton = screen.getByTestId('chevrons-right').closest('button');

        expect(nextPageButton).not.toBeDisabled();
        expect(lastPageButton).not.toBeDisabled();
      });
    });

    it('navigates to next page when next button is clicked', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const nextButton = screen.getByTestId('chevron-right').closest('button');
        fireEvent.click(nextButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
        expect(screen.getByText('Showing 6-6 of 6 items')).toBeInTheDocument();
        expect(screen.getByText('Cetirizine 10mg')).toBeInTheDocument();
      });
    });

    it('navigates to previous page when previous button is clicked', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      // First go to page 2
      await waitFor(() => {
        const nextButton = screen.getByTestId('chevron-right').closest('button');
        fireEvent.click(nextButton!);
      });

      // Then go back to page 1
      await waitFor(() => {
        const previousButton = screen.getByTestId('chevron-left').closest('button');
        fireEvent.click(previousButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });
    });

    it('navigates to first page when first page button is clicked', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      // Go to page 2 first
      await waitFor(() => {
        const nextButton = screen.getByTestId('chevron-right').closest('button');
        fireEvent.click(nextButton!);
      });

      // Then click first page button
      await waitFor(() => {
        const firstPageButton = screen.getByTestId('chevrons-left').closest('button');
        fireEvent.click(firstPageButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      });
    });

    it('navigates to last page when last page button is clicked', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const lastPageButton = screen.getByTestId('chevrons-right').closest('button');
        fireEvent.click(lastPageButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
        expect(screen.getByText('Cetirizine 10mg')).toBeInTheDocument();
      });
    });

    it('disables next/last page buttons on last page', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      // Navigate to last page
      await waitFor(() => {
        const lastPageButton = screen.getByTestId('chevrons-right').closest('button');
        fireEvent.click(lastPageButton!);
      });

      await waitFor(() => {
        const nextPageButton = screen.getByTestId('chevron-right').closest('button');
        const lastPageButton = screen.getByTestId('chevrons-right').closest('button');

        expect(nextPageButton).toBeDisabled();
        expect(lastPageButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      mockGetLowStockWarnings.mockResolvedValue({
        success: false,
        error: 'Failed to fetch low stock warnings',
      });

      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch low stock warnings')).toBeInTheDocument();
      });
    });

    it('displays generic error message when API throws exception', async () => {
      mockGetLowStockWarnings.mockRejectedValue(new Error('Network error'));

      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('An error occurred while fetching low stock warnings')).toBeInTheDocument();
      });
    });

    it('applies error styling to error message', async () => {
      mockGetLowStockWarnings.mockResolvedValue({
        success: false,
        error: 'Test error',
      });

      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const errorElement = screen.getByText('Test error');
        expect(errorElement.closest('div')).toHaveClass('text-red-500');
      });
    });
  });

  describe('Empty State', () => {
    it('displays no data message when no low stock items are found', async () => {
      mockGetLowStockWarnings.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No low stock items found')).toBeInTheDocument();
      });
    });

    it('applies correct styling to empty state message', async () => {
      mockGetLowStockWarnings.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const emptyMessage = screen.getByText('No low stock items found');
        expect(emptyMessage).toHaveClass('text-muted-foreground');
      });
    });
  });

  describe('Props Changes', () => {
    it('refetches data when unitId changes', async () => {
      const { rerender } = render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetLowStockWarnings).toHaveBeenCalledWith(1, undefined);
      });

      rerender(<UnitLowStockTable {...defaultProps} unitId={2} />);

      await waitFor(() => {
        expect(mockGetLowStockWarnings).toHaveBeenCalledWith(2, undefined);
      });
    });

    it('refetches data when selectedMedicines change', async () => {
      const { rerender } = render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetLowStockWarnings).toHaveBeenCalledWith(1, undefined);
      });

      rerender(<UnitLowStockTable {...defaultProps} selectedMedicines={[1, 2]} />);

      await waitFor(() => {
        expect(mockGetLowStockWarnings).toHaveBeenCalledWith(1, [1, 2]);
      });
    });

    it('updates unit name in title when unitName changes', async () => {
      const { rerender } = render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Low Stock Warning in Test Unit')).toBeInTheDocument();
      });

      rerender(<UnitLowStockTable {...defaultProps} unitName="New Unit" />);

      expect(screen.getByText('Low Stock Warning in New Unit')).toBeInTheDocument();
    });
  });

  describe('Pagination Edge Cases', () => {
    it('handles pagination with single item correctly', async () => {
      mockGetLowStockWarnings.mockResolvedValue({
        success: true,
        data: [mockLowStockData[0]],
      });

      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Showing 1-1 of 1 items')).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
      });
    });

    it('handles pagination with exactly itemsPerPage items', async () => {
      mockGetLowStockWarnings.mockResolvedValue({
        success: true,
        data: mockLowStockData.slice(0, 5), // Exactly 5 items
      });

      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Showing 1-5 of 5 items')).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
      });
    });

    it('disables all pagination buttons when no data', async () => {
      mockGetLowStockWarnings.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No low stock items found')).toBeInTheDocument();
      });

      // Check that pagination controls are not visible when there's no data
      expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    });
  });

  describe('Hydration Protection', () => {
    it('handles client-side rendering correctly', async () => {
      render(<UnitLowStockTable {...defaultProps} />);
      
      // Component should render loading state initially
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      
      // Then should show data after API call
      await waitFor(() => {
        expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('uses semantic table structure', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader')).toHaveLength(5);
        expect(screen.getAllByRole('row')).toHaveLength(6); // 1 header + 5 data rows
      });
    });

    it('provides accessible button labels', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toBeInTheDocument();
        });
      });
    });

    it('maintains proper table cell structure', async () => {
      render(<UnitLowStockTable {...defaultProps} />);

      await waitFor(() => {
        const cells = screen.getAllByRole('cell');
        expect(cells.length).toBe(25); // 5 columns × 5 rows
      });
    });
  });
});
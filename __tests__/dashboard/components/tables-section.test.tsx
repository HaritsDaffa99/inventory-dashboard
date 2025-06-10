import { render, screen } from '@testing-library/react';
import { TablesSection } from '@/components/dashboard/tables-section';

// Mock child components
jest.mock('../../../components/dashboard/top-items-table', () => ({
  TopItemsTable: function MockTopItemsTable({ selectedMedicines }: { selectedMedicines: number[] }) {
    return (
      <div data-testid="top-items-table" data-selected-medicines={JSON.stringify(selectedMedicines)}>
        Top Items Table - Medicines: {selectedMedicines.length}
      </div>
    );
  },
}));

jest.mock('../../../components/dashboard/top-locations-table', () => ({
  TopLocationsTable: function MockTopLocationsTable() {
    return (
      <div data-testid="top-locations-table">
        Top Locations Table Component
      </div>
    );
  },
}));

describe('TablesSection', () => {
  const mockSelectedMedicines = [1, 2, 3, 4, 5];

  it('renders both table components', () => {
    render(<TablesSection selectedMedicines={mockSelectedMedicines} />);

    expect(screen.getByTestId('top-items-table')).toBeInTheDocument();
    expect(screen.getByTestId('top-locations-table')).toBeInTheDocument();
  });

  it('applies correct grid layout classes', () => {
    const { container } = render(<TablesSection selectedMedicines={mockSelectedMedicines} />);
    
    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer).toHaveClass('grid', 'gap-4', 'grid-cols-12');

    // Top Items Table container should span 8 columns
    const itemsTableContainer = screen.getByTestId('top-items-table').parentElement;
    expect(itemsTableContainer).toHaveClass('col-span-8');

    // Top Locations Table container should span 4 columns
    const locationsTableContainer = screen.getByTestId('top-locations-table').parentElement;
    expect(locationsTableContainer).toHaveClass('col-span-4');
  });

  it('passes selectedMedicines prop to TopItemsTable correctly', () => {
    render(<TablesSection selectedMedicines={mockSelectedMedicines} />);

    const topItemsTable = screen.getByTestId('top-items-table');
    expect(topItemsTable).toHaveAttribute('data-selected-medicines', JSON.stringify(mockSelectedMedicines));
    expect(topItemsTable).toHaveTextContent('Medicines: 5');
  });

  it('does not pass props to TopLocationsTable', () => {
    render(<TablesSection selectedMedicines={mockSelectedMedicines} />);

    const topLocationsTable = screen.getByTestId('top-locations-table');
    expect(topLocationsTable).toHaveTextContent('Top Locations Table Component');
    
    // Should not have any data attributes related to medicines
    expect(topLocationsTable).not.toHaveAttribute('data-selected-medicines');
  });

  it('handles empty selectedMedicines array', () => {
    render(<TablesSection selectedMedicines={[]} />);

    const topItemsTable = screen.getByTestId('top-items-table');
    expect(topItemsTable).toHaveAttribute('data-selected-medicines', JSON.stringify([]));
    expect(topItemsTable).toHaveTextContent('Medicines: 0');
  });

  it('handles different selectedMedicines arrays', () => {
    const { rerender } = render(<TablesSection selectedMedicines={[1, 2]} />);

    let topItemsTable = screen.getByTestId('top-items-table');
    expect(topItemsTable).toHaveAttribute('data-selected-medicines', JSON.stringify([1, 2]));
    expect(topItemsTable).toHaveTextContent('Medicines: 2');

    // Rerender with different medicines
    rerender(<TablesSection selectedMedicines={[10, 20, 30, 40]} />);

    topItemsTable = screen.getByTestId('top-items-table');
    expect(topItemsTable).toHaveAttribute('data-selected-medicines', JSON.stringify([10, 20, 30, 40]));
    expect(topItemsTable).toHaveTextContent('Medicines: 4');
  });

  it('renders with correct semantic structure', () => {
    const { container } = render(<TablesSection selectedMedicines={mockSelectedMedicines} />);

    // Main container should be a div with grid classes
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.tagName).toBe('DIV');
    expect(mainContainer).toHaveClass('grid', 'gap-4', 'grid-cols-12');

    // Should have exactly 2 direct children (table containers)
    expect(mainContainer.children).toHaveLength(2);
  });

  it('maintains responsive grid layout', () => {
    render(<TablesSection selectedMedicines={mockSelectedMedicines} />);

    // Top Items Table should take 2/3 of the space (8/12 columns)
    const itemsTableContainer = screen.getByTestId('top-items-table').parentElement;
    expect(itemsTableContainer).toHaveClass('col-span-8');

    // Top Locations Table should take 1/3 of the space (4/12 columns)
    const locationsTableContainer = screen.getByTestId('top-locations-table').parentElement;
    expect(locationsTableContainer).toHaveClass('col-span-4');
  });

  it('renders consistently across different prop values', () => {
    const testCases = [
      [],
      [1],
      [1, 2, 3],
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    ];

    testCases.forEach((medicines, index) => {
      const { container, unmount } = render(<TablesSection selectedMedicines={medicines} />);

      // Should always render the same structure
      expect(container.firstChild).toHaveClass('grid', 'gap-4', 'grid-cols-12');
      expect(screen.getByTestId('top-items-table')).toBeInTheDocument();
      expect(screen.getByTestId('top-locations-table')).toBeInTheDocument();

      // Should pass correct props to TopItemsTable
      const topItemsTable = screen.getByTestId('top-items-table');
      expect(topItemsTable).toHaveAttribute('data-selected-medicines', JSON.stringify(medicines));
      expect(topItemsTable).toHaveTextContent(`Medicines: ${medicines.length}`);

      // TopLocationsTable should remain unchanged
      const topLocationsTable = screen.getByTestId('top-locations-table');
      expect(topLocationsTable).toHaveTextContent('Top Locations Table Component');

      unmount();
    });
  });

  it('applies correct CSS classes to component structure', () => {
    const { container } = render(<TablesSection selectedMedicines={mockSelectedMedicines} />);

    // Main grid container
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('grid');
    expect(mainContainer).toHaveClass('gap-4');
    expect(mainContainer).toHaveClass('grid-cols-12');

    // Top Items Table wrapper
    const itemsTableWrapper = mainContainer.children[0] as HTMLElement;
    expect(itemsTableWrapper).toHaveClass('col-span-8');

    // Top Locations Table wrapper
    const locationsTableWrapper = mainContainer.children[1] as HTMLElement;
    expect(locationsTableWrapper).toHaveClass('col-span-4');
  });

  it('renders components in correct order', () => {
    const { container } = render(<TablesSection selectedMedicines={mockSelectedMedicines} />);

    const mainContainer = container.firstChild as HTMLElement;
    const children = Array.from(mainContainer.children);

    // First child should contain the TopItemsTable
    expect(children[0]).toContainElement(screen.getByTestId('top-items-table'));
    expect(children[0]).toHaveClass('col-span-8');

    // Second child should contain the TopLocationsTable
    expect(children[1]).toContainElement(screen.getByTestId('top-locations-table'));
    expect(children[1]).toHaveClass('col-span-4');
  });

  it('handles prop updates correctly', () => {
    const { rerender } = render(<TablesSection selectedMedicines={[1, 2, 3]} />);

    // Initial state
    let topItemsTable = screen.getByTestId('top-items-table');
    expect(topItemsTable).toHaveTextContent('Medicines: 3');

    // Update props
    rerender(<TablesSection selectedMedicines={[5, 6, 7, 8, 9]} />);

    // Should update TopItemsTable props
    topItemsTable = screen.getByTestId('top-items-table');
    expect(topItemsTable).toHaveTextContent('Medicines: 5');
    expect(topItemsTable).toHaveAttribute('data-selected-medicines', JSON.stringify([5, 6, 7, 8, 9]));

    // TopLocationsTable should remain unchanged
    expect(screen.getByTestId('top-locations-table')).toHaveTextContent('Top Locations Table Component');
  });

  it('is a stateless component', () => {
    // Component should be purely based on props
    const { container: container1 } = render(<TablesSection selectedMedicines={[1, 2, 3]} />);
    const html1 = container1.innerHTML;

    const { container: container2 } = render(<TablesSection selectedMedicines={[1, 2, 3]} />);
    const html2 = container2.innerHTML;

    // Same props should produce identical output
    expect(html1).toBe(html2);
  });

  it('maintains correct layout proportions', () => {
    render(<TablesSection selectedMedicines={mockSelectedMedicines} />);

    const itemsTableContainer = screen.getByTestId('top-items-table').parentElement;
    const locationsTableContainer = screen.getByTestId('top-locations-table').parentElement;

    // Verify the 2:1 ratio (8:4 columns)
    expect(itemsTableContainer).toHaveClass('col-span-8');
    expect(locationsTableContainer).toHaveClass('col-span-4');

    // Both should be direct children of the grid container
    expect(itemsTableContainer?.parentElement).toBe(locationsTableContainer?.parentElement);
  });

  it('renders table components with proper separation', () => {
    const { container } = render(<TablesSection selectedMedicines={mockSelectedMedicines} />);

    const mainContainer = container.firstChild as HTMLElement;
    
    // Should have gap-4 class for proper spacing
    expect(mainContainer).toHaveClass('gap-4');

    // Both table containers should be direct children
    const itemsContainer = screen.getByTestId('top-items-table').parentElement;
    const locationsContainer = screen.getByTestId('top-locations-table').parentElement;

    expect(itemsContainer?.parentElement).toBe(mainContainer);
    expect(locationsContainer?.parentElement).toBe(mainContainer);
  });
});
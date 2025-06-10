import { render, screen } from '@testing-library/react';
import { ItemsSection } from '@/components/dashboard/items-section';

// Mock child components
jest.mock('../../../components/dashboard/top-items-chart', () => ({
  TopItemsChart: function MockTopItemsChart({ selectedMedicines }: { selectedMedicines: number[] }) {
    return (
      <div data-testid="top-items-chart" data-selected-medicines={JSON.stringify(selectedMedicines)}>
        Top Items Chart - Medicines: {selectedMedicines.length}
      </div>
    );
  },
}));

jest.mock('../../../components/dashboard/blank-container', () => ({
  BlankContainer: function MockBlankContainer() {
    return (
      <div data-testid="blank-container">
        Blank Container Component
      </div>
    );
  },
}));

describe('ItemsSection', () => {
  const mockSelectedMedicines = [1, 2, 3, 4, 5];

  it('renders both chart and blank container components', () => {
    render(<ItemsSection selectedMedicines={mockSelectedMedicines} />);

    expect(screen.getByTestId('top-items-chart')).toBeInTheDocument();
    expect(screen.getByTestId('blank-container')).toBeInTheDocument();
  });

  it('applies correct grid layout classes', () => {
    const { container } = render(<ItemsSection selectedMedicines={mockSelectedMedicines} />);
    
    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer).toHaveClass('grid', 'gap-4', 'grid-cols-12');

    // Chart container should span 8 columns
    const chartContainer = screen.getByTestId('top-items-chart').parentElement;
    expect(chartContainer).toHaveClass('col-span-8');

    // Blank container should span 4 columns
    const blankContainerWrapper = screen.getByTestId('blank-container').parentElement;
    expect(blankContainerWrapper).toHaveClass('col-span-4');
  });

  it('passes selectedMedicines prop to TopItemsChart correctly', () => {
    render(<ItemsSection selectedMedicines={mockSelectedMedicines} />);

    const topItemsChart = screen.getByTestId('top-items-chart');
    expect(topItemsChart).toHaveAttribute('data-selected-medicines', JSON.stringify(mockSelectedMedicines));
    expect(topItemsChart).toHaveTextContent('Medicines: 5');
  });

  it('handles empty selectedMedicines array', () => {
    render(<ItemsSection selectedMedicines={[]} />);

    const topItemsChart = screen.getByTestId('top-items-chart');
    expect(topItemsChart).toHaveAttribute('data-selected-medicines', JSON.stringify([]));
    expect(topItemsChart).toHaveTextContent('Medicines: 0');
  });

  it('handles different selectedMedicines arrays', () => {
    const { rerender } = render(<ItemsSection selectedMedicines={[1, 2]} />);

    let topItemsChart = screen.getByTestId('top-items-chart');
    expect(topItemsChart).toHaveAttribute('data-selected-medicines', JSON.stringify([1, 2]));
    expect(topItemsChart).toHaveTextContent('Medicines: 2');

    // Rerender with different medicines
    rerender(<ItemsSection selectedMedicines={[10, 20, 30, 40]} />);

    topItemsChart = screen.getByTestId('top-items-chart');
    expect(topItemsChart).toHaveAttribute('data-selected-medicines', JSON.stringify([10, 20, 30, 40]));
    expect(topItemsChart).toHaveTextContent('Medicines: 4');
  });

  it('renders blank container without props', () => {
    render(<ItemsSection selectedMedicines={mockSelectedMedicines} />);

    const blankContainer = screen.getByTestId('blank-container');
    expect(blankContainer).toHaveTextContent('Blank Container Component');
  });

  it('renders with correct semantic structure', () => {
    const { container } = render(<ItemsSection selectedMedicines={mockSelectedMedicines} />);

    // Main container should be a div with grid classes
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.tagName).toBe('DIV');
    expect(mainContainer).toHaveClass('grid', 'gap-4', 'grid-cols-12');

    // Should have exactly 2 direct children (chart and blank container wrappers)
    expect(mainContainer.children).toHaveLength(2);
  });

  it('maintains responsive grid layout', () => {
    render(<ItemsSection selectedMedicines={mockSelectedMedicines} />);

    // Chart should take 2/3 of the space (8/12 columns)
    const chartContainer = screen.getByTestId('top-items-chart').parentElement;
    expect(chartContainer).toHaveClass('col-span-8');

    // Blank container should take 1/3 of the space (4/12 columns)
    const blankContainerWrapper = screen.getByTestId('blank-container').parentElement;
    expect(blankContainerWrapper).toHaveClass('col-span-4');
  });

  it('renders consistently across different prop values', () => {
    const testCases = [
      [],
      [1],
      [1, 2, 3],
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    ];

    testCases.forEach((medicines, index) => {
      const { container, unmount } = render(<ItemsSection selectedMedicines={medicines} />);

      // Should always render the same structure
      expect(container.firstChild).toHaveClass('grid', 'gap-4', 'grid-cols-12');
      expect(screen.getByTestId('top-items-chart')).toBeInTheDocument();
      expect(screen.getByTestId('blank-container')).toBeInTheDocument();

      // Should pass correct props
      const topItemsChart = screen.getByTestId('top-items-chart');
      expect(topItemsChart).toHaveAttribute('data-selected-medicines', JSON.stringify(medicines));
      expect(topItemsChart).toHaveTextContent(`Medicines: ${medicines.length}`);

      unmount();
    });
  });

  it('applies correct CSS classes to component structure', () => {
    const { container } = render(<ItemsSection selectedMedicines={mockSelectedMedicines} />);

    // Main grid container
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass('grid');
    expect(mainContainer).toHaveClass('gap-4');
    expect(mainContainer).toHaveClass('grid-cols-12');

    // Chart wrapper
    const chartWrapper = mainContainer.children[0] as HTMLElement;
    expect(chartWrapper).toHaveClass('col-span-8');

    // Blank container wrapper
    const blankWrapper = mainContainer.children[1] as HTMLElement;
    expect(blankWrapper).toHaveClass('col-span-4');
  });

  it('renders components in correct order', () => {
    const { container } = render(<ItemsSection selectedMedicines={mockSelectedMedicines} />);

    const mainContainer = container.firstChild as HTMLElement;
    const children = Array.from(mainContainer.children);

    // First child should contain the chart
    expect(children[0]).toContainElement(screen.getByTestId('top-items-chart'));
    expect(children[0]).toHaveClass('col-span-8');

    // Second child should contain the blank container
    expect(children[1]).toContainElement(screen.getByTestId('blank-container'));
    expect(children[1]).toHaveClass('col-span-4');
  });

  it('handles prop updates correctly', () => {
    const { rerender } = render(<ItemsSection selectedMedicines={[1, 2, 3]} />);

    // Initial state
    let topItemsChart = screen.getByTestId('top-items-chart');
    expect(topItemsChart).toHaveTextContent('Medicines: 3');

    // Update props
    rerender(<ItemsSection selectedMedicines={[5, 6, 7, 8, 9]} />);

    // Should update chart props
    topItemsChart = screen.getByTestId('top-items-chart');
    expect(topItemsChart).toHaveTextContent('Medicines: 5');
    expect(topItemsChart).toHaveAttribute('data-selected-medicines', JSON.stringify([5, 6, 7, 8, 9]));

    // Blank container should remain unchanged
    expect(screen.getByTestId('blank-container')).toHaveTextContent('Blank Container Component');
  });

  it('is a stateless component', () => {
    // Component should be purely based on props
    const { container: container1 } = render(<ItemsSection selectedMedicines={[1, 2, 3]} />);
    const html1 = container1.innerHTML;

    const { container: container2 } = render(<ItemsSection selectedMedicines={[1, 2, 3]} />);
    const html2 = container2.innerHTML;

    // Same props should produce identical output
    expect(html1).toBe(html2);
  });
});
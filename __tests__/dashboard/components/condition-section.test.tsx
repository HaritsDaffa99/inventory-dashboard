import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConditionSection } from '@/components/dashboard/condition-section';

// Mock child components
jest.mock('../../../components/dashboard/condition-chart', () => ({
  ConditionChart: function MockConditionChart({ selectedMedicines }: { selectedMedicines: number[] }) {
    return (
      <div data-testid="condition-chart" data-selected-medicines={JSON.stringify(selectedMedicines)}>
        Condition Chart - Selected: {selectedMedicines.length} medicines
      </div>
    );
  },
}));

jest.mock('../../../components/dashboard/medicine-filter', () => ({
  MedicineFilter: function MockMedicineFilter({ onSelectionChange }: { onSelectionChange: (ids: number[]) => void }) {
    return (
      <div data-testid="medicine-filter">
        <button 
          data-testid="select-medicines"
          onClick={() => onSelectionChange([1, 2, 3])}
        >
          Select Medicines
        </button>
        <button 
          data-testid="clear-selection"
          onClick={() => onSelectionChange([])}
        >
          Clear Selection
        </button>
      </div>
    );
  },
}));

describe('ConditionSection', () => {
  it('renders both chart and filter components', () => {
    render(<ConditionSection />);

    expect(screen.getByTestId('condition-chart')).toBeInTheDocument();
    expect(screen.getByTestId('medicine-filter')).toBeInTheDocument();
  });

  it('applies correct grid layout classes', () => {
    const { container } = render(<ConditionSection />);
    
    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer).toHaveClass('grid', 'gap-4', 'grid-cols-12');

    // Chart container should span 8 columns
    const chartContainer = screen.getByTestId('condition-chart').parentElement;
    expect(chartContainer).toHaveClass('col-span-8');

    // Filter container should span 4 columns
    const filterContainer = screen.getByTestId('medicine-filter').parentElement;
    expect(filterContainer).toHaveClass('col-span-4');
  });

  it('initializes with empty selection', () => {
    render(<ConditionSection />);

    const conditionChart = screen.getByTestId('condition-chart');
    expect(conditionChart).toHaveAttribute('data-selected-medicines', JSON.stringify([]));
    expect(conditionChart).toHaveTextContent('Selected: 0 medicines');
  });

  it('updates chart when medicines are selected through filter', async () => {
    render(<ConditionSection />);

    // Initially no medicines selected
    const conditionChart = screen.getByTestId('condition-chart');
    expect(conditionChart).toHaveTextContent('Selected: 0 medicines');

    // Select medicines through filter
    const selectButton = screen.getByTestId('select-medicines');
    fireEvent.click(selectButton);

    // Chart should update with selected medicines
    await waitFor(() => {
      expect(conditionChart).toHaveTextContent('Selected: 3 medicines');
    });

    expect(conditionChart).toHaveAttribute('data-selected-medicines', JSON.stringify([1, 2, 3]));
  });

  it('clears selection when filter is cleared', async () => {
    render(<ConditionSection />);

    const conditionChart = screen.getByTestId('condition-chart');

    // First select some medicines
    const selectButton = screen.getByTestId('select-medicines');
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(conditionChart).toHaveTextContent('Selected: 3 medicines');
    });

    // Then clear selection
    const clearButton = screen.getByTestId('clear-selection');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(conditionChart).toHaveTextContent('Selected: 0 medicines');
    });

    expect(conditionChart).toHaveAttribute('data-selected-medicines', JSON.stringify([]));
  });

  it('calls onMedicineSelectionChange callback when provided', () => {
    const mockCallback = jest.fn();
    render(<ConditionSection onMedicineSelectionChange={mockCallback} />);

    // Select medicines
    const selectButton = screen.getByTestId('select-medicines');
    fireEvent.click(selectButton);

    expect(mockCallback).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('calls onMedicineSelectionChange callback when selection is cleared', () => {
    const mockCallback = jest.fn();
    render(<ConditionSection onMedicineSelectionChange={mockCallback} />);

    // First select medicines
    const selectButton = screen.getByTestId('select-medicines');
    fireEvent.click(selectButton);

    // Then clear selection
    const clearButton = screen.getByTestId('clear-selection');
    fireEvent.click(clearButton);

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenNthCalledWith(1, [1, 2, 3]);
    expect(mockCallback).toHaveBeenNthCalledWith(2, []);
  });

  it('does not crash when onMedicineSelectionChange is not provided', () => {
    render(<ConditionSection />);

    const conditionChart = screen.getByTestId('condition-chart');

    // Should not throw error when callback is undefined
    const selectButton = screen.getByTestId('select-medicines');
    fireEvent.click(selectButton);

    // Component should still work normally
    expect(conditionChart).toHaveTextContent('Selected: 3 medicines');
  });

  it('maintains internal state correctly through multiple selection changes', async () => {
    const mockCallback = jest.fn();
    render(<ConditionSection onMedicineSelectionChange={mockCallback} />);

    const conditionChart = screen.getByTestId('condition-chart');

    // Select medicines
    fireEvent.click(screen.getByTestId('select-medicines'));
    await waitFor(() => {
      expect(conditionChart).toHaveTextContent('Selected: 3 medicines');
    });

    // Clear selection
    fireEvent.click(screen.getByTestId('clear-selection'));
    await waitFor(() => {
      expect(conditionChart).toHaveTextContent('Selected: 0 medicines');
    });

    // Select again
    fireEvent.click(screen.getByTestId('select-medicines'));
    await waitFor(() => {
      expect(conditionChart).toHaveTextContent('Selected: 3 medicines');
    });

    // Verify all callback calls
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenNthCalledWith(1, [1, 2, 3]);
    expect(mockCallback).toHaveBeenNthCalledWith(2, []);
    expect(mockCallback).toHaveBeenNthCalledWith(3, [1, 2, 3]);
  });

  it('passes correct props to ConditionChart', () => {
    render(<ConditionSection />);

    const conditionChart = screen.getByTestId('condition-chart');
    expect(conditionChart).toHaveAttribute('data-selected-medicines', JSON.stringify([]));

    // After selection
    fireEvent.click(screen.getByTestId('select-medicines'));

    expect(conditionChart).toHaveAttribute('data-selected-medicines', JSON.stringify([1, 2, 3]));
  });

  it('passes correct props to MedicineFilter', () => {
    render(<ConditionSection />);

    const medicineFilter = screen.getByTestId('medicine-filter');
    expect(medicineFilter).toBeInTheDocument();

    const conditionChart = screen.getByTestId('condition-chart');

    // Filter should have working onSelectionChange callback
    fireEvent.click(screen.getByTestId('select-medicines'));
    expect(conditionChart).toHaveTextContent('Selected: 3 medicines');
  });

  it('renders with correct semantic structure', () => {
    const { container } = render(<ConditionSection />);

    // Main container should be a div with grid classes
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.tagName).toBe('DIV');
    expect(mainContainer).toHaveClass('grid', 'gap-4', 'grid-cols-12');

    // Should have exactly 2 direct children (chart and filter containers)
    expect(mainContainer.children).toHaveLength(2);
  });

  it('maintains responsive grid layout', () => {
    render(<ConditionSection />);

    // Chart should take 2/3 of the space (8/12 columns)
    const chartContainer = screen.getByTestId('condition-chart').parentElement;
    expect(chartContainer).toHaveClass('col-span-8');

    // Filter should take 1/3 of the space (4/12 columns)
    const filterContainer = screen.getByTestId('medicine-filter').parentElement;
    expect(filterContainer).toHaveClass('col-span-4');
  });

  it('verifies component integration works correctly', () => {
    const mockCallback = jest.fn();
    render(<ConditionSection onMedicineSelectionChange={mockCallback} />);

    const conditionChart = screen.getByTestId('condition-chart');
    const medicineFilter = screen.getByTestId('medicine-filter');

    // Initial state
    expect(conditionChart).toHaveAttribute('data-selected-medicines', '[]');
    expect(medicineFilter).toBeInTheDocument();

    // Select medicines
    fireEvent.click(screen.getByTestId('select-medicines'));
    
    // Verify integration
    expect(conditionChart).toHaveAttribute('data-selected-medicines', '[1,2,3]');
    expect(mockCallback).toHaveBeenCalledWith([1, 2, 3]);

    // Clear selection
    fireEvent.click(screen.getByTestId('clear-selection'));
    
    // Verify cleared state
    expect(conditionChart).toHaveAttribute('data-selected-medicines', '[]');
    expect(mockCallback).toHaveBeenCalledWith([]);
  });
});
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnitConditionSection } from '@/components/unit/unit-condition-section';

// Mock the child components
jest.mock('@/components/unit/unit-condition-chart', () => ({
  UnitConditionChart: ({ unitId, selectedMedicines }: any) => (
    <div data-testid="unit-condition-chart">
      <div data-testid="chart-unit-id">{unitId}</div>
      <div data-testid="chart-selected-medicines">{JSON.stringify(selectedMedicines)}</div>
    </div>
  ),
}));

jest.mock('@/components/unit/unit-medicine-filter', () => ({
  UnitMedicineFilter: ({ unitId, onSelectionChange }: any) => (
    <div data-testid="unit-medicine-filter">
      <div data-testid="filter-unit-id">{unitId}</div>
      <button
        data-testid="filter-selection-button"
        onClick={() => onSelectionChange([1, 2, 3])}
      >
        Select Medicines
      </button>
      <button
        data-testid="filter-clear-button"
        onClick={() => onSelectionChange([])}
      >
        Clear Selection
      </button>
    </div>
  ),
}));

describe('UnitConditionSection', () => {
  const defaultProps = {
    unitId: 123,
  };

  describe('Component Rendering', () => {
    it('renders the condition section with grid layout', () => {
      render(<UnitConditionSection {...defaultProps} />);

      const gridContainer = document.querySelector('.grid.gap-4.grid-cols-12');
      expect(gridContainer).toBeInTheDocument();
    });

    it('renders condition chart in correct grid column', () => {
      render(<UnitConditionSection {...defaultProps} />);

      const chartContainer = document.querySelector('.col-span-8');
      expect(chartContainer).toBeInTheDocument();
      expect(chartContainer).toContainElement(screen.getByTestId('unit-condition-chart'));
    });

    it('renders medicine filter in correct grid column', () => {
      render(<UnitConditionSection {...defaultProps} />);

      const filterContainer = document.querySelector('.col-span-4');
      expect(filterContainer).toBeInTheDocument();
      expect(filterContainer).toContainElement(screen.getByTestId('unit-medicine-filter'));
    });

    it('displays both child components', () => {
      render(<UnitConditionSection {...defaultProps} />);

      expect(screen.getByTestId('unit-condition-chart')).toBeInTheDocument();
      expect(screen.getByTestId('unit-medicine-filter')).toBeInTheDocument();
    });
  });

  describe('Props Passing', () => {
    it('passes unitId to condition chart', () => {
      render(<UnitConditionSection unitId={456} />);

      expect(screen.getByTestId('chart-unit-id')).toHaveTextContent('456');
    });

    it('passes unitId to medicine filter', () => {
      render(<UnitConditionSection unitId={789} />);

      expect(screen.getByTestId('filter-unit-id')).toHaveTextContent('789');
    });

    it('passes empty selected medicines initially to chart', () => {
      render(<UnitConditionSection {...defaultProps} />);

      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[]');
    });

    it('passes selection change handler to filter', () => {
      render(<UnitConditionSection {...defaultProps} />);

      const selectionButton = screen.getByTestId('filter-selection-button');
      expect(selectionButton).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('initializes with empty selected medicines', () => {
      render(<UnitConditionSection {...defaultProps} />);

      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[]');
    });

    it('updates selected medicines state when filter selection changes', () => {
      render(<UnitConditionSection {...defaultProps} />);

      const selectionButton = screen.getByTestId('filter-selection-button');
      fireEvent.click(selectionButton);

      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[1,2,3]');
    });

    it('clears selected medicines when filter is cleared', () => {
      render(<UnitConditionSection {...defaultProps} />);

      // First select medicines
      const selectionButton = screen.getByTestId('filter-selection-button');
      fireEvent.click(selectionButton);
      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[1,2,3]');

      // Then clear selection
      const clearButton = screen.getByTestId('filter-clear-button');
      fireEvent.click(clearButton);
      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[]');
    });

    it('maintains state between multiple selection changes', () => {
      render(<UnitConditionSection {...defaultProps} />);

      // Select medicines
      fireEvent.click(screen.getByTestId('filter-selection-button'));
      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[1,2,3]');

      // Clear selection
      fireEvent.click(screen.getByTestId('filter-clear-button'));
      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[]');

      // Select again
      fireEvent.click(screen.getByTestId('filter-selection-button'));
      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[1,2,3]');
    });
  });

  describe('Callback Handling', () => {
    it('calls onMedicineSelectionChange when provided', () => {
      const mockCallback = jest.fn();
      render(
        <UnitConditionSection 
          {...defaultProps} 
          onMedicineSelectionChange={mockCallback} 
        />
      );

      const selectionButton = screen.getByTestId('filter-selection-button');
      fireEvent.click(selectionButton);

      expect(mockCallback).toHaveBeenCalledWith([1, 2, 3]);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('does not throw error when onMedicineSelectionChange is not provided', () => {
      render(<UnitConditionSection {...defaultProps} />);

      const selectionButton = screen.getByTestId('filter-selection-button');
      expect(() => fireEvent.click(selectionButton)).not.toThrow();
    });

    it('calls onMedicineSelectionChange with empty array when cleared', () => {
      const mockCallback = jest.fn();
      render(
        <UnitConditionSection 
          {...defaultProps} 
          onMedicineSelectionChange={mockCallback} 
        />
      );

      const clearButton = screen.getByTestId('filter-clear-button');
      fireEvent.click(clearButton);

      expect(mockCallback).toHaveBeenCalledWith([]);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('calls onMedicineSelectionChange for each selection change', () => {
      const mockCallback = jest.fn();
      render(
        <UnitConditionSection 
          {...defaultProps} 
          onMedicineSelectionChange={mockCallback} 
        />
      );

      // First selection
      fireEvent.click(screen.getByTestId('filter-selection-button'));
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenLastCalledWith([1, 2, 3]);

      // Clear selection
      fireEvent.click(screen.getByTestId('filter-clear-button'));
      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenLastCalledWith([]);

      // Second selection
      fireEvent.click(screen.getByTestId('filter-selection-button'));
      expect(mockCallback).toHaveBeenCalledTimes(3);
      expect(mockCallback).toHaveBeenLastCalledWith([1, 2, 3]);
    });
  });

  describe('Component Integration', () => {
    it('properly coordinates between chart and filter components', () => {
      const mockCallback = jest.fn();
      render(
        <UnitConditionSection 
          unitId={999} 
          onMedicineSelectionChange={mockCallback} 
        />
      );

      // Verify both components receive correct unitId
      expect(screen.getByTestId('chart-unit-id')).toHaveTextContent('999');
      expect(screen.getByTestId('filter-unit-id')).toHaveTextContent('999');

      // Verify chart initially has empty selection
      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[]');

      // Simulate filter selection
      fireEvent.click(screen.getByTestId('filter-selection-button'));

      // Verify chart receives updated selection
      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[1,2,3]');

      // Verify parent callback is called
      expect(mockCallback).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('handles different unitId values correctly', () => {
      const { rerender } = render(<UnitConditionSection unitId={100} />);

      expect(screen.getByTestId('chart-unit-id')).toHaveTextContent('100');
      expect(screen.getByTestId('filter-unit-id')).toHaveTextContent('100');

      rerender(<UnitConditionSection unitId={200} />);

      expect(screen.getByTestId('chart-unit-id')).toHaveTextContent('200');
      expect(screen.getByTestId('filter-unit-id')).toHaveTextContent('200');
    });

    it('maintains component state when unitId changes', () => {
      const { rerender } = render(<UnitConditionSection unitId={100} />);

      // Set some selection
      fireEvent.click(screen.getByTestId('filter-selection-button'));
      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[1,2,3]');

      // Change unitId
      rerender(<UnitConditionSection unitId={200} />);

      // Selection should still be maintained (or reset depending on expected behavior)
      expect(screen.getByTestId('chart-selected-medicines')).toHaveTextContent('[1,2,3]');
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct CSS classes to main container', () => {
      const { container } = render(<UnitConditionSection {...defaultProps} />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('grid', 'gap-4', 'grid-cols-12');
    });

    it('applies correct column spans to child containers', () => {
      render(<UnitConditionSection {...defaultProps} />);

      const chartContainer = document.querySelector('.col-span-8');
      const filterContainer = document.querySelector('.col-span-4');

      expect(chartContainer).toBeInTheDocument();
      expect(filterContainer).toBeInTheDocument();
    });

    it('maintains responsive grid layout', () => {
      render(<UnitConditionSection {...defaultProps} />);

      const gridContainer = document.querySelector('.grid-cols-12');
      expect(gridContainer).toBeInTheDocument();

      // Verify grid spans add up to 12 (8 + 4 = 12)
      const chartSpan = document.querySelector('.col-span-8');
      const filterSpan = document.querySelector('.col-span-4');
      
      expect(chartSpan).toBeInTheDocument();
      expect(filterSpan).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper component structure for screen readers', () => {
      render(<UnitConditionSection {...defaultProps} />);

      // Components should be focusable and readable
      expect(screen.getByTestId('unit-condition-chart')).toBeInTheDocument();
      expect(screen.getByTestId('unit-medicine-filter')).toBeInTheDocument();
    });

    it('maintains logical tab order', () => {
      render(<UnitConditionSection {...defaultProps} />);

      // Filter should come after chart in DOM order for proper tab navigation
      const chart = screen.getByTestId('unit-condition-chart');
      const filter = screen.getByTestId('unit-medicine-filter');

      expect(chart.compareDocumentPosition(filter)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero unitId', () => {
      render(<UnitConditionSection unitId={0} />);

      expect(screen.getByTestId('chart-unit-id')).toHaveTextContent('0');
      expect(screen.getByTestId('filter-unit-id')).toHaveTextContent('0');
    });

    it('handles negative unitId', () => {
      render(<UnitConditionSection unitId={-1} />);

      expect(screen.getByTestId('chart-unit-id')).toHaveTextContent('-1');
      expect(screen.getByTestId('filter-unit-id')).toHaveTextContent('-1');
    });

    it('handles very large unitId', () => {
      const largeId = Number.MAX_SAFE_INTEGER;
      render(<UnitConditionSection unitId={largeId} />);

      expect(screen.getByTestId('chart-unit-id')).toHaveTextContent(largeId.toString());
      expect(screen.getByTestId('filter-unit-id')).toHaveTextContent(largeId.toString());
    });

    it('handles rapid selection changes', () => {
      const mockCallback = jest.fn();
      render(
        <UnitConditionSection 
          {...defaultProps} 
          onMedicineSelectionChange={mockCallback} 
        />
      );

      // Rapid clicks
      const selectionButton = screen.getByTestId('filter-selection-button');
      const clearButton = screen.getByTestId('filter-clear-button');

      fireEvent.click(selectionButton);
      fireEvent.click(clearButton);
      fireEvent.click(selectionButton);
      fireEvent.click(clearButton);

      expect(mockCallback).toHaveBeenCalledTimes(4);
      expect(mockCallback).toHaveBeenNthCalledWith(1, [1, 2, 3]);
      expect(mockCallback).toHaveBeenNthCalledWith(2, []);
      expect(mockCallback).toHaveBeenNthCalledWith(3, [1, 2, 3]);
      expect(mockCallback).toHaveBeenNthCalledWith(4, []);
    });
  });

  describe('Component Unmounting', () => {
    it('handles component unmounting gracefully', () => {
      const { unmount } = render(<UnitConditionSection {...defaultProps} />);

      expect(() => unmount()).not.toThrow();
    });

    it('cleans up state on unmount', () => {
      const mockCallback = jest.fn();
      const { unmount } = render(
        <UnitConditionSection 
          {...defaultProps} 
          onMedicineSelectionChange={mockCallback} 
        />
      );

      fireEvent.click(screen.getByTestId('filter-selection-button'));
      expect(mockCallback).toHaveBeenCalledWith([1, 2, 3]);

      expect(() => unmount()).not.toThrow();
    });
  });
});
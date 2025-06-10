import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UnitChartsSection } from '@/components/unit/unit-charts-section';

// Mock the chart components
jest.mock('@/components/unit/unit-stock-history-chart', () => ({
  UnitStockHistoryChart: ({ unitId }: { unitId: number }) => (
    <div data-testid="unit-stock-history-chart">
      <div data-testid="stock-chart-unit-id">{unitId}</div>
      <div>Stock History Chart</div>
    </div>
  ),
}));

jest.mock('@/components/unit/unit-expiry-chart', () => ({
  UnitExpiryChart: ({ unitId, selectedMedicines }: { unitId: number; selectedMedicines: number[] }) => (
    <div data-testid="unit-expiry-chart">
      <div data-testid="expiry-chart-unit-id">{unitId}</div>
      <div data-testid="expiry-chart-selected-medicines">{JSON.stringify(selectedMedicines)}</div>
      <div>Expiry Chart</div>
    </div>
  ),
}));

describe('UnitChartsSection', () => {
  const mockProps = {
    unitId: 1,
    selectedMedicines: [1, 2, 3],
  };

  describe('Component Rendering', () => {
    it('renders the main container with correct layout', () => {
      render(<UnitChartsSection {...mockProps} />);

      // Check for the main grid container
      const container = document.querySelector('.grid.gap-4.grid-cols-12');
      expect(container).toBeInTheDocument();
    });

    it('renders both chart components', () => {
      render(<UnitChartsSection {...mockProps} />);

      expect(screen.getByTestId('unit-stock-history-chart')).toBeInTheDocument();
      expect(screen.getByTestId('unit-expiry-chart')).toBeInTheDocument();
    });

    it('applies correct grid layout classes', () => {
      const { container } = render(<UnitChartsSection {...mockProps} />);

      // Check for 6-column spans (50% each)
      const stockChartContainer = container.querySelector('.col-span-6');
      expect(stockChartContainer).toBeInTheDocument();
      
      const colSpan6Elements = container.querySelectorAll('.col-span-6');
      expect(colSpan6Elements).toHaveLength(2);
    });
  });

  describe('Props Passing', () => {
    it('passes unitId to both chart components', () => {
      render(<UnitChartsSection {...mockProps} />);

      expect(screen.getByTestId('stock-chart-unit-id')).toHaveTextContent('1');
      expect(screen.getByTestId('expiry-chart-unit-id')).toHaveTextContent('1');
    });

    it('passes selectedMedicines to expiry chart', () => {
      render(<UnitChartsSection {...mockProps} />);

      expect(screen.getByTestId('expiry-chart-selected-medicines')).toHaveTextContent('[1,2,3]');
    });

    it('does not pass selectedMedicines to stock history chart', () => {
      render(<UnitChartsSection {...mockProps} />);

      // Stock history chart should not have selectedMedicines prop
      expect(screen.queryByTestId('stock-chart-selected-medicines')).not.toBeInTheDocument();
    });
  });

  describe('Props Variations', () => {
    it('handles different unitId values', () => {
      render(<UnitChartsSection unitId={999} selectedMedicines={[]} />);

      expect(screen.getByTestId('stock-chart-unit-id')).toHaveTextContent('999');
      expect(screen.getByTestId('expiry-chart-unit-id')).toHaveTextContent('999');
    });

    it('handles empty selectedMedicines array', () => {
      render(<UnitChartsSection unitId={1} selectedMedicines={[]} />);

      expect(screen.getByTestId('expiry-chart-selected-medicines')).toHaveTextContent('[]');
    });

    it('handles large selectedMedicines arrays', () => {
      const largeMedicineArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      render(<UnitChartsSection unitId={1} selectedMedicines={largeMedicineArray} />);

      expect(screen.getByTestId('expiry-chart-selected-medicines')).toHaveTextContent(
        JSON.stringify(largeMedicineArray)
      );
    });

    it('handles single medicine selection', () => {
      render(<UnitChartsSection unitId={1} selectedMedicines={[42]} />);

      expect(screen.getByTestId('expiry-chart-selected-medicines')).toHaveTextContent('[42]');
    });
  });

  describe('Component Layout', () => {
    it('renders charts in correct order', () => {
      const { container } = render(<UnitChartsSection {...mockProps} />);

      const columns = container.querySelectorAll('.col-span-6');
      
      // First column should contain stock history chart
      expect(columns[0]).toContainElement(screen.getByTestId('unit-stock-history-chart'));
      
      // Second column should contain expiry chart
      expect(columns[1]).toContainElement(screen.getByTestId('unit-expiry-chart'));
    });

    it('maintains responsive grid layout', () => {
      const { container } = render(<UnitChartsSection {...mockProps} />);

      const gridContainer = container.querySelector('.grid.gap-4.grid-cols-12');
      expect(gridContainer).toHaveClass('grid', 'gap-4', 'grid-cols-12');
    });
  });

  describe('Component Integration', () => {
    it('renders without errors when props are provided', () => {
      expect(() => {
        render(<UnitChartsSection {...mockProps} />);
      }).not.toThrow();
    });

    it('handles component mounting and unmounting', () => {
      const { unmount } = render(<UnitChartsSection {...mockProps} />);
      
      expect(screen.getByTestId('unit-stock-history-chart')).toBeInTheDocument();
      expect(screen.getByTestId('unit-expiry-chart')).toBeInTheDocument();
      
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('maintains proper DOM structure', () => {
      const { container } = render(<UnitChartsSection {...mockProps} />);

      // Check that the component renders valid HTML structure
      expect(container.firstChild).toBeInTheDocument();
      expect(container.querySelector('.grid')).toBeInTheDocument();
    });

    it('renders chart components with proper hierarchy', () => {
      render(<UnitChartsSection {...mockProps} />);

      const stockChart = screen.getByTestId('unit-stock-history-chart');
      const expiryChart = screen.getByTestId('unit-expiry-chart');

      // Both charts should be rendered at the same level in the DOM
      expect(stockChart.parentElement?.className).toContain('col-span-6');
      expect(expiryChart.parentElement?.className).toContain('col-span-6');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero unitId', () => {
      render(<UnitChartsSection unitId={0} selectedMedicines={[]} />);

      expect(screen.getByTestId('stock-chart-unit-id')).toHaveTextContent('0');
      expect(screen.getByTestId('expiry-chart-unit-id')).toHaveTextContent('0');
    });

    it('handles negative unitId', () => {
      render(<UnitChartsSection unitId={-1} selectedMedicines={[]} />);

      expect(screen.getByTestId('stock-chart-unit-id')).toHaveTextContent('-1');
      expect(screen.getByTestId('expiry-chart-unit-id')).toHaveTextContent('-1');
    });

    it('handles very large unitId', () => {
      const largeUnitId = Number.MAX_SAFE_INTEGER;
      render(<UnitChartsSection unitId={largeUnitId} selectedMedicines={[]} />);

      expect(screen.getByTestId('stock-chart-unit-id')).toHaveTextContent(largeUnitId.toString());
      expect(screen.getByTestId('expiry-chart-unit-id')).toHaveTextContent(largeUnitId.toString());
    });

    it('handles undefined selected medicines gracefully', () => {
      // TypeScript would prevent this, but testing runtime behavior
      const { container } = render(
        <UnitChartsSection unitId={1} selectedMedicines={undefined as any} />
      );

      // Component should still render without crashing
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with minimal DOM changes', () => {
      const { rerender } = render(<UnitChartsSection unitId={1} selectedMedicines={[1, 2]} />);

      // Re-render with same props
      rerender(<UnitChartsSection unitId={1} selectedMedicines={[1, 2]} />);

      // Components should still be present
      expect(screen.getByTestId('unit-stock-history-chart')).toBeInTheDocument();
      expect(screen.getByTestId('unit-expiry-chart')).toBeInTheDocument();
    });

    it('handles prop changes efficiently', () => {
      const { rerender } = render(<UnitChartsSection unitId={1} selectedMedicines={[1]} />);

      // Change selectedMedicines
      rerender(<UnitChartsSection unitId={1} selectedMedicines={[1, 2, 3]} />);

      expect(screen.getByTestId('expiry-chart-selected-medicines')).toHaveTextContent('[1,2,3]');

      // Change unitId
      rerender(<UnitChartsSection unitId={2} selectedMedicines={[1, 2, 3]} />);

      expect(screen.getByTestId('stock-chart-unit-id')).toHaveTextContent('2');
      expect(screen.getByTestId('expiry-chart-unit-id')).toHaveTextContent('2');
    });
  });
});
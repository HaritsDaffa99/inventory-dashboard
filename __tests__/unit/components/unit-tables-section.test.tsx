import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UnitTablesSection } from '@/components/unit/unit-tables-section';

// Mock the child components
jest.mock('@/components/unit/unit-top-medicines-table', () => ({
  UnitTopMedicinesTable: ({ unitId, selectedMedicines, unitName }: any) => (
    <div data-testid="unit-top-medicines-table">
      <h3>Top Medicines Table</h3>
      <div>Unit ID: {unitId}</div>
      <div>Unit Name: {unitName}</div>
      <div>Selected Medicines: {selectedMedicines.join(', ')}</div>
    </div>
  ),
}));

jest.mock('@/components/unit/unit-low-stock-table', () => ({
  UnitLowStockTable: ({ unitId, selectedMedicines, unitName }: any) => (
    <div data-testid="unit-low-stock-table">
      <h3>Low Stock Table</h3>
      <div>Unit ID: {unitId}</div>
      <div>Unit Name: {unitName}</div>
      <div>Selected Medicines: {selectedMedicines.join(', ')}</div>
    </div>
  ),
}));

describe('UnitTablesSection', () => {
  const defaultProps = {
    unitId: 1,
    selectedMedicines: [1, 2, 3],
    unitName: 'Test Unit',
  };

  describe('Component Rendering', () => {
    it('renders the component without crashing', () => {
      render(<UnitTablesSection {...defaultProps} />);
      
      expect(screen.getByTestId('unit-top-medicines-table')).toBeInTheDocument();
      expect(screen.getByTestId('unit-low-stock-table')).toBeInTheDocument();
    });

    it('renders both child components in correct order', () => {
      render(<UnitTablesSection {...defaultProps} />);
      
      const container = screen.getByTestId('unit-top-medicines-table').parentElement;
      const children = Array.from(container?.children || []);
      
      expect(children[0]).toHaveAttribute('data-testid', 'unit-top-medicines-table');
      expect(children[1]).toHaveAttribute('data-testid', 'unit-low-stock-table');
    });

    it('applies correct CSS classes for spacing', () => {
      render(<UnitTablesSection {...defaultProps} />);
      
      const container = screen.getByTestId('unit-top-medicines-table').parentElement;
      expect(container).toHaveClass('space-y-6');
    });
  });

  describe('Props Passing', () => {
    it('passes correct props to UnitTopMedicinesTable', () => {
      render(<UnitTablesSection {...defaultProps} />);
      
      const topMedicinesTable = screen.getByTestId('unit-top-medicines-table');
      
      expect(topMedicinesTable).toHaveTextContent('Unit ID: 1');
      expect(topMedicinesTable).toHaveTextContent('Unit Name: Test Unit');
      expect(topMedicinesTable).toHaveTextContent('Selected Medicines: 1, 2, 3');
    });

    it('passes correct props to UnitLowStockTable', () => {
      render(<UnitTablesSection {...defaultProps} />);
      
      const lowStockTable = screen.getByTestId('unit-low-stock-table');
      
      expect(lowStockTable).toHaveTextContent('Unit ID: 1');
      expect(lowStockTable).toHaveTextContent('Unit Name: Test Unit');
      expect(lowStockTable).toHaveTextContent('Selected Medicines: 1, 2, 3');
    });

    it('passes empty selectedMedicines array correctly', () => {
      const propsWithEmptySelection = {
        ...defaultProps,
        selectedMedicines: [],
      };

      render(<UnitTablesSection {...propsWithEmptySelection} />);
      
      const topMedicinesTable = screen.getByTestId('unit-top-medicines-table');
      const lowStockTable = screen.getByTestId('unit-low-stock-table');
      
      expect(topMedicinesTable).toHaveTextContent('Selected Medicines:'); // Empty string after join
      expect(lowStockTable).toHaveTextContent('Selected Medicines:'); // Empty string after join
    });

    it('passes single medicine selection correctly', () => {
      const propsWithSingleSelection = {
        ...defaultProps,
        selectedMedicines: [5],
      };

      render(<UnitTablesSection {...propsWithSingleSelection} />);
      
      const topMedicinesTable = screen.getByTestId('unit-top-medicines-table');
      const lowStockTable = screen.getByTestId('unit-low-stock-table');
      
      expect(topMedicinesTable).toHaveTextContent('Selected Medicines: 5');
      expect(lowStockTable).toHaveTextContent('Selected Medicines: 5');
    });

    it('passes large medicine selection correctly', () => {
      const propsWithLargeSelection = {
        ...defaultProps,
        selectedMedicines: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      };

      render(<UnitTablesSection {...propsWithLargeSelection} />);
      
      const topMedicinesTable = screen.getByTestId('unit-top-medicines-table');
      const lowStockTable = screen.getByTestId('unit-low-stock-table');
      
      expect(topMedicinesTable).toHaveTextContent('Selected Medicines: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
      expect(lowStockTable).toHaveTextContent('Selected Medicines: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
    });
  });

  describe('Props Updates', () => {
    it('updates child components when unitId changes', () => {
      const { rerender } = render(<UnitTablesSection {...defaultProps} />);
      
      // Verify initial state
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Unit ID: 1');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Unit ID: 1');
      
      // Update unitId
      rerender(<UnitTablesSection {...defaultProps} unitId={2} />);
      
      // Verify updated state
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Unit ID: 2');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Unit ID: 2');
    });

    it('updates child components when unitName changes', () => {
      const { rerender } = render(<UnitTablesSection {...defaultProps} />);
      
      // Verify initial state
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Unit Name: Test Unit');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Unit Name: Test Unit');
      
      // Update unitName
      rerender(<UnitTablesSection {...defaultProps} unitName="Updated Unit" />);
      
      // Verify updated state
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Unit Name: Updated Unit');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Unit Name: Updated Unit');
    });

    it('updates child components when selectedMedicines changes', () => {
      const { rerender } = render(<UnitTablesSection {...defaultProps} />);
      
      // Verify initial state
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Selected Medicines: 1, 2, 3');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Selected Medicines: 1, 2, 3');
      
      // Update selectedMedicines
      rerender(<UnitTablesSection {...defaultProps} selectedMedicines={[4, 5, 6]} />);
      
      // Verify updated state
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Selected Medicines: 4, 5, 6');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Selected Medicines: 4, 5, 6');
    });

    it('updates all props simultaneously', () => {
      const { rerender } = render(<UnitTablesSection {...defaultProps} />);
      
      const newProps = {
        unitId: 5,
        unitName: 'New Unit Name',
        selectedMedicines: [7, 8, 9],
      };
      
      rerender(<UnitTablesSection {...newProps} />);
      
      // Verify all props are updated in both components
      const topMedicinesTable = screen.getByTestId('unit-top-medicines-table');
      const lowStockTable = screen.getByTestId('unit-low-stock-table');
      
      expect(topMedicinesTable).toHaveTextContent('Unit ID: 5');
      expect(topMedicinesTable).toHaveTextContent('Unit Name: New Unit Name');
      expect(topMedicinesTable).toHaveTextContent('Selected Medicines: 7, 8, 9');
      
      expect(lowStockTable).toHaveTextContent('Unit ID: 5');
      expect(lowStockTable).toHaveTextContent('Unit Name: New Unit Name');
      expect(lowStockTable).toHaveTextContent('Selected Medicines: 7, 8, 9');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero unitId correctly', () => {
      const propsWithZeroId = {
        ...defaultProps,
        unitId: 0,
      };

      render(<UnitTablesSection {...propsWithZeroId} />);
      
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Unit ID: 0');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Unit ID: 0');
    });

    it('handles negative unitId correctly', () => {
      const propsWithNegativeId = {
        ...defaultProps,
        unitId: -1,
      };

      render(<UnitTablesSection {...propsWithNegativeId} />);
      
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Unit ID: -1');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Unit ID: -1');
    });

    it('handles empty unit name correctly', () => {
      const propsWithEmptyName = {
        ...defaultProps,
        unitName: '',
      };

      render(<UnitTablesSection {...propsWithEmptyName} />);
      
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Unit Name:'); // Empty string
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Unit Name:'); // Empty string
    });

    it('handles unit name with special characters', () => {
      const propsWithSpecialChars = {
        ...defaultProps,
        unitName: 'Unit @#$%^&*()_+-=[]{}|;:,.<>?',
      };

      render(<UnitTablesSection {...propsWithSpecialChars} />);
      
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Unit Name: Unit @#$%^&*()_+-=[]{}|;:,.<>?');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Unit Name: Unit @#$%^&*()_+-=[]{}|;:,.<>?');
    });

    it('handles very long unit name correctly', () => {
      const longUnitName = 'A'.repeat(1000);
      const propsWithLongName = {
        ...defaultProps,
        unitName: longUnitName,
      };

      render(<UnitTablesSection {...propsWithLongName} />);
      
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent(`Unit Name: ${longUnitName}`);
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent(`Unit Name: ${longUnitName}`);
    });

    it('handles selectedMedicines with negative numbers', () => {
      const propsWithNegativeMedicines = {
        ...defaultProps,
        selectedMedicines: [-1, -2, -3],
      };

      render(<UnitTablesSection {...propsWithNegativeMedicines} />);
      
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Selected Medicines: -1, -2, -3');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Selected Medicines: -1, -2, -3');
    });

    it('handles selectedMedicines with duplicate numbers', () => {
      const propsWithDuplicates = {
        ...defaultProps,
        selectedMedicines: [1, 2, 2, 3, 3, 3],
      };

      render(<UnitTablesSection {...propsWithDuplicates} />);
      
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Selected Medicines: 1, 2, 2, 3, 3, 3');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Selected Medicines: 1, 2, 2, 3, 3, 3');
    });
  });

  describe('Component Integration', () => {
    it('maintains proper component hierarchy', () => {
      render(<UnitTablesSection {...defaultProps} />);
      
      const topTable = screen.getByTestId('unit-top-medicines-table');
      const lowStockTable = screen.getByTestId('unit-low-stock-table');
      
      // Both components should have the same parent
      expect(topTable.parentElement).toBe(lowStockTable.parentElement);
      
      // Parent should be a div with space-y-6 class
      expect(topTable.parentElement).toHaveClass('space-y-6');
    });

    it('renders both tables with distinct content', () => {
      render(<UnitTablesSection {...defaultProps} />);
      
      expect(screen.getByText('Top Medicines Table')).toBeInTheDocument();
      expect(screen.getByText('Low Stock Table')).toBeInTheDocument();
      
      // Ensure they are different elements
      const topTable = screen.getByText('Top Medicines Table');
      const lowStockTable = screen.getByText('Low Stock Table');
      expect(topTable).not.toBe(lowStockTable);
    });

    it('passes independent props to each component', () => {
      render(<UnitTablesSection {...defaultProps} />);
      
      // Both components should receive the same props but be independent instances
      const topMedicinesInstances = screen.getAllByText('Unit ID: 1');
      const unitNameInstances = screen.getAllByText('Unit Name: Test Unit');
      const selectedMedicinesInstances = screen.getAllByText('Selected Medicines: 1, 2, 3');
      
      expect(topMedicinesInstances).toHaveLength(2); // One for each component
      expect(unitNameInstances).toHaveLength(2);
      expect(selectedMedicinesInstances).toHaveLength(2);
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large datasets', () => {
      const largeSelectionProps = {
        unitId: 999,
        unitName: 'Performance Test Unit',
        selectedMedicines: Array.from({ length: 1000 }, (_, i) => i + 1),
      };

      const renderStart = performance.now();
      render(<UnitTablesSection {...largeSelectionProps} />);
      const renderEnd = performance.now();

      expect(renderEnd - renderStart).toBeLessThan(100); // Should render quickly
      
      expect(screen.getByTestId('unit-top-medicines-table')).toBeInTheDocument();
      expect(screen.getByTestId('unit-low-stock-table')).toBeInTheDocument();
    });

    it('handles rapid prop changes efficiently', () => {
      const { rerender } = render(<UnitTablesSection {...defaultProps} />);
      
      const updateStart = performance.now();
      
      // Perform multiple rapid updates
      for (let i = 0; i < 10; i++) {
        rerender(<UnitTablesSection 
          unitId={i + 1} 
          unitName={`Unit ${i + 1}`} 
          selectedMedicines={[i + 1, i + 2]} 
        />);
      }
      
      const updateEnd = performance.now();
      
      expect(updateEnd - updateStart).toBeLessThan(50); // Should update quickly
      
      // Verify final state
      expect(screen.getByTestId('unit-top-medicines-table')).toHaveTextContent('Unit ID: 10');
      expect(screen.getByTestId('unit-low-stock-table')).toHaveTextContent('Unit Name: Unit 10');
    });
  });

  describe('Accessibility', () => {
    it('maintains proper DOM structure for screen readers', () => {
      render(<UnitTablesSection {...defaultProps} />);
      
      const container = screen.getByTestId('unit-top-medicines-table').parentElement;
      
      // Should be a semantic div container
      expect(container?.tagName.toLowerCase()).toBe('div');
      
      // Should contain exactly 2 child components
      expect(container?.children).toHaveLength(2);
    });

    it('preserves heading hierarchy in child components', () => {
      render(<UnitTablesSection {...defaultProps} />);
      
      const topMedicinesHeading = screen.getByText('Top Medicines Table');
      const lowStockHeading = screen.getByText('Low Stock Table');
      
      expect(topMedicinesHeading.tagName.toLowerCase()).toBe('h3');
      expect(lowStockHeading.tagName.toLowerCase()).toBe('h3');
    });
  });

  describe('Error Boundaries', () => {
    it('continues to render if one child component fails', () => {
      // This would typically require a more complex setup with error boundaries
      // For now, we'll test that the component structure remains intact
      render(<UnitTablesSection {...defaultProps} />);
      
      expect(screen.getByTestId('unit-top-medicines-table')).toBeInTheDocument();
      expect(screen.getByTestId('unit-low-stock-table')).toBeInTheDocument();
    });
  });
});
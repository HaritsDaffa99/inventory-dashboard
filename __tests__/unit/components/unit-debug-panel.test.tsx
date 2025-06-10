import React from 'react';
import { render, screen } from '@testing-library/react';
import { UnitDebugPanel } from '@/components/unit/unit-debug-panel';

describe('UnitDebugPanel', () => {
  const mockMetrics = [
    { label: 'Total Medicines', value: 150, change: 5, trend: 'up' as const },
    { label: 'Stock Value', value: '$50,000', change: -2, trend: 'down' as const },
  ];

  const mockStockLevels = [
    { name: 'Paracetamol 500mg', quantity: 100, category: 'Analgesics' },
    { name: 'Amoxicillin 250mg', quantity: 75, category: 'Antibiotics' },
  ];

  const mockExpiryData = [
    { name: 'Medicine A', quantity: 25, expiryDate: '2024-07-01' },
    { name: 'Medicine B', quantity: 15, expiryDate: '2024-06-15' },
  ];

  const mockTopItems = [
    { id: 1, name: 'Popular Medicine', quantity: 200, usage: 150 },
    { id: 2, name: 'Another Medicine', quantity: 180, usage: 120 },
  ];

  const mockLowStockItems = [
    { id: 1, name: 'Low Stock Medicine', quantity: 5, minRequired: 20 },
  ];

  const mockConditionData = [
    { category: 'Good', value: 85, percentage: 85.0 },
    { category: 'Fair', value: 12, percentage: 12.0 },
  ];

  const mockRecentMovements = [
    { id: 1, name: 'Medicine X', date: '2024-06-01', quantity: 10, type: 'receipt' },
    { id: 2, name: 'Medicine Y', date: '2024-06-02', quantity: 5, type: 'dispensed' },
  ];

  describe('Component Rendering', () => {
    it('renders the debug panel with correct title', () => {
      render(<UnitDebugPanel metrics={mockMetrics} />);

      expect(screen.getByText(/Debug: Data Load Status/)).toBeInTheDocument();
    });

    it('applies correct CSS classes', () => {
      const { container } = render(<UnitDebugPanel metrics={mockMetrics} />);

      const cardElement = container.querySelector('.border-2.border-amber-100');
      expect(cardElement).toBeInTheDocument();

      const headerElement = container.querySelector('.bg-amber-50');
      expect(headerElement).toBeInTheDocument();
    });

    it('displays all data categories in the list', () => {
      const { container } = render(<UnitDebugPanel metrics={mockMetrics} />);

      // Use container.querySelector to find elements within strong tags
      expect(container.querySelector('strong')).toHaveTextContent('metrics');
      
      // Check that all expected category names exist in the document
      const strongElements = container.querySelectorAll('strong');
      const categoryNames = Array.from(strongElements).map(el => el.textContent?.trim().replace(':', ''));
      
      expect(categoryNames).toContain('metrics');
      expect(categoryNames).toContain('stockLevels');
      expect(categoryNames).toContain('expiryData');
      expect(categoryNames).toContain('topItems');
      expect(categoryNames).toContain('lowStockItems');
      expect(categoryNames).toContain('conditionData');
      expect(categoryNames).toContain('recentMovements');
    });
  });

  describe('Data Status Display', () => {
    it('shows loaded status for metrics', () => {
      render(<UnitDebugPanel metrics={mockMetrics} />);

      expect(screen.getByText('✅ 2 items')).toBeInTheDocument();
    });

    it('shows missing status for undefined data', () => {
      render(<UnitDebugPanel metrics={mockMetrics} />);

      const missingTexts = screen.getAllByText('❌ Missing');
      expect(missingTexts).toHaveLength(6); // All except metrics
    });

    it('shows correct count for all provided data', () => {
      render(
        <UnitDebugPanel
          metrics={mockMetrics}
          stockLevels={mockStockLevels}
          expiryData={mockExpiryData}
          topItems={mockTopItems}
          lowStockItems={mockLowStockItems}
          conditionData={mockConditionData}
          recentMovements={mockRecentMovements}
        />
      );

      // Use getAllByText since multiple items have "✅ 2 items"
      const twoItemsTexts = screen.getAllByText('✅ 2 items');
      expect(twoItemsTexts).toHaveLength(6); // metrics, stockLevels, expiryData, topItems, conditionData, recentMovements
      
      expect(screen.getByText('✅ 1 items')).toBeInTheDocument(); // lowStockItems
    });
  });

  describe('Data Structure Handling', () => {
    it('handles array data correctly', () => {
      const arrayData = [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }];
      
      render(<UnitDebugPanel metrics={arrayData} />);

      expect(screen.getByText('✅ 3 items')).toBeInTheDocument();
    });

    it('handles object data correctly', () => {
      const objectData = {
        totalMedicines: { value: 150 },
        totalValue: { value: 50000 },
        lowStock: { value: 12 },
      };
      
      render(<UnitDebugPanel metrics={objectData} />);

      expect(screen.getByText('✅ 3 keys')).toBeInTheDocument();
    });

    it('handles empty arrays correctly', () => {
      render(<UnitDebugPanel metrics={[]} stockLevels={[]} />);

      const zeroItemsTexts = screen.getAllByText('✅ 0 items');
      expect(zeroItemsTexts).toHaveLength(2);
    });

    it('handles empty objects correctly', () => {
      render(<UnitDebugPanel metrics={{}} stockLevels={{}} />);

      const zeroKeysTexts = screen.getAllByText('✅ 0 keys');
      expect(zeroKeysTexts).toHaveLength(2);
    });

    it('handles null values correctly', () => {
      render(<UnitDebugPanel metrics={null as any} stockLevels={null as any} />);

      const missingTexts = screen.getAllByText('❌ Missing');
      expect(missingTexts).toHaveLength(7); // All 7 categories
    });

    it('handles undefined values correctly', () => {
      render(<UnitDebugPanel metrics={undefined as any} />);

      const missingTexts = screen.getAllByText('❌ Missing');
      expect(missingTexts).toHaveLength(7); // All 7 categories
    });

    it('handles primitive values correctly', () => {
      render(<UnitDebugPanel metrics="string value" as any />);

      expect(screen.getByText('✅ 1 item')).toBeInTheDocument();
    });

    it('handles numeric values correctly', () => {
      render(<UnitDebugPanel metrics={42 as any} />);

      expect(screen.getByText('✅ 1 item')).toBeInTheDocument();
    });
  });

  describe('Load Count Display', () => {
    it('shows correct load count when only metrics provided', () => {
      render(<UnitDebugPanel metrics={mockMetrics} />);

      expect(screen.getByText(/Debug: Data Load Status \(1\/7 loaded\)/)).toBeInTheDocument();
    });

    it('shows correct load count when all data provided', () => {
      render(
        <UnitDebugPanel
          metrics={mockMetrics}
          stockLevels={mockStockLevels}
          expiryData={mockExpiryData}
          topItems={mockTopItems}
          lowStockItems={mockLowStockItems}
          conditionData={mockConditionData}
          recentMovements={mockRecentMovements}
        />
      );

      expect(screen.getByText(/Debug: Data Load Status \(7\/7 loaded\)/)).toBeInTheDocument();
    });

    it('shows correct load count with partial data', () => {
      render(
        <UnitDebugPanel
          metrics={mockMetrics}
          stockLevels={mockStockLevels}
          expiryData={mockExpiryData}
        />
      );

      expect(screen.getByText(/Debug: Data Load Status \(3\/7 loaded\)/)).toBeInTheDocument();
    });

    it('shows zero load count when no data provided', () => {
      render(<UnitDebugPanel metrics={null as any} />);

      expect(screen.getByText(/Debug: Data Load Status \(0\/7 loaded\)/)).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('applies green color to loaded data items', () => {
      const { container } = render(<UnitDebugPanel metrics={mockMetrics} stockLevels={mockStockLevels} />);

      // Find list items with green color class and verify content
      const greenItems = container.querySelectorAll('.text-green-600');
      expect(greenItems).toHaveLength(2);
      
      // Verify the green items contain the correct data
      expect(greenItems[0]).toHaveTextContent('metrics');
      expect(greenItems[0]).toHaveTextContent('✅ 2 items');
      expect(greenItems[1]).toHaveTextContent('stockLevels');
      expect(greenItems[1]).toHaveTextContent('✅ 2 items');
    });

    it('applies red color to missing data items', () => {
      const { container } = render(<UnitDebugPanel metrics={mockMetrics} />);

      // Find list items with red color class
      const redItems = container.querySelectorAll('.text-red-600');
      expect(redItems).toHaveLength(6); // All except metrics
      
      // Verify some of the red items contain missing status
      expect(redItems[0]).toHaveTextContent('❌ Missing');
      expect(redItems[1]).toHaveTextContent('❌ Missing');
    });

    it('applies correct text size classes', () => {
      const { container } = render(<UnitDebugPanel metrics={mockMetrics} />);

      const titleElement = container.querySelector('.text-sm');
      const contentElement = container.querySelector('.text-xs');

      expect(titleElement).toBeInTheDocument();
      expect(contentElement).toBeInTheDocument();
    });

    it('applies correct spacing classes', () => {
      const { container } = render(<UnitDebugPanel metrics={mockMetrics} />);

      const contentElement = container.querySelector('.p-3');
      const listItems = container.querySelectorAll('.mb-1');

      expect(contentElement).toBeInTheDocument();
      expect(listItems.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles mixed data types correctly', () => {
      render(
        <UnitDebugPanel
          metrics={mockMetrics}
          stockLevels={{}}
          expiryData={[]}
          topItems={null as any}
          lowStockItems={undefined as any}
          conditionData="invalid" as any
        />
      );

      expect(screen.getByText('✅ 2 items')).toBeInTheDocument(); // metrics
      expect(screen.getByText('✅ 0 keys')).toBeInTheDocument(); // stockLevels
      expect(screen.getByText('✅ 0 items')).toBeInTheDocument(); // expiryData
      expect(screen.getByText('✅ 1 item')).toBeInTheDocument(); // conditionData

      const missingTexts = screen.getAllByText('❌ Missing');
      expect(missingTexts).toHaveLength(3); // topItems, lowStockItems, recentMovements
    });

    it('handles nested objects correctly', () => {
      const nestedData = {
        level1: {
          level2: {
            data: 'value'
          }
        },
        otherKey: 'value'
      };
      
      render(<UnitDebugPanel metrics={nestedData} />);

      expect(screen.getByText('✅ 2 keys')).toBeInTheDocument();
    });

    it('handles arrays with complex objects', () => {
      const complexArray = [
        { id: 1, details: { name: 'Item 1', nested: { value: 100 } } },
        { id: 2, details: { name: 'Item 2', nested: { value: 200 } } },
      ];
      
      render(<UnitDebugPanel metrics={complexArray} />);

      expect(screen.getByText('✅ 2 items')).toBeInTheDocument();
    });

    it('handles function values correctly', () => {
      const functionValue = () => 'test';
      
      render(<UnitDebugPanel metrics={functionValue as any} />);

      expect(screen.getByText('✅ 1 item')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML elements', () => {
      render(<UnitDebugPanel metrics={mockMetrics} />);

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(7);
    });

    it('provides meaningful text content', () => {
      render(<UnitDebugPanel metrics={mockMetrics} />);

      // Check that each list item has descriptive text
      const listItems = screen.getAllByRole('listitem');
      listItems.forEach(item => {
        expect(item.textContent).toMatch(/\w+:.*(?:✅|❌)/);
      });
    });

    it('uses strong tags for emphasis', () => {
      const { container } = render(<UnitDebugPanel metrics={mockMetrics} />);

      const strongElements = container.querySelectorAll('strong');
      expect(strongElements.length).toBe(7); // One for each data category
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large datasets', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      const renderStart = performance.now();
      render(<UnitDebugPanel metrics={largeArray} />);
      const renderEnd = performance.now();

      expect(renderEnd - renderStart).toBeLessThan(100); // Should render in less than 100ms
      expect(screen.getByText('✅ 1000 items')).toBeInTheDocument();
    });

    it('handles multiple re-renders correctly', () => {
      const { rerender } = render(<UnitDebugPanel metrics={[]} />);

      expect(screen.getByText('✅ 0 items')).toBeInTheDocument();

      rerender(<UnitDebugPanel metrics={mockMetrics} />);
      expect(screen.getByText('✅ 2 items')).toBeInTheDocument();

      rerender(<UnitDebugPanel metrics={null as any} />);
      const missingTexts = screen.getAllByText('❌ Missing');
      expect(missingTexts).toHaveLength(7);
    });
  });
});
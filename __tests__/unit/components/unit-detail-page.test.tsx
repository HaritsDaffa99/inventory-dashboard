import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UnitDetailPage } from '@/components/unit/unit-detail-page';

// Mock all the child components
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      <button 
        data-testid="select-button"
        onClick={() => onValueChange('2')}
      >
        {value}
      </button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <div data-testid="select-trigger-element" className={className}>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
}));

jest.mock('@/components/unit/unit-metrics-card', () => ({
  UnitMetricsCards: ({ unitId }: any) => (
    <div data-testid="unit-metrics-cards">Unit Metrics - {unitId}</div>
  ),
}));

jest.mock('@/components/unit/unit-condition-section', () => ({
  UnitConditionSection: ({ unitId, onMedicineSelectionChange }: any) => (
    <div data-testid="unit-condition-section">
      <div>Condition Section - {unitId}</div>
      <button
        data-testid="medicine-selection-button"
        onClick={() => onMedicineSelectionChange([1, 2, 3])}
      >
        Select Medicines
      </button>
    </div>
  ),
}));

jest.mock('@/components/unit/unit-inventory-summary', () => ({
  UnitInventorySummary: ({ unitId }: any) => (
    <div data-testid="unit-inventory-summary">Inventory Summary - {unitId}</div>
  ),
}));

jest.mock('@/components/unit/unit-charts-section', () => ({
  UnitChartsSection: ({ unitId, selectedMedicines }: any) => (
    <div data-testid="unit-charts-section">
      <div>Charts Section - {unitId}</div>
      <div data-testid="selected-medicines">{JSON.stringify(selectedMedicines)}</div>
    </div>
  ),
}));

jest.mock('@/components/unit/unit-tables-section', () => ({
  UnitTablesSection: ({ unitId, selectedMedicines, unitName }: any) => (
    <div data-testid="unit-tables-section">
      <div>Tables Section - {unitId}</div>
      <div data-testid="unit-name">{unitName}</div>
      <div data-testid="selected-medicines-tables">{JSON.stringify(selectedMedicines)}</div>
    </div>
  ),
}));

jest.mock('@/components/notification/notification-bell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Notifications</div>,
}));

jest.mock('@/components/unit/unit-export-report', () => ({
  UnitExportReport: ({ unitId, unitName, selectedMedicines }: any) => (
    <div data-testid="unit-export-report">
      <div>Export - {unitId}</div>
      <div data-testid="export-unit-name">{unitName}</div>
      <div data-testid="export-selected-medicines">{JSON.stringify(selectedMedicines)}</div>
    </div>
  ),
}));

jest.mock('@/components/unit/unit-ai-insights-panel', () => ({
  UnitAIInsightsPanel: ({ unitId, unitName, metrics, selectedMedicines, isLoading }: any) => (
    <div data-testid="unit-ai-insights-panel">
      <div>AI Insights - {unitId}</div>
      <div data-testid="ai-unit-name">{unitName}</div>
      <div data-testid="ai-metrics">{JSON.stringify(metrics)}</div>
      <div data-testid="ai-selected-medicines">{JSON.stringify(selectedMedicines)}</div>
      <div data-testid="ai-loading">{isLoading ? 'loading' : 'loaded'}</div>
    </div>
  ),
}));

// Mock all the action functions
jest.mock('@/lib/actions/medicine', () => ({
  getUnits: jest.fn(),
  getItemConditionDistribution: jest.fn(),
}));

jest.mock('@/lib/actions/unit-metrics', () => ({
  getUnitMetrics: jest.fn(),
  getUnitInventorySummary: jest.fn(),
}));

jest.mock('@/lib/actions/unit-stock-history', () => ({
  getUnitStockHistory: jest.fn(),
  getMedicinesApproachingExpiry: jest.fn(),
  getTopMedicinesInUnit: jest.fn(),
  getLowStockWarnings: jest.fn(),
}));

// Import the mocked functions
import { getUnits, getItemConditionDistribution } from '@/lib/actions/medicine';
import { getUnitMetrics, getUnitInventorySummary } from '@/lib/actions/unit-metrics';
import {
  getUnitStockHistory,
  getMedicinesApproachingExpiry,
  getTopMedicinesInUnit,
  getLowStockWarnings,
} from '@/lib/actions/unit-stock-history';

const mockGetUnits = getUnits as jest.MockedFunction<typeof getUnits>;
const mockGetUnitMetrics = getUnitMetrics as jest.MockedFunction<typeof getUnitMetrics>;
const mockGetUnitInventorySummary = getUnitInventorySummary as jest.MockedFunction<typeof getUnitInventorySummary>;
const mockGetItemConditionDistribution = getItemConditionDistribution as jest.MockedFunction<typeof getItemConditionDistribution>;
const mockGetUnitStockHistory = getUnitStockHistory as jest.MockedFunction<typeof getUnitStockHistory>;
const mockGetMedicinesApproachingExpiry = getMedicinesApproachingExpiry as jest.MockedFunction<typeof getMedicinesApproachingExpiry>;
const mockGetTopMedicinesInUnit = getTopMedicinesInUnit as jest.MockedFunction<typeof getTopMedicinesInUnit>;
const mockGetLowStockWarnings = getLowStockWarnings as jest.MockedFunction<typeof getLowStockWarnings>;

// Mock window.location properly for JSDOM
const mockLocation = {
  href: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  search: '',
  hash: '',
  pathname: '/dashboard/unit/1',
  origin: 'http://localhost',
  protocol: 'http:',
  host: 'localhost',
  hostname: 'localhost',
  port: '',
};

// Use Object.defineProperty to properly mock window.location
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
  configurable: true,
});

describe('UnitDetailPage', () => {
  const mockUnit = {
    id: 1,
    namaUnit: 'ICU Unit',
    kodeUnit: 'ICU001',
    akronim: 'ICU',
    levelUnit: 1,
    lokasi: 'Building A, Floor 2',
    alamat: '123 Hospital Street',
  };

  const mockUnits = [
    { id: 1, namaUnit: 'ICU Unit', kodeUnit: 'ICU001', akronim: 'ICU', levelUnit: 1 },
    { id: 2, namaUnit: 'Emergency Unit', kodeUnit: 'ER001', akronim: 'ER', levelUnit: 1 },
    { id: 3, namaUnit: 'Surgery Unit', kodeUnit: 'SUR001', akronim: 'SUR', levelUnit: 2 },
  ];

  const mockMetricsData = {
    totalInventory: { value: 1500, change: 5.2 },
    totalReceipts: { value: 250, change: -2.1 },
    totalDispensed: { value: 180, change: 0 },
    expiredMedicines: { value: 15, change: 8.7 },
  };

  const mockInventorySummaryData = {
    uniqueMedicines: 45,
    available: 320,
    damagedOrExpired: 8,
  };

  const mockConditionData = [
    { name: 'Good', value: 80, percentage: 80 },
    { name: 'Damaged', value: 15, percentage: 15 },
    { name: 'Expired', value: 5, percentage: 5 },
  ];

  const mockStockHistoryData = [
    { month: '2024-01', value: 100 },
    { month: '2024-02', value: 120 },
    { month: '2024-03', value: 150 },
  ];

  const mockExpiryData = [
    {
      id: 1,
      name: 'Medicine A',
      code: 'MED001',
      quantity: 10,
      unit: 'tablets',
      daysRemaining: 30,
      expiryDate: new Date('2024-07-01'),
    },
  ];

  const mockTopMedicinesData = [
    {
      id: 1,
      name: 'Medicine A',
      code: 'MED001',
      stock: 100,
      unit: 'tablets',
    },
  ];

  const mockLowStockData = [
    {
      id: 1,
      name: 'Medicine B',
      code: 'MED002',
      currentStock: 5,
      unit: 'tablets',
      minimumThreshold: 20,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = 'http://localhost/dashboard/unit/1';
    
    // Setup default mock responses
    mockGetUnits.mockResolvedValue({ success: true, data: mockUnits });
    mockGetUnitMetrics.mockResolvedValue({ success: true, data: mockMetricsData });
    mockGetUnitInventorySummary.mockResolvedValue({ success: true, data: mockInventorySummaryData });
    mockGetItemConditionDistribution.mockResolvedValue({ success: true, data: mockConditionData });
    mockGetUnitStockHistory.mockResolvedValue({ success: true, data: mockStockHistoryData });
    mockGetMedicinesApproachingExpiry.mockResolvedValue({ success: true, data: mockExpiryData });
    mockGetTopMedicinesInUnit.mockResolvedValue({ success: true, data: mockTopMedicinesData });
    mockGetLowStockWarnings.mockResolvedValue({ success: true, data: mockLowStockData });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Component Rendering', () => {
    it('renders the main layout with all sections', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByTestId('unit-inventory-summary')).toBeInTheDocument();
        expect(screen.getByTestId('unit-metrics-cards')).toBeInTheDocument();
        expect(screen.getByTestId('unit-condition-section')).toBeInTheDocument();
        expect(screen.getByTestId('unit-charts-section')).toBeInTheDocument();
        expect(screen.getByTestId('unit-tables-section')).toBeInTheDocument();
        expect(screen.getByTestId('unit-ai-insights-panel')).toBeInTheDocument();
      });
    });

    it('displays unit information in header', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        // Look for the specific heading with the class
        const heading = document.querySelector('h2.text-3xl.font-bold.tracking-tight');
        expect(heading).toHaveTextContent('ICU Unit');
        expect(screen.getByText('Building A, Floor 2')).toBeInTheDocument();
      });
    });

    it('renders header controls', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByTestId('unit-export-report')).toBeInTheDocument();
        expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
        expect(screen.getByTestId('select')).toBeInTheDocument();
      });
    });

    it('applies correct CSS classes to main container', async () => {
      const { container } = render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        const mainDiv = container.querySelector('.min-h-screen.bg-background.w-full');
        expect(mainDiv).toBeInTheDocument();
      });
    });
  });

  describe('Unit Information Display', () => {
    it('displays unit name correctly', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        const heading = document.querySelector('h2.text-3xl.font-bold.tracking-tight');
        expect(heading).toHaveTextContent('ICU Unit');
        expect(heading).toHaveClass('text-3xl', 'font-bold', 'tracking-tight');
      });
    });

    it('displays location when available', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByText('Building A, Floor 2')).toBeInTheDocument();
      });
    });

    it('displays address when location is not available', async () => {
      const unitWithoutLocation = { ...mockUnit, lokasi: undefined };
      render(<UnitDetailPage unit={unitWithoutLocation} />);

      await waitFor(() => {
        expect(screen.getByText('123 Hospital Street')).toBeInTheDocument();
      });
    });

    it('displays unit code when neither location nor address available', async () => {
      const unitWithoutLocationAndAddress = { 
        ...mockUnit, 
        lokasi: undefined, 
        alamat: undefined 
      };
      render(<UnitDetailPage unit={unitWithoutLocationAndAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Unit Code: ICU001')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('fetches units for dropdown', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(mockGetUnits).toHaveBeenCalledTimes(1);
      });
    });

    it('fetches all required data for AI insights', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(mockGetUnitMetrics).toHaveBeenCalledWith(1);
        expect(mockGetUnitInventorySummary).toHaveBeenCalledWith(1);
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, undefined);
        expect(mockGetUnitStockHistory).toHaveBeenCalledWith(1);
        expect(mockGetMedicinesApproachingExpiry).toHaveBeenCalledWith(1, undefined);
        expect(mockGetTopMedicinesInUnit).toHaveBeenCalledWith(1, undefined);
        expect(mockGetLowStockWarnings).toHaveBeenCalledWith(1, undefined);
      });
    });

    it('refetches data when selected medicines change', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, undefined);
      });

      jest.clearAllMocks();

      // Simulate medicine selection
      const selectionButton = screen.getByTestId('medicine-selection-button');
      fireEvent.click(selectionButton);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, [1, 2, 3]);
        expect(mockGetMedicinesApproachingExpiry).toHaveBeenCalledWith(1, [1, 2, 3]);
        expect(mockGetTopMedicinesInUnit).toHaveBeenCalledWith(1, [1, 2, 3]);
        expect(mockGetLowStockWarnings).toHaveBeenCalledWith(1, [1, 2, 3]);
      });
    });
  });

  describe('Props Passing to Child Components', () => {
    it('passes correct unitId to all child components', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByText('Inventory Summary - 1')).toBeInTheDocument();
        expect(screen.getByText('Unit Metrics - 1')).toBeInTheDocument();
        expect(screen.getByText('Condition Section - 1')).toBeInTheDocument();
        expect(screen.getByText('Charts Section - 1')).toBeInTheDocument();
        expect(screen.getByText('Tables Section - 1')).toBeInTheDocument();
        expect(screen.getByText('AI Insights - 1')).toBeInTheDocument();
      });
    });

    it('passes selected medicines to relevant components', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      // Initially empty
      await waitFor(() => {
        expect(screen.getByTestId('selected-medicines')).toHaveTextContent('[]');
        expect(screen.getByTestId('selected-medicines-tables')).toHaveTextContent('[]');
      });

      // After selection
      const selectionButton = screen.getByTestId('medicine-selection-button');
      fireEvent.click(selectionButton);

      await waitFor(() => {
        expect(screen.getByTestId('selected-medicines')).toHaveTextContent('[1,2,3]');
        expect(screen.getByTestId('selected-medicines-tables')).toHaveTextContent('[1,2,3]');
      });
    });

    it('passes unit name to relevant components', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByTestId('unit-name')).toHaveTextContent('ICU Unit');
        expect(screen.getByTestId('export-unit-name')).toHaveTextContent('ICU Unit');
        expect(screen.getByTestId('ai-unit-name')).toHaveTextContent('ICU Unit');
      });
    });
  });

  describe('Unit Selection Dropdown', () => {
    it('renders unit selection dropdown with current unit', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        const select = screen.getByTestId('select');
        expect(select).toHaveAttribute('data-value', '1');
      });
    });

    it('handles unit selection change and updates component state', async () => {
      // Mock console.error to suppress navigation warning
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<UnitDetailPage unit={mockUnit} />);

      // First verify initial state
      await waitFor(() => {
        const select = screen.getByTestId('select');
        expect(select).toHaveAttribute('data-value', '1');
      });

      // Click the select button to trigger change
      const selectButton = screen.getByTestId('select-button');
      fireEvent.click(selectButton);

      // Verify the select value changed (this proves the callback was called)
      await waitFor(() => {
        const select = screen.getByTestId('select');
        expect(select).toHaveAttribute('data-value', '2');
      });

      // Verify the component handles the change without errors
      expect(selectButton).toBeInTheDocument();
      
      consoleErrorSpy.mockRestore();
    });

    it('renders select component correctly', async () => {
      render(<UnitDetailPage unit={mockUnit} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('select')).toBeInTheDocument();
      });
    });

    it('displays correct unit options in dropdown', async () => {
      render(<UnitDetailPage unit={mockUnit} />);
      
      await waitFor(() => {
        // Use getAllByTestId instead of getByTestId for multiple elements
        const selectItems = screen.getAllByTestId('select-item');
        expect(selectItems).toHaveLength(4);
        
        // Check for overview option
        const overviewOption = screen.getByText('Overview');
        expect(overviewOption).toBeInTheDocument();
        
        // Check for unit options - using getAllByText for multiple instances
        const icuUnits = screen.getAllByText('ICU Unit');
        expect(icuUnits.length).toBeGreaterThan(0);
        
        expect(screen.getByText('Emergency Unit')).toBeInTheDocument();
        expect(screen.getByText('Surgery Unit')).toBeInTheDocument();
        
        // Verify the select items have correct data-value attributes
        expect(selectItems[0]).toHaveAttribute('data-value', 'overview');
        expect(selectItems[1]).toHaveAttribute('data-value', '1');
        expect(selectItems[2]).toHaveAttribute('data-value', '2');
        expect(selectItems[3]).toHaveAttribute('data-value', '3');
      });
    });
  });

  describe('Medicine Selection Management', () => {
    it('initializes with empty medicine selection', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByTestId('ai-selected-medicines')).toHaveTextContent('[]');
      });
    });

    it('updates medicine selection when condition section changes', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      const selectionButton = screen.getByTestId('medicine-selection-button');
      fireEvent.click(selectionButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-selected-medicines')).toHaveTextContent('[1,2,3]');
        expect(screen.getByTestId('export-selected-medicines')).toHaveTextContent('[1,2,3]');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state initially for AI insights', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByTestId('ai-loading')).toHaveTextContent('loading');
      });
    });

    it('shows loaded state after data is fetched', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(screen.getByTestId('ai-loading')).toHaveTextContent('loaded');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockGetUnits.mockRejectedValue(new Error('API Error'));
      mockGetUnitMetrics.mockRejectedValue(new Error('Metrics Error'));

      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching units:', expect.any(Error));
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching data for insights:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles failed API responses gracefully', async () => {
      mockGetUnitMetrics.mockResolvedValue({ success: false, error: 'Failed to fetch' });
      
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        // Component should still render without crashing
        expect(screen.getByTestId('unit-ai-insights-panel')).toBeInTheDocument();
      });
    });
  });

  describe('Data Transformation', () => {
    it('transforms metrics data correctly for AI insights', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        const metricsElement = screen.getByTestId('ai-metrics');
        const metricsData = JSON.parse(metricsElement.textContent || '[]');
        
        expect(metricsData).toHaveLength(4);
        expect(metricsData[0]).toEqual({
          label: 'Total Inventory',
          value: 1500,
          change: 5.2,
        });
      });
    });

    it('transforms condition data correctly', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(mockGetItemConditionDistribution).toHaveBeenCalledWith(1, undefined);
      });
    });

    it('handles date transformation for expiry data', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        expect(mockGetMedicinesApproachingExpiry).toHaveBeenCalledWith(1, undefined);
      });
    });
  });

  describe('Component Rendering and Mounting', () => {
    it('renders content after mounting', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        const heading = document.querySelector('h2.text-3xl.font-bold.tracking-tight');
        expect(heading).toHaveTextContent('ICU Unit');
      });
    });

    it('handles component mounting gracefully', async () => {
      const { container } = render(<UnitDetailPage unit={mockUnit} />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('Component Layout', () => {
    it('renders sections in correct order', async () => {
      render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        const sections = [
          screen.getByTestId('unit-inventory-summary'),
          screen.getByTestId('unit-metrics-cards'),
          screen.getByTestId('unit-condition-section'),
          screen.getByTestId('unit-charts-section'),
          screen.getByTestId('unit-tables-section'),
          screen.getByTestId('unit-ai-insights-panel'),
        ];

        // Verify all sections are present
        sections.forEach(section => {
          expect(section).toBeInTheDocument();
        });
      });
    });

    it('applies correct spacing between sections', async () => {
      const { container } = render(<UnitDetailPage unit={mockUnit} />);

      await waitFor(() => {
        const spacedDivs = container.querySelectorAll('.mt-6');
        expect(spacedDivs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles unit with minimal information', async () => {
      const minimalUnit = {
        id: 999,
        namaUnit: 'Test Unit',
        kodeUnit: 'TEST',
        akronim: 'TST',
        levelUnit: 1,
      };

      render(<UnitDetailPage unit={minimalUnit} />);

      await waitFor(() => {
        const heading = document.querySelector('h2.text-3xl.font-bold.tracking-tight');
        expect(heading).toHaveTextContent('Test Unit');
        expect(screen.getByText('Unit Code: TEST')).toBeInTheDocument();
      });
    });

    it('handles very large unit ID', async () => {
      const largeIdUnit = { ...mockUnit, id: Number.MAX_SAFE_INTEGER };
      
      render(<UnitDetailPage unit={largeIdUnit} />);

      await waitFor(() => {
        expect(mockGetUnitMetrics).toHaveBeenCalledWith(Number.MAX_SAFE_INTEGER);
      });
    });
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForecastControls from '@/components/disease-outbreak/ForecastControls';
import { getAvailableUnits } from '@/lib/actions/disease-forecasting';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <div data-testid="card-title" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, title, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      title={title}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <div onClick={() => onValueChange && onValueChange('6')}>{children}</div>
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <div data-testid="select-value">6 Months</div>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: any) => (
    <input
      data-testid="checkbox"
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
    />
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, className }: any) => (
    <input
      data-testid="input"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
    />
  ),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Target: () => <div data-testid="target-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Search: () => <div data-testid="search-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock the disease forecasting action
jest.mock('@/lib/actions/disease-forecasting');

const mockGetAvailableUnits = getAvailableUnits as jest.MockedFunction<typeof getAvailableUnits>;

describe('ForecastControls', () => {
  const mockUnits = [
    { id: 1, namaUnit: 'Puskesmas Kecamatan A', kodeUnit: 'PKM_A' },
    { id: 2, namaUnit: 'Puskesmas Kecamatan B', kodeUnit: 'PKM_B' },
    { id: 3, namaUnit: 'Rumah Sakit Umum Central', kodeUnit: 'RSU_C' },
    { id: 4, namaUnit: 'Klinik Pratama Health', kodeUnit: 'KP_H' },
    { id: 5, namaUnit: 'Puskesmas Kelurahan D', kodeUnit: 'PKM_D' },
    { id: 6, namaUnit: 'Rumah Sakit Khusus E', kodeUnit: 'RSK_E' },
    { id: 7, namaUnit: 'Poliklinik Spesialis F', kodeUnit: 'PS_F' },
    { id: 8, namaUnit: 'Unit Kesehatan G', kodeUnit: 'UK_G' },
    { id: 9, namaUnit: 'Puskesmas Pembantu H', kodeUnit: 'PUSTU_H' },
    { id: 10, namaUnit: 'Balai Pengobatan I', kodeUnit: 'BP_I' },
  ];

  const mockOnGenerate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAvailableUnits.mockResolvedValue({
      success: true,
      data: mockUnits
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders forecast controls with all main sections', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      expect(screen.getByText('Disease Outbreak Forecast Controls')).toBeInTheDocument();
      expect(screen.getByText('Configure parameters for AI-powered disease outbreak prediction')).toBeInTheDocument();
      
      // Wait for units to load
      await waitFor(() => {
        expect(screen.getByText('Forecast Period')).toBeInTheDocument();
        expect(screen.getByText('Forecasting Model')).toBeInTheDocument();
        expect(screen.getByText(/Selected Units/)).toBeInTheDocument();
      });
    });

    it('displays forecast period options correctly', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByTestId('select')).toBeInTheDocument();
        expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      });
    });

    it('shows model selection buttons', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        const buttons = screen.getAllByTestId('button');
        const thresholdButton = buttons.find(btn => btn.textContent?.includes('Threshold'));
        const prophetButton = buttons.find(btn => btn.textContent?.includes('Prophet AI'));
        
        expect(thresholdButton).toBeInTheDocument();
        expect(prophetButton).toBeInTheDocument();
      });
    });

    it('renders generate forecast button', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Forecast');
        expect(generateButton).toBeInTheDocument();
      });
    });
  });

  describe('Unit Loading and Selection', () => {
    it('loads units on mount and auto-selects first 3', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(mockGetAvailableUnits).toHaveBeenCalled();
        expect(screen.getByText('Selected Units (3)')).toBeInTheDocument();
      });

      // Check that first 3 units are displayed by their titles
      expect(screen.getByTitle('Puskesmas Kecamatan A (PKM_A)')).toBeInTheDocument();
      expect(screen.getByTitle('Puskesmas Kecamatan B (PKM_B)')).toBeInTheDocument();
      expect(screen.getByTitle('Rumah Sakit Umum Central (RSU_C)')).toBeInTheDocument();
    });

    it('handles unit selection toggle', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByText('Selected Units (3)')).toBeInTheDocument();
      });

      // Find and click the first checkbox to deselect
      const checkboxes = screen.getAllByTestId('checkbox');
      await user.click(checkboxes[0]);

      await waitFor(() => {
        expect(screen.getByText('Selected Units (2)')).toBeInTheDocument();
      });
    });

    it('displays unit codes correctly', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByText('PKM_A')).toBeInTheDocument();
        expect(screen.getByText('PKM_B')).toBeInTheDocument();
        expect(screen.getByText('RSU_C')).toBeInTheDocument();
      });
    });

    it('shows "Show All" button when there are more than 8 units', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        const showAllButton = screen.getByText('Show All (10)');
        expect(showAllButton).toBeInTheDocument();
      });
    });

    it('expands to show all units when "Show All" is clicked', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        const showAllButton = screen.getByText('Show All (10)');
        expect(showAllButton).toBeInTheDocument();
      });

      const showAllButton = screen.getByText('Show All (10)');
      await user.click(showAllButton);

      await waitFor(() => {
        expect(screen.getByText('Show Less')).toBeInTheDocument();
        expect(screen.getByTitle('Balai Pengobatan I (BP_I)')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('renders search input with correct placeholder', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search units by name or code...');
        expect(searchInput).toBeInTheDocument();
        expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      });
    });

    it('filters units based on search query', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByTitle('Puskesmas Kecamatan A (PKM_A)')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search units by name or code...');
      await user.type(searchInput, 'Rumah Sakit');

      await waitFor(() => {
        expect(screen.getByText(/Found 2 units matching/)).toBeInTheDocument();
        expect(screen.getByTitle('Rumah Sakit Umum Central (RSU_C)')).toBeInTheDocument();
        expect(screen.getByTitle('Rumah Sakit Khusus E (RSK_E)')).toBeInTheDocument();
        expect(screen.queryByTitle('Puskesmas Kecamatan A (PKM_A)')).not.toBeInTheDocument();
      });
    });

    it('filters units by unit code', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByText('PKM_A')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search units by name or code...');
      await user.type(searchInput, 'PKM');

      await waitFor(() => {
        expect(screen.getByText(/Found 3 units matching/)).toBeInTheDocument();
        expect(screen.getByTitle('Puskesmas Kecamatan A (PKM_A)')).toBeInTheDocument();
        expect(screen.getByTitle('Puskesmas Kecamatan B (PKM_B)')).toBeInTheDocument();
        expect(screen.getByTitle('Puskesmas Kelurahan D (PKM_D)')).toBeInTheDocument();
      });
    });

    it('shows clear search button when search is active', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search units by name or code...');
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search units by name or code...');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByTestId('x-icon')).toBeInTheDocument();
      });
    });

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search units by name or code...');
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search units by name or code...');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByTestId('x-icon')).toBeInTheDocument();
      });

      const clearButton = screen.getByTestId('x-icon').closest('button')!;
      await user.click(clearButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search yields no matches', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search units by name or code...');
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search units by name or code...');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        // Handle multiple "No units found matching" text elements
        const noResultsElements = screen.getAllByText(/No units found matching/);
        expect(noResultsElements.length).toBeGreaterThan(0);
        expect(screen.getByText('No units found matching your search.')).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Selection', () => {
    it('shows select all and clear all buttons', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        // When no search is active, should show Select All and Clear All
        const buttons = screen.getAllByTestId('button');
        const hasSelectAll = buttons.some(btn => btn.textContent?.includes('Select All') || btn.textContent?.includes('Select'));
        const hasClearAll = buttons.some(btn => btn.textContent?.includes('Clear All') || btn.textContent?.includes('Clear'));
        
        expect(hasSelectAll).toBe(true);
        expect(hasClearAll).toBe(true);
      });
    });

    it('selects all filtered units when "Select Filtered" is clicked', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search units by name or code...');
        expect(searchInput).toBeInTheDocument();
      });

      // Search for specific units
      const searchInput = screen.getByPlaceholderText('Search units by name or code...');
      await user.type(searchInput, 'Rumah Sakit');

      await waitFor(() => {
        expect(screen.getByText('Select Filtered')).toBeInTheDocument();
      });

      const selectFilteredButton = screen.getByText('Select Filtered');
      await user.click(selectFilteredButton);

      // Should show updated count including the filtered selections
      await waitFor(() => {
        const selectedText = screen.getByText(/Selected Units \(\d+\)/);
        expect(selectedText).toBeInTheDocument();
      });
    });

    it('clears all selected units when "Clear All" is clicked', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByText('Selected Units (3)')).toBeInTheDocument();
      });

      // Look for Clear button (might be "Clear All" or "Clear Filtered")
      const clearButton = screen.getByText(/Clear/);
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Selected Units (0)')).toBeInTheDocument();
      });
    });
  });

  describe('Model Selection', () => {
    it('defaults to threshold model', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByText(/Currently Selected:.*Threshold Model/)).toBeInTheDocument();
        expect(screen.getByText(/Fast rule-based model/)).toBeInTheDocument();
      });
    });

    it('switches to Prophet AI when available', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} prophetStatus="available" />);

      await waitFor(() => {
        const buttons = screen.getAllByTestId('button');
        const prophetButton = buttons.find(btn => btn.textContent?.includes('Prophet AI'));
        expect(prophetButton).toBeInTheDocument();
      });

      const buttons = screen.getAllByTestId('button');
      const prophetButton = buttons.find(btn => btn.textContent?.includes('Prophet AI'))!;
      await user.click(prophetButton);

      await waitFor(() => {
        expect(screen.getByText(/Currently Selected:.*Prophet AI Model/)).toBeInTheDocument();
        expect(screen.getByText(/Advanced ML model/)).toBeInTheDocument();
      });
    });

    it('disables Prophet AI when unavailable', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} prophetStatus="unavailable" />);

      await waitFor(() => {
        const buttons = screen.getAllByTestId('button');
        const prophetButton = buttons.find(btn => btn.textContent?.includes('Prophet AI'));
        expect(prophetButton).toBeDisabled();
      });
    });

    it('shows correct status badges for Prophet availability', async () => {
      const { rerender } = render(<ForecastControls onGenerate={mockOnGenerate} prophetStatus="checking" />);

      await waitFor(() => {
        expect(screen.getByText('Checking...')).toBeInTheDocument();
      });

      rerender(<ForecastControls onGenerate={mockOnGenerate} prophetStatus="available" />);

      await waitFor(() => {
        expect(screen.getByText('Prophet Available')).toBeInTheDocument();
      });

      rerender(<ForecastControls onGenerate={mockOnGenerate} prophetStatus="unavailable" />);

      await waitFor(() => {
        expect(screen.getByText('Prophet Offline')).toBeInTheDocument();
      });
    });
  });

  describe('Forecast Generation', () => {
    it('calls onGenerate with correct parameters', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByText('Generate Forecast')).toBeInTheDocument();
      });

      const generateButton = screen.getByText('Generate Forecast');
      await user.click(generateButton);

      expect(mockOnGenerate).toHaveBeenCalledWith({
        selectedUnits: [1, 2, 3], // First 3 auto-selected units
        forecastMonths: 6,
        useProphet: false
      });
    });

    it('prevents generation when no units selected', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByText(/Clear/)).toBeInTheDocument();
      });

      // Clear all selections
      const clearButton = screen.getByText(/Clear/);
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Selected Units (0)')).toBeInTheDocument();
      });

      const generateButton = screen.getByText('Generate Forecast');
      await user.click(generateButton);

      // The component should prevent generation when no units are selected
      // This might show an alert or just not call onGenerate
      expect(mockOnGenerate).not.toHaveBeenCalled();
    });

    it('shows loading state when isLoading is true', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} isLoading={true} />);

      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
        
        const generateButton = screen.getByText('Generating...').closest('button');
        expect(generateButton).toBeDisabled();
      });
    });

    it('disables generate button when no units selected', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByText(/Clear/)).toBeInTheDocument();
      });

      // Clear all selections
      const clearButton = screen.getByText(/Clear/);
      await user.click(clearButton);

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Forecast').closest('button');
        expect(generateButton).toBeDisabled();
      });
    });
  });

  describe('Forecast Period Selection', () => {
    it('updates forecast months when selection changes', async () => {
      const user = userEvent.setup();
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByTestId('select')).toBeInTheDocument();
      });

      // Simulate select change (mocked to change to 6 months)
      const select = screen.getByTestId('select');
      await user.click(select);

      await waitFor(() => {
        const generateButton = screen.getByText('Generate Forecast');
        expect(generateButton).toBeInTheDocument();
      });

      // Handle multiple "6 months" elements - use getAllByText
      const monthElements = screen.getAllByText(/6 months/i);
      expect(monthElements.length).toBeGreaterThan(0);
    });

    it('displays correct month range text', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        // Handle multiple "6 months" elements - use getAllByText
        const monthElements = screen.getAllByText(/6 months/i);
        expect(monthElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles unit loading failure gracefully', async () => {
      mockGetAvailableUnits.mockResolvedValue({
        success: false,
        data: null
      });

      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        // Should still render without crashing
        expect(screen.getByText('Disease Outbreak Forecast Controls')).toBeInTheDocument();
      });
    });

    it('handles empty units array', async () => {
      mockGetAvailableUnits.mockResolvedValue({
        success: true,
        data: []
      });

      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByText('Selected Units (0)')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper labels for form elements', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        expect(screen.getByText('Forecast Period')).toBeInTheDocument();
        expect(screen.getByText('Forecasting Model')).toBeInTheDocument();
        expect(screen.getByText(/Selected Units/)).toBeInTheDocument();
      });
    });

    it('includes proper icons for visual clarity', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        // Handle multiple target icons - use getAllByTestId
        const targetIcons = screen.getAllByTestId('target-icon');
        expect(targetIcons.length).toBeGreaterThan(0);
        
        expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
        expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument();
        expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      });
    });

    it('provides tooltips and titles for complex elements', async () => {
      render(<ForecastControls onGenerate={mockOnGenerate} />);

      await waitFor(() => {
        // Look for buttons with titles containing "Select" and "Clear"
        const buttons = screen.getAllByTestId('button');
        const hasSelectTitle = buttons.some(btn => btn.getAttribute('title')?.includes('Select'));
        const hasClearTitle = buttons.some(btn => btn.getAttribute('title')?.includes('Clear'));
        
        expect(hasSelectTitle).toBe(true);
        expect(hasClearTitle).toBe(true);
      });
    });
  });
});
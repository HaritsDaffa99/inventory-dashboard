import { render, screen } from '@testing-library/react';
import TestPage from '@/app/(user)/dashboard/page';

// Mock the OverviewPage component
jest.mock('../../../components/dashboard/overview-page', () => ({
  OverviewPage: function MockOverviewPage() {
    return (
      <div data-testid="overview-page">
        <h1>Dashboard Overview</h1>
        <div data-testid="overview-content">Overview Content</div>
      </div>
    );
  },
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard page successfully', () => {
    render(<TestPage />);

    // Check if OverviewPage component is rendered
    expect(screen.getByTestId('overview-page')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    expect(screen.getByTestId('overview-content')).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = render(<TestPage />);
    
    // Check that the component renders without errors
    expect(container.firstChild).toBeInTheDocument();
  });

  it('passes props correctly to OverviewPage', () => {
    render(<TestPage />);
    
    // Since TestPage doesn't pass any props, just verify OverviewPage is called
    expect(screen.getByTestId('overview-page')).toBeInTheDocument();
  });

  it('has correct component structure', () => {
    const { container } = render(<TestPage />);
    
    // Check that TestPage directly renders OverviewPage without additional wrappers
    const overviewPage = container.querySelector('[data-testid="overview-page"]');
    expect(overviewPage).toBeInTheDocument();
    expect(container.children).toHaveLength(1);
  });

  it('exports default function correctly', () => {
    // Test that the component is exported correctly
    expect(TestPage).toBeDefined();
    expect(typeof TestPage).toBe('function');
  });
});
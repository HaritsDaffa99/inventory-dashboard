import { render, screen } from '@testing-library/react';

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Mock Prisma using relative path
jest.mock('../../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock Sidebar component using relative path
jest.mock('../../../components/app-sidebar', () => ({
  Sidebar: function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  },
}));

// Mock SidebarProvider using relative path
jest.mock('../../../components/ui/sidebar', () => ({
  SidebarProvider: function MockSidebarProvider({ children }: { children: React.ReactNode }) {
    return <div data-testid="sidebar-provider">{children}</div>;
  },
}));

// Mock the auth module using relative path
jest.mock('../../../app/auth', () => ({
  authOptions: {
    secret: 'test-secret',
    session: { strategy: 'jwt' },
    providers: [],
  },
}));

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/app/(user)/dashboard/layout';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('DashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard layout with authenticated session', async () => {
    // Mock authenticated session
    mockGetServerSession.mockResolvedValue({
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      expires: '2024-01-01',
    });

    const TestChild = () => <div data-testid="test-child">Test Content</div>;
    
    const LayoutComponent = await DashboardLayout({
      children: <TestChild />,
    });

    render(LayoutComponent);

    // Check if main components are rendered
    expect(screen.getByTestId('sidebar-provider')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('redirects to login when no session exists', async () => {
    // Mock no session
    mockGetServerSession.mockResolvedValue(null);

    await DashboardLayout({
      children: <div>Test</div>,
    });

    // Check if redirect was called
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders correct HTML structure when authenticated', async () => {
    // Mock authenticated session
    mockGetServerSession.mockResolvedValue({
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      expires: '2024-01-01',
    });

    const TestChild = () => <div data-testid="content">Dashboard Content</div>;
    
    const LayoutComponent = await DashboardLayout({
      children: <TestChild />,
    });

    const { container } = render(LayoutComponent);

    // Check for proper layout structure
    const flexContainer = container.querySelector('.flex.h-screen.w-full');
    expect(flexContainer).toBeInTheDocument();

    const contentArea = container.querySelector('.flex-1.overflow-auto');
    expect(contentArea).toBeInTheDocument();
  });

  it('handles multiple children correctly', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      expires: '2024-01-01',
    });

    const LayoutComponent = await DashboardLayout({
      children: (
        <>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </>
      ),
    });

    render(LayoutComponent);

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  it('calls getServerSession with correct auth options', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      expires: '2024-01-01',
    });

    await DashboardLayout({
      children: <div>Test</div>,
    });

    // Verify getServerSession was called with authOptions
    expect(mockGetServerSession).toHaveBeenCalledWith({
      secret: 'test-secret',
      session: { strategy: 'jwt' },
      providers: [],
    });
  });
});
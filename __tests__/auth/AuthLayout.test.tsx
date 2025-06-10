import { render, screen } from '@testing-library/react'
import { AuthLayout } from '@/components/auth/AuthLayout' // Named import, not default

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

describe('AuthLayout Component', () => {
  const defaultProps = {
    title: 'Test Title',
    subtitle: 'Test Subtitle'
  }

  it('renders without crashing', () => {
    expect(() => render(
      <AuthLayout {...defaultProps}>
        <div>Test Content</div>
      </AuthLayout>
    )).not.toThrow()
  })

  it('renders children content', () => {
    render(
      <AuthLayout {...defaultProps}>
        <div data-testid="test-content">Test Content</div>
      </AuthLayout>
    )
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('displays title and subtitle', () => {
    render(
      <AuthLayout title="Login" subtitle="Sign in to your account">
        <div>Form Content</div>
      </AuthLayout>
    )
    
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
  })

  it('has proper layout structure', () => {
    const { container } = render(
      <AuthLayout {...defaultProps}>
        <div>Child Component</div>
      </AuthLayout>
    )
    
    // Should have the main flex container
    const mainContainer = container.querySelector('.flex.min-h-screen')
    expect(mainContainer).toBeInTheDocument()
  })

  it('renders form side and image side', () => {
    render(
      <AuthLayout {...defaultProps}>
        <div data-testid="form-content">Form</div>
      </AuthLayout>
    )
    
    // Form side should be visible
    const formSide = document.querySelector('.flex.w-full.items-center.justify-center')
    expect(formSide).toBeInTheDocument()
    
    // Image side should be hidden on mobile, visible on large screens
    const imageSide = document.querySelector('.hidden.lg\\:block')
    expect(imageSide).toBeInTheDocument()
  })

  it('applies proper styling classes', () => {
    const { container } = render(
      <AuthLayout {...defaultProps}>
        <div>Content</div>
      </AuthLayout>
    )
    
    // Check main container classes
    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass('flex', 'min-h-screen')
  })

  it('renders title with proper styling', () => {
    render(
      <AuthLayout title="Welcome" subtitle="Please sign in">
        <div>Content</div>
      </AuthLayout>
    )
    
    const title = screen.getByText('Welcome')
    expect(title).toHaveClass('text-3xl', 'font-bold', 'text-gray-900')
  })

  it('renders subtitle with proper styling', () => {
    render(
      <AuthLayout title="Welcome" subtitle="Please sign in">
        <div>Content</div>
      </AuthLayout>
    )
    
    const subtitle = screen.getByText('Please sign in')
    expect(subtitle).toHaveClass('mt-2', 'text-sm', 'text-gray-600')
  })

  it('handles multiple children', () => {
    render(
      <AuthLayout {...defaultProps}>
        <div data-testid="child-1">First Child</div>
        <div data-testid="child-2">Second Child</div>
      </AuthLayout>
    )
    
    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
  })

  it('renders consistently with different props', () => {
    const { rerender } = render(
      <AuthLayout title="Login" subtitle="Sign in">
        <div>Login Form</div>
      </AuthLayout>
    )
    
    expect(() => rerender(
      <AuthLayout title="Register" subtitle="Create account">
        <div>Register Form</div>
      </AuthLayout>
    )).not.toThrow()
    
    expect(screen.getByText('Register')).toBeInTheDocument()
    expect(screen.getByText('Create account')).toBeInTheDocument()
  })

  it('mounts and unmounts cleanly', () => {
    const { unmount } = render(
      <AuthLayout {...defaultProps}>
        <div>Test</div>
      </AuthLayout>
    )
    
    expect(() => unmount()).not.toThrow()
  })

  it('has image section styling', () => {
    render(
      <AuthLayout {...defaultProps}>
        <div>Content</div>
      </AuthLayout>
    )
    
    // Check that image section exists
    const imageSections = document.querySelectorAll('.hidden.lg\\:block, .lg\\:w-1\\/2, [class*="bg-"]')
    
    // Should have some styling for the layout
    expect(imageSections.length).toBeGreaterThan(0)
  })

  it('displays SiModis branding text', () => {
    render(
      <AuthLayout {...defaultProps}>
        <div>Content</div>
      </AuthLayout>
    )
    
    // Check for "Si" text (white)
    const siText = screen.getByText('Si')
    expect(siText).toBeInTheDocument()
    expect(siText).toHaveClass('text-white')
    
    // Check for "Modis" text (yellow)
    const modisText = screen.getByText('Modis')
    expect(modisText).toBeInTheDocument()
    expect(modisText).toHaveClass('text-yellow-300')
  })

  it('handles empty children gracefully', () => {
    expect(() => render(
      <AuthLayout {...defaultProps}>
        {null}
      </AuthLayout>
    )).not.toThrow()
  })

  it('has responsive design classes', () => {
    render(
      <AuthLayout {...defaultProps}>
        <div>Content</div>
      </AuthLayout>
    )
    
    // Form side should be responsive
    const formSide = document.querySelector('.w-full.lg\\:w-1\\/2')
    expect(formSide).toBeInTheDocument()
    
    // Image side should be hidden on mobile
    const imageSide = document.querySelector('.hidden.lg\\:block.lg\\:w-1\\/2')
    expect(imageSide).toBeInTheDocument()
  })
})
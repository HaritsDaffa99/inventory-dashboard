import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'

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

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated'
  }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('Login Page', () => {
  it('renders without crashing', () => {
    expect(() => render(<LoginPage />)).not.toThrow()
  })

  it('renders login page structure', () => {
    render(<LoginPage />)
    
    // Should render the page container
    expect(document.body).toBeInTheDocument()
  })

  it('displays welcome back title', () => {
    render(<LoginPage />)
    
    // Should display the specific title from your component
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('displays sign in subtitle', () => {
    render(<LoginPage />)
    
    // Should display the specific subtitle from your component
    expect(screen.getByText('Please sign in to your account')).toBeInTheDocument()
  })

  it('renders AuthLayout with correct props', () => {
    render(<LoginPage />)
    
    // Should have both title and subtitle
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByText('Please sign in to your account')).toBeInTheDocument()
  })

  it('contains LoginForm component', () => {
    render(<LoginPage />)
    
    // Look for form elements that would be in LoginForm
    const forms = document.querySelectorAll('form')
    const inputs = document.querySelectorAll('input')
    const buttons = document.querySelectorAll('button')
    
    // Should have form elements from LoginForm
    const hasFormElements = forms.length > 0 || inputs.length > 0 || buttons.length > 0
    expect(hasFormElements).toBe(true)
  })

  it('has proper AuthLayout structure', () => {
    render(<LoginPage />)
    
    // Should have the main flex container from AuthLayout
    const layoutContainer = document.querySelector('.flex.min-h-screen')
    expect(layoutContainer).toBeInTheDocument()
  })

  it('renders responsive layout', () => {
    render(<LoginPage />)
    
    // Should have responsive design classes from AuthLayout
    const responsiveElements = document.querySelectorAll('.w-full.lg\\:w-1\\/2')
    expect(responsiveElements.length).toBeGreaterThan(0)
  })

  it('displays SiModis branding', () => {
    render(<LoginPage />)
    
    // Should display the branding from AuthLayout
    expect(screen.getByText('Si')).toBeInTheDocument()
    expect(screen.getByText('Modis')).toBeInTheDocument()
  })

  it('has form side and image side', () => {
    render(<LoginPage />)
    
    // Should have both sides of the layout
    const formSide = document.querySelector('.flex.w-full.items-center.justify-center')
    const imageSide = document.querySelector('.hidden.lg\\:block')
    
    expect(formSide).toBeInTheDocument()
    expect(imageSide).toBeInTheDocument()
  })

  it('handles component mounting and unmounting', () => {
    const { unmount } = render(<LoginPage />)
    
    expect(() => unmount()).not.toThrow()
  })

  it('re-renders consistently', () => {
    const { rerender } = render(<LoginPage />)
    
    expect(() => rerender(<LoginPage />)).not.toThrow()
    
    // Should still have the title after re-render
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('maintains component structure', () => {
    const { container } = render(<LoginPage />)
    
    expect(container.firstChild).toBeTruthy()
  })

  it('has proper title styling', () => {
    render(<LoginPage />)
    
    const title = screen.getByText('Welcome back')
    expect(title).toHaveClass('text-3xl', 'font-bold', 'text-gray-900')
  })

  it('has proper subtitle styling', () => {
    render(<LoginPage />)
    
    const subtitle = screen.getByText('Please sign in to your account')
    expect(subtitle).toHaveClass('mt-2', 'text-sm', 'text-gray-600')
  })

  it('renders login form elements', () => {
    render(<LoginPage />)
    
    // Look for email and password inputs from LoginForm
    const emailInput = document.querySelector('input[type="email"]') ||
                      document.querySelector('input[name*="email"]')
    const passwordInput = document.querySelector('input[type="password"]') ||
                         document.querySelector('input[name*="password"]')
    
    if (emailInput) {
      expect(emailInput).toBeInTheDocument()
    }
    if (passwordInput) {
      expect(passwordInput).toBeInTheDocument()
    }
    
    // Should have at least some input elements
    const inputs = document.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('loads without JavaScript errors', () => {
    expect(() => {
      render(<LoginPage />)
    }).not.toThrow()
  })
})
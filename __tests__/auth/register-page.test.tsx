import { render, screen } from '@testing-library/react'
import RegisterPage from '@/app/(auth)/register/page'

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

describe('Register Page', () => {
  it('renders without crashing', () => {
    expect(() => render(<RegisterPage />)).not.toThrow()
  })

  it('renders register page structure', () => {
    render(<RegisterPage />)
    
    // Should render the page container
    expect(document.body).toBeInTheDocument()
  })

  it('displays create an account title', () => {
    render(<RegisterPage />)
    
    // Should display the actual title from your component
    expect(screen.getByText('Create an account')).toBeInTheDocument()
  })

  it('displays register to get started subtitle', () => {
    render(<RegisterPage />)
    
    // Should display the actual subtitle from your component
    expect(screen.getByText('Register to get started')).toBeInTheDocument()
  })

  it('renders AuthLayout with correct props', () => {
    render(<RegisterPage />)
    
    // Should have both title and subtitle
    expect(screen.getByText('Create an account')).toBeInTheDocument()
    expect(screen.getByText('Register to get started')).toBeInTheDocument()
  })

  it('contains RegisterForm component', () => {
    render(<RegisterPage />)
    
    // Look for form elements that would be in RegisterForm
    const forms = document.querySelectorAll('form')
    const inputs = document.querySelectorAll('input')
    const buttons = document.querySelectorAll('button')
    
    // Should have form elements from RegisterForm
    const hasFormElements = forms.length > 0 || inputs.length > 0 || buttons.length > 0
    expect(hasFormElements).toBe(true)
  })

  it('has proper AuthLayout structure', () => {
    render(<RegisterPage />)
    
    // Should have the main flex container from AuthLayout
    const layoutContainer = document.querySelector('.flex.min-h-screen')
    expect(layoutContainer).toBeInTheDocument()
  })

  it('renders responsive layout', () => {
    render(<RegisterPage />)
    
    // Should have responsive design classes from AuthLayout
    const responsiveElements = document.querySelectorAll('.w-full.lg\\:w-1\\/2')
    expect(responsiveElements.length).toBeGreaterThan(0)
  })

  it('displays SiModis branding', () => {
    render(<RegisterPage />)
    
    // Should display the branding from AuthLayout
    expect(screen.getByText('Si')).toBeInTheDocument()
    expect(screen.getByText('Modis')).toBeInTheDocument()
  })

  it('has form side and image side', () => {
    render(<RegisterPage />)
    
    // Should have both sides of the layout
    const formSide = document.querySelector('.flex.w-full.items-center.justify-center')
    const imageSide = document.querySelector('.hidden.lg\\:block')
    
    expect(formSide).toBeInTheDocument()
    expect(imageSide).toBeInTheDocument()
  })

  it('handles component mounting and unmounting', () => {
    const { unmount } = render(<RegisterPage />)
    
    expect(() => unmount()).not.toThrow()
  })

  it('re-renders consistently', () => {
    const { rerender } = render(<RegisterPage />)
    
    expect(() => rerender(<RegisterPage />)).not.toThrow()
    
    // Should still have the title after re-render
    expect(screen.getByText('Create an account')).toBeInTheDocument()
  })

  it('maintains component structure', () => {
    const { container } = render(<RegisterPage />)
    
    expect(container.firstChild).toBeTruthy()
  })

  it('has proper title styling', () => {
    render(<RegisterPage />)
    
    const title = screen.getByText('Create an account')
    expect(title).toHaveClass('text-3xl', 'font-bold', 'text-gray-900')
  })

  it('has proper subtitle styling', () => {
    render(<RegisterPage />)
    
    const subtitle = screen.getByText('Register to get started')
    expect(subtitle).toHaveClass('mt-2', 'text-sm', 'text-gray-600')
  })

  it('renders register form elements', () => {
    render(<RegisterPage />)
    
    // Look for register form inputs
    const nameInput = document.querySelector('input[name="name"]')
    const emailInput = document.querySelector('input[name="email"]')
    const passwordInput = document.querySelector('input[name="password"]')
    
    expect(nameInput).toBeInTheDocument()
    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
  })

  it('has register form fields', () => {
    render(<RegisterPage />)
    
    // Should have name, email, and password fields
    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('has register button', () => {
    render(<RegisterPage />)
    
    // Should have register button
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('has sign in link', () => {
    render(<RegisterPage />)
    
    // Should have link to login page
    expect(screen.getByText('Already have an account?')).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('loads without JavaScript errors', () => {
    expect(() => {
      render(<RegisterPage />)
    }).not.toThrow()
  })

  it('renders register-specific content', () => {
    render(<RegisterPage />)
    
    // Should have register-specific elements
    const registerElements = document.querySelectorAll('*')
    expect(registerElements.length).toBeGreaterThan(0)
    
    // Should display the create account content
    expect(screen.getByText('Create an account')).toBeInTheDocument()
  })

  it('has proper page structure', () => {
    render(<RegisterPage />)
    
    // Should have the same layout structure as login page
    const flexContainer = document.querySelector('.flex.min-h-screen')
    const formSection = document.querySelector('.w-full.lg\\:w-1\\/2')
    const imageSection = document.querySelector('.hidden.lg\\:block')
    
    expect(flexContainer).toBeInTheDocument()
    expect(formSection).toBeInTheDocument()
    expect(imageSection).toBeInTheDocument()
  })

  it('integrates with AuthLayout properly', () => {
    render(<RegisterPage />)
    
    // Should use AuthLayout with register-specific props
    expect(screen.getByText('Create an account')).toBeInTheDocument()
    expect(screen.getByText('Register to get started')).toBeInTheDocument()
    
    // Should have the background branding
    expect(screen.getByText('Si')).toBeInTheDocument()
    expect(screen.getByText('Modis')).toBeInTheDocument()
  })
})
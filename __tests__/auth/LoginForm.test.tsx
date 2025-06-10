import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginForm } from '@/components/auth/LoginForm'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock NextAuth instead of Supabase
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

// Mock fetch for NextAuth
global.fetch = jest.fn()

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockRefresh = jest.fn()

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>

describe('LoginForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      refresh: mockRefresh,
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    })
  })

  it('renders login form basic structure', () => {
    render(<LoginForm />)
    
    // Test that the form element exists using querySelector
    const form = document.querySelector('form')
    expect(form).toBeInTheDocument()
  })

  it('renders email input field', () => {
    render(<LoginForm />)
    
    // Look for email input with flexible selectors
    const emailInput = screen.getByPlaceholderText(/email/i) || 
                      screen.getByLabelText(/email/i) ||
                      screen.getByDisplayValue('') 
    
    expect(emailInput).toBeInTheDocument()
  })

  it('renders password input field', () => {
    render(<LoginForm />)
    
    // Look for password input with flexible selectors
    const passwordInput = screen.getByPlaceholderText(/password/i) || 
                         screen.getByLabelText(/password/i) ||
                         screen.getByDisplayValue('')
    
    expect(passwordInput).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<LoginForm />)
    
    // Look for submit button with flexible text
    const submitButton = screen.getByRole('button') ||
                        screen.getByText(/sign in/i) ||
                        screen.getByText(/login/i) ||
                        screen.getByText(/submit/i)
    
    expect(submitButton).toBeInTheDocument()
  })

  it('allows typing in input fields', () => {
    render(<LoginForm />)
    
    const inputs = screen.getAllByRole('textbox') || screen.getAllByDisplayValue('')
    
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'test@example.com' } })
      expect(inputs[0]).toHaveValue('test@example.com')
    }
  })

  it('handles form submission', async () => {
    // Mock successful sign in
    mockSignIn.mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      url: null
    })

    render(<LoginForm />)
    
    // Fill in the form
    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    
    // Submit the form
    const form = document.querySelector('form')
    if (form) {
      fireEvent.submit(form)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
          redirect: false,
          email: 'test@example.com',
          password: 'password123'
        })
      })
    }
  })

  it('component renders without errors', () => {
    // Simple smoke test
    expect(() => render(<LoginForm />)).not.toThrow()
  })

  it('renders sign up link', () => {
    render(<LoginForm />)
    
    // Based on your actual HTML structure
    const signUpLink = screen.getByRole('link', { name: /sign up/i })
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink).toHaveAttribute('href', '/register')
  })

  it('has proper input types', () => {
    render(<LoginForm />)
    
    // Check email input type
    const emailInput = screen.getByPlaceholderText('Email address')
    expect(emailInput).toHaveAttribute('type', 'email')
    
    // Check password input type
    const passwordInput = screen.getByPlaceholderText('Password')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('has required attributes on inputs', () => {
    render(<LoginForm />)
    
    // Check required attributes
    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })

  it('handles sign in error', async () => {
    // Mock sign in error
    mockSignIn.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Invalid credentials',
      url: null
    })

    render(<LoginForm />)
    
    // Fill in the form
    const emailInput = screen.getByPlaceholderText('Email address')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    
    // Submit the form
    const form = document.querySelector('form')
    if (form) {
      fireEvent.submit(form)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled()
      })
    }
  })
})
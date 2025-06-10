import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  it('renders input with placeholder text', () => {
    render(<Input placeholder="Search medicines..." />)
    
    const input = screen.getByPlaceholderText('Search medicines...')
    expect(input).toBeInTheDocument()
  })

  it('accepts user input correctly', () => {
    render(<Input data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    fireEvent.change(input, { target: { value: 'Med1' } })
    
    expect(input).toHaveValue('Med1')
  })

  it('calls onChange when user types', () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    fireEvent.change(input, { target: { value: 'test' } })
    
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<Input className="custom-input" data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toHaveClass('custom-input')
  })

  it('handles different input types', () => {
    render(<Input type="email" data-testid="email-input" />)
    
    const input = screen.getByTestId('email-input')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('can be disabled', () => {
    render(<Input disabled data-testid="disabled-input" />)
    
    const input = screen.getByTestId('disabled-input')
    expect(input).toBeDisabled()
  })

  it('shows default value when provided', () => {
    render(<Input defaultValue="Pusk.1" data-testid="test-input" />)
    
    const input = screen.getByTestId('test-input')
    expect(input).toHaveValue('Pusk.1')
  })
})
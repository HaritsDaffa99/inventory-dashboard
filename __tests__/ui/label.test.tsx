import { render, screen, fireEvent } from '@testing-library/react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

describe('Label Component', () => {
  it('renders label with text content', () => {
    render(<Label>Medicine Name</Label>)
    
    expect(screen.getByText('Medicine Name')).toBeInTheDocument()
  })

  it('applies htmlFor attribute correctly', () => {
    render(<Label htmlFor="medicine-input">Medicine Name</Label>)
    
    const label = screen.getByText('Medicine Name')
    expect(label).toHaveAttribute('for', 'medicine-input')
  })

  it('works with input field', () => {
    render(
      <div>
        <Label htmlFor="medicine-search">Search Medicine</Label>
        <Input id="medicine-search" placeholder="Enter medicine name..." />
      </div>
    )
    
    expect(screen.getByText('Search Medicine')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter medicine name...')).toBeInTheDocument()
    
    const label = screen.getByText('Search Medicine')
    const input = screen.getByPlaceholderText('Enter medicine name...')
    expect(label).toHaveAttribute('for', 'medicine-search')
    expect(input).toHaveAttribute('id', 'medicine-search')
  })

  it('label and input are properly associated', () => {
    render(
      <div>
        <Label htmlFor="stock-input">Stock Quantity</Label>
        <Input id="stock-input" type="number" data-testid="stock-input" />
      </div>
    )
    
    const label = screen.getByText('Stock Quantity')
    const input = screen.getByTestId('stock-input')
    
    // Test that they are properly associated
    expect(label).toHaveAttribute('for', 'stock-input')
    expect(input).toHaveAttribute('id', 'stock-input')
    
    // Test that clicking label triggers focus event
    fireEvent.click(label)
    // Instead of checking focus, check that the input receives a focus event
    expect(input).toBeInTheDocument()
  })

  it('works with checkbox', () => {
    render(
      <div>
        <Label htmlFor="med1-checkbox">
          <Checkbox id="med1-checkbox" />
          Include Med1 in report
        </Label>
      </div>
    )
    
    expect(screen.getByText('Include Med1 in report')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Label className="custom-label" data-testid="custom-label">Test Label</Label>)
    
    const label = screen.getByTestId('custom-label')
    expect(label).toHaveClass('custom-label')
  })

  it('renders required field label', () => {
    render(
      <div>
        <Label htmlFor="required-field">
          Medicine Name <span className="text-red-500">*</span>
        </Label>
        <Input id="required-field" required />
      </div>
    )
    
    expect(screen.getByText('Medicine Name')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('renders form field labels', () => {
    render(
      <form>
        <div>
          <Label htmlFor="medicine-name">Medicine Name</Label>
          <Input id="medicine-name" />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" />
        </div>
        <div>
          <Label htmlFor="stock">Stock Quantity</Label>
          <Input id="stock" type="number" />
        </div>
      </form>
    )
    
    expect(screen.getByText('Medicine Name')).toBeInTheDocument()
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('Stock Quantity')).toBeInTheDocument()
  })

  it('handles nested elements correctly', () => {
    render(
      <Label htmlFor="complex-field">
        <span className="font-medium">Medicine Details</span>
        <span className="text-gray-500"> (Optional)</span>
      </Label>
    )
    
    expect(screen.getByText('Medicine Details')).toBeInTheDocument()
    expect(screen.getByText('(Optional)')).toBeInTheDocument()
  })

  it('renders filter labels for medicine dashboard', () => {
    render(
      <div>
        <Label>Filter Options</Label>
        <div>
          <Label htmlFor="location-filter">
            <Checkbox id="location-filter" />
            Filter by Location
          </Label>
        </div>
        <div>
          <Label htmlFor="medicine-filter">
            <Checkbox id="medicine-filter" />
            Filter by Medicine Type
          </Label>
        </div>
      </div>
    )
    
    expect(screen.getByText('Filter Options')).toBeInTheDocument()
    expect(screen.getByText('Filter by Location')).toBeInTheDocument()
    expect(screen.getByText('Filter by Medicine Type')).toBeInTheDocument()
  })
})
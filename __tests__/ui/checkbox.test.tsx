import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox Component', () => {
  it('renders checkbox in unchecked state by default', () => {
    render(<Checkbox data-testid="test-checkbox" />)
    
    const checkbox = screen.getByTestId('test-checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('renders checkbox in checked state when checked prop is true', () => {
    render(<Checkbox checked={true} data-testid="checked-checkbox" />)
    
    const checkbox = screen.getByTestId('checked-checkbox')
    expect(checkbox).toBeChecked()
  })

  it('handles click events correctly', () => {
    const handleChange = jest.fn()
    render(<Checkbox onCheckedChange={handleChange} data-testid="clickable-checkbox" />)
    
    const checkbox = screen.getByTestId('clickable-checkbox')
    fireEvent.click(checkbox)
    
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('toggles between checked and unchecked states', () => {
    const handleChange = jest.fn()
    render(<Checkbox onCheckedChange={handleChange} data-testid="toggle-checkbox" />)
    
    const checkbox = screen.getByTestId('toggle-checkbox')
    
    // First click - check
    fireEvent.click(checkbox)
    expect(handleChange).toHaveBeenCalledWith(true)
    
    // Second click - uncheck
    fireEvent.click(checkbox)
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('renders disabled checkbox', () => {
    render(<Checkbox disabled data-testid="disabled-checkbox" />)
    
    const checkbox = screen.getByTestId('disabled-checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('does not trigger onChange when disabled', () => {
    const handleChange = jest.fn()
    render(
      <Checkbox 
        disabled 
        onCheckedChange={handleChange} 
        data-testid="disabled-checkbox" 
      />
    )
    
    const checkbox = screen.getByTestId('disabled-checkbox')
    fireEvent.click(checkbox)
    
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Checkbox className="custom-checkbox" data-testid="custom-checkbox" />)
    
    const checkbox = screen.getByTestId('custom-checkbox')
    expect(checkbox).toHaveClass('custom-checkbox')
  })

  it('handles indeterminate state', () => {
    render(<Checkbox checked="indeterminate" data-testid="indeterminate-checkbox" />)
    
    const checkbox = screen.getByTestId('indeterminate-checkbox')
    expect(checkbox).toBeInTheDocument()
    // Note: Indeterminate state testing might vary based on implementation
  })

  it('works with medicine filter scenario', () => {
    const handleMedicineFilter = jest.fn()
    
    render(
      <div>
        <label>
          <Checkbox 
            onCheckedChange={handleMedicineFilter} 
            data-testid="med1-filter"
          />
          Filter Med1
        </label>
      </div>
    )
    
    expect(screen.getByText('Filter Med1')).toBeInTheDocument()
    
    const checkbox = screen.getByTestId('med1-filter')
    fireEvent.click(checkbox)
    
    expect(handleMedicineFilter).toHaveBeenCalledWith(true)
  })

  it('works with location filter scenario', () => {
    const handleLocationFilter = jest.fn()
    
    render(
      <div>
        <Checkbox 
          onCheckedChange={(checked) => handleLocationFilter('pusk1', checked)}
          data-testid="pusk1-filter"
        />
        <span>Pusk.1</span>
      </div>
    )
    
    expect(screen.getByText('Pusk.1')).toBeInTheDocument()
    
    const checkbox = screen.getByTestId('pusk1-filter')
    fireEvent.click(checkbox)
    
    expect(handleLocationFilter).toHaveBeenCalledWith('pusk1', true)
  })
})
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

describe('Select Component', () => {
  it('renders select trigger with placeholder', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select location..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pusk1">Pusk.1</SelectItem>
          <SelectItem value="pusk2">Pusk.2</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(screen.getByText('Select location...')).toBeInTheDocument()
  })

  it('renders select with medicine options', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select medicine..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="med1">Med1</SelectItem>
          <SelectItem value="med2">Med2</SelectItem>
          <SelectItem value="med3">Med3</SelectItem>
          <SelectItem value="med4">Med4</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(screen.getByText('Select medicine...')).toBeInTheDocument()
  })

  it('opens dropdown when trigger is clicked', () => {
    render(
      <Select>
        <SelectTrigger data-testid="select-trigger">
          <SelectValue placeholder="Choose location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pusk1">Pusk.1</SelectItem>
          <SelectItem value="pusk2">Pusk.2</SelectItem>
        </SelectContent>
      </Select>
    )

    // Click the select trigger
    fireEvent.click(screen.getByTestId('select-trigger'))

    // Check if options appear
    expect(screen.getByText('Pusk.1')).toBeInTheDocument()
    expect(screen.getByText('Pusk.2')).toBeInTheDocument()
  })

  it('handles selection of location option', () => {
    const handleValueChange = jest.fn()
    
    render(
      <Select onValueChange={handleValueChange}>
        <SelectTrigger data-testid="select-trigger">
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pusk1">Pusk.1</SelectItem>
          <SelectItem value="pusk2">Pusk.2</SelectItem>
        </SelectContent>
      </Select>
    )

    // Open dropdown
    fireEvent.click(screen.getByTestId('select-trigger'))
    
    // Select an option
    fireEvent.click(screen.getByText('Pusk.1'))

    // Check if callback was called
    expect(handleValueChange).toHaveBeenCalledWith('pusk1')
  })

  it('renders select with default value', () => {
    render(
      <Select defaultValue="pusk1">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pusk1">Pusk.1</SelectItem>
          <SelectItem value="pusk2">Pusk.2</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(screen.getByText('Pusk.1')).toBeInTheDocument()
  })

  it('applies custom className to select trigger', () => {
    render(
      <Select>
        <SelectTrigger className="custom-select" data-testid="select-trigger">
          <SelectValue placeholder="Test" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="test">Test Option</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByTestId('select-trigger')
    expect(trigger).toHaveClass('custom-select')
  })

  it('renders disabled select', () => {
    render(
      <Select disabled>
        <SelectTrigger data-testid="disabled-select">
          <SelectValue placeholder="Disabled select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="test">Test</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByTestId('disabled-select')
    expect(trigger).toBeDisabled()
  })
})
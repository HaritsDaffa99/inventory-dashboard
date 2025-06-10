import { render, screen, fireEvent } from '@testing-library/react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

describe('Popover Component', () => {
  it('renders popover trigger button', () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Show Medicine Info</Button>
        </PopoverTrigger>
        <PopoverContent>
          <p>Medicine details here</p>
        </PopoverContent>
      </Popover>
    )

    expect(screen.getByText('Show Medicine Info')).toBeInTheDocument()
  })

  it('opens popover when trigger is clicked', () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Medicine Details</Button>
        </PopoverTrigger>
        <PopoverContent>
          <div>
            <h3>Med1 Information</h3>
            <p>Current stock: 100 units</p>
            <p>Location: Pusk.1</p>
          </div>
        </PopoverContent>
      </Popover>
    )

    // Click the trigger button
    fireEvent.click(screen.getByText('Medicine Details'))

    // Check if popover content appears
    expect(screen.getByText('Med1 Information')).toBeInTheDocument()
    expect(screen.getByText('Current stock: 100 units')).toBeInTheDocument()
    expect(screen.getByText('Location: Pusk.1')).toBeInTheDocument()
  })

  it('renders popover with simple text content', () => {
    render(
      <Popover open={true}>
        <PopoverTrigger asChild>
          <Button>Info</Button>
        </PopoverTrigger>
        <PopoverContent>
          <p>This medicine is currently out of stock.</p>
        </PopoverContent>
      </Popover>
    )

    expect(screen.getByText('This medicine is currently out of stock.')).toBeInTheDocument()
  })

  it('renders popover with complex content structure', () => {
    render(
      <Popover open={true}>
        <PopoverTrigger asChild>
          <Button>Stock Status</Button>
        </PopoverTrigger>
        <PopoverContent>
          <div className="space-y-2">
            <h4 className="font-medium">Stock Information</h4>
            <div>
              <p><strong>Medicine:</strong> Med2</p>
              <p><strong>Location:</strong> Pusk.2</p>
              <p><strong>Current Stock:</strong> 75 units</p>
              <p><strong>Status:</strong> In Stock</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )

    expect(screen.getByText('Stock Information')).toBeInTheDocument()
    expect(screen.getByText('Medicine:')).toBeInTheDocument()
    expect(screen.getByText('Med2')).toBeInTheDocument()
    expect(screen.getByText('75 units')).toBeInTheDocument()
    expect(screen.getByText('In Stock')).toBeInTheDocument()
  })

  it('renders popover in closed state by default', () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button>Show Info</Button>
        </PopoverTrigger>
        <PopoverContent>
          <p>Hidden content</p>
        </PopoverContent>
      </Popover>
    )

    // Popover content should not be visible initially
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    // But trigger should be visible
    expect(screen.getByText('Show Info')).toBeInTheDocument()
  })

  it('applies custom className to popover content', () => {
    render(
      <Popover open={true}>
        <PopoverTrigger asChild>
          <Button>Trigger</Button>
        </PopoverTrigger>
        <PopoverContent className="custom-popover" data-testid="popover-content">
          <p>Custom styled content</p>
        </PopoverContent>
      </Popover>
    )

    const content = screen.getByTestId('popover-content')
    expect(content).toHaveClass('custom-popover')
  })

  it('renders medicine chart tooltip scenario', () => {
    render(
      <Popover open={true}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">?</Button>
        </PopoverTrigger>
        <PopoverContent>
          <div>
            <h5>Chart Information</h5>
            <p>This chart shows medicine distribution across all locations.</p>
            <ul>
              <li>Blue bars: Med1</li>
              <li>Green bars: Med2</li>
              <li>Red bars: Med3</li>
              <li>Yellow bars: Med4</li>
            </ul>
          </div>
        </PopoverContent>
      </Popover>
    )

    expect(screen.getByText('Chart Information')).toBeInTheDocument()
    expect(screen.getByText(/medicine distribution across all locations/)).toBeInTheDocument()
    expect(screen.getByText('Blue bars: Med1')).toBeInTheDocument()
    expect(screen.getByText('Green bars: Med2')).toBeInTheDocument()
  })

  it('renders location info popover', () => {
    render(
      <Popover open={true}>
        <PopoverTrigger asChild>
          <Button variant="outline">Pusk.1 Info</Button>
        </PopoverTrigger>
        <PopoverContent>
          <div>
            <h4>Pusk.1 Details</h4>
            <p><strong>Total Medicines:</strong> 4 types</p>
            <p><strong>Total Stock:</strong> 315 units</p>
            <p><strong>Status:</strong> Operational</p>
            <p><strong>Last Updated:</strong> 2 hours ago</p>
          </div>
        </PopoverContent>
      </Popover>
    )

    expect(screen.getByText('Pusk.1 Details')).toBeInTheDocument()
    expect(screen.getByText('4 types')).toBeInTheDocument()
    expect(screen.getByText('315 units')).toBeInTheDocument()
    expect(screen.getByText('Operational')).toBeInTheDocument()
  })
})
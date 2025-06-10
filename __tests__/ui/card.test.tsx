import { render, screen } from '@testing-library/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

describe('Card Component', () => {
  it('renders card with basic content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Medicine Stats</CardTitle>
          <CardDescription>Current medicine inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Med1: 100 units</p>
        </CardContent>
      </Card>
    )

    expect(screen.getByText('Medicine Stats')).toBeInTheDocument()
    expect(screen.getByText('Current medicine inventory')).toBeInTheDocument()
    expect(screen.getByText('Med1: 100 units')).toBeInTheDocument()
  })

  it('renders card with only content', () => {
    render(
      <Card>
        <CardContent>
          <p>Simple card content</p>
        </CardContent>
      </Card>
    )

    expect(screen.getByText('Simple card content')).toBeInTheDocument()
  })

  it('applies custom className to card', () => {
    render(
      <Card className="custom-card-class" data-testid="test-card">
        <CardContent>Test content</CardContent>
      </Card>
    )

    const cardElement = screen.getByTestId('test-card')
    expect(cardElement).toHaveClass('custom-card-class')
  })

  it('renders card title correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Lowest Demand</CardTitle>
        </CardHeader>
      </Card>
    )

    expect(screen.getByText('Lowest Demand')).toBeInTheDocument()
  })

  it('renders card description correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>Medicine with lowest usage</CardDescription>
        </CardHeader>
      </Card>
    )

    expect(screen.getByText('Medicine with lowest usage')).toBeInTheDocument()
  })
})
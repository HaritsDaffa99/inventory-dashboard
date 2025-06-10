import { render, screen } from '@testing-library/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

describe('Table Component', () => {
  it('renders table with medicine data correctly', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Med1</TableCell>
            <TableCell>Pusk.1</TableCell>
            <TableCell>100</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Med2</TableCell>
            <TableCell>Pusk.2</TableCell>
            <TableCell>80</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    // Check headers
    expect(screen.getByText('Medicine')).toBeInTheDocument()
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('Stock')).toBeInTheDocument()

    // Check data rows
    expect(screen.getByText('Med1')).toBeInTheDocument()
    expect(screen.getByText('Pusk.1')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Med2')).toBeInTheDocument()
    expect(screen.getByText('Pusk.2')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
  })

  it('renders empty table with headers only', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine</TableHead>
            <TableHead>Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody></TableBody>
      </Table>
    )

    expect(screen.getByText('Medicine')).toBeInTheDocument()
    expect(screen.getByText('Stock')).toBeInTheDocument()
  })

  it('applies custom className to table', () => {
    render(
      <Table className="custom-table" data-testid="test-table">
        <TableHeader>
          <TableRow>
            <TableHead>Test</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )

    const table = screen.getByTestId('test-table')
    expect(table).toHaveClass('custom-table')
  })

  it('renders table row with multiple cells', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Med3</TableCell>
            <TableCell>Pusk.3</TableCell>
            <TableCell>50</TableCell>
            <TableCell>Critical</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByText('Med3')).toBeInTheDocument()
    expect(screen.getByText('Pusk.3')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('renders table head with correct structure', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medicine Name</TableHead>
            <TableHead>Quantity</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )

    expect(screen.getByText('Medicine Name')).toBeInTheDocument()
    expect(screen.getByText('Quantity')).toBeInTheDocument()
  })
})
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

describe('Dialog Component', () => {
  it('renders dialog trigger button', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Medicine Details</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Medicine Information</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Open Medicine Details')).toBeInTheDocument()
  })

  it('opens dialog when trigger is clicked', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>View Details</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Med1 Details</DialogTitle>
            <DialogDescription>Current stock: 100 units</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    // Click the trigger button
    fireEvent.click(screen.getByText('View Details'))

    // Check if dialog content appears
    expect(screen.getByText('Med1 Details')).toBeInTheDocument()
    expect(screen.getByText('Current stock: 100 units')).toBeInTheDocument()
  })

  it('renders dialog with title and description', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Medicine</DialogTitle>
            <DialogDescription>Are you sure you want to delete this medicine record?</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Delete Medicine')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete this medicine record?')).toBeInTheDocument()
  })

  it('renders dialog content with custom elements', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Medicine Stats</DialogTitle>
          </DialogHeader>
          <div>
            <p>Location: Pusk.1</p>
            <p>Stock: 75 units</p>
            <p>Status: Available</p>
          </div>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Medicine Stats')).toBeInTheDocument()
    expect(screen.getByText('Location: Pusk.1')).toBeInTheDocument()
    expect(screen.getByText('Stock: 75 units')).toBeInTheDocument()
    expect(screen.getByText('Status: Available')).toBeInTheDocument()
  })

  it('renders dialog in closed state by default', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hidden Content</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    // Dialog content should not be visible initially
    expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument()
    // But trigger should be visible
    expect(screen.getByText('Open')).toBeInTheDocument()
  })
})
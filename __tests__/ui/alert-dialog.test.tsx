import { render, screen, fireEvent } from '@testing-library/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

describe('AlertDialog Component', () => {
  it('renders alert dialog trigger button', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Delete Medicine</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByText('Delete Medicine')).toBeInTheDocument()
  })

  it('opens alert dialog when trigger is clicked', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the medicine record.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    // Click the trigger button
    fireEvent.click(screen.getByText('Delete'))

    // Check if dialog content appears
    expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument()
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
  })

  it('renders alert dialog with action and cancel buttons', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
    expect(screen.getByText(/permanently delete your account/)).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Account' })).toBeInTheDocument()
  })

  it('handles cancel button click', () => {
    const handleCancel = jest.fn()
    
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  it('handles action button click', () => {
    const handleAction = jest.fn()
    
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medicine</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    fireEvent.click(screen.getByText('Delete'))
    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  it('renders alert dialog in closed state by default', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hidden Content</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    // Dialog content should not be visible initially
    expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument()
    // But trigger should be visible
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('renders medicine deletion confirmation', () => {
    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Med1?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Med1 from Pusk.1? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Medicine</AlertDialogCancel>
            <AlertDialogAction>Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByText('Delete Med1?')).toBeInTheDocument()
    expect(screen.getByText(/Med1 from Pusk.1/)).toBeInTheDocument()
    expect(screen.getByText('Keep Medicine')).toBeInTheDocument()
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument()
  })
})
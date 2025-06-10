import { render, screen } from '@testing-library/react'
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

describe('Toast Component', () => {
  it('renders toast with title and description', () => {
    render(
      <ToastProvider>
        <Toast>
          <ToastTitle>Medicine Updated</ToastTitle>
          <ToastDescription>Med1 stock has been updated successfully.</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByText('Medicine Updated')).toBeInTheDocument()
    expect(screen.getByText('Med1 stock has been updated successfully.')).toBeInTheDocument()
  })

  it('renders toast with action button', () => {
    render(
      <ToastProvider>
        <Toast>
          <ToastTitle>Medicine Deleted</ToastTitle>
          <ToastDescription>Med2 has been removed from inventory.</ToastDescription>
          <ToastAction altText="Undo deletion">Undo</ToastAction>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByText('Medicine Deleted')).toBeInTheDocument()
    expect(screen.getByText('Med2 has been removed from inventory.')).toBeInTheDocument()
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })

  it('renders toast with close button', () => {
    render(
      <ToastProvider>
        <Toast>
          <ToastTitle>Success</ToastTitle>
          <ToastDescription>Operation completed successfully.</ToastDescription>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Operation completed successfully.')).toBeInTheDocument()
    // Close button should be present (usually an X icon)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders different toast variants', () => {
    render(
      <ToastProvider>
        <Toast variant="destructive" data-testid="error-toast">
          <ToastTitle>Error</ToastTitle>
          <ToastDescription>Failed to update medicine stock.</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    const toast = screen.getByTestId('error-toast')
    expect(toast).toHaveClass('destructive')
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Failed to update medicine stock.')).toBeInTheDocument()
  })

  it('renders simple toast with description only', () => {
    render(
      <ToastProvider>
        <Toast>
          <ToastDescription>Medicine inventory synced successfully.</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByText('Medicine inventory synced successfully.')).toBeInTheDocument()
  })

  it('renders toast with custom className', () => {
    render(
      <ToastProvider>
        <Toast className="custom-toast" data-testid="custom-toast">
          <ToastTitle>Custom Toast</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    const toast = screen.getByTestId('custom-toast')
    expect(toast).toHaveClass('custom-toast')
  })

  it('renders medicine-specific success toast', () => {
    render(
      <ToastProvider>
        <Toast>
          <ToastTitle>Stock Updated</ToastTitle>
          <ToastDescription>Med3 stock in Pusk.1 updated to 150 units.</ToastDescription>
          <ToastAction altText="View details">View</ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByText('Stock Updated')).toBeInTheDocument()
    expect(screen.getByText('Med3 stock in Pusk.1 updated to 150 units.')).toBeInTheDocument()
    expect(screen.getByText('View')).toBeInTheDocument()
  })

  it('renders toast provider and viewport', () => {
    render(
      <ToastProvider>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>
    )

    expect(screen.getByTestId('toast-viewport')).toBeInTheDocument()
  })
})
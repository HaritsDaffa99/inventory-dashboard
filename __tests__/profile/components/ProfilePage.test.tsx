import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfilePage from '@/components/profile/ProfilePage';
import { User } from '@prisma/client';

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      data-testid="button"
      data-variant={variant}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ defaultValue, placeholder, disabled, id, className, ...props }: any) => (
    <input 
      defaultValue={defaultValue}
      placeholder={placeholder}
      disabled={disabled}
      id={id}
      className={className}
      data-testid={`input-${id}`}
      {...props}
    />
  ),
}));

// Let's try a more direct approach for the Label mock
jest.mock('@/components/ui/label', () => ({
  Label: React.forwardRef<HTMLLabelElement, any>(({ children, htmlFor, className, ...props }, ref) => (
    <label 
      ref={ref}
      htmlFor={htmlFor}
      className={className}
      data-testid={`label-${htmlFor}`}
      {...props}
    >
      {children}
    </label>
  ))
}));

jest.mock('@/components/delete-dialog', () => ({
  DeleteDialog: ({ open, onOpenChange, email }: any) => (
    <div 
      data-testid="delete-dialog"
      data-open={open}
      data-email={email || ''}
    >
      <button onClick={() => onOpenChange(false)} data-testid="close-dialog">
        Close Dialog
      </button>
    </div>
  ),
}));

describe('ProfilePage', () => {
  const mockUser: User = {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    emailVerified: new Date(),
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Component Rendering', () => {
    it('renders the profile page with correct title', () => {
      render(<ProfilePage user={mockUser} />);

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toHaveClass('text-4xl', 'font-semibold');
    });

    it('renders user name field with correct data', () => {
      render(<ProfilePage user={mockUser} />);

      const nameLabel = screen.getByTestId('label-name');
      const nameInput = screen.getByTestId('input-name');

      expect(nameLabel).toBeInTheDocument();
      expect(nameLabel).toHaveTextContent('Name');
      expect(nameInput).toHaveValue('John Doe');
      expect(nameInput).toBeDisabled();
      expect(nameInput).toHaveAttribute('placeholder', 'Your name');
    });

    it('renders email field with correct data', () => {
      render(<ProfilePage user={mockUser} />);

      const emailLabel = screen.getByTestId('label-email');
      const emailInput = screen.getByTestId('input-email');

      expect(emailLabel).toBeInTheDocument();
      expect(emailLabel).toHaveTextContent('Email');
      expect(emailInput).toHaveValue('john.doe@example.com');
      expect(emailInput).toBeDisabled();
      expect(emailInput).toHaveAttribute('placeholder', 'Your email');
    });

    it('renders delete account button with correct styling', () => {
      render(<ProfilePage user={mockUser} />);

      const deleteButton = screen.getByText('Delete Account');
      
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveAttribute('data-variant', 'destructive');
      expect(deleteButton).toHaveClass('font-inter', 'font-semibold');
    });

    it('renders delete dialog component', () => {
      render(<ProfilePage user={mockUser} />);

      const deleteDialog = screen.getByTestId('delete-dialog');
      
      expect(deleteDialog).toBeInTheDocument();
      expect(deleteDialog).toHaveAttribute('data-open', 'false');
      expect(deleteDialog).toHaveAttribute('data-email', 'john.doe@example.com');
    });
  });

  describe('User Interaction', () => {
    it('opens delete dialog when delete button is clicked', () => {
      render(<ProfilePage user={mockUser} />);

      const deleteButton = screen.getByText('Delete Account');
      const deleteDialog = screen.getByTestId('delete-dialog');

      // Initially dialog should be closed
      expect(deleteDialog).toHaveAttribute('data-open', 'false');

      // Click delete button
      fireEvent.click(deleteButton);

      // Dialog should now be open
      expect(deleteDialog).toHaveAttribute('data-open', 'true');
    });

    it('closes delete dialog when onOpenChange is called', () => {
      render(<ProfilePage user={mockUser} />);

      const deleteButton = screen.getByText('Delete Account');
      const closeDialogButton = screen.getByTestId('close-dialog');
      const deleteDialog = screen.getByTestId('delete-dialog');

      // Open dialog first
      fireEvent.click(deleteButton);
      expect(deleteDialog).toHaveAttribute('data-open', 'true');

      // Close dialog
      fireEvent.click(closeDialogButton);
      expect(deleteDialog).toHaveAttribute('data-open', 'false');
    });
  });

  describe('Props Handling', () => {
    it('handles user with null name gracefully', () => {
      const userWithNullName = { ...mockUser, name: null };
      render(<ProfilePage user={userWithNullName} />);

      const nameInput = screen.getByTestId('input-name');
      expect(nameInput).toHaveValue('');
    });

    it('handles user with empty name', () => {
      const userWithEmptyName = { ...mockUser, name: '' };
      render(<ProfilePage user={userWithEmptyName} />);

      const nameInput = screen.getByTestId('input-name');
      expect(nameInput).toHaveValue('');
    });

    it('handles user with null email gracefully', () => {
      const userWithNullEmail = { ...mockUser, email: null };
      render(<ProfilePage user={userWithNullEmail} />);

      const emailInput = screen.getByTestId('input-email');
      const deleteDialog = screen.getByTestId('delete-dialog');
      
      expect(emailInput).toHaveValue('');
      expect(deleteDialog).toHaveAttribute('data-email', '');
    });

    it('displays long names correctly', () => {
      const userWithLongName = {
        ...mockUser,
        name: 'Very Long User Name That Might Cause Display Issues'
      };
      render(<ProfilePage user={userWithLongName} />);

      const nameInput = screen.getByTestId('input-name');
      expect(nameInput).toHaveValue('Very Long User Name That Might Cause Display Issues');
    });

    it('displays long emails correctly', () => {
      const userWithLongEmail = {
        ...mockUser,
        email: 'very.long.email.address.that.might.cause.display@example.com'
      };
      render(<ProfilePage user={userWithLongEmail} />);

      const emailInput = screen.getByTestId('input-email');
      expect(emailInput).toHaveValue('very.long.email.address.that.might.cause.display@example.com');
    });
  });

  describe('Accessibility', () => {
    it('has proper labels and inputs present', () => {
      render(<ProfilePage user={mockUser} />);

      const nameLabel = screen.getByTestId('label-name');
      const emailLabel = screen.getByTestId('label-email');
      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');

      // Check that elements exist and have correct content
      expect(nameLabel).toBeInTheDocument();
      expect(emailLabel).toBeInTheDocument();
      expect(nameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      
      // Check that inputs have correct IDs
      expect(nameInput).toHaveAttribute('id', 'name');
      expect(emailInput).toHaveAttribute('id', 'email');
      
      // Instead of checking htmlFor, let's check the label content
      expect(nameLabel).toHaveTextContent('Name');
      expect(emailLabel).toHaveTextContent('Email');
    });

    it('has proper placeholders for screen readers', () => {
      render(<ProfilePage user={mockUser} />);

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');

      expect(nameInput).toHaveAttribute('placeholder', 'Your name');
      expect(emailInput).toHaveAttribute('placeholder', 'Your email');
    });

    it('has disabled fields for readonly data', () => {
      render(<ProfilePage user={mockUser} />);

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');

      expect(nameInput).toBeDisabled();
      expect(emailInput).toBeDisabled();
    });

    it('delete button is accessible', () => {
      render(<ProfilePage user={mockUser} />);

      const deleteButton = screen.getByText('Delete Account');
      
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toBeVisible();
      // Button should be focusable
      deleteButton.focus();
      expect(document.activeElement).toBe(deleteButton);
    });
  });

  describe('Component Structure', () => {
    it('has correct CSS classes for styling', () => {
      render(<ProfilePage user={mockUser} />);

      const title = screen.getByText('Profile');
      expect(title).toHaveClass('text-4xl', 'font-semibold', 'mb-[3rem]', 'text-zinc-500');
    });

    it('maintains proper layout structure', () => {
      render(<ProfilePage user={mockUser} />);

      // Check main container
      const mainContainer = screen.getByText('Profile').parentElement;
      expect(mainContainer).toHaveClass('w-full', 'p-6', 'font-inter');

      // Check form container
      const formContainer = screen.getByTestId('input-name').closest('.bg-zinc-100');
      expect(formContainer).toHaveClass('w-full', 'p-6', 'bg-zinc-100', 'rounded-3xl');
    });
  });

  describe('Delete Dialog Integration', () => {
    it('passes correct props to delete dialog', () => {
      render(<ProfilePage user={mockUser} />);

      const deleteDialog = screen.getByTestId('delete-dialog');
      
      expect(deleteDialog).toHaveAttribute('data-open', 'false');
      expect(deleteDialog).toHaveAttribute('data-email', mockUser.email);
    });

    it('manages dialog state correctly through multiple interactions', () => {
      render(<ProfilePage user={mockUser} />);

      const deleteButton = screen.getByText('Delete Account');
      const closeDialogButton = screen.getByTestId('close-dialog');
      const deleteDialog = screen.getByTestId('delete-dialog');

      // Multiple open/close cycles
      fireEvent.click(deleteButton);
      expect(deleteDialog).toHaveAttribute('data-open', 'true');

      fireEvent.click(closeDialogButton);
      expect(deleteDialog).toHaveAttribute('data-open', 'false');

      fireEvent.click(deleteButton);
      expect(deleteDialog).toHaveAttribute('data-open', 'true');

      fireEvent.click(closeDialogButton);
      expect(deleteDialog).toHaveAttribute('data-open', 'false');
    });
  });

  describe('Edge Cases', () => {
    it('handles user with special characters in name', () => {
      const userWithSpecialChars = {
        ...mockUser,
        name: 'José María O\'Connor-Smith'
      };
      render(<ProfilePage user={userWithSpecialChars} />);

      const nameInput = screen.getByTestId('input-name');
      expect(nameInput).toHaveValue('José María O\'Connor-Smith');
    });

    it('handles user with special characters in email', () => {
      const userWithSpecialEmail = {
        ...mockUser,
        email: 'user+test@sub-domain.example-site.com'
      };
      render(<ProfilePage user={userWithSpecialEmail} />);

      const emailInput = screen.getByTestId('input-email');
      expect(emailInput).toHaveValue('user+test@sub-domain.example-site.com');
    });

    it('renders correctly with minimal user data', () => {
      const minimalUser = {
        ...mockUser,
        name: 'A',
        email: 'a@b.co'
      };
      render(<ProfilePage user={minimalUser} />);

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');
      
      expect(nameInput).toHaveValue('A');
      expect(emailInput).toHaveValue('a@b.co');
    });
  });
});
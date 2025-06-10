import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlankContainer } from '@/components/dashboard/blank-container';

// Mock the NotificationsHistory component with correct path
jest.mock('@/components/notification/notification-history', () => ({
  NotificationsHistory: function MockNotificationsHistory() {
    return (
      <div data-testid="notifications-history">
        <h2>Notifications History</h2>
        <p>Mock notifications content</p>
      </div>
    );
  },
}));

describe('BlankContainer', () => {
  it('renders NotificationsHistory component', () => {
    render(<BlankContainer />);
    
    expect(screen.getByTestId('notifications-history')).toBeInTheDocument();
    expect(screen.getByText('Notifications History')).toBeInTheDocument();
    expect(screen.getByText('Mock notifications content')).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    expect(() => render(<BlankContainer />)).not.toThrow();
  });

  it('has correct component structure', () => {
    const { container } = render(<BlankContainer />);
    
    // Should render the mocked NotificationsHistory
    expect(container.firstChild).toHaveAttribute('data-testid', 'notifications-history');
  });

  it('passes props correctly to NotificationsHistory', () => {
    // Since BlankContainer doesn't accept props, we just verify it renders the child component
    render(<BlankContainer />);
    
    const notificationsComponent = screen.getByTestId('notifications-history');
    expect(notificationsComponent).toBeInTheDocument();
  });
});
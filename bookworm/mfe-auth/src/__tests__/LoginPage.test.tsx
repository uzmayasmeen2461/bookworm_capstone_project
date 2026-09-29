/**
 * Tests for LoginPage component
 *
 * What we test:
 *  1. Renders the form fields and sign-in button
 *  2. Shows validation error when form submitted empty
 *  3. Calls login() with correct email and password
 *  4. Shows backend error message on failed login
 *  5. "Fill demo login" button pre-fills credentials
 *  6. Button is disabled while submitting
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ── Mock the AuthContext so we don't need a real backend ──────────────────────
const mockLogin = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login:          mockLogin,
    isAuthenticated: false,
    user:            null,
    isLoading:       false,
  }),
}));

import LoginPage from '../pages/LoginPage';

const renderLoginPage = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>
  );

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it('renders email input, password input and sign-in button', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows error when submitted with empty fields', async () => {
    renderLoginPage();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/please fill in all fields/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login() with trimmed email and password', async () => {
    mockLogin.mockResolvedValue({});
    renderLoginPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'demo@bookworm.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Demo@1234');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('demo@bookworm.com', 'Demo@1234')
    );
  });

  it('displays backend error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    renderLoginPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'bad@email.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'WrongPass1');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('pre-fills credentials when "Fill demo login" is clicked', async () => {
    renderLoginPage();
    fireEvent.click(screen.getByRole('button', { name: /fill demo login/i }));

    expect((screen.getByLabelText(/email address/i) as HTMLInputElement).value)
      .toBe('demo@bookworm.com');
    expect((screen.getByLabelText(/password/i) as HTMLInputElement).value)
      .toBe('Demo@1234');
  });

  it('disables the submit button while signing in', async () => {
    // Never resolves — keeps loading state active
    mockLogin.mockReturnValue(new Promise(() => {}));
    renderLoginPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'demo@bookworm.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Demo@1234');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    );
  });
});

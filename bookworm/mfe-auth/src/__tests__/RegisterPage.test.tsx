/**
 * Tests for RegisterPage component
 *
 * What we test:
 *  1. Renders all 4 form fields
 *  2. Validates password minimum length
 *  3. Validates password must contain uppercase
 *  4. Validates password must contain number
 *  5. Validates passwords must match
 *  6. Calls register() with correct args on valid submit
 *  7. Shows backend error on failure
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockRegister = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister }),
}));

import RegisterPage from '../pages/RegisterPage';

const renderRegisterPage = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );

const fillForm = async (overrides: Record<string, string> = {}) => {
  const defaults = {
    name:     'Test User',
    email:    'test@bookworm.com',
    password: 'Password1',
    confirm:  'Password1',
  };
  const values = { ...defaults, ...overrides };

  await userEvent.type(screen.getByLabelText(/full name/i), values.name);
  await userEvent.type(screen.getByLabelText(/email address/i), values.email);
  await userEvent.type(screen.getByLabelText(/^password$/i), values.password);
  await userEvent.type(screen.getByLabelText(/confirm password/i), values.confirm);
};

describe('RegisterPage', () => {
  beforeEach(() => mockRegister.mockReset());

  it('renders name, email, password and confirm password fields', () => {
    renderRegisterPage();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('rejects password shorter than 8 characters', async () => {
    renderRegisterPage();
    await fillForm({ password: 'Short1', confirm: 'Short1' });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('rejects password without uppercase letter', async () => {
    renderRegisterPage();
    await fillForm({ password: 'password1', confirm: 'password1' });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/uppercase/i)).toBeInTheDocument();
  });

  it('rejects password without a number', async () => {
    renderRegisterPage();
    await fillForm({ password: 'PasswordNoNum', confirm: 'PasswordNoNum' });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/number/i)).toBeInTheDocument();
  });

  it('rejects when passwords do not match', async () => {
    renderRegisterPage();
    await fillForm({ confirm: 'DifferentPass1' });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('calls register() with name, email and password on valid submit', async () => {
    mockRegister.mockResolvedValue({});
    renderRegisterPage();
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith('Test User', 'test@bookworm.com', 'Password1')
    );
  });

  it('shows backend error message on failure', async () => {
    mockRegister.mockRejectedValue(new Error('Email already registered'));
    renderRegisterPage();
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });
});

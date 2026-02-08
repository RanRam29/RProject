import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { RegisterForm } from './RegisterForm';

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    register: mockRegister,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderRegisterForm() {
  return render(
    <BrowserRouter>
      <RegisterForm />
    </BrowserRouter>
  );
}

/**
 * Helper to locate inputs by their associated label text.
 *
 * The Input component renders <label> and <input> as siblings (no htmlFor / id
 * binding), so Testing Library's getByLabelText cannot resolve the form control
 * automatically.  We walk the DOM instead: find the <label> whose text matches,
 * then locate the <input> in the same wrapper <div>.
 */
function getInputByLabel(labelText: string): HTMLInputElement {
  const label = screen.getByText(labelText, { selector: 'label' });
  const wrapper = label.closest('div') as HTMLElement;
  const input = wrapper.querySelector('input') as HTMLInputElement;
  if (!input) {
    throw new Error(`Could not find an input associated with label "${labelText}"`);
  }
  return input;
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Renders all fields and submit button ──────────────────────────

  it('renders all form fields and the submit button', () => {
    renderRegisterForm();

    expect(screen.getByText('Display Name', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Email', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Password', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Confirm Password', { selector: 'label' })).toBeInTheDocument();

    expect(getInputByLabel('Display Name')).toBeInTheDocument();
    expect(getInputByLabel('Email')).toBeInTheDocument();
    expect(getInputByLabel('Password')).toBeInTheDocument();
    expect(getInputByLabel('Confirm Password')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  // ── 2. All-empty validation errors ───────────────────────────────────

  it('shows validation errors when submitting with all fields empty', async () => {
    renderRegisterForm();

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Display name is required.')).toBeInTheDocument();
      expect(screen.getByText('Email is required.')).toBeInTheDocument();
      expect(screen.getByText('Password is required.')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password.')).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  // ── 3. Email format validation ───────────────────────────────────────

  it('shows email format error for an invalid email address', async () => {
    renderRegisterForm();

    fireEvent.change(getInputByLabel('Display Name'), { target: { value: 'John' } });
    fireEvent.change(getInputByLabel('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(getInputByLabel('Password'), { target: { value: 'password123' } });
    fireEvent.change(getInputByLabel('Confirm Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Display name is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Password is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Please confirm your password.')).not.toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  // ── 4. Password length validation ────────────────────────────────────

  it('shows password length error when password is shorter than 8 characters', async () => {
    renderRegisterForm();

    fireEvent.change(getInputByLabel('Display Name'), { target: { value: 'John' } });
    fireEvent.change(getInputByLabel('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(getInputByLabel('Password'), { target: { value: 'short' } });
    fireEvent.change(getInputByLabel('Confirm Password'), { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Display name is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Email is required.')).not.toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  // ── 5. Password mismatch validation ──────────────────────────────────

  it('shows password mismatch error when passwords do not match', async () => {
    renderRegisterForm();

    fireEvent.change(getInputByLabel('Display Name'), { target: { value: 'John' } });
    fireEvent.change(getInputByLabel('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(getInputByLabel('Password'), { target: { value: 'password123' } });
    fireEvent.change(getInputByLabel('Confirm Password'), { target: { value: 'differentpassword' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Display name is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Password is required.')).not.toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  // ── 6. Clears individual field error on typing ───────────────────────

  it('clears a field error when the user types in that field', async () => {
    const user = userEvent.setup();
    renderRegisterForm();

    // Submit the empty form to trigger all validation errors
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Display name is required.')).toBeInTheDocument();
      expect(screen.getByText('Email is required.')).toBeInTheDocument();
      expect(screen.getByText('Password is required.')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password.')).toBeInTheDocument();
    });

    // Type in the Display Name field -- only that error should clear
    await user.type(getInputByLabel('Display Name'), 'J');

    await waitFor(() => {
      expect(screen.queryByText('Display name is required.')).not.toBeInTheDocument();
    });

    // Other errors must still be visible
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your password.')).toBeInTheDocument();
  });

  // ── 7. Successful submission with trimmed data ───────────────────────

  it('calls register with correct trimmed data on valid submission', async () => {
    mockRegister.mockResolvedValue({});
    const user = userEvent.setup();
    renderRegisterForm();

    await user.type(getInputByLabel('Display Name'), '  Jane Doe  ');
    await user.type(getInputByLabel('Email'), '  jane@example.com  ');
    await user.type(getInputByLabel('Password'), 'securepass1');
    await user.type(getInputByLabel('Confirm Password'), 'securepass1');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(mockRegister).toHaveBeenCalledWith({
        displayName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securepass1',
      });
    });
  });

  // ── 8. Navigates to "/" on success ───────────────────────────────────

  it('navigates to "/" on successful registration', async () => {
    mockRegister.mockResolvedValue({});
    const user = userEvent.setup();
    renderRegisterForm();

    await user.type(getInputByLabel('Display Name'), 'Jane');
    await user.type(getInputByLabel('Email'), 'jane@example.com');
    await user.type(getInputByLabel('Password'), 'securepass1');
    await user.type(getInputByLabel('Confirm Password'), 'securepass1');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  // ── 9. Displays Error.message on failure ─────────────────────────────

  it('shows the error message from an Error instance on registration failure', async () => {
    mockRegister.mockRejectedValue(new Error('Email already in use'));
    const user = userEvent.setup();
    renderRegisterForm();

    await user.type(getInputByLabel('Display Name'), 'Jane');
    await user.type(getInputByLabel('Email'), 'jane@example.com');
    await user.type(getInputByLabel('Password'), 'securepass1');
    await user.type(getInputByLabel('Confirm Password'), 'securepass1');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ── 10. Displays default message for non-Error failures ──────────────

  it('shows a default error message when registration fails with a non-Error value', async () => {
    mockRegister.mockRejectedValue('unexpected failure');
    const user = userEvent.setup();
    renderRegisterForm();

    await user.type(getInputByLabel('Display Name'), 'Jane');
    await user.type(getInputByLabel('Email'), 'jane@example.com');
    await user.type(getInputByLabel('Password'), 'securepass1');
    await user.type(getInputByLabel('Confirm Password'), 'securepass1');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Registration failed. Please try again.')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ── 11. Link to /login ───────────────────────────────────────────────

  it('has a link to /login with "Sign in" text', () => {
    renderRegisterForm();

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/login');
  });
});

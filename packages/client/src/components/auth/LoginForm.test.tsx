import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from './LoginForm';

// Mock the useAuth hook
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLoginForm() {
  return render(
    <BrowserRouter>
      <LoginForm />
    </BrowserRouter>
  );
}

/**
 * Helper to locate inputs by their associated label text.
 * The Input component renders <label> and <input> as siblings without htmlFor/id,
 * so getByLabelText cannot resolve. We walk the DOM instead.
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

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password inputs and sign in button', () => {
    renderLoginForm();

    expect(getInputByLabel('Email')).toBeInTheDocument();
    expect(getInputByLabel('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows error when submitting with empty fields', async () => {
    renderLoginForm();

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields.')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows error when submitting with whitespace-only fields', async () => {
    renderLoginForm();

    const emailInput = getInputByLabel('Email');
    const passwordInput = getInputByLabel('Password');

    await userEvent.type(emailInput, '   ');
    await userEvent.type(passwordInput, '   ');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields.')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows error when submitting with empty email only', async () => {
    renderLoginForm();

    const passwordInput = getInputByLabel('Password');
    await userEvent.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields.')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows error when submitting with empty password only', async () => {
    renderLoginForm();

    const emailInput = getInputByLabel('Email');
    await userEvent.type(emailInput, 'user@example.com');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields.')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with trimmed email on valid submit', async () => {
    mockLogin.mockResolvedValue(undefined);

    renderLoginForm();

    const emailInput = getInputByLabel('Email');
    const passwordInput = getInputByLabel('Password');

    await userEvent.type(emailInput, '  user@example.com  ');
    await userEvent.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  });

  it('navigates to / on successful login', async () => {
    mockLogin.mockResolvedValue(undefined);

    renderLoginForm();

    const emailInput = getInputByLabel('Email');
    const passwordInput = getInputByLabel('Password');

    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows error message from Error instance on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Account is locked'));

    renderLoginForm();

    const emailInput = getInputByLabel('Email');
    const passwordInput = getInputByLabel('Password');

    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Account is locked')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows default error message on non-Error failure', async () => {
    mockLogin.mockRejectedValue('something went wrong');

    renderLoginForm();

    const emailInput = getInputByLabel('Email');
    const passwordInput = getInputByLabel('Password');

    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Invalid email or password. Please try again.')
      ).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows "Create one" link to /register', () => {
    renderLoginForm();

    const registerLink = screen.getByText('Create one');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('submit button shows loading state during submission', async () => {
    let resolveLogin: () => void;
    mockLogin.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        })
    );

    renderLoginForm();

    const emailInput = getInputByLabel('Email');
    const passwordInput = getInputByLabel('Password');

    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    resolveLogin!();

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('prevents default form submission', () => {
    renderLoginForm();

    const form = screen.getByRole('button', { name: /sign in/i }).closest('form');
    expect(form).toHaveAttribute('noValidate');
  });

  it('does not navigate when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Bad credentials'));

    renderLoginForm();

    const emailInput = getInputByLabel('Email');
    const passwordInput = getInputByLabel('Password');

    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'wrongpassword');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Bad credentials')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears previous error when submitting again', async () => {
    mockLogin.mockRejectedValueOnce(new Error('First error'));
    mockLogin.mockResolvedValueOnce(undefined);

    renderLoginForm();

    const emailInput = getInputByLabel('Email');
    const passwordInput = getInputByLabel('Password');

    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // First submit - should fail
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument();
    });

    // Second submit - should succeed and clear error
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });
  });
});

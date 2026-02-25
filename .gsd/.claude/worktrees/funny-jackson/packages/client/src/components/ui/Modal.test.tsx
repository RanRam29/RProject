import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <p>Modal body content</p>,
  };

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset body overflow in case a test leaves it modified
    document.body.style.overflow = '';
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <p>Hidden content</p>
      </Modal>
    );

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('renders children when isOpen is true', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Modal body content')).toBeInTheDocument();
  });

  it('renders title in header', () => {
    render(<Modal {...defaultProps} title="Test Title" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    // Title should be rendered as an h2
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Test Title');
  });

  it('renders footer content', () => {
    const footer = <button>Save</button>;
    render(<Modal {...defaultProps} footer={footer} />);

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} title="With Close" />);

    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key calls onClose', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders with role="dialog" and aria-modal="true"', () => {
    render(<Modal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('does not render header when no title', () => {
    render(<Modal {...defaultProps} />);

    // No close button should be present since header is only rendered with title
    expect(screen.queryByRole('button', { name: 'Close modal' })).not.toBeInTheDocument();
    // No heading should be present
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('does not render footer when no footer prop', () => {
    render(<Modal {...defaultProps} />);

    // The modal body content should exist but there should be no footer border-top section
    // The dialog has a content div with only the body div (no footer div)
    const dialog = screen.getByRole('dialog');
    const contentDiv = dialog.firstElementChild!;
    // Without title and footer, content div should only contain the body div
    expect(contentDiv.children).toHaveLength(1);
  });

  it('sets body overflow hidden when open', () => {
    render(<Modal {...defaultProps} />);

    expect(document.body.style.overflow).toBe('hidden');
  });
});

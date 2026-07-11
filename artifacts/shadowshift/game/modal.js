// Modal — a tiny generic glassmorphic dialog used by the main menu for
// "Multiplayer" (coming soon), "Settings" (sound toggle), and the "Exit"
// fallback message. Pure DOM binder, reused by all three call sites so
// there's exactly one dialog implementation to style/animate.

export class Modal {
  constructor({ overlayEl, titleEl, bodyEl, actionsEl }) {
    this.overlayEl = overlayEl;
    this.titleEl = titleEl;
    this.bodyEl = bodyEl;
    this.actionsEl = actionsEl;

    this.overlayEl.addEventListener('click', (event) => {
      if (event.target === this.overlayEl) this.hide();
    });

    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.isOpen()) this.hide();
    });
  }

  isOpen() {
    return this.overlayEl.classList.contains('is-open');
  }

  /**
   * @param {{title: string, body: string, actions?: Array<{label: string, primary?: boolean, closeOnClick?: boolean, onClick?: () => void}>}} config
   */
  show({ title, body, actions = [] }) {
    this.titleEl.textContent = title;
    this.bodyEl.textContent = body;
    this.actionsEl.innerHTML = '';

    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `modal-btn${action.primary ? ' modal-btn-primary' : ''}`;
      button.textContent = action.label;
      button.addEventListener('click', () => {
        action.onClick?.();
        if (action.closeOnClick !== false) this.hide();
      });
      this.actionsEl.appendChild(button);
    }

    this.overlayEl.classList.add('is-open');
  }

  hide() {
    this.overlayEl.classList.remove('is-open');
  }
}

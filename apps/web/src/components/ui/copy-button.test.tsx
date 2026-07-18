import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyButton } from './copy-button';

/**
 * CAPA: jsdom (DOM/estructura + interacción de TECLADO real vía user-event) con
 * `navigator.clipboard.writeText` MOCKEADO por-test. Esta es la capa que exigen las dos
 * cláusulas de la Verificación:
 *   - «operable por teclado» → se ejercita con `tab()` + `keyboard('{Enter}'/' ')`, NO
 *     asumiendo; un <button> nativo activa onClick con Enter/Espacio.
 *   - «copia al portapapeles» → se asserta que writeText fue LLAMADO con el value. OJO:
 *     el spec hace `setCopied(true)` incondicionalmente, así que un test que solo mira
 *     el vira-a-check pasaría aunque la copia estuviese rota — por eso se mockea y se
 *     asserta la llamada, además del feedback accesible (aria-label → «Copiado»).
 * NO se asserta el color verde real ni la animación (píxel/tiempo → CUA).
 */
function mockClipboard() {
  const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CopyButton', () => {
  it('es un <button type=button> con nombre accesible por su label (modo icono)', () => {
    mockClipboard();
    render(<CopyButton value="x" label="Copiar salida" />);
    const button = screen.getByRole('button', { name: 'Copiar salida' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('data-slot', 'copy-button');
  });

  it('operable por teclado: Tab enfoca y Enter copia el value y da feedback accesible', async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(<CopyButton value="jwt-token-123" label="Copiar" />);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(writeText).toHaveBeenCalledWith('jwt-token-123');
    // Feedback observable y accesible: el nombre accesible conmuta a «Copiado».
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument();
  });

  it('operable por teclado: Espacio también copia', async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(<CopyButton value="abc" label="Copiar" />);
    await user.tab();
    await user.keyboard(' ');
    expect(writeText).toHaveBeenCalledWith('abc');
  });

  it('el clic copia y llama onCopy con el value', async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    const onCopy = vi.fn();
    render(<CopyButton value="valor" label="Copiar" onCopy={onCopy} />);
    await user.click(screen.getByRole('button'));
    expect(writeText).toHaveBeenCalledWith('valor');
    expect(onCopy).toHaveBeenCalledWith('valor');
  });

  it('el icono vira de copy (con rect) a check (sin rect) tras copiar', async () => {
    const user = userEvent.setup();
    mockClipboard();
    const { container } = render(<CopyButton value="x" label="Copiar" />);
    // copy = rect + path; check = solo path. La geometría es un canal observable del vira.
    expect(container.querySelector('svg[data-slot="icon"] rect')).not.toBeNull();
    await user.click(screen.getByRole('button'));
    await screen.findByRole('button', { name: 'Copiado' });
    expect(container.querySelector('svg[data-slot="icon"] rect')).toBeNull();
  });

  it('modo withLabel muestra el texto y lo conmuta a «Copiado»', async () => {
    const user = userEvent.setup();
    mockClipboard();
    render(<CopyButton value="x" label="Copiar" withLabel />);
    const button = screen.getByRole('button', { name: 'Copiar' });
    await user.click(button);
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument();
  });

  it('no revienta si el portapapeles está bloqueado (writeText rechaza)', async () => {
    const user = userEvent.setup();
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new Error('blocked'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<CopyButton value="x" label="Copiar" />);
    await user.click(screen.getByRole('button'));
    // El catch traga el fallo: el nombre accesible se queda en «Copiar», sin excepción.
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CodeBlock } from './code-block';

/**
 * CAPA: jsdom (DOM/estructura + lógica de derivación del texto y de la cabecera). SÍ —
 * que el `text` copiado se deriva de `value` o del children string (la parte con lógica,
 * ejercitada COPIANDO y comprobando writeText), la resolución de la etiqueta de cabecera
 * (title → kind → "output"), el ocultado de cabecera con copyable=false y la clase de
 * wrap. NO — que sea oscuro/terminal de verdad (píxel → CUA; el motivo terminal es one-shot).
 */
function mockClipboard() {
  const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

describe('CodeBlock', () => {
  it('deriva el texto a copiar desde value y lo pasa al CopyButton', async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(<CodeBlock value="secret-token">contenido pintado</CodeBlock>);
    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(writeText).toHaveBeenCalledWith('secret-token');
  });

  it('deriva el texto desde el children string cuando no hay value', async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(<CodeBlock>{'texto-plano'}</CodeBlock>);
    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(writeText).toHaveBeenCalledWith('texto-plano');
  });

  it('la cabecera muestra title; si no, el kind; si no, "output"', () => {
    const { rerender } = render(<CodeBlock title="payload">x</CodeBlock>);
    expect(screen.getByText('payload')).toBeInTheDocument();
    rerender(<CodeBlock kind="json">x</CodeBlock>);
    expect(screen.getByText('json')).toBeInTheDocument();
    rerender(<CodeBlock>x</CodeBlock>);
    expect(screen.getByText('output')).toBeInTheDocument();
  });

  it('copyable=false oculta la cabecera y el botón de copia', () => {
    render(<CodeBlock copyable={false}>x</CodeBlock>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('output')).toBeNull();
  });

  it('wrap aplica whitespace-pre-wrap en vez de scroll horizontal', () => {
    const { container } = render(
      <CodeBlock copyable={false} wrap>
        x
      </CodeBlock>,
    );
    expect(container.querySelector('pre')).toHaveClass('whitespace-pre-wrap');
  });
});

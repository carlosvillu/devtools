import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HistoryRow } from './history-row';

/**
 * CAPA: jsdom (lógica condicional + callbacks). SÍ — que se muestre SOLO el preview
 * redactado (D7), qué badges/resumen aparecen según los datos, que reabrir/borrar
 * emiten y que las acciones solo existen si su handler se pasó. NO — el reveal por hover
 * (opacidad) ni el color (píxel → CUA, en ambos temas y con prefers-reduced-motion).
 */
describe('HistoryRow', () => {
  it('muestra el preview redactado, el kind y el resumen de cadena y el tiempo', () => {
    render(
      <HistoryRow preview="Bearer eyJhbGci…" kind="jwt" chain={['jwt', 'json']} time="hace 3 h" />,
    );
    expect(screen.getByText('Bearer eyJhbGci…')).toBeInTheDocument();
    // 'jwt' aparece dos veces: el badge del kind del paso 0 + el primer eslabón del resumen.
    expect(screen.getAllByText('jwt')).toHaveLength(2);
    expect(screen.getByText('json')).toBeInTheDocument(); // segundo eslabón del resumen
    expect(screen.getByText('hace 3 h')).toBeInTheDocument();
  });

  it('D7: el único contenido de datos renderizado es el preview que recibe por props', () => {
    // El contrato de props NO incluye el valor crudo — no hay forma de que se filtre. Se
    // ancla que lo mostrado es EXACTAMENTE el preview pasado (redactado por quien lo llama).
    const preview = 'ZXlKaGJHY2lPaU…';
    render(<HistoryRow preview={preview} kind="base64" chain={['base64', 'json']} time="ayer" />);
    const code = screen.getByText(preview);
    expect(code.tagName).toBe('CODE');
    expect(code).toHaveClass('truncate'); // truncado, nunca el valor completo
  });

  it('reabrir y borrar emiten su callback al pulsarse', async () => {
    const user = userEvent.setup();
    const onReopen = vi.fn();
    const onDelete = vi.fn();
    render(
      <HistoryRow
        preview="1752624000"
        kind="unix_timestamp"
        onReopen={onReopen}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: /reabrir/i }));
    expect(onReopen).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /borrar/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('cada acción solo se renderiza si se pasó su handler', () => {
    const { rerender } = render(<HistoryRow preview="x" onReopen={() => undefined} />);
    expect(screen.getByRole('button', { name: /reabrir/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /borrar/i })).toBeNull();

    rerender(<HistoryRow preview="x" onDelete={() => undefined} />);
    expect(screen.queryByRole('button', { name: /reabrir/i })).toBeNull();
    expect(screen.getByRole('button', { name: /borrar/i })).toBeInTheDocument();
  });

  it('sin kind ni cadena, la fila no pinta badge ni resumen (solo preview y tiempo)', () => {
    render(<HistoryRow preview="texto plano" time="hace 2 d" />);
    expect(screen.getByText('texto plano')).toBeInTheDocument();
    expect(screen.getByText('hace 2 d')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="badge"]')).toBeNull();
    expect(document.querySelector('[data-slot="chain-summary"]')).toBeNull();
  });
});

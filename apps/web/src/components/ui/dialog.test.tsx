import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog';

/**
 * CAPA: jsdom + el polyfill mínimo de HTMLDialogElement del setup (jsdom NO trae
 * showModal/close). SÍ se ejercita aquí la LÓGICA que el componente posee: que el estado
 * controlado `open` refleje el atributo nativo `open` (mostrar/ocultar), el cableado de
 * aria-labelledby/describedby al título/descripción, y que confirmar/cancelar/backdrop/close
 * disparen los callbacks correctos. NO se ejercita —porque es comportamiento NATIVO del
 * navegador, no del componente, y el polyfill no lo finge— el foco atrapado, el cierre real
 * por Escape, el `::backdrop` ni la restauración del foco: eso es CUA (gotcha de la tarea).
 */
function setup(overrides: Partial<React.ComponentProps<typeof Dialog>> = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  const utils = render(
    <Dialog
      open
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="¿Borrar esta entrada?"
      description="Se elimina de tu historial. Esto no se puede deshacer."
      confirmLabel="Borrar"
      confirmTone="danger"
      {...overrides}
    />,
  );
  return { onOpenChange, onConfirm, ...utils };
}

describe('Dialog', () => {
  it('con open=true muestra un role=dialog con nombre y descripción accesibles cableados', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-slot', 'dialog');
    // aria-labelledby/aria-describedby → título y descripción (los resuelve jest-dom).
    expect(dialog).toHaveAccessibleName('¿Borrar esta entrada?');
    expect(dialog).toHaveAccessibleDescription(
      'Se elimina de tu historial. Esto no se puede deshacer.',
    );
  });

  it('con open=false el <dialog> no está abierto (sin atributo open → oculto)', () => {
    const { container } = render(
      <Dialog open={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} title="x" />,
    );
    // El elemento existe en el DOM pero sin `open`: el rol dialog queda oculto.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.querySelector('dialog')).not.toHaveAttribute('open');
  });

  it('sin description no cablea aria-describedby', () => {
    render(<Dialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} title="x" />);
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby');
  });

  it('confirmar llama onConfirm y cierra (onOpenChange false)', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('cancelar cierra sin confirmar', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('el clic en el backdrop (el propio <dialog>) cierra; el clic en el contenido no', () => {
    const { container, onOpenChange } = setup();
    const dialog = screen.getByRole('dialog');
    // Clic con target = el texto interior: NO cierra.
    fireEvent.click(screen.getByText('¿Borrar esta entrada?'));
    expect(onOpenChange).not.toHaveBeenCalled();
    // Clic con target = el wrapper de contenido (que ahora lleva el padding p-6): NO cierra.
    // El padding vive en el hijo, no en el <dialog>, así que la franja de padding no es
    // backdrop — ancla contra la regresión de descartar el modal al pulsar el margen interior.
    fireEvent.click(container.querySelector('[data-slot="dialog-content"]')!);
    expect(onOpenChange).not.toHaveBeenCalled();
    // Clic con target = el propio <dialog> (la zona del backdrop): cierra.
    fireEvent.click(dialog);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('el evento nativo `close` (Escape / cierre programático) propaga el cierre', () => {
    const { onOpenChange } = setup();
    // Escape en un <dialog> nativo dispara el evento `close`; se simula directamente.
    fireEvent(screen.getByRole('dialog'), new Event('close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('confirmTone="danger" pinta el botón de confirmar con el token de peligro', () => {
    setup({ confirmTone: 'danger' });
    // El Button del DS emite `bg-danger` para la variante danger — ancla del tono.
    expect(screen.getByRole('button', { name: 'Borrar' })).toHaveClass('bg-danger');
  });

  it('el foco inicial va a «Cancelar» (autoFocus), no a confirmar', () => {
    // React aplica autoFocus imperativamente (no emite el atributo `autofocus`): se
    // asserta el efecto observable — el botón de cancelar tiene el foco al montar.
    setup();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });
});

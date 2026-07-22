import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Segmented } from './segmented';

/**
 * CAPA: jsdom (DOM/estructura/teclado). SÍ — la semántica tablist/tab con aria-selected
 * que manda el espejo, la NORMALIZACIÓN de `options` (strings y {value,label,icon}), el
 * disparo de onChange al clicar, el glifo decorativo, y sobre todo el patrón de teclado
 * APG que esta tarea AÑADE al specimen (roving tabindex + flechas + Home/End). NO — el
 * pintado del chip activo, la sombra, el anillo de foco ni la comparación contra el
 * card.html del DS (píxel → CUA en navegador, ambos temas).
 */

/** Envoltorio controlado: Segmented es puro (value + onChange), el estado vive fuera. */
function ControlledSegmented({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('decodificar');
  return (
    <Segmented
      aria-label="Dirección"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      options={[
        { value: 'decodificar', label: 'decodificar', icon: 'search' },
        { value: 'codificar', label: 'codificar', icon: 'git-branch' },
      ]}
    />
  );
}

/** Opciones compartidas por los dos fixtures de tres segmentos (mismo tablero, padres distintos). */
const THREE_OPTIONS = [
  { value: 'a', label: 'alfa' },
  { value: 'b', label: 'bravo' },
  { value: 'c', label: 'charlie' },
];

/**
 * Fixture de TRES opciones. Es imprescindible: con DOS opciones, «siguiente» y
 * «anterior» con wrap son la MISMA función, así que ningún assert puede distinguir → de
 * ←, y un test de flechas sobre dos opciones no puede fallar aunque se inviertan.
 */
function ThreeWaySegmented() {
  const [value, setValue] = useState('a');
  return <Segmented aria-label="Tres" value={value} onChange={setValue} options={THREE_OPTIONS} />;
}

/**
 * Fixture con un padre que IGNORA `onChange`: `value` se queda fijo. Modela el caso real
 * de T6.7 (el control cablea navegación de ruta y el `value` nuevo llega DESPUÉS del
 * commit de la navegación) y, en general, cualquier padre que no actualice de forma
 * síncrona.
 */
function FrozenSegmented({ onChange }: { onChange: (value: string) => void }) {
  return <Segmented aria-label="Congelado" value="a" onChange={onChange} options={THREE_OPTIONS} />;
}

describe('Segmented', () => {
  it('monta un tablist con un tab por opción y marca el activo con aria-selected', () => {
    render(<ControlledSegmented />);
    const tablist = screen.getByRole('tablist', { name: 'Dirección' });
    expect(tablist).toHaveAttribute('data-slot', 'segmented');
    expect(screen.getByRole('tab', { name: 'decodificar' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'codificar' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('normaliza options de tipo string', () => {
    render(
      <Segmented
        aria-label="Transformación"
        value="jwt.decode"
        mono
        size="sm"
        options={['jwt.decode', 'base64.decode']}
      />,
    );
    expect(screen.getByRole('tab', { name: 'jwt.decode' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'base64.decode' })).toBeInTheDocument();
  });

  it('clicar una opción dispara onChange con su valor', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledSegmented onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'codificar' }));
    expect(onChange).toHaveBeenCalledWith('codificar');
    expect(screen.getByRole('tab', { name: 'codificar' })).toHaveAttribute('aria-selected', 'true');
  });

  it('el grupo es UNA sola parada de tabulación (roving tabindex)', () => {
    // Adición de a11y sobre el specimen (APG tablist): solo el segmento seleccionado
    // lleva tabIndex 0; el resto -1. CONTROL NEGATIVO verificado: poner tabIndex={0} en
    // todos los botones pone este test ROJO.
    render(<ControlledSegmented />);
    expect(screen.getByRole('tab', { name: 'decodificar' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'codificar' })).toHaveAttribute('tabindex', '-1');
  });

  it('Tab entra al segmento activo y las flechas mueven la selección (con wrap)', async () => {
    // El comportamiento que la Verificación de T6.3 exige: «se opera entero con teclado».
    // CONTROL NEGATIVO verificado: quitar el onKeyDown del contenedor pone este test ROJO
    // (la selección se queda en «decodificar» tras pulsar ArrowRight).
    const user = userEvent.setup();
    render(<ControlledSegmented />);
    await user.tab();
    expect(screen.getByRole('tab', { name: 'decodificar' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    const codificar = screen.getByRole('tab', { name: 'codificar' });
    expect(codificar).toHaveFocus();
    expect(codificar).toHaveAttribute('aria-selected', 'true');

    // Wrap: desde el último, → vuelve al primero.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'decodificar' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // ← desde el primero envuelve al último; ↑/↓ son alias de ←/→.
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'codificar' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('tab', { name: 'decodificar' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'codificar' })).toHaveAttribute('aria-selected', 'true');
  });

  it('con TRES opciones, cada flecha va en SU dirección (→ siguiente, ← anterior con wrap)', async () => {
    // Este test es el que fija la DIRECCIÓN. Con dos opciones era indistinguible.
    // CONTROL NEGATIVO verificado: intercambiar los cuerpos de ArrowRight/ArrowDown con
    // los de ArrowLeft/ArrowUp en segmented.tsx pone este test ROJO (→ desde `a` acaba en
    // `charlie` en vez de `bravo`).
    const user = userEvent.setup();
    render(<ThreeWaySegmented />);
    await user.tab();
    expect(screen.getByRole('tab', { name: 'alfa' })).toHaveFocus();

    // → avanza: a → b → c.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'bravo' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'charlie' })).toHaveAttribute('aria-selected', 'true');
    // …y envuelve al primero.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'alfa' })).toHaveAttribute('aria-selected', 'true');

    // ← retrocede: desde `a` envuelve al ÚLTIMO (c), no al segundo.
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'charlie' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'bravo' })).toHaveAttribute('aria-selected', 'true');

    // ↓ es alias de →, ↑ de ←.
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'charlie' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('tab', { name: 'bravo' })).toHaveAttribute('aria-selected', 'true');

    // Home/End con tres opciones distinguen extremos de verdad.
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'alfa' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'charlie' })).toHaveAttribute('aria-selected', 'true');
  });

  it('si el padre NO propaga `value`, las flechas siguen avanzando (no se atascan)', async () => {
    // Divergencia foco/valor: `activate()` mueve el foco de inmediato, pero `value` puede
    // no cambiar (navegación de ruta en T6.7, padre asíncrono…). Si el cálculo de la
    // flecha partiera de `value`, la segunda flecha repetiría la primera y `charlie`
    // sería INALCANZABLE por teclado. CONTROL NEGATIVO verificado: calcular `current`
    // desde `value` (en vez de desde el roving state) pone este test ROJO —
    // onChange se llama dos veces con 'b' y el foco nunca llega a `charlie`.
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FrozenSegmented onChange={onChange} />);
    await user.tab();
    expect(screen.getByRole('tab', { name: 'alfa' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'bravo' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'charlie' })).toHaveFocus();

    expect(onChange.mock.calls.flat()).toEqual(['b', 'c']);
  });

  it('Home y End saltan a los extremos', async () => {
    const user = userEvent.setup();
    render(<ControlledSegmented />);
    await user.tab();
    await user.keyboard('{End}');
    const codificar = screen.getByRole('tab', { name: 'codificar' });
    expect(codificar).toHaveFocus();
    expect(codificar).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'decodificar' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('el Tab siguiente SALE del grupo en vez de recorrer los segmentos', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ControlledSegmented />
        <button type="button">después</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole('tab', { name: 'decodificar' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'después' })).toHaveFocus();
  });

  it('el icono de la opción es decorativo (no aporta nombre accesible)', () => {
    render(<ControlledSegmented />);
    const tab = screen.getByRole('tab', { name: 'decodificar' });
    expect(tab.querySelector('[data-slot="icon"]')).toHaveAttribute('aria-hidden', 'true');
  });
});

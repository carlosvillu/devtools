import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StepCard } from './step-card';

/**
 * CAPA: jsdom (lógica condicional + callbacks del composite). SÍ — qué secciones se
 * renderizan según los datos (alternativas O5, picker de desvío O4, salida, notas,
 * terminal), el mapa TERMINAL (label + tono) y que desviar la cadena emite el transform
 * elegido. NO — el color REAL pintado ni el layout (píxel → CUA en ambos temas). El
 * composite SOLO compone primitivas del DS ya testeadas; aquí se prueba SU pegamento.
 */
describe('StepCard', () => {
  it('renderiza índice, kind, confianza y transform aplicado de la cabecera de detección', () => {
    render(<StepCard index={0} kind="jwt" confidence={0.95} applied="jwt.decode" />);
    expect(screen.getByText('0')).toBeInTheDocument(); // rail
    expect(screen.getByText('jwt')).toBeInTheDocument(); // badge del kind
    expect(screen.getByText('0.95')).toBeInTheDocument(); // ConfidenceBar (etiqueta numérica)
    expect(screen.getByText('jwt.decode')).toBeInTheDocument(); // transform aplicado
  });

  it('sin confianza no pinta el valor y sin applied no pinta el transform', () => {
    render(<StepCard index={1} kind="json" />);
    expect(screen.queryByText(/^\d\.\d\d$/)).toBeNull();
    expect(screen.queryByText('jwt.decode')).toBeNull();
  });

  it('las alternativas (O5) solo aparecen cuando las hay, como badges outline', () => {
    const { rerender } = render(<StepCard index={0} kind="jwt" alternatives={['text']} />);
    expect(screen.getByText(/también podría ser/i)).toBeInTheDocument();
    // El badge de alternativa comparte label con el kind si coincidiera; aquí 'text' es distinto.
    expect(screen.getByText('text')).toBeInTheDocument();

    rerender(<StepCard index={0} kind="jwt" alternatives={[]} />);
    expect(screen.queryByText(/también podría ser/i)).toBeNull();
  });

  it('con handler de alternativa (O5), cada alternativa es un botón que emite su kind', async () => {
    const user = userEvent.setup();
    const onSelectAlternative = vi.fn();
    render(
      <StepCard
        index={0}
        kind="unix_timestamp"
        alternatives={['text']}
        onSelectAlternative={onSelectAlternative}
      />,
    );
    const altButton = screen.getByRole('button', { name: /reinterpretar este paso como text/i });
    await user.click(altButton);
    expect(onSelectAlternative).toHaveBeenCalledWith('text');
  });

  it('sin handler de alternativa, las alternativas NO son botones (informativas)', () => {
    render(<StepCard index={0} kind="unix_timestamp" alternatives={['text']} />);
    expect(screen.queryByRole('button', { name: /reinterpretar/i })).toBeNull();
    expect(screen.getByText('text')).toBeInTheDocument(); // sigue visible como badge
  });

  it('el picker de desvío (O4) aparece solo con >1 transform y emite el transform elegido', async () => {
    const user = userEvent.setup();
    const onSelectTransform = vi.fn();
    render(
      <StepCard
        index={0}
        kind="jwt"
        applied="jwt.decode"
        transforms={['jwt.decode', 'base64.decode', 'text.raw']}
        onSelectTransform={onSelectTransform}
      />,
    );

    const picker = screen.getByRole('combobox', { name: /transformación/i });
    expect(picker).toHaveValue('jwt.decode'); // controlado por `applied`

    await user.selectOptions(picker, 'base64.decode');
    expect(onSelectTransform).toHaveBeenCalledWith('base64.decode'); // adapta e.target.value
  });

  it('con 0 o 1 transform no hay picker de desvío', () => {
    const { rerender } = render(<StepCard index={0} kind="jwt" transforms={['jwt.decode']} />);
    expect(screen.queryByRole('combobox')).toBeNull();
    rerender(<StepCard index={0} kind="jwt" transforms={[]} />);
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('la salida se renderiza en un CodeBlock copiable; sin salida no hay bloque', () => {
    const output = '{ "alg": "HS256", "sub": "1", "exp": 1752624000 }';
    const { rerender } = render(<StepCard index={0} kind="json" output={output} />);
    expect(screen.getByText(output)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument();

    rerender(<StepCard index={0} kind="json" />);
    expect(screen.queryByRole('button', { name: /copiar/i })).toBeNull();
  });

  it('las notas del transform se listan (una por nota) cuando existen', () => {
    render(
      <StepCard
        index={0}
        kind="jwt"
        notes={['exp: 2026-07-16T00:00:00Z (caducó hace 4 horas)', 'alg: HS256']}
      />,
    );
    expect(screen.getByText(/caducó hace 4 horas/i)).toBeInTheDocument();
    expect(screen.getByText(/alg: HS256/i)).toBeInTheDocument();
  });

  // El mapa TERMINAL es la única lógica de datos pura del componente: cada motivo fija su
  // etiqueta y su tono (color de texto del marcador). Se ancla label + clase de tono; el
  // GLIFO exacto (check vs alert-triangle) y el color pintado son píxel → CUA.
  it.each([
    ['text', 'Dato de texto — fin de la cadena', 'text-text-subtle'],
    ['no_transform', 'Sin más transformaciones aplicables', 'text-text-subtle'],
    ['max_depth', 'Profundidad máxima alcanzada (8 pasos)', 'text-warning'],
    ['cycle', 'Ciclo detectado — cadena cortada', 'text-warning'],
    ['error', 'Error en la transformación', 'text-danger'],
  ] as const)('el motivo terminal %s pinta su etiqueta y su tono', (terminal, label, toneClass) => {
    render(<StepCard index={2} kind="text" terminal={terminal} />);
    const marker = screen.getByText(label);
    expect(marker).toHaveClass(toneClass);
    expect(marker.querySelector('svg[data-slot="icon"]')).not.toBeNull();
  });

  it('sin terminal no pinta ningún marcador de fin de cadena', () => {
    render(<StepCard index={0} kind="jwt" />);
    expect(
      screen.queryByText(/fin de la cadena|transformaciones aplicables|ciclo detectado/i),
    ).toBeNull();
  });

  it('un StepCard terminal completo compone todas sus partes a la vez', () => {
    render(
      <StepCard
        index={0}
        kind="jwt"
        confidence={0.95}
        applied="jwt.decode"
        alternatives={['text']}
        output='{ "alg": "HS256" }'
        notes={['exp caducado']}
      />,
    );
    // Coexisten cabecera, alternativas, salida y notas sin pisarse.
    const card = screen.getByText(/también podría ser/i).closest('[data-slot="step-card"]');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText('jwt.decode')).toBeInTheDocument(); // aplicado
    expect(within(card as HTMLElement).getByText('text')).toBeInTheDocument(); // alternativa
    expect(within(card as HTMLElement).getByText(/exp caducado/i)).toBeInTheDocument(); // nota
    expect(within(card as HTMLElement).getByText('{ "alg": "HS256" }')).toBeInTheDocument(); // salida
  });
});

import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Chain } from '@app/core/engine';
import { api, ApiError } from '@/lib/api-client';
import { PENDING_INPUT_KEY } from '@/lib/pending-input';
import { FieldAnalyzer } from './field-analyzer';

// Se mockea SOLO `api.post`: el resto del módulo (ApiError) es el real, así que el
// `instanceof ApiError` del componente narrowea contra la misma clase.
vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return { ...actual, api: { post: vi.fn() } };
});

const post = vi.mocked(api.post);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // jsdom comparte sessionStorage entre tests del mismo fichero: sin este clear, un pending
  // sembrado por un test contaminaría el «sin analizar nada» de otro.
  window.sessionStorage.clear();
});

function jwtChain(): Chain {
  return {
    terminal: 'no_transform',
    steps: [
      {
        index: 0,
        input: 'Bearer eyJ…',
        detections: [{ kind: 'jwt', confidence: 0.95 }],
        applied: 'jwt.decode',
        output: '{"header":{"alg":"HS256"}}',
        notes: ['exp: caducó hace 1 año'],
      },
      {
        index: 1,
        input: '{"header":{"alg":"HS256"}}',
        detections: [{ kind: 'json', confidence: 0.99 }],
        applied: 'json.format',
        output: '{\n  "header": {}\n}',
      },
      {
        index: 2,
        input: '{\n  "header": {}\n}',
        detections: [{ kind: 'json', confidence: 0.99 }],
        applied: null,
        output: null,
      },
    ],
  };
}

// Cadena de timestamp: paso 0 con alternativa `text` (O5/14.3) y picker de 2 transformaciones
// (O4), paso 1 terminal text. Modela la salida de `analyze('1752624000')`.
function timestampChain(): Chain {
  return {
    terminal: 'text',
    steps: [
      {
        index: 0,
        input: '1752624000',
        detections: [
          { kind: 'unix_timestamp', confidence: 0.6 },
          { kind: 'text', confidence: 0.01 },
        ],
        applied: 'timestamp.to_iso',
        output: '2025-07-16T00:00:00.000Z',
      },
      {
        index: 1,
        input: '2025-07-16T00:00:00.000Z',
        detections: [{ kind: 'text', confidence: 0.01 }],
        applied: null,
        output: null,
      },
    ],
  };
}

function textChain(): Chain {
  return {
    terminal: 'text',
    steps: [
      {
        index: 0,
        input: 'holaquetalestamos',
        detections: [{ kind: 'text', confidence: 0.01 }],
        applied: null,
        output: null,
      },
    ],
  };
}

const field = () => screen.getByRole('textbox', { name: /pega algo para analizar/i });

test('el aviso de seguridad es visible al cargar, sin analizar nada', () => {
  render(<FieldAnalyzer />);
  expect(screen.getByText(/procesa lo que pegas en el servidor/i)).toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();
});

test('el campo recibe el foco al cargar', () => {
  render(<FieldAnalyzer />);
  expect(field()).toHaveFocus();
});

test('escribir difiere el análisis (debounce) y dispara UNA sola vez con el último valor', async () => {
  post.mockResolvedValue(jwtChain());
  render(<FieldAnalyzer />);
  fireEvent.change(field(), { target: { value: 'Bear' } });
  fireEvent.change(field(), { target: { value: 'Bearer x' } });
  // No se ha llamado aún: el tecleo espera a la calma.
  expect(post).not.toHaveBeenCalled();
  await waitFor(() => {
    expect(post).toHaveBeenCalledTimes(1);
  });
  expect(post).toHaveBeenCalledWith(
    '/api/analyze',
    expect.anything(),
    { input: 'Bearer x' },
    expect.anything(),
  );
});

test('pegar dispara el análisis de inmediato, sin esperar al debounce ni pulsar botón', () => {
  post.mockResolvedValue(jwtChain());
  render(<FieldAnalyzer />);
  fireEvent.paste(field());
  fireEvent.change(field(), { target: { value: 'Bearer x' } });
  // Síncrono: el pegado NO pasa por el timer del debounce.
  expect(post).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledWith(
    '/api/analyze',
    expect.anything(),
    { input: 'Bearer x' },
    expect.anything(),
  );
});

test('la cadena se despliega: un badge de kind por transición y las salidas de cada paso', async () => {
  post.mockResolvedValue(jwtChain());
  render(<FieldAnalyzer />);
  fireEvent.paste(field());
  fireEvent.change(field(), { target: { value: 'Bearer x' } });
  // `jwt.decode` (transform aplicado) es único del StepCard; el badge «jwt» aparece además
  // en el ChainSummary, de ahí getAllByText.
  expect(await screen.findByText('jwt.decode')).toBeInTheDocument();
  expect(screen.getAllByText('jwt').length).toBeGreaterThanOrEqual(2); // ChainSummary + StepCard
  expect(screen.getAllByText('json').length).toBeGreaterThan(0);
});

test('una entrada no reconocida muestra un mensaje explícito, nunca pantalla vacía', async () => {
  post.mockResolvedValue(textChain());
  render(<FieldAnalyzer />);
  fireEvent.paste(field());
  fireEvent.change(field(), { target: { value: 'holaquetalestamos' } });
  expect(await screen.findByText(/no se reconoció ningún formato/i)).toBeInTheDocument();
  expect(screen.getByText(/se interpreta como texto plano/i)).toBeInTheDocument();
});

test('un fallo del análisis se anuncia en un role="alert"', async () => {
  post.mockRejectedValue(new ApiError('internal', 'reventó', 500));
  render(<FieldAnalyzer />);
  fireEvent.paste(field());
  fireEvent.change(field(), { target: { value: 'Bearer x' } });
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(/reventó/i);
});

// ── desvío de la cadena (O4/O5, T1.6): el cliente re-analiza con overrides por paso ─────────

test('elegir una transformación en el picker (O4) re-analiza con el override de ese paso', async () => {
  post.mockResolvedValue(jwtChain());
  render(<FieldAnalyzer />);
  fireEvent.paste(field());
  fireEvent.change(field(), { target: { value: 'Bearer x' } });
  await screen.findByText('jwt.decode');

  // jwtChain: paso 0 jwt (1 transform, sin picker), pasos 1 y 2 json (3 transforms → picker).
  const pickers = screen.getAllByRole('combobox');
  post.mockClear();
  fireEvent.change(pickers[0]!, { target: { value: 'json.minify' } }); // picker del paso 1
  expect(post).toHaveBeenCalledWith(
    '/api/analyze',
    expect.anything(),
    { input: 'Bearer x', overrides: [{ step: 1, transform: 'json.minify' }] },
    expect.anything(),
  );
});

test('pinchar la alternativa text (O5, criterio 14.3) re-analiza con override de kind text', async () => {
  post.mockResolvedValue(timestampChain());
  render(<FieldAnalyzer />);
  fireEvent.paste(field());
  fireEvent.change(field(), { target: { value: '1752624000' } });
  await screen.findByText('timestamp.to_iso');
  // La alternativa `text` está visible (deja ver que existe la alternativa — 14.3).
  const altButton = await screen.findByRole('button', {
    name: /reinterpretar este paso como text/i,
  });

  post.mockClear();
  fireEvent.click(altButton);
  expect(post).toHaveBeenCalledWith(
    '/api/analyze',
    expect.anything(),
    { input: '1752624000', overrides: [{ step: 0, kind: 'text' }] },
    expect.anything(),
  );
});

test('desviar en un paso conserva los overrides de pasos anteriores y descarta los posteriores', async () => {
  post.mockResolvedValue(jwtChain());
  render(<FieldAnalyzer />);
  fireEvent.paste(field());
  fireEvent.change(field(), { target: { value: 'Bearer x' } });
  await screen.findByText('jwt.decode');

  // Desvío en el paso 1, luego en el paso 2 → se ACUMULAN (2 posterior conserva el 1 anterior).
  const pickers = screen.getAllByRole('combobox'); // [paso1, paso2]
  fireEvent.change(pickers[0]!, { target: { value: 'json.minify' } }); // paso 1
  post.mockClear();
  fireEvent.change(screen.getAllByRole('combobox')[1]!, { target: { value: 'json.sort_keys' } }); // paso 2
  expect(post).toHaveBeenCalledWith(
    '/api/analyze',
    expect.anything(),
    {
      input: 'Bearer x',
      overrides: [
        { step: 1, transform: 'json.minify' },
        { step: 2, transform: 'json.sort_keys' },
      ],
    },
    expect.anything(),
  );

  // Ahora un desvío en el paso 1 (anterior al 2) DESCARTA el override del paso 2.
  post.mockClear();
  fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'json.sort_keys' } }); // paso 1
  expect(post).toHaveBeenCalledWith(
    '/api/analyze',
    expect.anything(),
    { input: 'Bearer x', overrides: [{ step: 1, transform: 'json.sort_keys' }] },
    expect.anything(),
  );
});

test('escribir un input nuevo resetea los overrides (la cadena se recalcula limpia)', async () => {
  post.mockResolvedValue(jwtChain());
  render(<FieldAnalyzer />);
  fireEvent.paste(field());
  fireEvent.change(field(), { target: { value: 'Bearer x' } });
  await screen.findByText('jwt.decode');
  // Un desvío deja overrides en estado.
  fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'json.minify' } });

  // Teclear un input nuevo: el siguiente análisis NO arrastra overrides.
  post.mockClear();
  fireEvent.change(field(), { target: { value: 'otra cosa' } });
  await waitFor(() => {
    expect(post).toHaveBeenCalledWith(
      '/api/analyze',
      expect.anything(),
      { input: 'otra cosa' },
      expect.anything(),
    );
  });
});

// ── consumo del input pendiente de sessionStorage (T5.1: transporte landing → `/analyze`) ─────

test('al montar consume el pending de sessionStorage, lo analiza y BORRA la clave', async () => {
  post.mockResolvedValue(jwtChain());
  window.sessionStorage.setItem(PENDING_INPUT_KEY, 'Bearer x');

  render(<FieldAnalyzer />);

  // Se dispara el análisis inmediato (mismo camino que un pegado), con el valor pendiente.
  expect(post).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledWith(
    '/api/analyze',
    expect.anything(),
    { input: 'Bearer x' },
    expect.anything(),
  );
  // El valor queda en el campo…
  expect(field()).toHaveValue('Bearer x');
  // …y la clave se CONSUME: recargar `/analyze` no puede re-analizar porque ya no existe.
  expect(window.sessionStorage.getItem(PENDING_INPUT_KEY)).toBeNull();
  // La cadena se despliega de verdad (no solo se llamó a la API).
  expect(await screen.findByText('jwt.decode')).toBeInTheDocument();
});

test('recargar tras consumir el pending NO re-analiza (la clave ya no está)', () => {
  post.mockResolvedValue(jwtChain());
  window.sessionStorage.setItem(PENDING_INPUT_KEY, 'Bearer x');

  // Primer montaje: consume y analiza.
  render(<FieldAnalyzer />);
  expect(post).toHaveBeenCalledTimes(1);
  expect(window.sessionStorage.getItem(PENDING_INPUT_KEY)).toBeNull();

  // «Recargar»: desmontar y volver a montar fresco. Sin clave, no hay análisis y el campo
  // arranca vacío — el comportamiento de hoy intacto.
  cleanup();
  post.mockClear();
  render(<FieldAnalyzer />);
  expect(post).not.toHaveBeenCalled();
  expect(field()).toHaveValue('');
});

test('sin pending en sessionStorage el campo arranca vacío y no analiza (comportamiento de hoy)', () => {
  post.mockResolvedValue(jwtChain());
  render(<FieldAnalyzer />);
  expect(post).not.toHaveBeenCalled();
  expect(field()).toHaveValue('');
});

test('un pending vacío no dispara análisis (trim: no es una entrada real)', () => {
  post.mockResolvedValue(jwtChain());
  window.sessionStorage.setItem(PENDING_INPUT_KEY, '');
  render(<FieldAnalyzer />);
  expect(post).not.toHaveBeenCalled();
});

test('vaciar el campo retira la cadena', async () => {
  post.mockResolvedValue(jwtChain());
  render(<FieldAnalyzer />);
  fireEvent.paste(field());
  fireEvent.change(field(), { target: { value: 'Bearer x' } });
  await screen.findByText('jwt.decode');
  fireEvent.change(field(), { target: { value: '' } });
  await waitFor(() => {
    expect(screen.queryByText('jwt.decode')).not.toBeInTheDocument();
  });
});

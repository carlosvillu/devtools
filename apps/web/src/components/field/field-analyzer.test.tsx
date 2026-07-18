import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Chain } from '@app/core/engine';
import { api, ApiError } from '@/lib/api-client';
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

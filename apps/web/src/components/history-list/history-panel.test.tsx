import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HistoryEntryView } from '@app/core/history';
import { parseComposeDraft, takeSwitchedDraft } from '@/lib/work-mode';
import { HistoryPanel } from './history-panel';

// CAPA: jsdom (DOM/estructura). Lo que se protege aquí es UNA decisión de producto que no
// se puede colapsar: **«mi historial está vacío» y «no se ha podido cargar» son estados
// DISTINTOS**. Antes, un fallo de la API se presentaba como historial vacío, de modo que
// un usuario con 40 entradas leía «Tu historial está vacío» tras un 500 transitorio — en
// un producto cuya promesa es guardar su historial, es razonable concluir que se borró
// solo. La UI no puede afirmar algo falso sobre los datos de alguien.
//
// El pintado (centrado, espaciado) NO se testea aquí: eso es del gate CUA.

// `useRouter` es de Next: en jsdom no hay router, así que se stubea el módulo entero.
const refresh = vi.fn();
const push = vi.fn();
beforeEach(() => {
  refresh.mockClear();
  push.mockClear();
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }));

const ENTRY: HistoryEntryView = {
  id: '11111111-1111-4111-8111-111111111111',
  preview: 'Bearer eyJhbGciOiJIUzI1NiJ9.….…',
  inputKind: 'jwt',
  chain: [
    { kind: 'jwt', transformId: 'jwt.decode' },
    { kind: 'json', transformId: null },
  ],
  direction: 'decode',
  createdAt: new Date().toISOString(),
};

const COMPOSE_ENTRY: HistoryEntryView = {
  id: '33333333-3333-4333-8333-333333333333',
  preview: 'compuesto · 2 pasos',
  inputKind: 'json',
  chain: [
    { kind: 'json', transformId: 'json.minify' },
    { kind: 'jwt', transformId: 'jwt.sign' },
  ],
  direction: 'compose',
  createdAt: new Date().toISOString(),
};

describe('HistoryPanel — vacío ≠ error', () => {
  it('sin entradas y SIN fallo dice que el historial está vacío', () => {
    render(<HistoryPanel initialEntries={[]} />);

    expect(screen.getByText(/tu historial está vacío/i)).toBeInTheDocument();
    // Y NO insinúa ningún problema técnico.
    expect(screen.queryByText(/no hemos podido cargar/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /reintentar/i })).toBeNull();
  });

  it('🔴 con fallo de carga NO dice que esté vacío: informa del error y ofrece reintentar', () => {
    render(<HistoryPanel initialEntries={[]} loadFailed />);

    expect(screen.getByText(/no hemos podido cargar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    // EL ASSERT QUE MUERDE: jamás debe afirmar que el historial está vacío tras un fallo,
    // ni sugerir que las entradas ya no existen.
    expect(screen.queryByText(/tu historial está vacío/i)).toBeNull();
    // Al contrario: tranquiliza sobre que las entradas siguen ahí.
    expect(screen.getByText(/siguen guardadas/i)).toBeInTheDocument();
  });

  it('🔴 el reintento se puede pulsar MÁS DE UNA VEZ si vuelve a fallar', async () => {
    // `router.refresh()` re-ejecuta el server component pero CONSERVA el estado de cliente:
    // con un flag manual (`setRetrying(true)`) nadie lo devolvería a false, así que tras un
    // reintento fallido el botón quedaría deshabilitado PARA SIEMPRE y el usuario tendría
    // que recargar a mano. Se usa `useTransition`, cuyo `isPending` se resuelve solo.
    const user = userEvent.setup();
    render(<HistoryPanel initialEntries={[]} loadFailed />);

    const button = screen.getByRole('button', { name: /reintentar/i });
    await user.click(button);
    expect(refresh).toHaveBeenCalledTimes(1);

    // La carga vuelve a fallar (el componente sigue montado con loadFailed): el botón debe
    // volver a estar operable, no clavado en «Reintentando…».
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^reintentar$/i })).toBeEnabled();
    });

    // Y un segundo intento llega de verdad al router.
    await user.click(screen.getByRole('button', { name: /^reintentar$/i }));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('con fallo de carga NO ofrece «Borrar todo» (no se conoce el estado real)', () => {
    render(<HistoryPanel initialEntries={[]} loadFailed />);
    // Una acción destructiva masiva sobre un estado desconocido sería temeraria.
    expect(screen.queryByRole('button', { name: /borrar todo/i })).toBeNull();
  });

  it('con entradas las lista y ofrece «Borrar todo»', () => {
    render(<HistoryPanel initialEntries={[ENTRY]} />);

    expect(screen.getByText(ENTRY.preview)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /borrar todo/i })).toBeInTheDocument();
    expect(screen.queryByText(/tu historial está vacío/i)).toBeNull();
    expect(screen.queryByText(/no hemos podido cargar/i)).toBeNull();
  });

  it('D7: el aviso de que reabrir no restaura el dato NO está en un diálogo hasta pulsarlo', () => {
    render(<HistoryPanel initialEntries={[ENTRY]} />);
    // La nota al pie (contexto, siempre visible) sí está…
    expect(
      screen.getByText(/reabrir restaura la cadena, no el dato original/i),
    ).toBeInTheDocument();
    // …pero el diálogo de reabrir es CLICK-GATED: no existe hasta que se pulsa.
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('HistoryPanel — reabrir una RECETA de composición (T6.10)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('la fila compuesta muestra el marcador «codificar» que la distingue de un análisis', () => {
    render(<HistoryPanel initialEntries={[COMPOSE_ENTRY]} />);
    expect(screen.getByText('compuesto · 2 pasos')).toBeInTheDocument();
    // El marcador de dirección (no aparece en una fila de decodificar).
    expect(screen.getByText(/codificar/i)).toBeInTheDocument();
  });

  it('🔴 reabrir una receta restaura los PASOS en /compose, con el aviso de que el dato NO vuelve', async () => {
    const user = userEvent.setup();
    render(<HistoryPanel initialEntries={[COMPOSE_ENTRY]} />);

    await user.click(screen.getByRole('button', { name: /reabrir/i }));

    const dialog = screen.getByRole('dialog');
    // El aviso, un grado más fuerte que D7: el dato no se restaura porque NUNCA se guardó.
    expect(dialog).toHaveTextContent(/no se restaura porque nunca se guardó/i);
    expect(dialog).toHaveTextContent(/vac[ií]o/i);
    // Los pasos de la receta se enseñan.
    expect(dialog).toHaveTextContent('json.minify');
    expect(dialog).toHaveTextContent('jwt.sign');

    await user.click(screen.getByRole('button', { name: /reabrir en componer/i }));

    // NAVEGA a /compose (sin recargar).
    expect(push).toHaveBeenCalledWith('/compose');

    // Y dejó el borrador de componer listo: los PASOS restaurados y el campo VACÍO. El flag de
    // cambio de modo está puesto (por eso `takeSwitchedDraft` lo devuelve). NUNCA hay `options`
    // en el borrador (el secreto no está en la BD ni tiene por dónde volver): allowlist estricta.
    const draft = parseComposeDraft(takeSwitchedDraft('compose'));
    expect(draft).toEqual({ source: '', transforms: ['json.minify', 'jwt.sign'] });
  });
});

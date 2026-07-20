'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HistoryDeleteResultSchema, type HistoryEntryView } from '@app/core/history';
import { api } from '@/lib/api-client';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Callout } from '@/components/ui/callout';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ChainSummary } from '@/components/chain/chain-summary';
import { HistoryRow } from '@/components/history/history-row';
import { chainKinds, toHistoryRowProps } from './history-entry-view';

// Hoja interactiva de `/history` (T2.2), construida desde docs/mockups/history.html.
//
// DATOS: la LECTURA la hace la página (Server Component) contra `GET /api/history` con la
// cookie reenviada; este componente la recibe ya resuelta por props. Las MUTACIONES
// (borrar) van por `api-client` contra la misma API REST — nunca se toca `@app/db` desde
// un componente. Tras borrar se llama a `router.refresh()`: la lista se vuelve a leer del
// SERVIDOR en vez de mutarse en cliente, porque la verdad de lo que queda la tiene la BD.
// (Este patrón, además de ser el idiomático de App Router, evita cargar los datos en un
// `useEffect` — que dispararía renders en cascada y un spinner innecesario.)
//
// Es el SERVIDOR quien decide de quién es este historial: el cliente no envía —ni puede
// enviar— ningún id de usuario. Ver el comentario de `app/api/history/route.ts`.
//
// 🔴 D7 — «reabrir restaura la CADENA, no el DATO», y la UI LO DICE:
// el input crudo no existe en la BD (solo `preview` redactado y `chain` de kinds), así que
// reabrir NO PUEDE devolver el valor original. En vez de dejar que el usuario lo deduzca,
// el diálogo de reabrir lo declara explícitamente. El aviso vive DENTRO del diálogo (no
// solo en la nota al pie del mockup) a propósito: así es una afirmación que el usuario ve
// justo cuando reabre, y un test puede exigir que aparezca AL REABRIR y no antes — si el
// aviso solo estuviera en la nota siempre visible, el e2e pasaría SIN haber pulsado nunca
// «Reabrir» y no protegería nada.

/** Qué diálogo está abierto. `null` = ninguno (los diálogos son CLICK-GATED: no existen
 *  en el DOM hasta que se pulsa su acción). */
type DialogState =
  | { type: 'reopen'; entry: HistoryEntryView }
  | { type: 'delete-one'; entry: HistoryEntryView }
  | { type: 'delete-all' }
  | null;

interface HistoryPanelProps {
  /** Entradas del usuario de la sesión, ya leídas por la página desde `GET /api/history`. */
  initialEntries: HistoryEntryView[];
  /**
   * `true` si la lectura FALLÓ (no si el historial está legítimamente vacío). Son estados
   * distintos y no se pueden colapsar: mostrar «tu historial está vacío» tras un 500 haría
   * que la UI afirmara algo falso — que las entradas ya no existen.
   */
  loadFailed?: boolean;
}

export function HistoryPanel({ initialEntries, loadFailed = false }: HistoryPanelProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [error, setError] = useState<string | null>(null);
  // `useTransition` y NO un flag manual: `router.refresh()` re-ejecuta el server component
  // pero CONSERVA el estado de cliente, así que un `setRetrying(true)` no tendría quién lo
  // devolviera a false — si el reintento vuelve a fallar, el botón se quedaría deshabilitado
  // PARA SIEMPRE y el usuario no podría reintentar una segunda vez sin recargar a mano.
  // `isPending` se resuelve solo cuando el refresh termina, falle o no.
  const [isRetrying, startRetry] = useTransition();

  const runDelete = (path: string, failure: string): void => {
    void (async () => {
      try {
        await api.del(path, HistoryDeleteResultSchema);
        setError(null);
        // Re-lee del servidor: la BD es la verdad de lo que queda.
        router.refresh();
      } catch {
        setError(failure);
      }
    })();
  };

  // Reintento del ESTADO DE ERROR: `router.refresh()` vuelve a ejecutar el server component
  // de la página, que reintenta el `GET /api/history`. Si esta vez va bien, `loadFailed`
  // llega como false y la lista aparece.
  const retry = (): void => {
    startRetry(() => {
      router.refresh();
    });
  };

  // `now` se congela por render: formatear contra un reloj vivo provocaría re-renders sin
  // sentido y un desajuste servidor/cliente.
  const now = new Date();

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2.5 text-2xs font-semibold tracking-wide text-text-subtle uppercase">
            tu cuenta
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
          <p className="mt-1.5 text-sm text-text-muted">
            {/* 🔴 T2.4 — este texto DESCRIBE lo que el sistema hace, sin promesas absolutas
                que no pueda sostener. NO decir «nunca guardamos secretos en claro»: sería
                MENTIR (un `hash` de 64 hex, un `uuid`, un timestamp o un texto plano se
                guardan enteros, y un secreto usado como CLAVE de JSON sobrevive). Lo que sí
                es literalmente cierto es qué se redacta: JWT, JSON y base64. Si mañana
                cambia la regla de `redact.ts`, esta frase cambia con ella.
                T4.1 añade el barrido de JWT en cualquier posición del texto. OJO: NO es un
                absoluto y la frase no debe escribirlo como tal — `code-review` tumbó una
                primera redacción que prometía «de un JWT nunca sobrevive el payload, sea
                cual sea el kind», falsada por tres fugas reales. El barrido reconoce un JWT
                porque ALGÚN segmento decodifica a un JSON con `alg`; lo que no cumple eso
                (un token opaco, algo con forma de JWT que no lo es) se guarda entero. Es una
                red ancha, y así hay que contarlo. */}
            Tus últimas 50 entradas. De un JWT guardamos solo la cabecera —también cuando viaja
            dentro de un texto más largo: una petición HTTP pegada entera, una cookie, un parámetro
            de URL—; de un JSON, las claves sin sus valores; de un base64, solo su longitud; de una
            URL, el dominio. El resto (texto, hashes, UUIDs y timestamps) se guarda tal cual.
            Reconocemos un JWT porque su cabecera descodifica a un JSON con «alg»: lo que no cumpla
            eso —un token opaco, algo con forma de JWT que no lo es— se guarda entero.
          </p>
        </div>
        {initialEntries.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            icon="trash"
            onClick={() => {
              setDialog({ type: 'delete-all' });
            }}
          >
            Borrar todo
          </Button>
        ) : null}
      </div>

      {error ? (
        <Callout tone="danger" title="Algo ha ido mal" className="mb-4">
          {error}
        </Callout>
      ) : null}

      <Card padding="sm" className="overflow-hidden p-0">
        {loadFailed ? (
          // 🔵 NO es el EmptyState: aquí NO sabemos que el historial esté vacío, solo que
          // no se pudo leer. La UI dice exactamente eso y ofrece reintentar, en vez de
          // afirmar que no hay entradas (que sería mentir sobre los datos del usuario).
          <EmptyState
            icon="alert-triangle"
            title="No hemos podido cargar tu historial"
            description="Ha fallado la conexión con el servidor. Tus entradas siguen guardadas: vuelve a intentarlo."
            action={
              <Button size="sm" onClick={retry} disabled={isRetrying}>
                {isRetrying ? 'Reintentando…' : 'Reintentar'}
              </Button>
            }
          />
        ) : initialEntries.length === 0 ? (
          <EmptyState
            icon="clock"
            title="Tu historial está vacío"
            description="Cuando analices algo con la sesión iniciada, aparecerá aquí con una vista previa redactada."
            action={
              // Link-as-button (el patrón sancionado del DS): un `<Button>` DENTRO de un
              // `<Link>` anida elementos interactivos (`<a><button>`), que es un fallo de
              // a11y — lo prohíben por escrito los comentarios de `button.tsx` e
              // `icon-button.tsx`. Esto navega, así que el elemento debe ser el ancla.
              <Link href="/" className={buttonVariants({ size: 'sm' })}>
                Ir al campo
              </Link>
            }
          />
        ) : (
          initialEntries.map((entry) => (
            <HistoryRow
              key={entry.id}
              {...toHistoryRowProps(entry, now)}
              onReopen={() => {
                setDialog({ type: 'reopen', entry });
              }}
              onDelete={() => {
                setDialog({ type: 'delete-one', entry });
              }}
            />
          ))
        )}
      </Card>

      {/* Nota al pie del mockup: la promesa de D7, siempre visible. NO sustituye al aviso
          dentro del diálogo de reabrir — esta es contexto; aquella es la declaración en el
          momento exacto en que el usuario reabre. */}
      <p className="mt-3.5 inline-flex items-center gap-1.5 text-xs text-text-subtle">
        <Icon name="reopen" size={13} />
        Reabrir restaura la cadena, no el dato original: vuelve a pegarlo para copiar valores.
      </p>

      {/* 🔴 D7 — diálogo de REABRIR (click-gated). */}
      {dialog?.type === 'reopen' ? (
        <Dialog
          open
          onOpenChange={() => {
            setDialog(null);
          }}
          onConfirm={() => {
            setDialog(null);
          }}
          title="Cadena reabierta"
          description="Se ha restaurado la cadena de transformaciones, no el dato original: devtools no guarda lo que pegaste, así que el valor no se restaura. Vuelve a pegarlo en el campo para ver los valores."
          confirmLabel="Entendido"
          cancelLabel="Cerrar"
        >
          <div className="flex flex-col gap-3">
            <ChainSummary kinds={chainKinds(dialog.entry)} size="md" />
            <ol className="flex flex-col gap-1.5">
              {dialog.entry.chain.map((step, i) => (
                // Índice como clave: la cadena es un orden posicional sin id natural y no
                // se reordena (mismo criterio que ChainSummary).
                <li key={i} className="flex items-center gap-2 text-sm text-text-muted">
                  <span className="font-mono text-xs text-text-subtle">{i + 1}.</span>
                  <span className="font-mono text-text">{step.kind}</span>
                  {step.transformId ? (
                    <>
                      <Icon name="chevron-right" size={13} className="text-text-subtle" />
                      <span className="font-mono text-xs">{step.transformId}</span>
                    </>
                  ) : (
                    <span className="text-xs text-text-subtle">terminal</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </Dialog>
      ) : null}

      {dialog?.type === 'delete-one' ? (
        <Dialog
          open
          onOpenChange={() => {
            setDialog(null);
          }}
          onConfirm={() => {
            runDelete(`/api/history?id=${dialog.entry.id}`, 'No se pudo borrar la entrada.');
          }}
          title="¿Borrar esta entrada?"
          description="Se eliminará de tu historial. Esta acción no se puede deshacer."
          confirmLabel="Borrar"
          cancelLabel="Cancelar"
          confirmTone="danger"
        />
      ) : null}

      {dialog?.type === 'delete-all' ? (
        <Dialog
          open
          onOpenChange={() => {
            setDialog(null);
          }}
          onConfirm={() => {
            runDelete('/api/history', 'No se pudo borrar el historial.');
          }}
          title="¿Borrar todo el historial?"
          description="Se eliminarán todas tus entradas. Esta acción no se puede deshacer."
          confirmLabel="Borrar todo"
          cancelLabel="Cancelar"
          confirmTone="danger"
        />
      ) : null}
    </>
  );
}

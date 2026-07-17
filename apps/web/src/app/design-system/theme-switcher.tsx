'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

// Switcher de TEMA (y solo tema) del showcase. Escribe `data-theme` en <html>:
// claro = SIN atributo (variante A del DS, lo que ya pinta `:root`), oscuro =
// `data-theme="dark"`. Nunca media query. Se tematiza el `<html>` (no un wrapper
// local) a propósito: así el showcase se pinta a pantalla completa —fondo, márgenes
// y specimens— sin dejar franjas del `<body>` en claro alrededor de la columna.
//
// Anti-FUGA (importante): en el App Router, salir de /design-system es una
// transición de cliente (el documento NO se recarga). Sin limpieza, `data-theme`
// quedaría pegado en `<html>` y re-tematizaría el resto de la app (F1/F2 leen los
// mismos tokens globales). Por eso el efecto DEVUELVE una limpieza que quita el
// atributo al desmontar el switcher: al abandonar la página el `<html>` vuelve al
// claro por defecto. Cubierto por el test de desmontaje de theme-switcher.test.tsx.
//
// SUPUESTO (importante para F1): esta limpieza asume propiedad EXCLUSIVA de
// `data-theme` en `<html>` — nadie más lo gobierna hoy, así que borrarlo (no
// restaurarlo) es correcto. Cuando F1 introduzca theming de app a nivel global (que
// leería estos mismos tokens en `<html>`, la intención del volcado), este cleanup
// incondicional ARRANCARÍA el tema global al salir de /design-system. Ese provider
// deberá reconciliar: guardar el valor previo de `data-theme` al montar y
// RESTAURARLO al desmontar, en vez de borrar a ciegas. No se construye aquí (es F1).
//
// Patrón anti-flash: el estado inicial es 'light', que es EXACTAMENTE lo que el
// SSR renderiza (layout.tsx no pone `data-theme`). No hay persistencia ni lectura
// del DOM en el primer render, así que no hay tema almacenado que reconciliar y por
// tanto no hay flash ni hydration mismatch en la carga.
//
// SIN MEMORIA a propósito: la elección de tema es efímera (vive en estado de React,
// no en localStorage). Recargar o volver a entrar en la página reinicia a claro —
// coherente con la limpieza anti-fuga: al salir el atributo se va y al reentrar el
// estado nace en claro. Un showcase no necesita recordar tu tema entre visitas, y
// añadir persistencia reintroduciría el riesgo de flash (leer dark almacenado tras
// pintar el SSR en claro). Si algún día un tema con memoria fuera un requisito de
// producto, se resolvería con un script bloqueante en <head>, no aquí.
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    // Limpieza: al desmontar (navegar fuera) el tema del showcase no se fuga al
    // resto de la app. También corre entre cambios de `theme`, y el efecto lo
    // vuelve a fijar acto seguido en el mismo commit (sin parpadeo).
    return () => {
      root.removeAttribute('data-theme');
    };
  }, [theme]);

  return (
    <div
      role="group"
      aria-label="Tema del design system"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1 shadow-xs"
    >
      {(['light', 'dark'] as const).map((value) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              setTheme(value);
            }}
            className={[
              'rounded-base px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              active
                ? 'bg-accent text-accent-fg'
                : 'text-text-muted hover:bg-surface-2 hover:text-text',
            ].join(' ')}
          >
            {value === 'light' ? 'Claro' : 'Oscuro'}
          </button>
        );
      })}
    </div>
  );
}

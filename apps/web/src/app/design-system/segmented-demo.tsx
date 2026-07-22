'use client';

import { useState } from 'react';
import { Segmented } from '@/components/ui/segmented';

// Demo interactiva del Segmented (T6.3) para el showcase /design-system. Cliente porque
// el control es CONTROLADO (value + onChange) y el estado vive en quien lo consume.
// Reproduce los dos specimens del card del DS
// (docs/design-system/components/forms/Segmented.card.html):
//   1. el conmutador de dirección `decodificar ⇄ codificar` (md, con iconos)
//   2. un selector de transformación (sm + mono, options como strings)
// y añade el eco del valor activo para que la verificación por teclado sea observable.

export function SegmentedDemo() {
  const [mode, setMode] = useState('decodificar');
  const [transform, setTransform] = useState('jwt.decode');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-text-muted">Dirección (md, con iconos) — el conmutador de F6</p>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            aria-label="Dirección"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'decodificar', label: 'decodificar', icon: 'search' },
              { value: 'codificar', label: 'codificar', icon: 'git-branch' },
            ]}
          />
          <span className="font-mono text-2xs text-text-subtle">valor: {mode}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-text-muted">Transformación (sm + mono, options string)</p>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            aria-label="Transformación"
            size="sm"
            mono
            value={transform}
            onChange={setTransform}
            options={['jwt.decode', 'base64.decode', 'url.decode']}
          />
          <span className="font-mono text-2xs text-text-subtle">valor: {transform}</span>
        </div>
      </div>
    </div>
  );
}

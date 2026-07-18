'use client';

import { useState } from 'react';
import { ChainSummary } from '@/components/chain/chain-summary';
import { StepCard } from '@/components/chain/step-card';
import { HistoryRow } from '@/components/history/history-row';

// Demos interactivas de los composites de producto (TD.5) para el showcase /design-system.
// Cliente ('use client') porque StepCard/HistoryRow cablean handlers de DOM: el server
// component de la página no puede pasarles funciones, así que — igual que ThemeSwitcher —
// la interactividad vive en esta hoja cliente y la página la compone como hijo.
//
// D7: los previews de historial son valores REDACTADOS/truncados de ejemplo del propio DS
// (history.card.html), nunca secretos crudos.

const noop = () => undefined;

export function ChainSummaryDemo() {
  return (
    <div className="flex flex-col gap-3">
      <ChainSummary kinds={['jwt', 'json']} size="md" />
      <ChainSummary kinds={['base64', 'json']} />
      <ChainSummary kinds={['url', 'json', 'text']} />
    </div>
  );
}

export function StepCardDemo() {
  // Controlado: el picker de desvío (O4) reescribe el transform aplicado en vivo.
  const [applied, setApplied] = useState('jwt.decode');
  return (
    <div className="flex flex-col gap-3">
      <StepCard
        index={0}
        kind="jwt"
        confidence={0.95}
        applied={applied}
        alternatives={['text']}
        transforms={['jwt.decode', 'base64.decode']}
        output={'{ "alg": "HS256", "sub": "1", "exp": 1752624000 }'}
        notes={['exp: 2026-07-16T00:00:00Z (caducó hace 4 horas)']}
        onSelectTransform={setApplied}
      />
      <StepCard
        index={1}
        kind="json"
        confidence={0.99}
        applied="json.format"
        output={'{\n  "alg": "HS256",\n  "sub": "1"\n}'}
        terminal="no_transform"
      />
    </div>
  );
}

export function HistoryRowDemo() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <HistoryRow
        preview="Bearer eyJhbGci…"
        kind="jwt"
        chain={['jwt', 'json']}
        time="hace 3 h"
        onReopen={noop}
        onDelete={noop}
      />
      <HistoryRow
        preview="ZXlKaGJHY2lPaU…"
        kind="base64"
        chain={['base64', 'json']}
        time="ayer"
        onReopen={noop}
        onDelete={noop}
      />
      <HistoryRow
        preview="1752624000"
        kind="unix_timestamp"
        chain={['unix_timestamp']}
        time="hace 2 d"
        onReopen={noop}
        onDelete={noop}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

// Demo interactiva del Dialog (TD.4) para el showcase /design-system. Cliente porque el
// Dialog es controlado (open + onOpenChange) y necesita un trigger con estado. Muestra las
// dos confirmaciones que consumirá /history: borrar una entrada (danger) y borrar todo.

export function DialogDemo() {
  const [openOne, setOpenOne] = useState(false);
  const [openAll, setOpenAll] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="danger"
          icon="trash"
          onClick={() => {
            setOpenOne(true);
          }}
        >
          Borrar entrada
        </Button>
        <Button
          variant="secondary"
          icon="trash"
          onClick={() => {
            setOpenAll(true);
          }}
        >
          Borrar todo
        </Button>
      </div>
      {lastAction ? (
        <p className="font-mono text-2xs text-text-subtle">Última acción: {lastAction}</p>
      ) : null}

      <Dialog
        open={openOne}
        onOpenChange={setOpenOne}
        title="¿Borrar esta entrada?"
        description="Se elimina de tu historial. Esto no se puede deshacer."
        confirmLabel="Borrar"
        confirmTone="danger"
        onConfirm={() => {
          setLastAction('borró una entrada');
        }}
      />
      <Dialog
        open={openAll}
        onOpenChange={setOpenAll}
        title="¿Borrar todo el historial?"
        description="Se eliminan todas tus entradas. Esto no se puede deshacer."
        confirmLabel="Borrar todo"
        confirmTone="danger"
        onConfirm={() => {
          setLastAction('vació el historial');
        }}
      />
    </div>
  );
}

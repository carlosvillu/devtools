// Mapea el envelope de error de la API a `setError` de react-hook-form
// (frontend/forms.md §3). Lo usan TODOS los formularios — un solo patrón. Primer
// consumidor: los formularios de auth (T0.4).
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { z } from 'zod';
import type { ApiError } from '@/lib/api-client';

// Shape de `details` para validation_error: lo que produce `z.flattenError` en el handler.
const ValidationDetailsSchema = z.object({
  formErrors: z.array(z.string()).default([]),
  fieldErrors: z.record(z.string(), z.array(z.string())).default({}),
});

export function applyEnvelopeToForm<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
): void {
  if (error.code === 'validation_error') {
    const parsed = ValidationDetailsSchema.safeParse(error.details);
    if (parsed.success) {
      for (const [field, messages] of Object.entries(parsed.data.fieldErrors)) {
        setError(field as Path<T>, { type: 'server', message: messages[0] ?? error.message });
      }
      if (parsed.data.formErrors.length > 0) {
        setError('root.server', {
          type: 'server',
          message: parsed.data.formErrors.join(' — '),
        });
      }
      return;
    }
  }
  setError('root.server', { type: error.code, message: error.message });
}

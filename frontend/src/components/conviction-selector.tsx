'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ConvictionLevel } from '@/types/company';
import type { TaxonomyOption } from '@/types/note';

interface ConvictionSelectorProps {
  companyId: string;
  value: ConvictionLevel;
  options: TaxonomyOption[];
}

export function ConvictionSelector({
  companyId,
  value,
  options,
}: ConvictionSelectorProps) {
  const router = useRouter();
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(nextValue: ConvictionLevel) {
    if (nextValue === currentValue || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ convictionLevel: nextValue }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? 'Could not update conviction');
      }

      setCurrentValue(nextValue);
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Could not update conviction',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="conviction-level" className="text-muted text-sm">
        Conviction
      </label>
      <select
        id="conviction-level"
        value={currentValue}
        disabled={isSaving}
        onChange={(event) => handleChange(event.target.value as ConvictionLevel)}
        className="w-full max-w-xs rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 disabled:opacity-60 dark:border-white/15 dark:focus:border-white/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

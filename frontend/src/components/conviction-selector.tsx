'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { clientFetch, getErrorMessage } from '@/lib/api/client-fetch';
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

  const updateMutation = useMutation({
    mutationFn: (nextValue: ConvictionLevel) =>
      clientFetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ convictionLevel: nextValue }),
      }),
    onMutate: async (nextValue) => {
      const previous = currentValue;
      setCurrentValue(nextValue);
      return { previous };
    },
    onError: (_error, _nextValue, onMutateResult) => {
      if (onMutateResult?.previous !== undefined) {
        setCurrentValue(onMutateResult.previous);
      }
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  function handleChange(nextValue: ConvictionLevel) {
    if (nextValue === currentValue || updateMutation.isPending) {
      return;
    }
    updateMutation.mutate(nextValue);
  }

  const error = updateMutation.isError
    ? getErrorMessage(updateMutation.error, 'Could not update conviction')
    : null;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="conviction-level" className="text-muted text-sm">
        Conviction
      </label>
      <select
        id="conviction-level"
        value={currentValue}
        disabled={updateMutation.isPending}
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

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

export function isPrismaKnownError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

/**
 * Maps common Prisma codes to Nest HTTP exceptions; rethrows anything else.
 * - P2025 → 404 Not Found
 * - P2002 → 409 Conflict (when `conflictMessage` is provided)
 */
export function rethrowMappedPrismaError(
  error: unknown,
  options: { notFoundMessage: string; conflictMessage?: string },
): never {
  if (isPrismaKnownError(error, 'P2025')) {
    throw new NotFoundException(options.notFoundMessage);
  }

  if (
    options.conflictMessage !== undefined &&
    isPrismaKnownError(error, 'P2002')
  ) {
    throw new ConflictException(options.conflictMessage);
  }

  throw error;
}

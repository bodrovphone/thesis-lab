import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { isPrismaKnownError, rethrowMappedPrismaError } from './prisma-errors';

function knownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('prisma error', {
    code,
    clientVersion: '7.9.0',
  });
}

describe('prisma-errors', () => {
  it('detects Prisma known request errors by code', () => {
    expect(isPrismaKnownError(knownError('P2025'), 'P2025')).toBe(true);
    expect(isPrismaKnownError(knownError('P2002'), 'P2025')).toBe(false);
    expect(isPrismaKnownError(new Error('nope'), 'P2025')).toBe(false);
  });

  it('maps P2025 to NotFoundException', () => {
    expect(() =>
      rethrowMappedPrismaError(knownError('P2025'), {
        notFoundMessage: 'Company not found',
      }),
    ).toThrow(NotFoundException);
  });

  it('maps P2002 to ConflictException when a conflict message is provided', () => {
    expect(() =>
      rethrowMappedPrismaError(knownError('P2002'), {
        notFoundMessage: 'Company not found',
        conflictMessage: 'Company is already tracked',
      }),
    ).toThrow(ConflictException);
  });

  it('rethrows unexpected errors unchanged', () => {
    const unexpected = new Error('connection blew up');
    expect(() =>
      rethrowMappedPrismaError(unexpected, {
        notFoundMessage: 'Company not found',
      }),
    ).toThrow(unexpected);
  });
});

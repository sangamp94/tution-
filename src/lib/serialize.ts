import type { Transaction, StudentProfile } from '@prisma/client';

// Prisma's Decimal type doesn't JSON-serialize consistently across clients.
// Convert it to a plain number explicitly before sending any response.

export function serializeTransaction(t: Transaction) {
  return {
    ...t,
    amount: Number(t.amount),
  };
}

export function serializeStudentProfile(sp: StudentProfile) {
  return {
    ...sp,
    monthly_fee: Number(sp.monthly_fee),
  };
}

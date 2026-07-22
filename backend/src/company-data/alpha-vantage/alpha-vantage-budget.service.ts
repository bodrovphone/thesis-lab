import { Injectable } from '@nestjs/common';

export const ALPHA_VANTAGE_DAILY_BUDGET = 20;

export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class AlphaVantageBudgetService {
  private dayKey = utcDayKey(new Date());
  private used = 0;

  getSnapshot(now: Date): { dayKey: string; used: number; remaining: number } {
    this.resetIfNewDay(now);
    return {
      dayKey: this.dayKey,
      used: this.used,
      remaining: Math.max(0, ALPHA_VANTAGE_DAILY_BUDGET - this.used),
    };
  }

  hasBudget(now: Date): boolean {
    return this.getSnapshot(now).remaining > 0;
  }

  consume(now: Date): boolean {
    this.resetIfNewDay(now);
    if (this.used >= ALPHA_VANTAGE_DAILY_BUDGET) {
      return false;
    }
    this.used += 1;
    return true;
  }

  private resetIfNewDay(now: Date): void {
    const nextDayKey = utcDayKey(now);
    if (nextDayKey !== this.dayKey) {
      this.dayKey = nextDayKey;
      this.used = 0;
    }
  }
}

import {
  ALPHA_VANTAGE_DAILY_BUDGET,
  AlphaVantageBudgetService,
  utcDayKey,
} from './alpha-vantage-budget.service';

describe('AlphaVantageBudgetService', () => {
  it('resets the counter on a new UTC day', () => {
    const budget = new AlphaVantageBudgetService();
    const dayOne = new Date('2026-07-23T12:00:00.000Z');
    const dayTwo = new Date('2026-07-24T00:00:01.000Z');

    expect(budget.consume(dayOne)).toBe(true);
    expect(budget.getSnapshot(dayOne)).toMatchObject({
      dayKey: utcDayKey(dayOne),
      used: 1,
      remaining: ALPHA_VANTAGE_DAILY_BUDGET - 1,
    });

    expect(budget.getSnapshot(dayTwo)).toMatchObject({
      dayKey: utcDayKey(dayTwo),
      used: 0,
      remaining: ALPHA_VANTAGE_DAILY_BUDGET,
    });
  });

  it('blocks consumption once the daily cap is reached', () => {
    const budget = new AlphaVantageBudgetService();
    const now = new Date('2026-07-23T12:00:00.000Z');

    for (let index = 0; index < ALPHA_VANTAGE_DAILY_BUDGET; index += 1) {
      expect(budget.consume(now)).toBe(true);
    }

    expect(budget.hasBudget(now)).toBe(false);
    expect(budget.consume(now)).toBe(false);
    expect(budget.getSnapshot(now)).toMatchObject({
      used: ALPHA_VANTAGE_DAILY_BUDGET,
      remaining: 0,
    });
  });
});

import { NotFoundException } from '@nestjs/common';
import { CompaniesController } from './companies.controller';

function makeService() {
  return {
    searchExternal: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateConviction: jest.fn(),
    updateSummary: jest.fn(),
    refreshEnrichment: jest.fn(),
  };
}

describe('CompaniesController', () => {
  it('wraps external search results in an items envelope', async () => {
    const service = makeService();
    service.searchExternal.mockResolvedValue([{ ticker: 'AAPL' }]);
    const controller = new CompaniesController(service as never);

    const result = await controller.searchExternal({
      q: 'apple',
      limit: 10,
    });

    expect(result).toEqual({ items: [{ ticker: 'AAPL' }] });
    expect(service.searchExternal).toHaveBeenCalledWith('apple', 10);
  });

  it('delegates company creation to the service', async () => {
    const service = makeService();
    service.create.mockResolvedValue({ id: 'c1' });
    const controller = new CompaniesController(service as never);

    const result = await controller.create({ ticker: 'aapl' });

    expect(result).toEqual({ id: 'c1' });
    expect(service.create).toHaveBeenCalledWith('aapl');
  });

  it('wraps the company list in an items envelope with totalTracked', async () => {
    const service = makeService();
    service.findAll.mockResolvedValue({
      items: [{ id: 'c1' }],
      totalTracked: 3,
    });
    const controller = new CompaniesController(service as never);

    await expect(controller.findAll({ limit: 100 })).resolves.toEqual({
      items: [{ id: 'c1' }],
      totalTracked: 3,
    });
    expect(service.findAll).toHaveBeenCalledWith({ limit: 100 });
  });

  it('delegates findOne to the service', async () => {
    const service = makeService();
    service.findOne.mockResolvedValue({ id: 'c1' });
    const controller = new CompaniesController(service as never);

    await expect(controller.findOne('c1')).resolves.toEqual({ id: 'c1' });
    expect(service.findOne).toHaveBeenCalledWith('c1');
  });

  it('propagates NotFoundException from the service', async () => {
    const service = makeService();
    service.findOne.mockRejectedValue(
      new NotFoundException('Company not found'),
    );
    const controller = new CompaniesController(service as never);

    await expect(controller.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('delegates conviction updates to the service', async () => {
    const service = makeService();
    service.updateConviction.mockResolvedValue({
      id: 'c1',
      convictionLevel: 'HIGH_CONVICTION',
    });
    const controller = new CompaniesController(service as never);

    await expect(
      controller.update('c1', { convictionLevel: 'HIGH_CONVICTION' }),
    ).resolves.toEqual({ id: 'c1', convictionLevel: 'HIGH_CONVICTION' });
    expect(service.updateConviction).toHaveBeenCalledWith(
      'c1',
      'HIGH_CONVICTION',
    );
  });

  it('delegates summary updates to the service', async () => {
    const service = makeService();
    service.updateSummary.mockResolvedValue({
      id: 'c1',
      currentThinkingSummary: 'Updated thesis',
    });
    const controller = new CompaniesController(service as never);

    await expect(
      controller.updateSummary('c1', {
        currentThinkingSummary: 'Updated thesis',
      }),
    ).resolves.toEqual({ id: 'c1', currentThinkingSummary: 'Updated thesis' });
    expect(service.updateSummary).toHaveBeenCalledWith('c1', 'Updated thesis');
  });
});

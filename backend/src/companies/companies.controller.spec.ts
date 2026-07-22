import { NotFoundException } from '@nestjs/common';
import { CompaniesController } from './companies.controller';

function makeService() {
  return {
    searchExternal: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateConviction: jest.fn(),
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

  it('wraps the company list in an items envelope', async () => {
    const service = makeService();
    service.findAll.mockResolvedValue([{ id: 'c1' }]);
    const controller = new CompaniesController(service as never);

    await expect(controller.findAll()).resolves.toEqual({
      items: [{ id: 'c1' }],
    });
  });

  it('throws NotFoundException when the company does not exist', async () => {
    const service = makeService();
    service.findOne.mockResolvedValue(null);
    const controller = new CompaniesController(service as never);

    await expect(controller.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the company view when found', async () => {
    const service = makeService();
    service.findOne.mockResolvedValue({ id: 'c1' });
    const controller = new CompaniesController(service as never);

    await expect(controller.findOne('c1')).resolves.toEqual({ id: 'c1' });
  });

  it('delegates conviction updates to the service', async () => {
    const service = makeService();
    service.updateConviction.mockResolvedValue({ id: 'c1', convictionLevel: 'HIGH_CONVICTION' });
    const controller = new CompaniesController(service as never);

    await expect(
      controller.update('c1', { convictionLevel: 'HIGH_CONVICTION' }),
    ).resolves.toEqual({ id: 'c1', convictionLevel: 'HIGH_CONVICTION' });
    expect(service.updateConviction).toHaveBeenCalledWith('c1', 'HIGH_CONVICTION');
  });
});

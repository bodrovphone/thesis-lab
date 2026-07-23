import { NotesController } from './notes.controller';

function makeService() {
  return {
    create: jest.fn(),
    findByCompany: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

describe('NotesController', () => {
  it('delegates note updates to the service', async () => {
    const service = makeService();
    service.update.mockResolvedValue({ id: 'n1' });
    const controller = new NotesController(service as never);

    await expect(controller.update('n1', { body: 'Updated' })).resolves.toEqual(
      { id: 'n1' },
    );
    expect(service.update).toHaveBeenCalledWith('n1', { body: 'Updated' });
  });

  it('delegates note deletion to the service', async () => {
    const service = makeService();
    service.remove.mockResolvedValue(undefined);
    const controller = new NotesController(service as never);

    await expect(controller.remove('n1')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('n1');
  });
});

import { SequenceService } from './sequence.service';

describe('SequenceService', () => {
  it('genera códigos consecutivos con seis dígitos', async () => {
    const prisma = { $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({ sequence: { upsert: jest.fn(), update: jest.fn().mockResolvedValue({ prefix: 'PRD', value: 7 }) } }) } as any;
    await expect(new SequenceService(prisma).next('PRODUCT', 'PRD')).resolves.toBe('PRD-000007');
  });
});

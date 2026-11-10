import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CharacterIdParamDto } from './character-id.param';
describe('CharacterIdParamDto', () => {
  const validateParam = async (plain: Record<string, unknown>) => {
    const dto = plainToInstance(CharacterIdParamDto, plain);
    return { dto, errors: await validate(dto) };
  };
  it('should accept a positive integer id', async () => {
    const { dto, errors } = await validateParam({ id: '1' });
    expect(errors).toHaveLength(0);
    expect(dto.id).toBe(1);
  });
  it('should reject id zero', async () => {
    const { errors } = await validateParam({ id: '0' });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('should reject negative id', async () => {
    const { errors } = await validateParam({ id: '-1' });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('should reject non-integer id', async () => {
    const { errors } = await validateParam({ id: '1.5' });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('should reject non-numeric id', async () => {
    const { errors } = await validateParam({ id: 'abc' });
    expect(errors.length).toBeGreaterThan(0);
  });
});

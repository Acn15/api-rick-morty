import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListCharactersQueryDto } from './list-characters-query.dto';
describe('ListCharactersQueryDto', () => {
  const validateQuery = async (plain: Record<string, unknown>) => {
    const dto = plainToInstance(ListCharactersQueryDto, plain);
    return { dto, errors: await validate(dto) };
  };
  it('should accept a positive integer page', async () => {
    const { errors } = await validateQuery({ page: '2' });
    expect(errors).toHaveLength(0);
  });
  it('should accept omitted page', async () => {
    const { errors } = await validateQuery({});
    expect(errors).toHaveLength(0);
  });
  it('should reject page zero', async () => {
    const { errors } = await validateQuery({ page: '0' });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('should reject negative page', async () => {
    const { errors } = await validateQuery({ page: '-1' });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('should reject non-integer page', async () => {
    const { errors } = await validateQuery({ page: '1.5' });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('should reject non-numeric page', async () => {
    const { errors } = await validateQuery({ page: 'abc' });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('should trim name and accept non-empty values', async () => {
    const { dto, errors } = await validateQuery({ name: '  Rick  ' });
    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Rick');
  });
  it('should treat blank name as omitted', async () => {
    const { dto, errors } = await validateQuery({ name: '   ' });
    expect(errors).toHaveLength(0);
    expect(dto.name).toBeUndefined();
  });
  it('should accept valid status values case-insensitively', async () => {
    const { dto, errors } = await validateQuery({ status: ' Alive ' });
    expect(errors).toHaveLength(0);
    expect(dto.status).toBe('alive');
  });
  it('should reject invalid status', async () => {
    const { errors } = await validateQuery({ status: 'zombie' });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('should trim species and type', async () => {
    const { dto, errors } = await validateQuery({
      species: '  Human  ',
      type: '  Parasite  ',
    });
    expect(errors).toHaveLength(0);
    expect(dto.species).toBe('Human');
    expect(dto.type).toBe('Parasite');
  });
  it('should accept valid gender values case-insensitively', async () => {
    const { dto, errors } = await validateQuery({ gender: ' Male ' });
    expect(errors).toHaveLength(0);
    expect(dto.gender).toBe('male');
  });
  it('should reject invalid gender', async () => {
    const { errors } = await validateQuery({ gender: 'other' });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('should accept combined filters', async () => {
    const { dto, errors } = await validateQuery({
      page: '1',
      name: 'rick',
      status: 'alive',
      species: 'human',
      type: 'parasitic',
      gender: 'male',
    });
    expect(errors).toHaveLength(0);
    expect(dto).toMatchObject({
      page: 1,
      name: 'rick',
      status: 'alive',
      species: 'human',
      type: 'parasitic',
      gender: 'male',
    });
  });
});

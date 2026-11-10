import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListEpisodesQueryDto } from './list-episodes-query.dto';
describe('ListEpisodesQueryDto', () => {
  const validateQuery = async (plain: Record<string, unknown>) => {
    const dto = plainToInstance(ListEpisodesQueryDto, plain);
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
  it('should trim search and accept non-empty values', async () => {
    const { dto, errors } = await validateQuery({ search: '  Pilot  ' });
    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('Pilot');
  });
  it('should treat blank search as omitted', async () => {
    const { dto, errors } = await validateQuery({ search: '   ' });
    expect(errors).toHaveLength(0);
    expect(dto.search).toBeUndefined();
  });
  it('should accept omitted search', async () => {
    const { errors } = await validateQuery({ page: '1' });
    expect(errors).toHaveLength(0);
  });
  it('should ignore invalid page when search is numeric', async () => {
    const { dto, errors } = await validateQuery({
      search: '1',
      page: 'abc',
    });
    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('1');
    expect(dto.page).toBeUndefined();
  });
  it('should ignore any page value when search is numeric', async () => {
    const { dto, errors } = await validateQuery({
      search: '28',
      page: '2',
    });
    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('28');
    expect(dto.page).toBeUndefined();
  });
  it('should still reject invalid page when search is a name', async () => {
    const { errors } = await validateQuery({
      search: 'Pilot',
      page: 'abc',
    });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('should still reject invalid page when search is omitted', async () => {
    const { errors } = await validateQuery({ page: 'abc' });
    expect(errors.length).toBeGreaterThan(0);
  });
});

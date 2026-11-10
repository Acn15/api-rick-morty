import {
  ArgumentsHost,
  BadGatewayException,
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  const originalNodeEnv = process.env.NODE_ENV;
  const createHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = { url: '/episodes/1/characters', method: 'GET' };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as ArgumentsHost;
    return { host, status, json };
  };
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });
  it('should return a generic message for unexpected errors in production', () => {
    process.env.NODE_ENV = 'production';
    const { host, status, json } = createHost();
    filter.catch(new Error('sensitive internal boom'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro interno do servidor.',
        error: 'Internal Server Error',
      }),
    );
    expect(json.mock.calls[0][0]).not.toHaveProperty('details');
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain(
      'sensitive internal boom',
    );
  });
  it('should expose development message for unexpected errors outside production', () => {
    process.env.NODE_ENV = 'development';
    const { host, status, json } = createHost();
    filter.catch(new Error('dev-only detail'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'dev-only detail',
        details: expect.any(Error),
      }),
    );
  });
  it('should preserve intentional NotFoundException messages', () => {
    process.env.NODE_ENV = 'production';
    const { host, status, json } = createHost();
    filter.catch(
      new NotFoundException('Episódio com ID 999 não encontrado'),
      host,
    );
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Episódio com ID 999 não encontrado',
      }),
    );
  });
  it('should preserve intentional BadGatewayException messages', () => {
    process.env.NODE_ENV = 'production';
    const { host, status, json } = createHost();
    filter.catch(
      new BadGatewayException('Falha ao consultar a API Rick and Morty'),
      host,
    );
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_GATEWAY,
        message: 'Falha ao consultar a API Rick and Morty',
      }),
    );
  });
  it('should preserve intentional validation BadRequestException messages', () => {
    process.env.NODE_ENV = 'production';
    const { host, status, json } = createHost();
    filter.catch(
      new BadRequestException(['page must be an integer number']),
      host,
    );
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['page must be an integer number'],
      }),
    );
  });
});

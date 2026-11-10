export interface JwtPayload {
  sub: string;
  email?: string;
  type?: 'refresh';
  iat?: number;
  exp?: number;
}

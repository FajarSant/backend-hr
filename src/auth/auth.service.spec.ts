import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { scryptSync } from 'node:crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest.fn().mockResolvedValue('token-abc'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('register menghasilkan token dan user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      fullName: 'Budi',
      email: 'budi@mail.com',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    const result = await service.register({
      fullName: 'Budi',
      email: 'budi@mail.com',
      password: 'rahasia123',
      faceEmbedding: [0.1, 0.2, 0.3],
    });

    expect(result.accessToken).toBe('token-abc');
    expect(result.user.email).toBe('budi@mail.com');
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('login gagal jika password salah', async () => {
    const salt = '0123456789abcdef0123456789abcdef';
    const hash = scryptSync('password-benar', salt, 64).toString('hex');

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Budi',
      email: 'budi@mail.com',
      passwordHash: `${salt}:${hash}`,
    });

    await expect(
      service.login({
        email: 'budi@mail.com',
        password: 'salah',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('verify face berhasil saat embedding dekat', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      faceEmbedding: [0.1, 0.2, 0.3],
    });

    const result = await service.verifyFace('user-1', [0.1, 0.2, 0.29]);

    expect(result.verified).toBe(true);
    expect(result.distance).toBeLessThan(result.threshold);
  });
});

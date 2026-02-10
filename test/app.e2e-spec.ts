import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  faceEmbedding: number[];
  createdAt: Date;
};

type RegisterResponse = {
  user: {
    email: string;
  };
  accessToken: string;
};

type LoginResponse = {
  accessToken: string;
};

type FaceVerifyResponse = {
  verified: boolean;
};

type MeResponse = {
  user: {
    email: string;
  };
};

describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;
  const users: UserRecord[] = [];

  const prismaMock = {
    user: {
      findUnique: jest.fn(
        ({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email) {
            return Promise.resolve(
              users.find((user) => user.email === where.email) ?? null,
            );
          }

          if (where.id) {
            return Promise.resolve(
              users.find((user) => user.id === where.id) ?? null,
            );
          }

          return Promise.resolve(null);
        },
      ),
      create: jest.fn(
        ({
          data,
          select,
        }: {
          data: Omit<UserRecord, 'id' | 'createdAt'>;
          select: Record<string, boolean>;
        }) => {
          const created: UserRecord = {
            id: `user-${users.length + 1}`,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            ...data,
          };
          users.push(created);

          return Promise.resolve(
            Object.fromEntries(
              Object.entries(select)
                .filter(([, value]) => value)
                .map(([key]) => [key, created[key as keyof UserRecord]]),
            ),
          );
        },
      ),
    },
  };

  beforeEach(async () => {
    users.length = 0;
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('register -> login -> face verify -> me', async () => {
    const registerRaw = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'Budi Santoso',
        email: 'budi@mail.com',
        password: 'rahasia123',
        faceEmbedding: [0.11, 0.22, 0.33],
      })
      .expect(201);

    const registerResponse = registerRaw.body as RegisterResponse;
    expect(registerResponse.user.email).toBe('budi@mail.com');
    expect(registerResponse.accessToken).toEqual(expect.any(String));

    const loginRaw = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'budi@mail.com',
        password: 'rahasia123',
      })
      .expect(201);

    const loginResponse = loginRaw.body as LoginResponse;
    expect(loginResponse.accessToken).toEqual(expect.any(String));

    const token = loginResponse.accessToken;

    const verifyRaw = await request(app.getHttpServer())
      .post('/auth/face-verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        faceEmbedding: [0.11, 0.21, 0.33],
      })
      .expect(201);

    const verifyResponse = verifyRaw.body as FaceVerifyResponse;
    expect(verifyResponse.verified).toBe(true);

    const meRaw = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const meResponse = meRaw.body as MeResponse;
    expect(meResponse.user.email).toBe('budi@mail.com');
  });
});

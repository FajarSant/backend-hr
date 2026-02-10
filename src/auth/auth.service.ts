import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  email: string;
};

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
  faceEmbedding: number[];
};

type LoginInput = {
  email: string;
  password: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput) {
    if (!input.faceEmbedding.length) {
      throw new BadRequestException('faceEmbedding wajib berisi data');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('Email sudah terdaftar');
    }

    const passwordHash = this.hashPassword(input.password);
    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        passwordHash,
        faceEmbedding: input.faceEmbedding,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
      },
    });

    return {
      user,
      accessToken: await this.signToken({ sub: user.id, email: user.email }),
    };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException('Email atau password salah');
    }

    return {
      accessToken: await this.signToken({ sub: user.id, email: user.email }),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    };
  }

  async verifyFace(userId: string, faceEmbedding: number[]) {
    if (!faceEmbedding.length) {
      throw new BadRequestException('faceEmbedding wajib berisi data');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        faceEmbedding: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const storedEmbedding = this.normalizeEmbedding(user.faceEmbedding);
    if (storedEmbedding.length !== faceEmbedding.length) {
      throw new BadRequestException(
        'Panjang faceEmbedding tidak sama dengan data wajah terdaftar',
      );
    }

    const distance = this.euclideanDistance(storedEmbedding, faceEmbedding);
    const threshold = 0.6;

    return {
      verified: distance <= threshold,
      distance,
      threshold,
    };
  }

  private async signToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, savedHash: string): boolean {
    const [salt, hash] = savedHash.split(':');
    const hashedBuffer = scryptSync(password, salt, 64);
    const knownBuffer = Buffer.from(hash, 'hex');

    return timingSafeEqual(hashedBuffer, knownBuffer);
  }

  private normalizeEmbedding(value: unknown): number[] {
    if (
      !Array.isArray(value) ||
      value.some((item) => typeof item !== 'number')
    ) {
      throw new BadRequestException('Data wajah yang tersimpan tidak valid');
    }

    return value.map((item) => item as number);
  }

  private euclideanDistance(vectorA: number[], vectorB: number[]): number {
    const sum = vectorA.reduce((acc, value, index) => {
      const diff = value - vectorB[index];
      return acc + diff * diff;
    }, 0);

    return Math.sqrt(sum);
  }
}

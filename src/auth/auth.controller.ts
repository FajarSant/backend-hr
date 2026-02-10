import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { AuthService } from './auth.service';

type RequestWithUser = Request & {
  user?: {
    sub: string;
    email: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body()
    body: {
      fullName?: string;
      email?: string;
      password?: string;
      faceEmbedding?: number[];
    },
  ) {
    this.assertRegisterBody(body);

    return this.authService.register({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      faceEmbedding: body.faceEmbedding,
    });
  }

  @Post('login')
  login(
    @Body()
    body: {
      email?: string;
      password?: string;
    },
  ) {
    if (!body.email || !body.password) {
      throw new BadRequestException('email dan password wajib diisi');
    }

    return this.authService.login(body as { email: string; password: string });
  }

  @UseGuards(JwtAuthGuard)
  @Post('face-verify')
  faceVerify(
    @Req() req: RequestWithUser,
    @Body()
    body: {
      faceEmbedding?: number[];
    },
  ) {
    if (!req.user?.sub) {
      throw new BadRequestException('payload user tidak valid');
    }

    if (!Array.isArray(body.faceEmbedding)) {
      throw new BadRequestException('faceEmbedding harus berupa array number');
    }

    return this.authService.verifyFace(req.user.sub, body.faceEmbedding);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: RequestWithUser) {
    return { user: req.user };
  }

  private assertRegisterBody(body: {
    fullName?: string;
    email?: string;
    password?: string;
    faceEmbedding?: number[];
  }): asserts body is {
    fullName: string;
    email: string;
    password: string;
    faceEmbedding: number[];
  } {
    if (!body.fullName || !body.email || !body.password) {
      throw new BadRequestException(
        'fullName, email, dan password wajib diisi',
      );
    }

    if (
      !Array.isArray(body.faceEmbedding) ||
      body.faceEmbedding.some((item) => typeof item !== 'number')
    ) {
      throw new BadRequestException('faceEmbedding harus berupa array number');
    }
  }
}

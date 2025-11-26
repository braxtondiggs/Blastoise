import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

export const getTypeOrmConfig = (
  configService: ConfigService
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DATABASE_HOST', 'localhost'),
  port: configService.get('DATABASE_PORT', 5432),
  username: configService.get('DATABASE_USERNAME', 'postgres'),
  password: configService.get('DATABASE_PASSWORD', 'postgres'),
  database: configService.get('DATABASE_NAME', 'blastoise'),
  entities: [User, RefreshToken, PasswordResetToken],
  autoLoadEntities: true,
  synchronize: false, // NEVER true in production
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: true,
  logging: configService.get('NODE_ENV') === 'development',
});

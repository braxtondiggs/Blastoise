/**
 * User Module
 *
 * Manages user preferences and settings
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserPreferences } from '../../entities/user-preferences.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserPreferences])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

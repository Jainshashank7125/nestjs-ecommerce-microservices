import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { OrdersModule } from './orders/orders.module';
import { Order } from './orders/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'order-service.db',
      entities: [Order],
      synchronize: true, // Set to false in production and use migrations
    }),
    HttpModule,
    OrdersModule,
  ],
})
export class AppModule {}


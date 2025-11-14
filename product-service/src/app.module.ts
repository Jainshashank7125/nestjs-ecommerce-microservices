import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';
import { Product } from './products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'product-service.db',
      entities: [Product],
      synchronize: true, // Set to false in production and use migrations
    }),
    ProductsModule,
  ],
})
export class AppModule {}


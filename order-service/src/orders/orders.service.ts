import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Order, OrderStatus } from './entities/order.entity';
import { CreateOrderDto, OrderProductDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrdersService {
  private readonly productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly httpService: HttpService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    await this.validateProducts(createOrderDto.products);

    const orderStatus = createOrderDto.status || OrderStatus.PENDING;
    const order = this.orderRepository.create({
      products: createOrderDto.products,
      status: orderStatus,
    });
    const savedOrder = await this.orderRepository.save(order);

    // If order is completed, reduce product quantities
    if (orderStatus === OrderStatus.COMPLETED) {
      await this.reduceProductQuantities(createOrderDto.products);
    }

    return savedOrder;
  }

  async findAll(): Promise<Order[]> {
    return await this.orderRepository.find();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    const previousStatus = order.status;
    const newStatus = updateOrderDto.status;

    if (updateOrderDto.products) {
      await this.validateProducts(updateOrderDto.products);
    }

    Object.assign(order, updateOrderDto);
    const savedOrder = await this.orderRepository.save(order);

    // If status changed to COMPLETED, reduce product quantities
    if (newStatus === OrderStatus.COMPLETED && previousStatus !== OrderStatus.COMPLETED) {
      const productsToUpdate = updateOrderDto.products || order.products;
      await this.reduceProductQuantities(productsToUpdate);
    }

    return savedOrder;
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
  }

  async findAllWithProducts(): Promise<any[]> {
    const orders = await this.findAll();
    
    return Promise.all(
      orders.map(async (order) => {
        const products = await Promise.all(
          order.products.map(async (item) => {
            try {
              const product = await this.getProductFromProductService(item.productId);
              return {
                ...item,
                product,
              };
            } catch (error) {
              return {
                ...item,
                product: null,
                productError: 'Product not found',
              };
            }
          }),
        );

        return {
          ...order,
          products,
        };
      }),
    );
  }

  private async getProductFromProductService(productId: string): Promise<Product> {
    const response = await firstValueFrom(
      this.httpService.get<Product>(`${this.productServiceUrl}/products/${productId}`),
    );
    return response.data;
  }

  private async validateProducts(products: OrderProductDto[]): Promise<void> {
    await Promise.all(
      products.map(async (item) => {
        try {
          const product = await this.getProductFromProductService(item.productId);

          if (product.quantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient product quantity for ${item.productId}. Available: ${product.quantity}, Requested: ${item.quantity}`,
            );
          }
        } catch (error) {
          if (error.response?.status === 404) {
            throw new NotFoundException(`Product with ID ${item.productId} not found`);
          }
          throw error;
        }
      }),
    );
  }

  private async reduceProductQuantities(products: OrderProductDto[]): Promise<void> {
    await Promise.all(
      products.map(async (item) => {
        try {
          // Get current product to check available quantity
          const product = await this.getProductFromProductService(item.productId);

          // Calculate new quantity
          const newQuantity = product.quantity - item.quantity;

          if (newQuantity < 0) {
            throw new BadRequestException(
              `Cannot complete order: Insufficient quantity for product ${item.productId}. Available: ${product.quantity}, Requested: ${item.quantity}`,
            );
          }

          // Update product quantity in product service
          await this.updateProductQuantity(item.productId, newQuantity);
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          if (error.response?.status === 404) {
            throw new NotFoundException(`Product with ID ${item.productId} not found`);
          }
          throw new BadRequestException(
            `Failed to update product quantity for ${item.productId}: ${error.message}`,
          );
        }
      }),
    );
  }

  private async updateProductQuantity(productId: string, newQuantity: number): Promise<Product> {
    const response = await firstValueFrom(
      this.httpService.patch<Product>(
        `${this.productServiceUrl}/products/${productId}`,
        { quantity: newQuantity },
      ),
    );
    return response.data;
  }
}


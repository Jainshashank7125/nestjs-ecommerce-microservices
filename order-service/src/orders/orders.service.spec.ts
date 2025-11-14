import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('OrdersService', () => {
  let service: OrdersService;
  let repository: Repository<Order>;
  let httpService: HttpService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    patch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    repository = module.get<Repository<Order>>(getRepositoryToken(Order));
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an order when product exists and has enough quantity', async () => {
      const createDto = {
        products: [
          {
            productId: 'product-1',
            quantity: 2,
          },
        ],
        status: OrderStatus.PENDING,
      };
      const product = {
        id: 'product-1',
        name: 'Test Product',
        price: 10,
        quantity: 5,
      };
      const order = { id: '1', ...createDto, createdAt: new Date(), updatedAt: new Date() };

      mockHttpService.get.mockReturnValue(of({ data: product }));
      mockRepository.create.mockReturnValue(order);
      mockRepository.save.mockResolvedValue(order);

      const result = await service.create(createDto);
      expect(result).toEqual(order);
      expect(mockHttpService.get).toHaveBeenCalledWith('http://localhost:3001/products/product-1');
    });

    it('should throw NotFoundException when product does not exist', async () => {
      const createDto = {
        products: [
          {
            productId: 'non-existent',
            quantity: 2,
          },
        ],
        status: OrderStatus.PENDING,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => ({ response: { status: 404 } })),
      );

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when product quantity is insufficient', async () => {
      const createDto = {
        products: [
          {
            productId: 'product-1',
            quantity: 10,
          },
        ],
        status: OrderStatus.PENDING,
      };
      const product = {
        id: 'product-1',
        name: 'Test Product',
        price: 10,
        quantity: 5,
      };

      mockHttpService.get.mockReturnValue(of({ data: product }));

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should reduce product quantities when creating order with COMPLETED status', async () => {
      const createDto = {
        products: [
          {
            productId: 'product-1',
            quantity: 2,
          },
          {
            productId: 'product-2',
            quantity: 3,
          },
        ],
        status: OrderStatus.COMPLETED,
      };
      const product1 = {
        id: 'product-1',
        name: 'Test Product 1',
        price: 10,
        quantity: 10,
      };
      const product2 = {
        id: 'product-2',
        name: 'Test Product 2',
        price: 20,
        quantity: 15,
      };
      const order = { id: '1', ...createDto, createdAt: new Date(), updatedAt: new Date() };

      // Mock GET calls for validation
      mockHttpService.get
        .mockReturnValueOnce(of({ data: product1 }))
        .mockReturnValueOnce(of({ data: product2 }))
        .mockReturnValueOnce(of({ data: product1 })) // For reduceProductQuantities
        .mockReturnValueOnce(of({ data: product2 })); // For reduceProductQuantities

      // Mock PATCH calls for updating quantities
      mockHttpService.patch
        .mockReturnValueOnce(of({ data: { ...product1, quantity: 8 } }))
        .mockReturnValueOnce(of({ data: { ...product2, quantity: 12 } }));

      mockRepository.create.mockReturnValue(order);
      mockRepository.save.mockResolvedValue(order);

      const result = await service.create(createDto);

      expect(result).toEqual(order);
      expect(mockHttpService.patch).toHaveBeenCalledTimes(2);
      expect(mockHttpService.patch).toHaveBeenCalledWith(
        'http://localhost:3001/products/product-1',
        { quantity: 8 },
      );
      expect(mockHttpService.patch).toHaveBeenCalledWith(
        'http://localhost:3001/products/product-2',
        { quantity: 12 },
      );
    });

    it('should throw BadRequestException when completing order with insufficient quantity', async () => {
      const createDto = {
        products: [
          {
            productId: 'product-1',
            quantity: 10,
          },
        ],
        status: OrderStatus.COMPLETED,
      };
      const product = {
        id: 'product-1',
        name: 'Test Product',
        price: 10,
        quantity: 5, // Less than requested
      };

      // Mock GET calls - first for validation (passes), second for reduceProductQuantities (fails)
      mockHttpService.get
        .mockReturnValueOnce(of({ data: product }))
        .mockReturnValueOnce(of({ data: product }));

      mockRepository.create.mockReturnValue({ id: '1', ...createDto });
      mockRepository.save.mockResolvedValue({ id: '1', ...createDto });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      expect(mockHttpService.patch).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should reduce product quantities when updating order status to COMPLETED', async () => {
      const existingOrder = {
        id: '1',
        products: [
          { productId: 'product-1', quantity: 2 },
        ],
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateDto = {
        status: OrderStatus.COMPLETED,
      };
      const product = {
        id: 'product-1',
        name: 'Test Product',
        price: 10,
        quantity: 5, // Changed to 5 so 5 - 2 = 3 matches the actual behavior
      };
      const updatedOrder = { ...existingOrder, status: OrderStatus.COMPLETED };

      mockRepository.findOne.mockResolvedValue(existingOrder);
      mockRepository.save.mockResolvedValue(updatedOrder);
      mockHttpService.get.mockReturnValue(of({ data: product }));
      mockHttpService.patch.mockReturnValue(of({ data: { ...product, quantity: 3 } }));

      const result = await service.update('1', updateDto);

      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(mockHttpService.patch).toHaveBeenCalledWith(
        'http://localhost:3001/products/product-1',
        { quantity: 3 },
      );
    });

    it('should not reduce quantities if order was already COMPLETED', async () => {
      const existingOrder = {
        id: '1',
        products: [
          { productId: 'product-1', quantity: 2 },
        ],
        status: OrderStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateDto = {
        status: OrderStatus.COMPLETED,
      };
      const updatedOrder = { ...existingOrder };

      mockRepository.findOne.mockResolvedValue(existingOrder);
      mockRepository.save.mockResolvedValue(updatedOrder);

      const result = await service.update('1', updateDto);

      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(mockHttpService.patch).not.toHaveBeenCalled();
    });

    it('should use updated products when reducing quantities', async () => {
      const existingOrder = {
        id: '1',
        products: [
          { productId: 'product-1', quantity: 2 },
        ],
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateDto = {
        products: [
          { productId: 'product-2', quantity: 3 },
        ],
        status: OrderStatus.COMPLETED,
      };
      const product2 = {
        id: 'product-2',
        name: 'Test Product 2',
        price: 20,
        quantity: 10,
      };
      const updatedOrder = { ...existingOrder, ...updateDto };

      mockRepository.findOne.mockResolvedValue(existingOrder);
      mockRepository.save.mockResolvedValue(updatedOrder);
      mockHttpService.get.mockReturnValue(of({ data: product2 }));
      mockHttpService.patch.mockReturnValue(of({ data: { ...product2, quantity: 7 } }));

      const result = await service.update('1', updateDto);

      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(mockHttpService.patch).toHaveBeenCalledWith(
        'http://localhost:3001/products/product-2',
        { quantity: 7 },
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of orders', async () => {
      const orders = [
        {
          id: '1',
          products: [
            { productId: 'p1', quantity: 2 },
          ],
          status: OrderStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          products: [
            { productId: 'p2', quantity: 1 },
          ],
          status: OrderStatus.PARTIALLY_COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockRepository.find.mockResolvedValue(orders);

      const result = await service.findAll();
      expect(result).toEqual(orders);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });
});


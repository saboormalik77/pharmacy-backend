import { Request, Response, NextFunction } from 'express';
import {
  findProductByNDC,
  formatNDC,
  isValidNDCFormat,
  createOrUpdateProduct,
  searchProducts,
} from '../services/productsService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

export const validateNDCHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const ndc = req.body.ndc || req.query.ndc;

    if (!ndc) {
      throw new AppError('NDC is required', 400);
    }

    const formattedNDC = formatNDC(ndc as string);

    // Validate NDC format
    if (!isValidNDCFormat(formattedNDC)) {
      return res.status(200).json({
        valid: false,
        error: 'Invalid NDC format. Expected format: XXXXX-XXXX-XX',
        ndc: formattedNDC,
      });
    }

    // Try to find existing product
    const product = await findProductByNDC(formattedNDC);

    if (!product) {
      // NDC format is valid but product doesn't exist yet
      // Auto-create a basic product entry so it can be used
      const newProduct = await createOrUpdateProduct({
        ndc: formattedNDC,
        product_name: `Product ${formattedNDC}`, // Default name, can be updated later
      });

      return res.status(200).json({
        valid: true,
        product: newProduct,
        isNew: true, // Flag to indicate this is a new product
      });
    }

    // Product exists, return it
    res.status(200).json({
      valid: true,
      product: {
        ...product,
        ndc: formattedNDC,
      },
      isNew: false,
    });
  }
);

export const searchProductsHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const searchTerm = req.query.search as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    if (!searchTerm) {
      throw new AppError('Search term is required', 400);
    }

    const products = await searchProducts(searchTerm, limit);

    res.status(200).json({
      status: 'success',
      data: products,
      count: products.length,
    });
  }
);

export const createProductHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const product = await createOrUpdateProduct(req.body);

    res.status(201).json({
      status: 'success',
      data: product,
    });
  }
);


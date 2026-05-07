import { authSchemas } from './authSchemas';
import { returnReportSchemas } from './returnReportSchemas';
import { commonSchemas } from './commonSchemas';
import { inventorySchemas } from './inventorySchemas';
import { returnsSchemas } from './returnsSchemas';
import { productsSchemas } from './productsSchemas';
import { creditsSchemas } from './creditsSchemas';
import { documentsSchemas } from './documentsSchemas';
import { productListsSchemas } from './productListsSchemas';
import { optimizationSchemas } from './optimizationSchemas';
import { distributorsSchemas } from './distributorsSchemas';
import { customPackagesSchemas } from './customPackagesSchemas';

export const allSchemas = {
  ...authSchemas,
  ...returnReportSchemas,
  ...commonSchemas,
  ...inventorySchemas,
  ...returnsSchemas,
  ...productsSchemas,
  ...creditsSchemas,
  ...documentsSchemas,
  ...productListsSchemas,
  ...optimizationSchemas,
  ...distributorsSchemas,
  ...customPackagesSchemas,
};


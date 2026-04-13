import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import buyingGroupsReducer from './buyingGroupsSlice';
import warehouseReducer from './warehouseSlice';
import batchReducer from './batchSlice';
import raTrackingReducer from './raTrackingSlice';
import shipmentGroupReducer from './shipmentGroupSlice';
import paymentTrackingReducer from './paymentTrackingSlice';
import returnTransactionsReducer from './returnTransactionsSlice';
import policiesReducer from './policiesSlice';
import wineCellarReducer from './wineCellarSlice';
import destructionReducer from './destructionSlice';
import settingsReducer from './settingsSlice';
import pharmacyPaymentsReducer from './pharmacyPaymentsSlice';
import ndcPricingReducer from './ndcPricingSlice';
import distributorsReducer from './distributorsSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      buyingGroups: buyingGroupsReducer,
      warehouse: warehouseReducer,
      batch: batchReducer,
      raTracking: raTrackingReducer,
      shipmentGroup: shipmentGroupReducer,
      paymentTracking: paymentTrackingReducer,
      returnTransactions: returnTransactionsReducer,
      policies: policiesReducer,
      wineCellar: wineCellarReducer,
      destruction: destructionReducer,
      settings: settingsReducer,
      pharmacyPayments: pharmacyPaymentsReducer,
      ndcPricing: ndcPricingReducer,
      distributors: distributorsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST'],
        },
      }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

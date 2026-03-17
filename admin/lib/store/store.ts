import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import dashboardReducer from './dashboardSlice';
import pharmaciesReducer from './pharmaciesSlice';
import distributorsReducer from './distributorsSlice';
import analyticsReducer from './analyticsSlice';
import paymentsReducer from './paymentsSlice';
import pharmacyPaymentsReducer from './pharmacyPaymentsSlice';
import documentsReducer from './documentsSlice';
import adminsReducer from './adminsSlice';
import settingsReducer from './settingsSlice';
import marketplaceReducer from './marketplaceSlice';
import recentActivityReducer from './recentActivitySlice';
import processorsReducer from './processorsSlice';
import returnTransactionsReducer from './returnTransactionsSlice';
import policiesReducer from './policiesSlice';
import wineCellarReducer from './wineCellarSlice';
// import emailManagementReducer from './emailManagementSlice';
import warehouseReducer from './warehouseSlice';
import batchReducer from './batchSlice';
import raTrackingReducer from './raTrackingSlice';
import paymentTrackingReducer from './paymentTrackingSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      dashboard: dashboardReducer,
      pharmacies: pharmaciesReducer,
      distributors: distributorsReducer,
      analytics: analyticsReducer,
      payments: paymentsReducer,
      pharmacyPayments: pharmacyPaymentsReducer,
      documents: documentsReducer,
      admins: adminsReducer,
      settings: settingsReducer,
      marketplace: marketplaceReducer,
      recentActivity: recentActivityReducer,
      processors: processorsReducer,
      returnTransactions: returnTransactionsReducer,
      policies: policiesReducer,
      wineCellar: wineCellarReducer,
      // emailManagement: emailManagementReducer,
      warehouse: warehouseReducer,
      batch: batchReducer,
      raTracking: raTrackingReducer,
      paymentTracking: paymentTrackingReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types
          ignoredActions: ['persist/PERSIST'],
        },
      }),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];


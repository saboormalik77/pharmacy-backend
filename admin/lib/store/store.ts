import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import dashboardReducer from './dashboardSlice';
import pharmaciesReducer from './pharmaciesSlice';
import distributorsReducer from './distributorsSlice';
import analyticsReducer from './analyticsSlice';
import paymentsReducer from './paymentsSlice';
import documentsReducer from './documentsSlice';
import adminsReducer from './adminsSlice';
import settingsReducer from './settingsSlice';
import marketplaceReducer from './marketplaceSlice';
import recentActivityReducer from './recentActivitySlice';
import processorsReducer from './processorsSlice';
import returnTransactionsReducer from './returnTransactionsSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      dashboard: dashboardReducer,
      pharmacies: pharmaciesReducer,
      distributors: distributorsReducer,
      analytics: analyticsReducer,
      payments: paymentsReducer,
      documents: documentsReducer,
      admins: adminsReducer,
      settings: settingsReducer,
      marketplace: marketplaceReducer,
      recentActivity: recentActivityReducer,
      processors: processorsReducer,
      returnTransactions: returnTransactionsReducer,
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


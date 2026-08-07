export type AuthStackParamList = {
  Login: undefined;
  Register: { role: 'buyer' | 'seller' };
  RoleSelect: undefined;
  ForgotPassword: undefined;
};

/** Shared about hub (mounted on buyer / seller / admin stacks). */
export type AboutStackParamList = {
  About: undefined;
  Licenses: undefined;
  Contact: undefined;
};

export type BuyerHomeStackParamList = {
  HomeList: undefined;
  ProductDetail: { productId: string };
};

export type BuyerCartStackParamList = {
  CartList: undefined;
  Checkout: undefined;
};

export type BuyerProfileStackParamList = {
  ProfileHome: undefined;
} & AboutStackParamList;

export type BuyerTabParamList = {
  Home: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type SellerTabParamList = {
  Dashboard: undefined;
  Products: undefined;
  Orders: undefined;
  StoreSettings: undefined;
};

export type SellerStackParamList = {
  SellerTabs: undefined;
  Notifications: undefined;
} & AboutStackParamList;

export type SellerProductsStackParamList = {
  ProductList: undefined;
  ProductForm: { productId?: string } | undefined;
};

export type AdminStackParamList = {
  AdminHome: undefined;
  SellerApprovals: undefined;
  UserManagement: undefined;
  PeopleHub: undefined;
  SellerAdminDetail: { userId: string; storeId?: string };
  BuyerAdminDetail: { userId: string };
  StoreCommissionDetail: { storeId: string; storeName: string };
  AdminOrders: undefined;
  FinanceSummary: undefined;
  StoreHealth: undefined;
  AuditLog: undefined;
  ProductModeration: undefined;
  NotificationsCenter: undefined;
  AdminRoles: undefined;
  PlatformStats: undefined;
  SellerPlans: undefined;
  LicenseKeys: undefined;
  Commission: undefined;
  Reports: undefined;
} & AboutStackParamList;

export type RootStackParamList = {
  Auth: undefined;
  Buyer: undefined;
  Seller: undefined;
  Admin: undefined;
};

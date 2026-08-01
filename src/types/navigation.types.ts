export type AuthStackParamList = {
  Login: undefined;
  Register: { role: 'buyer' | 'seller' };
  RoleSelect: undefined;
};

export type BuyerHomeStackParamList = {
  HomeList: undefined;
  ProductDetail: { productId: string };
};

export type BuyerCartStackParamList = {
  CartList: undefined;
  Checkout: undefined;
};

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
  PlatformStats: undefined;
  LicenseKeys: undefined;
  Commission: undefined;
  Reports: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Buyer: undefined;
  Seller: undefined;
  Admin: undefined;
};

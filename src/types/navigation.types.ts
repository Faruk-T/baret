export type AuthStackParamList = {
  Login: undefined;
  Register: { role: 'buyer' | 'seller' };
  RoleSelect: undefined;
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

export type AdminStackParamList = {
  SellerApprovals: undefined;
  UserManagement: undefined;
  PlatformStats: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Buyer: undefined;
  Seller: undefined;
  Admin: undefined;
};

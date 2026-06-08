export type RootStackParamList = {
  // Auth
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;

  // Main tabs
  MainTabs: undefined;

  // Discovery
  CafeDetail: { cafeId: string };
  CafeGallery: { cafeId: string; cafeName: string };
  Menu: { cafeId: string; cafeName: string };

  // Reservation flow
  TableSelect: { cafeId: string; cafeName: string };
  ReservationDetails: { cafeId: string; cafeName: string; tableId?: string; cafeAddress?: string; partySize?: number; time?: string; date?: string };
  PreOrderMenu: { cafeId: string; cafeName: string; reservationData: any; reservationId?: string };
  BookingConfirmed: { reservation: any };

  // Order flow
  ProductDetail: { item: any; cafeId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderConfirmed: { orderId: string };
  OrderTracking: { orderId: string };

  // Profile
  EditProfile: undefined;
  WalletScreen: undefined;
  TransactionHistory: undefined;
  OrderHistory: undefined;
  ReservationHistory: undefined;
  WriteReview: { cafeId: string; cafeName: string; orderId?: string };
  Settings: undefined;
  NotificationsScreen: undefined;
  ExploreTab: undefined;
  SearchResults: { query?: string; mood?: string };
  Discover: undefined;
  HelpCenter: undefined;
  Terms: undefined;
  PrivacyPolicy: undefined;
  SupportChat: undefined;
  CafeList: { title: string; filter?: string };
  PopularItems: undefined;
  AllRewards: undefined;
  ChangePassword: undefined;
  LanguageSelect: undefined;
};

export type TabParamList = {
  Home: undefined;
  MapScreen: { cafeId?: string; cafeName?: string; lat?: number; lng?: number };
  ExploreTab: undefined;
  Profile: undefined;
  Rewards: undefined;
};

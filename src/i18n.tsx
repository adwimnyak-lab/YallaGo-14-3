import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export type Language = 'he' | 'ar' | 'ru' | 'en';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  requestExternalCourier: {
    he: 'הזמן שליח (חיצוני)',
    ar: 'طلب عامل توصيل (خارجي)',
    ru: 'Вызвать курьера (внешний)',
    en: 'Request Courier (External)'
  },
  externalOrder: {
    he: 'הזמנה חיצונית',
    ar: 'طلب خارجي',
    ru: 'Внешний заказ',
    en: 'External Order'
  },
  deliveryAddress: {
    he: 'כתובת למשלוח',
    ar: 'عنوان التوصيل',
    ru: 'Адрес доставки',
    en: 'Delivery Address'
  },
  orderValue: {
    he: 'ערך ההזמנה',
    ar: 'قيمة الطلب',
    ru: 'Стоимость заказа',
    en: 'Order Value'
  },
  newOrder: {
    he: 'הזמנה חדשה',
    ar: 'طلب جديد',
    ru: 'Новый заказ',
    en: 'New Order'
  },
  appName: {
    he: 'YallaGo',
    ar: 'يلا جو',
    ru: 'YallaGo',
    en: 'YallaGo'
  },
  orderNow: {
    he: 'הזמן עכשיו',
    ar: 'اطلب الآن',
    ru: 'Заказать сейчас',
    en: 'Order Now'
  },
  becomeCourier: {
    he: 'הפוך לשליח',
    ar: 'كن عامل توصيل',
    ru: 'Стать курьером',
    en: 'Become a Courier'
  },
  searchRestaurants: {
    he: 'חפש מסעדות...',
    ar: 'ابحث عن مطاعم...',
    ru: 'Поиск ресторанов...',
    en: 'Search restaurants...'
  },
  login: {
    he: 'התחברות',
    ar: 'تسجيل الدخول',
    ru: 'Логин',
    en: 'Login'
  },
  register: {
    he: 'הרשמה',
    ar: 'تسجيل',
    ru: 'Регистрация',
    en: 'Register'
  },
  home: {
    he: 'בית',
    ar: 'الرئيسية',
    ru: 'Главная',
    en: 'Home'
  },
  orders: {
    he: 'הזמנות',
    ar: 'الطلبات',
    ru: 'Заказы',
    en: 'Orders'
  },
  menu: {
    he: 'תפריט',
    ar: 'القائمة',
    ru: 'Меню',
    en: 'Menu'
  },
  couriers: {
    he: 'שליחים',
    ar: 'عمال التوصיל',
    ru: 'Курьеры',
    en: 'Couriers'
  },
  profile: {
    he: 'פרופיל',
    ar: 'الملف الشخصي',
    ru: 'Профиль',
    en: 'Profile'
  },
  delivery: {
    he: 'משלוחים',
    ar: 'توصيل',
    ru: 'Доставка',
    en: 'Delivery'
  },
  admin: {
    he: 'ניהול',
    ar: 'إدارة',
    ru: 'Админ',
    en: 'Admin'
  },
  business: {
    he: 'עסק',
    ar: 'عمل',
    ru: 'Бизнес',
    en: 'Business'
  },
  courier: {
    he: 'שליח',
    ar: 'ساعي',
    ru: 'Курьер',
    en: 'Courier'
  },
  customer: {
    he: 'לקוח',
    ar: 'زبון',
    ru: 'Клиент',
    en: 'Customer'
  },
  logout: {
    he: 'התנתק',
    ar: 'تسجيل الخروج',
    ru: 'Выйти',
    en: 'Logout'
  },
  scanMenu: {
    he: 'סרוק תפריט',
    ar: 'مسح القائمة',
    ru: 'Сканировать меню',
    en: 'Scan Menu'
  },
  total: {
    he: 'סה"כ',
    ar: 'المجموع',
    ru: 'Итого',
    en: 'Total'
  },
  checkout: {
    he: 'ביצוע הזמנה',
    ar: 'إتمام الطلב',
    ru: 'Оформить заказ',
    en: 'Checkout'
  },
  cash: {
    he: 'מזומן',
    ar: 'نقداً',
    ru: 'Наличные',
    en: 'Cash'
  },
  creditCard: {
    he: 'כרטיס אשראי',
    ar: 'بطاقة ائتمان',
    ru: 'Кредитная карта',
    en: 'Credit Card'
  },
  rating: {
    he: 'דירוג',
    ar: 'تقييم',
    ru: 'Рейтинг',
    en: 'Rating'
  },
  email: {
    he: 'אימייל',
    ar: 'البريد الإلكترוני',
    ru: 'Email',
    en: 'Email'
  },
  password: {
    he: 'סיסמה',
    ar: 'كلمة المرور',
    ru: 'Пароль',
    en: 'Password'
  },
  fullName: {
    he: 'שם מלא',
    ar: 'الاسم الكامل',
    ru: 'Полное имя',
    en: 'Full Name'
  },
  phone: {
    he: 'טלפון',
    ar: 'هاتف',
    ru: 'Телефон',
    en: 'Phone'
  },
  selectRole: {
    he: 'בחר תפקיד',
    ar: 'اختر دوراً',
    ru: 'Выберите роль',
    en: 'Select Role'
  },
  noAccount: {
    he: 'אין לך חשבון? הירשם',
    ar: 'ليس لديك حساب؟ سجل الآن',
    ru: 'Нет аккаунта? Регистрация',
    en: "Don't have an account? Register"
  },
  haveAccount: {
    he: 'כבר יש לך חשבון? התחבר',
    ar: 'لديك حساب بالفعل؟ تسجيل الدخول',
    ru: 'Уже есть аккаунт? Войти',
    en: 'Already have an account? Login'
  },
  installApp: {
    he: 'התקן את האפליקציה',
    ar: 'تثبيت التطبيق',
    ru: 'Установить приложение',
    en: 'Install App'
  },
  installAppDesc: {
    he: 'הוסף את YallaGo למסך הבית שלך לחוויה מהירה יותר',
    ar: 'أضف YallaGo إلى شاشتك الرئيسية لتجربة أسرع',
    ru: 'Добавьте YallaGo на главный экран для быстрого доступа',
    en: 'Add YallaGo to your home screen for a faster experience'
  },
  install: {
    he: 'התקן',
    ar: 'تثبيت',
    ru: 'Установить',
    en: 'Install'
  },
  later: {
    he: 'אחר כך',
    ar: 'لاحقاً',
    ru: 'Позже',
    en: 'Later'
  },
  liveLocation: {
    he: 'מיקום חי שלך',
    ar: 'موقعك المباشر',
    ru: 'Ваше местоположение',
    en: 'Your Live Location'
  },
  openWaze: {
    he: 'פתח Waze',
    ar: 'افتح Waze',
    ru: 'Открыть Waze',
    en: 'Open Waze'
  },
  dispatchOrder: {
    he: 'שלח לשליח',
    ar: 'إرسال إلى عامل التوصيل',
    ru: 'Отправить курьеру',
    en: 'Dispatch Order'
  },
  selectCourier: {
    he: 'בחר שליח מהמפה',
    ar: 'اختر عامل توصיל من الخريطة',
    ru: 'Выберите курьера на карте',
    en: 'Select Courier'
  },
  menuManagement: {
    he: 'ניהול תפריט',
    ar: 'إدارة القائمة',
    ru: 'Управление меню',
    en: 'Menu Management'
  },
  addRestaurant: {
    he: 'הוסף מסעדה',
    ar: 'إضافة مطعم',
    ru: 'Добавить ресторан',
    en: 'Add Restaurant'
  },
  addNewRestaurant: {
    he: 'הוסף מסעדה חדשה',
    ar: 'إضافة مطعم جديد',
    ru: 'Добавить новый ресторан',
    en: 'Add New Restaurant'
  },
  restaurantName: {
    he: 'שם המסעדה',
    ar: 'اسم المطعم',
    ru: 'Название ресторана',
    en: 'Restaurant Name'
  },
  address: {
    he: 'כתובת',
    ar: 'العنوان',
    ru: 'Адрес',
    en: 'Address'
  },
  description: {
    he: 'תיאור',
    ar: 'الوصف',
    ru: 'Описание',
    en: 'Description'
  },
  cancel: {
    he: 'ביטול',
    ar: 'إلغاء',
    ru: 'Отмена',
    en: 'Cancel'
  },
  create: {
    he: 'צור',
    ar: 'إنشاء',
    ru: 'Создать',
    en: 'Create'
  },
  activeOrders: {
    he: 'הזמנות פעילות',
    ar: 'الطلبات النشطة',
    ru: 'Активные заказы',
    en: 'Active Orders'
  },
  noPendingOrders: {
    he: 'אין הזמנות ממתינות',
    ar: 'لا توجد طلبات معلقة',
    ru: 'Нет ожидающих заказов',
    en: 'No pending orders'
  },
  orderNumber: {
    he: 'הזמנה #',
    ar: 'طلب #',
    ru: 'Заказ #',
    en: 'Order #'
  },
  noCouriersOnline: {
    he: 'אין שליחים מחוברים',
    ar: 'لا يوجد عمال توصيل متصلون',
    ru: 'Нет курьеров в сети',
    en: 'No couriers online'
  },
  liveTrackingActive: {
    he: 'מעקב חי פעיל',
    ar: 'التتبع المباشר نشط',
    ru: 'Живое отслеживание активно',
    en: 'Live Tracking Active'
  },
  myRestaurants: {
    he: 'המסעדות שלי',
    ar: 'مطاعمي',
    ru: 'Мои рестораны',
    en: 'My Restaurants'
  },
  scanningMenu: {
    he: 'סורק תפריט עם בינה מלאכותית...',
    ar: 'جاري مسح القائمة بالذكاء الاصطناعي...',
    ru: 'Сканирование меню с помощью ИИ...',
    en: 'Scanning menu with AI...'
  },
  noMenuItems: {
    he: 'אין עדיין פריטים בתפריט. סרוק תפריט כדי להתחיל!',
    ar: 'لا توجد عناصر في القائمة بعد. امسح القائمة للبدء!',
    ru: 'В меню пока нет позиций. Отсканируйте меню, чтобы начать!',
    en: 'No menu items yet. Scan a menu to start!'
  },
  available: {
    he: 'זמין',
    ar: 'متاح',
    ru: 'Доступно',
    en: 'Available'
  },
  availableCouriers: {
    he: 'שליחים זמינים',
    ar: 'عمال التوصيل المتاحون',
    ru: 'Доступные курьеры',
    en: 'Available Couriers'
  },
  disabled: {
    he: 'מושבת',
    ar: 'معطل',
    ru: 'Отключено',
    en: 'Disabled'
  },
  performanceOverview: {
    he: 'סקירת ביצועים',
    ar: 'نظرة عامة على الأداء',
    ru: 'Обзор производительности',
    en: 'Performance Overview'
  },
  today: {
    he: 'היום',
    ar: 'اليوم',
    ru: 'Сегодня',
    en: 'Today'
  },
  thisWeek: {
    he: 'השבוע',
    ar: 'هذا الأسبوع',
    ru: 'На этой неделе',
    en: 'This Week'
  },
  thisMonth: {
    he: 'החודש',
    ar: 'هذا الشهر',
    ru: 'В этом месяце',
    en: 'This Month'
  },
  topBusinesses: {
    he: 'עסקים מובילים',
    ar: 'أفضل الشركات',
    ru: 'Лучшие компании',
    en: 'Top Businesses'
  },
  ordersCount: {
    he: 'הזמנות',
    ar: 'طلبات',
    ru: 'заказы',
    en: 'orders'
  },
  noBusinessData: {
    he: 'אין עדיין נתוני עסקים',
    ar: 'لا توجد بيانات عمل بعد',
    ru: 'Данных о бизнесе пока нет',
    en: 'No business data yet'
  },
  systemStats: {
    he: 'סטטיסטיקות מערכת',
    ar: 'إحصائيات النظام',
    ru: 'Статистика системы',
    en: 'System Stats'
  },
  totalRestaurants: {
    he: 'סה"כ מסעדות',
    ar: 'إجمالي المطاعм',
    ru: 'Всего ресторанов',
    en: 'Total Restaurants'
  },
  totalCouriers: {
    he: 'סה"כ שליחים',
    ar: 'إجمالي عمال التوصيل',
    ru: 'Всего курьеров',
    en: 'Total Couriers'
  },
  onlineNow: {
    he: 'מחוברים עכשיו',
    ar: 'متصل الآن',
    ru: 'Сейчас в сети',
    en: 'Online Now'
  },
  courierPerformance: {
    he: 'ביצועי שליחים',
    ar: 'أداء عمال التوصيل',
    ru: 'Производительность курьеров',
    en: 'Courier Performance'
  },
  name: {
    he: 'שם',
    ar: 'الاسم',
    ru: 'Имя',
    en: 'Name'
  },
  accepted: {
    he: 'התקבל',
    ar: 'مقبول',
    ru: 'Принято',
    en: 'Accepted'
  },
  rejected: {
    he: 'נדחה',
    ar: 'مرفوض',
    ru: 'Отклонено',
    en: 'Rejected'
  },
  completed: {
    he: 'הושלם',
    ar: 'مكتمل',
    ru: 'Завершено',
    en: 'Completed'
  },
  successRate: {
    he: 'אחוז הצלחה',
    ar: 'معدل النجاح',
    ru: 'Успешность',
    en: 'Success Rate'
  },
  businesses: {
    he: 'עסקים',
    ar: 'شركات',
    ru: 'Компании',
    en: 'Businesses'
  },
  reject: {
    he: 'דחה',
    ar: 'رفض',
    ru: 'Отклонить',
    en: 'Reject'
  },
  accept: {
    he: 'אשר',
    ar: 'قبول',
    ru: 'Принять',
    en: 'Accept'
  },
  assign: {
    he: 'הקצה',
    ar: 'تعيين',
    ru: 'Назначить',
    en: 'Assign'
  },
  delivered: {
    he: 'נמסר',
    ar: 'تم التوصيل',
    ru: 'Доставлено',
    en: 'Delivered'
  },
  deliveryFrom: {
    he: 'משלוח מ-',
    ar: 'توصيل من-',
    ru: 'Доставка от-',
    en: 'Delivery from'
  },
  deliverTo: {
    he: 'שלח ל:',
    ar: 'التوصيل إلى:',
    ru: 'Доставить:',
    en: 'Deliver to:'
  },
  me: {
    he: 'אני',
    ar: 'أنا',
    ru: 'Я',
    en: 'Me'
  },
  online: {
    he: 'מחובר',
    ar: 'متصل',
    ru: 'В сети',
    en: 'Online'
  },
  offline: {
    he: 'מנותק',
    ar: 'غير متصل',
    ru: 'Не в сети',
    en: 'Offline'
  },
  map: {
    he: 'מפה',
    ar: 'خريطة',
    ru: 'Карта',
    en: 'Map'
  },
  stats: {
    he: 'סטטיסטיקות',
    ar: 'إحصائيات',
    ru: 'Статистика',
    en: 'Stats'
  },
  addBusiness: {
    he: 'הוסף עסק',
    ar: 'إضافة عمل',
    ru: 'Добавить бизнес',
    en: 'Add Business'
  },
  addNewBusiness: {
    he: 'הוסף עסק חדש',
    ar: 'إضافة عمل جديد',
    ru: 'Добавить новый бизнес',
    en: 'Add New Business'
  },
  businessName: {
    he: 'שם העסק',
    ar: 'اسم العمل',
    ru: 'Название бизнеса',
    en: 'Business Name'
  },
  platform: {
    he: 'פלטפורמה',
    ar: 'المنصة',
    ru: 'Платформа',
    en: 'Platform'
  },
  support: {
    he: 'תמיכה',
    ar: 'الدعم',
    ru: 'Поддержка',
    en: 'Support'
  },
  contactUs: {
    he: 'צור קשר',
    ar: 'اتصل بنا',
    ru: 'Связаться с нами',
    en: 'Contact Us'
  },
  privacyPolicy: {
    he: 'מדיניות פרטיות',
    ar: 'سياسة الخصوصية',
    ru: 'Политика конфиденциальности',
    en: 'Privacy Policy'
  },
  termsOfService: {
    he: 'תנאי שימוש',
    ar: 'שروط الخدمة',
    ru: 'Условия использования',
    en: 'Terms of Service'
  },
  allRightsReserved: {
    he: 'כל הזכויות שמורות',
    ar: 'جميع الحقوق محفوظة',
    ru: 'Все права защищены',
    en: 'All rights reserved'
  },
  restaurants: {
    he: 'מסעדות',
    ar: 'مطاعم',
    ru: 'Рестораны',
    en: 'Restaurants'
  },
  manageRestaurants: {
    he: 'ניהול מסעדות',
    ar: 'إدارة المطاعم',
    ru: 'Управление ресторанами',
    en: 'Manage Restaurants'
  },
  actions: {
    he: 'פעולות',
    ar: 'إجراءات',
    ru: 'Действия',
    en: 'Actions'
  },
  confirmDelete: {
    he: 'האם אתה בטוח שברצונך למחוק?',
    ar: 'هل أنت متأكد أنك تريد الحذف؟',
    ru: 'Вы уверены, что хотите удалить?',
    en: 'Are you sure you want to delete?'
  },
  imageUrl: {
    he: 'כתובת תמונה',
    ar: 'رابط الصورة',
    ru: 'URL изображения',
    en: 'Image URL'
  },
  appStore: {
    he: 'App Store',
    ar: 'App Store',
    ru: 'App Store',
    en: 'App Store'
  },
  googlePlay: {
    he: 'Google Play',
    ar: 'Google Play',
    ru: 'Google Play',
    en: 'Google Play'
  },
  webDashboard: {
    he: 'לוח בקרה אינטרנטי',
    ar: 'لوحة تحكم الويب',
    ru: 'Веб-панель',
    en: 'Web Dashboard'
  },
  comingSoon: {
    he: 'בקרוב',
    ar: 'قريباً',
    ru: 'Скоро',
    en: 'Coming Soon'
  },
  footerDesc: {
    he: 'פלטפורמת המשלוחים האולטימטיבית המחברת בין עסקים, שליחים ולקוחות ברחבי ישראל.',
    ar: 'منصة التوصيل النهائية التي تربط الشركات وعمال التوصيل والعملاء في جميع أنحاء إسرائيل.',
    ru: 'Ультимативная платформа доставки, объединяющая бизнес, курьеров и клиентов по всему Израилю.',
    en: 'The ultimate delivery platform connecting businesses, couriers, and customers across Israel.'
  },
  selectRegion: {
    he: 'בחר אזור',
    ar: 'اختر المنطقة',
    ru: 'Выберите регион',
    en: 'Select Region'
  },
  allRegions: {
    he: 'כל האזורים',
    ar: 'كل المناطق',
    ru: 'Все регионы',
    en: 'All Regions'
  },
  away: {
    he: 'מרחק',
    ar: 'بعيد',
    ru: 'км отсюда',
    en: 'away'
  },
  closest: {
    he: 'הכי קרוב',
    ar: 'الأقرب',
    ru: 'Ближайший',
    en: 'Closest'
  },
  heroSlogan: {
    he: 'מהיר. אמין. YallaGo!',
    ar: 'سريع. موثوق. يلا جو!',
    ru: 'Быстро. Надежно. YallaGo!',
    en: 'Fast. Reliable. YallaGo!'
  },
  region_haifa: {
    he: 'חיפה',
    ar: 'حيفا',
    ru: 'Хайфа',
    en: 'Haifa'
  },
  region_krayot: {
    he: 'קריות',
    ar: 'קריות',
    ru: 'Краот',
    en: 'Krayot'
  },
  region_ramat_yishai: {
    he: 'רמת ישי',
    ar: 'רמת ישי',
    ru: 'Рамат-Ишай',
    en: 'Ramat Yishai'
  },
  region_tivon: {
    he: 'טבעון',
    ar: 'טבעון',
    ru: 'Тивон',
    en: 'Tivon'
  },
  region_atlit: {
    he: 'עתלית',
    ar: 'עתלית',
    ru: 'Атлит',
    en: 'Atlit'
  },
  region_migdal_haemek: {
    he: 'מגדל העמק',
    ar: 'מגדל העמק',
    ru: 'Мигдаль-ха-Эмек',
    en: 'Migdal HaEmek'
  },
  region_acre: {
    he: 'עכו',
    ar: 'عكا',
    ru: 'Акко',
    en: 'Acre'
  },
  region_nahariya: {
    he: 'נהריה',
    ar: 'נהריה',
    ru: 'Нагария',
    en: 'Nahariya'
  },
  region_karmiel: {
    he: 'כרמיאל',
    ar: 'כרמיאל',
    ru: 'Кармиэль',
    en: 'Karmiel'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('yallago_lang');
    return (saved as Language) || 'he';
  });

  useEffect(() => {
    localStorage.setItem('yallago_lang', language);
    document.documentElement.dir = language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][language];
  };

  const isRTL = language === 'he' || language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

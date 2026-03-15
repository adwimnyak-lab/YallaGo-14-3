import { LanguageProvider, useTranslation, Language } from './i18n.tsx';
import { Search, MapPin, User, ShoppingBag, Menu as MenuIcon, Globe, Star, Camera, LogOut, Mail, Lock, Phone, UserCircle, X, Edit, Settings, Sparkles, Users, Share2, Plus, Minus, Trash2, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, createContext, useContext, ReactNode, FormEvent, ChangeEvent } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { scanMenuImage, searchWithAI, fetchKrayotRestaurants } from './services/geminiService.ts';
import { io, Socket } from 'socket.io-client';

const deg2rad = (deg: number) => deg * (Math.PI / 180);

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Auth Context
interface UserData {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'business' | 'courier' | 'admin';
  phone: string;
}

interface AuthContextType {
  user: UserData | null;
  login: (userData: UserData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('yallago_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData: UserData) => {
    setUser(userData);
    localStorage.setItem('yallago_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('yallago_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, isRTL } = useTranslation();
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'customer' as UserData['role']
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isRegister ? '/api/register' : '/api/login';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      
      if (data.success) {
        login(data.user);
        onClose();
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {isRegister ? t('register') : t('login')}
            </h2>
            <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="relative">
                  <UserCircle className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
                  <input
                    type="text"
                    placeholder={t('fullName')}
                    className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
                  <input
                    type="tel"
                    placeholder={t('phone')}
                    className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none`}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['customer', 'business', 'courier', 'admin'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, role })}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                        formData.role === role
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t(role)}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="relative">
              <Mail className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
              <input
                type="email"
                placeholder={t('email')}
                className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="relative">
              <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
              <input
                type="password"
                placeholder={t('password')}
                className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none`}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
            >
              {isRegister ? t('register') : t('login')}
            </button>
          </form>

          <button
            onClick={() => setIsRegister(!isRegister)}
            className="w-full mt-6 text-sm text-gray-500 hover:text-orange-600 transition-colors"
          >
            {isRegister ? t('haveAccount') : t('noAccount')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Profile() {
  const { t, isRTL } = useTranslation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-12">
          <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg">
            <UserCircle className="w-20 h-20 text-orange-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">{user.name}</h2>
          <span className="px-4 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold uppercase tracking-wider">
            {t(user.role)}
          </span>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Mail className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t('email') || 'Email'}</p>
              <p className="text-gray-900 font-medium">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Phone className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t('phone') || 'Phone'}</p>
              <p className="text-gray-900 font-medium">{user.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Lock className="w-6 h-6 text-gray-400" />
            </div>
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t('password') || 'Password'}</p>
                <p className="text-gray-900 font-medium">••••••••••••</p>
              </div>
              <button className="text-orange-600 text-sm font-bold hover:underline">
                {t('change') || 'Change'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-12 border-t border-gray-100 flex justify-center">
          <button className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-gray-200">
            {t('editProfile') || 'Edit Profile'}
          </button>
        </div>
      </div>
    </main>
  );
}

const Logo = ({ className = "text-2xl", onClick }: { className?: string; onClick?: () => void }) => {
  return (
    <div 
      className={`font-black flex items-center gap-1 ${className} ${onClick ? 'cursor-pointer' : ''}`} 
      onClick={onClick}
      dir="ltr"
    >
      <span className="text-brand-blue drop-shadow-[0_2px_2px_rgba(255,210,0,0.8)] italic">Yalla</span>
      <span className="text-brand-yellow drop-shadow-[0_2px_2px_rgba(0,71,171,0.8)] italic">Go</span>
      <div className="w-2 h-2 bg-brand-orange rounded-full animate-bounce" />
    </div>
  );
};

function Header({ onNavigate, currentView }: { onNavigate: (view: any) => void, currentView: string }) {
  const { t, setLanguage, language, isRTL } = useTranslation();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const languages: { code: Language; name: string }[] = [
    { code: 'he', name: 'עברית' },
    { code: 'ar', name: 'العربية' },
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' }
  ];

  const handleNav = (view: string) => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MenuIcon className="w-6 h-6 text-gray-600 cursor-pointer lg:hidden" onClick={() => setIsMenuOpen(true)} />
            <Logo className="text-2xl cursor-pointer" onClick={() => handleNav('home')} />
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <nav className="flex items-center gap-6 text-sm font-bold text-brand-dark-blue">
              <button 
                onClick={() => handleNav('home')} 
                className={`transition-colors relative ${currentView === 'home' ? 'text-brand-blue' : 'hover:text-brand-blue'}`}
              >
                {t('home')}
                {currentView === 'home' && <motion.div layoutId="navUnderline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-blue rounded-full" />}
              </button>
              {user?.role === 'customer' && <button onClick={() => handleNav('orders')} className="hover:text-brand-blue transition-colors">{t('orders')}</button>}
              {user?.role === 'business' && <button onClick={() => handleNav('dashboard')} className="hover:text-brand-blue transition-colors">{t('business')}</button>}
              {user?.role === 'courier' && <button onClick={() => handleNav('dashboard')} className="hover:text-brand-blue transition-colors">{t('courier')}</button>}
              {user?.role === 'admin' && <button onClick={() => handleNav('dashboard')} className="hover:text-brand-blue transition-colors">{t('admin')}</button>}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-bold text-brand-dark-blue hover:text-brand-blue transition-colors">
                <Globe className="w-4 h-4" />
                <span className="uppercase">{language}</span>
              </button>
              <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-32 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden`}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`w-full px-4 py-2 text-sm text-left ${isRTL ? 'text-right' : 'text-left'} hover:bg-brand-yellow/10 transition-colors ${language === lang.code ? 'text-brand-blue bg-brand-yellow/10 font-bold' : 'text-gray-600'}`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
            
            {user ? (
              <div className="flex items-center gap-4">
                <button className="p-2 text-brand-dark-blue hover:text-brand-blue transition-colors relative">
                  <ShoppingBag className="w-6 h-6" />
                  <div className="absolute top-1 right-1 w-2 h-2 bg-brand-pink rounded-full" />
                </button>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNav('profile')}>
                  <span className="text-sm font-bold text-brand-dark-blue hidden sm:block">{user.name}</span>
                  <div className="w-8 h-8 bg-brand-yellow rounded-full flex items-center justify-center border-2 border-brand-blue">
                    <User className="w-5 h-5 text-brand-blue" />
                  </div>
                </div>
                <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                  <LogOut className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthOpen(true)}
                className="bg-brand-yellow text-brand-dark-blue px-6 py-2 rounded-xl font-black hover:bg-brand-blue hover:text-white transition-all shadow-[0_4px_0_rgb(0,71,171)] active:translate-y-1 active:shadow-none flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                {t('login')}
              </button>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} bottom-0 w-72 bg-white shadow-2xl p-6`}
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-orange-600">{t('appName')}</h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="space-y-2">
                <button 
                  onClick={() => handleNav('home')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors font-medium ${currentView === 'home' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'}`}
                >
                  <Search className="w-5 h-5" />
                  {t('home')}
                </button>
                {user && (
                  <button 
                    onClick={() => handleNav('profile')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors font-medium ${currentView === 'profile' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'}`}
                  >
                    <User className="w-5 h-5" />
                    {t('profile')}
                  </button>
                )}
                {user?.role === 'customer' && (
                  <button onClick={() => handleNav('orders')} className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium">
                    <ShoppingBag className="w-5 h-5" />
                    {t('orders')}
                  </button>
                )}
                {user?.role === 'business' && (
                  <button onClick={() => handleNav('dashboard')} className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium">
                    <ShoppingBag className="w-5 h-5" />
                    {t('business')}
                  </button>
                )}
                {user?.role === 'courier' && (
                  <button onClick={() => handleNav('dashboard')} className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium">
                    <ShoppingBag className="w-5 h-5" />
                    {t('courier')}
                  </button>
                )}
                <button 
                  onClick={() => {
                    const cleanUrl = 'https://ais-pre-lijhzjts6ub7qsko4fyckd-118717241827.europe-west3.run.app';
                    if (navigator.share) {
                      navigator.share({
                        title: 'YallaGo',
                        text: t('footerDesc'),
                        url: cleanUrl,
                      });
                    } else {
                      navigator.clipboard.writeText(cleanUrl);
                      alert(t('linkCopied') || 'Link copied to clipboard!');
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 transition-colors font-bold mt-4"
                >
                  <Share2 className="w-5 h-5" />
                  {t('shareApp') || 'Share App'}
                </button>
              </nav>

              <div className="absolute bottom-6 left-6 right-6 pt-6 border-t border-gray-100">
                {user ? (
                  <button 
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    <LogOut className="w-5 h-5" />
                    {t('logout')}
                  </button>
                ) : (
                  <button 
                    onClick={() => { setIsAuthOpen(true); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-orange-600 text-white transition-colors font-bold shadow-lg shadow-orange-200"
                  >
                    <User className="w-5 h-5" />
                    {t('login')}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}

interface RestaurantCardProps {
  key?: number;
  name: string;
  image: string;
  rating: number;
  address: string;
}

function RestaurantCard({ name, image, rating, address }: RestaurantCardProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-gray-100 group cursor-pointer transition-all hover:shadow-brand-yellow/20"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 bg-brand-yellow px-3 py-1.5 rounded-2xl flex items-center gap-1 shadow-lg border-2 border-brand-blue">
          <Star className="w-4 h-4 text-brand-blue fill-brand-blue" />
          <span className="text-sm font-black text-brand-dark-blue">{rating}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark-blue/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
          <span className="text-white font-black text-lg">{t('orderNow') || 'Order Now'}</span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-black text-brand-dark-blue group-hover:text-brand-blue transition-colors mb-2">{name}</h3>
        <div className="flex items-center gap-2 text-gray-500 font-bold">
          <MapPin className="w-4 h-4 text-brand-blue" />
          <span className="text-sm">{address}</span>
        </div>
      </div>
    </motion.div>
  );
}

function AdminDashboard() {
  const { t } = useTranslation();
  const [couriers, setCouriers] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [onlineCouriers, setOnlineCouriers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'performance' | 'restaurants'>('map');
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [showEditRestaurant, setShowEditRestaurant] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<any>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    name: '',
    address: '',
    description: '',
    phone: '',
    rating: 4.5,
    region: 'region_haifa',
    image_url: 'https://picsum.photos/seed/restaurant/800/450'
  });

  const fetchData = () => {
    fetch('/api/restaurants').then(res => res.json()).then(data => setRestaurants(data));
    fetch('/api/admin/courier-performance').then(res => res.json()).then(data => setCouriers(data));
    fetch('/api/couriers/online').then(res => res.json()).then(data => setOnlineCouriers(data));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddBusiness = async (e: FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newBusiness, ownerId: 1 })
    });
    if (response.ok) {
      setShowAddBusiness(false);
      setNewBusiness({
        name: '',
        address: '',
        description: '',
        phone: '',
        rating: 4.5,
        region: 'region_haifa',
        image_url: 'https://picsum.photos/seed/restaurant/800/450'
      });
      fetchData();
    }
  };

  const handleUpdateRestaurant = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant) return;
    const response = await fetch(`/api/restaurants/${editingRestaurant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingRestaurant)
    });
    if (response.ok) {
      setShowEditRestaurant(false);
      fetchData();
    }
  };

  const handleDeleteRestaurant = async (id: number) => {
    if (!confirm(t('confirmDelete') || 'Are you sure?')) return;
    try {
      const response = await fetch(`/api/restaurants/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchData();
      } else {
        alert(data.message || 'Failed to delete restaurant');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while deleting restaurant');
    }
  };

  const handleSeedKrayot = async () => {
    setIsSeeding(true);
    try {
      const data = await fetchKrayotRestaurants();
      for (const res of data) {
        await fetch('/api/restaurants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerId: 1,
            name: res.name,
            address: res.address,
            description: res.description,
            rating: res.rating,
            region: 'region_krayot',
            image_url: `https://picsum.photos/seed/${encodeURIComponent(res.name)}/800/450`
          })
        });
      }
      alert(`Successfully seeded ${data.length} restaurants in Krayot!`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to seed restaurants');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-4xl font-black text-brand-dark-blue tracking-tight">{t('admin')}</h2>
        <div className="flex gap-4">
          <button 
            onClick={handleSeedKrayot}
            disabled={isSeeding}
            className="bg-brand-blue/10 text-brand-blue px-6 py-3 rounded-2xl font-black hover:bg-brand-blue hover:text-white transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isSeeding ? <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent animate-spin rounded-full" /> : <Sparkles className="w-5 h-5" />}
            Seed Krayot
          </button>
          <button 
            onClick={() => setShowAddBusiness(true)}
            className="bg-brand-yellow text-brand-dark-blue px-8 py-3 rounded-2xl font-black hover:bg-brand-blue hover:text-white transition-all shadow-[0_4px_0_rgb(0,71,171)] active:translate-y-1 active:shadow-none"
          >
            + {t('addBusiness')}
          </button>
        </div>
      </div>

      <div className="flex gap-8 mb-12 border-b-2 border-gray-100">
        {(['map', 'performance', 'restaurants'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-2 font-black text-sm uppercase tracking-widest transition-all relative ${
              activeTab === tab ? 'text-brand-blue' : 'text-gray-400 hover:text-brand-dark-blue'
            }`}
          >
            {t(tab)}
            {activeTab === tab && <motion.div layoutId="adminTab" className="absolute bottom-[-2px] left-0 right-0 h-1 bg-brand-blue rounded-full" />}
          </button>
        ))}
      </div>

      {showAddBusiness && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">{t('addNewBusiness')}</h3>
            <form onSubmit={handleAddBusiness} className="space-y-4">
              <input 
                type="text" placeholder={t('businessName')} required
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                value={newBusiness.name} onChange={e => setNewBusiness({...newBusiness, name: e.target.value})}
              />
              <input 
                type="text" placeholder={t('businessName')} required
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-yellow/50 font-bold transition-all"
                value={newBusiness.name} onChange={e => setNewBusiness({...newBusiness, name: e.target.value})}
              />
              <input 
                type="text" placeholder={t('address')} required
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-yellow/50 font-bold transition-all"
                value={newBusiness.address} onChange={e => setNewBusiness({...newBusiness, address: e.target.value})}
              />
              <input 
                type="text" placeholder={t('phone')} required
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-yellow/50 font-bold transition-all"
                value={newBusiness.phone} onChange={e => setNewBusiness({...newBusiness, phone: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" step="0.1" min="0" max="5" placeholder={t('rating')} required
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-yellow/50 font-bold transition-all"
                  value={newBusiness.rating} onChange={e => setNewBusiness({...newBusiness, rating: parseFloat(e.target.value)})}
                />
                <select 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-yellow/50 font-bold transition-all cursor-pointer"
                  value={newBusiness.region} onChange={e => setNewBusiness({...newBusiness, region: e.target.value})}
                >
                  <option value="region_haifa">{t('region_haifa')}</option>
                  <option value="region_krayot">{t('region_krayot')}</option>
                  <option value="region_ramat_yishai">{t('region_ramat_yishai')}</option>
                  <option value="region_tivon">{t('region_tivon')}</option>
                  <option value="region_atlit">{t('region_atlit')}</option>
                  <option value="region_migdal_haemek">{t('region_migdal_haemek')}</option>
                  <option value="region_acre">{t('region_acre')}</option>
                  <option value="region_nahariya">{t('region_nahariya')}</option>
                  <option value="region_karmiel">{t('region_karmiel')}</option>
                </select>
              </div>
              <textarea 
                placeholder={t('description')}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-yellow/50 font-bold transition-all min-h-[100px]"
                value={newBusiness.description} onChange={e => setNewBusiness({...newBusiness, description: e.target.value})}
              />
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('restaurantImage') || 'Restaurant Image'}</label>
                <div className="flex items-center gap-4">
                  {newBusiness.image_url && (
                    <img src={newBusiness.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-gray-100" referrerPolicy="no-referrer" />
                  )}
                  <label className="flex-1 cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 hover:border-brand-yellow transition-all flex flex-col items-center justify-center gap-2">
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">{t('uploadImage') || 'Upload Image'}</span>
                    <input 
                      type="file" className="hidden" accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setNewBusiness({...newBusiness, image_url: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddBusiness(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-4 bg-brand-blue text-white font-black rounded-2xl hover:bg-brand-dark-blue transition-all shadow-xl">{t('create')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showEditRestaurant && editingRestaurant && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">{t('editRestaurant') || 'Edit Restaurant'}</h3>
            <form onSubmit={handleUpdateRestaurant} className="space-y-4">
              <input 
                type="text" placeholder={t('restaurantName')} required
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-yellow/50 font-bold transition-all"
                value={editingRestaurant.name} onChange={e => setEditingRestaurant({...editingRestaurant, name: e.target.value})}
              />
              <input 
                type="text" placeholder={t('address')} required
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-yellow/50 font-bold transition-all"
                value={editingRestaurant.address} onChange={e => setEditingRestaurant({...editingRestaurant, address: e.target.value})}
              />
              <select 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-yellow/50 font-bold transition-all cursor-pointer"
                value={editingRestaurant.region} onChange={e => setEditingRestaurant({...editingRestaurant, region: e.target.value})}
              >
                <option value="region_haifa">{t('region_haifa')}</option>
                <option value="region_krayot">{t('region_krayot')}</option>
                <option value="region_ramat_yishai">{t('region_ramat_yishai')}</option>
                <option value="region_tivon">{t('region_tivon')}</option>
                <option value="region_atlit">{t('region_atlit')}</option>
                <option value="region_migdal_haemek">{t('region_migdal_haemek')}</option>
                <option value="region_acre">{t('region_acre')}</option>
                <option value="region_nahariya">{t('region_nahariya')}</option>
                <option value="region_karmiel">{t('region_karmiel')}</option>
              </select>
              <textarea 
                placeholder={t('description')}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-yellow/50 font-bold transition-all min-h-[100px]"
                value={editingRestaurant.description} onChange={e => setEditingRestaurant({...editingRestaurant, description: e.target.value})}
              />
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('restaurantImage') || 'Restaurant Image'}</label>
                <div className="flex items-center gap-4">
                  {editingRestaurant.image_url && (
                    <img src={editingRestaurant.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-gray-100" referrerPolicy="no-referrer" />
                  )}
                  <label className="flex-1 cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 hover:border-brand-yellow transition-all flex flex-col items-center justify-center gap-2">
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">{t('uploadImage') || 'Upload Image'}</span>
                    <input 
                      type="file" className="hidden" accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setEditingRestaurant({...editingRestaurant, image_url: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowEditRestaurant(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-4 bg-brand-blue text-white font-black rounded-2xl hover:bg-brand-dark-blue transition-all shadow-xl">{t('save') || 'Save'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <Map 
              locations={[
                ...onlineCouriers.map(c => ({ ...c, name: `${t('courier')}: ${c.name}` })),
                ...restaurants.map(r => ({
                  lat: regionCoords[r.region]?.[0] || 32.8191,
                  lng: regionCoords[r.region]?.[1] || 34.9983,
                  name: `${t('business')}: ${r.name}`
                }))
              ]} 
              title={t('map')} 
            />
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-4">{t('systemStats')}</h3>
            <div className="space-y-4">
              <div className="flex justify-between p-4 bg-gray-50 rounded-2xl">
                <span className="text-gray-600">{t('totalRestaurants')}</span>
                <span className="font-bold">{restaurants.length}</span>
              </div>
              <div className="flex justify-between p-4 bg-gray-50 rounded-2xl">
                <span className="text-gray-600">{t('totalCouriers')}</span>
                <span className="font-bold">{couriers.length}</span>
              </div>
              <div className="flex justify-between p-4 bg-gray-50 rounded-2xl">
                <span className="text-gray-600">{t('onlineNow')}</span>
                <span className="font-bold text-green-600">{onlineCouriers.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
            <h3 className="text-xl font-bold mb-4">{t('courierPerformance')}</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                  <th className="pb-4">{t('name')}</th>
                  <th className="pb-4">{t('accepted')}</th>
                  <th className="pb-4">{t('rejected')}</th>
                  <th className="pb-4">{t('today')}</th>
                  <th className="pb-4">{t('thisWeek')}</th>
                  <th className="pb-4">{t('thisMonth')}</th>
                  <th className="pb-4">{t('businesses')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {couriers.map(c => (
                  <tr key={c.id} className="text-sm">
                    <td className="py-4 font-bold">{c.name}</td>
                    <td className="py-4 text-green-600">{c.accepted}</td>
                    <td className="py-4 text-red-600">{c.rejected}</td>
                    <td className="py-4 font-bold">{c.today}</td>
                    <td className="py-4">{c.week}</td>
                    <td className="py-4">{c.month}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1">
                        {c.businesses?.map((b: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium">
                            {b.business_name} ({b.count})
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'restaurants' && (
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
            <h3 className="text-xl font-bold mb-4">{t('manageRestaurants')}</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                  <th className="pb-4">{t('name')}</th>
                  <th className="pb-4">{t('region')}</th>
                  <th className="pb-4">{t('address')}</th>
                  <th className="pb-4">{t('phone')}</th>
                  <th className="pb-4">{t('rating')}</th>
                  <th className="pb-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {restaurants.map(r => (
                  <tr key={r.id} className="text-sm">
                    <td className="py-4 font-bold">{r.name}</td>
                    <td className="py-4 text-gray-500">{t(r.region)}</td>
                    <td className="py-4 text-gray-500">{r.address}</td>
                    <td className="py-4 text-gray-500">{r.phone}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-1 text-orange-500 font-bold">
                        <Star className="w-3 h-3 fill-current" /> {r.rating}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingRestaurant(r);
                            setShowEditRestaurant(true);
                          }}
                          className="p-2 text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRestaurant(r.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Cart Context
interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  addedBy?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: any) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, delta: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { user } = useAuth();

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, addedBy: user?.name || 'Guest' }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, updateQuantity, clearCart, total
    }}>
      {children}
    </CartContext.Provider>
  );
};

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

function RestaurantDetail({ restaurant, onBack }: { restaurant: any; onBack: () => void }) {
  const { t } = useTranslation();
  const { addToCart, cart, total, clearCart, updateQuantity } = useCart();
  const { user } = useAuth();
  const [menu, setMenu] = useState<any[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card'>('cash');
  const [rating, setRating] = useState(5);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    fetch(`/api/restaurants/${restaurant.id}/menu`)
      .then(res => res.json())
      .then(data => setMenu(data));
  }, [restaurant]);

  const handleCheckout = async () => {
    if (!user) {
      alert('Please login to order');
      return;
    }
    setIsOrdering(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user.id,
          restaurant_id: restaurant.id,
          total_price: total,
          payment_method: paymentMethod,
          address: user.phone, // Using phone as mock address for now
          items: cart
        })
      });
      if (response.ok) {
        alert('Order placed successfully!');
        clearCart();
        onBack();
      }
    } catch (err) {
      alert('Failed to place order');
    } finally {
      setIsOrdering(false);
    }
  };

  const submitRating = async () => {
    alert(`Thank you for rating ${restaurant.name} ${rating} stars!`);
    setShowRatingModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <button onClick={onBack} className="mb-8 text-brand-blue font-black flex items-center gap-2 hover:translate-x-[-4px] transition-transform">
            <MenuIcon className="w-5 h-5 rotate-180" /> {t('home')}
          </button>
          <div className="relative h-80 rounded-[3rem] overflow-hidden mb-12 shadow-2xl border-4 border-white">
            <img src={restaurant.image_url || 'https://picsum.photos/seed/restaurant/800/450'} alt={restaurant.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark-blue/80 via-brand-dark-blue/20 to-transparent flex items-end justify-between p-12">
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-white drop-shadow-lg">{restaurant.name}</h2>
                <div className="flex items-center gap-4 text-brand-yellow font-bold text-lg">
                  <div className="flex items-center gap-1 bg-brand-blue/40 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20">
                    <Star className="w-5 h-5 fill-brand-yellow" />
                    <span>{restaurant.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-brand-blue/40 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20">
                    <MapPin className="w-5 h-5" />
                    <span>{restaurant.address}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowRatingModal(true)}
                className="bg-brand-yellow text-brand-dark-blue p-4 rounded-2xl hover:scale-110 transition-transform shadow-xl border-2 border-brand-blue"
              >
                <Star className="w-6 h-6" />
              </button>
            </div>
          </div>

          {showRatingModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center">
                <h3 className="text-2xl font-bold mb-6">{t('rate')} {restaurant.name}</h3>
                <div className="flex justify-center gap-2 mb-8">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star 
                      key={s} 
                      className={`w-8 h-8 cursor-pointer transition-colors ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                      onClick={() => setRating(s)}
                    />
                  ))}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setShowRatingModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl">{t('cancel')}</button>
                  <button onClick={submitRating} className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl">{t('submit')}</button>
                </div>
              </motion.div>
            </div>
          )}
          
          <div className="space-y-8">
            <div className="flex justify-between items-center mb-8">
            <h3 className="text-3xl font-black text-brand-dark-blue">{t('menu')}</h3>
          </div>
            <div className="grid grid-cols-1 gap-6">
              {menu.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 flex justify-between items-center hover:border-brand-yellow transition-all group">
                  <div className="space-y-1">
                    <p className="font-black text-xl text-brand-dark-blue group-hover:text-brand-blue transition-colors">{item.name}</p>
                    <p className="text-sm text-gray-500 font-bold leading-relaxed max-w-md">{item.description}</p>
                    <p className="text-brand-blue font-black text-lg mt-2">₪{item.price}</p>
                  </div>
                  <button 
                    onClick={() => addToCart(item)}
                    className="bg-brand-yellow text-brand-dark-blue px-8 py-3 rounded-2xl font-black hover:bg-brand-blue hover:text-white transition-all shadow-[0_4px_0_rgb(0,71,171)] active:translate-y-1 active:shadow-none"
                  >
                    {t('add')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 h-fit sticky top-24">
          <h3 className="text-2xl font-black text-brand-dark-blue mb-8 flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-brand-blue" /> {t('cart')}
          </h3>
          <div className="space-y-6 mb-10">
            {cart.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-400 font-bold">{t('emptyCart')}</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center group">
                  <div className="space-y-1">
                    <p className="font-black text-brand-dark-blue text-base">{item.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 font-bold">x{item.quantity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Minus className="w-3.5 h-3.5 text-brand-dark-blue" /></button>
                      <span className="text-sm font-black text-brand-dark-blue min-w-[20px] text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Plus className="w-3.5 h-3.5 text-brand-dark-blue" /></button>
                    </div>
                    <p className="font-black text-brand-blue text-base">₪{item.price * item.quantity}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className="border-t border-gray-100 pt-8 mb-8 space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-black text-brand-dark-blue uppercase tracking-widest">{t('paymentMethod')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-3 px-4 rounded-2xl text-sm font-black border-2 transition-all ${paymentMethod === 'cash' ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-lg' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                  >
                    {t('cash')}
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`py-3 px-4 rounded-2xl text-sm font-black border-2 transition-all ${paymentMethod === 'credit_card' ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-lg' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                  >
                    {t('creditCard')}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold text-lg">{t('total')}</span>
                <span className="text-3xl font-black text-brand-dark-blue">₪{total}</span>
              </div>
            </div>
          )}
          <button 
            disabled={cart.length === 0 || isOrdering}
            onClick={handleCheckout}
            className="w-full bg-brand-blue text-white py-5 rounded-[1.5rem] font-black text-xl hover:bg-brand-dark-blue transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isOrdering ? <div className="w-6 h-6 border-4 border-white border-t-transparent animate-spin rounded-full" /> : (
              <>
                <ShoppingBag className="w-6 h-6" />
                {t('checkout')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-4 right-4 z-[200] md:left-auto md:right-6 md:w-96"
    >
      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-orange-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900">{t('installApp')}</h4>
          <p className="text-xs text-gray-500">{t('installAppDesc')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition-colors"
          >
            {t('install')}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs text-gray-400 font-medium hover:text-gray-600"
          >
            {t('later')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-brand-dark-blue text-white py-16 mt-20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-pink" />
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <Logo className="text-4xl" />
            <p className="text-gray-400 max-w-sm text-lg leading-relaxed">
              {t('footerDesc')}
            </p>
            <div className="flex gap-4">
              {['facebook', 'instagram', 'twitter'].map(social => (
                <a key={social} href="#" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-brand-yellow hover:text-brand-dark-blue transition-all">
                  <Globe className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-black text-brand-yellow uppercase tracking-widest text-sm mb-6">{t('platform')}</h4>
            <ul className="space-y-4 text-gray-400 font-bold">
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-brand-yellow rounded-full" />
                {t('appStore')} ({t('comingSoon')})
              </a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-brand-yellow rounded-full" />
                {t('googlePlay')} ({t('comingSoon')})
              </a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-brand-yellow rounded-full" />
                {t('webDashboard')}
              </a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-brand-yellow uppercase tracking-widest text-sm mb-6">{t('support')}</h4>
            <ul className="space-y-4 text-gray-400 font-bold">
              <li><a href="#" className="hover:text-white transition-colors">{t('contactUs')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('privacyPolicy')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('termsOfService')}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 font-bold">
          <p>© {new Date().getFullYear()} YallaGo. {t('allRightsReserved')}.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white">Hebrew</a>
            <a href="#" className="hover:text-white">English</a>
            <a href="#" className="hover:text-white">Arabic</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Home() {
  const { t, isRTL } = useTranslation();
  const [search, setSearch] = useState('');
  const [isAISearch, setIsAISearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiResults, setAiResults] = useState<number[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);

  const regions = [
    'region_krayot', 'region_haifa', 'region_ramat_yishai', 'region_tivon', 
    'region_atlit', 'region_migdal_haemek', 'region_acre', 'region_nahariya', 'region_karmiel'
  ];

  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    fetch('/api/restaurants').then(res => res.json()).then(data => setRestaurants(data));
  }, []);

  const handleAISearch = async () => {
    if (!search.trim()) return;
    setIsSearching(true);
    try {
      const result = await searchWithAI(search, restaurants);
      setAiResults(result.recommendedIds);
      setAiExplanation(result.explanation);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  if (selectedRestaurant) {
    return <RestaurantDetail restaurant={selectedRestaurant} onBack={() => setSelectedRestaurant(null)} />;
  }

  const filteredRestaurants = restaurants.filter(res => {
    if (isAISearch && aiResults.length > 0) {
      return aiResults.includes(res.id);
    }
    const matchesSearch = res.name.toLowerCase().includes(search.toLowerCase()) || 
                         (res.description && res.description.toLowerCase().includes(search.toLowerCase()));
    const matchesRegion = selectedRegion === 'all' || res.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  return (
    <main>
      {/* Hero Section */}
      <section className="relative h-[600px] md:h-[500px] overflow-hidden bg-brand-blue">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        {/* Phone Background Mockup - Visible on all devices now */}
        <div className="absolute inset-0 flex items-center justify-center md:justify-end md:pr-20 overflow-hidden pointer-events-none opacity-40 md:opacity-100">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, type: 'spring' }}
            className="relative w-[280px] h-[560px] md:w-[300px] md:h-[600px] bg-gray-900 rounded-[3rem] border-8 border-gray-800 shadow-2xl overflow-hidden transform rotate-[-5deg] md:rotate-[-5deg] translate-y-20 md:translate-y-10"
          >
            {/* Phone Screen Mockup */}
            <div className="absolute inset-0 bg-gray-50 p-0 flex flex-col overflow-hidden">
              {/* App Header */}
              <div className="bg-brand-blue p-4 pt-8 text-white">
                <div className="flex justify-between items-center mb-4">
                  <Logo className="text-xl" />
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                </div>
                <div className="w-full h-10 bg-white rounded-xl shadow-sm flex items-center px-3">
                  <div className="w-4 h-4 bg-gray-200 rounded-full mr-2" />
                  <div className="w-20 h-2 bg-gray-100 rounded-full" />
                </div>
              </div>
              {/* App Content */}
              <div className="p-4 space-y-4">
                <div className="w-1/2 h-4 bg-gray-200 rounded-full" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="aspect-[4/3] bg-white border border-gray-100 rounded-2xl shadow-sm p-2">
                    <div className="w-full h-2/3 bg-orange-100 rounded-xl mb-2 flex items-center justify-center">
                      <Flame className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="w-3/4 h-2 bg-gray-200 rounded-full" />
                  </div>
                  <div className="aspect-[4/3] bg-white border border-gray-100 rounded-2xl shadow-sm p-2">
                    <div className="w-full h-2/3 bg-blue-100 rounded-xl mb-2 flex items-center justify-center">
                      <Star className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="w-3/4 h-2 bg-gray-200 rounded-full" />
                  </div>
                </div>
                <div className="w-full h-32 bg-brand-blue/10 rounded-3xl border border-brand-blue/20 p-4 flex flex-col justify-center items-center text-center">
                   <p className="text-[10px] font-bold text-brand-blue uppercase tracking-wider mb-1">{t('newOrder')}</p>
                   <p className="text-xl font-black text-brand-dark-blue">₪85.00</p>
                </div>
              </div>
              {/* Bottom Nav */}
              <div className="mt-auto bg-white border-t border-gray-100 p-4 flex justify-around">
                <Search className="w-5 h-5 text-gray-300" />
                <ShoppingBag className="w-5 h-5 text-brand-blue" />
                <User className="w-5 h-5 text-gray-300" />
              </div>
            </div>
            {/* Reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 h-full flex flex-col md:flex-row items-center justify-between relative z-10">
          <div className="md:w-1/2 space-y-6 text-white text-center md:text-left pt-12 md:pt-0">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <Logo className="text-6xl md:text-8xl mb-4" />
              <h2 className="text-3xl md:text-5xl font-black leading-tight">
                {t('footerDesc')}
              </h2>
              <p className="text-brand-yellow text-xl font-bold italic">
                {t('heroSlogan')}
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4 justify-center md:justify-start"
            >
              <button 
                onClick={() => {
                  if (!user) {
                    setIsAuthOpen(true);
                    return;
                  }
                  handleNav('home');
                }} 
                className="bg-brand-yellow text-brand-dark-blue px-8 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-[0_6px_0_rgb(0,35,102)]"
              >
                {t('orderNow') || 'Order Now'}
              </button>
              <button className="bg-white/10 backdrop-blur-md text-white border-2 border-white/20 px-8 py-4 rounded-2xl font-black text-lg hover:bg-white/20 transition-all">
                {t('becomeCourier') || 'Become a Courier'}
              </button>
            </motion.div>
          </div>
          
          <div className="md:w-1/2 relative h-full hidden md:block pointer-events-none">
            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-20 right-60 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-brand-yellow rounded-full flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-brand-dark-blue" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">{t('newOrder')}</p>
                <p className="font-black text-brand-dark-blue">₪85.00</p>
              </div>
            </motion.div>
            
            {/* Rocket Trail Effect */}
            <div className="absolute bottom-20 right-40 w-64 h-2 bg-gradient-to-r from-transparent via-brand-yellow to-brand-orange blur-md animate-pulse rotate-[-15deg]" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
              <input
                type="text"
                placeholder={isAISearch ? t('askAI') || 'Ask AI for recommendations...' : t('searchRestaurants')}
                className={`w-full ${isRTL ? 'pr-12 pl-24' : 'pl-12 pr-24'} py-4 bg-white border border-gray-100 shadow-xl rounded-3xl text-gray-900 focus:ring-4 focus:ring-brand-yellow/50 transition-all text-lg font-medium`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (!isAISearch) {
                    setAiResults([]);
                    setAiExplanation('');
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && isAISearch && handleAISearch()}
              />
              <div className={`absolute ${isRTL ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 flex items-center gap-2`}>
                {isAISearch && (
                  <button 
                    onClick={handleAISearch}
                    disabled={isSearching}
                    className="p-3 bg-brand-blue text-white rounded-2xl hover:bg-brand-dark-blue transition-colors disabled:opacity-50 shadow-lg"
                  >
                    {isSearching ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Sparkles className="w-5 h-5" />}
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsAISearch(!isAISearch);
                    setAiResults([]);
                    setAiExplanation('');
                  }}
                  className={`p-3 rounded-2xl transition-all shadow-lg ${isAISearch ? 'bg-brand-yellow text-brand-dark-blue' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="relative min-w-[200px]">
              <MapPin className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-brand-blue`} />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-white border border-gray-100 shadow-xl rounded-3xl text-brand-dark-blue focus:ring-4 focus:ring-brand-yellow/50 appearance-none cursor-pointer transition-all font-bold`}
              >
                <option value="all">{t('allRegions')}</option>
                {regions.map(region => (
                  <option key={region} value={region}>{t(region)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {aiExplanation && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3 items-start"
          >
            <Sparkles className="w-5 h-5 text-orange-600 flex-shrink-0 mt-1" />
            <p className="text-sm text-orange-800 italic leading-relaxed">{aiExplanation}</p>
          </motion.div>
        )}

        <div className="flex justify-between items-center mb-8 mt-12">
          <h2 className="text-3xl font-black text-brand-dark-blue">{t('restaurants')}</h2>
          <button 
            onClick={() => setShowMap(!showMap)}
            className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${showMap ? 'bg-brand-blue text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}
          >
            <MapPin className="w-4 h-4" />
            {showMap ? t('hideMap') || 'Hide Map' : t('showMap') || 'Show Map'}
          </button>
        </div>

        {showMap && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-12"
          >
            <Map 
              locations={filteredRestaurants.map(r => ({
                lat: regionCoords[r.region]?.[0] || 32.8191,
                lng: regionCoords[r.region]?.[1] || 34.9983,
                name: r.name,
                onClick: () => setSelectedRestaurant(r)
              }))} 
              title={t('businesses')} 
            />
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
        {filteredRestaurants.map((restaurant) => (
          <div key={restaurant.id} onClick={() => setSelectedRestaurant(restaurant)}>
            <RestaurantCard 
              name={restaurant.name}
              image={restaurant.image_url || 'https://picsum.photos/seed/restaurant/800/450'}
              rating={restaurant.rating}
              address={restaurant.address}
            />
          </div>
        ))}
        {filteredRestaurants.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">{t('noResults') || 'No restaurants found in this area'}</p>
          </div>
        )}
      </div>

      <section className="bg-orange-600 rounded-[3rem] p-8 md:p-16 text-white overflow-hidden relative">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            {t('appName')} {t('comingSoonPocket')}
          </h2>
          <p className="text-orange-100 text-lg mb-8">
            {t('appComingSoonDesc')}
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-orange-600 fill-orange-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-orange-200">{t('comingSoon')}</p>
                <p className="font-bold">{t('appStore')}</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-orange-600 fill-orange-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-orange-200">{t('comingSoon')}</p>
                <p className="font-bold">{t('googlePlay')}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
          <ShoppingBag className="w-full h-full -rotate-12 translate-x-1/4 translate-y-1/4" />
        </div>
      </section>
    </main>
  );
}


function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom]);
  return null;
}

function Map({ locations, title, heatmap = false }: { locations: any[]; title: string; heatmap?: boolean }) {
  const { t } = useTranslation();
  
  // Default center is Haifa area
  const [center, setCenter] = useState<[number, number]>([32.8191, 34.9983]);
  const [zoom, setZoom] = useState(13);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (locations.length > 0) {
      // Find the average center of all locations
      const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
      const avgLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
      setCenter([avgLat, avgLng]);
      if (locations.length === 1) setZoom(15);
      else setZoom(12);
    }
  }, [locations]);

  const customIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  const courierIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  return (
    <div className="bg-white rounded-3xl p-6 h-96 relative overflow-hidden border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-gray-400 text-xs font-bold uppercase">{title}</h4>
        <div className="flex items-center gap-2">
          {heatmap && (
            <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-[10px] font-bold">
              <Flame className="w-3 h-3" /> {t('highDemand') || 'High Demand'}
            </div>
          )}
          <button 
            onClick={() => {
              if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  const newLoc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                  setCenter(newLoc);
                  setUserLocation(newLoc);
                  setZoom(15);
                });
              }
            }}
            className="text-[10px] bg-brand-blue text-white px-2 py-1 rounded-xl hover:bg-brand-dark-blue transition-colors"
          >
            {t('me')}
          </button>
          {title === t('liveLocation') && (
            <a 
              href="https://waze.com/ul" 
              target="_blank" 
              className="text-[10px] bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded-xl transition-colors flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" /> {t('openWaze')}
            </a>
          )}
        </div>
      </div>
      
      <div className="h-[calc(100%-2rem)] w-full rounded-2xl overflow-hidden border border-gray-100">
        <MapContainer 
          center={center} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <ChangeView center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && (
            <Marker position={userLocation} icon={customIcon}>
              <Tooltip permanent direction="top" offset={[0, -32]}>
                <span className="font-bold text-xs text-brand-blue">{t('me')}</span>
              </Tooltip>
            </Marker>
          )}
          {locations.map((loc, i) => (
            <Marker 
              key={i} 
              position={[loc.lat, loc.lng]} 
              icon={loc.name.toLowerCase().includes('courier') || loc.name.toLowerCase().includes('שליח') ? courierIcon : customIcon}
              eventHandlers={{
                click: () => {
                  if (loc.onClick) loc.onClick();
                },
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -32]}>
                <span className="font-bold text-xs">{loc.name}</span>
              </Tooltip>
              <Popup>
                <div className="text-sm font-bold">{loc.name}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function CourierDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'map' | 'stats' | 'heatmap'>('orders');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  const fetchOrders = () => {
    if (user) {
      fetch(`/api/couriers/${user.id}/orders`)
        .then(res => res.json())
        .then(data => {
          if (data.length > orders.length) {
            // Simulated Push Notification
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("New Order Assigned!", { body: "You have a new delivery request." });
            } else {
              alert("New Order Assigned! Check your dashboard.");
            }
          }
          setOrders(data);
        });
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const fetchPerformance = () => {
    if (user) {
      fetch(`/api/couriers/${user.id}/performance`)
        .then(res => res.json())
        .then(data => setPerformance(data));
    }
  };

  const fetchRestaurants = () => {
    fetch('/api/restaurants')
      .then(res => res.json())
      .then(data => setRestaurants(data));
  };

  const geoLoc = useGeolocation(isOnline);

  useEffect(() => {
    if (geoLoc) {
      setCurrentLocation(geoLoc);
      if (user) {
        fetch(`/api/couriers/${user.id}/location`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            lat: geoLoc.lat, 
            lng: geoLoc.lng,
            is_online: true 
          })
        });
      }
    }
  }, [geoLoc, user]);

  useEffect(() => {
    fetchOrders();
    fetchPerformance();
    fetchRestaurants();
    const interval = setInterval(() => {
      fetchOrders();
      if (activeTab === 'stats') fetchPerformance();
      if (activeTab === 'map') fetchRestaurants();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, activeTab]);

  const respondToOrder = async (orderId: number, action: 'accept' | 'reject') => {
    await fetch(`/api/orders/${orderId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courier_id: user?.id, action })
    });
    fetchOrders();
    fetchPerformance();
  };

  const updateStatus = async (orderId: number, status: string) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchOrders();
    fetchPerformance();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">{t('courier')}</h2>
        <button 
          onClick={() => setIsOnline(!isOnline)}
          className={`px-6 py-2 rounded-xl font-bold transition-colors ${isOnline ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}
        >
          {isOnline ? t('online') : t('offline')}
        </button>
      </div>

      <div className="flex gap-4 mb-8 border-b border-gray-200">
        {(['orders', 'map', 'heatmap', 'stats'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-2 font-bold text-sm transition-all relative ${
              activeTab === tab ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t(tab)}
            {activeTab === tab && <motion.div layoutId="courierTab" className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 rounded-full" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'map' && (
            <Map 
              locations={[
                ...(currentLocation ? [{ ...currentLocation, name: t('me') }] : []),
                ...restaurants.map(r => ({ 
                  lat: regionCoords[r.region]?.[0] || 32.8191,
                  lng: regionCoords[r.region]?.[1] || 34.9983,
                  name: `${t('business')}: ${r.name}`,
                  onClick: () => window.open(`https://waze.com/ul?q=${encodeURIComponent(r.address)}`, '_blank')
                }))
              ]} 
              title={`${t('businesses')} & ${t('liveLocation')}`}
            />
          )}

          {activeTab === 'heatmap' && (
            <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-3">
                <Flame className="w-5 h-5 text-orange-600" />
                <p className="text-sm text-orange-800 font-medium">{t('heatmapDesc') || 'Real-time order density map. Head to orange zones for more orders!'}</p>
              </div>
              <Map 
                heatmap
                locations={restaurants.map(r => ({ 
                  lat: 32.0853 + (Math.random() - 0.5) * 0.08,
                  lng: 34.7818 + (Math.random() - 0.5) * 0.08,
                  name: r.name
                }))} 
                title={t('orderDensity') || 'Order Density'}
              />
            </div>
          )}
          
          {activeTab === 'orders' && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold mb-4">{t('activeOrders')}</h3>
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">{t('noPendingOrders')}</div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-lg">{order.restaurant_name}</p>
                          <p className="text-sm text-gray-500">{order.restaurant_address}</p>
                        </div>
                        <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold uppercase">
                          {order.status}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                        <div>
                          <p className="text-xs text-gray-500">{t('deliverTo')}</p>
                          <p className="font-bold">{order.customer_name}</p>
                          <a 
                            href={`https://waze.com/ul?q=${encodeURIComponent(order.delivery_address)}`} 
                            target="_blank" 
                            className="text-xs text-blue-500 font-bold flex items-center gap-1 mt-1"
                          >
                            <MapPin className="w-3 h-3" /> {t('openWaze')}
                          </a>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'assigned' && (
                            <>
                              <button 
                                onClick={() => respondToOrder(order.id, 'reject')}
                                className="px-4 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-xl"
                              >
                                {t('reject')}
                              </button>
                              <button 
                                onClick={() => respondToOrder(order.id, 'accept')}
                                className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl"
                              >
                                {t('accept')}
                              </button>
                            </>
                          )}
                          {order.status === 'delivering' && (
                            <button 
                              onClick={() => updateStatus(order.id, 'completed')}
                              className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl"
                            >
                              {t('delivered')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-4">{t('performanceOverview')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-orange-50 rounded-2xl text-center">
                    <p className="text-xs text-orange-600 font-bold uppercase mb-1">{t('today')}</p>
                    <p className="text-3xl font-black text-orange-900">{performance?.today || 0}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl text-center">
                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">{t('thisWeek')}</p>
                    <p className="text-3xl font-black text-blue-900">{performance?.week || 0}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-2xl text-center">
                    <p className="text-xs text-green-600 font-bold uppercase mb-1">{t('thisMonth')}</p>
                    <p className="text-3xl font-black text-green-900">{performance?.month || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-4">{t('topBusinesses')}</h3>
                <div className="space-y-2">
                  {performance?.businessStats?.map((b: any, i: number) => (
                    <div key={i} className="flex justify-between p-4 bg-gray-50 rounded-2xl">
                      <span className="text-gray-600 font-bold">{b.business_name}</span>
                      <span className="font-black text-orange-600">{b.count} {t('ordersCount')}</span>
                    </div>
                  ))}
                  {(!performance?.businessStats || performance.businessStats.length === 0) && (
                    <p className="text-center py-8 text-gray-400 italic">{t('noBusinessData')}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-6">
          {/* Sidebar content if any */}
        </div>
      </div>
    </div>
  );
}

function BusinessDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [showEditRestaurant, setShowEditRestaurant] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<any>(null);
  const [onlineCouriers, setOnlineCouriers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'couriers'>('orders');
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<any>(null);
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);
  const [newRestaurantData, setNewRestaurantData] = useState({
    name: '',
    address: '',
    region: 'region_krayot',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
  });
  const [manualOrderData, setManualOrderData] = useState({
    address: '',
    total_price: '',
    customer_name: ''
  });

  const regions = [
    'region_krayot', 'region_haifa', 'region_ramat_yishai', 'region_tivon', 
    'region_atlit', 'region_migdal_haemek', 'region_acre', 'region_nahariya', 'region_karmiel'
  ];

  const fetchRestaurants = () => {
    if (user) {
      fetch(`/api/my-restaurants/${user.id}`)
        .then(res => res.json())
        .then(data => {
          setRestaurants(data);
          if (data.length > 0 && !selectedRestaurant) setSelectedRestaurant(data[0]);
        });
    }
  };

  const fetchOrders = () => {
    if (selectedRestaurant) {
      fetch(`/api/restaurants/${selectedRestaurant.id}/orders`)
        .then(res => res.json())
        .then(data => setOrders(data));
    }
  };

  const fetchMenu = () => {
    if (selectedRestaurant) {
      fetch(`/api/restaurants/${selectedRestaurant.id}/menu-all`)
        .then(res => res.json())
        .then(data => setMenuItems(data));
    }
  };

  const fetchCouriers = () => {
    fetch('/api/couriers/online')
      .then(res => res.json())
      .then(data => setOnlineCouriers(data));
  };

  useEffect(() => {
    fetchRestaurants();
    fetchCouriers();
    const interval = setInterval(() => {
      fetchOrders();
      fetchCouriers();
      if (activeTab === 'menu') fetchMenu();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, selectedRestaurant, activeTab]);

  const handleUpdateRestaurant = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant) return;
    const response = await fetch(`/api/restaurants/${editingRestaurant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingRestaurant)
    });
    if (response.ok) {
      setShowEditRestaurant(false);
      fetchRestaurants();
      if (selectedRestaurant?.id === editingRestaurant.id) {
        setSelectedRestaurant(editingRestaurant);
      }
    }
  };

  const handleManualOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant || !user) return;
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user.id, // Using business user as "customer" for manual orders
          restaurant_id: selectedRestaurant.id,
          total_price: parseFloat(manualOrderData.total_price) || 0,
          payment_method: 'cash',
          address: manualOrderData.address,
          customer_name: manualOrderData.customer_name || t('externalOrder'),
          is_external: true,
          items: []
        })
      });
      
      if (response.ok) {
        const order = await response.json();
        setShowManualOrderModal(false);
        setManualOrderData({ address: '', total_price: '', customer_name: '' });
        fetchOrders();
        // Automatically trigger dispatch for the new manual order
        setSelectedOrderForDispatch(order);
      }
    } catch (err) {
      alert('Failed to create manual order');
    }
  };

  const handleAddRestaurant = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const response = await fetch('/api/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newRestaurantData, owner_id: user.id })
    });
    if (response.ok) {
      setShowAddRestaurantModal(false);
      fetchRestaurants();
    }
  };

  const assignCourier = async (orderId: number, courierId: number) => {
    await fetch(`/api/orders/${orderId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courier_id: courierId })
    });
    setSelectedOrderForDispatch(null);
    fetchOrders();
  };

  const toggleMenuItem = async (itemId: number, currentStatus: boolean) => {
    await fetch(`/api/menu-items/${itemId}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !currentStatus })
    });
    fetchMenu();
  };

  const handleDeleteRestaurant = async (id: number) => {
    if (!confirm(t('confirmDelete') || 'Are you sure?')) return;
    try {
      const response = await fetch(`/api/restaurants/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchRestaurants();
        setSelectedRestaurant(null);
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Network error');
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRestaurant) return;
    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const items = await scanMenuImage(base64);
        for (const item of items) {
          await fetch('/api/menu-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, restaurant_id: selectedRestaurant.id })
          });
        }
        alert('Menu scanned and items added successfully!');
      } catch (err) {
        alert('Failed to scan menu');
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold">{t('business')}</h2>
          <button 
            onClick={() => {
              if (restaurants.length === 0) {
                setShowAddRestaurantModal(true);
                return;
              }
              setShowManualOrderModal(true);
            }}
            className="bg-brand-blue text-white px-6 py-2 rounded-xl font-bold hover:bg-brand-dark-blue transition-all shadow-lg flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            {t('requestExternalCourier')}
          </button>
        </div>
      </div>

      {showAddRestaurantModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">{t('addNewRestaurant')}</h3>
            <form onSubmit={handleAddRestaurant} className="space-y-4">
              <input 
                type="text" placeholder={t('restaurantName')} required
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue"
                value={newRestaurantData.name} onChange={e => setNewRestaurantData({...newRestaurantData, name: e.target.value})}
              />
              <input 
                type="text" placeholder={t('address')} required
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue"
                value={newRestaurantData.address} onChange={e => setNewRestaurantData({...newRestaurantData, address: e.target.value})}
              />
              <select 
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue"
                value={newRestaurantData.region} onChange={e => setNewRestaurantData({...newRestaurantData, region: e.target.value})}
              >
                {regions.map(r => <option key={r} value={r}>{t(r)}</option>)}
              </select>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('restaurantImage') || 'Restaurant Image'}</label>
                <div className="flex items-center gap-4">
                  {newRestaurantData.image_url && (
                    <img src={newRestaurantData.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-gray-100" referrerPolicy="no-referrer" />
                  )}
                  <label className="flex-1 cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 hover:border-orange-500 transition-all flex flex-col items-center justify-center gap-2">
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">{t('uploadImage') || 'Upload Image'}</span>
                    <input 
                      type="file" className="hidden" accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setNewRestaurantData({...newRestaurantData, image_url: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowAddRestaurantModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl">{t('create')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showManualOrderModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">{t('requestExternalCourier')}</h3>
            <form onSubmit={handleManualOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('deliveryAddress')}</label>
                <input 
                  type="text" placeholder={t('address')} required
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue"
                  value={manualOrderData.address} onChange={e => setManualOrderData({...manualOrderData, address: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('fullName')}</label>
                <input 
                  type="text" placeholder={t('fullName')}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue"
                  value={manualOrderData.customer_name} onChange={e => setManualOrderData({...manualOrderData, customer_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('orderValue')} (₪)</label>
                <input 
                  type="number" placeholder="0.00"
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue"
                  value={manualOrderData.total_price} onChange={e => setManualOrderData({...manualOrderData, total_price: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowManualOrderModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg">{t('dispatchOrder')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      
      {showEditRestaurant && editingRestaurant && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">{t('editRestaurant') || 'Edit Restaurant'}</h3>
            <form onSubmit={handleUpdateRestaurant} className="space-y-4">
              <input 
                type="text" placeholder={t('restaurantName')} required
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                value={editingRestaurant.name} onChange={e => setEditingRestaurant({...editingRestaurant, name: e.target.value})}
              />
              <input 
                type="text" placeholder={t('address')} required
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                value={editingRestaurant.address} onChange={e => setEditingRestaurant({...editingRestaurant, address: e.target.value})}
              />
              <select
                value={editingRestaurant.region}
                onChange={e => setEditingRestaurant({...editingRestaurant, region: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
              >
                {regions.map(region => (
                  <option key={region} value={region}>{t(region)}</option>
                ))}
              </select>
              <textarea 
                placeholder={t('description')}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                value={editingRestaurant.description} onChange={e => setEditingRestaurant({...editingRestaurant, description: e.target.value})}
              />
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t('restaurantImage') || 'Restaurant Image'}</label>
                <div className="flex items-center gap-4">
                  {editingRestaurant.image_url && (
                    <img src={editingRestaurant.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-gray-100" referrerPolicy="no-referrer" />
                  )}
                  <label className="flex-1 cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 hover:border-orange-500 transition-all flex flex-col items-center justify-center gap-2">
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">{t('uploadImage') || 'Upload Image'}</span>
                    <input 
                      type="file" className="hidden" accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setEditingRestaurant({...editingRestaurant, image_url: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowEditRestaurant(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl">{t('save') || 'Save'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        {(['orders', 'menu', 'couriers'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-2 font-bold text-sm transition-all relative ${
              activeTab === tab ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t(tab)}
            {activeTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 rounded-full" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {(activeTab === 'couriers' || selectedOrderForDispatch) && (
            <div className="space-y-6">
              <div className="relative">
                {selectedOrderForDispatch && (
                  <div className="absolute top-4 left-4 right-4 z-20 bg-orange-600 text-white p-4 rounded-2xl shadow-xl flex justify-between items-center">
                    <p className="font-bold text-sm">{t('selectCourier')} #{selectedOrderForDispatch.id}</p>
                    <button onClick={() => setSelectedOrderForDispatch(null)} className="text-xs underline">{t('cancel')}</button>
                  </div>
                )}
                <div className="bg-gray-900 rounded-[2rem] overflow-hidden h-96 relative border-4 border-white shadow-2xl">
                  <Map 
                    locations={[
                      ...onlineCouriers.map(c => ({ 
                        ...c, 
                        name: `${t('courier')}: ${c.name}`,
                        onClick: () => selectedOrderForDispatch && assignCourier(selectedOrderForDispatch.id, c.id)
                      })),
                      ...(selectedRestaurant ? [{
                        lat: regionCoords[selectedRestaurant.region]?.[0] || 32.8191,
                        lng: regionCoords[selectedRestaurant.region]?.[1] || 34.9983,
                        name: `${t('business')}: ${selectedRestaurant.name}`
                      }] : [])
                    ]} 
                    title={selectedOrderForDispatch ? t('dispatchOrder') : t('courier')} 
                  />
                </div>
              </div>

              {selectedOrderForDispatch && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-600" />
                    {t('availableCouriers') || 'Available Couriers'}
                  </h4>
                  <div className="space-y-3">
                    {onlineCouriers
                      .map(c => {
                        const restLat = regionCoords[selectedRestaurant?.region]?.[0] || 32.8191;
                        const restLng = regionCoords[selectedRestaurant?.region]?.[1] || 34.9983;
                        const dist = calculateDistance(c.lat, c.lng, restLat, restLng);
                        return { ...c, distance: dist };
                      })
                      .sort((a, b) => a.distance - b.distance)
                      .map((c, idx) => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                              {c.name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-sm">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.distance.toFixed(2)} km {t('away') || 'away'}</p>
                            </div>
                            {idx === 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-600 text-[10px] font-bold rounded-lg uppercase">
                                {t('closest') || 'Closest'}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => assignCourier(selectedOrderForDispatch.id, c.id)}
                            className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition-all"
                          >
                            {t('assign') || 'Assign'}
                          </button>
                        </div>
                      ))}
                    {onlineCouriers.length === 0 && (
                      <p className="text-center py-4 text-gray-400 text-sm">{t('noCouriersOnline')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && !selectedOrderForDispatch && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold mb-4">{t('activeOrders')}</h3>
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <p className="text-center py-8 text-gray-400">{t('noPendingOrders')}</p>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-lg">
                            {t('orderNumber')}{order.id}
                            {order.manual_customer_name && (
                              <span className="ms-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-md text-[10px] font-black uppercase align-middle">
                                {t('externalOrder')}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">{order.customer_name} - {order.customer_phone}</p>
                          <p className="text-xs text-gray-400 mt-1">{order.delivery_address}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-orange-600">₪{order.total_price}</p>
                          <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-bold uppercase mt-2 inline-block">
                            {order.status}
                          </span>
                        </div>
                      </div>

                      {order.status === 'pending' && (
                        <div className="pt-4 border-t border-gray-200 flex justify-end">
                          <button
                            onClick={() => setSelectedOrderForDispatch(order)}
                            className="px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4" /> {t('dispatchOrder')}
                          </button>
                        </div>
                      )}

                      {order.status === 'delivering' && (
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-xs font-bold text-green-600 mb-2 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {t('liveTrackingActive')}
                          </p>
                          <div className="h-32 rounded-xl bg-gray-100 overflow-hidden relative">
                            {/* Small inline map for tracking */}
                            <Map 
                              locations={onlineCouriers.filter(c => c.id === order.courier_id)} 
                              title="" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{t('menuManagement')}</h3>
                <label className="cursor-pointer bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {isScanning ? t('scanningMenu') : t('scanMenu')}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isScanning} />
                </label>
              </div>

              <div className="space-y-4">
                {menuItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-3xl">
                    <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400">{t('noMenuItems')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {menuItems.map(item => (
                      <div key={item.id} className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${item.is_available ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                        <div>
                          <p className="font-bold">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.category} - ₪{item.price}</p>
                        </div>
                        <button
                          onClick={() => toggleMenuItem(item.id, item.is_available)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                            item.is_available 
                              ? 'bg-green-100 text-green-600 hover:bg-red-100 hover:text-red-600' 
                              : 'bg-gray-200 text-gray-500 hover:bg-green-100 hover:text-green-600'
                          }`}
                        >
                          {item.is_available ? t('available') : t('disabled')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold mb-4">{t('myRestaurants')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {restaurants.map(r => (
                <div 
                  key={r.id} 
                  className={`p-4 rounded-2xl border transition-all relative group ${selectedRestaurant?.id === r.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'}`}
                >
                  <div className="cursor-pointer" onClick={() => setSelectedRestaurant(r)}>
                    <p className="font-bold">{r.name}</p>
                    <p className="text-sm text-gray-500">{r.address}</p>
                    <p className="text-[10px] text-orange-600 font-bold uppercase mt-1">{t(r.region)}</p>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRestaurant(r);
                        setShowEditRestaurant(true);
                      }}
                      className="p-2 bg-white rounded-xl shadow-sm hover:text-orange-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRestaurant(r.id);
                      }}
                      className="p-2 bg-white rounded-xl shadow-sm hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {selectedRestaurant && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold mb-4">{selectedRestaurant.name} - {t('scanMenu')}</h3>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl p-12">
                {isScanning ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Scanning menu with AI...</p>
                  </div>
                ) : (
                  <>
                    <Camera className="w-16 h-16 text-gray-300 mb-4" />
                    <label className="cursor-pointer bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors">
                      {t('scanMenu')}
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerOrders() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = () => {
    if (user) {
      fetch(`/api/orders/customer/${user.id}`)
        .then(res => res.json())
        .then(data => setOrders(data));
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [user]);

  if (selectedOrder) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => setSelectedOrder(null)} className="mb-6 text-orange-600 font-bold flex items-center gap-2">
          <MenuIcon className="w-4 h-4 rotate-180" /> {t('backToOrders') || 'Back to Orders'}
        </button>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">{selectedOrder.restaurant_name}</h2>
              <p className="text-gray-500">{selectedOrder.restaurant_address}</p>
            </div>
            <span className="px-4 py-2 bg-orange-100 text-orange-600 rounded-full font-bold uppercase text-sm">
              {selectedOrder.status}
            </span>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">{t('orderTracking') || 'Order Tracking'}</h3>
            <Map 
              locations={[
                { lat: 32.0853, lng: 34.7818, name: t('me') },
                ...(selectedOrder.courier_lat ? [{ lat: selectedOrder.courier_lat, lng: selectedOrder.courier_lng, name: t('courier') }] : [])
              ]} 
              title={t('liveTracking') || 'Live Tracking'}
            />
          </div>

          <div className="border-t border-gray-100 pt-8">
            <h3 className="text-xl font-bold mb-4">{t('orderDetails') || 'Order Details'}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('orderId') || 'Order ID'}</span>
                <span className="font-bold">#{selectedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('totalPrice') || 'Total Price'}</span>
                <span className="font-bold">₪{selectedOrder.total_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('paymentMethod')}</span>
                <span className="font-bold uppercase">{selectedOrder.payment_method}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8">{t('myOrders') || 'My Orders'}</h2>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">{t('noOrdersYet') || 'No orders yet.'}</div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-orange-200 transition-all cursor-pointer" onClick={() => setSelectedOrder(order)}>
              <div>
                <p className="font-bold text-lg">{order.restaurant_name}</p>
                <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                <p className="text-sm font-bold mt-1">₪{order.total_price}</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-bold uppercase">
                  {order.status}
                </span>
                <p className="text-xs text-gray-400 mt-2">{t('clickToTrack') || 'Click to track'}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<'home' | 'profile' | 'dashboard' | 'orders'>('home');

  useEffect(() => {
    if (user) {
      const socket = io();
      socket.on('connect', () => {
        socket.emit('join-room', `user_${user.id}`);
      });
      
      socket.on('new-order-assigned', (data) => {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(t('newOrder') || "New Order!", { 
            body: `${t('deliveryFrom') || "Delivery from"} ${data.restaurantName}`,
            icon: '/logo.png'
          });
        }
        // Also show a custom alert in-app
        alert(`${t('newOrder') || "New Order!"}: ${t('deliveryFrom') || "Delivery from"} ${data.restaurantName}`);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user, t]);

  const renderView = () => {
    if (currentView === 'profile') return <Profile />;
    if (currentView === 'orders') return <CustomerOrders />;
    
    if (currentView === 'dashboard') {
      if (user?.role === 'business') return <BusinessDashboard />;
      if (user?.role === 'courier') return <CourierDashboard />;
      if (user?.role === 'admin') return <AdminDashboard />;
    }
    
    return <Home />;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Header onNavigate={setCurrentView} currentView={currentView} />
      <div className="flex-1">
        {renderView()}
      </div>
      <Footer />
      <InstallPrompt />
    </div>
  );
}

const regionCoords: Record<string, [number, number]> = {
  region_haifa: [32.7940, 34.9896],
  region_krayot: [32.8333, 35.0667],
  region_ramat_yishai: [32.7042, 35.1667],
  region_tivon: [32.7167, 35.1167],
  region_atlit: [32.6833, 34.9333],
  region_migdal_haemek: [32.6722, 35.2417],
  region_acre: [32.9333, 35.0833],
  region_nahariya: [33.0033, 35.0917],
  region_karmiel: [32.9167, 35.2833]
};

function useGeolocation(enabled: boolean) {
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return location;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

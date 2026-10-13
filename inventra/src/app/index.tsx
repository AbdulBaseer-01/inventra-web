import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';

type Role = 'customer' | 'delivery_partner';
type CustomerTab = 'home' | 'search' | 'cart' | 'orders' | 'profile';
type PartnerTab = 'dashboard' | 'jobs' | 'earnings' | 'profile';

type Session = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  verificationStatus?: string;
  availability?: boolean;
};

type Store = {
  id: string;
  name: string;
  address: string;
  city: string;
  area: string;
  categoryId: string;
  location?: { latitude: number; longitude: number } | null;
};

type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  price: number;
  stock: number;
  discount?: { type: string; value: number } | null;
  store?: { id: string; name: string } | null;
};

type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  stock: number;
  imageUrl: string;
  storeId: string;
  storeName: string;
};

type Order = {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  address: string;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number; imageUrl?: string }[];
  store: { id: string; name: string };
};

type Address = {
  id: string;
  label: string;
  line: string;
  city: string;
  pincode: string;
};

const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000')
).replace(/\/$/, '');

const colors = {
  ink: '#15211c',
  muted: '#6d7a74',
  border: '#e5ebe7',
  background: '#f7faf8',
  card: '#ffffff',
  green: '#1f6d52',
  greenSoft: '#e4f4e8',
  lime: '#a7ed4b',
  dark: '#17231e',
  orange: '#f29b58',
};

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data as T;
}

function money(value: number) {
  return `₹${Math.round(value)}`;
}

function TabButton({
  icon,
  label,
  active,
  badge,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tabButton} onPress={onPress} accessibilityRole="button">
      <View style={[styles.tabIcon, active && styles.tabIconActive]}>
        <Text style={styles.tabIconText}>{icon}</Text>
        {!!badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const discountedPrice = product.discount?.type === 'percent'
    ? product.price * (1 - product.discount.value / 100)
    : product.discount?.type === 'amount'
      ? product.price - product.discount.value
      : product.price;

  return (
    <View style={styles.productCard}>
      <View style={styles.productImageWrap}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <Text style={styles.productPlaceholder}>🛒</Text>
        )}
        <TouchableOpacity style={styles.heartButton}><Text>♡</Text></TouchableOpacity>
      </View>
      <Text style={styles.productCategory}>{product.category}</Text>
      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
      {!!product.store?.name && <Text style={styles.productStore} numberOfLines={1}>{product.store.name}</Text>}
      <View style={styles.productFooter}>
        <View>
          <Text style={styles.price}>{money(discountedPrice)}</Text>
          {discountedPrice !== product.price && <Text style={styles.oldPrice}>{money(product.price)}</Text>}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AuthScreen({
  role,
  setRole,
  authMode,
  setAuthMode,
  loading,
  customerForm,
  setCustomerForm,
  deliveryForm,
  setDeliveryForm,
  onCustomerSubmit,
  onDeliverySubmit,
}: {
  role: Role;
  setRole: (role: Role) => void;
  authMode: 'login' | 'signup';
  setAuthMode: (mode: 'login' | 'signup') => void;
  loading: boolean;
  customerForm: Record<string, string>;
  setCustomerForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  deliveryForm: Record<string, string>;
  setDeliveryForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onCustomerSubmit: () => void;
  onDeliverySubmit: () => void;
}) {
  const customer = (key: string, placeholder: string, secure = false) => (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#7a8781"
      value={customerForm[key]}
      secureTextEntry={secure}
      autoCapitalize={key === 'email' ? 'none' : 'sentences'}
      onChangeText={(value) => setCustomerForm((current) => ({ ...current, [key]: value }))}
      style={styles.input}
    />
  );
  const partner = (key: string, placeholder: string, secure = false) => (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#7a8781"
      value={deliveryForm[key]}
      secureTextEntry={secure}
      autoCapitalize={key === 'email' || key === 'documentUrl' ? 'none' : 'sentences'}
      onChangeText={(value) => setDeliveryForm((current) => ({ ...current, [key]: value }))}
      style={styles.input}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>inventra<Text style={styles.brandDot}>.</Text></Text>
        <Text style={styles.authTitle}>{role === 'customer' ? 'Shop your everyday.' : 'Move with purpose.'}</Text>
        <Text style={styles.authSubtitle}>
          {role === 'customer' ? 'Fresh groceries from stores around you.' : 'Deliver orders, earn on your schedule.'}
        </Text>
        <View style={styles.segment}>
          <TouchableOpacity onPress={() => { setRole('customer'); setAuthMode('login'); }} style={[styles.segmentItem, role === 'customer' && styles.segmentActive]}>
            <Text style={[styles.segmentText, role === 'customer' && styles.segmentTextActive]}>Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setRole('delivery_partner'); setAuthMode('login'); }} style={[styles.segmentItem, role === 'delivery_partner' && styles.segmentActive]}>
            <Text style={[styles.segmentText, role === 'delivery_partner' && styles.segmentTextActive]}>Partner</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.authCard}>
          <View style={styles.authModeRow}>
            <TouchableOpacity onPress={() => setAuthMode('login')}><Text style={[styles.authMode, authMode === 'login' && styles.authModeActive]}>Sign in</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setAuthMode('signup')}><Text style={[styles.authMode, authMode === 'signup' && styles.authModeActive]}>Create account</Text></TouchableOpacity>
          </View>
          {role === 'customer' ? (
            <>
              {authMode === 'signup' && <>{customer('name', 'Full name')}{customer('username', 'Username')}{customer('phone', 'Phone number')}</>}
              {customer('email', 'Email address')}
              {customer('password', 'Password', true)}
              <TouchableOpacity style={styles.primaryButton} onPress={onCustomerSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{authMode === 'signup' ? 'Create customer account' : 'Sign in'}</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {authMode === 'signup' && <>{partner('fullName', 'Full name')}{partner('phone', 'Phone number')}{partner('dateOfBirth', 'Date of birth (YYYY-MM-DD)')}{partner('operatingArea', 'Operating area')}{partner('address', 'Address')}{partner('documentUrl', 'Supporting document URL')}</>}
              {partner('email', 'Email address')}
              {partner('password', 'Password', true)}
              <TouchableOpacity style={styles.primaryButton} onPress={onDeliverySubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{authMode === 'signup' ? 'Apply as partner' : 'Partner sign in'}</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function InventraApp() {
  const [role, setRole] = useState<Role>('customer');
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('home');
  const [customerTab, setCustomerTab] = useState<CustomerTab>('home');
  const [partnerTab, setPartnerTab] = useState<PartnerTab>('dashboard');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddressEditor, setShowAddressEditor] = useState(false);
  const [addressDraft, setAddressDraft] = useState({ label: 'Home', line: '', city: '', pincode: '' });
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [customerForm, setCustomerForm] = useState<Record<string, string>>({ name: '', email: '', phone: '', username: '', password: '' });
  const [deliveryForm, setDeliveryForm] = useState<Record<string, string>>({ fullName: '', email: '', phone: '', password: '', dateOfBirth: '2000-01-01', address: '', operatingArea: '', documentUrl: '' });

  const categories = ['All', ...Array.from(new Set(products.map((product) => product.category))).slice(0, 6)];
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.name} ${product.category} ${product.store?.name || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (selectedCategory === 'All' || product.category === selectedCategory);
  }), [products, search, selectedCategory]);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= 500 ? 0 : cart.length ? 40 : 0;
  const total = subtotal + deliveryFee;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);

  useEffect(() => { void bootstrap(); }, []);

  async function bootstrap() {
    const savedAddresses = await SecureStore.getItemAsync('inventra_addresses');
    if (savedAddresses) setAddresses(JSON.parse(savedAddresses));
    await loadCatalog();
    const storedToken = await SecureStore.getItemAsync('inventra_token');
    const storedRole = await SecureStore.getItemAsync('inventra_role') as Role | null;
    if (!storedToken) return;
    try {
      const route = storedRole === 'delivery_partner' ? '/api/delivery-partners/me' : '/api/auth/me';
      const response = await request<{ user?: Session; profile?: Session }>(route, {}, storedToken);
      setToken(storedToken);
      setRole(storedRole || 'customer');
      setSession(response.user || response.profile || null);
      if (storedRole === 'delivery_partner') await loadAssignments(storedToken);
      else await loadOrders(storedToken);
    } catch {
      await logout();
    }
  }

  async function loadCatalog() {
    try {
      const [storeResponse, productResponse] = await Promise.all([
        request<{ stores: Store[] }>('/api/public/stores'),
        request<{ products: Product[] }>('/api/public/products'),
      ]);
      setStores(storeResponse.stores || []);
      setProducts(productResponse.products || []);
    } catch {
      setStores([]);
      setProducts([]);
    }
  }

  async function loadOrders(authToken = token) {
    if (!authToken) return;
    try {
      const response = await request<{ orders: Order[] }>('/api/public/orders', {}, authToken);
      setOrders(response.orders || []);
    } catch (error) {
      Alert.alert('Orders unavailable', error instanceof Error ? error.message : 'Could not load orders');
    }
  }

  async function loadAssignments(authToken = token) {
    if (!authToken) return;
    try {
      const response = await request<{ assignments: any[] }>('/api/delivery-partners/assignments', {}, authToken);
      setAssignments(response.assignments || []);
    } catch {
      setAssignments([]);
    }
  }

  async function saveSessionData(authToken: string, authRole: Role) {
    setToken(authToken);
    await SecureStore.setItemAsync('inventra_token', authToken);
    await SecureStore.setItemAsync('inventra_role', authRole);
  }

  async function logout() {
    setSession(null);
    setToken(null);
    setCart([]);
    await SecureStore.deleteItemAsync('inventra_token');
    await SecureStore.deleteItemAsync('inventra_role');
  }

  async function handleCustomerSubmit() {
    if (!customerForm.email || !customerForm.password) return Alert.alert('Missing details', 'Enter your email and password.');
    setLoading(true);
    try {
      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const normalizedPhone = (customerForm.phone || '').replace(/\D/g, '').replace(/^91/, '');
      const response = await request<{ user?: Session; token?: string; message?: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(authMode === 'signup' ? {
          name: customerForm.name || customerForm.email.split('@')[0],
          username: customerForm.username || customerForm.email.split('@')[0],
          email: customerForm.email.trim(),
          phone: normalizedPhone,
          password: customerForm.password,
          role: 'customer',
        } : { email: customerForm.email.trim(), password: customerForm.password }),
      });
      if (authMode === 'signup') {
        Alert.alert('Account created', response.message || 'Verify your email, then sign in.');
        setAuthMode('login');
      } else if (response.user && response.token) {
        await saveSessionData(response.token, 'customer');
        setSession(response.user);
        setRole('customer');
        await loadOrders(response.token);
      }
    } catch (error) {
      Alert.alert('Customer auth failed', error instanceof Error ? error.message : 'Unable to sign in');
    } finally { setLoading(false); }
  }

  async function handleDeliverySubmit() {
    setLoading(true);
    try {
      const endpoint = authMode === 'signup' ? '/api/delivery-partners/register' : '/api/delivery-partners/login';
      const response = await request<{ token?: string; profile?: Session; message?: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(authMode === 'signup' ? deliveryForm : { email: deliveryForm.email, password: deliveryForm.password }),
      });
      if (authMode === 'signup') {
        Alert.alert('Application submitted', response.message || 'Your application is pending review.');
        setAuthMode('login');
      } else if (response.profile && response.token) {
        await saveSessionData(response.token, 'delivery_partner');
        setSession(response.profile);
        setRole('delivery_partner');
        await loadAssignments(response.token);
      }
    } catch (error) {
      Alert.alert('Partner auth failed', error instanceof Error ? error.message : 'Unable to sign in');
    } finally { setLoading(false); }
  }

  function addToCart(product: Product) {
    if (!product.store?.id) return Alert.alert('Unavailable', 'This product has no store reference.');
    const store = product.store;
    const storeId = store.id;
    const hasOtherStore = cart.some((item) => item.storeId !== storeId);
    if (hasOtherStore) return Alert.alert('One store per order', 'Clear your cart before adding items from another store.');
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) return current.map((item) => item.productId === product.id ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) } : item);
      return [...current, { productId: product.id, name: product.name, quantity: 1, price: product.price, stock: product.stock, imageUrl: product.imageUrl, storeId, storeName: store.name }];
    });
    setCustomerTab('cart');
  }

  function updateQuantity(productId: string, amount: number) {
    setCart((current) => current.map((item) => item.productId === productId ? { ...item, quantity: Math.max(0, Math.min(item.stock, item.quantity + amount)) } : item).filter((item) => item.quantity > 0));
  }

  async function checkout() {
    if (!token || !cart.length) return Alert.alert('Your cart is empty', 'Add products before checkout.');
    if (!selectedAddress) return Alert.alert('Add an address', 'Choose or add a delivery address first.');
    setLoading(true);
    try {
      await request('/api/public/orders', {
        method: 'POST',
        body: JSON.stringify({ items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })), deliveryAddress: `${selectedAddress.line}, ${selectedAddress.city} - ${selectedAddress.pincode}` }),
      }, token);
      setCart([]);
      await loadOrders(token);
      await loadCatalog();
      setCustomerTab('orders');
      Alert.alert('Order placed', 'Your order has been sent to the store. Payment: Cash on delivery.');
    } catch (error) {
      Alert.alert('Checkout failed', error instanceof Error ? error.message : 'Unable to place order');
    } finally { setLoading(false); }
  }

  async function saveAddress() {
    if (!addressDraft.line || !addressDraft.city || !addressDraft.pincode) return Alert.alert('Missing address', 'Complete the address details.');
    const next = [...addresses.filter((address) => address.id !== selectedAddressId), { id: selectedAddressId || String(Date.now()), ...addressDraft }];
    setAddresses(next);
    setSelectedAddressId(next[next.length - 1].id);
    await SecureStore.setItemAsync('inventra_addresses', JSON.stringify(next));
    setShowAddressEditor(false);
  }

  if (!session) {
    return <AuthScreen role={role} setRole={setRole} authMode={authMode} setAuthMode={setAuthMode} loading={loading} customerForm={customerForm} setCustomerForm={setCustomerForm} deliveryForm={deliveryForm} setDeliveryForm={setDeliveryForm} onCustomerSubmit={handleCustomerSubmit} onDeliverySubmit={handleDeliverySubmit} />;
  }

  if (role === 'delivery_partner') {
    return <PartnerApp session={session} assignments={assignments} tab={partnerTab} setTab={setPartnerTab} token={token} loadAssignments={() => loadAssignments()} logout={logout} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
          {customerTab === 'home' && <CustomerHome session={session} stores={stores} products={filteredProducts} categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} setSearch={setSearch} onAdd={addToCart} setTab={setCustomerTab} />}
          {customerTab === 'search' && <SearchScreen search={search} setSearch={setSearch} products={filteredProducts} categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} onAdd={addToCart} />}
          {customerTab === 'cart' && <CartScreen cart={cart} subtotal={subtotal} deliveryFee={deliveryFee} total={total} addresses={addresses} selectedAddress={selectedAddress} selectedAddressId={selectedAddressId} setSelectedAddressId={setSelectedAddressId} updateQuantity={updateQuantity} checkout={checkout} loading={loading} showAddressEditor={showAddressEditor} setShowAddressEditor={setShowAddressEditor} addressDraft={addressDraft} setAddressDraft={setAddressDraft} saveAddress={saveAddress} />}
          {customerTab === 'orders' && <OrdersScreen orders={orders} refresh={() => loadOrders()} />}
          {customerTab === 'profile' && <CustomerProfile session={session} addresses={addresses} logout={logout} />}
        </ScrollView>
        <View style={styles.tabBar}>
          <TabButton icon="⌂" label="Home" active={customerTab === 'home'} onPress={() => setCustomerTab('home')} />
          <TabButton icon="⌕" label="Search" active={customerTab === 'search'} onPress={() => setCustomerTab('search')} />
          <TabButton icon="▢" label="Cart" badge={cartCount} active={customerTab === 'cart'} onPress={() => setCustomerTab('cart')} />
          <TabButton icon="◷" label="Orders" active={customerTab === 'orders'} onPress={() => setCustomerTab('orders')} />
          <TabButton icon="○" label="Profile" active={customerTab === 'profile'} onPress={() => setCustomerTab('profile')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function CustomerHome({ session, stores, products, categories, selectedCategory, setSelectedCategory, setSearch, onAdd, setTab }: any) {
  return (
    <>
      <View style={styles.homeHeader}><View><Text style={styles.smallLabel}>DELIVERING TO</Text><Text style={styles.locationText}>Home <Text style={styles.chevron}>⌄</Text></Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{(session.name || 'I')[0].toUpperCase()}</Text></View></View>
      <View style={styles.searchBar}><Text style={styles.searchIcon}>⌕</Text><TextInput placeholder="Search products, stores..." placeholderTextColor={colors.muted} style={styles.searchInput} onFocus={() => setTab('search')} onChangeText={setSearch} /></View>
      <View style={styles.hero}><View><Text style={styles.heroEyebrow}>FRESH EVERY DAY</Text><Text style={styles.heroTitle}>Good food.{'\n'}Good mood.</Text><TouchableOpacity style={styles.heroButton} onPress={() => setTab('search')}><Text style={styles.heroButtonText}>Shop now  →</Text></TouchableOpacity></View><Text style={styles.heroEmoji}>🥬</Text></View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Shop by category</Text><Text style={styles.seeAll} onPress={() => setTab('search')}>See all</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>{categories.map((category: string) => <TouchableOpacity key={category} style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]} onPress={() => { setSelectedCategory(category); setTab('search'); }}><Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>{category}</Text></TouchableOpacity>)}</ScrollView>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Stores near you</Text><Text style={styles.seeAll}>{stores.length} available</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>{stores.slice(0, 5).map((store: Store) => <View key={store.id} style={styles.storeCard}><View style={styles.storeIcon}><Text>🏪</Text></View><Text style={styles.storeName} numberOfLines={1}>{store.name}</Text><Text style={styles.storeMeta}>{store.area || store.city || 'Nearby store'}</Text></View>)}</ScrollView>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Popular near you</Text><Text style={styles.seeAll} onPress={() => setTab('search')}>See all</Text></View>
      <View style={styles.productGrid}>{products.slice(0, 6).map((product: Product) => <ProductCard key={product.id} product={product} onAdd={() => onAdd(product)} />)}</View>
    </>
  );
}

function SearchScreen({ search, setSearch, products, categories, selectedCategory, setSelectedCategory, onAdd }: any) {
  return <><Text style={styles.pageTitle}>Explore products</Text><View style={styles.searchBar}><Text style={styles.searchIcon}>⌕</Text><TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Search products..." placeholderTextColor={colors.muted} style={styles.searchInput} /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>{categories.map((category: string) => <TouchableOpacity key={category} style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]} onPress={() => setSelectedCategory(category)}><Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>{category}</Text></TouchableOpacity>)}</ScrollView><Text style={styles.resultCount}>{products.length} products</Text><View style={styles.productGrid}>{products.map((product: Product) => <ProductCard key={product.id} product={product} onAdd={() => onAdd(product)} />)}</View></>;
}

function CartScreen({ cart, subtotal, deliveryFee, total, addresses, selectedAddress, selectedAddressId, setSelectedAddressId, updateQuantity, checkout, loading, showAddressEditor, setShowAddressEditor, addressDraft, setAddressDraft, saveAddress }: any) {
  return <><Text style={styles.pageTitle}>Your cart</Text>{cart.length === 0 ? <EmptyState icon="🛍️" title="Your cart is empty" description="Add something delicious from the home tab." /> : <><View style={styles.storeBanner}><Text style={styles.storeBannerIcon}>🏪</Text><View><Text style={styles.smallLabel}>ORDERING FROM</Text><Text style={styles.storeBannerName}>{cart[0].storeName}</Text></View></View>{cart.map((item: CartItem) => <View key={item.productId} style={styles.cartRow}><View style={styles.cartImage}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.cartImageActual} /> : <Text>🛒</Text>}</View><View style={styles.cartInfo}><Text style={styles.cartName}>{item.name}</Text><Text style={styles.cartPrice}>{money(item.price)}</Text><View style={styles.quantity}><TouchableOpacity onPress={() => updateQuantity(item.productId, -1)}><Text style={styles.quantityButton}>−</Text></TouchableOpacity><Text style={styles.quantityValue}>{item.quantity}</Text><TouchableOpacity onPress={() => updateQuantity(item.productId, 1)}><Text style={styles.quantityButton}>+</Text></TouchableOpacity></View></View></View>)}<View style={styles.addressHeading}><Text style={styles.sectionTitle}>Delivery address</Text><TouchableOpacity onPress={() => { setAddressDraft(selectedAddress || { label: 'Home', line: '', city: '', pincode: '' }); setShowAddressEditor(true); }}><Text style={styles.editText}>Edit</Text></TouchableOpacity></View>{addresses.length ? <View style={styles.addressList}>{addresses.map((address: Address) => <TouchableOpacity key={address.id} style={[styles.addressCard, selectedAddressId === address.id && styles.addressSelected]} onPress={() => setSelectedAddressId(address.id)}><Text style={styles.addressRadio}>{selectedAddressId === address.id ? '●' : '○'}</Text><View><Text style={styles.addressLabel}>{address.label}</Text><Text style={styles.addressText}>{address.line}, {address.city} - {address.pincode}</Text></View></TouchableOpacity>)}</View> : <TouchableOpacity style={styles.addAddressButton} onPress={() => setShowAddressEditor(true)}><Text style={styles.addAddressText}>＋ Add delivery address</Text></TouchableOpacity>}{showAddressEditor && <View style={styles.editor}><TextInput placeholder="Label (Home, Work)" placeholderTextColor={colors.muted} style={styles.input} value={addressDraft.label} onChangeText={(value) => setAddressDraft({ ...addressDraft, label: value })} /><TextInput placeholder="House / street / area" placeholderTextColor={colors.muted} style={styles.input} value={addressDraft.line} onChangeText={(value) => setAddressDraft({ ...addressDraft, line: value })} /><View style={styles.twoInputs}><TextInput placeholder="City" placeholderTextColor={colors.muted} style={[styles.input, styles.halfInput]} value={addressDraft.city} onChangeText={(value) => setAddressDraft({ ...addressDraft, city: value })} /><TextInput placeholder="Pincode" placeholderTextColor={colors.muted} style={[styles.input, styles.halfInput]} value={addressDraft.pincode} onChangeText={(value) => setAddressDraft({ ...addressDraft, pincode: value })} /></View><TouchableOpacity style={styles.primaryButton} onPress={saveAddress}><Text style={styles.primaryButtonText}>Save address</Text></TouchableOpacity></View>}<View style={styles.bill}><Text style={styles.billTitle}>Bill details</Text><BillRow label="Subtotal" value={money(subtotal)} /><BillRow label="Delivery fee" value={deliveryFee ? money(deliveryFee) : 'FREE'} /><View style={styles.billTotal}><Text style={styles.billTotalText}>To pay</Text><Text style={styles.billTotalText}>{money(total)}</Text></View></View><TouchableOpacity style={styles.checkoutButton} onPress={checkout} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutText}>Place order  •  {money(total)}</Text>}</TouchableOpacity></>}</>;
}

function BillRow({ label, value }: { label: string; value: string }) { return <View style={styles.billRow}><Text style={styles.mutedText}>{label}</Text><Text style={styles.billValue}>{value}</Text></View>; }

function OrdersScreen({ orders, refresh }: { orders: Order[]; refresh: () => void }) {
  return <><View style={styles.pageHeaderRow}><Text style={styles.pageTitle}>Your orders</Text><TouchableOpacity onPress={refresh}><Text style={styles.editText}>Refresh</Text></TouchableOpacity></View>{orders.length === 0 ? <EmptyState icon="📦" title="No orders yet" description="Your placed orders will appear here." /> : orders.map((order) => <View key={order.id} style={styles.orderCard}><View style={styles.orderTop}><View><Text style={styles.orderStore}>{order.store.name}</Text><Text style={styles.mutedText}>{new Date(order.createdAt).toLocaleDateString()}</Text></View><View style={styles.statusPill}><Text style={styles.statusText}>{order.status.replaceAll('_', ' ')}</Text></View></View><Text style={styles.orderItems}>{order.items.map((item) => `${item.name} ×${item.quantity}`).join('  •  ')}</Text><View style={styles.orderBottom}><Text style={styles.orderTotal}>{money(order.total)}</Text><Text style={styles.mutedText}>{order.address}</Text></View></View>)}</>;
}

function CustomerProfile({ session, addresses, logout }: { session: Session; addresses: Address[]; logout: () => void }) {
  return <><Text style={styles.pageTitle}>Profile</Text><View style={styles.profileCard}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{(session.name || 'I')[0].toUpperCase()}</Text></View><Text style={styles.profileName}>{session.name}</Text><Text style={styles.mutedText}>{session.email}</Text></View><View style={styles.menuCard}><Text style={styles.menuTitle}>Account</Text><Text style={styles.menuRow}>📍  Saved addresses <Text style={styles.menuValue}>{addresses.length}</Text></Text><Text style={styles.menuRow}>🔔  Notifications</Text><Text style={styles.menuRow}>❓  Help and support</Text><Text style={styles.menuRow}>🔒  Privacy and security</Text></View><TouchableOpacity style={styles.logoutAction} onPress={logout}><Text style={styles.logoutText}>Sign out</Text></TouchableOpacity></>;
}

function PartnerApp({ session, assignments, tab, setTab, token, loadAssignments, logout }: any) {
  const accept = async (id: string) => {
    try { await request(`/api/delivery-partners/assignments/${id}`, { method: 'PATCH' }, token); await loadAssignments(); Alert.alert('Job accepted', 'The pickup is now assigned to you.'); } catch (error) { Alert.alert('Could not accept', error instanceof Error ? error.message : 'Try again'); }
  };
  return <SafeAreaView style={styles.safeArea}><StatusBar style="light" /><View style={styles.partnerApp}><ScrollView contentContainerStyle={styles.screenContent}>{tab === 'dashboard' && <><View style={styles.partnerHeader}><View><Text style={styles.partnerGreeting}>Good morning,</Text><Text style={styles.partnerName}>{session.name}</Text></View><View style={styles.partnerAvatar}><Text>🚴</Text></View></View><View style={styles.earningsHero}><Text style={styles.partnerEyebrow}>TODAY'S EARNINGS</Text><Text style={styles.earningsAmount}>₹0</Text><Text style={styles.partnerMuted}>Complete your first delivery to start earning</Text></View><Text style={styles.partnerSectionTitle}>Your status</Text><View style={styles.availabilityCard}><View style={styles.onlineDot} /><View style={{ flex: 1 }}><Text style={styles.availabilityTitle}>You're offline</Text><Text style={styles.partnerMuted}>Go online to receive delivery requests</Text></View><TouchableOpacity style={styles.goOnline}><Text style={styles.goOnlineText}>Go online</Text></TouchableOpacity></View><Text style={styles.partnerSectionTitle}>Quick stats</Text><View style={styles.statsRow}><Stat label="Deliveries" value="0" /><Stat label="Hours online" value="0h" /><Stat label="Rating" value="—" /></View></>}{tab === 'jobs' && <><Text style={styles.partnerPageTitle}>Available jobs</Text>{session.verificationStatus !== 'approved' ? <EmptyState dark icon="✓" title="Verification pending" description="Your profile must be approved before you can accept delivery jobs." /> : assignments.length === 0 ? <EmptyState dark icon="⌁" title="No jobs nearby" description="Stay online and we will show new requests here." /> : assignments.map((job: any) => <View key={job.id} style={styles.jobCard}><View style={styles.jobTop}><View style={styles.jobIcon}><Text>📦</Text></View><View style={{ flex: 1 }}><Text style={styles.jobStore}>{job.storeName}</Text><Text style={styles.partnerMuted}>{job.items} items  •  {job.distance}</Text></View><Text style={styles.jobPay}>{money(job.total)}</Text></View><View style={styles.route}><Text style={styles.routeDot}>●</Text><Text style={styles.routeText}>Pick up from {job.pickup}</Text><Text style={styles.routeArrow}>↓</Text><Text style={styles.routeDotOrange}>●</Text><Text style={styles.routeText}>{job.address}</Text></View><TouchableOpacity style={styles.acceptButton} onPress={() => accept(job.id)}><Text style={styles.acceptText}>Accept delivery</Text></TouchableOpacity></View>)}</>}{tab === 'earnings' && <><Text style={styles.partnerPageTitle}>Earnings</Text><View style={styles.earningsPanel}><Text style={styles.partnerMuted}>This week</Text><Text style={styles.bigEarnings}>₹0.00</Text><Text style={styles.partnerMuted}>No completed deliveries yet</Text></View></>}{tab === 'profile' && <><Text style={styles.partnerPageTitle}>Partner profile</Text><View style={styles.partnerProfile}><View style={styles.partnerAvatarLarge}><Text style={{ fontSize: 28 }}>🚴</Text></View><Text style={styles.partnerProfileName}>{session.name}</Text><Text style={styles.partnerMuted}>{session.email}</Text><Text style={styles.verificationTag}>{session.verificationStatus || 'pending'} verification</Text></View><TouchableOpacity style={styles.partnerLogout} onPress={logout}><Text style={styles.partnerLogoutText}>Sign out</Text></TouchableOpacity></>}</ScrollView><View style={styles.partnerTabBar}><TabButton icon="⌂" label="Dashboard" active={tab === 'dashboard'} onPress={() => setTab('dashboard')} /><TabButton icon="⌁" label="Jobs" active={tab === 'jobs'} badge={assignments.length} onPress={() => { setTab('jobs'); void loadAssignments(); }} /><TabButton icon="₹" label="Earnings" active={tab === 'earnings'} onPress={() => setTab('earnings')} /><TabButton icon="○" label="Profile" active={tab === 'profile'} onPress={() => setTab('profile')} /></View></View></SafeAreaView>;
}

function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.partnerMuted}>{label}</Text></View>; }
function EmptyState({ icon, title, description, dark = false }: { icon: string; title: string; description: string; dark?: boolean }) { return <View style={[styles.emptyState, dark && styles.emptyStateDark]}><Text style={styles.emptyIcon}>{icon}</Text><Text style={[styles.emptyTitle, dark && styles.darkText]}>{title}</Text><Text style={[styles.emptyDescription, dark && styles.partnerMuted]}>{description}</Text></View>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  app: { flex: 1 },
  screenContent: { padding: 18, paddingBottom: 110 },
  brand: { fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: -1 },
  brandDot: { color: colors.lime },
  authContainer: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  authTitle: { marginTop: 44, fontSize: 34, lineHeight: 39, fontWeight: '800', color: colors.ink },
  authSubtitle: { marginTop: 10, color: colors.muted, fontSize: 16, lineHeight: 23 },
  segment: { flexDirection: 'row', backgroundColor: '#e8efeb', padding: 4, borderRadius: 14, marginTop: 28 },
  segmentItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 11 },
  segmentActive: { backgroundColor: colors.dark },
  segmentText: { color: colors.muted, fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
  authCard: { backgroundColor: colors.card, borderRadius: 20, padding: 18, marginTop: 15, borderWidth: 1, borderColor: colors.border },
  authModeRow: { flexDirection: 'row', gap: 26, marginBottom: 16 },
  authMode: { color: colors.muted, fontSize: 15, fontWeight: '700', paddingBottom: 8 },
  authModeActive: { color: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.lime },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fbfdfb', color: colors.ink, paddingHorizontal: 13, paddingVertical: 13, marginBottom: 10 },
  primaryButton: { backgroundColor: colors.green, borderRadius: 13, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  smallLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  locationText: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 4 },
  chevron: { color: colors.green },
  avatar: { backgroundColor: colors.lime, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.dark, fontSize: 18, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 15, marginBottom: 18 },
  searchIcon: { fontSize: 25, color: colors.muted, marginRight: 8 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14 },
  hero: { backgroundColor: colors.dark, borderRadius: 20, padding: 20, minHeight: 172, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden' },
  heroEyebrow: { color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '800', marginTop: 8 },
  heroButton: { backgroundColor: colors.lime, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, alignSelf: 'flex-start', marginTop: 15 },
  heroButtonText: { color: colors.dark, fontWeight: '800', fontSize: 12 },
  heroEmoji: { fontSize: 76, alignSelf: 'center', transform: [{ rotate: '-12deg' }] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  seeAll: { color: colors.green, fontWeight: '700', fontSize: 12 },
  horizontalList: { marginHorizontal: -18, paddingLeft: 18 },
  categoryChip: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 },
  categoryChipActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  categoryText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  categoryTextActive: { color: '#fff' },
  storeCard: { width: 128, backgroundColor: colors.card, borderRadius: 16, padding: 12, marginRight: 10, borderWidth: 1, borderColor: colors.border },
  storeIcon: { backgroundColor: colors.greenSoft, width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  storeName: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  storeMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  productCard: { width: '48%', backgroundColor: colors.card, borderRadius: 16, padding: 9, borderWidth: 1, borderColor: colors.border, marginBottom: 2 },
  productImageWrap: { height: 130, backgroundColor: '#eef4f0', borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  productImage: { width: '100%', height: '100%' },
  productPlaceholder: { fontSize: 38 },
  heartButton: { position: 'absolute', right: 7, top: 7, backgroundColor: '#ffffffdd', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  productCategory: { color: colors.muted, fontSize: 10, marginTop: 9, textTransform: 'uppercase' },
  productName: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 18, marginTop: 3 },
  productStore: { color: colors.muted, fontSize: 10, marginTop: 3 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 },
  price: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  oldPrice: { color: colors.muted, fontSize: 10, textDecorationLine: 'line-through' },
  addButton: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: colors.dark, fontSize: 22, lineHeight: 23, fontWeight: '500' },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 78, backgroundColor: '#ffffffee', borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 9 },
  tabButton: { alignItems: 'center', minWidth: 54 },
  tabIcon: { minWidth: 34, height: 30, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: colors.lime, paddingHorizontal: 12 },
  tabIconText: { color: colors.ink, fontSize: 20 },
  tabLabel: { color: colors.muted, fontSize: 10, marginTop: 3 },
  tabLabelActive: { color: colors.ink, fontWeight: '800' },
  badge: { position: 'absolute', right: -5, top: -6, backgroundColor: '#e9654b', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  pageTitle: { color: colors.ink, fontSize: 28, fontWeight: '800', marginBottom: 18 },
  resultCount: { color: colors.muted, fontSize: 12, marginVertical: 18 },
  storeBanner: { flexDirection: 'row', backgroundColor: colors.greenSoft, borderRadius: 15, padding: 13, alignItems: 'center', marginBottom: 12 },
  storeBannerIcon: { fontSize: 26, marginRight: 10 },
  storeBannerName: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 3 },
  cartRow: { backgroundColor: colors.card, borderRadius: 15, padding: 11, flexDirection: 'row', marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cartImage: { width: 76, height: 76, borderRadius: 12, backgroundColor: '#eef4f0', alignItems: 'center', justifyContent: 'center' },
  cartImageActual: { width: '100%', height: '100%', borderRadius: 12 },
  cartInfo: { flex: 1, marginLeft: 12 },
  cartName: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  cartPrice: { color: colors.green, fontWeight: '800', marginTop: 7 },
  quantity: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-end' },
  quantityButton: { color: colors.green, fontSize: 24, fontWeight: '700', paddingHorizontal: 10 },
  quantityValue: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  addressHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  editText: { color: colors.green, fontWeight: '800', fontSize: 13 },
  addressCard: { flexDirection: 'row', gap: 12, padding: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.card, marginBottom: 8 },
  addressSelected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  addressRadio: { color: colors.green, fontSize: 18 },
  addressLabel: { color: colors.ink, fontWeight: '800' },
  addressText: { color: colors.muted, fontSize: 12, marginTop: 4, maxWidth: 270 },
  addAddressButton: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.green, borderRadius: 13, padding: 15, alignItems: 'center' },
  addAddressText: { color: colors.green, fontWeight: '800' },
  editor: { backgroundColor: colors.card, borderRadius: 14, padding: 12, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  twoInputs: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  bill: { backgroundColor: colors.card, borderRadius: 15, padding: 15, marginTop: 18, borderWidth: 1, borderColor: colors.border },
  billTitle: { color: colors.ink, fontWeight: '800', fontSize: 16, marginBottom: 11 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  billValue: { color: colors.ink, fontWeight: '700' },
  billTotal: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 3, flexDirection: 'row', justifyContent: 'space-between' },
  billTotalText: { color: colors.ink, fontWeight: '800', fontSize: 17 },
  checkoutButton: { backgroundColor: colors.green, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 14 },
  checkoutText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  pageHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderCard: { backgroundColor: colors.card, borderRadius: 16, padding: 15, marginBottom: 11, borderWidth: 1, borderColor: colors.border },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between' },
  orderStore: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  statusPill: { backgroundColor: colors.greenSoft, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { color: colors.green, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  orderItems: { color: colors.muted, lineHeight: 19, fontSize: 12, marginTop: 14 },
  orderBottom: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 11 },
  orderTotal: { color: colors.ink, fontWeight: '800', fontSize: 16, marginBottom: 3 },
  profileCard: { backgroundColor: colors.card, borderRadius: 18, alignItems: 'center', padding: 24, borderWidth: 1, borderColor: colors.border },
  profileAvatar: { backgroundColor: colors.lime, width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: colors.dark, fontSize: 30, fontWeight: '800' },
  profileName: { color: colors.ink, fontWeight: '800', fontSize: 21, marginTop: 12 },
  menuCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  menuTitle: { color: colors.ink, fontWeight: '800', fontSize: 16, marginBottom: 7 },
  menuRow: { color: colors.ink, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, fontSize: 14 },
  menuValue: { color: colors.muted },
  addressList: { marginBottom: 2 },
  logoutAction: { borderRadius: 13, padding: 15, alignItems: 'center', backgroundColor: '#fff0ed', marginTop: 18 },
  logoutText: { color: '#c65342', fontWeight: '800' },
  mutedText: { color: colors.muted, fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 65, paddingHorizontal: 25 },
  emptyStateDark: { backgroundColor: '#1d3028', borderRadius: 20 },
  emptyIcon: { fontSize: 42, marginBottom: 14 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  darkText: { color: '#fff' },
  partnerApp: { flex: 1, backgroundColor: '#13231c' },
  partnerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  partnerGreeting: { color: '#a8b9b0', fontSize: 14 },
  partnerName: { color: '#fff', fontWeight: '800', fontSize: 27, marginTop: 4 },
  partnerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  earningsHero: { backgroundColor: colors.lime, borderRadius: 20, padding: 20, marginBottom: 23 },
  partnerEyebrow: { color: '#375a30', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  earningsAmount: { color: colors.dark, fontSize: 42, fontWeight: '800', marginVertical: 7 },
  partnerMuted: { color: '#a8b9b0', fontSize: 12 },
  partnerSectionTitle: { color: '#fff', fontWeight: '800', fontSize: 18, marginBottom: 12 },
  availabilityCard: { backgroundColor: '#1d3028', borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  onlineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#f1a25d', marginRight: 11 },
  availabilityTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  goOnline: { backgroundColor: colors.lime, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 9 },
  goOnlineText: { color: colors.dark, fontWeight: '800', fontSize: 11 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1d3028', borderRadius: 16, padding: 18 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 5 },
  partnerPageTitle: { color: '#fff', fontSize: 29, fontWeight: '800', marginBottom: 20 },
  jobCard: { backgroundColor: '#1d3028', borderRadius: 18, padding: 15, marginBottom: 12 },
  jobTop: { flexDirection: 'row', alignItems: 'center' },
  jobIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#294339', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  jobStore: { color: '#fff', fontWeight: '800', fontSize: 15 },
  jobPay: { color: colors.lime, fontWeight: '800', fontSize: 16 },
  route: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2d453b', marginVertical: 13, paddingVertical: 12 },
  routeDot: { color: colors.lime, fontSize: 11, marginBottom: -1 },
  routeDotOrange: { color: colors.orange, fontSize: 11 },
  routeArrow: { color: '#70877c', marginLeft: 1, marginVertical: 4 },
  routeText: { color: '#d5e0db', fontSize: 12, marginLeft: 18, marginTop: -14, marginBottom: 7 },
  acceptButton: { backgroundColor: colors.lime, borderRadius: 12, padding: 13, alignItems: 'center' },
  acceptText: { color: colors.dark, fontWeight: '800' },
  earningsPanel: { backgroundColor: '#1d3028', borderRadius: 20, padding: 24 },
  bigEarnings: { color: colors.lime, fontSize: 42, fontWeight: '800', marginVertical: 10 },
  partnerProfile: { backgroundColor: '#1d3028', borderRadius: 20, padding: 25, alignItems: 'center' },
  partnerAvatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  partnerProfileName: { color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 14 },
  verificationTag: { color: colors.lime, backgroundColor: '#314d3e', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginTop: 12, textTransform: 'capitalize', fontSize: 11 },
  partnerLogout: { backgroundColor: '#3a2825', borderRadius: 13, padding: 15, alignItems: 'center', marginTop: 16 },
  partnerLogoutText: { color: '#ffac9c', fontWeight: '800' },
  partnerTabBar: { height: 78, backgroundColor: '#172a22', borderTopWidth: 1, borderTopColor: '#294339', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 9 },
});

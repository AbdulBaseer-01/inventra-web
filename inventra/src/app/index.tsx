import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
type Session = {
  id: string;
  name: string;
  email: string;
  role: string;
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
  storeId: string;
};

const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000')
).replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || 'Request failed';
    throw new Error(message);
  }

  return data as T;
}

export default function InventraApp() {
  const [role, setRole] = useState<Role>('customer');
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
  });
  const [deliveryForm, setDeliveryForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: '2000-01-01',
    address: '',
    operatingArea: '',
    documentUrl: '',
    documentType: 'government_id',
  });

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const deliveryFee = subtotal > 500 ? 0 : 40;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('inventra_token');
      const storedRole = (await SecureStore.getItemAsync('inventra_role')) as Role | null;
      if (!storedToken) {
        return;
      }

      setToken(storedToken);
      try {
        const route = storedRole === 'delivery_partner' ? '/api/delivery-partners/me' : '/api/auth/me';
        const result = await request<{ success: boolean; user?: Session; profile?: Session }>(route, { method: 'GET' }, storedToken);
        const user = result.user || result.profile;
        if (user) {
          setSession(user);
          setRole((user.role as Role) || storedRole || 'customer');
        }
      } catch (error) {
        await SecureStore.deleteItemAsync('inventra_token');
        await SecureStore.deleteItemAsync('inventra_role');
      }
    } catch (error) {
      // ignore bootstrap failures and show auth screen
    }

    await loadCatalog();
  };

  const saveSessionData = async (userToken: string, userRole: Role) => {
    setToken(userToken);
    await SecureStore.setItemAsync('inventra_token', userToken);
    await SecureStore.setItemAsync('inventra_role', userRole);
  };

  const logout = async () => {
    try {
      if (token) {
        await request('/api/auth/logout', { method: 'POST' }, token);
      }
    } catch (error) {
      // ignore server-side logout issues
    }

    setSession(null);
    setToken(null);
    setAssignments([]);
    setCart([]);
    await SecureStore.deleteItemAsync('inventra_token');
    await SecureStore.deleteItemAsync('inventra_role');
  };

  const loadCatalog = async () => {
    try {
      const [storeData, productData] = await Promise.all([
        request<{ success: boolean; stores: Store[] }>('/api/public/stores', { method: 'GET' }),
        request<{ success: boolean; products: Product[] }>('/api/public/products', { method: 'GET' }),
      ]);
      setStores(storeData.stores || []);
      setProducts(productData.products || []);
    } catch (error) {
      setStores([]);
      setProducts([]);
    }
  };

  const loadAssignments = async () => {
    if (!token) {
      return;
    }

    try {
      const response = await request<{ success: boolean; assignments?: any[] }>(
        '/api/delivery-partners/assignments',
        { method: 'GET' },
        token,
      );
      setAssignments(response.assignments || []);
    } catch (error) {
      setAssignments([]);
    }
  };

  const handleCustomerSubmit = async () => {
    if (!customerForm.email || !customerForm.password) {
      Alert.alert('Validation', 'Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = authMode === 'signup'
        ? {
            name: customerForm.name || customerForm.username || customerForm.email.split('@')[0],
            username: customerForm.username || customerForm.email.split('@')[0],
            email: customerForm.email,
            phone: customerForm.phone,
            password: customerForm.password,
            role: 'customer',
          }
        : {
            email: customerForm.email,
            password: customerForm.password,
          };

      const response = await request<{ success: boolean; user?: Session; token?: string; message?: string }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      if (authMode === 'login') {
        if (!response.user || !response.token) {
          throw new Error('Login response missing user data or token.');
        }
        await saveSessionData(response.token, 'customer');
        setSession(response.user);
        setRole('customer');
      } else {
        Alert.alert('Success', response.message || 'Customer account created.');
        setAuthMode('login');
      }
    } catch (error) {
      Alert.alert('Customer auth failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverySubmit = async () => {
    setLoading(true);
    try {
      const endpoint = authMode === 'signup' ? '/api/delivery-partners/register' : '/api/delivery-partners/login';
      const payload = authMode === 'signup'
        ? {
            fullName: deliveryForm.fullName,
            email: deliveryForm.email,
            phone: deliveryForm.phone,
            password: deliveryForm.password,
            dateOfBirth: deliveryForm.dateOfBirth,
            address: deliveryForm.address,
            operatingArea: deliveryForm.operatingArea,
            documentUrl: deliveryForm.documentUrl,
            documentType: deliveryForm.documentType,
          }
        : {
            email: deliveryForm.email,
            password: deliveryForm.password,
          };

      const response = await request<{ success: boolean; message?: string; token?: string; profile?: Session }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      if (response.token) {
        await saveSessionData(response.token, 'delivery_partner');
      }

      if (response.profile) {
        setSession(response.profile);
        setRole('delivery_partner');
      }

      if (authMode === 'signup') {
        Alert.alert('Registration sent', response.message || 'Your profile will be reviewed.');
        setAuthMode('login');
      }

      await loadAssignments();
    } catch (error) {
      Alert.alert('Delivery auth failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (!product.store?.id) {
      Alert.alert('Unavailable', 'This item is missing a store reference.');
      return;
    }

    setCart((current) => {
      const storeId = product.store?.id ?? '';
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        );
      }

      return [...current, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        storeId,
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const checkout = async () => {
    if (!token || cart.length === 0) {
      Alert.alert('Cart empty', 'Add products before checking out.');
      return;
    }

    try {
      const response = await request<{ success: boolean; order?: { id: string; total: number }; message?: string }>(
        '/api/public/orders',
        {
          method: 'POST',
          body: JSON.stringify({
            items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
            deliveryAddress: 'Demo customer address',
          }),
        },
        token,
      );

      setCart([]);
      Alert.alert('Order placed', response.message || `Order #${response.order?.id || 'created'} confirmed.`);
      await loadCatalog();
    } catch (error) {
      Alert.alert('Checkout failed', error instanceof Error ? error.message : 'Unable to place order');
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.authContainer}>
          <Text style={styles.title}>Inventra</Text>
          <Text style={styles.subtitle}>Customer and delivery partner app</Text>

          <View style={styles.roleToggle}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'customer' && styles.roleButtonActive]}
              onPress={() => {
                setRole('customer');
                setAuthMode('login');
              }}
            >
              <Text style={styles.roleButtonText}>Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'delivery_partner' && styles.roleButtonActive]}
              onPress={() => {
                setRole('delivery_partner');
                setAuthMode('login');
              }}
            >
              <Text style={styles.roleButtonText}>Delivery</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeButton, authMode === 'login' && styles.modeButtonActive]}
                onPress={() => setAuthMode('login')}
              >
                <Text style={styles.modeButtonText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, authMode === 'signup' && styles.modeButtonActive]}
                onPress={() => setAuthMode('signup')}
              >
                <Text style={styles.modeButtonText}>Sign up</Text>
              </TouchableOpacity>
            </View>

            {role === 'customer' ? (
              <View style={styles.formGroup}>
                {authMode === 'signup' && (
                  <>
                    <TextInput
                      placeholder="Name"
                      placeholderTextColor="#000000"
                      value={customerForm.name}
                      onChangeText={(value) => setCustomerForm((current) => ({ ...current, name: value }))}
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Username"
                      placeholderTextColor="#000000"
                      value={customerForm.username}
                      onChangeText={(value) => setCustomerForm((current) => ({ ...current, username: value }))}
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Phone"
                      placeholderTextColor="#000000"
                      keyboardType="phone-pad"
                      value={customerForm.phone}
                      onChangeText={(value) => setCustomerForm((current) => ({ ...current, phone: value }))}
                      style={styles.input}
                    />
                  </>
                )}
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#000000"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={customerForm.email}
                  onChangeText={(value) => setCustomerForm((current) => ({ ...current, email: value }))}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#000000"
                  secureTextEntry
                  value={customerForm.password}
                  onChangeText={(value) => setCustomerForm((current) => ({ ...current, password: value }))}
                  style={styles.input}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleCustomerSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{authMode === 'signup' ? 'Create account' : 'Sign in'}</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formGroup}>
                {authMode === 'signup' && (
                  <>
                    <TextInput
                      placeholder="Full name"
                      placeholderTextColor="#000000"
                      value={deliveryForm.fullName}
                      onChangeText={(value) => setDeliveryForm((current) => ({ ...current, fullName: value }))}
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Phone"
                      placeholderTextColor="#000000"
                      keyboardType="phone-pad"
                      value={deliveryForm.phone}
                      onChangeText={(value) => setDeliveryForm((current) => ({ ...current, phone: value }))}
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Date of birth (YYYY-MM-DD)"
                      placeholderTextColor="#000000"
                      value={deliveryForm.dateOfBirth}
                      onChangeText={(value) => setDeliveryForm((current) => ({ ...current, dateOfBirth: value }))}
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Operating area"
                      placeholderTextColor="#000000"
                      value={deliveryForm.operatingArea}
                      onChangeText={(value) => setDeliveryForm((current) => ({ ...current, operatingArea: value }))}
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Address"
                      placeholderTextColor="#000000"
                      value={deliveryForm.address}
                      onChangeText={(value) => setDeliveryForm((current) => ({ ...current, address: value }))}
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Document URL"
                      placeholderTextColor="#000000"
                      autoCapitalize="none"
                      value={deliveryForm.documentUrl}
                      onChangeText={(value) => setDeliveryForm((current) => ({ ...current, documentUrl: value }))}
                      style={styles.input}
                    />
                  </>
                )}
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#000000"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={deliveryForm.email}
                  onChangeText={(value) => setDeliveryForm((current) => ({ ...current, email: value }))}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#000000"
                  secureTextEntry
                  value={deliveryForm.password}
                  onChangeText={(value) => setDeliveryForm((current) => ({ ...current, password: value }))}
                  style={styles.input}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleDeliverySubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{authMode === 'signup' ? 'Register partner' : 'Partner login'}</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{session.name || 'Inventra'}</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {session.role === 'delivery_partner' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery dashboard</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={loadAssignments}>
              <Text style={styles.secondaryButtonText}>Refresh assignments</Text>
            </TouchableOpacity>
            {assignments.length === 0 ? (
              <Text style={styles.mutedText}>No assignments yet.</Text>
            ) : (
              assignments.map((assignment) => (
                <View key={assignment.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{assignment.storeName}</Text>
                  <Text style={styles.mutedText}>{assignment.address}</Text>
                  <Text style={styles.mutedText}>Status: {assignment.status}</Text>
                  <Text style={styles.mutedText}>Items: {assignment.items}</Text>
                  <Text style={styles.mutedText}>Distance: {assignment.distance}</Text>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={async () => {
                      try {
                        if (!token) return;
                        await request(`/api/delivery-partners/assignments/${assignment.id}`, { method: 'PATCH' }, token);
                        await loadAssignments();
                        Alert.alert('Assignment accepted', 'Delivery accepted successfully.');
                      } catch (error) {
                        Alert.alert('Assignment failed', error instanceof Error ? error.message : 'Unable to accept');
                      }
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nearby stores</Text>
              {stores.length === 0 ? (
                <Text style={styles.mutedText}>No stores available right now.</Text>
              ) : (
                stores.map((store) => (
                  <View key={store.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{store.name}</Text>
                    <Text style={styles.mutedText}>{store.address}</Text>
                    <Text style={styles.mutedText}>{store.city || 'City unavailable'}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Products</Text>
              {products.length === 0 ? (
                <Text style={styles.mutedText}>Product catalog is empty.</Text>
              ) : (
                products.map((product) => (
                  <View key={product.id} style={styles.productCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{product.name}</Text>
                      <Text style={styles.mutedText}>{product.category}</Text>
                      <Text style={styles.mutedText}>{product.description}</Text>
                      <Text style={styles.priceText}>₹{product.price}</Text>
                      <Text style={styles.mutedText}>Stock: {product.stock}</Text>
                    </View>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => addToCart(product)}>
                      <Text style={styles.primaryButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cart</Text>
              {cart.length === 0 ? (
                <Text style={styles.mutedText}>Your cart is empty.</Text>
              ) : (
                cart.map((item) => (
                  <View key={item.productId} style={styles.cartItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.mutedText}>₹{item.price} each</Text>
                    </View>
                    <View style={styles.quantityRow}>
                      <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.productId, -1)}>
                        <Text style={styles.qtyText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.productId, 1)}>
                        <Text style={styles.qtyText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <Text style={styles.summaryText}>Subtotal: ₹{subtotal}</Text>
              <Text style={styles.summaryText}>Delivery: ₹{deliveryFee}</Text>
              <Text style={styles.summaryText}>Total: ₹{total}</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={checkout}>
                <Text style={styles.primaryButtonText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#17201c',
  },
  subtitle: {
    fontSize: 16,
    color: '#4a5b55',
    marginTop: 6,
    marginBottom: 20,
  },
  roleToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e7efe9',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#1d6d53',
  },
  roleButtonText: {
    color: '#173029',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  modeToggle: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#edf3ef',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#dfeee7',
  },
  modeButtonText: {
    color: '#1d2d27',
    fontWeight: '600',
  },
  formGroup: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe8e4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8faf8',
    color: '#000000',
  },
  primaryButton: {
    backgroundColor: '#1d6d53',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#eef3f0',
  },
  logoutButtonText: {
    color: '#1d2d27',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#17201c',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f6faf7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f6faf7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17201c',
  },
  mutedText: {
    fontSize: 13,
    color: '#465851',
    marginTop: 4,
  },
  priceText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#1d6d53',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ef',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#e6efe8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#163a2e',
  },
  qtyValue: {
    marginHorizontal: 10,
    fontWeight: '700',
    color: '#163a2e',
  },
  summaryText: {
    marginTop: 8,
    fontSize: 15,
    color: '#1f2d29',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#edf3ef',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#173029',
    fontWeight: '600',
  },
});

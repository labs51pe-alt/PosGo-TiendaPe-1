
import { UserProfile, Product, Transaction, Purchase, StoreSettings, Customer, Supplier, CashShift, CashMovement, Lead, Store, Category } from '../types';
import { MOCK_PRODUCTS, DEFAULT_SETTINGS } from '../constants';
import { supabase } from './supabase';

const KEYS = {
  SESSION: 'posgo_session',
  ACTIVE_SHIFT_ID: 'posgo_active_shift'
};

const DEMO_TEMPLATE_ID = '00000000-0000-0000-0000-000000000000'; 

const isDemo = () => {
    const session = localStorage.getItem(KEYS.SESSION);
    if (!session) return true;
    try {
        const user = JSON.parse(session);
        return user.id === 'test-user-demo' || user.email?.endsWith('@demo.posgo');
    } catch { return true; }
};

let cachedStoreId: string | null = null;

const getStoreId = async (): Promise<string> => {
    if (isDemo()) return DEMO_TEMPLATE_ID;
    if (cachedStoreId) return cachedStoreId;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEMO_TEMPLATE_ID;
    const { data } = await supabase.from('profiles').select('store_id').eq('id', user.id).single();
    if (data && data.store_id) {
        cachedStoreId = data.store_id;
        return data.store_id;
    }
    return DEMO_TEMPLATE_ID;
};

const mapProduct = (p: any, imagesData: any[] = []): Product => {
    const prodImages = imagesData 
        ? imagesData.filter((img: any) => img.product_id === p.id).map((img: any) => img.image_data)
        : [];
    return {
        id: p.id,
        name: p.name || '',
        price: Number(p.price) || 0,
        category: p.category || 'General',
        stock: Number(p.stock) || 0,
        barcode: p.barcode || '',
        hasVariants: p.has_variants ?? false,
        variants: Array.isArray(p.variants) ? p.variants : [],
        isPack: p.is_pack ?? false,
        packItems: Array.isArray(p.pack_items) ? p.pack_items : [],
        images: prodImages,
        cost: Number(p.cost) || 0
    };
};

export const StorageService = {
  saveSession: (user: UserProfile) => {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
      cachedStoreId = null;
  },
  getSession: (): UserProfile | null => {
    const s = localStorage.getItem(KEYS.SESSION);
    try { return s ? JSON.parse(s) : null; } catch { return null; }
  },
  clearSession: async () => {
    localStorage.removeItem(KEYS.SESSION);
    localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID);
    cachedStoreId = null;
    await supabase.auth.signOut();
  },

  getCategories: async (): Promise<Category[]> => {
      const storeId = await getStoreId();
      const { data, error } = await supabase.from('categories').select('*').eq('store_id', storeId).order('name');
      if (error || !data || data.length === 0) {
          return [
              { id: '1', name: 'General' },
              { id: '2', name: 'Bebidas' },
              { id: '3', name: 'Alimentos' },
              { id: '4', name: 'Limpieza' },
              { id: '5', name: 'Cuidado Personal' },
              { id: '6', name: 'Snacks' },
              { id: '7', name: 'Otros' }
          ];
      }
      return data;
  },
  saveCategory: async (cat: Category) => {
      const storeId = await getStoreId();
      const { error } = await supabase.from('categories').upsert({ ...cat, store_id: storeId });
      if (error) throw error;
  },
  deleteCategory: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
  },

  getProducts: async (): Promise<Product[]> => {
    const storeId = await getStoreId();
    const { data: productsData } = await supabase.from('products').select('*').eq('store_id', storeId);
    if (!productsData) return storeId === DEMO_TEMPLATE_ID ? MOCK_PRODUCTS : [];
    const { data: imagesData } = await supabase.from('product_images').select('*').eq('store_id', storeId);
    return productsData.map((p: any) => mapProduct(p, imagesData || []));
  },
  
  saveProductWithImages: async (product: Product) => {
      const storeId = await getStoreId();
      const payload = { 
          id: product.id, 
          name: product.name, 
          price: Number(product.price) || 0, 
          stock: Number(product.stock) || 0, 
          category: product.category, 
          barcode: product.barcode || '', 
          has_variants: !!product.hasVariants,
          variants: product.variants || [], 
          is_pack: !!product.isPack,
          pack_items: product.packItems || [],
          store_id: storeId 
      };
      const { error } = await supabase.from('products').upsert(payload);
      if (error) throw error;

      await supabase.from('product_images').delete().eq('product_id', product.id).eq('store_id', storeId);
      if (product.images && product.images.length > 0) {
          const imageInserts = product.images.map(imgData => ({ product_id: product.id, image_data: imgData, store_id: storeId }));
          await supabase.from('product_images').insert(imageInserts);
      }
  },

  saveProducts: async (products: Product[]) => {
      for (const p of products) {
          await StorageService.saveProductWithImages(p);
      }
  },

  getDemoTemplate: async (_unused?: boolean): Promise<Product[]> => {
      const { data: productsData } = await supabase.from('products').select('*').eq('store_id', DEMO_TEMPLATE_ID);
      if (!productsData) return MOCK_PRODUCTS;
      const { data: imagesData } = await supabase.from('product_images').select('*').eq('store_id', DEMO_TEMPLATE_ID);
      return productsData.map((p: any) => mapProduct(p, imagesData || []));
  },

  saveDemoProductToTemplate: async (product: Product): Promise<{ success: boolean; error?: string }> => {
      try {
          const payload = { 
              id: product.id,
              name: product.name,
              price: Number(product.price) || 0,
              stock: Number(product.stock) || 0,
              category: product.category,
              barcode: product.barcode || '',
              store_id: DEMO_TEMPLATE_ID, 
              has_variants: !!product.hasVariants, 
              is_pack: !!product.isPack, 
              variants: product.variants || [], 
              pack_items: product.packItems || [] 
          };
          const { error } = await supabase.from('products').upsert(payload);
          if (error) return { success: false, error: error.message };
          
          // Guardar imágenes también en la plantilla si existen
          await supabase.from('product_images').delete().eq('product_id', product.id).eq('store_id', DEMO_TEMPLATE_ID);
          if (product.images && product.images.length > 0) {
              const imageInserts = product.images.map(imgData => ({ product_id: product.id, image_data: imgData, store_id: DEMO_TEMPLATE_ID }));
              await supabase.from('product_images').insert(imageInserts);
          }
          
          return { success: true };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  },

  deleteDemoProduct: async (productId: string) => {
      await supabase.from('products').delete().eq('id', productId);
  },

  saveLead: async (lead: any) => {
      const { error } = await supabase.from('leads').insert(lead);
      if (error) throw error;
  },

  // CAJA
  getShifts: async () => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('shifts').select('*').eq('store_id', storeId).order('startTime', { ascending: false });
    return data || [];
  },
  saveShift: async (s: any) => {
    const storeId = await getStoreId();
    const { error } = await supabase.from('shifts').upsert({ ...s, store_id: storeId });
    if (error) throw error;
  },
  getMovements: async () => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('movements').select('*').eq('store_id', storeId).order('timestamp', { ascending: false });
    return data || [];
  },
  saveMovement: async (m: any) => {
    const storeId = await getStoreId();
    await supabase.from('movements').insert({ ...m, store_id: storeId });
  },
  getActiveShiftId: () => localStorage.getItem(KEYS.ACTIVE_SHIFT_ID),
  setActiveShiftId: (id: string | null) => {
      if (id) localStorage.setItem(KEYS.ACTIVE_SHIFT_ID, id);
      else localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID);
  },
  
  getTransactions: async (): Promise<Transaction[]> => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('transactions').select('*').eq('store_id', storeId).order('date', { ascending: false });
    return (data || []).map((t: any) => ({ ...t, items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items }));
  },
  saveTransaction: async (t: Transaction) => {
    const storeId = await getStoreId();
    await supabase.from('transactions').insert({ ...t, store_id: storeId });
  },
  getPurchases: async () => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('purchases').select('*').eq('store_id', storeId).order('date', { ascending: false });
    return data || [];
  },
  savePurchase: async (p: any) => {
    const storeId = await getStoreId();
    await supabase.from('purchases').insert({ ...p, store_id: storeId });
  },
  getCustomers: async () => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('customers').select('*').eq('store_id', storeId);
    return data || [];
  },
  getSuppliers: async () => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('suppliers').select('*').eq('store_id', storeId);
    return data || [];
  },
  saveSupplier: async (s: any) => {
    const storeId = await getStoreId();
    await supabase.from('suppliers').upsert({ ...s, store_id: storeId });
  },
  getSettings: async () => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('stores').select('settings').eq('id', storeId).single();
    return data?.settings || DEFAULT_SETTINGS;
  },
  saveSettings: async (settings: any) => {
    const storeId = await getStoreId();
    await supabase.from('stores').update({ settings }).eq('id', storeId);
  },
  resetDemoData: async () => { localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID); cachedStoreId = null; },
  getLeads: async () => {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      return data || [];
  },
  getAllStores: async () => {
      const { data } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
      return data || [];
  }
};

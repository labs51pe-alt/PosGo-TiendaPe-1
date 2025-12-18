
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ViewState, Product, CartItem, Transaction, StoreSettings, Purchase, CashShift, CashMovement, UserProfile, Customer, Supplier, PackItem, Category } from '../types';
import { StorageService } from '../services/storageService';
import { Layout } from './Layout';
import { Auth } from './Auth';
import { AdminView } from './AdminView';
import { InventoryView } from './InventoryView';
import { PurchasesView } from './PurchasesView';
import { ReportsView } from './ReportsView';
import { SettingsView } from './SettingsView';
import { CashControlModal } from './CashControlModal';
import { POSView } from './POSView';
import { SuperAdminView } from './SuperAdminView';
import { Ticket } from './Ticket';
import { DEFAULT_SETTINGS } from '../constants';
import { Save, Image as ImageIcon, Plus, Check, X, Trash2, Search, RefreshCw, Sparkles, Layers } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState | null>(null); 
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const initialized = useRef(false);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [demoProducts, setDemoProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  
  const [activeShiftId, setActiveShiftId] = useState<string | null>(StorageService.getActiveShiftId());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // UI State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [showCashControl, setShowCashControl] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketType, setTicketType] = useState<'SALE' | 'REPORT'>('SALE');
  const [ticketData, setTicketData] = useState<any>(null);

  const refreshAllData = useCallback(async () => {
      const [p, t, pur, set, c, sup, sh, mov, cats, dp] = await Promise.all([
          StorageService.getProducts(),
          StorageService.getTransactions(),
          StorageService.getPurchases(),
          StorageService.getSettings(),
          StorageService.getCustomers(),
          StorageService.getSuppliers(),
          StorageService.getShifts(),
          StorageService.getMovements(),
          StorageService.getCategories(),
          StorageService.getDemoTemplate()
      ]);
      setProducts(p || []);
      setTransactions(t || []);
      setPurchases(pur || []);
      setSettings(set || DEFAULT_SETTINGS);
      setCustomers(c || []);
      setSuppliers(sup || []);
      setMovements(mov || []);
      setCategories(cats || []);
      setShifts(sh || []);
      setDemoProducts(dp || []);
      setActiveShiftId(StorageService.getActiveShiftId());
  }, []);

  useEffect(() => {
    const initApp = async () => {
        if (initialized.current) return;
        initialized.current = true;
        const savedUser = StorageService.getSession();
        if (savedUser) { 
            setUser(savedUser); 
            setView(savedUser.role === 'super_admin' ? ViewState.SUPER_ADMIN : ViewState.POS);
            await refreshAllData();
        } else { setView(ViewState.POS); await refreshAllData(); }
        setLoading(false);
    };
    initApp();
  }, [refreshAllData]);

  useEffect(() => { if (initialized.current && user) refreshAllData(); }, [refreshTrigger, user, refreshAllData]);

  const activeShift = useMemo(() => {
      if (!activeShiftId) return null;
      return shifts.find(s => s.id === activeShiftId) || null;
  }, [shifts, activeShiftId]);

  // Added handleLogin function to fix missing reference error
  const handleLogin = async (loggedInUser: UserProfile) => {
    setLoading(true);
    StorageService.saveSession(loggedInUser);
    setUser(loggedInUser);
    await refreshAllData();
    setLoading(false);
    if (loggedInUser.role === 'super_admin' || loggedInUser.id === 'god-mode') setView(ViewState.SUPER_ADMIN);
    else if (loggedInUser.role === 'admin') setView(ViewState.ADMIN);
    else setView(ViewState.POS); 
  };

  // Added handleLogout function to fix missing reference error
  const handleLogout = async () => { 
      await StorageService.clearSession(); 
      setUser(null); 
      setCart([]); 
      setActiveShiftId(null);
      setShifts([]);
      setView(ViewState.POS);
  };

  const handleCashAction = async (action: 'OPEN' | 'CLOSE' | 'IN' | 'OUT', amount: number, description: string) => {
      try {
          if (action === 'OPEN') {
              const newId = crypto.randomUUID();
              const newShift: CashShift = { id: newId, startTime: new Date().toISOString(), startAmount: amount, status: 'OPEN', totalSalesCash: 0, totalSalesDigital: 0 };
              
              // ACTUALIZACIÓN OPTIMISTA: Cambiamos el estado local antes de ir a Supabase
              setActiveShiftId(newId);
              setShifts(prev => [newShift, ...prev]);
              StorageService.setActiveShiftId(newId);

              await StorageService.saveShift(newShift); 
              const move: CashMovement = { id: crypto.randomUUID(), shiftId: newId, type: 'OPEN', amount, description: 'Apertura de caja', timestamp: new Date().toISOString() };
              await StorageService.saveMovement(move);
          } else if (action === 'CLOSE' && activeShift) {
              const closedShift = { ...activeShift, endTime: new Date().toISOString(), endAmount: amount, status: 'CLOSED' as const };
              
              setActiveShiftId(null);
              setShifts(prev => prev.map(s => s.id === activeShift.id ? closedShift : s));
              StorageService.setActiveShiftId(null);

              await StorageService.saveShift(closedShift); 
              const move: CashMovement = { id: crypto.randomUUID(), shiftId: activeShift.id, type: 'CLOSE', amount, description: 'Cierre de caja', timestamp: new Date().toISOString() };
              await StorageService.saveMovement(move);
          } else if (activeShift) {
              const move: CashMovement = { id: crypto.randomUUID(), shiftId: activeShift.id, type: action, amount, description, timestamp: new Date().toISOString() }; 
              await StorageService.saveMovement(move); 
          }
          await refreshAllData();
      } catch (e) { alert("Error en caja: " + e); }
  };

  const handleProcessPurchase = async (purchase: Purchase, updatedProducts: Product[]) => {
      try {
          // Actualización de inventario
          for (const prod of updatedProducts) {
              await StorageService.saveProductWithImages(prod);
          }
          // Guardar compra
          await StorageService.savePurchase(purchase);
          
          // Actualizar estado local para feedback inmediato
          setProducts(updatedProducts);
          setPurchases(prev => [purchase, ...prev]);
          
          await refreshAllData();
          alert("¡Compra procesada y stock actualizado!");
      } catch (e: any) {
          alert("Error al procesar la compra: " + e.message);
      }
  };

  const handleSaveProduct = async () => {
      if (!currentProduct?.name?.trim()) { alert("Nombre obligatorio"); return; }
      setIsSaving(true);
      try {
          const pToSave: Product = { 
              ...currentProduct, 
              id: currentProduct.id || crypto.randomUUID(),
              category: currentProduct.category || (categories[0]?.name || 'General'),
              stock: Number(currentProduct.stock) || 0,
              isPack: currentProduct.isPack || false,
              variants: currentProduct.variants || []
          };
          
          if (view === ViewState.SUPER_ADMIN) { 
              await StorageService.saveDemoProductToTemplate(pToSave); 
          } else { 
              await StorageService.saveProductWithImages(pToSave); 
          }
          
          await refreshAllData();
          setIsProductModalOpen(false);
      } catch (e: any) { 
          alert("Error al guardar: " + e.message); 
      } finally { 
          setIsSaving(false); 
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><RefreshCw className="animate-spin text-indigo-600 w-10 h-10"/></div>;
  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <>
        <Layout currentView={view || ViewState.POS} onChangeView={setView} settings={settings} user={user} onLogout={handleLogout}>
            {view === ViewState.POS && <POSView products={products} cart={cart} transactions={transactions} activeShift={activeShift} settings={settings} customers={customers} onAddToCart={(p, vid) => setCart(prev => { const ex = prev.find(i => i.id === p.id && i.selectedVariantId === vid); if (ex) return prev.map(i => (i.id === p.id && i.selectedVariantId === vid) ? { ...i, quantity: i.quantity + 1 } : i); return [...prev, { ...p, quantity: 1, selectedVariantId: vid }]; })} onUpdateCart={(id, d, vid) => setCart(prev => prev.map(i => (i.id === id && i.selectedVariantId === vid) ? { ...i, quantity: Math.max(1, i.quantity + d) } : i))} onRemoveItem={(id, vid) => setCart(prev => prev.filter(i => !(i.id === id && i.selectedVariantId === vid)))} onUpdateDiscount={()=>{}} onCheckout={async (m, p) => { if(!activeShift) return; const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0); const t: Transaction = { id: crypto.randomUUID(), date: new Date().toISOString(), items: [...cart], subtotal: total, tax: 0, discount: 0, total, paymentMethod: m, payments: p, profit: 0, shiftId: activeShift.id }; await StorageService.saveTransaction(t); setCart([]); setTicketType('SALE'); setTicketData(t); setShowTicket(true); await refreshAllData(); }} onClearCart={() => setCart([])} onOpenCashControl={() => setShowCashControl(true)} />}
            {view === ViewState.INVENTORY && <InventoryView products={products} settings={settings} transactions={transactions} purchases={purchases} onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: 'General', stock: 0 }); setIsProductModalOpen(true); }} onEditProduct={(p) => { setCurrentProduct(p); setIsProductModalOpen(true); }} onDeleteProduct={async (id) => { if(window.confirm('¿Borrar?')) { await StorageService.deleteDemoProduct(id); await refreshAllData(); } }} onGoToPurchase={(name) => { setView(ViewState.PURCHASES); }} />}
            {view === ViewState.PURCHASES && <PurchasesView products={products} suppliers={suppliers} purchases={purchases} settings={settings} onProcessPurchase={handleProcessPurchase} onAddSupplier={async (s) => { await StorageService.saveSupplier(s); await refreshAllData(); }} onRequestNewProduct={() => { setView(ViewState.INVENTORY); }} />}
            {view === ViewState.ADMIN && <AdminView transactions={transactions} products={products} shifts={shifts} movements={movements} />}
            {view === ViewState.REPORTS && <ReportsView transactions={transactions} settings={settings} />}
            {view === ViewState.SETTINGS && <SettingsView settings={settings} onSaveSettings={async (s) => { await StorageService.saveSettings(s); await refreshAllData(); }} />}
            {view === ViewState.SUPER_ADMIN && <SuperAdminView onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: 'General', stock: 0 }); setIsProductModalOpen(true); }} onEditProduct={(p) => { setCurrentProduct(p); setIsProductModalOpen(true); }} lastUpdated={refreshTrigger} />}
        </Layout>

        {isProductModalOpen && currentProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-black text-xl text-slate-800">{currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                        <button onClick={() => setIsProductModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">✕</button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre</label>
                        <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Precio</label>
                                <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock</label>
                                <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={currentProduct.stock} onChange={e => setCurrentProduct({...currentProduct, stock: parseFloat(e.target.value) || 0})} />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-end gap-3 bg-slate-50/50">
                        <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                        <button onClick={handleSaveProduct} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black shadow-xl hover:bg-black active:scale-95 transition-all">
                            {isSaving ? <RefreshCw className="animate-spin w-5 h-5"/> : 'GUARDAR'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        <CashControlModal isOpen={showCashControl} onClose={() => setShowCashControl(false)} activeShift={activeShift} movements={movements} transactions={transactions} onCashAction={handleCashAction} currency={settings.currency} />
        {showTicket && <Ticket type={ticketType} data={ticketData} settings={settings} onClose={() => setShowTicket(false)} />}
    </>
  );
};

export default App;

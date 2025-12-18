
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

  // Product Form State
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantStock, setVariantStock] = useState('');
  const [packSearchTerm, setPackSearchTerm] = useState('');

  // BUSCADOR DE COMBOS CONTEXTUAL
  const packSearchSuggestions = useMemo(() => {
    if (!packSearchTerm || packSearchTerm.length < 1) return [];
    const sourceList = (view === ViewState.SUPER_ADMIN) ? demoProducts : products;
    return sourceList.filter(p => 
      !p.isPack && 
      p.id !== currentProduct?.id &&
      (p.name.toLowerCase().includes(packSearchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(packSearchTerm)))
    ).slice(0, 5);
  }, [products, demoProducts, packSearchTerm, currentProduct, view]);

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

  const handleLogin = (loggedInUser: UserProfile) => {
    StorageService.saveSession(loggedInUser);
    setUser(loggedInUser);
    setView(loggedInUser.role === 'super_admin' ? ViewState.SUPER_ADMIN : ViewState.POS);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = async () => { await StorageService.clearSession(); setUser(null); setCart([]); setView(ViewState.POS); };

  const handleCashAction = async (action: 'OPEN' | 'CLOSE' | 'IN' | 'OUT', amount: number, description: string) => {
      try {
          if (action === 'OPEN') {
              const newId = crypto.randomUUID();
              const newShift: CashShift = { id: newId, startTime: new Date().toISOString(), startAmount: amount, status: 'OPEN', totalSalesCash: 0, totalSalesDigital: 0 };
              
              // Actualización inmediata del estado para evitar "Caja Cerrada" visual
              setShifts(prev => [newShift, ...prev]);
              StorageService.setActiveShiftId(newId);
              setActiveShiftId(newId);
              
              await StorageService.saveShift(newShift); 
              const move: CashMovement = { id: crypto.randomUUID(), shiftId: newId, type: 'OPEN', amount, description: 'Apertura de caja', timestamp: new Date().toISOString() };
              await StorageService.saveMovement(move);
          } else if (action === 'CLOSE' && activeShift) {
              const closedShift = { ...activeShift, endTime: new Date().toISOString(), endAmount: amount, status: 'CLOSED' as const };
              
              // Actualización inmediata del estado
              setShifts(prev => prev.map(s => s.id === activeShift.id ? closedShift : s));
              StorageService.setActiveShiftId(null); 
              setActiveShiftId(null);
              
              await StorageService.saveShift(closedShift); 
              const move: CashMovement = { id: crypto.randomUUID(), shiftId: activeShift.id, type: 'CLOSE', amount, description: 'Cierre de caja', timestamp: new Date().toISOString() };
              await StorageService.saveMovement(move);
          } else if (activeShift) {
              const move: CashMovement = { id: crypto.randomUUID(), shiftId: activeShift.id, type: action, amount, description, timestamp: new Date().toISOString() }; 
              await StorageService.saveMovement(move); 
              setMovements(prev => [move, ...prev]);
          }
          await refreshAllData();
      } catch (e) { alert("Error en caja: " + e); }
  };

  const handleAddToCart = (product: Product, variantId?: string) => { 
      setCart(prev => { 
          const existing = prev.find(item => item.id === product.id && item.selectedVariantId === variantId); 
          if (existing) return prev.map(item => (item.id === product.id && item.selectedVariantId === variantId) ? { ...item, quantity: item.quantity + 1 } : item); 
          let price = product.price; 
          let vName = undefined; 
          if (variantId && product.variants) { 
              const v = product.variants.find(v => v.id === variantId); 
              if (v) { price = v.price; vName = v.name; } 
          } 
          return [...prev, { ...product, price, quantity: 1, selectedVariantId: variantId, selectedVariantName: vName }]; 
      }); 
  };

  const handleSaveProduct = async () => {
      if (!currentProduct?.name?.trim()) { alert("Nombre obligatorio"); return; }
      setIsSaving(true);
      try {
          let finalStock = Number(currentProduct.stock) || 0;
          if (currentProduct.hasVariants && currentProduct.variants && currentProduct.variants.length > 0) {
              finalStock = currentProduct.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
          }

          const pToSave: Product = { 
              ...currentProduct, 
              id: currentProduct.id || crypto.randomUUID(),
              category: currentProduct.category || (categories[0]?.name || 'General'),
              stock: finalStock,
              isPack: currentProduct.isPack || false,
              packItems: currentProduct.packItems || [],
              variants: currentProduct.variants || []
          };
          
          let result: any;
          if (view === ViewState.SUPER_ADMIN) { 
              result = await StorageService.saveDemoProductToTemplate(pToSave); 
              if (result && !result.success) throw new Error(result.error);
          } else { 
              await StorageService.saveProductWithImages(pToSave); 
          }
          
          await refreshAllData();
          setIsProductModalOpen(false);
          setRefreshTrigger(prev => prev + 1);
      } catch (e: any) { 
          alert("Error al guardar: " + e.message); 
      } finally { 
          setIsSaving(false); 
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && currentProduct) {
          if (file.size > 800000) { alert("Imagen demasiado grande (800KB máx)"); return; }
          const reader = new FileReader();
          reader.onloadend = () => {
              const currentImages = currentProduct.images || [];
              if (currentImages.length >= 2) return;
              setCurrentProduct({ ...currentProduct, images: [...currentImages, reader.result as string] });
          };
          reader.readAsDataURL(file);
      }
  };

  const addPackItem = (p: Product) => {
    if (!currentProduct) return;
    const currentItems = currentProduct.packItems || [];
    if (currentItems.find(i => i.productId === p.id)) return;
    setCurrentProduct({ ...currentProduct, packItems: [...currentItems, { productId: p.id, productName: p.name, quantity: 1 }] });
    setPackSearchTerm('');
  };

  const addVariant = () => {
    if (!currentProduct || !variantName) return;
    const newVariant = {
        id: crypto.randomUUID(),
        name: variantName,
        price: parseFloat(variantPrice) || currentProduct.price,
        stock: parseFloat(variantStock) || 0
    };
    setCurrentProduct({
        ...currentProduct,
        variants: [...(currentProduct.variants || []), newVariant]
    });
    setVariantName('');
    setVariantPrice('');
    setVariantStock('');
  };

  const initNewProduct = () => {
    const defaultCat = categories.length > 0 ? categories[0].name : 'General';
    setCurrentProduct({ 
      id: '', name: '', price: 0, category: defaultCat, stock: 0, 
      variants: [], packItems: [], images: [], isPack: false, hasVariants: false 
    });
    setIsProductModalOpen(true);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><RefreshCw className="animate-spin text-indigo-600 w-10 h-10"/></div>;
  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <>
        <Layout currentView={view || ViewState.POS} onChangeView={setView} settings={settings} user={user} onLogout={handleLogout}>
            {view === ViewState.POS && <POSView products={products} cart={cart} transactions={transactions} activeShift={activeShift} settings={settings} customers={customers} onAddToCart={handleAddToCart} onUpdateCart={(id, d, vid) => setCart(prev => prev.map(i => (i.id === id && i.selectedVariantId === vid) ? { ...i, quantity: Math.max(1, i.quantity + d) } : i))} onRemoveItem={(id, vid) => setCart(prev => prev.filter(i => !(i.id === id && i.selectedVariantId === vid)))} onUpdateDiscount={()=>{}} onCheckout={async (m, p) => { if(!activeShift) return; const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0); const t: Transaction = { id: crypto.randomUUID(), date: new Date().toISOString(), items: [...cart], subtotal: total, tax: 0, discount: 0, total, paymentMethod: m, payments: p, profit: 0, shiftId: activeShift.id }; await StorageService.saveTransaction(t); setCart([]); setTicketType('SALE'); setTicketData(t); setShowTicket(true); setRefreshTrigger(p => p + 1); }} onClearCart={() => setCart([])} onOpenCashControl={() => setShowCashControl(true)} />}
            {view === ViewState.INVENTORY && <InventoryView products={products} settings={settings} transactions={transactions} purchases={purchases} onNewProduct={initNewProduct} onEditProduct={(p) => { setCurrentProduct({ ...p, variants: p.variants || [], packItems: p.packItems || [], images: p.images || [], isPack: !!p.isPack, hasVariants: !!p.hasVariants }); setIsProductModalOpen(true); }} onDeleteProduct={async (id) => { if(window.confirm('¿Borrar?')) { await StorageService.deleteDemoProduct(id); await refreshAllData(); } }} />}
            {view === ViewState.PURCHASES && <PurchasesView products={products} suppliers={suppliers} purchases={purchases} settings={settings} onProcessPurchase={async (pur, updated) => { await StorageService.savePurchase(pur); for(const p of updated) await StorageService.saveProductWithImages(p); await refreshAllData(); }} onAddSupplier={async (s) => { await StorageService.saveSupplier(s); await refreshAllData(); }} onRequestNewProduct={initNewProduct} />}
            {view === ViewState.ADMIN && <AdminView transactions={transactions} products={products} shifts={shifts} movements={movements} />}
            {view === ViewState.REPORTS && <ReportsView transactions={transactions} settings={settings} />}
            {view === ViewState.SETTINGS && <SettingsView settings={settings} onSaveSettings={async (s) => { await StorageService.saveSettings(s); await refreshAllData(); }} />}
            {view === ViewState.SUPER_ADMIN && <SuperAdminView onNewProduct={initNewProduct} onEditProduct={(p) => { setCurrentProduct({ ...p, variants: p.variants || [], packItems: p.packItems || [], images: p.images || [], isPack: !!p.isPack, hasVariants: !!p.hasVariants }); setIsProductModalOpen(true); }} lastUpdated={refreshTrigger} />}
        </Layout>

        {isProductModalOpen && currentProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up border border-white/20">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-black text-xl text-slate-800">{currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                        <button onClick={() => setIsProductModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">✕</button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Fotos del Producto (Máx 2)</label>
                            <div className="flex gap-4">
                                {currentProduct.images?.map((img, i) => (
                                    <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 group shadow-sm">
                                        <img src={img} className="w-full h-full object-cover" alt="preview" />
                                        <button onClick={() => setCurrentProduct({...currentProduct, images: currentProduct.images?.filter((_,idx)=>idx!==i)})} className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X className="w-4 h-4"/></button>
                                    </div>
                                ))}
                                {(!currentProduct.images || currentProduct.images.length < 2) && (
                                    <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                                        <ImageIcon className="w-6 h-6 mb-1"/><span className="text-[10px] font-black uppercase">Adjuntar</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Nombre del Producto</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all shadow-inner" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Precio Venta</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} /></div>
                                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Stock Global</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500" value={currentProduct.stock} onChange={e => setCurrentProduct({...currentProduct, stock: parseFloat(e.target.value) || 0})} disabled={currentProduct.hasVariants} /></div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Categoría</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none cursor-pointer" value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})}>
                                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <label className={`flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all ${currentProduct.hasVariants ? 'bg-indigo-50 border-indigo-200 shadow-inner' : 'border-slate-100 hover:bg-slate-50'}`}>
                                    <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={currentProduct.hasVariants || false} onChange={e => setCurrentProduct({...currentProduct, hasVariants: e.target.checked, isPack: false, packItems: []})} /> 
                                    <span className="font-bold text-slate-700 text-sm">Variantes</span>
                                </label>
                                <label className={`flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all ${currentProduct.isPack ? 'bg-amber-50 border-amber-200 shadow-inner' : 'border-slate-100 hover:bg-slate-50'}`}>
                                    <input type="checkbox" className="w-5 h-5 accent-amber-600" checked={currentProduct.isPack || false} onChange={e => setCurrentProduct({...currentProduct, isPack: e.target.checked, hasVariants: false, variants: []})} /> 
                                    <span className="font-bold text-slate-700 text-sm">Combo / Pack</span>
                                </label>
                            </div>

                            {/* UI DE VARIANTES */}
                            {currentProduct.hasVariants && (
                                <div className="bg-indigo-50/50 p-6 rounded-[1.5rem] border border-indigo-100">
                                    <h4 className="font-black text-indigo-800 mb-4 text-xs uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4"/> Gestionar Variantes</h4>
                                    <div className="grid grid-cols-4 gap-2 mb-4">
                                        <input className="col-span-2 p-3 bg-white border border-indigo-200 rounded-xl font-bold text-xs outline-none" placeholder="Talla/Color..." value={variantName} onChange={e => setVariantName(e.target.value)} />
                                        <input type="number" className="p-3 bg-white border border-indigo-200 rounded-xl font-bold text-xs outline-none" placeholder="Stock" value={variantStock} onChange={e => setVariantStock(e.target.value)} />
                                        <button onClick={addVariant} className="bg-indigo-600 text-white rounded-xl font-black p-2 hover:bg-indigo-700 transition-all flex items-center justify-center"><Plus className="w-5 h-5"/></button>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {currentProduct.variants?.map((v, i) => (
                                            <div key={v.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-indigo-100 shadow-sm animate-fade-in-up">
                                                <div>
                                                    <span className="font-bold text-slate-700 text-sm">{v.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold ml-2">S/{v.price}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[10px] font-black">{v.stock} UN.</span>
                                                    <button onClick={() => setCurrentProduct({...currentProduct, variants: currentProduct.variants?.filter((_,idx)=>idx!==i)})} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {currentProduct.isPack && (
                                <div className="bg-amber-50/50 p-6 rounded-[1.5rem] border border-amber-100">
                                    <h4 className="font-black text-amber-800 mb-4 text-xs uppercase tracking-widest flex items-center gap-2"><Layers className="w-4 h-4"/> Armar Combo</h4>
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 w-4 h-4"/>
                                        <input className="w-full pl-10 pr-4 py-3 bg-white border border-amber-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm" placeholder="Buscar productos para añadir..." value={packSearchTerm} onChange={e => setPackSearchTerm(e.target.value)} />
                                        {packSearchSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 w-full bg-white border border-amber-100 rounded-2xl shadow-2xl z-[150] overflow-hidden mt-2 p-1">
                                                {packSearchSuggestions.map(p => (
                                                    <button key={p.id} onClick={() => addPackItem(p)} className="w-full text-left p-3 hover:bg-amber-50 rounded-xl font-bold text-xs flex justify-between items-center group transition-colors">
                                                        <span>{p.name}</span>
                                                        <Plus className="w-4 h-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                        {currentProduct.packItems?.map((item, i) => (
                                            <div key={item.productId} className="flex justify-between items-center p-3 bg-white rounded-xl border border-amber-100 shadow-sm animate-fade-in-up">
                                                <span className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{item.productName}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1">
                                                        <button onClick={() => { const newItems = [...(currentProduct.packItems || [])]; newItems[i].quantity = Math.max(1, newItems[i].quantity - 1); setCurrentProduct({...currentProduct, packItems: newItems}); }} className="text-amber-600 px-1 font-black">-</button>
                                                        <span className="px-2 text-xs font-black w-6 text-center">{item.quantity}</span>
                                                        <button onClick={() => { const newItems = [...(currentProduct.packItems || [])]; newItems[i].quantity += 1; setCurrentProduct({...currentProduct, packItems: newItems}); }} className="text-amber-600 px-1 font-black">+</button>
                                                    </div>
                                                    <button onClick={() => setCurrentProduct({...currentProduct, packItems: currentProduct.packItems?.filter((_,idx)=>idx!==i)})} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-6 border-t flex justify-end gap-3 bg-slate-50/50">
                        <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                        <button onClick={handleSaveProduct} disabled={isSaving} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black shadow-xl hover:bg-black active:scale-95 transition-all flex items-center gap-2">
                            {isSaving ? <RefreshCw className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>} GUARDAR
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

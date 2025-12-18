
import React, { useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Transaction, StoreSettings, Customer, Category, ProductVariant } from '../types';
import { Cart } from './Cart';
import { StorageService } from '../services/storageService';
import { Lock, Wallet, ScanBarcode, Search, Layers, Plus, X, Box, Zap, Sparkles } from 'lucide-react';

interface POSViewProps {
  products: Product[];
  cart: CartItem[];
  transactions: Transaction[];
  activeShift: any;
  settings: StoreSettings;
  customers: Customer[];
  onAddToCart: (product: Product, variantId?: string) => void;
  onUpdateCart: (id: string, delta: number, variantId?: string) => void;
  onRemoveItem: (id: string, variantId?: string) => void;
  onUpdateDiscount: (id: string, discount: number, variantId?: string) => void;
  onCheckout: (method: string, payments: any[]) => void;
  onClearCart: () => void;
  onOpenCashControl: () => void;
}

export const POSView: React.FC<POSViewProps> = ({ 
  products, cart, onAddToCart, onUpdateCart, 
  onRemoveItem, onCheckout, onClearCart, 
  settings, customers, activeShift, onOpenCashControl 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);

  useEffect(() => {
      const loadCats = async () => {
          const c = await StorageService.getCategories();
          setCategories(c);
      };
      loadCats();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm));
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleProductAction = (product: Product) => {
      if (product.hasVariants && product.variants && product.variants.length > 0) {
          setSelectedProductForVariant(product);
          setVariantModalOpen(true);
      } else {
          onAddToCart(product);
      }
  };

  const handleSelectVariant = (variant: ProductVariant) => {
      if (selectedProductForVariant) {
          onAddToCart(selectedProductForVariant, variant.id);
          setVariantModalOpen(false);
          setSelectedProductForVariant(null);
      }
  };

  if (!activeShift) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-[#f8fafc]">
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 max-w-md w-full animate-fade-in-up text-center">
                <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-white"><Lock className="w-10 h-10" /></div>
                <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Panel Bloqueado</h2>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed">Debes abrir caja para empezar a vender.</p>
                <button onClick={onOpenCashControl} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                    <Zap className="w-6 h-6 fill-current"/><span>Abrir Caja Ahora</span>
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#f8fafc]">
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white border-b border-slate-100 px-8 py-5 flex justify-between items-center shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shadow-inner">
                        <div className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></div>
                        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Turno Activo</p><p className="text-sm font-bold text-slate-700 font-mono">ID: {activeShift.id.slice(-6).toUpperCase()}</p></div>
                    </div>
                </div>
                <button onClick={onOpenCashControl} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"><Wallet className="w-4 h-4"/> Gestión de Caja</button>
            </div>

            <div className="px-8 pt-6 pb-2 shrink-0">
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    <div className="flex-1 relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"><Search className="w-5 h-5"/></div>
                        <input type="text" placeholder="Buscar producto o escanea código..." className="w-full pl-14 pr-16 py-4.5 bg-white border-2 border-slate-100 rounded-[1.8rem] focus:border-indigo-400 focus:bg-white outline-none font-black text-slate-700 transition-all shadow-xl shadow-slate-100/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300"><ScanBarcode className="w-6 h-6"/></div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-4 lg:max-w-[45%] no-scrollbar scroll-smooth">
                        <button onClick={() => setSelectedCategory('Todos')} className={`px-7 py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.1em] transition-all border-2 shadow-sm ${selectedCategory === 'Todos' ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}>Todos</button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`px-7 py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.1em] transition-all border-2 shadow-sm ${selectedCategory === cat.name ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}>{cat.name}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-10">
                <div className={`grid gap-5 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`}>
                    {filteredProducts.map((p) => (
                        <div key={p.id} onClick={() => handleProductAction(p)} className={`bg-white transition-all cursor-pointer relative group border-2 border-transparent hover:border-indigo-200 hover:-translate-y-2 p-5 rounded-[2.8rem] flex flex-col h-[320px] shadow-sm hover:shadow-2xl`}>
                            <div className="absolute top-5 left-5 flex flex-col gap-2 z-10">
                                {p.hasVariants && (
                                    <span className="bg-indigo-600 text-white text-[9px] px-2.5 py-1.5 rounded-xl font-black border border-indigo-700 shadow-lg flex items-center gap-1.5 animate-fade-in ring-4 ring-white/50">
                                        <Sparkles className="w-3 h-3 fill-current"/> VARIANTE
                                    </span>
                                )}
                                {p.isPack && (
                                    <span className="bg-amber-500 text-white text-[9px] px-2.5 py-1.5 rounded-xl font-black border border-amber-600 shadow-lg flex items-center gap-1.5 animate-fade-in ring-4 ring-white/50">
                                        <Layers className="w-3 h-3 fill-current"/> COMBO
                                    </span>
                                )}
                            </div>
                            <div className="px-3 py-1.5 rounded-xl text-[9px] font-black z-10 border shadow-md bg-white text-slate-700 border-slate-100 absolute top-5 right-5 flex items-center gap-1">
                                <Box className="w-3.5 h-3.5 text-indigo-500"/>{p.stock} <span className="opacity-40 font-bold">UN.</span>
                            </div>
                            <div className="relative shrink-0 flex items-center justify-center overflow-hidden bg-slate-50 flex-1 mb-5 rounded-[2.2rem] shadow-inner group-hover:bg-white transition-colors">
                                {p.images?.[0] ? (
                                    <img src={p.images[0]} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200 font-black text-5xl group-hover:text-indigo-400 transition-colors`}>
                                        {p.name.substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest mb-1.5 w-fit border border-indigo-100">{p.category}</span>
                                <h3 className={`font-black text-slate-800 leading-tight truncate group-hover:text-indigo-600 transition-colors text-sm mb-3 line-clamp-2 min-h-[2.5rem]`}>{p.name}</h3>
                                <div className="flex items-center justify-between mt-auto">
                                    <p className="text-2xl font-black text-slate-900 tracking-tighter">{settings.currency}{p.price.toFixed(2)}</p>
                                    <div className="w-12 h-12 rounded-[1.2rem] bg-slate-900 text-white flex items-center justify-center group-hover:bg-indigo-600 transition-all active:scale-75 shadow-lg group-hover:shadow-indigo-100"><Plus className="w-6 h-6 stroke-[3px]"/></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* MODAL SELECTOR DE VARIANTES EN POS */}
        {variantModalOpen && selectedProductForVariant && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl animate-fade-in-up border border-white/20">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Elegir Variante</h3>
                        <button onClick={() => { setVariantModalOpen(false); setSelectedProductForVariant(null); }} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"><X className="w-5 h-5"/></button>
                    </div>
                    <p className="text-slate-500 font-bold text-xs mb-6 uppercase tracking-widest">{selectedProductForVariant.name}</p>
                    <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                        {selectedProductForVariant.variants?.map(v => (
                            <button 
                                key={v.id} 
                                onClick={() => handleSelectVariant(v)}
                                disabled={v.stock <= 0}
                                className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all group ${v.stock > 0 ? 'bg-slate-50 border-slate-100 hover:border-indigo-400 hover:bg-white active:scale-95' : 'opacity-40 grayscale cursor-not-allowed'}`}
                            >
                                <span className="font-black text-slate-700 text-lg">{v.name}</span>
                                <div className="text-right">
                                    <p className="font-black text-indigo-600">{settings.currency}{v.price.toFixed(2)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Stock: {v.stock}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        <div id="pos-cart" className="w-[420px] bg-white border-l border-slate-100 shadow-2xl hidden lg:block animate-fade-in relative z-20">
            <Cart items={cart} onUpdateQuantity={onUpdateCart} onRemoveItem={onRemoveItem} onUpdateDiscount={()=>{}} onCheckout={onCheckout} onClearCart={onClearCart} settings={settings} customers={customers} />
        </div>
    </div>
  );
};

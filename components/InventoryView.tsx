
import React, { useState, useMemo } from 'react';
import { Product, StoreSettings, Transaction, Purchase } from '../types';
import { Search, Plus, Edit, Trash2, AlertTriangle, Box, Sparkles, Layers, Package } from 'lucide-react';

interface InventoryProps {
    products: Product[];
    settings: StoreSettings;
    transactions: Transaction[];
    purchases: Purchase[];
    onNewProduct: () => void;
    onEditProduct: (p: Product) => void;
    onDeleteProduct: (id: string) => void;
    // Added missing prop to fix TypeScript error in App.tsx
    onGoToPurchase?: (productName: string) => void;
}

export const InventoryView: React.FC<InventoryProps> = ({ 
    products, settings, onNewProduct, onEditProduct, onDeleteProduct, onGoToPurchase 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'ALL' | 'LOW'>('ALL');

    const filteredProducts = useMemo(() => {
        let items = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm)));
        if (activeTab === 'LOW') items = items.filter(p => p.stock <= 5);
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }, [products, searchTerm, activeTab]);

    return (
        <div className="p-8 h-full flex flex-col bg-[#f8fafc]">
            <div className="flex justify-between items-center mb-8 gap-4">
                <div><h1 className="text-3xl font-black text-slate-800 tracking-tight">Centro de Stock</h1><p className="text-slate-500 font-medium text-sm">Monitoreo de inventario total</p></div>
                <button onClick={onNewProduct} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"><Plus className="w-5 h-5 stroke-[3px]"/> NUEVO PRODUCTO</button>
            </div>

            <div className="flex gap-4 mb-6">
                <button onClick={() => setActiveTab('ALL')} className={`px-7 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all shadow-sm ${activeTab === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-transparent hover:bg-slate-50'}`}>Todos los Items</button>
                <button onClick={() => setActiveTab('LOW')} className={`px-7 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 flex items-center gap-2 transition-all shadow-sm ${activeTab === 'LOW' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white text-slate-400 border-transparent hover:bg-slate-50'}`}><AlertTriangle className="w-4 h-4"/> Alerta de Stock</button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 flex-1 flex flex-col shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"/>
                        <input className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-indigo-400 transition-all shadow-sm" placeholder="Buscar por nombre o código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                                <th className="p-7">Producto</th>
                                <th className="p-7">Categoría</th>
                                <th className="p-7 text-right">Precio Venta</th>
                                <th className="p-7 text-center">Disponible</th>
                                <th className="p-7 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredProducts.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="p-7">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden shadow-inner border border-slate-100">
                                                {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 opacity-40"/>}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-800 text-base flex items-center gap-2 mb-1">
                                                    {p.name}
                                                    {p.hasVariants && <span className="bg-indigo-50 text-indigo-600 text-[8px] px-2 py-1 rounded-lg font-black flex items-center gap-1 shadow-sm border border-indigo-100"><Sparkles className="w-2.5 h-2.5 fill-current"/> VAR</span>}
                                                    {p.isPack && <span className="bg-amber-50 text-amber-600 text-[8px] px-2 py-1 rounded-lg font-black flex items-center gap-1 shadow-sm border border-amber-100"><Layers className="w-2.5 h-2.5 fill-current"/> PACK</span>}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono font-bold tracking-widest">{p.barcode || 'SIN SKU'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-7">
                                        <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">{p.category}</span>
                                    </td>
                                    <td className="p-7 text-right font-black text-slate-900 text-lg">{settings.currency}{p.price.toFixed(2)}</td>
                                    <td className="p-7 text-center">
                                        <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[10px] font-black border shadow-sm ${p.stock <= 5 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                            <Box className="w-4 h-4"/> {p.stock} <span className="opacity-40">UNIDADES</span>
                                        </div>
                                    </td>
                                    <td className="p-7 text-right">
                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                            {/* Action to go to purchase supply view */}
                                            {onGoToPurchase && (
                                                <button onClick={() => onGoToPurchase(p.name)} className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all shadow-sm border border-slate-100 bg-white" title="Ir a compra"><Package className="w-5 h-5"/></button>
                                            )}
                                            <button onClick={() => onEditProduct(p)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm border border-slate-100 bg-white"><Edit className="w-5 h-5"/></button>
                                            <button onClick={() => onDeleteProduct(p.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-slate-100 bg-white"><Trash2 className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && (
                        <div className="p-24 text-center flex flex-col items-center opacity-30">
                            <Package className="w-20 h-20 mb-6 text-slate-300"/>
                            <p className="font-black text-2xl uppercase tracking-widest text-slate-400">Sin coincidencias</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

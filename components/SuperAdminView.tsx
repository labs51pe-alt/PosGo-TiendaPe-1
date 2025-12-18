
import React, { useState, useEffect } from 'react';
import { Lead, Store, Product, Category } from '../types';
import { StorageService } from '../services/storageService';
import { Users, Building2, Trash2, RefreshCw, ShieldAlert, Package, Plus, Edit, X, Terminal, Copy, CheckCircle, ListTodo, Tag, Layers, Sparkles, MessageCircle, Calendar, Hash } from 'lucide-react';

interface SuperAdminProps {
    onEditProduct?: (product: Product) => void;
    onNewProduct?: () => void;
    lastUpdated?: number;
}

export const SuperAdminView: React.FC<SuperAdminProps> = ({ onEditProduct, onNewProduct, lastUpdated }) => {
    const [activeTab, setActiveTab] = useState<'CATEGORIES' | 'DEMO_PRODUCTS' | 'LEADS' | 'STORES'>('CATEGORIES'); 
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [demoProducts, setDemoProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [l, s, demo, cats] = await Promise.all([
                StorageService.getLeads(),
                StorageService.getAllStores(),
                StorageService.getDemoTemplate(true),
                StorageService.getCategories()
            ]);
            setLeads(l || []); 
            setStores(s || []); 
            setDemoProducts(demo || []); 
            setCategories(cats || []);
        } catch (error) { 
            console.error("Error fetching super admin data:", error); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchData(); }, [lastUpdated]);

    const handleSaveCategory = async () => {
        if (!editingCategory?.name) return;
        try {
            const catToSave = editingCategory.id ? editingCategory : { id: crypto.randomUUID(), name: editingCategory.name };
            await StorageService.saveCategory(catToSave);
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
            fetchData();
        } catch (e: any) {
            alert("Error al guardar categoría.");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (window.confirm('¿Eliminar categoría global?')) {
            await StorageService.deleteCategory(id);
            fetchData();
        }
    };

    return (
        <div className="p-8 h-full bg-[#f8fafc] flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4">
                        <ShieldAlert className="w-10 h-10 text-red-600 drop-shadow-xl"/> Sistema Super Admin
                    </h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Gestión Global de Infraestructura</p>
                </div>
                <button onClick={fetchData} disabled={loading} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all hover:scale-110 active:scale-95 group disabled:opacity-50">
                    <RefreshCw className={`w-6 h-6 text-slate-400 group-hover:text-indigo-600 ${loading ? 'animate-spin' : ''}`}/>
                </button>
            </div>

            <div className="flex flex-wrap gap-4 mb-8">
                <button onClick={() => setActiveTab('CATEGORIES')} className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'CATEGORIES' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-105' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><ListTodo className="w-5 h-5"/> Categorías</button>
                <button onClick={() => setActiveTab('DEMO_PRODUCTS')} className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'DEMO_PRODUCTS' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-105' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Package className="w-5 h-5"/> Plantilla Cloud</button>
                <button onClick={() => setActiveTab('LEADS')} className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'LEADS' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-105' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Users className="w-5 h-5"/> Leads ({leads.length})</button>
                <button onClick={() => setActiveTab('STORES')} className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'STORES' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-105' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Building2 className="w-5 h-5"/> Tiendas ({stores.length})</button>
            </div>

            <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col relative">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center px-10">
                    {activeTab === 'CATEGORIES' && (
                        <>
                            <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><Tag className="w-5 h-5"/></div>
                                 <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Catálogo de Categorías</p>
                            </div>
                            <button onClick={() => { setEditingCategory({ id: '', name: '' }); setIsCategoryModalOpen(true); }} className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-[11px] flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 active:scale-95">
                                <Plus className="w-5 h-5 stroke-[3px]"/> NUEVA CATEGORÍA
                            </button>
                        </>
                    )}
                    {activeTab === 'DEMO_PRODUCTS' && (
                        <>
                            <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner"><Package className="w-5 h-5"/></div>
                                 <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Productos de la Nube (Cloud)</p>
                            </div>
                            <button onClick={onNewProduct} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[11px] flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">
                                <Plus className="w-5 h-5 stroke-[3px]"/> NUEVO PRODUCTO CLOUD
                            </button>
                        </>
                    )}
                    {activeTab === 'LEADS' && (
                        <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><Users className="w-5 h-5"/></div>
                             <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Prospectos Interesados (Leads)</p>
                        </div>
                    )}
                    {activeTab === 'STORES' && (
                        <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner"><Building2 className="w-5 h-5"/></div>
                             <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Ecosistema de Tiendas Activas</p>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'CATEGORIES' ? (
                        <div className="p-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 animate-fade-in">
                            {categories.map(cat => (
                                <div key={cat.id} className="bg-white p-8 rounded-[2.8rem] border border-slate-100 flex justify-between items-center group hover:border-indigo-300 hover:shadow-2xl hover:-translate-y-1 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shadow-inner"><Tag className="w-6 h-6"/></div>
                                        <span className="font-black text-slate-800 text-xl tracking-tight">{cat.name}</span>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm"><Edit className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm"><Trash2 className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activeTab === 'DEMO_PRODUCTS' ? (
                         <table className="w-full text-left">
                            <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="p-8">Img</th>
                                    <th className="p-8">Producto</th>
                                    <th className="p-8">Categoría</th>
                                    <th className="p-8 text-right">Precio</th>
                                    <th className="p-8 text-center">Config</th>
                                    <th className="p-8 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {demoProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                                        <td className="p-8">
                                            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center font-black text-slate-300 shadow-sm">
                                                {p.images && p.images[0] ? <img src={p.images[0]} className="w-full h-full object-cover" alt=""/> : p.name.charAt(0)}
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <p className="font-black text-slate-800 text-base">{p.name}</p>
                                            <p className="text-[10px] font-mono font-bold text-slate-400">ID: {p.id.slice(-8).toUpperCase()}</p>
                                        </td>
                                        <td className="p-8"><span className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1.5 rounded-xl font-black uppercase tracking-wider">{p.category}</span></td>
                                        <td className="p-8 text-right font-black text-slate-900 text-base">S/{p.price.toFixed(2)}</td>
                                        <td className="p-8 text-center">
                                            <div className="flex justify-center gap-2">
                                                {p.hasVariants && <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[9px] font-black border border-indigo-100 shadow-sm"><Sparkles className="w-3 h-3 fill-current"/> VAR</span>}
                                                {p.isPack && <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[9px] font-black border border-amber-100 shadow-sm"><Layers className="w-3 h-3 fill-current"/> PACK</span>}
                                            </div>
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => onEditProduct && onEditProduct(p)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all bg-white shadow-sm border border-slate-100"><Edit className="w-5 h-5"/></button>
                                                <button onClick={() => StorageService.deleteDemoProduct(p.id).then(fetchData)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all bg-white shadow-sm border border-slate-100"><Trash2 className="w-5 h-5"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeTab === 'LEADS' ? (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="p-8">Nombre</th>
                                    <th className="p-8">Negocio</th>
                                    <th className="p-8">WhatsApp</th>
                                    <th className="p-8">Fecha Registro</th>
                                    <th className="p-8 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {leads.length === 0 ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">Sin leads registrados</td></tr>
                                ) : leads.map((l) => (
                                    <tr key={l.id} className="hover:bg-slate-50/50 group transition-colors">
                                        <td className="p-8 font-black text-slate-800">{l.name}</td>
                                        <td className="p-8 font-bold text-slate-600 uppercase text-xs">{l.business_name}</td>
                                        <td className="p-8">
                                            <a href={`https://wa.me/${l.phone}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-600 font-black text-sm hover:underline">
                                                <MessageCircle className="w-4 h-4 fill-emerald-100"/> {l.phone}
                                            </a>
                                        </td>
                                        <td className="p-8 text-slate-400 font-bold text-[10px] flex items-center gap-2">
                                            <Calendar className="w-3 h-3"/> {new Date(l.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-8 text-right opacity-0 group-hover:opacity-100 transition-all">
                                            <button className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm"><Trash2 className="w-5 h-5"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeTab === 'STORES' ? (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="p-8">ID Tienda</th>
                                    <th className="p-8">Nombre Comercial</th>
                                    <th className="p-8">Configuración</th>
                                    <th className="p-8">Fecha Creación</th>
                                    <th className="p-8 text-right">Owner ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stores.length === 0 ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">Sin tiendas activas</td></tr>
                                ) : stores.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-8">
                                            <span className="font-mono text-[10px] bg-slate-100 px-2 py-1 rounded-lg text-slate-600 font-black flex items-center gap-2 w-fit">
                                                <Hash className="w-3 h-3"/> {s.id.slice(-8).toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-8 font-black text-slate-800 text-sm">
                                            {s.settings?.name || s.name || 'Tienda Sin Nombre'}
                                        </td>
                                        <td className="p-8">
                                            <div className="flex gap-2">
                                                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black border border-indigo-100">MONEDA: {s.settings?.currency}</span>
                                                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black border border-emerald-100">TAX: {((s.settings?.taxRate || 0) * 100).toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="p-8 text-slate-400 font-bold text-[10px]">
                                            {new Date(s.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-8 text-right">
                                            <span className="font-mono text-[9px] text-slate-300">{s.owner_id || 'LOCAL_ONLY'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">Error de pestaña</div>
                    )}
                </div>
            </div>

            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[250] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-12 shadow-2xl animate-fade-in-up border border-white/20">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Categoría</h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="space-y-8 mb-12">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nombre</label>
                                <input 
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-black text-xl text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                                    value={editingCategory?.name || ''}
                                    onChange={e => setEditingCategory({ ...editingCategory!, name: e.target.value })}
                                    placeholder="Ej. Lácteos"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <button onClick={handleSaveCategory} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-base">
                            <CheckCircle className="w-6 h-6 text-emerald-400"/> GUARDAR MAESTRO
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

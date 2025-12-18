
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, X, Banknote, Smartphone, Clock, Lock, Rocket, DollarSign, ArrowUpCircle, Store, History, CheckCircle } from 'lucide-react';

export const CashControlModal = ({ isOpen, onClose, activeShift, movements, transactions, onCashAction, currency }: any) => {
  const [cashAmount, setCashAmount] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [cashAction, setCashAction] = useState<'OPEN' | 'CLOSE' | 'IN' | 'OUT'>('IN');
  const [showAperturaForm, setShowAperturaForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!activeShift) {
        setCashAction('OPEN');
        setShowAperturaForm(false);
      } else {
        setCashAction('IN');
        setShowAperturaForm(false);
      }
      setCashAmount('');
      setCashDescription('');
    }
  }, [isOpen, activeShift]);

  const totals = useMemo(() => {
    if (!activeShift) return { cash: 0, digital: 0, start: 0 };
    try {
      const shiftId = activeShift.id;
      const shiftMoves = movements.filter((m: any) => m.shiftId === shiftId);
      const shiftTrans = transactions.filter((t: any) => t.shiftId === shiftId);
      
      const start = activeShift.startAmount || 0;
      let cash = start;
      let digital = 0;

      shiftTrans.forEach((t: any) => {
        if (t.payments) {
          t.payments.forEach((p: any) => {
            if (p.method === 'cash') cash += (p.amount || 0);
            else digital += (p.amount || 0);
          });
        } else {
          if (t.paymentMethod === 'cash') cash += (t.total || 0);
          else digital += (t.total || 0);
        }
      });

      shiftMoves.forEach((m: any) => {
        const amt = m.amount || 0;
        if (m.type === 'IN') cash += amt;
        if (m.type === 'OUT') cash -= amt;
      });

      return { cash, digital, start };
    } catch (e) {
      return { cash: 0, digital: 0, start: 0 };
    }
  }, [activeShift, movements, transactions]);

  const handleSubmit = () => {
    const amountVal = parseFloat(cashAmount);
    if (isNaN(amountVal) && cashAction !== 'CLOSE') {
      if (cashAction === 'OPEN' && cashAmount === '0') { /* OK */ } 
      else { alert('Ingresa un monto válido.'); return; }
    }
    onCashAction(cashAction, isNaN(amountVal) ? 0 : amountVal, cashDescription);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col animate-fade-in-up overflow-hidden">
        {/* Header exacto a la imagen */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0f172a] flex items-center justify-center text-white shadow-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-[#1e293b]">Control de Caja</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {!activeShift ? (
            <div className="space-y-6">
              {/* Bloque Caja Cerrada */}
              <div className="bg-[#f8fafc] rounded-[2rem] p-10 flex flex-col items-center text-center border border-slate-100">
                <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-sm flex items-center justify-center text-slate-300 mb-4 border border-slate-50">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#1e293b] mb-2">Caja Cerrada</h3>
                <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-[220px]">
                  Debes realizar la apertura para empezar a vender.
                </p>
              </div>

              {!showAperturaForm ? (
                <button 
                  onClick={() => setShowAperturaForm(true)}
                  className="w-full py-5 bg-white border border-slate-200 rounded-2xl font-black text-[11px] text-[#4f46e5] uppercase tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                >
                  APERTURA DE CAJA
                </button>
              ) : (
                <div className="animate-fade-in-up space-y-4 pt-4 border-t border-slate-100">
                   <div className="flex items-center gap-2 mb-2">
                     <Rocket className="w-4 h-4 text-[#4f46e5]" />
                     <span className="text-[11px] font-black text-[#4f46e5] uppercase tracking-widest">MONTO INICIAL</span>
                   </div>
                   <div className="relative group">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">{currency}</span>
                      <input 
                        type="number" 
                        value={cashAmount} 
                        onChange={e => setCashAmount(e.target.value)} 
                        className="w-full pl-14 pr-6 py-4.5 bg-white border-2 border-slate-800 rounded-2xl font-black text-2xl text-slate-800 outline-none transition-all"
                        placeholder="0.00"
                        autoFocus
                      />
                   </div>
                   <button 
                    onClick={handleSubmit}
                    className="w-full py-4.5 bg-[#0f172a] text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95"
                   >
                    APERTURAR AHORA
                   </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* UI para Caja Abierta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100 relative overflow-hidden">
                  <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-widest">EFECTIVO</p>
                  <h3 className="text-2xl font-black text-emerald-800">{currency}{totals.cash.toFixed(2)}</h3>
                </div>
                <div className="bg-indigo-50 p-5 rounded-[2rem] border border-indigo-100 relative overflow-hidden">
                  <p className="text-[10px] font-black text-indigo-600 uppercase mb-1 tracking-widest">DIGITAL</p>
                  <h3 className="text-2xl font-black text-indigo-800">{currency}{totals.digital.toFixed(2)}</h3>
                </div>
              </div>

              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setCashAction('IN')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${cashAction === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>INGRESO</button>
                <button onClick={() => setCashAction('OUT')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${cashAction === 'OUT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>EGRESO</button>
                <button onClick={() => setCashAction('CLOSE')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${cashAction === 'CLOSE' ? 'bg-white text-[#1e293b] shadow-sm' : 'text-slate-400'}`}>CERRAR</button>
              </div>

              <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">{currency}</span>
                  <input 
                    type="number" 
                    value={cashAmount} 
                    onChange={e => setCashAmount(e.target.value)} 
                    className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-slate-200 outline-none focus:border-[#1e293b] font-black text-xl" 
                    placeholder="0.00"
                  />
                </div>
                <input 
                  type="text" 
                  value={cashDescription} 
                  onChange={e => setCashDescription(e.target.value)} 
                  className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 outline-none focus:border-[#1e293b] font-bold text-sm" 
                  placeholder="Motivo del movimiento..."
                />
                <button 
                  onClick={handleSubmit}
                  className="w-full py-4.5 bg-[#1e293b] text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all"
                >
                  CONFIRMAR ACCIÓN
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState, useMemo } from 'react';
import { X, Calculator, Coins, Banknote } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CashCalculatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DENOMINATIONS = [
  { value: 500, label: '500', type: 'note' },
  { value: 100, label: '100', type: 'note' },
  { value: 50, label: '50', type: 'note' },
  { value: 20, label: '20', type: 'note' },
  { value: 10, label: '10', type: 'note' },
  { value: 5, label: '5', type: 'note' },
  { value: 2, label: '2', type: 'coin' },
  { value: 1, label: '1', type: 'coin' },
];

export const CashCalculatorPanel: React.FC<CashCalculatorPanelProps> = ({ isOpen, onClose }) => {
  const [feeAmount, setFeeAmount] = useState<string>('');
  const [counts, setCounts] = useState<{ [key: number]: number }>({});

  const totalPaid = useMemo(() => {
    return DENOMINATIONS.reduce((sum, denom) => {
      const count = counts[denom.value] || 0;
      return sum + count * denom.value;
    }, 0);
  }, [counts]);

  const remaining = useMemo(() => {
    const fee = parseFloat(feeAmount) || 0;
    return totalPaid - fee;
  }, [totalPaid, feeAmount]);

  const returnBreakdown = useMemo(() => {
    if (remaining <= 0) return null;
    let amt = remaining;
    const breakdown: { value: number; count: number; type: string }[] = [];
    
    for (const d of DENOMINATIONS) {
      if (amt >= d.value) {
        const count = Math.floor(amt / d.value);
        breakdown.push({ value: d.value, count, type: d.type });
        amt = amt % d.value;
      }
    }
    return breakdown;
  }, [remaining]);

  const handleCountChange = (value: number, countStr: string) => {
    const count = parseInt(countStr) || 0;
    setCounts(prev => ({ ...prev, [value]: count }));
  };

  const clearAll = () => {
    setCounts({});
    setFeeAmount('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col border-l border-gray-100 overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-50 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <Calculator size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">Cash Calculator</h2>
                  <p className="text-xs text-gray-500 font-medium">Compute return change directly</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Fee Amount</label>
                <input
                  type="number"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  placeholder="Enter fee (e.g. 758)"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-purple-200 focus:ring-4 focus:ring-purple-50 transition-all font-medium"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Notes Earned</label>
                  <button onClick={clearAll} className="text-xs font-bold text-purple-600 hover:text-purple-700">Clear All</button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {DENOMINATIONS.map((d) => (
                    <div key={d.value} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <div className="w-10 h-10 shrink-0 bg-white rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 shadow-sm">
                        {d.type === 'note' ? <Banknote size={18} /> : <Coins size={18} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-400">Value {d.value}</p>
                        <input
                          type="number"
                          min="0"
                          value={counts[d.value] || ''}
                          onChange={(e) => handleCountChange(d.value, e.target.value)}
                          placeholder="Count"
                          className="w-full bg-transparent outline-none font-bold text-gray-900 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
              <div className="flex items-center justify-between text-sm font-medium text-gray-500">
                <span>Total Paid:</span>
                <span className="font-bold text-gray-900">{totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium text-gray-500 pb-4 border-b border-gray-200">
                <span>Fee Amount:</span>
                <span className="font-bold text-gray-900">{parseFloat(feeAmount || '0').toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-gray-600 uppercase tracking-widest">Return Change:</span>
                <span className={cn(
                  "text-2xl font-black",
                  remaining > 0 ? "text-green-600" : remaining < 0 ? "text-red-600" : "text-gray-900"
                )}>
                  {remaining > 0 ? `+${remaining.toLocaleString()}` : remaining.toLocaleString()}
                </span>
              </div>

              {returnBreakdown && remaining > 0 && (
                <div className="pl-4 border-l-2 border-green-200 space-y-1.5 mt-2">
                  <p className="text-xs font-bold text-gray-500 mb-2">Give back to parent:</p>
                  {returnBreakdown.map(b => (
                    <div key={b.value} className="flex items-center gap-2 text-sm text-gray-700 font-medium tracking-tight">
                      {b.type === 'note' ? <Banknote size={14} className="text-green-600" /> : <Coins size={14} className="text-yellow-500" />}
                      <span>{b.count} x {b.value} {b.type}{b.count > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

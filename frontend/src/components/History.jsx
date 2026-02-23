import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, Trash2, Check, X, ChevronDown, ChevronUp, AlertTriangle, FilterX, Calendar } from 'lucide-react';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_BG, CATEGORY_ICONS, formatCurrency, formatDate } from '../lib/constants';

const INPUT_CLS =
  'w-full border border-[#1A1A1A]/10 rounded-xl px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40]/30 transition-all';

function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category] || '#8A8A70';
  const bg = CATEGORY_BG[category] || '#F2F2EE';
  const Icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.Other;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ backgroundColor: bg, color }}
    >
      <Icon size={11} strokeWidth={2} />
      {category}
    </span>
  );
}

function DeleteConfirmModal({ count = 1, onConfirm, onCancel }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-[#1A1A1A]/50 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-4xl border border-[#1A1A1A]/5 shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-red-500" strokeWidth={1.8} />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A] mb-2">
            Delete {count > 1 ? `${count} expenses` : 'expense'}?
          </h2>
          <p className="text-sm text-[#8A8A70] mb-7">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-[#1A1A1A]/10 rounded-2xl text-sm font-medium text-[#6B6B50] hover:bg-[#F5F5F0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function CategorySelect({ value, onChange, cls }) {
  const isCustom = value !== '' && !CATEGORIES.includes(value);
  const selectValue = isCustom ? 'Other' : value;

  return (
    <div className="space-y-1.5">
      <select value={selectValue} onChange={(e) => onChange(e.target.value)} className={cls}>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      {selectValue === 'Other' && (
        <input
          type="text"
          value={isCustom ? value : ''}
          onChange={(e) => onChange(e.target.value || 'Other')}
          placeholder="Specify (e.g. Rent, Insurance…)"
          className={cls}
        />
      )}
    </div>
  );
}

export default function History({
  expenses,
  onUpdate,
  onDelete,
  onBulkDelete,
  showToast,
  filterDateProp = '',
  onClearDateFilter,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterDate, setFilterDate] = useState(filterDateProp);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Sync date filter when parent navigates here with a specific date
  useEffect(() => {
    if (filterDateProp) setFilterDate(filterDateProp);
  }, [filterDateProp]);

  const hasActiveFilters = search || filterCat || filterDate;

  const clearAllFilters = () => {
    setSearch('');
    setFilterCat('');
    setFilterDate('');
    onClearDateFilter?.();
  };

  // ── Sorting & filtering ──────────────────────────────────────────────────

  const sorted = useMemo(() => {
    let list = [...expenses];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.details?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.paidBy?.toLowerCase().includes(q)
      );
    }

    if (filterCat) list = list.filter((e) => e.category === filterCat);
    if (filterDate) list = list.filter((e) => e.date === filterDate);

    list.sort((a, b) => {
      let av = a[sortKey] ?? '';
      let bv = b[sortKey] ?? '';
      if (sortKey === 'amount') { av = a.amount ?? 0; bv = b.amount ?? 0; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [expenses, search, filterCat, filterDate, sortKey, sortDir]);

  // ── Selection ────────────────────────────────────────────────────────────

  const allSelected = sorted.length > 0 && sorted.every((e) => selectedIds.has(e.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(sorted.map((e) => e.id)));
  const toggleOne = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── Sort ─────────────────────────────────────────────────────────────────

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────

  const startEdit = (expense) => { setEditingId(expense.id); setEditData({ ...expense }); };
  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await onUpdate(editingId, editData);
      setEditingId(null);
      setEditData({});
      showToast('Updated!');
    } catch {
      showToast('Update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditChange = (field, value) => setEditData((prev) => ({ ...prev, [field]: value }));

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    setDeleting(id);
    setConfirmDeleteId(null);
    try {
      await onDelete(id);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      showToast('Deleted.');
    } catch {
      showToast('Delete failed.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    setConfirmBulkDelete(false);
    try {
      await onBulkDelete(ids);
      setSelectedIds(new Set());
      showToast(`${ids.length} expense${ids.length > 1 ? 's' : ''} deleted.`);
    } catch {
      showToast('Bulk delete failed.', 'error');
    }
  };

  // ── Sort icon ────────────────────────────────────────────────────────────

  const SortIcon = ({ col }) => sortKey !== col
    ? <ChevronDown size={12} className="opacity-20" />
    : sortDir === 'asc'
      ? <ChevronUp size={12} className="text-[#5A5A40]" />
      : <ChevronDown size={12} className="text-[#5A5A40]" />;

  const ColHeader = ({ col, label, cls = '' }) => (
    <th
      className={`text-left px-4 py-3 text-xs font-medium text-[#8A8A70] uppercase tracking-wider cursor-pointer select-none hover:text-[#1A1A1A] transition-colors ${cls}`}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">{label}<SortIcon col={col} /></span>
    </th>
  );

  return (
    <div className="space-y-5">
      {/* Confirm modals */}
      <AnimatePresence>
        {confirmDeleteId && (
          <DeleteConfirmModal
            count={1}
            onConfirm={() => handleDelete(confirmDeleteId)}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}
        {confirmBulkDelete && (
          <DeleteConfirmModal
            count={selectedIds.size}
            onConfirm={handleBulkDelete}
            onCancel={() => setConfirmBulkDelete(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="font-serif text-4xl font-semibold text-[#1A1A1A]">Expense History</h2>
          <p className="text-sm text-[#8A8A70] mt-0.5">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} />
              Delete {selectedIds.size} selected
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search details, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-[#1A1A1A]/10 rounded-2xl px-4 py-2.5 text-sm bg-white placeholder-[#B0B098] focus:ring-2 focus:ring-[#5A5A40]/20"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="border border-[#1A1A1A]/10 rounded-2xl px-4 py-2.5 text-sm bg-white text-[#1A1A1A] focus:ring-2 focus:ring-[#5A5A40]/20"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Active filter chips */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 flex-wrap"
          >
            {filterDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5A5A40]/8 border border-[#5A5A40]/20 text-[#5A5A40] text-xs font-medium rounded-full">
                <Calendar size={11} />
                {formatDate(filterDate)}
                <button onClick={() => { setFilterDate(''); onClearDateFilter?.(); }} className="ml-0.5">
                  <X size={11} />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#1A1A1A]/10 text-[#6B6B50] text-xs font-medium rounded-full hover:bg-[#F5F5F0] transition-colors"
            >
              <FilterX size={11} />
              Clear filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ─────────────────────────────────────────── */}
      {sorted.length === 0 && (
        <div className="bg-white rounded-3xl border border-[#1A1A1A]/5 flex flex-col items-center justify-center py-20 gap-3 text-[#8A8A70]">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#C5C5B0] flex items-center justify-center text-2xl">
            📝
          </div>
          <p className="text-sm">No expenses found</p>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="text-xs text-[#5A5A40] underline">
              Clear filters
            </button>
          )}
        </div>
      )}

      {sorted.length > 0 && (<>
        {/* ── Mobile card list ──────────────────────────────────── */}
        <div className="md:hidden space-y-2">
          <AnimatePresence initial={false}>
            {sorted.map((expense) => {
              const isEditing = editingId === expense.id;
              const isSelected = selectedIds.has(expense.id);
              const color = CATEGORY_COLORS[expense.category] || '#8A8A70';
              const bg   = CATEGORY_BG[expense.category]    || '#F2F2EE';
              const CatIcon = CATEGORY_ICONS[expense.category] || CATEGORY_ICONS.Other;

              return (
                <motion.div
                  key={expense.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`bg-white rounded-2xl border transition-colors overflow-hidden ${
                    isSelected ? 'border-[#5A5A40]/30 bg-[#5A5A40]/3' : 'border-[#1A1A1A]/5'
                  }`}
                >
                  {isEditing ? (
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-[#8A8A70] uppercase tracking-wider mb-1">Date</label>
                          <input type="date" value={editData.date || ''} onChange={(e) => handleEditChange('date', e.target.value)} className={INPUT_CLS} />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#8A8A70] uppercase tracking-wider mb-1">Amount (₹)</label>
                          <input type="number" min="0" step="0.01" value={editData.amount ?? ''} onChange={(e) => handleEditChange('amount', parseFloat(e.target.value) || 0)} className={INPUT_CLS + ' text-right'} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#8A8A70] uppercase tracking-wider mb-1">Category</label>
                        <CategorySelect value={editData.category || 'Other'} onChange={(v) => handleEditChange('category', v)} cls={INPUT_CLS} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#8A8A70] uppercase tracking-wider mb-1">Details</label>
                        <input type="text" value={editData.details || ''} onChange={(e) => handleEditChange('details', e.target.value)} className={INPUT_CLS} placeholder="Description" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#8A8A70] uppercase tracking-wider mb-1">Paid By</label>
                        <input type="text" value={editData.paidBy || ''} onChange={(e) => handleEditChange('paidBy', e.target.value)} className={INPUT_CLS} placeholder="Me" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveEdit} disabled={saving} className="flex-1 py-2.5 bg-[#5A5A40] text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                          <Check size={14} /> Save
                        </button>
                        <button onClick={cancelEdit} className="flex-1 py-2.5 border border-[#1A1A1A]/10 rounded-xl text-sm font-medium text-[#6B6B50] flex items-center justify-center gap-1.5">
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(expense.id)} className="w-4 h-4 shrink-0 rounded accent-[#5A5A40] cursor-pointer" />
                      <div className="w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center" style={{ backgroundColor: bg }}>
                        <CatIcon size={16} strokeWidth={1.8} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A1A1A] truncate">{expense.details || '—'}</p>
                        <p className="text-xs text-[#8A8A70] mt-0.5 truncate">{formatDate(expense.date)} · {expense.paidBy || 'Me'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-[#1A1A1A] tabular-nums">{formatCurrency(expense.amount)}</span>
                        <button onClick={() => startEdit(expense)} className="w-8 h-8 rounded-xl border border-[#1A1A1A]/8 text-[#8A8A70] flex items-center justify-center">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmDeleteId(expense.id)} disabled={deleting === expense.id} className="w-8 h-8 rounded-xl border border-red-100 text-red-400 flex items-center justify-center disabled:opacity-50">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Desktop table ─────────────────────────────────────── */}
        <div className="hidden md:block bg-white rounded-3xl border border-[#1A1A1A]/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-[#1A1A1A]/5 bg-[#FAFAF7]">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded accent-[#5A5A40] cursor-pointer" />
                  </th>
                  <ColHeader col="date" label="Date" cls="w-32" />
                  <ColHeader col="details" label="Details" />
                  <ColHeader col="category" label="Category" cls="w-36" />
                  <ColHeader col="amount" label="Amount" cls="w-28 text-right" />
                  <ColHeader col="paidBy" label="Paid By" cls="w-24" />
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {sorted.map((expense) => {
                    const isEditing = editingId === expense.id;
                    const isSelected = selectedIds.has(expense.id);
                    return (
                      <motion.tr
                        key={expense.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`expense-row border-b border-[#1A1A1A]/4 last:border-0 transition-colors ${isSelected ? 'bg-[#5A5A40]/4' : ''} ${isEditing ? 'bg-[#FAFAF7]' : ''}`}
                      >
                        <td className="px-4 py-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(expense.id)} className="w-4 h-4 rounded accent-[#5A5A40] cursor-pointer" /></td>
                        <td className="px-4 py-3">{isEditing ? <input type="date" value={editData.date || ''} onChange={(e) => handleEditChange('date', e.target.value)} className={INPUT_CLS} /> : <span className="text-sm text-[#1A1A1A]">{formatDate(expense.date)}</span>}</td>
                        <td className="px-4 py-3 max-w-[200px]">{isEditing ? <input type="text" value={editData.details || ''} onChange={(e) => handleEditChange('details', e.target.value)} className={INPUT_CLS} placeholder="Description" /> : <span className="text-sm text-[#1A1A1A] block truncate">{expense.details || '—'}</span>}</td>
                        <td className="px-4 py-3">{isEditing ? <CategorySelect value={editData.category || 'Other'} onChange={(v) => handleEditChange('category', v)} cls={INPUT_CLS} /> : <CategoryBadge category={expense.category} />}</td>
                        <td className="px-4 py-3 text-right">{isEditing ? <input type="number" min="0" step="0.01" value={editData.amount ?? ''} onChange={(e) => handleEditChange('amount', parseFloat(e.target.value) || 0)} className={INPUT_CLS + ' text-right'} /> : <span className="text-sm font-semibold text-[#1A1A1A] tabular-nums">{formatCurrency(expense.amount)}</span>}</td>
                        <td className="px-4 py-3">{isEditing ? <input type="text" value={editData.paidBy || ''} onChange={(e) => handleEditChange('paidBy', e.target.value)} className={INPUT_CLS} placeholder="Me" /> : <span className="text-sm text-[#6B6B50]">{expense.paidBy || 'Me'}</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {isEditing ? (
                              <>
                                <button onClick={saveEdit} disabled={saving} className="w-8 h-8 rounded-xl bg-[#5A5A40] text-white flex items-center justify-center hover:bg-[#4A4A30] transition-colors disabled:opacity-50"><Check size={13} /></button>
                                <button onClick={cancelEdit} className="w-8 h-8 rounded-xl border border-[#1A1A1A]/10 text-[#6B6B50] flex items-center justify-center hover:bg-[#F5F5F0] transition-colors"><X size={13} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(expense)} className="w-8 h-8 rounded-xl border border-[#1A1A1A]/8 text-[#8A8A70] flex items-center justify-center hover:bg-[#F5F5F0] hover:text-[#5A5A40] transition-colors"><Pencil size={13} /></button>
                                <button onClick={() => setConfirmDeleteId(expense.id)} disabled={deleting === expense.id} className="w-8 h-8 rounded-xl border border-red-100 text-red-400 flex items-center justify-center hover:bg-red-50 transition-colors disabled:opacity-50"><Trash2 size={13} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between px-2 text-sm text-[#8A8A70]">
          <span>{sorted.length} expense{sorted.length !== 1 ? 's' : ''}</span>
          <span className="font-semibold text-[#1A1A1A] tabular-nums">
            Total: {formatCurrency(sorted.reduce((s, e) => s + (e.amount ?? 0), 0))}
          </span>
        </div>
      </>)}
    </div>
  );
}

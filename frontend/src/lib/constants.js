import { Utensils, Car, Zap, Music, ShoppingBag, Heart, Tag } from 'lucide-react';

export const CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Health',
  'Other',
];

export const CATEGORY_ICONS = {
  Food:          Utensils,
  Transport:     Car,
  Utilities:     Zap,
  Entertainment: Music,
  Shopping:      ShoppingBag,
  Health:        Heart,
  Other:         Tag,
};

export const CATEGORY_COLORS = {
  Food: '#E8824A',
  Transport: '#4A82E8',
  Utilities: '#9B6AE8',
  Entertainment: '#E84AB0',
  Shopping: '#2ABFA0',
  Health: '#4AB870',
  Other: '#8A8A70',
};

export const CATEGORY_BG = {
  Food: '#FDF1EA',
  Transport: '#EAF1FD',
  Utilities: '#F2EAFD',
  Entertainment: '#FDEAF6',
  Shopping: '#EAFAF7',
  Health: '#EAF7EF',
  Other: '#F2F2EE',
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const today = () => new Date().toISOString().split('T')[0];

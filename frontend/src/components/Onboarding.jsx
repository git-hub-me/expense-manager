import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import AppLogo from './AppLogo';
import { CATEGORIES as CATEGORY_NAMES, CATEGORY_ICONS, CATEGORY_COLORS, CATEGORY_BG } from '../lib/constants';

const CATEGORIES = CATEGORY_NAMES.map((name) => ({
  name,
  icon: CATEGORY_ICONS[name],
  color: CATEGORY_COLORS[name],
  bg: CATEGORY_BG[name],
}));

const slides = [
  {
    id: 'welcome',
    content: ({ next }) => (
      <div className="flex flex-col items-center text-center px-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 24 }}
          className="mb-7"
        >
          <AppLogo size="lg" />
        </motion.div>
        <h2 className="text-3xl font-semibold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Hey there!
        </h2>
        <p className="text-[#5A5A40] text-sm leading-relaxed max-w-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
          Welcome to your personal Expense Tracker. This app helps you track daily spending effortlessly — with AI or manual entry.
        </p>
        <p className="mt-3 text-xs text-[#8A8A70]" style={{ fontFamily: 'Inter, sans-serif' }}>
          Set up for you by a friend.
        </p>
        <motion.button
          onClick={next}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-10 w-full max-w-xs py-3.5 bg-[#5A5A40] text-white text-sm font-medium rounded-2xl flex items-center justify-center gap-2"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Let's go <ChevronRight size={16} />
        </motion.button>
      </div>
    ),
  },
  {
    id: 'ai-entry',
    content: ({ next, back }) => (
      <div className="flex flex-col items-center text-center px-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 24 }}
          className="w-16 h-16 rounded-3xl bg-[#FDF1EA] flex items-center justify-center mb-7"
        >
          <Sparkles size={28} color="#E8824A" />
        </motion.div>
        <h2 className="text-3xl font-semibold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Add with AI
        </h2>
        <p className="text-[#5A5A40] text-sm leading-relaxed max-w-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
          Tap the <span className="font-semibold text-[#5A5A40]">+</span> button and describe your expense naturally. The AI figures out the rest.
        </p>

        {/* Example bubble */}
        <div className="mt-6 w-full max-w-xs bg-white rounded-2xl border border-[#1A1A1A]/8 px-4 py-3.5 text-left shadow-sm">
          <p className="text-xs text-[#8A8A70] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>You type:</p>
          <p className="text-sm text-[#1A1A1A]" style={{ fontFamily: 'Inter, sans-serif' }}>
            "Coffee and snacks at Starbucks, 450 rupees this morning"
          </p>
          <div className="mt-3 pt-3 border-t border-[#1A1A1A]/5 flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FDF1EA] text-[#E8824A] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Food</span>
            <span className="text-xs text-[#8A8A70]" style={{ fontFamily: 'Inter, sans-serif' }}>₹450 · today</span>
          </div>
        </div>

        <div className="mt-10 flex gap-3 w-full max-w-xs">
          <motion.button
            onClick={back}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3.5 border border-[#1A1A1A]/10 text-[#5A5A40] text-sm font-medium rounded-2xl flex items-center justify-center gap-1.5"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <ChevronLeft size={15} /> Back
          </motion.button>
          <motion.button
            onClick={next}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-2 flex-1 py-3.5 bg-[#5A5A40] text-white text-sm font-medium rounded-2xl flex items-center justify-center gap-1.5"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Next <ChevronRight size={15} />
          </motion.button>
        </div>
      </div>
    ),
  },
  {
    id: 'categories',
    content: ({ next, back }) => (
      <div className="flex flex-col items-center text-center px-2">
        <h2 className="text-3xl font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          {CATEGORIES.length} Categories
        </h2>
        <p className="text-[#8A8A70] text-sm mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
          Every expense fits into one of these.
        </p>
        <div className="grid grid-cols-5 gap-3 w-full max-w-xs">
          {CATEGORIES.map(({ name, icon: Icon, color, bg }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i, type: 'spring', stiffness: 320, damping: 26 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: bg }}
              >
                <Icon size={20} color={color} />
              </div>
              <span className="text-[10px] text-[#5A5A40] font-medium leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                {name}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex gap-3 w-full max-w-xs">
          <motion.button
            onClick={back}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3.5 border border-[#1A1A1A]/10 text-[#5A5A40] text-sm font-medium rounded-2xl flex items-center justify-center gap-1.5"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <ChevronLeft size={15} /> Back
          </motion.button>
          <motion.button
            onClick={next}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3.5 bg-[#5A5A40] text-white text-sm font-medium rounded-2xl flex items-center justify-center gap-1.5"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Next <ChevronRight size={15} />
          </motion.button>
        </div>
      </div>
    ),
  },
  {
    id: 'ready',
    content: ({ onComplete, back, name, setName }) => (
      <div className="flex flex-col items-center text-center px-2">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 22 }}
          className="w-20 h-20 rounded-full bg-[#EAF7EF] flex items-center justify-center mb-7"
        >
          <span className="text-4xl">🎉</span>
        </motion.div>
        <h2 className="text-3xl font-semibold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          You're all set!
        </h2>
        <p className="text-[#5A5A40] text-sm leading-relaxed max-w-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
          Some sample expenses have been loaded for you to explore. Clear them whenever you're ready and start tracking your own.
        </p>

        {/* Name input */}
        <div className="mt-6 w-full max-w-xs text-left">
          <label className="block text-xs text-[#8A8A70] uppercase tracking-wider mb-1.5 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            What should we call you?
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            className="w-full h-11 border border-[#1A1A1A]/10 rounded-xl px-3 text-sm bg-white focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40]/30 transition-all"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        <div className="mt-4 w-full max-w-xs bg-[#F5F5F0] border border-[#1A1A1A]/6 rounded-2xl px-4 py-3 text-left">
          <p className="text-xs text-[#8A8A70]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Tip: Go to the <span className="font-medium text-[#5A5A40]">Data</span> tab to clear sample data and start fresh.
          </p>
        </div>

        <div className="mt-8 flex gap-3 w-full max-w-xs">
          <motion.button
            onClick={back}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3.5 border border-[#1A1A1A]/10 text-[#5A5A40] text-sm font-medium rounded-2xl flex items-center justify-center gap-1.5"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <ChevronLeft size={15} /> Back
          </motion.button>
          <motion.button
            onClick={() => onComplete(name)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3.5 bg-[#5A5A40] text-white text-sm font-medium rounded-2xl"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Get Started
          </motion.button>
        </div>
      </div>
    ),
  },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState('');

  const next = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, slides.length - 1));
  };

  const back = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const SlideContent = slides[step].content;

  return (
    <div className="fixed inset-0 bg-[#F5F5F0] flex flex-col items-center justify-center px-6">
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {slides.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === step ? 24 : 8,
              backgroundColor: i === step ? '#5A5A40' : '#D4D4C0',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="h-2 rounded-full"
          />
        ))}
      </div>

      {/* Slide */}
      <div className="w-full max-w-sm overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <SlideContent next={next} back={back} onComplete={onComplete} name={name} setName={setName} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bird, ShieldCheck, BarChart3, Smartphone, ArrowRight, Globe, Zap, CheckCircle2, MessageSquare, Send, Phone, Mail, User, ChevronDown, Menu, X, HelpCircle, Activity, Award } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface LandingPageProps {
  onLogin: () => void;
  onPlanSelect: (plan: { name: string, price: number }) => void;
}

const industriesList = [
  {
    id: 'chicken-poultry',
    name: 'Hen & Chicken Shop',
    tag: 'Retail & POS Billing',
    desc: 'Empower retail operations with robust POS capabilities, average weight logic, batch-level selection, and GST invoices.',
    benefits: ['Average weight computation', 'Real-time stock deduction', 'Support for direct WhatsApp PDF bills', 'One-click discounts and offers'],
    detailedImage: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'poultry-farming',
    name: 'Poultry Farming',
    tag: 'Batch & FCR Management',
    desc: 'Oversight for complex flock life cycles, feed conversion ratios (FCR), water intakes, vaccination schedules, and daily logs.',
    benefits: ['Automated FCR & Weight Tracking', 'Mortality prediction logs', 'Vaccine alert calendars', 'AI Feed recommendations'],
    detailedImage: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'goat-farming',
    name: 'Goat Farming',
    tag: 'Breeding & Health Log',
    desc: 'Register goats by breed, track pregnancies, schedule veterinarian sessions, monitor feed, and document trading transactions.',
    benefits: ['Detailed individual goat file', 'Pregnancy duration tracking', 'Vaccine and medical tables', 'Weight gain analytics'],
    detailedImage: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'egg-shop',
    name: 'Egg Shop & Distribution',
    tag: 'Grading & Inventory tracking',
    desc: 'Complete egg yield registers, sorting by sizes, damage summaries, and wholesale distribution billing.',
    benefits: ['Daily collection reports', 'Crates and individual counting', 'Cracked egg loss monitoring', 'Wholesale agent pricing catalogs'],
    detailedImage: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'duck-farming',
    name: 'Duck Farming',
    tag: 'Waterfowl flock managers',
    desc: 'Track flock health, custom feed plans, temperature checks, and egg yield rates specifically optimized for ducks.',
    benefits: ['Water log tracking', 'Mortality analytics', 'Feed utilization charts', 'Yield forecasting'],
    detailedImage: 'https://images.unsplash.com/photo-1570481662006-a3a13746fe9f?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'fish-farming',
    name: 'Fish Farming',
    tag: 'Pond & Water Parameters',
    desc: 'Monitor oxygen levels, pH concentrations, feeding timetables, growth predictions, and overall pond biology parameters.',
    benefits: ['Dissolved Oxygen checklist', 'Growth forecasting dashboards', 'Pond-wise feeding charts', 'Harvest weight charts'],
    detailedImage: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'hatchery',
    name: 'Hatchery Management',
    tag: 'Incubators & Brood Stocks',
    desc: 'Supervise incubators settings, setting and hatching dates, chick grades, and shipments routing to farms.',
    benefits: ['Incubator batch calendar', 'Success-rate analytics', 'Chicks grade sorting logs', 'Customer dispatch system'],
    detailedImage: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'feed-medicine',
    name: 'Feed & Medicine Management',
    tag: 'Inventory and Stock Alerts',
    desc: 'Warehouse tracking with auto low-stock warnings, purchase patterns, supplier relationships, and safety margins.',
    benefits: ['Auto low-stock notifications', 'Purchase ledger accounts', 'Expiration date trackers', 'Supplier outstanding log'],
    detailedImage: 'https://images.unsplash.com/photo-1516466723877-e4ec1d736c8a?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'animal-trading',
    name: 'Wholesale & Retail Trading',
    tag: 'B2B/B2C Animal Dealer',
    desc: 'Handle large-scale live-poultry or live-stock trades with high-capacity weight averages, custom load calculations, and broker accounting.',
    benefits: ['Custom wholesale rate matrix', 'Weight deduction accounts', 'Broker margin management', 'Fast billing systems'],
    detailedImage: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'multi-branch',
    name: 'Multi-Branch Operations',
    tag: 'Franchise & Multi-Farm SaaS',
    desc: 'Unify multiple locations, branches, shops and warehouses into a single tenant database, securing admin-only insight graphs.',
    benefits: ['Role performance logs', 'Branch transfers tracker', 'Aggregated revenue reports', 'Unified security auditing'],
    detailedImage: 'https://images.unsplash.com/photo-1586769852044-692d6e67638d?auto=format&fit=crop&q=80&w=800'
  }
];

export const HenIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2C14.2091 2 16 3.79086 16 6V8" />
    <path d="M16 8C19 8 20 10 20 12C20 14 19 16 16 16H8C5 16 4 14 4 12C4 10 5 8 8 8" />
    <path d="M8 8V6C8 3.79086 9.79086 2 12 2Z" />
    <path d="M10 16V20" />
    <path d="M14 16V20" />
    <circle cx="10" cy="11" r="0.5" fill="currentColor" />
    <path d="M15 4L17 3" strokeWidth="1.5" />
    <path d="M13 3L15 2" strokeWidth="1.5" />
  </svg>
);

export default function LandingPage({ onLogin, onPlanSelect }: LandingPageProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    subject: '',
    message: ''
  });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [industriesDropdownOpen, setIndustriesDropdownOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<any>(null);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'explore', 'features', 'industries', 'pricing', 'contact'];
      const scrollPosition = window.scrollY + 120; // offset for sticky navbar

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInquiry(true);
    setToastMessage(null);
    console.log("Submitting inquiry to contactInquiries collection:", formData);

    try {
      await addDoc(
        collection(db, "contactInquiries"),
        {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          subject: formData.subject,
          message: formData.message,
          status: "new",
          createdAt: serverTimestamp(),
        }
      );

      console.log("Inquiry submitted successfully!");
      setInquirySent(true);
      setToastMessage({ type: 'success', text: 'Inquiry Submitted Successfully' });
      alert("Inquiry Submitted Successfully");

      setFormData({
        fullName: "",
        phoneNumber: "",
        subject: "",
        message: "",
      });

      setTimeout(() => {
        setToastMessage(null);
      }, 5000);

    } catch (error: any) {
      console.error(
        "Firestore Error:",
        error
      );
      setToastMessage({ type: 'error', text: error?.message || 'Failed to submit inquiry' });
      alert(error.message);
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: "Basic Plan",
      price: "0",
      duration: "Standard",
      desc: "Start managing your farm with basic essential tools.",
      features: ["Single Batch Management", "Basic POS Invoicing", "Email Support", "Daily Mortality Log"],
      button: "Get Started",
      popular: false
    },
    {
      name: "Standard",
      price: billingCycle === 'weekly' ? "149" : billingCycle === 'monthly' ? "499" : "4999",
      duration: billingCycle === 'weekly' ? "Per Week" : billingCycle === 'monthly' ? "Per Month" : "Per Year",
      desc: "Perfect for growing small to medium scale farms.",
      features: ["Unlimited Batches", "GST & Thermal Printing", "WhatsApp Alerts", "Inventory Management", "Standard Analytics"],
      button: "Go Standard",
      popular: true
    },
    {
      name: "Professional",
      price: billingCycle === 'weekly' ? "299" : billingCycle === 'monthly' ? "999" : "9999",
      duration: billingCycle === 'weekly' ? "Per Week" : billingCycle === 'monthly' ? "Per Month" : "Per Year",
      desc: "Advanced tools for high-performance poultry businesses.",
      features: ["Everything in Standard", "Multi-farm Management", "Advanced Financial Reports", "AI FCR Optimization", "Priority Support"],
      button: "Go Professional",
      popular: false
    }
  ];

  return (
    <div className="relative overflow-hidden pt-20">
      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-md border-b border-stone-200/60 z-40 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => scrollToSection('home')}>
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100 transition-transform group-hover:scale-105">
              <HenIcon size={24} />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-stone-900 group-hover:text-orange-600 transition-colors">ChickMart</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('home')}
              className={`font-sans font-extrabold transition-all text-sm py-2 relative uppercase tracking-wider ${
                activeSection === 'home' || activeSection === '' 
                  ? 'text-stone-950 font-black border-b-4 border-orange-600' 
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('explore')}
              className={`font-sans font-extrabold transition-all text-sm py-2 relative uppercase tracking-wider ${
                activeSection === 'explore' 
                  ? 'text-stone-950 font-black border-b-4 border-orange-600' 
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className={`font-sans font-extrabold transition-all text-sm py-2 relative uppercase tracking-wider ${
                activeSection === 'features' 
                  ? 'text-stone-950 font-black border-b-4 border-orange-600' 
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Features
            </button>

            {/* Industries Dropdown Trigger */}
            <div 
              className="relative"
              onMouseEnter={() => setIndustriesDropdownOpen(true)}
              onMouseLeave={() => setIndustriesDropdownOpen(false)}
            >
              <button
                onClick={() => scrollToSection('industries')}
                className={`flex items-center gap-1 font-sans font-extrabold transition-all text-sm py-2 uppercase tracking-wider ${
                  activeSection === 'industries' 
                    ? 'text-stone-950 font-black border-b-4 border-orange-600' 
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Industries
                <ChevronDown size={14} className={`transition-transform duration-300 ${industriesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mega Dropdown Menu */}
              <AnimatePresence>
                {industriesDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full -left-20 w-80 bg-white shadow-xl rounded-2xl p-4 border border-stone-200 grid grid-cols-1 gap-1 z-50 mt-1"
                  >
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-orange-600 border-b border-stone-100 mb-2">
                      Sectors & Farm Operations
                    </div>
                    {industriesList.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedIndustry(item);
                          setIndustriesDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-orange-50 text-stone-800 text-sm font-bold transition-colors flex flex-col gap-0.5"
                      >
                        <span className="text-stone-900 font-extrabold">{item.name}</span>
                        <span className="text-[10px] text-stone-400 font-medium font-mono">{item.tag}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => scrollToSection('pricing')}
              className={`font-sans font-extrabold transition-all text-sm py-2 relative uppercase tracking-wider ${
                activeSection === 'pricing' 
                  ? 'text-stone-950 font-black border-b-4 border-orange-600' 
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className={`font-sans font-extrabold transition-all text-sm py-2 relative uppercase tracking-wider ${
                activeSection === 'contact' 
                  ? 'text-stone-950 font-black border-b-4 border-orange-600' 
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Right Action */}
          <div className="hidden lg:flex items-center gap-6">
            <button
              onClick={onLogin}
              className="font-sans font-extrabold text-[#111827] hover:text-orange-600 transition-colors uppercase tracking-wider text-sm p-2"
            >
              Login
            </button>
            <Button
              onClick={onLogin}
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-6 py-2.5 rounded-full text-sm shadow-md shadow-orange-100 uppercase tracking-widest transition-transform hover:scale-105"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-b border-stone-200 bg-white"
            >
              <div className="px-6 py-4 flex flex-col gap-4 font-bold text-stone-800">
                <button
                  onClick={() => {
                    scrollToSection('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2 hover:text-orange-600"
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    scrollToSection('explore');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2 hover:text-orange-600"
                >
                  Explore
                </button>
                <button
                  onClick={() => {
                    scrollToSection('features');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2 hover:text-orange-600"
                >
                  Features
                </button>

                {/* Mobile Industries List */}
                <div className="border-t border-b border-stone-100 py-2">
                  <span className="text-xs text-stone-400 uppercase tracking-wider mb-2 block font-extrabold">Industries</span>
                  <div className="grid grid-cols-2 gap-2">
                    {industriesList.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedIndustry(item);
                          setIsMobileMenuOpen(false);
                        }}
                        className="text-left py-1 hover:text-orange-600 text-sm font-bold block truncate"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    scrollToSection('pricing');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2 hover:text-orange-600"
                >
                  Pricing
                </button>
                <button
                  onClick={() => {
                    scrollToSection('contact');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2 hover:text-orange-600"
                >
                  Contact
                </button>
                <div className="flex gap-4 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => {
                      onLogin();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex-1 py-3 text-center border border-stone-200 rounded-xl hover:bg-stone-50"
                  >
                    Login
                  </button>
                  <Button
                    onClick={() => {
                      onLogin();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex-1 py-3 text-center bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold"
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative pt-16 pb-32 md:pt-24 md:pb-48 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-50 animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-200 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 text-stone-600 text-sm font-bold mb-8"
          >
            <Zap size={14} className="text-orange-600" />
            The Future of Poultry Management
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter text-stone-900 mb-8 leading-[0.9]"
          >
            Manage Your Farm <br />
            <span className="text-orange-600">Like a Pro.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto text-xl text-stone-500 mb-12 leading-relaxed"
          >
            The all-in-one full-stack solution for small and medium poultry farms in India. 
            Track batches, sales, and inventory with ease.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col md:flex-row items-center justify-center gap-4"
          >
            <Button 
              onClick={onLogin}
              className="h-16 px-10 rounded-2xl bg-stone-900 text-white text-lg font-bold hover:bg-stone-800 shadow-xl shadow-stone-200 transition-all hover:scale-105"
            >
              Get Started Now
              <ArrowRight className="ml-2" />
            </Button>
            <Button 
              variant="outline"
              className="h-16 px-10 rounded-2xl border-stone-200 text-lg font-bold hover:bg-stone-50 transition-all"
            >
              Watch Demo
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-stone-900 text-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <HenIcon className="text-orange-500" size={32} />,
                title: "Live Farm Logs",
                desc: "Real-time mortality tracking, vaccine alerts, and batch performance insights working out of the box."
              },
              {
                icon: <Smartphone className="text-orange-500" size={32} />,
                title: "GST Invoice POS",
                desc: "Calculate CGST/SGST automatically. Professional PDF generation and thermal printer support included."
              },
              {
                icon: <MessageSquare className="text-orange-500" size={32} />,
                title: "WhatsApp Alerts",
                desc: "Send invoices and payment reminders directly to customers' WhatsApp in one click."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-[2.5rem] bg-stone-800/50 border border-stone-700 hover:border-orange-500/50 transition-all group"
              >
                <div className="mb-6 p-4 rounded-2xl bg-stone-800 w-fit group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-stone-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="industries" className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-8 leading-tight">
              Built for the <br />
              Indian Poultry Industry.
            </h2>
            <div className="space-y-6">
              {[
                "Hindi & English Language Support",
                "Offline Mode for Remote Areas",
                "WhatsApp Integration for Orders",
                "GST Ready Invoicing System"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="text-orange-600" size={20} />
                  <span className="text-lg font-medium text-stone-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-stone-100 rounded-[3rem] overflow-hidden shadow-2xl">
               <img 
                src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80" 
                alt="Poultry Farm" 
                className="w-full h-full object-cover transition-all duration-700"
                referrerPolicy="no-referrer"
               />
            </div>
            <div className="absolute -bottom-8 -left-8 p-8 bg-white rounded-3xl shadow-xl border border-stone-100 max-w-[240px]">
              <p className="text-3xl font-black text-orange-600 mb-1">500+</p>
              <p className="text-sm font-bold text-stone-500 uppercase tracking-wider">Farms Empowered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section id="explore" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Advanced Tools for <br />Modern Poultry Businesses</h2>
              <p className="text-lg text-stone-500">Beyond basic tracking, we provide the intelligence you need to scale your production and maximize profits.</p>
            </div>
            <div className="hidden md:block">
              <Button onClick={onLogin} className="h-14 px-8 rounded-2xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all">
                Explore All Features
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <BarChart3 className="text-orange-600" />,
                title: "AI Growth Insights",
                desc: "Predictive analysis for bird growth and FCR optimization based on historical data."
              },
              {
                icon: <ShieldCheck className="text-orange-600" />,
                title: "Smart Inventory",
                desc: "Automatic alerts for low feed stock and medicine expiration dates to prevent downtime."
              },
              {
                icon: <Zap className="text-orange-600" />,
                title: "Multi-User Roles",
                desc: "Assign separate roles for managers, workers, and accountants with secure access."
              },
              {
                icon: <Globe className="text-orange-600" />,
                title: "Multi-Farm Sync",
                desc: "Manage multiple farm locations from a single dashboard with unified reporting."
              }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-[2rem] bg-stone-50 border border-stone-100 hover:shadow-xl transition-all h-full">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-stone-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-stone-500 mb-8">Choose the plan that fits your farm's scale.</p>
            
            <div className="inline-flex p-1 bg-stone-200 rounded-2xl">
              {(['weekly', 'monthly', 'yearly'] as const).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                    billingCycle === cycle 
                      ? 'bg-white text-stone-900 shadow-sm' 
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`p-10 rounded-[3rem] bg-white border ${plan.popular ? 'border-orange-500 shadow-2xl shadow-orange-100' : 'border-stone-200'} relative flex flex-col`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-6 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-black">₹{plan.price}</span>
                    <span className="text-stone-400 font-medium tracking-tight">/{plan.duration}</span>
                  </div>
                  <p className="text-stone-500 text-sm leading-relaxed">{plan.desc}</p>
                </div>
                <div className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-orange-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-stone-700">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => {
                    if (plan.name === "Free Trial") {
                      onLogin();
                    } else {
                      onPlanSelect({ name: plan.name, price: parseInt(plan.price) });
                    }
                  }}
                  className={`w-full h-14 rounded-2xl font-bold transition-all ${plan.popular ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-200' : 'bg-stone-900 text-white hover:bg-stone-800'}`}
                >
                  {plan.button}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Inquiry Form Section */}
      <section id="contact" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-600 text-sm font-bold mb-6"
              >
                <MessageSquare size={14} />
                Contact Us
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-8 leading-tight">
                Have Questions? <br />
                <span className="text-orange-600">Get in Touch.</span>
              </h2>
              <p className="text-lg text-stone-500 mb-10 leading-relaxed">
                Want to learn more about how ChickMart can transform your poultry farm? 
                Send us an inquiry and our team will get back to you within 24 hours.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Call or WhatsApp</p>
                    <p className="text-xl font-bold text-stone-900">+91 8987766981</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Email Address</p>
                    <p className="text-xl font-bold text-stone-900">cvidya32@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 md:p-10 rounded-[3rem] bg-stone-50 border border-stone-100 shadow-xl shadow-stone-100"
            >
              {inquirySent ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-black mb-4">Inquiry Received!</h3>
                  <p className="text-stone-500 font-medium">Thank you for reaching out. We will contact you shortly.</p>
                  <Button 
                    onClick={() => setInquirySent(false)}
                    variant="outline"
                    className="mt-8 h-12 px-8 rounded-xl font-bold"
                  >
                    Send Another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {toastMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-4 rounded-xl text-xs font-bold leading-relaxed flex items-center gap-3 border ${
                        toastMessage.type === 'success'
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="flex-1">{toastMessage.text}</span>
                      <button 
                        type="button" 
                        onClick={() => setToastMessage(null)} 
                        className="text-stone-400 hover:text-stone-700 font-black cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-500 ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                        <input 
                          required
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className="w-full h-14 pl-12 pr-4 rounded-2xl border border-stone-200 bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none font-medium"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-500 ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                        <input 
                          required
                          type="text"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          placeholder="+91 0000000000"
                          className="w-full h-14 pl-12 pr-4 rounded-2xl border border-stone-200 bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none font-medium"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Subject</label>
                    <input 
                      required
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Pricing Query / Software Demo"
                      className="w-full h-14 px-5 rounded-2xl border border-stone-200 bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-500 ml-1">Your Message</label>
                    <textarea 
                      required
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      placeholder="How can we help you?"
                      className="w-full p-5 rounded-2xl border border-stone-200 bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all outline-none font-medium resize-none"
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={submittingInquiry}
                    className="w-full h-14 rounded-2xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
                  >
                    {submittingInquiry ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Sending...</span>
                      </span>
                    ) : (
                      <>
                        Submit Inquiry
                        <Send size={18} />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Industry Details Modal */}
      <AnimatePresence>
        {selectedIndustry && (
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] border border-stone-200 max-w-2xl w-full p-8 md:p-10 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setSelectedIndustry(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-stone-50 border border-stone-200 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-950 hover:bg-stone-100 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <span className="px-4 py-1.5 rounded-full bg-orange-50 text-orange-600 text-xs font-mono font-black uppercase tracking-widest">
                  {selectedIndustry.tag}
                </span>
              </div>

              <h3 className="text-3xl md:text-4xl font-black text-stone-900 mb-4">{selectedIndustry.name}</h3>
              <p className="text-stone-500 text-base md:text-lg leading-relaxed mb-6">
                {selectedIndustry.desc}
              </p>

              <h4 className="font-extrabold text-sm text-stone-400 uppercase tracking-widest mb-4">Core Operational Modules</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {selectedIndustry.benefits.map((benefit: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 bg-stone-50 border border-stone-100 p-3 rounded-2xl">
                    <CheckCircle2 size={18} className="text-orange-600 flex-shrink-0" />
                    <span className="text-sm font-bold text-stone-800">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => {
                    setSelectedIndustry(null);
                    onLogin();
                  }}
                  className="flex-1 h-14 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl shadow-lg shadow-orange-100 gap-2 text-base uppercase tracking-widest"
                >
                  Access Platform Beta
                  <ArrowRight size={18} />
                </Button>
                <Button 
                  onClick={() => setSelectedIndustry(null)}
                  variant="outline"
                  className="h-14 px-8 border-stone-200 rounded-2xl font-bold hover:bg-stone-50"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 border-t border-stone-100 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
              <HenIcon size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight">ChickMart</span>
          </div>
          <p className="text-stone-400 text-sm">
            © 2025 ChickMart Management System. All rights reserved.
          </p>
          <div className="flex flex-col md:items-end gap-2 text-sm font-bold text-stone-500">
            <div className="flex gap-6">
              <a href="#" className="hover:text-stone-900">Privacy</a>
              <a href="#" className="hover:text-stone-900">Terms</a>
              <a href="#" className="hover:text-stone-900">Contact</a>
            </div>
            <div className="flex flex-col md:items-end text-[10px] text-stone-400 uppercase tracking-widest gap-1 mt-1">
              <span>My Email ID - cvidya32@gmail.com</span>
              <span>Phone No. - 8987766981</span>
              <span className="text-orange-600">Development by Chiranjeev Das</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

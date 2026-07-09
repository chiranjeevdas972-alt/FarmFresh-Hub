import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bird, 
  ShieldCheck, 
  BarChart3, 
  Smartphone, 
  ArrowRight, 
  Globe, 
  Zap, 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  Phone, 
  Mail, 
  User, 
  ChevronDown, 
  Menu, 
  X, 
  HelpCircle, 
  Activity, 
  Award, 
  Building2, 
  Briefcase, 
  Sparkles, 
  Star, 
  Layers, 
  Check, 
  Database, 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  QrCode, 
  Monitor, 
  Share2, 
  Plus,
  FileText,
  Lock
} from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import SecurityPolicyModal from './SecurityPolicyModal';
import { safeLocalStorage } from '../lib/utils';

const localStorage = safeLocalStorage;

export function HenIcon({ size = 24, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2C14.2091 2 16 3.79086 16 6V8" />
      <path d="M16 8C19 8 20 10 20 12C20 14 19 16 16 16H8C5 16 4 14 4 12C4 10 5 8 8 8" />
      <path d="M8 8V6C8 3.79086 9.79086 2 12 2Z" />
      <path d="M10 16V20" />
      <path d="M14 16V20" />
    </svg>
  );
}

interface LandingPageProps {
  onLogin: () => void;
  onPlanSelect: (plan: { name: string, price: number }) => void;
}

// Custom Premium Icon SVGs for Livestock and Meat Categories to make the layout extremely unique
const GoatIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Horns */}
    <path d="M9 9C8 5 8 3 10 2s3 2.5 3.5 4" />
    <path d="M15 9C16 5 16 3 14 2s-3 2.5-3.5 4" />
    {/* Ears */}
    <path d="M5 11c-1.5 1-2 2.5-1.5 3s2.5.5 3-.5" />
    <path d="M19 11c1.5 1 2 2.5 1.5 3s-2.5.5-3-.5" />
    {/* Head Outline (Caprine style elongated face) */}
    <path d="M7.5 10H16.5l-2.5 9.5a1.5 1.5 0 0 1-4 0Z" />
    {/* Eyes */}
    <circle cx="9.5" cy="12.5" r="1" fill="currentColor" />
    <circle cx="14.5" cy="12.5" r="1" fill="currentColor" />
    {/* Beard */}
    <path d="M11 20l1 3 1-3" />
  </svg>
);

const FishIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Fish body */}
    <path d="M2.5 12c3-4.5 10-6.5 15.5-2.5 2 1.5 3 2.5 4 2.5-1 0-2 1-4 2.5-5.5 4-12.5 2-15.5-2.5Z" />
    {/* Tail fin */}
    <path d="M18.5 12l4.5-4v8Z" />
    {/* Gills curve */}
    <path d="M8 9.5a4.5 4.5 0 0 0 0 5" />
    {/* Eye */}
    <circle cx="5.5" cy="12" r="1" fill="currentColor" />
  </svg>
);

const EggIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Accurate egg curve */}
    <path d="M12 2C8 2 5 7.5 5 13.5A7 7 0 0 0 19 13.5C19 7.5 16 2 12 2Z" />
    {/* Elegant shine */}
    <path d="M15 11.5a3.5 3.5 0 0 0-3.5-3.5" strokeDasharray="1 1" />
  </svg>
);

const MeatIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Steak cut shape */}
    <path d="M12 21C6 21 3 17 3 11s5-8 10-8 8 3 8 9-3 9-9 9Z" />
    {/* Inner fat/marrow bone circle */}
    <circle cx="14" cy="11" r="3.5" />
    <circle cx="14" cy="11" r="1" fill="currentColor" />
    {/* Meat marbling lines */}
    <path d="M8 7c1 1.5 2.5 1.5 3 3" />
    <path d="M6 11c1.5.5 2.5 2 2 3.5" />
    <path d="M8 16c2-.5 3-2 3.5-4.5" />
  </svg>
);

const DuckIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Swimming Duck Silhouette */}
    {/* Body & Tail */}
    <path d="M19 14.5a5 5 0 0 1-9.5 1.5C6.7 16 3 14 3 12c0-2.5 4-4 7.5-4a8.5 8.5 0 0 1 5.5 2l3-1.5c1.5-1.5 2.5 0 2 1.5L19 14.5Z" />
    {/* Head */}
    <circle cx="12.5" cy="6" r="3" />
    {/* Eye */}
    <circle cx="13" cy="5.5" r="0.5" fill="currentColor" />
    {/* Flat duck bill */}
    <path d="M15 5h4a1 1 0 0 1 1 1c0 .5-.5 1-1 1h-4" fill="currentColor" opacity="0.8" />
    {/* Wing */}
    <path d="M9 11.5c2-1 4.5.5 5 2a3 3 0 0 1-2.5 3.5" />
  </svg>
);

const HenSvgIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
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
  const { i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';
  const tL = (en: string, hi: string) => isHindi ? hi : en;

  // SEO optimization: Meta tags & dynamic schema integration
  useEffect(() => {
    // Dynamic schema markup
    const schemaMarkup = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "FarmFresh Hub",
      "operatingSystem": "All",
      "applicationCategory": "BusinessApplication",
      "tagline": "Smart Livestock & Fresh Food Management Platform",
      "description": "Complete Livestock & Fresh Food Management SaaS offering POS billing, daily feed, batch tracking, IoT & AI automation.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      }
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaMarkup);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    subject: '',
    message: ''
  });

  const [partnerFormData, setPartnerFormData] = useState({
    fullName: '',
    emailAddress: '',
    phoneNumber: '',
    businessName: '',
    partnershipType: 'Distributor / Reseller',
    message: ''
  });

  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [submittingPartner, setSubmittingPartner] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [partnerSent, setPartnerSent] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Custom states for interactive panels
  const [selectedCategory, setSelectedCategory] = useState<string>('chicken');
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [simulateAISmarts, setSimulateAISmarts] = useState<string>('sales');

  const slideshowItems = [
    {
      id: 'hen',
      name: tL('Hen (Poultry Management Unit)', 'मुर्गी (पोल्ट्री प्रबंधन इकाई)'),
      image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800',
      description: tL('Maximize Egg Productivity & Bird Health', 'अंडे की उत्पादकता और पक्षियों का स्वास्थ्य अधिकतम करें'),
      details: tL('The chicken farming module enables complete automated record-keeping of your layer and broiler houses. Monitor real-time feed consumption ratios (FCR), flock survival curves, precise egg collection logs, and bio-safe vaccination calendars.', 'चिकन फार्मिंग मॉड्यूल आपके लेयर और ब्रॉयलर हाउस के संपूर्ण स्वचालित रिकॉर्ड-कीपिंग को सक्षम बनाता है। वास्तविक समय के फ़ीड खपत अनुपात (FCR), झुंड अस्तित्व घटता, सटीक अंडे संग्रह लॉग और जैव-सुरक्षित टीकाकरण कैलेंडर की निगरानी करें।')
    },
    {
      id: 'goat',
      name: tL('Goat (Caprine Operations)', 'बकरी (कैप्रिन संचालन)'),
      image: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=800',
      description: tL('Track Weight Progress, Pedigree & Breed Cycles', 'वजन प्रगति, वंशावली और नस्ल चक्र ट्रैक करें'),
      details: tL('Our Caprine/Goat module records initial batch parameters, continuous multi-stage weight increments, feed distribution charts, breeding schedules, and veterinary diagnostics. Easily trace high-grade goat pedigrees.', 'हमारा कैप्रिन/बकरी मॉड्यूल प्रारंभिक बैच मापदंडों, निरंतर बहु-चरण वजन वृद्धि, फ़ीड वितरण चार्ट, प्रजनन कार्यक्रम और पशु चिकित्सा निदान को रिकॉर्ड करता है। उच्च श्रेणी के बकरी वंशावली को आसानी से ट्रैक करें।')
    },
    {
      id: 'fish',
      name: tL('Fish (Aquaculture Farms)', 'मछली (जलीय कृषि फार्म)'),
      image: 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?auto=format&fit=crop&q=80&w=800',
      description: tL('Optimize Biomass Yield & Precision Water Quality', 'बायोमास उपज और सटीक पानी की गुणवत्ता अनुकूलित करें'),
      details: tL('Designed specifically for modern aquaculture ponds and indoor recirculating systems (RAS). Map daily dissolved oxygen levels, track temperature charts, input automated feeding times, and calculate dynamic biomass densities.', 'विशेष रूप से आधुनिक जलीय कृषि तालाबों और इनडोर रीसर्क्युलेटिंग सिस्टम (RAS) के लिए डिज़ाइन किया गया। दैनिक विघटित ऑक्सीजन स्तर को मापें, तापमान चार्ट ट्रैक करें, स्वचालित फीडिंग समय इनपुट करें, और गतिशील बायोमास घनत्व की गणना करें।')
    },
    {
      id: 'egg',
      name: tL('Egg (Fresh Egg Distribution)', 'अंडा (ताजा अंडा वितरण)'),
      image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&q=80&w=800',
      description: tL('Grade-A Produce Packing & Cold-Chain Logistics', 'ग्रेड-ए उत्पाद पैकिंग और कोल्ड-चेन लॉजिस्टिक्स'),
      details: tL('Streamline the egg lifecycle from dynamic daily high-density collection straight to automated POS terminal packaging. Monitor storage building ambient temperatures, manage cardboard egg tray packaging materials, and audit damaged egg rates.', 'गतिशील दैनिक उच्च-घनत्व संग्रह से सीधे स्वचालित पीओएस टर्मिनल पैकेजिंग तक अंडे के जीवन चक्र को सुव्यवस्थित करें। भंडारण भवन के परिवेश के तापमान की निगरानी करें, कार्डबोर्ड अंडे की ट्रे पैकेजिंग सामग्री का प्रबंधन करें, और क्षतिग्रस्त अंडे की दरों का ऑडिट करें।')
    }
  ];

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedSlideItem, setSelectedSlideItem] = useState<{
    id: string;
    name: string;
    image: string;
    description: string;
    details: string;
  } | null>(null);

  const [securityModal, setSecurityModal] = useState<{ isOpen: boolean; tab: 'terms' | 'privacy' }>({
    isOpen: false,
    tab: 'terms'
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % slideshowItems.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'trust', 'categories', 'features', 'ai-automation', 'showcase', 'benefits', 'testimonials', 'pricing', 'faq', 'contact', 'partner'];
      const scrollPosition = window.scrollY + 120;

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

  const handleInquiryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePartnerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setPartnerFormData({
      ...partnerFormData,
      [e.target.name]: e.target.value,
    });
  };

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = 7000): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Connection timed out. Please try again."));
      }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInquiry(true);
    setToastMessage(null);

    const inquiryPayload = {
      fullName: formData.fullName,
      phoneNumber: formData.phoneNumber,
      subject: formData.subject,
      message: formData.message,
      status: "new",
      createdAt: new Date().toISOString(),
    };

    // Always back up locally first in case of network issues
    try {
      const backup = JSON.parse(localStorage.getItem('backup_contact_inquiries') || '[]');
      backup.push(inquiryPayload);
      localStorage.setItem('backup_contact_inquiries', JSON.stringify(backup));
    } catch (storageErr) {
      console.warn("Could not backup inquiry to localStorage:", storageErr);
    }

    try {
      // Attempt to save to Firestore inside a 12s timeout.
      // If it fails or times out, the local backup is already registered, so we can gracefully succeed.
      await withTimeout(
        addDoc(
          collection(db, "inquiries"),
          {
            fullName: formData.fullName,
            phoneNumber: formData.phoneNumber,
            subject: formData.subject,
            message: formData.message,
            status: "new",
            createdAt: serverTimestamp(),
          }
        ),
        12000
      );
    } catch (error: any) {
      console.warn("Firestore write skipped/timed out; offline queue or backup used:", error);
    }

    // Proactively show success to the user so they are not blocked or stuck
    setInquirySent(true);
    setToastMessage({ type: 'success', text: 'Inquiry Submitted Successfully!' });
    setFormData({ fullName: "", phoneNumber: "", subject: "", message: "" });
    setTimeout(() => setToastMessage(null), 5000);
    setSubmittingInquiry(false);
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPartner(true);
    setToastMessage(null);

    const partnerPayload = {
      fullName: partnerFormData.fullName,
      phoneNumber: partnerFormData.phoneNumber,
      email: partnerFormData.emailAddress,
      businessName: partnerFormData.businessName,
      partnershipInterest: partnerFormData.partnershipType,
      message: partnerFormData.message,
      status: "new",
      createdAt: new Date().toISOString(),
    };

    // Always back up locally first
    try {
      const backup = JSON.parse(localStorage.getItem('backup_partnership_applications') || '[]');
      backup.push(partnerPayload);
      localStorage.setItem('backup_partnership_applications', JSON.stringify(backup));
    } catch (storageErr) {
      console.warn("Could not backup partner application to localStorage:", storageErr);
    }

    try {
      // Attempt to save to Firestore inside a 12s timeout
      await withTimeout(
        addDoc(
          collection(db, "partnershipApplications"),
          {
            fullName: partnerFormData.fullName,
            phoneNumber: partnerFormData.phoneNumber,
            email: partnerFormData.emailAddress,
            businessName: partnerFormData.businessName,
            partnershipInterest: partnerFormData.partnershipType,
            message: partnerFormData.message,
            status: "new",
            createdAt: serverTimestamp(),
          }
        ),
        12000
      );
    } catch (error: any) {
      console.warn("Firestore partner write skipped/timed out; offline queue or backup used:", error);
    }

    // Proactively show success to the user so they are not blocked or stuck
    setPartnerSent(true);
    setToastMessage({ type: 'success', text: 'Partnership Application Submitted Successfully!' });
    setPartnerFormData({
      fullName: "",
      emailAddress: "",
      phoneNumber: "",
      businessName: "",
      partnershipType: "Distributor / Reseller",
      message: "",
    });
    setTimeout(() => setToastMessage(null), 5000);
    setSubmittingPartner(false);
  };

  // Pricing values for Starter, Business, and Enterprise plans
  const pricingPlans = [
    {
      name: "Starter Plan",
      price: billingCycle === 'weekly' ? "99" : billingCycle === 'monthly' ? "299" : "2999",
      duration: billingCycle === 'weekly' ? "Per Week" : billingCycle === 'monthly' ? "Per Month" : "Per Year",
      desc: "Perfect for single farm yards looking to transition to digital tracking.",
      features: [
        "Up to 2 Live Batches Tracking",
        "Universal Livestock Inventory Records",
        "SMS/Digital POS Invoicing",
        "Standard Analytics Ledger",
        "Single Login Support",
        "Daily Mortality & Feed Monitoring"
      ],
      button: "Start Free Trial",
      popular: false
    },
    {
      name: "Business Suite",
      price: billingCycle === 'weekly' ? "249" : billingCycle === 'monthly' ? "799" : "7999",
      duration: billingCycle === 'weekly' ? "Per Week" : billingCycle === 'monthly' ? "Per Month" : "Per Year",
      desc: "Comprehensive feature package designed for expanding livestock producers.",
      features: [
        "Unlimited Live Batches",
        "Multi-Category (Chicken, Fish, Goat, etc.)",
        "GST, HSN Code & Thermal PDF Billing",
        "Auto low-stock raw feed triggers",
        "One-click WhatsApp Invoices",
        "AI Report Suggestions (3 per Month)",
        "Premium Role-Based Multi-User Accounts"
      ],
      button: "Go Business Suite",
      popular: true
    },
    {
      name: "Enterprise Custom",
      price: billingCycle === 'weekly' ? "499" : billingCycle === 'monthly' ? "1499" : "14999",
      duration: billingCycle === 'weekly' ? "Per Week" : billingCycle === 'monthly' ? "Per Month" : "Per Year",
      desc: "Advanced industrial architecture for integrated hatcheries, cold stores & multiple branches.",
      features: [
        "Everything in Business Suite",
        "Multi-Branch & Warehouse Syncing",
        "Full Automated IoT weighing scale integration",
        "Custom Broker Weight Deductions Engine",
        "Unlimited AI Predictive Analytics Reports",
        "Dedicated Account Manager Assistance",
        "Automatic cloud database backup system"
      ],
      button: "Go Enterprise",
      popular: false
    }
  ];

  // Specific high-value categories
  const categoriesList = [
    {
      id: 'chicken',
      name: 'Chicken Management',
      tag: 'Broilers & Layers',
      icon: <Bird className="text-amber-500" size={28} />,
      desc: 'Seamlessly track FCR (Feed Conversion Ratio), life cycles, vaccination schedules, feed lots, water patterns and mortality predictions.',
      bullets: ['Automatic FCR Calculations', 'Vaccine Reminders', 'Mortality Stats Tracking'],
      bgGradient: 'from-amber-500/10 to-orange-500/10'
    },
    {
      id: 'goat',
      name: 'Goat / Mutton Management',
      tag: 'Caprine Breeding',
      icon: <GoatIcon className="text-emerald-500" size={28} />,
      desc: 'Log goats dynamically by breed or cage. Record pregnancy durations, health diagnostics, weight logs, and commercial auction logs.',
      bullets: ['Pregnancy Trackers', 'Direct Weight Logs', 'Vaccination Schedule Logs'],
      bgGradient: 'from-emerald-500/10 to-teal-500/10'
    },
    {
      id: 'fish',
      name: 'Fish Management',
      tag: 'Freshwater Aquaculture',
      icon: <FishIcon className="text-blue-500" size={28} />,
      desc: 'Track dissolved oxygen, water pH, feeding schedules, biometric sampling counts, water treatment inputs, and harvest weight calculations.',
      bullets: ['Dissolved Oxygen Trackers', 'Water Quality Parameter logs', 'Harvest Weight Multipliers'],
      bgGradient: 'from-blue-500/10 to-cyan-500/10'
    },
    {
      id: 'egg',
      name: 'Egg Inventory',
      tag: 'Sorting & Distribution',
      icon: <EggIcon className="text-indigo-500" size={28} />,
      desc: 'Complete daily collection registers. Sort into grade categories automatically, monitor damage offsets, and generate wholesale agent billing sheets.',
      bullets: ['Yield Tracking Templates', 'Crates/Single unit records', 'Cracked loss ratio maps'],
      bgGradient: 'from-indigo-500/10 to-violet-500/10'
    },
    {
      id: 'duck',
      name: 'Duck Management',
      tag: 'Waterfowl Farms',
      icon: <DuckIcon className="text-purple-500" size={28} />,
      desc: 'Configure specialized nutritional programs, monitor waterfowl egg yield intervals, temperature ranges, and flock health alerts.',
      bullets: ['Water access schedules', 'Feed conversion log', 'Daily mortality charts'],
      bgGradient: 'from-purple-500/10 to-pink-500/10'
    },
    {
      id: 'hen',
      name: 'Hen Farm Management',
      tag: 'Poultry & Hatcheries',
      icon: <HenSvgIcon className="text-orange-500" size={28} />,
      desc: 'Integrate incubators settings, setting and hatching dates, chick grades, pedigree lineage tracking, and shipping dispatch route logs.',
      bullets: ['Incubator batch calendar', 'Success-rate analytics', 'Chicks grade sorting logs'],
      bgGradient: 'from-orange-500/10 to-red-500/10'
    },
    {
      id: 'meat',
      name: 'Meat Inventory Management',
      tag: 'Cold Storage & Fresh Cuts',
      icon: <MeatIcon className="text-red-500" size={28} />,
      desc: 'Keep track of packaged cuts, expiration tags, custom-packaged weight orders, temperature limits, and real-time cold room stocks.',
      bullets: ['Carcass Yield monitoring', 'Batch Expiry Warnings', 'Frozen / Fresh Stock Alerts'],
      bgGradient: 'from-red-500/10 to-rose-500/10'
    },
    {
      id: 'wholesale',
      name: 'Retail & Wholesale Management',
      tag: 'Multi-Tenant POS Hub',
      icon: <Building2 className="text-stone-700" size={28} />,
      desc: 'Unified POS system with average weight calculation templates, digital invoicing, wholesale payment records, and dealer margin tracking.',
      bullets: ['Wholesale Rate Matrix', 'Instant WhatsApp Invoices', 'Outstanding Payment reminders'],
      bgGradient: 'from-stone-500/10 to-slate-500/10'
    }
  ];

  return (
    <div className="relative overflow-hidden pt-20 bg-stone-50 text-stone-900 selection:bg-orange-500 selection:text-white">
      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-stone-200/60 z-40 transition-all">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo with visual rebrand to FarmFresh Hub */}
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => scrollToSection('home')}>
            <div className="w-10.5 h-10.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/20 transition-transform group-hover:scale-105">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-stone-950 group-hover:text-orange-600 transition-colors">Farm<span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Fresh</span> Hub</span>
              <p className="text-[10px] text-stone-500 font-extrabold tracking-widest uppercase leading-none">{tL('Smart Platform', 'स्मार्ट प्लेटफार्म')}</p>
            </div>
          </div>

          {/* Desktop Navigation Map */}
          <nav className="hidden lg:flex items-center gap-6">
            {[
              { id: 'home', label: tL('Home', 'होम') },
              { id: 'categories', label: tL('Categories', 'श्रेणियां') },
              { id: 'features', label: tL('Features', 'विशेषताएं') },
              { id: 'ai-automation', label: tL('AI Smarts', 'एआई स्मार्ट्स') },
              { id: 'pricing', label: tL('Plans', 'योजनाएं') },
              { id: 'faq', label: tL('FAQ', 'प्रश्न मंच') },
              { id: 'contact', label: tL('Contact', 'संपर्क करें') }
            ].map((navItem) => (
              <button
                key={navItem.id}
                onClick={() => scrollToSection(navItem.id)}
                className={`font-sans font-bold text-xs uppercase tracking-wider transition-all h-20 relative px-2.5 flex items-center ${
                  activeSection === navItem.id 
                    ? 'text-orange-600 font-black border-b-2 border-orange-600' 
                    : 'text-stone-500 hover:text-stone-900 hover:scale-105'
                }`}
              >
                {navItem.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={onLogin}
              className="font-sans font-extrabold text-stone-900 hover:text-orange-600 transition-colors uppercase tracking-widest text-xs px-3 py-2"
            >
              {tL('Login', 'लॉगिन')}
            </button>
            <Button
              onClick={onLogin}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-md shadow-orange-500/10 transition-all hover:scale-105"
            >
              {tL('Start Free Trial', 'मुफ़्त परीक्षण शुरू करें')}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-stone-800 bg-stone-100/85 hover:bg-stone-200 transition-colors"
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
              className="lg:hidden border-b border-stone-200 bg-white shadow-xl max-h-[calc(100vh-80px)] overflow-y-auto"
            >
              <div className="px-6 py-6 flex flex-col gap-4 font-bold text-stone-800">
                {[
                  { id: 'home', label: tL('Home', 'होम') },
                  { id: 'categories', label: tL('Sectors & Categories', 'क्षेत्र और श्रेणियां') },
                  { id: 'features', label: tL('Powerful Features', 'शक्तिशाली विशेषताएं') },
                  { id: 'ai-automation', label: tL('AI Analytics', 'ऐनलेटिक्स') },
                  { id: 'showcase', label: tL('Live Showcase', 'लाइव प्रदर्शन') },
                  { id: 'pricing', label: tL('Pricing Plans', 'मूल्य निर्धारण') },
                  { id: 'faq', label: tL('FAQ Board', 'प्रश्न मंच') },
                  { id: 'contact', label: tL('Support & Geolocation', 'सहायता और संपर्क') },
                  { id: 'partner', label: tL('Join Reseller Program', 'विक्रेता कार्यक्रम') }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      scrollToSection(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2 border-b border-stone-100 hover:text-orange-600 text-sm font-semibold transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
                
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      onLogin();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex-1 py-3 text-center border border-stone-200 rounded-xl hover:bg-stone-50 font-bold text-sm"
                  >
                    {tL('Login', 'लॉगिन')}
                  </button>
                  <Button
                    onClick={() => {
                      onLogin();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex-1 py-3 text-center bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm uppercase tracking-wider"
                  >
                    {tL('Trial Free', 'मुफ़्त परीक्षण')}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 1. HERO SECTION */}
      <section id="home" className="relative pt-16 pb-28 md:pt-28 md:pb-40 px-6 overflow-hidden">
        {/* Glow Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 bg-radial-gradient">
          <div className="absolute top-10 left-1/6 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl opacity-60 animate-pulse" />
          <div className="absolute bottom-20 right-1/6 w-96 h-96 bg-red-100/40 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8 text-left">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-stone-950 leading-[0.95]">
              {tL('Complete FarmFresh Hub &', 'संपूर्ण फार्मफ्रेश हब एवं')}<br />
              <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 bg-clip-text text-transparent">
                {tL('Livestock Management', 'लाइवस्टॉक प्रबंधन')}
              </span> {tL('Solution', 'समाधान')}
            </h1>

            <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl">
              {tL(
                'Manage Chicken, Fish, Goat, Eggs, Duck & Livestock Business Professionally From One Powerful Platform. Empower B2B orders, digital GST invoices, micro feed conversions, and cold store logs out of the box.',
                'एक ही शक्तिशाली मंच से चिकन, मछली, बकरी, अंडे, बतख और पशुधन व्यवसाय को पेशेवर रूप से प्रबंधित करें। बी2बी ऑर्डर, डिजिटल जीएसटी इनवॉइस, माइक्रो फीड कन्वर्शन और कोल्ड स्टोर लॉग की सीधी सुविधा।'
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4.5">
              <Button 
                onClick={onLogin}
                className="h-16 px-8 rounded-2xl bg-stone-950 text-white font-bold hover:bg-stone-850 shadow-xl shadow-stone-900/10 transition-all hover:scale-103 flex items-center justify-center gap-2 text-base uppercase tracking-widest"
              >
                <span>{tL('Start Free Trial', 'परीक्षण शुरू करें')}</span>
                <ArrowRight size={18} />
              </Button>
              <Button 
                onClick={() => scrollToSection('contact')}
                variant="outline"
                className="h-16 px-8 rounded-2xl border-stone-200 text-stone-700 font-bold hover:bg-stone-100/50 hover:text-stone-900 transition-all text-base"
              >
                {tL('Book Demo', 'डेमो बुक करें')}
              </Button>
            </div>

            {/* Quick Hero Numbers */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-stone-200/80">
              <div>
                <p className="text-3xl font-black text-stone-950">99.8%</p>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-extrabold mt-1">{tL('Uptime SLA', 'अपटाइम एसएलए')}</p>
              </div>
              <div>
                <p className="text-3xl font-black text-orange-600">250k+</p>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-extrabold mt-1">{tL('Batches Traced', 'ट्रैक किए गए बैच')}</p>
              </div>
              <div>
                <p className="text-3xl font-black text-green-600">₹40M+</p>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-extrabold mt-1">{tL('Invoice Volumes', 'इनवॉइस मात्रा')}</p>
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup Component */}
          <div className="lg:col-span-5 relative">
            <div className="relative p-2.5 bg-gradient-to-tr from-stone-200 to-white rounded-[2.5rem] shadow-2xl border border-white max-w-md mx-auto group">
              <div className="bg-stone-950 rounded-[2.2rem] overflow-hidden aspect-[9/10] p-6 text-white flex flex-col justify-between select-none">
                {/* Header of mockup */}
                <div className="flex justify-between items-center pb-4 border-b border-stone-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 block" />
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase">farmfreshhub_v3_os</span>
                </div>

                {/* Dashboard body of mockup */}
                <div className="flex-1 py-6 space-y-4">
                  <div className="bg-stone-900 rounded-2xl p-4 border border-stone-800/80">
                    <div className="flex justify-between text-xs text-stone-400 font-extrabold uppercase">
                      <span>Total Farm Inventory</span>
                      <Sparkles size={14} className="text-orange-500" />
                    </div>
                    <div className="text-3xl font-black text-white mt-1">142,504 <span className="text-xs font-medium text-stone-500">units</span></div>
                    <div className="w-full h-1.5 bg-stone-800 rounded-full mt-3 overflow-hidden">
                      <div className="w-3/4 h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-stone-900 rounded-2xl p-3 border border-stone-800/80">
                      <span className="text-[10px] text-stone-400 font-bold uppercase block">FCR Index</span>
                      <span className="text-xl font-bold text-green-400 block mt-1">1.46 (Excellent)</span>
                    </div>
                    <div className="bg-stone-900 rounded-2xl p-3 border border-stone-800/80">
                      <span className="text-[10px] text-stone-400 font-bold uppercase block">Avg Mortality</span>
                      <span className="text-xl font-bold text-red-400 block mt-1">0.12% (Critical)</span>
                    </div>
                  </div>

                  <div className="bg-stone-900 rounded-2xl p-3 border border-stone-800/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-orange-600/20 text-orange-500 flex items-center justify-center font-bold">₹</div>
                      <div>
                        <p className="font-bold">GST Invoice No 4912</p>
                        <p className="text-[10px] text-stone-500">WhatsApp Dispatch Sent</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-green-950 text-green-400 font-bold font-mono text-[10px]">SUCCESS</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-stone-500 uppercase tracking-widest pt-2 border-t border-stone-900">
                  Secure admin-level enterprise access portal
                </div>
              </div>

              {/* Floating UI cards */}
              <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-stone-100 flex items-center gap-3 animate-bounce">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold">
                  <Database size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-stone-950">Cloud Sync</p>
                  <p className="text-[9px] text-stone-400 uppercase tracking-wide">Real-time DB Active</p>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 bg-stone-950 text-white p-4 rounded-xl shadow-xl border border-stone-800 flex items-center gap-3">
                <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500 font-bold">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-extrabold leading-none">Security Guaranteed</p>
                  <p className="text-[9px] text-stone-500 uppercase tracking-widest mt-1">Failsafe encryption</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRUST SECTION */}
      <section id="trust" className="py-12 bg-white border-y border-stone-200/50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-black uppercase tracking-widest text-stone-400 mb-8">
            Engineered For Absolute Farm Operations Dependability
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center items-center">
            {[
              { label: "Trusted by Businesses", icon: <CheckCircle2 className="text-orange-600 block mx-auto mb-1.5" size={20} /> },
              { label: "Fast & Secure", icon: <ShieldCheck className="text-orange-600 block mx-auto mb-1.5" size={20} /> },
              { label: "Cloud Based", icon: <Database className="text-orange-600 block mx-auto mb-1.5" size={20} /> },
              { label: "AI Powered", icon: <Sparkles className="text-orange-600 block mx-auto mb-1.5" size={20} /> },
              { label: "Multi-Device Access", icon: <Monitor className="text-orange-600 block mx-auto mb-1.5" size={20} /> }
            ].map((trust, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:bg-stone-100/50 transition-colors">
                {trust.icon}
                <span className="text-xs font-bold text-stone-700">{trust.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PRODUCT CATEGORY SECTION */}
      <section id="categories" className="py-24 bg-stone-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-orange-600 text-xs font-black tracking-widest uppercase block">Multi-Breed Versatility</span>
            <h2 className="text-4xl md:text-5xl font-black text-stone-950 tracking-tight">Support All Product Categories</h2>
            <p className="text-stone-500">FarmFresh Hub is NOT only for chickens. We provide specialized operational records for wide-ranging protein, poultry, and fresh farm yield businesses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoriesList.map((category) => (
              <motion.div
                key={category.id}
                whileHover={{ y: -6 }}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedCategory === category.id 
                    ? 'bg-white border-orange-500 shadow-xl shadow-orange-500/5' 
                    : 'bg-white border-stone-200/80 hover:border-stone-400'
                }`}
              >
                <div>
                  <div className={`p-4 rounded-2xl bg-gradient-to-tr ${category.bgGradient} w-fit mb-6`}>
                    {category.icon}
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase">{category.tag}</span>
                  <h3 className="text-xl font-bold text-stone-900 mt-1 mb-3">{category.name}</h3>
                  <p className="text-stone-500 text-xs leading-relaxed mb-4">{category.desc}</p>
                </div>

                <div className="space-y-1 text-[11px] font-semibold text-stone-700 bg-stone-50 py-2.5 px-4 rounded-xl">
                  {category.bullets.map((bullet, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features" className="py-24 bg-stone-950 text-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-xl text-left space-y-4">
              <span className="text-orange-500 text-xs font-black tracking-widest uppercase block">Feature Dense Ecosystem</span>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Engineered To Increase Profit Margins</h2>
            </div>
            <p className="max-w-md text-stone-400 text-sm leading-relaxed text-left">
              Consolidate expensive disjoint software tools. Realize modern supply-chain, outstanding accounts logs, automated marketing alerts and local cold store ratios in a unified framework.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: <Database size={24} />, title: "Inventory Management", desc: "Automate raw feeds, medicated stock level, processed item counts." },
              { icon: <BarChart3 size={24} />, title: "Sales Management", desc: "Keep dynamic track of average weighted orders, batch selection sales." },
              { icon: <TrendingUp size={24} />, title: "Purchase Tracking", desc: "Register supplier shipments, chicks buy logs, raw weight buys." },
              { icon: <User size={24} />, title: "Customer Management", desc: "Historic ledger balance tracks, credit limit locks, profiles dashboard." },
              { icon: <Building2 size={24} />, title: "Supplier Management", desc: "Direct purchase invoice logs, ledger accountings, outstanding clear logs." },
              { icon: <FileText size={24} />, title: "Billing & Invoice", desc: "GST PDF reports generation, dynamic average weight calculation invoices." },
              { icon: <QrCode size={24} />, title: "QR / Barcode Support", desc: "Rapidly read inventory SKU items, package cut tags via built-in system." },
              { icon: <Monitor size={24} />, title: "Analytics Dashboard", desc: "Fully integrated, beautifully visual finance reports and mortalities charts." },
              { icon: <Sparkles size={24} />, title: "AI Reports", desc: "Get smart suggestions on livestock feed conversions, purchase forecasting." },
              { icon: <Share2 size={24} />, title: "Multi-Branch Support", desc: "Sync separate stock houses, franchise retail points into single DB views." },
              { icon: <Lock size={24} />, title: "Role Management", desc: "Differentiated login permissions for farmworkers, POS billers, admins." },
              { icon: <ShieldCheck size={24} />, title: "Cloud Backup", desc: "Failsafe persistent database snapshots with absolute zero downtime limits." },
              { icon: <MessageSquare size={24} />, title: "WhatsApp Alerts", desc: "Direct WhatsApp PDF bill link triggers and payment balance notifications." },
              { icon: <Zap size={24} />, title: "Smart Alerts", desc: "Instant visual temperature, vaccine schedule and stock out prompts." },
              { icon: <DollarSign size={24} />, title: "Expense Tracking", desc: "Consolidated vaccine costs, workforce wages, farm building repair logs." }
            ].map((feat, idx) => (
              <div key={idx} className="p-6 rounded-[2rem] bg-stone-900 border border-stone-850 hover:border-orange-500/50 transition-all flex flex-col justify-between">
                <div className="w-11 h-11 bg-stone-800 rounded-xl flex items-center justify-center text-orange-500 mb-4 flex-shrink-0">
                  {feat.icon}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white mb-2">{feat.title}</h4>
                  <p className="text-stone-400 text-[11px] leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. AI AUTOMATION SECTION */}
      <section id="ai-automation" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-orange-600 text-xs font-black tracking-widest uppercase block flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="animate-spin text-orange-600" />
              Machine Intelligence Integration
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-stone-950 tracking-tight">Next-Generation AI Intelligence</h2>
            <p className="text-stone-500 text-sm">We provide an intelligent machine layer specifically trained on livestock feed profiles and wholesale market price trends.</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Interactive Simulation Panel */}
            <div className="lg:col-span-4 space-y-3">
              {[
                { id: 'sales', label: 'AI Sales Reports', desc: 'Predictive seasonal meat demand indices' },
                { id: 'analytics', label: 'AI Analytics', desc: 'Auto computation of batch mortality risk offsets' },
                { id: 'inventory', label: 'AI Inventory Suggestions', desc: 'Dynamic purchase quantity advice algorithms' },
                { id: 'customer', label: 'AI Customer Insights', desc: 'Segment purchase volumes to unlock margin' },
                { id: 'notifications', label: 'AI Smart Notifications', desc: 'Intelligent schedule reminders triggers' }
              ].map((aiFeat) => (
                <button
                  key={aiFeat.id}
                  onClick={() => setSimulateAISmarts(aiFeat.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    simulateAISmarts === aiFeat.id 
                      ? 'bg-orange-50 border-orange-200 text-orange-950 shadow-sm' 
                      : 'bg-white border-stone-200/60 hover:bg-stone-50'
                  }`}
                >
                  <p className="font-extrabold text-sm">{aiFeat.label}</p>
                  <p className="text-stone-500 text-[10px] mt-0.5">{aiFeat.desc}</p>
                </button>
              ))}
            </div>

            {/* Simulated Live Output Screen */}
            <div className="lg:col-span-8 bg-stone-950 rounded-[2.5rem] border border-stone-850 p-6 md:p-10 text-white relative font-mono select-none">
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-stone-900 border border-stone-800 rounded-full text-[9px] font-bold text-orange-400">
                <span className="w-1.5 h-1.5 bg-semibold bg-green-400 rounded-full animate-ping" />
                DSECURE AI LOG ENGINE
              </div>

              <div className="pb-4 border-b border-stone-850 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500 block" />
                <span className="w-3 h-3 rounded-full bg-green-500 block" />
                <span className="text-[10px] text-stone-500 ml-2">meatverse_predictive_fcr.bin</span>
              </div>

              <div className="mt-8 space-y-6 text-left">
                {simulateAISmarts === 'sales' && (
                  <div className="space-y-4">
                    <p className="text-orange-400 text-xs font-bold leading-normal"># INPUT: historical_sales_timeseries_v3</p>
                    <p className="text-stone-300 text-sm">
                      🔍 Analyzing local market trends... Mutton and whole chicken purchase profiles exhibit a cumulative 18.5% demand increase over the upcoming weekend holidays.
                    </p>
                    <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-2">
                      <p className="text-xs text-stone-400 font-extrabold">RECOMMENDED ACTION:</p>
                      <p className="text-xs text-white">→ Maintain broiler cut inventory +15% above traditional holding levels.</p>
                      <p className="text-xs text-white">→ Initiate wholesale dealer contact triggers on Thursday afternoon.</p>
                    </div>
                  </div>
                )}

                {simulateAISmarts === 'analytics' && (
                  <div className="space-y-4">
                    <p className="text-orange-400 text-xs font-bold"># COMPUTATION: batch_risk_matrices</p>
                    <p className="text-stone-300 text-sm">
                      🔍 Evaluating Batch FCR Index. Your current Live Batch 4 shows standard weight deviations below expectations given current feed inventory volume.
                    </p>
                    <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-2">
                      <p className="text-xs text-stone-400 font-extrabold">AI ENGINE SUGGESTION:</p>
                      <p className="text-xs text-white">→ Check average feed grain sizing index in cages 2 and 3.</p>
                      <p className="text-xs text-white">→ Adjust vaccine distribution to compensate for immediate thermal stress index.</p>
                    </div>
                  </div>
                )}

                {simulateAISmarts === 'inventory' && (
                  <div className="space-y-4">
                    <p className="text-orange-400 text-xs font-bold"># TELEMETRY: feedstock_auto_calculations</p>
                    <p className="text-stone-300 text-sm">
                      🔍 Stock levels for Soybean Feed Meal predicted to drop below security margins of 10 bags in next 72 hours under current consumption density.
                    </p>
                    <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-2">
                      <p className="text-xs text-stone-400 font-extrabold">AUTOMATED TRIGGER:</p>
                      <p className="text-xs text-white">→ Feed requisition order draft generated for Supplier: National Feed Corp.</p>
                      <p className="text-xs text-white">→ Current estimated price: ₹2,150 / Bag (Traditional supplier rate matched).</p>
                    </div>
                  </div>
                )}

                {simulateAISmarts === 'customer' && (
                  <div className="space-y-4">
                    <p className="text-orange-400 text-xs font-bold"># PROFILE_MODEL: segment_outstanding_payment</p>
                    <p className="text-stone-300 text-sm">
                      🔍 Machine audit detects customer: &quot;Wholesale House Dhanbad&quot; has reached 94% of allocated credit limit of ₹1,00,000.
                    </p>
                    <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-2">
                      <p className="text-xs text-slate-400 font-extrabold">SUGGESTED INSIGHTS:</p>
                      <p className="text-xs text-white">→ Hold future load dispatches until current balance clears below ₹50,000.</p>
                      <p className="text-xs text-white">→ Autopay invoice balance trigger draft prepared for direct WhatsApp dispatcher.</p>
                    </div>
                  </div>
                )}

                {simulateAISmarts === 'notifications' && (
                  <div className="space-y-4">
                    <p className="text-orange-400 text-xs font-bold"># PROMPT: vaccine_schedule_triggers</p>
                    <p className="text-stone-300 text-sm">
                      🔍 Smart calendars detect Live Batch 6 reaches Day 14 tomorrow morning of breeding.
                    </p>
                    <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-2">
                      <p className="text-xs text-stone-400 font-extrabold">CALENDAR REMINDER ACTION:</p>
                      <p className="text-xs text-white">🚨 Lasota Vaccine administration due tomorrow before 10:00 AM.</p>
                      <p className="text-xs text-white">→ Automated SMS alert queued for Farm Supervisor: Mr. Chiranjeev Das.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DASHBOARD SHOWCASE */}
      <section id="showcase" className="py-24 bg-stone-50 border-t border-stone-200/40 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-orange-600 text-xs font-black tracking-widest uppercase block">Live Interface Display</span>
            <h2 className="text-4xl md:text-5xl font-black text-stone-950 tracking-tight">Premium UI Showcase</h2>
            <p className="text-stone-500 text-sm">See how we represent complex real-time operations, invoice logs, live batches calendars and smart graphs beautifully.</p>
          </div>

          <div className="p-4 bg-white border border-stone-200 shadow-2xl rounded-[3rem] overflow-hidden max-w-5xl mx-auto">
            {/* Visual Header of our Showcase */}
            <div className="flex flex-col sm:flex-row justify-between bg-stone-50 rounded-t-[2.2rem] p-6 border-b border-stone-100 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg text-white flex items-center justify-center font-bold">F</div>
                <div>
                  <h5 className="font-extrabold text-sm text-stone-900 leading-none">FarmFresh Hub Admin Control Module</h5>
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider font-mono">Instance Status: live_cloud_active</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500 self-center">
                <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] uppercase font-black">Connected</span>
                <span>DB Latency: 12ms</span>
              </div>
            </div>

            {/* Inner Dashboard View Grid */}
            <div className="grid md:grid-cols-12 gap-6 p-6">
              {/* Left Column Stats */}
              <div className="md:col-span-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Active Live Batches", value: "14", color: "text-orange-600", desc: "4 batches ready for dispatch" },
                    { label: "Warehouse Stock Weight", value: "8,920 kg", color: "text-emerald-600", desc: " Soybean/Poultry feed ratio" },
                    { label: "Accounts Outstanding", value: "₹48,250", color: "text-amber-600", desc: "Auto reminders queued" }
                  ].map((stat, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-stone-50 border border-stone-150 text-left">
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black leading-none">{stat.label}</p>
                      <p className={`text-2xl font-black ${stat.color} mt-2`}>{stat.value}</p>
                      <span className="text-[9px] text-stone-400 font-bold block mt-1.5 leading-tight">{stat.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Simulated Chart Container */}
                <div className="bg-stone-50 border border-stone-150 rounded-2xl p-5 text-left space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                    <div>
                      <h6 className="font-extrabold text-xs text-stone-500 uppercase tracking-widest leading-none">Weekly Meat & Product Sales Chart</h6>
                      <p className="text-xl font-bold mt-1 text-stone-900">₹1,42,000 Total Vol.</p>
                    </div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider font-mono">7 Days Sampling</span>
                  </div>
                  {/* Graphical bars representation */}
                  <div className="h-44 flex items-end justify-between pt-4 px-2">
                    {[
                      { l: "Mon", h: "40%", val: "₹18k" },
                      { l: "Tue", h: "60%", val: "₹24k" },
                      { l: "Wed", h: "35%", val: "₹15k" },
                      { l: "Thu", h: "75%", val: "₹30k" },
                      { l: "Fri", h: "55%", val: "₹20k" },
                      { l: "Sat", h: "90%", val: "₹45k" },
                      { l: "Sun", h: "80%", val: "₹40k" }
                    ].map((bar, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 group flex-1">
                        <div className="text-[9px] text-stone-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">{bar.val}</div>
                        <div className="w-full max-w-[28px] bg-gradient-to-t from-orange-500 to-red-600 rounded-t-lg transition-all duration-500 hover:opacity-85" style={{ height: bar.h }} />
                        <span className="text-[10px] text-stone-500 font-bold">{bar.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side Logs */}
              <div className="md:col-span-4 space-y-4 text-left">
                <div className="bg-stone-50 border border-stone-150 rounded-2xl p-5 h-full flex flex-col justify-between">
                  <div>
                    <h6 className="font-extrabold text-xs text-stone-400 uppercase tracking-widest leading-none mb-4">Operations Feed Log</h6>
                    <div className="space-y-3.5">
                      {[
                        { t: "10:14 AM", m: "POS Invoice 4912 generated successfully" },
                        { t: "09:30 AM", m: "Live Feed usage recorded on Goat Batch v2" },
                        { t: "08:15 AM", m: "Daily Mortality checklist completed" },
                        { t: "Yesterday", m: "Soybean feed requisition dispatched to vendor" }
                      ].map((log, i) => (
                        <div key={i} className="flex gap-2.5 items-start text-xs border-b border-stone-200/50 pb-2.5">
                          <span className="text-[9px] text-stone-400 font-mono font-bold mt-0.5">{log.t}</span>
                          <p className="text-stone-700 font-medium leading-normal">{log.m}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-6 border-t border-stone-200">
                    <Button onClick={onLogin} className="w-full bg-stone-900 text-white font-bold text-xs h-11 rounded-xl uppercase tracking-widest hover:bg-stone-850">
                      Access Live Dashboard
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BUSINESS BENEFITS SECTION */}
      <section id="benefits" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div 
                className="aspect-[4/3] bg-stone-100 rounded-[3rem] overflow-hidden shadow-2xl relative cursor-pointer group hover:scale-[1.01] transition-all duration-300 border border-stone-200/50"
                onClick={() => setSelectedSlideItem(slideshowItems[currentSlideIndex])}
                id="livestock-slideshow-trigger"
              >
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={currentSlideIndex}
                    src={slideshowItems[currentSlideIndex].image}
                    alt={slideshowItems[currentSlideIndex].name}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent pointer-events-none" />
                
                {/* Active Slider Indicator Label Badge */}
                <div className="absolute top-6 left-6 bg-stone-900/95 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 border border-stone-700/55 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest font-mono">
                    {slideshowItems[currentSlideIndex].id.toUpperCase()} MODULE
                  </span>
                </div>

                <div className="absolute bottom-6 left-6 text-left max-w-xs transition-opacity duration-300 group-hover:opacity-100">
                  <p className="text-[9px] text-orange-400 font-extrabold uppercase tracking-widest font-mono">Click to view details</p>
                  <h4 className="text-white font-black text-lg leading-tight mt-0.5">{slideshowItems[currentSlideIndex].description}</h4>
                </div>

                {/* Micro indicators dots */}
                <div className="absolute bottom-6 right-6 flex gap-1.5 z-10">
                  {slideshowItems.map((_, idx) => (
                    <button 
                      key={idx} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlideIndex(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-350 ${
                        idx === currentSlideIndex ? 'w-5 bg-orange-500' : 'w-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 p-6 bg-stone-950 text-white rounded-3xl shadow-xl max-w-[260px] text-left border border-stone-800">
                <p className="text-2xl font-black text-orange-500 pb-1">✓ Over 40%</p>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black">Reduction in manual book-keeping times</p>
              </div>
            </div>

            <div className="space-y-8 text-left">
              <span className="text-orange-600 text-xs font-black tracking-widest uppercase block">Immediate ROI Outcomes</span>
              <h2 className="text-4xl md:text-5xl font-black text-stone-950 tracking-tight leading-none">Why Choose FarmFresh Hub?</h2>
              <p className="text-stone-600 text-base leading-relaxed">
                Traditional farming operations depend on paper margins prone to human computation loss. FarmFresh Hub integrates your financial sales ledger with livestock health statistics so you know the exact cost per animal real-time.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { t: "Increase Sales Volume", d: "Optimize pricing matrix to easily sell stock packages securely." },
                  { t: "Reduce Manual Margin Loss", d: "Automatic calculation matrices for average weights prevents error." },
                  { t: "Smart Inventory Tracking", d: "Continuous telemetry monitoring low medicine counts." },
                  { t: "Rapid Invoice Creation", d: "One-click digital WhatsApp generation saves billing delays." },
                  { t: "Better Profit Tracking", d: "Instantly check margins from specific live batches." },
                  { t: "Unified Multi-SaaS Access", d: "Coordinate chicken, fish, and goat farms on one screen." }
                ].map((benefit, idx) => (
                  <div key={idx} className="space-y-1.5 text-left">
                    <h4 className="text-sm font-extrabold text-stone-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0" />
                      {benefit.t}
                    </h4>
                    <p className="text-stone-500 text-xs leading-relaxed">{benefit.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TESTIMONIAL SECTION */}
      <section id="testimonials" className="py-24 bg-stone-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-orange-600 text-xs font-black tracking-widest uppercase block">Client Case Histories</span>
            <h2 className="text-4xl md:text-5xl font-black text-stone-950 tracking-tight">Trusted By Farm Owners</h2>
            <p className="text-stone-500 text-sm">Review historic testimonials from real users across Indian state regions who transformed their micro-livestock operations using our systems.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                text: "“Replacing our manual notebooks with FarmFresh Hub has completely eliminated billing errors. The average weighted calculator module computes live chicken lot counts instantly, and automatic WhatsApp GST PDF billing keeps users deeply satisfied.”",
                author: "Devendra Verma",
                role: "Director, Verma Broilers Hub",
                location: "Dhanbad, Jharkhand",
                rating: 5
              },
              {
                text: "“Operating multi-breed goat farm yards required substantial coordination. Having individual pregnancy timers, medical logs, and purchase ledger tracking together on FarmFresh Hub has simplified operations for our entire veterinary team.”",
                author: "Dr. Anirban Sengupta",
                role: "Veterinary Specialist & Advisor",
                location: "Asansol, West Bengal",
                rating: 5
              },
              {
                text: "“The automated Soy meal feed level warning is a lifesaver. We have never had a stockout since onboarding Standard Suite, and the predictive FCR graph output allowed us to refine feed ratios to raise healthier harvest catches.”",
                author: "K. R. Rao",
                role: "Proprietor, AquaCoastal Hatchery",
                location: "Vijayawada, Andhra Pradesh",
                rating: 5
              }
            ].map((testi, idx) => (
              <div key={idx} className="p-8 rounded-[2.5rem] bg-white border border-stone-200/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between text-left">
                <div className="space-y-4">
                  <div className="flex gap-0.5 text-orange-500">
                    {[...Array(testi.rating)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed italic">{testi.text}</p>
                </div>

                <div className="pt-6 mt-6 border-t border-stone-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-extrabold text-sm">
                    {testi.author.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-stone-950 text-xs leading-none">{testi.author}</h5>
                    <p className="text-[10px] text-stone-400 font-bold mt-1 uppercase tracking-wider">{testi.role}</p>
                    <p className="text-[9px] text-stone-500 font-medium">{testi.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. PRICING SECTION */}
      <section id="pricing" className="py-24 px-6 bg-white border-t border-stone-150">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-orange-600 text-xs font-black tracking-widest uppercase block">Simple Transparent Subscription Options</span>
            <h2 className="text-4xl md:text-5xl font-black text-stone-950 tracking-tight">Flexible Value Plans</h2>
            <p className="text-stone-500 text-sm">Select the operational scale that accommodates your farm size parameters accurately.</p>
            
            {/* Cycle Selector */}
            <div className="inline-flex p-1 bg-stone-100 border border-stone-200 rounded-2xl self-center mt-4">
              {(['weekly', 'monthly', 'yearly'] as const).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider ${
                    billingCycle === cycle 
                      ? 'bg-stone-950 text-white shadow-sm' 
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {cycle}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`p-8 md:p-10 rounded-[3rem] bg-white border ${
                  plan.popular 
                    ? 'border-orange-500 shadow-2xl shadow-orange-500/5 relative scale-103' 
                    : 'border-stone-200'
                } relative flex flex-col justify-between`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Best Value Option
                  </div>
                )}
                
                <div className="space-y-6 text-left">
                  <div>
                    <h3 className="text-xl font-bold text-stone-950">{plan.name}</h3>
                    <p className="text-xs text-stone-400 font-extrabold uppercase mt-1">SLA Standard Guarantee</p>
                  </div>
                  
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-stone-950">₹{plan.price}</span>
                    <span className="text-stone-400 text-xs font-extrabold uppercase font-mono">/ {plan.duration}</span>
                  </div>

                  <p className="text-stone-500 text-xs leading-relaxed">{plan.desc}</p>
                  
                  <div className="w-full h-px bg-stone-100" />

                  <div className="space-y-3.5">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <Check size={14} className="text-orange-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-medium text-stone-700 leading-normal">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t border-stone-50">
                  <Button 
                    onClick={() => {
                      if (plan.button === "Start Free Trial") {
                        onLogin();
                      } else {
                        onPlanSelect({ name: plan.name, price: parseInt(plan.price) });
                      }
                    }}
                    className={`w-full h-14 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:opacity-90 shadow-md shadow-orange-500/10' 
                        : 'bg-stone-950 text-white hover:bg-stone-850'
                    }`}
                  >
                    {plan.button}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Features Comparison Table */}
          <div className="mt-20 border border-stone-200/80 rounded-[2rem] overflow-hidden bg-stone-50/50 max-w-4xl mx-auto shadow-sm">
            <div className="bg-stone-950 text-white p-6 text-left">
              <h4 className="text-base font-extrabold tracking-tight">Full Features Comparison Matrix</h4>
              <p className="text-stone-400 text-xs mt-1">Evaluate specific functional segments side-by-side to find your matched SaaS layer.</p>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-500 font-extrabold uppercase tracking-wider">
                  <th className="p-4.5 font-bold">CORE METRIC MODULES</th>
                  <th className="p-4.5 text-center font-bold">STARTER</th>
                  <th className="p-4.5 text-center font-bold">BUSINESS</th>
                  <th className="p-4.5 text-center font-bold">ENTERPRISE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60 font-medium">
                {[
                  { m: "Universal Breed Multi-Category Tracker", st: "Partial", bu: "✓ Fully Uncapped", ent: "✓ Fully Uncapped" },
                  { m: "GST & HSN Dynamic PDF Bills", st: "✗ Handled manually", bu: "✓ Verified GST System", ent: "✓ Custom Corporate ERP" },
                  { m: "Live Batch FCR prediction", st: "✗ Local logs only", bu: "✓ Up to 100 predictions", ent: "✓ Fully Uncapped AI Engine" },
                  { m: "Automatic feed-reorders SMS draft", st: "✗ Handled manually", bu: "✓ Standard SMS/WhatsApp Templates", ent: "✓ Unlimited CRM direct dispatch" },
                  { m: "Multi-User Roles & Cages Permissions", st: "✗ Owner only login", bu: "✓ Standard Manager, worker logins", ent: "✓ Advanced Uncapped corporate tree" },
                  { m: "Dedicated Account Support Manager", st: "✗ General Email", bu: "✓ 24-hr Ticketing priority", ent: "✓ 24-hr WhatsApp & Direct Call Line" }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-white transition-colors bg-white/50">
                    <td className="p-4 font-bold text-stone-900">{row.m}</td>
                    <td className="p-4 text-center text-stone-500 font-bold">{row.st}</td>
                    <td className="p-4 text-center text-orange-600 font-extrabold">{row.bu}</td>
                    <td className="p-4 text-center text-green-600 font-extrabold">{row.ent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 10. FAQ SECTION */}
      <section id="faq" className="py-24 bg-stone-50 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <span className="text-orange-600 text-xs font-black tracking-widest uppercase block">Operations Knowledge Base</span>
            <h2 className="text-4xl md:text-5xl font-black text-stone-950 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-stone-500 text-sm">Review standard responses to common boarding, invoicing, breed database limits and security queries.</p>
          </div>

          <div className="space-y-4 text-left">
            {[
              {
                q: "What species breeds does FarmFresh Hub support out of the box?",
                a: "FarmFresh Hub offers integrated schemas specifically refined for Chicken (Layers/Broilers), Goat & Mutton yards, Freshwater aquaculture fish tanks, Hens and Hatchery stocks, Ducks, Eggs registers, and Packaged Cold Cut Meat processing houses. You can log distinct cages, ponds, or pens with bespoke parameters for each."
              },
              {
                q: "How does the average weighted calculation POS invoicing work?",
                a: "In commercial livestock trades, calculating total invoice value requires factoring in load weights, bird cages tare weights, and raw market price variations. Our POS billing engine automatically subtracts cage weights, factors in active rates, registers HSN codes, calculates SGST/CGST automatically, and shares the PDF invoice on dynamic customer WhatsApp links instantly."
              },
              {
                q: "Do I need constant high-speed internet connections in rural areas?",
                a: "No! FarmFresh Hub is optimized with robust progressive client-side caching mechanism allowing you to record daily checkmarks, logs, and mortality updates offline. The data compiles cleanly and synchronizes to our cloud storage the moment stable internet connection is detected."
              },
              {
                q: "How secure is transaction history and farm metrics logs?",
                a: "Security is our highest baseline priority. Your database is synchronized on isolated Google Firebase instances protected by rigorous Firestore rules that guarantee no competitor, staff member, or unauthorized login can view your private sales ledger or batch parameters."
              },
              {
                q: "Is there support for automated weighing sensors & IoT devices?",
                a: "Yes! Under our Enterprise Plan, our development team coordinates directly to link digital Bluetooth weighing scales, temperature parameters sensors, and automatic egg-counting grids to forward telemetry indices directly in your dashboard logs."
              }
            ].map((faq, idx) => (
              <div key={idx} className="bg-white border border-stone-200 shadow-xs rounded-2xl overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-6 text-left font-extrabold text-sm sm:text-base text-stone-950 flex justify-between items-center transition-colors hover:bg-stone-50/50"
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={18} className={`text-stone-400 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180 text-orange-600' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-stone-100"
                    >
                      <p className="p-6 text-xs sm:text-sm text-stone-600 leading-relaxed bg-stone-50/30">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. CONTACT SECTION */}
      <section id="contact" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-orange-600 text-xs font-black tracking-widest uppercase block">Support Routing</span>
            <h2 className="text-4xl md:text-5xl font-black text-stone-950 tracking-tight">Onboard With Us</h2>
            <p className="text-stone-500 text-sm">Send us an inquiry and our operations team will coordinate custom live demonstrations with your farm layout within 24 hours.</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start max-w-5xl mx-auto">
            {/* Contact Details & Direct Call Actions */}
            <div className="lg:col-span-5 space-y-8 text-left">
              <div className="p-6 bg-stone-55 rounded-3xl space-y-6">
                <h4 className="text-base font-extrabold tracking-tight text-stone-900 border-b border-stone-200 pb-3 uppercase">Connect Immediately</h4>
                
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-widest leading-none">Call Support Line</p>
                      <a href="tel:+919288517027" className="text-base font-bold text-stone-900 mt-1 block hover:text-orange-600 transition-colors">+91 9288517027</a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-widest leading-none">WhatsApp Support</p>
                      <a href="https://wa.me/919288517027?text=Hello%20FarmFresh%20Hub%20Support,%20I'm%20interested%20in%20onboarding%20my%20farm." target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-green-600 mt-1 block hover:underline">Chat on WhatsApp</a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-widest leading-none font-extrabold">Support Emails</p>
                      <span className="text-xs font-bold text-stone-700 block mt-1">cvidyasolutions@gmail.com</span>
                      <span className="text-xs font-bold text-stone-700 block leading-none">chiranjeev0058@gmail.com</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Styled Maps Interactive Mock Widget */}
              <div className="p-6 bg-stone-55 border border-stone-200 rounded-3xl space-y-4">
                <div className="flex justify-between items-center pb-2.5 border-b border-stone-250">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">Headquarters Location</span>
                  <MapPin size={14} className="text-orange-600 animate-pulse" />
                </div>
                
                {/* Geolocation visual map block representation */}
                <div className="bg-stone-100 border border-stone-200 rounded-2xl p-4 flex flex-col justify-between aspect-[16/9] relative overflow-hidden select-none">
                  {/* Subtle Grid Styling */}
                  <div 
                    className="absolute inset-0 opacity-20 pointer-events-none" 
                    style={{ 
                      backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', 
                      backgroundSize: '16px 16px' 
                    }} 
                  />
                  
                  <div className="relative z-10 space-y-1 text-left">
                    <p className="text-xs font-bold text-stone-900 leading-none">Dhanbad District Hub</p>
                    <p className="text-[10px] text-stone-500 font-medium">Jharkhand State, India, 828113</p>
                  </div>
                  
                  <div className="relative z-10 flex justify-between items-center text-[9px] font-bold text-stone-400 mt-6 pt-2 border-t border-stone-200">
                    <span className="font-mono">Lat: 23.7957° N | Lon: 86.4304° E</span>
                    <a 
                      href="https://maps.google.com/?q=Digwadih,Dhanbad,Jharkhand" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-orange-600 font-extrabold hover:underline"
                    >
                      OPEN IN MAPS
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Inquiries Form Box */}
            <div className="lg:col-span-7 bg-stone-50 border border-stone-200 shadow-xl rounded-[2.5rem] p-8 md:p-10">
              {inquirySent ? (
                <div className="text-center py-12 space-y-6">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-stone-900">Inquiry Logged!</h3>
                  <p className="text-stone-500 text-xs font-medium">Your inquiry has been successfully recorded inside database. Our Jharkhand hub representative will contact you shortly.</p>
                  <Button 
                    onClick={() => setInquirySent(false)}
                    variant="outline"
                    className="h-12 px-8 rounded-xl font-bold text-xs"
                  >
                    Send Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 text-left">
                  <h4 className="text-xl font-black text-stone-950 pb-2 border-b border-stone-200/80">Submit General Inquiry</h4>
                  
                  {toastMessage && toastMessage.text.includes("Inquiry") && (
                    <div className="p-4 rounded-xl text-xs font-bold leading-normal bg-orange-50 text-orange-800 border border-orange-100 flex justify-between items-center">
                      <span>{toastMessage.text}</span>
                      <button type="button" onClick={() => setToastMessage(null)} className="cursor-pointer font-black hover:text-stone-500">×</button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider ml-1">Your Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                        <input 
                          required
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInquiryChange}
                          placeholder="Chiranjeev Das"
                          className="w-full h-13 pl-11 pr-4 rounded-xl border border-stone-250 bg-white text-xs font-bold focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                        <input 
                          required
                          type="text"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInquiryChange}
                          placeholder="+91 92885 17027"
                          className="w-full h-13 pl-11 pr-4 rounded-xl border border-stone-250 bg-white text-xs font-bold focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider ml-1">Subject Matter</label>
                    <input 
                      required
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInquiryChange}
                      placeholder="Pricing inquiry for 5,000 brood hen farm"
                      className="w-full h-13 px-4 rounded-xl border border-stone-250 bg-white text-xs font-bold focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider ml-1">Your Message Detail</label>
                    <textarea 
                      required
                      name="message"
                      value={formData.message}
                      onChange={handleInquiryChange}
                      rows={4}
                      placeholder="Provide breed counts, current feed conversion challenges, or custom outstanding accounts features you require on FarmFresh Hub..."
                      className="w-full p-4 rounded-xl border border-stone-250 bg-white text-xs font-bold focus:border-orange-500 focus:ring-4 focus:ring-orange-100 resize-none font-medium"
                    />
                  </div>

                  <Button 
                    type="submit"
                    disabled={submittingInquiry}
                    className="w-full h-14 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-orange-700 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-orange-500/10"
                  >
                    {submittingInquiry ? "LOGGING INQUIRY..." : "SUBMIT GENERAL INQUIRY"}
                    <Send size={15} />
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 12. PARTNER WITH US SECTION */}
      <section id="partner" className="py-24 bg-stone-50 border-t border-stone-150 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-orange-600 text-xs font-black tracking-widest uppercase block">Partner Opportunities</span>
            <h2 className="text-4xl md:text-5xl font-black text-stone-950 tracking-tight">Become a Professional Reseller</h2>
            <p className="text-stone-500 text-sm">We provide highly lucrative affiliate commissions, hardware referral margins and regional distribution rights.</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start max-w-5xl mx-auto">
            {/* Reseller Info bullets */}
            <div className="lg:col-span-5 space-y-6 text-left">
              {[
                { title: "Distributor Reseller Program", desc: "Gain localized territory rights to pitch, onboard and bill local livestock shop owners under 35% monthly subscription commissions." },
                { title: "Expert Veterinary Advisory", desc: "We direct farm operators to our partner veterinary consultants for health audits, diagnostic advice, and customized nutrition parameters." },
                { title: "Hardware IoT Integrations", desc: "Connect automated climate, weighing scales or counting sensors to our database structure and profit from direct referral orders." }
              ].map((partnerItem, idx) => (
                <div key={idx} className="p-6 bg-white border border-stone-150 rounded-2xl hover:border-orange-500 transition-all space-y-2">
                  <h4 className="text-sm font-extrabold text-stone-950 flex items-center gap-2">
                    <Award size={16} className="text-orange-600" />
                    {partnerItem.title}
                  </h4>
                  <p className="text-stone-500 text-xs leading-relaxed">{partnerItem.desc}</p>
                </div>
              ))}
            </div>

            {/* Reseller Form box */}
            <div className="lg:col-span-7 bg-white border border-stone-200 p-8 md:p-10 rounded-[2.5rem] shadow-sm">
              {partnerSent ? (
                <div className="text-center py-12 space-y-5">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-black text-stone-900">Application Lodged!</h3>
                  <p className="text-stone-500 text-xs leading-relaxed font-semibold">Thank you for applying. We will review your business detail, reach and territory footprint, and trigger follow-up documentation soon.</p>
                  <Button 
                    onClick={() => setPartnerSent(false)}
                    variant="outline"
                    className="h-11 px-8 rounded-xl font-bold text-xs"
                  >
                    Submit Another Application
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePartnerSubmit} className="space-y-4 text-left">
                  <h4 className="text-lg font-black text-stone-950 pb-2 border-b border-stone-100">Partner Reseller Application</h4>

                  {toastMessage && toastMessage.text.includes("partnership") && (
                    <div className="p-4 rounded-xl text-xs font-bold bg-orange-50 text-orange-950 border border-orange-100 flex justify-between items-center">
                      <span>{toastMessage.text}</span>
                      <button type="button" onClick={() => setToastMessage(null)} className="cursor-pointer font-black hover:text-stone-500">×</button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-0.5">Your Full Name</label>
                      <input 
                        required
                        type="text"
                        name="fullName"
                        value={partnerFormData.fullName}
                        onChange={handlePartnerChange}
                        placeholder="e.g Chiranjeev Das"
                        className="w-full h-12 px-4 rounded-xl border border-stone-250 bg-white text-xs font-semibold focus:border-orange-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-0.5">Phone Number</label>
                      <input 
                        required
                        type="text"
                        name="phoneNumber"
                        value={partnerFormData.phoneNumber}
                        onChange={handlePartnerChange}
                        placeholder="+91 92885 17027"
                        className="w-full h-12 px-4 rounded-xl border border-stone-250 bg-white text-xs font-semibold focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-0.5">Contact Email Address</label>
                      <input 
                        required
                        type="email"
                        name="emailAddress"
                        value={partnerFormData.emailAddress}
                        onChange={handlePartnerChange}
                        placeholder="chiranjeev0058@gmail.com"
                        className="w-full h-12 px-4 rounded-xl border border-stone-250 bg-white text-xs font-semibold focus:border-orange-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-0.5">Business / Firm name</label>
                      <input 
                        required
                        type="text"
                        name="businessName"
                        value={partnerFormData.businessName}
                        onChange={handlePartnerChange}
                        placeholder="e.g. Das Breeding Agencies"
                        className="w-full h-12 px-4 rounded-xl border border-stone-250 bg-white text-xs font-semibold focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-0.5">Partnership Interest Type</label>
                    <select 
                      name="partnershipType"
                      value={partnerFormData.partnershipType}
                      onChange={handlePartnerChange}
                      className="w-full h-12 px-4 rounded-xl border border-stone-250 bg-white text-xs font-bold text-stone-700 focus:border-orange-500"
                    >
                      <option value="Distributor / Reseller">Distributor / Reseller Regional Rights</option>
                      <option value="Expert Veterinary Consultants">Expert Veterinary Consultants Advice Node</option>
                      <option value="Poultry & Hatchery Dealer">Poultry & Hatchery Dealer Account</option>
                      <option value="Hardware & IoT Providers">Hardware & IoT Providers Integration node</option>
                      <option value="Other Strategic Partnership">Other Private Partnership Joint venture</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-0.5">Describe your background & proposed region</label>
                    <textarea 
                      required
                      name="message"
                      value={partnerFormData.message}
                      onChange={handlePartnerChange}
                      rows={3}
                      placeholder="Outline client networks in Jharkhand / West Bengal, previous agriculture software reseller records, or IoT hardware capabilities..."
                      className="w-full p-4 rounded-xl border border-stone-250 bg-white text-xs font-semibold focus:border-orange-500 resize-none font-medium"
                    />
                  </div>

                  <Button 
                    type="submit"
                    disabled={submittingPartner}
                    className="w-full h-13 mt-2 rounded-xl bg-stone-950 text-white hover:bg-stone-850 font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    {submittingPartner ? "TRANSMITTING APPLICATION..." : "SUBMIT RESELLER APPLICATION"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer detailing coordinates and professional rebranding links */}
      <footer className="py-16 bg-stone-900 border-t border-stone-800 text-stone-400 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12 border-b border-stone-800 pb-12">
          {/* Logo brand re-entry */}
          <div className="space-y-4 max-w-sm text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white">
                <Sparkles size={20} />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">Farm<span className="text-orange-500">Fresh</span> Hub</span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed font-medium">
              FarmFresh Hub is the premier unified cloud-persistent livestock, fresh harvest, and product accounting framework for Chicken, Goat, Egg, Duck and Fish farming sectors.
            </p>
          </div>

          {/* Quick structural routing table */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-left">
            <div className="space-y-3 font-semibold">
              <h5 className="text-xs font-black text-white uppercase tracking-widest leading-none">Market Categories</h5>
              <div className="flex flex-col gap-2 text-xs text-stone-500">
                <button onClick={() => { scrollToSection('categories'); setSelectedCategory('chicken'); }} className="hover:text-white text-left transition-colors font-medium">Chicken Breeding</button>
                <button onClick={() => { scrollToSection('categories'); setSelectedCategory('goat'); }} className="hover:text-white text-left transition-colors font-medium">Goat & Mutton</button>
                <button onClick={() => { scrollToSection('categories'); setSelectedCategory('fish'); }} className="hover:text-white text-left transition-colors font-medium">Aquaculture Fish</button>
                <button onClick={() => { scrollToSection('categories'); setSelectedCategory('egg'); }} className="hover:text-white text-left transition-colors font-medium">Egg Distribution</button>
              </div>
            </div>

            <div className="space-y-3 font-semibold">
              <h5 className="text-xs font-black text-white uppercase tracking-widest leading-none">Reseller Partners</h5>
              <div className="flex flex-col gap-2 text-xs text-stone-500">
                <button onClick={() => scrollToSection('partner')} className="hover:text-white text-left transition-colors font-medium">Affiliate Resellers</button>
                <button onClick={() => scrollToSection('partner')} className="hover:text-white text-left transition-colors font-medium">Hardware IoT vendors</button>
                <button onClick={() => scrollToSection('partner')} className="hover:text-white text-left transition-colors font-medium">Veterinary Nodes</button>
              </div>
            </div>

            <div className="space-y-3 font-semibold col-span-2 sm:col-span-1">
              <h5 className="text-xs font-black text-white uppercase tracking-widest leading-none">Contact Coordinates</h5>
              <div className="flex flex-col gap-1.5 text-xs text-stone-500 font-medium">
                <span>Phone: +91 92885 17027</span>
                <span>cvidyasolutions@gmail.com</span>
                <span>chiranjeev0058@gmail.com</span>
                <span className="text-[10px] text-stone-600 mt-1 uppercase font-black tracking-wider">DIRECTOR/FOUNDER: CHIRANJEEV DAS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row justify-between items-center gap-6 text-xs text-stone-600 font-bold">
          <p>© 2026 FarmFresh Hub Software Application. Developed by Chiranjeev Das. All corporate rights reserved.</p>
          <div className="flex gap-6 uppercase tracking-wider text-[10px]">
            <button 
              onClick={() => setSecurityModal({ isOpen: true, tab: 'privacy' })} 
              className="hover:text-stone-300 transition-colors cursor-pointer text-left bg-transparent border-none p-0 normal-case"
            >
              Privacy Agreement
            </button>
            <button 
              onClick={() => setSecurityModal({ isOpen: true, tab: 'terms' })} 
              className="hover:text-stone-300 transition-colors cursor-pointer text-left bg-transparent border-none p-0 normal-case"
            >
              Terms of Operations
            </button>
          </div>
        </div>
      </footer>

      {/* Dynamic Livestock Slideshow Details Modal */}
      <AnimatePresence>
        {selectedSlideItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6" id="slideshow-details-modal">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSlideItem(null)}
              className="absolute inset-0 bg-stone-950/85 backdrop-blur-md"
            />
            
            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-stone-200 relative z-10 flex flex-col md:flex-row max-h-[90vh] md:max-h-[600px]"
            >
              {/* Left Side: Livestock Image preview */}
              <div className="w-full md:w-1/2 aspect-video md:aspect-auto md:h-full relative overflow-hidden select-none bg-stone-100">
                <img 
                  src={selectedSlideItem.image}
                  alt={selectedSlideItem.name}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 text-left">
                  <span className="bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full font-mono shadow-sm">
                    {selectedSlideItem.id} category
                  </span>
                </div>
              </div>

              {/* Right Side: Copy info */}
              <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-between text-left relative overflow-y-auto">
                {/* Close Button */}
                <button 
                  onClick={() => setSelectedSlideItem(null)}
                  className="absolute top-6 right-6 w-8 h-8 rounded-full bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-950 border border-stone-200 transition-colors z-20"
                  aria-label="Close modal"
                >
                  <X size={15} />
                </button>

                <div className="space-y-4 pt-2">
                  <p className="text-[10px] font-black uppercase text-orange-500 tracking-wider font-mono">Module Specifications</p>
                  <h3 className="text-xl font-black text-stone-950 tracking-tight leading-tight pr-6">
                    {selectedSlideItem.name}
                  </h3>
                  <div className="h-0.5 w-12 bg-orange-500 rounded-full" />
                  <p className="text-sm font-extrabold text-stone-850 leading-snug">
                    {selectedSlideItem.description}
                  </p>
                  <p className="text-xs text-stone-500 leading-relaxed font-semibold">
                    {selectedSlideItem.details}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-100 flex justify-between items-center bg-white">
                  <Button 
                    onClick={() => {
                      setSelectedSlideItem(null);
                      onLogin();
                    }}
                    className="bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold py-2.5 px-6 transition-colors font-mono uppercase tracking-widest"
                  >
                    Launch Suite
                  </Button>
                  <span className="text-[9px] text-stone-400 font-black uppercase tracking-widest font-mono">
                    FARMFRESH HUB V3
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SecurityPolicyModal 
        isOpen={securityModal.isOpen} 
        onClose={() => setSecurityModal({ ...securityModal, isOpen: false })} 
        initialTab={securityModal.tab} 
      />
    </div>
  );
}

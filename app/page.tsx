'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  Send,
  MessageSquare,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LandingPage() {
  const { openPinModal } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Contact info state loaded dynamically from business settings (Cloudflare D1 / SQLite)
  const [contactInfo, setContactInfo] = useState({
    business_name: 'The Autoglow Sikkim',
    tagline: 'Premium Detailing & Surface Protection Studio',
    contact_phone: '+91 98320 12345',
    contact_whatsapp: '+91 98320 12345',
    contact_email: 'info@theautoglow.in',
    contact_address: 'National Highway 10, Near Deorali, Gangtok, Sikkim - 737101',
    working_hours: 'Monday – Saturday: 9:00 AM – 7:30 PM (Sunday Closed)',
  });

  // Contact Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle_model: '',
    service_requested: '9H Ceramic Coating',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch dynamic public contact details
  useEffect(() => {
    fetch('/api/contact')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === 'object') {
          setContactInfo((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectService = (serviceValue: string) => {
    setFormData((prev) => ({ ...prev, service_requested: serviceValue }));
    setSubmitted(false);
    const el = document.getElementById('contact');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError('Please provide your name and phone number.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSubmitted(true);
        setFormData({
          name: '',
          phone: '',
          email: '',
          vehicle_model: '',
          service_requested: '9H Ceramic Coating',
          message: '',
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || 'Failed to submit inquiry. Please call us directly.');
      }
    } catch {
      setFormError('Network connection issue. Please contact us via phone or WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  const services = [
    {
      title: '9H Matrix Ceramic Coating',
      selectValue: '9H Ceramic Coating',
      warranty: '3-Year Warranty',
      image: '/images/ceramic-coating.jpg',
      alt: 'Water beading on ceramic coated dark car hood',
      desc: 'Multi-layer nanotech ceramic shield engineered for intense hydrophobicity, UV resistance, and deep mirror gloss.',
      tag: 'Most Popular',
    },
    {
      title: 'Self-Healing TPU PPF',
      selectValue: 'Self-Healing TPU PPF',
      warranty: '5-Year Warranty',
      image: '/images/ppf-application.jpg',
      alt: 'Technician applying Paint Protection Film in cleanroom studio',
      desc: 'Optically clear thermoplastic polyurethane film that self-heals swirl marks and stops stone chips on NH-10 mountain roads.',
      tag: 'Ultimate Armor',
    },
    {
      title: 'Multi-Stage Paint Correction',
      selectValue: 'Paint Correction',
      warranty: 'Showroom Finish',
      image: '/images/paint-correction.jpg',
      alt: 'Machine polisher restoring deep gloss black paintwork',
      desc: 'Precision dual-action and rotary polishing removing 90%+ of swirl marks, oxidation, and wash marring with micron-measured safety.',
      tag: 'Paint Restoration',
    },
    {
      title: 'Deep Steam Interior Spa',
      selectValue: 'Deep Interior Spa',
      warranty: 'Ozone Sanitized',
      image: '/images/interior-detailing.jpg',
      alt: 'Immaculate detailed leather luxury vehicle cabin',
      desc: '160°C dry steam extraction for carpets and seats, pH-balanced leather nourishment, and full HVAC vent sanitization.',
      tag: 'Cabin Craft',
    },
    {
      title: 'Himalayan Terrain & Underbody Seal',
      selectValue: 'Himalayan Underbody Seal',
      warranty: 'Anti-Rust Shield',
      image: '/images/sikkim-mountain-suv.jpg',
      alt: 'Glossy luxury 4x4 SUV overlooking misty Sikkim mountains',
      desc: 'Heavy-duty chassis rust protection and hydrophobic sealant formulated for Sikkim monsoons, road gravel, and winter slush.',
      tag: 'Sikkim Essential',
    },
    {
      title: 'Maintenance Wash & Studio Care',
      selectValue: 'General Detailing Inquiry',
      warranty: 'Routine Bay Care',
      image: '/images/hero-studio-car.jpg',
      alt: 'Luxury SUV parked inside architectural detailing studio bay',
      desc: 'pH-neutral snow foam decontamination, safe two-bucket microfiber wash, wheel barrel detailing, and SiO2 topper.',
      tag: 'Studio Care',
    },
  ];

  const studioHighlights = [
    {
      image: '/images/paint-correction.jpg',
      label: '01 • Paint Correction',
      caption: 'Inspection lighting & micron-level clarity',
    },
    {
      image: '/images/ppf-application.jpg',
      label: '02 • Cleanroom PPF',
      caption: 'Zero-dust climate controlled film bay',
    },
    {
      image: '/images/ceramic-coating.jpg',
      label: '03 • Ceramic Curing',
      caption: 'Extreme contact angle water beading',
    },
    {
      image: '/images/interior-detailing.jpg',
      label: '04 • Interior Cabin',
      caption: 'Matte factory-fresh leather conditioning',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-charcoal font-sans selection:bg-zinc-200 overflow-x-hidden">
      {/* Sticky Minimal Public Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded bg-charcoal text-white flex items-center justify-center font-bold text-xs tracking-wider group-hover:bg-zinc-800 transition-colors">
              AG
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-charcoal leading-none">
                THE AUTOGLOW
              </div>
              <div className="text-[10px] text-muted tracking-widest uppercase font-medium mt-0.5">
                Sikkim Studio
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-muted-dark">
            <a href="#services" className="hover:text-charcoal transition-colors">
              Services
            </a>
            <a href="#gallery" className="hover:text-charcoal transition-colors">
              Studio & Craft
            </a>
            <a href="#why-us" className="hover:text-charcoal transition-colors">
              Why Us
            </a>
            <a href="#contact" className="hover:text-charcoal transition-colors">
              Contact & Booking
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`tel:${contactInfo.contact_phone.replace(/\s+/g, '')}`}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs font-medium text-charcoal hover:bg-surface transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-muted" />
              <span>{contactInfo.contact_phone}</span>
            </a>

            <button
              type="button"
              onClick={() => openPinModal('super_admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <Lock className="w-3 h-3 text-zinc-300" />
              <span>Staff Portal</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="md:hidden p-2 rounded border border-border text-charcoal hover:bg-surface transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-border bg-white px-4 py-4 space-y-3 shadow-sm">
            <nav className="flex flex-col space-y-1 text-sm font-medium text-charcoal">
              <a
                href="#services"
                onClick={() => setMobileNavOpen(false)}
                className="px-3 py-2 rounded hover:bg-surface transition-colors"
              >
                Detailing Services
              </a>
              <a
                href="#gallery"
                onClick={() => setMobileNavOpen(false)}
                className="px-3 py-2 rounded hover:bg-surface transition-colors"
              >
                Studio & Craft
              </a>
              <a
                href="#why-us"
                onClick={() => setMobileNavOpen(false)}
                className="px-3 py-2 rounded hover:bg-surface transition-colors"
              >
                Why Sikkim Studio
              </a>
              <a
                href="#contact"
                onClick={() => setMobileNavOpen(false)}
                className="px-3 py-2 rounded hover:bg-surface transition-colors"
              >
                Book Appointment
              </a>
            </nav>

            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <a
                href={`tel:${contactInfo.contact_phone.replace(/\s+/g, '')}`}
                className="w-full py-2.5 px-3 border border-border rounded text-xs font-medium text-charcoal flex items-center justify-center gap-2 hover:bg-surface"
              >
                <Phone className="w-3.5 h-3.5 text-muted" />
                <span>Call {contactInfo.contact_phone}</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Editorial Hero Section with Studio Car Photography */}
      <section className="relative border-b border-border bg-surface/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12 sm:pt-14 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Editorial Copy Column */}
            <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-white text-[11px] font-medium text-muted-dark shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-charcoal shrink-0" />
                <span>Gangtok, Sikkim • Architectural Cleanroom Detailing Studio</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-charcoal tracking-tight leading-[1.12]">
                Precision Surface Protection for Mountain & Luxury Vehicles
              </h1>

              <p className="text-sm sm:text-base text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Engineered for Himalayan highways. Preserve showroom depth against mountain gravel, monsoon acid rain, and UV haze with certified 9H ceramic coatings, self-healing TPU PPF, and multi-stage paint correction.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
                <a
                  href="#contact"
                  className="px-6 py-3 sm:py-2.5 bg-charcoal text-white rounded text-xs font-semibold hover:bg-zinc-800 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Book Studio Inspection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <a
                  href="#services"
                  className="px-6 py-3 sm:py-2.5 border border-border bg-white rounded text-xs font-medium text-charcoal hover:bg-surface transition-colors flex items-center justify-center"
                >
                  Explore Treatments
                </a>
              </div>

              {/* Clean Architectural Spec Strip */}
              <div className="pt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
                {[
                  { label: '4 Dedicated Bays', sub: 'Cleanroom & Wash' },
                  { label: 'Up to 5-Yr Warranty', sub: 'Digital Certificate' },
                  { label: 'Micron Inspected', sub: 'Pre-Polish Gauge' },
                  { label: 'NH-10 Deorali', sub: 'Gangtok Studio' },
                ].map((stat, i) => (
                  <div key={i} className="p-2.5 bg-white border border-border rounded">
                    <div className="text-xs font-bold text-charcoal">{stat.label}</div>
                    <div className="text-[10px] text-muted mt-0.5">{stat.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Studio Car Image Column */}
            <div className="lg:col-span-6">
              <div className="relative rounded-lg overflow-hidden border border-border bg-zinc-900 shadow-card aspect-[16/10] sm:aspect-[16/10]">
                <img
                  src="/images/hero-studio-car.jpg"
                  alt="Mirror-finished dark luxury SUV inside The Autoglow Sikkim detailing bay"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 flex items-end justify-between text-white">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-300">
                      Studio Bay 01 • PPF & Ceramic Suite
                    </div>
                    <div className="text-xs sm:text-sm font-semibold mt-0.5">
                      Zero-Swirl Mirror Reflection Guarantee
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/15 backdrop-blur-md text-[10px] font-mono border border-white/20">
                    9H + TPU Certified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section with Photographic Cards */}
      <section id="services" className="py-14 sm:py-20 border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-1.5">
              <div className="text-[11px] font-bold text-muted uppercase tracking-widest">
                Signature Treatments
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
                Crafted Care for Every Surface
              </h2>
              <p className="text-xs sm:text-sm text-muted">
                Every vehicle begins with a multi-point digital intake inspection and category-calibrated service plan.
              </p>
            </div>
            <a
              href="#contact"
              className="self-start md:self-auto text-xs font-semibold text-charcoal inline-flex items-center gap-1 border border-border px-3.5 py-2 rounded hover:bg-surface transition-colors"
            >
              <span>Request Custom Quote</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {services.map((srv, idx) => (
              <div
                key={idx}
                className="bg-white border border-border rounded-lg overflow-hidden flex flex-col justify-between hover:border-zinc-400 transition-all hover:shadow-card group"
              >
                <div>
                  {/* Service Photo */}
                  <div className="relative aspect-[16/10] bg-zinc-100 overflow-hidden border-b border-border">
                    <img
                      src={srv.image}
                      alt={srv.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/95 backdrop-blur-sm border border-border/80 text-charcoal uppercase tracking-wider shadow-xs">
                        {srv.tag}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-charcoal/85 text-white backdrop-blur-sm">
                        {srv.warranty}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-bold text-charcoal group-hover:text-black transition-colors">
                      {srv.title}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed">{srv.desc}</p>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-surface/50 border-t border-border flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleSelectService(srv.selectValue)}
                    className="text-xs font-semibold text-charcoal inline-flex items-center gap-1 hover:underline"
                  >
                    <span>Book Treatment</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-muted">Digital intake included</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Studio Gallery & Craftsmanship Showcase */}
      <section id="gallery" className="py-14 sm:py-20 bg-surface/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted uppercase tracking-widest">
                Inside The Studio
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
                Engineered Cleanroom Craftsmanship
              </h2>
            </div>
            <p className="text-xs text-muted max-w-md">
              Built around positive-pressure detailing bays, calibrated inspection lighting, and digital QC handovers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Large Feature Photo */}
            <div className="lg:col-span-6 relative rounded-lg overflow-hidden border border-border bg-zinc-900 min-h-[260px] sm:min-h-[360px]">
              <img
                src="/images/sikkim-mountain-suv.jpg"
                alt="Freshly ceramic coated 4x4 SUV overlooking Sikkim mountains"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-5 text-white space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-300">
                  Sikkim Mountain Proven
                </div>
                <h3 className="text-base sm:text-lg font-bold">
                  Built for High-Altitude Terrain & Monsoon Highways
                </h3>
                <p className="text-xs text-zinc-200 max-w-md leading-relaxed">
                  Hydrophobic ceramic bonds shed red clay, brake dust, and mountain mist with a single rinse.
                </p>
              </div>
            </div>

            {/* 2x2 Detail Mosaic */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {studioHighlights.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-border rounded-lg overflow-hidden flex flex-col group"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
                    <img
                      src={item.image}
                      alt={item.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3.5">
                    <div className="text-xs font-bold text-charcoal font-mono">{item.label}</div>
                    <div className="text-[11px] text-muted mt-0.5">{item.caption}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us / Technical Standards */}
      <section id="why-us" className="py-14 sm:py-20 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-[11px] font-bold text-muted uppercase tracking-widest">
                Studio Standards
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
                Why Standard Washes Fail on Mountain Vehicles
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Driving along NH-10 and rural Himalayan passes exposes clear coats and underbodies to mineral water spots, iron brake fallout, stone chips, and persistent monsoon humidity.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Contactless snow foam pre-wash to lift abrasive mountain grit safely',
                  'Dedicated chassis & suspension rust inhibitor sealing with 160°C dry steam',
                  'Digital paint depth readings logged before any machine compounding',
                  'Recorded Job Card history & digital warranty certificate per vehicle',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-charcoal">
                    <div className="w-4 h-4 rounded-full bg-charcoal text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 bg-surface/60 border border-border rounded-lg p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-10 h-10 rounded bg-charcoal text-white flex items-center justify-center font-bold text-sm shrink-0">
                  AG
                </div>
                <div>
                  <h4 className="text-sm font-bold text-charcoal">The Autoglow Process</h4>
                  <p className="text-[11px] text-muted">Full Workshop Transparency From Intake to Delivery</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-white rounded border border-border">
                  <div className="font-semibold text-charcoal flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-charcoal" />
                    <span>Digital Intake Report</span>
                  </div>
                  <div className="text-[11px] text-muted mt-1 leading-relaxed">
                    Every scratch, dent, and accessory documented before work begins.
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded border border-border">
                  <div className="font-semibold text-charcoal flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-charcoal" />
                    <span>QC Sign-Off Protocol</span>
                  </div>
                  <div className="text-[11px] text-muted mt-1 leading-relaxed">
                    Multi-angle LED panel inspection required before customer handover.
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded border border-border">
                  <div className="font-semibold text-charcoal">Genuine Chemistry</div>
                  <div className="text-[11px] text-muted mt-1 leading-relaxed">
                    Batch-tracked CarPro, STEK TPU, Rupes, and Menzerna consumables.
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded border border-border">
                  <div className="font-semibold text-charcoal">Automated Care Alerts</div>
                  <div className="text-[11px] text-muted mt-1 leading-relaxed">
                    Timely maintenance reminders to keep ceramic coatings performing.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Booking Inquiry Section (Admin Configurable) */}
      <section id="contact" className="py-14 sm:py-24 border-b border-border bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Left Column: Workshop Contact Details */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <span className="text-[11px] font-bold text-muted uppercase tracking-widest">
                  Get in Touch
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-1">
                  Visit Our Studio or Schedule an Inspection
                </h2>
                <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
                  Have a question about paint protection or want an estimate? Call us or submit the inquiry form and our Gangtok studio team will respond promptly.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-3 p-3.5 bg-white border border-border rounded">
                  <Phone className="w-4 h-4 text-charcoal shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-charcoal">Phone Number</div>
                    <a
                      href={`tel:${contactInfo.contact_phone.replace(/\s+/g, '')}`}
                      className="text-xs text-muted hover:text-charcoal hover:underline break-all"
                    >
                      {contactInfo.contact_phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-white border border-border rounded">
                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-charcoal">WhatsApp Direct</div>
                    <a
                      href={`https://wa.me/${contactInfo.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted hover:text-emerald-700 hover:underline break-all"
                    >
                      Chat on WhatsApp ({contactInfo.contact_whatsapp})
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-white border border-border rounded">
                  <Mail className="w-4 h-4 text-charcoal shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-charcoal">Email Address</div>
                    <a
                      href={`mailto:${contactInfo.contact_email}`}
                      className="text-xs text-muted hover:text-charcoal hover:underline break-all"
                    >
                      {contactInfo.contact_email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-white border border-border rounded">
                  <MapPin className="w-4 h-4 text-charcoal shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-charcoal">Studio Location</div>
                    <div className="text-xs text-muted leading-relaxed">
                      {contactInfo.contact_address}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-white border border-border rounded">
                  <Clock className="w-4 h-4 text-charcoal shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-charcoal">Operating Hours</div>
                    <div className="text-xs text-muted">{contactInfo.working_hours}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Booking & Inquiry Form */}
            <div className="lg:col-span-7 bg-white border border-border rounded-lg p-5 sm:p-8 shadow-card">
              <div className="pb-4 border-b border-border">
                <h3 className="text-base font-bold text-charcoal">Request an Appointment or Quote</h3>
                <p className="text-xs text-muted mt-0.5">
                  Share your vehicle details and our studio advisor will confirm bay availability.
                </p>
              </div>

              {submitted ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-charcoal">Thank You! Inquiry Received.</h4>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Your request has been logged in our workshop system. Our Gangtok team will reach out shortly to confirm your slot.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-4 px-4 py-2 bg-surface border border-border rounded text-xs font-medium text-charcoal hover:bg-zinc-100"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="pt-4 space-y-4">
                  {formError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Dawa Lepcha"
                        className="w-full px-3 py-2.5 sm:py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none focus:border-charcoal"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        Mobile Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +91 98000 11223"
                        className="w-full px-3 py-2.5 sm:py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none focus:border-charcoal"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        Vehicle Make & Model
                      </label>
                      <input
                        type="text"
                        value={formData.vehicle_model}
                        onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                        placeholder="e.g. Toyota Fortuner, Defender"
                        className="w-full px-3 py-2.5 sm:py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none focus:border-charcoal"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        Service Interested In
                      </label>
                      <select
                        value={formData.service_requested}
                        onChange={(e) => setFormData({ ...formData, service_requested: e.target.value })}
                        className="w-full px-3 py-2.5 sm:py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none focus:border-charcoal"
                      >
                        <option value="9H Ceramic Coating">9H Matrix Ceramic Coating (3-Yr)</option>
                        <option value="Self-Healing TPU PPF">Self-Healing TPU PPF (5-Yr)</option>
                        <option value="Himalayan Underbody Seal">Himalayan Underbody Anti-Rust</option>
                        <option value="Paint Correction">Multi-Stage Paint Correction & Polish</option>
                        <option value="Deep Interior Spa">Deep Steam Interior Spa & Ozone</option>
                        <option value="General Detailing Inquiry">Maintenance Wash / General Inquiry</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full px-3 py-2.5 sm:py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none focus:border-charcoal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Notes or Special Requirements
                    </label>
                    <textarea
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="e.g. Looking for matte PPF on bonnet and ceramic coating for SUV..."
                      className="w-full px-3 py-2.5 sm:py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none focus:border-charcoal"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 sm:py-2.5 bg-charcoal text-white rounded text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Sending Details...' : 'Submit Booking Inquiry'}</span>
                  </button>

                  <p className="text-[11px] text-muted text-center pt-1">
                    Direct inquiries are routed to workshop management instantly.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="py-10 sm:py-12 bg-white text-muted border-t border-border text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-charcoal text-white flex items-center justify-center font-bold text-xs shrink-0">
              AG
            </div>
            <div>
              <div className="font-bold text-charcoal">{contactInfo.business_name}</div>
              <div className="text-[11px] text-muted">{contactInfo.tagline}</div>
            </div>
          </div>

          <div className="text-center md:text-right text-[11px] space-y-1">
            <div>{contactInfo.contact_address}</div>
            <div>
              Phone: {contactInfo.contact_phone} • Email: {contactInfo.contact_email}
            </div>
            <div className="pt-2 text-muted">
              © {new Date().getFullYear()} The Autoglow Sikkim. All rights reserved. •{' '}
              <button
                type="button"
                onClick={() => openPinModal('super_admin')}
                className="text-charcoal font-medium hover:underline inline-flex items-center gap-1"
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Staff Login</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

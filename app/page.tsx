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
  Car,
  Layers,
  Award,
  ChevronRight,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LandingPage() {
  const { openPinModal, currentUser } = useAuth();

  // Contact info state loaded dynamically from business settings
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
        if (data) {
          setContactInfo((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
  }, []);

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
      warranty: '3-Year Warranty',
      desc: 'Multi-layer nanotech ceramic shield providing extreme hydrophobicity, UV protection, chemical resistance, and deep candy gloss.',
      tag: 'Most Popular',
    },
    {
      title: 'Self-Healing TPU PPF',
      warranty: '5-Year Warranty',
      desc: 'High-clarity thermoplastic polyurethane film that instantly self-heals swirl marks and guards against stone chips on Sikkim mountain roads.',
      tag: 'Ultimate Protection',
    },
    {
      title: 'Himalayan Underbody Seal',
      warranty: 'Anti-Rust Coating',
      desc: 'Heavy-duty rubberized bitumen and zinc cold galvanizing to protect chassis and suspension from winter slush, road salts, and monsoon moisture.',
      tag: 'Sikkim Essential',
    },
    {
      title: 'Multi-Stage Paint Correction',
      warranty: 'Showroom Finish',
      desc: 'Precision rotary and dual-action machine polishing that safely removes 90%+ of clear coat swirl marks, scratches, and oxidation.',
      tag: 'Paint Restoral',
    },
    {
      title: 'Deep Steam Interior Spa',
      warranty: 'Ozone Sanitization',
      desc: 'High-temperature 160°C dry steam extraction for upholstery, leather conditioning, AC vent disinfection, and total allergen removal.',
      tag: 'Interior Spa',
    },
    {
      title: 'Maintenance Wash & Hydrowax',
      warranty: 'Quick Service',
      desc: 'pH-neutral snow foam decontamination, two-bucket hand wash, wheel barrel detailing, and ceramic-infused silica spray sealant.',
      tag: 'Routine Care',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-charcoal font-sans selection:bg-zinc-200">
      {/* Top Banner & Public Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
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
            <a href="#why-us" className="hover:text-charcoal transition-colors">
              Why Us
            </a>
            <a href="#gallery" className="hover:text-charcoal transition-colors">
              Studio & Bays
            </a>
            <a href="#contact" className="hover:text-charcoal transition-colors">
              Contact & Location
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            <a
              href={`tel:${contactInfo.contact_phone.replace(/\s+/g, '')}`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs font-medium text-charcoal hover:bg-surface transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-muted" />
              <span>{contactInfo.contact_phone}</span>
            </a>

            {/* Staff Portal / Management Login */}
            <button
              onClick={() => openPinModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal text-white rounded text-xs font-medium hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <Lock className="w-3 h-3 text-zinc-300" />
              <span>Staff Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-border bg-gradient-to-b from-surface/50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-white text-[11px] font-medium text-muted-dark shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-charcoal" />
            <span>Gangtok, Sikkim • State-of-the-Art Dust-Free Cleanroom Bays</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-charcoal tracking-tight max-w-3xl mx-auto leading-[1.12]">
            Himalayan-Grade Automotive Detailing & Surface Protection
          </h1>

          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
            Protect your vehicle against mountain road salts, heavy monsoon acid rain, and UV oxidation with certified 9H ceramic coatings and self-healing TPU PPF.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <a
              href="#contact"
              className="w-full sm:w-auto px-6 py-2.5 bg-charcoal text-white rounded text-xs font-semibold hover:bg-zinc-800 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span>Book Inspection & Detailing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="#services"
              className="w-full sm:w-auto px-6 py-2.5 border border-border bg-white rounded text-xs font-medium text-charcoal hover:bg-surface transition-colors"
            >
              Explore Services & Packages
            </a>
          </div>

          {/* Key Value Badges */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            {[
              { title: 'Dust-Free Cleanroom', desc: 'Positive pressure bay for coating application' },
              { title: 'Up to 5-Yr Warranty', desc: 'Nationwide coverage with warranty certificate' },
              { title: 'Trained Specialists', desc: 'Certified paint correction detailers' },
              { title: 'Mountain Ready', desc: 'Underbody seals for Sikkim terrain' },
            ].map((feature, i) => (
              <div key={i} className="p-3 bg-white border border-border rounded text-xs space-y-1">
                <div className="font-semibold text-charcoal flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-charcoal" />
                  <span>{feature.title}</span>
                </div>
                <div className="text-[11px] text-muted leading-snug">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 sm:py-24 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="text-[11px] font-bold text-muted uppercase tracking-widest">
              Master Craftsmanship
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
              Our Professional Detailing Services
            </h2>
            <p className="text-xs text-muted">
              Tailored treatments engineered for hatchbacks, sedans, SUVs, and luxury 4x4s.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((srv, idx) => (
              <div
                key={idx}
                className="bg-white border border-border rounded-lg p-5 flex flex-col justify-between hover:border-zinc-400 transition-all hover:shadow-card group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface border border-border text-charcoal uppercase tracking-wider">
                      {srv.tag}
                    </span>
                    <span className="text-[11px] font-mono text-muted">{srv.warranty}</span>
                  </div>

                  <h3 className="text-base font-bold text-charcoal group-hover:text-black transition-colors">
                    {srv.title}
                  </h3>

                  <p className="text-xs text-muted leading-relaxed">{srv.desc}</p>
                </div>

                <div className="pt-5 mt-4 border-t border-border flex items-center justify-between">
                  <a
                    href="#contact"
                    className="text-xs font-semibold text-charcoal inline-flex items-center gap-1 hover:underline"
                  >
                    <span>Inquire Now</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-[11px] text-muted">Includes intake report</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us / Sikkim Terrain Focus */}
      <section id="why-us" className="py-16 sm:py-20 bg-surface/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="text-[11px] font-bold text-muted uppercase tracking-widest">
                Engineered For Sikkim
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
                Why Standard Washes Fail on Mountain Vehicles
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Driving on the NH-10 and rural Himalayan roads subjects your vehicle’s clear coat and chassis to extreme elements: rock debris, mud runoff, constant brake dust on downhill descents, and high-humidity dampness.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Multi-stage contactless foam pre-wash to eliminate scratch-inducing grit',
                  'Dedicated undercarriage rust inhibitor sealing with high-pressure dry steam',
                  'Hydrophobic nano-ceramic matrix that repels red mountain clay and road grime',
                  'Digital paint thickness gauge measurements before any machine compounding',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-charcoal">
                    <div className="w-4 h-4 rounded-full bg-charcoal text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-border rounded-lg p-6 space-y-4 shadow-card">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-10 h-10 rounded bg-charcoal text-white flex items-center justify-center font-bold text-sm">
                  AG
                </div>
                <div>
                  <h4 className="text-sm font-bold text-charcoal">The Autoglow Promise</h4>
                  <p className="text-[11px] text-muted">Gangtok Detailing Facility</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-surface rounded border border-border">
                  <div className="font-semibold text-charcoal">4 Dedicated Bays</div>
                  <div className="text-[11px] text-muted mt-0.5">Washing, Polishing & PPF Cleanroom</div>
                </div>
                <div className="p-3 bg-surface rounded border border-border">
                  <div className="font-semibold text-charcoal">Certified Products</div>
                  <div className="text-[11px] text-muted mt-0.5">CarPro, STEK, Rupes & Menzerna</div>
                </div>
                <div className="p-3 bg-surface rounded border border-border">
                  <div className="font-semibold text-charcoal">Digital Job Card</div>
                  <div className="text-[11px] text-muted mt-0.5">Pre-service inspection photos & QC pass</div>
                </div>
                <div className="p-3 bg-surface rounded border border-border">
                  <div className="font-semibold text-charcoal">Official Warranty</div>
                  <div className="text-[11px] text-muted mt-0.5">Digitally registered certificate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Booking Inquiry Section (Changeable by Admin) */}
      <section id="contact" className="py-16 sm:py-24 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Workshop Contact Details */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-[11px] font-bold text-muted uppercase tracking-widest">
                  Get in Touch
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-1">
                  Visit Our Studio or Schedule an Inspection
                </h2>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  Have a specific question about your vehicle’s paint condition or want an estimate? Call us or submit the form for a prompt response.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3 p-3.5 bg-surface border border-border rounded">
                  <Phone className="w-4 h-4 text-charcoal shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-charcoal">Phone Number</div>
                    <a
                      href={`tel:${contactInfo.contact_phone.replace(/\s+/g, '')}`}
                      className="text-xs text-muted hover:text-charcoal hover:underline"
                    >
                      {contactInfo.contact_phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-surface border border-border rounded">
                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-charcoal">WhatsApp Direct</div>
                    <a
                      href={`https://wa.me/${contactInfo.contact_whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted hover:text-emerald-700 hover:underline"
                    >
                      Chat on WhatsApp ({contactInfo.contact_whatsapp})
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-surface border border-border rounded">
                  <Mail className="w-4 h-4 text-charcoal shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-charcoal">Email Address</div>
                    <a
                      href={`mailto:${contactInfo.contact_email}`}
                      className="text-xs text-muted hover:text-charcoal hover:underline"
                    >
                      {contactInfo.contact_email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-surface border border-border rounded">
                  <MapPin className="w-4 h-4 text-charcoal shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-charcoal">Studio Location</div>
                    <div className="text-xs text-muted leading-relaxed">
                      {contactInfo.contact_address}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-surface border border-border rounded">
                  <Clock className="w-4 h-4 text-charcoal shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-charcoal">Operating Hours</div>
                    <div className="text-xs text-muted">{contactInfo.working_hours}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Booking & Inquiry Form */}
            <div className="lg:col-span-7 bg-white border border-border rounded-lg p-6 sm:p-8 shadow-card">
              <div className="pb-4 border-b border-border">
                <h3 className="text-base font-bold text-charcoal">Request an Appointment or Quote</h3>
                <p className="text-xs text-muted mt-0.5">
                  Fill in your vehicle details and our team will get back to you within 2 hours.
                </p>
              </div>

              {submitted ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-charcoal">Thank You! Inquiry Received.</h4>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    We have logged your request in our workshop system. Our team at Gangtok will contact you shortly to confirm your booking.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 px-4 py-1.5 bg-surface border border-border rounded text-xs font-medium text-charcoal hover:bg-zinc-100"
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
                        className="w-full px-3 py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
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
                        className="w-full px-3 py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
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
                        placeholder="e.g. Toyota Fortuner, Scorpio-N"
                        className="w-full px-3 py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        Service Interested In
                      </label>
                      <select
                        value={formData.service_requested}
                        onChange={(e) => setFormData({ ...formData, service_requested: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                      >
                        <option value="9H Ceramic Coating">9H Matrix Ceramic Coating (3-Yr)</option>
                        <option value="Self-Healing TPU PPF">Self-Healing TPU PPF (5-Yr)</option>
                        <option value="Himalayan Underbody Seal">Himalayan Underbody Anti-Rust</option>
                        <option value="Paint Correction">3-Stage Paint Correction & Polish</option>
                        <option value="Deep Interior Spa">Deep Steam Interior Spa & Ozone</option>
                        <option value="General Detailing Inquiry">General Inquiry / Consultation</option>
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
                      className="w-full px-3 py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
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
                      placeholder="e.g. Please check scratches on bonnet, vehicle is dark blue..."
                      className="w-full px-3 py-2 bg-surface border border-border rounded text-xs text-charcoal focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-charcoal text-white rounded text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
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
      <footer className="py-12 bg-white text-muted border-t border-border text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-charcoal text-white flex items-center justify-center font-bold text-xs">
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
                onClick={() => openPinModal()}
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

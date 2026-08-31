'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  Users,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  PlusCircle,
  PhoneCall,
  Search,
  Lock,
  ArrowRight,
  Play,
  X,
  FileText,
  Flame,
  CreditCard,
  Smartphone,
} from 'lucide-react';

export default function RecruteurPage() {
  const [activeTab, setActiveTab] = useState<'publish' | 'cvtheque' | 'kyb'>('publish');
  const [companyName, setCompanyName] = useState('TechNovation Labs');
  const [kybScore, setKybScore] = useState(92);
  const [isVerified, setIsVerified] = useState(true);

  // Form states
  const [jobTitle, setJobTitle] = useState('');
  const [jobSector, setJobSector] = useState('Informatique');
  const [jobRequirements, setJobRequirements] = useState('');
  const [jobChannel, setJobChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isBoosted, setIsBoosted] = useState(false);
  const [dailyBudget, setDailyBudget] = useState(1000);
  const [momoPhone, setMomoPhone] = useState('');
  const [publishedSuccess, setPublishedSuccess] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null);

  // Startup KYB Form states
  const [rccmNumber, setRccmNumber] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [kybSubmitted, setKybSubmitted] = useState(false);

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setPublishedSuccess(true);
    setTimeout(() => setPublishedSuccess(false), 4000);
  };

  const handleStartupKybSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setKybSubmitted(true);
    setKybScore(94);
    setIsVerified(true);
  };

  const sampleStudents = [
    {
      id: 'st-1',
      name: 'Kouassi Marc',
      major: 'Informatique & Télécoms (Licence 3)',
      skills: ['React Native', 'TypeScript', 'Node.js', 'Git'],
      boosted: true,
      whatsapp: '+225 07 08 09 10 11',
      demoVideo: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    },
    {
      id: 'st-2',
      name: 'Amina Diallo',
      major: 'Comptabilité, Contrôle & Audit (Master 1)',
      skills: ['Comptabilité SYSCOHADA', 'Excel Avancé', 'Fiscalité'],
      boosted: true,
      whatsapp: '+221 77 123 45 67',
      demoVideo: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    },
    {
      id: 'st-3',
      name: 'Jean-Paul Koffi',
      major: 'Marketing Digital & Design (BTS 2)',
      skills: ['Figma', 'UI/UX Design', 'Canva', 'Social Media'],
      boosted: false,
      whatsapp: '+225 05 55 66 77 88',
      demoVideo: null,
    },
  ];

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-[#0F172A]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
            C360
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Campus 360 • Espace Recruteurs</h1>
            <p className="text-xs text-slate-400">Portail B2B Entreprises & Chasseurs de Talents</p>
          </div>
        </div>

        {/* KYB Badge in Header */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck size={16} />
            <span>Entreprise Vérifiée (Score KYB : {kybScore}%)</span>
          </div>
          <a
            href="/"
            className="text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg border border-white/10"
          >
            Retour App
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4 mb-8">
          <button
            onClick={() => setActiveTab('publish')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'publish'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <PlusCircle size={17} />
            Publier une Offre de Stage
          </button>
          <button
            onClick={() => setActiveTab('cvtheque')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'cvtheque'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={17} />
            CVthèque Étudiants (Cartes Vitrines)
          </button>
          <button
            onClick={() => setActiveTab('kyb')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'kyb'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck size={17} />
            Sécurité & Score KYB
          </button>
        </div>

        {/* Tab 1: Publish Stage Job */}
        {activeTab === 'publish' && (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-2">Publier une nouvelle offre de stage</h2>
              <p className="text-sm text-slate-400 mb-6">
                Formatage strict pour garantir une lisibilité optimale et un matching IA instantané sur l'application mobile des étudiants.
              </p>

              {publishedSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm">
                  <CheckCircle size={20} />
                  <span>Votre offre a été publiée avec succès et transmise au flux des étudiants !</span>
                </div>
              )}

              <form onSubmit={handlePublish} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    Intitulé du stage
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Stagiaire Développeur Mobile Flutter / React"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                      Filière / Secteur
                    </label>
                    <select
                      value={jobSector}
                      onChange={(e) => setJobSector(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition text-slate-200"
                    >
                      <option value="Informatique">Informatique & Tech</option>
                      <option value="Comptabilité">Comptabilité & Finance</option>
                      <option value="Marketing">Marketing & Communication</option>
                      <option value="Design">Design & UI/UX</option>
                      <option value="Logistique">Logistique & Transport</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                      Canal de réception des candidatures
                    </label>
                    <select
                      value={jobChannel}
                      onChange={(e) => setJobChannel(e.target.value as any)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition text-slate-200"
                    >
                      <option value="WHATSAPP">WhatsApp Direct (Message pré-rempli + PDF)</option>
                      <option value="EMAIL">Email Professionnel</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    Compétences requises (séparées par des virgules)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: React, TypeScript, Git, Tailwind"
                    value={jobRequirements}
                    onChange={(e) => setJobRequirements(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                      Flyer d'annonce (Optionnel)
                    </label>
                    <input
                      type="url"
                      placeholder="https://... flyer.png"
                      value={flyerUrl}
                      onChange={(e) => setFlyerUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 transition text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                      Vidéo de présentation (Optionnel)
                    </label>
                    <input
                      type="url"
                      placeholder="https://... video.mp4"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 transition text-slate-200"
                    />
                  </div>
                </div>

                {/* Facebook Ads Style Boost Campaign */}
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isBoosted}
                        onChange={(e) => setIsBoosted(e.target.checked)}
                        className="rounded bg-slate-900 border-white/20 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Flame size={14} className="text-amber-400" />
                        Booster cette offre (Campagne publicitaire ciblée)
                      </span>
                    </label>
                    {isBoosted && (
                      <span className="text-xs font-bold text-amber-400">
                        {dailyBudget.toLocaleString('fr-FR')} FCFA / jour
                      </span>
                    )}
                  </div>

                  {isBoosted && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400">Budget quotidien :</span>
                        <input
                          type="range"
                          min="500"
                          max="10000"
                          step="500"
                          value={dailyBudget}
                          onChange={(e) => setDailyBudget(Number(e.target.value))}
                          className="flex-1 accent-purple-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Numéro Mobile Money pour validation par Push USSD (MTN / Orange / Wave)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            placeholder="+225 07..."
                            value={momoPhone}
                            onChange={(e) => setMomoPhone(e.target.value)}
                            className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => alert(`Demande USSD envoyée à ${momoPhone || 'votre numéro'} ! Validez avec votre code PIN pour lancer la campagne.`)}
                            className="bg-amber-500 text-slate-950 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"
                          >
                            <Smartphone size={13} />
                            Déclencher USSD
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Matching IA instantané avec les étudiants</span>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-blue-600/30"
                  >
                    Publier l'offre
                  </button>
                </div>
              </form>
            </div>

            {/* Sponsoring Sidebar */}
            <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-xl h-fit">
              <div className="flex items-center gap-2 text-amber-400 font-bold mb-3">
                <Sparkles size={18} />
                <span>Impact de la Diffusion</span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Les offres sont distribuées en temps réel sur le mobile des étudiants des grandes universités et écoles partenaires.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 mb-4">
                🚀 Matching algorithmique : chaque offre est poussée en priorité aux profils ayant &gt;80% d'affinité technique.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: CVthèque */}
        {activeTab === 'cvtheque' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">CVthèque & Cartes Vitrines des Étudiants</h2>
                <p className="text-sm text-slate-400">Accédez directement aux meilleurs profils disponibles immédiatement.</p>
              </div>
              <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs text-purple-300 font-semibold">
                <Sparkles size={15} />
                <span>Licence Chasseur de Têtes (25 000 FCFA/mois)</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {sampleStudents.map((st) => (
                <div
                  key={st.id}
                  className="bg-[#0F172A] border border-white/10 rounded-2xl p-5 hover:border-blue-500/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-400 font-mono">Disponibilité immédiate</span>
                      {st.boosted && (
                        <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/40">
                          PROFIL BOOSTÉ
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white">{st.name}</h3>
                    <p className="text-xs text-blue-400 font-medium mb-3">{st.major}</p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {st.skills.map((s, i) => (
                        <span key={i} className="bg-white/5 text-slate-300 text-[11px] px-2.5 py-1 rounded-lg border border-white/5">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                    {st.demoVideo ? (
                      <button
                        onClick={() => setActiveVideoModal(st.demoVideo)}
                        className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition border border-purple-500/40"
                      >
                        <Play size={13} />
                        Démo 45s
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Pas de vidéo</span>
                    )}

                    <a
                      href={`https://wa.me/${st.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow"
                    >
                      <PhoneCall size={13} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Video Preview Modal */}
            {activeVideoModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#0F172A] border border-white/20 rounded-2xl p-6 max-w-lg w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Play size={16} className="text-purple-400" />
                      Pitch & Démo de Compétences (45 secondes)
                    </h3>
                    <button onClick={() => setActiveVideoModal(null)} className="text-slate-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4 border border-white/10 flex items-center justify-center text-slate-500">
                    <video src={activeVideoModal} controls autoPlay className="w-full h-full object-contain" />
                  </div>
                  <button
                    onClick={() => setActiveVideoModal(null)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-white"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: KYB */}
        {activeTab === 'kyb' && (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Status Summary */}
            <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-xl text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                <ShieldCheck size={36} />
              </div>
              <h2 className="text-xl font-bold mb-2">Vérification Entreprise (KYB)</h2>
              <p className="text-xs text-slate-400 mb-6">
                Le système protège les étudiants contre les fausses offres en modérant les entreprises.
              </p>

              <div className="bg-slate-900 rounded-2xl p-4 border border-white/10 mb-4 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Entreprise :</span>
                  <span className="font-semibold text-white">{companyName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Score de Confiance IA :</span>
                  <span className="font-bold text-emerald-400">{kybScore}% (Seuil requis &gt; 80%)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Statut :</span>
                  <span className="font-semibold text-emerald-300 flex items-center gap-1">
                    <CheckCircle size={13} /> {isVerified ? 'Compte Actif & Vérifié' : 'En attente de vérification'}
                  </span>
                </div>
              </div>
            </div>

            {/* Alternative Startup KYB Path */}
            <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold mb-2 text-white">Parcours Alternatif Startups & PME</h3>
              <p className="text-xs text-slate-400 mb-4">
                Pas de nom de domaine officiel ? Validez votre légitimité en fournissant votre RCCM et votre lien réseau social avec validation OTP.
              </p>

              {kybSubmitted && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>Dossier startup validé avec succès ! Score KYB ajusté à 94%.</span>
                </div>
              )}

              <form onSubmit={handleStartupKybSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Numéro RCCM / Registre du Commerce
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: CI-ABJ-2024-B-12345"
                    value={rccmNumber}
                    onChange={(e) => setRccmNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Lien Page Professionnelle (LinkedIn / Facebook)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://linkedin.com/company/..."
                    value={socialLink}
                    onChange={(e) => setSocialLink(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Code OTP Reçu par WhatsApp (Validation Directeur)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 849201"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
                >
                  Soumettre pour Certification Immédiate
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


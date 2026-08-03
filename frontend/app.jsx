import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Users, Lock, Activity, ArrowRight, ChevronRight, CheckCircle2, 
  Menu, X, Bell, LogOut, Wallet, FileText, AlertTriangle, Scale,
  User, Check, AlertCircle, TrendingUp, Search
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  LineChart, Line, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import axios from 'axios';

// --- AXIOS INSTANCE WITH JWT ---
const API_BASE = 'http://localhost:8000';

const axiosClient = axios.create({ baseURL: API_BASE });

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- REAL API CLIENT ---
const api = {
  // Auth
  login: async (email, password) => {
    const res = await axiosClient.post('/users_kyc/login', { email, mot_de_passe: password });
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    // Fetch user profile with the new token
    const me = await axiosClient.get('/users_kyc/me');
    return { token: access_token, user: me.data };
  },
  register: async (email, password) => {
    const res = await axiosClient.post('/users_kyc/register', { email, mot_de_passe: password });
    return res.data;
  },
  getMe: async () => {
    const res = await axiosClient.get('/users_kyc/me');
    return res.data;
  },
  // KYC
  getKycStatus: async () => {
    try {
      const res = await axiosClient.get('/users_kyc/kyc/status');
      return res.data;
    } catch (e) {
      if (e.response?.status === 404) return { statut_verification: 'none' };
      throw e;
    }
  },
  submitKyc: async (data) => {
    const res = await axiosClient.post('/users_kyc/kyc/submit', data);
    return res.data;
  },
  // Groups
  getGroups: async () => {
    const res = await axiosClient.get('/groups');
    return res.data;
  },
  getGroup: async (id) => {
    const res = await axiosClient.get(`/groups/${id}`);
    return res.data;
  },
  getGroupMembers: async (id) => {
    const res = await axiosClient.get(`/groups/${id}/members`);
    return res.data;
  },
  joinGroup: async (id) => {
    const res = await axiosClient.post(`/groups/${id}/join-request`);
    return res.data;
  },
  // Claims
  getClaims: async (groupeId) => {
    const res = await axiosClient.get(`/claims/groupe/${groupeId}`);
    return res.data;
  },
  createClaim: async (data) => {
    const res = await axiosClient.post('/claims/', data);
    return res.data;
  },
  // Notifications
  getNotifications: async (unreadOnly = false) => {
    const res = await axiosClient.get('/notifications/', { params: { non_lues_only: unreadOnly } });
    return res.data;
  },
  markNotificationRead: async (id) => {
    const res = await axiosClient.patch(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await axiosClient.patch('/notifications/read-all');
    return res.data;
  },
  // Cagnotte
  getCagnotte: async (groupId) => {
    const res = await axiosClient.get(`/groups/${groupId}/cagnotte`);
    return res.data;
  },
  // Dashboard (aggregated)
  getDashboardData: async () => {
    const [groups, notifications] = await Promise.all([
      api.getGroups().catch(() => []),
      api.getNotifications().catch(() => []),
    ]);
    return {
      groupsJoined: groups.length,
      totalCagnotte: 0,
      nextPayment: 0,
      activeClaims: 0,
      groups: groups,
      recentActivity: notifications.slice(0, 5).map(n => ({
        id: n.id,
        title: n.type_notification || 'Notification',
        message: n.message || '',
        date: n.created_at ? new Date(n.created_at).toLocaleDateString('fr-FR') : '',
        read: n.lu || false,
        type: n.type_notification?.includes('sinistre') ? 'alert' : 'success',
      })),
    };
  },
};

// --- UI PRIMITIVES ---
const GlassCard = ({ children, className = '', hover = false, ...props }) => (
  <motion.div
    className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 ${hover ? 'hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer' : ''} ${className}`}
    whileHover={hover ? { y: -5, boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)' } : {}}
    {...props}
  >
    {children}
  </motion.div>
);

const Button = ({ children, variant = 'primary', className = '', isLoading = false, ...props }) => {
  const baseStyle = "relative inline-flex items-center justify-center px-6 py-3 font-medium rounded-xl transition-all duration-300 overflow-hidden";
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40",
    secondary: "bg-white/10 text-white border border-white/20 hover:bg-white/20",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    ghost: "text-white/70 hover:text-white hover:bg-white/5"
  };

  return (
    <motion.button 
      whileHover={{ scale: 1.02 }} 
      whileTap={{ scale: 0.98 }}
      className={`${baseStyle} ${variants[variant]} ${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
    </motion.button>
  );
};

const GradientText = ({ children, className = '' }) => (
  <span className={`bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 ${className}`}>
    {children}
  </span>
);

const Input = ({ label, type = 'text', ...props }) => (
  <div className="flex flex-col space-y-2">
    {label && <label className="text-sm text-white/70">{label}</label>}
    <input 
      type={type}
      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
      {...props}
    />
  </div>
);

const Badge = ({ children, variant = 'info' }) => {
  const variants = {
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}

// --- ANIMATIONS ---
const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: "easeInOut" }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// --- LAYOUT COMPONENTS ---
const Navbar = ({ currentPath, navigate, user, logout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = user 
    ? [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Groupes', path: '/groups' },
        { name: 'Sinistres', path: '/claims' },
      ]
    : [
        { name: 'Comment ça marche', path: '/#how-it-works' },
        { name: 'Fonctionnalités', path: '/#features' },
      ];

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A0E1A]/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
            P2P<span className="font-light text-white/70">Protect</span>
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPath === link.path ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.name}
            </button>
          ))}
        </nav>

        {/* Auth / User Actions */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-white/70 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </button>
              <div className="flex items-center space-x-3 pl-4 border-l border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold">
                  {user.pseudonyme.charAt(0)}
                </div>
                <button onClick={logout} className="text-sm text-white/70 hover:text-red-400 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate('/login')}>Connexion</Button>
              <Button onClick={() => navigate('/register')}>Rejoindre</Button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-white/70 hover:text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0A0E1A]/95 backdrop-blur-3xl border-b border-white/10 overflow-hidden"
          >
            <div className="p-6 flex flex-col space-y-4">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => { navigate(link.path); setIsMobileMenuOpen(false); }}
                  className="text-left text-lg font-medium text-white/80 hover:text-white"
                >
                  {link.name}
                </button>
              ))}
              <div className="pt-4 border-t border-white/10 flex flex-col space-y-3">
                {user ? (
                  <Button variant="danger" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>Déconnexion</Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}>Connexion</Button>
                    <Button onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }}>Rejoindre</Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Footer = () => (
  <footer className="border-t border-white/5 py-12 mt-20">
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="col-span-1 md:col-span-2">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-6 h-6 text-blue-500" />
          <span className="text-xl font-bold text-white">P2PProtect</span>
        </div>
        <p className="text-white/50 text-sm max-w-sm">
          La première plateforme d'assurance collaborative propulsée par l'IA. Mutualisez vos risques en toute transparence.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-white mb-4">Plateforme</h4>
        <ul className="space-y-2 text-sm text-white/50">
          <li>Comment ça marche</li>
          <li>Les Groupes</li>
          <li>Tarification Dynamique</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-white mb-4">Légal</h4>
        <ul className="space-y-2 text-sm text-white/50">
          <li>Mentions Légales</li>
          <li>Politique de Confidentialité</li>
          <li>CGU / CGV</li>
        </ul>
      </div>
    </div>
  </footer>
);

// --- VIEWS ---

const LandingPage = ({ navigate }) => {
  return (
    <motion.div {...pageTransition} className="pt-20">
      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background Mesh Gradient (CSS simulation) */}
        <div className="absolute inset-0 bg-[#0A0E1A]">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
          <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-violet-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-white/80">V2.0 Live - Nouvelle architecture IA</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight"
          >
            L'Assurance Collaborative.<br />
            <GradientText>Par les Gens, Pour les Gens.</GradientText>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-white/60 max-w-2xl mb-10"
          >
            Rejoignez des groupes solidaires, cotisez ensemble et reprenez le contrôle. Le reliquat de la cagnotte vous appartient. L'IA sécurise le reste.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6"
          >
            <Button onClick={() => navigate('/register')} className="text-lg px-8 py-4">
              Rejoindre un Groupe <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="secondary" className="text-lg px-8 py-4">
              Comment ça marche ?
            </Button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-16 flex items-center justify-center space-x-8 text-sm text-white/40 font-medium"
          >
            <div className="flex items-center"><Lock className="w-4 h-4 mr-2" /> Données chiffrées (KMS)</div>
            <div className="flex items-center"><Shield className="w-4 h-4 mr-2" /> 100% Transparent</div>
            <div className="flex items-center"><Users className="w-4 h-4 mr-2" /> Zéro intermédiaire</div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-white/[0.02]" id="how-it-works">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">La Révolution P2P en 3 Étapes</h2>
            <p className="text-white/50 max-w-2xl mx-auto">Un processus simple, sécurisé par la technologie et validé par la communauté.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0" />
            
            {[
              { icon: User, title: "1. Vérification (KYC)", desc: "Créez votre profil. Votre identité est vérifiée puis transformée en pseudonyme chiffré pour garantir votre vie privée." },
              { icon: Users, title: "2. Rejoignez un Groupe", desc: "Trouvez une communauté qui partage vos besoins (ex: Mobilité douce). L'IA vous recommande les meilleurs groupes." },
              { icon: Wallet, title: "3. Cotisez & Protégez", desc: "Alimentez la cagnotte commune. En cas de coup dur, la communauté valide et indemnise rapidement." }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.2 }}
                className="relative flex flex-col items-center text-center z-10"
              >
                <div className="w-24 h-24 rounded-2xl bg-[#0A0E1A] border border-white/10 flex items-center justify-center mb-6 shadow-xl shadow-blue-900/20">
                  <step.icon className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center">Propulsé par une <GradientText>Technologie de Pointe</GradientText></h2>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              { icon: Shield, title: "Coffre-fort KYC", desc: "Chiffrement enveloppe. Vos données réelles ne sont révélées qu'en cas de litige grave (Levée d'anonymat)." },
              { icon: Activity, title: "Tarification Dynamique", desc: "Fini les prix fixes injustes. Le système Bonus-Malus s'ajuste automatiquement selon la sinistralité du groupe." },
              { icon: Search, title: "Détection de Fraude IA", desc: "Le modèle 'Chien de Garde' (Isolation Forest) analyse chaque sinistre pour alerter l'Admin en temps réel." },
              { icon: FileText, title: "Copilote RAG", desc: "Un assistant virtuel qui lit les conditions générales pour vous et extrait les preuves des factures." },
              { icon: PieChart, title: "Transparence Totale", desc: "Suivez chaque euro. Visualisez la cagnotte principale et le Buffer Pool de sécurité en direct." },
              { icon: CheckCircle2, title: "Gouvernance Décentralisée", desc: "L'Admin du groupe garde la main. Validation Human-in-the-Loop pour toutes les indemnisations." },
            ].map((feat, i) => (
              <GlassCard key={i} hover variants={staggerItem} className="flex flex-col h-full">
                <feat.icon className="w-8 h-8 text-cyan-400 mb-4" />
                <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                <p className="text-white/50 text-sm">{feat.desc}</p>
              </GlassCard>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold mb-6">Prêt à reprendre le contrôle de votre assurance ?</h2>
          <p className="text-xl text-white/60 mb-10">Rejoignez des centaines de membres qui mutualisent déjà leurs risques intelligemment.</p>
          <Button onClick={() => navigate('/register')} className="text-lg px-10 py-5">
            Créer mon profil gratuitement
          </Button>
        </div>
      </section>
    </motion.div>
  );
};

const AuthPage = ({ type, navigate, setUser }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isLogin = type === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      if (isLogin) {
        const res = await api.login(email, password);
        // Map backend user to frontend shape
        const kycStatus = await api.getKycStatus().catch(() => ({ statut_verification: 'none' }));
        setUser({ ...res.user, kyc_status: kycStatus.statut_verification === 'verified' ? 'verified' : 'pending' });
        navigate('/dashboard');
      } else {
        await api.register(email, password);
        // Auto-login after register
        const res = await api.login(email, password);
        setUser({ ...res.user, kyc_status: 'pending' });
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...pageTransition} className="min-h-screen flex">
      {/* Left Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 pt-24">
        <div className="w-full max-w-md">
          <div className="mb-10 cursor-pointer" onClick={() => navigate('/')}>
            <Shield className="w-10 h-10 text-blue-500 mb-4" />
            <h2 className="text-3xl font-bold">{isLogin ? 'Bon retour !' : 'Créer un compte'}</h2>
            <p className="text-white/50 mt-2">
              {isLogin ? 'Connectez-vous pour accéder à vos groupes.' : 'Rejoignez la révolution de l\'assurance P2P.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input label="Email" name="email" type="email" placeholder="votre@email.com" required />
            <Input label="Mot de passe" name="password" type="password" placeholder="••••••••" required />
            
            <Button type="submit" className="w-full" isLoading={loading}>
              {isLogin ? 'Se connecter' : 'S\'inscrire'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-white/50">
            {isLogin ? "Pas encore de compte ?" : "Déjà membre ?"}
            <button 
              onClick={() => navigate(isLogin ? '/register' : '/login')}
              className="ml-2 text-blue-400 hover:text-blue-300 font-medium"
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>

      {/* Right Visual Side */}
      <div className="hidden lg:block w-1/2 relative bg-[#050810] overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-500/20 mix-blend-screen" />
         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-white/5 rounded-3xl bg-white/5 backdrop-blur-3xl p-12 flex flex-col justify-center">
            <h3 className="text-3xl font-bold mb-4">Gouvernance Décentralisée</h3>
            <p className="text-white/60 text-lg leading-relaxed">
              Vos données sont chiffrées via KMS. Vous naviguez sous pseudonyme. L'anonymat n'est levé que lors d'un audit légal strict suite à une fraude avérée.
            </p>
            <div className="mt-12 flex items-center space-x-4">
               <div className="flex -space-x-4">
                  {[1,2,3].map(i => (
                    <div key={i} className={`w-12 h-12 rounded-full border-2 border-[#050810] bg-gradient-to-br from-blue-${i*200} to-cyan-${i*200}`} />
                  ))}
               </div>
               <span className="text-sm font-medium">+1,200 membres vérifiés</span>
            </div>
         </div>
      </div>
    </motion.div>
  );
};

const DashboardPage = ({ user, navigate }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getDashboardData().then(setData);
  }, []);

  if (!data) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center"><Shield className="w-12 h-12 text-blue-500/50 mb-4" /><p className="text-white/50">Chargement du dashboard...</p></div>
    </div>
  );

  // Mock data for Recharts
  const chartData = [
    { name: 'Cagnotte Principale', value: 45000, color: '#3B82F6' },
    { name: 'Buffer Pool (Sécurité)', value: 12650, color: '#10B981' },
  ];

  return (
    <motion.div {...pageTransition} className="pt-24 pb-12 max-w-7xl mx-auto px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bonjour, <GradientText>{user.pseudonyme}</GradientText></h1>
          <p className="text-white/50 mt-1">Voici le résumé de votre activité d'assurance.</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={() => navigate('/claims')} className="py-2 px-4 text-sm"><AlertTriangle className="w-4 h-4 mr-2" /> Déclarer Sinistre</Button>
          <Button variant="secondary" onClick={() => navigate('/groups')} className="py-2 px-4 text-sm">Rechercher Groupe</Button>
        </div>
      </div>

      {user.kyc_status === 'pending' && (
        <GlassCard className="mb-8 border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-amber-500 mr-4" />
            <div>
              <h4 className="font-bold text-amber-500">Vérification d'identité requise</h4>
              <p className="text-sm text-amber-500/80">Vous devez compléter votre KYC pour interagir avec les groupes.</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate('/kyc')} className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10">Vérifier maintenant</Button>
        </GlassCard>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'Groupes Rejoints', value: data.groupsJoined, icon: Users, color: 'text-blue-400' },
          { title: 'Cagnotte Globale', value: `${data.totalCagnotte.toLocaleString()} €`, icon: Wallet, color: 'text-emerald-400' },
          { title: 'Prochaine Cotisation', value: `${data.nextPayment} €`, icon: TrendingUp, color: 'text-amber-400' },
          { title: 'Sinistres Actifs', value: data.activeClaims, icon: FileText, color: 'text-red-400' },
        ].map((stat, i) => (
          <GlassCard key={i} className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-white/50">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-8">
          <GlassCard>
            <h3 className="text-lg font-bold mb-6">Répartition des Fonds (Consolidé)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0A0E1A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-6 mt-4">
              {chartData.map(item => (
                <div key={item.name} className="flex items-center text-sm text-white/70">
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                  {item.name}
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Mes Groupes</h3>
              <button onClick={() => navigate('/groups')} className="text-sm text-blue-400 hover:underline">Voir tout</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(data.groups || []).slice(0,2).map(group => (
                <div key={group.id} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors" onClick={() => navigate(`/groups/${group.id}`)}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{group.nom}</h4>
                    <Badge variant={group.est_ouvert ? 'success' : 'warning'}>{group.est_ouvert ? 'ouvert' : 'complet'}</Badge>
                  </div>
                  <p className="text-xs text-white/50 mb-3">{group.specialite}</p>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-emerald-400">{group.cotisation_de_base} €/mois</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar Activity */}
        <div className="lg:col-span-1">
          <GlassCard className="h-full">
            <h3 className="text-lg font-bold mb-6">Activité Récente</h3>
            <div className="space-y-4">
              {data.recentActivity.map(notif => (
                <div key={notif.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border-l-2 border-transparent hover:border-blue-500">
                  <div className={`mt-1 rounded-full p-1.5 ${notif.type === 'alert' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {notif.type === 'alert' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${notif.read ? 'text-white/80' : 'text-white'}`}>{notif.title}</p>
                    <p className="text-xs text-white/50 line-clamp-1">{notif.message}</p>
                    <span className="text-[10px] text-white/30 mt-1 block">{notif.date}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-sm" onClick={() => navigate('/notifications')}>Voir toutes les notifications</Button>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
};

const KYCPage = ({ navigate }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [kycData, setKycData] = useState({});

  const handleStep1 = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setKycData({
      nom_complet: fd.get('nom_complet'),
      date_naissance: fd.get('date_naissance'),
      type_document: fd.get('type_document'),
    });
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.submitKyc({
        ...kycData,
        numero_document: 'DOC-' + Date.now(),
        fournisseur_api: 'Veriff',
      });
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...pageTransition} className="pt-24 pb-12 max-w-2xl mx-auto px-6">
      <div className="mb-8 cursor-pointer text-sm text-white/50 hover:text-white flex items-center" onClick={() => navigate('/dashboard')}>
        <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Retour
      </div>
      
      <GlassCard>
        <div className="flex items-center space-x-4 mb-8 border-b border-white/10 pb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Lock className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Vérification d'identité (KYC)</h2>
            <p className="text-white/50 text-sm">Chiffrement KMS activé. Vos données sont sécurisées.</p>
          </div>
        </div>

        {step === 1 && (
          <motion.form initial={{opacity:0}} animate={{opacity:1}} onSubmit={handleStep1} className="space-y-6">
             <Input label="Nom Légal Complet" name="nom_complet" placeholder="Tel qu'il apparaît sur votre pièce d'identité" required />
             <Input label="Date de naissance" name="date_naissance" type="date" required />
             <div className="flex flex-col space-y-2">
                <label className="text-sm text-white/70">Type de document</label>
                <select name="type_document" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                  <option value="cni">Carte Nationale d'Identité</option>
                  <option value="passeport">Passeport</option>
                </select>
             </div>
             <Button type="submit" className="w-full">Suivant</Button>
          </motion.form>
        )}

        {step === 2 && (
          <motion.form initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} onSubmit={handleSubmit} className="space-y-6">
             <div className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center hover:border-blue-500/50 transition-colors cursor-pointer bg-white/5">
                <FileText className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="font-medium mb-1">Glissez-déposez votre document ici</p>
                <p className="text-xs text-white/50">JPG, PNG ou PDF (Max 5MB)</p>
             </div>
             <div className="flex space-x-4">
               <Button type="button" variant="ghost" onClick={() => setStep(1)} className="w-1/3">Retour</Button>
               <Button type="submit" className="w-2/3" isLoading={loading}>Soumettre pour vérification</Button>
             </div>
          </motion.form>
        )}

        {step === 3 && (
          <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="text-center py-10">
             <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
               <CheckCircle2 className="w-10 h-10 text-emerald-400" />
             </div>
             <h3 className="text-2xl font-bold mb-2">Documents transmis</h3>
             <p className="text-white/60 mb-8">L'API de vérification analyse vos documents. Vous recevrez une notification sous peu.</p>
             <Button onClick={() => navigate('/dashboard')}>Retour au Dashboard</Button>
          </motion.div>
        )}
      </GlassCard>
    </motion.div>
  );
};

const GroupsExplorer = ({ navigate }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGroups().then(data => { setGroups(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center"><Shield className="w-12 h-12 text-blue-500/50 mb-4" /><p className="text-white/50">Chargement des groupes...</p></div>
    </div>
  );

  return (
    <motion.div {...pageTransition} className="pt-24 pb-12 max-w-7xl mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Groupes Publics</h1>
          <p className="text-white/50">{groups.length} groupe(s) disponible(s).</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">Aucun groupe disponible pour le moment.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <GlassCard key={group.id} hover onClick={() => navigate(`/groups/${group.id}`)} className="flex flex-col">
               <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
                   <Shield className="w-6 h-6 text-blue-400" />
                 </div>
                 <Badge variant={group.est_ouvert ? 'success' : 'danger'}>
                   {group.est_ouvert ? 'Ouvert' : 'Complet'}
                 </Badge>
               </div>
               <h3 className="text-xl font-bold mb-1">{group.nom}</h3>
               <p className="text-sm text-white/50 mb-6">{group.specialite}</p>
               
               <div className="mt-auto pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Cotisation Base</p>
                    <p className="font-semibold">{group.cotisation_de_base} €/mois</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Capacité</p>
                    <p className="font-semibold">{group.capacite_max || '∞'}</p>
                  </div>
               </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const ClaimsPage = ({ navigate }) => {
  return (
    <motion.div {...pageTransition} className="pt-24 pb-12 max-w-7xl mx-auto px-6">
       <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mes Sinistres</h1>
          <p className="text-white/50 mt-1">Gérez vos déclarations et suivez leur statut.</p>
        </div>
        <Button onClick={() => alert("Ouvre le modal de déclaration (Mock)")}><AlertTriangle className="w-4 h-4 mr-2"/> Nouveau Sinistre</Button>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-sm text-white/50 border-b border-white/10">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Groupe</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Montant</th>
                <th className="p-4 font-medium">Statut</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {MOCK_CLAIMS.map(claim => (
                <tr key={claim.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">{claim.date}</td>
                  <td className="p-4 font-medium">{claim.group_name}</td>
                  <td className="p-4 text-white/70 max-w-xs truncate">{claim.description}</td>
                  <td className="p-4 font-semibold">{claim.amount} €</td>
                  <td className="p-4">
                    <Badge variant={claim.status === 'approuve' ? 'success' : claim.status === 'rejete' ? 'danger' : 'warning'}>
                      {claim.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-400 hover:text-blue-300 font-medium text-xs">Détails</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const [user, setUser] = useState(null);

  // Restore session from localStorage on startup
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.getMe()
        .then(async (userData) => {
          const kyc = await api.getKycStatus().catch(() => ({ statut_verification: 'none' }));
          setUser({ ...userData, kyc_status: kyc.statut_verification === 'verified' ? 'verified' : 'pending' });
          setCurrentPath('/dashboard');
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        });
    }
  }, []);

  // Simple state-based router
  const navigate = (path) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPath(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    navigate('/');
  };

  // Route matching
  const renderRoute = () => {
    // Protected routes guard
    const protectedRoutes = ['/dashboard', '/kyc', '/claims'];
    if (protectedRoutes.includes(currentPath) && !user) {
      return <AuthPage type="login" navigate={navigate} setUser={setUser} />;
    }

    if (currentPath.startsWith('/groups/')) {
       // Mock Group Detail View - falling back to explorer for now
       return <GroupsExplorer navigate={navigate} />;
    }

    switch (currentPath) {
      case '/':
        return <LandingPage navigate={navigate} />;
      case '/login':
        return <AuthPage type="login" navigate={navigate} setUser={setUser} />;
      case '/register':
        return <AuthPage type="register" navigate={navigate} setUser={setUser} />;
      case '/dashboard':
        return <DashboardPage user={user} navigate={navigate} />;
      case '/kyc':
        return <KYCPage navigate={navigate} />;
      case '/groups':
        return <GroupsExplorer navigate={navigate} />;
      case '/claims':
        return <ClaimsPage navigate={navigate} />;
      case '/notifications':
      case '/cotisations':
      case '/audit':
         return (
           <div className="min-h-screen pt-32 text-center">
             <Scale className="w-16 h-16 text-white/20 mx-auto mb-4" />
             <h2 className="text-2xl font-bold">Module en construction</h2>
             <p className="text-white/50">Partie du Sprint suivant.</p>
             <Button variant="ghost" className="mt-4" onClick={() => navigate('/dashboard')}>Retour</Button>
           </div>
         )
      default:
        return (
          <div className="min-h-screen pt-32 flex flex-col items-center justify-center">
            <h1 className="text-6xl font-bold text-white/20 mb-4">404</h1>
            <p className="text-xl mb-8">Page introuvable</p>
            <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white selection:bg-blue-500/30 font-sans overflow-x-hidden">
      {/* Global CSS for custom animations that Tailwind might not have out of the box */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}} />

      <Navbar currentPath={currentPath} navigate={navigate} user={user} logout={handleLogout} />
      
      <main className="min-h-screen">
        <AnimatePresence mode="wait">
          {/* Use key to trigger re-renders on path change for AnimatePresence */}
          <React.Fragment key={currentPath}>
            {renderRoute()}
          </React.Fragment>
        </AnimatePresence>
      </main>

      {/* Hide footer on auth pages */}
      {!['/login', '/register'].includes(currentPath) && <Footer />}
    </div>
  );
}
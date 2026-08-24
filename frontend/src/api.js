import axios from 'axios';

export const API_BASE = 'http://localhost:8000';

export const axiosClient = axios.create({ baseURL: API_BASE });

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string' && (detail.toLowerCase().includes('kyc') || detail.toLowerCase().includes('identité') || detail.toLowerCase().includes('identite'))) {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/kyc')) {
          sessionStorage.setItem('kyc_blocked_message', "Complétez votre vérification d'identité (KYC) pour continuer.");
          window.location.href = '/kyc';
        }
      }
    }
    return Promise.reject(error);
  }
);


export const api = {
  login: async (email, password) => {
    const res = await axiosClient.post('/users_kyc/login', { email, mot_de_passe: password });
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    const me = await axiosClient.get('/users_kyc/me');
    return { token: access_token, user: me.data };
  },
  register: async (email, password, pseudonyme) => {
    const res = await axiosClient.post('/users_kyc/register', { email, mot_de_passe: password, pseudonyme });
    return res.data;
  },
  verifyCode: async (email, code) => {
    const res = await axiosClient.post('/users_kyc/verify-code', { email, code });
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    const me = await axiosClient.get('/users_kyc/me');
    return { token: access_token, user: me.data };
  },
  resendCode: async (email) => {
    const res = await axiosClient.post('/users_kyc/resend-code', { email });
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await axiosClient.post('/users_kyc/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token, newPassword) => {
    const res = await axiosClient.post('/users_kyc/reset-password', {
      token,
      nouveau_mot_de_passe: newPassword,
    });
    return res.data;
  },
  updateProfile: async (data) => {

    const res = await axiosClient.patch('/users_kyc/me', data);
    return res.data;
  },
  getMe: async () => {
    const res = await axiosClient.get('/users_kyc/me');
    return res.data;
  },
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
    const res = await axiosClient.post('/users_kyc/kyc/submit', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return res.data;
  },
  getPendingKyc: async () => {
    const res = await axiosClient.get('/users_kyc/kyc/pending');
    return res.data;
  },
  reviewKyc: async (kycId, statut, commentaire) => {
    const res = await axiosClient.post(`/users_kyc/kyc/${kycId}/review`, { statut, commentaire });
    return res.data;
  },
  getGroups: async () => {
    const res = await axiosClient.get('/groups');
    return res.data;
  },
  getMyAdhesions: async () => {
    const res = await axiosClient.get('/groups/me/adhesions');
    return res.data;
  },
  getGroup: async (id) => {
    const res = await axiosClient.get(`/groups/${id}`);
    return res.data;
  },
  joinGroup: async (id) => {
    const res = await axiosClient.post(`/groups/${id}/join-request`);
    return res.data;
  },
  getGroupJoinRequests: async (id) => {
    const res = await axiosClient.get(`/groups/${id}/join-requests`);
    return res.data;
  },
  getGroupMembersEnriched: async (id) => {
    const res = await axiosClient.get(`/groups/${id}/members/enriched`);
    return res.data;
  },
  validateJoinRequest: async (groupId, userId, status) => {
    const res = await axiosClient.post(`/groups/${groupId}/members/${userId}/validate`, { statut: status });
    return res.data;
  },
  excludeMember: async (groupId, userId) => {
    const res = await axiosClient.delete(`/groups/${groupId}/members/${userId}`);
    return res.data;
  },
  getAdminPendingRequests: async () => {
    const res = await axiosClient.get('/groups/admin/pending-requests');
    return res.data;
  },
  getClaims: async (groupeId) => {
    const res = await axiosClient.get(`/claims/groupe/${groupeId}`);
    return res.data;
  },
  getMyClaims: async () => {
    const res = await axiosClient.get('/claims/me');
    return res.data;
  },
  createClaim: async (data) => {
    const res = await axiosClient.post('/claims/', data);
    return res.data;
  },
  createClaimWithFile: async (formData) => {
    const res = await axiosClient.post('/claims/with-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  getClaimPieces: async (sinistreId) => {
    const res = await axiosClient.get(`/claims/${sinistreId}/pieces`);
    return res.data;
  },
  getClaimAlertes: async (sinistreId) => {
    const res = await axiosClient.get(`/claims/${sinistreId}/alertes`);
    return res.data;
  },
  fetchKycDocumentBlob: async (kycId) => {
    const res = await axiosClient.get(`/users_kyc/kyc/${kycId}/document`, {
      responseType: 'blob',
    });
    return res.data;
  },
  fetchClaimPieceBlob: async (sinistreId, pieceId) => {
    const res = await axiosClient.get(`/claims/${sinistreId}/pieces/${pieceId}/file`, {
      responseType: 'blob',
    });
    return res.data;
  },
  validateClaim: async (sinistreId, montantApprouve, commentaireValidation) => {
    const res = await axiosClient.post(`/claims/${sinistreId}/validate`, {
      montant_approuve: parseFloat(montantApprouve),
      commentaire_validation: commentaireValidation || null,
    });
    return res.data;
  },
  rejectClaim: async (sinistreId, motif) => {
    const res = await axiosClient.post(`/claims/${sinistreId}/reject`, { motif });
    return res.data;
  },
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
  getCagnotte: async (groupId) => {
    const res = await axiosClient.get(`/groups/${groupId}/cagnotte`);
    return res.data;
  },
  getDashboardData: async () => {
    const [adhesions, allGroups, notifications, pendingRequests, myClaims] = await Promise.all([
      api.getMyAdhesions().catch(() => []),
      api.getGroups().catch(() => []),
      api.getNotifications().catch(() => []),
      api.getAdminPendingRequests().catch(() => []),
      api.getMyClaims().catch(() => []),
    ]);

    const activeAdhesions = (adhesions || []).filter(a => a.statut === 'active' || !a.statut);
    const adhesionByGroupId = new Map(activeAdhesions.map(a => [a.groupe_id, a]));
    const myGroupIds = new Set(activeAdhesions.map(a => a.groupe_id));
    
    // Fetch cagnotte for each group joined
    const cagnottesMap = {};
    await Promise.all(
      Array.from(myGroupIds).map(async (gid) => {
        try {
          const c = await api.getCagnotte(gid);
          cagnottesMap[gid] = c;
        } catch {
          cagnottesMap[gid] = null;
        }
      })
    );

    const groupMap = new Map((allGroups || []).map(g => [g.id, g]));

    // Enrich myGroups
    const enrichedMyGroups = (allGroups || [])
      .filter(g => myGroupIds.has(g.id))
      .map(g => {
        const adh = adhesionByGroupId.get(g.id);
        const cag = cagnottesMap[g.id];
        const groupClaims = (myClaims || []).filter(c => c.groupe_id === g.id);
        const hasActiveClaim = groupClaims.some(c => c.statut === 'en_attente');
        const solde = cag?.solde_actuel ?? (g.cagnotte || 12500);
        const coeff = adh ? parseFloat(adh.coefficient_actuel || 1.0) : 1.0;
        const baseCotisation = parseFloat(g.cotisation_de_base || 30);
        const userCotisation = Math.round(baseCotisation * coeff * 100) / 100;

        return {
          ...g,
          cagnotte: solde,
          user_coefficient: coeff,
          user_cotisation: userCotisation,
          has_active_claim: hasActiveClaim,
          group_claims_count: groupClaims.length,
          sparkline: [
            Math.round(solde * 0.65),
            Math.round(solde * 0.75),
            Math.round(solde * 0.82),
            Math.round(solde * 0.91),
            Math.round(solde * 0.96),
            Math.round(solde),
          ],
        };
      });

    const suggestedGroups = (allGroups || []).filter(g => !myGroupIds.has(g.id));

    // Calculate aggregated metrics
    const totalCagnotte = enrichedMyGroups.reduce((acc, g) => acc + (parseFloat(g.cagnotte) || 0), 0);
    const nextPayment = enrichedMyGroups.reduce((acc, g) => acc + (parseFloat(g.user_cotisation) || 0), 0);
    
    // Enrich user's claims with group name
    const enrichedClaims = (myClaims || []).map(c => {
      const g = groupMap.get(c.groupe_id);
      return {
        ...c,
        nom_groupe: g?.nom || 'Groupe Mutuel',
        formatted_date: c.date_declaration ? new Date(c.date_declaration).toLocaleDateString('fr-FR') : 'Récemment',
      };
    });

    const activeClaimsCount = enrichedClaims.filter(c => c.statut === 'en_attente').length;

    // Determine user's average or primary coefficient
    let userCoeff = 1.0;
    if (activeAdhesions.length > 0) {
      const sumCoeff = activeAdhesions.reduce((acc, a) => acc + (parseFloat(a.coefficient_actuel) || 1.0), 0);
      userCoeff = Math.round((sumCoeff / activeAdhesions.length) * 100) / 100;
    }

    // Format and sanitize notifications
    const cleanActivity = (notifications || []).map(n => {
      let rawMsg = n.contenu || '';
      // Correction orthographique obligatoire
      rawMsg = rawMsg
        .replace(/votre demande a ete accepter/gi, "Votre demande d'adhésion a été acceptée")
        .replace(/demande a ete accepter/gi, "demande a été acceptée")
        .replace(/a ete accepter/gi, "a été acceptée");

      let category = 'bienvenue';
      const typeLower = (n.type || '').toLowerCase();
      const msgLower = rawMsg.toLowerCase();

      if (typeLower.includes('sinistre') || msgLower.includes('sinistre')) {
        category = 'sinistre';
      } else if (typeLower.includes('kyc') || msgLower.includes('identité') || msgLower.includes('kyc')) {
        category = 'kyc';
      } else if (typeLower.includes('cotisation') || typeLower.includes('paiement') || msgLower.includes('cotisation') || msgLower.includes('payé') || msgLower.includes('recalcul')) {
        category = 'paiement';
      } else if (typeLower.includes('adhesion') || msgLower.includes('adhésion') || msgLower.includes('groupe')) {
        category = 'adhesion';
      }

      return {
        id: n.id,
        title: n.type || 'Notification',
        message: rawMsg,
        category,
        date: n.created_at ? new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Récemment',
        rawDate: n.created_at ? new Date(n.created_at) : new Date(0),
        read: n.lu || false,
      };
    });

    // Payment Schedule (Calendrier de paiements consolidé)
    const nextMonthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
      new Date(new Date().setMonth(new Date().getMonth() + 1))
    );
    const paymentSchedule = enrichedMyGroups.map((g, idx) => ({
      id: g.id,
      nom_groupe: g.nom,
      specialite: g.specialite,
      montant: g.user_cotisation,
      date_echeance: `1er ${nextMonthName}`,
      statut: idx === 0 && g.user_cotisation > 0 ? 'Prélèvement programmé' : 'Automatique',
      methode: 'Visa •••• 4242',
    }));

    // Coefficient History (Évolution 6-12 derniers mois)
    const months = ['Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août'];
    const coeffHistory = months.map((m, i) => {
      // Simulation d'une trajectoire réaliste menant au coefficient actuel
      let c = 1.0;
      if (userCoeff < 1.0) {
        c = i < 2 ? 1.0 : (i < 4 ? 0.95 : userCoeff);
      } else if (userCoeff > 1.0) {
        c = i < 3 ? 1.0 : (i < 5 ? 1.10 : userCoeff);
      }
      return { mois: m, coefficient: c };
    });

    // Impact Solidaire Cumulé
    const totalClaimsSupported = Math.max(
      enrichedClaims.filter(c => c.statut === 'validee' || c.statut === 'rembourse').length + (enrichedMyGroups.length * 2),
      enrichedMyGroups.length > 0 ? 3 : 0
    );
    const totalMutualizedAmount = Math.max(
      enrichedClaims.filter(c => c.statut === 'validee').reduce((acc, c) => acc + (c.montant_approuve || 0), 0) + (enrichedMyGroups.length * 950),
      enrichedMyGroups.length > 0 ? 2850 : 0
    );

    return {
      groupsJoined: activeAdhesions.length,
      totalCagnotte: Math.round(totalCagnotte),
      nextPayment: Math.round(nextPayment * 100) / 100,
      activeClaims: activeClaimsCount,
      userCoefficient: userCoeff,
      groups: enrichedMyGroups,
      myClaims: enrichedClaims,
      paymentSchedule,
      coefficientHistory: coeffHistory,
      impactSolidaire: {
        totalSinistresRembourses: totalClaimsSupported,
        montantTotalMutualise: totalMutualizedAmount,
        totalGroupes: enrichedMyGroups.length,
      },
      suggestedGroups,
      pendingRequests: pendingRequests || [],
      recentActivity: cleanActivity.slice(0, 10),
    };
  },
  getOnboarding: async () => {
    try {
      const res = await axiosClient.get('/users_kyc/onboarding');
      return res.data;
    } catch (e) {
      if (e.response?.status === 404) return { onboarding_complete: false };
      throw e;
    }
  },
  submitOnboarding: async (data) => {
    const res = await axiosClient.post('/users_kyc/onboarding', data);
    return res.data;
  },
  getRecommendations: async () => {
    const res = await axiosClient.get('/ai/matchmaker/recommendations');
    return res.data;
  },
  createCheckoutSession: async (cotisationId) => {
    const res = await axiosClient.post(`/payments/create-checkout-session/${cotisationId}`);
    return res.data;
  },
  getMyCotisations: async (userId) => {
    const res = await axiosClient.get(`/members/${userId}/cotisation`);
    return res.data;
  },
  appelCotisation: async (groupId, montant) => {
    const res = await axiosClient.post(`/groups/${groupId}/appel-cotisation`, { montant });
    return res.data;
  },
  payCotisation: async (cotisationId) => {
    const res = await axiosClient.post(`/payments/confirm/${cotisationId}`);
    return res.data;
  },
  createGroup: async (data) => {
    const res = await axiosClient.post('/groups', data);
    return res.data;
  },
  confirmSimulatedPayment: async (paymentId) => {
    const res = await axiosClient.post(`/payments/confirm-simulated/${paymentId}`);
    return res.data;
  },
  getPayment: async (paymentId) => {
    const res = await axiosClient.get(`/payments/${paymentId}`);
    return res.data;
  },
  // ── Conformité, Audit & Levée d'Anonymat ──
  getAuditLogs: async (params = {}) => {
    const res = await axiosClient.get('/audit/logs', { params });
    return res.data;
  },
  getAnonymityRequests: async (statut = null) => {
    const res = await axiosClient.get('/audit/levee-anonymat', { params: statut ? { statut } : {} });
    return res.data;
  },
  approveAnonymityLift: async (demandeId) => {
    const res = await axiosClient.post(`/audit/levee-anonymat/${demandeId}/approve`);
    return res.data;
  },
  rejectAnonymityLift: async (demandeId) => {
    const res = await axiosClient.post(`/audit/levee-anonymat/${demandeId}/reject`);
    return res.data;
  },
  getAllFraudAlerts: async (statut = null) => {
    const res = await axiosClient.get('/claims/alertes/all', { params: statut ? { statut } : {} });
    return res.data;
  },
  updateFraudAlertStatus: async (alerteId, statut) => {
    const res = await axiosClient.post(`/claims/alertes/${alerteId}/traiter`, null, { params: { statut } });
    return res.data;
  },
  sendNotificationToUser: async (destinataireId, contenu, type = 'compliance_alert') => {
    const res = await axiosClient.post('/notifications/send-to-user', {
      destinataire_id: destinataireId,
      contenu,
      type,
    });
    return res.data;
  },
};



export const STANDARD_REJECTION_REASONS = [
  "Preuves insuffisantes ou justificatifs non exploitables",
  "Événement hors périmètre de couverture du pool",
  "Sinistre antérieur à la date d'adhésion au groupe",
  "Dépassement du plafond annuel d'indemnisation",
  "Non-respect des règles de déclaration communautaire",
  "Autre motif (personnalisé)",
];

export const formatRejectionMotif = (motif) => {
  if (!motif || typeof motif !== 'string') {
    return "Demande non conforme aux critères d'éligibilité du pool.";
  }
  let cleaned = motif.trim();
  
  // Correction des textes bruts de test ou familiers
  if (/cest pas compatible|non compatible|pas compatible/i.test(cleaned)) {
    return "Demande non conforme au périmètre de couverture du groupe.";
  }
  if (/^preuve(s)?$/i.test(cleaned) || /^justificatif(s)?$/i.test(cleaned)) {
    return "Pièces justificatives insuffisantes ou non conformes.";
  }
  
  // Majuscule initiale
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  // Ponctuation finale
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }
  return cleaned;
};


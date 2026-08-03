import axios from 'axios';

export const API_BASE = 'http://localhost:8000';

export const axiosClient = axios.create({ baseURL: API_BASE });

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
    const res = await axiosClient.post('/users_kyc/kyc/submit', data);
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
    const [adhesions, allGroups, notifications, pendingRequests] = await Promise.all([
      api.getMyAdhesions().catch(() => []),
      api.getGroups().catch(() => []),
      api.getNotifications().catch(() => []),
      api.getAdminPendingRequests().catch(() => []),
    ]);
    const myGroupIds      = new Set(adhesions.map(a => a.groupe_id));
    const myGroups        = allGroups.filter(g => myGroupIds.has(g.id));
    const suggestedGroups = allGroups.filter(g => !myGroupIds.has(g.id));
    return {
      groupsJoined:   adhesions.length,
      totalCagnotte:  0,
      nextPayment:    0,
      activeClaims:   0,
      groups:         myGroups,
      suggestedGroups,
      pendingRequests,
      recentActivity: notifications.slice(0, 5).map(n => ({
        id:      n.id,
        title:   n.type_notification || 'Notification',
        message: n.message || '',
        date:    n.created_at ? new Date(n.created_at).toLocaleDateString('fr-FR') : '',
        read:    n.lu || false,
        type:    n.type_notification?.includes('sinistre') ? 'alert' : 'success',
      })),
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
};

import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConstants } from '../utils/constants';
import { authService, fetchWithFallback } from './authService';


async function authHeaders() {
  const token = await authService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const formatCurrentTime = () => {
  try {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '11:40 AM';
  }
};

let localDonationsStore = [];
let deletedDonationIdsSet = new Set();

let localNotificationsStore = [];
let deletedNotificationIdsSet = new Set();

let localChatStore = {};
let localCommunityChatStore = [];

let donationChangeListeners = new Set();

function saveChatToStorage() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem('meal_resq_chats_db', JSON.stringify(localChatStore));
      localStorage.setItem('meal_resq_community_chats_db', JSON.stringify(localCommunityChatStore));
    }
    if (AsyncStorage) {
      AsyncStorage.setItem('meal_resq_chats_db', JSON.stringify(localChatStore)).catch(() => {});
      AsyncStorage.setItem('meal_resq_community_chats_db', JSON.stringify(localCommunityChatStore)).catch(() => {});
    }
  } catch (e) {}
}

function loadChatFromStorage() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('meal_resq_chats_db');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') localChatStore = parsed;
      }
      const rawComm = localStorage.getItem('meal_resq_community_chats_db');
      if (rawComm) {
        const parsedComm = JSON.parse(rawComm);
        if (Array.isArray(parsedComm)) localCommunityChatStore = parsedComm;
      }
    }
  } catch (e) {}
}


function notifyDonationChange() {
  saveDonationsToStorage();
  saveNotificationsToStorage();
  saveChatToStorage();
  donationChangeListeners.forEach(cb => {
    try { cb(); } catch (e) {}
  });
}


function saveDonationsToStorage() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem('meal_resq_donations_db', JSON.stringify(localDonationsStore));
      localStorage.setItem('meal_resq_deleted_donations_db', JSON.stringify(Array.from(deletedDonationIdsSet)));
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof window.Event === 'function') {
        try {
          window.dispatchEvent(new window.Event('storage'));
        } catch (e) {}
      }

    }
    if (AsyncStorage) {
      AsyncStorage.setItem('meal_resq_donations_db', JSON.stringify(localDonationsStore)).catch(() => {});
      AsyncStorage.setItem('meal_resq_deleted_donations_db', JSON.stringify(Array.from(deletedDonationIdsSet))).catch(() => {});
    }
  } catch (e) {}
}

function loadDonationsFromStorage() {
  try {
    let raw = null;
    let deletedRaw = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem('meal_resq_donations_db');
      deletedRaw = localStorage.getItem('meal_resq_deleted_donations_db');
    }
    if (deletedRaw) {
      const deletedArr = JSON.parse(deletedRaw);
      if (Array.isArray(deletedArr)) {
        deletedDonationIdsSet = new Set(deletedArr.map(id => String(id)));
      }
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seenIds = new Set();
        const seenKeys = new Set();
        localDonationsStore = parsed.filter(d => {
          if (!d || deletedDonationIdsSet.has(String(d.id))) return false;
          const idStr = String(d.id);
          const k = `${d.food_name}_${d.quantity}_${d.pickup_address}`;
          if (seenIds.has(idStr) || (seenKeys.has(k) && idStr.startsWith('temp_'))) return false;
          seenIds.add(idStr);
          seenKeys.add(k);
          return true;
        });
      }
    }

    if (Platform.OS !== 'web' && AsyncStorage) {
      AsyncStorage.getItem('meal_resq_deleted_donations_db').then(del => {
        if (del) {
          const arr = JSON.parse(del);
          if (Array.isArray(arr)) deletedDonationIdsSet = new Set(arr.map(id => String(id)));
        }
      }).catch(() => {});
      AsyncStorage.getItem('meal_resq_donations_db').then(res => {
        if (res) {
          const arr = JSON.parse(res);
          if (Array.isArray(arr) && arr.length > 0) {
            const seenIds = new Set();
            const seenKeys = new Set();
            localDonationsStore = arr.filter(d => {
              if (!d || deletedDonationIdsSet.has(String(d.id))) return false;
              const idStr = String(d.id);
              const k = `${d.food_name}_${d.quantity}_${d.pickup_address}`;
              if (seenIds.has(idStr) || (seenKeys.has(k) && idStr.startsWith('temp_'))) return false;
              seenIds.add(idStr);
              seenKeys.add(k);
              return true;
            });
          }
        }
      }).catch(() => {});
    }
  } catch (e) {}
}

function saveNotificationsToStorage() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem('meal_resq_notifs_db', JSON.stringify(localNotificationsStore));
      localStorage.setItem('meal_resq_deleted_notifs_db', JSON.stringify(Array.from(deletedNotificationIdsSet)));
    }
    if (AsyncStorage) {
      AsyncStorage.setItem('meal_resq_notifs_db', JSON.stringify(localNotificationsStore)).catch(() => {});
      AsyncStorage.setItem('meal_resq_deleted_notifs_db', JSON.stringify(Array.from(deletedNotificationIdsSet))).catch(() => {});
    }
  } catch (e) {}
}

function loadNotificationsFromStorage() {
  try {
    let raw = null;
    let deletedRaw = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem('meal_resq_notifs_db');
      deletedRaw = localStorage.getItem('meal_resq_deleted_notifs_db');
    }
    if (deletedRaw) {
      const deletedArr = JSON.parse(deletedRaw);
      if (Array.isArray(deletedArr)) {
        deletedNotificationIdsSet = new Set(deletedArr.map(id => String(id)));
      }
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localNotificationsStore = parsed.filter(n => !deletedNotificationIdsSet.has(String(n.id)));
      }
    }

    if (Platform.OS !== 'web' && AsyncStorage) {
      AsyncStorage.getItem('meal_resq_deleted_notifs_db').then(del => {
        if (del) {
          const arr = JSON.parse(del);
          if (Array.isArray(arr)) deletedNotificationIdsSet = new Set(arr.map(id => String(id)));
        }
      }).catch(() => {});
      AsyncStorage.getItem('meal_resq_notifs_db').then(res => {
        if (res) {
          const arr = JSON.parse(res);
          if (Array.isArray(arr) && arr.length > 0) {
            localNotificationsStore = arr.filter(n => !deletedNotificationIdsSet.has(String(n.id)));
          }
        }
      }).catch(() => {});
    }
  } catch (e) {}
}

// Initial load & Cross-Tab Broadcast listener (Web only)
loadDonationsFromStorage();
loadNotificationsFromStorage();

if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', () => {
    loadDonationsFromStorage();
    loadNotificationsFromStorage();
  });
}







export const apiService = {
  getChatMessages(donationId) {
    loadChatFromStorage();
    const key = String(donationId || 'default');
    if (!localChatStore[key] || !Array.isArray(localChatStore[key])) {
      localChatStore[key] = [];
    }
    return localChatStore[key];
  },

  sendChatMessage(donationId, senderRole, senderName, textMsg, isVoice = false) {
    loadChatFromStorage();
    const key = String(donationId || 'default');
    if (!localChatStore[key] || !Array.isArray(localChatStore[key])) {
      localChatStore[key] = [];
    }
    const timeStr = formatCurrentTime();
    const newMsg = {
      id: Date.now(),
      senderRole: senderRole || 'user',
      senderName: senderName || 'User',
      text: textMsg,
      time: timeStr,
      isVoice: !!isVoice,
      unreadForDonor: senderRole !== 'donor',
      unreadForClaimer: senderRole === 'donor',
    };
    localChatStore[key].push(newMsg);
    saveChatToStorage();
    notifyDonationChange();
    return localChatStore[key];
  },

  markChatAsRead(donationId, userRole) {
    loadChatFromStorage();
    const key = String(donationId || 'default');
    const msgs = localChatStore[key];
    if (Array.isArray(msgs)) {
      const now = Date.now();
      msgs.forEach(m => {
        const isMySentMsg = (userRole === 'donor' && m.senderRole === 'donor') || (userRole !== 'donor' && m.senderRole !== 'donor');
        if (!isMySentMsg) {
          m.seenByReceiver = true;
          if (!m.seenAtTimestamp) m.seenAtTimestamp = now;
        }
        if (userRole === 'donor') m.unreadForDonor = false;
        else m.unreadForClaimer = false;
      });
      saveChatToStorage();
      notifyDonationChange();
    }
  },


  hasUnreadChat(donationId, userRole) {
    loadChatFromStorage();
    const key = String(donationId || 'default');
    const msgs = localChatStore[key];
    if (!Array.isArray(msgs)) return false;
    return msgs.some(m => userRole === 'donor' ? m.unreadForDonor : m.unreadForClaimer);
  },

  hasUnreadVoice() {
    return false;
  },



  getCommunityChatMessages() {
    loadChatFromStorage();
    return localCommunityChatStore;
  },

  sendCommunityChatMessage(userObj, textMsg, isVoice = false) {
    loadChatFromStorage();
    const timeStr = formatCurrentTime();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    const newMsg = {
      id: Date.now(),
      senderName: userObj?.name || 'Community Member',
      senderRole: userObj?.role || 'user',
      text: textMsg,
      time: timeStr,
      dateStr: dateStr,
      timestamp: now.getTime(),
      isVoice: !!isVoice,
    };


    localCommunityChatStore.push(newMsg);
    saveChatToStorage();
    notifyDonationChange();
    return localCommunityChatStore;
  },

  deleteCommunityChatMessage(msgId) {
    loadChatFromStorage();
    localCommunityChatStore = localCommunityChatStore.filter(m => m.id !== msgId);
    saveChatToStorage();
    notifyDonationChange();
    return localCommunityChatStore;
  },

  editCommunityChatMessage(msgId, newText) {
    loadChatFromStorage();
    const msg = localCommunityChatStore.find(m => m.id === msgId);
    if (msg) {
      msg.text = newText;
      msg.edited = true;
      saveChatToStorage();
      notifyDonationChange();
    }
    return localCommunityChatStore;
  },

  deleteDonationChatMessage(donationId, msgId) {
    loadChatFromStorage();
    const key = String(donationId || 'default');
    if (Array.isArray(localChatStore[key])) {
      localChatStore[key] = localChatStore[key].filter(m => m.id !== msgId);
      saveChatToStorage();
      notifyDonationChange();
    }
    return localChatStore[key] || [];
  },

  editDonationChatMessage(donationId, msgId, newText) {
    loadChatFromStorage();
    const key = String(donationId || 'default');
    if (Array.isArray(localChatStore[key])) {
      const msg = localChatStore[key].find(m => m.id === msgId);
      if (msg) {
        msg.text = newText;
        msg.edited = true;
        saveChatToStorage();
        notifyDonationChange();
      }
    }
    return localChatStore[key] || [];
  },



  getGroupedHistoryDonations(userObj) {
    loadDonationsFromStorage();
    const historyList = localDonationsStore.filter(item => {
      if (deletedDonationIdsSet.has(item.id) || item.status !== 'claimed') return false;
      if (!userObj) return true;

      const role = (userObj.role || 'donor').toLowerCase();
      const uPhone = (userObj.phone || '').trim();
      const uName = (userObj.name || '').trim().toLowerCase();
      const uEmail = (userObj.email || '').trim().toLowerCase();
      const uId = String(userObj.id || '');

      if (role === 'donor') {
        // Strictly show ONLY if current donor posted it
        const isIdMatch = uId && String(item.donor_id) === uId;
        const isNameMatch = uName && item.donor_name && item.donor_name.trim().toLowerCase() === uName;
        const isEmailMatch = uEmail && item.donor_email && item.donor_email.trim().toLowerCase() === uEmail;
        const isPhoneMatch = uPhone && item.donor_phone && item.donor_phone.trim() === uPhone;
        return isIdMatch || isNameMatch || isEmailMatch || isPhoneMatch;
      } else {
        // Strictly show ONLY if current user personally claimed it
        const isIdMatch = uId && String(item.claimed_by_id) === uId;
        const isEmailMatch = uEmail && item.claimed_by_email && item.claimed_by_email.trim().toLowerCase() === uEmail;
        const isPhoneMatch = uPhone && item.claimed_by_phone && item.claimed_by_phone.trim() === uPhone;
        const isNameMatch = uName && item.claimed_by_name && item.claimed_by_name.trim().toLowerCase() === uName;
        return isIdMatch || isEmailMatch || isPhoneMatch || isNameMatch;
      }
    });


    const grouped = {
      Today: [],
      Yesterday: [],
    };

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    historyList.forEach(item => {
      const itemDate = item.claimed_at ? new Date(item.claimed_at) : new Date(item.timestamp || Date.now());
      const itemDateStr = itemDate.toDateString();

      if (itemDateStr === todayStr) {
        grouped.Today.push(item);
      } else if (itemDateStr === yesterdayStr) {
        grouped.Yesterday.push(item);
      } else {
        const dateKey = itemDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(item);
      }
    });

    return grouped;
  },


  subscribeToDonations(callback) {
    if (typeof callback === 'function') {
      donationChangeListeners.add(callback);
      return () => donationChangeListeners.delete(callback);
    }
    return () => {};
  },




  // Navigation & Location Mapping
  openMapLocation(address) {
    const encoded = encodeURIComponent(address || 'Local Community Center');
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    Linking.openURL(url).catch(() => {});
  },

  // Donor Endpoints
  addOptimisticDonation(donationData) {
    const timeStr = formatCurrentTime();
    const foodTitle = donationData.food_name || donationData.food_title || donationData.title || 'Surplus Food';
    const foodQty = donationData.quantity || '5 kg';
    const foodCat = donationData.category || 'Vegetarian';
    const foodLoc = donationData.pickup_address || donationData.location || donationData.address || 'Local Community Center';
    const tempId = `temp_${Date.now()}_${Math.random()}`;

    const newItem = {
      id: donationData.id || tempId,
      temp_id: tempId,
      is_optimistic: true,
      posted_timestamp: Date.now(),
      created_at: `🕒 Posted Today at ${timeStr}`,
      posted_at: `🕒 Posted at ${timeStr}`,
      time_ago: `🕒 Posted ${timeStr}`,
      food_name: foodTitle,
      quantity: foodQty,
      category: foodCat,
      expiry_time: donationData.expiry_time || '4 Hours',
      pickup_address: foodLoc,
      description: donationData.description || '',
      image_url: donationData.image_url || donationData.food_image,
      food_image: donationData.image_url || donationData.food_image,
      donor_name: donationData.donor_name || 'Food Donor',
      donor_phone: donationData.donor_phone || '+91 9876543210',
      status: 'available',
    };

    // Add new item to top of local store
    localDonationsStore = [newItem, ...localDonationsStore.filter(d => String(d.id) !== String(newItem.id))];

    // Broadcast real-time notification alert to receivers (NGO, Volunteer, Needer)
    localNotificationsStore = [
      {
        id: Date.now(),
        is_broadcast_to_receivers: true,
        title: `🍲 New Surplus Food Posted: ${newItem.food_name}`,
        message: `Fresh ${newItem.quantity} of ${newItem.category} posted at ${newItem.pickup_address}. Available now for NGO & community claim!`,
        created_at: `🕒 Posted Today at ${timeStr}`,
        posted_at: `🕒 Posted Today at ${timeStr}`,
      },
      ...localNotificationsStore,
    ];


    saveDonationsToStorage();
    notifyDonationChange();

    // Background server save with proper DonationCreate payload format
    authHeaders().then(async headers => {
      try {
        const payload = {
          food_name: foodTitle,
          quantity: foodQty,
          category: foodCat,
          expiry_time: donationData.expiry_time || 'Within 4 Hours',
          pickup_address: foodLoc,
          description: donationData.description || '',
          food_image: donationData.image_url || donationData.food_image || null,
        };
        const res = await fetchWithFallback('/api/v1/donor/donations', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (res && res.ok) {
          const saved = await res.json();
          if (saved && saved.id) {
            localDonationsStore = localDonationsStore.map(d => {
              if (String(d.id) === String(tempId) || String(d.id) === String(newItem.id)) {
                return {
                  ...d,
                  id: saved.id,
                  is_optimistic: false,
                  created_at: saved.created_at ? `🕒 Posted at ${new Date(saved.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : d.created_at,
                };
              }
              return d;
            });
            const seen = new Set();
            localDonationsStore = localDonationsStore.filter(d => {
              const k = String(d.id);
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            });
            saveDonationsToStorage();
            notifyDonationChange();
          }
        }
      } catch (e) {
        console.warn('Background server save note:', e);
      }
    });

    return newItem;
  },

  async createDonation(donationData) {

    const newItem = this.addOptimisticDonation(donationData);
    try {
      const headers = await authHeaders();
      const payload = {
        food_name: donationData.food_name || donationData.food_title || donationData.title || 'Surplus Food',
        quantity: donationData.quantity || '5 kg',
        category: donationData.category || 'Vegetarian',
        expiry_time: donationData.expiry_time || 'Within 4 Hours',
        pickup_address: donationData.pickup_address || donationData.location || donationData.address || 'Local Community Center',
        description: donationData.description || '',
        food_image: donationData.image_url || donationData.food_image || null,
      };
      const res = await fetchWithFallback('/api/v1/donor/donations', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (res && res.ok) {
        const saved = await res.json();
        if (saved && saved.id) {
          newItem.id = saved.id;
          saveDonationsToStorage();
          notifyDonationChange();
        }
      }
    } catch (e) {
      console.warn('Sync createDonation error:', e);
    }
    return newItem;
  },



  getLocalDonationsSync(currentUser) {
    loadDonationsFromStorage();
    if (!currentUser) return localDonationsStore.filter(d => !deletedDonationIdsSet.has(String(d.id)));
    return localDonationsStore.filter(d => {
      if (!d || deletedDonationIdsSet.has(String(d.id))) return false;
      if (currentUser.role === 'donor') {
        return d.donor_id === currentUser.id || d.donor_name === currentUser.name || d.donor_email === currentUser.email;
      }
      return true;
    });
  },

  getAvailableDonationsSync() {
    loadDonationsFromStorage();
    return localDonationsStore.filter(d => d.status === 'available' && !deletedDonationIdsSet.has(String(d.id)));
  },

  async getMyDonations(currentUser) {
    loadDonationsFromStorage();
    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback('/api/v1/donor/donations', { headers });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const formattedRemote = data.map(d => ({
            id: d.id,
            donor_id: d.donor_id,
            created_at: d.created_at ? `🕒 Posted at ${new Date(d.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : '🕒 Posted Today',
            posted_at: d.created_at ? `🕒 Posted at ${new Date(d.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : '🕒 Posted Today',
            posted_timestamp: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
            food_name: d.food_name,
            quantity: d.quantity,
            category: d.category,
            expiry_time: d.expiry_time,
            pickup_address: d.pickup_address,
            description: d.description,
            image_url: d.food_image,
            food_image: d.food_image,
            donor_name: d.donor_name || currentUser?.name || 'Food Donor',
            donor_phone: d.donor_phone || currentUser?.phone || '',
            donor_email: d.donor_email || currentUser?.email || '',
            claimed_by_name: d.claimed_by_name || null,
            claimed_by_phone: d.claimed_by_phone || null,
            claimed_by_role: d.claimed_by_role || null,
            status: d.status || 'available',
          }));

          localDonationsStore = formattedRemote;
          saveDonationsToStorage();
          notifyDonationChange();
        }
      }
    } catch (e) {
      console.warn('getMyDonations remote fetch error:', e);
    }

    if (currentUser) {
      const uId = String(currentUser.id || '');
      const uName = (currentUser.name || '').trim().toLowerCase();
      const uEmail = (currentUser.email || '').trim().toLowerCase();
      const uPhone = (currentUser.phone || '').trim();

      return localDonationsStore.filter(d => {
        if (!d || deletedDonationIdsSet.has(String(d.id))) return false;
        const isIdMatch = uId && String(d.donor_id) === uId;
        const isNameMatch = uName && d.donor_name && d.donor_name.trim().toLowerCase() === uName;
        const isEmailMatch = uEmail && d.donor_email && d.donor_email.trim().toLowerCase() === uEmail;
        const isPhoneMatch = uPhone && d.donor_phone && d.donor_phone.trim() === uPhone;
        return isIdMatch || isNameMatch || isEmailMatch || isPhoneMatch;
      });
    }
    return localDonationsStore.filter(d => !deletedDonationIdsSet.has(String(d.id)));
  },


  async getDonorDonations(currentUser) {
    return this.getMyDonations(currentUser);
  },


  async deleteDonation(id) {
    const idStr = String(id);
    deletedDonationIdsSet.add(idStr);
    localDonationsStore = localDonationsStore.filter(d => String(d.id) !== idStr);
    saveDonationsToStorage();
    notifyDonationChange();

    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback(`/api/v1/donor/donations/${id}`, { method: 'DELETE', headers });
      if (res && res.ok) {
        this.getMyDonations().catch(() => {});
        return await res.json();
      }
    } catch (e) {
      console.warn('deleteDonation fallback notice:', e);
    }
    return { success: true };
  },

  // NGO & Needer Endpoints
  async getAvailableDonations() {
    loadDonationsFromStorage();
    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback('/api/v1/ngo/available-donations', { headers });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const pendingTempItems = localDonationsStore.filter(d => {
            const idStr = String(d.id);
            return (idStr.startsWith('temp_') || d.temp_id || d.is_optimistic) && (Date.now() - (d.posted_timestamp || 0) < 15000);
          });

          const formattedRemote = data.map(d => ({
            id: d.id,
            donor_id: d.donor_id,
            created_at: d.created_at ? `🕒 Posted at ${new Date(d.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : '🕒 Posted Today',
            posted_at: d.created_at ? `🕒 Posted at ${new Date(d.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : '🕒 Posted Today',
            posted_timestamp: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
            food_name: d.food_name,
            quantity: d.quantity,
            category: d.category,
            expiry_time: d.expiry_time,
            pickup_address: d.pickup_address,
            description: d.description,
            image_url: d.food_image,
            food_image: d.food_image,
            donor_name: d.donor_name || 'Food Donor',
            donor_phone: d.donor_phone || '',
            claimed_by_id: d.claimed_by_id || null,
            claimed_by_name: d.claimed_by_name || null,
            claimed_by_phone: d.claimed_by_phone || null,
            claimed_by_role: d.claimed_by_role || null,
            status: d.status || 'available',
          }));

          const combined = [...pendingTempItems, ...formattedRemote];
          const seen = new Set();
          localDonationsStore = combined.filter(d => {
            if (deletedDonationIdsSet.has(String(d.id))) return false;
            const k = String(d.id);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });

          saveDonationsToStorage();
          notifyDonationChange();
        }
      }
    } catch (e) {
      console.warn('getAvailableDonations remote fetch note:', e);
    }

    return localDonationsStore.filter(d => d.status === 'available' && !deletedDonationIdsSet.has(String(d.id)));
  },






  async acceptDonation(id, claimerUser) {
    const timeStr = formatCurrentTime();
    const todayStr = new Date().toISOString();
    const targetItem = localDonationsStore.find(item => String(item.id) === String(id));
    const foodName = targetItem ? targetItem.food_name : `Meal #${id}`;
    const donorId = targetItem ? targetItem.donor_id : null;
    const donorEmail = targetItem ? targetItem.donor_email : null;
    const donorName = targetItem ? targetItem.donor_name : null;

    const claimerName = claimerUser?.name || claimerUser?.username || 'Community Partner';
    const claimerPhone = claimerUser?.phone || '+91 9876543210';
    const claimerRole = claimerUser?.role ? claimerUser.role.toUpperCase() : 'RECEIVER';

    localDonationsStore = localDonationsStore.map(item => {
      if (String(item.id) === String(id)) {
        return {
          ...item,
          status: 'claimed',
          claimed_at: todayStr,
          claimed_time_str: timeStr,
          day_label: '📅 Today',
          claimed_by_id: claimerUser?.id,
          claimed_by_email: claimerUser?.email,
          claimed_by_name: claimerName,
          claimed_by_phone: claimerPhone,
          claimed_by_role: claimerRole,
        };
      }
      return item;
    });


    localNotificationsStore = [
      {
        id: Date.now(),
        target_user_id: donorId,
        target_user_email: donorEmail,
        target_user_role: 'donor',
        title: '🎉 Food Claimed Alert!',
        message: `${claimerName} (${claimerRole}) claimed your surplus meal '${foodName}'. Contact info: ${claimerPhone}`,
        created_at: `🕒 Posted Today at ${timeStr}`,
        posted_at: `🕒 Posted Today at ${timeStr}`,
      },
      {
        id: Date.now() + 1,
        target_user_id: claimerUser?.id,
        target_user_email: claimerUser?.email,
        target_user_role: claimerUser?.role,
        title: '✅ Food Claim Confirmed!',
        message: `You successfully claimed '${foodName}' from ${donorName || 'Donor'}.`,
        created_at: `🕒 Posted Today at ${timeStr}`,
        posted_at: `🕒 Posted Today at ${timeStr}`,
      },
      ...localNotificationsStore,
    ];
    saveDonationsToStorage();
    notifyDonationChange();

    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback(`/api/v1/ngo/accept/${id}`, { method: 'POST', headers });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('acceptDonation fallback notice:', e);
    }
    return { success: true, message: 'Donation accepted!' };
  },

  async reserveFood(id, claimerUser) {
    if (claimerUser?.role === 'needer') {
      try {
        const headers = await authHeaders();
        await fetchWithFallback(`/api/v1/needer/reserve/${id}`, { method: 'POST', headers });
      } catch (e) {
        console.warn('reserveFood remote note:', e);
      }
    }
    return this.acceptDonation(id, claimerUser);
  },

  getGroupedHistoryDonations(user) {
    loadDonationsFromStorage();
    if (!user) return {};

    const role = user?.role || 'donor';
    const userName = (user?.name || '').toLowerCase().trim();
    const userId = user?.id;
    const userEmail = (user?.email || '').toLowerCase().trim();

    const historyItems = localDonationsStore.filter(d => {
      if (!d || deletedDonationIdsSet.has(String(d.id))) return false;
      const isClaimed = d.status === 'claimed' || d.status === 'reserved' || d.status === 'rescued';
      if (!isClaimed) return false;

      if (role === 'donor') {
        const isMyDonation = (
          (d.donor_id && String(d.donor_id) === String(userId)) ||
          (d.donor_name && d.donor_name.toLowerCase().trim() === userName && userName.length > 0) ||
          (d.donor_email && d.donor_email.toLowerCase().trim() === userEmail && userEmail.length > 0)
        );
        return isMyDonation;
      }

      const isMyClaim = (
        (d.claimed_by_id && String(d.claimed_by_id) === String(userId)) ||
        (d.claimed_by_name && d.claimed_by_name.toLowerCase().trim() === userName && userName.length > 0 && d.claimed_by_name !== 'Food Claimer') ||
        (d.claimed_by_email && d.claimed_by_email.toLowerCase().trim() === userEmail && userEmail.length > 0)
      );

      return isMyClaim;
    });

    const grouped = {};
    historyItems.forEach(item => {
      const dateKey = item.day_label || (item.claimed_at ? `📅 ${new Date(item.claimed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '📅 Today');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });
    if (Object.keys(grouped).length === 0 && historyItems.length > 0) {
      grouped['📅 Rescued History'] = historyItems;
    }
    return grouped;
  },

  // Notifications
  async getNotifications(user) {
    loadNotificationsFromStorage();
    if (!user) return [];

    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback('/api/v1/notifications', { headers });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const remoteIds = new Set(data.map(d => String(d.id)));
          const extraLocal = localNotificationsStore.filter(d => !remoteIds.has(String(d.id)));
          localNotificationsStore = [...data, ...extraLocal].filter(n => !deletedNotificationIdsSet.has(String(n.id)));
          saveNotificationsToStorage();
        }
      }
    } catch (e) {}

    const nonDeleted = localNotificationsStore.filter(n => !deletedNotificationIdsSet.has(String(n.id)));
    const role = user.role;
    const userId = String(user.id);
    const userEmail = (user.email || '').toLowerCase().trim();

    return nonDeleted.filter(n => {
      if (role === 'donor') {
        const isTargetedToMe = (n.target_user_id && String(n.target_user_id) === userId) ||
                               (n.target_user_email && n.target_user_email.toLowerCase().trim() === userEmail && userEmail.length > 0);
        const isClaimedAlert = n.title && (n.title.includes('Food Claimed Alert') || n.title.includes('Food Claimed'));
        return Boolean(isTargetedToMe && isClaimedAlert);
      }

      const isTargetedToMe = (n.target_user_id && String(n.target_user_id) === userId) ||
                             (n.target_user_email && n.target_user_email.toLowerCase().trim() === userEmail && userEmail.length > 0);
      const isMyClaimConfirmed = Boolean(isTargetedToMe && n.title && (n.title.includes('Food Claim Confirmed') || n.title.includes('Meal Reservation Confirmed')));
      const isNewFoodPosted = Boolean(n.is_broadcast_to_receivers || (n.title && (n.title.includes('New Surplus Food') || n.title.includes('New Food Available') || n.title.includes('New Food'))));

      return Boolean(isMyClaimConfirmed || isNewFoodPosted);
    });
  },









  // Volunteer Pickups
  async getVolunteerPickups() {
    loadDonationsFromStorage();
    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback('/api/v1/volunteer/pickups', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {}
    return localDonationsStore.filter(d => !deletedDonationIdsSet.has(String(d.id)));
  },


  async updatePickupStatus(pickupId, statusStr) {
    localDonationsStore = localDonationsStore.map(item => {
      if (String(item.id) === String(pickupId)) {
        return { ...item, status: statusStr };
      }
      return item;
    });

    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback(`/api/v1/volunteer/pickups/${pickupId}/status?status_str=${statusStr}`, {
        method: 'PUT',
        headers,
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { success: true };
  },

  // Admin Metrics
  async getAdminStats() {
    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback('/api/v1/admin/stats', { headers });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { total_donations: localDonationsStore.length || 12, active_pickups: 3, rescued_meals: 450, total_users: 28 };
  },

  // Notifications
  async getNotifications() {
    loadNotificationsFromStorage();
    authHeaders().then(headers => {
      fetchWithFallback('/api/v1/notifications', { headers }).then(res => {
        if (res.ok) {
          res.json().then(data => {
            if (Array.isArray(data) && data.length > 0) {
              const remoteIds = new Set(data.map(d => String(d.id)));
              const extraLocal = localNotificationsStore.filter(d => !remoteIds.has(String(d.id)));
              localNotificationsStore = [...data, ...extraLocal].filter(n => !deletedNotificationIdsSet.has(String(n.id)));
              saveNotificationsToStorage();
            }
          }).catch(() => {});
        }
      }).catch(() => {});
    });
    return localNotificationsStore.filter(n => !deletedNotificationIdsSet.has(String(n.id)));
  },

  async deleteNotification(id) {
    deletedNotificationIdsSet.add(String(id));
    localNotificationsStore = localNotificationsStore.filter(n => String(n.id) !== String(id));
    saveNotificationsToStorage();
    try {
      const headers = await authHeaders();
      await fetchWithFallback(`/api/v1/notifications/${id}`, { method: 'DELETE', headers });
    } catch (e) {}
    return { success: true };
  },

  async clearAllNotifications() {
    localNotificationsStore.forEach(n => deletedNotificationIdsSet.add(String(n.id)));
    localNotificationsStore = [];
    saveNotificationsToStorage();
    try {
      const headers = await authHeaders();
      await fetchWithFallback('/api/v1/notifications/clear-all', { method: 'DELETE', headers });
    } catch (e) {}
    return { success: true };
  },


  async markAllNotificationsRead() {
    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback('/api/v1/notifications/read-all', { method: 'PUT', headers });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { success: true };
  },



  // Profile Update & Sync
  async getMe() {
    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback('/api/v1/auth/me', { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
    return null;
  },

  async updateProfile(profileData) {
    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback('/api/v1/auth/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileData),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('API updateProfile network fallback:', e);
    }
    return null;
  },
};

// 3-Second Live Real-Time Auto-Polling Loop (Syncs Web & Mobile App)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    try {
      if (apiService) {
        if (typeof apiService.getAvailableDonations === 'function') {
          apiService.getAvailableDonations().catch(() => {});
        }
        if (typeof apiService.getMyDonations === 'function') {
          const user = authService.getStoredUserSync();
          if (user) {
            apiService.getMyDonations(user).catch(() => {});
          }
        }
        if (typeof apiService.getNotifications === 'function') {
          apiService.getNotifications().catch(() => {});
        }
      }
    } catch (e) {}
  }, 3000);
}


export function getFoodItemImage(item) {

  if (!item) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80';
  
  const customImg = item.food_image || item.image_url || item.donation?.food_image || item.donation?.image_url;
  if (customImg && typeof customImg === 'string' && customImg.trim().length > 10) {
    return customImg.trim();
  }

  const name = ((item.food_name || item.title || item.donation?.food_name || '') + ' ' + (item.category || item.donation?.category || '')).toLowerCase();

  if (name.includes('biryani') || name.includes('dum')) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('rice') || name.includes('pulao') || name.includes('fried rice')) {
    return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('roti') || name.includes('naan') || name.includes('chapati') || name.includes('curry') || name.includes('thali') || name.includes('meal')) {
    return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('bakery') || name.includes('bread') || name.includes('cake') || name.includes('bun')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('veg') || name.includes('vegetable') || name.includes('salad')) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('fruit') || name.includes('apple') || name.includes('banana')) {
    return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('drink') || name.includes('juice') || name.includes('beverage') || name.includes('water')) {
    return 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('sweet') || name.includes('dessert') || name.includes('laddu') || name.includes('gulab')) {
    return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('package') || name.includes('snack') || name.includes('biscuit')) {
    return 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800&auto=format&fit=crop&q=80';
  }

  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80';
}



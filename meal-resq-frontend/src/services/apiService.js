import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConstants } from '../utils/constants';
import { authService, fetchWithFallback } from './authService';


async function authHeaders(overrideEmail = null) {
  const token = await authService.getToken();
  const currentUser = await authService.getCurrentUser();
  let email = currentUser?.email || overrideEmail || '';
  if (!email && authService && typeof authService.getStoredUserSync === 'function') {
    const syncUser = authService.getStoredUserSync();
    if (syncUser?.email) email = syncUser.email;
  }
  const cleanEmail = (email || '').trim().toLowerCase();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(cleanEmail ? { 'X-User-Email': cleanEmail } : {}),
  };
}


export function parseBackendDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'number') return new Date(dateStr);

  let s = String(dateStr).trim();
  s = s.replace(/^🕒\s*/, '').replace(/^Posted at\s*/i, '').replace(/^Posted Today at\s*/i, '').replace(/^Posted Yesterday at\s*/i, '').trim();

  if (s.toLowerCase() === 'today' || s.toLowerCase().startsWith('today')) return new Date();
  if (s.toLowerCase() === 'yesterday' || s.toLowerCase().startsWith('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  let isoFormat = s;
  if (s.includes(' ') && !s.includes('T')) {
    isoFormat = s.replace(' ', 'T');
  }

  let d = new Date(isoFormat);
  if (!isNaN(d.getTime())) return d;

  d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  const cleanS = s.replace(/\bat\b/gi, '').trim();
  d = new Date(cleanS);
  if (!isNaN(d.getTime())) return d;

  return new Date();
}


export function formatExactDateAndTime(dateObj) {
  const d = parseBackendDate(dateObj);
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dStr = d.toDateString();

  if (dStr === todayStr) {
    return `🕒 Today at ${timeStr}`;
  } else if (dStr === yesterdayStr) {
    return `🕒 Yesterday at ${timeStr}`;
  } else {
    const dateFormatted = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return `🕒 ${dateFormatted} at ${timeStr}`;
  }
}

export function isDonationOlderThan24Hours(item) {
  if (!item) return false;
  let postedTime = item.posted_timestamp;
  if (!postedTime && item.created_at_raw) {
    postedTime = parseBackendDate(item.created_at_raw).getTime();
  }
  if (!postedTime && item.created_at) {
    postedTime = parseBackendDate(item.created_at).getTime();
  }
  if (!postedTime || isNaN(postedTime)) return false;
  const ageInMs = Date.now() - postedTime;
  return ageInMs >= 24 * 60 * 60 * 1000;
}

const formatCurrentTime = () => {
  try {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
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


export function isExpiredDonation(item) {
  if (!item) return true;
  try {
    const dateObj = parseBackendDate(item.created_at_raw || item.created_at || item.posted_timestamp);
    const timeMs = dateObj.getTime();
    if (isNaN(timeMs) || timeMs <= 0) return false;
    const ageMs = Date.now() - timeMs;
    return ageMs > 24 * 60 * 60 * 1000; // 24 Hours cutoff
  } catch (e) {
    return false;
  }
}

export function deduplicateDonationsStore(list) {
  if (!Array.isArray(list)) return [];

  const seenIds = new Set();
  const seenContentKeys = new Set();

  return list.filter(item => {
    if (!item) return false;
    if (isExpiredDonation(item)) return false;
    const idStr = String(item.id || '');
    if (deletedDonationIdsSet.has(idStr)) return false;

    if (seenIds.has(idStr)) return false;

    const fName = (item.food_name || '').trim().toLowerCase();
    const fQty = (item.quantity || '').trim().toLowerCase();
    const fAddr = (item.pickup_address || '').trim().toLowerCase();
    const contentKey = `${fName}_${fQty}_${fAddr}`;

    if (contentKey.length > 3) {
      if (seenContentKeys.has(contentKey)) return false;
      seenContentKeys.add(contentKey);
    }

    seenIds.add(idStr);
    return true;
  });
}

function saveDonationsToStorage() {
  try {
    localDonationsStore = deduplicateDonationsStore(localDonationsStore);
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
        const now = Date.now();
        localDonationsStore = parsed.filter(d => {
          if (!d || deletedDonationIdsSet.has(String(d.id))) return false;
          const idStr = String(d.id);
          if (idStr.startsWith('temp_') && (now - (d.posted_timestamp || 0) > 15000)) {
            return false;
          }
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
          if (Array.isArray(arr)) {
            if (arr.length === 0) {
              localDonationsStore = [];
            } else {
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
        } else {
          localDonationsStore = [];
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
          if (Array.isArray(arr)) {
            if (arr.length === 0) {
              localNotificationsStore = [];
            } else {
              localNotificationsStore = arr.filter(n => !deletedNotificationIdsSet.has(String(n.id)));
            }
          }
        } else {
          localNotificationsStore = [];
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


    const grouped = {};

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    historyList.forEach(item => {
      let itemDate = null;
      if (item.posted_timestamp && typeof item.posted_timestamp === 'number') {
        itemDate = new Date(item.posted_timestamp);
      } else if (item.created_at_raw) {
        itemDate = parseBackendDate(item.created_at_raw);
      } else if (item.claimed_at_raw) {
        itemDate = parseBackendDate(item.claimed_at_raw);
      } else {
        const candidate = item.created_at || item.claimed_at || item.timestamp;
        itemDate = parseBackendDate(candidate);
      }

      const itemDateStr = itemDate.toDateString();

      let groupKey = itemDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      if (itemDateStr === todayStr) {
        groupKey = 'Today';
      } else if (itemDateStr === yesterdayStr) {
        groupKey = 'Yesterday';
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(item);
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

  async createDonation(donationData) {
    const timeStr = formatCurrentTime();
    const foodTitle = donationData.food_name || donationData.food_title || donationData.title || 'Surplus Food';
    const foodQty = donationData.quantity || '5 kg';
    const foodCat = donationData.category || 'Vegetarian';
    const foodLoc = donationData.pickup_address || donationData.location || donationData.address || 'Local Community Center';
    const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    let imgStr = donationData.image_url || donationData.food_image || null;
    if (imgStr && typeof imgStr === 'string' && imgStr.length > 250000 && imgStr.startsWith('data:image')) {
      imgStr = null;
    }

    const newItem = {
      id: donationData.id || tempId,
      temp_id: tempId,
      is_optimistic: true,
      is_syncing: true,
      posted_timestamp: Date.now(),
      created_at: `🕒 Posted Today at ${timeStr}`,
      posted_at: `🕒 Posted at ${timeStr}`,
      time_ago: `🕒 Posted ${timeStr}`,
      food_name: foodTitle,
      quantity: foodQty,
      category: foodCat,
      expiry_time: donationData.expiry_time || 'Within 4 Hours',
      pickup_address: foodLoc,
      description: donationData.description || '',
      image_url: imgStr || donationData.image_url || donationData.food_image,
      food_image: imgStr || donationData.image_url || donationData.food_image,
      donor_id: donationData.donor_id || '',
      donor_name: donationData.donor_name || 'Food Donor',
      donor_phone: donationData.donor_phone || '+91 9876543210',
      donor_email: donationData.donor_email || '',
      status: 'available',
    };

    localDonationsStore = [newItem, ...localDonationsStore.filter(d => String(d.id) !== String(newItem.id))];

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

    try {
      const headers = await authHeaders(donationData.donor_email);
      const payload = {
        food_name: foodTitle,
        quantity: foodQty,
        category: foodCat,
        expiry_time: donationData.expiry_time || 'Within 4 Hours',
        pickup_address: foodLoc,
        description: donationData.description || '',
        food_image: imgStr,
        donor_email: donationData.donor_email || newItem.donor_email || '',
      };

      const res = await fetchWithFallback('/api/v1/donor/donations', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res && res.ok) {
        const saved = await res.json();
        if (saved && saved.id) {
          const dateObj = parseBackendDate(saved.created_at);
          const exactFormattedStr = formatExactDateAndTime(dateObj);

          localDonationsStore = localDonationsStore.map(d => {
            if (String(d.id) === String(tempId) || String(d.id) === String(newItem.id)) {
              return {
                ...d,
                id: saved.id,
                donor_id: saved.donor_id || d.donor_id,
                donor_name: saved.donor_name || d.donor_name,
                donor_phone: saved.donor_phone || d.donor_phone,
                donor_email: saved.donor_email || d.donor_email,
                is_optimistic: false,
                is_syncing: false,
                created_at: exactFormattedStr,
                posted_at: exactFormattedStr,
                created_at_raw: saved.created_at,
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
          return saved;
        }
      }
    } catch (e) {
      console.warn('Create donation remote POST error:', e);
    } finally {
      newItem.is_syncing = false;
    }

    return newItem;
  },

  addOptimisticDonation(donationData) {
    return this.createDonation(donationData);
  },

  async updateDonation(id, donationData) {
    const idStr = String(id);
    const timeStr = formatCurrentTime();
    
    localDonationsStore = localDonationsStore.map(item => {
      if (String(item.id) === idStr) {
        return {
          ...item,
          food_name: donationData.food_name || item.food_name,
          quantity: donationData.quantity || item.quantity,
          category: donationData.category || item.category,
          expiry_time: donationData.expiry_time || item.expiry_time,
          pickup_address: donationData.pickup_address || item.pickup_address,
          description: donationData.description !== undefined ? donationData.description : item.description,
          image_url: donationData.image_url || donationData.food_image || item.image_url,
          food_image: donationData.image_url || donationData.food_image || item.food_image,
          updated_at: `🕒 Updated at ${timeStr}`,
        };
      }
      return item;
    });

    saveDonationsToStorage();
    notifyDonationChange();

    try {
      const headers = await authHeaders();
      const payload = {
        food_name: donationData.food_name,
        quantity: donationData.quantity,
        category: donationData.category,
        expiry_time: donationData.expiry_time,
        pickup_address: donationData.pickup_address,
        description: donationData.description,
        food_image: donationData.image_url || donationData.food_image || null,
      };
      const res = await fetchWithFallback(`/api/v1/donor/donations/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      if (res && res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('updateDonation remote note:', e);
    }
    return { success: true };
  },

  getLocalDonationsSync(currentUser) {
    loadDonationsFromStorage();
    if (!currentUser) return localDonationsStore.filter(d => !deletedDonationIdsSet.has(String(d.id)));
    return localDonationsStore.filter(d => {
      if (!d || deletedDonationIdsSet.has(String(d.id))) return false;
      if (currentUser.role === 'donor') {
        const uId = String(currentUser.id || '');
        const uName = (currentUser.name || '').trim().toLowerCase();
        const uEmail = (currentUser.email || '').trim().toLowerCase();
        const uPhone = (currentUser.phone || '').trim();

        const isIdMatch = uId && String(d.donor_id) === uId;
        const isNameMatch = uName && d.donor_name && (d.donor_name.trim().toLowerCase().includes(uName) || uName.includes(d.donor_name.trim().toLowerCase()));
        const isEmailMatch = uEmail && d.donor_email && d.donor_email.trim().toLowerCase() === uEmail;
        const isPhoneMatch = uPhone && d.donor_phone && d.donor_phone.trim() === uPhone;
        return isIdMatch || isNameMatch || isEmailMatch || isPhoneMatch || d.is_optimistic || !uId;
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
    await this.syncAllDonationsFromBackend();
    try {

      const headers = await authHeaders();
      const res = await fetchWithFallback('/api/v1/donor/donations', { headers });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const formattedRemote = data.map(d => {
            const dateObj = parseBackendDate(d.created_at);
            const exactFormattedStr = formatExactDateAndTime(dateObj);
            return {
              id: d.id,
              donor_id: d.donor_id,
              created_at: exactFormattedStr,
              posted_at: exactFormattedStr,
              created_at_raw: d.created_at,
              posted_timestamp: dateObj.getTime(),
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
            };
          });


          const remoteMap = new Map(formattedRemote.map(item => [String(item.id), item]));
          const otherItems = localDonationsStore.filter(localItem => !remoteMap.has(String(localItem.id)));
          localDonationsStore = deduplicateDonationsStore([...formattedRemote, ...otherItems]);
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

      const filtered = localDonationsStore.filter(d => {
        if (!d || deletedDonationIdsSet.has(String(d.id))) return false;
        const isIdMatch = uId && String(d.donor_id) === uId;
        const isNameMatch = uName && d.donor_name && (d.donor_name.trim().toLowerCase().includes(uName) || uName.includes(d.donor_name.trim().toLowerCase()));
        const isEmailMatch = uEmail && d.donor_email && d.donor_email.trim().toLowerCase() === uEmail;
        const isPhoneMatch = uPhone && d.donor_phone && d.donor_phone.trim() === uPhone;
        return isIdMatch || isNameMatch || isEmailMatch || isPhoneMatch || d.is_optimistic || !uId;
      });
      return deduplicateDonationsStore(filtered);
    }
    return deduplicateDonationsStore(localDonationsStore.filter(d => !deletedDonationIdsSet.has(String(d.id))));
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

  async syncAllDonationsFromBackend() {
    try {
      const headers = await authHeaders();
      const res = await fetchWithFallback('/api/v1/ngo/all-donations', { headers });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          if (data.length === 0) {
            localDonationsStore = [];
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
              localStorage.removeItem('meal_resq_donations_db');
            }
            if (AsyncStorage) {
              AsyncStorage.removeItem('meal_resq_donations_db').catch(() => {});
            }
          } else {
            const formattedRemote = data.map(d => {
              const dateObj = parseBackendDate(d.created_at);
              const exactFormattedStr = formatExactDateAndTime(dateObj);
              return {
                id: d.id,
                donor_id: d.donor_id,
                created_at: exactFormattedStr,
                posted_at: exactFormattedStr,
                created_at_raw: d.created_at,
                posted_timestamp: dateObj.getTime(),
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
                donor_email: d.donor_email || '',
                claimed_by_id: d.claimed_by_id || null,
                claimed_by_name: d.claimed_by_name || null,
                claimed_by_phone: d.claimed_by_phone || null,
                claimed_by_role: d.claimed_by_role || null,
                status: d.status || 'available',
              };
            });

            const pendingTemp = localDonationsStore.filter(d => String(d.id).startsWith('temp_'));
            localDonationsStore = deduplicateDonationsStore([...pendingTemp, ...formattedRemote]).filter(d => !isDonationOlderThan24Hours(d));

          }
          saveDonationsToStorage();
          notifyDonationChange();
        }
      }
    } catch (e) {
      console.warn('syncAllDonationsFromBackend error:', e);
    }
  },

  // NGO & Needer Endpoints
  async getAvailableDonations() {
    loadDonationsFromStorage();
    await this.syncAllDonationsFromBackend();

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

          const formattedRemote = data.map(d => {
            const dateObj = parseBackendDate(d.created_at);
            const exactFormattedStr = formatExactDateAndTime(dateObj);
            return {
              id: d.id,
              donor_id: d.donor_id,
              created_at: exactFormattedStr,
              posted_at: exactFormattedStr,
              created_at_raw: d.created_at,
              posted_timestamp: dateObj.getTime(),
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
              donor_email: d.donor_email || '',
              claimed_by_id: d.claimed_by_id || null,
              claimed_by_name: d.claimed_by_name || null,
              claimed_by_phone: d.claimed_by_phone || null,
              claimed_by_role: d.claimed_by_role || null,
              status: d.status || 'available',
            };
          });

          const combined = [...pendingTempItems, ...formattedRemote];
          localDonationsStore = deduplicateDonationsStore(combined);

          saveDonationsToStorage();
          notifyDonationChange();
        }
      }
    } catch (e) {
      console.warn('getAvailableDonations remote fetch note:', e);
    }

    return deduplicateDonationsStore(localDonationsStore.filter(d => d.status === 'available' && !deletedDonationIdsSet.has(String(d.id))));
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
      if (res.ok) {
        await this.syncAllDonationsFromBackend();
        return await res.json();
      }
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
      const headers = await authHeaders(user.email);
      const res = await fetchWithFallback('/api/v1/notifications', { headers });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          if (data.length === 0) {
            localNotificationsStore = [];
          } else {
            const remoteFormatted = data.map(n => ({
              ...n,
              created_at: formatExactDateAndTime(parseBackendDate(n.created_at)),
              posted_at: formatExactDateAndTime(parseBackendDate(n.created_at)),
              user_id: n.user_id,
              target_user_id: n.user_id,
            }));

            const remoteIds = new Set(remoteFormatted.map(d => String(d.id)));
            const extraLocal = localNotificationsStore.filter(d => !remoteIds.has(String(d.id)));
            localNotificationsStore = [...remoteFormatted, ...extraLocal].filter(n => !deletedNotificationIdsSet.has(String(n.id)));
          }
          saveNotificationsToStorage();
        }
      }
    } catch (e) {}

    const nonDeleted = localNotificationsStore.filter(n => !deletedNotificationIdsSet.has(String(n.id)));
    const role = (user.role || '').toLowerCase();
    const userId = String(user.id || '');
    const userEmail = (user.email || '').toLowerCase().trim();

    return nonDeleted.filter(n => {
      const nUserId = String(n.user_id || n.target_user_id || '');
      const nEmail = (n.target_user_email || '').toLowerCase().trim();
      const isMyNotification = (nUserId && nUserId === userId) || (nEmail && nEmail === userEmail);

      if (role === 'donor') {
        return Boolean(isMyNotification || (n.title && (n.title.includes('Food Claimed') || n.title.includes('Claim Alert'))));
      }

      // NGO, Volunteer, Needer
      const isBroadcast = Boolean(n.is_broadcast_to_receivers || (n.title && (n.title.includes('New Surplus Food') || n.title.includes('New Food') || n.title.includes('Food Available'))));
      return Boolean(isMyNotification || isBroadcast);
    });
  },

  async deleteNotification(id, user = null) {
    deletedNotificationIdsSet.add(String(id));
    localNotificationsStore = localNotificationsStore.filter(n => String(n.id) !== String(id));
    saveNotificationsToStorage();
    try {
      const headers = await authHeaders(user?.email);
      await fetchWithFallback(`/api/v1/notifications/${id}`, { method: 'DELETE', headers });
    } catch (e) {}
    return { success: true };
  },

  async clearAllNotifications(user = null) {
    localNotificationsStore.forEach(n => deletedNotificationIdsSet.add(String(n.id)));
    localNotificationsStore = [];
    saveNotificationsToStorage();
    try {
      const headers = await authHeaders(user?.email);
      await fetchWithFallback('/api/v1/notifications/clear-all', { method: 'DELETE', headers });
    } catch (e) {}
    return { success: true };
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

  async syncPendingOptimisticDonations() {
    const pending = localDonationsStore.filter(d => d && (String(d.id).startsWith('temp_') || d.is_optimistic));
    for (const item of pending) {
      try {
        const headers = await authHeaders(item.donor_email);
        let imgStr = item.food_image && typeof item.food_image === 'string' && item.food_image.length < 250000 ? item.food_image : null;
        const payload = {
          food_name: item.food_name,
          quantity: item.quantity,
          category: item.category || 'Vegetarian',
          expiry_time: item.expiry_time || 'Within 4 Hours',
          pickup_address: item.pickup_address,
          description: item.description || '',
          food_image: imgStr,
        };
        const res = await fetchWithFallback('/api/v1/donor/donations', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (res && res.ok) {
          const saved = await res.json();
          if (saved && saved.id) {
            item.id = saved.id;
            item.is_optimistic = false;
            saveDonationsToStorage();
            notifyDonationChange();
          }
        }
      } catch (e) {}
    }
  },
};

// 1.5-Second Live Real-Time Auto-Polling Loop (Syncs Web & Mobile App Instantly)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    try {
      if (authService && typeof authService.getAllRegisteredUsers === 'function') {
        authService.getAllRegisteredUsers().catch(() => {});
      }
      if (apiService) {
        if (typeof apiService.syncPendingOptimisticDonations === 'function') {
          apiService.syncPendingOptimisticDonations().catch(() => {});
        }
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
  }, 1500);
}



export function getFoodItemImage(item) {

  if (!item) return 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800&auto=format&fit=crop&q=80';
  
  const customImg = item.food_image || item.image_url || item.donation?.food_image || item.donation?.image_url;
  if (customImg && typeof customImg === 'string' && customImg.trim().length > 10) {
    if (customImg.includes('photo-1563379091339')) {
      return 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800&auto=format&fit=crop&q=80';
    }
    return customImg.trim();
  }

  const name = ((item.food_name || item.title || item.donation?.food_name || '') + ' ' + (item.category || item.donation?.category || '')).toLowerCase();

  if (name.includes('biryani') || name.includes('dum')) {
    return 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800&auto=format&fit=crop&q=80';
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



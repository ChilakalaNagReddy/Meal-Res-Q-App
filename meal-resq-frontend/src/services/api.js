import { AppConstants } from '../utils/constants';

const getApiBase = () => `${AppConstants.baseUrl}/api/v1`;
const API_BASE = AppConstants.baseUrl;

export const api = {
  // Fetch surplus meals
  async getMeals(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'All') params.append('category', filters.category);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.search) params.append('search', filters.search);
      if (filters.isFree) params.append('isFree', 'true');
      
      const res = await fetch(`${API_BASE}/meals?${params.toString()}`);
      if (!res.ok) throw new Error('API Error fetching meals');
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('Backend server offline or unreachable. Using dynamic local fallback state:', err.message);
      return null;
    }
  },

  // Post a new surplus meal listing (Vendor)
  async createMeal(mealData) {
    try {
      const res = await fetch(`${API_BASE}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mealData)
      });
      if (!res.ok) throw new Error('API Error creating meal listing');
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('Error creating meal:', err);
      throw err;
    }
  },

  // Reserve a surplus meal (Consumer)
  async createOrder(orderPayload) {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to place reservation');
      }
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('Error placing order:', err);
      throw err;
    }
  },

  // Get orders list
  async getOrders() {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      if (!res.ok) throw new Error('API Error fetching orders');
      const data = await res.json();
      return data.data;
    } catch (err) {
      return null;
    }
  },

  // Verify PIN Code at pickup (Vendor)
  async verifyPickupPin(pin) {
    try {
      const res = await fetch(`${API_BASE}/orders/verify-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid PIN');
      return data.data;
    } catch (err) {
      throw err;
    }
  },

  // Get NGO Bulk Donations
  async getDonations() {
    try {
      const res = await fetch(`${API_BASE}/donations`);
      if (!res.ok) throw new Error('API Error fetching donations');
      const data = await res.json();
      return data.data;
    } catch (err) {
      return null;
    }
  },

  // Claim NGO Bulk Donation
  async claimDonation(donationId, ngoName) {
    try {
      const res = await fetch(`${API_BASE}/donations/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationId, ngoName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not claim donation');
      return data.data;
    } catch (err) {
      throw err;
    }
  },

  // Vendor Post Bulk Donation
  async createDonation(donationData) {
    try {
      const res = await fetch(`${API_BASE}/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donationData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not create donation');
      return data.data;
    } catch (err) {
      throw err;
    }
  },

  // Get Impact Metrics
  async getImpact() {
    try {
      const res = await fetch(`${API_BASE}/impact`);
      if (!res.ok) throw new Error('API Error fetching impact');
      const data = await res.json();
      return data.data;
    } catch (err) {
      return null;
    }
  }
};

import { MinerStats, PoolInfo, DeviceInfo, CGMinerSummary } from '../types/miner';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export class CGMinerAPI {
  private baseUrl: string;

  constructor(backendUrl: string = BACKEND_URL) {
    this.baseUrl = backendUrl;
  }

  private async request(endpoint: string, method: string = 'GET'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Backend API error:', error);
      throw error;
    }
  }

  async getSummary(): Promise<CGMinerSummary | null> {
    try {
      return await this.request('/api/stats');
    } catch (error) {
      console.error('Error fetching summary:', error);
      return null;
    }
  }

  async getDevices(): Promise<DeviceInfo[]> {
    try {
      return await this.request('/api/devices');
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  }

  async getPools(): Promise<PoolInfo[]> {
    try {
      return await this.request('/api/pools');
    } catch (error) {
      console.error('Error fetching pools:', error);
      return [];
    }
  }

  async restart(): Promise<boolean> {
    try {
      await this.request('/api/control/restart', 'POST');
      return true;
    } catch (error) {
      console.error('Error restarting miner:', error);
      return false;
    }
  }

  async quit(): Promise<boolean> {
    try {
      await this.request('/api/control/stop', 'POST');
      return true;
    } catch (error) {
      console.error('Error stopping miner:', error);
      return false;
    }
  }
}

export const cgminerAPI = new CGMinerAPI();

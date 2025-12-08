import {
  MinerStats,
  PoolInfo,
  DeviceInfo,
  SummaryInfo,
  VersionInfo,
  NotifyInfo,
  LCDInfo,
  CoinInfo,
  RawStatsInfo
} from '../types/miner';

// Use current hostname dynamically
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;

export class CGMinerAPI {
  private baseUrl: string;

  constructor(backendUrl: string = BACKEND_URL) {
    this.baseUrl = backendUrl;
  }

  private async request(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Backend API Error:', err);
      throw err;
    }
  }

  /* ------------------------------ BASIC STATS ------------------------------ */

  async getSummary(): Promise<SummaryInfo | null> {
    try {
      return await this.request('/api/stats');
    } catch {
      return null;
    }
  }

  async getDevices(): Promise<DeviceInfo[]> {
    try {
      return await this.request('/api/devices');
    } catch {
      return [];
    }
  }

  async getPools(): Promise<PoolInfo[]> {
    try {
      return await this.request('/api/pools');
    } catch {
      return [];
    }
  }

  async getVersion(): Promise<VersionInfo | null> {
    try {
      const data = await this.request('/api/version');
      return data?.version?.[0] || null;
    } catch {
      return null;
    }
  }

  async getNotify(): Promise<NotifyInfo[]> {
    try {
      const data = await this.request('/api/notify');
      return data?.notify || [];
    } catch {
      return [];
    }
  }

  async getLcd(): Promise<LCDInfo | null> {
    try {
      const data = await this.request('/api/lcd');
      return data?.lcd?.[0] || null;
    } catch {
      return null;
    }
  }
  
  async getStatsRaw(): Promise<RawStatsInfo[]> {
    try {
      return await this.request('/api/stats/raw');
    } catch {
      return [];
    }
  }
  
  async getCoin(): Promise<CoinInfo | null> {
    try {
      return await this.request('/api/coin');
    } catch {
      return null;
    }
  }

  /* ------------------------------ CONTROL COMMANDS ------------------------------ */

  async restart(): Promise<boolean> {
    try {
      await this.request('/api/control/restart', 'POST');
      return true;
    } catch {
      return false;
    }
  }

  async quit(): Promise<boolean> {
    try {
      await this.request('/api/control/quit', 'POST');
      return true;
    } catch {
      return false;
    }
  }

  async saveConfig(filename?: string): Promise<boolean> {
    try {
      await this.request('/api/control/save', 'POST', filename ? { filename } : {});
      return true;
    } catch {
      return false;
    }
  }

  /* ------------------------------ POOL CONTROL ------------------------------ */

  async addPool(url: string, user: string, pass: string): Promise<boolean> {
    try {
      await this.request('/api/pools/add', 'POST', { url, user, pass });
      return true;
    } catch {
      return false;
    }
  }

  async removePool(poolId: number): Promise<boolean> {
    try {
      await this.request('/api/pools/remove', 'POST', { poolId });
      return true;
    } catch {
      return false;
    }
  }

  async enablePool(poolId: number): Promise<boolean> {
    try {
      await this.request('/api/pools/enable', 'POST', { poolId });
      return true;
    } catch {
      return false;
    }
  }

  async disablePool(poolId: number): Promise<boolean> {
    try {
      await this.request('/api/pools/disable', 'POST', { poolId });
      return true;
    } catch {
      return false;
    }
  }

  async switchPool(poolId: number): Promise<boolean> {
    try {
      await this.request('/api/pools/switch', 'POST', { poolId });
      return true;
    } catch {
      return false;
    }
  }

  async setPoolPriority(priorities: number[]): Promise<boolean> {
    try {
      await this.request('/api/pools/priority', 'POST', { priorities });
      return true;
    } catch {
      return false;
    }
  }

  /* ------------------------------ DEVICE CONTROL ------------------------------ */

  async enableDevice(deviceId: number): Promise<boolean> {
    try {
      await this.request('/api/devices/enable', 'POST', { deviceId });
      return true;
    } catch {
      return false;
    }
  }

  async disableDevice(deviceId: number): Promise<boolean> {
    try {
      await this.request('/api/devices/disable', 'POST', { deviceId });
      return true;
    } catch {
      return false;
    }
  }

  async setDeviceFrequency(deviceId: number, frequency: number): Promise<boolean> {
    try {
      await this.request('/api/devices/frequency', 'POST', { deviceId, frequency });
      return true;
    } catch {
      return false;
    }
  }

  async setDeviceOption(deviceId: number, option: string, value?: string): Promise<boolean> {
    try {
      await this.request('/api/devices/set', 'POST', { deviceId, option, value });
      return true;
    } catch {
      return false;
    }
  }

  /* ------------------------------ CONFIG API ------------------------------ */

  async getConfig(): Promise<any> {
    try {
      return await this.request('/api/config');
    } catch {
      return {};
    }
  }

  async setConfig(name: string, value: number): Promise<boolean> {
    try {
      await this.request('/api/config/set', 'POST', { name, value });
      return true;
    } catch {
      return false;
    }
  }
}

export const cgminerAPI = new CGMinerAPI();
export interface MinerConfig {
  ascCount: number;
  pgaCount: number;
  poolCount: number;
  strategy: string;
  logInterval: number;
  deviceCode: string;
  os: string;
  hotplug: number;
}

export interface CoinInfo {
  hashMethod: string;
  currentBlockTime: number;
  currentBlockHash: string;
  lp: boolean;
  networkDifficulty: number;
}

export interface DeviceDetails {
  devdetails: number;
  name: string;
  id: number;
  driver: string;
  kernel: string;
  model: string;
  devicePath: string;
}

export interface VersionInfo {
  cgminer: string;
  api: string;
}

export interface NotifyInfo {
  notify: number;
  name: string;
  id: number;
  lastWell: number;
  lastNotWell: number;
  reasonNotWell: string;
  threadFailInit: number;
  threadZeroHash: number;
  threadFailQueue: number;
  devSickIdle60s: number;
  devDeadIdle600s: number;
  devNostart: number;
  devOverHeat: number;
  devThermalCutoff: number;
  devCommsError: number;
  devThrottle: number;
}

export interface LCDInfo {
  elapsed: number;
  ghsAv: number;
  ghs5m: number;
  ghs5s: number;
  temperature: number;
  lastShareDifficulty: number;
  lastShareTime: number;
  bestShare: number;
  lastValidWork: number;
  foundBlocks: number;
  currentPool: string;
  user: string;
}

export interface SummaryInfo {
  elapsed: number;
  mhsAv: number;
  mhs5s: number;
  mhs1m: number;
  mhs5m: number;
  mhs15m: number;
  foundBlocks: number;
  getworks: number;
  accepted: number;
  rejected: number;
  hardwareErrors: number;
  utility: number;
  discarded: number;
  stale: number;
  getFailures: number;
  localWork: number;
  remoteFailures: number;
  networkBlocks: number;
  totalMh: number;
  workUtility: number;
  difficultyAccepted: number;
  difficultyRejected: number;
  difficultyStale: number;
  bestShare: number;
}

export interface StatsInfo {
  id: number;
  enabled: string;
  status: string;
  temperature: number;
  frequency: number;
  mhs5s: number;
  mhsAv: number;
  accepted: number;
  rejected: number;
  hardwareErrors: number;
}

// Raw stats from cgminer stats command - contains ALL fields
export interface RawStatsInfo {
  STATS?: number;
  ID?: string;
  Elapsed?: number;
  Serial?: string;
  Frequency?: number;
  FreqSel?: number;
  FreqComp?: number;
  Chips?: number;
  Rolling?: number;
  GHGHs?: number;
  Voltage?: number;
  FanSpeed?: number;
  Temperature?: number;
  Accepted?: number;
  Rejected?: number;
  Nonces?: number;
  [key: string]: any; // Allow any additional fields from cgminer
}

export interface PoolInfo {
  url: string;
  status: string;
  priority: number;
  user: string;
  accepted: number;
  rejected: number;
  stale: number;
  lastShareTime: number;
}

export interface DeviceInfo {
  id: number;
  name: string;
  status: string;
  temperature: number;
  hashrate: number;
  accepted: number;
  rejected: number;
  hardwareErrors: number;
  frequency?: number;
  chips?: number;
  chipType?: string;
  fanSpeed?: number;
  mhs5s?: number;
  mhsAv?: number;
  serial?: string;
  voltage?: number;
  rolling?: number;
  ghghs?: number;
}

// Legacy type aliases for compatibility
export type MinerStats = SummaryInfo;
export type CGMinerSummary = SummaryInfo;
export type CGMinerVersion = VersionInfo;
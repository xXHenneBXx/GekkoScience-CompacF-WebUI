import express, { Request, Response } from 'express';
import cors from 'cors';
import { createCGMinerConnection, sendCGMinerCommand } from './cgminer.ts';

const app = express();
const PORT = process.env.PORT || 3001;
const CGMINER_HOST = process.env.CGMINER_HOST || '192.168.0.200';
const CGMINER_PORT = parseInt(process.env.CGMINER_PORT || '4028');

app.use(cors());
app.use(express.json());

// ---------------------- GENERIC COMMAND ----------------------
app.post('/api/command', async (req: Request, res: Response) => {
  try {
    const { command, parameter } = req.body;
    if (!command) return res.status(400).json({ error: 'command required' });

    const commandStr = parameter ? `${command}|${parameter}` : command;
    const resp = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, commandStr);
    res.json({ success: true, response: resp ?? null });
  } catch (err: any) {
    console.error(`Error sending command:`, err);
    res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => res.json({ status: 'ok' }));

// Stats summary
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'summary');
    if (data?.SUMMARY?.[0]) {
      const s = data.SUMMARY[0];
      res.json({
        elapsed: s['Elapsed'] || 0,
        mhsAv: s['MHS av'] || 0,
        mhs5s: s['MHS 5s'] || 0,
        mhs1m: s['MHS 1m'] || 0,
        mhs5m: s['MHS 5m'] || 0,
        mhs15m: s['MHS 15m'] || 0,
        foundBlocks: s['Found Blocks'] || 0,
        getworks: s['Getworks'] || 0,
        accepted: s['Accepted'] || 0,
        rejected: s['Rejected'] || 0,
        hardwareErrors: s['Hardware Errors'] || 0,
        utility: s['Utility'] || 0,
        discarded: s['Discarded'] || 0,
        stale: s['Stale'] || 0,
        getFailures: s['Get Failures'] || 0,
        localWork: s['Local Work'] || 0,
        remoteFailures: s['Remote Failures'] || 0,
        networkBlocks: s['Network Blocks'] || 0,
        totalMh: s['Total MH'] || 0,
        workUtility: s['Work Utility'] || 0,
        difficultyAccepted: s['Difficulty Accepted'] || 0,
        difficultyRejected: s['Difficulty Rejected'] || 0,
        difficultyStale: s['Difficulty Stale'] || 0,
        bestShare: s['Best Share'] || 0,
      });
    } else {
      res.status(500).json({ error: 'Invalid response from CGMiner' });
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Devices
app.get('/api/devices', async (req: Request, res: Response) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'devs');
    if (data?.DEVS) {
      const devices = data.DEVS.map((dev: any) => {
        // Return all properties as-is from cgminer
        const mappedDev: any = {};
        
        for (const key in dev) {
          mappedDev[key] = dev[key];
        }
        
        return mappedDev;
      });
      res.json(devices);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Pools
app.get('/api/pools', async (req: Request, res: Response) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'pools');
    if (data?.POOLS) {
      const pools = data.POOLS.map((pool: any) => ({
        url: pool['URL'] || '',
        status: pool['Status'] || 'Unknown',
        priority: pool['Priority'] || 0,
        user: pool['User'] || '',
        accepted: pool['Accepted'] || 0,
        rejected: pool['Rejected'] || 0,
        frequency: pool['Frequency'] || 0,
        stale: pool['Stale'] || 0,
        lastShareTime: pool['Last Share Time'] || 0,
      }));
      res.json(pools);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching pools:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Configuration: Get Config
app.get('/api/config', async (req: Request, res: Response) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'config');
    const config = data?.CONFIG?.[0] || {};
    const mappedConfig = {
      ascCount: config['ASC Count'] || 0,
      pgaCount: config['PGA Count'] || 0,
      poolCount: config['Pool Count'] || 0,
      strategy: config['Strategy'] || '',
      logInterval: config['Log Interval'] || 0,
      deviceCode: config['Device Code'] || '',
      os: config['OS'] || '',
      hotplug: config['Hotplug'] || 0,
    };

    res.json(mappedConfig);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Coin Info
app.get('/api/coin', async (req: Request, res: Response) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'coin');
    const coinData = data?.COIN?.[0] || {};

    const mappedCoin = {
      hashMethod: coinData['Hash Method'] || '',
      currentBlockTime: coinData['Current Block Time'] || 0,
      currentBlockHash: coinData['Current Block Hash'] || '',
      lp: coinData['LP'] || false,
      networkDifficulty: coinData['Network Difficulty'] || 0,
    };

    res.json(mappedCoin);
  } catch (error) {
    console.error('Error fetching coin info:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// USB Stats
app.get('/api/usbstats', async (req: Request, res: Response) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'usbstats');
    const stats = data?.USBSTATS || [];

    const mappedStats = stats.map((usb: any) => ({
      name: usb['Name'] || '',
      id: usb['ID'] || 0,
      stat: usb['Stat'] || '',
      seq: usb['Seq'] || 0,
      modes: usb['Modes'] || '',
      count: usb['Count'] || 0,
      totalDelay: usb['Total Delay'] || 0,
      minDelay: usb['Min Delay'] || 0,
      maxDelay: usb['Max Delay'] || 0,
      timeoutCount: usb['Timeout Count'] || 0,
      timeoutTotalDelay: usb['Timeout Total Delay'] || 0,
      timeoutMinDelay: usb['Timeout Min Delay'] || 0,
      timeoutMaxDelay: usb['Timeout Max Delay'] || 0,
      errorCount: usb['Error Count'] || 0,
      errorTotalDelay: usb['Error Total Delay'] || 0,
      errorMinDelay: usb['Error Min Delay'] || 0,
      errorMaxDelay: usb['Error Max Delay'] || 0,
      firstCommand: usb['First Command'] || 0,
      lastCommand: usb['Last Command'] || 0,
      firstTimeout: usb['First Timeout'] || 0,
      lastTimeout: usb['Last Timeout'] || 0,
      firstError: usb['First Error'] || 0,
      lastError: usb['Last Error'] || 0,
    }));

    res.json(mappedStats);
  } catch (error) {
    console.error('Error fetching USB stats:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Device Details
app.get('/api/devdetails', async (req: Request, res: Response) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'devdetails');
    const details = data?.DEVDETAILS || [];

    const mappedDetails = details.map((dev: any) => ({
      devDetails: dev['DEVDETAILS'] || 0,
      name: dev['Name'] || '',
      id: dev['ID'] || 0,
      driver: dev['Driver'] || '',
      kernel: dev['Kernel'] || '',
      model: dev['Model'] || '',
      devicePath: dev['Device Path'] || '',
    }));

    res.json(mappedDetails);
  } catch (error) {
    console.error('Error fetching device details:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});


// Stats Raw
app.get('/api/stats/raw', async (req: Request, res: Response) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'stats');
    const stats = data?.STATS || [];
    const mappedStats = stats.map((stat: any) => {
      const mappedStat: any = {};
      for (const key in stat) {
        mappedStat[key] = stat[key];
      }
	  
      return mappedStat;
    });

    res.json(mappedStats);
  } catch (error) {
    console.error('Error fetching raw stats:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});


app.get('/api/version', async (req, res) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'version');
    const raw = data?.VERSION || [];

    const mapped = raw.map((v: any) => ({
      cgminer: v.CGMiner,
      api: v.API
    }));

    res.json({ version: mapped });
  } catch (err: any) {
    console.error("Error fetching version:", err);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
});

app.get('/api/notify', async (req, res) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'notify');
    const raw = data?.NOTIFY || [];

    const mapped = raw.map((n: any) => {
      const obj: any = {};

      for (const key in n) {
        const camelKey = key
          .replace(/^\*/g, '')                              // remove leading *
          .replace(/\s+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase()) // space to camelCase
          .replace(/^./, c => c.toLowerCase());

        obj[camelKey] = n[key];
      }

      return obj;
    });

    res.json({ notify: mapped });
  } catch (err: any) {
    console.error("Error fetching notify:", err);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
});


app.get('/api/lcd', async (req, res) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'lcd');
    const raw = data?.LCD || [];

    const mapped = raw.map((lcd: any) => {
      const obj: any = {};

      for (const key in lcd) {
        const camelKey = key
          .replace(/\s+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase())
          .replace(/^./, c => c.toLowerCase());

        obj[camelKey] = lcd[key];
      }

      return obj;
    });

    res.json({ lcd: mapped });
  } catch (err: any) {
    console.error("Error fetching lcd:", err);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
});

// ---------------------- CONTROL ENDPOINTS ----------------------

// Restart CGMiner
app.post('/api/control/restart', async (req: Request, res: Response) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'restart');
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error restarting CGMiner:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Quit/Stop CGMiner
app.post('/api/control/quit', async (req: Request, res: Response) => {
  try {
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'quit');
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error stopping CGMiner:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ---------------------- POOL CONTROL ----------------------

// Add Pool
app.post('/api/pools/add', async (req: Request, res: Response) => {
  try {
    const { url, user, pass } = req.body;
    if (!url || !user || !pass) {
      return res.status(400).json({ error: 'url, user, and pass are required' });
    }
    
    const command = `addpool|${url},${user},${pass}`;
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error adding pool:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Remove Pool
app.post('/api/pools/remove', async (req: Request, res: Response) => {
  try {
    const { poolId } = req.body;
    if (poolId === undefined) {
      return res.status(400).json({ error: 'poolId is required' });
    }
    
    const command = `removepool|${poolId}`;
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error removing pool:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Enable Pool
app.post('/api/pools/enable', async (req: Request, res: Response) => {
  try {
    const { poolId } = req.body;
    if (poolId === undefined) {
      return res.status(400).json({ error: 'poolId is required' });
    }
    
    const command = `enablepool|${poolId}`;
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error enabling pool:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Disable Pool
app.post('/api/pools/disable', async (req: Request, res: Response) => {
  try {
    const { poolId } = req.body;
    if (poolId === undefined) {
      return res.status(400).json({ error: 'poolId is required' });
    }
    
    const command = `disablepool|${poolId}`;
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error disabling pool:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Switch Pool (make it highest priority)
app.post('/api/pools/switch', async (req: Request, res: Response) => {
  try {
    const { poolId } = req.body;
    if (poolId === undefined) {
      return res.status(400).json({ error: 'poolId is required' });
    }
    
    const command = `switchpool|${poolId}`;
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error switching pool:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Set Pool Priority
app.post('/api/pools/priority', async (req: Request, res: Response) => {
  try {
    const { priorities } = req.body;
    if (!Array.isArray(priorities)) {
      return res.status(400).json({ error: 'priorities must be an array' });
    }
    
    const command = `poolpriority|${priorities.join(',')}`;
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error setting pool priority:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ---------------------- DEVICE CONTROL ----------------------

// Enable Device (ASC)
app.post('/api/devices/enable', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;
    if (deviceId === undefined) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    
    const command = `ascenable|${deviceId}`;
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error enabling device:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Disable Device (ASC)
app.post('/api/devices/disable', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;
    if (deviceId === undefined) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    
    const command = `ascdisable|${deviceId}`;
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error disabling device:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Set Device Option (ascset)
app.post('/api/devices/set', async (req: Request, res: Response) => {
  try {
    const { deviceId, option, value } = req.body;
    if (deviceId === undefined || !option) {
      return res.status(400).json({ error: 'deviceId and option are required' });
    }
    
    const command = value !== undefined 
      ? `ascset|${deviceId},${option},${value}`
      : `ascset|${deviceId},${option}`;
      
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error setting device option:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Set Device Frequency
app.post('/api/devices/frequency', async (req: Request, res: Response) => {
  try {
    const { deviceId, frequency } = req.body;
    if (deviceId === undefined || !frequency) {
      return res.status(400).json({ error: 'deviceId and frequency are required' });
    }
    
    // Use ascset with freq option
    const command = `ascset|${deviceId},freq,${frequency}`;
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error setting device frequency:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Save Config
app.post('/api/control/save', async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    const command = filename ? `save|${filename}` : 'save';
    const data = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, command);
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ---------------------- HELPER ----------------------
async function getFrequencyFromStats() {
  try {
    const statsData = await sendCGMinerCommand(CGMINER_HOST, CGMINER_PORT, 'stats');
    const first = statsData?.STATS?.[0];
    return Number(first?.Frequency ?? first?.Freq ?? first?.FreqSel ?? 0);
  } catch {
    return 0;
  }
}

// ---------------------- START SERVER ----------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CGMiner proxy server running on http://0.0.0.0:${PORT}`);
  console.log(`Connecting to CGMiner at ${CGMINER_HOST}:${CGMINER_PORT}`);
});

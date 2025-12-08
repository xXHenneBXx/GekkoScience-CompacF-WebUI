import { useState, useEffect } from 'react';
import { Sliders, Zap, Power, PowerOff, Save, RefreshCw, Activity, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cgminerAPI } from '../services/cgminer';
import { DeviceInfo, RawStatsInfo } from '../types/miner';

interface MergedDeviceInfo extends DeviceInfo {
  serial?: string;
  frequency?: number;
  chips?: number;
  voltage?: number;
  fanSpeed?: number;
  rolling?: number;
  enabled?: string;
}

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
  timestamp: number;
}

export function ConfigurationPage() {
  const [devices, setDevices] = useState<MergedDeviceInfo[]>([]);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [frequencyInputs, setFrequencyInputs] = useState<{ [key: number]: string }>({});
  const [voltageInputs, setVoltageInputs] = useState<{ [key: number]: string }>({});
  const [fanInputs, setFanInputs] = useState<{ [key: number]: string }>({});
  const [messages, setMessages] = useState<Message[]>([]);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    const newMessage: Message = { type, text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.timestamp !== newMessage.timestamp));
    }, 5000);
  };

  const mergeDeviceData = (devicesData: any[], statsRaw: RawStatsInfo[]): MergedDeviceInfo[] => {
    return devicesData
      .filter((dev: any) => dev.Enabled === 'Y' && !dev['No Device'])
      .map((dev: any) => {
        const matchingStat = statsRaw.find((stat: any) => stat.STATS === dev.ID);
        
        return {
          id: dev.ID || 0,
          name: dev.Name || 'Unknown',
          status: dev.Status || 'Unknown',
          temperature: dev.Temperature || 0,
          hashrate: dev['MHS 5s'] || 0,
          mhs5s: dev['MHS 5s'] || 0,
          mhsAv: dev['MHS av'] || 0,
          accepted: dev.Accepted || 0,
          rejected: dev.Rejected || 0,
          hardwareErrors: dev['Hardware Errors'] || 0,
          enabled: dev.Enabled || 'Y',
          
          // From stats/raw
          serial: matchingStat?.Serial || undefined,
          frequency: matchingStat?.Frequency || matchingStat?.FreqSel || 0,
          chips: matchingStat?.Chips || 0,
          voltage: matchingStat?.Voltage || 0,
          fanSpeed: matchingStat?.FanSpeed || matchingStat?.['Fan Speed'] || 0,
          rolling: matchingStat?.Rolling || 0,
        };
      });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [devicesData, rawDevices, configData, statsRawData] = await Promise.all([
        cgminerAPI.getDevices(),
        fetch(`http://${window.location.hostname}:3001/api/devices`).then(r => r.json()),
        cgminerAPI.getConfig(),
        cgminerAPI.getStatsRaw(),
      ]);

      const mergedDevices = mergeDeviceData(rawDevices, statsRawData);
      setDevices(mergedDevices);
      setConfig(configData);
	  
	  const initialVolts: { [key: number]: string } = {};
      const initialFans: { [key: number]: string } = {};

      const initialFreqs: { [key: number]: string } = {};
      mergedDevices.forEach(dev => {
        initialFreqs[dev.id] = dev.frequency?.toString() || '550';
      });
      setFrequencyInputs(initialFreqs);
	  setVoltageInputs(initialVolts);
      setFanInputs(initialFans);

      setLoading(false);
    } catch (error) {
      showMessage('error', 'Failed to fetch device data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnableDevice = async (deviceId: number) => {
    setActionLoading(`enable-${deviceId}`);
    try {
      const success = await cgminerAPI.enableDevice(deviceId);

      if (success) {
        showMessage('success', `Device ${deviceId} enabled successfully`);
        setTimeout(fetchData, 1000);
      } else {
        showMessage('error', `Failed to enable device ${deviceId}`);
      }
    } catch (error) {
      showMessage('error', 'Error enabling device: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setActionLoading(null);
  };

  const handleDisableDevice = async (deviceId: number) => {
    if (!confirm('⚠️ Are you sure you want to disable this device?\n\nThis will stop mining on this device until you enable it again.')) {
      return;
    }

    setActionLoading(`disable-${deviceId}`);
    try {
      const success = await cgminerAPI.disableDevice(deviceId);

      if (success) {
        showMessage('success', `Device ${deviceId} disabled successfully`);
        setTimeout(fetchData, 1000);
      } else {
        showMessage('error', `Failed to disable device ${deviceId}`);
      }
    } catch (error) {
      showMessage('error', 'Error disabling device: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setActionLoading(null);
  };

  const handleSetVoltage = async (deviceId: number) => {
    const voltage = parseFloat(voltageInputs[deviceId]);
    if (isNaN(voltage) || voltage <= 0) {
      alert('Please enter a valid voltage');
      return;
    }
    setActionLoading({ ...actionLoading, [`volt-${deviceId}`]: true });
    const success = await cgminerAPI.setDeviceOption(deviceId, 'voltage', voltage);
    if (success) await fetchData();
    else alert('Failed to set voltage. Make sure your device supports this command.');
    setActionLoading({ ...actionLoading, [`volt-${deviceId}`]: false });
  };

  const handleSetFanSpeed = async (deviceId: number) => {
    const speed = parseInt(fanInputs[deviceId]);
    if (isNaN(speed) || speed < 0 || speed > 100) {
      alert('Please enter a valid fan speed between 0 and 100%');
      return;
    }
    setActionLoading({ ...actionLoading, [`fan-${deviceId}`]: true });
    const success = await cgminerAPI.setDeviceOption(deviceId, 'fan', speed);
    if (success) await fetchData();
    else alert('Failed to set fan speed. Make sure your device supports this command.');
    setActionLoading({ ...actionLoading, [`fan-${deviceId}`]: false });
  };

  const handleSetFrequency = async (deviceId: number) => {
    const frequency = parseInt(frequencyInputs[deviceId]);

    if (isNaN(frequency) || frequency < 100 || frequency > 800) {
      showMessage('error', 'Please enter a valid frequency between 100 and 800 MHz');
      return;
    }

    if (!confirm(`⚠️ Change frequency to ${frequency} MHz?\n\nThis will:\n- Temporarily interrupt mining on this device\n- May affect temperature and power consumption\n- Changes take effect immediately\n\nMonitor temperature after applying!`)) {
      return;
    }

    setActionLoading(`freq-${deviceId}`);
    try {
      const success = await cgminerAPI.setDeviceFrequency(deviceId, frequency);

      if (success) {
        showMessage('success', `Frequency set to ${frequency} MHz on device ${deviceId}`);
        setTimeout(fetchData, 2000);
      } else {
        showMessage('error', 'Failed to set frequency. Device may not support this command or value is out of range.');
      }
    } catch (error) {
      showMessage('error', 'Error setting frequency: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setActionLoading(null);
  };

  const handleConfigChange = async (name: string, value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue)) {
      showMessage('error', 'Please enter a valid number');
      return;
    }

    setActionLoading(`config-${name}`);
    try {
      const success = await cgminerAPI.setConfig(name, numValue);

      if (success) {
        showMessage('success', `${name} set to ${numValue}`);
        setTimeout(fetchData, 1000);
      } else {
        showMessage('error', `Failed to set ${name}. This setting may not be supported.`);
      }
    } catch (error) {
      showMessage('error', `Error setting ${name}: ` + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setActionLoading(null);
  };

  const formatHashrate = (hashrate: number) => {
    if (!hashrate) return '0 MH/s';
    if (hashrate < 1_000) return `${hashrate.toFixed(2)} MH/s`;
    if (hashrate < 1_000_000) return `${(hashrate / 1_000).toFixed(2)} GH/s`;
    return `${(hashrate / 1_000_000).toFixed(2)} TH/s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center md:py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading device configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      <div className="flex top-4 right-4 z-50 space-y-2 max-w-md">
        {messages.map((message) => (
          <div
            key={message.timestamp}
            className={`p-4 rounded-lg shadow-lg flex items-start gap-3 animate-in slide-in-from-right ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : message.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <Info className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Device Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure device frequency, enable/disable devices, and adjust mining settings
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={actionLoading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Devices List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Active Devices ({devices.length})</h3>
          </div>

          {devices.map((device) => {
            const isAlive = device.status.toLowerCase() === 'alive';
            const isEnabled = device.enabled === 'Y';

            return (
              <div key={device.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                {/* Device Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAlive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {device.name} #{device.id}
                        {device.serial && <span className="text-sm text-gray-500 ml-2">({device.serial})</span>}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${isAlive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="text-sm text-gray-600">{device.status}</span>
                        {device.chips > 0 && (
                          <span className="text-xs text-gray-500 ml-2">• {device.chips} chip{device.chips !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEnabled ? (
                      <button
                        onClick={() => handleDisableDevice(device.id)}
                        disabled={actionLoading !== null}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Disable device"
                      >
                        {actionLoading === `disable-${device.id}` ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <PowerOff className="w-5 h-5" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnableDevice(device.id)}
                        disabled={actionLoading !== null}
                        className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Enable device"
                      >
                        {actionLoading === `enable-${device.id}` ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Power className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Device Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Hashrate (5s)</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatHashrate(device.hashrate)}
                    </div>
                    <div className="text-xs text-gray-500">Avg: {formatHashrate(device.mhsAv || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Temperature</div>
                    <div className={`text-lg font-bold ${
                      device.temperature > 80 ? 'text-red-600' : 
                      device.temperature > 70 ? 'text-orange-600' : 
                      'text-green-600'
                    }`}>
                      {device.temperature > 0 ? `${device.temperature.toFixed(1)}°C` : 'N/A'}
                    </div>
                    {device.fanSpeed > 0 && (
                      <div className="text-xs text-gray-500">Fan: {device.fanSpeed} RPM</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Current Freq</div>
                    <div className="text-lg font-bold text-blue-600">
                      {device.frequency || 0} MHz
                    </div>
                    {device.voltage > 0 && (
                      <div className="text-xs text-gray-500">V: {(device.voltage / 1000).toFixed(2)}V</div>
                    )}
                  </div>
                </div>

                {/* Frequency Control */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">Adjust Frequency</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="100"
                        max="800"
                        step="50"
                        value={frequencyInputs[device.id] || ''}
                        onChange={(e) => setFrequencyInputs({
                          ...frequencyInputs,
                          [device.id]: e.target.value
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter frequency (MHz)"
                        disabled={!isAlive || !isEnabled}
                      />
                      <p className="text-xs text-gray-500 mt-1">Safe range: 100-800 MHz (device dependent)</p>
                    </div>
                    <button
                      onClick={() => handleSetFrequency(device.id)}
                      disabled={!isAlive || !isEnabled || actionLoading !== null}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {actionLoading === `freq-${device.id}` ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </button>
                  </div>
                </div>

                {/* Device Statistics */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Accepted</div>
                    <div className="font-semibold text-green-600">{device.accepted.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Rejected</div>
                    <div className="font-semibold text-red-600">{device.rejected.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">HW Errors</div>
                    <div className="font-semibold text-orange-600">{device.hardwareErrors.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {devices.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 font-medium">No active devices detected</p>
              <p className="text-sm text-gray-400 mt-1">Make sure your mining devices are connected and enabled</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Global Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Global Settings</h3>
            </div>

            <div className="space-y-4">
			<div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Queue Size
                </label>
                <div className="flex-1 gap-2">
                  <input
                    type="number"
                    defaultValue={config.queue || 1}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    id="queue-input"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('queue-input') as HTMLInputElement;
                      handleConfigChange('queue', input.value);
                    }}
                    disabled={actionLoading !== null}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Work queue size (0-9999)</p>
              </div>
			  
			  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scan Time (seconds)
                </label>
                <div className="flex-1 gap-2">
                  <input
                    type="number"
                    defaultValue={config.scantime || 60}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    id="scantime-input"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('scantime-input') as HTMLInputElement;
                      handleConfigChange('scantime', input.value);
                    }}
                    disabled={actionLoading !== null}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Time to scan current work (1-9999)</p>
              </div>
			  
			    <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Time (seconds)
                </label>
                <div className="flex-1 gap-2">
                  <input
                    type="number"
                    defaultValue={config.expiry || 120}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    id="expiry-input"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('expiry-input') as HTMLInputElement;
                      handleConfigChange('expiry', input.value);
                    }}
                    disabled={actionLoading !== null}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>
				 
                </div>
                <p className="text-xs text-gray-500 mt-1">Work expiry time (0-9999)</p>
              </div>
			
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Log Interval (seconds)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    defaultValue={config.logInterval || 5}
                    min="1"
                    max="999"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    id="log-interval-input"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('log-interval-input') as HTMLInputElement;
                      handleConfigChange('log', input.value);
                    }}
                    disabled={actionLoading !== null}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>

                </div>
                <p className="text-xs text-gray-500 mt-1">How often to log statistics (1-999)</p>
              </div>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">⚠️ Important</h4>
                <ul className="text-xs text-yellow-800 space-y-1">
                  <li>• Changing frequency affects hashrate and power consumption</li>
                  <li>• Monitor temperature closely after frequency changes</li>
                  <li>• Hardware damage possible with aggressive settings</li>
                  <li>• Start conservative, increase gradually</li>
                  <li>• Save configuration after finding stable settings</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">💡 Pro Tips</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Optimal frequency varies by device and chip quality</li>
                  <li>• Higher frequency = more hashrate but more heat</li>
                  <li>• Monitor hardware errors - too high means reduce freq</li>
                  <li>• Disable devices for maintenance without stopping miner</li>
                  <li>• Use Ctrl+Refresh from home to save your settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
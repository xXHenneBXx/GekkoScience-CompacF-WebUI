import { useState, useEffect } from 'react';
import { Plus, Trash2, Power, PowerOff, ArrowUp, ArrowDown, RefreshCw, AlertCircle, CheckCircle, Info, Wifi, WifiOff } from 'lucide-react';
import { cgminerAPI } from '../services/cgminer';
import { PoolInfo } from '../types/miner';

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
  timestamp: number;
}

export function SettingsPage() {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ url: '', user: '', pass: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    const newMessage: Message = { type, text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.timestamp !== newMessage.timestamp));
    }, 5000);
  };

  const fetchPools = async () => {
    try {
      setLoading(true);
      const poolsData = await cgminerAPI.getPools();
      setPools(poolsData || []);
      setLoading(false);
    } catch (error) {
      showMessage('error', 'Failed to fetch pools: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.url.trim()) {
      errors.url = 'Pool URL is required';
    } else if (!formData.url.includes(':')) {
      errors.url = 'URL must include port (e.g., pool.com:3333)';
    }

    if (!formData.user.trim()) {
      errors.user = 'Username/wallet address is required';
    }

    if (!formData.pass.trim()) {
      errors.pass = 'Password is required (use "x" if not needed)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showMessage('error', 'Please fix form errors before submitting');
      return;
    }

    setActionLoading('add');
    try {
      const success = await cgminerAPI.addPool(formData.url, formData.user, formData.pass);

      if (success) {
        showMessage('success', `Pool added successfully: ${formData.url}`);
        setFormData({ url: '', user: '', pass: '' });
        setFormErrors({});
        setShowAddForm(false);
        setTimeout(fetchPools, 1000);
      } else {
        showMessage('error', 'Failed to add pool. Check URL format and try again.');
      }
    } catch (error) {
      showMessage('error', 'Error adding pool: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setActionLoading(null);
  };

  const handleRemovePool = async (poolPriority: number, poolUrl: string) => {
    if (!confirm(`⚠️ Remove pool "${poolUrl}"?\n\nThis action cannot be undone. If this is your only pool, mining will stop.`)) {
      return;
    }

    setActionLoading(`remove-${poolPriority}`);
    try {
      const success = await cgminerAPI.removePool(poolPriority);

      if (success) {
        showMessage('success', `Pool removed: ${poolUrl}`);
        setTimeout(fetchPools, 1000);
      } else {
        showMessage('error', 'Failed to remove pool');
      }
    } catch (error) {
      showMessage('error', 'Error removing pool: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setActionLoading(null);
  };

  const handleEnablePool = async (poolPriority: number, poolUrl: string) => {
    setActionLoading(`enable-${poolPriority}`);
    try {
      const success = await cgminerAPI.enablePool(poolPriority);

      if (success) {
        showMessage('success', `Pool enabled: ${poolUrl}`);
        setTimeout(fetchPools, 1000);
      } else {
        showMessage('error', 'Failed to enable pool');
      }
    } catch (error) {
      showMessage('error', 'Error enabling pool: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setActionLoading(null);
  };

  const handleDisablePool = async (poolPriority: number, poolUrl: string) => {
    if (pools.filter(p => p.status.toLowerCase().includes('alive')).length <= 1) {
      showMessage('error', 'Cannot disable the only active pool! Add another pool first.');
      return;
    }

    setActionLoading(`disable-${poolPriority}`);
    try {
      const success = await cgminerAPI.disablePool(poolPriority);

      if (success) {
        showMessage('success', `Pool disabled: ${poolUrl}`);
        setTimeout(fetchPools, 1000);
      } else {
        showMessage('error', 'Failed to disable pool');
      }
    } catch (error) {
      showMessage('error', 'Error disabling pool: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setActionLoading(null);
  };

  const handleSwitchPool = async (poolPriority: number, poolUrl: string) => {
    if (!confirm(`Switch to pool "${poolUrl}"?\n\nThis will make it the highest priority pool and CGMiner will immediately start using it.`)) {
      return;
    }

    setActionLoading(`switch-${poolPriority}`);
    try {
      const success = await cgminerAPI.switchPool(poolPriority);

      if (success) {
        showMessage('success', `Switched to pool: ${poolUrl}`);
        setTimeout(fetchPools, 1000);
      } else {
        showMessage('error', 'Failed to switch pool');
      }
    } catch (error) {
      showMessage('error', 'Error switching pool: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setActionLoading(null);
  };

  const handleMovePriority = async (poolPriority: number, direction: 'up' | 'down') => {
    const currentIndex = pools.findIndex(p => p.priority === poolPriority);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= pools.length) return;

    const newPools = [...pools];
    [newPools[currentIndex], newPools[targetIndex]] = [newPools[targetIndex], newPools[currentIndex]];

    const priorities = newPools.map((_, idx) => idx);

    setActionLoading('priority');
    try {
      const success = await cgminerAPI.setPoolPriority(priorities);

      if (success) {
        showMessage('info', `Pool priority ${direction === 'up' ? 'increased' : 'decreased'}`);
        setTimeout(fetchPools, 1000);
      } else {
        showMessage('error', 'Failed to change pool priority');
      }
    } catch (error) {
      showMessage('error', 'Error changing priority: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    setActionLoading(null);
  };

  const getAcceptanceRate = (pool: PoolInfo): number => {
    const total = pool.accepted + pool.rejected;
    return total > 0 ? (pool.accepted / total) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center md:py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pool configuration...</p>
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
          <h2 className="flex-1 text-2xl font-bold text-blue-700">Mining Pool Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your mining pool connections and failover settings
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPools}
            disabled={actionLoading !== null}
            className="flex-1 items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex-1 items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? 'Cancel' : 'Add Pool'}
          </button>
        </div>
      </div>

      {/* Add Pool Form */}
      {showAddForm && (
        <div className="flex-1 bg-white rounded-lg shadow-md p-6 border-2 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">Add New Mining Pool</h3>
          <form onSubmit={handleAddPool} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pool URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => {
                  setFormData({ ...formData, url: e.target.value });
                  setFormErrors({ ...formErrors, url: '' });
                }}
                placeholder="stratum+tcp://pool.example.com:3333"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  formErrors.url ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {formErrors.url && <p className="text-xs text-red-600 mt-1">{formErrors.url}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Include protocol and port (e.g., stratum+tcp://pool.com:3333)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username / Wallet Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.user}
                onChange={(e) => {
                  setFormData({ ...formData, user: e.target.value });
                  setFormErrors({ ...formErrors, user: '' });
                }}
                placeholder="your_wallet_address.worker_name"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  formErrors.user ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {formErrors.user && <p className="text-xs text-red-600 mt-1">{formErrors.user}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.pass}
                onChange={(e) => {
                  setFormData({ ...formData, pass: e.target.value });
                  setFormErrors({ ...formErrors, pass: '' });
                }}
                placeholder="x"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  formErrors.pass ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {formErrors.pass && <p className="text-xs text-red-600 mt-1">{formErrors.pass}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Most pools use "x" as password. Check pool documentation.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={actionLoading !== null}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {actionLoading === 'add' ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Adding Pool...
                  </span>
                ) : (
                  'Add Pool'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormErrors({});
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pools List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Configured Pools ({pools.length})
          </h3>
        </div>

        {pools.map((pool, index) => {
          const isActive = pool.status.toLowerCase().includes('alive');
          const acceptanceRate = getAcceptanceRate(pool);

          return (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all ${
                isActive ? 'border-l-4 border-green-500' : 'border-l-4 border-gray-300'
              }`}
            >
              {/* Pool Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {isActive ? (
                      <Wifi className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <h3 className="font-semibold text-gray-900 truncate">{pool.url}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                      pool.priority === 0 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {pool.priority === 0 ? 'PRIMARY' : `Priority ${pool.priority}`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate ml-8">{pool.user}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleMovePriority(pool.priority, 'up')}
                    disabled={index === 0 || actionLoading !== null}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Increase priority"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMovePriority(pool.priority, 'down')}
                    disabled={index === pools.length - 1 || actionLoading !== null}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Decrease priority"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  {!isActive && (
                    <button
                      onClick={() => handleSwitchPool(pool.priority, pool.url)}
                      disabled={actionLoading !== null}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Switch to this pool"
                    >
                      {actionLoading === `switch-${pool.priority}` ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wifi className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  {isActive ? (
                    <button
                      onClick={() => handleDisablePool(pool.priority, pool.url)}
                      disabled={actionLoading !== null}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Disable pool"
                    >
                      {actionLoading === `disable-${pool.priority}` ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <PowerOff className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnablePool(pool.priority, pool.url)}
                      disabled={actionLoading !== null}
                      className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Enable pool"
                    >
                      {actionLoading === `enable-${pool.priority}` ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleRemovePool(pool.priority, pool.url)}
                    disabled={actionLoading !== null}
                    className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Remove pool"
                  >
                    {actionLoading === `remove-${pool.priority}` ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Pool Statistics */}
              <div className="grid grid-cols-5 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Accepted</div>
                  <div className="text-sm font-semibold text-green-600">
                    {pool.accepted.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Rejected</div>
                  <div className="text-sm font-semibold text-red-600">
                    {pool.rejected.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Stale</div>
                  <div className="text-sm font-semibold text-yellow-600">
                    {pool.stale.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Accept Rate</div>
                  <div className={`text-sm font-semibold ${
                    acceptanceRate >= 99 ? 'text-green-600' : 
                    acceptanceRate >= 95 ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {acceptanceRate.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Status</div>
                  <div className={`text-sm font-semibold ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {pool.status}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {pools.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Wifi className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 font-medium">No pools configured</p>
            <p className="text-sm text-gray-400 mt-1">
              Add a pool to start mining
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Pool
            </button>
          </div>
        )}
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Pool Failover System</h4>
              <p className="text-sm text-blue-800">
                CGMiner automatically switches to backup pools if the primary pool fails.
                Pools are tried in priority order (0 is highest). Configure multiple pools
                for uninterrupted mining.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900 mb-1">Best Practices</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Always configure at least 2-3 backup pools</li>
                <li>• Test pools before adding to production</li>
                <li>• Monitor acceptance rates (should be &gt;99%)</li>
                <li>• Use pools geographically close to you for lower latency</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';
import { useState, useEffect, useCallback } from 'react';
import { PLANS } from '@/lib/license';

type License = {
  id: number;
  product: 'inout' | 'koha';
  customer_name: string;
  customer_email: string;
  domain: string;
  mac_address: string | null;
  license_key: string;
  plan: string;
  max_users: number;
  expiry_date: string;
  status: 'Active' | 'Expired' | 'Revoked' | 'Suspended';
  features: string[] | null;
  notes: string | null;
  created_at: string;
};

type Stats = {
  total: number;
  active: number;
  expired: number;
  revoked: number;
  inout_count: number;
  koha_count: number;
  pings_today: number;
  expiring_soon: { customer_name: string; domain: string; product: string; expiry_date: string }[];
};

const defaultForm = {
  product: 'inout' as 'inout' | 'koha',
  customer_name: '', customer_email: '', domain: '',
  mac_address: '', plan: 'Basic', expiry_date: '', notes: '',
};

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className={`glass rounded-xl p-5 card-glow transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-semibold uppercase tracking-widest ${color}`}>{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function PlanFeatureCard({ product, plan, details }: { product: string; plan: string; details: { price: string; max_users: number; features: string[] } }) {
  const colors: Record<string, string> = { Basic: 'text-slate-400', Professional: 'text-indigo-400', Enterprise: 'text-amber-400' };
  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <span className={`font-bold text-lg ${colors[plan]}`}>{plan}</span>
        <span className="text-xs text-slate-400">{details.price}</span>
      </div>
      <div className="text-xs text-slate-500">Up to {details.max_users === 999 ? 'Unlimited' : details.max_users} users</div>
      <ul className="mt-2 space-y-1">
        {details.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
            <span className="text-green-400 mt-0.5">✓</span> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<'dashboard' | 'licenses' | 'generate' | 'plans'>('dashboard');
  const [productFilter, setProductFilter] = useState<'all' | 'inout' | 'koha'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/stats');
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchLicenses = useCallback(async () => {
    const params = new URLSearchParams();
    if (productFilter !== 'all') params.set('product', productFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await fetch(`/api/licenses?${params}`);
    if (res.ok) setLicenses(await res.json());
  }, [productFilter, statusFilter]);

  useEffect(() => { fetchStats(); fetchLicenses(); }, [fetchStats, fetchLicenses]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    const res = await fetch('/api/licenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.status === 'success') {
      setMsg({ text: data.message, type: 'success' });
      setSelectedKey(data.license_key);
      fetchLicenses(); fetchStats();
      setForm(defaultForm);
    } else {
      setMsg({ text: data.message, type: 'error' });
    }
  };

  const handleManageAction = async (id: number, action: string, extra?: any) => {
    const res = await fetch('/api/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, ...extra }),
    });
    if (res.ok) { fetchLicenses(); fetchStats(); }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filtered = licenses.filter(l =>
    l.domain.toLowerCase().includes(search.toLowerCase()) ||
    l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    l.customer_email.toLowerCase().includes(search.toLowerCase())
  );

  const currentPlanDetails = (PLANS as any)[form.product];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-64 glass border-r flex flex-col z-40" style={{ borderColor: 'var(--border)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              🔐
            </div>
            <div>
              <div className="font-bold text-white text-sm">OMVKY Licensor</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>License Server v2.0</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'licenses', icon: '🗂️', label: 'Manage Licenses' },
            { id: 'generate', icon: '✨', label: 'Generate License' },
            { id: 'plans', icon: '📋', label: 'Plans & Features' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                tab === item.id
                  ? 'text-white' : 'hover:text-white'
              }`}
              style={{
                background: tab === item.id ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' : 'transparent',
                color: tab === item.id ? '#e2e8f0' : 'var(--text-muted)',
                borderLeft: tab === item.id ? '3px solid #6366f1' : '3px solid transparent',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="glass rounded-xl p-3 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            <div className="font-semibold text-white mb-1">API Endpoint</div>
            <div className="font-mono text-indigo-400">inout.omvky.com</div>
            <div className="mt-1">/api/verify?key=...</div>
          </div>
          <button 
            onClick={async () => {
              await fetch('/api/auth', { method: 'DELETE' });
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all font-semibold text-sm"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        {/* Header */}
        <div className="glass border-b sticky top-0 z-30 px-8 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h1 className="text-xl font-bold gradient-text">
              {tab === 'dashboard' && 'Overview Dashboard'}
              {tab === 'licenses' && 'License Management'}
              {tab === 'generate' && 'Generate New License'}
              {tab === 'plans' && 'Plans & Features'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Secure License Server · inout.omvky.com
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full pulse"></div>
              Server Online
            </div>
          </div>
        </div>

        <div className="p-8">

          {/* ===== DASHBOARD TAB ===== */}
          {tab === 'dashboard' && stats && (
            <div className="space-y-6 animate-in">
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Licenses" value={stats.total} icon="🔑" color="text-indigo-400" />
                <StatCard label="Active" value={stats.active} icon="✅" color="text-green-400" />
                <StatCard label="Expired" value={stats.expired} icon="⏰" color="text-red-400" />
                <StatCard label="Today's Pings" value={stats.pings_today} icon="📡" color="text-blue-400" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="glass rounded-xl p-5 col-span-2">
                  <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                    <span>📦</span> Licenses by Product
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { product: 'InOut System', count: stats.inout_count, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: '📚' },
                      { product: 'Koha Library', count: stats.koha_count, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', icon: '📖' },
                    ].map(p => (
                      <div key={p.product} className="rounded-xl p-4 flex items-center gap-4" style={{ background: p.bg }}>
                        <div className="text-4xl">{p.icon}</div>
                        <div>
                          <div className="text-2xl font-bold" style={{ color: p.color }}>{p.count}</div>
                          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{p.product}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-xl p-5">
                  <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                    <span>⚠️</span> Expiring Soon (30 days)
                  </h2>
                  <div className="space-y-3">
                    {stats.expiring_soon.length === 0 && (
                      <p className="text-sm text-slate-500">No licenses expiring soon.</p>
                    )}
                    {stats.expiring_soon.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-xs border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                        <div>
                          <div className="font-medium text-white">{e.domain}</div>
                          <div className="text-slate-500">{e.customer_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-amber-400 font-mono">{new Date(e.expiry_date).toLocaleDateString()}</div>
                          <div className={`badge mt-1 ${e.product === 'inout' ? 'product-inout' : 'product-koha'}`}>{e.product}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Licenses */}
              <div className="glass rounded-xl p-5">
                <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                  <span>🕑</span> Recent Licenses
                </h2>
                <LicenseTable licenses={licenses.slice(0, 5)} onManageAction={handleManageAction} onCopy={copyToClipboard} copiedKey={copiedKey} mini />
              </div>
            </div>
          )}

          {/* ===== LICENSES TAB ===== */}
          {tab === 'licenses' && (
            <div className="space-y-5 animate-in">
              <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-3">
                <input
                  type="text" placeholder="🔍  Search domain, name, email..."
                  className="flex-1 min-w-[200px] rounded-lg px-4 py-2 text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                  value={search} onChange={e => setSearch(e.target.value)}
                />
                {['all', 'inout', 'koha'].map(p => (
                  <button key={p} onClick={() => { setProductFilter(p as any); }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${productFilter === p ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                    style={{ background: productFilter === p ? 'rgba(99,102,241,0.2)' : 'transparent', border: '1px solid', borderColor: productFilter === p ? 'rgba(99,102,241,0.5)' : 'transparent' }}
                  >
                    {p === 'all' ? 'All Products' : p === 'inout' ? '📚 InOut' : '📖 Koha'}
                  </button>
                ))}
                <select
                  value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                >
                  <option className="bg-slate-800 text-white" value="all">All Status</option>
                  <option className="bg-slate-800 text-white" value="Active">Active</option>
                  <option className="bg-slate-800 text-white" value="Expired">Expired</option>
                  <option className="bg-slate-800 text-white" value="Revoked">Revoked</option>
                  <option className="bg-slate-800 text-white" value="Suspended">Suspended</option>
                </select>
                <span className="text-xs text-slate-500 ml-auto">{filtered.length} records</span>
              </div>
              <div className="glass rounded-xl overflow-hidden">
                <LicenseTable licenses={filtered} onManageAction={handleManageAction} onCopy={copyToClipboard} copiedKey={copiedKey} />
              </div>
            </div>
          )}

          {/* ===== GENERATE TAB ===== */}
          {tab === 'generate' && (
            <div className="grid grid-cols-2 gap-6 animate-in">
              <div className="space-y-5">
                <div className="glass rounded-xl p-6">
                  <h2 className="font-bold text-white text-lg mb-5 flex items-center gap-2">
                    <span>✨</span> New License Details
                  </h2>

                  {msg.text && (
                    <div className={`rounded-xl p-4 mb-5 text-sm font-medium ${msg.type === 'success' ? 'text-green-300 bg-green-900/30 border border-green-700/40' : 'text-red-300 bg-red-900/30 border border-red-700/40'}`}>
                      {msg.text}
                    </div>
                  )}

                  {selectedKey && (
                    <div className="rounded-xl p-4 mb-5 border border-indigo-700/40" style={{ background: 'rgba(99,102,241,0.08)' }}>
                      <div className="text-xs text-indigo-400 font-semibold mb-2">🔑 Generated License Key</div>
                      <div className="font-mono text-xs text-white break-all leading-relaxed bg-black/30 rounded-lg p-3">{selectedKey}</div>
                      <button
                        onClick={() => copyToClipboard(selectedKey, 'gen')}
                        className="mt-3 text-xs px-3 py-1.5 rounded-lg text-indigo-300 border border-indigo-700/40 hover:bg-indigo-900/30 transition-all"
                      >
                        {copiedKey === 'gen' ? '✅ Copied!' : '📋 Copy Key'}
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleGenerate} className="space-y-4">
                    {/* Product Selector */}
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">Product *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['inout', 'koha'] as const).map(p => (
                          <button type="button" key={p} onClick={() => setForm(f => ({ ...f, product: p, plan: 'Basic' }))}
                            className={`rounded-xl p-4 flex items-center gap-3 text-sm font-semibold transition-all border ${form.product === p ? 'border-indigo-500 bg-indigo-900/20 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                          >
                            <span className="text-2xl">{p === 'inout' ? '📚' : '📖'}</span>
                            <div className="text-left">
                              <div>{p === 'inout' ? 'InOut System' : 'Koha Library'}</div>
                              <div className="text-xs font-normal text-slate-500">{p === 'inout' ? 'Library Entry/Exit' : 'Library Management'}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Plan */}
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">Plan *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.keys(currentPlanDetails).map(p => (
                          <button type="button" key={p} onClick={() => setForm(f => ({ ...f, plan: p }))}
                            className={`rounded-lg p-3 text-sm font-semibold transition-all border ${form.plan === p ? 'border-indigo-500 bg-indigo-900/20 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                          >
                            <div>{p}</div>
                            <div className="text-xs font-normal mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {(currentPlanDetails as any)[p].price}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Customer Info */}
                    {[
                      { label: 'Customer Name *', field: 'customer_name', placeholder: 'John Doe', type: 'text', required: true },
                      { label: 'Customer Email *', field: 'customer_email', placeholder: 'john@example.com', type: 'email', required: true },
                      { label: 'Domain / Installation URL *', field: 'domain', placeholder: 'library.example.com', type: 'text', required: true },
                      { label: 'MAC Address (Device Lock)', field: 'mac_address', placeholder: 'AA:BB:CC:DD:EE:FF (optional)', type: 'text', required: false },
                      { label: 'Expiry Date *', field: 'expiry_date', placeholder: '', type: 'date', required: true },
                    ].map(({ label, field, placeholder, type, required }) => (
                      <div key={field}>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
                        <input
                          type={type} placeholder={placeholder} required={required}
                          value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                        />
                      </div>
                    ))}

                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">Notes</label>
                      <textarea
                        placeholder="Internal notes (optional)..." rows={3}
                        value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none resize-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                      />
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                      {loading ? '⏳ Generating...' : '✨ Generate Encrypted License'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Plan Preview */}
              <div className="space-y-4">
                <div className="glass rounded-xl p-5">
                  <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-widest flex items-center gap-2">
                    <span>📋</span> {form.product === 'inout' ? 'InOut System' : 'Koha Library'} — {form.plan} Plan
                  </h2>
                  <div className="space-y-2">
                    {((currentPlanDetails as any)[form.plan]?.features || []).map((f: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 text-sm py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                        <span className="text-slate-300">{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <div className="text-2xl font-bold text-indigo-400">{(currentPlanDetails as any)[form.plan]?.max_users === 999 ? '∞' : (currentPlanDetails as any)[form.plan]?.max_users}</div>
                      <div className="text-xs text-slate-500 mt-1">Max Users</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <div className="text-xl font-bold text-indigo-400">{(currentPlanDetails as any)[form.plan]?.price}</div>
                      <div className="text-xs text-slate-500 mt-1">Price / yr</div>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-xl p-5">
                  <h2 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                    <span>🔐</span> License Security Info
                  </h2>
                  <div className="space-y-3 text-xs text-slate-400">
                    <div className="flex items-start gap-2"><span className="text-indigo-400">▸</span> License keys are HMAC-SHA256 signed with a server secret.</div>
                    <div className="flex items-start gap-2"><span className="text-indigo-400">▸</span> All license data (product, plan, expiry, features) is embedded in the key.</div>
                    <div className="flex items-start gap-2"><span className="text-indigo-400">▸</span> MAC Address binding locks the license to a specific server hardware.</div>
                    <div className="flex items-start gap-2"><span className="text-indigo-400">▸</span> Client applications ping <code className="text-indigo-300">/api/verify</code> on every startup.</div>
                    <div className="flex items-start gap-2"><span className="text-indigo-400">▸</span> All pings are logged with IP and MAC for audit trail.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== PLANS TAB ===== */}
          {tab === 'plans' && (
            <div className="space-y-8 animate-in">
              {(['inout', 'koha'] as const).map(product => (
                <div key={product}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{product === 'inout' ? '📚' : '📖'}</span>
                    <div>
                      <h2 className="text-xl font-bold text-white">{product === 'inout' ? 'InOut System' : 'Koha Library Management'}</h2>
                      <p className="text-xs text-slate-500">{product === 'inout' ? 'Student Entry/Exit Tracking Platform' : 'Comprehensive Library Management System'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(PLANS[product]).map(([plan, details]) => (
                      <PlanFeatureCard key={plan} product={product} plan={plan} details={details} />
                    ))}
                  </div>
                </div>
              ))}

              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span>🔐</span> License Security Features</h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: '🔑', title: 'HMAC-SHA256 Signing', desc: 'Every key is cryptographically signed — cannot be forged or tampered with.' },
                    { icon: '💻', title: 'MAC Address Binding', desc: 'Lock any license to a specific server\'s hardware MAC address.' },
                    { icon: '📡', title: 'Heartbeat Pinging', desc: 'Client apps ping the server on start. All pings logged with IP & MAC.' },
                    { icon: '🚫', title: 'Instant Revocation', desc: 'Revoke or suspend any license instantly from the dashboard.' },
                    { icon: '⏰', title: 'Expiry Enforcement', desc: 'Expired licenses are caught both locally and at the server level.' },
                    { icon: '📊', title: 'Full Audit Trail', desc: 'Every verification attempt is logged for complete accountability.' },
                  ].map(f => (
                    <div key={f.title} className="rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid var(--border)' }}>
                      <div className="text-2xl mb-2">{f.icon}</div>
                      <div className="font-semibold text-white text-sm mb-1">{f.title}</div>
                      <div className="text-xs text-slate-500">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function LicenseTable({ licenses, onManageAction, onCopy, copiedKey, mini = false }: {
  licenses: License[];
  onManageAction: (id: number, action: string, extra?: any) => void;
  onCopy: (text: string, id: string) => void;
  copiedKey: string | null;
  mini?: boolean;
}) {
  const statusStyle: Record<string, string> = {
    Active: 'status-active', Expired: 'status-expired', Revoked: 'status-revoked', Suspended: 'status-suspended',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ borderBottom: '1px solid var(--border)' }}>
            {['Customer', 'Domain', 'Product', 'Plan', 'Expiry', 'Status', ...(mini ? [] : ['Actions'])].map(h => (
              <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {licenses.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">No licenses found.</td></tr>
          )}
          {licenses.map((lic) => {
            const isExpired = new Date(lic.expiry_date).getTime() < Date.now() - 86400000;
            const days = Math.ceil((new Date(lic.expiry_date).getTime() - Date.now()) / 86400000);
            return (
              <tr key={lic.id} className="hover:bg-white/2 transition-colors" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                <td className="px-4 py-4">
                  <div className="font-medium text-white">{lic.customer_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{lic.customer_email}</div>
                  <div className="text-xs mt-1">
                    {lic.mac_address ? (
                      <span className="text-indigo-400 font-mono bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-700/50">🔒 {lic.mac_address}</span>
                    ) : (
                      <span className="text-slate-400 italic">Device: Unlinked</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-mono text-xs text-slate-300">{lic.domain}</div>
                </td>
                <td className="px-4 py-4">
                  <span className={`badge ${lic.product === 'inout' ? 'product-inout' : 'product-koha'}`}>
                    {lic.product === 'inout' ? '📚 InOut' : '📖 Koha'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`badge plan-${lic.plan.toLowerCase()}`}>{lic.plan}</span>
                </td>
                <td className="px-4 py-4">
                  <div className={`text-xs font-mono ${isExpired ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {new Date(lic.expiry_date).toLocaleDateString('en-IN')}
                  </div>
                  {!isExpired && <div className="text-xs text-slate-600 mt-0.5">{days}d left</div>}
                  {isExpired && <div className="text-xs text-red-500 mt-0.5">Expired</div>}
                </td>
                <td className="px-4 py-4">
                  <span className={`badge ${statusStyle[lic.status]}`}>{lic.status}</span>
                </td>
                {!mini && (
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onCopy(lic.license_key, String(lic.id))}
                        className="text-xs px-2.5 py-1.5 rounded-lg transition-all text-indigo-300 border border-indigo-700/40 hover:bg-indigo-900/30"
                      >
                        {copiedKey === String(lic.id) ? '✅' : '📋'} Key
                      </button>
                      {lic.status !== 'Active' && (
                        <button onClick={() => onManageAction(lic.id, 'activate')}
                          className="text-xs px-2.5 py-1.5 rounded-lg text-green-300 border border-green-700/40 hover:bg-green-900/30 transition-all">
                          ✅ Activate
                        </button>
                      )}
                      {lic.status === 'Active' && (
                        <>
                          {lic.mac_address ? (
                            <button onClick={() => { if (confirm('Delink this device? The next device connecting will automatically bind.')) onManageAction(lic.id, 'reset_mac'); }}
                              className="text-xs px-2.5 py-1.5 rounded-lg text-sky-300 border border-sky-700/40 hover:bg-sky-900/30 transition-all">
                              🔓 Delink Device
                            </button>
                          ) : (
                            <button onClick={() => { 
                                const newMac = prompt('Enter MAC Address to manually link (or leave blank to auto-bind on next ping):');
                                if (newMac) onManageAction(lic.id, 'link_mac', { mac_address: newMac }); 
                              }}
                              className="text-xs px-2.5 py-1.5 rounded-lg text-sky-300 border border-sky-700/40 hover:bg-sky-900/30 transition-all">
                              🔗 Link Device
                            </button>
                          )}
                          <button onClick={() => { 
                              const newDate = prompt('Enter new expiry date (YYYY-MM-DD):', lic.expiry_date.substring(0,10));
                              if (newDate) onManageAction(lic.id, 'update_expiry', { expiry_date: newDate }); 
                            }}
                            className="text-xs px-2.5 py-1.5 rounded-lg text-purple-300 border border-purple-700/40 hover:bg-purple-900/30 transition-all">
                            📅 Extend Expiry
                          </button>
                          <button onClick={() => onManageAction(lic.id, 'suspend')}
                            className="text-xs px-2.5 py-1.5 rounded-lg text-yellow-300 border border-yellow-700/40 hover:bg-yellow-900/30 transition-all">
                            ⏸ Suspend
                          </button>
                          <button onClick={() => { if (confirm('Revoke this license?')) onManageAction(lic.id, 'revoke'); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg text-red-300 border border-red-700/40 hover:bg-red-900/30 transition-all">
                            🚫 Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

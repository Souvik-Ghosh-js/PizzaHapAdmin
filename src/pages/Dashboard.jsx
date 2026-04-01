import { useEffect, useState } from 'react';
import { getDashboard, getReports } from '../services/api';
import { Spinner, KpiCard, SectionCard, Tabs, PageHeader } from '../components/UI';
import { useAuth } from '../context';
import { fmt } from '../utils';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-strong)', borderRadius:10, padding:'0.75rem 1rem', fontSize:'0.8rem', boxShadow:'var(--shadow-md)' }}>
      <p style={{ color:'var(--text-muted)', marginBottom:6, fontSize:'0.7rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, fontWeight:600, marginBottom:2 }}>
          {p.name}: {p.name.toLowerCase().includes('revenue') ? fmt.currency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData]     = useState(null);
  const [reports, setReports] = useState([]);
  const [period, setPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);
  const { admin } = useAuth();

  useEffect(() => {
    setLoading(true);
    Promise.all([getDashboard(), getReports(period)])
      .then(([d, r]) => {
        setData(d.data);
        setReports(Array.isArray(r.data) ? r.data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="loading-center"><Spinner size="spinner-lg" /></div>;
  if (!data) return null;

  const chartData = [...reports].reverse().map(r => ({
    period: String(r.period || '').slice(-5),
    Revenue: Number(r.revenue || 0),
    Orders: Number(r.total_orders || 0),
    Delivered: Number(r.delivered || 0),
    Cancelled: Number(r.cancelled || 0),
  }));

  return (
    <div className="page-enter" style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <PageHeader 
        title="Admin Dashboard" 
        subtitle={`Real-time overview · ${admin?.location_name || 'All Branches'}`} 
      />

      {/* KPIs */}
      <div className="stats-grid">
        <KpiCard icon="📦" label="Today's Orders" value={fmt.number(data.today?.orders)} sub={`Revenue ${fmt.currency(data.today?.revenue)}`} color="var(--accent)" />
        <KpiCard icon="💰" label="Total Revenue" value={fmt.currency(data.total_revenue)} sub="All time (paid)" color="var(--green)" />
        <KpiCard icon="⏳" label="Pending Orders" value={fmt.number(data.pending_orders)} sub="Need attention" color="var(--amber)" />
        <KpiCard icon="👤" label="New Users Today" value={fmt.number(data.new_users_today)} sub="Registered today" color="var(--blue)" />
      </div>

      {/* Revenue chart */}
      <SectionCard
        title="Revenue & Order Trends"
        noPad
        actions={
          <Tabs active={period} onChange={setPeriod} tabs={[
            { value: 'daily',   label: 'Daily'   },
            { value: 'weekly',  label: 'Weekly'  },
            { value: 'monthly', label: 'Monthly' },
          ]} />
        }
      >
        <div className="chart-container">
          {chartData.length === 0
            ? <div style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)' }}>No data for this period</div>
            : <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top:8, right:20, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rev" tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => v>=1000?`₹${(v/1000).toFixed(0)}k`:`₹${v}`} />
                  <YAxis yAxisId="ord" orientation="right" tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize:'0.75rem', paddingTop:'0.5rem' }} />
                  <Area yAxisId="rev" type="monotone" dataKey="Revenue" stroke="var(--accent)" strokeWidth={2.5} fill="url(#gR)" dot={false} activeDot={{ r:5, fill:'var(--accent)' }} />
                  <Area yAxisId="ord" type="monotone" dataKey="Orders"  stroke="var(--blue)"   strokeWidth={2}   fill="url(#gO)" dot={false} activeDot={{ r:5, fill:'var(--blue)' }} />
                </AreaChart>
              </ResponsiveContainer>
          }
        </div>
      </SectionCard>

      {/* Bottom row */}
      <div className="grid-2">
        {/* Popular products */}
        <SectionCard title="🏆 Top Products" noPad>
          {(data.popular_products || []).length === 0
            ? <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>No sales data yet</div>
            : <div>
                {(data.popular_products || []).map((p, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.875rem', padding:'0.875rem 1.375rem', borderBottom: i < data.popular_products.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:'1.25rem', fontWeight:800, color: i===0?'var(--amber)':i===1?'var(--text-secondary)':'var(--text-muted)', width:22, textAlign:'center', flexShrink:0 }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                    </div>
                    <div style={{ width:40, height:40, borderRadius:10, overflow:'hidden', background:'var(--bg-overlay)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem' }}>
                      {p.image_url ? <img src={`${p.image_url}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '🍕'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="truncate font-semi" style={{ fontSize:'0.875rem' }}>{p.name}</div>
                      <div className="text-xs text-muted">{p.order_count} orders</div>
                    </div>
                    <div style={{ fontWeight:700, color:'var(--green)', whiteSpace:'nowrap', fontSize:'0.875rem' }}>{fmt.currency(p.revenue)}</div>
                  </div>
                ))}
              </div>
          }
        </SectionCard>

        {/* Delivery outcome chart */}
        <SectionCard title="📊 Delivered vs Cancelled" noPad>
          <div className="chart-container">
            {chartData.length === 0
              ? <div style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>No data</div>
              : <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData.slice(0,12)} margin={{ top:8, right:12, left:0, bottom:0 }} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="period" tick={{ fill:'var(--text-muted)', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'var(--text-muted)', fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize:'0.75rem' }} />
                    <Bar dataKey="Delivered" fill="var(--green)"  radius={[4,4,0,0]} maxBarSize={20} />
                    <Bar dataKey="Cancelled" fill="var(--red)"    radius={[4,4,0,0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

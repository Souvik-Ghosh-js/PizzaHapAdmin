import { useEffect, useState } from 'react';
import { getReports } from '../services/api';
import { Spinner, EmptyState, PageHeader, Tabs } from '../components/UI';
import { fmt } from '../utils';

export default function SalesReport() {
  const [reports, setReports] = useState([]);
  const [period, setPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getReports(period)
      .then((r) => setReports(Array.isArray(r.data) ? r.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="page-enter">
      <PageHeader 
        title="Sales Report" 
        subtitle="Detailed tabular view of your sales"
        actions={
          <Tabs active={period} onChange={setPeriod} tabs={[
            { value: 'daily',   label: 'Daily'   },
            { value: 'monthly', label: 'Monthly' },
          ]} />
        }
      />

      <div className="card">
        {loading
          ? <div className="loading-center"><Spinner /></div>
          : reports.length === 0
          ? <EmptyState icon="📊" title="No sales data found" subtitle={`No data available for ${period} period.`} />
          : <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{period === 'daily' ? 'Date' : 'Month'}</th>
                    <th>Revenue</th>
                    <th>Total Orders</th>
                    <th>Delivered</th>
                    <th>Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, idx) => (
                    <tr key={idx}>
                      <td className="font-semi text-accent">
                        {period === 'daily' && r.period ? fmt.date(r.period) : (r.period || '—')}
                      </td>
                      <td className="font-bold text-green">{fmt.currency(r.revenue || 0)}</td>
                      <td>{fmt.number(r.total_orders || 0)}</td>
                      <td>{fmt.number(r.delivered || 0)}</td>
                      <td className="text-red">{fmt.number(r.cancelled || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        }
      </div>
    </div>
  );
}

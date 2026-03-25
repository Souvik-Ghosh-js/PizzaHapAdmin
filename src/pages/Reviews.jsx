import { useEffect, useState, useCallback } from 'react';
import { getReviews } from '../services/api';
import { Pagination, Select, Spinner, EmptyState, PageHeader } from '../components/UI';
import { fmt } from '../utils';
import { useToast } from '../context';

const RATING_OPTS = [
  { value: '', label: 'All Ratings' },
  { value: '4', label: '4+ Stars' },
  { value: '3', label: '3+ Stars' },
  { value: '2', label: '2+ Stars' },
  { value: '1', label: '1+ Stars' },
];

function Stars({ count }) {
  const n = Number(count) || 0;
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= n ? 'var(--amber)' : 'var(--bg-overlay)', fontSize: '1rem' }}>★</span>
      ))}
    </div>
  );
}

export default function Reviews() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [pag, setPag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ min_rating: '', page: 1 });

  const load = useCallback(async (f) => {
    setLoading(true);
    try {
      const r = await getReviews(f);
      setReviews(r.data || []);
      setPag(r.pagination);
    } catch(e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(filters); }, [filters, load]);

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  return (
    <div className="page-enter">
      <PageHeader title="User Reviews" subtitle="Customer feedback and ratings"
        actions={
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <Select value={filters.min_rating} onChange={v => setF('min_rating', v)} options={RATING_OPTS} placeholder="All Ratings" style={{ minWidth: 150 }} />
          </div>
        }
      />

      <div className="card">
        {loading
          ? <div className="loading-center"><Spinner /></div>
          : reviews.length === 0
          ? <EmptyState icon="⭐" title="No reviews found" subtitle="Try adjusting filters" />
          : <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Ratings</th>
                    <th>Comment</th>
                    <th>Location</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="font-semi text-accent" style={{ fontSize: '0.8rem' }}>{r.order_number}</div>
                      </td>
                      <td>
                        <div className="font-medium" style={{ fontSize: '0.875rem' }}>{r.user_name || 'Anonymous'}</div>
                        <div className="text-xs text-muted">{r.user_mobile || '—'}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="text-xs text-muted" style={{ width: 45 }}>Food:</span>
                            <Stars count={r.food_rating} />
                          </div>
                          {r.delivery_rating && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="text-xs text-muted" style={{ width: 45 }}>Delivery:</span>
                              <Stars count={r.delivery_rating} />
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="font-semi text-xs" style={{ width: 45 }}>Overall:</span>
                            <Stars count={r.overall_rating} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-secondary" style={{ maxWidth: 300, whiteSpace: 'normal', fontStyle: 'italic' }}>
                          {r.comment ? `"${r.comment}"` : '—'}
                        </div>
                      </td>
                      <td><span className="text-sm text-secondary">{r.location_name || '—'}</span></td>
                      <td><span className="text-xs text-muted nowrap">{fmt.date(r.created_at)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pag} onPage={p => setFilters(f => ({ ...f, page: p }))} />
          </>
        }
      </div>
    </div>
  );
}

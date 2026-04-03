import { useEffect, useState } from 'react';
import { getSizePricing, setSizePricing, getToppings, getCrusts } from '../services/api';
import { Spinner, PageHeader } from '../components/UI';
import { useToast } from '../context';

const SIZE_CODES = ['regular', 'medium', 'large'];
const SIZE_LABELS = { regular: 'Regular', medium: 'Medium', large: 'Large' };
const TABS = ['Crusts', 'Toppings'];

export default function SizePricing() {
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allCrusts, setAllCrusts] = useState([]);
  const [allToppings, setAllToppings] = useState([]);
  // edited: { 'crust_<id>_<sizeCode>': price, 'topping_<id>_<sizeCode>': price }
  const [edited, setEdited] = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.all([getCrusts(), getToppings(), getSizePricing()])
      .then(([crustsRes, toppingsRes, pricingRes]) => {
        setAllCrusts(crustsRes.data || []);
        setAllToppings(toppingsRes.data || []);
        const init = {};
        (pricingRes.data?.crusts || []).forEach(o => {
          init[`crust_${o.crust_id}_${o.size_code}`] = o.extra_price;
        });
        (pricingRes.data?.toppings || []).forEach(o => {
          init[`topping_${o.topping_id}_${o.size_code}`] = o.price;
        });
        setEdited(init);
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const getVal = (type, id, sizeCode) => edited[`${type}_${id}_${sizeCode}`] ?? '';
  const setVal = (type, id, sizeCode, value) => {
    setEdited(prev => ({ ...prev, [`${type}_${id}_${sizeCode}`]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = [];
      for (const [key, value] of Object.entries(edited)) {
        if (value === '' || value == null) continue;
        const parts = key.split('_');
        const type = parts[0];
        const id = parseInt(parts[1]);
        const sizeCode = parts[2];
        promises.push(setSizePricing({ type, item_id: id, size_code: sizeCode, price: parseFloat(value) }));
      }
      await Promise.all(promises);
      toast('Size pricing saved successfully', 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-center"><Spinner /></div>;

  return (
    <div className="page-enter">
      <PageHeader title="Size-based Pricing"
        subtitle="Set different crust/topping prices for each pizza size"
        actions={
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Spinner className="spinner-sm" /> Saving...</> : 'Save All'}
          </button>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem' }}>
        {TABS.map((t, i) => (
          <button key={t}
            className={`btn btn-sm ${tab === i ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      <div className="card">
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', minWidth: 160 }}>Item</th>
                <th style={{ padding: '10px 12px' }}>Default Price</th>
                {SIZE_CODES.map(sc => (
                  <th key={sc} style={{ padding: '10px 12px', minWidth: 120 }}>{SIZE_LABELS[sc]} ({sc})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tab === 0 && allCrusts.map(crust => (
                <tr key={crust.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{crust.name}</td>
                  <td style={{ padding: '8px 12px' }}>Rs. {parseFloat(crust.extra_price).toFixed(2)}</td>
                  {SIZE_CODES.map(sc => (
                    <td key={sc} style={{ padding: '8px 12px' }}>
                      <input className="input" type="number" step="0.01"
                        placeholder={parseFloat(crust.extra_price).toFixed(2)}
                        style={{ width: 100 }}
                        value={getVal('crust', crust.id, sc)}
                        onChange={e => setVal('crust', crust.id, sc, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
              {tab === 1 && allToppings.map(top => (
                <tr key={top.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{top.name}</td>
                  <td style={{ padding: '8px 12px' }}>Rs. {parseFloat(top.price).toFixed(2)}</td>
                  {SIZE_CODES.map(sc => (
                    <td key={sc} style={{ padding: '8px 12px' }}>
                      <input className="input" type="number" step="0.01"
                        placeholder={parseFloat(top.price).toFixed(2)}
                        style={{ width: 100 }}
                        value={getVal('topping', top.id, sc)}
                        onChange={e => setVal('topping', top.id, sc, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

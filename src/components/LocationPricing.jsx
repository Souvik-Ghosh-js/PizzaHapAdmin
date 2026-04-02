import { useEffect, useState } from 'react';
import {
  getLocationPricing, setLocationPricing, deleteLocationPricing,
  getProductSizes, getProducts, getToppings, getCrusts,
} from '../services/api';
import { useToast } from '../context';
import { Spinner } from './UI';

const TABS = ['Sizes', 'Crusts', 'Toppings'];

export default function LocationPricing({ locationId, locationName, onClose }) {
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // All available items (defaults)
  const [allSizes, setAllSizes] = useState([]);
  const [allCrusts, setAllCrusts] = useState([]);
  const [allToppings, setAllToppings] = useState([]);

  // Existing overrides
  const [overrides, setOverrides] = useState({ sizes: [], crusts: [], toppings: [] });

  // Edited prices: { 'size_<id>': price, 'crust_<id>': price, 'topping_<id>': price }
  const [edited, setEdited] = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getLocationPricing(locationId),
      getProducts({ limit: 200 }),
      getToppings(),
      getCrusts(),
    ])
      .then(([pricingRes, productsRes, toppingsRes, crustsRes]) => {
        const pricingData = pricingRes.data || {};
        setOverrides({
          sizes: pricingData.sizes || [],
          crusts: pricingData.crusts || [],
          toppings: pricingData.toppings || [],
        });

        // Build sizes from all products
        const products = productsRes.data?.data || productsRes.data || [];
        const sizePromises = products.map(p =>
          getProductSizes(p.id).then(r => (r.data || []).map(s => ({ ...s, product_name: p.name }))).catch(() => [])
        );
        return Promise.all(sizePromises).then(sizeSets => {
          setAllSizes(sizeSets.flat());
          setAllCrusts(crustsRes.data || []);
          setAllToppings(toppingsRes.data || []);

          // Pre-fill edited prices from existing overrides
          const init = {};
          (pricingData.sizes || []).forEach(o => { init[`size_${o.product_size_id}`] = o.price; });
          (pricingData.crusts || []).forEach(o => { init[`crust_${o.crust_id}`] = o.extra_price; });
          (pricingData.toppings || []).forEach(o => { init[`topping_${o.topping_id}`] = o.price; });
          setEdited(init);
        });
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [locationId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = [];
      for (const [key, value] of Object.entries(edited)) {
        if (value === '' || value == null) continue;
        const [type, id] = key.split('_');
        promises.push(setLocationPricing({ type, item_id: parseInt(id), location_id: locationId, price: parseFloat(value) }));
      }
      await Promise.all(promises);
      toast('Pricing saved successfully', 'success');
      onClose?.();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>;
  }

  const getOverridePrice = (type, itemId) => {
    const key = `${type}_${itemId}`;
    return edited[key] ?? '';
  };

  const setPrice = (type, itemId, value) => {
    setEdited(prev => ({ ...prev, [`${type}_${itemId}`]: value }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p className="text-sm text-muted">
        Set custom prices for this location. Leave blank to use the default price.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map((t, i) => (
          <button key={t}
            className={`btn btn-sm ${tab === i ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '6px 6px 0 0' }}
            onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Item</th>
              <th style={{ padding: '8px 12px' }}>Default Price</th>
              <th style={{ padding: '8px 12px' }}>Location Price</th>
            </tr>
          </thead>
          <tbody>
            {tab === 0 && allSizes.map(size => (
              <tr key={size.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}>
                  <div>{size.product_name}</div>
                  <div className="text-xs text-muted">{size.size_name}</div>
                </td>
                <td style={{ padding: '8px 12px' }}>Rs. {parseFloat(size.price).toFixed(2)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <input className="input" type="number" step="0.01" placeholder="Default"
                    style={{ width: 120 }}
                    value={getOverridePrice('size', size.id)}
                    onChange={e => setPrice('size', size.id, e.target.value)} />
                </td>
              </tr>
            ))}
            {tab === 1 && allCrusts.map(crust => (
              <tr key={crust.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}>{crust.name}</td>
                <td style={{ padding: '8px 12px' }}>Rs. {parseFloat(crust.extra_price).toFixed(2)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <input className="input" type="number" step="0.01" placeholder="Default"
                    style={{ width: 120 }}
                    value={getOverridePrice('crust', crust.id)}
                    onChange={e => setPrice('crust', crust.id, e.target.value)} />
                </td>
              </tr>
            ))}
            {tab === 2 && allToppings.map(top => (
              <tr key={top.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px' }}>{top.name}</td>
                <td style={{ padding: '8px 12px' }}>Rs. {parseFloat(top.price).toFixed(2)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <input className="input" type="number" step="0.01" placeholder="Default"
                    style={{ width: 120 }}
                    value={getOverridePrice('topping', top.id)}
                    onChange={e => setPrice('topping', top.id, e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><Spinner className="spinner-sm" /> Saving...</> : 'Save Pricing'}
        </button>
      </div>
    </div>
  );
}

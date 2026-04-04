import { useEffect, useState } from 'react';
import {
  getLocationPricing, setLocationPricing, deleteLocationPricing,
  getProductSizes, getProducts, getToppings, getCrusts, getCategories,
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
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');

  // Existing overrides
  const [overrides, setOverrides] = useState({ sizes: [], crusts: [], toppings: [] });

  // { 'size_<id>': price, 'crust_<id>': price, 'topping_<id>': price }
  const [edited, setEdited] = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getLocationPricing(locationId),
      getCategories(),
      getToppings(),
      getCrusts(),
    ])
      .then(([pricingRes, catsRes, toppingsRes, crustsRes]) => {
        const pricingData = pricingRes.data || {};
        setOverrides({
          sizes: pricingData.sizes || [],
          crusts: pricingData.crusts || [],
          toppings: pricingData.toppings || [],
        });
        setAllCategories(catsRes.data || []);
        setAllCrusts(crustsRes.data || []);
        setAllToppings(toppingsRes.data || []);

        const init = {};
        (pricingData.sizes || []).forEach(o => { init[`size_${o.product_size_id}`] = o.price; });
        (pricingData.crusts || []).forEach(o => { init[`crust_${o.crust_id}`] = o.extra_price; });
        (pricingData.toppings || []).forEach(o => { init[`topping_${o.topping_id}`] = o.price; });
        (pricingData.crust_size_overrides || []).forEach(o => { init[`crust_${o.crust_id}_${o.size_code}`] = o.extra_price; });
        (pricingData.topping_size_overrides || []).forEach(o => { init[`topping_${o.topping_id}_${o.size_code}`] = o.price; });
        setEdited(init);

        // Load INITIAL products and sizes
        return fetchProductsAndSizes('all');
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [locationId]);

  const fetchProductsAndSizes = async (categoryId) => {
    try {
      const params = { limit: 500 };
      if (categoryId !== 'all') params.category_id = categoryId;
      
      const productsRes = await getProducts(params);
      const products = productsRes.data?.data || productsRes.data || [];
      
      // Batch fetch sizes to be more efficient (still separate calls but limited by products in cat)
      const sizePromises = products.map(p =>
        getProductSizes(p.id).then(r => (r.data?.sizes || []).map(s => ({ 
          ...s, 
          product_name: p.name,
          category_id: p.category_id 
        }))).catch(() => [])
      );
      
      const sizeSets = await Promise.all(sizePromises);
      const allItems = [];
      products.forEach((p, i) => {
        const productSizes = sizeSets[i];
        if (productSizes && productSizes.length > 0) {
          allItems.push(...productSizes);
        } else {
          allItems.push({
            id: `base-${p.id}`,
            product_id: p.id,
            product_name: p.name,
            size_name: 'Base Price (No sizes)',
            price: p.base_price,
            no_sizes: true
          });
        }
      });
      setAllSizes(allItems);
    } catch (e) {
      toast('Failed to load products: ' + e.message, 'error');
    }
  };

  const handleCategoryChange = async (catId) => {
    setSelectedCat(catId);
    setLoading(true);
    await fetchProductsAndSizes(catId);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = [];
      for (const [key, value] of Object.entries(edited)) {
        const parts = key.split('_');
        const type = parts[0];
        const id = parts[1];
        const size_code = parts[2]; // Optional

        if (value === '' || value == null) {
          promises.push(deleteLocationPricing(id, type, locationId).then(() => {
            if (size_code) return deleteLocationPricing(id, type, locationId, size_code);
          }));
        } else {
          promises.push(setLocationPricing({ 
            type, item_id: parseInt(id), location_id: locationId, price: parseFloat(value),
            ...(size_code ? { size_code } : {})
          }));
        }
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

      {/* Tabs and Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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

        {tab === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-xs font-semi text-muted">Category:</span>
            <select className="input" style={{ width: 150, height: 32, fontSize: '0.8rem', padding: '0 8px' }}
              value={selectedCat} onChange={e => handleCategoryChange(e.target.value)}>
              <option value="all">All Products</option>
              {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
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
                  <input className="input" type="number" step="0.01" 
                    placeholder={size.no_sizes ? "Action required" : "Default"}
                    disabled={size.no_sizes}
                    title={size.no_sizes ? "Add a size in Menu to set price" : ""}
                    style={{ width: 120, opacity: size.no_sizes ? 0.6 : 1 }}
                    value={getOverridePrice('size', size.id)}
                    onChange={e => setPrice('size', size.id, e.target.value)} />
                  {size.no_sizes && <div className="text-xs text-danger" style={{marginTop: 2}}>Need size in Menu</div>}
                </td>
              </tr>
            ))}
            {tab === 1 && allCrusts.map(crust => (
              ['regular', 'medium', 'large'].map(sz => {
                const sName = sz.charAt(0).toUpperCase() + sz.slice(1);
                return (
                  <tr key={`${crust.id}_${sz}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div>{crust.name}</div>
                      <div className="text-xs text-muted">{sName} Size</div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>Rs. {parseFloat(crust.extra_price).toFixed(2)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <input className="input" type="number" step="0.01" placeholder="Default"
                        style={{ width: 120 }}
                        value={getOverridePrice('crust', `${crust.id}_${sz}`)}
                        onChange={e => setPrice('crust', `${crust.id}_${sz}`, e.target.value)} />
                    </td>
                  </tr>
                );
              })
            ))}
            {tab === 2 && allToppings.map(top => (
              ['regular', 'medium', 'large'].map(sz => {
                const sName = sz.charAt(0).toUpperCase() + sz.slice(1);
                return (
                  <tr key={`${top.id}_${sz}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div>{top.name}</div>
                      <div className="text-xs text-muted">{sName} Size</div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>Rs. {parseFloat(top.price).toFixed(2)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <input className="input" type="number" step="0.01" placeholder="Default"
                        style={{ width: 120 }}
                        value={getOverridePrice('topping', `${top.id}_${sz}`)}
                        onChange={e => setPrice('topping', `${top.id}_${sz}`, e.target.value)} />
                    </td>
                  </tr>
                );
              })
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

import { useEffect, useState } from 'react';
import { getSizePricing, setSizePricing, getToppings, getCrusts, getCategories, getProducts, getProductSizes, updateProductSize } from '../services/api';
import { Spinner, PageHeader, Select } from '../components/UI';
import { useToast } from '../context';

const SIZE_CODES = ['regular', 'medium', 'large'];
const SIZE_LABELS = { regular: 'Regular', medium: 'Medium', large: 'Large' };
const TABS = ['Products', 'Crusts', 'Toppings'];

export default function SizePricing() {
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allCrusts, setAllCrusts] = useState([]);
  const [allToppings, setAllToppings] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allSizes, setAllSizes] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  // edited: { 'crust_<id>_<sizeCode>': price, 'topping_<id>_<sizeCode>': price, 'product_<pid>_<sid>': price }
  const [edited, setEdited] = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.all([getCrusts(), getToppings(), getSizePricing(), getCategories()])
      .then(([crustsRes, toppingsRes, pricingRes, catsRes]) => {
        setAllCrusts(crustsRes.data || []);
        setAllToppings(toppingsRes.data || []);
        setAllCategories(catsRes.data || []);
        const init = {};
        (pricingRes.data?.crusts || []).forEach(o => {
          init[`crust_${o.crust_id}_${o.size_code}`] = o.extra_price;
        });
        (pricingRes.data?.toppings || []).forEach(o => {
          init[`topping_${o.topping_id}_${o.size_code}`] = o.price;
        });
        setEdited(init);
        // Load initial products
        return fetchProductsAndSizes('all');
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const fetchProductsAndSizes = async (catId) => {
    try {
      const params = { limit: 500 };
      if (catId !== 'all') params.category_id = catId;
      const res = await getProducts(params);
      const prods = res.data?.data || res.data || [];
      const sizePromises = prods.map(p => 
        getProductSizes(p.id).then(r => (r.data?.sizes || []).map(s => ({ ...s, product_name: p.name, product_id: p.id }))).catch(() => [])
      );
      const sizeSets = await Promise.all(sizePromises);
      const allItems = [];
      prods.forEach((p, i) => {
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
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleCatChange = async (catId) => {
    setSelectedCat(catId);
    setLoading(true);
    await fetchProductsAndSizes(catId);
    setLoading(false);
  };

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
        
        if (type === 'product') {
          const sid = parseInt(parts[2]);
          promises.push(updateProductSize(id, sid, { price: parseFloat(value) }));
        } else {
          const sizeCode = parts[2];
          promises.push(setSizePricing({ type, item_id: id, size_code: sizeCode, price: parseFloat(value) }));
        }
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

      {/* Tabs and Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map((t, i) => (
            <button key={t}
              className={`btn btn-sm ${tab === i ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(i)}>
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="text-sm font-semi text-muted">Category:</span>
            <select className="input" style={{ width: 160, height: 36, fontSize: '0.85rem' }} value={selectedCat} onChange={e => handleCatChange(e.target.value)}>
              <option value="all">All products</option>
              {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', minWidth: 160 }}>Item</th>
                <th style={{ padding: '10px 12px' }}>Default Price</th>
                {tab === 0 ? <th style={{ padding: '10px 12px' }}>New Price</th>
                  : SIZE_CODES.map(sc => (
                    <th key={sc} style={{ padding: '10px 12px', minWidth: 120 }}>{SIZE_LABELS[sc]} ({sc})</th>
                  ))
                }
              </tr>
            </thead>
            <tbody>
              {tab === 0 && allSizes.map(size => (
                <tr key={size.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                    <div>{size.product_name}</div>
                    <div className="text-xs text-muted">{size.size_name}</div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>Rs. {parseFloat(size.price).toFixed(2)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <input className="input" type="number" step="0.01"
                      placeholder={size.no_sizes ? "Action required" : parseFloat(size.price).toFixed(2)}
                      disabled={size.no_sizes}
                      title={size.no_sizes ? "Add a size in Menu to set price" : ""}
                      style={{ width: 120, opacity: size.no_sizes ? 0.6 : 1 }}
                      value={getVal('product', size.product_id, size.id)}
                      onChange={e => setVal('product', size.product_id, size.id, e.target.value)} />
                    {size.no_sizes && <div className="text-xs text-danger" style={{marginTop: 2}}>Need size in Menu</div>}
                  </td>
                </tr>
              ))}
              {tab === 1 && allCrusts.map(crust => (
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
              {tab === 2 && allToppings.map(top => (
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

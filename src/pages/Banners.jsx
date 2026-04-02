import { useEffect, useState } from 'react';
import { getBanners, createBanner, updateBanner, deleteBanner } from '../services/api';
import { Badge, Spinner, Modal, Field, Toggle, PageHeader } from '../components/UI';
import { useToast } from '../context';

const ICON_OPTIONS = [
  { value: 'local_shipping', label: 'Delivery Truck' },
  { value: 'auto_awesome', label: 'Sparkle' },
  { value: 'eco', label: 'Eco / Leaf' },
  { value: 'local_offer', label: 'Offer Tag' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'star', label: 'Star' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'loyalty', label: 'Loyalty' },
  { value: 'new_releases', label: 'New Releases' },
  { value: 'whatshot', label: 'Trending / Hot' },
];

export default function Banners() {
  const toast = useToast();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getBanners()
      .then(r => setBanners(r.data || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.badge_text || !form.title_text) {
      toast('Badge text and title text are required', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (modal === 'create') {
        await createBanner(form);
        toast('Banner created', 'success');
      } else {
        await updateBanner(form.id, form);
        toast('Banner updated', 'success');
      }
      setModal(null);
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await deleteBanner(id);
      toast('Banner deleted', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const defaultForm = {
    badge_text: '', title_text: '', gradient_start: '#991515', gradient_end: '#FF6B35',
    icon_name: 'local_offer', sort_order: 0, is_active: true, valid_from: '', valid_until: '',
  };

  return (
    <div className="page-enter">
      <PageHeader title="Banners"
        actions={
          <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setModal('create'); }}>
            + Add Banner
          </button>
        }
      />

      {loading ? (
        <div className="loading-center"><Spinner /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {banners.map(b => (
            <div key={b.id} className="card card-pad">
              {/* Gradient preview */}
              <div style={{
                background: `linear-gradient(135deg, ${b.gradient_start}, ${b.gradient_end})`,
                borderRadius: 8, padding: '1rem', marginBottom: '0.75rem', color: '#fff', minHeight: 80,
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                <div style={{ fontSize: '0.65rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  {b.badge_text}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.3 }}>
                  {b.title_text}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={b.is_active ? 'active' : 'inactive'}>{b.is_active ? 'Active' : 'Inactive'}</Badge>
                  <span className="text-xs text-muted">Order: {b.sort_order}</span>
                  {b.icon_name && <span className="text-xs text-muted">Icon: {b.icon_name}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => {
                    setForm({
                      ...b,
                      is_active: !!b.is_active,
                      valid_from: b.valid_from ? b.valid_from.slice(0, 16) : '',
                      valid_until: b.valid_until ? b.valid_until.slice(0, 16) : '',
                    });
                    setModal('edit');
                  }}>Edit</button>
                  <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }}
                    onClick={() => handleDelete(b.id)}>Delete</button>
                </div>
              </div>

              {(b.valid_from || b.valid_until) && (
                <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                  {b.valid_from && <span>From: {new Date(b.valid_from).toLocaleDateString()}</span>}
                  {b.valid_from && b.valid_until && <span> &mdash; </span>}
                  {b.valid_until && <span>Until: {new Date(b.valid_until).toLocaleDateString()}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add Banner' : 'Edit Banner'} size="modal-lg"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner className="spinner-sm" /> Saving...</> : 'Save'}
          </button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Badge Text" required>
            <input className="input" {...F('badge_text')} placeholder="Special Offer" />
          </Field>
          <Field label="Title Text" required>
            <textarea className="input" {...F('title_text')} placeholder="Free delivery on orders above Rs.300!" rows={2} />
          </Field>
          <div className="grid-2">
            <Field label="Gradient Start Color">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.gradient_start || '#991515'}
                  onChange={e => setForm(f => ({ ...f, gradient_start: e.target.value }))}
                  style={{ width: 40, height: 32, border: 'none', cursor: 'pointer' }} />
                <input className="input" value={form.gradient_start || '#991515'}
                  onChange={e => setForm(f => ({ ...f, gradient_start: e.target.value }))}
                  style={{ flex: 1 }} />
              </div>
            </Field>
            <Field label="Gradient End Color">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.gradient_end || '#FF6B35'}
                  onChange={e => setForm(f => ({ ...f, gradient_end: e.target.value }))}
                  style={{ width: 40, height: 32, border: 'none', cursor: 'pointer' }} />
                <input className="input" value={form.gradient_end || '#FF6B35'}
                  onChange={e => setForm(f => ({ ...f, gradient_end: e.target.value }))}
                  style={{ flex: 1 }} />
              </div>
            </Field>
          </div>

          {/* Gradient preview */}
          <div style={{
            background: `linear-gradient(135deg, ${form.gradient_start || '#991515'}, ${form.gradient_end || '#FF6B35'})`,
            borderRadius: 8, padding: '0.75rem 1rem', color: '#fff', fontSize: '0.8rem',
          }}>
            Preview: {form.badge_text || 'Badge'} — {form.title_text || 'Title'}
          </div>

          <div className="grid-2">
            <Field label="Icon Name">
              <select className="input" value={form.icon_name || 'local_offer'}
                onChange={e => setForm(f => ({ ...f, icon_name: e.target.value }))}>
                {ICON_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Sort Order">
              <input className="input" type="number" {...F('sort_order')} />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Valid From">
              <input className="input" type="datetime-local" {...F('valid_from')} />
            </Field>
            <Field label="Valid Until">
              <input className="input" type="datetime-local" {...F('valid_until')} />
            </Field>
          </div>
          <Toggle checked={form.is_active === true || form.is_active === 1}
            onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Banner Active" />
        </div>
      </Modal>
    </div>
  );
}

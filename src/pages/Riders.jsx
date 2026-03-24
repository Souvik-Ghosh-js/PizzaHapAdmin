import { useEffect, useState } from 'react';
import { getRiders, createRider, updateRider, deleteRider, getLocations } from '../services/api';
import { Badge, Spinner, EmptyState, Modal, Field, PageHeader } from '../components/UI';
import { fmt } from '../utils';
import { useToast } from '../context';

export default function Riders() {
  const toast = useToast();
  const [riders, setRiders]     = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setL]         = useState(true);
  const [modal, setModal]       = useState(null); // null | 'add' | 'edit'
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);

  const load = () => {
    setL(true);
    Promise.all([getRiders(), getLocations()])
      .then(([r, l]) => { setRiders(r.data || []); setLocations(l.data || []); })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setL(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({}); setModal('add'); };
  const openEdit = (rider) => { setForm({ ...rider }); setModal('edit'); };

  const save = async () => {
    if (!form.name?.trim()) { toast('Name is required', 'warning'); return; }
    if (!form.phone?.trim()) { toast('Phone is required', 'warning'); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        await createRider({
          name: form.name.trim(),
          phone: form.phone.trim(),
          ...(form.location_id ? { location_id: parseInt(form.location_id) } : {}),
        });
        toast('Rider added', 'success');
      } else {
        await updateRider(form.id, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          is_active: form.is_active,
          ...(form.location_id ? { location_id: parseInt(form.location_id) } : { location_id: null }),
        });
        toast('Rider updated', 'success');
      }
      setModal(null);
      load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (rider) => {
    try {
      await updateRider(rider.id, { is_active: !rider.is_active });
      toast(rider.is_active ? 'Rider deactivated' : 'Rider activated', 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  const deactivate = async (rider) => {
    if (!window.confirm(`Remove rider "${rider.name}"? This will deactivate them.`)) return;
    try {
      await deleteRider(rider.id);
      toast('Rider removed', 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  return (
    <div className="page-enter">
      <PageHeader
        title="Delivery Riders"
        subtitle="Manage your delivery team"
        actions={<button className="btn btn-primary" onClick={openAdd}>+ Add Rider</button>}
      />

      <div className="card">
        {loading
          ? <div className="loading-center"><Spinner /></div>
          : riders.length === 0
          ? <EmptyState icon="🛵" title="No riders yet" subtitle="Add your first delivery rider" />
          : <div className="table-wrap"><table>
              <thead><tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Since</th>
                <th>Actions</th>
              </tr></thead>
              <tbody>
                {riders.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-semi" style={{ fontSize: '0.875rem' }}>{r.name}</div>
                    </td>
                    <td><span className="text-sm">{r.phone}</span></td>
                    <td><span className="text-sm text-secondary">{r.location_name || '—'}</span></td>
                    <td>
                      <Badge status={r.is_active ? 'active' : 'inactive'}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td><span className="text-xs text-muted">{fmt.date(r.created_at)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(r)}>Edit</button>
                        <button
                          className={`btn btn-sm ${r.is_active ? 'btn-ghost' : 'btn-success'}`}
                          onClick={() => toggleActive(r)}
                          style={{ fontSize: '0.75rem' }}>
                          {r.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deactivate(r)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
        }
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Rider' : 'Edit Rider'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner className="spinner-sm" />Saving…</> : modal === 'add' ? 'Add Rider' : 'Save Changes'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <Field label="Name" required>
              <input className="input" {...F('name')} placeholder="Rider full name" />
            </Field>
            <Field label="Phone" required>
              <input className="input" type="tel" {...F('phone')} placeholder="9876543210" />
            </Field>
          </div>
          <Field label="Assign Branch">
            <select className="input" value={form.location_id ?? ''} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}>
              <option value="">Any / Unassigned</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
          {modal === 'edit' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                />
                Active
              </label>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

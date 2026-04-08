import { useState, useEffect } from 'react';
import { 
  getAllAdmins, createAdmin, updateAdmin, deleteAdminAccount, getLocations 
} from '../services/api';
import { 
  Spinner, Badge, Modal, Confirm, Field, 
  SearchInput, Select, Toggle, PageHeader, SectionCard, KpiCard, EmptyState 
} from '../components/UI';
import { useAuth } from '../context';
import { Shield, Mail, MapPin, Calendar, MoreHorizontal, UserPlus, Key, Trash2 } from 'lucide-react';

export default function Admins() {
  const { admin: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'admin', location_id: '', is_active: true
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [a, l] = await Promise.all([getAllAdmins(), getLocations()]);
      setAdmins(a.data || []);
      setLocations(l.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (admin = null) => {
    if (admin) {
      setEditing(admin);
      setForm({
        name: admin.name,
        email: admin.email,
        password: '',
        role: admin.role,
        location_id: admin.location_id || '',
        is_active: admin.is_active === 1
      });
    } else {
      setEditing(null);
      setForm({ name: '', email: '', password: '', role: 'admin', location_id: '', is_active: true });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editing) await updateAdmin(editing.id, form);
      else await createAdmin(form);
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Saving failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await deleteAdminAccount(showDelete.id);
      setShowDelete(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = admins.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && admins.length === 0) return <div className="loading-center"><Spinner size="spinner-lg" /></div>;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PageHeader 
        title="Admin Management" 
        subtitle="Manage administrative staff and location access"
        actions={
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <UserPlus size={16} /> Create Admin
          </button>
        }
      />

      {/* Stats row */}
      <div className="stats-grid">
        <KpiCard label="Total Staff" value={admins.length} icon={<Shield style={{color:'var(--blue)'}}/>} color="var(--blue)" />
        <KpiCard label="Active" value={admins.filter(a => a.is_active).length} icon={<Shield style={{color:'var(--green)'}}/>} color="var(--green)" />
        <KpiCard label="Super Admins" value={admins.filter(a => a.role === 'super_admin').length} icon={<Shield style={{color:'var(--amber)'}}/>} color="var(--amber)" />
      </div>

      <SectionCard
        title="Administrative Accounts"
        noPad
        actions={<SearchInput value={search} onChange={setSearch} placeholder="Search by name/email..." />}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Profile</th>
                <th>Access Level</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Last Login</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6"><EmptyState title="No admins found" subtitle={search ? "Try a different search" : "Get started by creating your first team member"} /></td>
                </tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div className="admin-avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                          {a.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={12} /> {a.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge status={a.role === 'super_admin' ? 'confirmed' : 'open'}>
                        {a.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td>
                      {a.location_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                          <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                          {a.location_name}
                        </div>
                      ) : (
                        <span className="badge badge-inactive">All Branches</span>
                      )}
                    </td>
                    <td>
                      <Badge status={a.is_active ? 'active' : 'blocked'}>
                        {a.is_active ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} />
                        {a.last_login ? new Date(a.last_login).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => handleOpenModal(a)} title="Edit Account">
                          <MoreHorizontal size={16} />
                        </button>
                        {a.id !== currentAdmin?.id && (
                          <button className="btn btn-ghost btn-danger btn-icon" onClick={() => setShowDelete(a)} title="Delete Account">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Edit/Create Modal */}
      <Modal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        title={editing ? `Edit ${editing.name}` : 'New Admin Account'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Spinner className="spinner-sm" /> : editing ? 'Update Account' : 'Create Account'}
          </button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Field label="Full Name" required>
            <input type="text" className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe" />
          </Field>
          
          <Field label="Email Address" required>
            <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="admin@pizzahap.com" />
          </Field>

          <Field label={editing ? "Update Password" : "Password"} hint={editing ? "Leave blank to keep current" : "Minimum 6 characters"} required={!editing}>
            <div style={{ position: 'relative' }}>
              <Key size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="password" style={{ paddingLeft: 34 }} className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••" />
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Role">
              <Select 
                placeholder={null}
                value={form.role} 
                onChange={v => setForm({...form, role: v})}
                options={[
                  { value: 'admin', label: 'Branch Admin' },
                  { value: 'staff', label: 'Branch Staff' },
                  { value: 'super_admin', label: 'Super Admin' },
                ]}
              />
            </Field>

            <Field label="Assign Location">
              <Select 
                placeholder="Global (All Branches)"
                value={form.location_id} 
                onChange={v => setForm({...form, location_id: v})}
                options={locations.map(l => ({ value: l.id, label: l.name }))}
              />
            </Field>
          </div>

          <Field>
            <Toggle label="Account Enabled" checked={form.is_active} onChange={v => setForm({...form, is_active: v})} />
          </Field>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Confirm 
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        onConfirm={handleDelete}
        title="Delete Admin Account"
        message={`Are you sure you want to delete ${showDelete?.name}? This action cannot be undone and they will immediately lose access.`}
        danger
        loading={submitting}
      />
    </div>
  );
}


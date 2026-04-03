const BASE        = 'https://api.gobt.in/api/admin';
const BASE_PUBLIC = 'https://api.gobt.in/api';

let _token = null;

export const setToken  = (t) => { _token = t; localStorage.setItem('admin_token', t); };
export const getToken  = () => _token || localStorage.getItem('admin_token');
export const clearToken= () => { _token = null; localStorage.removeItem('admin_token'); localStorage.removeItem('admin_info'); };

const getAdminInfo = () => {
  try { return JSON.parse(localStorage.getItem('admin_info') || '{}'); } catch { return {}; }
};

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

async function req(method, path, body, isForm = false) {
  const opts = {
    method,
    headers: isForm ? { Authorization: `Bearer ${getToken()}` } : headers(),
  };
  if (body) opts.body = isForm ? body : JSON.stringify(body);
  const res  = await fetch(BASE + path, opts);
  const json = await res.json().catch(() => ({}));
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json;
}

const get      = (p)    => req('GET',    p);
const post     = (p, b) => req('POST',   p, b);
const put      = (p, b) => req('PUT',    p, b);
const del      = (p)    => req('DELETE', p);
const postForm = (p, b) => req('POST',   p, b, true);

// ── Auth ──────────────────────────────────────────────────────────
export const login = (email, password, location_id) =>
  post('/auth/login', { email, password, ...(location_id ? { location_id } : {}) });

// Location picker uses admin token — called AFTER login
export const getLocationsAuthed = () => get('/locations');

// ── Dashboard ─────────────────────────────────────────────────────
export const getDashboard = () => {
  const admin = getAdminInfo();
  const loc = admin.location_id;
  return get(`/dashboard${loc ? '?location_id=' + loc : ''}`);
};
export const getReports   = (period = 'daily') => {
  const admin = getAdminInfo();
  const loc = admin.location_id;
  return get(`/dashboard/reports?period=${period}${loc ? '&location_id=' + loc : ''}`);
};

// ── Orders ────────────────────────────────────────────────────────
export const getOrders = (params = {}) => {
  const admin = getAdminInfo();
  const merged = { ...params };
  if (admin.location_id && merged.location_id === undefined) merged.location_id = admin.location_id;
  const q = new URLSearchParams(Object.entries(merged).filter(([,v]) => v != null && v !== '')).toString();
  return get(`/orders${q ? '?' + q : ''}`);
};
export const getOrderDetail      = (id)              => get(`/orders/${id}`);
export const updateOrderStatus   = (id, status, note)=> put(`/orders/${id}/status`, { status, note });
export const updatePaymentStatus = (id, ps, note)    => put(`/orders/${id}/payment-status`, { payment_status: ps, note });
export const acceptRejectOrder   = (id, data)        => put(`/orders/${id}/accept-reject`, data);
export const getInvoice          = (id)              => get(`/orders/${id}/invoice`);
export const placeInhouseOrder   = (data)            => post('/orders/inhouse', data);

// ── Users ─────────────────────────────────────────────────────────
export const getUsers  = (params = {}) => {
  const admin = getAdminInfo();
  const merged = { ...params };
  if (admin.location_id && merged.location_id === undefined) merged.location_id = admin.location_id;
  const q = new URLSearchParams(Object.entries(merged).filter(([,v]) => v != null && v !== '')).toString();
  return get(`/users${q ? '?' + q : ''}`);
};
export const blockUser = (id, is_blocked) => put(`/users/${id}/block`, { is_blocked });

// ── Categories ────────────────────────────────────────────────────
export const getCategories    = (params = {}) => {
  const admin = getAdminInfo();
  const merged = { ...params };
  if (admin.location_id && merged.location_id === undefined) merged.location_id = admin.location_id;
  const q = new URLSearchParams(Object.entries(merged).filter(([,v]) => v != null && v !== '')).toString();
  return get(`/menu/categories${q ? '?' + q : ''}`);
};
export const createCategory   = (data)      => post('/menu/categories', data);
export const updateCategory   = (id, data)  => put(`/menu/categories/${id}`, data);
export const deleteCategory   = (id)         => del(`/menu/categories/${id}`);
export const uploadCategoryImage = (id, file) => {
  const fd = new FormData(); fd.append('image', file);
  return postForm(`/menu/categories/${id}/image`, fd);
};

// ── Products ──────────────────────────────────────────────────────
export const getProducts = (params = {}) => {
  const admin = getAdminInfo();
  const merged = { ...params };
  if (admin.location_id && merged.location_id === undefined) merged.location_id = admin.location_id;
  const q = new URLSearchParams(Object.entries(merged).filter(([,v]) => v != null && v !== '')).toString();
  return get(`/menu/products${q ? '?' + q : ''}`);
};
export const createProduct        = (data)       => post('/menu/products', data);
export const updateProduct        = (id, data)   => put(`/menu/products/${id}`, data);
export const deleteProduct        = (id)         => del(`/menu/products/${id}`);
export const uploadProductImage   = (id, file)   => {
  const fd = new FormData(); fd.append('image', file);
  return postForm(`/menu/products/${id}/image`, fd);
};
export const setProductLocation    = (id, data)  => put(`/menu/products/${id}/location-availability`, data);
export const getAvailabilityMatrix = (id)        => get(`/menu/products/${id}/availability-matrix`);

// Product Sizes
export const getProductSizes    = (pid, params = {}) => {
  const admin = getAdminInfo();
  const merged = { ...params };
  if (admin.location_id && merged.location_id === undefined) merged.location_id = admin.location_id;
  const q = new URLSearchParams(Object.entries(merged).filter(([,v]) => v != null && v !== '')).toString();
  return get(`/menu/products/${pid}/sizes${q ? '?' + q : ''}`);
};
export const createProductSize  = (pid, data)    => post(`/menu/products/${pid}/sizes`, data);
export const updateProductSize  = (pid,sid,data) => put(`/menu/products/${pid}/sizes/${sid}`, data);
export const deleteProductSize  = (pid, sid)     => del(`/menu/products/${pid}/sizes/${sid}`);

// ── Toppings ──────────────────────────────────────────────────────
export const getToppings   = (params = {}) => {
  const admin = getAdminInfo();
  const merged = { ...params };
  if (admin.location_id && merged.location_id === undefined) merged.location_id = admin.location_id;
  const q = new URLSearchParams(Object.entries(merged).filter(([,v]) => v != null && v !== '')).toString();
  return get('/menu/toppings' + (q ? '?' + q : ''));
};
export const createTopping = (data)      => post('/menu/toppings', data);
export const updateTopping = (id, data)  => put(`/menu/toppings/${id}`, data);
export const deleteTopping = (id)        => del(`/menu/toppings/${id}`);

// ── Crusts ────────────────────────────────────────────────────────
export const getCrusts    = (params = {}) => {
  const admin = getAdminInfo();
  const merged = { ...params };
  if (admin.location_id && merged.location_id === undefined) merged.location_id = admin.location_id;
  const q = new URLSearchParams(Object.entries(merged).filter(([,v]) => v != null && v !== '')).toString();
  return get('/menu/crusts' + (q ? '?' + q : ''));
};
export const createCrust  = (data)      => post('/menu/crusts', data);
export const updateCrust  = (id, data)  => put(`/menu/crusts/${id}`, data);
export const deleteCrust  = (id)        => del(`/menu/crusts/${id}`);

// ── Locations ─────────────────────────────────────────────────────
export const getLocations   = ()          => get('/locations');
export const createLocation = (data)      => post('/locations', data);
export const updateLocation = (id, data)  => put(`/locations/${id}`, data);

// ── Coupons ───────────────────────────────────────────────────────
export const getCoupons    = ()          => get('/coupons');
export const createCoupon  = (data)      => post('/coupons', data);
export const updateCoupon  = (id, data)  => put(`/coupons/${id}`, data);
export const validateCoupon = (code, order_value) =>
  fetch(BASE_PUBLIC + '/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: JSON.stringify({ code, order_value }),
  }).then(r => r.json()).then(j => { if (!j.success) throw new Error(j.message || 'Invalid coupon'); return j; });

// ── Riders ────────────────────────────────────────────────────────
export const getRiders    = ()          => {
  const admin = getAdminInfo();
  const loc = admin.location_id;
  return get(`/riders${loc ? '?location_id=' + loc : ''}`);
};
export const createRider  = (data)      => post('/riders', data);
export const updateRider  = (id, data)  => put(`/riders/${id}`, data);
export const deleteRider  = (id)        => del(`/riders/${id}`);
export const assignRider  = (orderId, rider_id) => put(`/orders/${orderId}/rider`, { rider_id });

// ── Notifications ─────────────────────────────────────────────────
export const getNotifications      = () => {
  const admin = getAdminInfo();
  const loc = admin.location_id;
  return get(`/notifications${loc ? '?location_id=' + loc : ''}`);
};
export const markAllNotifsRead     = () => put('/notifications/read-all', {});
export const markOneNotifRead      = (id) => put(`/notifications/${id}/read`, {});
export const broadcastNotification = (data) => post('/notifications/broadcast', data);

// ── Refunds ───────────────────────────────────────────────────────
export const getRefunds    = (status) => {
  const admin = getAdminInfo();
  const loc = admin.location_id;
  return get(`/refunds?${status ? 'status=' + status + '&' : ''}${loc ? 'location_id=' + loc : ''}`);
};
export const processRefund = (id, action, notes) => post(`/refunds/${id}/process`, { action, notes });

// ── Support ───────────────────────────────────────────────────────
export const getSupportTickets = (params = {}) => {
  const admin = getAdminInfo();
  const merged = { ...params };
  if (admin.location_id && merged.location_id === undefined) merged.location_id = admin.location_id;
  const q = new URLSearchParams(Object.entries(merged).filter(([,v]) => v != null && v !== '')).toString();
  return get(`/support/tickets${q ? '?' + q : ''}`);
};
export const replyToTicket = (id, message, status) =>
  post(`/support/tickets/${id}/reply`, { message, ...(status ? { status } : {}) });

// ── Banners ──────────────────────────────────────────────────────
export const getBanners    = ()          => get('/banners');
export const createBanner  = (data)      => post('/banners', data);
export const updateBanner  = (id, data)  => put(`/banners/${id}`, data);
export const deleteBanner  = (id)        => del(`/banners/${id}`);

// ── Geofences ────────────────────────────────────────────────────
export const getGeofence   = (locId)       => get(`/locations/${locId}/geofence`);
export const saveGeofence  = (locId, data) => put(`/locations/${locId}/geofence`, data);

// ── Location Pricing ─────────────────────────────────────────────
export const getLocationPricing    = (locId)   => get(`/pricing/${locId}`);
export const setLocationPricing    = (data)    => post('/pricing', data);
export const deleteLocationPricing = (id, type, locId) => del(`/pricing/${id}?type=${type}&location_id=${locId}`);

// ── Size-based Pricing ───────────────────────────────────────────
export const getSizePricing    = ()      => get('/size-pricing');
export const setSizePricing    = (data)  => post('/size-pricing', data);
export const deleteSizePricing = (id, type) => del(`/size-pricing/${id}?type=${type}`);

// ── Reviews ───────────────────────────────────────────────────────
export const getReviews = (params = {}) => {
  const admin = getAdminInfo();
  const merged = { ...params };
  if (admin.location_id && merged.location_id === undefined) merged.location_id = admin.location_id;
  const q = new URLSearchParams(Object.entries(merged).filter(([,v]) => v != null && v !== '')).toString();
  return get(`/reviews${q ? '?' + q : ''}`);
};

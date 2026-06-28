import { firebaseConfig } from './firebase-config.js';

import {
  initializeApp,
  getApps,
  getApp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const defaultCatalog = [
  { name: 'Huevos', unit: 'docenas' },
  { name: 'Patatas', unit: 'kg' },
  { name: 'Tomates', unit: 'kg' },
  { name: 'Pepinos', unit: 'kg' },
  { name: 'Pimientos', unit: 'kg' },
  { name: 'Pimientos italianos', unit: 'kg' },
  { name: 'Pimientos rojos', unit: 'kg' },
  { name: 'Berenjenas', unit: 'kg' },
  { name: 'Calabacines', unit: 'kg' },
  { name: 'Cebollas', unit: 'kg' },
  { name: 'Ajos', unit: 'cabezas' },
  { name: 'Lechugas', unit: 'unidades' },
  { name: 'Habicholillas / Judía verde', unit: 'kg' },
  { name: 'Habas', unit: 'kg' },
  { name: 'Guisantes', unit: 'kg' },
  { name: 'Acelgas', unit: 'manojos' },
  { name: 'Espinacas', unit: 'manojos' },
  { name: 'Zanahorias', unit: 'manojos' },
  { name: 'Rábanos', unit: 'manojos' },
  { name: 'Coliflor', unit: 'unidades' },
  { name: 'Brócoli', unit: 'unidades' },
  { name: 'Col', unit: 'unidades' },
  { name: 'Calabaza', unit: 'kg' },
  { name: 'Melones', unit: 'unidades' },
  { name: 'Sandías', unit: 'unidades' },
  { name: 'Fresas', unit: 'kg' },
  { name: 'Limones', unit: 'kg' },
  { name: 'Naranjas', unit: 'kg' }
];

let app = null;
let auth = null;
let db = null;

let catalog = [];
let orders = [];
let unsubscribeOrders = null;
let unsubscribeCatalog = null;

const loginView = document.getElementById('login-view');
const pedidosView = document.getElementById('v-pedidos');
const listaView = document.getElementById('v-lista');
const catalogoView = document.getElementById('v-catalogo');
const bottomNav = document.getElementById('bottom-nav');
const logoutBtn = document.getElementById('logout-btn');
const userEmail = document.getElementById('user-email');

const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const clienteInput = document.getElementById('cliente');
const itemsList = document.getElementById('items-list');
const pendingContainer = document.getElementById('pending-container');
const deliveredContainer = document.getElementById('delivered-container');
const syncStatus = document.getElementById('sync-status');

const catContainer = document.getElementById('cat-container');
const newProdInput = document.getElementById('new-prod');
const newUnitSelect = document.getElementById('new-unit');

document.getElementById('add-row-btn').addEventListener('click', addRow);
document.getElementById('save-order-btn').addEventListener('click', saveOrder);
document.getElementById('add-catalog-btn').addEventListener('click', addCatalogItem);
document.getElementById('refresh-btn').addEventListener('click', renderBoard);
loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => show(btn.dataset.tab));
});

loginPassword.addEventListener('keydown', event => {
  if (event.key === 'Enter') login();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?v=20').catch(() => {});
}

initFirebase();

function initFirebase() {
  const firebaseIsConfigured = Boolean(
    firebaseConfig &&
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes('PEGA_AQUI') &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('PEGA_AQUI')
  );

  if (!firebaseIsConfigured) {
    loginError.textContent = 'Falta configurar Firebase. Abre firebase-config.js y pega la configuración de tu proyecto.';
    loginBtn.disabled = true;
    return;
  }

  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    onAuthStateChanged(auth, async user => {
      if (!user) {
        setLoggedOut();
        return;
      }

      setLoggedIn(user);
      await seedCatalogIfEmpty();
      listenCatalog();
      listenOrders();
      show('pedidos');
    });
  } catch (error) {
    console.error('Error iniciando Firebase:', error);
    loginError.textContent = 'Error iniciando Firebase: ' + friendlyFirebaseError(error);
    loginBtn.disabled = true;
  }
}

function setLoggedOut() {
  if (unsubscribeOrders) unsubscribeOrders();
  if (unsubscribeCatalog) unsubscribeCatalog();

  logoutBtn.classList.add('hidden');
  bottomNav.classList.add('hidden');
  userEmail.textContent = '';

  hideAllViews();
  loginView.classList.add('active');

  orders = [];
  catalog = [];
  itemsList.innerHTML = '';
}

function setLoggedIn(user) {
  logoutBtn.classList.remove('hidden');
  bottomNav.classList.remove('hidden');
  userEmail.textContent = user.email || '';
  loginError.textContent = '';
}

async function login() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    loginError.textContent = 'Introduce correo y contraseña.';
    return;
  }

  if (!auth) {
    loginError.textContent = 'Firebase no se ha iniciado bien. Revisa app.js, firebase-config.js y limpia la caché.';
    return;
  }

  loginBtn.disabled = true;
  loginError.textContent = '';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginPassword.value = '';
  } catch (error) {
    console.error(error);
    loginError.textContent = friendlyFirebaseError(error);
  } finally {
    loginBtn.disabled = false;
  }
}

async function logout() {
  if (auth) await signOut(auth);
}

function show(tab) {
  hideAllViews();

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navButton = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  if (navButton) navButton.classList.add('active');

  if (tab === 'pedidos') {
    pedidosView.classList.add('active');
    if (!itemsList.children.length) addRow();
  }

  if (tab === 'lista') {
    listaView.classList.add('active');
    renderBoard();
  }

  if (tab === 'catalogo') {
    catalogoView.classList.add('active');
    renderCatalog();
  }
}

function hideAllViews() {
  [loginView, pedidosView, listaView, catalogoView].forEach(view => view.classList.remove('active'));
}

async function seedCatalogIfEmpty() {
  const snapshot = await getDocs(collection(db, 'catalog'));

  if (!snapshot.empty) return;

  const batch = writeBatch(db);

  defaultCatalog.forEach(product => {
    const productRef = doc(collection(db, 'catalog'));
    batch.set(productRef, {
      ...product,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.email || ''
    });
  });

  await batch.commit();
}

function listenCatalog() {
  if (unsubscribeCatalog) unsubscribeCatalog();

  unsubscribeCatalog = onSnapshot(collection(db, 'catalog'), snapshot => {
    catalog = snapshot.docs
      .map(document => ({ id: document.id, ...document.data() }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    renderCatalog();
    rebuildEmptyProductSelects();
  }, error => {
    catContainer.innerHTML = `<p class="error">${friendlyFirebaseError(error)}</p>`;
  });
}

function listenOrders() {
  if (unsubscribeOrders) unsubscribeOrders();

  syncStatus.textContent = 'Sincronizando pedidos...';

  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

  unsubscribeOrders = onSnapshot(q, snapshot => {
    orders = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
    syncStatus.textContent = 'Pedidos sincronizados en tiempo real.';
    renderBoard();
  }, error => {
    syncStatus.textContent = friendlyFirebaseError(error);
  });
}

function addRow() {
  if (!catalog.length) {
    alert('El catálogo aún se está cargando. Prueba otra vez en unos segundos.');
    return;
  }

  const div = document.createElement('div');
  div.className = 'order-row';
  div.innerHTML = `
    <label>Producto</label>
    <select class="p-select">
      ${catalog.map(item => `<option value="${escapeHtml(item.name)}" data-u="${escapeHtml(item.unit)}">${escapeHtml(item.name)} (${escapeHtml(item.unit)})</option>`).join('')}
    </select>

    <label>Cantidad</label>
    <input type="number" class="p-qty" placeholder="Cantidad" step="0.01" inputmode="decimal">
  `;

  itemsList.appendChild(div);
}

function rebuildEmptyProductSelects() {
  if (!itemsList.children.length && catalog.length) addRow();
}

async function saveOrder() {
  const client = clienteInput.value.trim();

  const items = Array.from(itemsList.querySelectorAll('.order-row'))
    .map(row => {
      const select = row.querySelector('.p-select');
      const qty = row.querySelector('.p-qty').value.trim();

      return {
        name: select.value,
        qty,
        unit: select.options[select.selectedIndex].dataset.u
      };
    })
    .filter(item => item.qty);

  if (!client || !items.length) {
    alert('Completa el nombre del cliente y al menos una cantidad.');
    return;
  }

  try {
    await addDoc(collection(db, 'orders'), {
      client,
      items,
      status: 'Pendiente',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: auth.currentUser?.email || ''
    });

    clienteInput.value = '';
    itemsList.innerHTML = '';
    addRow();
    show('lista');
  } catch (error) {
    alert(friendlyFirebaseError(error));
  }
}

function renderBoard() {
  const pending = orders.filter(order => order.status !== 'Entregado');
  const delivered = orders.filter(order => order.status === 'Entregado');

  pendingContainer.innerHTML = pending.length
    ? pending.map(order => renderOrderCard(order)).join('')
    : '<div class="empty">No hay pedidos pendientes.</div>';

  deliveredContainer.innerHTML = delivered.length
    ? delivered.map(order => renderOrderCard(order)).join('')
    : '<div class="empty">No hay pedidos entregados.</div>';
}

function renderOrderCard(order) {
  const isPending = order.status !== 'Entregado';
  const createdText = formatDate(order.createdAt);

  return `
    <article class="order-card ${isPending ? 'pending' : 'delivered'}">
      <div class="order-top">
        <div>
          <span class="status-badge ${isPending ? 'status-pending' : 'status-delivered'}">
            ${isPending ? 'Pendiente' : 'Entregado'}
          </span>
          <h3>${escapeHtml(order.client)}</h3>
          <div class="order-meta">
            ${createdText ? `Creado: ${createdText}` : ''}
            ${order.createdBy ? `<br>Por: ${escapeHtml(order.createdBy)}` : ''}
          </div>
        </div>
      </div>

      <ul>
        ${(order.items || []).map(item => `<li>${escapeHtml(item.qty)} ${escapeHtml(item.unit)} ${escapeHtml(item.name)}</li>`).join('')}
      </ul>

      <div class="order-actions">
        <button class="${isPending ? 'btn-success' : 'btn-secondary'}" onclick="window.toggleStatus('${order.id}', '${escapeHtml(order.status)}')">
          ${isPending ? 'Marcar entregado' : 'Marcar pendiente'}
        </button>

        <button class="btn-whatsapp" onclick="window.shareWhatsApp('${order.id}')">
          WhatsApp
        </button>

        <button class="btn-danger" onclick="window.deleteOrderById('${order.id}')">
          Borrar
        </button>
      </div>
    </article>
  `;
}

window.toggleStatus = async function toggleStatus(id, currentStatus) {
  const nextStatus = currentStatus === 'Entregado' ? 'Pendiente' : 'Entregado';

  try {
    await updateDoc(doc(db, 'orders', id), {
      status: nextStatus,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    alert(friendlyFirebaseError(error));
  }
};

window.deleteOrderById = async function deleteOrderById(id) {
  if (!confirm('¿Seguro que quieres borrar este pedido?')) return;

  try {
    await deleteDoc(doc(db, 'orders', id));
  } catch (error) {
    alert(friendlyFirebaseError(error));
  }
};

window.shareWhatsApp = function shareWhatsApp(id) {
  const order = orders.find(item => item.id === id);
  if (!order) return;

  const items = (order.items || [])
    .map(item => `${item.qty} ${item.unit} ${item.name}`)
    .join(', ');

  const text = `Pedido de ${order.client}: ${items}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
};

function renderCatalog() {
  if (!catContainer) return;

  if (!catalog.length) {
    catContainer.innerHTML = '<p class="muted">Cargando catálogo...</p>';
    return;
  }

  catContainer.innerHTML = catalog.map(product => `
    <div class="cat-row">
      <span>${escapeHtml(product.name)} (${escapeHtml(product.unit)})</span>
      <button class="btn-danger" onclick="window.deleteCatalogItem('${product.id}')">Borrar</button>
    </div>
  `).join('');
}

async function addCatalogItem() {
  const name = newProdInput.value.trim();
  const unit = newUnitSelect.value;

  if (!name) return;

  try {
    await addDoc(collection(db, 'catalog'), {
      name,
      unit,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.email || ''
    });

    newProdInput.value = '';
  } catch (error) {
    alert(friendlyFirebaseError(error));
  }
}

window.deleteCatalogItem = async function deleteCatalogItem(id) {
  if (!confirm('¿Seguro que quieres borrar este producto del catálogo?')) return;

  try {
    await deleteDoc(doc(db, 'catalog', id));
  } catch (error) {
    alert(friendlyFirebaseError(error));
  }
};

function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return '';

  return timestamp.toDate().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function friendlyFirebaseError(error) {
  const code = error?.code || '';

  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
    return 'Correo o contraseña incorrectos.';
  }

  if (code.includes('auth/user-not-found')) {
    return 'No existe ese usuario en Firebase.';
  }

  if (code.includes('auth/unauthorized-domain')) {
    return 'El dominio de GitHub Pages no está autorizado en Firebase Authentication.';
  }

  if (code.includes('permission-denied')) {
    return 'No tienes permiso en Firestore. Revisa las reglas de seguridad.';
  }

  if (code.includes('failed-precondition')) {
    return 'Firestore necesita crear un índice o terminar de configurarse.';
  }

  return error?.message || 'Ha ocurrido un error.';
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[match]));
}

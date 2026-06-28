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
  { emoji: '🥚', name: 'Huevos', unit: 'docenas' },
  { emoji: '🥔', name: 'Patatas', unit: 'kg' },
  { emoji: '🍅', name: 'Tomates', unit: 'kg' },
  { emoji: '🥒', name: 'Pepinos', unit: 'kg' },
  { emoji: '🫑', name: 'Pimientos', unit: 'kg' },
  { emoji: '🫑', name: 'Pimientos italianos', unit: 'kg' },
  { emoji: '🌶️', name: 'Pimientos rojos', unit: 'kg' },
  { emoji: '🍆', name: 'Berenjenas', unit: 'kg' },
  { emoji: '🥒', name: 'Calabacines', unit: 'kg' },
  { emoji: '🧅', name: 'Cebollas', unit: 'kg' },
  { emoji: '🧄', name: 'Ajos', unit: 'cabezas' },
  { emoji: '🥬', name: 'Lechugas', unit: 'unidades' },
  { emoji: '🫘', name: 'Habicholillas / Judía verde', unit: 'kg' },
  { emoji: '🫘', name: 'Habas', unit: 'kg' },
  { emoji: '🟢', name: 'Guisantes', unit: 'kg' },
  { emoji: '🥬', name: 'Acelgas', unit: 'manojos' },
  { emoji: '🥬', name: 'Espinacas', unit: 'manojos' },
  { emoji: '🥕', name: 'Zanahorias', unit: 'manojos' },
  { emoji: '🔴', name: 'Rábanos', unit: 'manojos' },
  { emoji: '🥦', name: 'Coliflor', unit: 'unidades' },
  { emoji: '🥦', name: 'Brócoli', unit: 'unidades' },
  { emoji: '🥬', name: 'Col', unit: 'unidades' },
  { emoji: '🎃', name: 'Calabaza', unit: 'kg' },
  { emoji: '🍈', name: 'Melones', unit: 'unidades' },
  { emoji: '🍉', name: 'Sandías', unit: 'unidades' },
  { emoji: '🍓', name: 'Fresas', unit: 'kg' },
  { emoji: '🍋', name: 'Limones', unit: 'kg' },
  { emoji: '🍊', name: 'Naranjas', unit: 'kg' }
];

const emojiByName = [
  { keys: ['huevo'], emoji: '🥚' },
  { keys: ['patata', 'papa'], emoji: '🥔' },
  { keys: ['tomate'], emoji: '🍅' },
  { keys: ['pepino'], emoji: '🥒' },
  { keys: ['pimiento', 'italiano'], emoji: '🫑' },
  { keys: ['guindilla', 'chile'], emoji: '🌶️' },
  { keys: ['berenjena'], emoji: '🍆' },
  { keys: ['calabacin', 'calabacín'], emoji: '🥒' },
  { keys: ['cebolla'], emoji: '🧅' },
  { keys: ['ajo'], emoji: '🧄' },
  { keys: ['lechuga', 'acelga', 'espinaca', 'col'], emoji: '🥬' },
  { keys: ['habicholilla', 'judia', 'judía', 'haba'], emoji: '🫘' },
  { keys: ['guisante'], emoji: '🟢' },
  { keys: ['zanahoria'], emoji: '🥕' },
  { keys: ['rabano', 'rábano'], emoji: '🔴' },
  { keys: ['brocoli', 'brócoli', 'coliflor'], emoji: '🥦' },
  { keys: ['calabaza'], emoji: '🎃' },
  { keys: ['melon', 'melón'], emoji: '🍈' },
  { keys: ['sandia', 'sandía'], emoji: '🍉' },
  { keys: ['fresa'], emoji: '🍓' },
  { keys: ['limon', 'limón'], emoji: '🍋' },
  { keys: ['naranja'], emoji: '🍊' }
];

let app = null;
let auth = null;
let db = null;

let catalog = [];
let orders = [];
let unsubscribeOrders = null;
let unsubscribeCatalog = null;
let deferredInstallPrompt = null;

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
const newEmojiInput = document.getElementById('new-emoji');
const newProdInput = document.getElementById('new-prod');
const newUnitSelect = document.getElementById('new-unit');

const installBtn = document.getElementById('install-btn');
const installBtnLogin = document.getElementById('install-btn-login');

document.getElementById('add-row-btn').addEventListener('click', addRow);
document.getElementById('save-order-btn').addEventListener('click', saveOrder);
document.getElementById('add-catalog-btn').addEventListener('click', addCatalogItem);
document.getElementById('refresh-btn').addEventListener('click', renderBoard);
loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);

installBtn.addEventListener('click', installApp);
installBtnLogin.addEventListener('click', installApp);

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => show(btn.dataset.tab));
});

loginPassword.addEventListener('keydown', event => {
  if (event.key === 'Enter') login();
});

newProdInput.addEventListener('input', () => {
  if (!newEmojiInput.value.trim()) {
    newEmojiInput.placeholder = guessEmoji(newProdInput.value) || 'Ej: 🍅';
  }
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn.classList.remove('hidden');
  installBtnLogin.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installBtn.classList.add('hidden');
  installBtnLogin.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js?v=30').catch(() => {});
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

async function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.classList.add('hidden');
    installBtnLogin.classList.add('hidden');
    return;
  }

  alert(
    'Para instalarla en Android: abre esta web en Chrome, pulsa los tres puntos de arriba y elige "Instalar app" o "Añadir a pantalla de inicio".'
  );
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

  if (snapshot.empty) {
    const batch = writeBatch(db);

    defaultCatalog.forEach((product, index) => {
      const productRef = doc(collection(db, 'catalog'));
      batch.set(productRef, {
        ...product,
        inStock: true,
        order: index,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || ''
      });
    });

    await batch.commit();
    return;
  }

  await migrateOldCatalog(snapshot);
}

async function migrateOldCatalog(snapshot) {
  const batch = writeBatch(db);
  let needsCommit = FalseFlag();

  snapshot.docs.forEach((productDoc, index) => {
    const data = productDoc.data();
    const updates = {};

    if (!data.emoji) updates.emoji = guessEmoji(data.name);
    if (typeof data.inStock !== 'boolean') updates.inStock = true;
    if (typeof data.order !== 'number') updates.order = index;

    if (Object.keys(updates).length) {
      batch.update(doc(db, 'catalog', productDoc.id), updates);
      needsCommit.value = true;
    }
  });

  if (needsCommit.value) await batch.commit();
}

function FalseFlag() {
  return { value: false };
}

function listenCatalog() {
  if (unsubscribeCatalog) unsubscribeCatalog();

  const q = query(collection(db, 'catalog'), orderBy('order', 'asc'));

  unsubscribeCatalog = onSnapshot(q, snapshot => {
    catalog = snapshot.docs
      .map((document, index) => {
        const data = document.data();
        return {
          id: document.id,
          emoji: data.emoji || guessEmoji(data.name),
          name: data.name,
          unit: data.unit,
          inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
          order: typeof data.order === 'number' ? data.order : index,
          ...data
        };
      })
      .sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 999999;
        const orderB = typeof b.order === 'number' ? b.order : 999999;
        return orderA - orderB;
      });

    renderCatalog();
    rebuildProductRowsAfterCatalogChange();
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
  const availableProducts = getAvailableProducts();

  if (!availableProducts.length) {
    alert('No hay productos en stock. Activa alguno en el catálogo.');
    return;
  }

  const div = document.createElement('div');
  div.className = 'order-row';
  div.innerHTML = `
    <label>Producto</label>
    <select class="p-select">
      ${availableProducts.map(item => `<option value="${escapeHtml(item.name)}" data-u="${escapeHtml(item.unit)}" data-emoji="${escapeHtml(item.emoji)}">${escapeHtml(item.emoji)} ${escapeHtml(item.name)} (${escapeHtml(item.unit)})</option>`).join('')}
    </select>

    <label>Cantidad</label>
    <input type="number" class="p-qty" placeholder="Cantidad" step="0.01" inputmode="decimal">
  `;

  itemsList.appendChild(div);
}

function getAvailableProducts() {
  return catalog.filter(product => product.inStock !== false);
}

function rebuildProductRowsAfterCatalogChange() {
  const availableProducts = getAvailableProducts();

  if (!itemsList.children.length && availableProducts.length) {
    addRow();
    return;
  }

  document.querySelectorAll('.p-select').forEach(select => {
    const oldValue = select.value;

    select.innerHTML = availableProducts
      .map(item => `<option value="${escapeHtml(item.name)}" data-u="${escapeHtml(item.unit)}" data-emoji="${escapeHtml(item.emoji)}">${escapeHtml(item.emoji)} ${escapeHtml(item.name)} (${escapeHtml(item.unit)})</option>`)
      .join('');

    const stillExists = availableProducts.some(item => item.name === oldValue);
    if (stillExists) select.value = oldValue;
  });
}

async function saveOrder() {
  const client = clienteInput.value.trim();

  const items = Array.from(itemsList.querySelectorAll('.order-row'))
    .map(row => {
      const select = row.querySelector('.p-select');
      const qty = row.querySelector('.p-qty').value.trim();

      return {
        emoji: select.options[select.selectedIndex]?.dataset.emoji || '',
        name: select.value,
        qty,
        unit: select.options[select.selectedIndex]?.dataset.u || ''
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
        ${(order.items || []).map(item => `<li>${escapeHtml(item.qty)} ${escapeHtml(item.unit)} ${escapeHtml(item.emoji || '')} ${escapeHtml(item.name)}</li>`).join('')}
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
    .map(item => `${item.qty} ${item.unit} ${item.emoji || ''} ${item.name}`)
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

  catContainer.innerHTML = catalog.map((product, index) => {
    const inStock = product.inStock !== false;

    return `
      <div class="cat-row ${inStock ? '' : 'out-of-stock'}">
        <div class="cat-info">
          <div class="cat-name">
            <span class="cat-emoji">${escapeHtml(product.emoji || guessEmoji(product.name))}</span>
            <span>${escapeHtml(product.name)}</span>
          </div>
          <div class="cat-unit">${escapeHtml(product.unit)}</div>
          <span class="stock-label ${inStock ? 'stock-yes' : 'stock-no'}">
            ${inStock ? 'En stock' : 'Sin stock'}
          </span>
        </div>

        <div class="cat-actions">
          <button class="btn-arrow" onclick="window.moveProduct('${product.id}', -1)" ${index === 0 ? 'disabled' : ''}>⬆️</button>
          <button class="btn-arrow" onclick="window.moveProduct('${product.id}', 1)" ${index === catalog.length - 1 ? 'disabled' : ''}>⬇️</button>
          <button class="${inStock ? 'btn-stock-on' : 'btn-stock-off'}" onclick="window.toggleProductStock('${product.id}', ${inStock})">
            ${inStock ? 'Stock' : 'No stock'}
          </button>
          <button class="btn-danger" onclick="window.deleteCatalogItem('${product.id}')">Borrar</button>
        </div>
      </div>
    `;
  }).join('');
}

async function addCatalogItem() {
  const name = newProdInput.value.trim();
  const unit = newUnitSelect.value;
  const emoji = newEmojiInput.value.trim() || guessEmoji(name);

  if (!name) return;

  try {
    const nextOrder = catalog.length ? Math.max(...catalog.map(item => item.order || 0)) + 1 : 0;

    await addDoc(collection(db, 'catalog'), {
      emoji,
      name,
      unit,
      inStock: true,
      order: nextOrder,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.email || ''
    });

    newEmojiInput.value = '';
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

window.toggleProductStock = async function toggleProductStock(id, currentInStock) {
  try {
    await updateDoc(doc(db, 'catalog', id), {
      inStock: !currentInStock,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    alert(friendlyFirebaseError(error));
  }
};

window.moveProduct = async function moveProduct(id, direction) {
  const currentIndex = catalog.findIndex(product => product.id === id);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= catalog.length) return;

  const currentProduct = catalog[currentIndex];
  const targetProduct = catalog[targetIndex];

  const currentOrder = typeof currentProduct.order === 'number' ? currentProduct.order : currentIndex;
  const targetOrder = typeof targetProduct.order === 'number' ? targetProduct.order : targetIndex;

  try {
    const batch = writeBatch(db);

    batch.update(doc(db, 'catalog', currentProduct.id), {
      order: targetOrder,
      updatedAt: serverTimestamp()
    });

    batch.update(doc(db, 'catalog', targetProduct.id), {
      order: currentOrder,
      updatedAt: serverTimestamp()
    });

    await batch.commit();
  } catch (error) {
    alert(friendlyFirebaseError(error));
  }
};

function guessEmoji(name) {
  const cleanName = normalizeText(name || '');

  const found = emojiByName.find(item =>
    item.keys.some(key => cleanName.includes(normalizeText(key)))
  );

  return found ? found.emoji : '🥬';
}

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

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

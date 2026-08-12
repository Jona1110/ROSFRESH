// --- CONFIGURACIÓN ---
const API_URL = "https://script.google.com/macros/s/AKfycbzEWadNGyMnFZu_DZLAeRqn395nOcR-24DsEZxlXYmdlZpFhCG2BPY1U5JBgp64SLiFWw/exec"; 
const WHATSAPP_NUMBER = "523322961969";

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('rosfresh_cart')) || [];
let currentProductToCustomize = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartUI();
    setupEventListeners();
});

function setupEventListeners() {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderMenu(e.target.dataset.cat);
            document.getElementById('searchInput').value = ""; 
        });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        const term = e.target.value.toLowerCase();
        const filtered = allProducts.filter(p => p.nombre.toLowerCase().includes(term) || (p.descripcion && p.descripcion.toLowerCase().includes(term)));
        renderGrid(filtered);
    });

    document.getElementById('cartBtn').addEventListener('click', toggleCart);
    document.getElementById('closeCartBtn').addEventListener('click', toggleCart);
    document.getElementById('cartOverlay').addEventListener('click', toggleCart);
    document.getElementById('btnSendOrder').addEventListener('click', sendWhatsAppOrder);

    // Eventos del modal de personalización
    document.getElementById('closeCustomModal').addEventListener('click', toggleCustomModal);
    document.getElementById('customModalOverlay').addEventListener('click', toggleCustomModal);
    document.getElementById('confirmCustomBtn').addEventListener('click', confirmCustomProduct);
}

async function fetchProducts() {
    try {
        const res = await fetch(`${API_URL}?action=getProducts`);
        allProducts = await res.json();
        renderMenu('Todos');
    } catch (error) {
        document.getElementById('menuContainer').innerHTML = `
            <div class="loader-container">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff4757; margin-bottom:15px;"></i>
                <p>Error al cargar el menú. Revisa tu conexión.</p>
            </div>`;
    }
}

function renderMenu(category) {
    const filtered = category === 'Todos' ? allProducts : allProducts.filter(p => p.categoria === category);
    renderGrid(filtered);
}

function renderGrid(products) {
    const container = document.getElementById('menuContainer');
    container.innerHTML = "";

    if (products.length === 0) {
        container.innerHTML = `<div class="loader-container"><p>No se encontraron productos en esta categoría.</p></div>`;
        return;
    }

    products.forEach(p => {
        container.innerHTML += `
            <div class="product-card">
                <div class="product-info">
                    <h3>${p.nombre}</h3>
                    <p>${p.descripcion || 'Delicioso y fresco'}</p>
                </div>
                <div class="price-action">
                    <span class="price">$${parseFloat(p.precio).toFixed(2)}</span>
                    <button class="btn-add" onclick="openCustomModal('${p.id}', '${p.nombre}', ${p.precio}, '${p.categoria}')">
                        <i class="fas fa-plus"></i> Agregar
                    </button>
                </div>
            </div>
        `;
    });
}

// --- FLUJO DE PERSONALIZACIÓN ---
function openCustomModal(id, name, price, category) {
    // Si el producto pertenece a Salsas o Toppings sueltos, se agregan directo sin modal
    if (category === 'Salsas' || category === 'Toppings') {
        addToCart(id, name, price, "", "");
        return;
    }

    currentProductToCustomize = { id, name, price: parseFloat(price) };
    
    // Rellenar nombre en el modal
    document.getElementById('modalProductName').textContent = name;
    
    // Limpiar checkboxes previos
    document.querySelectorAll('#customModal input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    toggleCustomModal();
}

function toggleCustomModal() {
    const modal = document.getElementById('customModal');
    const overlay = document.getElementById('customModalOverlay');
    modal.classList.toggle('active');
    overlay.classList.toggle('active');
}

function confirmCustomProduct() {
    if (!currentProductToCustomize) return;

    // Recopilar Salsas seleccionadas
    const selectedSalsas = Array.from(document.querySelectorAll('input[name="salsa"]:checked')).map(cb => cb.value);
    
    // Recopilar Toppings seleccionados
    const selectedToppings = Array.from(document.querySelectorAll('input[name="topping"]:checked')).map(cb => cb.value);

    const salsasText = selectedSalsas.length > 0 ? selectedSalsas.join(', ') : 'Ninguna';
    const toppingsText = selectedToppings.length > 0 ? selectedToppings.join(', ') : 'Ninguno';

    addToCart(
        currentProductToCustomize.id, 
        currentProductToCustomize.name, 
        currentProductToCustomize.price, 
        salsasText, 
        toppingsText
    );

    toggleCustomModal();
}

function addToCart(id, name, price, salsas, toppings) {
    // Creamos una clave única basada en el ID y los complementos elegidos para separar productos idénticos con diferentes gustos
    const cartKey = `${id}-${salsas}-${toppings}`;
    
    const existingItem = cart.find(item => item.cartKey === cartKey);
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ 
            cartKey, 
            id, 
            name, 
            price: parseFloat(price), 
            salsas, 
            toppings, 
            qty: 1 
        });
    }
    saveAndRenderCart();
    showToast(`¡${name} agregado al carrito!`, 'success');
}

function removeFromCart(cartKey) {
    cart = cart.filter(item => item.cartKey !== cartKey);
    saveAndRenderCart();
    showToast('Producto eliminado', 'error');
}

function updateQty(cartKey, delta) {
    const item = cart.find(item => item.cartKey === cartKey);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) removeFromCart(cartKey);
        else saveAndRenderCart();
    }
}

function saveAndRenderCart() {
    localStorage.setItem('rosfresh_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    document.getElementById('cartCount').textContent = count;
    
    const itemsContainer = document.getElementById('cartItems');
    let total = 0;
    
    if (cart.length === 0) {
        itemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p>Tu carrito está vacío</p>
            </div>`;
        document.getElementById('cartTotal').textContent = "0.00";
        return;
    }

    itemsContainer.innerHTML = "";
    cart.forEach(item => {
        const subtotal = item.price * item.qty;
        total += subtotal;
        
        // Mostrar detalles de personalización en el cajón del carrito si existen
        let customizationHTML = "";
        if (item.salsas || item.toppings) {
            customizationHTML = `<br><small style="color:#e17055;">Salsas: ${item.salsas}<br>Toppings: ${item.toppings}</small>`;
        }

        itemsContainer.innerHTML += `
            <div class="cart-item">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <span class="item-price">$${item.price.toFixed(2)} c/u</span>
                    ${customizationHTML}
                </div>
                <div class="item-actions">
                    <button class="btn-remove" onclick="updateQty('${item.cartKey}', -1)"><i class="fas fa-minus"></i></button>
                    <strong>${item.qty}</strong>
                    <button class="btn-remove" onclick="updateQty('${item.cartKey}', 1)"><i class="fas fa-plus"></i></button>
                    <button class="btn-remove" style="background:#ff7675; color:white; margin-left:10px;" onclick="removeFromCart('${item.cartKey}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    
    document.getElementById('cartTotal').textContent = total.toFixed(2);
}

function toggleCart() {
    document.getElementById('cartDrawer').classList.toggle('active');
    document.getElementById('cartOverlay').classList.toggle('active');
    document.body.style.overflow = document.getElementById('cartDrawer').classList.contains('active') ? 'hidden' : 'auto';
}

// --- ENVIAR PEDIDO A WHATSAPP Y REGISTRAR EN FINANZAS AUTOMÁTICAMENTE ---
async function sendWhatsAppOrder() {
    if (cart.length === 0) {
        showToast('El carrito está vacío', 'error');
        return;
    }
    
    let orderDetailsText = "";
    let total = 0;
    
    cart.forEach(item => {
        const subtotal = item.price * item.qty;
        total += subtotal;
        let customInfo = (item.salsas || item.toppings) ? ` (Salsas: ${item.salsas} | Toppings: ${item.toppings})` : "";
        orderDetailsText += `${item.qty}x ${item.name}${customInfo}, `;
    });
    
    orderDetailsText = orderDetailsText.slice(0, -2); // Quitar última coma
    
    // 1. Enviar el registro de ingreso a Google Sheets (pestaña Finanzas) con los detalles
    try {
        const payload = {
            action: "addOrderToFinance",
            tipo: "Ingreso",
            monto: total,
            detalle: `Pedido Web: ${orderDetailsText}`
        };

        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error("Error al registrar la venta en finanzas:", error);
    }

    // 2. Construir el mensaje legible para WhatsApp
    let text = "👋 *¡Hola Rosfresh!*\nQuiero realizar el siguiente pedido:\n\n";
    cart.forEach(item => {
        const subtotal = item.price * item.qty;
        text += `▪️ ${item.qty}x *${item.name}* ($${subtotal.toFixed(2)})\n`;
        if (item.salsas && item.salsas !== 'Ninguna') text += `   └ *Salsas:* ${item.salsas}\n`;
        if (item.toppings && item.toppings !== 'Ninguno') text += `   └ *Toppings:* ${item.toppings}\n`;
    });
    
    text += `\n💰 *Total estimado: $${total.toFixed(2)}*\n\n`;
    text += `¿En cuánto tiempo puedo pasar por él? 🍓`;
    
    const encodedText = encodeURIComponent(text);
    
    // 3. Vaciar carrito localmente y cerrar cajón
    cart = [];
    saveAndRenderCart();
    toggleCart();

    // 4. Abrir WhatsApp
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`, '_blank');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '<i class="fas fa-check-circle" style="color:#2ecc71;"></i>' : '<i class="fas fa-info-circle" style="color:#e74c3c;"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
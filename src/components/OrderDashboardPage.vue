<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const allPedidos = ref([]);
const loading = ref(true);
const error = ref(null);

const dashboardMessage = ref(null);
const dashboardMessageType = ref(null);

const showComanda = ref(false);
const comandaPedido = ref(null);
const loadingComanda = ref(false);
const errorComanda = ref(null);

const estadosPedido = ['Todos', 'Pendiente', 'En Preparacion', 'En Camino', 'Entregado', 'Cancelado'];
const currentTab = ref('Pendiente');

// --- Propiedad computada para pedidos filtrados ---
const filteredPedidos = computed(() => {
    console.log('filteredPedidos computed: Evaluating...');
    console.log('filteredPedidos computed: currentTab.value:', currentTab.value);
    console.log('filteredPedidos computed: allPedidos.value length:', allPedidos.value.length);

    let filtered = [];
    if (currentTab.value === 'Todos') {
        filtered = allPedidos.value;
    } else {
        filtered = allPedidos.value.filter(pedido => {
             return pedido.estado === currentTab.value;
        });
    }

    console.log('filteredPedidos computed: Resulting filtered array length:', filtered.length);

    return filtered;
});


// --- Funciones Asíncronas (Llamadas a la API) ---

const fetchAllPedidos = async () => {
    console.log('fetchAllPedidos: Starting load of ALL orders...');
    loading.value = true;
    error.value = null;

    const token = authStore.authToken;
     if (!token) {
        console.error('fetchAllPedidos: Error: No authentication token.');
        loading.value = false;
        return;
     }

    try {
        const apiUrl = 'http://127.0.0.1:8000/pedidos/api/list/';
        console.log(`fetchAllPedidos: Making GET request to: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
        });

        if (!response.ok) {
             let errorData = {};
             try { errorData = await response.json(); } catch (e) { errorData = { detail: `HTTP Error: ${response.status}` }; }
             console.error('fetchAllPedidos: Error fetching all orders:', response.status, errorData);
             error.value = `Error loading all orders: ${errorData.detail || `HTTP Status ${response.status}`}`;
             allPedidos.value = [];
             if (response.status === 401 || response.status === 403) {
                 console.warn('fetchAllPedidos: Invalid token or staff permissions missing. Logging out.');
                 authStore.logout();
                 router.push('/login');
             }
             return;
        }

        const data = await response.json();
        console.log('fetchAllPedidos: Data received:', data);

        if (Array.isArray(data)) {
            allPedidos.value = data;
            console.log('fetchAllPedidos: Complete order list updated.');
        } else {
            console.error('fetchAllPedidos: Unexpected response: Not an array.', data);
            allPedidos.value = [];
            error.value = 'Unexpected data format from API.';
        }

    } catch (err) {
        console.error('fetchAllPedidos: Connection or processing error:', err);
        error.value = `Connection error loading all orders: ${err.message}`;
        allPedidos.value = [];
    } finally {
        loading.value = false;
        console.log('fetchAllPedidos: All orders load finished.');
    }
};

const updateOrderStatus = async (pedidoId, newStatus) => {
    console.log(`Attempting to update status for order ${pedidoId} to "${newStatus}"...`);

    if (!estadosPedido.includes(newStatus) || newStatus === 'Todos') {
        showDashboardMessage('Invalid order status.', 'error');
        console.error('updateOrderStatus: Invalid status:', newStatus);
        return;
    }

    dashboardMessage.value = null;

    const token = authStore.authToken;
    if (!token) {
        showDashboardMessage('Not authenticated. Cannot update status.', 'error');
        console.error('updateOrderStatus: Error: No authentication token.');
        authStore.logout();
        router.push('/login');
        return;
    }

    try {
        const apiUrl = `http://127.0.0.1:8000/pedidos/api/${pedidoId}/update_status/`;
        console.log(`updateOrderStatus: Sending PATCH request to: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
            body: JSON.stringify({ estado: newStatus }),
        });

        console.log(`updateOrderStatus: Response received. Status: ${response.status}`);

        const responseData = await response.json();

        if (!response.ok) {
            console.error('updateOrderStatus: HTTP response error:', response.status, responseData);
            let errorMsg = `Error updating status for order #${pedidoId}.`;
             if (responseData.detail) {
                 errorMsg += ` ${responseData.detail}`;
             } else if (responseData) {
                 for (const field in responseData) {
                     const messages = Array.isArray(responseData[field]) ? responseData[field].join(', ') : (typeof responseData[field] === 'string' ? responseData[field] : JSON.stringify(responseData[field]));
                     errorMsg += `\n- ${field}: ${messages}`;
                 }
             }
            showDashboardMessage(errorMsg, 'error');

            if (response.status === 401 || response.status === 403) {
                 console.warn('updateOrderStatus: Invalid token or staff permissions missing. Logging out.');
                 authStore.logout();
                 router.push('/login');
            }
            return;
        }

        console.log('updateOrderStatus: Status updated successfully:', responseData);

        const updatedPedido = responseData;
        const index = allPedidos.value.findIndex(p => p.id === updatedPedido.id);

        if (index !== -1) {
            // Update the specific order in the local list
            allPedidos.value[index] = updatedPedido; // Replace the old object with the new one
            console.log(`Order #${updatedPedido.id} status updated locally in allPedidos.`);
        } else {
            // This case should ideally not happen now that the backend returns the ID
            console.warn(`updateOrderStatus: Updated order (ID ${updatedPedido.id}) not found in local allPedidos list. Reloading all orders.`);
            fetchAllPedidos(); // Reload if not found locally
        }

        showDashboardMessage(`Estado del pedido #${updatedPedido.id} actualizado a "${updatedPedido.estado}".`, 'success');

    } catch (err) {
        console.error('updateOrderStatus: Connection or processing error:', err);
        showDashboardMessage(`Error de conexión al actualizar estado: ${err.message}`, 'error');
    }
};

const fetchComandaDetails = async (pedidoId) => {
    console.log(`fetchComandaDetails: Loading details for comanda of order ${pedidoId}...`);
    loadingComanda.value = true;
    errorComanda.value = null;
    comandaPedido.value = null;

    const token = authStore.authToken;
    if (!token) {
        errorComanda.value = 'Not authenticated. Cannot load comanda.';
        console.error('fetchComandaDetails: Error: No authentication token.');
        loadingComanda.value = false;
        authStore.logout();
        router.push('/login');
        return;
    }

    try {
        const apiUrl = `http://127.0.0.1:8000/pedidos/api/${pedidoId}/detail/`;
        console.log(`fetchComandaDetails: Making GET request to: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
            },
        });

        console.log(`fetchComandaDetails: Response received. Status: ${response.status}`);

        if (!response.ok) {
             let errorData = {};
             try { errorData = await response.json(); } catch (e) { errorData = { detail: `HTTP Error: ${response.status}` }; }
             console.error('fetchComandaDetails: Error fetching comanda details:', response.status, errorData);
             errorComanda.value = `Error al cargar comanda: ${errorData.detail || `HTTP Status ${response.status}`}`;
              if (response.status === 401 || response.status === 403) {
                  console.warn('fetchComandaDetails: Invalid token or staff permissions missing.');
                  authStore.logout();
                  router.push('/login');
             }
            return;
        }

        const data = await response.json();
        console.log('fetchComandaDetails: Comanda details received:', data);
        comandaPedido.value = data;
        showComanda.value = true;

    } catch (err) {
        console.error('fetchComandaDetails: Connection or processing error:', err);
        errorComanda.value = `Connection error loading comanda: ${err.message}`;
    } finally {
        loadingComanda.value = false;
        console.log('fetchComandaDetails: Comanda load finished.');
    }
};


// --- Lógica de UI (No API) ---

const changeTab = (tabName) => {
    console.log(`Changing to tab: "${tabName}"`);
    currentTab.value = tabName;
    dashboardMessage.value = null;
};

const openComandaModal = (pedidoId) => {
    fetchComandaDetails(pedidoId);
};

const closeComandaModal = () => {
    showComanda.value = false;
    comandaPedido.value = null;
    errorComanda.value = null;
};

// --- Función para imprimir la comanda (Revertida a CSS-only) ---
const printComanda = () => {
    console.log('Attempting to print comanda using CSS print styles...');
    try {
        // Check if window and window.print exist before calling
        if (typeof window !== 'undefined' && window.print) {
            // Llama a window.print() dos veces para imprimir dos copias
            window.print();
            console.log('Primera copia impresa.');

            // Opcional: Añadir un pequeño retraso entre impresiones si la impresora es muy rápida
            // Esto es menos crítico con CSS, pero puede ayudar en algunos casos.
            setTimeout(() => {
                 window.print();
                 console.log('Segunda copia impresa.');
            }, 100); // Retraso de 100ms (ajustar si es necesario)


        } else {
            console.error('window.print is not available in this environment.');
            showDashboardMessage('La función de impresión no está disponible en este navegador.', 'error');
        }
    } catch (e) {
        console.error('Error during print attempt:', e);
        showDashboardMessage(`Error al intentar imprimir: ${e.message}`, 'error');
    }
};


const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '$0.00';
    }
    return `$${parseFloat(value).toFixed(2)}`;
};

const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        // Ensure the date string is treated as UTC if it ends with Z, or local otherwise
        const date = new Date(dateTimeString.endsWith('Z') ? dateTimeString : dateTimeString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
             console.error('Invalid date string for formatting:', dateTimeString);
             return 'Fecha inválida';
        }
        return date.toLocaleString(undefined, options);
    } catch (e) {
        console.error('Error formatting date:', dateTimeString, e);
        return 'Fecha inválida';
    }
};

const showDashboardMessage = (message, type = 'info') => {
    dashboardMessage.value = message;
    dashboardMessageType.value = type;
};

const handleLoginRedirect = () => {
    if (!authStore.isAuthenticated) {
        console.warn('User not authenticated, redirecting to login.');
        router.push('/login');
    }
};

onMounted(() => {
    handleLoginRedirect();
    if (authStore.isAuthenticated) {
        fetchAllPedidos();
    }
});

// Optional: Watcher to reload orders if authentication state changes
// watch(() => authStore.isAuthenticated, (isAuthenticated) => {
//      if (isAuthenticated) {
//          fetchAllPedidos(); // Reload if the user authenticates
//      } else {
//          allPedidos.value = []; // Clear the list if the user logs out
//      }
// });

</script>

<template>
    <div class="dashboard-container">
        <div class="main-dashboard-content screen-only">
            <h1>Dashboard de Pedidos</h1>

            <div v-if="!authStore.isAuthenticated" class="status-message error">
                Por favor, <router-link to="/login">inicie sesión</router-link> para ver el dashboard.
            </div>

            <div v-if="authStore.isAuthenticated">
                <div v-if="dashboardMessage" :class="['status-message', dashboardMessageType]">
                    {{ dashboardMessage }}
                </div>

                <div class="tabs">
                    <button
                        v-for="estado in estadosPedido"
                        :key="estado"
                        :class="{ 'tab-button': true, 'active': currentTab === estado }"
                        @click="changeTab(estado)"
                    >
                        {{ estado }}
                    </button>
                </div>

                <div v-if="loading" class="loading-indicator">Cargando pedidos...</div>
                <div v-else-if="error" class="error-message">Error al cargar pedidos: {{ error }}</div>
                <div v-else-if="filteredPedidos.length === 0" class="empty-list">
                    No hay pedidos en estado "{{ currentTab }}".
                </div>
                <div v-else class="order-list">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tipo Venta</th>
                                <th>Cliente</th>
                                <th>Teléfono</th>
                                <th>Dirección</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th>Hora Estimada</th>
                                <th>Fecha/Hora</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="pedido in filteredPedidos" :key="pedido.id">
                                <td data-label="ID">{{ pedido.id }}</td>
                                <td data-label="Tipo Venta">{{ pedido.tipo_venta }}</td>
                                <td data-label="Cliente">{{ pedido.cliente ? pedido.cliente.nombre : 'N/A' }}</td>
                                <td data-label="Teléfono">{{ pedido.cliente ? pedido.cliente.telefono : 'N/A' }}</td>
                                <td data-label="Dirección">{{ pedido.cliente ? pedido.cliente.direccion : 'N/A' }}</td>
                                <td data-label="Total">{{ formatCurrency(pedido.total) }}</td>
                                <td data-label="Estado">
                                    <select
                                        :value="pedido.estado"
                                        @change="updateOrderStatus(pedido.id, $event.target.value)"
                                        class="status-select"
                                    >
                                        <option v-for="estado in estadosPedido.filter(e => e !== 'Todos')" :key="estado" :value="estado">
                                            {{ estado }}
                                        </option>
                                    </select>
                                </td>
                                <td data-label="Hora Estimada">{{ pedido.hora_estimada_entrega || 'N/A' }}</td>
                                 <td data-label="Fecha/Hora">{{ formatDateTime(pedido.fecha_hora) }}</td>
                                <td data-label="Acciones">
                                    <button @click="openComandaModal(pedido.id)" class="view-comanda-button">
                                        Ver Comanda
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div> <div v-if="showComanda" class="modal-overlay screen-only">
            <div class="modal-content">
                <div class="modal-header print-hidden">
                    <h2>Comanda del Pedido #{{ comandaPedido ? comandaPedido.id : '' }}</h2>
                    <button @click="closeComandaModal" class="close-modal-button">&times;</button>
                </div>
                <div class="modal-body">
                    <div v-if="loadingComanda">Cargando comanda...</div>
                    <div v-else-if="errorComanda" class="error-message">Error al cargar comanda: {{ errorComanda }}</div>
                    <div v-else-if="comandaPedido" class="comanda-details">
                        <p><strong>ID Pedido:</strong> {{ comandaPedido.id }}</p>
                        <p><strong>Tipo Venta:</strong> {{ comandaPedido.tipo_venta }}</p>
                        <p><strong>Fecha/Hora:</strong> {{ formatDateTime(comandaPedido.fecha_hora) }}</p>
                         <p v-if="comandaPedido.hora_estimada_entrega"><strong>Hora Estimada:</strong> {{ comandaPedido.hora_estimada_entrega }}</p>

                        <div v-if="comandaPedido.cliente">
                            <h3>Datos Cliente</h3>
                            <p><strong>Nombre:</strong> {{ comandaPedido.cliente.nombre }}</p>
                            <p><strong>Teléfono:</strong> {{ comandaPedido.cliente.telefono }}</p>
                            <p><strong>Dirección:</strong> {{ comandaPedido.cliente.direccion }}</p>
                        </div>

                        <h3>Items</h3>
                        <ul class="comanda-items-list">
                            <li v-for="item in comandaPedido.detalles" :key="item.id">
                                {{ item.cantidad }} x {{ item.producto.nombre }}
                                {{ item.tamaño ? `(${item.tamaño})` : '' }}
                                ({{ item.tipo_unidad }})
                                - {{ formatCurrency(item.subtotal) }}
                            </li>
                        </ul>

                        <p class="comanda-total">
                            <strong>Total: {{ formatCurrency(comandaPedido.total) }}</strong>
                        </p>

                    </div>
                </div>
                <div class="modal-footer print-hidden">
                    <button @click="closeComandaModal" class="close-modal-button">Cerrar</button>
                    <button @click="printComanda" class="print-button">Imprimir Comanda</button>
                </div>
            </div>
        </div>

        <div class="comanda-print-area">
             <div v-if="comandaPedido" class="comanda-details-print">
                <p><strong>ID Pedido:</strong> {{ comandaPedido.id }}</p>
                <p><strong>Tipo Venta:</strong> {{ comandaPedido.tipo_venta }}</p>
                <p><strong>Fecha/Hora:</strong> {{ formatDateTime(comandaPedido.fecha_hora) }}</p>
                <p v-if="comandaPedido.hora_estimada_entrega"><strong>Hora Estimada:</strong> {{ comandaPedido.hora_estimada_entrega }}</p>

                <div v-if="comandaPedido.cliente">
                    <h3>Datos Cliente</h3>
                    <p><strong>Nombre:</strong> {{ comandaPedido.cliente.nombre }}</p>
                    <p><strong>Teléfono:</strong> {{ comandaPedido.cliente.telefono }}</p>
                    <p><strong>Dirección:</strong> {{ comandaPedido.cliente.direccion }}</p>
                </div>

                <h3>Items</h3>
                <ul class="comanda-items-list-print">
                    <li v-for="item in comandaPedido.detalles" :key="item.id">
                        {{ item.cantidad }} x {{ item.producto.nombre }}
                        {{ item.tamaño ? `(${item.tamaño})` : '' }}
                        ({{ item.tipo_unidad }})
                        - {{ formatCurrency(item.subtotal) }}
                    </li>
                </ul>

                <p class="comanda-total-print">
                    <strong>Total: {{ formatCurrency(comandaPedido.total) }}</strong>
                </p>
            </div>
        </div>


    </div>
</template>

<style scoped>
/* General dashboard styles */
.dashboard-container {
    font-family: sans-serif;
    padding: 20px;
    background-color: #f8f9fa;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    max-width: 1200px; /* Increase max width */
    margin: 20px auto;
}

h1, h2, h3 {
    color: #343a40;
    border-bottom: 1px solid #dee2e6;
    padding-bottom: 10px;
    margin-bottom: 15px;
}

h1 {
    text-align: center;
    border-bottom: 2px solid #007bff;
    margin-bottom: 20px;
}

/* Status messages */
.status-message {
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
    white-space: pre-wrap;
}
.status-message.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.status-message.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }

.loading-indicator, .empty-list {
    text-align: center;
    font-style: italic;
    color: #6c757d;
    padding: 20px;
}

.error-message {
    color: red;
    font-weight: bold;
    text-align: center;
    padding: 20px;
}

/* Styles for Tabs */
.tabs {
    display: flex;
    flex-wrap: wrap; /* Allow tabs to wrap on small screens */
    gap: 5px; /* Space between tabs */
    margin-bottom: 20px;
    border-bottom: 2px solid #dee2e6; /* Bottom border to separate from the list */
    padding-bottom: 5px;
}

.tab-button {
    background-color: #e9ecef; /* Inactive tab background color */
    color: #495057; /* Inactive tab text color */
    border: 1px solid #dee2e6;
    border-bottom: none; /* Remove bottom border so the container's border is the main one */
    padding: 8px 15px;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.2s ease, color 0.2s ease;
}

.tab-button:hover:not(.active) {
    background-color: #dee2e6; /* Hover color */
}

.tab-button.active {
    background-color: #007bff; /* Active tab background color */
    color: white; /* Active tab text color */
    border-color: #007bff;
    font-weight: bold;
    /* Ensure the active tab is visually above the bottom border */
    position: relative;
    bottom: -2px; /* Adjustment to overlap the border */
    z-index: 1;
}

/* Styles for the Order List (Table) */
.order-list {
    overflow-x: auto; /* Add horizontal scroll if the table is too wide */
}

.order-list table {
    width: 100%; /* Occupy full available width */
    border-collapse: collapse; /* Remove space between cell borders */
    margin-bottom: 20px;
    background-color: #fff;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);
}

.order-list th,
.order-list td {
    border: 1px solid #dee2e6;
    padding: 10px;
    text-align: left;
    vertical-align: middle; /* Align content vertically */
    font-size: 0.9em; /* Reduce font size */
}

.order-list th {
    background-color: #e9ecef;
    font-weight: bold;
    color: #495057;
}

.order-list tbody tr:nth-child(even) {
    background-color: #f8f9fa; /* Background color for even rows */
}

/* Styles for the status selector in the table */
.status-select {
    padding: 5px;
    border-radius: 4px;
    border: 1px solid #ced4da;
    font-size: 0.9em;
    cursor: pointer;
    background-color: #fff;
}

/* Styles for the View Comanda button */
.view-comanda-button {
    background-color: #17a2b8; /* Teal */
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em; /* Reduce font size */
    transition: background-color 0.2s ease;
}
.view-comanda-button:hover {
    background-color: #138496;
}

/* Comanda Modal Styles (Visible on screen) */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent dark background */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000; /* Ensure it's above everything else */
}

.modal-content {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    max-width: 600px; /* Max width of the modal */
    width: 90%; /* Adaptive width */
    max-height: 90vh; /* Max height before scroll */
    overflow-y: auto; /* Add scroll if content is long */
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #dee2e6;
    padding-bottom: 10px;
    margin-bottom: 15px;
}

.modal-header h2 {
    margin: 0;
    font-size: 1.5em;
    border-bottom: none; /* Remove h2 border inside modal */
    padding-bottom: 0;
}

.close-modal-button {
    background: none;
    border: none;
    font-size: 1.5em;
    cursor: pointer;
    color: #6c757d;
    transition: color 0.2s ease;
}
.close-modal-button:hover {
    color: #343a40;
}

.modal-body {
    flex-grow: 1; /* Allow the body to take up remaining space */
    margin-bottom: 15px;
}

.comanda-details p {
    margin-bottom: 8px;
    font-size: 0.95em;
}
.comanda-details h3 {
    margin-top: 15px;
    margin-bottom: 10px;
    font-size: 1.1em;
    border-bottom: 1px dashed #dee2e6;
    padding-bottom: 5px;
}

.comanda-items-list {
    list-style: disc; /* Use bullets */
    padding-left: 20px; /* Add padding for bullets */
    margin-bottom: 15px;
}
.comanda-items-list li {
    margin-bottom: 5px;
    font-size: 0.9em;
}

.comanda-total {
    font-size: 1.2em;
    font-weight: bold;
    text-align: right;
    margin-top: 15px;
    padding-top: 10px;
    border-top: 2px solid #007bff;
    color: #0056b3;
}

.modal-footer {
    border-top: 1px solid #dee2e6;
    padding-top: 15px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.print-button {
    background-color: #6c757d; /* Gray */
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.2s ease;
}
.print-button:hover {
    background-color: #5a6268;
}

/* --- Print styles --- */
@media print {
    /* Oculta elementos que NO deben imprimirse */
    .screen-only,
    .print-hidden {
        display: none !important;
        /* Asegurar que no ocupen espacio ni influyan en el layout */
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        position: absolute !important; /* Posicionarlos fuera de la vista */
        left: -9999px !important;
        top: -9999px !important;
    }

    /* Asegura que solo el contenedor de impresión sea visible y tome el espacio */
    .comanda-print-area {
        display: block !important; /* Asegura que sea visible */
        position: static !important; /* Asegura que esté en el flujo normal del documento */
        width: 100% !important; /* Ocupa el ancho completo */
        height: auto !important; /* Altura automática según el contenido */
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        /* Reglas de salto de página para el contenedor principal */
        page-break-before: avoid !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
    }

     /* Estilos para los detalles de la comanda dentro del área de impresión */
     .comanda-details-print {
         font-family: monospace;
         font-size: 10pt;
         line-height: 1.4;
         padding: 10mm !important; /* Asegurar padding para márgenes de impresión */
         margin: 0 auto !important; /* Centrar y asegurar margen 0 */
         max-width: 80mm !important; /* Simular ancho de papel de recibo */
         border: 1px dashed #000 !important; /* Borde visual */
         /* Reglas de salto de página para el contenido interno */
         page-break-before: avoid !important;
         page-break-after: avoid !important;
         page-break-inside: avoid !important;
         overflow: visible !important; /* Asegurar que el contenido interno sea visible */
     }

     /* Asegurar que los elementos internos no fuercen saltos */
     .comanda-details-print p,
     .comanda-details-print h3,
     .comanda-items-list-print,
     .comanda-items-list-print li,
     .comanda-total-print {
         margin: 0 !important;
         padding: 0 !important;
         line-height: inherit !important;
         page-break-inside: avoid !important; /* Evitar saltos dentro de estos elementos */
     }

     .comanda-details-print h3 {
         margin-top: 10px !important;
         margin-bottom: 5px !important;
         border-bottom: 1px dashed #ccc !important;
         padding-bottom: 3px !important;
         font-size: 1em !important;
     }

     .comanda-items-list-print {
         list-style: none !important;
         margin-bottom: 10px !important;
     }

     .comanda-items-list-print li {
         margin-bottom: 2px !important;
     }

     .comanda-total-print {
         margin-top: 10px !important;
         padding-top: 5px !important;
         border-top: 1px dashed #000 !important;
         font-size: 1.1em !important;
         font-weight: bold !important;
         text-align: right !important;
     }

    /* Asegurar que no haya márgenes ni padding en el body/html */
     html, body {
         margin: 0 !important;
         padding: 0 !important;
         width: 100% !important;
         min-height: 100vh !important;
         overflow: visible !important;
     }

     /* Eliminar encabezados/pies de página predeterminados del navegador */
     @page {
         margin: 0 !important;
     }
}


/* Responsive styles */
@media (max-width: 768px) {
    .dashboard-container {
        padding: 15px;
        margin: 15px;
    }

    h1 { font-size: 1.8em; }
    h2 { font-size: 1.3em; }
    h3 { font-size: 1.1em; }

    .tabs {
        flex-direction: column; /* Stack tabs on small screens */
        gap: 8px;
    }
    .tab-button {
        width: 100%; /* Tabs take full width */
        text-align: center;
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
        border-bottom: 1px solid #dee2e6; /* Restore bottom border when stacked */
        border-top: 1px solid #dee2e6; /* Ensure top border */
    }
     .tab-button:first-child { border-top-left-radius: 4px; border-top-right-radius: 4px;}
     .tab-button:last-child { border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;}


    .tab-button.active {
        bottom: 0; /* Remove position adjustment when stacked */
        border-bottom-color: #007bff; /* Restore bottom border color */
    }

    .order-list table,
    .order-list thead,
    .order-list tbody,
    .order_list th,
    .order_list td,
    .order_list tr {
        display: block; /* Convert table elements to block */
    }

    .order-list thead tr {
        position: absolute;
        top: -9999px;
        left: -9999px; /* Hide table header */
    }

    .order-list tr {
        border: 1px solid #dee2e6;
        margin-bottom: 10px;
        border-radius: 4px;
        background-color: #fff;
        padding: 10px; /* Add padding to each row */
    }

    .order-list td {
        border: none; /* Remove cell borders */
        border-bottom: 1px solid #eee; /* Add bottom border between cells */
        position: relative;
        padding-left: 50%; /* Space for the pseudo-label */
        text-align: right; /* Align text to the right */
         font-size: 1em; /* Adjust font size */
    }

    .order-list td:last-child {
        border-bottom: 0; /* Remove bottom border of the last cell */
    }

    /* Pseudo-element to show the header as a label */
    .order-list td::before {
        position: absolute;
        top: 6px;
        left: 6px;
        width: 45%; /* Label width */
        padding-right: 10px;
        white-space: nowrap; /* Prevent text wrapping */
        content: attr(data-label); /* Use the data-label attribute */
        font-weight: bold;
        color: #555;
        text-align: left; /* Align label to the left */
    }

    /* Adjustments for elements within td on mobile */
     .status-select, .view-comanda-button {
         width: auto; /* Allow auto width */
         display: inline-block; /* Display inline */
         margin: 0 2px; /* Small margin */
         font-size: 0.9em; /* Adjust size */
     }

    .modal-content {
        padding: 15px;
    }
    .modal-header h2 {
        font-size: 1.3em;
    }
    .close-modal-button {
        font-size: 1.3em;
    }
    .comanda-details p, .comanda-items-list li {
        font-size: 0.9em;
    }
    .comanda-details h3 {
        font-size: 1em;
    }
    .comanda-total {
        font-size: 1.1em;
    }
}

</style>

<script setup>
import { ref, onMounted } from 'vue';
// Importamos nuestro store de autenticación para obtener el token
import { useAuthStore } from '@/stores/authStore';
// Importamos el router si necesitamos navegar (ej: si no estamos autenticados)
import { useRouter } from 'vue-router';

// Obtenemos la instancia del store de autenticación
const authStore = useAuthStore();
// Obtenemos la instancia del router
const router = useRouter();

// --- Estado para la lista de Pedidos ---
const pedidos = ref([]); // Lista de pedidos obtenida de la API
const loading = ref(true); // Indica si se están cargando los pedidos
const error = ref(null);   // Para errores al cargar pedidos

// Estado para manejar mensajes de estado del dashboard (ej: éxito/error al cambiar estado)
const dashboardMessage = ref(null);
const dashboardMessageType = ref(null); // 'success' or 'error'

// --- Estado y Lógica para la Comanda ---
const showComanda = ref(false); // Controla la visibilidad del modal de comanda
const comandaPedido = ref(null); // Almacena los detalles del pedido para la comanda
const loadingComanda = ref(false); // Indica si se está cargando la comanda
const errorComanda = ref(null);   // Para errores al cargar la comanda

// --- Estado y Lógica para el Filtro ---
const filtroEstado = ref(''); // Variable para almacenar el estado de filtro seleccionado ('', 'Pendiente', etc.)

// Opciones para el selector de filtro (deben coincidir con las claves del backend + 'Todos')
const opcionesFiltroEstado = [
    { value: '', text: 'Todos los Estados' }, // Opción para no filtrar
    { value: 'Pendiente', text: 'Pendiente' },
    { value: 'En Preparacion', text: 'En Preparación' }, // Coincide con la clave del backend
    { value: 'En Camino', text: 'En Camino' },         // Coincide con la clave del backend
    { value: 'Entregado', text: 'Entregado' },
    { value: 'Cancelado', text: 'Cancelado' },
];


// Función para mostrar mensajes temporales en el dashboard
const showDashboardMessage = (message, type = 'info') => {
    dashboardMessage.value = message;
    dashboardMessageType.value = type;
    // Opcional: Ocultar el mensaje después de unos segundos
    // setTimeout(() => {
    //     dashboardMessage.value = null;
    //     dashboardMessageType.value = null;
    // }, 5000); // Ocultar después de 5 segundos
};


// Función asíncrona para obtener la lista de pedidos desde la API
// Ahora acepta un parámetro opcional para el estado de filtro
const fetchPedidos = async (estadoFiltro = filtroEstado.value) => {
  loading.value = true;
  error.value = null;
  dashboardMessage.value = null; // Limpiar mensajes al recargar

  const token = authStore.authToken;

  if (!token) {
    error.value = 'No autenticado. Por favor, inicie sesión.';
    console.error('Error: No hay token de autenticación en el store.');
    loading.value = false;
    router.push('/login'); // Redirigir al login
    return;
  }

  try {
    let apiUrl = 'http://127.0.0.1:8000/pedidos/api/list/';

    // --- Añadir parámetro de filtro si hay un estado seleccionado (y no es 'Todos') ---
    if (estadoFiltro && estadoFiltro !== '') {
        // Usamos URLSearchParams para construir la query string
        const params = new URLSearchParams({ estado: estadoFiltro });
        apiUrl = `${apiUrl}?${params.toString()}`;
        console.log('Fetching pedidos con filtro:', apiUrl);
    } else {
        console.log('Fetching todos los pedidos:', apiUrl);
    }
    // --- Fin de añadir parámetro de filtro ---


    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
    });

    if (!response.ok) {
       let errorData = {};
       try {
          errorData = await response.json();
       } catch (e) {
          errorData = { detail: `Error HTTP: ${response.status}` };
       }

       console.error('Error al obtener pedidos (respuesta no OK):', response.status, errorData);

       if (response.status === 401 || response.status === 403) {
            console.warn('Token inválido o sin permisos staff. Deslogueando y redirigiendo al login.');
            authStore.logout(); // Desloguea localmente
            router.push('/login');
            return; // Salimos de la función
       }

       error.value = `Error al obtener pedidos: ${errorData.detail || `HTTP Status ${response.status}`}`;
       return;
    }

    const data = await response.json();

    if (Array.isArray(data)) {
        pedidos.value = data;
        console.log('Pedidos obtenidos y mostrados:', pedidos.value);
    } else {
        error.value = 'Respuesta inesperada del servidor al obtener pedidos.';
        console.error('Error: Respuesta 200 OK no es un array:', data);
    }

  } catch (err) {
    error.value = `Error de conexión o procesamiento: ${err.message}`;
    console.error('Error general en fetchPedidos:', err);
  } finally {
    loading.value = false;
  }
};

// Usamos el hook onMounted para llamar a fetchPedidos cuando el componente se monta
onMounted(() => {
  if (authStore.isAuthenticated) {
      // Al montar, llamamos a fetchPedidos sin filtro explícito.
      // Usará el valor inicial de filtroEstado.value ('') para cargar todos.
      fetchPedidos();
  } else {
      console.warn('OrderDashboardPage montada sin token en store. Redirigiendo al login.');
      router.push('/login');
  }
});

// Función para formatear la fecha/hora
const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    // Usar try-catch para manejar posibles errores de formato de fecha
    try {
        return new Date(dateTimeString).toLocaleString(undefined, options);
    } catch (e) {
        console.error('Error formateando fecha:', dateTimeString, e);
        return 'Fecha inválida';
    }
};

// Función para formatear la hora estimada (si existe)
const formatHoraEstimada = (hora) => {
    if (!hora) return 'N/A';
    // La hora viene en formato HH:MM:SS, mostramos solo HH:MM
    const [hours, minutes] = hora.split(':');
    return `${hours}:${minutes}`;
};


// Función para navegar a la página de toma de pedidos
const goToOrderPage = () => {
    router.push('/order');
};

// --- Función para generar Comanda (ahora abre un modal y carga detalles) ---
const generarComanda = async (pedidoId) => {
    console.log(`Intentando generar comanda para pedido ID: ${pedidoId}`);

    // Resetear estado del modal antes de abrir
    loadingComanda.value = true;
    errorComanda.value = null;
    comandaPedido.value = null;
    showComanda.value = true; // Mostrar el modal (inicialmente en estado de carga)


    const token = authStore.authToken;

    if (!token) {
        errorComanda.value = 'No autenticado. No se puede generar la comanda.';
        console.error('Error: No hay token en el store al intentar generar comanda.');
        loadingComanda.value = false;
        authStore.logout();
        router.push('/login');
        return;
    }

    try {
        // Construimos la URL de la API de detalle de pedido incluyendo el ID
        const apiUrl = `http://127.0.0.1:8000/pedidos/api/${pedidoId}/detail/`; // <-- Usamos la API de detalle

        // Hacemos la petición GET para obtener los detalles completos del pedido
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
        });

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) { errorData = { detail: `Error HTTP: ${response.status}` }; }

            console.error('Error al obtener detalles de comanda (respuesta no OK):', response.status, errorData);

             if (response.status === 401 || response.status === 403) {
                  console.warn('Token inválido o sin permisos staff al obtener comanda. Deslogueando.');
                  authStore.logout();
                  router.push('/login');
                  errorComanda.value = 'Su sesión expiró o no tiene permisos. Inicie sesión nuevamente.';
                  showComanda.value = false; // Cerrar modal si hay error de auth
                  return;
             }
             if (response.status === 404) {
                 errorComanda.value = `Pedido con ID ${pedidoId} no encontrado.`;
             } else {
                 errorComanda.value = `Error al obtener detalles de comanda: ${errorData.detail || `HTTP Status ${response.status}`}`;
             }
            return;
        }

        // Si la respuesta fue exitosa (200 OK)
        const pedidoDetalles = await response.json(); // Esto es el objeto Pedido completo

        console.log('Detalles de comanda obtenidos:', pedidoDetalles);

        // Almacenamos los detalles en la variable reactiva para mostrarlos en el modal
        comandaPedido.value = pedidoDetalles;
        errorComanda.value = null; // Limpiar errores anteriores

    } catch (err) {
        // Capturamos errores de red u otros errores
        errorComanda.value = `Error de conexión o procesamiento al obtener comanda: ${err.message}`;
        console.error('Error general en generarComanda:', err);
    } finally {
        loadingComanda.value = false; // Indicamos que la carga ha terminado
    }
};

// Función para cerrar la vista del modal de comanda
const closeComanda = () => {
    showComanda.value = false;
    comandaPedido.value = null; // Limpiar datos al cerrar
    errorComanda.value = null; // Limpiar errores al cerrar
};

// --- Nueva función para imprimir la comanda ---
const printComanda = () => {
    // Esta función simplemente activa el diálogo de impresión del navegador.
    // Los estilos CSS con @media print se encargarán de dar formato al contenido.
    // Es importante que el contenido a imprimir esté visible en el DOM cuando se llama a window.print()
    window.print();
};


// Función para cambiar el estado del pedido
const cambiarEstado = async (pedidoId, nuevoEstado) => {
     console.log(`Intentando cambiar estado de pedido ID: ${pedidoId} a ${nuevoEstado}`);

     // Validar que se haya seleccionado un estado válido (no la opción disabled)
     // Nota: En este selector no tenemos una opción disabled, así que esta validación es menos crítica aquí,
     // pero es buena práctica si la tuvieras.
     if (!nuevoEstado) {
         showDashboardMessage('Seleccione un estado válido.', 'error');
         return;
     }

     const token = authStore.authToken;

     if (!token) {
         showDashboardMessage('No autenticado. No se puede cambiar el estado.', 'error');
         console.error('Error: No hay token en el store al intentar cambiar estado.');
         authStore.logout();
         router.push('/login');
         return;
     }

     try {
         // Construimos la URL de la API de actualización de estado incluyendo el ID del pedido
         const apiUrl = `http://127.0.0.1:8000/pedidos/api/${pedidoId}/update_status/`;

         // Hacemos la petición PATCH con el nuevo estado en el cuerpo
         const response = await fetch(apiUrl, {
             method: 'PATCH', // Usamos PATCH para actualización parcial
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Token ${token}`,
             },
             body: JSON.stringify({ estado: nuevoEstado }), // Enviamos el nuevo estado como JSON
         });

         if (!response.ok) {
             let errorData = {};
             try { errorData = await response.json(); } catch (e) { errorData = { detail: `Error HTTP: ${response.status}` }; }

             console.error('Error al cambiar estado (respuesta no OK):', response.status, errorData);

             if (response.status === 401 || response.status === 403) {
                  console.warn('Token inválido o sin permisos staff al cambiar estado. Deslogueando.');
                  authStore.logout();
                  router.push('/login');
                  showDashboardMessage('Su sesión expiró o no tiene permisos. Inicie sesión nuevamente.', 'error');
                  return;
             }

             // Mostrar el mensaje de error del backend si es 400 (errores de validación)
             if (response.status === 400) {
                  let formattedErrors = '';
                  if (errorData) {
                      for (const field in errorData) {
                          const messages = Array.isArray(errorData[field]) ? errorData[field].join(', ') : errorData[field];
                          formattedErrors += `${field}: ${messages}\n`;
                      }
                  }
                  showDashboardMessage(`Error de validación al cambiar estado:\n${formattedErrors || JSON.stringify(errorData)}`, 'error');

             } else {
                  // Para otros errores (ej: 500), mostrar mensaje general o detalle del backend
                  showDashboardMessage(`Error al cambiar estado: ${errorData.detail || `HTTP Status ${response.status}`}`, 'error');
             }
             // Si hubo un error, refrescamos la lista para mostrar el estado real desde el backend
             fetchPedidos(); // Refrescar la lista para mostrar el estado real desde el backend
             return;
         }

         // Si la respuesta fue exitosa (200 OK)
         const successData = await response.json(); // La respuesta contiene el objeto Pedido actualizado

         console.log('Estado de pedido actualizado con éxito:', successData);

         // --- Actualizar el estado localmente (Optimista) ---
         // Encontramos el pedido en nuestra lista local y actualizamos su estado
         const index = pedidos.value.findIndex(p => p.id === pedidoId);
         if (index !== -1) {
             // Actualizamos solo el estado en el array reactivo para una respuesta visual rápida
             pedidos.value[index].estado = nuevoEstado;
             // Opcional: Si la API devuelve el objeto completo actualizado, podrías reemplazar el objeto entero:
             // pedidos.value[index] = successData;
         }
         // --- Fin de actualización local ---

         showDashboardMessage(`Estado del Pedido #${pedidoId} actualizado a "${nuevoEstado}".`, 'success');

     } catch (err) {
         // Capturamos errores de red u otros errores durante la petición
         showDashboardMessage(`Error de conexión o procesamiento al cambiar estado: ${err.message}`, 'error');
         console.error('Error general en cambiarEstado:', err);
         // Considerar refetchPedidos() aquí también si la actualización local falló o para asegurar consistencia
         fetchPedidos(); // Refrescar la lista en caso de error de red
     }
};

// Función que se llama cuando cambia el selector de filtro
const handleFilterChange = () => {
    console.log('Filtro de estado cambiado a:', filtroEstado.value);
    // Llamamos a fetchPedidos con el nuevo valor del filtro
    fetchPedidos(filtroEstado.value);
};


// Opcional: Getter computado para calcular el total provisional del pedido en la UI
// (No necesario en el dashboard, pero lo mantenemos si lo copiaste de OrderPage)
/*
import { computed } from 'vue';
const totalPedidoProvisional = computed(() => {
    return pedidoProvisionalItems.value.reduce((sum, item) => {
        const precio = parseFloat(item.precio_unitario);
        const cantidad = parseInt(item.cantidad);
        if (!isNaN(precio) && !isNaN(cantidad)) {
             return sum + (precio * cantidad);
        }
        return sum;
    }, 0);
});
*/


</script>

<template>
  <div class="order-dashboard-container">
    <h1>Dashboard de Pedidos Activos</h1>

     <div class="header-buttons print-hidden">
         <button @click="goToOrderPage" class="go-to-order-button">
            + Nuevo Pedido
        </button>

         <button @click="authStore.logout(); router.push('/login')" class="logout-button">
            Logout
        </button>
     </div>


    <div v-if="dashboardMessage" :class="['dashboard-message', dashboardMessageType]">
        {{ dashboardMessage }}
    </div>

    <div class="filter-section print-hidden">
        <label for="estadoFilter">Filtrar por Estado:</label>
        <select id="estadoFilter" v-model="filtroEstado" @change="handleFilterChange">
            <option v-for="option in opcionesFiltroEstado" :key="option.value" :value="option.value">
                {{ option.text }}
            </option>
        </select>
    </div>

    <div v-if="loading">Cargando pedidos...</div>
    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="!loading && !error && pedidos.length > 0" class="order-list">
      <table>
        <thead>
          <tr>
            <th># Pedido</th>
            <th>Fecha/Hora</th>
            <th>Tipo Venta</th>
            <th>Cliente</th>
            <th>Hora Estimada</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Ítems</th>
            <th class="print-hidden">Acciones</th> </tr>
        </thead>
        <tbody>
          <tr v-for="pedido in pedidos" :key="pedido.id">
            <td data-label="# Pedido">{{ pedido.id }}</td>
            <td data-label="Fecha/Hora">{{ formatDateTime(pedido.fecha_hora) }}</td>
            <td data-label="Tipo Venta">{{ pedido.tipo_venta }}</td>
            <td data-label="Cliente">
                <div v-if="pedido.cliente">
                    <strong>{{ pedido.cliente.nombre }}</strong><br>
                    <small>{{ pedido.cliente.telefono }}</small><br>
                    <small>{{ pedido.cliente.direccion }}</small>
                </div>
                <div v-else>
                    Mostrador
                    </div>
            </td>
            <td data-label="Hora Estimada">{{ formatHoraEstimada(pedido.hora_estimada_entrega) }}</td>
            <td data-label="Total">${{ parseFloat(pedido.total).toFixed(2) }}</td>
            <td data-label="Estado">
                <select
                     :value="pedido.estado"
                     @change="cambiarEstado(pedido.id, $event.target.value)"
                     class="status-select print-hidden"
                 >
                     <option value="Pendiente">Pendiente</option>
                     <option value="En Preparacion">En Preparación</option>
                     <option value="En Camino">En Camino</option>
                     <option value="Entregado">Entregado</option>
                     <option value="Cancelado">Cancelado</option>
                 </select>
                 <span class="print-only">{{ pedido.estado }}</span>
            </td>
            <td data-label="Ítems">
                <ul>
                    <li v-for="item in pedido.detalles" :key="item.id">
                        <strong>{{ item.cantidad }} x {{ item.producto.nombre }}</strong>
                        {{ item.tamaño ? `(${item.tamaño})` : '' }}
                        ({{ item.tipo_unidad }})
                        </li>
                </ul>
            </td>
            <td class="actions-cell print-hidden" data-label="Acciones"> <button @click="generarComanda(pedido.id)" class="action-button comanda-button">Comanda</button>
                 </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && !error && pedidos.length === 0">
        No hay pedidos activos en este momento.
    </div>

  </div> <div v-if="showComanda" class="modal-overlay" @click.self="closeComanda">
      <div class="modal-content" id="comandaToPrint">
           <div class="comanda-header">
                <h3>Comanda del Pedido #{{ comandaPedido ? comandaPedido.id : '...' }}</h3>
                <button @click="closeComanda" class="close-comanda-button print-hidden">X</button>
            </div>

            <div v-if="loadingComanda">Cargando comanda...</div>
            <div v-if="errorComanda" class="error-message">{{ errorComanda }}</div>

            <div v-if="comandaPedido && !loadingComanda && !errorComanda" class="comanda-details">
                <p><strong>Fecha/Hora:</strong> {{ formatDateTime(comandaPedido.fecha_hora) }}</p>
                <p><strong>Tipo de Venta:</strong> {{ comandaPedido.tipo_venta }}</p>
                 <p v-if="comandaPedido.hora_estimada_entrega">
                    <strong>Hora Estimada:</strong> {{ formatHoraEstimada(comandaPedido.hora_estimada_entrega) }}
                </p>

                <div v-if="comandaPedido.cliente">
                    <p><strong>Cliente:</strong> {{ comandaPedido.cliente.nombre }}</p>
                    <p><strong>Teléfono:</strong> {{ comandaPedido.cliente.telefono }}</p>
                    <p><strong>Dirección:</strong> {{ comandaPedido.cliente.direccion }}</p>
                </div>
                <div v-else>
                     <p><strong>Cliente:</strong> Mostrador</p>
                </div>


                <h4>Ítems:</h4>
                <ul>
                    <li v-for="item in comandaPedido.detalles" :key="item.id">
                        <strong>{{ item.cantidad }} x {{ item.producto.nombre }}</strong>
                        {{ item.tamaño ? `(${item.tamaño})` : '' }}
                        ({{ item.tipo_unidad }})
                        </li>
                </ul>

                <p><strong>Total:</strong> ${{ parseFloat(comandaPedido.total).toFixed(2) }}</p>
                <p v-if="comandaPedido.tipo_venta === 'Delivery' && parseFloat(comandaPedido.costo_delivery) > 0">
                    (Costo Delivery: ${{ parseFloat(comandaPedido.costo_delivery).toFixed(2) }})
                </p>

                 <button @click="printComanda" class="action-button print-button print-hidden">Imprimir Comanda</button>

            </div>
        </div>
    </div>
</template>

<style scoped>
/* Estilos básicos para la página del dashboard de pedidos */
.order-dashboard-container {
  font-family: 'Arial', sans-serif; /* Fuente más común y legible */
  padding: 20px; /* Ajustar padding general */
  background-color: #f8f9fa; /* Fondo gris muy claro */
  border-radius: 8px; /* Bordes redondeados */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* Sombra suave */
  max-width: 1200px; /* Ancho máximo */
  margin: 20px auto; /* Centrar */
  position: relative;
  z-index: 1;
  color: #333; /* Color de texto general */
}

h1 {
    color: #343a40; /* Color de texto oscuro */
    border-bottom: 2px solid #007bff; /* Borde inferior azul */
    padding-bottom: 10px; /* Espacio debajo del título */
    margin-bottom: 20px; /* Espacio debajo del título */
    display: block; /* Título en su propia línea */
    text-align: center; /* Centrar título */
    font-size: 1.6em; /* Tamaño de fuente del título más pequeño */
    font-weight: 700;
}

/* Contenedor para botones de acción principales */
.header-buttons {
    /* Eliminamos float para mejor control con flexbox */
    margin-top: 10px; /* Espacio arriba */
    margin-bottom: 20px; /* Espacio abajo */
    display: flex; /* Usar flexbox para alinear botones */
    justify-content: center; /* Centrar botones horizontalmente */
    gap: 10px; /* Espacio entre botones */
    flex-wrap: wrap; /* Permitir que los botones se envuelvan */
}

.logout-button, .go-to-order-button {
    padding: 8px 15px; /* Padding de botones */
    border: none;
    border-radius: 4px; /* Bordes redondeados */
    cursor: pointer;
    font-size: 1em; /* Tamaño de fuente */
    font-weight: 600;
    transition: background-color 0.2s ease, transform 0.1s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); /* Sombra sutil */
}

.logout-button {
    background-color: #dc3545; /* Rojo */
    color: white;
}
.logout-button:hover { background-color: #c82333; transform: translateY(-1px); }

.go-to-order-button {
    background-color: #28a745; /* Verde */
    color: white;
}
.go-to-order-button:hover { background-color: #218838; transform: translateY(-1px); }


/* Estilos para los mensajes de estado del dashboard */
.dashboard-message {
    padding: 10px;
    margin-bottom: 20px;
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
    font-size: 1em;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.dashboard-message.success {
    background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;
}
.dashboard-message.error {
    background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;
}


.error-message {
  color: #dc3545;
  margin-bottom: 20px;
  text-align: center;
  font-weight: bold;
  font-size: 1.1em;
}

/* Estilos de la sección de filtro */
.filter-section {
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    background-color: #e9ecef;
    display: flex;
    align-items: center;
    gap: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.filter-section label {
    font-weight: bold;
    color: #495057;
    font-size: 1em;
}

.filter-section select {
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    box-sizing: border-box;
    font-size: 1em;
    cursor: pointer;
    background-color: #fff;
    transition: border-color 0.2s ease;
}
.filter-section select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}


.order-list table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    font-size: 0.95em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    background-color: #fff;
    border-radius: 4px;
    overflow: hidden;
}

.order-list th,
.order-list td {
    border: 1px solid #dee2e6;
    padding: 10px; /* Ajustar padding */
    text-align: left;
    vertical-align: top;
}

.order-list th {
    background-color: #007bff;
    color: white;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.03em; /* Ajustar espaciado */
    position: sticky;
    top: 0;
    z-index: 10;
    font-size: 0.85em; /* Ajustar tamaño de fuente del encabezado de tabla */
}

 .order-list tbody tr:nth-child(even) {
    background-color: #f8f9fa;
}
.order-list tbody tr:hover {
    background-color: #e9ecef;
}


.order-list td ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.order-list td li {
    margin-bottom: 5px;
    padding-bottom: 5px;
    border-bottom: 1px dashed #ccc;
    font-size: 0.9em; /* Ajustar tamaño de fuente de ítem */
    color: #555;
}

.order-list td li:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.actions-cell {
    white-space: nowrap;
    width: 1%;
    text-align: center;
}

.action-button, .status-select {
    padding: 6px 12px;
    border: 1px solid #adb5bd;
    border-radius: 4px;
    margin-right: 5px;
    cursor: pointer;
    font-size: 0.9em; /* Ajustar tamaño de fuente */
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
    font-weight: 500;
}

.action-button:last-child, .status-select:last-child {
    margin-right: 0;
}


.action-button:hover {
    transform: translateY(-1px);
}

.comanda-button {
    background-color: #ffc107;
    color: #333;
    border-color: #ffc107;
}
.comanda-button:hover {
    background-color: #e0a800;
    border-color: #d39e00;
}

.status-select {
    background-color: #fff;
    min-width: 100px; /* Ajustar ancho mínimo */
    font-size: 0.9em; /* Ajustar tamaño de fuente */
}

/* --- Estilos específicos para la estructura del Modal --- */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5); /* Fondo oscuro semi-transparente */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    pointer-events: auto;
    /* backdrop-filter: blur(3px); /* Desenfoque más sutil */
}

.modal-content {
    background-color: #fff;
    padding: 30px; /* Ajustar padding */
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25); /* Sombra ajustada */
    max-width: 600px; /* Ancho máximo */
    max-height: 90%;
    overflow-y: auto;
    position: relative;
    z-index: 1001; /* Asegura que esté por encima del overlay */
    pointer-events: all;
    animation: fadeInScale 0.3s ease-out;
}

@keyframes fadeInScale {
    from {
        opacity: 0;
        transform: scale(0.98); /* Escala inicial más cercana a 1 */
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}


/* --- Estilos de la sección de Comanda dentro del Modal --- */
.comanda-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #007bff; /* Borde azul */
    padding-bottom: 10px;
    margin-bottom: 15px;
}

.comanda-header h3 {
    margin: 0;
    color: #0056b3;
    border-bottom: none;
    font-size: 1.4em; /* Ajustar tamaño de título de comanda */
    font-weight: 700;
}

.close-comanda-button {
    background-color: #ccc;
    color: #333; /* Color de texto oscuro */
    border: none;
    border-radius: 50%;
    width: 25px;
    height: 25px;
    font-size: 0.9em;
    cursor: pointer;
    text-align: center;
    line-height: 25px;
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1002; /* Asegura que esté por encima del contenido del modal */
    transition: background-color 0.2s ease, transform 0.1s ease;
}
.close-comanda-button:hover {
    background-color: #bbb;
    transform: rotate(90deg);
}

.comanda-details p {
    margin-bottom: 8px;
    font-size: 1em; /* Ajustar tamaño de fuente */
    color: #333;
    line-height: 1.4;
}
.comanda-details p strong {
    color: #000;
    font-weight: 600;
}


.comanda-details h4 {
    margin-top: 15px;
    margin-bottom: 10px;
    color: #343a40;
    border-bottom: 1px dashed #a0cfff;
    padding-bottom: 5px;
    font-size: 1.1em; /* Ajustar tamaño de subtítulo */
    font-weight: 600;
}

.comanda-details ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.comanda-details li {
    margin-bottom: 5px;
    font-size: 0.95em; /* Ajustar tamaño de fuente */
    color: #555;
    line-height: 1.3;
}
.comanda-details li strong {
    color: #333;
    font-weight: 600;
}


.print-button {
    background-color: #6c757d;
    color: white;
    border-color: #6c757d;
    margin-top: 20px;
    padding: 10px 20px;
    font-size: 1em; /* Ajustar tamaño de fuente */
    border-radius: 4px;
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
    font-weight: 600;
    display: inline-block; /* Volver a inline-block para no ocupar todo el ancho por defecto */
    text-align: center;
}
.print-button:hover {
    background-color: #5a6268;
    border-color: #545b62;
    transform: translateY(-1px);
}


/* --- Estilos específicos para Impresión (RESTAURADOS) --- */
@media print {
    /* Oculta todo el contenido del componente EXCEPTO el modal overlay */
    /* Esto es más específico para el contenido dentro del componente Vue */
    .order-dashboard-container > *:not(.modal-overlay) {
         display: none !important;
    }

    /* Asegura que el modal overlay y su contenido se muestren y se formateen para impresión */
    .modal-overlay {
        position: static !important; /* Elimina el posicionamiento fijo */
        background-color: transparent !important; /* Elimina el fondo oscuro */
        display: block !important; /* Asegura que el overlay se muestre */
        width: auto !important;
        height: auto !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        /* Eliminar flexbox centering que puede interferir con print layout */
        justify-content: initial !important;
        align-items: initial !important;
    }

    .modal-content {
        width: auto !important; /* Ancho automático */
        max-width: 100% !important; /* No restringir ancho */
        max-height: none !important; /* No restringir altura */
        box-shadow: none !important; /* Elimina la sombra */
        border-radius: 0 !important; /* Elimina bordes redondeados */
        padding: 10mm !important; /* Añade un poco de margen para impresión */
        overflow: visible !important; /* Permite que el contenido se expanda */
        margin: 0 auto !important; /* Centra el contenido si es más estrecho que la página */
        background-color: white !important; /* Asegura fondo blanco */
        animation: none !important; /* Deshabilita animaciones en impresión */
    }

    .print-hidden {
        display: none !important; /* Oculta elementos con esta clase en la impresión (botones, etc.) */
    }

    /* Opcional: Ajustar fuentes, márgenes, etc. para impresión */
    body {
        font-size: 12pt;
    }
    .comanda-details h3, .comanda-details h4 {
        margin-top: 1em;
        margin-bottom: 0.5em;
    }
    .comanda-details p, .comanda-details li {
        margin-bottom: 0.2em;
    }
}

/* Ocultar el estado como texto en pantalla, solo mostrar el selector */
.print-only {
    display: none;
}

/* Media query para pantallas más pequeñas (ej: móviles) */
@media (max-width: 768px) {
    .order-dashboard-container {
        padding: 15px;
        margin: 15px;
    }

    h1 {
        font-size: 1.5em;
        padding-bottom: 10px;
        margin-bottom: 20px;
        margin-right: 0;
        display: block;
        text-align: center;
    }

    .header-buttons {
        float: none;
        margin-top: 15px;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .logout-button, .go-to-order-button {
        padding: 8px 15px;
        font-size: 1em;
    }

    .filter-section {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 15px;
    }

    .filter-section label {
        font-size: 1em;
    }

    .filter-section select {
        width: 100%;
        padding: 8px;
    }

    .order-list table,
    .order-list thead,
    .order-list tbody,
    .order-list th,
    .order-list td,
    .order-list tr {
        display: block;
    }

    .order-list thead tr {
        position: absolute;
        top: -9999px;
        left: -9999px;
    }

    .order-list tr {
        border: 1px solid #ccc;
        margin-bottom: 15px;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .order-list td {
        border: none;
        border-bottom: 1px solid #eee;
        position: relative;
        padding-left: 50%;
        text-align: right;
        font-size: 0.95em; /* Ajustar tamaño de fuente de celda */
    }

    .order-list td:before {
        position: absolute;
        top: 6px;
        left: 6px;
        width: 45%;
        padding-right: 10px;
        white-space: nowrap;
        font-weight: bold;
        content: attr(data-label); /* Usar atributo data-label */
        text-align: left;
        color: #555;
        font-size: 0.9em; /* Ajustar tamaño de fuente de etiqueta */
    }

    /* Asegurarse de que los atributos data-label estén en el template */
    /* (Ya los añadí en el template de esta versión) */

    .order-list td ul {
        padding-left: 0;
    }

    .order-list td li {
        border-bottom: none;
        padding-bottom: 0;
        margin-bottom: 5px;
    }

    .actions-cell {
        text-align: center;
        padding-left: 15px;
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
    }
    .actions-cell:before {
         content: 'Acciones:';
         left: 6px;
         width: auto;
         padding-right: 10px;
         font-weight: bold;
         color: #555;
         position: static;
         margin-right: 10px;
    }


    .modal-content {
        padding: 20px;
        max-width: 95%;
    }

    .comanda-header h3 {
        font-size: 1.4em;
    }

    .close-comanda-button {
        width: 30px;
        height: 30px;
        font-size: 1em;
        line-height: 30px;
        top: 10px;
        right: 10px;
    }

    .comanda-details p, .comanda-details li {
        font-size: 1em;
    }

    .comanda-details h4 {
        font-size: 1.3em;
    }

    .print-button {
        padding: 10px 20px;
        font-size: 1.1em;
    }
}

</style>

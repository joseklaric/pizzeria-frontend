<script setup>
import { ref, onMounted, computed, watch } from 'vue'; // Importamos watch
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

// --- Estado para productos y categorías ---
const productos = ref([]); // Lista de productos obtenida de la API
const loadingProductos = ref(true);
const errorProductos = ref(null);

// --- Estado y Lógica para la Selección de Productos con Selectores (Ahora más detallada) ---
const tipoProductoSeleccionado = ref(null); // Almacena el tipo seleccionado (string: 'Pizza', 'Empanada', 'Otros')
const productoSeleccionado = ref(null);     // Almacena el objeto producto seleccionado (ej: { id: 1, nombre: 'Margarita', tipo: 'Pizza', precios: [...] })

// Nuevos estados para la selección detallada de variantes de Pizza
const selectedPizzaSize = ref(null); // Almacena el tamaño de pizza seleccionado (string: '8p', '12p')
const selectedPizzaUnitType = ref(null); // Almacena el tipo de unidad de pizza seleccionado (string: 'Entera', 'Mitad')

// Estado para la selección de variantes de Empanada (puede ser más simple, ej: solo cantidad)
// Por ahora, asumimos que las empanadas solo se venden por 'Unidad', como en tu backend.
// No necesitamos un selector de tamaño o tipo_unidad adicional si solo hay una opción.

const cantidadSeleccionada = ref(1);        // Almacena la cantidad ingresada


// Propiedad computada para obtener la lista de tipos de producto únicos
const tiposProductos = computed(() => {
	const tipos = new Set(); // Usamos un Set para obtener tipos únicos automáticamente
	productos.value.forEach(producto => {
		// Solo añadimos tipos de productos que están activos
		if (producto.activo) {
            // Usamos el campo 'tipo' del producto. Si no tiene 'tipo', lo agrupamos en 'Otros'.
             tipos.add(producto.tipo || 'Otros'); // Agrupa productos sin tipo en 'Otros'
		}
	});
	// Convertimos el Set a Array y lo ordenamos alfabéticamente
	// Podemos añadir 'Otros' al final si existe
    const sortedTipos = Array.from(tipos).sort();
    if (sortedTipos.includes('Otros')) {
        sortedTipos.splice(sortedTipos.indexOf('Otros'), 1); // Remove 'Otros'
        sortedTipos.push('Otros'); // Add 'Otros' at the end
    }
	return sortedTipos;
});

// Propiedad computada para obtener los productos del tipo seleccionado actualmente
const productosDelTipoSeleccionado = computed(() => {
	if (!tipoProductoSeleccionado.value) {
		return []; // Si no hay tipo seleccionado, la lista está vacía
	}
	// Filtramos la lista plana de productos por el tipo seleccionado y que estén activos
	return productos.value.filter(producto =>
		(producto.tipo || 'Otros') === tipoProductoSeleccionado.value && producto.activo
	).sort((a, b) => a.nombre.localeCompare(b.nombre)); // Opcional: ordenar productos por nombre
});

// --- Nuevas propiedades computadas para la selección de variantes de Pizza ---

// Propiedad computada para obtener los precios del producto seleccionado (simplificada)
const preciosProductoSeleccionado = computed(() => {
	if (!productoSeleccionado.value || !productoSeleccionado.value.precios) {
		return [];
	}
	// Retornamos los precios asociados al producto seleccionado
	return productoSeleccionado.value.precios;
});


// Propiedad computada para obtener los tamaños disponibles para el producto de tipo Pizza seleccionado
const availablePizzaSizes = computed(() => {
    // Solo calculamos esto si hay un producto seleccionado Y es una Pizza
    if (!productoSeleccionado.value || productoSeleccionado.value.tipo !== 'Pizza' || !preciosProductoSeleccionado.value) {
        return [];
    }
    // Obtenemos los tamaños únicos de los precios disponibles para esta pizza
    const sizes = new Set();
    preciosProductoSeleccionado.value.forEach(precio => {
        if (precio.tamaño) {
            sizes.add(precio.tamaño);
        }
    });
    return Array.from(sizes).sort(); // Ordenar tamaños si es necesario (ej: '8p', '12p')
});

// Propiedad computada para obtener los tipos de unidad disponibles para el tamaño de Pizza seleccionado
const availablePizzaUnitTypes = computed(() => {
    // Solo calculamos esto si hay un tamaño de pizza seleccionado
    if (!selectedPizzaSize.value || !productoSeleccionado.value || productoSeleccionado.value.tipo !== 'Pizza' || !preciosProductoSeleccionado.value) {
        return [];
    }
    // Obtenemos los tipos de unidad únicos de los precios que coinciden con el tamaño seleccionado
    const unitTypes = new Set();
    preciosProductoSeleccionado.value
        .filter(precio => precio.tamaño === selectedPizzaSize.value)
        .forEach(precio => {
            if (precio.tipo_precio) {
                unitTypes.add(precio.tipo_precio);
            }
        });
    return Array.from(unitTypes).sort(); // Ordenar tipos de unidad si es necesario (ej: 'Entera', 'Mitad')
});

// Propiedad computada para encontrar el objeto PrecioProducto final basado en las selecciones
const finalSelectedPriceObject = computed(() => {
    if (!productoSeleccionado.value || !preciosProductoSeleccionado.value) {
        return null;
    }

    const tipoProducto = productoSeleccionado.value.tipo;

    // Lógica para Pizzas: busca por tamaño y tipo de precio
    if (tipoProducto === 'Pizza' && selectedPizzaSize.value && selectedPizzaUnitType.value) {
        return preciosProductoSeleccionado.value.find(precio =>
            precio.tamaño === selectedPizzaSize.value &&
            precio.tipo_precio === selectedPizzaUnitType.value
        );
    }

    // Lógica para Empanadas y Otros: busca por tipo de precio 'Unidad'
    // Asumimos que Empanadas y 'Otros' tienen un precio de tipo 'Unidad' sin tamaño.
    // Si tu backend permite 'Otros' con tamaños o otros tipos de precio, ajusta aquí.
    if (tipoProducto === 'Empanada' || tipoProducto === 'Otros') {
         return preciosProductoSeleccionado.value.find(precio =>
             precio.tipo_precio === 'Unidad' // Busca el precio de tipo 'Unidad'
             // Podrías añadir && !precio.tamaño si quieres asegurarte de que no tengan tamaño
         );
    }

    // Si no se encuentra un precio que coincida con la selección
    return null;
});


// Propiedad computada para obtener el precio unitario del ítem seleccionado actualmente
// Usa finalSelectedPriceObject para obtener el precio
const getProductPrice = computed(() => {
    const priceObj = finalSelectedPriceObject.value;
    return priceObj ? parseFloat(priceObj.precio) : 0;
});


// Propiedad computada para calcular el total provisional del pedido en la UI
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


// --- Watchers para resetear selecciones en cascada ---

// Watcher principal: cuando cambia el tipo de producto
watch(tipoProductoSeleccionado, () => {
     productoSeleccionado.value = null; // Resetear producto
     selectedPizzaSize.value = null; // Resetear tamaño de pizza
     selectedPizzaUnitType.value = null; // Resetear tipo de unidad de pizza
     cantidadSeleccionada.value = 1; // Resetear cantidad
});

// Watcher: cuando cambia el producto seleccionado
watch(productoSeleccionado, (newProducto) => {
     // Resetear selecciones de variante al cambiar de producto
      selectedPizzaSize.value = null;
      selectedPizzaUnitType.value = null;
      cantidadSeleccionada.value = 1;

     // Si el nuevo producto es una Empanada, el precio final ya está determinado (si existe 'Unidad')
     // No necesitamos hacer nada más aquí, el computed finalSelectedPriceObject lo manejará.
});

// Watcher: cuando cambia el tamaño de pizza seleccionado
watch(selectedPizzaSize, () => {
    selectedPizzaUnitType.value = null; // Resetear tipo de unidad al cambiar tamaño
    cantidadSeleccionada.value = 1; // Resetear cantidad
});

// Watcher: cuando cambia el tipo de unidad de pizza seleccionado
watch(selectedPizzaUnitType, () => {
    cantidadSeleccionada.value = 1; // Resetear cantidad
});


// --- Estado para el Pedido Provisional en el Frontend ---
const pedidoProvisionalItems = ref([]); // Lista de ítems seleccionados
const tipoVenta = ref('Mostrador'); // Tipo de venta ('Mostrador' o 'Delivery')
const horaEstimada = ref(''); // Almacena la hora estimada como string (ej: "HH:MM")

// --- Estado para datos del cliente ---
const clienteNombre = ref('');
const clienteTelefono = ref('');
const clienteDireccion = ref('');
const clienteId = ref(null); // Para almacenar el ID del cliente si es uno existente

// --- Estado para la búsqueda de clientes ---
const searchingClients = ref(false);
const clientSearchResults = ref([]);
const showClientSuggestions = ref(false); // Controla la visibilidad de las sugerencias

// --- Bandera para controlar si la actualización de teléfono es por selección ---
const isSelectingClient = ref(false);


// Estado para manejar el proceso de envío del pedido
const sendingOrder = ref(false); // Indica si se está enviando el pedido
const statusMessage = ref(null); // Mensaje de estado (éxito/error)
const messageType = ref(null); // 'success' or 'error'


// Función para mostrar mensajes temporales
const showStatusMessage = (message, type = 'info') => {
    statusMessage.value = message;
    messageType.value = type;
    // Opcional: Ocultar el mensaje después de unos segundos
    // setTimeout(() => {
    //     statusMessage.value = null;
    //     messageType.value = null;
    // }, 5000); // Ocultar después de 5 segundos
};


// Función para agregar el ítem seleccionado actualmente al pedido provisional
const agregarItemSeleccionadoAPedido = () => {
	// Validamos que se haya seleccionado un precio/variante final y una cantidad válida
	if (!finalSelectedPriceObject.value) {
		// El mensaje de error ahora es más general ya que la selección es por pasos
		showStatusMessage('Complete la selección de producto, tamaño y variante.', 'error');
		return;
	}
	const cantidadAAgregar = cantidadSeleccionada.value;

	if (!cantidadAAgregar || cantidadAAgregar <= 0 || !Number.isInteger(cantidadAAgregar)) {
		showStatusMessage('Ingrese una cantidad entera positiva.', 'error');
		return;
	}

    // Validar que el precio unitario sea válido (usando el computed)
    if (getProductPrice.value <= 0 || isNaN(getProductPrice.value)) {
        console.error('Precio unitario inválido:', getProductPrice.value);
        showStatusMessage('No se pudo obtener un precio válido para el ítem seleccionado.', 'error');
        return;
    }


	// Limpiar mensajes de estado de envío anteriores
	statusMessage.value = null;


	// Creamos un objeto que representa el ítem a añadir al pedido provisional
	// Usamos los datos del producto y el precio final seleccionado
	const newItem = {
		// Identificadores para el backend (deben coincidir con PedidoCreateSerializer.items)
		producto_id: productoSeleccionado.value.id, // Usar el ID del producto seleccionado
		// Usamos el ID del precio para identificar la variante en el frontend si es necesario
		// Aunque el backend espera tamaño y tipo_unidad, el ID del precio es útil para la clave única
        // id: finalSelectedPriceObject.value.id, // Usar ID del precio como clave única en frontend
        // Mejor usar una combinación de IDs y variantes para la clave única en frontend
        id: `${productoSeleccionado.value.id}-${finalSelectedPriceObject.value.tamaño || 'no-size'}-${finalSelectedPriceObject.value.tipo_precio}`,

		tamaño: finalSelectedPriceObject.value.tamaño, // Usar el tamaño del precio final
		tipo_unidad: finalSelectedPriceObject.value.tipo_precio, // Usar el tipo de unidad del precio final
		cantidad: cantidadAAgregar, // <-- Usamos la cantidad del input

		// Información adicional para mostrar en la UI (no se enviará al backend en este formato)
		producto_nombre: productoSeleccionado.value.nombre, // Usar el nombre del producto seleccionado
		precio_unitario: getProductPrice.value, // Precio unitario calculado (usando computed)
	};

	// Calcular el subtotal para mostrar en el frontend
	newItem.subtotal = newItem.precio_unitario * newItem.cantidad;


	// Verificar si el ítem ya existe en el pedido provisional (mismo producto, tamaño y tipo de unidad)
    const existingItemIndex = pedidoProvisionalItems.value.findIndex(item =>
        item.producto_id === newItem.producto_id &&
        item.tamaño === newItem.tamaño &&
        item.tipo_unidad === newItem.tipo_unidad
    );


	if (existingItemIndex > -1) {
		// Si el ítem ya existe, sumamos la nueva cantidad a la existente
		pedidoProvisionalItems.value[existingItemIndex].cantidad += cantidadAAgregar;
		// Recalcular subtotal del ítem existente
        pedidoProvisionalItems.value[existingItemIndex].subtotal =
            parseFloat(pedidoProvisionalItems.value[existingItemIndex].cantidad) * parseFloat(pedidoProvisionalItems.value[existingItemIndex].precio_unitario);

		console.log('Cantidad actualizada para ítem existente:', pedidoProvisionalItems.value[existingItemIndex]);
	} else {
		// Si es un ítem nuevo, lo añadimos a la lista
		pedidoProvisionalItems.value.push(newItem);
		console.log('Nuevo ítem añadido al pedido provisional:', newItem);
	}

	// Opcional: Resetear los selectores y cantidad después de agregar
	// tipoProductoSeleccionado.value = null; // Podría resetear todo
	// productoSeleccionado.value = null;
	// selectedPizzaSize.value = null;
	// selectedPizzaUnitType.value = null;
	cantidadSeleccionada.value = 1; // Resetear la cantidad


    // Mensaje de confirmación con los detalles del ítem añadido
    const itemDescription = `${newItem.producto_nombre}${newItem.tamaño ? ' (' + newItem.tamaño + ')' : ''} (${newItem.tipo_unidad})`;
    showStatusMessage(`${newItem.cantidad} x ${itemDescription} añadido al pedido.`, 'success');

};

// Función para remover un ítem del pedido provisional
const removerItemDePedido = (itemToRemove) => { // Cambiado para recibir el objeto ítem
	if (confirm('¿Estás seguro de que quieres remover este ítem?')) {
		pedidoProvisionalItems.value = pedidoProvisionalItems.value.filter(item => item.id !== itemToRemove.id);
		console.log('Ítem removido del pedido provisional. ID:', itemToRemove.id);
		statusMessage.value = null; // Limpiar mensajes al remover
	}
};

// Función para actualizar la cantidad de un ítem directamente en la lista
const updateItemQuantity = (itemToUpdate, event) => { // Cambiado para recibir el objeto ítem
    const newQuantity = parseInt(event.target.value);
    const itemIndex = pedidoProvisionalItems.value.findIndex(item => item.id === itemToUpdate.id);

    if (itemIndex > -1) {
        if (!isNaN(newQuantity) && newQuantity > 0) {
            pedidoProvisionalItems.value[itemIndex].cantidad = newQuantity;
            // Recalcular subtotal
            pedidoProvisionalItems.value[itemIndex].subtotal =
                parseFloat(pedidoProvisionalItems.value[itemIndex].cantidad) * parseFloat(pedidoProvisionalItems.value[itemIndex].precio_unitario);
             console.log('Cantidad actualizada para ítem:', pedidoProvisionalItems.value[itemIndex]);
        } else if (newQuantity === 0) {
            // Si la cantidad es 0, remover el ítem
            removerItemDePedido(itemToUpdate);
        } else {
            // Si la entrada no es válida (ej: texto, negativo), restaurar la cantidad anterior en el input
            event.target.value = pedidoProvisionalItems.value[itemIndex].cantidad;
             showStatusMessage('Cantidad inválida. Debe ser un número entero positivo.', 'error');
        }
    }
};


// Función para enviar el pedido al backend
const enviarPedido = async () => {
	// Validaciones antes de enviar
	if (pedidoProvisionalItems.value.length === 0) {
		showStatusMessage('El pedido está vacío. Agregue ítems antes de enviar.', 'error');
		return;
	}

    // Validar datos de cliente si se ingresaron, independientemente del tipo de venta
    // Si se ingresó nombre o dirección, el teléfono es obligatorio.
    if ((clienteNombre.value.trim() || clienteDireccion.value.trim()) && !clienteTelefono.value.trim()) {
        showStatusMessage('Si ingresa Nombre o Dirección, el Teléfono es obligatorio.', 'error');
        return;
    }
    // Si es Delivery, teléfono, nombre y dirección son obligatorios
    if (tipoVenta.value === 'Delivery' && (!clienteTelefono.value.trim() || !clienteNombre.value.trim() || !clienteDireccion.value.trim())) {
         showStatusMessage('Para pedidos a domicilio, complete Nombre, Teléfono y Dirección del cliente.', 'error');
         return;
    }


	statusMessage.value = null; // Limpiar mensajes anteriores
	sendingOrder.value = true;

	const pedidoDataParaBackend = {
		tipo_venta: tipoVenta.value,
		// Incluimos los datos del cliente directamente, incluso si es Mostrador.
        // El backend decidirá si crear un cliente o no.
		cliente_nombre: clienteNombre.value.trim(),
		cliente_telefono: clienteTelefono.value.trim(),
		cliente_direccion: clienteDireccion.value.trim(),
		items: pedidoProvisionalItems.value.map(item => ({
			producto_id: item.producto_id,
			tamaño: item.tamaño, // Enviamos el tamaño seleccionado (será null para empanadas/otros 'Unidad')
			tipo_unidad: item.tipo_unidad, // Enviamos el tipo_unidad seleccionado
			cantidad: item.cantidad,
			// precio_unitario_registrado y subtotal no se envían en el body, se calculan en backend
		})),
		// Incluir la hora estimada si se ingresó
		hora_estimada_entrega: horaEstimada.value || null, // Enviar null si está vacío
	};

	console.log('JSON a enviar al backend:', pedidoDataParaBackend);

	const token = authStore.authToken;

	if (!token) {
		showStatusMessage('No autenticado. No se puede enviar el pedido.', 'error');
		console.error('Error: No hay token en el store al intentar enviar pedido.');
		sendingOrder.value = false;
		authStore.logout();
		router.push('/login');
		return;
	}

	try {
		const apiUrl = 'http://127.0.0.1:8000/pedidos/tomar_pedido/'; // URL de la API para tomar pedidos
        console.log(`Enviando POST request a: ${apiUrl}`);

		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Token ${token}`,
			},
			body: JSON.stringify(pedidoDataParaBackend),
		});

        console.log(`Respuesta de la API de Pedidos. Status: ${response.status}`);

		const responseData = await response.json(); // Leer la respuesta JSON

		if (!response.ok) {
			// Si la respuesta no es OK (ej: 400, 401, 500)
			console.error('Error al enviar pedido:', response.status, responseData);

			if (response.status === 401 || response.status === 403) {
				authStore.logout();
				router.push('/login');
				showStatusMessage('Su sesión expiró o no tiene permisos. Inicie sesión nuevamente.', 'error');
			} else if (response.status === 400) {
				// Mostrar errores de validación del backend
				let errorMsg = 'Error de validación:';
				if (responseData.message) {
					errorMsg += ` ${responseData.message}`;
				} else if (responseData) {
					// Intentar formatear errores de campos específicos si vienen
					for (const field in responseData) {
						// Manejar errores que son arrays o strings
						const messages = Array.isArray(responseData[field]) ? responseData[field].join(', ') : (typeof responseData[field] === 'string' ? responseData[field] : JSON.stringify(responseData[field]));
						errorMsg += `\n- ${field}: ${messages}`;
					}
				}
				showStatusMessage(errorMsg, 'error');
			}
			else {
				// Otros errores del servidor
				showStatusMessage(`Error al procesar pedido: ${responseData.detail || 'Error desconocido del servidor.'}`, 'error');
			}
			return; // Salir si hubo error

		}

		// Si la respuesta es exitosa (201 Created)
		console.log('Pedido enviado con éxito:', responseData);

		// Limpiar el pedido provisional y datos del cliente después de un envío exitoso
		pedidoProvisionalItems.value = [];
		clienteNombre.value = '';
		clienteTelefono.value = '';
		clienteDireccion.value = '';
		clienteId.value = null; // Limpiar ID de cliente
		horaEstimada.value = '';
		tipoVenta.value = 'Mostrador'; // Resetear a Mostrador por defecto

		// Resetear selectores de producto
		tipoProductoSeleccionado.value = null;
		productoSeleccionado.value = null;
		selectedPizzaSize.value = null; // Resetear tamaño de pizza
		selectedPizzaUnitType.value = null; // Resetear tipo de unidad de pizza
		cantidadSeleccionada.value = 1;

		// Mostrar mensaje de éxito, usando responseData.pedido_id con un fallback
		const pedidoId = responseData.pedido_id || 'desconocido'; // <-- Usamos pedido_id aquí
		showStatusMessage(`Pedido #${pedidoId} creado con éxito! Total: ${formatCurrency(responseData.total)}`, 'success'); // Usar formatCurrency para el total

		// Opcional: Redirigir al dashboard después de tomar el pedido
		// router.push('/dashboard');

	} catch (err) {
		// Capturar errores de red
		console.error('Error de conexión al enviar pedido:', err);
		showStatusMessage(`Error de conexión: ${err.message}`, 'error');
	} finally {
		sendingOrder.value = false;
	}
};


// --- Lógica para obtener los Productos Disponibles ---

const fetchProductos = async () => {
	console.log('fetchProductos: Iniciando carga de productos...');
	loadingProductos.value = true;
	errorProductos.value = null;

	const token = authStore.authToken;

	if (!token) {
		errorProductos.value = 'No autenticado. Por favor, inicie sesión.';
		console.error('fetchProductos: Error: No hay token de autenticación en el store.');
		loadingProductos.value = false;
		router.push('/login');
		return;
	}

	try {
		const apiUrl = 'http://127.0.0.1:8000/productos/api/list/';
		console.log(`fetchProductos: Realizando petición GET a: ${apiUrl}`);

		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Token ${token}`,
			},
		});

		console.log(`fetchProductos: Respuesta recibida. Status: ${response.status}`);

		if (!response.ok) {
			let errorData = {};
			try {
				errorData = await response.json();
				console.error('fetchProductos: Detalles del error (si disponibles):', errorData);
			} catch (e) {
				console.error('fetchProductos: No se pudo parsear la respuesta de error como JSON.', e);
				errorData = { detail: `Error HTTP: ${response.status}` };
			}

			console.error('fetchProductos: Error al obtener productos (respuesta no OK):', response.status, errorData);

			if (response.status === 401 || response.status === 403) {
				console.warn('fetchProductos: Token inválido o sin permisos staff. Deslogueando y redirigiendo al login.');
				authStore.logout();
				router.push('/login');
				// No retornar aquí para que el finally se ejecute
			} else {
                 errorProductos.value = `Error al obtener productos: ${errorData.detail || `HTTP Status ${response.status}`}`;
            }
			return; // Salir si hubo error HTTP
		}

		const data = await response.json(); // Esperar a que el body sea parseado como JSON

		// *** NUEVO LOG: Muestra los datos EXACTOS recibidos de la API ***
		console.log('fetchProductos: Datos crudos recibidos de la API:', data);
		// *************************************************************


		if (Array.isArray(data)) {
			// Filtramos por productos activos antes de asignar
			const activeProducts = data.filter(producto => producto.activo);
			productos.value = activeProducts; // Asignamos solo los productos activos
			console.log('fetchProductos: Productos activos encontrados y asignados (después de filtrar):', productos.value);
			if (activeProducts.length === 0) {
				console.log('fetchProductos: No se encontraron productos activos (después de filtrar).');
			}
		} else {
			errorProductos.value = 'Respuesta inesperada del servidor.';
			console.error('fetchProductos: Error: Respuesta 200 OK no es un array:', data);
		}


	} catch (err) {
		errorProductos.value = `Error de conexión o procesamiento: ${err.message}`;
		console.error('fetchProductos: Error general en fetch:', err);
	} finally {
		loadingProductos.value = false;
		console.log('fetchProductos: Carga de productos finalizada.');
	}
};


// --- Lógica para la búsqueda de clientes ---

// Usamos un watcher para detectar cambios en el teléfono del cliente
// y realizar la búsqueda con un pequeño retraso (debounce)
let searchClientTimeout = null;
watch(clienteTelefono, (newTelefono, oldTelefono) => {
    // Si estamos en el proceso de seleccionar un cliente, no disparamos la búsqueda
    if (isSelectingClient.value) {
        console.log('Watcher: Saltando búsqueda porque se está seleccionando un cliente.');
        return;
    }

    // Limpiar el timeout anterior si existe
    if (searchClientTimeout) {
        clearTimeout(searchClientTimeout);
    }

    // Limpiar sugerencias y datos de cliente asociado si el campo se vacía completamente
    if (!newTelefono || newTelefono.trim() === '') {
        console.log('Teléfono vacío, limpiando sugerencias y datos de cliente.');
        clientSearchResults.value = [];
        showClientSuggestions.value = false;
        // Solo limpiar nombre/direccion si el teléfono anterior NO estaba vacío
        // o si el clienteId estaba seteado (indicando que venía de una búsqueda previa).
        if (oldTelefono && oldTelefono.trim() !== '' || clienteId.value !== null) {
             clienteNombre.value = '';
             clienteDireccion.value = '';
             clienteId.value = null; // Importante: resetear el ID del cliente
        }
        return; // Salir si el campo está vacío
    }

    // Establecer un nuevo timeout para buscar después de que el usuario deje de escribir
    searchClientTimeout = setTimeout(() => {
        console.log(`Watcher: Teléfono ha cambiado a "${newTelefono}", iniciando búsqueda...`);
        searchClients(newTelefono);
    }, 300); // Esperar 300ms después de la última pulsación
});


// Función asíncrona para buscar clientes por teléfono
const searchClients = async (telefono) => {
    console.log(`searchClients llamada con teléfono: "${telefono}"`);
    if (!telefono || telefono.trim() === '') {
        console.log('searchClients: Teléfono vacío, no se realiza búsqueda.');
        clientSearchResults.value = [];
        showClientSuggestions.value = false;
        return;
    }

    searchingClients.value = true;
    clientSearchResults.value = []; // Limpiar resultados anteriores
    showClientSuggestions.value = true; // Mostrar el área de sugerencias mientras buscamos
    console.log('searchClients: Estado de búsqueda: true, mostrando sugerencias.');


    const token = authStore.authToken;
    if (!token) {
        console.warn('searchClients: No autenticado. No se puede buscar clientes.');
        searchingClients.value = false;
        showClientSuggestions.value = false;
        // showStatusMessage('No autenticado. Por favor, inicie sesión.', 'error'); // Evitar mostrar este mensaje aquí para no ser intrusivo
        return;
    }

    try {
        // Usamos la URL de la nueva API de búsqueda de clientes
        const apiUrl = `http://127.0.0.1:8000/clientes/api/search/?telefono=${encodeURIComponent(telefono.trim())}`;
        console.log(`searchClients: Realizando petición GET a: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
            },
        });

        console.log(`searchClients: Respuesta recibida. Status: ${response.status}`);

        if (!response.ok) {
            console.error('searchClients: Error en la respuesta HTTP:', response.status);
            clientSearchResults.value = [];
            showClientSuggestions.value = false;
            // Opcional: mostrar mensaje de error al usuario
            // showStatusMessage('Error al buscar clientes.', 'error');
            return;
        }

        const data = await response.json(); // Esperamos una lista de clientes
        console.log('searchClients: Datos recibidos:', data);


        if (Array.isArray(data)) {
            clientSearchResults.value = data;
            // Si hay resultados, asegurarse de mostrar las sugerencias
            if (data.length > 0) {
                 showClientSuggestions.value = true;
                 console.log('searchClients: Resultados encontrados, mostrando sugerencias.');
            } else {
                 // Si no hay resultados, aún mostramos el contenedor de sugerencias
                 // para que se vea el mensaje "No se encontraron clientes.
                 showClientSuggestions.value = true;
                 console.log('searchClients: No se encontraron resultados.');
            }
        } else {
            console.error('searchClients: Respuesta inesperada al buscar clientes: No es un array.', data);
            clientSearchResults.value = [];
            showClientSuggestions.value = false; // Ocultar si la respuesta no es un array
        }

    } catch (err) {
        console.error('searchClients: Error de conexión o procesamiento:', err);
        clientSearchResults.value = [];
        showClientSuggestions.value = false;
        // Opcional: mostrar mensaje de error al usuario
        // showStatusMessage('Error de conexión al buscar clientes.', 'error');
    } finally {
        searchingClients.value = false;
        console.log('searchClients: Estado de búsqueda: false.');
    }
};

// Función para seleccionar un cliente de los resultados de búsqueda
const selectClient = (client) => {
    console.log('selectClient: Cliente seleccionado:', client);

    // Activamos la bandera ANTES de actualizar el teléfono
    isSelectingClient.value = true;
    console.log('selectClient: isSelectingClient = true');


    // Rellenar los campos del formulario con los datos del cliente seleccionado
    clienteId.value = client.id; // Guardar el ID del cliente existente
    clienteNombre.value = client.nombre;
    clienteTelefono.value = client.telefono; // Esto disparará el watcher
    clienteDireccion.value = client.direccion;

    // Limpiar resultados y ocultar sugerencias INMEDIATAMENTE
    clientSearchResults.value = [];
    showClientSuggestions.value = false;
    console.log('selectClient: Resultados limpiados, sugerencias ocultas.');


    // Desactivar la bandera después de un pequeño retraso para permitir que Vue procese las actualizaciones
    // Usamos setTimeout con 0ms (o un valor pequeño como 50ms) para que se ejecute después de que
    // Vue haya terminado de procesar las actualizaciones de estado reactivas.
    setTimeout(() => {
        isSelectingClient.value = false;
        console.log('selectClient: isSelectingClient = false');
    }, 50); // Un pequeño retraso para mayor seguridad
};

// Lógica para ocultar sugerencias al hacer clic fuera del input de teléfono
// (Opcional, requiere más código para detectar clics fuera)
// Por ahora, las sugerencias se ocultan al seleccionar un cliente o al borrar el teléfono.


// Función para formatear moneda (ej: a 2 decimales)
const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '$0.00';
    }
    return `$${parseFloat(value).toFixed(2)}`;
};

// Función para redirigir al login si no está autenticado
const handleLoginRedirect = () => {
    if (!authStore.isAuthenticated) {
        console.warn('User not authenticated, redirecting to login.');
        router.push('/login');
    }
};

// Hook onMounted: se ejecuta cuando el componente ha sido montado en el DOM
onMounted(() => {
    // Verificar autenticación al montar el componente
    handleLoginRedirect();
    // Si está autenticado, cargar los productos
    if (authStore.isAuthenticated) {
        fetchProductos();
    }
});

// Verificar autenticación cada vez que la ruta cambia (opcional, si no usas guardas de navegación)
// watch(router.currentRoute, (newRoute, oldRoute) => {
//      handleLoginRedirect();
// });

</script>

<template>
	<div class="order-page-container">
		<h1>Toma de Pedidos</h1>

        <div v-if="!authStore.isAuthenticated" class="status-message error">
            Por favor, <router-link to="/login">inicie sesión</router-link> para tomar pedidos.
        </div>


		<div v-if="statusMessage" :class="['status-message', messageType]">
			{{ statusMessage }}
		</div>

        <div class="main-order-layout">
            <div class="order-details-section">
                <h2>Detalles del Pedido y Cliente</h2>
                <div class="order-basic-details">
                    <div class="form-group">
                        <label for="tipoVenta">Tipo de Venta:</label>
                        <select id="tipoVenta" v-model="tipoVenta">
                            <option value="Mostrador">Mostrador</option>
                            <option value="Delivery">Delivery</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="horaEstimada">Hora Estimada (HH:MM):</label>
                        <input type="time" id="horaEstimada" v-model="horaEstimada">
                    </div>
                </div>

                <div class="client-details-section">
                    <h3>Datos del Cliente</h3>
                    <p class="hint">Busque por teléfono para autocompletar o complete manualmente.</p>
                    <div class="form-group phone-search-group">
                        <label for="clienteTelefono">Teléfono:</label>
                        <input type="text" id="clienteTelefono" v-model="clienteTelefono" autocomplete="off" placeholder="Ej: 3415551234">
                        <div v-if="showClientSuggestions" class="client-suggestions">
                            <div v-if="searchingClients" class="searching-indicator">Buscando...</div>
                            <div v-else-if="clientSearchResults.length > 0">
                                <div v-for="client in clientSearchResults" :key="client.id" @click="selectClient(client)" class="client-suggestion-item">
                                    <strong>{{ client.nombre }}</strong> ({{ client.telefono }}) - {{ client.direccion }}
                                </div>
                            </div>
                            <div v-else-if="clienteTelefono.length > 0 && !searchingClients" class="no-results">
                                No se encontraron clientes.
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="clienteNombre">Nombre:</label>
                        <input type="text" id="clienteNombre" v-model="clienteNombre" placeholder="Nombre y Apellido">
                    </div>
                    <div class="form-group">
                        <label for="clienteDireccion">Dirección:</label>
                        <input type="text" id="clienteDireccion" v-model="clienteDireccion" placeholder="Calle y número, barrio, etc.">
                    </div>
                </div>
            </div>

            <div class="product-selection-section">
                <h2>Seleccionar Producto</h2>
                <div v-if="loadingProductos">Cargando opciones de productos...</div>
                <div v-if="errorProductos" class="status-message error">Error al cargar productos: {{ errorProductos }}</div>
                <div v-if="!loadingProductos && !errorProductos">
                    <div class="form-group">
                        <label for="selectTipoProducto">Tipo:</label>
                        <select id="selectTipoProducto" v-model="tipoProductoSeleccionado" :disabled="tiposProductos.length === 0">
                            <option :value="null" disabled>-- Seleccione un tipo --</option>
                            <option v-for="tipo in tiposProductos" :key="tipo" :value="tipo">{{ tipo }}</option>
                        </select>
                    </div>
                    <div class="form-group" v-if="tipoProductoSeleccionado && productosDelTipoSeleccionado.length > 0">
                        <label for="selectProducto">Producto:</label>
                        <select id="selectProducto" v-model="productoSeleccionado" :disabled="!tipoProductoSeleccionado">
                            <option :value="null" disabled>-- Seleccione un producto --</option>
                            <option v-for="prod in productosDelTipoSeleccionado" :key="prod.id" :value="prod">{{ prod.nombre }}</option>
                        </select>
                    </div>
                    <div v-else-if="tipoProductoSeleccionado && productosDelTipoSeleccionado.length === 0">
                        No se encontraron productos activos para este tipo.
                    </div>

                    <div v-if="productoSeleccionado && productoSeleccionado.tipo === 'Pizza'">
                         <div class="form-group" v-if="availablePizzaSizes.length > 0">
                            <label for="selectPizzaSize">Tamaño:</label>
                            <select
                                id="selectPizzaSize"
                                v-model="selectedPizzaSize"
                                :disabled="!productoSeleccionado"
                            >
                                <option :value="null" disabled>-- Seleccione tamaño --</option>
                                <option v-for="size in availablePizzaSizes" :key="size" :value="size">
                                    {{ size }}
                                </option>
                            </select>
                        </div>

                         <div class="form-group" v-if="selectedPizzaSize && availablePizzaUnitTypes.length > 0">
                            <label for="selectPizzaUnitType">Tipo Unidad:</label>
                            <select
                                id="selectPizzaUnitType"
                                v-model="selectedPizzaUnitType"
                                :disabled="!selectedPizzaSize"
                            >
                                 <option :value="null" disabled>-- Seleccione tipo --</option>
                                <option v-for="unitType in availablePizzaUnitTypes" :key="unitType" :value="unitType">
                                    {{ unitType }}
                                </option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group quantity-price-group" v-if="finalSelectedPriceObject"> <label for="inputCantidad">Cantidad:</label>
                        <input type="number" id="inputCantidad" v-model.number="cantidadSeleccionada" min="1" value="1" :disabled="!finalSelectedPriceObject" class="quantity-input-large" />
                        <span class="unit-price">
                            Precio Unitario: <strong>{{ formatCurrency(getProductPrice) }}</strong>
                        </span>
                    </div>

                    <button @click="agregarItemSeleccionadoAPedido" :disabled="!finalSelectedPriceObject || cantidadSeleccionada <= 0 || getProductPrice <= 0" class="add-selected-item-button">
                        Agregar al Pedido
                    </button>
                </div>
                <div v-if="!loadingProductos && !errorProductos && tiposProductos.length === 0">
                    No se encontraron productos activos para seleccionar.
                </div>
            </div>
        </div> <div class="provisional-order-section">
			<h2>Resumen del Pedido</h2>

			<div v-if="pedidoProvisionalItems.length > 0" class="provisional-item-list">
				<h3>Items del Pedido</h3>
				<ul>
					<li v-for="item in pedidoProvisionalItems" :key="item.id"> <div class="item-info">
							<strong>{{ item.cantidad }} x {{ item.producto_nombre }}</strong>
							{{ item.tamaño ? `(${item.tamaño})` : '' }}
							({{ item.tipo_unidad }})
							- <span class="item-subtotal-value">{{ formatCurrency(item.subtotal) }}</span> </div>
						<div class="item-actions">
							<input
								type="number"
								min="0"
								:value="item.cantidad"
								@change="updateItemQuantity(item, $event)" class="quantity-input-small"
							>
							<button @click="removerItemDePedido(item)" class="remove-item-button"> Remover
							</button>
						</div>
					</li>
				</ul>
				<p class="order-total">
					<strong>Total Provisional: {{ formatCurrency(totalPedidoProvisional) }}</strong> </p>
			</div>
			<div v-else class="empty-order"> No hay ítems añadidos al pedido provisional.
			</div>

			<button @click="enviarPedido" :disabled="pedidoProvisionalItems.length === 0 || sendingOrder" class="send-order-button">
				{{ sendingOrder ? 'Enviando...' : 'Enviar Pedido' }}
			</button>

		</div>

	</div>

</template>

<style scoped>
/* Estilos para la página de pedidos */
.order-page-container {
	font-family: sans-serif;
	padding: 15px; /* Reducir padding */
	background-color: #f8f9fa; /* Fondo claro */
	border-radius: 8px;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	max-width: 1000px; /* Aumentar ancho máximo para acomodar 2 columnas */
	margin: 15px auto; /* Reducir margen y centrar */
	display: flex;
	flex-direction: column;
	gap: 15px; /* Reducir espacio entre secciones */
}

h1, h2, h3 {
	color: #343a40; /* Color de encabezados */
	border-bottom: 1px solid #dee2e6; /* Borde sutil */
	padding-bottom: 8px; /* Reducir padding */
	margin-bottom: 12px; /* Reducir margen */
}

h1 {
	text-align: center;
	border-bottom: 2px solid #007bff;
	margin-bottom: 15px; /* Reducir margen */
}

/* Estilos para mensajes de estado */
.status-message {
	padding: 8px; /* Reducir padding */
	margin-bottom: 12px; /* Reducir margen */
	border-radius: 4px;
	text-align: center;
	font-weight: bold;
    white-space: pre-wrap; /* Permite saltos de línea en mensajes de error */
    font-size: 0.9em; /* Reducir tamaño de fuente */
}
.status-message.success {
	background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;
}
.status-message.error {
	background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;
}

/* Contenedor principal para el layout de 2 columnas */
.main-order-layout {
    display: grid;
    grid-template-columns: 1fr 1fr; /* Dos columnas de igual ancho */
    gap: 20px; /* Espacio entre las columnas */
}


/* Estilos para secciones */
.order-details-section,
.product-selection-section,
.provisional-order-section {
    background-color: #fff;
    padding: 15px; /* Reducir padding */
    border-radius: 8px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.08);
}

/* Estilos específicos para la sección de detalles y cliente */
.order-details-section {
    /* Usar flexbox para organizar los detalles básicos y los datos del cliente */
    display: flex;
    flex-direction: column; /* Por defecto apilados */
    gap: 15px; /* Espacio entre detalles básicos y datos del cliente */
}

/* Contenedor para Tipo de Venta y Hora Estimada */
.order-basic-details {
    display: flex;
    gap: 15px; /* Espacio entre Tipo de Venta y Hora Estimada */
    /* Permitir que se apilen en pantallas pequeñas */
    flex-direction: column;
}

/* Estilos de formularios y grupos de campos */
.form-group {
    margin-bottom: 10px; /* Reducir margen */
}

.form-group label {
    display: block;
    margin-bottom: 4px; /* Reducir margen */
    font-weight: bold;
    color: #555;
    font-size: 0.9em; /* Reducir tamaño de fuente */
}

.form-group input[type="text"],
.form-group input[type="time"],
.form-group select {
    width: 100%;
    padding: 6px; /* Reducir padding */
    border: 1px solid #ced4da;
    border-radius: 4px;
    box-sizing: border-box;
    font-size: 0.9em; /* Reducir tamaño de fuente */
}

/* Estilos específicos para la sección de cliente */
.client-details-section {
    margin-top: 0; /* Eliminar margen superior si ya hay gap en el padre */
    padding-top: 0; /* Eliminar padding superior si ya hay gap */
    border-top: none; /* Eliminar borde superior */
}
.client-details-section h3 {
    margin-top: 0;
    padding-bottom: 8px; /* Ajustar padding */
    margin-bottom: 10px; /* Ajustar margen */
    border-bottom: 1px dashed #dee2e6; /* Mantener borde sutil */
}
.client-details-section .hint {
    font-size: 0.8em; /* Reducir tamaño de fuente */
    color: #6c757d;
    margin-bottom: 10px; /* Reducir margen */
}

/* Estilo para el form-group que contiene el input de teléfono y las sugerencias */
.phone-search-group {
    position: relative;
    margin-bottom: 10px; /* Reducir margen */
}


/* Estilos para las sugerencias de cliente (autocompletado) */
.client-suggestions {
    position: absolute;
    top: calc(100% + 3px); /* Ajustar posición */
    left: 0;
    right: 0;
    z-index: 100;
    border: 1px solid #ced4da;
    border-top: none;
    border-radius: 0 0 4px 4px;
    background-color: #fff;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1); /* Reducir sombra */
    max-height: 120px; /* Reducir altura máxima */
    overflow-y: auto;
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.9em; /* Reducir tamaño de fuente */
}

.client-suggestion-item {
    padding: 8px; /* Reducir padding */
    border-bottom: 1px solid #eee;
    cursor: pointer;
    transition: background-color 0.2s ease;
}
.client-suggestion-item:last-child {
    border-bottom: none;
}
.client-suggestion-item:hover {
    background-color: #f1f1f1; /* Color hover más sutil */
}
.client-suggestion-item strong {
    color: #0056b3;
}
.client-suggestion-item small {
    color: #6c757d;
}

.searching-indicator, .no-results {
    font-size: 0.8em; /* Reducir tamaño de fuente */
    color: #6c757d;
    padding: 4px 8px; /* Reducir padding */
    text-align: center;
}


/* Estilos de la sección de selección de productos con selectores */
.product-selection-section {
	margin-bottom: 15px; /* Reducir espacio */
	padding: 15px;
	border: 1px solid #eee;
	border-radius: 5px;
	background-color: #f9f9f9;
}

.product-selection-section .form-group {
	display: flex;
	align-items: center;
	gap: 8px; /* Reducir espacio */
    margin-bottom: 8px; /* Reducir margen */
}

.product-selection-section .form-group label {
	flex-basis: 80px; /* Reducir ancho fijo para etiquetas */
	flex-shrink: 0;
    margin-bottom: 0;
    font-size: 0.9em; /* Reducir tamaño de fuente */
}

.product-selection-section .form-group select,
.product-selection-section .form-group input[type="number"] {
	flex-grow: 1;
	width: auto;
    padding: 6px; /* Reducir padding */
    font-size: 0.9em; /* Reducir tamaño de fuente */
}

.quantity-input-large {
	width: 60px; /* Reducir ancho */
	padding: 6px; /* Reducir padding */
	border: 1px solid #ccc;
	border-radius: 4px;
	text-align: center;
    font-size: 0.9em; /* Reducir tamaño de fuente */
}

.unit-price {
    font-size: 0.9em; /* Reducir tamaño de fuente */
    color: #0056b3;
    font-weight: normal;
    margin-left: 8px; /* Reducir margen */
}
.unit-price strong {
    font-weight: bold;
}

/* Estilo para agrupar cantidad y precio en una línea si es posible */
.quantity-price-group {
    display: flex;
    align-items: center;
    gap: 8px; /* Espacio entre cantidad y precio */
    /* Permitir que se apilen en pantallas pequeñas */
    flex-direction: column;
    align-items: flex-start;
}
.quantity-price-group label {
    flex-basis: auto; /* Permitir que la etiqueta tome su ancho */
    margin-bottom: 0;
}
.quantity-price-group input[type="number"] {
    width: auto; /* Permitir que el input tome su ancho */
    flex-grow: 0; /* No crecer */
}
.quantity-price-group .unit-price {
    margin-left: 0; /* Eliminar margen izquierdo */
    margin-top: 5px; /* Añadir margen superior */
}


.add-selected-item-button {
	display: block;
	width: 100%;
	background-color: #28a745;
	color: white;
	padding: 8px 12px; /* Reducir padding */
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 1em; /* Ajustar tamaño */
	margin-top: 10px; /* Reducir margen */
	transition: background-color 0.3s ease;
    font-weight: bold;
}
.add-selected-item-button:hover:not(:disabled) { background-color: #218838; }
.add-selected-item-button:disabled {
	background-color: #cccccc;
	cursor: not-allowed;
}


/* Estilos del resumen del pedido */
.provisional-order-section {
    background-color: #fff;
    padding: 15px; /* Reducir padding */
    border-radius: 8px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.08);
}
.provisional-order-section ul {
	list-style: none;
	padding: 0;
	margin: 0;
}

.provisional-item-list li {
	background-color: #e9ecef;
	margin-bottom: 6px; /* Reducir margen */
	padding: 8px; /* Reducir padding */
	border-radius: 4px;
	border: 1px solid #dee2e6;
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 0.9em; /* Reducir tamaño de fuente */
	flex-wrap: wrap;
	gap: 8px; /* Reducir espacio */
}

.item-info {
	flex-grow: 1;
	font-size: 0.9em; /* Reducir tamaño de fuente */
}
.item-info strong {
	color: #333;
}
.item-info small {
	color: #6c757d;
}
.item-subtotal-value {
    font-weight: bold;
    color: #0056b3;
}


.item-actions {
	display: flex;
	align-items: center;
	gap: 4px; /* Reducir espacio */
}
.quantity-input-small {
    width: 40px; /* Reducir ancho */
    padding: 2px; /* Reducir padding */
    border: 1px solid #ccc;
    border-radius: 4px;
    text-align: center;
    font-size: 0.8em; /* Reducir tamaño de fuente */
}

.remove-item-button {
	background-color: #dc3545;
	color: white;
	border: none;
	padding: 4px 8px; /* Reducir padding */
	border-radius: 4px;
	cursor: pointer;
	font-size: 0.8em; /* Reducir tamaño de fuente */
	transition: background-color 0.2s ease;
}
.remove-item-button:hover { background-color: #c82333; }

.order-total {
	margin-top: 15px; /* Reducir margen */
	padding-top: 10px; /* Reducir padding */
	border-top: 2px solid #007bff;
	font-size: 1.2em; /* Ajustar tamaño */
	text-align: right;
	color: #0056b3;
    font-weight: bold;
}

.send-order-button {
	display: block;
	width: 100%;
	background-color: #007bff;
	color: white;
	padding: 10px 15px; /* Reducir padding */
	border: none;
	border-radius: 4px;
	font-size: 1.1em; /* Ajustar tamaño */
	font-weight: bold;
	cursor: pointer;
	margin-top: 15px; /* Reducir margen */
	transition: background-color 0.2s ease;
}
.send-order-button:hover:not(:disabled) { background-color: #0056b3; }
.send-order-button:disabled {
	background-color: #cccccc;
	cursor: not-allowed;
}

.empty-order {
    text-align: center;
    color: #777;
    font-style: italic;
    padding: 15px; /* Reducir padding */
    border: 1px dashed #ccc;
    border-radius: 4px;
    font-size: 0.9em; /* Reducir tamaño de fuente */
}


/* Estilos para pantallas más pequeñas (menos de 900px) */
@media (max-width: 900px) {
    .main-order-layout {
        grid-template-columns: 1fr; /* Apilar columnas en pantallas pequeñas */
        gap: 15px; /* Espacio entre secciones apiladas */
    }

    .order-basic-details {
        flex-direction: column; /* Apilar Tipo de Venta y Hora Estimada */
        gap: 10px;
    }

    .quantity-price-group {
        flex-direction: column; /* Apilar cantidad y precio */
        align-items: flex-start;
        gap: 5px;
    }
     .quantity-price-group input[type="number"] {
         width: 80px; /* Restaurar ancho un poco más grande en móvil */
     }
     .quantity-price-group .unit-price {
         margin-top: 5px;
     }


	.product-selection-section .form-group {
		flex-direction: column; /* Apilar label y control */
		align-items: flex-start;
		gap: 5px;
	}
	.product-selection-section .form-group label {
		flex-basis: auto; /* Eliminar ancho fijo */
	}


	.provisional-item-list li {
		flex-direction: column;
		align-items: flex-start;
		gap: 5px;
	}
	.item-actions {
		width: 100%;
		justify-content: flex-end;
	}
     .quantity-input-small {
         width: 50px; /* Ajustar ancho en móvil */
     }
}

/* Estilos para pantallas muy pequeñas (menos de 576px) */
@media (max-width: 576px) {
    .order-page-container {
        padding: 10px;
        margin: 10px;
    }
    h1 { font-size: 1.5em; }
    h2 { font-size: 1.2em; }
    h3 { font-size: 1em; }

    .status-message { font-size: 0.8em; }

    .form-group label { font-size: 0.8em; }
    .form-group input, .form-group select { font-size: 0.8em; padding: 5px; }

    .client-details-section .hint { font-size: 0.7em; }
    .client-suggestions { max-height: 100px; font-size: 0.8em; }
    .client-suggestion-item { padding: 6px; }
    .searching-indicator, .no-results { font-size: 0.7em; padding: 3px 6px; }

    .quantity-input-large { width: 50px; font-size: 0.8em; padding: 5px; }
    .unit-price { font-size: 0.8em; }

    .add-selected-item-button, .send-order-button { font-size: 0.9em; padding: 8px 10px; }

    .provisional-item-list li { font-size: 0.8em; padding: 6px; gap: 5px;}
    .item-info { font-size: 0.8em; }
    .quantity-input-small { width: 40px; font-size: 0.7em; padding: 2px; }
    .remove-item-button { font-size: 0.7em; padding: 3px 6px; }

    .order-total { font-size: 1em; margin-top: 10px; padding-top: 8px; }
    .empty-order { font-size: 0.8em; padding: 10px; }

}

</style>

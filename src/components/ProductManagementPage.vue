<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

// Obtenemos la instancia del store de autenticación
const authStore = useAuthStore();
// Obtenemos la instancia del router
const router = useRouter();

// --- Estado para la lista de Productos ---
const productos = ref([]); // Lista de productos obtenida de la API
const loading = ref(true); // Indica si se están cargando los productos
const error = ref(null);   // Para errores al cargar productos

// --- Estado y Lógica para el Formulario de Añadir/Editar ---
const showProductModal = ref(false); // Controla la visibilidad del modal
const isEditing = ref(false); // Indica si el modal es para editar (true) o añadir (false)

// Datos del formulario para un producto (usado tanto para añadir como para editar)
const productFormData = ref({
    id: null, // Será null para nuevos productos, el ID para editar
    nombre: '',
    tipo: '', // Podría ser un selector con opciones del backend si tienes muchas
    activo: true, // Por defecto, un nuevo producto está activo
    precios: [] // Lista de objetos de precio { id: null, tamaño: '', tipo_precio: '', precio: null }
});

// Estado para manejar mensajes del formulario/modal
const formMessage = ref(null);
const formMessageType = ref(null); // 'success' or 'error'
const sendingFormData = ref(false); // Indica si se está enviando el formulario

// Opciones de tipo de producto (puedes obtenerlas de la API si son dinámicas, por ahora hardcodeamos)
const productTypes = ['Pizza', 'Empanada', 'Bebida', 'Postre', 'Otros']; // Ajusta esto a tus tipos reales

// Opciones de tamaño y tipo de precio para las variantes (ajusta según tus necesidades)
const pizzaSizes = ['8p', '12p'];
const pizzaUnitTypes = ['Entera', 'Mitad'];
const empanadaUnitTypes = ['Unidad'];
const otherUnitTypes = ['Unidad']; // Para bebidas, postres, etc.

// Propiedad computada para obtener las opciones de tipo de unidad basadas en el tipo de producto seleccionado
const currentUnitTypes = computed(() => {
    switch (productFormData.value.tipo) {
        case 'Pizza':
            return pizzaUnitTypes;
        case 'Empanada':
            return empanadaUnitTypes;
        default:
            return otherUnitTypes;
    }
});

// Propiedad computada para obtener las opciones de tamaño basadas en el tipo de producto seleccionado
const currentSizes = computed(() => {
     // Solo las pizzas tienen tamaños específicos en este ejemplo
     if (productFormData.value.tipo === 'Pizza') {
         return pizzaSizes;
     }
     return []; // Otros tipos no tienen tamaño o es irrelevante en la UI de precios
});


// Función para mostrar mensajes temporales en el formulario/modal
const showFormMessage = (message, type = 'info') => {
    formMessage.value = message;
    formMessageType.value = type;
    // Opcional: Ocultar el mensaje después de unos segundos
    // setTimeout(() => {
    //     formMessage.value = null;
    //     formMessageType.value = null;
    // }, 5000);
};

// Función para abrir el modal en modo "Añadir Producto"
const openAddModal = () => {
    isEditing.value = false;
    // Resetear el formulario a valores por defecto para un nuevo producto
    productFormData.value = {
        id: null,
        nombre: '',
        tipo: '',
        activo: true,
        precios: []
    };
    formMessage.value = null; // Limpiar mensajes
    showProductModal.value = true;
};

// Función para abrir el modal en modo "Editar Producto"
const openEditModal = async (productId) => {
    isEditing.value = true;
    formMessage.value = null; // Limpiar mensajes
    sendingFormData.value = true; // Mostrar indicador de carga mientras se obtienen datos

    const token = authStore.authToken;
    if (!token) {
        showFormMessage('No autenticado. No se puede editar.', 'error');
        sendingFormData.value = false;
        router.push('/login');
        return;
    }

    try {
        // Usamos la nueva URL de detalle de producto
        const apiUrl = `http://127.0.0.1:8000/productos/manage/${productId}/`;

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
             console.error('Error al obtener producto para editar:', response.status, errorData);
             showFormMessage(`Error al cargar producto: ${errorData.detail || `HTTP Status ${response.status}`}`, 'error');
             return;
        }

        const productData = await response.json();
        console.log('Datos de producto para editar:', productData);

        // Llenar el formulario con los datos obtenidos
        productFormData.value = {
            id: productData.id,
            nombre: productData.nombre,
            tipo: productData.tipo,
            activo: productData.activo,
            // Mapeamos los precios para que coincidan con la estructura esperada por el serializer de gestión
            precios: productData.precios.map(precio => ({
                id: precio.id,
                tamaño: precio.tamaño || '', // Usar string vacío si es null para inputs
                tipo_precio: precio.tipo_precio,
                precio: parseFloat(precio.precio) // Convertir a número
            }))
        };
        showProductModal.value = true; // Abrir el modal una vez cargados los datos

    } catch (err) {
        showFormMessage(`Error de conexión o procesamiento al cargar producto: ${err.message}`, 'error');
        console.error('Error general en openEditModal:', err);
    } finally {
        sendingFormData.value = false;
    }
};

// Función para cerrar el modal
const closeProductModal = () => {
    showProductModal.value = false;
    // Opcional: Limpiar el formulario al cerrar si no se hizo al abrir/enviar
    // productFormData.value = { ... };
};

// Función para añadir una nueva línea de precio al formulario
const addPriceLine = () => {
     // Añadimos una nueva línea de precio con valores por defecto
     productFormData.value.precios.push({
         id: null, // ID es null para nuevas líneas
         tamaño: '',
         tipo_precio: '',
         precio: null // Usar null o 0 para el input numérico
     });
};

// Función para remover una línea de precio del formulario por su índice
const removePriceLine = (index) => {
     if (confirm('¿Estás seguro de que quieres remover esta variante de precio?')) {
          productFormData.value.precios.splice(index, 1);
     }
};


// Función para enviar los datos del formulario (añadir o editar)
const submitProductForm = async () => {
    // Validaciones básicas del formulario antes de enviar
    if (!productFormData.value.nombre || !productFormData.value.tipo) {
        showFormMessage('Complete el nombre y tipo del producto.', 'error');
        return;
    }
    if (productFormData.value.precios.length === 0) {
         showFormMessage('El producto debe tener al menos una variante de precio.', 'error');
         return;
    }
    // Validar que cada precio tenga tipo_precio y precio > 0
    for (const precio of productFormData.value.precios) {
        if (!precio.tipo_precio || precio.precio === null || precio.precio < 0) {
             showFormMessage('Complete el tipo de unidad y un precio válido (>= 0) para todas las variantes.', 'error');
             return;
        }
        // Validar tamaño si el tipo es Pizza
        if (productFormData.value.tipo === 'Pizza' && (!precio.tamaño || !pizzaSizes.includes(precio.tamaño))) {
             showFormMessage(`Para Pizzas, cada variante debe tener un tamaño válido (${pizzaSizes.join(', ')}).`, 'error');
             return;
        }
        // Validar que no tenga tamaño si no es Pizza
         if (productFormData.value.tipo !== 'Pizza' && precio.tamaño && precio.tamaño !== '') {
             showFormMessage(`Solo las Pizzas deben especificar tamaño. Remueva el tamaño para variantes de tipo ${productFormData.value.tipo}.`, 'error');
             return;
         }
         // Validar tipo_precio 'Unidad' para Empanadas
         if (productFormData.value.tipo === 'Empanada' && precio.tipo_precio !== 'Unidad') {
              showFormMessage(`Para Empanadas, el tipo de unidad debe ser 'Unidad'.`, 'error');
              return;
         }
         // Validar tipo_precio para otros tipos si es necesario (ej: no 'Entera'/'Mitad')
         if (productFormData.value.tipo !== 'Pizza' && ['Entera', 'Mitad'].includes(precio.tipo_precio)) {
              showFormMessage(`El tipo de unidad '${precio.tipo_precio}' solo es válido para Pizzas.`, 'error');
              return;
         }
    }


    sendingFormData.value = true;
    formMessage.value = null; // Limpiar mensajes

    const token = authStore.authToken;
    if (!token) {
        showFormMessage('No autenticado. No se puede guardar.', 'error');
        sendingFormData.value = false;
        authStore.logout();
        router.push('/login');
        return;
    }

    // Preparar los datos para enviar
    const dataToSend = {
        nombre: productFormData.value.nombre,
        tipo: productFormData.value.tipo,
        activo: productFormData.value.activo,
        // Mapear los precios de vuelta al formato esperado por el backend (DecimalField)
        precios: productFormData.value.precios.map(precio => ({
            // Incluir ID solo si existe (para actualizaciones)
            ...(precio.id && { id: precio.id }),
            tamaño: precio.tamaño || null, // Enviar null si el tamaño está vacío
            tipo_precio: precio.tipo_precio,
            precio: parseFloat(precio.precio).toFixed(2) // Enviar como string con 2 decimales
        }))
    };

    console.log('Datos a enviar:', dataToSend);

    const method = isEditing.value ? 'PUT' : 'POST'; // Usar PUT para editar, POST para crear
    const apiUrl = isEditing.value
        ? `http://127.0.0.1:8000/productos/manage/${productFormData.value.id}/` // URL para actualizar
        : 'http://127.0.0.1:8000/productos/manage/create/'; // URL para crear

    try {
        const response = await fetch(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
            body: JSON.stringify(dataToSend),
        });

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) { errorData = { detail: `Error HTTP: ${response.status}` }; }

            console.error(`Error al ${isEditing.value ? 'actualizar' : 'crear'} producto (respuesta no OK):`, response.status, errorData);

            if (response.status === 401 || response.status === 403) {
                 console.warn('Token inválido o sin permisos staff. Deslogueando.');
                 authStore.logout();
                 router.push('/login');
                 showFormMessage('Su sesión expiró o no tiene permisos. Inicie sesión nuevamente.', 'error');
                 closeProductModal(); // Cerrar modal en caso de error de auth
                 return;
            }

            // Mostrar errores de validación del backend (status 400)
            if (response.status === 400) {
                 let formattedErrors = '';
                 if (errorData) {
                     // Manejar errores de campos anidados (ej: precios)
                     if (errorData.precios && Array.isArray(errorData.precios)) {
                         formattedErrors += 'Errores en precios:\n';
                         errorData.precios.forEach((itemErrors, index) => {
                             if (itemErrors) {
                                 formattedErrors += `  Variante ${index + 1}:\n`;
                                 for (const field in itemErrors) {
                                      const messages = Array.isArray(itemErrors[field]) ? itemErrors[field].join(', ') : itemErrors[field];
                                      formattedErrors += `    ${field}: ${messages}\n`;
                                 }
                             }
                         });
                     }
                     // Manejar otros errores de campos de producto
                      for (const field in errorData) {
                          if (field !== 'precios') {
                              const messages = Array.isArray(errorData[field]) ? errorData[field].join(', ') : errorData[field];
                              formattedErrors += `${field}: ${messages}\n`;
                          }
                      }
                 }
                 showFormMessage(`Error de validación:\n${formattedErrors || JSON.stringify(errorData)}`, 'error');

            } else {
                 showFormMessage(`Error al ${isEditing.value ? 'actualizar' : 'crear'} producto: ${errorData.detail || `HTTP Status ${response.status}`}`, 'error');
            }
            return; // No cerramos el modal si hay error para que el usuario corrija
        }

        // Si la respuesta fue exitosa (200 OK para PUT, 201 Created para POST)
        const successData = await response.json();
        console.log(`${isEditing.value ? 'Producto actualizado' : 'Producto creado'} con éxito:`, successData);

        showFormMessage(`Producto "${successData.nombre}" ${isEditing.value ? 'actualizado' : 'creado'} exitosamente.`, 'success');

        // Refrescar la lista de productos después de una operación exitosa
        fetchProductos();

        // Cerrar el modal después de un breve retraso para que el usuario vea el mensaje de éxito
        setTimeout(() => {
            closeProductModal();
        }, 1500); // Cerrar después de 1.5 segundos

    } catch (err) {
        showFormMessage(`Error de conexión o procesamiento al ${isEditing.value ? 'actualizar' : 'crear'} producto: ${err.message}`, 'error');
        console.error('Error general en submitProductForm:', err);
    } finally {
        sendingFormData.value = false;
    }
};


// Función asíncrona para obtener la lista de productos para la tabla
const fetchProductos = async () => {
    loading.value = true;
    error.value = null;

    const token = authStore.authToken;

    if (!token) {
        error.value = 'No autenticado. Por favor, inicie sesión.';
        console.error('Error: No hay token de autenticación en el store.');
        loading.value = false;
        router.push('/login');
        return;
    }

    try {
        // Usamos la nueva URL para listar TODOS los productos para gestión
        const apiUrl = 'http://127.0.0.1:8000/productos/manage/list/';

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

            console.error('Error al obtener lista de productos de gestión (respuesta no OK):', response.status, errorData);

            if (response.status === 401 || response.status === 403) {
                console.warn('Token inválido o sin permisos staff al obtener lista de gestión. Deslogueando.');
                authStore.logout();
                router.push('/login');
                error.value = 'Su sesión expiró o no tiene permisos. Inicie sesión nuevamente.';
                return;
            }

            error.value = `Error al obtener productos: ${errorData.detail || `HTTP Status ${response.status}`}`;
            return;
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            productos.value = data;
            console.log('Lista de productos de gestión obtenida:', productos.value);
        } else {
            error.value = 'Respuesta inesperada del servidor al obtener lista de productos.';
            console.error('Error: Respuesta 200 OK no es un array:', data);
        }

    } catch (err) {
        error.value = `Error de conexión o procesamiento: ${err.message}`;
        console.error('Error general en fetchProductos (gestion):', err);
    } finally {
        loading.value = false;
    }
};

// Obtenemos la lista de productos cuando el componente se monta
onMounted(() => {
    if (authStore.isAuthenticated) {
        fetchProductos();
    } else {
        console.warn('ProductManagementPage montada sin token en store. Redirigiendo al login.');
        router.push('/login');
    }
});

// Función para formatear los precios para mostrar en la tabla
const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A';
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 'N/A';
    return `$${numPrice.toFixed(2)}`;
};

// Función para mostrar los precios de un producto en la tabla
const displayPrices = (precios) => {
    if (!precios || precios.length === 0) return 'Sin precios';
    // Ordenar precios para una visualización consistente (opcional)
    const sortedPrecios = [...precios].sort((a, b) => {
         // Ordenar por tamaño primero (si existe), luego por tipo_precio
         const sizeCompare = (a.tamaño || '').localeCompare(b.tamaño || '');
         if (sizeCompare !== 0) return sizeCompare;
         return a.tipo_precio.localeCompare(b.tipo_precio);
    });

    return sortedPrecios.map(p => {
        const size = p.tamaño ? `${p.tamaño} - ` : '';
        return `${size}${p.tipo_precio}: ${formatPrice(p.precio)}`;
    }).join(' | '); // Separar variantes con una barra vertical
};


</script>

<template>
    <div class="product-management-container">
        <h1>Gestión de Productos</h1>

        <button @click="authStore.logout(); router.push('/login')" class="logout-button">
            Logout
        </button>

        <button @click="openAddModal" class="add-product-button">
            + Añadir Nuevo Producto
        </button>

        <div v-if="loading">Cargando productos...</div>
        <div v-if="error" class="error-message">Error al cargar productos: {{ error }}</div>

        <div v-if="!loading && !error && productos.length > 0" class="product-list-table">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Activo</th>
                        <th>Precios</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="producto in productos" :key="producto.id">
                        <td>{{ producto.id }}</td>
                        <td>{{ producto.nombre }}</td>
                        <td>{{ producto.tipo }}</td>
                        <td>
                            <span :class="producto.activo ? 'status-active' : 'status-inactive'">
                                {{ producto.activo ? 'Sí' : 'No' }}
                            </span>
                        </td>
                        <td>{{ displayPrices(producto.precios) }}</td>
                        <td class="actions-cell">
                            <button @click="openEditModal(producto.id)" class="action-button edit-button">Editar</button>
                            </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="!loading && !error && productos.length === 0">
            No se encontraron productos en la base de datos.
        </div>

        <div v-if="showProductModal" class="modal-overlay" @click.self="closeProductModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>{{ isEditing ? 'Editar Producto' : 'Añadir Nuevo Producto' }}</h2>
                    <button @click="closeProductModal" class="close-modal-button">X</button>
                </div>

                <div class="modal-body">
                    <div v-if="formMessage" :class="['form-message', formMessageType]">
                        {{ formMessage }}
                    </div>

                    <form @submit.prevent="submitProductForm">
                        <div class="form-group">
                            <label for="productName">Nombre:</label>
                            <input type="text" id="productName" v-model="productFormData.nombre" required>
                        </div>

                        <div class="form-group">
                            <label for="productType">Tipo:</label>
                            <select id="productType" v-model="productFormData.tipo" required>
                                <option value="" disabled>-- Seleccione un tipo --</option>
                                <option v-for="type in productTypes" :key="type" :value="type">{{ type }}</option>
                            </select>
                        </div>

                        <div class="form-group" v-if="isEditing">
                            <label for="productActive">Activo:</label>
                            <input type="checkbox" id="productActive" v-model="productFormData.activo">
                        </div>

                        <h3>Variantes de Precio</h3>
                        <div class="price-variants-section">
                             <div v-for="(precio, index) in productFormData.precios" :key="index" class="price-variant-item">
                                 <div class="price-inputs">
                                     <div class="form-group" v-if="productFormData.tipo === 'Pizza'">
                                         <label :for="'priceSize-' + index">Tamaño:</label>
                                         <select :id="'priceSize-' + index" v-model="precio.tamaño" required>
                                              <option value="" disabled>-- Tamaño --</option>
                                              <option v-for="size in currentSizes" :key="size" :value="size">{{ size }}</option>
                                         </select>
                                     </div>
                                      <input type="hidden" v-model="precio.tamaño" v-if="productFormData.tipo !== 'Pizza'">


                                     <div class="form-group">
                                         <label :for="'priceUnitType-' + index">Tipo Unidad:</label>
                                         <select :id="'priceUnitType-' + index" v-model="precio.tipo_precio" required>
                                              <option value="" disabled>-- Tipo Unidad --</option>
                                              <option v-for="unitType in currentUnitTypes" :key="unitType" :value="unitType">{{ unitType }}</option>
                                         </select>
                                     </div>

                                     <div class="form-group">
                                         <label :for="'priceValue-' + index">Precio ($):</label>
                                         <input type="number" :id="'priceValue-' + index" v-model.number="precio.precio" min="0" step="0.01" required>
                                     </div>
                                 </div>
                                 <button type="button" @click="removePriceLine(index)" class="remove-price-button">X</button>
                             </div>
                        </div>

                        <button type="button" @click="addPriceLine" class="add-price-line-button">
                            + Añadir Variante de Precio
                        </button>


                        <div class="modal-footer">
                             <button type="submit" :disabled="sendingFormData" class="submit-button">
                                 {{ sendingFormData ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Añadir Producto') }}
                             </button>
                             <button type="button" @click="closeProductModal" class="cancel-button">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
/* Estilos básicos para la página de gestión de productos */
.product-management-container {
    font-family: sans-serif;
    padding: 20px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    max-width: 1000px; /* Ancho ajustado para la tabla */
    margin: 20px auto;
    position: relative; /* Para posicionar el botón de logout */
}

h1 {
    color: #333;
    border-bottom: 2px solid #ccc;
    padding-bottom: 10px;
    margin-bottom: 20px;
    display: inline-block; /* Permite que el botón de añadir esté al lado */
    margin-right: 20px;
}

.logout-button {
    position: absolute;
    top: 20px;
    right: 20px;
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
}
.logout-button:hover { background-color: #c82333; }

.add-product-button {
    background-color: #28a745;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    margin-bottom: 20px; /* Espacio debajo del botón */
    transition: background-color 0.3s ease;
}
.add-product-button:hover { background-color: #218838; }


.error-message {
    color: red;
    margin-bottom: 20px;
    text-align: center;
    font-weight: bold;
}

.product-list-table table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    font-size: 0.9em;
}

.product-list-table th,
.product-list-table td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
    vertical-align: top;
}

.product-list-table th {
    background-color: #f2f2f2;
    font-weight: bold;
}

.product-list-table tbody tr:nth-child(even) {
    background-color: #f9f9f9;
}

.status-active {
    color: green;
    font-weight: bold;
}

.status-inactive {
    color: orange;
    font-weight: bold;
}

.actions-cell {
    white-space: nowrap; /* Evita que los botones se envuelvan */
}

.action-button {
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-right: 5px;
    cursor: pointer;
    font-size: 0.8em;
}
.action-button:hover { opacity: 0.9; }

.edit-button {
    background-color: #ffc107; /* Amarillo */
    color: #333;
    border-color: #ffc107;
}
.delete-button {
    background-color: #dc3545; /* Rojo */
    color: white;
    border-color: #dc3545;
}


/* --- Estilos del Modal --- */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background-color: #fff;
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    max-width: 600px; /* Ancho del modal */
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    padding-bottom: 15px;
    margin-bottom: 20px;
    flex-shrink: 0;
}

.modal-header h2 {
    margin: 0;
    color: #333;
    font-size: 1.5em;
    border-bottom: none; /* Eliminar borde del h2 en el modal */
}

.close-modal-button {
    background-color: #ccc;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    font-size: 1em;
    cursor: pointer;
    text-align: center;
    line-height: 30px;
    transition: background-color 0.2s ease;
}
.close-modal-button:hover { background-color: #bbb; }

.modal-body {
    flex-grow: 1;
    overflow-y: auto;
    padding-right: 10px; /* Espacio para scrollbar */
}

/* Estilos para scrollbar en webkit */
.modal-body::-webkit-scrollbar { width: 8px; }
.modal-body::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
.modal-body::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
.modal-body::-webkit-scrollbar-thumb:hover { background: #555; }


.form-message { /* Estilos para mensajes dentro del modal */
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
}
.form-message.success {
    background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;
}
.form-message.error {
    background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: #555;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
}

.price-variants-section {
    border: 1px dashed #ccc;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 5px;
    background-color: #fefefe;
}

.price-variant-item {
    display: flex;
    align-items: center;
    gap: 10px; /* Espacio entre los inputs y el botón de remover */
    margin-bottom: 10px;
    padding: 8px;
    border: 1px solid #eee;
    border-radius: 4px;
    background-color: #f9f9f9;
}

.price-inputs {
    display: flex;
    gap: 10px; /* Espacio entre los inputs de precio */
    flex-grow: 1; /* Permite que los inputs ocupen el espacio disponible */
    flex-wrap: wrap; /* Permite que los inputs se envuelvan en pantallas pequeñas */
}

.price-inputs .form-group {
    flex: 1; /* Permite que cada grupo de input/label ocupe espacio igual */
    min-width: 120px; /* Ancho mínimo para evitar que se achiquen demasiado */
    margin-bottom: 0; /* Eliminar margen inferior en los grupos internos */
}

.price-inputs .form-group label {
     flex-basis: auto; /* Eliminar ancho fijo en labels de precio */
     margin-bottom: 3px;
     font-size: 0.9em;
}

.remove-price-button {
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 25px;
    height: 25px;
    font-size: 0.8em;
    cursor: pointer;
    text-align: center;
    line-height: 25px;
    flex-shrink: 0; /* Evita que el botón se encoja */
}
.remove-price-button:hover { background-color: #c82333; }

.add-price-line-button {
    display: block;
    width: 100%;
    background-color: #007bff;
    color: white;
    padding: 8px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    margin-top: 10px;
    transition: background-color 0.3s ease;
}
.add-price-line-button:hover { background-color: #0056b3; }


.modal-footer {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #eee;
    text-align: right;
    flex-shrink: 0;
}

.submit-button {
    background-color: #28a745;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    margin-left: 10px;
    transition: background-color 0.3s ease;
}
.submit-button:hover:not(:disabled) { background-color: #218838; }
.submit-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.cancel-button {
    background-color: #6c757d;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.3s ease;
}
.cancel-button:hover { background-color: #5a6268; }

</style>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'; // Importamos computed
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();

// Definimos las props que recibirá el modal
const props = defineProps({
  show: { // Prop para controlar si el modal está visible
    type: Boolean,
    required: true
  }
});

// Definimos los eventos que el modal puede emitir (ej: para cerrarse)
const emit = defineEmits(['close']);

// --- Estado para la lista de Productos y Precios ---
const productos = ref([]); // Lista de productos con sus precios (datos crudos de la API)
const loading = ref(true); // Indica si se están cargando los datos
const error = ref(null);   // Para errores al cargar datos


// --- Propiedad computada para organizar los productos por tipo y preparar datos para la tabla ---
const organizedProducts = computed(() => {
    const organized = {}; // Objeto para agrupar productos por tipo

    // Inicializamos la estructura para cada tipo de producto esperado si existen en los datos
    const types = new Set(productos.value.map(p => p.tipo || 'Otros'));
    types.forEach(type => {
        organized[type] = {
            products: [],
            sizes: [], // Solo para Pizzas
            unitTypes: [] // Solo para Pizzas
        };
    });

    // Procesamos los productos
    productos.value.forEach(producto => {
        const tipo = producto.tipo || 'Otros';

        if (tipo === 'Pizza') {
            // Para Pizzas, procesamos los precios para la estructura de tabla
            const pricesByVariant = {};
            const currentSizes = new Set();
            const currentUnitTypes = new Set();

            producto.precios.forEach(precio => {
                if (precio.tamaño && precio.tipo_precio) {
                    if (!pricesByVariant[precio.tamaño]) {
                        pricesByVariant[precio.tamaño] = {};
                    }
                    pricesByVariant[precio.tamaño][precio.tipo_precio] = {
                        id: precio.id,
                        precio: precio.precio
                    };
                    currentSizes.add(precio.tamaño);
                    currentUnitTypes.add(precio.tipo_precio);
                }
            });

            organized[tipo].products.push({
                id: producto.id,
                nombre: producto.nombre,
                pricesByVariant: pricesByVariant
            });

            // Acumulamos los tamaños y tipos de unidad únicos encontrados en todas las pizzas
            currentSizes.forEach(size => organized[tipo].sizes.push(size));
            currentUnitTypes.forEach(unitType => organized[tipo].unitTypes.push(unitType));

        } else {
            // Para otros tipos, simplemente añadimos el producto con su lista de precios
            organized[tipo].products.push({
                id: producto.id,
                nombre: producto.nombre,
                precios: producto.precios // Mantenemos la estructura de precios original
            });
        }
    });

    // Post-procesamiento para Pizzas: obtener tamaños y tipos de unidad únicos y ordenarlos
    if (organized['Pizza']) {
         organized['Pizza'].sizes = Array.from(new Set(organized['Pizza'].sizes)).sort(); // Ordenar tamaños (ej: '8p', '12p')
         organized['Pizza'].unitTypes = Array.from(new Set(organized['Pizza'].unitTypes)).sort((a, b) => {
              // Orden personalizado para 'Entera' y 'Mitad'
              if (a === 'Entera' && b === 'Mitad') return -1;
              if (a === 'Mitad' && b === 'Entera') return 1;
              return a.localeCompare(b); // Orden alfabético para otros casos
         });
         // Opcional: Ordenar productos de pizza por nombre
         organized['Pizza'].products.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    // Opcional: Ordenar productos de otros tipos por nombre
    for (const type in organized) {
        if (type !== 'Pizza') {
            organized[type].products.sort((a, b) => a.nombre.localeCompare(b.nombre));
        }
    }


    console.log("Productos organizados:", organized); // Log para verificar la estructura
    return organized;
});


// Función asíncrona para obtener la lista de productos con precios desde la API
const fetchProductos = async () => {
    loading.value = true;
    error.value = null;

    const token = authStore.authToken;

    if (!token) {
        error.value = 'No autenticado. Por favor, inicie sesión.';
        console.error('Error: No hay token de autenticación en el store.');
        loading.value = false;
        // No redirigimos aquí, asumimos que App.vue o un guardia de navegación ya lo maneja
        return;
    }

    try {
        const apiUrl = 'http://127.0.0.1:8000/productos/api/list/'; // Endpoint que ya usamos en OrderPage

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

            console.error('Error al obtener productos para lista de precios (respuesta no OK):', response.status, errorData);

            if (response.status === 401 || response.status === 403) {
                console.warn('Token inválido o sin permisos staff al obtener lista de precios.');
                 // Aquí podrías emitir un evento para que App.vue maneje el logout globalmente
                // emit('auth-error');
                 error.value = 'Su sesión expiró o no tiene permisos. Inicie sesión nuevamente.';
            } else {
                 error.value = `Error al obtener productos: ${errorData.detail || `HTTP Status ${response.status}`}`;
            }
            return;
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            productos.value = data; // Asignamos directamente el array de productos con precios anidados
            console.log('Productos con precios obtenidos:', productos.value);
        } else {
            error.value = 'Respuesta inesperada del servidor al obtener productos.';
            console.error('Error: Respuesta 200 OK no es un array:', data);
        }

    } catch (err) {
        error.value = `Error de conexión o procesamiento: ${err.message}`;
        console.error('Error general en fetchProductos (modal):', err);
    } finally {
        loading.value = false;
    }
};

// Usamos un watcher para cargar los datos solo cuando el modal se vuelve visible
watch(() => props.show, (newValue) => {
    if (newValue) {
        fetchProductos(); // Cargar datos cuando show es true
    } else {
        // Opcional: Limpiar datos cuando el modal se cierra para recargar la próxima vez
        // productos.value = [];
        // error.value = null;
    }
});

// Función para cerrar el modal, emite el evento 'close'
const closeModal = () => {
    emit('close');
};

// Función para formatear el precio a 2 decimales
const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A';
    // Asegurarse de que el precio es un número antes de formatear
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 'N/A';
    return `$${numPrice.toFixed(2)}`;
};

// --- Nueva función para imprimir el contenido del modal ---
const printPriceList = () => {
    // Esta función activa el diálogo de impresión del navegador.
    // Los estilos CSS con @media print se encargarán de dar formato al contenido.
    window.print();
};

</script>

<template>
    <div v-if="show" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content" id="priceListToPrint"> <div class="modal-header">
                <h2>Lista de Precios y Productos</h2>
                <button @click="closeModal" class="close-modal-button print-hidden">X</button> </div>

            <div class="modal-body">
                <div v-if="loading">Cargando lista de precios...</div>
                <div v-if="error" class="error-message">Error al cargar la lista de precios: {{ error }}</div>

                <div v-if="!loading && !error && Object.keys(organizedProducts).length > 0" class="price-list-container">

                    <div v-if="organizedProducts['Pizza'] && organizedProducts['Pizza'].products.length > 0" class="pizza-price-table-section">
                        <h3>Pizzas</h3>
                        <table class="pizza-price-table">
                            <thead>
                                <tr>
                                    <th rowspan="2"></th> <th v-for="size in organizedProducts['Pizza'].sizes" :key="size" :colspan="organizedProducts['Pizza'].unitTypes.length">
                                        {{ size }}
                                    </th>
                                </tr>
                                <tr>
                                     <template v-for="size in organizedProducts['Pizza'].sizes" :key="size + '-units'">
                                        <th v-for="unitType in organizedProducts['Pizza'].unitTypes" :key="size + '-' + unitType">
                                            {{ unitType }}
                                        </th>
                                    </template>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="producto in organizedProducts['Pizza'].products" :key="producto.id">
                                    <td><strong>{{ producto.nombre }}</strong></td>
                                     <template v-for="size in organizedProducts['Pizza'].sizes" :key="producto.id + '-' + size + '-prices'">
                                        <td v-for="unitType in organizedProducts['Pizza'].unitTypes" :key="producto.id + '-' + size + '-' + unitType + '-price'"
                                            :data-label="`${size} - ${unitType}`"> {{ formatPrice(producto.pricesByVariant[size]?.[unitType]?.precio) }}
                                        </td>
                                    </template>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <template v-for="(typeData, typeName) in organizedProducts" :key="typeName">
                        <div v-if="typeName !== 'Pizza' && typeData.products.length > 0" class="other-products-list-section">
                             <h3>{{ typeName }}</h3>
                             <div v-for="producto in typeData.products" :key="producto.id" class="product-item-simple">
                                 <h4>{{ producto.nombre }}</h4>
                                 <div v-if="producto.precios && producto.precios.length > 0" class="prices-list-simple">
                                     <ul>
                                         <li v-for="precio in producto.precios" :key="precio.id">
                                             {{ precio.tamaño ? `${precio.tamaño} - ` : '' }}
                                             {{ precio.tipo_precio }}:
                                             <strong>{{ formatPrice(precio.precio) }}</strong>
                                         </li>
                                     </ul>
                                 </div>
                                 <div v-else>
                                     <p>No hay precios definidos para este producto.</p>
                                 </div>
                             </div>
                        </div>
                    </template>

                </div>

                <div v-if="!loading && !error && Object.keys(organizedProducts).length === 0">
                    No se encontraron productos activos.
                </div>
            </div>

            <div class="modal-footer print-hidden"> <button @click="printPriceList" class="print-button">
                     [Image of Printer icon] Imprimir Lista
                 </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Estilos para el overlay del modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6); /* Fondo oscuro semi-transparente */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000; /* Asegura que esté por encima de otros contenidos */
}

/* Estilos para el contenido del modal */
.modal-content {
    background-color: #fff;
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    max-width: 800px; /* Aumentamos el ancho para la tabla de pizzas */
    max-height: 90vh; /* Altura máxima (90% del viewport height) */
    overflow-y: auto; /* Añade scroll si el contenido excede la altura máxima */
    position: relative; /* Para posicionar el botón de cerrar */
    display: flex; /* Usamos flexbox para organizar header, body y footer */
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    padding-bottom: 15px;
    margin-bottom: 20px;
    flex-shrink: 0; /* Evita que el header se encoja */
}

.modal-header h2 {
    margin: 0;
    color: #333;
    font-size: 1.5em;
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
.close-modal-button:hover {
    background-color: #bbb;
}

.modal-body {
    flex-grow: 1; /* Permite que el cuerpo ocupe el espacio restante y maneje el scroll */
    overflow-y: auto; /* Asegura que solo el cuerpo tenga scroll si es necesario */
    padding-right: 10px; /* Añade un poco de padding para el scrollbar */
}

/* Estilos para el scrollbar en webkit browsers */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #555;
}


.error-message {
    color: red;
    text-align: center;
    margin-bottom: 15px;
}

.price-list-container {
    /* Contenedor principal de las listas de precios */
}

/* Estilos para la tabla de precios de pizzas */
.pizza-price-table-section {
    margin-bottom: 30px;
}
.pizza-price-table-section h3 {
     margin-top: 0;
     margin-bottom: 15px;
     color: #0056b3;
     border-bottom: 1px solid #007bff;
     padding-bottom: 5px;
}

.pizza-price-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 0.95em;
}

.pizza-price-table th,
.pizza-price-table td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: center; /* Centramos el texto en las celdas de la tabla */
    vertical-align: middle;
}

.pizza-price-table th {
    background-color: #f2f2f2;
    font-weight: bold;
}

.pizza-price-table thead tr:first-child th {
    /* Estilos para los encabezados de tamaño (12 Porciones, 8 Porciones) */
    background-color: #e9ecef; /* Fondo ligeramente diferente */
}

.pizza-price-table tbody tr:nth-child(even) {
    background-color: #f9f9f9;
}

.pizza-price-table td strong {
    color: #333; /* Color para el nombre del producto */
}

/* Estilos para la sección de otros productos (lista simple) */
.other-products-list-section {
     margin-top: 30px;
     padding-top: 20px;
     border-top: 1px dashed #ccc; /* Separador visual */
}
.other-products-list-section h3 {
     margin-top: 0;
     margin-bottom: 15px;
     color: #28a745; /* Verde para otros tipos */
     border-bottom: 1px solid #28a745;
     padding-bottom: 5px;
}

.product-item-simple {
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px dotted #eee;
}
.product-item-simple:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.product-item-simple h4 {
    margin: 0 0 8px 0;
    color: #555;
    font-size: 1.1em;
}

.prices-list-simple ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.prices-list-simple li {
    background-color: #fefefe;
    padding: 6px 10px;
    margin-bottom: 3px;
    border-radius: 3px;
    border: 1px solid #f1f1f1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9em;
}

.prices-list-simple li strong {
    color: #007bff; /* Azul para el precio en la lista simple */
    font-size: 1em;
}


/* Estilos para el footer del modal */
.modal-footer {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #eee;
    text-align: right; /* Alinea el botón a la derecha */
    flex-shrink: 0; /* Evita que el footer se encoja */
}

.print-button {
    background-color: #6c757d; /* Gris */
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.2s ease;
    display: inline-flex; /* Permite alinear ícono y texto */
    align-items: center;
    gap: 5px; /* Espacio entre ícono y texto */
}
.print-button:hover {
    background-color: #5a6268;
}


/* Estilos responsivos para el modal */
@media (max-width: 768px) {
    .modal-content {
        width: 95%; /* Ocupa casi todo el ancho en móviles */
        padding: 15px;
    }
    .modal-header h2 {
        font-size: 1.3em;
    }

    /* Ajustes para la tabla en pantallas pequeñas */
    .pizza-price-table,
    .pizza-price-table thead,
    .pizza-price-table tbody,
    .pizza-price-table th,
    .pizza-price-table td,
    .pizza-price-table tr {
        display: block; /* Permite apilar elementos */
    }

    .pizza-price-table thead tr {
        position: absolute;
        top: -9999px;
        left: -9999px; /* Oculta el encabezado original */
    }

    .pizza-price-table tr {
        border: 1px solid #ccc;
        margin-bottom: 15px;
        border-radius: 5px;
    }

    .pizza-price-table td {
        border: none;
        border-bottom: 1px solid #eee;
        position: relative;
        padding-left: 50%; /* Espacio para la pseudo-etiqueta */
        text-align: right; /* Alinea el valor a la derecha */
    }

    .pizza-price-table td:before {
        /* Crea la pseudo-etiqueta con el nombre de la columna */
        position: absolute;
        top: 6px;
        left: 6px;
        width: 45%;
        padding-right: 10px;
        white-space: nowrap;
        font-weight: bold;
        content: attr(data-label); /* Usa el atributo data-label para el contenido */
        text-align: left; /* Alinea la etiqueta a la izquierda */
        color: #555;
    }

    /* Asegurarse de que el nombre del producto en móvil ocupe su propia línea */
    .pizza-price-table td:first-child {
        text-align: left;
        font-size: 1.1em;
        padding-left: 8px; /* Eliminar padding extra */
    }
     .pizza-price-table td:first-child::before {
         content: none; /* Eliminar pseudo-etiqueta para el nombre del producto */
     }

}


/* --- Estilos específicos para Impresión --- */
@media print {
    /* Oculta todo el contenido del BODY */
    body > * {
        display: none !important;
    }

    /* Hace visible solo el modal overlay */
    .modal-overlay {
        display: block !important;
        position: static !important; /* Elimina el posicionamiento fijo */
        background-color: transparent !important; /* Elimina el fondo oscuro */
        width: auto !important;
        height: auto !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        justify-content: initial !important;
        align-items: initial !important;
    }

     /* Hace visible el contenido del modal */
    .modal-content {
        display: block !important;
        width: auto !important; /* Ancho automático */
        max-width: 100% !important; /* No restringir ancho */
        max-height: none !important; /* No restringir altura */
        box-shadow: none !important; /* Elimina la sombra */
        border-radius: 0 !important; /* Elimina bordes redondeados */
        padding: 10mm !important; /* Añade un poco de margen para impresión */
        overflow: visible !important; /* Permite que el contenido se expanda */
        margin: 0 auto !important; /* Centra el contenido si es más estrecho que la página */
        background-color: white !important; /* Asegura fondo blanco */
        position: static !important; /* Elimina el posicionamiento relativo */
    }


    /* Oculta elementos que no deben imprimirse (botón cerrar, botón imprimir, etc.) */
    .print-hidden {
        display: none !important;
    }

    /* Asegura que la tabla de pizzas se muestre correctamente en impresión */
     .pizza-price-table {
         display: table !important; /* Forzar display de tabla */
         width: 100% !important;
         border-collapse: collapse !important;
         margin-top: 10px !important;
     }
     .pizza-price-table thead,
     .pizza-price-table tbody,
     .pizza-price-table tr,
     .pizza-price-table th,
     .pizza-price-table td {
         display: table-cell !important; /* Forzar display de celda/fila */
         position: static !important; /* Eliminar posicionamiento absoluto */
         padding: 8px !important;
         text-align: center !important; /* Centrar texto en impresión */
         vertical-align: middle !important;
         border: 1px solid #ddd !important; /* Asegurar bordes */
     }

    /* Eliminar pseudo-elementos en impresión para tablas */
    .pizza-price-table td::before {
        content: none !important;
    }
     .pizza-price-table td:first-child {
         text-align: left !important; /* Mantener nombre del producto alineado a la izquierda */
         padding-left: 8px !important;
     }

    /* Asegura que otros productos también se impriman bien */
    .other-products-list-section {
        margin-top: 20px !important;
        padding-top: 15px !important;
        border-top: 1px dashed #ccc !important;
    }
    .product-item-simple {
        border-bottom: 1px dotted #eee !important;
        padding-bottom: 10px !important;
        margin-bottom: 10px !important;
    }
     .product-item-simple:last-child {
         border-bottom: none !important;
         margin-bottom: 0 !important;
         padding-bottom: 0 !important;
     }
     .prices-list-simple li {
         background-color: transparent !important; /* Fondo transparente */
         border: none !important; /* Sin bordes */
         padding: 3px 0 !important; /* Menos padding */
         margin-bottom: 2px !important;
     }
     .prices-list-simple li strong {
         color: #333 !important; /* Color de texto normal */
     }


    /* Ajustar fuentes y márgenes generales para impresión */
    body {
        font-size: 10pt; /* Fuente más pequeña para impresión */
    }
    h2, h3, h4 {
        color: #000 !important; /* Color negro para encabezados */
        border-bottom-color: #000 !important; /* Borde negro */
    }
     .modal-header h2 {
         font-size: 1.2em !important;
     }
     .pizza-price-table-section h3, .other-products-list-section h3 {
         font-size: 1.1em !important;
     }
     .product-item-simple h4 {
         font-size: 1em !important;
     }


}

</style>

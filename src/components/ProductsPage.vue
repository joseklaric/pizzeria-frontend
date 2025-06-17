<template>
  <div class="products-page container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6 text-center">Gestión de Productos</h1>

    <button
      @click="openAddModal"
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-6"
    >
      Añadir Nuevo Producto
    </button>

    <div v-if="loading" class="text-center text-gray-600">Cargando productos...</div>
    <div v-if="error" class="text-center text-red-500">Error al cargar productos: {{ error }}</div>

    <div v-if="!loading && !error && products.length > 0" class="overflow-x-auto bg-white rounded-lg shadow overflow-y-auto relative">
      <table class="border-collapse table-auto w-full whitespace-no-wrap bg-white table-striped relative">
        <thead>
          <tr class="text-left">
            <th class="bg-gray-100 sticky top-0 border-b border-gray-200 px-6 py-2 text-gray-600 font-bold tracking-wider uppercase text-xs">ID</th>
            <th class="bg-gray-100 sticky top-0 border-b border-gray-200 px-6 py-2 text-gray-600 font-bold tracking-wider uppercase text-xs">Nombre</th>
            <th class="bg-gray-100 sticky top-0 border-b border-gray-200 px-6 py-2 text-gray-600 font-bold tracking-wider uppercase text-xs">Tipo</th>
            <th class="bg-gray-100 sticky top-0 border-b border-gray-200 px-6 py-2 text-gray-600 font-bold tracking-wider uppercase text-xs">Activo</th>
            <th class="bg-gray-100 sticky top-0 border-b border-gray-200 px-6 py-2 text-gray-600 font-bold tracking-wider uppercase text-xs">Precios</th>
            <th class="bg-gray-100 sticky top-0 border-b border-gray-200 px-6 py-2 text-gray-600 font-bold tracking-wider uppercase text-xs">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id" class="hover:bg-gray-50">
            <td class="border-dashed border-t border-gray-200 px-6 py-3">{{ product.id }}</td>
            <td class="border-dashed border-t border-gray-200 px-6 py-3">{{ product.nombre }}</td>
            <td class="border-dashed border-t border-gray-200 px-6 py-3">{{ product.tipo }}</td>
            <td class="border-dashed border-t border-gray-200 px-6 py-3">
              <span :class="{'text-green-500': product.activo, 'text-red-500': !product.activo}">
                {{ product.activo ? 'Sí' : 'No' }}
              </span>
            </td>
            <td class="border-dashed border-t border-gray-200 px-6 py-3">
              <ul class="list-disc list-inside">
                <li v-for="price in product.precios" :key="price.id">
                  {{ price.tamaño }} ({{ price.tipo_precio }}): ${{ price.precio }}
                </li>
              </ul>
            </td>
            <td class="border-dashed border-t border-gray-200 px-6 py-3">
              <button
                @click="openEditModal(product)"
                class="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded text-xs mr-2"
              >
                Editar
              </button>
              <button
                @click="deleteProduct(product.id)"
                class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
              >
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && !error && products.length === 0" class="text-center text-gray-600 mt-4">
      No hay productos disponibles.
    </div>

    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 class="text-lg font-bold mb-4">{{ isEditing ? 'Editar Producto' : 'Añadir Producto' }}</h3>
        <form @submit.prevent="saveProduct">
          <div class="mb-4">
            <label for="nombre" class="block text-gray-700 text-sm font-bold mb-2">Nombre:</label>
            <input
              type="text"
              id="nombre"
              v-model="formData.nombre"
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
          </div>
          <div class="mb-4">
            <label for="tipo" class="block text-gray-700 text-sm font-bold mb-2">Tipo:</label>
            <input
              type="text"
              id="tipo"
              v-model="formData.tipo"
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
          </div>
          <div class="mb-4 flex items-center">
            <input
              type="checkbox"
              id="activo"
              v-model="formData.activo"
              class="mr-2 leading-tight"
            >
            <label for="activo" class="text-sm text-gray-700">Activo</label>
          </div>

          <div v-if="isEditing && formData.precios && formData.precios.length > 0" class="mb-4">
            <h4 class="text-md font-semibold mb-2">Precios Existentes:</h4>
            <ul>
              <li v-for="precio in formData.precios" :key="precio.id" class="text-sm text-gray-600">
                {{ precio.tamaño }} ({{ precio.tipo_precio }}): ${{ precio.precio }}
              </li>
            </ul>
            </div>
           <div v-else-if="isEditing" class="mb-4">
               <p class="text-sm text-gray-600">Este producto no tiene precios asociados.</p>
           </div>


          <div class="flex items-center justify-between">
            <button
              type="submit"
              class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              {{ isEditing ? 'Guardar Cambios' : 'Crear Producto' }}
            </button>
            <button
              type="button"
              @click="closeModal"
              class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore'; // Importamos el store de autenticación

const authStore = useAuthStore(); // Obtenemos la instancia del store

const products = ref([]);
const loading = ref(true);
const error = ref(null);
const showModal = ref(false);
const isEditing = ref(false);
const formData = ref({
  id: null,
  nombre: '',
  tipo: '',
  activo: true,
  precios: [] // Para mostrar precios existentes en edición, no para editar/crear
});

// URL base de la API de productos
const API_URL = 'http://127.0.0.1:8000/productos/api/';

// Función para cargar los productos desde la API
const fetchProducts = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(`${API_URL}list/`, {
      headers: {
        'Authorization': `Token ${authStore.authToken}`, // Incluimos el token de autenticación
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      // Si la respuesta no es OK (ej. 401 Unauthorized, 403 Forbidden)
      if (response.status === 401 || response.status === 403) {
         error.value = 'No tienes permiso para ver esta información. Por favor, inicia sesión con una cuenta de staff.';
         // Opcional: Redirigir al login si no está autorizado
         // router.push('/login');
      } else {
        error.value = `Error al cargar productos: ${response.statusText}`;
      }
      products.value = []; // Limpiar lista en caso de error
    } else {
      products.value = await response.json();
      console.log('Productos cargados:', products.value); // Para depuración
    }
  } catch (e) {
    console.error('Error fetching products:', e);
    error.value = 'Error de red o del servidor al cargar productos.';
    products.value = []; // Limpiar lista en caso de error
  } finally {
    loading.value = false;
  }
};

// Función para abrir el modal para añadir un nuevo producto
const openAddModal = () => {
  isEditing.value = false;
  // Limpiar el formulario para un nuevo producto
  formData.value = { id: null, nombre: '', tipo: '', activo: true, precios: [] };
  showModal.value = true;
};

// Función para abrir el modal para editar un producto existente
const openEditModal = (product) => {
  isEditing.value = true;
  // Cargar los datos del producto en el formulario
  formData.value = { ...product }; // Copiamos el objeto product
   // Asegurarse de que precios es un array, incluso si está vacío
  if (!formData.value.precios) {
      formData.value.precios = [];
  }
  showModal.value = true;
};

// Función para cerrar el modal
const closeModal = () => {
  showModal.value = false;
};

// Función para guardar un producto (crear o actualizar)
const saveProduct = async () => {
  const method = isEditing.value ? 'PUT' : 'POST'; // Usar PUT para actualizar, POST para crear
  // La URL para actualizar podría ser '/productos/api/update/{id}/' o similar.
  // Asumimos que tu API de Django REST tiene endpoints para crear (POST a /list/)
  // y actualizar (PUT/PATCH a /list/{id}/). Si tus URLs son diferentes, ajústalas aquí.
  const url = isEditing.value ? `${API_URL}list/${formData.value.id}/` : `${API_URL}list/`;

  // Preparamos los datos a enviar. Excluimos 'precios' ya que este formulario no los maneja
  const dataToSend = {
    nombre: formData.value.nombre,
    tipo: formData.value.tipo,
    activo: formData.value.activo,
    // No enviamos 'precios' aquí. La gestión de precios es un tema aparte.
  };

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Token ${authStore.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataToSend)
    });

    if (!response.ok) {
      // Manejar errores de la API (ej. validación)
      const errorData = await response.json();
      console.error('Error saving product:', errorData);
      alert(`Error al guardar el producto: ${JSON.stringify(errorData)}`); // Mostrar error al usuario
    } else {
      // Si la operación fue exitosa
      console.log('Producto guardado exitosamente');
      closeModal(); // Cerrar el modal
      fetchProducts(); // Recargar la lista de productos para ver los cambios
    }
  } catch (e) {
    console.error('Error saving product:', e);
    alert('Error de red o del servidor al guardar el producto.');
  }
};

// Función para eliminar un producto
const deleteProduct = async (productId) => {
  if (confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
    try {
      // Asumimos que tu API de Django REST tiene un endpoint para eliminar (DELETE a /list/{id}/)
      const response = await fetch(`${API_URL}list/${productId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${authStore.authToken}`,
        }
      });

      if (!response.ok) {
         // Manejar errores de la API
        const errorText = await response.text(); // Leer el cuerpo de la respuesta para más detalles
        console.error('Error deleting product:', response.status, errorText);
         // Puedes intentar parsear como JSON si esperas un JSON de error
         try {
             const errorData = JSON.parse(errorText);
             alert(`Error al eliminar el producto: ${JSON.stringify(errorData)}`);
         } catch (jsonError) {
             // Si no es JSON, mostrar el texto plano o un mensaje genérico
             alert(`Error al eliminar el producto. Estado: ${response.status}. Mensaje: ${errorText || 'Error desconocido.'}`);
         }

      } else {
        // Si la eliminación fue exitosa (respuesta 204 No Content es común para DELETE)
        console.log('Producto eliminado exitosamente');
        fetchProducts(); // Recargar la lista de productos
      }
    } catch (e) {
      console.error('Error deleting product:', e);
      alert('Error de red o del servidor al eliminar el producto.');
    }
  }
};


// Cargar productos al montar el componente
onMounted(() => {
  fetchProducts();
});
</script>

<style scoped>
/* Puedes añadir o modificar estilos aquí según necesites */
/* Los estilos con 'scoped' solo afectan a este componente */

.products-page {
  /* Estilos generales de la página */
}

.container {
    max-width: 1000px; /* Ajusta el ancho máximo del contenedor */
}

/* Estilos para la tabla */
.table-auto {
  border-collapse: collapse;
  width: 100%;
}

.table-auto th,
.table-auto td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0; /* Tailwind gray-200 */
}

.table-auto th {
  background-color: #f8f9fa; /* Tailwind gray-100 */
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem; /* Tailwind text-xs */
  color: #4a5568; /* Tailwind gray-600 */
}

.table-auto tbody tr:hover {
  background-color: #f7fafc; /* Tailwind gray-50 */
}

/* Estilos para el modal */
#my-modal {
  z-index: 1000; /* Asegura que el modal esté por encima de otros elementos */
}
</style>

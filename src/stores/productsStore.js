import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Datos iniciales de productos (los moveremos aquí desde ProductsPage.vue)
// En el futuro, esto se llenará con una llamada a la API
const initialProducts = [
    {
        id: '1',
        name: 'Pizza Pepperoni',
        description: 'Clásica pizza de pepperoni con queso mozzarella.',
        price: 12.99, // Usar números para los precios
        category: 'Pizzas',
        image: '/images/stock/pizza-pepperoni.jpg' // Ejemplo de ruta, ajustar según tu estructura de imágenes
    },
    {
        id: '2',
        name: 'Hamburguesa Clásica',
        description: 'Jugosa carne de res con lechuga, tomate, y queso.',
        price: 8.50,
        category: 'Hamburguesas',
        image: '/images/stock/hamburguesa-clasica.jpg'
    },
    {
        id: '3',
        name: 'Sushi Variado',
        description: 'Selección de nuestros mejores rollos de sushi.',
        price: 15.00,
        category: 'Sushi',
        image: '/images/stock/sushi-variado.jpg'
    },
    {
        id: '4',
        name: 'Ensalada César',
        description: 'Lechuga fresca, crutones, parmesano y aderezo César.',
        price: 7.25,
        category: 'Ensaladas',
        image: '/images/stock/ensalada-cesar.jpg'
    }
    // Puedes añadir más productos de ejemplo aquí si quieres
];

export const useProductsStore = defineStore('products', () => {
    // --- Estado ---
    const products = ref([]); // Inicialmente vacío, se llenará en fetchProducts

    // --- Getters ---
    const allProducts = computed(() => products.value);

    const getProductById = computed(() => {
        return (productId) => products.value.find(p => p.id === productId);
    });

    // --- Acciones ---
    async function fetchProducts() {
        // SIMULACIÓN: Cargar los productos iniciales.
        // En el futuro, esto haría una llamada a la API:
        // try {
        //     const response = await fetch('/api/products'); // O usando Axios: await axios.get('/api/products');
        //     if (!response.ok) {
        //         throw new Error(`HTTP error! status: ${response.status}`);
        //     }
        //     const data = await response.json();
        //     products.value = data;
        //     console.log('Productos cargados desde API (simulada por ahora):', products.value);
        // } catch (error) {
        //     console.error("Error fetching products:", error);
        //     // Opcional: cargar datos de fallback o mostrar un error al usuario
        //     products.value = initialProducts; // Fallback a datos iniciales si la API falla
        //     console.warn("API falló, cargando productos de muestra locales.");
        // }

        // Por ahora, solo cargamos los datos de muestra directamente:
        await new Promise(resolve => setTimeout(resolve, 500)); // Simular pequeño delay de red
        products.value = initialProducts;
        console.log('Productos de muestra cargados en el store:', products.value);
    }

    // (Aquí irían futuras acciones como addProduct, updateProduct, deleteProduct,
    //  que interactuarían con el backend y requerirían manejo de tokens de admin, etc.)

    // Llamar a fetchProducts cuando el store se instancia para cargar los datos iniciales
    // Opcionalmente, esto podría llamarse desde un componente (ej: onMounted en ProductsPage.vue)
    // si no quieres que los productos se carguen automáticamente al usar cualquier parte del store.
    // Por ahora, lo cargaremos al instanciar.
    fetchProducts();

// --- Exponer Estado, Getters y Acciones ---
    return {
        // Estado (refs) - preferiblemente acceder a través de getters
        // products, // Podrías exponerlo si es necesario para v-for directos, pero allProducts es mejor

        // Getters
        allProducts,
        getProductById,

        // Acciones
        fetchProducts
        // ... futuras acciones como addProduct, updateProduct, deleteProduct
    };
});

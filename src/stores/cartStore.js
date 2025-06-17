import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const CART_STORAGE_KEY = 'pizzeria_cart_items';

export const useCartStore = defineStore('cart', () => {
    // --- Estado ---
    // Cargar el carrito desde localStorage o inicializarlo como un array vacío
    const items = ref(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || []);

    // --- Helper Functions (internas al store) ---
    const saveCartToLocalStorage = () => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.value));
    };

// --- Getters (Computados) ---
    const cartItemCount = computed(() => {
        return items.value.reduce((count, item) => count + item.quantity, 0);
    });

    const cartTotalAmount = computed(() => {
        return items.value.reduce((total, item) => total + (item.price * item.quantity), 0);
    });

    const isEmpty = computed(() => items.value.length === 0);

    // Devuelve un item específico del carrito por su ID de producto
    const getItemById = computed(() => {
        return (productId) => items.value.find(item => item.id === productId);
    });

    // --- Acciones ---
    function addItem(product, quantity = 1) {
        if (!product || !product.id || typeof product.price !== 'number') {
            console.error('Error en addItem: El producto es inválido o le falta precio.', product);
            return;
        }
        if (quantity <= 0) {
            console.warn('Error en addItem: La cantidad debe ser positiva.', quantity);
            return;
        }

        const existingItem = items.value.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            items.value.push({
                id: product.id,
                name: product.name,
                price: product.price, // Asegúrate que el precio aquí sea numérico
                image: product.image || product.imageUrl || './placeholder.jpg', // Maneja diferentes nombres de propiedad de imagen
                quantity: quantity,
            });
        }
        saveCartToLocalStorage();
        console.log('Item added/updated in cart:', product.name, 'New quantity:', existingItem ? existingItem.quantity : quantity);
    }

    function updateItemQuantity(productId, newQuantity) {
        newQuantity = Math.max(0, newQuantity); // Asegurar que la cantidad no sea negativa

        const itemIndex = items.value.findIndex(item => item.id === productId);

        if (itemIndex !== -1) {
            if (newQuantity === 0) {
                // Si la nueva cantidad es 0, eliminar el item
                items.value.splice(itemIndex, 1);
            } else {
                items.value[itemIndex].quantity = newQuantity;
            }
            saveCartToLocalStorage();
            console.log('Cart item quantity updated. Product ID:', productId, 'New quantity:', newQuantity);
        } else {
            console.warn('updateItemQuantity: Item no encontrado en el carrito. Product ID:', productId);
        }
    }

    function removeItem(productId) {
        const itemIndex = items.value.findIndex(item => item.id === productId);
        if (itemIndex !== -1) {
            items.value.splice(itemIndex, 1);
            saveCartToLocalStorage();
            console.log('Item removed from cart. Product ID:', productId);
        } else {
            console.warn('removeItem: Item no encontrado en el carrito. Product ID:', productId);
        }
    }

    function clearCart() {
        items.value = [];
        saveCartToLocalStorage();
        console.log('Cart cleared.');
    }

    /**
     * Simula el proceso de checkout.
     * En una aplicación real, esto enviaría el pedido al backend.
     */
    async function checkout(customerInfo) {
        if (isEmpty.value) {
            console.error('Checkout intentado con carrito vacío.');
            throw new Error('No puedes realizar un pedido con el carrito vacío.');
        }
        console.log('Iniciando checkout con la siguiente información de cliente:', customerInfo);
        console.log('Items en el carrito:', items.value);
        console.log('Monto total:', cartTotalAmount.value);

        // SIMULACIÓN DE LLAMADA A API DE PEDIDOS
        // Aquí es donde llamarías a tu backend: POST /api/orders
        // con payload: { userId (del authStore), products: items.value, totalAmount: cartTotalAmount.value, customerInfo }
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simula delay de red

        // Simulación de respuesta exitosa
        const orderId = 'mockOrder-' + Date.now();
        console.log('Checkout simulado exitoso. ID del Pedido:', orderId);
        
        clearCart(); // Limpiar el carrito después de un checkout exitoso

        return { 
            success: true, 
            orderId: orderId, 
            message: `Pedido ${orderId} realizado exitosamente.` 
        };
        
        // Ejemplo de cómo manejarías un error de la API:
        // try {
        //   const response = await api.submitOrder({ cart: items.value, customerInfo });
        //   clearCart();
        //   return { success: true, orderId: response.data.orderId };
        // } catch (error) {
        //   console.error('Error durante el checkout:', error);
        //   throw new Error('Hubo un problema al procesar tu pedido. Por favor, inténtalo de nuevo.');
        // }
    }
// --- Exponer Estado, Getters y Acciones ---
    return {
        // Estado (refs) - expuestos para lectura directa si es necesario, pero se prefieren getters
        items, // El array de items en el carrito

        // Getters (computados)
        cartItemCount,
        cartTotalAmount,
        isEmpty,
        getItemById,

        // Acciones
        addItem,
        updateItemQuantity,
        removeItem,
        clearCart,
        checkout
    };
});
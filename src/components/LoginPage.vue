<script setup>
import { ref } from 'vue';
// Importamos nuestro store de autenticación de Pinia
import { useAuthStore } from '@/stores/authStore'; // Usamos el alias @ para src/stores
// Importamos el router para la navegación
import { useRouter } from 'vue-router'; // <-- Importa useRouter

// Obtenemos la instancia del store de autenticación
const authStore = useAuthStore();
// Obtenemos la instancia del router
const router = useRouter(); // <-- Obtenemos la instancia del router

// Creamos referencias reactivas para los campos de input del formulario
const username = ref('');
const password = ref('');
const errorMessage = ref(null); // Para mostrar mensajes de error al usuario
const loading = ref(false);     // Para indicar si la petición está en curso

// Función que se llama cuando se envía el formulario de login
const handleLogin = async () => {
  loading.value = true; // Indicamos que la petición ha iniciado
  errorMessage.value = null; // Limpiamos cualquier error previo

  try {
    // Llamamos a la acción login del store de autenticación
    await authStore.login(username.value, password.value);

    // Si la acción login se completa sin lanzar un error, significa que fue exitosa.
    // Redirigimos al usuario a la página principal (ej: /order)
    // Asegurate de que la ruta '/order' esté definida en tu router (la definiremos en el próximo paso)
    router.push('/order'); // <-- Usamos router.push para navegar

  } catch (err) {
    // Si la acción login lanzó un error, lo capturamos aquí y lo mostramos
    errorMessage.value = err.message || 'Error desconocido al iniciar sesión.';
    console.error('Login fallido en componente:', err);
  } finally {
    loading.value = false; // Indicamos que la petición ha terminado
  }
};

// Opcional: Verificar si ya estamos autenticados al cargar la página de login
// Si ya tenemos un token válido en Local Storage, podríamos redirigir automáticamente.
// Esto lo manejaremos mejor con guardas de navegación más adelante.

</script>

<template>
  <div class="login-container">
    <h1>Iniciar Sesión</h1>
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="username">Usuario:</label>
        <input type="text" id="username" v-model="username" required />
      </div>
      <div class="form-group">
        <label for="password">Contraseña:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Iniciando...' : 'Login' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
/* Estilos básicos para la página de login (scoped) */
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh; /* Ajusta la altura según necesites */
  font-family: sans-serif;
  padding: 20px;
  background-color: #f4f4f4;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  margin: auto; /* Centrar el contenedor */
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

form {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

input[type="text"],
input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box; /* Incluir padding y borde en el ancho total */
}

button {
  background-color: #007bff;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}

button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.error-message {
  color: red;
  margin-bottom: 15px;
  text-align: center;
}
</style>
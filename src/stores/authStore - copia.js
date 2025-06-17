// src/stores/authStore.js

import { defineStore } from 'pinia';
import { ref, computed } from 'vue'; // Usaremos ref y computed de Vue

// Definimos y exportamos nuestro store de autenticación
// 'auth' es un ID único para este store
export const useAuthStore = defineStore('auth', () => {
  // 1. Estado (State): Variables reactivas que contienen los datos
  // Inicializamos el token con el valor del Local Storage si existe (para persistencia)
  const authToken = ref(localStorage.getItem('authToken') || null);
  const user = ref(null); // Podríamos almacenar info del usuario si la API de login la devuelve

  // 2. Getters: Propiedades computadas basadas en el estado
  // Indica si el usuario está autenticado (si hay un token)
  const isAuthenticated = computed(() => !!authToken.value);
  // Puedes añadir getters para el usuario, roles, etc.

  // 3. Acciones (Actions): Funciones para modificar el estado o realizar lógica asíncrona
  // Acción para realizar el login
  const login = async (username, password) => {
    const loginUrl = 'http://127.0.0.1:8000/auth/token/login/'; // Endpoint de login de Djoser

    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        // Si el login falla (ej: 400, 401), limpiamos el token y lanzamos un error
        logout(); // Aseguramos que no haya token residual
        let errorData = {};
        try {
           errorData = await response.json();
        } catch (e) {
           errorData = { detail: `Error de red o servidor: ${response.status}` };
        }
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }

      const data = await response.json();
      const token = data.auth_token;

      // Actualizamos el estado y guardamos el token en Local Storage
      authToken.value = token;
      localStorage.setItem('authToken', token);

      // Opcional: Si la API de login devuelve info del usuario, podrías guardarla:
      // user.value = data.user_info;

      console.log('Login exitoso en Store! Token:', token);

      // La acción no necesita devolver el token, el store lo gestiona.
      // La vista que llama a esta acción manejará la redirección.

    } catch (error) {
      // Capturamos errores y los relanzamos para que el componente que llama los maneje
      console.error('Error en acción de login:', error);
      throw error; // Relanzamos el error
    }
  };

  // Acción para realizar el logout
  const logout = async () => {
      const logoutUrl = 'http://127.0.0.1:8000/auth/token/logout/'; // Endpoint de logout de Djoser
      const token = authToken.value; // Obtenemos el token actual del estado

      // Opcional: Llamar al endpoint de logout en el backend para invalidar el token en el servidor.
      // Esto requiere que el endpoint de logout de Djoser esté configurado para requerir autenticación.
      // Djoser por defecto permite POST al logout con el token en headers.
      if (token) {
          try {
              await fetch(logoutUrl, {
                  method: 'POST',
                  headers: {
                      'Authorization': `Token ${token}`, // Enviamos el token
                      'Content-Type': 'application/json',
                  },
                  // logout en djoser a veces espera un body vacio {}
                  // body: JSON.stringify({}) // <-- Si Djoser lo requiere
              });
              console.log('Logout exitoso en backend.');
          } catch (e) {
              console.error('Error al hacer logout en backend:', e);
              // No lanzamos el error, queremos limpiar el estado local de todas formas.
          }
      }


      // Limpiamos el estado y el Local Storage
      authToken.value = null;
      user.value = null;
      localStorage.removeItem('authToken'); // Limpiamos Local Storage

      console.log('Logout exitoso en Store!');

      // La vista que llama a logout manejará la redirección a la página de login.
  };


  // Debes retornar todo el estado, getters y acciones que quieres exponer
  return {
    authToken,
    user,
    isAuthenticated,
    login,
    logout,
  };
});
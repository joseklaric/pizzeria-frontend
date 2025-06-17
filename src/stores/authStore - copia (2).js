// src/stores/authStore.js

import { defineStore } from 'pinia';
import { ref, computed } from 'vue'; // Usaremos ref y computed de Vue

// Definimos y exportamos nuestro store de autenticación
// 'auth' es un ID único para este store
export const useAuthStore = defineStore('auth', () => {
  // 1. Estado (State): Variables reactivas que contienen los datos
  // Inicializamos el token con el valor del Local Storage si existe (para persistencia)
  const authToken = ref(localStorage.getItem('authToken') || null);
  // Inicializamos user con null. Almacenará el objeto completo del usuario (incluyendo is_staff)
  const user = ref(null);

  // 2. Getters: Propiedades computadas basadas en el estado
  // Indica si el usuario está autenticado (si hay un token)
  const isAuthenticated = computed(() => !!authToken.value);

  // Getter para acceder al campo is_staff del usuario
  // Retorna true si el usuario existe y es staff, de lo contrario false
  const isStaff = computed(() => user.value ? user.value.is_staff : false);


  // 3. Acciones (Actions): Funciones para modificar el estado o realizar lógica asíncrona

  // Acción para realizar el login
  const login = async (username, password) => {
    const loginUrl = 'http://127.0.0.1:8000/auth/token/login/'; // Endpoint de login de Djoser
    const userDetailsUrl = 'http://127.0.0.1:8000/auth/users/me/'; // Endpoint para obtener detalles del usuario

    try {
      // Paso 1: Obtener el token de autenticación
      const tokenResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.detail || 'Error en el login: Credenciales inválidas');
      }

      const tokenData = await tokenResponse.json();
      const token = tokenData.auth_token;

      // Almacenar el token en el estado y Local Storage
      authToken.value = token;
      localStorage.setItem('authToken', token);

      console.log('Login exitoso! Token obtenido.');

      // Paso 2: Usar el token para obtener los detalles completos del usuario
      const userDetailsResponse = await fetch(userDetailsUrl, {
        method: 'GET', // El endpoint /users/me/ usa GET
        headers: {
          'Authorization': `Token ${token}`, // Enviamos el token en el header Authorization
          'Content-Type': 'application/json',
        },
      });

      if (!userDetailsResponse.ok) {
         // Si falla la obtención de detalles, limpiamos el token ya que la autenticación parcial no es útil
         authToken.value = null;
         localStorage.removeItem('authToken');
         const errorData = await userDetailsResponse.json();
         throw new Error(errorData.detail || 'Error al obtener detalles del usuario');
      }

      const userData = await userDetailsResponse.json();
      // Almacenar el objeto completo del usuario en el estado
      user.value = userData;

      console.log('Detalles de usuario obtenidos:', user.value);
      console.log('Usuario es staff:', user.value.is_staff); // Verificar en consola

    } catch (e) {
      console.error('Login failed:', e);
      // Limpiamos el estado y Local Storage en caso de cualquier error durante el login o la obtención de detalles
      authToken.value = null;
      user.value = null;
      localStorage.removeItem('authToken');
      throw e; // Re-lanzamos el error para que la vista pueda manejarlo (ej: mostrar mensaje al usuario)
    }
  };

  // Acción para realizar el logout
  const logout = async () => {
      const token = authToken.value; // Obtenemos el token actual antes de limpiarlo
      const logoutUrl = 'http://127.0.0.1:8000/auth/token/logout/'; // Endpoint de logout de Djoser

      // Llamar al endpoint de logout en el backend para invalidar el token en el servidor.
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
                  // body: JSON.stringify({}) // <-- Si Djoser lo requiere, descomentar
              });
              console.log('Logout exitoso en backend.');
          } catch (e) {
              console.error('Error al hacer logout en backend:', e);
              // No lanzamos el error, queremos limpiar el estado local de todas formas.
          }
      }


      // Limpiamos el estado y el Local Storage
      authToken.value = null;
      user.value = null; // Limpiamos también la información del usuario
      localStorage.removeItem('authToken'); // Limpiamos Local Storage

      console.log('Logout exitoso en Store!');

      // La vista que llama a logout manejará la redirección a la página de login.
  };

  // Función para cargar el usuario desde el backend si hay un token guardado
  // Esto es útil para mantener la sesión al recargar la página
  const loadUser = async () => {
    const token = localStorage.getItem('authToken');
    const userDetailsUrl = 'http://127.0.0.1:8000/auth/users/me/';

    if (token && !user.value) { // Si hay token pero no info de usuario en el store
      try {
        const userDetailsResponse = await fetch(userDetailsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (userDetailsResponse.ok) {
          const userData = await userDetailsResponse.json();
          authToken.value = token; // Aseguramos que el token esté en el estado
          user.value = userData; // Almacenamos la info del usuario
          console.log('Usuario cargado desde token existente:', user.value);
          console.log('Usuario es staff (cargado):', user.value.is_staff);
        } else {
           // Si el token no es válido o hay otro error, limpiamos todo
           console.error('Error al cargar usuario con token existente:', userDetailsResponse.status);
           authToken.value = null;
           user.value = null;
           localStorage.removeItem('authToken');
        }
      } catch (e) {
        console.error('Error en fetch al cargar usuario:', e);
        // En caso de error de red u otro, limpiamos el estado
        authToken.value = null;
        user.value = null;
        localStorage.removeItem('authToken');
      }
    }
  };


  // Debes retornar todo el estado, getters y acciones que quieres exponer
  return {
    authToken,
    user, // Ahora exponemos el objeto completo del usuario
    isAuthenticated,
    isStaff, // Exponemos el nuevo getter isStaff
    login,
    logout,
    loadUser, // Exponemos la nueva acción loadUser
  };
});

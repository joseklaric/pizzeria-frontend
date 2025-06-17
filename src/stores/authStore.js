import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Un nombre más descriptivo para la clave en localStorage
const AUTH_TOKEN_KEY = 'pizzeria_auth_token';
const USER_DATA_KEY = 'pizzeria_user_data';

export const useAuthStore = defineStore('auth', () => {
    // --- Estado ---
    const token = ref(localStorage.getItem(AUTH_TOKEN_KEY) || null);
    const user = ref(JSON.parse(localStorage.getItem(USER_DATA_KEY)) || null);

    // --- Getters ---
    const isAuthenticated = computed(() => !!token.value && !!user.value);
    const getUserRole = computed(() => user.value?.role || null);
    const getUserId = computed(() => user.value?.id || null);
    const getUserEmail = computed(() => user.value?.email || null);
    const getUsername = computed(() => user.value?.username || null);

    // --- Acciones ---

    async function login(credentials) {
        console.log('Attempting login with:', credentials);
        // SIMULACIÓN DE LLAMADA A API: Reemplazar con llamada real a tu backend
        // GET /api/auth/login (o la ruta que definas en tu backend)
        await new Promise(resolve => setTimeout(resolve, 750)); // Simula delay de red

        // EJEMPLO DE RESPUESTA SIMULADA DEL BACKEND
        // Tu backend, después de validar credenciales y generar un JWT,
        // debería devolver algo como el objeto mockApiResponse.
        let mockApiResponse;

        if (credentials.username === 'admin' && credentials.password === 'password') {
            mockApiResponse = {
                token: 'fake-jwt-token-admin-' + Date.now(),
                user: {
                    id: 'admin001',
                    username: credentials.username,
                    email: `admin@example.com`,
                    role: 'admin' 
                }
            };
        } else if (credentials.username === 'user' && credentials.password === 'userpass') {
             mockApiResponse = {
                token: 'fake-jwt-token-user-' + Date.now(),
                user: {
                    id: 'user002',
                    username: credentials.username,
                    email: `user@example.com`,
                    role: 'user' 
                }
            };
        } else {
            // Simulación de fallo de autenticación por credenciales incorrectas
            clearAuthData();
            console.error('Login simulation failed: Invalid credentials');
            // En una app real, la API del backend devolvería un error (ej: 401 Unauthorized)
            // y aquí se podría lanzar un error para que el componente lo maneje.
            throw new Error('Credenciales inválidas. Por favor, inténtalo de nuevo.');
        }
        
        // Si la "API" simulada devuelve datos correctos:
        setAuthData(mockApiResponse.token, mockApiResponse.user);
        console.log('Login simulation successful', mockApiResponse.user);
        return true; // Indicar éxito para que el componente pueda reaccionar
    }

    async function register(registrationData) {
        console.log('Attempting registration with:', registrationData);
        // SIMULACIÓN DE LLAMADA A API: Reemplazar con llamada real a tu backend
        // POST /api/auth/register (o la ruta que definas)
        await new Promise(resolve => setTimeout(resolve, 750));

        // EJEMPLO DE RESPUESTA SIMULADA DEL BACKEND
        if (registrationData.email && registrationData.password && registrationData.username) {
            console.log('Registration simulation successful for:', registrationData.email);
            // Un backend real podría devolver el usuario creado.
            // Algunos backends auto-loguean al usuario después del registro (devolviendo token y user data).
            // Si ese fuera el caso, aquí llamarías a setAuthData().
            // Por ahora, solo simulamos un registro exitoso sin auto-login.
            return { success: true, message: 'Usuario registrado exitosamente. Por favor, inicia sesión.' };
        } else {
            console.error('Registration simulation failed: Missing data');
            const errorMessage = 'Error en el registro. Faltan datos o el email ya existe.';
            throw new Error(errorMessage);
        }
    }  

 function logout() {
        clearAuthData();
        console.log('User logged out');
        // Opcional: Redirigir. Esto normalmente se hace en el componente que llama a logout,
        // o mediante un "navigation guard" en el router que reacciona al cambio de isAuthenticated.
        // Ejemplo: router.push('/login');
    }

    function setAuthData(newToken, userData) {
        token.value = newToken;
        user.value = userData; // userData debe ser un objeto
        localStorage.setItem(AUTH_TOKEN_KEY, newToken);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    }

    function clearAuthData() {
        token.value = null;
        user.value = null;
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
    }

function initializeAuth() {
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        const storedUserDataString = localStorage.getItem(USER_DATA_KEY);

        if (storedToken && storedUserDataString) {
            token.value = storedToken;
            try {
                user.value = JSON.parse(storedUserDataString); // Parsea el string a objeto
                console.log('Auth initialized from localStorage. User:', user.value);
            } catch (e) {
                console.error('Error parsing stored user data from localStorage, clearing auth state.', e);
                clearAuthData(); // Si los datos del usuario están corruptos, limpiar todo.
            }
        } else {
            console.log('No valid auth data found in localStorage. Initializing as logged out.');
            // Asegurarse de que esté limpio si falta algo
            if (!storedToken) localStorage.removeItem(AUTH_TOKEN_KEY);
            if (!storedUserDataString) localStorage.removeItem(USER_DATA_KEY);
        }
    }

    // Inicializar el estado de autenticación cuando el store se instancia
    initializeAuth();

 return {
        // Estado expuesto directamente (Vue 3 recomienda getters para el estado)
        // token, // Generalmente no se expone el token directamente
        // user,  // Se accede mejor a través de getters

        // Getters (Computados)
        isAuthenticated,
        getUserRole,
        getUserId,
        getUserEmail,
        getUsername, // Getter añadido para el nombre de usuario

        // Acciones
        login,
        register,
        logout,
        // setAuthData, // Usualmente una acción interna, no es necesario exponerla
        // initializeAuth // Usualmente solo se llama internamente al crear el store
    };
});
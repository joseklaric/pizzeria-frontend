// src/main.js

import { createApp } from 'vue';
import App from './App.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';
// Importa tu store de autenticación para usarlo en los guardias de navegación
import { useAuthStore } from './stores/authStore'; // <-- Asegúrate de que esta importación exista


// Importa los componentes que serán las "páginas" o vistas
import LoginPage from './components/LoginPage.vue';
import OrderPage from './components/OrderPage.vue';
import OrderDashboardPage from './components/OrderDashboardPage.vue';
import ReportsPage from './components/ReportsPage.vue';
import ProductManagementPage from './components/ProductManagementPage.vue'; // <-- Importa la página de gestión de productos


// 1. Definir las rutas de la aplicación
const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    // meta: { requiresAuth: false }, // Login no requiere autenticación para acceder
  },
  {
    path: '/',
    redirect: '/login', // Redirige la ruta raíz al login por defecto
  },
  {
    path: '/order',
    name: 'order',
    component: OrderPage,
    meta: { requiresAuth: true }, // Esta ruta requiere que el usuario esté autenticado
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: OrderDashboardPage,
    meta: { requiresAuth: true }, // Esta ruta requiere que el usuario esté autenticado
  },
  {
    path: '/reports',
    name: 'reports',
    component: ReportsPage,
    meta: { requiresAuth: true }, // Esta ruta requiere que el usuario esté autenticado
  },
  // --- Ruta para la Gestión de Productos con restricción de Staff ---
  {
    path: '/manage-products',
    name: 'manage-products',
    component: ProductManagementPage,
    meta: {
        requiresAuth: true, // Esta ruta requiere autenticación
        requiresStaff: true // <-- ¡Nuevo metadato! Esta ruta requiere permisos de staff
    },
  },
  // --- Fin Ruta Gestión Productos ---


  // Ruta de fallback para manejar URLs no encontradas (404)
  // {
  //   path: '/:pathMatch(.*)*',
  //   name: 'NotFound',
  //   component: HelloWorld, // Usa un componente 404 real después
  // }
];

// 2. Crear la instancia del Router
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// --- Guarda de navegación global ---
// Se ejecuta antes de cada navegación de ruta
router.beforeEach((to, from, next) => {
  // Obtenemos la instancia del store de autenticación
  const authStore = useAuthStore();

  // 1. Verificar si la ruta requiere autenticación
  if (to.meta.requiresAuth) {
    // Si requiere autenticación Y el usuario NO está autenticado
    if (!authStore.isAuthenticated) {
      console.log(`Navegación bloqueada a ${to.path}: Requiere autenticación.`);
      // Redirige a la página de login
      next('/login');
      return; // Detiene la ejecución de la guarda
    }

    // 2. Si requiere autenticación Y el usuario SÍ está autenticado,
    //    verificar si la ruta requiere permisos de staff
    if (to.meta.requiresStaff) {
        // Si requiere staff Y el usuario NO es staff
        if (!authStore.isStaff) {
            console.log(`Navegación bloqueada a ${to.path}: Requiere permisos de staff.`);
            // Redirige a una página de error de permisos o al dashboard principal
            // Puedes crear una página específica para "Acceso Denegado"
            // Por ahora, redirigimos al dashboard
            next('/dashboard'); // O '/acceso-denegado' si creas esa ruta
            return; // Detiene la ejecución de la guarda
        }
    }

    // Si requiere autenticación (y opcionalmente staff) y el usuario cumple los requisitos, permite la navegación
    console.log(`Navegación permitida a ${to.path}: Autenticado y permisos OK.`);
    next();

  } else {
    // Si la ruta NO requiere autenticación (ej: /login, /about, /)
    // Puedes añadir lógica aquí si quieres redirigir usuarios autenticados del login
    // Por ejemplo, si ya está logueado y va a /login, redirigirlo al dashboard
    if (to.name === 'login' && authStore.isAuthenticated) {
         console.log(`Navegación a ${to.path} bloqueada: Ya autenticado. Redirigiendo a dashboard.`);
         next('/dashboard');
         return;
    }

    // Si no requiere autenticación y no hay otras restricciones, permite la navegación
    console.log(`Navegación permitida a ${to.path}: No requiere autenticación.`);
    next();
  }
});
// --- Fin Guarda de navegación global ---


// 3. Crear la instancia de Pinia
const pinia = createPinia();


// 4. Crear la aplicación Vue
const app = createApp(App);

// 5. Usar el Router y Pinia en la aplicación
app.use(router);
app.use(pinia);


// 6. Montar la aplicación en el elemento con id="app" en tu index.html
app.mount('#app');

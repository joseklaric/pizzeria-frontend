// src/main.js

import { createApp } from 'vue';
import App from './App.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';

// Importa los componentes que serán las "páginas" o vistas
import LoginPage from './components/LoginPage.vue';
import OrderPage from './components/OrderPage.vue';
import OrderDashboardPage from './components/OrderDashboardPage.vue';
// Ya no necesitamos importar PricesPage si solo usamos el modal
// import PricesPage from './components/PricesPage.vue';
import ReportsPage from './components/ReportsPage.vue'; // <-- Necesitaremos este para Reportes


// 1. Definir las rutas de la aplicación
const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    // meta: { requiresAuth: false },
  },
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/order',
    name: 'order',
    component: OrderPage,
    // meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: OrderDashboardPage,
    // meta: { requiresAuth: true },
  },
  // --- Rutas para la barra de navegación ---
  // Eliminamos la ruta /prices ya que usamos un modal global
  // {
  //   path: '/prices', // Ruta para la lista de precios
  //   name: 'prices',
  //   component: PricesPage,
  //   // meta: { requiresAuth: true },
  // },
  {
    path: '/reports', // Ruta para los reportes
    name: 'reports',
    component: ReportsPage, // Usaremos este componente (lo crearemos después)
    // meta: { requiresAuth: true },
  },
  // --- Fin Rutas ---

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

// 3. Crear la instancia de Pinia
const pinia = createPinia();


// 4. Crear la aplicación Vue
const app = createApp(App);

// 5. Usar el Router y Pinia en la aplicación
app.use(router);
app.use(pinia);


// 6. Montar la aplicación en el elemento con id="app" en tu index.html
app.mount('#app');

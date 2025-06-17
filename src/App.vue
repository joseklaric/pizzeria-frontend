<template>
  <div id="app">
    <nav class="navbar print-hidden-navbar">
      <div class="navbar-brand">
        <router-link to="/" class="brand-link">Mi Pizzería</router-link>
      </div>
      <ul class="nav-links">
        <template v-if="authStore.isAuthenticated">
          <li>
            <router-link to="/order" class="nav-link">Toma de Pedidos</router-link>
          </li>
          <li>
            <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
          </li>
          <li v-if="authStore.isStaff"> <router-link to="/products" class="nav-link">Gestionar Productos</router-link>
          </li>
          <li>
            <a href="#" @click.prevent="showPricesModal = true" class="nav-link">Lista de Precios</a>
          </li>
          <li>
            <router-link to="/reports" class="nav-link">Reportes</router-link>
           </li>
        </template>
      </ul>
       <button v-if="authStore.isAuthenticated" @click="handleLogout" class="logout-button-navbar">
            Logout
        </button>
    </nav>

    <router-view/>

    <PricesModal :show="showPricesModal" @close="showPricesModal = false" />

  </div>
</template>

<script setup>
import { ref } from 'vue'; // Importamos ref
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import PricesModal from './components/PricesModal.vue'; // <-- Importamos el nuevo componente modal

const authStore = useAuthStore();
const router = useRouter();

// Estado para controlar la visibilidad del modal de precios
const showPricesModal = ref(false);

// Función para manejar el logout
const handleLogout = () => {
    authStore.logout(); // Llama a la acción de logout del store
    router.push('/login'); // Redirige al usuario a la página de login
};

</script>


<style>
/* Estilos generales para el cuerpo de la página */
body {
  margin: 0;
  font-family: sans-serif;
  background-color: #f4f4f4; /* Un color de fondo suave */
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #333;
}

/* Estilos para la barra de navegación */
.navbar {
  background-color: #343a40; /* Color oscuro para la barra */
  color: white;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between; /* Espacio entre la marca, los enlaces y el botón de logout */
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); /* Sombra sutil */
}

.navbar-brand .brand-link {
  color: white;
  text-decoration: none;
  font-size: 1.5em;
  font-weight: bold;
}

.nav-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex; /* Alinear los enlaces horizontalmente */
  gap: 20px; /* Espacio entre los enlaces */
}

.nav-links li {
  display: inline; /* Asegura que los elementos de la lista estén en línea */
}

.nav-link {
  color: white;
  text-decoration: none;
  font-size: 1.1em;
  padding: 5px 0; /* Padding vertical */
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: #007bff; /* Color al pasar el mouse */
}

/* Estilo para el enlace activo (cuando estás en esa página) */
.nav-link.router-link-active {
  font-weight: bold;
  border-bottom: 2px solid #007bff; /* Indicador de página activa */
}

/* Estilos para el botón de logout en la navbar */
.logout-button-navbar {
    background-color: #dc3545; /* Rojo */
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.3s ease;
    margin-left: 20px; /* Espacio a la izquierda de los enlaces */
}
.logout-button-navbar:hover {
    background-color: #c82333; /* Rojo más oscuro al pasar el mouse */
}


/* Estilos responsivos básicos para la barra de navegación */
@media (max-width: 768px) {
  .navbar {
    flex-direction: column; /* Apilar elementos en pantallas pequeñas */
    align-items: flex-start;
  }

  .nav-links {
    flex-direction: column; /* Apilar enlaces */
    gap: 10px; /* Espacio entre enlaces apilados */
    margin-top: 10px;
    margin-bottom: 10px; /* Añadir margen inferior */
  }

  .logout-button-navbar {
      margin-left: 0; /* Eliminar margen izquierdo en móvil */
      width: 100%; /* Ocupar todo el ancho */
      text-align: center;
      padding: 10px; /* Aumentar padding para facilitar el toque */
  }
}

/* --- NUEVO: Estilo para ocultar la navbar en la impresión --- */
@media print {
    .print-hidden-navbar {
        display: none !important; /* Oculta la barra de navegación en la impresión */
    }
}

</style>

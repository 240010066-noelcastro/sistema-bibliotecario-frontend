import axios from 'axios';

const api = axios.create({
  // Asegúrate de que esta URL apunte al puerto donde corre tu Laravel
  baseURL: 'http://localhost:8000/api', 
});

// Este es el "Interceptor": Se ejecuta automáticamente antes de cada petición a Laravel
api.interceptors.request.use((config) => {
  
  // Le decimos a Laravel: "Pase lo que pase, respóndeme en formato JSON, no me redirijas"
  // (Esto evita muchos errores 500)
  config.headers.Accept = 'application/json'; 

  // Buscamos la "Pulsera VIP" (el token) guardada en el navegador
  const token = localStorage.getItem('token'); 
  
  if (token) {
    // Si la tenemos, la adjuntamos como pase de seguridad
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

export default api;
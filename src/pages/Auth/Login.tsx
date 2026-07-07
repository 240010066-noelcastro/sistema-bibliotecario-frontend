import React, { useState, useEffect } from 'react';
import { IonContent, IonPage, IonIcon } from '@ionic/react';
import { lockClosedOutline, mailOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'; 
// @ts-ignore
import api from '../../services/api';
import './Login.css';

const Login: React.FC = () => {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Redirección si ya hay sesión iniciada
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const rol = sessionStorage.getItem('rol');
    if (token) {
      if (rol === 'admin') window.location.href = '/dashboard';
      else window.location.href = '/portal';
    }
  }, []);

  // 1. LOGIN CON CORREO Y CONTRASEÑA (Principalmente Admins)
  const handleLoginManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!correo || !password) {
      return setErrorMsg('Por favor, ingresa tu correo y contraseña.');
    }

    setLoading(true);
    try {
      const response = await api.post('/login', { correo, password });
      
      if (response.data.success) {
        sessionStorage.setItem('token', response.data.token);
        sessionStorage.setItem('usuario', JSON.stringify(response.data.usuario));
        sessionStorage.setItem('rol', response.data.rol); 
        
        if (response.data.rol === 'admin') {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/portal';
        }
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Error de conexión con el servidor.');
      }
      setLoading(false);
    } 
  };

  // 2. LOGIN CON GOOGLE (Alumnos) - CORREGIDO PARA SEPARAR APELLIDOS Y DAR FORMATO Nombre Propio
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setErrorMsg('');
    setLoading(true);

    try {
      const token = credentialResponse.credential;
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // FUNCIÓN AUXILIAR: Convierte textos en mayúsculas a Formato Propio (Ej: NOEL EDUARDO -> Noel Eduardo)
      const formatTitleCase = (str: string) => {
        return str
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };

      // Separamos los apellidos que Google manda juntos en family_name
      const apellidosCompletos = (payload.family_name || '').trim().split(' ');
      const primerApellido = apellidosCompletos[0] || '';
      const segundoApellido = apellidosCompletos.slice(1).join(' ') || '';

      // Mapeamos los datos aplicando el formateador de mayúsculas/minúsculas
      const datosEstudiante = {
        correo: payload.email,
        nombre: formatTitleCase(payload.given_name || payload.name || ''),
        apellido_paterno: formatTitleCase(primerApellido),
        apellido_materno: formatTitleCase(segundoApellido)
      };

      const response = await api.post('/login-google', datosEstudiante);

      if (response.data.success) {
        if (response.data.es_nuevo) {
          sessionStorage.setItem('datos_google_temporales', JSON.stringify(response.data.datos_google));
          window.location.href = '/completar-registro'; 
        } else {
          sessionStorage.setItem('token', response.data.token);
          sessionStorage.setItem('usuario', JSON.stringify(response.data.usuario));
          sessionStorage.setItem('rol', 'usuario'); 
          window.location.href = '/portal'; 
        }
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Error al autenticar con Google Workspace.');
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId="996518638404-ko9ds937m5lnt72eubph72ri1kc1rq7a.apps.googleusercontent.com">
      <IonPage>
        <IonContent className="unified-login-bg">
          <div className="unified-container">
            <div className="logo-container">
              <img src="/assets/UPVE_Logo.png" alt="Logo UPVE" className="logo" />
            </div>

            <div className="unified-grid">
              <div className="unified-left">
                <h1 className="main-title">Biblioteca Universitaria</h1>
                <p className="main-description">
                  Bienvenido al Sistema de Gestión Bibliotecaria. Un espacio digital diseñado para facilitar el acceso a la información y apoyar el desarrollo académico de nuestra comunidad.
                </p>
              </div>

              <div className="unified-right">
                <div className="form-wrapper">
                  <h2 className="form-title">Iniciar Sesión</h2>
                  <p className="form-subtitle">Ingresa con tus credenciales o cuenta institucional.</p>

                  {errorMsg && <div className="error-alert">{errorMsg}</div>}

                  <form onSubmit={handleLoginManual}>
                    {/* CAMPO: CORREO */}
                    <div className="admin-input-group">
                      <label>Correo Electrónico</label>
                      <div className="admin-input-with-icon">
                        <IonIcon icon={mailOutline} className="admin-input-icon" />
                        <input 
                          type="email" 
                          value={correo}
                          onChange={(e) => setCorreo(e.target.value)}
                          placeholder="ejemplo@upve.edu.mx"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* CAMPO: CONTRASEÑA */}
                    <div className="admin-input-group">
                      <label>Contraseña</label>
                      <div className="admin-input-with-icon">
                        <IonIcon icon={lockClosedOutline} className="admin-input-icon" />
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{ paddingRight: '45px' }}
                          placeholder="Tu contraseña"
                          disabled={loading}
                        />
                        <IonIcon 
                          icon={showPassword ? eyeOutline : eyeOffOutline} 
                          className="admin-password-toggle" 
                          onClick={() => setShowPassword(!showPassword)}
                        />
                      </div>
                    </div>

                    {/* ENLACE DE RECUPERACIÓN UBICADO CORRECTAMENTE AQUÍ */}
                    <div style={{ textAlign: 'right', marginTop: '-5px', marginBottom: '15px' }}>
                       <a 
                        href="/olvide-password" 
                        style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                       >
                         ¿Olvidaste tu contraseña?
                       </a>
                    </div>

                    <button type="submit" className="btn-admin-submit" disabled={loading}>
                      {loading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
                    </button>
                  </form>

                  <div className="login-divider">
                    <span>O continuar con</span>
                  </div>

                  <div className="google-btn-box">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setErrorMsg('Error de conexión con Google.')}
                      theme="outline"
                      size="large"
                      text="signin_with"
                      width="360"
                    />
                  </div>

                </div>
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    </GoogleOAuthProvider>
  );
};

export default Login;
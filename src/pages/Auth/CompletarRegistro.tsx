import React, { useState, useEffect } from 'react';
import { IonContent, IonPage, IonLoading, IonIcon } from '@ionic/react';
import { libraryOutline, cardOutline, callOutline, peopleOutline, arrowBackOutline, lockClosedOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
// @ts-ignore
import api from '../../services/api';
import './CompletarRegistro.css'; 

const CompletarRegistro: React.FC = () => {
  const [matricula, setMatricula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [grupoId, setGrupoId] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [datosGoogle, setDatosGoogle] = useState<any>(null);
  
  const [grupos, setGrupos] = useState<any[]>([]); 

  useEffect(() => {
    const guardados = sessionStorage.getItem('datos_google_temporales');
    if (guardados) {
      setDatosGoogle(JSON.parse(guardados));
      cargarGrupos(); 
    } else {
      window.location.href = '/'; 
    }
  }, []);

  const cargarGrupos = async () => {
    try {
      const response = await api.get('/grupos?all=true');
      const lista = Array.isArray(response.data?.data) ? response.data.data : [];
      setGrupos(lista);
    } catch (error) {
      console.error("No se pudieron cargar los grupos", error);
      setErrorMsg('Hubo un problema al cargar la lista de grupos.');
    }
  };

  // FUNCIÓN NUEVA: Filtra para que SOLO acepte números y un MÁXIMO de 10 dígitos
  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soloNumeros = e.target.value.replace(/\D/g, ''); // Elimina todo lo que no sea número
    if (soloNumeros.length <= 10) {
      setTelefono(soloNumeros);
    }
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!matricula || !telefono || !grupoId || !password) {
      return setErrorMsg('Por favor, completa todos los campos.');
    }

    if (telefono.length !== 10) {
      return setErrorMsg('El número de teléfono debe tener exactamente 10 dígitos.');
    }

    setLoading(true);
    try {
      const payload = {
        ...datosGoogle,
        matricula,
        telefono,
        grupo_id: grupoId,
        password 
      };

      const response = await api.post('/completar-registro', payload);

      if (response.data.success) {
        sessionStorage.removeItem('datos_google_temporales');
        sessionStorage.setItem('token', response.data.token);
        sessionStorage.setItem('usuario', JSON.stringify(response.data.usuario));
        sessionStorage.setItem('rol', 'usuario'); 
        window.location.href = '/portal'; 
      }
    } catch (error: any) {
      console.error(error);
      
      // FILTRO DE ERRORES INTELIGENTE: Evita que salgan textos de código o base de datos
      if (error.response?.data?.errors) {
        // Por si Laravel regresa errores de validación del Request estructurados
        const primerError: any = Object.values(error.response.data.errors)[0];
        setErrorMsg(Array.isArray(primerError) ? primerError[0] : 'Datos inválidos.');
      } else if (error.response?.data?.message) {
        const mensajeServidor = error.response.data.message;
        
        // Si el mensaje contiene palabras raras de base de datos como SQLSTATE o Truncated, lo ocultamos
        if (mensajeServidor.includes('SQLSTATE') || mensajeServidor.includes('truncated') || mensajeServidor.includes('database')) {
          setErrorMsg('Error interno en el servidor. Por favor, asegúrate de que los datos tengan el formato correcto.');
        } else {
          setErrorMsg(mensajeServidor);
        }
      } else {
        setErrorMsg('Error de conexión o problema interno en el servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelarRegistro = () => {
    sessionStorage.removeItem('datos_google_temporales');
    window.location.href = '/';
  };

  if (!datosGoogle) return null; 

  return (
    <IonPage>
      <IonContent className="registro-bg" fullscreen>
        
        <button className="btn-back-corner" onClick={cancelarRegistro} disabled={loading}>
          <IonIcon icon={arrowBackOutline} /> Volver al Login
        </button>

        <div className="registro-container">
          
          <div className="registro-left-panel">
            <div className="registro-branding">
              <div className="registro-icon">
                <IonIcon icon={libraryOutline} />
              </div>
              <h1>¡Casi listo!</h1>
              <p>Solo necesitamos tu matrícula, teléfono y grupo para vincular tu cuenta institucional al sistema de la biblioteca.</p>
            </div>
          </div>

          <div className="registro-right-panel">
            <div className="registro-form-box">
              
              <div className="mobile-branding">
                <IonIcon icon={libraryOutline} className="mobile-icon" />
                <h2>UPVE Biblioteca</h2>
              </div>

              <h2 className="registro-title">Completa tu perfil</h2>
              <p className="registro-subtitle">Hola, {datosGoogle.nombre}. Ingresa tus datos escolares.</p>

              {errorMsg && <div className="registro-alert">{errorMsg}</div>}

              <form onSubmit={handleRegistro}>
                
                <div className="registro-input-group">
                  <label>Matrícula</label>
                  <div className="registro-input-wrapper">
                    <IonIcon icon={cardOutline} className="registro-field-icon" />
                    <input 
                      type="text" 
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      placeholder="Ej. 10203040"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="registro-input-group">
                  <label>Teléfono</label>
                  <div className="registro-input-wrapper">
                    <IonIcon icon={callOutline} className="registro-field-icon" />
                    <input 
                      type="text"  /* Cambiado a text para mejorar el control del formateo en vivo */
                      value={telefono}
                      onChange={handleTelefonoChange} /* <--- Usamos la nueva función controlada */
                      placeholder="A 10 dígitos"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="registro-input-group">
                  <label>Grupo</label>
                  <div className="registro-input-wrapper">
                    <IonIcon icon={peopleOutline} className="registro-field-icon" />
                    <select 
                      value={grupoId}
                      onChange={(e) => setGrupoId(e.target.value)}
                      required
                      disabled={loading}
                    >
                      <option value="" disabled>Selecciona tu grupo...</option>
                      {grupos.map((grupo: any) => (
                        <option key={grupo.Grupo_ID || grupo.id} value={grupo.Grupo_ID || grupo.id}>
                          {grupo.NombreGrupo || grupo.Nombre || grupo.nombre || `Grupo ${grupo.Grupo_ID || grupo.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="registro-input-group">
                  <label>Contraseña</label>
                  <div className="registro-input-wrapper">
                    <IonIcon icon={lockClosedOutline} className="registro-field-icon" />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Crea tu contraseña"
                      style={{ paddingRight: '45px' }}
                      disabled={loading}
                    />
                    <IonIcon 
                      icon={showPassword ? eyeOutline : eyeOffOutline} 
                      className="registro-password-toggle" 
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-registro-submit" disabled={loading}>
                  {loading ? 'Finalizando Registro...' : 'Finalizar Registro'}
                </button>
              </form>

              <button className="btn-back-mobile" onClick={cancelarRegistro} disabled={loading}>
                <IonIcon icon={arrowBackOutline} /> Cancelar y volver
              </button>

            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CompletarRegistro;
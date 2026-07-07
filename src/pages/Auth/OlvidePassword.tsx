import React, { useState } from 'react';
import { IonContent, IonPage, IonIcon } from '@ionic/react';
import { mailOutline, arrowBackOutline } from 'ionicons/icons';
// @ts-ignore
import api from '../../services/api';
import './CompletarRegistro.css'; // Reutilizamos los estilos del cristal

const OlvidePassword: React.FC = () => {
  const [correo, setCorreo] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageMsg, setMessageMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setMessageMsg('');

    if (!correo) return setErrorMsg('Por favor, ingresa tu correo electrónico.');

    setLoading(true);
    try {
      const response = await api.post('/solicitar-recuperacion', { correo });
      if (response.data.success) {
        setMessageMsg(response.data.message);
        setCorreo('');
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="registro-bg" fullscreen>
        <button className="btn-back-corner" onClick={() => window.location.href = '/'} disabled={loading}>
          <IonIcon icon={arrowBackOutline} /> Volver al Login
        </button>

        <div className="registro-container">
          <div className="registro-right-panel" style={{ maxWidth: '460px', margin: '0 auto' }}>
            <h2 className="registro-title">Recuperar Acceso</h2>
            <p className="registro-subtitle">Ingresa tu correo electrónico registrado y te enviaremos un enlace para restablecer tu contraseña.</p>

            {errorMsg && <div className="registro-alert" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>{errorMsg}</div>}
            {messageMsg && <div className="registro-alert" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#86efac', borderColor: 'rgba(34, 197, 94, 0.3)' }}>{messageMsg}</div>}

            <form onSubmit={handleSolicitud}>
              <div className="registro-input-group">
                <label>Correo Electrónico</label>
                <div className="registro-input-wrapper">
                  <IonIcon icon={mailOutline} className="registro-field-icon" />
                  <input 
                    type="email" 
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="ejemplo@upve.edu.mx"
                    disabled={loading}
                  />
                </div>
              </div>

              <button type="submit" className="btn-registro-submit" disabled={loading}>
                {loading ? 'Enviando Enlace...' : 'Enviar Enlace de Recuperación'}
              </button>
            </form>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OlvidePassword;
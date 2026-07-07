import React, { useState, useEffect } from 'react';
import { IonContent, IonPage, IonIcon } from '@ionic/react';
import { lockClosedOutline, eyeOutline, eyeOffOutline, arrowBackOutline } from 'ionicons/icons';
// @ts-ignore
import api from '../../services/api';
import './CompletarRegistro.css';

const RestablecerPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState('');
  const [correo, setCorreo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Extraemos los parámetros seguros que mandó Laravel en el correo
    const queryParams = new URLSearchParams(window.location.search);
    const tokenUrl = queryParams.get('token');
    const correoUrl = queryParams.get('correo');

    if (tokenUrl && correoUrl) {
      setToken(tokenUrl);
      setCorreo(correoUrl);
    } else {
      setErrorMsg('Faltan parámetros de seguridad. El enlace es inválido.');
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!password) return setErrorMsg('Por favor, escribe tu nueva contraseña.');
    if (password.length < 6) return setErrorMsg('La contraseña debe tener al menos 6 caracteres.');

    setLoading(true);
    try {
      const response = await api.post('/restablecer-password', {
        token,
        correo,
        password
      });

      if (response.data.success) {
        setSuccessMsg(response.data.message);
        setTimeout(() => {
          window.location.href = '/'; // Redirige al Login tras 3 segundos
        }, 3000);
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Error al intentar actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="registro-bg" fullscreen>
        <button className="btn-back-corner" onClick={() => window.location.href = '/'} disabled={loading}>
          <IonIcon icon={arrowBackOutline} /> Ir al Login
        </button>

        <div className="registro-container">
          <div className="registro-right-panel" style={{ maxWidth: '440px', margin: '0 auto' }}>
            <h2 className="registro-title">Nueva Contraseña</h2>
            <p className="registro-subtitle">Escribe la nueva contraseña de acceso para tu cuenta vinculada.</p>

            {errorMsg && <div className="registro-alert" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>{errorMsg}</div>}
            {successMsg && <div className="registro-alert" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#86efac', borderColor: 'rgba(34, 197, 94, 0.3)' }}>{successMsg} ¡Redirigiendo al login!</div>}

            <form onSubmit={handleReset}>
              <div className="registro-input-group">
                <label>Nueva Contraseña</label>
                <div className="registro-input-wrapper">
                  <IonIcon icon={lockClosedOutline} className="registro-field-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ paddingRight: '45px' }}
                    disabled={loading || !!successMsg || !token}
                  />
                  <IonIcon 
                    icon={showPassword ? eyeOutline : eyeOffOutline} 
                    className="registro-password-toggle" 
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </div>
              </div>

              <button type="submit" className="btn-registro-submit" disabled={loading || !!successMsg || !token}>
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RestablecerPassword;
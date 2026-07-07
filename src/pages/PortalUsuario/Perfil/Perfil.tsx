import React, { useEffect, useState } from 'react';
import { IonContent, IonPage, IonIcon, IonList, IonItem, IonLabel, IonButton, IonInput, IonSelect, IonSelectOption, IonToast } from '@ionic/react';
import { personOutline, mailOutline, cardOutline, callOutline, shieldCheckmarkOutline, schoolOutline, peopleOutline, cameraOutline, pencilOutline, saveOutline, closeOutline } from 'ionicons/icons';
// @ts-ignore
import api from '../../../services/api';
import './Perfil.css';

const Perfil: React.FC = () => {
  const [usuario, setUsuario] = useState<any>(null);
  const [grupos, setGrupos] = useState<any[]>([]);
  
  // Estados de edición
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [telefono, setTelefono] = useState<string>('');
  const [grupoId, setGrupoId] = useState<number>(0);
  
  // Estados de imagen
  const [fotoPerfil, setFotoPerfil] = useState<string>('');
  const [tempFoto, setTempFoto] = useState<string>(''); 

  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    cargarDatosLocales();
    obtenerGruposDeMiCarrera();
  }, []);

  const cargarDatosLocales = () => {
    const userData = sessionStorage.getItem('usuario');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUsuario(userObj);
      setTelefono(userObj.Telefono || '');
      setGrupoId(userObj.Grupo_ID || 0);
      setFotoPerfil(userObj.FotoPerfil || '');
      setTempFoto(userObj.FotoPerfil || '');
    }
  };

  const obtenerGruposDeMiCarrera = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await api.get('/usuario/grupos-carrera', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setGrupos(response.data);
      }
    } catch (error) {
      // Manejo silencioso seguro para producción
    }
  };

  const handleSeleccionarFotoLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setTempFoto(reader.result as string); 
    };
    reader.readAsDataURL(file);
  };

  const handleCerrarSesion = () => {
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const handleGuardarCambios = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await api.put('/usuario/update-perfil', {
        telefono: telefono,
        grupo_id: grupoId,
        foto: tempFoto
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        sessionStorage.setItem('usuario', JSON.stringify(response.data.usuario));
        setUsuario(response.data.usuario);
        setFotoPerfil(tempFoto);
        setIsEditing(false);
        setToastMessage('¡Tus datos y foto se han guardado con éxito!');
        setShowToast(true);
      }
    } catch (error: any) {
      setToastMessage('Error al guardar los cambios en el servidor.');
      setShowToast(true);
    }
  };

  const handleCancelarEdicion = () => {
    setIsEditing(false);
    cargarDatosLocales();
  };

  return (
    <IonPage>
      <IonContent className="portal-bg" fullscreen>
        
        {/* CABECERA CON FOTO GRANDE (150PX) */}
        <div className="perfil-header-banner">
          <div className="avatar-overlap-container">
            <div className={`avatar-wrapper ${isEditing ? 'avatar-editable-active' : ''}`}>
              {tempFoto ? (
                <img src={tempFoto} alt="Perfil" className="avatar-img-real" />
              ) : (
                <div className="avatar-letters">
                  {usuario ? usuario.NombreUsuario.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              
              {isEditing && (
                <label htmlFor="avatar-file-input" className="avatar-edit-overlay">
                  <IonIcon icon={cameraOutline} />
                </label>
              )}
              
              <input 
                type="file" 
                id="avatar-file-input" 
                accept="image/*" 
                onChange={handleSeleccionarFotoLocal} 
                disabled={!isEditing}
                style={{ display: 'none' }} 
              />
            </div>
            
            <h2 className="user-profile-name">
              {usuario ? `${usuario.NombreUsuario} ${usuario.ApellidoPaterno || ''}` : 'Cargando...'}
            </h2>
          </div>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="perfil-main-content">
          <h3 className="section-title-perfil">Información de la Cuenta</h3>
          
          <IonList lines="none" className="perfil-info-list">
            <IonItem className="perfil-info-item disabled-field">
              <div className="perfil-icon-box">
                <IonIcon icon={personOutline} />
              </div>
              <IonLabel>
                <p>Nombre Completo</p>
                <h4>{usuario ? `${usuario.NombreUsuario} ${usuario.ApellidoPaterno || ''} ${usuario.ApellidoMaterno || ''}` : '---'}</h4>
              </IonLabel>
            </IonItem>

            <IonItem className="perfil-info-item disabled-field">
              <div className="perfil-icon-box">
                <IonIcon icon={mailOutline} />
              </div>
              <IonLabel>
                <p>Correo Institucional</p>
                <h4>{usuario ? usuario.CorreoElectronico : '---'}</h4>
              </IonLabel>
            </IonItem>

            <IonItem className="perfil-info-item disabled-field">
              <div className="perfil-icon-box">
                <IonIcon icon={cardOutline} />
              </div>
              <IonLabel>
                <p>Identificación (Matrícula / Num. Empleado)</p>
                <h4>{usuario ? usuario.Matricula || usuario.NumEmpleado : '---'}</h4>
              </IonLabel>
            </IonItem>

            <IonItem className={`perfil-info-item ${isEditing ? 'editable-active' : ''}`}>
              <div className="perfil-icon-box">
                <IonIcon icon={callOutline} />
              </div>
              <IonLabel className="ion-no-margin w-100">
                <p>Teléfono de Contacto</p>
                {isEditing ? (
                  <IonInput 
                    value={telefono} 
                    type="tel" 
                    onIonInput={(e: any) => setTelefono(e.detail.value!)}
                    className="custom-profile-input"
                  />
                ) : (
                  <h4>{usuario?.Telefono || 'No registrado'}</h4>
                )}
              </IonLabel>
            </IonItem>

            {/* CARRERA */}
            <IonItem className="perfil-info-item disabled-field">
              <div className="perfil-icon-box">
                <IonIcon icon={schoolOutline} />
              </div>
              <IonLabel>
                <p>Carrera / División</p>
                <h4>{usuario?.grupo?.carrera?.NombreCarrera || 'Ingeniería en Tecnologías de la Información'}</h4>
              </IonLabel>
            </IonItem>

            {/* GRUPO ASIGNADO (ESTRICTAMENTE ABAJO DE CARRERA) */}
            <IonItem className={`perfil-info-item ${isEditing ? 'editable-active' : ''}`}>
              <div className="perfil-icon-box">
                <IonIcon icon={peopleOutline} />
              </div>
              <IonLabel className="ion-no-margin w-100">
                <p>Grupo Asignado</p>
                {isEditing ? (
                  <IonSelect 
                    value={grupoId} 
                    onIonChange={(e: any) => setGrupoId(e.detail.value)}
                    interface="popover"
                    className="custom-profile-select"
                  >
                    {grupos.map((g: any) => (
                      <IonSelectOption key={g.Grupo_ID} value={g.Grupo_ID}>
                        {g.NombreGrupo || g.Nombre || `ID: ${g.Grupo_ID}`}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                ) : (
                  <h4>{usuario?.grupo?.NombreGrupo || 'Sin grupo asignado'}</h4>
                )}
              </IonLabel>
            </IonItem>

            <IonItem className="perfil-info-item disabled-field">
              <div className="perfil-icon-box">
                <IonIcon icon={shieldCheckmarkOutline} />
              </div>
              <IonLabel>
                <p>Estado de la Cuenta</p>
                <h4 className="status-active-text">{usuario?.EstadoCuenta || 'Activo'}</h4>
              </IonLabel>
            </IonItem>
          </IonList>

          {/* BOTONERA PREMIUM AL FONDO */}
          <div className="profile-footer-actions">
            {!isEditing ? (
              <button className="action-profile-btn edit-trigger-btn" onClick={() => setIsEditing(true)}>
                <IonIcon icon={pencilOutline} style={{ marginRight: '8px', fontSize: '18px' }} />
                Editar Información
              </button>
            ) : (
              <div className="editing-buttons-flex">
                <button className="action-profile-btn cancel-trigger-btn" onClick={handleCancelarEdicion}>
                  <IonIcon icon={closeOutline} style={{ marginRight: '6px', fontSize: '18px' }} />
                  Cancelar
                </button>
                <button className="action-profile-btn save-trigger-btn" onClick={handleGuardarCambios}>
                  <IonIcon icon={saveOutline} style={{ marginRight: '6px', fontSize: '18px' }} />
                  Guardar Cambios
                </button>
              </div>
            )}

            <button className="flat-logout-btn" onClick={handleCerrarSesion}>
              Cerrar Sesión
            </button>
          </div>

        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />

      </IonContent>
    </IonPage>
  );
};

export default Perfil;
import React, { useState, useRef } from 'react';
import { IonContent, IonPage, IonIcon, useIonViewWillEnter, IonButton } from '@ionic/react';
import { settingsOutline, checkmarkCircleOutline, warningOutline, documentTextOutline, saveOutline, createOutline, closeOutline } from 'ionicons/icons';
// @ts-ignore
import api from '../../services/api'; 
import './Configuracion.css'; 

const Configuracion: React.FC = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // ESTADOS DE LOS TEXTOS SEPARADOS
  const [mensajeLibro, setMensajeLibro] = useState('');
  const [mensajeRevista, setMensajeRevista] = useState('');
  const [mensajeEnciclopedia, setMensajeEnciclopedia] = useState('');
  const [mensajeTesis, setMensajeTesis] = useState('');

  // ESTADOS DE EDICIÓN INDIVIDUALES
  const [editLibro, setEditLibro] = useState(false);
  const [editRevista, setEditRevista] = useState(false);
  const [editEnciclopedia, setEditEnciclopedia] = useState(false);
  const [editTesis, setEditTesis] = useState(false);

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useIonViewWillEnter(() => {
    const loadConfiguraciones = async () => {
      setIsInitialLoading(true);
      
      // Siempre entran bloqueados
      setEditLibro(false);
      setEditRevista(false);
      setEditEnciclopedia(false);
      setEditTesis(false);

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      try {
        const res: any = await api.get('/configuraciones/Catalogo', {
            signal: abortControllerRef.current.signal
        });
        
        const data = res.data?.data || {};
        
        setMensajeLibro(data.mensaje_legal_libro || 'La Universidad Politécnica del Valle del Évora (UPVE) se deslinda de los derechos de autor de este libro. El enlace redirige a una plataforma externa y comercial.');
        setMensajeRevista(data.mensaje_legal_revista || 'La UPVE no posee los derechos de propiedad intelectual de este artículo o revista. El enlace proporcionado es responsabilidad del sitio web destino.');
        setMensajeEnciclopedia(data.mensaje_legal_enciclopedia || 'La UPVE se deslinda de la autoría y derechos de esta enciclopedia o diccionario. La consulta se realiza en una plataforma ajena a la institución.');
        setMensajeTesis(data.mensaje_legal_tesis || 'El repositorio institucional de la UPVE autoriza el alojamiento local y la consulta de este archivo académico para fines educativos y de investigación.');
        
      } catch (err: any) {
        if (err.name !== 'CanceledError' && err.message !== 'canceled') {
          console.error("Error al cargar configuraciones:", err);
          showToast("Error al cargar las configuraciones", "danger");
        }
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    loadConfiguraciones();
  });

  const saveConfig = async () => {
    if (!mensajeLibro.trim() || !mensajeRevista.trim() || !mensajeEnciclopedia.trim() || !mensajeTesis.trim()) {
      return showToast("Ningún mensaje legal puede quedar en blanco.", "danger");
    }

    setIsProcessing(true);
    try {
      await api.post('/configuraciones', { Modulo: 'Catalogo', Clave: 'mensaje_legal_libro', Valor: mensajeLibro });
      await api.post('/configuraciones', { Modulo: 'Catalogo', Clave: 'mensaje_legal_revista', Valor: mensajeRevista });
      await api.post('/configuraciones', { Modulo: 'Catalogo', Clave: 'mensaje_legal_enciclopedia', Valor: mensajeEnciclopedia });
      await api.post('/configuraciones', { Modulo: 'Catalogo', Clave: 'mensaje_legal_tesis', Valor: mensajeTesis });

      showToast("¡Configuraciones guardadas exitosamente!", "success");
      
      // Volvemos a bloquear todos los formularios al guardar
      setEditLibro(false);
      setEditRevista(false);
      setEditEnciclopedia(false);
      setEditTesis(false);
    } catch (error) {
      console.error(error);
      showToast("Error al guardar los cambios en el servidor.", "danger");
    } finally {
      setIsProcessing(false);
    }
  };

  // Verifica si hay al menos un campo en edición para mostrar el botón de Guardar
  const isAnyEditing = editLibro || editRevista || editEnciclopedia || editTesis;

  return (
    <IonPage>
      {(isInitialLoading || isProcessing) && (
          <div className="main-loader-overlay">
              <div className="main-loader-spinner"></div>
              <p>{isInitialLoading ? 'Cargando configuraciones...' : 'Guardando cambios...'}</p>
          </div>
      )}

      <IonContent className="config-bg" style={{ position: 'relative' }}>
        
        <div className={`toast-notification ${toast.show ? 'show' : ''} ${toast.type}`}>
            <IonIcon icon={toast.type === 'success' ? checkmarkCircleOutline : warningOutline} />
            <span>{toast.message}</span>
        </div>

        <div className="config-layout">
          
          <div className="main-top-header">
            <div>
              <h1>
                <IonIcon icon={settingsOutline} className="header-icon" /> Ajustes y Configuración
              </h1>
              <p>Administración de textos legales y avisos del sistema.</p>
            </div>
          </div>

          <div className="config-form-card">
            <div className="config-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IonIcon icon={documentTextOutline} className="section-icon" />
                  <h3>Textos Legales del Catálogo</h3>
                </div>
            </div>
            
            <p className="config-description">
              Modifica los mensajes de advertencia y derechos de autor que se muestran al registrar recursos bibliográficos o tesis institucionales.
            </p>

            {/* SECCIÓN LIBROS */}
            <div className="form-row" style={{ marginTop: '20px' }}>
              <div className="form-group flex-1">
                <div className="field-header">
                  <label>AVISO PARA LIBROS *</label>
                  <IonButton fill="clear" className="btn-edit-toggle-small" onClick={() => setEditLibro(!editLibro)} title={editLibro ? "Cancelar edición" : "Editar texto"}>
                    <IonIcon icon={editLibro ? closeOutline : createOutline} style={{ color: editLibro ? '#ef4444' : '#7c3aed' }} />
                  </IonButton>
                </div>
                <textarea 
                  className="custom-textarea" 
                  rows={2}
                  value={mensajeLibro} 
                  onChange={e => setMensajeLibro(e.target.value)} 
                  disabled={!editLibro}
                />
              </div>
            </div>

            {/* SECCIÓN REVISTAS */}
            <div className="form-row" style={{ marginTop: '20px' }}>
              <div className="form-group flex-1">
                <div className="field-header">
                  <label>AVISO PARA REVISTAS Y ARTÍCULOS *</label>
                  <IonButton fill="clear" className="btn-edit-toggle-small" onClick={() => setEditRevista(!editRevista)} title={editRevista ? "Cancelar edición" : "Editar texto"}>
                    <IonIcon icon={editRevista ? closeOutline : createOutline} style={{ color: editRevista ? '#ef4444' : '#7c3aed' }} />
                  </IonButton>
                </div>
                <textarea 
                  className="custom-textarea" 
                  rows={2}
                  value={mensajeRevista} 
                  onChange={e => setMensajeRevista(e.target.value)} 
                  disabled={!editRevista}
                />
              </div>
            </div>

            {/* SECCIÓN ENCICLOPEDIAS */}
            <div className="form-row" style={{ marginTop: '20px' }}>
              <div className="form-group flex-1">
                <div className="field-header">
                  <label>AVISO PARA ENCICLOPEDIAS Y DICCIONARIOS *</label>
                  <IonButton fill="clear" className="btn-edit-toggle-small" onClick={() => setEditEnciclopedia(!editEnciclopedia)} title={editEnciclopedia ? "Cancelar edición" : "Editar texto"}>
                    <IonIcon icon={editEnciclopedia ? closeOutline : createOutline} style={{ color: editEnciclopedia ? '#ef4444' : '#7c3aed' }} />
                  </IonButton>
                </div>
                <textarea 
                  className="custom-textarea" 
                  rows={2}
                  value={mensajeEnciclopedia} 
                  onChange={e => setMensajeEnciclopedia(e.target.value)} 
                  disabled={!editEnciclopedia}
                />
              </div>
            </div>

            {/* SECCIÓN TESIS */}
            <div className="form-row" style={{ marginTop: '20px' }}>
              <div className="form-group flex-1">
                <div className="field-header">
                  <label>AUTORIZACIÓN INSTITUCIONAL PARA TESIS (ARCHIVOS LOCALES) *</label>
                  <IonButton fill="clear" className="btn-edit-toggle-small" onClick={() => setEditTesis(!editTesis)} title={editTesis ? "Cancelar edición" : "Editar texto"}>
                    <IonIcon icon={editTesis ? closeOutline : createOutline} style={{ color: editTesis ? '#ef4444' : '#7c3aed' }} />
                  </IonButton>
                </div>
                <textarea 
                  className="custom-textarea" 
                  rows={2}
                  value={mensajeTesis} 
                  onChange={e => setMensajeTesis(e.target.value)} 
                  disabled={!editTesis}
                />
              </div>
            </div>

            {/* EL BOTÓN DE GUARDAR SOLO APARECE SI HAY ALGÚN CAMPO EN EDICIÓN */}
            {isAnyEditing && (
              <div className="form-row" style={{ marginTop: '25px', justifyContent: 'flex-end' }}>
                <button className="btn-guardar-inline" onClick={saveConfig} disabled={isProcessing || isInitialLoading}>
                  <IonIcon icon={saveOutline} style={{ marginRight: '8px', fontSize: '18px', verticalAlign: 'middle' }}/> 
                  GUARDAR CAMBIOS
                </button>
              </div>
            )}

          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Configuracion;
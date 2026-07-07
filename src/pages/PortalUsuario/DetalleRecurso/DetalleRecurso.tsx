import React, { useEffect, useState } from 'react';
import { IonContent, IonPage, IonIcon } from '@ionic/react';
import { useParams } from 'react-router-dom';
import { arrowBackOutline, bookOutline, schoolOutline, newspaperOutline, libraryOutline, warningOutline, documentTextOutline, checkmarkCircleOutline, bookmarkOutline, informationCircleOutline, clipboardOutline } from 'ionicons/icons';
// @ts-ignore
import api from '../../../services/api';
import './DetalleRecurso.css';

const DetalleRecurso: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [recurso, setRecurso] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState({ show: false, message: '' });
  
  const [textosLegalesGlobales, setTextosLegalesGlobales] = useState({
    libro: '', revista: '', enciclopedia: '', tesis: ''
  });

  const [avisoModal, setAvisoModal] = useState({ show: false, mensaje: '', url: '', isPdf: false });

  useEffect(() => {
    const cargarDatosFicha = async () => {
      try {
        const token = sessionStorage.getItem('token');
        
        // Carga paralela optimizada para velocidad extrema
        const [resRecurso, resConfig] = await Promise.all([
          api.get(`/usuario/recurso/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/configuraciones/Catalogo', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (resConfig.data?.success) {
          const configData = resConfig.data.data || {};
          setTextosLegalesGlobales({
            libro: configData.mensaje_legal_libro || '',
            revista: configData.mensaje_legal_revista || '',
            enciclopedia: configData.mensaje_legal_enciclopedia || '',
            tesis: configData.mensaje_legal_tesis || ''
          });
        }

        if (resRecurso.data?.success) {
          setRecurso(resRecurso.data.data);
        }
      } catch (err) {
        setToast({ show: true, message: 'Error al conectar con el repositorio de la biblioteca.' });
      } finally {
        setLoading(false);
      }
    };
    cargarDatosFicha();
  }, [id]);

  const handleOpenLink = (e: any, url: string, mensajeLegal: string, isPdf: boolean = false) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    let mensajeFinal = mensajeLegal ? String(mensajeLegal).trim() : '';

    if (mensajeFinal === '') {
      if (recurso.TipoRecurso === 'Libro') mensajeFinal = textosLegalesGlobales.libro;
      else if (recurso.TipoRecurso === 'Revista / Artículo Científico') mensajeFinal = textosLegalesGlobales.revista;
      else if (recurso.TipoRecurso === 'Enciclopedia / Diccionario') mensajeFinal = textosLegalesGlobales.enciclopedia;
      else if (recurso.TipoRecurso === 'Tesis') mensajeFinal = textosLegalesGlobales.tesis;
    }

    if (mensajeFinal !== '') {
      setAvisoModal({ show: true, mensaje: mensajeFinal, url: url || '', isPdf: isPdf });
    } else {
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setToast({ show: true, message: 'Este recurso no cuenta con un enlace digital guardado.' });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
      }
    }
  };

  const obtenerIconoPorTipo = (tipo: string) => {
    if (tipo === 'Tesis') return schoolOutline;
    if (tipo === 'Revista / Artículo Científico') return newspaperOutline;
    if (tipo === 'Enciclopedia / Diccionario') return libraryOutline;
    return bookOutline;
  };

  // 🏛️ FUNCIÓN CORREGIDA: Mensajes absolutos sin la palabra "físico"
  const obtenerMensajeAgotado = (tipo: string) => {
    if (tipo === 'Revista / Artículo Científico') return 'Revista no disponible';
    if (tipo === 'Enciclopedia / Diccionario') return 'Enciclopedia no disponible';
    if (tipo === 'Tesis') return 'Tesis no disponible';
    return 'Libro no disponible';
  };

  if (loading) {
    return (
      <IonPage>
        <div className="cervantes-loader-container">
          <div className="cervantes-spinner"></div>
          <p>Cargando ficha bibliográfica oficial...</p>
        </div>
      </IonPage>
    );
  }

  if (!recurso) {
    return (
      <IonPage>
        <div className="cervantes-loader-container">
          <p style={{ color: '#ef4444', fontWeight: 'bold' }}>❌ El recurso solicitado no se encuentra disponible.</p>
          <button className="btn-cervantes-back-error" onClick={() => window.history.back()}>
            Volver a la página anterior
          </button>
        </div>
      </IonPage>
    );
  }

  const isPrintMaterial = ['Libro', 'Revista / Artículo Científico', 'Tesis', 'Enciclopedia / Diccionario'].includes(recurso.TipoRecurso);
  
  // Variables booleanas de control de inventario real
  const tieneEnlaceDigital = recurso.URL_Externa || recurso.Pdf_url;
  const tieneStockFisico = recurso.unidades_disponibles > 0;

  return (
    <IonPage>
      <div className="premium-navbar">
        <div className="navbar-left">
          <button className="navbar-back-arrow-btn" onClick={() => window.history.back()} title="Regresar al catálogo">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <span className="university-logo-text">UPVE</span>
          <span className="university-brand-sub">BIBLIOTECA</span>
        </div>

        <div className="navbar-center-links">
          <span className="nav-top-link" onClick={() => window.location.href = '/portal/inicio'}>Inicio</span>
          <span className="nav-top-link" onClick={() => window.location.href = '/portal/explorar'}>Explorar</span>
          <span className="nav-top-link" onClick={() => window.location.href = '/portal/mibiblioteca'}>Mi Biblioteca</span>
        </div>

        <div className="navbar-right"></div>
      </div>

      <IonContent className="cervantes-content-bg" fullscreen>
        
        {toast.show && <div className="cervantes-toast-error"><span>{toast.message}</span></div>}

        {avisoModal.show && (
          <div className="cervantes-modal-overlay">
            <div className="cervantes-modal-content">
              <h3>
                <IonIcon icon={avisoModal.isPdf ? checkmarkCircleOutline : warningOutline} style={{ color: avisoModal.isPdf ? '#10b981' : '#f59e0b', verticalAlign: 'middle', marginRight: '8px' }}/>
                Aviso de Consulta Digital
              </h3>
              <p>{avisoModal.mensaje}</p>
              <div className="cervantes-modal-actions">
                <button className="btn-cervantes-modal-no" onClick={() => setAvisoModal({ ...avisoModal, show: false })}>Cancelar</button>
                <button className="btn-cervantes-modal-yes" onClick={() => { 
                  window.open(avisoModal.url, '_blank'); 
                  setAvisoModal({ ...avisoModal, show: false }); 
                }}>
                  Entendido, Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="cervantes-layout-wrapper">
          <div className="cervantes-main-card">
            
            {/* COLUMNA IZQUIERDA: PORTADA Y ACCESO INTEGRADO */}
            <div className="cervantes-col-left">
              <div className="cervantes-image-wrapper">
                {recurso.Imagen_url ? (
                  <img src={recurso.Imagen_url} alt={recurso.Titulo} className="cervantes-book-img" />
                ) : (
                  <div className="cervantes-fallback-frame">
                    <IonIcon icon={obtenerIconoPorTipo(recurso.TipoRecurso)} />
                    <span>{recurso.TipoRecurso}</span>
                  </div>
                )}
              </div>

              <div className="cervantes-under-cover-box">
                
                {/* BOTÓN DE REDIRECCIÓN ABAJO DE LA PORTADA */}
                {recurso.TipoRecurso === 'Tesis' && recurso.Pdf_url ? (
                  <button className="btn-cervantes-digital dynamic-bg-verde" style={{ marginBottom: '12px' }} onClick={(e) => handleOpenLink(e, recurso.Pdf_url, recurso.Mensaje_Legal, true)}>
                    📄 Ver Documento PDF
                  </button>
                ) : recurso.URL_Externa ? (
                  <button className="btn-cervantes-digital dynamic-bg-azul" style={{ marginBottom: '12px' }} onClick={(e) => handleOpenLink(e, recurso.URL_Externa, recurso.Mensaje_Legal, false)}>
                    🌐 Consultar en Sitio Web
                  </button>
                ) : null}

                {/* 📊 CONTENEDORES DE ESTADO BASADOS EN TU INVENTARIO REAL */}
                {tieneStockFisico && tieneEnlaceDigital && (
                  <div className="real-inventory-badge badge-both" style={{ marginBottom: '12px' }}>
                    <span className="badge-dot dot-green"></span>
                    <span>Disponible en Físico y Digital</span>
                  </div>
                )}

                {!tieneStockFisico && tieneEnlaceDigital && (
                  <div className="real-inventory-badge badge-digital-only" style={{ marginBottom: '12px' }}>
                    <span className="badge-dot dot-blue"></span>
                    <span>Disponible Solo en Digital</span>
                  </div>
                )}

                {tieneStockFisico && !tieneEnlaceDigital && (
                  <div className="real-inventory-badge badge-physical-only" style={{ marginBottom: '12px' }}>
                    <span className="badge-dot dot-purple"></span>
                    <span>Disponible Solo en Biblioteca Física</span>
                  </div>
                )}

                {/* MENSAJE DIRECTO DE NO DISPONIBILIDAD ABSOLUTA */}
                {!tieneStockFisico && !tieneEnlaceDigital && (
                  <div className="real-inventory-badge badge-empty" style={{ marginBottom: '12px' }}>
                    <span className="badge-dot dot-red"></span>
                    <span>{obtenerMensajeAgotado(recurso.TipoRecurso)}</span>
                  </div>
                )}

              </div>
            </div>

            {/* COLUMNA DERECHA: TARJETA ÚNICA MASIVA INTEGRADA */}
            <div className="cervantes-col-right">
              
              <h1 className="cervantes-main-title-text">{recurso.Titulo}</h1>
              <div className="cervantes-title-divider"></div>

              <div className="cervantes-section-group-card">
                <h3 className="group-card-title"><IonIcon icon={bookmarkOutline} /> Especificaciones Generales</h3>
                
                <div className="group-card-content">
                  <p className="cervantes-meta-row"><span className="cervantes-label">Tipo de recurso:</span><span className="cervantes-value text-purple-type">{recurso.TipoRecurso}</span></p>
                  <p className="cervantes-meta-row"><span className="cervantes-label">Área / Tema:</span><span className="cervantes-value">{recurso.TemaRecurso || 'General'}</span></p>
                  <p className="cervantes-meta-row"><span className="cervantes-label">Año de publicación:</span><span className="cervantes-value">{recurso.AnioPublicacion}</span></p>
                  
                  {recurso.TipoRecurso === 'Tesis' ? (
                    <>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Autor (Alumno):</span><span className="cervantes-value text-link-style">{recurso.AutorTexto || 'No especificado'}</span></p>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Maestro Asesor:</span><span className="cervantes-value">{recurso.Asesor || 'No especificado'}</span></p>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Grado / Carrera:</span><span className="cervantes-value">{recurso.GradoCarrera || 'No especificado'}</span></p>
                    </>
                  ) : (
                    <>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Autor / Compilador:</span><span className="cervantes-value text-link-style">{recurso.Autor || 'Autor Colectivo / Institucional'}</span></p>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Casa Editorial:</span><span className="cervantes-value">{recurso.Editorial || 'Edición Independiente'}</span></p>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Edición / Volumen:</span><span className="cervantes-value">{recurso.EdicionVolumen || '-'}</span></p>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Registro (ISBN / ISSN):</span><span className="cervantes-value">{recurso.ClasificacionISBN || recurso.ClasificacionISSN || 'Sin registro'}</span></p>
                    </>
                  )}

                  {isPrintMaterial && (
                    <>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Formato / Tapa:</span><span className="cervantes-value">{recurso.Formato || 'No especificado'}</span></p>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Páginas:</span><span className="cervantes-value">{recurso.Cantidad_Paginas ? `${recurso.Cantidad_Paginas} págs.` : 'No especificado'}</span></p>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Idioma:</span><span className="cervantes-value">{recurso.Idioma || 'No especificado'}</span></p>
                      <p className="cervantes-meta-row"><span className="cervantes-label">Género / Tipo:</span><span className="cervantes-value">{recurso.Genero || 'No especificado'}</span></p>
                    </>
                  )}

                  <div className="single-card-inner-text-block">
                    <h4 className="inner-block-subtitle"><IonIcon icon={documentTextOutline} /> Resumen / Sinopsis:</h4>
                    <p className="cervantes-paragraph-justified text-main-synopsis">
                      {recurso.Resumen && recurso.Resumen.trim() !== '' 
                        ? recurso.Resumen 
                        : 'Este recurso no cuenta con una sinopsis o resumen argumental registrado en el catálogo digital.'}
                    </p>
                  </div>

                  <div className="single-card-inner-text-block border-top-dashed">
                    <h4 className="inner-block-subtitle"><IonIcon icon={clipboardOutline} /> Observaciones:</h4>
                    <p className="cervantes-paragraph-justified text-main-observations">
                      {recurso.Observaciones && recurso.Observaciones.trim() !== '' 
                        ? recurso.Observaciones 
                        : 'Sin observaciones adicionales o especificaciones de inventario registradas.'}
                    </p>
                  </div>

                </div>
              </div>

              <div className="cervantes-footer-info-badge">
                <IonIcon icon={informationCircleOutline} />
                <span>Para préstamos acude al mostrador de control portando tu credencial de alumno vigente. Respeta los reglamentos y plazos de devolución de la UPVE.</span>
              </div>

            </div>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DetalleRecurso;
import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage, IonIcon, IonButton, IonSearchbar, useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { documentTextOutline, gridOutline, addOutline, createOutline, trashOutline, bookmarksOutline, chevronBackOutline, chevronForwardOutline, checkmarkCircleOutline, warningOutline, searchOutline, bulbOutline, closeCircleOutline } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import api from '../../services/api'; 
import './Editoriales.css'; 

const Editoriales: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UNIFICADO: Un solo estado de carga universal
  const [isLoading, setIsLoading] = useState(true); 
  const abortControllerRef = useRef<AbortController | null>(null);

  const [showHelp, setShowHelp] = useState(false); // <-- ESTADO DEL TOOLTIP

  // NOTIFICACIONES Y MODALES
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: () => {} });

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };
  
  const [records, setRecords] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [formData, setFormData] = useState<any>({ 
    Editorial_ID: null, NombreEditorial: '', RazonSocial: '', ISBN_Editorial: '', 
    Email: '', DatosContacto: '', PaisEditorial: '', DireccionEditorial: '', Observaciones: ''
  });

  // APAGAR EL FOQUITO JUSTO AL SALIR DEL MÓDULO (Evita la persistencia por caché de Ionic)
  useIonViewWillLeave(() => {
    setShowHelp(false);
  });

  // LIMPIEZA ABSOLUTA AL ENTRAR AL MÓDULO
  useIonViewWillEnter(() => {
    // Apagamos los componentes visuales inmediatamente
    setShowHelp(false); 
    setShowForm(false);
    setIsEditing(false);
    setSearchQuery('');
    setCurrentPage(1);
    setRecords([]); 
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
    setFormData({ 
      Editorial_ID: null, NombreEditorial: '', RazonSocial: '', ISBN_Editorial: '', 
      Email: '', DatosContacto: '', PaisEditorial: '', DireccionEditorial: '', Observaciones: ''
    });

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        await fetchPage(1, '');
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
    };
    fetchInitialData();
  });

  // FUNCIÓN DE BÚSQUEDA Y PAGINACIÓN CON UN SOLO CARGADOR ANTI-PARPADEO
  const fetchPage = async (page: number, search = searchQuery) => {
    setIsLoading(true); 
    if (abortControllerRef.current) abortControllerRef.current.abort();
    
    const currentAbortController = new AbortController();
    abortControllerRef.current = currentAbortController;

    try {
      const res = await api.get(`/editoriales?page=${page}&search=${search}`, {
          signal: currentAbortController.signal
      });
      setRecords(res.data?.data?.data || []);
      setCurrentPage(res.data?.data?.current_page || 1);
      setLastPage(res.data?.data?.last_page || 1);
      setTotalRecords(res.data?.data?.total || 0);
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.message !== 'canceled') {
          console.error("Error al cargar datos:", err);
      }
    } finally {
      // Solo apaga el cargador si esta es la petición más nueva
      if (abortControllerRef.current === currentAbortController) {
        setIsLoading(false);
      }
    }
  };

  // Función para disparar la búsqueda solo al hacer clic en la lupa o dar Enter
  const handleSearch = () => {
    fetchPage(1, searchQuery);
  };

  const openForm = (record?: any) => {
    if (record) {
      setIsEditing(true);
      setFormData({ ...record });
    } else {
      setIsEditing(false);
      setFormData({ 
        Editorial_ID: null, NombreEditorial: '', RazonSocial: '', ISBN_Editorial: '', 
        Email: '', DatosContacto: '', PaisEditorial: '', DireccionEditorial: '', Observaciones: ''
      });
    }
    setShowForm(true);
  };

  const saveRecord = async () => {
    if (!formData.NombreEditorial) {
      return showToast("El nombre de la editorial es obligatorio (*)", "danger");
    }

    if (formData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
      return showToast("Error: El formato del correo electrónico no es válido.", "danger");
    }

    setIsLoading(true);
    const payload = { ...formData };

    try {
      if (isEditing) await api.put(`/editoriales/${formData.Editorial_ID}`, payload);
      else await api.post('/editoriales', payload);
      
      showToast(isEditing ? "¡Editorial actualizada correctamente!" : "¡Editorial registrada exitosamente!", "success");
      setShowForm(false);
      fetchPage(currentPage); 
    } catch (error: any) {
      showToast("Error al guardar el registro. Verifica la información.", "danger");
      setIsLoading(false);
    }
  };

  const handleDelete = (id: any) => {
    setConfirmDialog({
      show: true,
      title: 'Eliminar Editorial',
      message: '¿Estás seguro de eliminar esta editorial? Es posible que afecte a recursos asociados en el catálogo.',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await api.delete(`/editoriales/${id}`);
          fetchPage(currentPage);
          showToast("Editorial eliminada exitosamente.", "success");
        } catch (error) {
          showToast("No se pudo eliminar. Tiene recursos asociados.", "danger");
          setIsLoading(false);
        } finally {
          setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
        }
      }
    });
  };

  const exportToExcel = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/editoriales?all=true&search=${searchQuery}`);
      const allData = res.data.data || [];
      const ws = XLSX.utils.json_to_sheet(allData.map((r: any) => ({
        ID: r.Editorial_ID, 'Nombre Comercial': r.NombreEditorial, 'Razón Social': r.RazonSocial,
        'Prefijo ISBN': r.ISBN_Editorial || '-', 'Email': r.Email, 'País': r.PaisEditorial || '-',
        'Contacto Ext.': r.DatosContacto || '-', 'Dirección': r.DireccionEditorial || '-'
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Editoriales'); 
      XLSX.writeFile(wb, `UPVE_Editoriales_Registros.xlsx`);
      showToast("¡Excel descargado exitosamente!", "success");
    } catch (error) { 
        showToast("Hubo un problema al exportar el archivo.", "danger"); 
    } finally {
        setIsLoading(false);
    }
  };

  const exportToPDF = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/editoriales?all=true&search=${searchQuery}`);
      const allData = res.data.data || [];
      const doc = new jsPDF('landscape');
      doc.text(`Directorio de Editoriales - UPVE`, 14, 15);
      autoTable(doc, { 
        startY: 20, 
        head: [['ID', 'Editorial', 'Razón Social', 'ISBN', 'Email', 'País']], 
        body: allData.map((r: any) => [
          r.Editorial_ID, r.NombreEditorial, r.RazonSocial, 
          r.ISBN_Editorial || '-', r.Email, r.PaisEditorial || '-'
        ]), 
        theme: 'grid', 
        headStyles: { fillColor: [88, 44, 131] } 
      });
      doc.save(`UPVE_Editoriales_Registros.pdf`);
      showToast("¡PDF descargado exitosamente!", "success");
    } catch (error) { 
        showToast("Hubo un problema al exportar el archivo.", "danger"); 
    } finally {
        setIsLoading(false);
    }
  };

  const getPageNumbers = () => {
    if (lastPage <= 4) {
      const pages = [];
      for (let i = 1; i <= lastPage; i++) pages.push(i);
      return pages;
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4];
    } else if (currentPage >= lastPage - 1) {
      return [1, lastPage - 2, lastPage - 1, lastPage];
    } else {
      return [1, currentPage - 1, currentPage, currentPage + 1];
    }
  };

  return (
    <IonPage>
      <IonContent className="editoriales-bg" style={{ position: 'relative' }}>
        
        {/* UN SOLO CARGADOR FIJO, CENTRADO Y CON TEXTO ÚNICO */}
        {isLoading && (
            <div className="main-loader-overlay">
                <div className="main-loader-spinner"></div>
                <p>Cargando...</p>
            </div>
        )}

        {/* TOOLTIP / MODAL INFORMATIVO EN EL FOQUITO */}
        {showHelp && (
          <div className="help-tooltip-overlay" onClick={() => setShowHelp(false)}>
            <div className="help-tooltip-content" onClick={e => e.stopPropagation()}>
              <div className="help-tooltip-header">
                <h3><IonIcon icon={bulbOutline} /> Guía de Búsqueda de Editoriales</h3>
                <IonIcon icon={closeCircleOutline} className="close-help-icon" onClick={() => setShowHelp(false)} />
              </div>
              <p>Escribe el criterio directamente en la barra superior y presiona la lupa o la tecla Enter:</p>
              
              <table className="help-tooltip-table">
                <thead>
                  <tr><th>¿Qué deseas buscar?</th><th>Instrucción de búsqueda</th><th>Ejemplo de entrada</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Nombre Comercial</strong></td>
                    <td>Escribe el nombre comercial de la casa editora.</td>
                    <td><code className="code-badge">McGraw-Hill</code></td>
                  </tr>
                  <tr>
                    <td><strong>Razón Social</strong></td>
                    <td>Escribe la denominación legal de la editorial.</td>
                    <td><code className="code-badge">Porrúa Hermanos</code></td>
                  </tr>
                  <tr>
                    <td><strong>Prefijo ISBN</strong></td>
                    <td>Introduce el código identificador de la editorial para ver sus obras indexadas.</td>
                    <td><code className="code-badge">978-607</code></td>
                  </tr>
                  <tr>
                    <td><strong>Email</strong></td>
                    <td>Busca por la dirección de correo electrónico de contacto.</td>
                    <td><code className="code-badge">ejemplo@gmail.com</code></td>
                  </tr>
                  <tr>
                    <td><strong>País</strong></td>
                    <td>Busca por el país de origen de la distribuidora.</td>
                    <td><code className="code-badge">México</code></td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                💡 Tip: Puedes ingresar un término parcial; el sistema filtrará las coincidencias en tiempo real entre todos los campos de contacto del directorio.
              </p>
            </div>
          </div>
        )}

        {/* NOTIFICACIONES TOAST */}
        <div className={`toast-notification ${toast.show ? 'show' : ''} ${toast.type}`}>
            <IonIcon icon={toast.type === 'success' ? checkmarkCircleOutline : warningOutline} />
            <span>{toast.message}</span>
        </div>

        {/* MODAL DE CONFIRMACIÓN */}
        {confirmDialog.show && (
            <div className="pdf-modal-overlay">
                <div className="pdf-modal-content">
                    <h3 style={{color: '#ef4444'}}>{confirmDialog.title}</h3>
                    <p>{confirmDialog.message}</p>
                    <div className="pdf-modal-actions" style={{ flexDirection: 'row', justifyContent: 'center' }}>
                        <button className="btn-pdf-text" onClick={() => setConfirmDialog({show: false, title: '', message: '', onConfirm: () => {}})}>Cancelar</button>
                        <button className="btn-pdf-img" style={{background: '#ef4444'}} onClick={confirmDialog.onConfirm}>Sí, eliminar</button>
                    </div>
                </div>
            </div>
        )}

        <div className="editoriales-layout">
          
          <div className="main-top-header">
            <div>
              <h1><IonIcon icon={bookmarksOutline} className="header-icon" /> Editoriales</h1>
              <p>Directorio de casas editoras e imprentas comerciales.</p>
            </div>
            <div className="header-actions">
              <IonButton fill="outline" color="danger" className="btn-export" onClick={exportToPDF} disabled={isLoading}><IonIcon icon={documentTextOutline} slot="start" /> PDF</IonButton>
              <IonButton fill="outline" color="success" className="btn-export" onClick={exportToExcel} disabled={isLoading}><IonIcon icon={gridOutline} slot="start" /> Excel</IonButton>
              <IonButton className="btn-nueva" onClick={() => showForm ? setShowForm(false) : openForm()} disabled={isLoading}><IonIcon icon={addOutline} slot="start" /> {showForm ? 'Cancelar' : 'Nueva Editorial'}</IonButton>
            </div>
          </div>

          <div className="sticky-searchbar">
            <IonSearchbar 
              placeholder="Buscar por editorial, razón social, email, país o ISBN..."
              value={searchQuery}
              onIonInput={(e: any) => {
                const newValue = e.target.value || '';
                setSearchQuery(newValue);
                // Si el usuario borró todo con el teclado, recargamos la lista
                if (newValue.trim() === '') {
                  fetchPage(1, '');
                }
              }}
              onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
              onIonClear={() => {
                setSearchQuery('');
                fetchPage(1, '');
              }}
              disabled={isLoading}
            />
            <IonButton className="btn-buscar-lupa" onClick={handleSearch} disabled={isLoading}>
              <IonIcon icon={searchOutline} />
            </IonButton>

            {/* BOTÓN DEL FOQUITO */}
            <button className="btn-bulb-help" onClick={() => setShowHelp(true)} title="Ver guía de búsqueda">
              <IonIcon icon={bulbOutline} />
            </button>

            <span className="results-count">{totalRecords} editoriales encontradas</span>
          </div>

          {showForm && (
            <div className="editoriales-form-card">
              <h3 className="form-title">{isEditing ? 'Editar Editorial' : 'Nueva Editorial'}</h3>
              
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>NOMBRE COMERCIAL (MARCA) *</label>
                  <input className="custom-input" value={formData.NombreEditorial || ''} onChange={e => setFormData({...formData, NombreEditorial: e.target.value})} />
                </div>
                <div className="form-group flex-1">
                  <label>RAZÓN SOCIAL (LEGAL)</label>
                  <input className="custom-input" value={formData.RazonSocial || ''} onChange={e => setFormData({...formData, RazonSocial: e.target.value})} />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '15px' }}>
                <div className="form-group flex-1">
                  <label>PREFIJO ISBN</label>
                  <input className="custom-input" value={formData.ISBN_Editorial || ''} onChange={e => setFormData({...formData, ISBN_Editorial: e.target.value})} />
                </div>
                <div className="form-group flex-1">
                  <label>EMAIL DE CONTACTO</label>
                  <input className="custom-input" type="email" value={formData.Email || ''} onChange={e => setFormData({...formData, Email: e.target.value})} />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '15px' }}>
                <div className="form-group flex-1">
                  <label>PAÍS DE ORIGEN</label>
                  <input className="custom-input" value={formData.PaisEditorial || ''} onChange={e => setFormData({...formData, PaisEditorial: e.target.value})} />
                </div>
                <div className="form-group flex-2">
                  <label>OTROS DATOS DE CONTACTO (TEL, WEB, ETC)</label>
                  <input className="custom-input" value={formData.DatosContacto || ''} onChange={e => setFormData({...formData, DatosContacto: e.target.value})} />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '15px' }}>
                <div className="form-group flex-2">
                  <label>DIRECCIÓN FÍSICA</label>
                  <input className="custom-input" value={formData.DireccionEditorial || ''} onChange={e => setFormData({...formData, DireccionEditorial: e.target.value})} />
                </div>
                <div className="form-group flex-2">
                  <label>OBSERVACIONES</label>
                  <input className="custom-input" value={formData.Observaciones || ''} onChange={e => setFormData({...formData, Observaciones: e.target.value})} />
                </div>
                <div className="form-group align-bottom">
                  <button className="btn-guardar-inline" onClick={saveRecord} disabled={isLoading}>GUARDAR</button>
                </div>
              </div>
            </div>
          )}

          <div className="editoriales-table-card">
            <div className="table-wrapper">
              <table className="tabla-dinamica">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '30px' }}>ID</th>
                    <th>EDITORIAL</th>
                    <th>RAZÓN SOCIAL</th>
                    <th>ISBN</th>
                    <th>EMAIL</th>
                    <th>PAÍS</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.Editorial_ID}>
                      <td style={{ paddingLeft: '30px', fontWeight: '500' }}>{r.Editorial_ID}</td>
                      <td style={{ fontWeight: 'bold', color: '#111827' }}>{r.NombreEditorial}</td>
                      <td>{r.RazonSocial}</td>
                      <td><span className="badge-isbn">{r.ISBN_Editorial || '-'}</span></td>
                      <td>{r.Email}</td>
                      <td>{r.PaisEditorial || '-'}</td>
                      <td style={{ textAlign: 'center', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', gap: '8px' }}>
                          <IonButton className="btn-action btn-edit" fill="clear" onClick={() => openForm(r)} disabled={isLoading}><IonIcon icon={createOutline} /></IonButton>
                          <IonButton className="btn-action btn-delete" fill="clear" onClick={() => handleDelete(r.Editorial_ID)} disabled={isLoading}><IonIcon icon={trashOutline} /></IonButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* SÓLO muestra el estado vacío si de verdad terminó de cargar */}
                  {records.length === 0 && !isLoading && (
                    <tr><td colSpan={7} className="empty-state">No hay editoriales registradas o que coincidan con la búsqueda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="footer-card">
              <span className="total-registro-text">Página {currentPage} de {lastPage}</span>
              <div className="pagination-container">
                <button className="btn-page btn-page-nav" disabled={currentPage === 1 || isLoading} onClick={() => fetchPage(currentPage - 1)}><IonIcon icon={chevronBackOutline} /></button>
                {getPageNumbers().map(pageNum => (
                  <button key={pageNum} className={`btn-page ${currentPage === pageNum ? 'active' : ''}`} disabled={isLoading} onClick={() => fetchPage(pageNum)}>{pageNum}</button>
                ))}
                <button className="btn-page btn-page-nav" disabled={currentPage === lastPage || lastPage === 0 || isLoading} onClick={() => fetchPage(currentPage + 1)}><IonIcon icon={chevronForwardOutline} /></button>
              </div>
            </div>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Editoriales;
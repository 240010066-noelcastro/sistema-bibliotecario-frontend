import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage, IonIcon, IonButton, IonSearchbar, useIonViewWillEnter } from '@ionic/react';
import { createOutline, trashOutline, addOutline, listOutline, documentTextOutline, gridOutline, chevronBackOutline, chevronForwardOutline, checkmarkCircleOutline, warningOutline, searchOutline, bulbOutline, closeCircleOutline } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import api from '../../services/api';
import './Carreras.css';

const Carreras: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ESTADO DE CARGA UNIVERSAL ANTI-PARPADEO
  const [isLoading, setIsLoading] = useState(true); 
  const abortControllerRef = useRef<AbortController | null>(null);

  const [showHelp, setShowHelp] = useState(false); 

  // NOTIFICACIONES Y MODALES
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: () => {} });

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const [carreras, setCarreras] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [formData, setFormData] = useState({ Carrera_ID: '', NombreCarrera: '', Siglas: '' });

  // LIMPIEZA ABSOLUTA AL ENTRAR AL MÓDULO
  useIonViewWillEnter(() => {
    setShowForm(false);
    setIsEditing(false);
    setSearchQuery('');
    setCurrentPage(1);
    setCarreras([]); 
    setShowHelp(false); 
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
    setFormData({ Carrera_ID: '', NombreCarrera: '', Siglas: '' });

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        await fetchCarreras(1, '');
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
    };
    fetchInitialData();
  });

  // FUNCIÓN DE BÚSQUEDA Y PAGINACIÓN BLINDADA
  const fetchCarreras = async (page: number, search = searchQuery) => {
    setIsLoading(true); 
    if (abortControllerRef.current) abortControllerRef.current.abort();
    
    const currentAbortController = new AbortController();
    abortControllerRef.current = currentAbortController;

    try {
      const res = await api.get(`/carreras?page=${page}&search=${search}`, {
          signal: currentAbortController.signal
      });
      setCarreras(res.data?.data?.data || []);
      setCurrentPage(res.data?.data?.current_page || 1);
      setLastPage(res.data?.data?.last_page || 1);
      setTotalRecords(res.data?.data?.total || 0);
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.message !== 'canceled') {
          console.error("Error al cargar datos:", err);
      }
    } finally {
      if (abortControllerRef.current === currentAbortController) {
        setIsLoading(false);
      }
    }
  };

  // Función para disparar la búsqueda solo al hacer clic en la lupa o dar Enter
  const handleSearch = () => {
    fetchCarreras(1, searchQuery);
  };

  const toggleForm = (carrera?: any) => {
    if (carrera) {
      setIsEditing(true);
      setFormData({ Carrera_ID: carrera.Carrera_ID, NombreCarrera: carrera.NombreCarrera, Siglas: carrera.Siglas });
      setShowForm(true);
    } else {
      setIsEditing(false);
      setFormData({ Carrera_ID: '', NombreCarrera: '', Siglas: '' });
      setShowForm(!showForm); 
    }
  };

  const saveCarrera = async () => {
    if (!formData.NombreCarrera || !formData.Siglas) {
      return showToast("Por favor, llena los campos obligatorios.", "danger");
    }
    
    setIsLoading(true);
    try {
      if (isEditing) await api.put(`/carreras/${formData.Carrera_ID}`, formData);
      else await api.post('/carreras', formData);
      
      showToast(isEditing ? "¡Carrera actualizada correctamente!" : "¡Carrera registrada exitosamente!", "success");
      setShowForm(false);
      setFormData({ Carrera_ID: '', NombreCarrera: '', Siglas: '' });
      fetchCarreras(currentPage); 
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        showToast("Error: Las siglas no deben exceder los 10 caracteres.", "danger");
      } else {
        showToast("Ocurrió un error inesperado al guardar.", "danger");
      }
      setIsLoading(false); 
    }
  };

  const handleDelete = (id: any) => {
    setConfirmDialog({
      show: true,
      title: 'Eliminar Carrera',
      message: '¿Estás seguro de eliminar esta carrera? Verifica que no tenga grupos o recursos asociados.',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await api.delete(`/carreras/${id}`);
          fetchCarreras(currentPage);
          showToast("Carrera eliminada exitosamente.", "success");
        } catch (error) {
          showToast("No se pudo eliminar. Tiene grupos o recursos dependientes.", "danger");
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
      const res = await api.get(`/carreras?all=true&search=${searchQuery}`);
      const allData = res.data.data || [];
      const ws = XLSX.utils.json_to_sheet(allData.map((c: any) => ({ ID: c.Carrera_ID, Nombre: c.NombreCarrera, Siglas: c.Siglas })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Carreras");
      XLSX.writeFile(wb, "UPVE_Carreras_Registros.xlsx");
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
      const res = await api.get(`/carreras?all=true&search=${searchQuery}`);
      const allData = res.data.data || [];
      const doc = new jsPDF();
      doc.text("Directorio de Carreras - UPVE", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [['ID', 'Nombre de la Carrera', 'Siglas']],
        body: allData.map((c: any) => [c.Carrera_ID, c.NombreCarrera, c.Siglas]),
        theme: 'grid',
        headStyles: { fillColor: [88, 44, 131] } 
      });
      doc.save("UPVE_Carreras_Registros.pdf");
      showToast("¡PDF descargado exitosamente!", "success");
    } catch (error) { 
        showToast("Hubo un problema al exportar el archivo.", "danger"); 
    } finally {
        setIsLoading(false);
    }
  };

  const getPageNumbers = () => {
    // Si en total hay 4 páginas o menos, simplemente mostramos [1, 2, 3, 4]
    if (lastPage <= 4) {
      const pages = [];
      for (let i = 1; i <= lastPage; i++) pages.push(i);
      return pages;
    }

    // Si estamos en la página 1, 2 o 3, mostramos el inicio normal [1, 2, 3, 4]
    if (currentPage <= 3) {
      return [1, 2, 3, 4];
    } 
    // Si ya estamos hasta el final (ej. en la página 9 o 10 de 10), 
    // mantenemos el 1 fijo al inicio y mostramos las últimas tres [1, 8, 9, 10]
    else if (currentPage >= lastPage - 1) {
      return [1, lastPage - 2, lastPage - 1, lastPage];
    } 
    // Si estamos en medio (ej. en la página 6), 
    // mantenemos el 1 fijo y recorremos las de alrededor [1, 5, 6, 7]
    else {
      return [1, currentPage - 1, currentPage, currentPage + 1];
    }
  };

  return (
    <IonPage>
      <IonContent className="carreras-content" style={{ position: 'relative' }}>
        
        {/* CARGADOR FIJO CENTRADO */}
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
                <h3><IonIcon icon={bulbOutline} /> Guía de Búsqueda</h3>
                <IonIcon icon={closeCircleOutline} className="close-help-icon" onClick={() => setShowHelp(false)} />
              </div>
              <p>Escribe el dato directamente en la barra superior y presiona la lupa o la tecla Enter:</p>
              
              <table className="help-tooltip-table">
                <thead>
                  <tr><th>¿Qué deseas buscar?</th><th>Instrucción de búsqueda</th><th>Ejemplo</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Nombre de la Carrera</strong></td>
                    <td>Escribe completo o una parte del nombre de la carrera.</td>
                    <td><code className="code-badge">Administración</code></td>
                  </tr>
                  <tr>
                    <td><strong>Siglas Exactas</strong></td>
                    <td>Teclea la abreviatura oficial de la carrera tal como está registrada.</td>
                    <td><code className="code-badge">AD</code></td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                💡 Tip: La búsqueda detecta automáticamente si escribes siglas o una palabra clave, sin importar si usas mayúsculas o minúsculas.
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

        {/* CONTENEDOR FLUIDO A PANTALLA COMPLETA */}
        <div className="carreras-layout">
          
          <div className="header-carreras">
            <div>
              <h1>Gestión de Carreras</h1>
              <p>Administración de programas académicos oficiales.</p>
            </div>
            <div className="header-actions">
              <IonButton fill="outline" className="btn-export" color="danger" onClick={exportToPDF} disabled={isLoading}><IonIcon icon={documentTextOutline} slot="start" /> PDF</IonButton>
              <IonButton fill="outline" className="btn-export" color="success" onClick={exportToExcel} disabled={isLoading}><IonIcon icon={gridOutline} slot="start" /> Excel</IonButton>
              <IonButton className="btn-nueva" onClick={() => toggleForm()} disabled={isLoading}><IonIcon icon={addOutline} slot="start" /> {showForm && !isEditing ? 'Cancelar' : 'Nueva Carrera'}</IonButton>
            </div>
          </div>

          <div className="searchbar-container">
            <IonSearchbar 
              placeholder="Buscar por nombre de carrera o siglas..."
              value={searchQuery}
              onIonInput={(e: any) => {
                const newValue = e.target.value || '';
                setSearchQuery(newValue);
                // Si el usuario borró todo con el teclado, recargamos la lista automáticamente
                if (newValue.trim() === '') {
                  fetchCarreras(1, '');
                }
              }}
              onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
              onIonClear={() => {
                setSearchQuery('');
                fetchCarreras(1, '');
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

            <span className="results-count">{totalRecords} carreras encontradas</span>
          </div>

          {showForm && (
            <div className="carreras-form-card">
              <h3 className="form-title" style={{margin: '0 0 20px 0', fontSize: '18px', color: '#582c83', fontWeight: 700}}>{isEditing ? 'Editar Carrera' : 'Nueva Carrera'}</h3>
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>NOMBRE DE LA CARRERA *</label>
                  <input className="custom-input" type="text" value={formData.NombreCarrera} onChange={e => setFormData({...formData, NombreCarrera: e.target.value})} placeholder="Ej: Licenciatura en Administración" />
                </div>
                <div className="form-group flex-1">
                  <label>SIGLAS *</label>
                  <input className="custom-input" type="text" maxLength={10} value={formData.Siglas} onChange={e => setFormData({...formData, Siglas: e.target.value.toUpperCase()})} placeholder="Ej: ISW" />
                </div>
                <div className="form-group align-bottom">
                  <button className="btn-guardar-inline" onClick={saveCarrera} disabled={isLoading}>GUARDAR</button>
                </div>
              </div>
            </div>
          )}

          <div className="carreras-card">
            <div className="table-responsive">
              <table className="tabla-carreras">
                <thead>
                  <tr>
                    <th style={{paddingLeft: '30px'}}>ID</th>
                    <th>NOMBRE DE LA CARRERA</th>
                    <th style={{textAlign: 'center'}}>SIGLAS</th>
                    <th style={{textAlign: 'center'}}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {carreras.map((c) => (
                    <tr key={c.Carrera_ID}>
                      <td style={{paddingLeft: '30px', fontWeight: '500'}}>{c.Carrera_ID}</td>
                      <td style={{fontWeight: 'bold', color: '#111827'}}>{c.NombreCarrera}</td>
                      <td style={{textAlign: 'center'}}><span className="badge">{c.Siglas}</span></td>
                      <td style={{textAlign: 'center', minWidth: '120px'}}>
                        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', gap: '8px' }}>
                          <IonButton className="btn-action btn-edit" fill="clear" onClick={() => toggleForm(c)} disabled={isLoading}><IonIcon icon={createOutline} /></IonButton>
                          <IonButton className="btn-action btn-delete" fill="clear" onClick={() => handleDelete(c.Carrera_ID)} disabled={isLoading}><IonIcon icon={trashOutline} /></IonButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {carreras.length === 0 && !isLoading && (
                    <tr><td colSpan={4} className="empty-state">No hay carreras registradas o que coincidan con la búsqueda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="footer-card">
              <span className="total-registro-text">Página {currentPage} de {lastPage}</span>
              <div className="pagination-container">
                <button className="btn-page btn-page-nav" disabled={currentPage === 1 || isLoading} onClick={() => fetchCarreras(currentPage - 1)}><IonIcon icon={chevronBackOutline} /></button>
                {getPageNumbers().map(pageNum => (
                  <button key={pageNum} className={`btn-page ${currentPage === pageNum ? 'active' : ''}`} disabled={isLoading} onClick={() => fetchCarreras(pageNum)}>{pageNum}</button>
                ))}
                <button className="btn-page btn-page-nav" disabled={currentPage === lastPage || lastPage === 0 || isLoading} onClick={() => fetchCarreras(currentPage + 1)}><IonIcon icon={chevronForwardOutline} /></button>
              </div>
            </div>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};
export default Carreras;
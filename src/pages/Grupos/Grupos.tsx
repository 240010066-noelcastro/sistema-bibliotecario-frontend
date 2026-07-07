import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage, IonIcon, IonButton, IonSearchbar, useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { documentTextOutline, gridOutline, addOutline, createOutline, trashOutline, peopleOutline, chevronBackOutline, chevronForwardOutline, checkmarkCircleOutline, warningOutline, searchOutline, bulbOutline, closeCircleOutline } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import api from '../../services/api'; 
import './Grupos.css'; 

const Grupos: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ESTADO DE CARGA UNIVERSAL ANTI-PARPADEO
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
  const [carrerasDB, setCarrerasDB] = useState<any[]>([]); 
  const [isEditing, setIsEditing] = useState(false);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [formData, setFormData] = useState<any>({ 
    Grupo_ID: null, NombreGrupo: '', Carrera_ID: ''
  });

  // APAGAR EL FOQUITO JUSTO AL SALIR DEL MÓDULO (Evita que Ionic lo guarde abierto en caché)
  useIonViewWillLeave(() => {
    setShowHelp(false);
  });

  // LIMPIEZA ABSOLUTA AL ENTRAR AL MÓDULO
  useIonViewWillEnter(() => {
    // 1. Apagamos interfaces visuales inmediatamente de forma síncrona
    setShowHelp(false); 
    setShowForm(false);
    setIsEditing(false);
    setSearchQuery('');
    setCurrentPage(1);
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
    setFormData({ Grupo_ID: null, NombreGrupo: '', Carrera_ID: '' });

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const resCarreras = await api.get('/carreras?all=true');
        // 2. Seteamos los datos de base de datos juntos para evitar renders repetidos
        setCarrerasDB(resCarreras.data?.data || []);
        await fetchPage(1, '');
      } catch (error) {
        console.error(error);
        setRecords([]); // Limpieza preventiva en caso de error
        setIsLoading(false);
      }
    };
    fetchInitialData();
  });

  // FUNCIÓN DE BÚSQUEDA Y PAGINACIÓN BLINDADA
  const fetchPage = async (page: number, search = searchQuery) => {
    setIsLoading(true); 
    if (abortControllerRef.current) abortControllerRef.current.abort();
    
    const currentAbortController = new AbortController();
    abortControllerRef.current = currentAbortController;

    try {
      const res = await api.get(`/grupos?page=${page}&search=${search}`, {
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
      setFormData({ Grupo_ID: record.Grupo_ID, NombreGrupo: record.NombreGrupo, Carrera_ID: record.Carrera_ID });
    } else {
      setIsEditing(false);
      setFormData({ Grupo_ID: null, NombreGrupo: '', Carrera_ID: '' });
    }
    setShowForm(true);
  };

  const saveRecord = async () => {
    if (!formData.NombreGrupo || !formData.Carrera_ID) {
      return showToast("Por favor, llena todos los campos obligatorios (*)", "danger");
    }
    
    setIsLoading(true);
    const payload = { NombreGrupo: formData.NombreGrupo, Carrera_ID: formData.Carrera_ID };

    try {
      if (isEditing) await api.put(`/grupos/${formData.Grupo_ID}`, payload);
      else await api.post('/grupos', payload);
      
      showToast(isEditing ? "¡Grupo actualizado correctamente!" : "¡Grupo registrado exitosamente!", "success");
      setShowForm(false);
      fetchPage(currentPage); 
    } catch (error: any) {
      showToast("Error al guardar. Verifica que el nombre no exceda los caracteres permitidos.", "danger");
      setIsLoading(false);
    }
  };

  const handleDelete = (id: any) => {
    setConfirmDialog({
      show: true,
      title: 'Eliminar Grupo',
      message: '¿Estás seguro de eliminar este grupo? Verifica que no haya registros dependientes.',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await api.delete(`/grupos/${id}`);
          fetchPage(currentPage);
          showToast("Grupo eliminado exitosamente.", "success");
        } catch (error) {
          showToast("No se pudo eliminar el grupo. Tiene registros dependientes.", "danger");
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
      const res = await api.get(`/grupos?all=true&search=${searchQuery}`);
      const allData = res.data.data || [];
      const ws = XLSX.utils.json_to_sheet(allData.map((r: any) => ({
        'ID': r.Grupo_ID, 'Nombre del Grupo': r.NombreGrupo, 'Carrera': r.NombreCarrera, 'Siglas': r.Siglas
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Grupos'); 
      XLSX.writeFile(wb, `UPVE_Grupos_Registros.xlsx`);
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
      const res = await api.get(`/grupos?all=true&search=${searchQuery}`);
      const allData = res.data.data || [];
      const doc = new jsPDF();
      doc.text(`Directorio de Grupos - UPVE`, 14, 15);
      autoTable(doc, { 
        startY: 20, 
        head: [['ID', 'Grupo', 'Carrera', 'Siglas']], 
        body: allData.map((r: any) => [r.Grupo_ID, r.NombreGrupo, r.NombreCarrera, r.Siglas]), 
        theme: 'grid', 
        headStyles: { fillColor: [88, 44, 131] } 
      });
      doc.save(`UPVE_Grupos_Registros.pdf`);
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
      <IonContent className="grupos-bg" style={{ position: 'relative' }}>
        
        {/* CARGADOR FIJO, CENTRADO Y CON TEXTO ÚNICO */}
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
                <h3><IonIcon icon={bulbOutline} /> Guía de Búsqueda de Grupos</h3>
                <IonIcon icon={closeCircleOutline} className="close-help-icon" onClick={() => setShowHelp(false)} />
              </div>
              <p>Escribe el dato directamente en la barra de búsqueda superior y presiona la lupa o la tecla Enter:</p>
              
              <table className="help-tooltip-table">
                <thead>
                  <tr><th>¿Qué deseas buscar?</th><th>Instrucción de búsqueda</th><th>Ejemplo</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Grupo Específico</strong></td>
                    <td>Escribe el nombre o nomenclatura exacta del cuatrimestre y grupo.</td>
                    <td><code className="code-badge">TIID1-1</code> o <code className="code-badge">AD1-2</code></td>
                  </tr>
                  <tr>
                    <td><strong>Carrera Completa</strong></td>
                    <td>Escribe palabras clave pertenecientes al nombre de la carrera.</td>
                    <td><code className="code-badge">Tecnologías</code> o <code className="code-badge">Administración</code></td>
                  </tr>
                  <tr>
                    <td><strong>Siglas de Carrera</strong></td>
                    <td>Introduce las siglas oficiales para aislar estrictamente los grupos de esa oferta académica.</td>
                    <td><code className="code-badge">TIID</code> o <code className="code-badge">GA</code></td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                💡 Tip: El buscador filtra automáticamente si buscas un aula/grupo o el programa educativo completo.
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
        <div className="grupos-layout">
          
          <div className="header-grupos">
            <div>
              <h1><IonIcon icon={peopleOutline} className="header-icon" /> Grupos</h1>
              <p>Administración de grupos escolares asignados a carreras.</p>
            </div>
            <div className="header-actions">
              <IonButton fill="outline" color="danger" className="btn-export" onClick={exportToPDF} disabled={isLoading}><IonIcon icon={documentTextOutline} slot="start" /> PDF</IonButton>
              <IonButton fill="outline" color="success" className="btn-export" onClick={exportToExcel} disabled={isLoading}><IonIcon icon={gridOutline} slot="start" /> Excel</IonButton>
              <IonButton className="btn-nueva" onClick={() => showForm ? setShowForm(false) : openForm()} disabled={isLoading}><IonIcon icon={addOutline} slot="start" /> {showForm ? 'Cancelar' : 'Nuevo Grupo'}</IonButton>
            </div>
          </div>

          <div className="searchbar-container">
            <IonSearchbar 
              placeholder="Buscar por grupo, carrera o siglas..."
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

            <span className="results-count">{totalRecords} grupos encontrados</span>
          </div>

          {showForm && (
            <div className="grupos-form-card">
              <h3 className="form-title">{isEditing ? 'Editar Grupo' : 'Nuevo Grupo'}</h3>
              <div className="form-row">
                
                <div className="form-group name-col">
                  <label>NOMBRE DEL GRUPO *</label>
                  <input className="custom-input" value={formData.NombreGrupo || ''} onChange={e => setFormData({...formData, NombreGrupo: e.target.value})} maxLength={20} placeholder="Ej. TIID 1-1"/>
                </div>
                
                <div className="form-group carrera-col">
                  <label>CARRERA ASIGNADA *</label>
                  <select className="custom-input select-input" value={formData.Carrera_ID || ''} onChange={e => setFormData({...formData, Carrera_ID: e.target.value})}>
                    <option value="" disabled>Seleccione una carrera...</option>
                    {carrerasDB.map((carrera) => (
                      <option key={carrera.Carrera_ID} value={carrera.Carrera_ID}>{carrera.NombreCarrera} ({carrera.Siglas})</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group btn-col">
                  <button className="btn-guardar-inline" onClick={saveRecord} disabled={isLoading}>GUARDAR</button>
                </div>

              </div>
            </div>
          )}

          <div className="grupos-table-card">
            <div className="table-responsive">
              <table className="tabla-dinamica">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '30px' }}>ID</th>
                    <th>GRUPO</th>
                    <th>CARRERA</th>
                    <th style={{ textAlign: 'center' }}>SIGLAS</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.Grupo_ID}>
                      <td style={{ paddingLeft: '30px', fontWeight: '500' }}>{r.Grupo_ID}</td>
                      <td style={{ fontWeight: 'bold', color: '#111827' }}>{r.NombreGrupo}</td>
                      <td>{r.NombreCarrera}</td>
                      <td style={{ textAlign: 'center' }}><span className="badge-siglas">{r.Siglas}</span></td>
                      <td style={{ textAlign: 'center', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', gap: '8px' }}>
                          <IonButton className="btn-action btn-edit" fill="clear" onClick={() => openForm(r)} disabled={isLoading}><IonIcon icon={createOutline} /></IonButton>
                          <IonButton className="btn-action btn-delete" fill="clear" onClick={() => handleDelete(r.Grupo_ID)} disabled={isLoading}><IonIcon icon={trashOutline} /></IonButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && !isLoading && (
                    <tr><td colSpan={5} className="empty-state">No hay grupos registrados o que coincidan con la búsqueda.</td></tr>
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

export default Grupos;
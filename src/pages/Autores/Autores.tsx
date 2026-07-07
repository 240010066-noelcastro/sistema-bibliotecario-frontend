import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage, IonIcon, IonButton, IonSearchbar, useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { documentTextOutline, gridOutline, addOutline, createOutline, trashOutline, personOutline, chevronBackOutline, chevronForwardOutline, checkmarkCircleOutline, warningOutline, searchOutline, bulbOutline, closeCircleOutline } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import api from '../../services/api'; 
import './Autores.css'; 

const Autores: React.FC = () => {
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
  const [isEditing, setIsEditing] = useState(false);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [formData, setFormData] = useState<any>({ 
    Autor_ID: null, NombreAutor: '', ApellidosAutor: '', Seudonimo: '', 
    TipoAutor: 'Personal', Nacionalidad: '', Bibliografia: '', Email: '', Telefono: ''
  });

  // APAGAR EL FOQUITO JUSTO AL SALIR DEL MÓDULO (Evita caché de Ionic)
  useIonViewWillLeave(() => {
    setShowHelp(false);
  });

  // LIMPIEZA ABSOLUTA AL ENTRAR AL MÓDULO
  useIonViewWillEnter(() => {
    // Apagamos visuales síncronamente primero
    setShowHelp(false);
    setShowForm(false);
    setIsEditing(false);
    setSearchQuery('');
    setCurrentPage(1);
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
    setFormData({ 
      Autor_ID: null, NombreAutor: '', ApellidosAutor: '', Seudonimo: '', 
      TipoAutor: 'Personal', Nacionalidad: '', Bibliografia: '', Email: '', Telefono: ''
    });

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        await fetchPage(1, '');
      } catch (error) {
        console.error(error);
        setRecords([]);
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
      const res = await api.get(`/autores?page=${page}&search=${search}`, {
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
      setFormData({ ...record });
    } else {
      setIsEditing(false);
      setFormData({ 
        Autor_ID: null, NombreAutor: '', ApellidosAutor: '', Seudonimo: '', 
        TipoAutor: 'Personal', Nacionalidad: '', Bibliografia: '', Email: '', Telefono: ''
      });
    }
    setShowForm(true);
  };

  const saveRecord = async () => {
    if (!formData.NombreAutor || !formData.TipoAutor) {
      return showToast("Por favor, llena los campos obligatorios (*)", "danger");
    }
    if (formData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
      return showToast("Error: El formato del correo electrónico no es válido.", "danger");
    }
    if (formData.Telefono && !/^[\d\+\-\s\(\)]{7,20}$/.test(formData.Telefono)) {
      return showToast("Error: El teléfono debe tener entre 7 y 20 caracteres.", "danger");
    }

    setIsLoading(true);
    const payload = { ...formData };

    try {
      if (isEditing) await api.put(`/autores/${formData.Autor_ID}`, payload);
      else await api.post('/autores', payload);
      
      showToast(isEditing ? "¡Autor actualizado correctamente!" : "¡Autor registrado exitosamente!", "success");
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
      title: 'Eliminar Autor',
      message: '¿Estás seguro de eliminar este autor? Puede que tenga recursos asignados en el catálogo.',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await api.delete(`/autores/${id}`);
          fetchPage(currentPage);
          showToast("Autor eliminado exitosamente.", "success");
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
      const res = await api.get(`/autores?all=true&search=${searchQuery}`);
      const allData = res.data.data || [];
      const ws = XLSX.utils.json_to_sheet(allData.map((r: any) => ({
        'ID': r.Autor_ID, 
        'Nombre Completo': `${r.NombreAutor} ${r.ApellidosAutor || ''}`.trim(),
        'Seudónimo': r.Seudonimo || '-', 
        'Tipo': r.TipoAutor, 
        'Nacionalidad': r.Nacionalidad || '-',
        'Email': r.Email || '-', 
        'Teléfono': r.Telefono || '-'
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Autores'); 
      XLSX.writeFile(wb, `UPVE_Autores_Registros.xlsx`);
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
      const res = await api.get(`/autores?all=true&search=${searchQuery}`);
      const allData = res.data.data || [];
      const doc = new jsPDF('landscape'); 
      doc.text(`Directorio de Autores - UPVE`, 14, 15);
      autoTable(doc, { 
        startY: 20, 
        head: [['ID', 'Nombre Completo', 'Seudónimo', 'Tipo', 'Nacionalidad', 'Email', 'Teléfono']], 
        body: allData.map((r: any) => [
          r.Autor_ID, 
          `${r.NombreAutor} ${r.ApellidosAutor || ''}`.trim(), 
          r.Seudonimo || '-', 
          r.TipoAutor, 
          r.Nacionalidad || '-',
          r.Email || '-', 
          r.Telefono || '-'
        ]), 
        theme: 'grid', 
        headStyles: { fillColor: [88, 44, 131] } 
      });
      doc.save(`UPVE_Autores_Registros.pdf`);
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
      <IonContent className="autores-bg" style={{ position: 'relative' }}>
        
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
                <h3><IonIcon icon={bulbOutline} /> Guía de Búsqueda de Autores</h3>
                <IonIcon icon={closeCircleOutline} className="close-help-icon" onClick={() => setShowHelp(false)} />
              </div>
              <p>Escribe el dato directamente en la barra de búsqueda superior y presiona la lupa o la tecla Enter:</p>
              
              <table className="help-tooltip-table">
                <thead>
                  <tr><th>¿Qué deseas buscar?</th><th>Instrucción de búsqueda</th><th>Ejemplo de entrada</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Nombre</strong></td>
                    <td>Escribe el nombre real o apellidos del autor.</td>
                    <td><code className="code-badge">Garcia Marquez</code></td>
                  </tr>
                  <tr>
                    <td><strong>Seudónimo</strong></td>
                    <td>Escribe el alias o seudónimo del autor.</td>
                    <td><code className="code-badge">Gabo</code></td>
                  </tr>
                  <tr>
                    <td><strong>Tipo de Autor</strong></td>
                    <td>Filtra por clasificación escribiendo el tipo de autor.</td>
                    <td><code className="code-badge">Personal</code> o <code className="code-badge">Corporativo</code></td>
                  </tr>
                  <tr>
                    <td><strong>Nacionalidad</strong></td>
                    <td>Busca por el país de origen del autor.</td>
                    <td><code className="code-badge">Mexicana</code></td>
                  </tr>
                  <tr>
                    <td><strong>Email</strong></td>
                    <td>Busca por la dirección de correo electrónico.</td>
                    <td><code className="code-badge">ejemplo@gmail.com</code></td>
                  </tr>
                  <tr>
                    <td><strong>Teléfono</strong></td>
                    <td>Filtra introduciendo el número de teléfono.</td>
                    <td><code className="code-badge">6457243573</code></td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                💡 Tip: El buscador rastrea coincidencias en todos estos datos de forma automática.
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
        
        {/* NUEVO CONTENEDOR FLUIDO SIN 100VH */}
        <div className="autores-layout">
          
          <div className="header-autores">
            <div>
              <h1><IonIcon icon={personOutline} className="header-icon" /> Autores</h1>
              <p>Directorio de autores personales y corporativos de la biblioteca.</p>
            </div>
            <div className="header-actions">
              <IonButton fill="outline" color="danger" className="btn-export" onClick={exportToPDF} disabled={isLoading}><IonIcon icon={documentTextOutline} slot="start" /> PDF</IonButton>
              <IonButton fill="outline" color="success" className="btn-export" onClick={exportToExcel} disabled={isLoading}><IonIcon icon={gridOutline} slot="start" /> Excel</IonButton>
              <IonButton className="btn-nueva" onClick={() => showForm ? setShowForm(false) : openForm()} disabled={isLoading}><IonIcon icon={addOutline} slot="start" /> {showForm ? 'Cancelar' : 'Nuevo Autor'}</IonButton>
            </div>
          </div>

          <div className="searchbar-container">
            <IonSearchbar 
              placeholder="Buscar por nombre, seudónimo, nacionalidad, email o teléfono..."
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

            <span className="results-count">{totalRecords} autores encontrados</span>
          </div>

          {showForm && (
            <div className="autores-form-card">
              <h3 className="form-title">{isEditing ? 'Editar Autor' : 'Nuevo Autor'}</h3>
              
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>NOMBRE(S) *</label>
                  <input className="custom-input" value={formData.NombreAutor || ''} onChange={e => setFormData({...formData, NombreAutor: e.target.value})} maxLength={100} />
                </div>
                <div className="form-group flex-1">
                  <label>APELLIDOS</label>
                  <input className="custom-input" value={formData.ApellidosAutor || ''} onChange={e => setFormData({...formData, ApellidosAutor: e.target.value})} maxLength={100}/>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '15px' }}>
                <div className="form-group flex-1">
                  <label>SEUDÓNIMO (OPCIONAL)</label>
                  <input className="custom-input" value={formData.Seudonimo || ''} onChange={e => setFormData({...formData, Seudonimo: e.target.value})} maxLength={50}/>
                </div>
                <div className="form-group flex-1">
                  <label>TIPO DE AUTOR *</label>
                  <select className="custom-input select-input" value={formData.TipoAutor || ''} onChange={e => setFormData({...formData, TipoAutor: e.target.value})}>
                    <option value="Personal">Personal</option>
                    <option value="Corporativo">Corporativo / Institucional</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>NACIONALIDAD</label>
                  <input className="custom-input" value={formData.Nacionalidad || ''} onChange={e => setFormData({...formData, Nacionalidad: e.target.value})} maxLength={50}/>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '15px' }}>
                <div className="form-group flex-1">
                  <label>EMAIL</label>
                  <input className="custom-input" type="email" placeholder="ejemplo@correo.com" value={formData.Email || ''} onChange={e => setFormData({...formData, Email: e.target.value})} maxLength={100}/>
                </div>
                <div className="form-group flex-1">
                  <label>TELÉFONO</label>
                  <input 
                    className="custom-input" 
                    type="tel" 
                    placeholder="Ej: 6671234567" 
                    value={formData.Telefono || ''} 
                    onChange={e => {
                      // Filtro mágico: Borra todo lo que NO sea un número, +, -, espacio o paréntesis
                      const soloNumeros = e.target.value.replace(/[^\d\+\-\s\(\)]/g, '');
                      setFormData({...formData, Telefono: soloNumeros});
                    }} 
                    maxLength={20}
                  />
                </div>
                <div className="form-group flex-2">
                  <label>NOTAS BIOGRÁFICAS / BIBLIOGRAFÍA</label>
                  <input className="custom-input" value={formData.Bibliografia || ''} onChange={e => setFormData({...formData, Bibliografia: e.target.value})} />
                </div>
                <div className="form-group align-bottom">
                  <button className="btn-guardar-inline" onClick={saveRecord} disabled={isLoading}>GUARDAR</button>
                </div>
              </div>
            </div>
          )}

          <div className="autores-table-card">
            <div className="table-responsive">
              <table className="tabla-dinamica">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '30px' }}>ID</th>
                    <th>NOMBRE COMPLETO</th>
                    <th>SEUDÓNIMO</th>
                    <th>TIPO</th>
                    <th>NACIONALIDAD</th>
                    <th>EMAIL</th>
                    <th>TELÉFONO</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.Autor_ID}>
                      <td style={{ paddingLeft: '30px', fontWeight: '500' }}>{r.Autor_ID}</td>
                      <td style={{ fontWeight: 'bold', color: '#111827' }}>{r.NombreAutor} {r.ApellidosAutor || ''}</td>
                      <td>{r.Seudonimo || '-'}</td>
                      <td><span className="badge-tipo">{r.TipoAutor}</span></td>
                      <td>{r.Nacionalidad || '-'}</td>
                      <td>{r.Email || '-'}</td>
                      <td>{r.Telefono || '-'}</td>
                      <td style={{ textAlign: 'center', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', gap: '8px' }}>
                          <IonButton className="btn-action btn-edit" fill="clear" onClick={() => openForm(r)} disabled={isLoading}><IonIcon icon={createOutline} /></IonButton>
                          <IonButton className="btn-action btn-delete" fill="clear" onClick={() => handleDelete(r.Autor_ID)} disabled={isLoading}><IonIcon icon={trashOutline} /></IonButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && !isLoading && (
                    <tr><td colSpan={8} className="empty-state">No hay autores registrados o que coincidan con la búsqueda.</td></tr>
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

export default Autores;
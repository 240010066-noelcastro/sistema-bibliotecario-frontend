import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage, IonIcon, IonButton, IonSearchbar, useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { documentTextOutline, gridOutline, addOutline, createOutline, trashOutline, libraryOutline, barcodeOutline, chevronBackOutline, chevronForwardOutline, checkmarkCircleOutline, warningOutline, searchOutline, bulbOutline, closeCircleOutline } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import api from '../../services/api'; 
import './Inventario.css'; 

const Inventario: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // RESTAURADO: El valor por defecto vuelve a ser 'Todos'
  const [filtroBaja, setFiltroBaja] = useState('Todos');
  
  const [isInitialLoading, setIsInitialLoading] = useState(true); 
  const [isProcessing, setIsProcessing] = useState(false); 
  
  const [showHelp, setShowHelp] = useState(false); // ESTADO DEL FOQUITO

  const [records, setRecords] = useState<any[]>([]);
  const [catalogoDB, setCatalogoDB] = useState<any[]>([]); 
  const [isEditing, setIsEditing] = useState(false);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal y Toast
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: () => {} });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const [formData, setFormData] = useState<any>({ 
    Unidad_ID: '', Recurso_ID: '', EstadoFisicoInicial: 'Bueno', EstadoDisponibilidad: 'Disponible'
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useIonViewWillLeave(() => {
    setShowHelp(false);
  });

  // LIMPIEZA ABSOLUTA AL ENTRAR AL MÓDULO
  useIonViewWillEnter(() => {
    setShowHelp(false);
    setShowForm(false);
    setIsEditing(false);
    setSearchQuery('');
    setFiltroBaja('Todos'); // RESTAURADO
    setCurrentPage(1);
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
    setFormData({ Unidad_ID: '', Recurso_ID: '', EstadoFisicoInicial: 'Bueno', EstadoDisponibilidad: 'Disponible' });

    const fetchInitialData = async () => {
      setIsInitialLoading(true);
      try {
        await fetchPage(1, '', 'Todos'); // RESTAURADO
        const resCat: any = await api.get('/catalogo?all=true');
        setCatalogoDB(Array.isArray(resCat.data?.data) ? resCat.data.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchInitialData();
  });

  // FUNCIÓN PRINCIPAL DE BÚSQUEDA
  const fetchPage = async (page: number, search = searchQuery, baja = filtroBaja) => {
    setIsProcessing(true); 
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const res = await api.get(`/inventario?page=${page}&search=${search}&filtroBaja=${baja}`, {
          signal: abortControllerRef.current.signal
      });
      setRecords(res.data.data.data || []);
      setCurrentPage(res.data.data.current_page);
      setLastPage(res.data.data.last_page);
      setTotalRecords(res.data.data.total);
      setIsProcessing(false); 
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.message !== 'canceled') {
          console.error(err);
          setIsProcessing(false); 
      }
    }
  };

  // Función para disparar la búsqueda solo al hacer clic en la lupa o dar Enter
  const handleSearch = () => {
    fetchPage(1, searchQuery, filtroBaja);
  };

  const openForm = (record?: any) => {
    if (record) {
      setIsEditing(true);
      // Al editar, le ponemos el título que ya traía de la BD para que se vea en el input
      setFormData({ ...record, TituloCatalogoBuscado: `${record.Titulo} (${record.TipoRecurso})` });
    } else {
      setIsEditing(false);
      setFormData({ Unidad_ID: '', Recurso_ID: '', EstadoFisicoInicial: 'Bueno', EstadoDisponibilidad: 'Disponible', TituloCatalogoBuscado: '' });
    }
    setShowForm(true);
  };

  const saveRecord = async () => {
    if (!formData.Unidad_ID || !formData.Recurso_ID || !formData.EstadoFisicoInicial || !formData.EstadoDisponibilidad) {
      return showToast("Por favor, llena todos los campos obligatorios (*)", "danger");
    }
    setIsProcessing(true); 
    try {
      if (isEditing) await api.put(`/inventario/${formData.Unidad_ID}`, formData);
      else await api.post('/inventario', formData);
      
      showToast(isEditing ? "¡Unidad física actualizada!" : "¡Unidad registrada exitosamente!", "success");
      setShowForm(false);
      await fetchPage(currentPage, searchQuery, filtroBaja); 
    } catch (error: any) {
      if(error.response?.status === 422) showToast("Error: Es posible que ese Código de Unidad ya exista en el sistema.", "danger");
      else showToast("Error en el servidor al guardar el registro.", "danger");
      setIsProcessing(false); 
    } 
  };

  const handleDelete = (id: any) => {
    setConfirmDialog({
      show: true,
      title: 'Eliminar Registro',
      message: `¿Estás seguro de eliminar la unidad física ${id}? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
        setIsProcessing(true); 
        try {
          await api.delete(`/inventario/${id}`);
          await fetchPage(currentPage, searchQuery, filtroBaja);
          showToast("Unidad física eliminada exitosamente.", "success");
        } catch (error) { 
          showToast("No se pudo eliminar la unidad física.", "danger"); 
          setIsProcessing(false); 
        } 
      }
    });
  };

  const getDisponibilidadBadge = (estado: string) => {
      switch(estado) {
          case 'Disponible': return 'badge-disp disponible';
          case 'Prestado': return 'badge-disp prestado';
          case 'Mantenimiento': return 'badge-disp mantenimiento';
          case 'Extraviado': return 'badge-disp extraviado';
          case 'Baja': return 'badge-disp baja';
          default: return 'badge-disp';
      }
  };

  const exportToExcel = async () => {
    setIsProcessing(true); 
    try {
        const res = await api.get(`/inventario?all=true&search=${searchQuery}&filtroBaja=${filtroBaja}`);
        const allData = res.data.data || [];
        const ws = XLSX.utils.json_to_sheet(allData.map((r: any) => ({
        'ID': r.Recurso_ID, 'Código Unidad': r.Unidad_ID, 'Título del Recurso': r.Titulo, 'Tipo de Recurso': r.TipoRecurso,
        'Estado Físico': r.EstadoFisicoInicial, 'Disponibilidad': r.EstadoDisponibilidad
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventario'); 
        XLSX.writeFile(wb, `UPVE_Inventario_Fisico.xlsx`);
        showToast("¡Excel descargado exitosamente!", "success");
    } catch (error) {
        showToast("Hubo un problema al exportar el archivo.", "danger");
    } finally {
        setIsProcessing(false);
    }
  };

  const exportToPDF = async () => {
    setIsProcessing(true); 
    try {
        const res = await api.get(`/inventario?all=true&search=${searchQuery}&filtroBaja=${filtroBaja}`);
        const allData = res.data.data || [];
        const doc = new jsPDF();
        doc.text(`Inventario Físico - UPVE`, 14, 15);
        autoTable(doc, { 
            startY: 20, 
            head: [['ID', 'Código Unidad', 'Título', 'Tipo', 'Estado Físico', 'Disponibilidad']], 
            body: allData.map((r: any) => [r.Recurso_ID, r.Unidad_ID, r.Titulo, r.TipoRecurso, r.EstadoFisicoInicial, r.EstadoDisponibilidad]),
            theme: 'grid', 
            headStyles: { fillColor: [88, 44, 131] } 
        });
        doc.save(`UPVE_Inventario_Fisico.pdf`);
        showToast("¡PDF descargado exitosamente!", "success");
    } catch (error) {
        showToast("Hubo un problema al exportar el archivo.", "danger");
    } finally {
        setIsProcessing(false);
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
      {(isInitialLoading || isProcessing) && (
          <div className="main-loader-overlay">
              <div className="main-loader-spinner"></div>
              <p>{isInitialLoading ? 'Cargando módulo...' : 'Procesando...'}</p>
          </div>
      )}

      <IonContent className="inventario-bg relative-position">

        <div className={`toast-notification ${toast.show ? 'show' : ''} ${toast.type}`}>
            <IonIcon icon={toast.type === 'success' ? checkmarkCircleOutline : warningOutline} />
            <span>{toast.message}</span>
        </div>

        {confirmDialog.show && (
            <div className="pdf-modal-overlay">
                <div className="pdf-modal-content" style={{maxWidth: '400px'}}>
                    <h3 style={{color: '#ef4444', marginBottom: '10px'}}>{confirmDialog.title}</h3>
                    <p style={{color: '#4b5563', fontSize: '14px', lineHeight: '1.5', marginBottom: '25px'}}>{confirmDialog.message}</p>
                    <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                        <button className="btn-pdf-text" onClick={() => setConfirmDialog({show: false, title: '', message: '', onConfirm: () => {}})}>Cancelar</button>
                        <button className="btn-pdf-img" style={{backgroundColor: '#ef4444'}} onClick={confirmDialog.onConfirm}>Sí, eliminar</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL INFORMATIVO (FOQUITO) */}
        {showHelp && (
          <div className="help-tooltip-overlay" onClick={() => setShowHelp(false)}>
            <div className="help-tooltip-content" onClick={e => e.stopPropagation()}>
              <div className="help-tooltip-header">
                <h3><IonIcon icon={bulbOutline} /> Guía de Búsqueda de Inventario</h3>
                <IonIcon icon={closeCircleOutline} className="close-help-icon" onClick={() => setShowHelp(false)} />
              </div>
              <p>El buscador escanea de forma global los registros de las unidades. Escribe tu búsqueda y presiona la lupa o la tecla Enter:</p>
              
              <table className="help-tooltip-table">
                <thead>
                  <tr><th>¿Qué deseas buscar?</th><th>Instrucción de búsqueda</th><th>Ejemplo de entrada</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Código de Unidad</strong></td><td>Escribe el identificador único o etiqueta física.</td><td><code className="code-badge">1434</code> o <code className="code-badge">445-001</code></td></tr>
                  <tr><td><strong>Título del Recurso</strong></td><td>Busca por el nombre del libro, equipo, tesis, etc.</td><td><code className="code-badge">Álgebra</code></td></tr>
                  <tr><td><strong>Tipo de Recurso</strong></td><td>Filtra escribiendo a qué módulo pertenece.</td><td><code className="code-badge">Libro</code> o <code className="code-badge">Tesis</code></td></tr>
                  <tr><td><strong>Estado Físico</strong></td><td>Busca por la condición física de la copia.</td><td><code className="code-badge">Bueno</code> o <code className="code-badge">Dañado</code></td></tr>
                  <tr><td><strong>Disponibilidad</strong></td><td>Escribe la situación actual en almacén.</td><td><code className="code-badge">Prestado</code> o <code className="code-badge">Disponible</code></td></tr>
                </tbody>
              </table>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                💡 Tip: El filtro de "Bajas" del menú desplegable de al lado siempre se aplicará junto a tu búsqueda de texto de forma combinada.
              </p>
            </div>
          </div>
        )}
        
        <div className="inventario-layout">
          
          <div className="main-top-header">
            <div>
              <h1><IonIcon icon={libraryOutline} className="header-icon" /> Inventario Físico</h1>
              <p>Control de etiquetas y copias físicas de los recursos del catálogo.</p>
            </div>
            <div className="header-actions">
              <IonButton fill="outline" color="danger" className="btn-export" onClick={exportToPDF} disabled={isProcessing}><IonIcon icon={documentTextOutline} slot="start" /> PDF</IonButton>
              <IonButton fill="outline" color="success" className="btn-export" onClick={exportToExcel} disabled={isProcessing}><IonIcon icon={gridOutline} slot="start" /> Excel</IonButton>
              <IonButton className="btn-nueva" onClick={() => showForm ? setShowForm(false) : openForm()} disabled={isProcessing}><IonIcon icon={addOutline} slot="start" /> {showForm ? 'Cancelar' : 'Registrar Unidad'}</IonButton>
            </div>
          </div>

          <div className="sticky-searchbar" style={{ justifyContent: 'space-between', gap: '15px' }}>
            
            {/* CONTENEDOR FLEX PRINCIPAL */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, width: '100%' }}>
              
              {/* 1. BUSCADOR EXPANDIDO */}
              <IonSearchbar 
                style={{ flex: 1, minWidth: '300px', padding: 0 }}
                placeholder="Buscar por código, título, tipo o estado..."
                value={searchQuery}
                onIonInput={(e: any) => {
                  const newValue = e.target.value || '';
                  setSearchQuery(newValue);
                  if (newValue.trim() === '') fetchPage(1, '', filtroBaja);
                }}
                onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
                onIonClear={() => {
                  setSearchQuery('');
                  fetchPage(1, '', filtroBaja);
                }}
                disabled={isProcessing || isInitialLoading}
              />

              {/* 2. FILTRO DE BAJAS */}
              <select 
                className="custom-input" 
                style={{ height: '42px', width: '165px', padding: '0 10px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}
                value={filtroBaja}
                onChange={e => {
                  setFiltroBaja(e.target.value);
                  fetchPage(1, searchQuery, e.target.value);
                }}
                disabled={isProcessing || isInitialLoading}
              >
                <option value="Todos">Mostrar Todo</option>
                <option value="Si">Baja</option>
                <option value="No">Sin Baja</option>
              </select>

              {/* 3. LUPA DE BÚSQUEDA */}
              <IonButton className="btn-buscar-lupa" onClick={handleSearch} disabled={isProcessing || isInitialLoading} style={{ margin: 0, height: '42px', width: '42px', '--border-radius': '10px' }}>
                <IonIcon icon={searchOutline} />
              </IonButton>

              {/* 4. FOQUITO DE AYUDA */}
              <button className="btn-bulb-help" onClick={() => setShowHelp(true)} title="Ver guía de búsqueda" style={{ flexShrink: 0, padding: '0 5px' }}>
                <IonIcon icon={bulbOutline} />
              </button>
            </div>

            {/* CONTADOR ALINEADO A LA DERECHA */}
            <span className="results-count" style={{ flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
              {totalRecords} unidades encontradas
            </span>
          </div>

          {showForm && (
            <div className="inventario-form-card">
              <h3 className="form-title">{isEditing ? 'Editar Unidad Física' : 'Registrar Nueva Unidad Física'}</h3>
              
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>CÓDIGO DE UNIDAD / ETIQUETA *</label>
                  <div style={{ position: 'relative' }}>
                    <IonIcon icon={barcodeOutline} style={{ position: 'absolute', top: '14px', left: '12px', color: '#6b7280', fontSize: '18px' }} />
                    <input className="custom-input" style={{ paddingLeft: '38px', backgroundColor: isEditing ? '#f3f4f6' : 'white' }} value={formData.Unidad_ID || ''} placeholder=" " disabled={isEditing} onChange={e => setFormData({...formData, Unidad_ID: e.target.value.toUpperCase()})} />
                  </div>
                  {isEditing && <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>El código de unidad no se puede modificar.</span>}
                </div>

                <div className="form-group flex-2" style={{ position: 'relative' }}>
                  <label>RECURSO DEL CATÁLOGO AL QUE PERTENECE *</label>
                  
                  {/* Este es el Input donde el usuario escribirá (guardamos el título solo para mostrarlo) */}
                  <input 
                    className="custom-input" 
                    placeholder="Escribe para buscar..."
                    value={formData.TituloCatalogoBuscado || ''} 
                    onChange={e => {
                        setFormData({...formData, TituloCatalogoBuscado: e.target.value, Recurso_ID: ''}); // Borra el ID si editan el texto
                    }} 
                    onFocus={() => setFormData({...formData, showSugerenciasCatalogo: true})}
                    onBlur={() => setTimeout(() => setFormData({...formData, showSugerenciasCatalogo: false}), 200)}
                  />

                  {/* El mensajito que avisa si ya está vinculado o no */}
                  {formData.Recurso_ID ? (
                      <span style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px', fontWeight: 'bold' }}>✅ Recurso vinculado (ID: {formData.Recurso_ID})</span>
                  ) : (
                      <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>Debes seleccionar una opción de la lista.</span>
                  )}

                  {/* La caja flotante con los resultados (igual que en los autores) */}
                  {formData.showSugerenciasCatalogo && formData.TituloCatalogoBuscado && (
                    <div className="sugerencias-box" style={{ position: 'absolute', top: '70px', left: 0, right: 0, background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                      {catalogoDB.filter(c => 
                          c.Titulo.toLowerCase().includes(formData.TituloCatalogoBuscado.toLowerCase()) || 
                          c.TipoRecurso.toLowerCase().includes(formData.TituloCatalogoBuscado.toLowerCase())
                      ).length > 0 ? (
                        catalogoDB.filter(c => 
                            c.Titulo.toLowerCase().includes(formData.TituloCatalogoBuscado.toLowerCase()) || 
                            c.TipoRecurso.toLowerCase().includes(formData.TituloCatalogoBuscado.toLowerCase())
                        ).map(cat => (
                          <div 
                            key={cat.Recurso_ID} 
                            style={{ padding: '12px 15px', fontSize: '13px', color: '#374151', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                            onMouseDown={() => { 
                                // Cuando eligen uno, guardamos el texto bonito y el ID verdadero
                                setFormData({
                                    ...formData, 
                                    TituloCatalogoBuscado: `${cat.Titulo} (${cat.TipoRecurso})`, 
                                    Recurso_ID: cat.Recurso_ID,
                                    showSugerenciasCatalogo: false 
                                }); 
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(88, 44, 131, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <strong>{cat.Titulo}</strong> <span style={{color: '#6b7280'}}>({cat.TipoRecurso})</span> - ID: {cat.Recurso_ID}
                          </div>
                        ))
                      ) : (
                          <div style={{ padding: '12px 15px', fontSize: '13px', color: '#ef4444', fontStyle: 'italic' }}>No hay coincidencias en el catálogo.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '15px' }}>
                <div className="form-group flex-1">
                  <label>ESTADO FÍSICO *</label>
                  <select className="custom-input select-input" value={formData.EstadoFisicoInicial || ''} onChange={e => setFormData({...formData, EstadoFisicoInicial: e.target.value})}>
                    <option value="Nuevo">Nuevo</option>
                    <option value="Bueno">Bueno</option>
                    <option value="Regular">Regular</option>
                    <option value="Malo / Dañado">Malo / Dañado</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>DISPONIBILIDAD ACTUAL *</label>
                  <select className="custom-input select-input" value={formData.EstadoDisponibilidad || ''} onChange={e => setFormData({...formData, EstadoDisponibilidad: e.target.value})}>
                    <option value="Disponible">Disponible en Estante</option>
                    <option value="Prestado">Prestado</option>
                    <option value="Mantenimiento">En Mantenimiento</option>
                    <option value="Extraviado">Extraviado</option>
                    <option value="Baja">Dado de Baja</option>
                  </select>
                </div>

                <div className="form-group align-bottom" style={{ flex: 1 }}>
                  <button className="btn-guardar-inline" onClick={saveRecord} disabled={isProcessing}>GUARDAR UNIDAD</button>
                </div>
              </div>
            </div>
          )}

          <div className="inventario-table-card">
            <div className="table-responsive">
              <table className="tabla-dinamica">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '30px' }}>ID</th>
                    <th>CÓDIGO UNIDAD</th>
                    <th>TÍTULO DEL RECURSO</th>
                    <th>TIPO</th>
                    <th>ESTADO FÍSICO</th>
                    <th style={{ textAlign: 'center' }}>DISPONIBILIDAD</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.Unidad_ID}>
                      <td style={{ paddingLeft: '30px', fontWeight: 'bold', color: '#6b7280' }}>
                        {r.Recurso_ID}
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#582c83', fontFamily: 'monospace', fontSize: '15px' }}>
                        {r.Unidad_ID}
                      </td>
                      <td style={{ color: '#374151', fontWeight: '500' }}>{r.Titulo}</td>
                      <td>{r.TipoRecurso}</td>
                      <td>{r.EstadoFisicoInicial}</td>
                      <td style={{ textAlign: 'center' }}><span className={getDisponibilidadBadge(r.EstadoDisponibilidad)}>{r.EstadoDisponibilidad}</span></td>
                      <td style={{ textAlign: 'center', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', gap: '8px' }}>
                          <IonButton className="btn-action btn-edit" fill="clear" onClick={() => openForm(r)} disabled={isProcessing}><IonIcon icon={createOutline} /></IonButton>
                          <IonButton className="btn-action btn-delete" fill="clear" onClick={() => handleDelete(r.Unidad_ID)} disabled={isProcessing}><IonIcon icon={trashOutline} /></IonButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr><td colSpan={7} className="empty-state">No hay copias físicas registradas o que coincidan con la búsqueda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="footer-card">
              <span className="total-registro-text">Página {currentPage} de {lastPage}</span>
              <div className="pagination-container">
                <button className="btn-page btn-page-nav" disabled={currentPage === 1 || isProcessing} onClick={() => fetchPage(currentPage - 1)}><IonIcon icon={chevronBackOutline} /></button>
                {getPageNumbers().map(pageNum => (
                  <button key={pageNum} className={`btn-page ${currentPage === pageNum ? 'active' : ''}`} disabled={isProcessing} onClick={() => fetchPage(pageNum)}>{pageNum}</button>
                ))}
                <button className="btn-page btn-page-nav" disabled={currentPage === lastPage || lastPage === 0 || isProcessing} onClick={() => fetchPage(currentPage + 1)}><IonIcon icon={chevronForwardOutline} /></button>
              </div>
            </div>

          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Inventario;
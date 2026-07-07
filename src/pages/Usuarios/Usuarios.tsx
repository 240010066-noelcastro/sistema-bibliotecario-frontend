import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage, IonIcon, IonButton, IonSearchbar, useIonViewWillEnter } from '@ionic/react';
import { documentTextOutline, gridOutline, addOutline, createOutline, trashOutline, peopleOutline, chevronBackOutline, chevronForwardOutline, checkmarkCircleOutline, warningOutline, searchOutline, bulbOutline, closeCircleOutline } from 'ionicons/icons';import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import api from '../../services/api'; 
import './Usuarios.css'; 

const Usuarios: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(true); 
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [showHelp, setShowHelp] = useState(false); // <-- ESTADO DEL TOOLTIP

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: () => {} });

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };
  
  const [records, setRecords] = useState<any[]>([]);
  const [gruposDB, setGruposDB] = useState<any[]>([]); 
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [formData, setFormData] = useState<any>({ 
    Usuario_ID: null, Matricula: '', NombreUsuario: '', ApellidoPaterno: '', ApellidoMaterno: '', 
    CorreoElectronico: '', Telefono: '', Grupo_ID: '', EstadoCuenta: 'Activo'
  });

  useIonViewWillEnter(() => {
    setShowForm(false);
    setIsEditing(false);
    setSearchQuery('');
    setCurrentPage(1);
    setRecords([]); 
    setShowHelp(false); 
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
    setFormData({ Usuario_ID: null, Matricula: '', NombreUsuario: '', ApellidoPaterno: '', ApellidoMaterno: '', CorreoElectronico: '', Telefono: '', Grupo_ID: '', EstadoCuenta: 'Activo' });

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const resGrupos = await api.get('/grupos?all=true');
        setGruposDB(resGrupos.data?.data || []);
        await fetchPage(1, '');
      } catch (error) {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  });

  const fetchPage = async (page: number, search = searchQuery) => {
    setIsLoading(true); 
    if (abortControllerRef.current) abortControllerRef.current.abort();
    
    const currentAbortController = new AbortController();
    abortControllerRef.current = currentAbortController;

    try {
      const res = await api.get(`/usuarios?page=${page}&search=${search}`, { signal: currentAbortController.signal });
      setRecords(res.data?.data?.data || []);
      setCurrentPage(res.data?.data?.current_page || 1);
      setLastPage(res.data?.data?.last_page || 1);
      setTotalRecords(res.data?.data?.total || 0);
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.message !== 'canceled') console.error("Error al cargar:", err);
    } finally {
      if (abortControllerRef.current === currentAbortController) setIsLoading(false);
    }
  };

  // Función para disparar la búsqueda solo al hacer clic en la lupa o dar Enter
  const handleSearch = () => {
    fetchPage(1, searchQuery);
  };

  const openForm = (record?: any) => {
    if (record) {
      setIsEditing(true);
      setFormData({ 
        Usuario_ID: record.Usuario_ID, Matricula: record.Matricula, NombreUsuario: record.NombreUsuario, 
        ApellidoPaterno: record.ApellidoPaterno, ApellidoMaterno: record.ApellidoMaterno || '', 
        CorreoElectronico: record.CorreoElectronico, Telefono: record.Telefono || '', 
        Grupo_ID: record.Grupo_ID || '', EstadoCuenta: record.EstadoCuenta 
      });
    } else {
      setIsEditing(false);
      setFormData({ Usuario_ID: null, Matricula: '', NombreUsuario: '', ApellidoPaterno: '', ApellidoMaterno: '', CorreoElectronico: '', Telefono: '', Grupo_ID: '', EstadoCuenta: 'Activo' });
    }
    setShowForm(true);
  };

  const saveRecord = async () => {
    if (!formData.Matricula || !formData.NombreUsuario || !formData.ApellidoPaterno || !formData.ApellidoMaterno || !formData.CorreoElectronico) {
      return showToast("Matrícula, Nombres y ambos Apellidos son obligatorios.", "danger");
    }
    if (!formData.CorreoElectronico.toLowerCase().endsWith('@upve.edu.mx')) {
      return showToast("El correo debe ser institucional (@upve.edu.mx).", "danger");
    }

    setIsLoading(true);
    const payload = { 
        ...formData, 
        Grupo_ID: formData.Grupo_ID ? parseInt(formData.Grupo_ID) : null,
        Telefono: formData.Telefono || 'S/N'
    };

    try {
      if (isEditing) await api.put(`/usuarios/${formData.Usuario_ID}`, payload);
      else await api.post('/usuarios', payload);
      
      showToast(isEditing ? "¡Usuario actualizado!" : "¡Usuario registrado exitosamente!", "success");
      setShowForm(false);
      fetchPage(currentPage); 
    } catch (error: any) {
      showToast(error.response?.data?.message || "Error al guardar. Verifica que la Matrícula o Correo no estén duplicados.", "danger");
      setIsLoading(false);
    }
  };

  const handleDelete = (id: any) => {
    setConfirmDialog({
      show: true, title: 'Eliminar Usuario', message: '¿Estás seguro? Solo se puede eliminar si no tiene préstamos activos o adeudos.',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await api.delete(`/usuarios/${id}`);
          fetchPage(currentPage);
          showToast("Usuario eliminado exitosamente.", "success");
        } catch (error: any) {
          showToast(error.response?.data?.message || "No se pudo eliminar el usuario.", "danger");
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
      const res = await api.get(`/usuarios?all=true&search=${searchQuery}`);
      const ws = XLSX.utils.json_to_sheet((res.data.data || []).map((r: any) => ({
        'ID': r.Usuario_ID, 'Matrícula': r.Matricula, 'Usuario': `${r.NombreUsuario} ${r.ApellidoPaterno} ${r.ApellidoMaterno || ''}`.trim(),
        'Correo': r.CorreoElectronico, 'Teléfono': r.Telefono, 'Grupo': r.NombreGrupo || 'N/A', 'Estado': r.EstadoCuenta
      })));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Usuarios'); XLSX.writeFile(wb, `UPVE_Usuarios.xlsx`);
      showToast("¡Excel descargado exitosamente!", "success");
    } catch (error) { showToast("Hubo un problema al exportar el archivo.", "danger"); } finally { setIsLoading(false); }
  };

  const exportToPDF = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/usuarios?all=true&search=${searchQuery}`);
      const doc = new jsPDF('landscape'); doc.text(`Directorio de Usuarios - UPVE`, 14, 15);
      autoTable(doc, { 
        startY: 20, 
        head: [['ID', 'Matrícula', 'Usuario', 'Correo', 'Teléfono', 'Grupo / Carrera', 'Estado']], 
        body: (res.data.data || []).map((r: any) => [
          r.Usuario_ID, 
          r.Matricula, 
          `${r.NombreUsuario} ${r.ApellidoPaterno} ${r.ApellidoMaterno || ''}`.trim(), 
          r.CorreoElectronico, 
          r.Telefono, 
          r.NombreGrupo ? `${r.NombreGrupo}\n${r.NombreCarrera}` : 'N/A', 
          r.EstadoCuenta
        ]), 
        theme: 'grid', 
        headStyles: { fillColor: [88, 44, 131] },
        rowPageBreak: 'avoid' 
      });
      doc.save(`UPVE_Usuarios.pdf`);
      showToast("¡PDF descargado exitosamente!", "success");
    } catch (error) { showToast("Hubo un problema al exportar el archivo.", "danger"); } finally { setIsLoading(false); }
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
      <IonContent className="usuarios-bg" style={{ position: 'relative' }}>
        
        {isLoading && (<div className="main-loader-overlay"><div className="main-loader-spinner"></div><p>Cargando...</p></div>)}

        {/* TOOLTIP / MODAL INFORMATIVO EN EL FOQUITO */}
        {showHelp && (
          <div className="help-tooltip-overlay" onClick={() => setShowHelp(false)}>
            <div className="help-tooltip-content" onClick={e => e.stopPropagation()}>
              <div className="help-tooltip-header">
                <h3><IonIcon icon={bulbOutline} /> Guía de Búsqueda</h3>
                <IonIcon icon={closeCircleOutline} className="close-help-icon" onClick={() => setShowHelp(false)} />
              </div>
              <p>Simplemente escribe en la barra y presiona Enter o la lupa. El sistema buscará coincidencias automáticamente:</p>
              
              <table className="help-tooltip-table">
                <thead>
                  <tr><th>¿Qué deseas buscar?</th><th>Instrucción de búsqueda</th><th>Ejemplo de entrada</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Matrícula</strong></td>
                    <td>Teclea la matrícula numérica completa del alumno o número de empleado.</td>
                    <td><code className="code-badge">240010000</code></td>
                  </tr>
                  <tr>
                    <td><strong>Usuarios</strong></td>
                    <td>Escribe el nombre completo, solo un nombre o cualquiera de los apellidos del usuario.</td>
                    <td><code className="code-badge">Juan Lopez</code></td>
                  </tr>
                  <tr>
                    <td><strong>Correo</strong></td>
                    <td>Escribe la dirección del correo electrónico institucional.</td>
                    <td><code className="code-badge">ejemplo@upve.edu.mx</code></td>
                  </tr>
                  <tr>
                    <td><strong>Teléfono </strong></td>
                    <td>Escribe el número telefónico del usuario.</td>
                    <td><code className="code-badge">6735364266</code></td>
                  </tr>
                  <tr>
                    <td><strong>Grupo</strong></td>
                    <td>Escribe la nomenclatura del grupo para ver a todos los alumnos inscritos en él.</td>
                    <td><code className="code-badge">TIID1-1</code></td>
                  </tr>
                  <tr>
                    <td><strong>Carrera</strong></td>
                    <td>Introduce las siglas oficiales de la carrera o una palabra clave de su nombre.</td>
                    <td><code className="code-badge">TIID</code> o <code className="code-badge">Tecnologías de la Información </code></td>
                  </tr>
                  <tr>
                    <td><strong>Estado de Cuenta</strong></td>
                    <td>Escribe textualmente "Activo" o "Inactivo" para filtrar las cuentas vigentes o bloqueadas.</td>
                    <td><code className="code-badge">Activo</code> o <code className="code-badge">Inactivo</code></td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                💡 Tip: La búsqueda es flexible. Escribir solo una parte del correo o del teléfono también arrojará resultados precisos.
              </p>
            </div>
          </div>
        )}

        <div className={`toast-notification ${toast.show ? 'show' : ''} ${toast.type}`}>
            <IonIcon icon={toast.type === 'success' ? checkmarkCircleOutline : warningOutline} /><span>{toast.message}</span>
        </div>

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

        <div className="usuarios-layout">
          <div className="header-usuarios">
            <div>
              <h1><IonIcon icon={peopleOutline} className="header-icon" /> Control de Usuarios</h1>
              <p>Gestión de estudiantes, docentes y personal para préstamos.</p>
            </div>
            <div className="header-actions">
              <IonButton fill="outline" color="danger" className="btn-export" onClick={exportToPDF} disabled={isLoading}><IonIcon icon={documentTextOutline} slot="start" /> PDF</IonButton>
              <IonButton fill="outline" color="success" className="btn-export" onClick={exportToExcel} disabled={isLoading}><IonIcon icon={gridOutline} slot="start" /> Excel</IonButton>
              <IonButton className="btn-nueva" onClick={() => showForm ? setShowForm(false) : openForm()} disabled={isLoading}><IonIcon icon={addOutline} slot="start" /> {showForm ? 'Cancelar' : 'Nuevo Usuario'}</IonButton>
            </div>
          </div>

          <div className="searchbar-container">
            <IonSearchbar 
              placeholder="Buscar por matrícula, nombre, apellidos, correo o grupo..." 
              value={searchQuery} 
              onIonInput={(e: any) => {
                const newValue = e.target.value || '';
                setSearchQuery(newValue);
                // Si el usuario borró todo con el teclado, recargamos la lista automáticamente
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

            <span className="results-count">{totalRecords} usuarios encontrados</span>
          </div>

          {showForm && (
            <div className="usuarios-form-card">
              <h3 className="form-title">{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              
              <div className="form-row margin-bottom-15">
                <div className="form-group flex-1"><label>MATRÍCULA / NÚM. EMPLEADO *</label><input className="custom-input" value={formData.Matricula} onChange={e => setFormData({...formData, Matricula: e.target.value})} maxLength={30} /></div>
                <div className="form-group flex-2"><label>NOMBRE(S) *</label><input className="custom-input" value={formData.NombreUsuario} onChange={e => setFormData({...formData, NombreUsuario: e.target.value})} maxLength={50} /></div>
              </div>
              
              <div className="form-row margin-bottom-15">
                <div className="form-group flex-1"><label>APELLIDO PATERNO *</label><input className="custom-input" value={formData.ApellidoPaterno} onChange={e => setFormData({...formData, ApellidoPaterno: e.target.value})} maxLength={50} /></div>
                <div className="form-group flex-1"><label>APELLIDO MATERNO *</label><input className="custom-input" value={formData.ApellidoMaterno} onChange={e => setFormData({...formData, ApellidoMaterno: e.target.value})} maxLength={50} /></div>
              </div>

              <div className="form-row margin-bottom-15">
                <div className="form-group flex-2"><label>CORREO ELECTRÓNICO *</label><input className="custom-input" type="email" value={formData.CorreoElectronico} onChange={e => setFormData({...formData, CorreoElectronico: e.target.value})} maxLength={100} /></div>
                <div className="form-group flex-1">
                    <label>TELÉFONO</label>
                    <input className="custom-input" value={formData.Telefono} maxLength={10} onChange={e => setFormData({...formData, Telefono: e.target.value.replace(/\D/g, '')})} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-2">
                    <label>GRUPO / CARRERA (Opcional)</label>
                    <select className="custom-input select-input" value={formData.Grupo_ID} onChange={e => setFormData({...formData, Grupo_ID: e.target.value})}>
                      <option value="">Ninguno (Maestros / Personal)</option>
                      {gruposDB.map((g) => <option key={g.Grupo_ID} value={g.Grupo_ID}>{g.NombreGrupo} - {g.NombreCarrera}</option>)}
                    </select>
                </div>
                <div className="form-group flex-1">
                    <label>ESTADO DE LA CUENTA *</label>
                    <select className="custom-input select-input" value={formData.EstadoCuenta} onChange={e => setFormData({...formData, EstadoCuenta: e.target.value})}>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo / Bloqueado</option>
                    </select>
                </div>
                <div className="form-group align-bottom flex-1">
                  <button className="btn-guardar-inline" onClick={saveRecord} disabled={isLoading}>GUARDAR</button>
                </div>
              </div>
            </div>
          )}

          <div className="usuarios-table-card">
            <div className="table-responsive">
              <table className="tabla-dinamica">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '30px' }}>ID</th>
                    <th>MATRÍCULA</th>
                    <th>USUARIO</th>
                    <th>CORREO</th>
                    <th>TELÉFONO</th>
                    <th>GRUPO / CARRERA</th>
                    <th style={{ textAlign: 'center' }}>ESTADO</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.Usuario_ID}>
                      <td style={{ paddingLeft: '30px', fontWeight: '500' }}>{r.Usuario_ID}</td>
                      <td style={{ fontWeight: 'bold' }}>{r.Matricula}</td>
                      
                      {/* NOMBRE CORRIDO EN UNA SOLA LÍNEA */}
                      <td style={{ fontWeight: 'bold', color: '#111827' }}>
                          {r.NombreUsuario} {r.ApellidoPaterno} {r.ApellidoMaterno}
                      </td>

                      <td style={{ color: '#582c83', fontWeight: '500', fontSize: '13px' }}>{r.CorreoElectronico}</td>
                      <td style={{ color: '#4b5563', fontSize: '13px' }}>{r.Telefono}</td>
                      <td>
                          {r.NombreGrupo ? (
                              <>
                                <div style={{fontWeight: '600'}}>{r.NombreGrupo}</div>
                                <div style={{fontSize: '11px', color: '#6b7280'}}>{r.NombreCarrera}</div>
                              </>
                          ) : <span style={{color: '#9ca3af', fontStyle: 'italic'}}>No asignado</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                          <span className={`badge-estado ${r.EstadoCuenta === 'Activo' ? 'activo' : 'inactivo'}`}>{r.EstadoCuenta}</span>
                      </td>
                      <td style={{ textAlign: 'center', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', gap: '8px' }}>
                          <IonButton className="btn-action btn-edit" fill="clear" onClick={() => openForm(r)} disabled={isLoading}><IonIcon icon={createOutline} /></IonButton>
                          <IonButton className="btn-action btn-delete" fill="clear" onClick={() => handleDelete(r.Usuario_ID)} disabled={isLoading}><IonIcon icon={trashOutline} /></IonButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && !isLoading && (
                    <tr><td colSpan={8} className="empty-state">No hay usuarios que coincidan con la búsqueda.</td></tr>
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

export default Usuarios;
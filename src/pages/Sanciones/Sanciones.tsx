import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage, IonIcon, IonButton, IonSearchbar, IonCheckbox, useIonViewWillEnter } from '@ionic/react';
import { 
  documentTextOutline, gridOutline, addOutline, 
  createOutline, trashOutline, alertCircleOutline,
  searchOutline, closeCircleOutline, checkmarkCircleOutline, warningOutline,
  chevronBackOutline, chevronForwardOutline, bulbOutline
} from 'ionicons/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import api from '../../services/api'; 
import './Sanciones.css'; 

const Sanciones: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos'); 
  
  // NUEVOS ESTADOS: Rango de Fechas Personalizado y Bajas
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroBaja, setFiltroBaja] = useState('Todos');

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false); 
  
  const [records, setRecords] = useState<any[]>([]);
  const [usuariosDB, setUsuariosDB] = useState<any[]>([]); 
  const [candidatosDB, setCandidatosDB] = useState<any[]>([]); 
  
  const [matriculaBuscada, setMatriculaBuscada] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: () => {} });

  // FECHAS ACTUALES PARA BLOQUEOS Y FILTROS
  const currentYear = new Date().getFullYear();
  const tzOffset = (new Date()).getTimezoneOffset() * 60000; 
  const todayDateString = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0]; // Fecha YYYY-MM-DD local

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const [formData, setFormData] = useState<any>({ 
    Sancion_ID: null,
    Usuario_ID: '',
    NombreEstudianteText: '',
    MatriculaText: '',
    DetallesPrestamo_ID: '',
    TipoSancion: 'Material Dañado', 
    MontoPago: '',
    EstadoSancion: 'Pendiente',
    FechaGeneracion: todayDateString, 
    FechaPago: '',                    
    Observaciones: '',
    DarDeBaja: false 
  });

  // MAGIA DE LIMPIEZA ABSOLUTA AL ENTRAR Y SALIR
  useIonViewWillEnter(() => {
    setShowHelp(false);
    setShowForm(false);
    setIsEditing(false);
    setMatriculaBuscada('');
    setSearchQuery('');
    setFiltroTipo('Todos');
    setFechaInicio('');
    setFechaFin('');
    setFiltroBaja('Todos');
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
    setCurrentPage(1);
    
    setFormData({ 
      Sancion_ID: null, Usuario_ID: '', NombreEstudianteText: '', MatriculaText: '', DetallesPrestamo_ID: '', 
      TipoSancion: 'Material Dañado', MontoPago: '', EstadoSancion: 'Pendiente', 
      FechaGeneracion: todayDateString, 
      FechaPago: '', 
      Observaciones: '', DarDeBaja: false 
    });

    const loadData = async () => {
        setIsInitialLoading(true);
        try {
            await fetchPage(1, '', 'Todos', '', '', 'Todos');
            const resCandidatos: any = await api.get('/sanciones/candidatos');
            setCandidatosDB(resCandidatos.data?.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsInitialLoading(false);
        }
    };
    loadData();
  });

  const fetchPage = async (page: number, search = searchQuery, tipo = filtroTipo, fInicio = fechaInicio, fFin = fechaFin, baja = filtroBaja) => {
    setIsProcessing(true); 
    try {
      const res: any = await api.get(`/sanciones?page=${page}&search=${search}&filtroTipo=${tipo}&fechaInicio=${fInicio}&fechaFin=${fFin}&filtroBaja=${baja}`);
      setRecords(res.data?.data?.data || []);
      setCurrentPage(res.data?.data?.current_page || 1);
      setLastPage(res.data?.data?.last_page || 1);
      setTotalRecords(res.data?.data?.total || 0);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setIsProcessing(false); 
    }
  };

  const handleSearch = () => {
    fetchPage(1, searchQuery, filtroTipo, fechaInicio, fechaFin, filtroBaja);
  };

  useEffect(() => {
    if (showForm && usuariosDB.length === 0) {
        api.get('/usuarios?all=true').then((res: any) => setUsuariosDB(res.data?.data || []));
    }
  }, [showForm]);

  const candidatoEncontrado = candidatosDB.find(c => String(c.Matricula).toLowerCase() === String(matriculaBuscada).toLowerCase());
  
  useEffect(() => {
      if (isEditing) return; 

      if (candidatoEncontrado) {
          const userLoans = candidatosDB.filter(c => String(c.Usuario_ID) === String(candidatoEncontrado.Usuario_ID));
          
          setFormData((prev: any) => ({ 
              ...prev, 
              Usuario_ID: candidatoEncontrado.Usuario_ID, 
              DetallesPrestamo_ID: prev.DetallesPrestamo_ID || (userLoans.length === 1 ? userLoans[0].DetallesPrestamo_ID : '') 
          }));
      } else {
          setFormData((prev: any) => ({ ...prev, Usuario_ID: '', DetallesPrestamo_ID: '' }));
      }
  }, [matriculaBuscada, candidatoEncontrado, candidatosDB, isEditing]);

  const openForm = (record?: any) => {
    setMatriculaBuscada('');
    if (record) {
      setIsEditing(true);
      setFormData({ 
        Sancion_ID: record.Sancion_ID,
        Usuario_ID: record.Usuario_ID,
        NombreEstudianteText: record.NombreEstudiante,
        MatriculaText: record.Matricula,
        DetallesPrestamo_ID: record.DetallesPrestamo_ID || '',
        TipoSancion: record.TipoSancion,
        MontoPago: record.MontoPago,
        EstadoSancion: record.EstadoSancion,
        FechaGeneracion: record.FechaGeneracion ? record.FechaGeneracion.split(' ')[0] : '',
        FechaPago: record.FechaPago ? record.FechaPago.split(' ')[0] : '', // NUEVO CARGADOR
        Observaciones: record.Observaciones || '',
        DarDeBaja: false,
        Unidad_ID_Temp: record.Unidad_ID,  
        Titulo_Temp: record.Titulo
      });
    } else {
      setIsEditing(false);
      setFormData({ 
        Sancion_ID: null, Usuario_ID: '', NombreEstudianteText: '', MatriculaText: '', DetallesPrestamo_ID: '',
        TipoSancion: 'Material Dañado', MontoPago: '', EstadoSancion: 'Pendiente', 
        FechaGeneracion: todayDateString,
        FechaPago: '', 
        Observaciones: '', DarDeBaja: false
      });
    }
    setShowForm(true);
  };

  const handleSelectCandidato = (e: any) => {
      const selectedId = e.target.value;
      const candidato = candidatosDB.find(c => String(c.DetallesPrestamo_ID) === String(selectedId));
      
      setFormData({
          ...formData,
          DetallesPrestamo_ID: selectedId,
          Usuario_ID: candidato ? candidato.Usuario_ID : ''
      });
  };

  const saveRecord = async () => {
    if (!formData.DetallesPrestamo_ID || !formData.TipoSancion || !formData.MontoPago || !formData.EstadoSancion || !formData.FechaGeneracion) {
      return showToast("Por favor, llena todos los campos obligatorios (*) incluyendo la fecha.", "danger");
    }

    // NUEVA VALIDACIÓN: Si está pagado, exigir la fecha de pago
    if (formData.EstadoSancion === 'Pagado' && !formData.FechaPago) {
      return showToast("Por favor, introduce la fecha en que se recibió el pago.", "danger");
    }

    // BLOQUEO ANTI-FUTURO EN AMBAS FECHAS
    if (formData.FechaGeneracion > todayDateString || (formData.EstadoSancion === 'Pagado' && formData.FechaPago > todayDateString)) {
      return showToast("Error: La fecha no puede ser posterior al día de hoy.", "danger");
    }

    setIsProcessing(true); 
    const payload = {
        Usuario_ID: formData.Usuario_ID, DetallesPrestamo_ID: formData.DetallesPrestamo_ID, TipoSancion: formData.TipoSancion,
        MontoPago: formData.MontoPago, EstadoSancion: formData.EstadoSancion, 
        FechaGeneracion: formData.FechaGeneracion,
        // NUEVO ATRIBUTO EN PAYLOAD:
        FechaPago: formData.EstadoSancion === 'Pagado' ? formData.FechaPago : null,
        Observaciones: formData.Observaciones, DarDeBaja: formData.DarDeBaja
    };

    try {
      if (isEditing) await api.put(`/sanciones/${formData.Sancion_ID}`, payload);
      else await api.post('/sanciones', payload);
      
      showToast(isEditing ? "¡Sanción actualizada!" : "¡Sanción registrada exitosamente!", "success");
      setShowForm(false);
      fetchPage(currentPage, searchQuery, filtroTipo, fechaInicio, fechaFin, filtroBaja); 
      
      api.get('/sanciones/candidatos').then((res: any) => setCandidatosDB(res.data?.data || []));
    } catch (error: any) {
      showToast("Error en el servidor al guardar el registro.", "danger");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (id: any) => {
    setConfirmDialog({
      show: true,
      title: 'Eliminar Sanción',
      message: '¿Estás seguro de eliminar este registro?',
      onConfirm: async () => {
        setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
        setIsProcessing(true);
        try {
          await api.delete(`/sanciones/${id}`);
          fetchPage(currentPage, searchQuery, filtroTipo, fechaInicio, fechaFin, filtroBaja);
          showToast("Sanción eliminada.", "success");
        } catch (error) {
          showToast("No se pudo eliminar la sanción.", "danger");
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const getEstadoBadgeClass = (estado: string) => {
      switch(estado) {
          case 'Pendiente': return 'badge-estado pendiente';
          case 'Pagado': return 'badge-estado pagado';
          case 'Condonado': return 'badge-estado condonado';
          default: return 'badge-estado';
      }
  };

  const exportToExcel = async () => {
    setIsProcessing(true); 
    try {
      const res = await api.get(`/sanciones?all=true&search=${searchQuery}&filtroTipo=${filtroTipo}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&filtroBaja=${filtroBaja}`);
      const ws = XLSX.utils.json_to_sheet((res.data.data || []).map((r:any) => ({
        ID: r.Sancion_ID,
        'Estudiante': r.NombreEstudiante,
        'Matrícula': r.Matricula,
        'Unidad': r.Unidad_ID || 'N/A',
        'Código / Recurso': `${r.Unidad_ID || 'N/A'} - ${r.Titulo || ''}`,
        'Tipo de Recurso': r.TipoRecurso || 'N/A',
        'Tipo de Sanción': r.TipoSancion,
        'Monto': `$${r.MontoPago}`,
        'Fecha Generación': r.FechaGeneracion ? r.FechaGeneracion.split(' ')[0] : '-',
        'Estado': r.EstadoSancion,
        'Dado de Baja': r.EstadoDisponibilidad === 'Baja' ? 'SÍ' : 'NO'
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sanciones'); 
      XLSX.writeFile(wb, `UPVE_Sanciones_Registros.xlsx`);
      showToast("¡Excel descargado exitosamente!", "success");
    } catch (error) {
      showToast("Hubo un problema al exportar el archivo.", "danger");
    } finally { setIsProcessing(false); }
  };

  const exportToPDF = async () => {
    setIsProcessing(true); 
    try {
      const res = await api.get(`/sanciones?all=true&search=${searchQuery}&filtroTipo=${filtroTipo}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&filtroBaja=${filtroBaja}`);
      const doc = new jsPDF('landscape');
      doc.text(`Historial de Sanciones - UPVE`, 14, 15);
      
      const headers = [['ID', 'Usuario', 'Matrícula', 'Código / Recurso', 'Tipo Sanción', 'Monto', 'Fecha', 'Estado', 'Baja']];
      const body = (res.data.data || []).map((r:any) => [
          r.Sancion_ID, 
          r.NombreEstudiante,
          r.Matricula, 
          `${r.Unidad_ID || 'S/N'} - ${r.Titulo || ''}`,
          r.TipoSancion, 
          `$${r.MontoPago}`, 
          r.FechaGeneracion ? r.FechaGeneracion.split(' ')[0] : '-',
          r.EstadoSancion,
          r.EstadoDisponibilidad === 'Baja' ? 'SÍ' : 'NO'
      ]);
      
      autoTable(doc, { startY: 20, head: headers, body: body, theme: 'grid', headStyles: { fillColor: [88, 44, 131] } });
      doc.save(`UPVE_Sanciones_Registros.pdf`);
      showToast("¡PDF descargado exitosamente!", "success");
    } catch (error) {
      showToast("Hubo un problema al exportar el archivo.", "danger");
    } finally { setIsProcessing(false); }
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

  const recursoSeleccionado = candidatosDB.find(c => String(c.DetallesPrestamo_ID) === String(formData.DetallesPrestamo_ID));

  return (
    <IonPage>
      {(isInitialLoading || isProcessing) && (
          <div className="main-loader-overlay">
              <div className="main-loader-spinner"></div>
              <p>{isInitialLoading ? 'Cargando módulo...' : 'Procesando...'}</p>
          </div>
      )}

      <IonContent className="sanciones-bg relative-position">
        
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

        {/* --- TOOLTIP MODAL INFORMATIVO (FOQUITO) --- */}
        {showHelp && (
          <div className="help-tooltip-overlay" onClick={() => setShowHelp(false)}>
            <div className="help-tooltip-content" onClick={e => e.stopPropagation()}>
              <div className="help-tooltip-header">
                <h3><IonIcon icon={bulbOutline} /> Guía de Búsqueda de Sanciones</h3>
                <IonIcon icon={closeCircleOutline} className="close-help-icon" onClick={() => setShowHelp(false)} />
              </div>
              <p>El buscador escanea de forma global los registros de las multas. Escribe tu criterio y presiona la lupa o la tecla Enter:</p>
              
              <table className="help-tooltip-table">
                <thead>
                  <tr><th>¿Qué deseas buscar?</th><th>Instrucción de búsqueda</th><th>Ejemplo de entrada</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Usuario</strong></td><td>Introduce el nombre o los apellidos del estudiante sancionado.</td><td><code className="code-badge">Noel Castro</code></td></tr>
                  <tr><td><strong>Matrícula</strong></td><td>Escribe la clave o matrícula única del alumno.</td><td><code className="code-badge">240010068</code></td></tr>
                  <tr><td><strong>Código / Recurso</strong></td><td>Introduce el código de unidad o el título del recurso.</td><td><code className="code-badge">212112</code> o <code className="code-badge">Tecnología</code></td></tr>
                  <tr><td><strong>Tipo Sanción</strong></td><td>Busca por el motivo/naturaleza de la multa.</td><td><code className="code-badge">Material Dañado</code></td></tr>
                  <tr><td><strong>Monto</strong></td><td>Introduce el costo numérico exacto del cargo.</td><td><code className="code-badge">100.00</code></td></tr>
                  <tr><td><strong>Fecha</strong></td><td>Filtra tecleando el año, mes o día de la infracción.</td><td><code className="code-badge">2026-05-29</code></td></tr>
                  <tr><td><strong>Estado</strong></td><td>Busca por la condición actual del cobro.</td><td><code className="code-badge">Pendiente</code> o <code className="code-badge">Pagado</code></td></tr>
                  <tr><td><strong>Baja</strong></td><td>Filtra si el libro dañado fue descartado del inventario.</td><td><code className="code-badge">SÍ</code> o <code className="code-badge">NO</code></td></tr>
                </tbody>
              </table>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                💡 Tip: Los selectores de filtrado avanzados superiores se combinarán automáticamente con el texto de búsqueda ingresado.
              </p>
            </div>
          </div>
        )}

        <div className="sanciones-layout">
          
          <div className="main-top-header">
            <div>
              <h1>
                <IonIcon icon={alertCircleOutline} className="header-icon" /> Sanciones (Multas)
              </h1>
              <p>Control de adeudos por pérdida o daño de material.</p>
            </div>
            <div className="header-actions">
              <IonButton fill="outline" color="danger" className="btn-export" onClick={exportToPDF} disabled={isProcessing}>
                <IonIcon icon={documentTextOutline} slot="start" /> PDF
              </IonButton>
              <IonButton fill="outline" color="success" className="btn-export" onClick={exportToExcel} disabled={isProcessing}>
                <IonIcon icon={gridOutline} slot="start" /> Excel
              </IonButton>
              <IonButton className="btn-nueva" onClick={() => showForm ? setShowForm(false) : openForm()} disabled={isProcessing}>
                <IonIcon icon={addOutline} slot="start" /> {showForm ? 'Cancelar' : 'Registrar Sanción'}
              </IonButton>
            </div>
          </div>

          <div className="sticky-searchbar flex-space-between" style={{ gap: '15px' }}>
            
            <div style={{display: 'flex', gap: '10px', flex: 1, alignItems: 'center'}}>
                
                {/* 1. BUSCADOR */}
                <IonSearchbar 
                style={{ flex: 1, minWidth: '200px', padding: 0 }}
                placeholder="Buscar matrícula, alumno, fecha..."
                value={searchQuery}
                onIonInput={(e: any) => {
                  const newValue = e.target.value || '';
                  setSearchQuery(newValue);
                  if (newValue.trim() === '') {
                    fetchPage(1, '', filtroTipo, fechaInicio, fechaFin, filtroBaja);
                  }
                }}
                onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
                onIonClear={() => {
                  setSearchQuery('');
                  fetchPage(1, '', filtroTipo, fechaInicio, fechaFin, filtroBaja);
                }}
                disabled={isProcessing || isInitialLoading}
                />

                {/* 2. SELECTOR DE TIPO */}
                <select 
                    className="custom-input" 
                    style={{ height: '44px', width: '150px', padding: '0 10px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
                    value={filtroTipo} 
                    onChange={e => {
                      setFiltroTipo(e.target.value);
                      fetchPage(1, searchQuery, e.target.value, fechaInicio, fechaFin, filtroBaja);
                    }}
                    disabled={isProcessing || isInitialLoading}
                >
                    <option value="Todos">Todos los recursos</option>
                    <option value="Libro">Libros</option>
                    <option value="Tesis">Tesis</option>
                    <option value="Revista / Artículo Científico">Revistas / Artículos</option>
                    <option value="Enciclopedia / Diccionario">Enciclopedias / Diccionarios</option>
                    <option value="Equipo de Cómputo">Equipo de Cómputo</option>
                    <option value="Equipo Audiovisual">Equipo Audiovisual</option>
                    <option value="Mobiliario Didáctico">Mobiliario Didáctico</option>
                    <option value="Dispositivo de Conectividad">Conectividad</option>
                </select>

                {/* 3. CONTENEDOR UNIFICADO DE FECHAS */}
                <div className="custom-input" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '44px', padding: '0 8px', color: '#4b5563', fontSize: '12px', fontWeight: 600, borderRadius: '10px', width: 'max-content', flexShrink: 0 }}>
                  <span>Desde:</span>
                  <input 
                    type="date" 
                    style={{ border: 'none', outline: 'none', background: 'transparent', color: '#374151', fontSize: '12px', width: '105px' }} 
                    value={fechaInicio}
                    onChange={e => {
                      setFechaInicio(e.target.value);
                      fetchPage(1, searchQuery, filtroTipo, e.target.value, fechaFin, filtroBaja);
                    }}
                    disabled={isProcessing || isInitialLoading}
                  />
                  <div style={{ height: '20px', width: '1px', backgroundColor: '#d1d5db', margin: '0 2px' }}></div>
                  <span>Hasta:</span>
                  <input 
                    type="date" 
                    style={{ border: 'none', outline: 'none', background: 'transparent', color: '#374151', fontSize: '12px', width: '105px' }} 
                    value={fechaFin}
                    onChange={e => {
                      setFechaFin(e.target.value);
                      fetchPage(1, searchQuery, filtroTipo, fechaInicio, e.target.value, filtroBaja);
                    }}
                    disabled={isProcessing || isInitialLoading}
                  />
                </div>

                {/* 4. SELECTOR BAJA */}
                <select 
                  className="custom-input" 
                  style={{ height: '44px', width: '145px', padding: '0 10px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
                  value={filtroBaja}
                  onChange={e => {
                    setFiltroBaja(e.target.value);
                    fetchPage(1, searchQuery, filtroTipo, fechaInicio, fechaFin, e.target.value);
                  }}
                  disabled={isProcessing || isInitialLoading}
                >
                  <option value="Todos">Bajas: Mostrar Todo</option>
                  <option value="Si">Solo Dados de Baja</option>
                  <option value="No">Sin Baja</option>
                </select>

                {/* 5. LUPA DE BÚSQUEDA */}
                <IonButton className="btn-buscar-lupa" onClick={handleSearch} disabled={isProcessing || isInitialLoading} style={{ margin: 0, height: '44px', '--border-radius': '10px' }}>
                  <IonIcon icon={searchOutline} />
                </IonButton>

                {/* 6. FOQUITO DE AYUDA */}
                <button className="btn-bulb-help" onClick={() => setShowHelp(true)} title="Ver guía de búsqueda" style={{ flexShrink: 0, padding: '0 5px' }}>
                  <IonIcon icon={bulbOutline} />
                </button>
            </div>

            <span className="results-count" style={{ marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {totalRecords} encontrados
            </span>
          </div>

          {showForm && (
            <div className="sanciones-form-card">
              <h3 className="form-title">
                {isEditing ? 'Editar Sanción' : 'Nueva Sanción'}
              </h3>
              
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>ESTUDIANTE / USUARIO SANCIONADO * {isEditing && <span style={{color: '#ef4444'}}>(Bloqueado)</span>}</label>
                  {isEditing ? (
                    <input className="custom-input" disabled value={`${formData.NombreEstudianteText} (${formData.MatriculaText})`} />
                  ) : (
                    <div className="flex-column gap-8">
                      {candidatoEncontrado ? (
                        <div className="user-selected-box">
                          <span>✅ Seleccionado: {candidatoEncontrado.NombreEstudiante}</span>
                          <IonIcon icon={closeCircleOutline} className="icon-action icon-success" onClick={() => {setMatriculaBuscada(''); setFormData({...formData, DetallesPrestamo_ID: ''})}} title="Quitar selección" />
                        </div>
                      ) : (
                        <>
                          <div className="relative-position">
                            <IonIcon icon={searchOutline} className="input-icon" />
                            <input className="custom-input input-with-icon border-purple" placeholder="Buscar Matrícula" value={matriculaBuscada} onChange={(e) => setMatriculaBuscada(e.target.value)} />
                          </div>
                          {matriculaBuscada.length > 3 && !candidatoEncontrado && (
                            <div className="user-not-found-box">
                              <span>❌ El alumno no tiene recursos activos/atrasados sin sancionar.</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group flex-1">
                  <label>TIPO DE SANCIÓN *</label>
                  <select 
                    className="custom-input select-input" 
                    value={formData.TipoSancion || ''} 
                    onChange={e => setFormData({...formData, TipoSancion: e.target.value})}
                  >
                    <option value="Material Dañado">Material Dañado</option>
                    <option value="Material Extraviado">Material Extraviado</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '15px' }}>
                <div className="form-group flex-2">
                  <label>SELECCIONAR RECURSO ATRASADO / PRESTADO *</label>
                  <select 
                    className="custom-input select-input" 
                    value={formData.DetallesPrestamo_ID || ''} 
                    onChange={handleSelectCandidato}
                    disabled={isEditing || !candidatoEncontrado}
                  >
                    <option value="" disabled>Seleccione el libro dañado/extraviado...</option>
                    {isEditing && formData.DetallesPrestamo_ID && !candidatosDB.find(c => c.DetallesPrestamo_ID === formData.DetallesPrestamo_ID) && (
                        <option value={formData.DetallesPrestamo_ID}>Código: {formData.Unidad_ID_Temp} - {formData.Titulo_Temp}</option>
                    )}
                    {candidatosDB.filter(c => String(c.Usuario_ID) === String(formData.Usuario_ID)).map((c) => (
                      <option key={c.DetallesPrestamo_ID} value={c.DetallesPrestamo_ID}>
                         Código: {c.Unidad_ID} - {c.Titulo}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group flex-1">
                  <label>RECURSO VINCULADO</label>
                  <input 
                    className="custom-input" 
                    disabled 
                    value={
                        isEditing 
                        ? `${formData.Unidad_ID_Temp || 'S/N'} - ${formData.Titulo_Temp || ''}` 
                        : (recursoSeleccionado ? `${recursoSeleccionado.Unidad_ID} - ${recursoSeleccionado.Titulo}` : 'Sin asignar...')
                    } 
                    style={{backgroundColor: '#f9fafb', color: '#6b7280', fontWeight: 'bold'}}
                  />
                </div>

                <div className="form-group flex-1">
                  <label>MONTO (MXN) *</label>
                  <input 
                    className="custom-input" 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.MontoPago} 
                    onChange={e => setFormData({...formData, MontoPago: e.target.value})} 
                    onBlur={e => {
                        if (e.target.value) {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                                setFormData({...formData, MontoPago: val.toFixed(2)});
                            }
                        }
                    }}
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '15px' }}>
                
                <div className="form-group flex-1">
                  <label>ESTADO DE PAGO *</label>
                  <select 
                    className="custom-input select-input" 
                    value={formData.EstadoSancion || ''} 
                    onChange={e => {
                      const nuevoEstado = e.target.value;
                      setFormData({
                        ...formData,
                        EstadoSancion: nuevoEstado,
                        // Si es Pagado o Condonado, le asignamos la fecha de hoy automáticamente
                        FechaPago: ['Pagado', 'Condonado'].includes(nuevoEstado) ? todayDateString : ''
                      });
                    }}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Pagado">Pagado</option>
                    <option value="Condonado">Condonado (Perdonado)</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>FECHA DE GENERACIÓN *</label>
                  <input 
                    className="custom-input" 
                    type="date" 
                    max={todayDateString} 
                    value={formData.FechaGeneracion} 
                    disabled={true} // BLINDADO: El sistema ya asigna la fecha real de creación
                    style={{ backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }} // Estilo visual de bloqueo
                    onChange={e => setFormData({...formData, FechaGeneracion: e.target.value})} 
                  />
                </div>

                {/* CORREGIDO: Se muestra si es Pagado o Condonado, y es de lectura protegida */}
                {['Pagado', 'Condonado'].includes(formData.EstadoSancion) && (
                  <div className="form-group flex-1">
                    <label>
                      {formData.EstadoSancion === 'Pagado' ? "FECHA DE PAGO *" : "FECHA DE CONDONACIÓN *"}
                    </label>
                    <input 
                      className="custom-input" 
                      type="date" 
                      max={todayDateString} 
                      disabled={true} // BLINDADO: Evita alteraciones manuales
                      style={{ backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
                      value={formData.FechaPago || ''} 
                      onChange={e => setFormData({...formData, FechaPago: e.target.value})} 
                    />
                  </div>
                )}
                
                <div className="form-group flex-2">
                  <label>OBSERVACIONES</label>
                  <input 
                    className="custom-input" 
                    placeholder="Detalles sobre la multa o daño..."
                    value={formData.Observaciones} 
                    onChange={e => setFormData({...formData, Observaciones: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="form-row" style={{ marginTop: '15px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div className="form-group flex-1">
                    {!isEditing && formData.DetallesPrestamo_ID && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f3e8ff', padding: '10px 15px', borderRadius: '8px', border: '1px solid #7c3aed' }}>
                            <IonCheckbox 
                                checked={formData.DarDeBaja} 
                                onIonChange={e => setFormData({...formData, DarDeBaja: e.detail.checked})} 
                                style={{ '--checkbox-background-checked': '#582c83', '--border-color': '#582c83', '--checkmark-color': '#ffffff' }}
                            />
                            <label style={{ margin: 0, color: '#582c83', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setFormData({...formData, DarDeBaja: !formData.DarDeBaja})}>
                                Dar de baja el recurso del inventario (No disponible)
                            </label>
                        </div>
                    )}
                </div>

                <div className="form-group align-bottom">
                  <button className="btn-guardar-inline" onClick={saveRecord} disabled={isProcessing}>
                    GUARDAR
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="sanciones-table-card">
            <div className="table-responsive">
              <table className="tabla-dinamica">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '30px' }}>ID</th>
                    <th>USUARIO</th>
                    <th>MATRÍCULA</th>
                    <th>CÓDIGO / RECURSO</th>
                    <th>TIPO SANCIÓN</th>
                    <th>MONTO</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>FECHA</th>
                    <th style={{ textAlign: 'center' }}>ESTADO</th>
                    <th style={{ textAlign: 'center' }}>BAJA</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.Sancion_ID}>
                      <td style={{ paddingLeft: '30px', fontWeight: '500', verticalAlign: 'middle' }}>{r.Sancion_ID}</td>
                      <td style={{ fontWeight: 'bold', color: '#111827', verticalAlign: 'middle' }}>{r.NombreEstudiante}</td>
                      <td style={{ verticalAlign: 'middle' }}>{r.Matricula}</td>
                      
                      <td style={{ color: '#582c83', fontWeight: '600', verticalAlign: 'middle' }}>
                          <span style={{color: '#6b7280', fontWeight: 'normal'}}>
                             {r.Unidad_ID || 'S/N'} - 
                          </span> {r.Titulo || ''}
                      </td>
                      
                      <td style={{ verticalAlign: 'middle' }}>{r.TipoSancion}</td>
                      <td style={{ fontWeight: 'bold', color: '#374151', verticalAlign: 'middle' }}>${r.MontoPago}</td>
                      
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '13px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                        {r.FechaGeneracion ? r.FechaGeneracion.split(' ')[0] : '-'}
                      </td>

                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span className={getEstadoBadgeClass(r.EstadoSancion)}>
                          {r.EstadoSancion}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {r.EstadoDisponibilidad === 'Baja' ? (
                            <span className="badge-estado pendiente">SÍ</span>
                        ) : (
                            <span className="badge-estado condonado">NO</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', gap: '8px' }}>
                            <IonButton className="btn-action btn-edit" fill="clear" onClick={() => openForm(r)} title="Editar" disabled={isProcessing}><IonIcon icon={createOutline} /></IonButton>
                            <IonButton className="btn-action btn-delete" fill="clear" onClick={() => handleDelete(r.Sancion_ID)} title="Eliminar" disabled={isProcessing}><IonIcon icon={trashOutline} /></IonButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr><td colSpan={10} className="empty-state">No hay sanciones registradas en este filtro.</td></tr>
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

export default Sanciones;
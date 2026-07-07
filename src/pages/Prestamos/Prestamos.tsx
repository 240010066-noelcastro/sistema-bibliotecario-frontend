import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage, IonIcon, IonButton, IonSearchbar, useIonViewWillEnter } from '@ionic/react';
import { documentTextOutline, gridOutline, addOutline, createOutline, trashOutline, swapHorizontalOutline, closeCircleOutline, chevronBackOutline, chevronForwardOutline, personAddOutline, searchOutline, bookOutline, cubeOutline, checkmarkCircleOutline, warningOutline, bulbOutline } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import api from '../../services/api'; 
import './Prestamos.css'; 

const Prestamos: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
   
  // NUEVO ESTADO: Filtro tipo Dashboard
  const [rangoFecha, setRangoFecha] = useState('todo');

  const [showHelp, setShowHelp] = useState(false); // <-- NUEVO ESTADO DEL TOOLTIP
  
  // ESTADOS DE CARGA CENTRALIZADOS
  const [isInitialLoading, setIsInitialLoading] = useState(true); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  
  const [records, setRecords] = useState<any[]>([]);
  const [usuariosDB, setUsuariosDB] = useState<any[]>([]); 
  const [personalDB, setPersonalDB] = useState<any[]>([]); 
  const [gruposDB, setGruposDB] = useState<any[]>([]); 
  const [autoresDB, setAutoresDB] = useState<string[]>([]); 
  const [editorialesDB, setEditorialesDB] = useState<{nombre: string, isbn: string}[]>([]); 
  const [catalogoDB, setCatalogoDB] = useState<any[]>([]); 
  
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState<any[]>([]);
  const [codigoBuscado, setCodigoBuscado] = useState(''); 
  const [inventarioResultados, setInventarioResultados] = useState<any[]>([]); 
  const [isSearchingInv, setIsSearchingInv] = useState(false); 

  const [matriculaBuscada, setMatriculaBuscada] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: () => {} });
  const [lastCopyDialog, setLastCopyDialog] = useState<{show: boolean, invData: any}>({ show: false, invData: null });

  const showToast = (message: string, type: 'success' | 'danger' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4500);
  };

  const [showQuickUserModal, setShowQuickUserModal] = useState(false);
  const [quickUserForm, setQuickUserForm] = useState({ 
      Matricula: '', NombreUsuario: '', ApellidoPaterno: '', ApellidoMaterno: '', CorreoElectronico: '', Telefono: '', Grupo_ID: '', EstadoCuenta: 'Activo' 
  });

  const [showQuickResourceModal, setShowQuickResourceModal] = useState(false);
  const [quickResourceForm, setQuickResourceForm] = useState<any>({ 
      Unidad_ID: '', TipoRecurso: 'Libro', Titulo: '', TemaRecurso: '', AnioPublicacion: new Date().getFullYear().toString(), Observaciones: '',
      Autor: '', ClasificacionISBN: '', Editorial: '', EdicionVolumen: '', 
      Marca: '', NumSerie: '', EstadoFisicoInicial: 'Nuevo', 
      Material: '', Asesor: '', Carrera: '',
      RecursoExistente: null 
  });
  
  const [quickImageFile, setQuickImageFile] = useState<File | null>(null);
  const [quickPreviewImage, setQuickPreviewImage] = useState<string | null>(null);

  const [showSugerenciasAutor, setShowSugerenciasAutor] = useState(false);
  const [showSugerenciasEditorial, setShowSugerenciasEditorial] = useState(false);
  const [showSugerenciasCatalogo, setShowSugerenciasCatalogo] = useState(false);

  const currentYear = new Date().getFullYear();
  // Formato YYYY-MM para filtrar por mes actual
  const currentMonthValue = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const [formData, setFormData] = useState<any>({ 
    Prestamo_ID: null, Usuario_ID: '', NombreEstudianteText: '', PersonalEntrega_ID: '', PersonalRecibe_ID: '', 
    FechaSalida: '', FechaDevolucionEstablecida: '', EstadoPrestamo: 'Activo'
  });

useIonViewWillEnter(() => {
    // --- LIMPIEZA TOTAL AL ENTRAR AL MÓDULO ---
    setShowHelp(false); // <-- APAGAR FOQUITO AL ENTRAR
    setShowForm(false);
    setIsEditing(false);
    setMatriculaBuscada('');
    setCodigoBuscado('');
    setUnidadesSeleccionadas([]);
    setInventarioResultados([]);
    // Generar fecha de hoy respetando la zona horaria local
    const hoy = new Date();
    const fechaHoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    setFormData({ 
      Prestamo_ID: null, Usuario_ID: '', NombreEstudianteText: '', PersonalEntrega_ID: '', PersonalRecibe_ID: '', 
      FechaSalida: fechaHoyStr, FechaDevolucionEstablecida: '', EstadoPrestamo: 'Activo' 
    });
    
    // NUEVO: Limpiar buscador, filtros y apagar cualquier alerta abierta
    setSearchQuery('');
    setRangoFecha('todo');
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
    setLastCopyDialog({ show: false, invData: null });
    setShowQuickUserModal(false);
    setShowQuickResourceModal(false);
    // ------------------------------------------------------------------------

    const loadTableData = async () => {
        if (records.length === 0) setIsInitialLoading(true);
        try {
            // CORRECCIÓN: Le mandamos a la tabla los valores limpios ('', 'todo') en lugar del estado viejo
            await fetchPage(1, '', 'todo'); 
            
            setCatalogoDB([]);
            setAutoresDB([]);
            setEditorialesDB([]);
            setUsuariosDB([]);
            setPersonalDB([]);
            setGruposDB([]);
        } catch (error) {
            console.error("Error al recargar el módulo", error);
        } finally {
            setIsInitialLoading(false);
        }
    };
    loadTableData();
  });

  useEffect(() => {
    if (showForm && (usuariosDB.length === 0 || personalDB.length === 0)) {
        api.get('/personal?all=true').then((res: any) => setPersonalDB(Array.isArray(res.data?.data) ? res.data.data : [])).catch(() => {});
        api.get('/usuarios?all=true').then((res: any) => setUsuariosDB(Array.isArray(res.data?.data) ? res.data.data : [])).catch(() => {});
    }
  }, [showForm, usuariosDB.length, personalDB.length]);

  useEffect(() => {
    if (showQuickUserModal && gruposDB.length === 0) {
        api.get('/grupos?all=true').then((res: any) => setGruposDB(Array.isArray(res.data?.data) ? res.data.data : []));
    }
  }, [showQuickUserModal, gruposDB.length]);

  useEffect(() => {
    if (showQuickResourceModal && catalogoDB.length === 0) {
        api.get('/autores?all=true').then((res: any) => setAutoresDB((res.data?.data || []).map((a: any) => ((a.NombreAutor || '') + ' ' + (a.ApellidosAutor || '')).trim())));
        api.get('/editoriales?all=true').then((res: any) => setEditorialesDB((res.data?.data || []).map((e: any) => ({ nombre: e.NombreEditorial, isbn: e.ISBN_Editorial || '' }))));
        api.get('/catalogo?all=true&with_images=false').then((res: any) => setCatalogoDB(Array.isArray(res.data?.data) ? res.data.data : []));
    }
  }, [showQuickResourceModal, catalogoDB.length]);

  const fetchPage = async (page: number, search = searchQuery, rango = rangoFecha) => {
    // CORRECCIÓN: Encendemos el cargador SIEMPRE que se actualiza la tabla (Búsqueda, paginación o filtro)
    setIsProcessing(true);
    try {
      const res = await api.get(`/prestamos?page=${page}&search=${search}&rangoFecha=${rango}`);
      setRecords(res.data?.data?.data || []);
      setCurrentPage(res.data?.data?.current_page || 1);
      setLastPage(res.data?.data?.last_page || 1);
      setTotalRecords(res.data?.data?.total || 0);
    } catch (err) { 
      console.error(err); 
    } finally {
      // Apagamos el cargador cuando la petición finaliza
      setIsProcessing(false);
    }
  };

  // Función para disparar la búsqueda solo al hacer clic en la lupa o dar Enter
  const handleSearch = () => {
    fetchPage(1, searchQuery, rangoFecha);
  };

  const usuarioEncontrado = usuariosDB.find(u => String(u.Matricula).toLowerCase() === String(matriculaBuscada).toLowerCase());
  useEffect(() => {
      if (usuarioEncontrado) setFormData((prev: any) => ({ ...prev, Usuario_ID: usuarioEncontrado.Usuario_ID }));
      else setFormData((prev: any) => ({ ...prev, Usuario_ID: '' }));
  }, [matriculaBuscada, usuarioEncontrado]);

  const fetchInventarioLive = async (term: string) => {
      if (!term || term.trim().length === 0) {
          setInventarioResultados([]);
          return;
      }
      setIsSearchingInv(true);
      try {
          const res = await api.get(`/inventario/buscar?term=${encodeURIComponent(term)}`);
          setInventarioResultados(res.data?.data || []);
      } catch (error) {
          console.error("Error buscando en inventario vivo", error);
      } finally {
          setIsSearchingInv(false);
      }
  };

  useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
          fetchInventarioLive(codigoBuscado);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
  }, [codigoBuscado]);

  const openForm = (record?: any) => {
    setCodigoBuscado('');
    setMatriculaBuscada('');
    setUnidadesSeleccionadas([]);
    setInventarioResultados([]);
    if (record) {
      setIsEditing(true);
      setFormData({ 
        Prestamo_ID: record.Prestamo_ID, Usuario_ID: record.Usuario_ID, NombreEstudianteText: record.NombreEstudiante, 
        PersonalEntrega_ID: record.PersonalEntrega_ID, PersonalRecibe_ID: record.PersonalRecibe_ID || '',
        FechaSalida: record.FechaSalida ? record.FechaSalida.split(' ')[0] : '',
        FechaDevolucionEstablecida: record.FechaDevolucionEstablecida ? record.FechaDevolucionEstablecida.split(' ')[0] : '',
        EstadoPrestamo: record.EstadoPrestamo
      });
    } else {
      setIsEditing(false);
      // Generar fecha de hoy respetando la zona horaria local
      const hoy = new Date();
      const fechaHoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

      setFormData({ 
        Prestamo_ID: null, 
        Usuario_ID: '', 
        NombreEstudianteText: '', 
        PersonalEntrega_ID: '', 
        PersonalRecibe_ID: '', 
        FechaSalida: fechaHoyStr, 
        FechaDevolucionEstablecida: '', 
        EstadoPrestamo: 'Activo' 
      });
    }
    setShowForm(true);
  };

  const handleAgregarCodigoSeleccionado = (invEncontrado: any) => {
    if (unidadesSeleccionadas.some(u => u.Unidad_ID === invEncontrado.Unidad_ID)) return;
    
    const copiasDisponibles = inventarioResultados.filter(
        item => item.Recurso_ID === invEncontrado.Recurso_ID && item.EstadoDisponibilidad === 'Disponible'
    ).length;

    if (copiasDisponibles === 1) {
        setLastCopyDialog({ show: true, invData: invEncontrado });
        setCodigoBuscado(''); 
        setInventarioResultados([]);
    } else {
        setUnidadesSeleccionadas([...unidadesSeleccionadas, invEncontrado]);
        setCodigoBuscado(''); 
        setInventarioResultados([]);
    }
  };

  const confirmLastCopy = () => {
    if (lastCopyDialog.invData) {
        setUnidadesSeleccionadas([...unidadesSeleccionadas, lastCopyDialog.invData]);
    }
    setLastCopyDialog({ show: false, invData: null });
  };

  const handleRemoverUnidad = (idToRemove: string) => {
    setUnidadesSeleccionadas(unidadesSeleccionadas.filter(u => u.Unidad_ID !== idToRemove));
  };

  const handleGuardarAltaRapidaUsuario = async () => {
    // AQUÍ AGREGAMOS LA VALIDACIÓN DEL APELLIDO MATERNO
    if (!quickUserForm.Matricula || !quickUserForm.NombreUsuario || !quickUserForm.ApellidoPaterno || !quickUserForm.ApellidoMaterno || !quickUserForm.CorreoElectronico) {
        return showToast("Matrícula, Nombre Completo (Nombres y ambos Apellidos) y Correo son obligatorios.", 'danger');
    }

    if (!quickUserForm.CorreoElectronico.toLowerCase().endsWith('@upve.edu.mx')) {
        return showToast("Error: El correo debe pertenecer obligatoriamente al dominio institucional (@upve.edu.mx).", 'danger');
    }

    setLoadingModal(true);
    try {
        const payload = {
            Matricula: quickUserForm.Matricula,
            NombreUsuario: quickUserForm.NombreUsuario,
            ApellidoPaterno: quickUserForm.ApellidoPaterno,
            ApellidoMaterno: quickUserForm.ApellidoMaterno, // Ya no necesita el "|| null" porque es obligatorio
            CorreoElectronico: quickUserForm.CorreoElectronico,
            Telefono: quickUserForm.Telefono || 'S/N',
            Grupo_ID: quickUserForm.Grupo_ID ? parseInt(quickUserForm.Grupo_ID) : null,
            EstadoCuenta: 'Activo'
        };

        const res = await api.post('/usuarios', payload);
        // CAMBIAMOS "ALUMNO" POR "USUARIO"
        showToast("¡Usuario registrado con éxito!", 'success');
        
        api.get('/usuarios?all=true').then((resU: any) => setUsuariosDB(Array.isArray(resU?.data?.data) ? resU.data.data : []));

        setMatriculaBuscada(res.data.data.Matricula);
        setShowQuickUserModal(false);
        setQuickUserForm({ Matricula: '', NombreUsuario: '', ApellidoPaterno: '', ApellidoMaterno: '', CorreoElectronico: '', Telefono: '', Grupo_ID: '', EstadoCuenta: 'Activo' });
    } catch (error: any) { 
        showToast(error.response?.data?.message || 'Error: Verifica que la matrícula o correo no estén duplicados.', 'danger'); 
    } finally { setLoadingModal(false); }
  };

  const handleIsbnChange = (e: any) => {
    const val = e.target.value;
    let autoEditorial = quickResourceForm.Editorial || '';
    const cleanIsbn = val.replace(/-/g, '').trim();

    if (cleanIsbn.length >= 3) {
      const matchedEditorial = editorialesDB.find(ed => ed.isbn && cleanIsbn.startsWith(ed.isbn));
      if (matchedEditorial) autoEditorial = matchedEditorial.nombre;
    }
    setQuickResourceForm({ ...quickResourceForm, ClasificacionISBN: val, Editorial: autoEditorial });
  };

  const renderCamposRecursoDinamico = () => {
      if (quickResourceForm.RecursoExistente) return null;

      switch(quickResourceForm.TipoRecurso) {
          case 'Libro':
              return (
                  <>
                    <div className="form-row margin-bottom-10">
                        <div className="form-group flex-1 relative-position">
                            <label>AUTOR *</label>
                            <input className="custom-input" value={quickResourceForm.Autor} onChange={e => { setQuickResourceForm({...quickResourceForm, Autor: e.target.value}); setShowSugerenciasAutor(true); }} onFocus={() => setShowSugerenciasAutor(true)} onBlur={() => setTimeout(() => setShowSugerenciasAutor(false), 200)} />
                            {showSugerenciasAutor && quickResourceForm.Autor && (
                            <div className="sugerencias-box">
                                {autoresDB.filter(a => a.toLowerCase().includes(quickResourceForm.Autor.toLowerCase())).length > 0 ? (
                                autoresDB.filter(a => a.toLowerCase().includes(quickResourceForm.Autor.toLowerCase())).map(autor => (
                                    <div key={autor} className="sugerencia-item" onMouseDown={() => { setQuickResourceForm({...quickResourceForm, Autor: autor}); setShowSugerenciasAutor(false); }}>{autor}</div>
                                ))
                                ) : (<div className="sugerencia-item error">Se registrará como nuevo</div>)}
                            </div>
                            )}
                        </div>
                        <div className="form-group flex-1"><label>CLASIFICACIÓN ISBN *</label><input className="custom-input" value={quickResourceForm.ClasificacionISBN} onChange={handleIsbnChange} /></div>
                    </div>
                    <div className="form-row margin-bottom-10">
                        <div className="form-group flex-1 relative-position">
                            <label>EDITORIAL *</label>
                            <input className="custom-input" value={quickResourceForm.Editorial} onChange={e => { setQuickResourceForm({...quickResourceForm, Editorial: e.target.value}); setShowSugerenciasEditorial(true); }} onFocus={() => setShowSugerenciasEditorial(true)} onBlur={() => setTimeout(() => setShowSugerenciasEditorial(false), 200)} />
                            {showSugerenciasEditorial && quickResourceForm.Editorial && (
                            <div className="sugerencias-box">
                                {editorialesDB.filter(e => e.nombre.toLowerCase().includes(quickResourceForm.Editorial.toLowerCase())).length > 0 ? (
                                editorialesDB.filter(e => e.nombre.toLowerCase().includes(quickResourceForm.Editorial.toLowerCase())).map(ed => (
                                    <div key={ed.nombre} className="sugerencia-item" onMouseDown={() => { setQuickResourceForm({...quickResourceForm, Editorial: ed.nombre}); setShowSugerenciasEditorial(false); }}>{ed.nombre}</div>
                                ))
                                ) : (<div className="sugerencia-item error">Se registrará como nueva</div>)}
                            </div>
                            )}
                        </div>
                        <div className="form-group flex-1"><label>EDICIÓN</label><input className="custom-input" value={quickResourceForm.EdicionVolumen} onChange={e => setQuickResourceForm({...quickResourceForm, EdicionVolumen: e.target.value})} /></div>
                    </div>
                  </>
              );
          case 'Revista / Artículo Científico':
              return (
                  <div className="form-row margin-bottom-10">
                      <div className="form-group flex-1 relative-position">
                          <label>AUTOR *</label>
                          <input className="custom-input" value={quickResourceForm.Autor} onChange={e => { setQuickResourceForm({...quickResourceForm, Autor: e.target.value}); setShowSugerenciasAutor(true); }} onFocus={() => setShowSugerenciasAutor(true)} onBlur={() => setTimeout(() => setShowSugerenciasAutor(false), 200)} />
                          {showSugerenciasAutor && quickResourceForm.Autor && (
                          <div className="sugerencias-box">
                              {autoresDB.filter(a => a.toLowerCase().includes(quickResourceForm.Autor.toLowerCase())).length > 0 ? (autoresDB.filter(a => a.toLowerCase().includes(quickResourceForm.Autor.toLowerCase())).map(autor => (<div key={autor} className="sugerencia-item" onMouseDown={() => { setQuickResourceForm({...quickResourceForm, Autor: autor}); setShowSugerenciasAutor(false); }}>{autor}</div>))) : (<div className="sugerencia-item error">Se registrará como nuevo</div>)}
                          </div>
                          )}
                      </div>
                  </div>
              );
          case 'Tesis':
              return (
                  <>
                    <div className="form-row margin-bottom-10">
                        <div className="form-group flex-1 relative-position">
                            <label>AUTOR (ALUMNO) *</label>
                            <input className="custom-input" value={quickResourceForm.Autor} onChange={e => { setQuickResourceForm({...quickResourceForm, Autor: e.target.value}); setShowSugerenciasAutor(true); }} onFocus={() => setShowSugerenciasAutor(true)} onBlur={() => setTimeout(() => setShowSugerenciasAutor(false), 200)} />
                            {showSugerenciasAutor && quickResourceForm.Autor && (
                            <div className="sugerencias-box">
                                {autoresDB.filter(a => a.toLowerCase().includes(quickResourceForm.Autor.toLowerCase())).length > 0 ? (autoresDB.filter(a => a.toLowerCase().includes(quickResourceForm.Autor.toLowerCase())).map(autor => (<div key={autor} className="sugerencia-item" onMouseDown={() => { setQuickResourceForm({...quickResourceForm, Autor: autor}); setShowSugerenciasAutor(false); }}>{autor}</div>))) : (<div className="sugerencia-item error">Se registrará como nuevo</div>)}
                            </div>
                            )}
                        </div>
                    </div>
                    <div className="form-row margin-bottom-10">
                        <div className="form-group flex-1"><label>ASESOR *</label><input className="custom-input" value={quickResourceForm.Asesor} onChange={e => setQuickResourceForm({...quickResourceForm, Asesor: e.target.value})} /></div>
                        <div className="form-group flex-1"><label>GRADO / CARRERA</label><input className="custom-input" value={quickResourceForm.Carrera} onChange={e => setQuickResourceForm({...quickResourceForm, Carrera: e.target.value})} /></div>
                    </div>
                  </>
              );
          case 'Equipo de Cómputo': case 'Equipo Audiovisual': case 'Dispositivo de Conectividad':
              return (
                  <div className="form-row margin-bottom-10">
                      <div className="form-group flex-1"><label>MARCA / MODELO *</label><input className="custom-input" value={quickResourceForm.Marca} onChange={e => setQuickResourceForm({...quickResourceForm, Marca: e.target.value})} /></div>
                      <div className="form-group flex-1"><label>NÚMERO DE SERIE</label><input className="custom-input" value={quickResourceForm.NumSerie} onChange={e => setQuickResourceForm({...quickResourceForm, NumSerie: e.target.value})} /></div>
                  </div>
              );
          case 'Mobiliario Didáctico':
              return (
                  <div className="form-row margin-bottom-10">
                      <div className="form-group flex-1"><label>MATERIAL *</label><input className="custom-input" value={quickResourceForm.Material} onChange={e => setQuickResourceForm({...quickResourceForm, Material: e.target.value})} /></div>
                  </div>
              );
          case 'Enciclopedia / Diccionario':
              return (
                  <>
                      <div className="form-row margin-bottom-10">
                          <div className="form-group flex-1 relative-position">
                                <label>EDITORIAL *</label>
                                <input className="custom-input" value={quickResourceForm.Editorial} onChange={e => { setQuickResourceForm({...quickResourceForm, Editorial: e.target.value}); setShowSugerenciasEditorial(true); }} onFocus={() => setShowSugerenciasEditorial(true)} onBlur={() => setTimeout(() => setShowSugerenciasEditorial(false), 200)} />
                                {showSugerenciasEditorial && quickResourceForm.Editorial && (
                                <div className="sugerencias-box">
                                    {editorialesDB.filter(e => e.nombre.toLowerCase().includes(quickResourceForm.Editorial.toLowerCase())).length > 0 ? (editorialesDB.filter(e => e.nombre.toLowerCase().includes(quickResourceForm.Editorial.toLowerCase())).map(ed => (<div key={ed.nombre} className="sugerencia-item" onMouseDown={() => { setQuickResourceForm({...quickResourceForm, Editorial: ed.nombre}); setShowSugerenciasEditorial(false); }}>{ed.nombre}</div>))) : (<div className="sugerencia-item error">Se registrará como nueva</div>)}
                                </div>
                                )}
                          </div>
                          <div className="form-group flex-1"><label>CLASIFICACIÓN ISBN *</label><input className="custom-input" value={quickResourceForm.ClasificacionISBN} onChange={handleIsbnChange} /></div>
                      </div>
                      <div className="form-row margin-bottom-10">
                          <div className="form-group flex-1"><label>VOLUMEN / TOMO</label><input className="custom-input" value={quickResourceForm.EdicionVolumen} onChange={e => setQuickResourceForm({...quickResourceForm, EdicionVolumen: e.target.value})} /></div>
                      </div>
                  </>
              );
          default: return null;
      }
  };

  const handleGuardarAltaRapidaRecurso = async () => {
    if (!quickResourceForm.Unidad_ID || !quickResourceForm.Titulo) {
        return showToast("Código de Inventario y Título son obligatorios.", 'danger');
    }

    // Validaciones estrictas si el recurso es completamente nuevo
    if (!quickResourceForm.RecursoExistente) {
        if (['Libro', 'Revista / Artículo Científico', 'Tesis'].includes(quickResourceForm.TipoRecurso) && !quickResourceForm.Autor) {
            return showToast("El campo Autor es obligatorio para este tipo de recurso.", 'danger');
        }
        if (['Libro', 'Enciclopedia / Diccionario'].includes(quickResourceForm.TipoRecurso) && !quickResourceForm.Editorial) {
            return showToast("El campo Editorial es obligatorio para este tipo de recurso.", 'danger');
        }
        if (quickResourceForm.TipoRecurso === 'Libro' && !quickResourceForm.ClasificacionISBN) {
            return showToast("El ISBN es obligatorio para los libros.", 'danger');
        }
        if (quickResourceForm.AnioPublicacion && parseInt(quickResourceForm.AnioPublicacion) > currentYear) {
            return showToast(`El año de publicación no puede ser mayor a ${currentYear}.`, 'danger');
        }
    }
    
    setLoadingModal(true);
    
    try {
        let recursoIdToUse = quickResourceForm.RecursoExistente?.Recurso_ID;

        if (!quickResourceForm.RecursoExistente) {
            const catPayload = new FormData();
            catPayload.append('Titulo', quickResourceForm.Titulo);
            catPayload.append('TemaRecurso', quickResourceForm.TemaRecurso || 'General');
            if (quickResourceForm.AnioPublicacion) catPayload.append('AnioPublicacion', quickResourceForm.AnioPublicacion);
            catPayload.append('TipoRecurso', quickResourceForm.TipoRecurso);
            
            if(quickResourceForm.EdicionVolumen) catPayload.append('EdicionVolumen', quickResourceForm.EdicionVolumen);
            if(quickResourceForm.ClasificacionISBN) catPayload.append('ClasificacionISBN', quickResourceForm.ClasificacionISBN);
            if(quickResourceForm.Observaciones) catPayload.append('Observaciones', quickResourceForm.Observaciones);
            if(quickResourceForm.Marca) catPayload.append('Marca', quickResourceForm.Marca);
            if(quickResourceForm.NumSerie) catPayload.append('NumSerie', quickResourceForm.NumSerie);
            if(quickResourceForm.EstadoFisicoInicial) catPayload.append('Estado', quickResourceForm.EstadoFisicoInicial); 
            if(quickResourceForm.Material) catPayload.append('Material', quickResourceForm.Material);
            if(quickResourceForm.Asesor) catPayload.append('Asesor', quickResourceForm.Asesor);
            if(quickResourceForm.Carrera) catPayload.append('Carrera', quickResourceForm.Carrera); 
            if(quickResourceForm.Autor) catPayload.append('Autor', quickResourceForm.Autor); 
            if(quickResourceForm.Editorial) catPayload.append('Editorial', quickResourceForm.Editorial);

            if (quickImageFile) catPayload.append('imagen', quickImageFile);

            let endpoint = '/catalogo';
            switch(quickResourceForm.TipoRecurso) {
              case 'Libro': endpoint = '/libros'; break;
              case 'Tesis': endpoint = '/tesis'; break;
              case 'Revista / Artículo Científico': endpoint = '/revistas'; break;
              case 'Equipo Audiovisual': endpoint = '/audiovisuales'; break;
              case 'Enciclopedia / Diccionario': endpoint = '/enciclopedias'; break;
              case 'Mobiliario Didáctico': endpoint = '/mobiliario-didactico'; break;
            }
            await api.post(endpoint, catPayload, { headers: { 'Content-Type': 'multipart/form-data' }});
            
            const allCatRes = await api.get('/catalogo?all=true&with_images=false');
            const listCat = allCatRes.data.data;
            setCatalogoDB(listCat); 
            recursoIdToUse = listCat[listCat.length - 1].Recurso_ID; 
        }

        const invPayload = {
            Unidad_ID: String(quickResourceForm.Unidad_ID).toUpperCase(),
            Recurso_ID: recursoIdToUse,
            EstadoFisicoInicial: quickResourceForm.EstadoFisicoInicial || 'Nuevo',
            EstadoDisponibilidad: 'Disponible'
        };
        await api.post('/inventario', invPayload);

        const nuevoItem = {
            Unidad_ID: String(quickResourceForm.Unidad_ID).toUpperCase(),
            Recurso_ID: recursoIdToUse,
            Titulo: quickResourceForm.Titulo,
            EstadoDisponibilidad: 'Disponible'
        };

        setUnidadesSeleccionadas([...unidadesSeleccionadas, nuevoItem]); 
        
        showToast("¡Recurso añadido al inventario con éxito!", 'success');
        setShowQuickResourceModal(false);
        setCodigoBuscado('');
        setQuickImageFile(null);
        setQuickPreviewImage(null);
        setQuickResourceForm({ 
            Unidad_ID: '', TipoRecurso: 'Libro', Titulo: '', TemaRecurso: '', AnioPublicacion: new Date().getFullYear().toString(), Observaciones: '',
            Autor: '', ClasificacionISBN: '', Editorial: '', EdicionVolumen: '', 
            Marca: '', NumSerie: '', EstadoFisicoInicial: 'Nuevo', 
            Material: '', Asesor: '', Carrera: '',
            RecursoExistente: null 
        });
    } catch (error: any) {
        showToast(error.response?.data?.message || 'Error: Verifica que el código de unidad no exista ya.', 'danger');
    } finally { setLoadingModal(false); }
  };

  const saveRecord = async () => {
    if (!isEditing && (!formData.Usuario_ID || !formData.PersonalEntrega_ID || !formData.FechaSalida || !formData.FechaDevolucionEstablecida)) {
        return showToast("Llena los campos obligatorios (*) incluyendo las fechas.", 'danger');
    }
    if (isEditing && formData.EstadoPrestamo === 'Devuelto' && !formData.PersonalRecibe_ID) return showToast("Si el estado es Devuelto, debes indicar quién recibe.", 'danger');
    if (new Date(formData.FechaDevolucionEstablecida) < new Date(formData.FechaSalida)) return showToast("Error: La devolución no puede ser anterior a la salida.", 'danger');
    if (!isEditing && unidadesSeleccionadas.length === 0) return showToast("Debes seleccionar al menos un recurso de inventario.", 'danger');

    setIsProcessing(true);
    const payload = { ...formData, unidades: unidadesSeleccionadas.map(u => u.Unidad_ID) };

    try {
      if (isEditing) await api.put(`/prestamos/${formData.Prestamo_ID}`, payload);
      else await api.post('/prestamos', payload);
      
      showToast(isEditing ? "¡Préstamo actualizado!" : "¡Préstamo registrado exitosamente!", 'success');
      setShowForm(false);
      fetchPage(currentPage); 
    } catch (error: any) {
      showToast("Error en el servidor al guardar el préstamo.", 'danger');
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleDelete = async (id: any) => {
    setIsProcessing(false);
    setConfirmDialog({
      show: true,
      title: 'Eliminar Préstamo',
      message: '¿Estás seguro de eliminar este registro? Se liberarán los recursos al inventario.',
      onConfirm: async () => {
        setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
        try { 
            await api.delete(`/prestamos/${id}`); 
            fetchPage(currentPage); 
            showToast("Préstamo eliminado y recursos liberados.", 'success');
        } 
        catch (error) { 
            showToast("Error al eliminar el registro.", 'danger'); 
        }
      }
    });
  };

  const getEstadoBadgeClass = (estado: string) => {
      switch(estado) {
          case 'Activo': return 'badge-estado activo';
          case 'Devuelto': return 'badge-estado devuelto';
          case 'Atrasado': return 'badge-estado atrasado';
          case 'Finalizado (Sanción)': return 'badge-estado sancion-baja'; // <--- CASO NUEVO
          default: return 'badge-estado';
      }
  };

  const exportToExcel = async () => {
    setIsProcessing(true);
    try {
      const res = await api.get(`/prestamos?all=true&search=${searchQuery}&rangoFecha=${rangoFecha}`);
      const ws = XLSX.utils.json_to_sheet((res.data.data || []).map((r:any) => ({
        ID: r.Prestamo_ID, 
        'Usuario': `${r.NombreEstudiante}\nMatrícula: ${r.Matricula}`,
        'Recursos Prestados': r.RecursosPrestados, 
        'Entregó': r.NombrePersonalEntrega, 
        'Recibió': r.NombrePersonalRecibe,
        'Salida': r.FechaSalida ? r.FechaSalida.split(' ')[0] : '-',
        'Devolución': r.FechaDevolucionEstablecida ? r.FechaDevolucionEstablecida.split(' ')[0] : '-', 
        'Estado': r.EstadoPrestamo
      })));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Prestamos'); XLSX.writeFile(wb, `UPVE_Prestamos.xlsx`);
      showToast("¡Excel descargado exitosamente!", 'success');
    } catch (error) {
      showToast("Hubo un problema al exportar el archivo.", 'danger');
    } finally { setIsProcessing(false); }
  };

  const exportToPDF = async () => {
    setIsProcessing(true);
    try {
      const res = await api.get(`/prestamos?all=true&search=${searchQuery}&rangoFecha=${rangoFecha}`);
      const doc = new jsPDF('landscape'); doc.text(`Historial de Préstamos - UPVE`, 14, 15);
      
      const headers = [['ID', 'Usuario', 'Recursos', 'Entregó / Recibió', 'Salida / Dev', 'Estado']];
      const body = (res.data.data || []).map((r:any) => [
          r.Prestamo_ID, 
          `${r.NombreEstudiante}\nMatrícula: ${r.Matricula}`,
          r.RecursosPrestados, 
          `Entregó: ${r.NombrePersonalEntrega}\nRecibió: ${r.NombrePersonalRecibe}`,
          `Sal: ${r.FechaSalida ? r.FechaSalida.split(' ')[0] : '-'}\nDev: ${r.FechaDevolucionEstablecida ? r.FechaDevolucionEstablecida.split(' ')[0] : '-'}`, 
          r.EstadoPrestamo
      ]);

      autoTable(doc, { 
          startY: 20, 
          head: headers, 
          body: body, 
          theme: 'grid', 
          headStyles: { fillColor: [88, 44, 131] } 
      });
      doc.save(`UPVE_Prestamos.pdf`);
      showToast("¡PDF descargado exitosamente!", 'success');
    } catch (error) {
      showToast("Hubo un problema al exportar el archivo.", 'danger');
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

  return (
    <IonPage>
      
      {/* MAGIA DE IONIC: El loader se sale del IonContent para centrado absoluto en pantalla */}
      {(isInitialLoading || isProcessing) && (
          <div className="main-loader-overlay">
              <div className="main-loader-spinner"></div>
              <p>{isInitialLoading ? 'Cargando módulo...' : 'Procesando...'}</p>
          </div>
      )}

      <IonContent className="prestamos-bg relative-position">

        {/* NUEVO MODAL DE ÚLTIMO EJEMPLAR (COLOR NARANJA) */}
        {lastCopyDialog.show && (
            <div className="pdf-modal-overlay">
                <div className="pdf-modal-content" style={{maxWidth: '400px'}}>
                    <h3 style={{color: '#f59e0b', marginBottom: '10px'}}><IonIcon icon={warningOutline} style={{verticalAlign: 'middle', marginRight: '5px'}}/> Último Ejemplar</h3>
                    <p style={{color: '#4b5563', fontSize: '14px', lineHeight: '1.5', marginBottom: '25px'}}>
                        Estás a punto de prestar el último ejemplar disponible en estante de <strong style={{color: '#111827'}}>"{lastCopyDialog.invData?.Titulo}"</strong>. ¿Deseas continuar con el préstamo?
                    </p>
                    <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                        <button className="btn-pdf-text" onClick={() => setLastCopyDialog({show: false, invData: null})}>Cancelar</button>
                        <button className="btn-pdf-img" style={{backgroundColor: '#f59e0b'}} onClick={confirmLastCopy}>Sí, agregar</button>
                    </div>
                </div>
            </div>
        )}

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

        {/* MODAL ALTA RÁPIDA USUARIO */}
        {showQuickUserModal && (
          <div className="pdf-modal-overlay">
            <div className="pdf-modal-content modal-content-user">
              <h3>Alta Rápida de Usuario</h3>
              
              <div className="form-row margin-bottom-10">
                  <div className="form-group flex-1"><label>MATRÍCULA / NÚM. EMPLEADO *</label><input className="custom-input" value={quickUserForm.Matricula} onChange={e => setQuickUserForm({...quickUserForm, Matricula: e.target.value})} /></div>
                  <div className="form-group flex-2"><label>NOMBRE(S) *</label><input className="custom-input" value={quickUserForm.NombreUsuario} onChange={e => setQuickUserForm({...quickUserForm, NombreUsuario: e.target.value})} /></div>
              </div>
              <div className="form-row margin-bottom-10">
                  {/* ASTERISCOS EN AMBOS APELLIDOS */}
                  <div className="form-group flex-1"><label>APELLIDO PATERNO *</label><input className="custom-input" value={quickUserForm.ApellidoPaterno} onChange={e => setQuickUserForm({...quickUserForm, ApellidoPaterno: e.target.value})} /></div>
                  <div className="form-group flex-1"><label>APELLIDO MATERNO *</label><input className="custom-input" value={quickUserForm.ApellidoMaterno} onChange={e => setQuickUserForm({...quickUserForm, ApellidoMaterno: e.target.value})} /></div>
              </div>
              <div className="form-row margin-bottom-20">
                  <div className="form-group flex-2"><label>CORREO ELECTRÓNICO *</label><input className="custom-input" type="email" placeholder="ejemplo@upve.edu.mx" value={quickUserForm.CorreoElectronico} onChange={e => setQuickUserForm({...quickUserForm, CorreoElectronico: e.target.value})} /></div>
                  <div className="form-group flex-1">
                      <label>TELÉFONO *</label>
                      <input 
                          className="custom-input" 
                          value={quickUserForm.Telefono} 
                          maxLength={10}
                          onChange={e => setQuickUserForm({...quickUserForm, Telefono: e.target.value.replace(/\D/g, '')})} 
                      />
                  </div>
              </div>
              <div className="form-group margin-bottom-20">
                  <label>GRUPO / CARRERA (OPCIONAL PARA MAESTROS)</label>
                  <select className="custom-input select-input" value={quickUserForm.Grupo_ID} onChange={e => setQuickUserForm({...quickUserForm, Grupo_ID: e.target.value})}>
                      <option value="" disabled>Seleccione el grupo...</option>
                      {gruposDB.map(g => <option key={g.Grupo_ID} value={g.Grupo_ID}>{g.NombreGrupo} - {g.NombreCarrera}</option>)}
                  </select>
              </div>
              
              <div className="flex-justify-end">
                <button className="btn-pdf-text" onClick={() => { setShowQuickUserModal(false); setQuickUserForm({ Matricula: '', NombreUsuario: '', ApellidoPaterno: '', ApellidoMaterno: '', CorreoElectronico: '', Telefono: '', Grupo_ID: '', EstadoCuenta: 'Activo' }); }} disabled={loadingModal}>Cancelar</button>
                {/* CAMBIAMOS LA FUNCIÓN A EJECUTAR Y EL TEXTO DEL BOTÓN */}
                <button className="btn-pdf-img" onClick={handleGuardarAltaRapidaUsuario} disabled={loadingModal}>{loadingModal ? 'Guardando...' : 'Guardar Usuario'}</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ALTA RÁPIDA RECURSO */}
        {showQuickResourceModal && (
          <div className="pdf-modal-overlay">
            <div className="pdf-modal-content modal-content-scrollable">
              <h3>Alta Rápida de Recurso</h3>
              
              <div className="form-row margin-bottom-10">
                  <div className="form-group flex-1">
                      <label>CÓDIGO DE INVENTARIO *</label>
                      <input className="custom-input" value={quickResourceForm.Unidad_ID} placeholder="" onChange={e => setQuickResourceForm({...quickResourceForm, Unidad_ID: e.target.value})} />
                  </div>
                  <div className="form-group flex-1">
                      <label>TIPO DE RECURSO *</label>
                      <select className="custom-input select-input" value={quickResourceForm.TipoRecurso} onChange={e => setQuickResourceForm({...quickResourceForm, TipoRecurso: e.target.value, RecursoExistente: null, Titulo: ''})}>
                          <option value="Libro">Libro</option><option value="Tesis">Tesis</option><option value="Revista / Artículo Científico">Revista / Artículo Científico</option><option value="Enciclopedia / Diccionario">Enciclopedia / Diccionario</option><option value="Equipo de Cómputo">Equipo de Cómputo</option><option value="Equipo Audiovisual">Equipo Audiovisual</option><option value="Mobiliario Didáctico">Mobiliario Didáctico</option><option value="Dispositivo de Conectividad">Dispositivo de Conectividad</option>
                      </select>
                  </div>
                  <div className="form-group flex-1">
                      <label>ESTADO FÍSICO *</label>
                      <select className="custom-input select-input" value={quickResourceForm.EstadoFisicoInicial} onChange={e => setQuickResourceForm({...quickResourceForm, EstadoFisicoInicial: e.target.value})}>
                          <option value="Nuevo">Nuevo</option>
                          <option value="Bueno">Bueno</option>
                          <option value="Regular">Regular</option>
                          <option value="Malo / Dañado">Malo / Dañado</option>
                      </select>
                  </div>
              </div>

              <div className="form-row margin-bottom-10">
                  <div className="form-group flex-2 relative-position">
                      <label>TÍTULO / NOMBRE DEL RECURSO *</label>
                      <input className="custom-input" value={quickResourceForm.Titulo} onChange={e => { setQuickResourceForm({...quickResourceForm, Titulo: e.target.value, RecursoExistente: null}); setShowSugerenciasCatalogo(true); }} onFocus={() => setShowSugerenciasCatalogo(true)} onBlur={() => setTimeout(() => setShowSugerenciasCatalogo(false), 200)} />
                      {showSugerenciasCatalogo && quickResourceForm.Titulo && (
                      <div className="sugerencias-box">
                          {catalogoDB.filter(c => c.TipoRecurso === quickResourceForm.TipoRecurso && c.Titulo.toLowerCase().includes(quickResourceForm.Titulo.toLowerCase())).length > 0 ? (
                            catalogoDB.filter(c => c.TipoRecurso === quickResourceForm.TipoRecurso && c.Titulo.toLowerCase().includes(quickResourceForm.Titulo.toLowerCase())).map(cat => (
                              <div key={cat.Recurso_ID} className="sugerencia-item" onMouseDown={() => { setQuickResourceForm({...quickResourceForm, Titulo: cat.Titulo, RecursoExistente: cat}); setShowSugerenciasCatalogo(false); }}>
                                <span className="item-title">{cat.Titulo}</span> <span className="item-subtitle">({cat.Autor || cat.Marca || cat.TemaRecurso})</span>
                              </div>
                          ))
                          ) : (<div className="sugerencia-item error">Este será un título nuevo en el catálogo</div>)}
                      </div>
                      )}
                  </div>
                  
                  {!quickResourceForm.RecursoExistente && (
                    <div className="form-group flex-1">
                        <label>{['Libro', 'Revista / Artículo Científico', 'Tesis', 'Enciclopedia / Diccionario'].includes(quickResourceForm.TipoRecurso) ? "PORTADA (OPCIONAL)" : "FOTO (OPCIONAL)"}</label>
                        <input className="custom-input input-file-padding" type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files ? e.target.files[0] : null;
                            if (file) { setQuickImageFile(file); setQuickPreviewImage(URL.createObjectURL(file)); }
                        }} />
                    </div>
                  )}
              </div>
              
              {quickPreviewImage && !quickResourceForm.RecursoExistente && (
                  <div className="preview-container">
                      <img src={quickPreviewImage} alt="preview" className="preview-img-mini" />
                      <span className="preview-success-msg">Imagen seleccionada.</span>
                  </div>
              )}

              {quickResourceForm.RecursoExistente ? (
                  <div className="recurso-existente-msg">
                      ✅ Este recurso ya está en el catálogo. Se creará una nueva copia física directamente en el inventario.
                  </div>
              ) : (
                  <>
                      <div className="form-row margin-bottom-10">
                          <div className="form-group flex-1"><label>ÁREA / TEMA</label><input className="custom-input" value={quickResourceForm.TemaRecurso} onChange={e => setQuickResourceForm({...quickResourceForm, TemaRecurso: e.target.value})} /></div>
                          <div className="form-group flex-1">
                              <label>AÑO / FECHA</label>
                              <input className="custom-input" type="number" max={currentYear} value={quickResourceForm.AnioPublicacion} onChange={e => setQuickResourceForm({...quickResourceForm, AnioPublicacion: e.target.value})} />
                          </div>
                      </div>

                      {renderCamposRecursoDinamico()}

                      <div className="form-group margin-top-15"><label>OBSERVACIONES</label><input className="custom-input" value={quickResourceForm.Observaciones} onChange={e => setQuickResourceForm({...quickResourceForm, Observaciones: e.target.value})} /></div>
                  </>
              )}

              <div className="flex-justify-end margin-top-20">
                <button className="btn-pdf-text" onClick={() => { setShowQuickResourceModal(false); setQuickResourceForm({ Unidad_ID: '', TipoRecurso: 'Libro', Titulo: '', TemaRecurso: '', AnioPublicacion: new Date().getFullYear().toString(), Observaciones: '', Autor: '', ClasificacionISBN: '', Editorial: '', EdicionVolumen: '', Marca: '', NumSerie: '', EstadoFisicoInicial: 'Nuevo', Material: '', Asesor: '', Carrera: '', RecursoExistente: null }); setQuickImageFile(null); setQuickPreviewImage(null); }} disabled={loadingModal}>Cancelar</button>
                <button className="btn-pdf-img" onClick={handleGuardarAltaRapidaRecurso} disabled={loadingModal}>{loadingModal ? 'Procesando...' : 'Guardar en Inventario'}</button>
              </div>
            </div>
          </div>
        )}

        {/* NUEVO MODAL DE ÚLTIMO EJEMPLAR (COLOR NARANJA) */}
        {/* ... código del modal de advertencia ... */}

        {/* --- TOOLTIP MODAL INFORMATIVO (FOQUITO) --- */}
        {showHelp && (
          <div className="help-tooltip-overlay" onClick={() => setShowHelp(false)}>
            <div className="help-tooltip-content" onClick={e => e.stopPropagation()}>
              <div className="help-tooltip-header">
                <h3><IonIcon icon={bulbOutline} /> Guía de Búsqueda de Préstamos</h3>
                <IonIcon icon={closeCircleOutline} className="close-help-icon" onClick={() => setShowHelp(false)} />
              </div>
              <p>Escribe tu criterio de búsqueda directamente en la barra superior y presiona la lupa o la tecla Enter:</p>
              
              <table className="help-tooltip-table">
                <thead>
                  <tr><th>¿Qué deseas buscar?</th><th>Instrucción de búsqueda</th><th>Ejemplo de entrada</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>ID</strong></td><td>Introduce el número único de identificación del préstamo.</td><td><code className="code-badge">12</code></td></tr>
                  <tr><td><strong>Usuario</strong></td><td>Escribe la matrícula, nombre o apellidos del estudiante.</td><td><code className="code-badge">240010066</code> o <code className="code-badge">Noel</code></td></tr>
                  <tr><td><strong>Recursos Prestados</strong></td><td>Filtra tecleando el título del recurso o código de unidad.</td><td><code className="code-badge">Agritech</code></td></tr>
                  <tr><td><strong>Entregó / Recibió</strong></td><td>Busca por el nombre del personal que procesó el trámite.</td><td><code className="code-badge">Gaxiola</code></td></tr>
                  <tr><td><strong>Estado</strong></td><td>Busca por la situación actual del préstamo.</td><td><code className="code-badge">Activo</code> o <code className="code-badge">Devuelto</code></td></tr>
                </tbody>
              </table>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                💡 Tip: Puedes combinar los filtros del buscador junto al selector de rango de tiempo de la derecha para segmentar tu historial de forma exacta.
              </p>
            </div>
          </div>
        )}

        <div className="prestamos-layout">
          <div className="main-top-header">
            <div>
              <h1><IonIcon icon={swapHorizontalOutline} className="header-icon" /> Préstamos</h1>
              <p>Control de salidas y devoluciones de recursos bibliográficos.</p>
            </div>
            <div className="header-actions">
              <IonButton fill="outline" color="danger" className="btn-export" onClick={exportToPDF} disabled={isProcessing}><IonIcon icon={documentTextOutline} slot="start" /> PDF</IonButton>
              <IonButton fill="outline" color="success" className="btn-export" onClick={exportToExcel} disabled={isProcessing}><IonIcon icon={gridOutline} slot="start" /> Excel</IonButton>
              <IonButton className="btn-nueva" onClick={() => showForm ? setShowForm(false) : openForm()} disabled={isProcessing}><IonIcon icon={addOutline} slot="start" /> {showForm ? 'Cancelar' : 'Nuevo Préstamo'}</IonButton>
            </div>
          </div>

          <div className="sticky-searchbar">
            <IonSearchbar 
              style={{ flex: 1, minWidth: '200px' }}
              placeholder="Buscar código, alumno, personal o estado..." 
              value={searchQuery} 
              onIonInput={(e: any) => {
                const newValue = e.target.value || '';
                setSearchQuery(newValue);
                if (newValue.trim() === '') {
                  fetchPage(1, '', rangoFecha);
                }
              }}
              onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
              onIonClear={() => {
                setSearchQuery('');
                fetchPage(1, '', rangoFecha);
              }}
              disabled={isProcessing || isInitialLoading}
            />
            
            <IonButton className="btn-buscar-lupa" onClick={handleSearch} disabled={isProcessing || isInitialLoading}>
              <IonIcon icon={searchOutline} />
            </IonButton>

            {/* SELECTOR TIPO DASHBOARD */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <select 
                className="custom-input" 
                style={{ height: '44px', width: '160px', padding: '0 10px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
                value={rangoFecha}
                onChange={e => {
                  setRangoFecha(e.target.value);
                  fetchPage(1, searchQuery, e.target.value);
                }}
                disabled={isProcessing || isInitialLoading}
              >
                <option value="todo">Todo el historial</option>
                <option value="hoy">Hoy</option>
                <option value="7_dias">Últimos 7 días</option>
                <option value="30_dias">Últimos 30 días</option>
                <option value={currentMonthValue}>Este mes</option>
              </select>
            </div>

            {/* FOQUITO A LA DERECHA */}
            <button className="btn-bulb-help" onClick={() => setShowHelp(true)} title="Ver guía de búsqueda" style={{ flexShrink: 0 }}>
              <IonIcon icon={bulbOutline} />
            </button>

            <span className="results-count" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              {totalRecords} encontrados
            </span>
          </div>

          {showForm && (
            <div className="prestamos-form-card">
              <h3 className="form-title">{isEditing ? 'Editar Préstamo' : 'Nuevo Préstamo'}</h3>
              
              <div className="form-row">
                <div className="form-group flex-2">
                  <div className="flex-space-between">
                    <label>ESTUDIANTE / USUARIO * {isEditing && <span className="icon-danger">(Bloqueado)</span>}</label>
                    {!isEditing && <span className="link-alta-rapida" onClick={() => setShowQuickUserModal(true)}><IonIcon icon={personAddOutline}/> + Alta Rápida</span>}
                  </div>
                  
                  {isEditing ? (
                    <input className="custom-input" disabled value={formData.NombreEstudianteText} />
                  ) : (
                    <div className="flex-column gap-8">
                      {usuarioEncontrado ? (
                        <div className="user-selected-box">
                          <span>✅ Seleccionado: {usuarioEncontrado.NombreUsuario} {usuarioEncontrado.ApellidoPaterno}</span>
                          <IonIcon icon={closeCircleOutline} className="icon-action icon-success" onClick={() => setMatriculaBuscada('')} title="Quitar selección" />
                        </div>
                      ) : (
                        <>
                          <div className="relative-position">
                            <IonIcon icon={searchOutline} className="input-icon" />
                            <input className="custom-input input-with-icon" placeholder="Buscar Matrícula" value={matriculaBuscada} onChange={(e) => setMatriculaBuscada(e.target.value)} />
                          </div>
                          {matriculaBuscada.length > 3 && !usuarioEncontrado && (
                            <div className="user-not-found-box">
                              <span>❌ Usuario no encontrado.</span>
                              <span className="link-alta-rapida" onClick={() => { setQuickUserForm({...quickUserForm, Matricula: matriculaBuscada}); setShowQuickUserModal(true); }}><IonIcon icon={personAddOutline} className="align-center"/> Dar de alta</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group flex-2">
                  <label>PERSONAL QUE ENTREGA * {isEditing && <span className="icon-danger">(Bloqueado)</span>}</label>
                  <select className="custom-input select-input" value={formData.PersonalEntrega_ID || ''} onChange={e => setFormData({...formData, PersonalEntrega_ID: e.target.value})} disabled={isEditing}>
                    <option value="" disabled>Seleccione personal...</option>
                    {personalDB.map((pers) => (<option key={pers.Personal_ID} value={pers.Personal_ID}>{pers.NombrePersonal} {pers.ApellidoPaterno || ''}</option>))}
                  </select>
                </div>
              </div>

              {!isEditing && (
                <div className="form-row dynamic-fields-container">
                  <div className="form-group flex-1 relative-position">
                    <div className="flex-space-between">
                        <label>BUSCAR LIBRO O CÓDIGO *</label>
                        <span className="link-alta-rapida" onClick={() => { setQuickResourceForm({...quickResourceForm, Unidad_ID: codigoBuscado}); setShowQuickResourceModal(true); }}><IonIcon icon={cubeOutline}/> + Alta Rápida</span>
                    </div>
                    <div className="relative-position">
                      <IonIcon icon={bookOutline} className="input-icon" />
                      <input className="custom-input input-with-icon border-purple" value={codigoBuscado} placeholder="Nombre o Código" onChange={e => setCodigoBuscado(e.target.value)} />
                    </div>

                    {codigoBuscado.trim().length > 0 && (
                      <div className="sugerencias-box search-results-box">
                        {isSearchingInv ? (
                           <div className="flex-column align-center" style={{ padding: '15px', color: '#6b7280', fontSize: '13px' }}>Buscando en servidor...</div>
                        ) : inventarioResultados.length > 0 ? (
                          inventarioResultados.map(inv => {
                            const isDisponible = inv.EstadoDisponibilidad === 'Disponible';
                            return (
                              <div key={inv.Unidad_ID} className={`search-result-item ${!isDisponible ? 'disabled' : ''}`} onClick={() => isDisponible && handleAgregarCodigoSeleccionado(inv)}>
                                <span className="item-title"><span className="item-id">{inv.Unidad_ID}</span> - {inv.Titulo}</span>
                                {isDisponible ? <span className="status-available">🟢 Disponible en estante</span> : <span className="status-unavailable">🔴 No disponible ({inv.EstadoDisponibilidad})</span>}
                              </div>
                            )
                          })
                        ) : (
                          <div className="flex-column gap-8 align-center" style={{ padding: '15px', fontSize: '13px', color: '#ef4444' }}>
                            <span>❌ No hay libros disponibles.</span>
                            <button className="btn-pdf-text" onClick={() => { setQuickResourceForm({...quickResourceForm, Unidad_ID: codigoBuscado}); setShowQuickResourceModal(true); }}>Dar de alta en Inventario</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-group flex-2">
                    <label>LISTA DE RECURSOS A PRESTAR ({unidadesSeleccionadas.length})</label>
                    <div className="recursos-prestamo-list">
                      {unidadesSeleccionadas.length === 0 ? <p className="empty-list-msg">No se han agregado recursos al préstamo.</p> : 
                        unidadesSeleccionadas.map(u => (
                          <div key={u.Unidad_ID} className="recurso-list-item">
                            <span className="item-title"><strong className="item-id">{u.Unidad_ID}</strong> - {u.Titulo}</span>
                            <IonIcon icon={closeCircleOutline} className="icon-action icon-danger" onClick={() => handleRemoverUnidad(u.Unidad_ID)}/>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              )}

              <div className="form-row margin-top-15">
                <div className="form-group flex-1">
                  <label>
                    FECHA DE SALIDA * {isEditing && <span className="icon-danger">(Bloqueada)</span>}
                  </label>
                  <input 
                      className="custom-input" 
                      type="date" 
                      value={formData.FechaSalida} 
                      disabled={true} 
                  />
                </div>
                
                <div className="form-group flex-1">
                  <label>FECHA DE DEVOLUCIÓN *</label>
                  <input 
                      className="custom-input" 
                      type={formData.FechaDevolucionEstablecida ? "date" : "text"} 
                      placeholder="Seleccione fecha..."
                      onFocus={(e) => e.target.type = 'date'}
                      onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                      value={formData.FechaDevolucionEstablecida} 
                      onChange={e => setFormData({...formData, FechaDevolucionEstablecida: e.target.value})} 
                  />
                </div>

                <div className="form-group flex-1">
                  <label>ESTADO DEL PRÉSTAMO *</label>
                  <select className="custom-input select-input" value={formData.EstadoPrestamo || ''} onChange={e => setFormData({...formData, EstadoPrestamo: e.target.value})}>
                    <option value="Activo">Activo</option>
                    <option value="Devuelto">Devuelto</option>
                    <option value="Atrasado">Atrasado</option>
                    <option value="Finalizado (Sanción)">Finalizado (Sanción)</option> {/* <--- OPCIÓN NUEVA */}
                  </select>
                </div>
              </div>

              {isEditing && (
                  <div className="form-row margin-top-15">
                      <div className="form-group flex-2">
                        <label>PERSONAL QUE RECIBE (Llenar al devolver)</label>
                        <select 
                            className="custom-input select-input" 
                            value={formData.PersonalRecibe_ID || ''} 
                            onChange={e => setFormData({...formData, PersonalRecibe_ID: e.target.value, EstadoPrestamo: 'Devuelto'})}
                        >
                            <option value="">Aún no devuelto...</option>
                            {personalDB.map((pers) => (<option key={pers.Personal_ID} value={pers.Personal_ID}>{pers.NombrePersonal} {pers.ApellidoPaterno || ''}</option>))}
                        </select>
                      </div>
                  </div>
              )}

              <div className="form-row margin-top-15">
                  <div className="form-group align-bottom flex-1">
                    <button className="btn-guardar-inline" onClick={saveRecord} disabled={isProcessing}>GUARDAR PRÉSTAMO</button>
                  </div>
              </div>

            </div>
          )}

          <div className="prestamos-table-card">
            <div className="table-responsive">
              <table className="tabla-dinamica">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '30px' }}>ID</th>
                    <th>USUARIO</th>
                    <th>RECURSOS PRESTADOS</th>
                    <th>ENTREGÓ / RECIBIÓ</th>
                    <th>SALIDA / DEVOLUCIÓN</th>
                    <th style={{ textAlign: 'center' }}>ESTADO</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.Prestamo_ID}>
                      <td style={{ paddingLeft: '30px', fontWeight: '500', verticalAlign: 'middle' }}>{r.Prestamo_ID}</td>
                      <td style={{ fontWeight: 'bold', color: '#111827', verticalAlign: 'middle' }}>
                          <div className="usuario-text-limit">
                              {r.NombreEstudiante}
                          </div>
                          <span style={{fontSize: '11px', color: '#6b7280', fontWeight: 'normal'}}>Matrícula: {r.Matricula}</span>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}><div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px', color: '#4b5563' }} title={r.RecursosPrestados}>{r.RecursosPrestados}</div></td>
                      <td style={{ fontSize: '12px', verticalAlign: 'middle' }}>
                          <span style={{color: '#6b7280'}}>Entregó:</span> {r.NombrePersonalEntrega} <br/>
                          <span style={{color: '#6b7280'}}>Recibió:</span> {r.NombrePersonalRecibe}
                      </td>
                      <td style={{ fontSize: '13px', verticalAlign: 'middle' }}>
                          Sal: {r.FechaSalida ? r.FechaSalida.split(' ')[0] : '-'} <br/>
                          Dev: {r.FechaDevolucionEstablecida ? r.FechaDevolucionEstablecida.split(' ')[0] : '-'}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}><span className={getEstadoBadgeClass(r.EstadoPrestamo)}>{r.EstadoPrestamo}</span></td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', gap: '8px' }}>
                            <IonButton className="btn-action btn-edit" fill="clear" onClick={() => openForm(r)} title="Editar"><IonIcon icon={createOutline} /></IonButton>
                            <IonButton className="btn-action btn-delete" fill="clear" onClick={() => handleDelete(r.Prestamo_ID)} title="Eliminar"><IonIcon icon={trashOutline} /></IonButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (<tr><td colSpan={8} className="empty-state">No hay préstamos registrados para los criterios seleccionados.</td></tr>)}
                </tbody>
              </table>
            </div>
            
            <div className="footer-card">
              <span className="total-registro-text">Página {currentPage} de {lastPage}</span>
              <div className="pagination-container">
                <button className="btn-page btn-page-nav" disabled={currentPage === 1} onClick={() => fetchPage(currentPage - 1)}><IonIcon icon={chevronBackOutline} /></button>
                {getPageNumbers().map(pageNum => (
                  <button key={pageNum} className={`btn-page ${currentPage === pageNum ? 'active' : ''}`} onClick={() => fetchPage(pageNum)}>{pageNum}</button>
                ))}
                <button className="btn-page btn-page-nav" disabled={currentPage === lastPage || lastPage === 0} onClick={() => fetchPage(currentPage + 1)}><IonIcon icon={chevronForwardOutline} /></button>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Prestamos;
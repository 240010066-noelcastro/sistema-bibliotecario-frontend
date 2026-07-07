import React, { useState, useEffect, useRef } from 'react';
import { IonContent, IonPage, IonIcon, IonButton, IonSearchbar, useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, documentTextOutline, gridOutline, addOutline, bookOutline, videocamOutline, newspaperOutline, schoolOutline, desktopOutline, libraryOutline, easelOutline, wifiOutline, createOutline, trashOutline, imageOutline, closeCircleOutline, checkmarkCircleOutline, warningOutline, searchOutline, bulbOutline } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import api from '../../services/api'; 
import './Catalogo.css';

const modulos = [
  { nombre: 'Libro', icon: bookOutline },
  { nombre: 'Equipo Audiovisual', icon: videocamOutline },
  { nombre: 'Revista / Artículo Científico', icon: newspaperOutline },
  { nombre: 'Tesis', icon: schoolOutline },
  { nombre: 'Enciclopedia / Diccionario', icon: libraryOutline },
  { nombre: 'Mobiliario Didáctico', icon: easelOutline },
  { nombre: 'Dispositivo de Conectividad', icon: wifiOutline },
];

const Catalogo: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const [activeModule, setActiveModule] = useState('Libro');
  const [submenuOpen, setSubmenuOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ESTADOS DE CARGA Y OPTIMIZACIÓN
  const [isModuleLoading, setIsModuleLoading] = useState(true); 
  const [isProcessing, setIsProcessing] = useState(false); 
  const [isSearchingApi, setIsSearchingApi] = useState(false); 
  const abortControllerRef = useRef<AbortController | null>(null);

  const [showHelp, setShowHelp] = useState(false);

  // NOTIFICACIONES Y MODALES
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: () => {} });
  // 🏛️ NUEVO: Estado para capturar la advertencia relacional de duplicidad de temas
  const [themeWarningDialog, setThemeWarningDialog] = useState({ show: false, targetTema: '', coincidencia: '' });

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // ---> NUEVO: ESTADO PARA EL MODAL DE AVISO LEGAL
  const [avisoModal, setAvisoModal] = useState({ show: false, mensaje: '', url: '', isPdf: false });

  // Función profesional con estrategia Fallback (Mensaje del libro o mensaje global de la tuerca)
  const handleOpenLink = (e: any, url: string, mensajeLegal: string, isPdf: boolean = false) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    let mensajeFinal = mensajeLegal ? String(mensajeLegal).trim() : '';

    // ESTRATEGIA FALLBACK: Si el libro no tiene mensaje (viejos o vacíos), heredamos el global de Ajustes
    if (mensajeFinal === '') {
      if (activeModule === 'Libro') mensajeFinal = textosLegales.libro;
      else if (activeModule === 'Revista / Artículo Científico') mensajeFinal = textosLegales.revista;
      else if (activeModule === 'Enciclopedia / Diccionario') mensajeFinal = textosLegales.enciclopedia;
      else if (activeModule === 'Tesis') mensajeFinal = textosLegales.tesis;
    }

    // Si encontramos un mensaje (ya sea del libro o el global), mostramos el modal premium
    if (mensajeFinal !== '') {
      setAvisoModal({ show: true, mensaje: mensajeFinal, url: url || '', isPdf: isPdf });
    } else {
      // Si de verdad no hay configuraciones ni mensajes, abre directo por seguridad
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        showToast("Este recurso no tiene un enlace válido guardado.", "danger");
      }
    }
  };

  // NUEVO: ESTADOS PARA GUARDAR LAS PLANTILLAS LEGALES
  const [textosLegales, setTextosLegales] = useState({
    libro: '', revista: '', enciclopedia: '', tesis: ''
  });

  const [formData, setFormData] = useState<any>({ 
    Recurso_ID: null, Titulo: '', TemaRecurso: '', AnioPublicacion: '', TipoRecurso: '',
    Autor: '', Editorial: '', ClasificacionISBN: '', EdicionVolumen: '', 
    Imagen_path: '', Observaciones: '', Marca: '', NumSerie: '', Estado: '', Material: '', Cantidad: '', Asesor: '', Carrera: '', URL_Externa: '', Mensaje_Legal: ''
  });

  const [autoresDB, setAutoresDB] = useState<string[]>([]);
  const [editorialesDB, setEditorialesDB] = useState<{nombre: string, isbn: string}[]>([]);
  
  const [showSugerenciasAutor, setShowSugerenciasAutor] = useState(false);
  const [showSugerenciasEditorial, setShowSugerenciasEditorial] = useState(false);

  // 🏛️ NUEVOS ESTADOS PARA EL SUB-CATÁLOGO DE TEMAS Y MODAL DE CONFIRMACIÓN
  const [temasResultados, setTemasResultados] = useState<any[]>([]);
  const [showSugerenciasTema, setShowSugerenciasTema] = useState(false);
  const [isSearchingTema, setIsSearchingTema] = useState(false);
  
  // Estados para abrir la ventana modal y guardar el objeto
  const [showModalTema, setShowModalTema] = useState(false);
  const [nuevoTema, setNuevoTema] = useState({ nombre: '' });

  // 🏛️ NUEVO CANDADO: Almacena los strings oficiales de la BD para bloquear el botón Guardar si hay errores de dedo
  const [temasValidosDB, setTemasValidosDB] = useState<string[]>([]);

  // ---> NUEVO: ESTADOS Y FUNCIONES PARA ALTA RÁPIDA (ACTUALIZADO CON TODOS LOS CAMPOS)
  const [showModalAutor, setShowModalAutor] = useState(false);
  const [nuevoAutor, setNuevoAutor] = useState({ nombre: '', apellidos: '', seudonimo: '', tipo: 'Personal', nacionalidad: '', email: '', telefono: '', notas: '' });

  const [showModalEditorial, setShowModalEditorial] = useState(false);
  const [nuevaEditorial, setNuevaEditorial] = useState({ nombre: '', razonSocial: '', prefijo: '', email: '', pais: '', otrosDatos: '', direccion: '', observaciones: '' });

  const saveAutorRapido = async () => {
    if (!nuevoAutor.nombre || !nuevoAutor.tipo) return showToast("Llena los campos obligatorios (*).", "danger");
    setIsProcessing(true);
    try {
      await api.post('/autores', { NombreAutor: nuevoAutor.nombre, ApellidosAutor: nuevoAutor.apellidos, Seudonimo: nuevoAutor.seudonimo, TipoAutor: nuevoAutor.tipo, Nacionalidad: nuevoAutor.nacionalidad, Email: nuevoAutor.email, Telefono: nuevoAutor.telefono, Bibliografia: nuevoAutor.notas });
      const fullName = `${nuevoAutor.nombre} ${nuevoAutor.apellidos || ''}`.trim();
      setAutoresDB(prev => [...prev, fullName]);
      setFormData((prev: any) => ({ ...prev, Autor: fullName }));
      setShowModalAutor(false);
      setNuevoAutor({ nombre: '', apellidos: '', seudonimo: '', tipo: 'Personal', nacionalidad: '', email: '', telefono: '', notas: '' });
      showToast("¡Autor registrado y seleccionado!", "success");
    } catch (error) {
      showToast("Error al guardar el autor.", "danger");
    } finally { setIsProcessing(false); }
  };

  const saveEditorialRapido = async () => {
    if (!nuevaEditorial.nombre) return showToast("El nombre de la editorial es obligatorio (*).", "danger");
    setIsProcessing(true);
    try {
      await api.post('/editoriales', { NombreEditorial: nuevaEditorial.nombre, RazonSocial: nuevaEditorial.razonSocial, PrefijoISBN: nuevaEditorial.prefijo, EmailContacto: nuevaEditorial.email, PaisOrigen: nuevaEditorial.pais, OtrosDatosContacto: nuevaEditorial.otrosDatos, DireccionFisica: nuevaEditorial.direccion, Observaciones: nuevaEditorial.observaciones });
      setEditorialesDB(prev => [...prev, { nombre: nuevaEditorial.nombre, isbn: nuevaEditorial.prefijo || '' }]);
      setFormData((prev: any) => ({ ...prev, Editorial: nuevaEditorial.nombre }));
      setShowModalEditorial(false);
      setNuevaEditorial({ nombre: '', razonSocial: '', prefijo: '', email: '', pais: '', otrosDatos: '', direccion: '', observaciones: '' });
      showToast("¡Editorial registrada y seleccionada!", "success");
    } catch (error) {
      showToast("Error al guardar la editorial.", "danger");
    } finally { setIsProcessing(false); }
  };
  // <--- FIN NUEVO

  // 🏛️ NUEVO: Procesa el alta rápida de un área o tema desde su respectiva ventana modal
  const saveTemaRapido = async () => {
    if (!nuevoTema.nombre || !nuevoTema.nombre.trim()) {
      return showToast("El nombre del área o tema es obligatorio (*).", "danger");
    }
    setIsProcessing(true);
    try {
      const res = await api.post('/temas', { NombreTema: nuevoTema.nombre.trim() });
      if (res.data?.success) {
        setFormData((prev: any) => ({ ...prev, TemaRecurso: res.data.data.NombreTema }));
        
        // 🏛️ NUEVO: Lo inyectamos a los aprobados en memoria para que pase la validación de guardado
        setTemasValidosDB(prev => [...prev, res.data.data.NombreTema]);

        setShowModalTema(false);
        setNuevoTema({ nombre: '' });
        showToast("¡Área / Tema registrado y seleccionado!", "success");
      }
    } catch (error) {
      showToast("Error al guardar el nuevo tema.", "danger");
    } finally {
      setIsProcessing(false);
    }
  };

  // APAGAR FOQUITO Y MODALES AL SALIR DEL MÓDULO (Evita caché de Ionic)
  useIonViewWillLeave(() => {
    setShowHelp(false);
    setShowModalAutor(false);
    setShowModalEditorial(false);
    setShowModalTema(false); // Limpieza de seguridad
  });

  // REINICIO Y LIMPIEZA ABSOLUTA AL ENTRAR AL APARTADO DESDE OTRO LADO
  useIonViewWillEnter(() => {
    setShowHelp(false); // Apagado síncrono al iniciar
    
    // ---> LIMPIEZA DE ALTAS RÁPIDAS
    setShowModalAutor(false);
    setShowModalEditorial(false);
    setNuevoAutor({ nombre: '', apellidos: '', seudonimo: '', tipo: 'Personal', nacionalidad: '', email: '', telefono: '', notas: '' });
    setNuevaEditorial({ nombre: '', razonSocial: '', prefijo: '', email: '', pais: '', otrosDatos: '', direccion: '', observaciones: '' });
    // <--- FIN LIMPIEZA ALTAS RÁPIDAS

    setActiveModule('Libro');
    setShowForm(false);
    setIsEditing(false);
    setSearchQuery('');
    setCurrentPage(1);
    setRecords([]); 
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
    setPdfModalOpen(false);
    setPreviewImage(null);
    setImageFile(null);
    setDocumentoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    setFormData({ 
      Recurso_ID: null, Titulo: '', TemaRecurso: '', AnioPublicacion: '', TipoRecurso: 'Libro',
      Autor: '', Editorial: '', ClasificacionISBN: '', EdicionVolumen: '', 
      Imagen_path: '', Observaciones: '', Marca: '', NumSerie: '', Estado: '', Material: '', Cantidad: '', Asesor: '', Carrera: '', URL_Externa: '', Mensaje_Legal: '',
      // NUEVOS CAMPOS DE RECOLECCIÓN
      Formato: '', Cantidad_Paginas: '', Idioma: '', Genero: '', Resumen: ''
    });

    const fetchInitialData = async () => {
      setIsModuleLoading(true);
      try {
        const res = await api.get(`/catalogo?page=1&search=&modulo=Libro`);
        setRecords(res.data?.data?.data || []);
        setCurrentPage(res.data?.data?.current_page || 1);
        setLastPage(res.data?.data?.last_page || 1);
        setTotalRecords(res.data?.data?.total || 0);

        // NUEVO: Descargar plantillas legales de la BD
        const configRes: any = await api.get('/configuraciones/Catalogo');
        const configData = configRes.data?.data || {};
        setTextosLegales({
          libro: configData.mensaje_legal_libro || '',
          revista: configData.mensaje_legal_revista || '',
          enciclopedia: configData.mensaje_legal_enciclopedia || '',
          tesis: configData.mensaje_legal_tesis || ''
        });

      } catch (err) {
        console.error(err);
      } finally {
        setIsModuleLoading(false);
      }
    };
    fetchInitialData();
  });

  // LAZY LOAD DE AUTORES, EDITORIALES Y TEMAS AUTORIZADOS
  useEffect(() => {
    if (showForm && (autoresDB.length === 0 || editorialesDB.length === 0 || temasValidosDB.length === 0)) {
      const fetchSelects = async () => {
        try {
          const [resAutores, resEditoriales, resTemas]: any = await Promise.all([
            api.get('/autores?all=true'), 
            api.get('/editoriales?all=true'),
            api.get('/temas/buscar?all=true') // 🏛️ NUEVO: Jalar nombres autorizados desde el inicio
          ]);
          setAutoresDB((resAutores.data?.data || []).map((a: any) => ((a.NombreAutor || '') + ' ' + (a.ApellidosAutor || '')).trim()));
          setEditorialesDB((resEditoriales.data?.data || []).map((e: any) => ({ nombre: e.NombreEditorial, isbn: e.ISBN_Editorial || '' })));
          
          // Guardamos la lista de textos válidos para el validador
          setTemasValidosDB(Array.isArray(resTemas.data?.data) ? resTemas.data.data : []);
        } catch (err) { console.error(err); }
      };
      fetchSelects();
    }
  }, [showForm, autoresDB.length, editorialesDB.length, temasValidosDB.length]);

  // 🏛️ NUEVO: Escucha el cambio del tema para generar predicciones sin errores de dedo
  useEffect(() => {
    if (!formData.TemaRecurso || formData.TemaRecurso.trim().length === 0 || !showSugerenciasTema) {
      setTemasResultados([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingTema(true);
      try {
        const res = await api.get(`/temas/buscar?term=${encodeURIComponent(formData.TemaRecurso)}`);
        setTemasResultados(res.data?.data || []);
      } catch (error) {
        console.error("Error al buscar temas relacionales:", error);
      } finally {
        setIsSearchingTema(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.TemaRecurso, showSugerenciasTema]);

  const fetchPage = async (page: number, search = searchQuery, modulo = activeModule) => {
    setIsProcessing(true);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await api.get(`/catalogo?page=${page}&search=${search}&modulo=${modulo}`, {
          signal: abortControllerRef.current.signal
      });
      setRecords(res.data?.data?.data || []);
      setCurrentPage(res.data?.data?.current_page || 1);
      setLastPage(res.data?.data?.last_page || 1);
      setTotalRecords(res.data?.data?.total || 0);
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.message !== 'canceled') console.error("Error al cargar datos:", err);
    } finally {
      setIsProcessing(false); 
      setIsModuleLoading(false);
    }
  };

  // Función para disparar la búsqueda solo al hacer clic en la lupa o dar Enter
  const handleSearch = () => {
    fetchPage(1, searchQuery, activeModule);
  };

  const handleModuleChange = async (modNombre: string) => {
    if (activeModule === modNombre) return;
    
    setIsModuleLoading(true);
    setRecords([]); 
    setActiveModule(modNombre);
    setShowForm(false);
    setIsEditing(false);
    setSearchQuery('');
    setCurrentPage(1);
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
    setPdfModalOpen(false);
    setPreviewImage(null);
    setImageFile(null);
    setDocumentoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setFormData({ 
      Recurso_ID: null, Titulo: '', TemaRecurso: '', AnioPublicacion: '', TipoRecurso: modNombre, 
      Autor: '', Editorial: '', ClasificacionISBN: '', EdicionVolumen: '', 
      Imagen_path: '', Observaciones: '', Marca: '', NumSerie: '', Estado: '', Material: '', Cantidad: '', Asesor: '', Carrera: '', URL_Externa: '', Mensaje_Legal: ''
    });
    
    fetchPage(1, '', modNombre);
  };

  const openForm = (record?: any) => {
    setImageFile(null);
    setDocumentoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (record) {
      setIsEditing(true);
      setFormData({ 
        ...record, Estado: record.EstadoFisico || '', Carrera: record.GradoCarrera || '',
        Autor: ['Libro', 'Tesis', 'Revista / Artículo Científico', 'Enciclopedia / Diccionario'].includes(record.TipoRecurso) ? (record.Autor || '') : '',
        Mensaje_Legal: record.Mensaje_Legal || ''
      });
      setPreviewImage(record.Imagen_url || null); 
    } else {
      setIsEditing(false);
      setFormData({ 
        Recurso_ID: null, Titulo: '', TemaRecurso: '', AnioPublicacion: '', TipoRecurso: activeModule, 
        Autor: '', Editorial: '', ClasificacionISBN: '', EdicionVolumen: '', 
        Imagen_path: '', Observaciones: '', Marca: '', NumSerie: '', Estado: '', Material: '', Cantidad: '', Asesor: '', Carrera: '', URL_Externa: '',
        Mensaje_Legal: '',
        // NUEVOS CAMPOS DE RECOLECCIÓN
        Formato: '', Cantidad_Paginas: '', Idioma: '', Genero: '', Resumen: ''
      });
      setPreviewImage(null);
    }
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
      setFormData({...formData, Imagen_path: file.name});
    }
  };

  const removeImage = () => {
    setPreviewImage(null);
    setImageFile(null);
    setFormData({...formData, Imagen_path: ''}); 
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ==========================================
  // LA MAGIA DE GOOGLE BOOKS API (SOLO PARA LIBROS)
  // ==========================================
  const searchGoogleBooks = async () => {
    if (!formData.ClasificacionISBN) {
      return showToast("Ingresa un código ISBN para poder buscarlo en la web.", "danger");
    }
    
    setIsSearchingApi(true);
    try {
      const cleanCode = formData.ClasificacionISBN.replace(/-/g, '').trim();
      
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanCode}&key=AIzaSyD66ud4Jasqzyq646nbo4sgEX5gUcnRflw`);
      const data = await res.json();
      
      if (data.items && data.items.length > 0) {
          const book = data.items[0].volumeInfo;
          
          // 🔍 HERRAMIENTA DE DIAGNÓSTICO: Imprime en la consola el objeto completo que manda Google
          console.log("=== DATOS EXTRAÍDOS DESDE GOOGLE ===", book);
          
          // 1. EXTRAER AÑO
          let year = formData.AnioPublicacion;
          if (book.publishedDate) year = book.publishedDate.substring(0, 4);
          
          // 2. EXTRAER AUTOR PRINCIPAL (Con soporte para campos alternativos de revistas)
          let author = formData.Autor;
          if (book.authors && book.authors.length > 0) {
              author = book.authors[0];
          } else if (book.contributors && book.contributors.length > 0) {
              author = book.contributors[0];
          }
          
          // 3. EXTRAER TEMAS
          let tema = formData.TemaRecurso;
          if (book.categories && book.categories.length > 0) {
              tema = book.categories.join(', ');
          }

          // 4. EXTRAER EDICIÓN / VOLUMEN
          let edicion = formData.EdicionVolumen;
          if (book.subtitle && (book.subtitle.toLowerCase().includes('vol') || book.subtitle.toLowerCase().includes('edici') || book.subtitle.toLowerCase().includes('num'))) {
              edicion = book.subtitle;
          }

          // 5. EXTRAER PORTADA
          let coverUrl = formData.Imagen_path;
          let preview = previewImage;
          if (book.imageLinks && book.imageLinks.thumbnail) {
              coverUrl = book.imageLinks.thumbnail.replace('http:', 'https:');
              preview = coverUrl;
          }
          
          // Mapeo seguro de idiomas devueltos por Google API
          const mapaIdiomas: any = { 'es': 'Español', 'en': 'Inglés', 'fr': 'Francés' };
          const idiomaDetectado = mapaIdiomas[book.language] || book.language || '';

          setFormData((prev: any) => ({
             ...prev,
             Titulo: book.title || prev.Titulo,
             Editorial: book.publisher || prev.Editorial,
             AnioPublicacion: year || prev.AnioPublicacion,
             Autor: author,
             EdicionVolumen: edicion,
             Imagen_path: coverUrl,
             Cantidad_Paginas: book.pageCount || '',
             Idioma: idiomaDetectado,
             Resumen: book.description || ''
          }));
          setPreviewImage(preview);
          
          if (book.publisher && !editorialesDB.some(e => e.nombre.toLowerCase() === book.publisher.toLowerCase())) {
              showToast("¡Datos importados! Ojo: La editorial devuelta no está en tu base de datos.", "success");
          } else {
              showToast(`¡Datos importados exitosamente usando el ISBN!`, "success");
          }
          
      } else {
          showToast(`No se encontró ningún recurso con ese código ISBN en Google.`, "danger");;
      }
    } catch (error) {
      showToast("Error de conexión con los servidores de Google.", "danger");
    } finally {
      setIsSearchingApi(false);
    }
  };

  const saveRecord = async () => {
    // Validamos TemaRecurso SOLO si es material bibliográfico
    if (!formData.Titulo || (isPrintMaterial && !formData.TemaRecurso) || !formData.AnioPublicacion) {
        return showToast("Llena los campos obligatorios (*)", "danger");
    }
    
    // 🏛️ EL CANDADO ANTICOLISIONES UX: Si es un libro/tesis/revista y el texto no está en temasValidosDB, se congela
    if (isPrintMaterial && !temasValidosDB.includes((formData.TemaRecurso || '').trim())) {
        return showToast("Error: El Área / Tema introducido no está guardado en la BD. Por favor, haz clic en el botón 'Alta Rápida' de arriba para confirmarlo oficialmente.", "danger");
    }

    if (parseInt(formData.AnioPublicacion, 10) > currentYear) return showToast(`El año no puede ser mayor al actual (${currentYear}).`, "danger");
    if (activeModule === 'Libro') {
      if (!autoresDB.includes((formData.Autor || '').trim())) return showToast("Error: El autor no está registrado en tu catálogo.", "danger");
      if (!editorialesDB.some(e => e.nombre === (formData.Editorial || '').trim())) return showToast("Error: La editorial no está registrada en tu catálogo.", "danger");
    }

    setIsProcessing(true);
    const payload = new FormData();
    // Añadimos todos los campos del formulario
    Object.keys(formData).forEach(key => { 
        if(formData[key] !== null) payload.append(key, formData[key]); 
    });
    
    // Añadimos archivos y enlaces específicamente
    if (imageFile) payload.append('imagen', imageFile);
    if (documentoFile) payload.append('documento_pdf', documentoFile);
    // Nota: formData.URL_Externa ya se incluye en el bucle anterior, así que ya se está enviando.

    // MAGIA: Elegir el endpoint correcto según la pestaña
    let endpoint = '/catalogo';
    switch(activeModule) {
      case 'Libro': endpoint = '/libros'; break;
      case 'Tesis': endpoint = '/tesis'; break;
      case 'Revista / Artículo Científico': endpoint = '/revistas'; break;
      case 'Equipo Audiovisual': endpoint = '/audiovisuales'; break;
      case 'Enciclopedia / Diccionario': endpoint = '/enciclopedias'; break;
      case 'Mobiliario Didáctico': endpoint = '/mobiliario-didactico'; break;
      case 'Dispositivo de Conectividad': endpoint = '/dispositivos-conectividad'; break;
    }

    try {
      if (isEditing) {
        payload.append('_method', 'PUT'); 
        await api.post(`${endpoint}/${formData.Recurso_ID}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
      } else {
        await api.post(endpoint, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
      }
      showToast(isEditing ? "¡Registro actualizado exitosamente!" : "¡Recurso registrado exitosamente!", "success");
      setShowForm(false);
      fetchPage(currentPage); 
    } catch (error: any) { 
        console.error("Detalle exacto del error:", error.response?.data);
        showToast(error.response?.data?.message || "Error en el servidor al guardar el registro.", "danger"); 
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = (id: any) => {
    setConfirmDialog({
      show: true,
      title: 'Eliminar Recurso',
      message: '¿Estás seguro de eliminar este recurso del catálogo? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        setIsProcessing(true);
        try { 
            await api.delete(`/catalogo/${id}`); 
            fetchPage(currentPage); 
            showToast("Recurso eliminado exitosamente.", "success");
        } catch (error) { 
            showToast("No se pudo eliminar el recurso.", "danger"); 
        } finally {
            setIsProcessing(false);
            setConfirmDialog({ show: false, title: '', message: '', onConfirm: () => {} });
        }
      }
    });
  };

  const handleIsbnChange = (e: any) => {
    const val = e.target.value;
    let autoEditorial = formData.Editorial || '';
    const cleanIsbn = val.replace(/-/g, '').trim();

    if (cleanIsbn.length >= 3) {
      const matchedEditorial = editorialesDB.find(ed => ed.isbn && cleanIsbn.startsWith(ed.isbn));
      if (matchedEditorial) autoEditorial = matchedEditorial.nombre;
    }
    setFormData({ ...formData, ClasificacionISBN: val, Editorial: autoEditorial });
  };

  const generatePDF = async (wantsImages: boolean) => {
    setPdfModalOpen(false);
    setIsProcessing(true);

    try {
      const res = await api.get(`/catalogo?all=true&search=${searchQuery}&modulo=${activeModule}&with_images=${wantsImages}`);
      const allData = res.data.data || [];
      const doc = new jsPDF('landscape');
      doc.text(`Catálogo de ${activeModule} - UPVE`, 14, 15);

      let headers: any[] = [];
      let body: any[] = [];

      if (activeModule === 'Libro') {
          headers = [['ID', ...(wantsImages ? ['Portada'] : []), 'Título de la Obra', 'Tema', 'Autor', 'ISBN', 'Edición / Vol', 'Editorial', 'Año']];
          body = allData.map((c: any) => [c.Recurso_ID, ...(wantsImages ? [''] : []), c.Titulo, c.TemaRecurso, c.Autor || '-', c.ClasificacionISBN || '-', c.EdicionVolumen || '-', c.Editorial || '-', c.AnioPublicacion]);
      } else if (activeModule === 'Revista / Artículo Científico') {
          headers = [['ID', ...(wantsImages ? ['Portada'] : []), 'Título', 'Tema', 'Autor / Investigador', 'ISSN', 'Edición / Vol', 'Editorial', 'Año']];
          body = allData.map((c: any) => [c.Recurso_ID, ...(wantsImages ? [''] : []), c.Titulo, c.TemaRecurso, c.Autor || '-', c.ClasificacionISSN || '-', c.EdicionVolumen || '-', c.Editorial || '-', c.AnioPublicacion]);
      } else if (activeModule === 'Tesis') {
          headers = [['ID', ...(wantsImages ? ['Portada'] : []), 'Título', 'Tema', 'Autor (Alumno)', 'Asesor', 'Carrera', 'Año']];
          body = allData.map((c: any) => [c.Recurso_ID, ...(wantsImages ? [''] : []), c.Titulo, c.TemaRecurso, c.AutorTexto || '-', c.Asesor || '-', c.GradoCarrera || '-', c.AnioPublicacion]);
      } else if (activeModule === 'Enciclopedia / Diccionario') {
          headers = [['ID', ...(wantsImages ? ['Portada'] : []), 'Título', 'Tema', 'Autor', 'Volumen / Tomo', 'ISBN', 'Editorial', 'Año']];
          body = allData.map((c: any) => [c.Recurso_ID, ...(wantsImages ? [''] : []), c.Titulo, c.TemaRecurso, c.Autor || '-', c.EdicionVolumen || '-', c.ClasificacionISBN || '-', c.Editorial || '-', c.AnioPublicacion]);
      } else if (activeModule === 'Equipo Audiovisual' || activeModule === 'Dispositivo de Conectividad') {
          headers = [['ID', ...(wantsImages ? ['Foto'] : []), 'Nombre del Equipo', 'Marca / Modelo', 'Núm. Serie', 'Año']];
          body = allData.map((c: any) => [c.Recurso_ID, ...(wantsImages ? [''] : []), c.Titulo, c.Marca || '-', c.NumSerie || '-', c.AnioPublicacion]);
      } else if (activeModule === 'Mobiliario Didáctico') {
          headers = [['ID', ...(wantsImages ? ['Foto'] : []), 'Nombre del Mobiliario', 'Marca', 'Material', 'Año']];
          body = allData.map((c: any) => [c.Recurso_ID, ...(wantsImages ? [''] : []), c.Titulo, c.Marca || '-', c.Material || '-', c.AnioPublicacion]);
      }

      let imagesBase64: any = {};
      if (wantsImages) {
        for (let i = 0; i < allData.length; i++) {
          if (allData[i].Imagen_base64) {
            imagesBase64[i] = allData[i].Imagen_base64;
          }
        }
      }

      autoTable(doc, { 
        startY: 20, 
        head: headers, 
        body: body, 
        theme: 'grid', 
        headStyles: { fillColor: [88, 44, 131], halign: 'center' },
        bodyStyles: { minCellHeight: wantsImages ? 25 : 8, valign: 'middle', halign: 'center' },
        columnStyles: wantsImages ? { 1: { cellWidth: 25 } } : {},
        rowPageBreak: 'avoid',
        didDrawCell: function(data) {
          if (wantsImages && data.section === 'body' && data.column.index === 1) {
            const rowIndex = data.row.index;
            if (imagesBase64[rowIndex]) {
              try {
                const imgData = imagesBase64[rowIndex];
                const format = imgData.includes('image/png') ? 'PNG' : 'JPEG';
                
                const imgSize = 18;
                const imgX = data.cell.x + (data.cell.width - imgSize) / 2;
                const imgY = data.cell.y + (data.cell.height - imgSize) / 2;
                
                doc.addImage(imgData, format, imgX, imgY, imgSize, imgSize);
              } catch (e) { console.error("Error al incrustar la imagen en el PDF", e); }
            }
          }
        }
      });
      doc.save(`UPVE_${activeModule.replace(/ /g, '_')}_Registros.pdf`);
      showToast("¡PDF descargado exitosamente!", "success");
    } catch (error) { 
        showToast("Hubo un problema al exportar el archivo.", "danger"); 
    } finally {
        setIsProcessing(false);
    }
  };

  const exportToExcel = async () => {
    setIsProcessing(true);
    try {
      const res = await api.get(`/catalogo?all=true&search=${searchQuery}&modulo=${activeModule}`);
      const allData = res.data.data || [];
      
      let mappedData: any[] = [];

      if (activeModule === 'Libro') {
          mappedData = allData.map((c: any) => ({ ID: c.Recurso_ID, 'Título de la Obra': c.Titulo, Tema: c.TemaRecurso, Autor: c.Autor || '-', ISBN: c.ClasificacionISBN || '-', 'Edición / Vol': c.EdicionVolumen || '-', Editorial: c.Editorial || '-', Año: c.AnioPublicacion }));
      } else if (activeModule === 'Revista / Artículo Científico') {
          mappedData = allData.map((c: any) => ({ ID: c.Recurso_ID, Título: c.Titulo, Tema: c.TemaRecurso, 'Autor / Investigador': c.Autor || '-', ISSN: c.ClasificacionISSN || '-', 'Edición / Vol': c.EdicionVolumen || '-', Editorial: c.Editorial || '-', Año: c.AnioPublicacion }));
      } else if (activeModule === 'Tesis') {
          mappedData = allData.map((c: any) => ({ ID: c.Recurso_ID, Título: c.Titulo, Tema: c.TemaRecurso, 'Autor (Alumno)': c.AutorTexto || '-', Asesor: c.Asesor || '-', Carrera: c.GradoCarrera || '-', Año: c.AnioPublicacion }));
      } else if (activeModule === 'Enciclopedia / Diccionario') {
          mappedData = allData.map((c: any) => ({ ID: c.Recurso_ID, Título: c.Titulo, Tema: c.TemaRecurso, Autor: c.Autor || '-', 'Volumen / Tomo': c.EdicionVolumen || '-', ISBN: c.ClasificacionISBN || '-', Editorial: c.Editorial || '-', Año: c.AnioPublicacion }));
      } else if (activeModule === 'Equipo Audiovisual' || activeModule === 'Dispositivo de Conectividad') {
          mappedData = allData.map((c: any) => ({ ID: c.Recurso_ID, 'Nombre del Equipo': c.Titulo, 'Marca / Modelo': c.Marca || '-', 'Núm. Serie': c.NumSerie || '-', Año: c.AnioPublicacion }));
      } else if (activeModule === 'Mobiliario Didáctico') {
          mappedData = allData.map((c: any) => ({ ID: c.Recurso_ID, 'Nombre del Mobiliario': c.Titulo, Marca: c.Marca || '-', Material: c.Material || '-', Año: c.AnioPublicacion }));
      }

      const ws = XLSX.utils.json_to_sheet(mappedData);
      const wb = XLSX.utils.book_new();
      const safeSheetName = activeModule.replace(/[:\\/?*[\]]/g, ' ').trim().substring(0, 30);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName); 
      XLSX.writeFile(wb, `UPVE_${safeSheetName}_Registros.xlsx`);
      showToast("¡Excel descargado exitosamente!", "success");
    } catch (error) { 
        showToast("Hubo un problema al exportar el archivo.", "danger"); 
    } finally {
        setIsProcessing(false);
    }
  };

  const isPrintMaterial = ['Libro', 'Revista / Artículo Científico', 'Tesis', 'Enciclopedia / Diccionario'].includes(activeModule);
  
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

  const renderDynamicFields = () => {
    // NUEVO: Identificamos la plantilla global para usarla de guía visual transparente (placeholder)
    let msjGuiaPlaceholder = '';
    if (activeModule === 'Libro') msjGuiaPlaceholder = textosLegales.libro;
    else if (activeModule === 'Revista / Artículo Científico') msjGuiaPlaceholder = textosLegales.revista;
    else if (activeModule === 'Enciclopedia / Diccionario') msjGuiaPlaceholder = textosLegales.enciclopedia;
    else if (activeModule === 'Tesis') msjGuiaPlaceholder = textosLegales.tesis;

    switch(activeModule) {
      case 'Libro': return (
        <>
          <div className="form-group flex-1" style={{ position: 'relative' }}>
            {/* ---> NUEVO: Label con Alta Rápida */}
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
              <label style={{marginBottom: 0}}>AUTOR *</label>
              <span style={{fontSize: '11px', color: '#582c83', cursor: 'pointer', fontWeight: 700}} onClick={() => setShowModalAutor(true)}><IonIcon icon={addOutline} style={{verticalAlign: 'middle'}}/> Alta Rápida</span>
            </div>
            {/* <--- FIN NUEVO */}
            <input className="custom-input" value={formData.Autor || ''} onChange={e => { setFormData({...formData, Autor: e.target.value}); setShowSugerenciasAutor(true); }} onFocus={() => setShowSugerenciasAutor(true)} onBlur={() => setTimeout(() => setShowSugerenciasAutor(false), 200)} />
            {showSugerenciasAutor && formData.Autor && (
              <div className="sugerencias-box">
                {autoresDB.filter(a => a.toLowerCase().includes(formData.Autor.toLowerCase())).length > 0 ? (
                  autoresDB.filter(a => a.toLowerCase().includes(formData.Autor.toLowerCase())).map(autor => (
                    <div key={autor} className="sugerencia-item" onMouseDown={() => { setFormData({...formData, Autor: autor}); setShowSugerenciasAutor(false); }}>{autor}</div>
                  ))
                ) : (<div className="sugerencia-item error">Ese autor no existe</div>)}
              </div>
            )}
          </div>
          
          <div className="form-group flex-1">
            <label>CLASIFICACIÓN ISBN</label>
            <div style={{ display: 'flex', gap: '8px' }}>
                <input className="custom-input" value={formData.ClasificacionISBN || ''} onChange={handleIsbnChange} placeholder="Ej. 978..." />
                
                {/* BOTÓN MAGICO DE GOOGLE BOOKS */}
                <button 
                  title="Autocompletar con Google Books"
                  className="btn-guardar-inline" 
                  style={{ minWidth: '45px', width: '45px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0' }} 
                  onClick={searchGoogleBooks}
                  disabled={isSearchingApi}
                >
                  <IonIcon icon={searchOutline} style={{ fontSize: '20px' }} />
                </button>
            </div>
          </div>

          <div className="form-group flex-1" style={{ position: 'relative' }}>
            {/* ---> NUEVO: Label con Alta Rápida */}
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
              <label style={{marginBottom: 0}}>EDITORIAL *</label>
              <span style={{fontSize: '11px', color: '#582c83', cursor: 'pointer', fontWeight: 700}} onClick={() => setShowModalEditorial(true)}><IonIcon icon={addOutline} style={{verticalAlign: 'middle'}}/> Alta Rápida</span>
            </div>
            {/* <--- FIN NUEVO */}
            <input className="custom-input" value={formData.Editorial || ''} onChange={e => { setFormData({...formData, Editorial: e.target.value}); setShowSugerenciasEditorial(true); }} onFocus={() => setShowSugerenciasEditorial(true)} onBlur={() => setTimeout(() => setShowSugerenciasEditorial(false), 200)} />
            {showSugerenciasEditorial && formData.Editorial && (
              <div className="sugerencias-box">
                {editorialesDB.filter(e => e.nombre.toLowerCase().includes(formData.Editorial.toLowerCase())).length > 0 ? (
                  editorialesDB.filter(e => e.nombre.toLowerCase().includes(formData.Editorial.toLowerCase())).map(ed => (
                    <div key={ed.nombre} className="sugerencia-item" onMouseDown={() => { setFormData({...formData, Editorial: ed.nombre}); setShowSugerenciasEditorial(false); }}>{ed.nombre}</div>
                  ))
                ) : (<div className="sugerencia-item error">Esa editorial no existe</div>)}
              </div>
            )}
          </div>
          <div className="form-group flex-1"><label>EDICIÓN</label><input className="custom-input" value={formData.EdicionVolumen || ''} onChange={e => setFormData({...formData, EdicionVolumen: e.target.value})} /></div>
          <div className="form-row" style={{ width: '100%', marginTop: '15px' }}>
            <div className="form-group flex-1">
              <label>ENLACE EXTERNO DE CONSULTA (OPCIONAL)</label>
              <input className="custom-input" type="url" placeholder="Ej. https://..." value={formData.URL_Externa || ''} onChange={e => setFormData({...formData, URL_Externa: e.target.value})} />
            </div>
            <div className="form-group flex-2">
              <label>AVISO LEGAL DEL ENLACE (EDITABLE)</label>
              <textarea 
                className="custom-input" 
                rows={2} 
                style={{ resize: 'vertical' }}
                placeholder={msjGuiaPlaceholder} /* NUEVO: Muestra el aviso global en letras grises si está vacío */
                value={formData.Mensaje_Legal || ''} 
                onChange={e => setFormData({...formData, Mensaje_Legal: e.target.value})} 
              />
            </div>
          </div>
        </>
      );
      case 'Revista / Artículo Científico': return (
        <>
          <div className="form-group flex-1" style={{ position: 'relative' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
              <label style={{marginBottom: 0}}>AUTOR / INVESTIGADOR</label>
              <span style={{fontSize: '11px', color: '#582c83', cursor: 'pointer', fontWeight: 700}} onClick={() => setShowModalAutor(true)}><IonIcon icon={addOutline} style={{verticalAlign: 'middle'}}/> Alta Rápida</span>
            </div>
            <input className="custom-input" value={formData.Autor || ''} onChange={e => { setFormData({...formData, Autor: e.target.value}); setShowSugerenciasAutor(true); }} onFocus={() => setShowSugerenciasAutor(true)} onBlur={() => setTimeout(() => setShowSugerenciasAutor(false), 200)} />
            {showSugerenciasAutor && formData.Autor && (
              <div className="sugerencias-box">
                {autoresDB.filter(a => a.toLowerCase().includes(formData.Autor.toLowerCase())).length > 0 ? (
                  autoresDB.filter(a => a.toLowerCase().includes(formData.Autor.toLowerCase())).map(autor => (
                    <div key={autor} className="sugerencia-item" onMouseDown={() => { setFormData({...formData, Autor: autor}); setShowSugerenciasAutor(false); }}>{autor}</div>
                  ))
                ) : (<div className="sugerencia-item error">Ese autor no existe</div>)}
              </div>
            )}
          </div>

          <div className="form-group flex-1" style={{ position: 'relative' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
              <label style={{marginBottom: 0}}>EDITORIAL / UNIVERSIDAD</label>
              <span style={{fontSize: '11px', color: '#582c83', cursor: 'pointer', fontWeight: 700}} onClick={() => setShowModalEditorial(true)}><IonIcon icon={addOutline} style={{verticalAlign: 'middle'}}/> Alta Rápida</span>
            </div>
            <input className="custom-input" value={formData.Editorial || ''} onChange={e => { setFormData({...formData, Editorial: e.target.value}); setShowSugerenciasEditorial(true); }} onFocus={() => setShowSugerenciasEditorial(true)} onBlur={() => setTimeout(() => setShowSugerenciasEditorial(false), 200)} />
            {showSugerenciasEditorial && formData.Editorial && (
              <div className="sugerencias-box">
                {editorialesDB.filter(e => e.nombre.toLowerCase().includes(formData.Editorial.toLowerCase())).length > 0 ? (
                  editorialesDB.filter(e => e.nombre.toLowerCase().includes(formData.Editorial.toLowerCase())).map(ed => (
                    <div key={ed.nombre} className="sugerencia-item" onMouseDown={() => { setFormData({...formData, Editorial: ed.nombre}); setShowSugerenciasEditorial(false); }}>{ed.nombre}</div>
                  ))
                ) : (<div className="sugerencia-item error">Esa editorial no existe</div>)}
              </div>
            )}
          </div>
          
          <div className="form-group flex-1">
            <label>CLASIFICACIÓN ISSN</label>
            <input className="custom-input" value={formData.ClasificacionISSN || ''} onChange={e => setFormData({...formData, ClasificacionISSN: e.target.value})} placeholder="Ej. 2044-8341" />
          </div>
          
          <div className="form-group flex-1">
            <label>EDICIÓN / VOLUMEN</label>
            <input className="custom-input" value={formData.EdicionVolumen || ''} onChange={e => setFormData({...formData, EdicionVolumen: e.target.value})} placeholder="Ej. Vol. 4 Núm. 2" />
          </div>
          
          <div className="form-row" style={{ width: '100%', marginTop: '15px' }}>
            <div className="form-group flex-1">
              <label>ENLACE EXTERNO DE CONSULTA (OPCIONAL)</label>
              <input className="custom-input" type="url" placeholder="Ej. https://..." value={formData.URL_Externa || ''} onChange={e => setFormData({...formData, URL_Externa: e.target.value})} />
            </div>
            <div className="form-group flex-2">
              <label>AVISO LEGAL DEL ENLACE (EDITABLE)</label>
              <textarea 
                className="custom-input" 
                rows={2} 
                style={{ resize: 'vertical' }}
                placeholder={msjGuiaPlaceholder} /* NUEVO: Muestra el aviso global en letras grises si está vacío */
                value={formData.Mensaje_Legal || ''} 
                onChange={e => setFormData({...formData, Mensaje_Legal: e.target.value})} 
              />
            </div>
          </div>
        </>
      );
      case 'Enciclopedia / Diccionario': return (
        <>
          <div className="form-row" style={{ marginBottom: '15px' }}>
            <div className="form-group flex-1" style={{ position: 'relative' }}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                <label style={{marginBottom: 0}}>AUTOR / COMPILADOR</label>
                <span style={{fontSize: '11px', color: '#582c83', cursor: 'pointer', fontWeight: 700}} onClick={() => setShowModalAutor(true)}><IonIcon icon={addOutline} style={{verticalAlign: 'middle'}}/> Alta Rápida</span>
              </div>
              <input className="custom-input" value={formData.Autor || ''} onChange={e => { setFormData({...formData, Autor: e.target.value}); setShowSugerenciasAutor(true); }} onFocus={() => setShowSugerenciasAutor(true)} onBlur={() => setTimeout(() => setShowSugerenciasAutor(false), 200)} />
              {showSugerenciasAutor && formData.Autor && (
                <div className="sugerencias-box">
                  {autoresDB.filter(a => a.toLowerCase().includes(formData.Autor.toLowerCase())).length > 0 ? (autoresDB.filter(a => a.toLowerCase().includes(formData.Autor.toLowerCase())).map(autor => (<div key={autor} className="sugerencia-item" onMouseDown={() => { setFormData({...formData, Autor: autor}); setShowSugerenciasAutor(false); }}>{autor}</div>))) : (<div className="sugerencia-item error">Ese autor no existe</div>)}
                </div>
              )}
            </div>

            <div className="form-group flex-1" style={{ position: 'relative' }}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                <label style={{marginBottom: 0}}>EDITORIAL *</label>
                <span style={{fontSize: '11px', color: '#582c83', cursor: 'pointer', fontWeight: 700}} onClick={() => setShowModalEditorial(true)}><IonIcon icon={addOutline} style={{verticalAlign: 'middle'}}/> Alta Rápida</span>
              </div>
              <input className="custom-input" value={formData.Editorial || ''} onChange={e => { setFormData({...formData, Editorial: e.target.value}); setShowSugerenciasEditorial(true); }} onFocus={() => setShowSugerenciasEditorial(true)} onBlur={() => setTimeout(() => setShowSugerenciasEditorial(false), 200)} />
              {showSugerenciasEditorial && formData.Editorial && (
                <div className="sugerencias-box">
                  {editorialesDB.filter(e => e.nombre.toLowerCase().includes(formData.Editorial.toLowerCase())).length > 0 ? (editorialesDB.filter(e => e.nombre.toLowerCase().includes(formData.Editorial.toLowerCase())).map(ed => (<div key={ed.nombre} className="sugerencia-item" onMouseDown={() => { setFormData({...formData, Editorial: ed.nombre}); setShowSugerenciasEditorial(false); }}>{ed.nombre}</div>))) : (<div className="sugerencia-item error">Esa editorial no existe</div>)}
                </div>
              )}
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: '15px' }}>
            <div className="form-group flex-1">
              <label>CLASIFICACIÓN ISBN</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="custom-input" value={formData.ClasificacionISBN || ''} onChange={handleIsbnChange} placeholder="Ej. 978..." />
                  
                  <button 
                    title="Autocompletar con Google Books"
                    className="btn-guardar-inline" 
                    style={{ minWidth: '45px', width: '45px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0' }} 
                    onClick={searchGoogleBooks}
                    disabled={isSearchingApi}
                  >
                    <IonIcon icon={searchOutline} style={{ fontSize: '20px' }} />
                  </button>
              </div>
            </div>
            <div className="form-group flex-1"><label>VOLUMEN / TOMO</label><input className="custom-input" value={formData.EdicionVolumen || ''} onChange={e => setFormData({...formData, EdicionVolumen: e.target.value})} placeholder="Ej. Tomo 1" /></div>
          </div>

          <div className="form-group flex-2" style={{ marginTop: '5px' }}>
            <label>ENLACE EXTERNO DE CONSULTA (OPCIONAL)</label>
            <div className="input-with-helper">
              <input className="custom-input" type="url" placeholder="Ej. https://..." value={formData.URL_Externa || ''} onChange={e => setFormData({...formData, URL_Externa: e.target.value})} />
              <p>
                <IonIcon icon={warningOutline} style={{ verticalAlign: 'middle', color: '#f59e0b' }}/> Al ingresar un enlace, el sistema mostrará automáticamente a los usuarios un aviso de que el recurso pertenece a un sitio externo ajeno a la biblioteca.
              </p>
            </div>
          </div>
        </>
      );
      case 'Tesis': return (
        <>
          <div className="form-group flex-1" style={{ position: 'relative' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
              <label style={{marginBottom: 0}}>AUTOR (ALUMNO) *</label>
              <span style={{fontSize: '11px', color: '#582c83', cursor: 'pointer', fontWeight: 700}} onClick={() => setShowModalAutor(true)}><IonIcon icon={addOutline} style={{verticalAlign: 'middle'}}/> Alta Rápida</span>
            </div>
            <input className="custom-input" value={formData.Autor || ''} onChange={e => { setFormData({...formData, Autor: e.target.value}); setShowSugerenciasAutor(true); }} onFocus={() => setShowSugerenciasAutor(true)} onBlur={() => setTimeout(() => setShowSugerenciasAutor(false), 200)} />
            {showSugerenciasAutor && formData.Autor && (<div className="sugerencias-box">{autoresDB.filter(a => a.toLowerCase().includes(formData.Autor.toLowerCase())).length > 0 ? (autoresDB.filter(a => a.toLowerCase().includes(formData.Autor.toLowerCase())).map(autor => (<div key={autor} className="sugerencia-item" onMouseDown={() => { setFormData({...formData, Autor: autor}); setShowSugerenciasAutor(false); }}>{autor}</div>))) : (<div className="sugerencia-item error">Ese autor no existe</div>)}</div>)}
          </div>
          <div className="form-group flex-1"><label>ASESOR *</label><input className="custom-input" value={formData.Asesor || ''} onChange={e => setFormData({...formData, Asesor: e.target.value})} /></div>
          <div className="form-group flex-1"><label>GRADO / CARRERA</label><input className="custom-input" value={formData.Carrera || ''} onChange={e => setFormData({...formData, Carrera: e.target.value})} /></div>
          <div className="form-row" style={{ width: '100%', marginTop: '15px' }}>
            <div className="form-group flex-1">
              <label>DOCUMENTO DIGITAL (PDF DE LA TESIS)</label>
              <input className="custom-input" type="file" accept=".pdf" onChange={(e) => setDocumentoFile(e.target.files ? e.target.files[0] : null)} style={{ padding: '10px 15px' }} />
            </div>
            <div className="form-group flex-2">
              <label>AUTORIZACIÓN INSTITUCIONAL (EDITABLE)</label>
              <textarea 
                className="custom-input" 
                rows={2} 
                style={{ resize: 'vertical' }}
                placeholder={msjGuiaPlaceholder}
                value={formData.Mensaje_Legal || ''} 
                onChange={e => setFormData({...formData, Mensaje_Legal: e.target.value})} 
              />
            </div>
          </div>
        </>
      );
      case 'Mobiliario Didáctico': return (
        <>
          <div className="form-row" style={{ marginBottom: '15px' }}>
            <div className="form-group flex-1"><label>MARCA / FABRICANTE</label><input className="custom-input" value={formData.Marca || ''} onChange={e => setFormData({...formData, Marca: e.target.value})} placeholder="Ej. Dico, Muebles Ideal..." /></div>
            <div className="form-group flex-1"><label>MATERIAL</label><input className="custom-input" value={formData.Material || ''} onChange={e => setFormData({...formData, Material: e.target.value})} placeholder="Ej. Madera, Metal, Plástico..." /></div>
          </div>
        </>
      );
      case 'Dispositivo de Conectividad': case 'Equipo Audiovisual': return (
        <>
          <div className="form-group flex-1"><label>MARCA / MODELO *</label><input className="custom-input" value={formData.Marca || ''} onChange={e => setFormData({...formData, Marca: e.target.value})} /></div>
          <div className="form-group flex-1"><label>NÚMERO DE SERIE / MODELO ESPECÍFICO</label><input className="custom-input" value={formData.NumSerie || ''} onChange={e => setFormData({...formData, NumSerie: e.target.value})} /></div>
        </>
      );
      default: return null;
    }
  };

  return (
    <IonPage>
      <IonContent className="catalogo-bg" style={{ position: 'relative' }}>

        {/* CARGADOR FIXED CENTRADO AL 100% */}
        {(isModuleLoading || isProcessing) && (
            <div className="main-loader-overlay">
                <div className="main-loader-spinner"></div>
                <p>{isModuleLoading ? 'Cargando módulo...' : 'Procesando...'}</p>
            </div>
        )}

        {/* 🏛️ NUEVO: DIÁLOGO DE ADVERTENCIA DE SIMILITUD DE TEMAS (DISEÑO INTERACTIVO MORADO UPVE) */}
        {themeWarningDialog.show && (
            <div className="pdf-modal-overlay">
                <div className="pdf-modal-content" style={{ maxWidth: '450px' }}>
                    <h3 style={{ color: '#582c83' }}>Advertencia de Catálogo</h3>
                    <p style={{ textAlign: 'justify', marginTop: '15px', fontSize: '14px', lineHeight: '1.5' }}>
                        Detectamos que ya existe un área o tema similar registrado en el sub-catálogo como: <b>"{themeWarningDialog.coincidencia}"</b>.
                        <br /><br />
                        ¿Estás seguro de que <b>"{themeWarningDialog.targetTema}"</b> es una disciplina diferente y realmente deseas agregarla de forma independiente?
                    </p>
                    <div className="pdf-modal-actions" style={{ flexDirection: 'row', justifyContent: 'center', gap: '10px' }}>
                        <button className="btn-pdf-text" onClick={() => setThemeWarningDialog({ show: false, targetTema: '', coincidencia: '' })}>
                            Cancelar
                        </button>
                        <button className="btn-pdf-img" style={{ background: '#582c83' }} onClick={() => {
                            setNuevoTema({ nombre: themeWarningDialog.targetTema });
                            setThemeWarningDialog({ show: false, targetTema: '', coincidencia: '' });
                            setShowModalTema(true);
                        }}>
                            Sí, continuar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* NOTIFICACIONES TOAST */}
        <div className={`toast-notification ${toast.show ? 'show' : ''} ${toast.type}`}>
            <IonIcon icon={toast.type === 'success' ? checkmarkCircleOutline : warningOutline} />
            <span>{toast.message}</span>
        </div>

        {/* MODAL ELIMINAR */}
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

        {/* MODAL EXPORTAR PDF */}
        {pdfModalOpen && (
          <div className="pdf-modal-overlay">
            <div className="pdf-modal-content">
              <h3>Exportar a PDF</h3>
              <p>¿Deseas incluir las portadas y fotografías de los recursos en el documento?</p>
              <div className="pdf-modal-actions">
                <button className="btn-pdf-img" onClick={() => generatePDF(true)}>Sí, Con Imágenes</button>
                <button className="btn-pdf-text" onClick={() => generatePDF(false)}>No, Solo Texto</button>
                <button className="btn-pdf-cancel" onClick={() => setPdfModalOpen(false)}>Cancelar Exportación</button>
              </div>
            </div>
          </div>
        )}

        {/* ---> NUEVO: MODAL DE AVISO LEGAL <--- */}
        {avisoModal.show && (
          <div className="pdf-modal-overlay" style={{ zIndex: 100000 }}>
            <div className="pdf-modal-content">
              <h3>
                <IonIcon icon={avisoModal.isPdf ? checkmarkCircleOutline : warningOutline} style={{ color: avisoModal.isPdf ? '#10b981' : '#f59e0b', verticalAlign: 'middle', marginRight: '8px' }}/>
                Aviso de Consulta
              </h3>
              <p style={{ textAlign: 'justify', marginBottom: '25px', fontSize: '15px' }}>
                {avisoModal.mensaje}
              </p>
              <div className="pdf-modal-actions" style={{ flexDirection: 'row', justifyContent: 'center', gap: '10px' }}>
                <button className="btn-pdf-text" onClick={() => setAvisoModal({ ...avisoModal, show: false })}>Cancelar</button>
                <button className="btn-pdf-img" onClick={() => { 
                  window.open(avisoModal.url, '_blank'); 
                  setAvisoModal({ ...avisoModal, show: false }); 
                }}>
                  Entendido, Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---> NUEVO: MODAL ALTA RÁPIDA AUTOR (COMPLETO) */}
        {showModalAutor && (
          <div className="pdf-modal-overlay">
            <div className="pdf-modal-content" style={{ maxWidth: '800px' }}>
              <h3 style={{ color: '#582c83', marginBottom: '20px' }}>Nuevo Autor (Alta Rápida)</h3>
              
              <div className="form-row" style={{ textAlign: 'left', marginBottom: '15px' }}>
                <div className="form-group flex-1"><label>NOMBRE(S) *</label><input className="custom-input" value={nuevoAutor.nombre} onChange={e => setNuevoAutor({...nuevoAutor, nombre: e.target.value})} /></div>
                <div className="form-group flex-1"><label>APELLIDOS</label><input className="custom-input" value={nuevoAutor.apellidos} onChange={e => setNuevoAutor({...nuevoAutor, apellidos: e.target.value})} /></div>
              </div>
              
              <div className="form-row" style={{ textAlign: 'left', marginBottom: '15px' }}>
                <div className="form-group flex-1"><label>SEUDÓNIMO (OPCIONAL)</label><input className="custom-input" value={nuevoAutor.seudonimo} onChange={e => setNuevoAutor({...nuevoAutor, seudonimo: e.target.value})} /></div>
                <div className="form-group flex-1">
                  <label>TIPO DE AUTOR *</label>
                  <select className="custom-input" value={nuevoAutor.tipo} onChange={e => setNuevoAutor({...nuevoAutor, tipo: e.target.value})}>
                    <option value="Personal">Personal</option>
                    <option value="Corporativo">Corporativo</option>
                  </select>
                </div>
                <div className="form-group flex-1"><label>NACIONALIDAD</label><input className="custom-input" value={nuevoAutor.nacionalidad} onChange={e => setNuevoAutor({...nuevoAutor, nacionalidad: e.target.value})} /></div>
              </div>

              <div className="form-row" style={{ textAlign: 'left' }}>
                <div className="form-group flex-1"><label>EMAIL</label><input className="custom-input" value={nuevoAutor.email} onChange={e => setNuevoAutor({...nuevoAutor, email: e.target.value})} placeholder="ejemplo@correo.com" /></div>
                <div className="form-group flex-1"><label>TELÉFONO</label><input className="custom-input" value={nuevoAutor.telefono} onChange={e => setNuevoAutor({...nuevoAutor, telefono: e.target.value})} placeholder="Ej: 6671234567" /></div>
                <div className="form-group flex-1"><label>NOTAS BIOGRÁFICAS / BIBLIOGRAFÍA</label><input className="custom-input" value={nuevoAutor.notas} onChange={e => setNuevoAutor({...nuevoAutor, notas: e.target.value})} /></div>
              </div>

              <div className="pdf-modal-actions" style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
                <button className="btn-pdf-text" onClick={() => setShowModalAutor(false)}>Cancelar</button>
                <button className="btn-pdf-img" onClick={saveAutorRapido}>Guardar Autor</button>
              </div>
            </div>
          </div>
        )}

        {/* ---> NUEVO: MODAL ALTA RÁPIDA EDITORIAL (COMPLETO) */}
        {showModalEditorial && (
          <div className="pdf-modal-overlay">
            <div className="pdf-modal-content" style={{ maxWidth: '800px' }}>
              <h3 style={{ color: '#582c83', marginBottom: '20px' }}>Nueva Editorial (Alta Rápida)</h3>
              
              <div className="form-row" style={{ textAlign: 'left', marginBottom: '15px' }}>
                <div className="form-group flex-1"><label>NOMBRE COMERCIAL (MARCA) *</label><input className="custom-input" value={nuevaEditorial.nombre} onChange={e => setNuevaEditorial({...nuevaEditorial, nombre: e.target.value})} /></div>
                <div className="form-group flex-1"><label>RAZÓN SOCIAL (LEGAL)</label><input className="custom-input" value={nuevaEditorial.razonSocial} onChange={e => setNuevaEditorial({...nuevaEditorial, razonSocial: e.target.value})} /></div>
              </div>

              <div className="form-row" style={{ textAlign: 'left', marginBottom: '15px' }}>
                <div className="form-group flex-1"><label>PREFIJO ISBN</label><input className="custom-input" value={nuevaEditorial.prefijo} onChange={e => setNuevaEditorial({...nuevaEditorial, prefijo: e.target.value})} /></div>
                <div className="form-group flex-1"><label>EMAIL DE CONTACTO</label><input className="custom-input" value={nuevaEditorial.email} onChange={e => setNuevaEditorial({...nuevaEditorial, email: e.target.value})} /></div>
              </div>

              <div className="form-row" style={{ textAlign: 'left', marginBottom: '15px' }}>
                <div className="form-group flex-1"><label>PAÍS DE ORIGEN</label><input className="custom-input" value={nuevaEditorial.pais} onChange={e => setNuevaEditorial({...nuevaEditorial, pais: e.target.value})} /></div>
                <div className="form-group flex-1"><label>OTROS DATOS DE CONTACTO (TEL, WEB, ETC)</label><input className="custom-input" value={nuevaEditorial.otrosDatos} onChange={e => setNuevaEditorial({...nuevaEditorial, otrosDatos: e.target.value})} /></div>
              </div>

              <div className="form-row" style={{ textAlign: 'left' }}>
                <div className="form-group flex-1"><label>DIRECCIÓN FÍSICA</label><input className="custom-input" value={nuevaEditorial.direccion} onChange={e => setNuevaEditorial({...nuevaEditorial, direccion: e.target.value})} /></div>
                <div className="form-group flex-1"><label>OBSERVACIONES</label><input className="custom-input" value={nuevaEditorial.observaciones} onChange={e => setNuevaEditorial({...nuevaEditorial, observaciones: e.target.value})} /></div>
              </div>

              <div className="pdf-modal-actions" style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
                <button className="btn-pdf-text" onClick={() => setShowModalEditorial(false)}>Cancelar</button>
                <button className="btn-pdf-img" onClick={saveEditorialRapido}>Guardar Editorial</button>
              </div>
            </div>
          </div>
        )}
        {/* <--- FIN NUEVO */}

        {/* 🏛️ NUEVO: MODAL ALTA RÁPIDA DE TEMAS CENTRALES */}
        {showModalTema && (
          <div className="pdf-modal-overlay">
            <div className="pdf-modal-content" style={{ maxWidth: '450px' }}>
              <h3 style={{ color: '#582c83', fontWeight: '700', marginBottom: '10px' }}>Nuevo Área / Tema</h3>
              <p>Registra un término macro para mantener limpio el sub-catálogo.</p>
              
              <div className="form-row" style={{ textAlign: 'left', marginBottom: '15px' }}>
                <div className="form-group flex-1">
                  <label>NOMBRE DEL TEMA CENTRAL *</label>
                  <input 
                    className="custom-input" 
                    value={nuevoTema.nombre} 
                    placeholder="Ej. Agricultura, Gastronomía, Sistemas..." 
                    onChange={e => setNuevoTema({ ...nuevoTema, nombre: e.target.value })} 
                  />
                </div>
              </div>
              
              <div className="pdf-modal-actions" style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
                <button className="btn-pdf-text" onClick={() => setShowModalTema(false)}>Cancelar</button>
                <button className="btn-pdf-img" onClick={saveTemaRapido}>Guardar Tema</button>
              </div>
            </div>
          </div>
        )}

        {/* TOOLTIP / MODAL INFORMATIVO EN EL FOQUITO */}
        {showHelp && (
          <div className="help-tooltip-overlay" onClick={() => setShowHelp(false)}>
            <div className="help-tooltip-content" onClick={e => e.stopPropagation()}>
              <div className="help-tooltip-header">
                <h3><IonIcon icon={bulbOutline} /> Guía de Búsqueda de Catálogo</h3>
                <IonIcon icon={closeCircleOutline} className="close-help-icon" onClick={() => setShowHelp(false)} />
              </div>
              <p>El buscador escanea de forma global el módulo seleccionado. Escribe tu búsqueda y presiona la lupa o la tecla Enter:</p>
              
              <table className="help-tooltip-table">
                <thead>
                  <tr><th>Campos</th><th>Instrucción de búsqueda</th><th>Ejemplo</th></tr>
                </thead>
                <tbody>
                  {activeModule === 'Libro' && (
                    <>
                      <tr><td><strong>Título</strong></td><td>Escribe el nombre del libro o su área de estudio.</td><td><code className="code-badge">Sistemas tecnológicos</code></td></tr>
                      <tr><td><strong>Tema</strong></td><td>Escribe el tema del libro o su área de estudio.</td><td><code className="code-badge">Tecnología</code></td></tr>
                      <tr><td><strong>Autor</strong></td><td>Introduce el nombre o apellidos del autor.</td><td><code className="code-badge">José Hernández</code></td></tr>
                      <tr><td><strong>Edición / Volumen</strong></td><td>Busca por el número de edición.</td><td><code className="code-badge">Edición 1</code></td></tr>
                      <tr><td><strong>Clasificación ISBN</strong></td><td>Escribe el código ISBN numérico (con o sin guiones).</td><td><code className="code-badge">000-0000-00-0000</code></td></tr>
                      <tr><td><strong>Editorial</strong></td><td>Introduce el nombre de la casa editorial.</td><td><code className="code-badge">MaximaEditorial</code></td></tr>
                      <tr><td><strong>Año</strong></td><td>Busca por el año de publicación del libro.</td><td><code className="code-badge">{currentYear}</code></td></tr>
                    </>
                  )}

                  {activeModule === 'Revista / Artículo Científico' && (
                    <>
                      <tr><td><strong>Título</strong></td><td>Busca por el nombre del artículo o tema de investigación.</td><td><code className="code-badge">Agriculture</code></td></tr>
                      <tr><td><strong>Tema</strong></td><td>Escribe el tema del artículo o tema de investigación.</td><td><code className="code-badge">Plague</code></td></tr>
                      <tr><td><strong>Autor / Investigador</strong></td><td>Nombre del autor o investigador principal.</td><td><code className="code-badge">José Hernández</code></td></tr>
                      <tr><td><strong>Editorial</strong></td><td>Nombre de la editorial o universidad que publica.</td><td><code className="code-badge">MaximaEditorial</code></td></tr>
                      <tr><td><strong>Clasificación ISSN</strong></td><td>Filtra tecleando el código ISSN de la revista.</td><td><code className="code-badge">2044-8341</code></td></tr>
                      <tr><td><strong>Edición / Volumen</strong></td><td>Busca por el volumen o número del fascículo.</td><td><code className="code-badge">Vol. 4</code></td></tr>
                      <tr><td><strong>Año</strong></td><td>Busca por el año de publicación de la revista.</td><td><code className="code-badge">{currentYear}</code></td></tr>
                    </>
                  )}

                  {activeModule === 'Tesis' && (
                    <>
                      <tr><td><strong>Título</strong></td><td>Escribe el título del proyecto de titulación.</td><td><code className="code-badge">Implementación de pesticidas</code></td></tr>
                      <tr><td><strong>Tema</strong></td><td>Escribe el tema de la tesis o tema de investigación.</td><td><code className="code-badge">Agricultura</code></td></tr>
                      <tr><td><strong>Autor (Alumno)</strong></td><td>Nombre completo o apellidos del estudiante.</td><td><code className="code-badge">Jose Lopez</code></td></tr>
                      <tr><td><strong>Asesor</strong></td><td>Busca por el nombre del maestro asesor.</td><td><code className="code-badge">Gaxiola</code></td></tr>
                      <tr><td><strong>Carrera</strong></td><td>Filtra por las siglas de la carrera o grado.</td><td><code className="code-badge">Ingeniería en Agrobiotecnología (UPVE)</code></td></tr>
                      <tr><td><strong>Año</strong></td><td>Busca por el año en que se presentó la tesis.</td><td><code className="code-badge">{currentYear}</code></td></tr>
                    </>
                  )}

                  {activeModule === 'Enciclopedia / Diccionario' && (
                    <>
                      <tr><td><strong>Título</strong></td><td>Escribe el nombre de la enciclopedia o del diccionario.</td><td><code className="code-badge">Diccionario</code></td></tr>
                      <tr><td><strong>Tema</strong></td><td>Escribe el tema de la obra o su área temática.</td><td><code className="code-badge">Diccionario</code></td></tr>
                      <tr><td><strong>Autor</strong></td><td>Introduce el nombre del autor o compilador.</td><td><code className="code-badge">femando</code></td></tr>
                      <tr><td><strong>Volumen / Tomo</strong></td><td>Busca por un tomo en específico de la colección.</td><td><code className="code-badge">Tomo 1</code></td></tr>
                      <tr><td><strong>Clasificación ISBN</strong></td><td>Escribe el código ISBN numérico.</td><td><code className="code-badge">1234567890</code></td></tr>
                      <tr><td><strong>Editorial</strong></td><td>Busca por la firma editora responsable.</td><td><code className="code-badge">MaximaEditorial</code></td></tr>
                      <tr><td><strong>Año</strong></td><td>Busca por el año de publicación del tomo.</td><td><code className="code-badge">{currentYear}</code></td></tr>
                    </>
                  )}

                  {activeModule === 'Equipo Audiovisual' && (
                    <>
                      <tr><td><strong>Nombre del Equipo</strong></td><td>Escribe el nombre del equipo.</td><td><code className="code-badge">Bocina</code> o <code className="code-badge">Proyector</code></td></tr>
                      <tr><td><strong>Marca o Modelo</strong></td><td>Escribe la marca o modelo exacto.</td><td><code className="code-badge">Sony</code> o <code className="code-badge">CSonido</code></td></tr>
                      <tr><td><strong>Número de Serie</strong></td><td>Teclea el identificador de serie único.</td><td><code className="code-badge">41fdg</code></td></tr>
                      <tr><td><strong>Año</strong></td><td>Escribe el año de fabricación del equipo.</td><td><code className="code-badge">{currentYear}</code></td></tr>
                    </>
                  )}

                  {activeModule === 'Dispositivo de Conectividad' && (
                    <>
                      <tr><td><strong>Nombre del Equipo</strong></td><td>Escribe qué tipo de dispositivo.</td><td><code className="code-badge">Router</code> o <code className="code-badge">Cable HDMI</code></td></tr>
                      <tr><td><strong>Marca o Modelo</strong></td><td>Introduce la marca o versión del dispositivo.</td><td><code className="code-badge">Cisco</code> o <code className="code-badge">hdmi</code></td></tr>
                      <tr><td><strong>Número de Serie</strong></td><td>Teclea el identificador de serie físico.</td><td><code className="code-badge">h21r</code></td></tr>
                      <tr><td><strong>Año</strong></td><td>Busca por el año de registro o adquisición.</td><td><code className="code-badge">{currentYear}</code></td></tr>
                    </>
                  )}

                  {activeModule === 'Mobiliario Didáctico' && (
                    <>
                      <tr><td><strong>Nombre del Equipo</strong></td><td>Escribe el tipo de mueble o equipo físico.</td><td><code className="code-badge">Pintarrón</code> o <code className="code-badge">silla v1</code></td></tr>
                      <tr><td><strong>Marca</strong></td><td>Busca por la marca que fabricó el mueble.</td><td><code className="code-badge">mc</code></td></tr>
                      <tr><td><strong>Material</strong></td><td>Filtra escribiendo el material de fabricación.</td><td><code className="code-badge">Madera</code> o <code className="code-badge">Aluminio</code></td></tr>
                      <tr><td><strong>Año</strong></td><td>Busca por el año en que se adquirió el mobiliario.</td><td><code className="code-badge">{currentYear}</code></td></tr>
                    </>
                  )}
                </tbody>
              </table>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                💡 Tip: Los resultados mostrados siempre corresponderán exclusivamente a la categoría activa en tu panel izquierdo.
              </p>
            </div>
          </div>
        )}

        <div className="catalogo-layout">
          
          <aside className={`submenu-control ${submenuOpen ? 'open' : 'closed'}`}>
            <div className="submenu-header">
              {submenuOpen && <h4>MÓDULOS DE CONTROL</h4>}
              <IonButton className="btn-collapse" fill="clear" onClick={() => setSubmenuOpen(!submenuOpen)}><IonIcon icon={submenuOpen ? chevronBackOutline : chevronForwardOutline} /></IonButton>
            </div>
            <div className="submenu-list">
              {modulos.map((mod) => (
                <div key={mod.nombre} className={`submenu-item ${activeModule === mod.nombre ? 'active' : ''}`} onClick={() => handleModuleChange(mod.nombre)}>
                  <IonIcon icon={mod.icon} />{submenuOpen && <span>{mod.nombre}</span>}
                </div>
              ))}
            </div>
          </aside>

          <main className="catalogo-main">
            <div className="main-top-header">
              <div><h1>Catálogo: {activeModule}</h1><p>Gestión y administración de recursos específicos.</p></div>
              <div className="header-actions">
                <IonButton fill="outline" color="danger" className="btn-export" onClick={() => setPdfModalOpen(true)}><IonIcon icon={documentTextOutline} slot="start" /> PDF</IonButton>
                <IonButton fill="outline" color="success" className="btn-export" onClick={exportToExcel}><IonIcon icon={gridOutline} slot="start" /> Excel</IonButton>
                <IonButton className="btn-nueva" onClick={() => showForm ? setShowForm(false) : openForm()}><IonIcon icon={addOutline} slot="start" /> {showForm ? 'Cancelar' : 'Nuevo Registro'}</IonButton>
              </div>
            </div>

            <div className="sticky-searchbar">
              <IonSearchbar 
                placeholder={`Filtrar en ${activeModule}...`} 
                value={searchQuery} 
                onIonInput={(e: any) => {
                  const newValue = e.target.value || '';
                  setSearchQuery(newValue);
                  // Si el usuario borró todo con el teclado, recargamos la lista
                  if (newValue.trim() === '') {
                    fetchPage(1, '', activeModule);
                  }
                }}
                onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
                onIonClear={() => {
                  setSearchQuery('');
                  fetchPage(1, '', activeModule);
                }}
                disabled={isModuleLoading || isProcessing}
              />
              <IonButton className="btn-buscar-lupa" onClick={handleSearch} disabled={isModuleLoading || isProcessing}>
                <IonIcon icon={searchOutline} />
              </IonButton>
              
              {/* BOTÓN DEL FOQUITO */}
              <button className="btn-bulb-help" onClick={() => setShowHelp(true)} title="Ver guía de búsqueda">
                <IonIcon icon={bulbOutline} />
              </button>

              <span className="results-count">{totalRecords} encontrados</span>
            </div>

            {showForm && (
              <div className="catalogo-form-card">
                {/* NUEVO: Cambiamos a una clase única para evitar que Ionic la vuelva invisible */}
                <h3 className="catalogo-form-title-custom">{isEditing ? 'Editar Registro' : 'Nuevo Registro'}: {activeModule}</h3>
                <div className="form-row">
                  <div className="form-group flex-2">
                    <label>{isPrintMaterial ? "TÍTULO DE LA OBRA *" : "NOMBRE DEL EQUIPO / RECURSO *"}</label>
                    <input className="custom-input" value={formData.Titulo || ''} onChange={e => setFormData({...formData, Titulo: e.target.value})} />
                  </div>
                  
                  {isPrintMaterial && (
                    <div className="form-group flex-1" style={{ position: 'relative' }}>
                      {/* 🏛️ Encabezado con link nativo a modal emergente */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ marginBottom: 0 }}>ÁREA / TEMA *</label>
                        <span 
                          style={{ fontSize: '11px', color: '#582c83', cursor: 'pointer', fontWeight: 700 }} 
                          onClick={() => { 
                            const textoDigitado = (formData.TemaRecurso || '').trim().toLowerCase();
                            
                            if (!textoDigitado) {
                              setNuevoTema({ nombre: '' });
                              return setShowModalTema(true);
                            }

                            // Escanea si lo escrito colisiona con una raíz o plural de la base de datos
                            const coincidenciaCercana = temasValidosDB.find(temaExistente => {
                              const existenteClean = temaExistente.toLowerCase();
                              return existenteClean.includes(textoDigitado) || 
                                     textoDigitado.includes(existenteClean) ||
                                     textoDigitado.replace(/s$/, '') === existenteClean;
                            });

                            if (coincidenciaCercana) {
                              // 🏛️ CORREGIDO: Activamos el modal personalizado con los datos de coincidencia en caliente
                              setThemeWarningDialog({
                                show: true,
                                targetTema: formData.TemaRecurso || '',
                                coincidencia: coincidenciaCercana
                              });
                            } else {
                              setNuevoTema({ nombre: formData.TemaRecurso || '' });
                              setShowModalTema(true);
                            }
                          }}
                        >
                          <IonIcon icon={addOutline} style={{ verticalAlign: 'middle' }} /> Alta Rápida
                        </span>
                      </div>
                      
                      <input 
                        className="custom-input" 
                        placeholder="Escribe para buscar temas..."
                        value={formData.TemaRecurso || ''} 
                        onChange={e => {
                          setFormData({ ...formData, TemaRecurso: e.target.value });
                          setShowSugerenciasTema(true);
                        }} 
                        onFocus={() => setShowSugerenciasTema(true)}
                        onBlur={() => setTimeout(() => setShowSugerenciasTema(false), 250)}
                      />

                      {/* Contenedor predictivo limpio (Removida la fila de inserción accidental) */}
                      {showSugerenciasTema && formData.TemaRecurso && formData.TemaRecurso.trim().length > 0 && (
                        <div className="sugerencias-box" style={{ width: '100%' }}>
                          {isSearchingTema ? (
                            <div style={{ padding: '12px 15px', fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>Buscando coincidencias...</div>
                          ) : (
                            <>
                              {temasResultados.map((t: any) => (
                                <div 
                                  key={t.Tema_ID} 
                                  className="sugerencia-item"
                                  onMouseDown={() => {
                                    setFormData({ ...formData, TemaRecurso: t.NombreTema });
                                    setShowSugerenciasTema(false);
                                  }}
                                >
                                  {t.NombreTema}
                                </div>
                              ))}
                              {temasResultados.length === 0 && (
                                <div className="sugerencia-item error" style={{ fontSize: '12px' }}>No hay temas guardados con ese nombre</div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-group flex-1">
                    <label>AÑO / FECHA *</label>
                    <input className="custom-input" type="number" max={currentYear} value={formData.AnioPublicacion || ''} onChange={e => setFormData({...formData, AnioPublicacion: e.target.value})} />
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '15px' }}>
                  <div className="form-group flex-1">
                    <label>{isPrintMaterial ? "PORTADA (SELECCIONAR IMAGEN)" : "FOTO DEL EQUIPO / RECURSO"}</label>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', marginTop: '5px' }}>
                      <div style={{ width: '50px', height: '50px', borderRadius: '8px', flexShrink: 0, backgroundColor: '#f3f4f6', border: '1px dashed #d1d5db', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
                        {previewImage ? (
                          <><img src={previewImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><IonIcon icon={closeCircleOutline} onClick={removeImage} style={{ position: 'absolute', top: '2px', right: '2px', color: '#ef4444', fontSize: '16px', cursor: 'pointer', background: 'white', borderRadius: '50%' }} /></>
                        ) : formData.Imagen_path ? (
                          <div style={{ width: '100%', height: '100%', backgroundColor: '#f3e8ff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}><IonIcon icon={documentTextOutline} style={{ color: '#582c83', fontSize: '20px' }} /></div>
                        ) : (<IonIcon icon={imageOutline} style={{ color: '#9ca3af', fontSize: '24px' }} />)}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><input ref={fileInputRef} className="custom-input" type="file" accept="image/*" onChange={handleImageChange} style={{ padding: '10px 15px', width: '100%' }} /></div>
                    </div>
                  </div>
                  <div className="form-group flex-1"><label>OBSERVACIONES</label><input className="custom-input" value={formData.Observaciones || ''} onChange={e => setFormData({...formData, Observaciones: e.target.value})} style={{ height: '50px', marginTop: '5px' }} /></div>
                </div>

                {/* ---> NUEVO: CAMPOS COMPLEMENTARIOS CON FORMATOS DETALLADOS DE ESCRITURA <--- */}
                {isPrintMaterial && (
                  <>
                    <div className="form-row" style={{ marginTop: '15px' }}>
                      {/* CORREGIDO: Ahora es un campo de ESCRITURA LIBRE para capturar cualquier tipo */}
                      <div className="form-group flex-1">
                        <label>FORMATO / ENCUADERNACIÓN</label>
                        <input 
                          className="custom-input" 
                          placeholder="Ej. Pasta Dura, Pasta Blanda, Bolsillo..." 
                          value={formData.Formato || ''} 
                          onChange={e => setFormData({...formData, Formato: e.target.value})} 
                        />
                      </div>
                      <div className="form-group flex-1">
                        <label>CANTIDAD DE PÁGINAS</label>
                        <input className="custom-input" type="number" min="0" placeholder="Ej. 350" value={formData.Cantidad_Paginas || ''} onChange={e => setFormData({...formData, Cantidad_Paginas: e.target.value})} />
                      </div>
                      <div className="form-group flex-1">
                        <label>IDIOMA</label>
                        <input className="custom-input" placeholder="Ej. Español, Inglés" value={formData.Idioma || ''} onChange={e => setFormData({...formData, Idioma: e.target.value})} />
                      </div>
                      <div className="form-group flex-1">
                        <label>GÉNERO LITERARIO / CLASIFICACIÓN</label>
                        <input className="custom-input" placeholder="Ej. Científico, Manual, Novela" value={formData.Genero || ''} onChange={e => setFormData({...formData, Genero: e.target.value})} />
                      </div>
                    </div>

                    <div className="form-row" style={{ marginTop: '15px' }}>
                      <div className="form-group flex-2" style={{ width: '100%' }}>
                        <label>RESUMEN / SINOPSIS DE LA OBRA</label>
                        <textarea className="custom-input" rows={3} style={{ resize: 'vertical' }} placeholder="Escribe o extrae automáticamente un resumen del recurso..." value={formData.Resumen || ''} onChange={e => setFormData({...formData, Resumen: e.target.value})} />
                      </div>
                    </div>
                  </>
                )}
                {/* ------------------------------------------------------------------ */}

                <div className="form-row" style={{ marginTop: '15px' }}>
                  {renderDynamicFields()}
                  <div className="form-group align-bottom"><button className="btn-guardar-inline" onClick={saveRecord}>GUARDAR</button></div>
                </div>
              </div>
            )}

            <div className="catalogo-card">
              <div className="table-responsive">
                <table className="tabla-dinamica">
                  <thead>
                    <tr>
                      <th style={{paddingLeft: '30px'}}>ID</th>
                      <th>{isPrintMaterial ? "PORTADA" : "FOTO"}</th>
                      <th>{isPrintMaterial ? "TÍTULO" : "NOMBRE DEL EQUIPO"}</th>
                      {isPrintMaterial && <th>TEMA</th>}

                      {/* --- COLUMNAS ESPECÍFICAS POR MÓDULO --- */}
                      {activeModule === 'Libro' && (
                        <><th>AUTOR</th><th>EDICIÓN / VOLUMEN</th><th>ISBN</th><th>EDITORIAL</th></>
                      )}

                      {activeModule === 'Revista / Artículo Científico' && (
                        <><th>AUTOR / INVESTIGADOR</th><th>EDICIÓN / VOLUMEN</th><th>ISSN</th><th>EDITORIAL</th></>
                      )}

                      {activeModule === 'Tesis' && (
                        <><th>AUTOR (ALUMNO)</th><th>ASESOR</th><th>CARRERA</th></>
                      )}

                      {activeModule === 'Enciclopedia / Diccionario' && (
                        <><th>AUTOR</th><th>VOLUMEN / TOMO</th><th>ISBN</th><th>EDITORIAL</th></>
                      )}

                      {['Equipo Audiovisual', 'Dispositivo de Conectividad'].includes(activeModule) && (
                        <><th>MARCA / MODELO</th><th>NÚM. SERIE</th></>
                      )}

                      {activeModule === 'Mobiliario Didáctico' && (
                        <><th>MARCA</th><th>MATERIAL</th></>
                      )}
                      {/* -------------------------------------- */}

                      <th>AÑO</th>
                      <th style={{textAlign: 'center'}}>CONSULTA</th>
                      <th style={{textAlign: 'center'}}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.Recurso_ID}>
                        <td style={{ paddingLeft: '30px', fontWeight: 'bold' }}>{r.Recurso_ID}</td>
                        <td style={{ textAlign: 'center' }}>
                          {r.Imagen_url ? (
                            <img src={r.Imagen_url} alt="Portada" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #d1d5db', margin: 'auto' }} />
                          ) : r.Imagen_path ? (
                            <span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '5px', width: 'fit-content', margin: 'auto' }}><IonIcon icon={imageOutline} /> {r.Imagen_path.length > 15 ? r.Imagen_path.substring(0, 15) + '...' : r.Imagen_path}</span>
                          ) : (<span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{isPrintMaterial ? 'Sin portada' : 'Sin foto'}</span>)}
                        </td>
                        <td>{r.Titulo}</td>
                        {isPrintMaterial && <td>{r.TemaRecurso}</td>}

                        {/* --- DATOS ESPECÍFICOS POR MÓDULO --- */}
                        {activeModule === 'Libro' && (
                          <><td>{r.Autor || '-'}</td><td>{r.EdicionVolumen || '-'}</td><td>{r.ClasificacionISBN || '-'}</td><td>{r.Editorial || '-'}</td></>
                        )}

                        {activeModule === 'Revista / Artículo Científico' && (
                          <><td>{r.Autor || '-'}</td><td>{r.EdicionVolumen || '-'}</td><td>{r.ClasificacionISSN || '-'}</td><td>{r.Editorial || '-'}</td></>
                        )}

                        {activeModule === 'Tesis' && (
                          <><td>{r.AutorTexto || '-'}</td><td>{r.Asesor || '-'}</td><td>{r.GradoCarrera || '-'}</td></>
                        )}

                        {activeModule === 'Enciclopedia / Diccionario' && (
                          <><td>{r.Autor || '-'}</td><td>{r.EdicionVolumen || '-'}</td><td>{r.ClasificacionISBN || '-'}</td><td>{r.Editorial || '-'}</td></>
                        )}

                        {['Equipo Audiovisual', 'Dispositivo de Conectividad'].includes(activeModule) && (
                          <><td>{r.Marca || '-'}</td><td>{r.NumSerie || '-'}</td></>
                        )}

                        {activeModule === 'Mobiliario Didáctico' && (
                          <><td>{r.Marca || '-'}</td><td>{r.Material || '-'}</td></>
                        )}
                        {/* ------------------------------------ */}

                        <td>{r.AnioPublicacion}</td>
                        <td style={{ textAlign: 'center' }}>
                          {r.Pdf_url && activeModule === 'Tesis' ? (
                            <button 
                              onClick={(e) => handleOpenLink(e, r.Pdf_url, r.Mensaje_Legal, true)} 
                              className="btn-link-pdf" 
                              style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                              Ver PDF
                            </button>
                          ) : r.URL_Externa ? (
                            <button 
                              onClick={(e) => handleOpenLink(e, r.URL_Externa, r.Mensaje_Legal, false)} 
                              className="btn-link-externo" 
                              style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                              Ir al Sitio
                            </button>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>Físico</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', minWidth: '120px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', gap: '8px' }}>
                            <IonButton className="btn-action btn-edit" fill="clear" onClick={() => openForm(r)}><IonIcon icon={createOutline} /></IonButton>
                            <IonButton className="btn-action btn-delete" fill="clear" onClick={() => handleDelete(r.Recurso_ID)}><IonIcon icon={trashOutline} /></IonButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={10} className="empty-state">
                            <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 500 }}>
                                ❌ No hay registros que coincidan en el módulo de {activeModule}.
                            </span>
                        </td>
                      </tr>
                    )}
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
          </main>
        </div>
      </IonContent>
    </IonPage>
  );
};
export default Catalogo;
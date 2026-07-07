import React, { useEffect, useState } from 'react';
import { IonContent, IonPage, IonIcon } from '@ionic/react';
import { bookOutline, alertCircleOutline, searchOutline, timeOutline, warningOutline, libraryOutline } from 'ionicons/icons';
// @ts-ignore
import api from '../../../services/api';
import './Inicio.css'; 

const Inicio: React.FC = () => {
  const [usuario, setUsuario] = useState<any>(null);
  const [prestamosCount, setPrestamosCount] = useState<number>(0);
  const [atrasosCount, setAtrasosCount] = useState<number>(0);
  const [multasTotal, setMultasTotal] = useState<string>('0.00');
  const [librosNovedades, setLibrosNovedades] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const userData = sessionStorage.getItem('usuario');
    if (userData) {
      setUsuario(JSON.parse(userData));
    }

    const cargarDatosDashboard = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const response = await api.get('/usuario/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setPrestamosCount(response.data.prestamos_activos);
          setAtrasosCount(response.data.atrasos);
          setMultasTotal(response.data.multas_pendientes);
          setLibrosNovedades(response.data.novedades);
        }
      } catch (error) {
        // Manejo silencioso seguro
      } finally {
        setLoading(false);
      }
    };

    cargarDatosDashboard();
  }, []);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    window.location.href = `/portal/explorar?search=${encodeURIComponent(searchQuery)}`;
  };

  const renderIconoCategoria = (tipoId: number) => {
    if (tipoId === 1) return '📚';
    if (tipoId === 2) return '🔬';
    return '📊';
  };

  return (
    <IonPage>
      <IonContent className="portal-bg" fullscreen>
        
        {/* 1. NAVBAR SUPERIOR WEB */}
        <div className="premium-navbar">
          <div className="navbar-left">
            <span className="university-logo-text">UPVE</span>
            <span className="university-brand-sub">BIBLIOTECA</span>
          </div>

          <div className="navbar-center-links">
            <span className="nav-top-link active" onClick={() => window.location.href = '/portal/inicio'}>
              Inicio
            </span>
            <span className="nav-top-link" onClick={() => window.location.href = '/portal/explorar'}>
              Explorar
            </span>
            <span className="nav-top-link" onClick={() => window.location.href = '/portal/mibiblioteca'}>
              Mi Biblioteca
            </span>
          </div>

          <div className="navbar-right">
            <div className="navbar-avatar-btn" onClick={() => window.location.href = '/portal/perfil'}>
              {usuario?.FotoPerfil ? (
                <img src={usuario.FotoPerfil} alt="Avatar" className="navbar-avatar-img" />
              ) : (
                <span className="navbar-avatar-letter">
                  {usuario ? usuario.NombreUsuario.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. HERO BANNER */}
        <div className="premium-hero-section">
          <div className="hero-content-wrapper">
            <span className="hero-badge">PORTAL DIGITAL DE ALUMNOS</span>
            <h1 className="hero-main-title">
              EL MAYOR REPOSITORIO DE <br />
              <span className="text-highlight-morado">CONOCIMIENTO CIENTÍFICO</span>
            </h1>
            
            <form onSubmit={handleBuscar} className="hero-search-form">
              <div className="hero-search-input-wrapper">
                <IonIcon icon={searchOutline} className="hero-search-inside-icon" />
                <input 
                  type="text" 
                  placeholder="¿Qué libro, revista o recurso buscas hoy?..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="hero-search-field"
                />
              </div>
            </form>

            <p className="hero-subtitle">
              ¡Bienvenido, {usuario ? usuario.NombreUsuario.split(' ')[0] : 'Alumno'}! 👋
            </p>
          </div>
        </div>

        {/* 3. CUERPO DE CONTENIDOS */}
        <div className="inicio-main-content">
          
          {/* TARJETA DE ESTADO */}
          <div className="status-summary-card premium-overlap-card">
            <div className="summary-block">
              <div className="summary-icon-box box-morado-oficial">
                <IonIcon icon={bookOutline} />
              </div>
              <div className="summary-data">
                <h3>{loading ? '...' : prestamosCount}</h3>
                <p>Préstamos Activos</p>
              </div>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-block">
              <div className="summary-icon-box box-naranja-oficial">
                <IonIcon icon={alertCircleOutline} />
              </div>
              <div className="summary-data">
                <h3 className={parseFloat(multasTotal) > 0 ? 'text-danger-oficial' : 'text-normal-black'}>
                  ${loading ? '0.00' : multasTotal}
                </h3>
                <p>Multas Pendientes</p>
              </div>
            </div>
          </div>

          {/* BANNER DE ALERTA */}
          {!loading && atrasosCount > 0 && (
            <div className="atraso-alert-banner">
              <div className="atraso-alert-icon">
                <IonIcon icon={warningOutline} />
              </div>
              <div className="atraso-alert-text">
                <h4>Atención: Préstamos Vencidos</h4>
                <p>Tienes {atrasosCount} {atrasosCount === 1 ? 'libro atrasado' : 'libros atrasados'}. Por favor acude a biblioteca.</p>
              </div>
            </div>
          )}

          {/* ACCESOS RÁPIDOS */}
          <h3 className="section-title-modern">Accesos Rápidos</h3>
          <div className="quick-actions-grid">
            <div className="action-btn" onClick={() => window.location.href = '/portal/explorar'}>
              <div className="action-icon-circle bg-azul-oficial">
                <IonIcon icon={searchOutline} className="color-white" />
              </div>
              <span>Explorar Catálogos</span>
            </div>
            
            <div className="action-btn" onClick={() => window.location.href = '/portal/mibiblioteca'}>
              <div className="action-icon-circle bg-morado-oficial-btn">
                <IonIcon icon={libraryOutline} className="color-white" />
              </div>
              <span>Préstamos Vigentes</span>
            </div>
            
            <div className="action-btn" onClick={() => window.location.href = '/portal/mibiblioteca'}>
              <div className="action-icon-circle bg-verde-oficial">
                <IonIcon icon={timeOutline} className="color-negro" />
              </div>
              <span>Historial Completo</span>
            </div>
          </div>

          {/* SECCIÓN DEL INVENTARIO ACADÉMICO */}
          <div className="section-header">
            <h3 className="section-title-modern">Recursos Disponibles en Catálogo</h3>
          </div>
          
          <div className="books-horizontal-scroll">
            {librosNovedades.length > 0 ? (
              librosNovedades.map((recurso: any, index: number) => (
                <div 
                  className="book-card-mini" 
                  key={recurso.id || index}
                  onClick={() => window.location.href = `/portal/recurso/${recurso.id}`}
                  style={{ cursor: 'pointer' }}
                  title="Ver detalles e información del recurso"
                >
                  <div className="book-cover">
                    {/* 📸 VALIDACIÓN: Si el recurso tiene portada guardada en la base de datos se muestra */}
                    {recurso.Portada || recurso.Imagen ? (
                      <img src={recurso.Portada || recurso.Imagen} alt={recurso.Titulo} className="book-cover-img-real" />
                    ) : (
                      /* Si viene vacío, muestra el fondo con el emoji correspondiente */
                      <div className={`book-cover-placeholder-gradient mock-cover-${(index % 3) + 1}`}>
                        {renderIconoCategoria(recurso.TipoRecurso_ID)}
                      </div>
                    )}
                  </div>
                  <h4 className="book-title-mini" title={recurso.Titulo}>{recurso.Titulo}</h4>
                  <p className="book-category-mini">Disponible</p>
                </div>
              ))
            ) : (
              <p style={{ color: '#666666', padding: '10px', fontSize: '14px' }}>
                {loading ? 'Cargando catálogo dinámico...' : 'No hay recursos bibliográficos disponibles.'}
              </p>
            )}
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Inicio;
import React, { useState, useRef } from 'react';
import { IonContent, IonPage, IonIcon, useIonViewWillEnter } from '@ionic/react';
import { 
  libraryOutline, bookOutline, documentTextOutline, videocamOutline, newspaperOutline, 
  swapHorizontalOutline, cashOutline, trendingUpOutline, peopleOutline, shieldCheckmarkOutline, 
  personOutline, bookmarksOutline, searchOutline, bulbOutline, calendarOutline, textOutline, closeCircleOutline
} from 'ionicons/icons';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
// @ts-ignore
import api from '../../services/api'; 
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  // REFERENCIA PARA CONTROLAR EL SCROLL
  const contentRef = useRef<HTMLIonContentElement | null>(null);

  // ESTADOS DE FECHAS Y PERIODOS RÁPIDOS
  const [periodoPrestamos, setPeriodoPrestamos] = useState('siempre');
  const [fechaInicioPrestamos, setFechaInicioPrestamos] = useState('');
  const [fechaFinPrestamos, setFechaFinPrestamos] = useState('');
  
  const [periodoSanciones, setPeriodoSanciones] = useState('siempre');
  const [fechaInicioSanciones, setFechaInicioSanciones] = useState('');
  const [fechaFinSanciones, setFechaFinSanciones] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const [stats, setStats] = useState({
    usuarios: 0, personal: 0, autores: 0, editoriales: 0,
    total_catalogo: 0, libros: 0, tesis: 0, audiovisual: 0, revistas: 0, 
    prestamos_periodo: 0, multas_recaudadas: 0
  });
  
  const [charts, setCharts] = useState({
    recursosPorTipo: [], tendenciaPrestamos: [], prestamosPorEstado: [], tendenciaSanciones: []
  });

  const pieColors = ['#582c83', '#fe5000', '#0057b7', '#ffd100', '#d0df00', '#666666'];
  
  const coloresEstados: Record<string, string> = { 
    'Activo': '#3b82f6', 
    'Devuelto': '#10b981',
    'Atrasado': '#ef4444'
  };

  const fetchDashboardData = async (fInicioP = fechaInicioPrestamos, fFinP = fechaFinPrestamos, fInicioS = fechaInicioSanciones, fFinS = fechaFinSanciones) => {
    setIsLoading(true);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    
    const currentAbortController = new AbortController();
    abortControllerRef.current = currentAbortController;

    try {
      const response = await api.get(`/dashboard-stats?prestamos_inicio=${fInicioP}&prestamos_fin=${fFinP}&sanciones_inicio=${fInicioS}&sanciones_fin=${fFinS}`, {
          signal: currentAbortController.signal
      });
      if (response.data.success) {
        setStats(response.data.data.stats);
        setCharts(response.data.data.charts);
      }
    } catch (error: any) {
      if (error.name !== 'CanceledError' && error.message !== 'canceled') {
          console.error("Error al cargar el dashboard:", error);
      }
    } finally {
      if (abortControllerRef.current === currentAbortController) {
        setIsLoading(false);
      }
    }
  };

  // SE REINICIA TODO Y SE FUERZA EL SCROLL ARRIBA AL ENTRAR AL MÓDULO
  useIonViewWillEnter(() => {
    if (contentRef.current) {
        contentRef.current.scrollToTop(0); 
    }
    setPeriodoPrestamos('siempre');
    setFechaInicioPrestamos('');
    setFechaFinPrestamos('');
    setPeriodoSanciones('siempre');
    setFechaInicioSanciones('');
    setFechaFinSanciones('');
    setShowHelp(false); 
    fetchDashboardData('', '', '', '');
  });

  // HANDLERS PARA PRÉSTAMOS
  const handlePeriodoPrestamos = (e: any) => {
    const val = e.target.value;
    setPeriodoPrestamos(val);
    if (val !== 'personalizado') {
        setFechaInicioPrestamos('');
        setFechaFinPrestamos('');
        // Para el backend, si no es personalizado, enviamos la clave rápida en el campo de "inicio"
        fetchDashboardData(val, '', fechaInicioSanciones || periodoSanciones, fechaFinSanciones);
    }
  };

  const ejecutarBusquedaPrestamos = () => {
    setPeriodoPrestamos('personalizado');
    fetchDashboardData(fechaInicioPrestamos, fechaFinPrestamos, fechaInicioSanciones || periodoSanciones, fechaFinSanciones);
  };

  // HANDLERS PARA SANCIONES
  const handlePeriodoSanciones = (e: any) => {
    const val = e.target.value;
    setPeriodoSanciones(val);
    if (val !== 'personalizado') {
        setFechaInicioSanciones('');
        setFechaFinSanciones('');
        // Enviamos la clave rápida en el campo de "inicio"
        fetchDashboardData(fechaInicioPrestamos || periodoPrestamos, fechaFinPrestamos, val, '');
    }
  };

  const ejecutarBusquedaSanciones = () => {
    setPeriodoSanciones('personalizado');
    fetchDashboardData(fechaInicioPrestamos || periodoPrestamos, fechaFinPrestamos, fechaInicioSanciones, fechaFinSanciones);
  };

  const ordenDeseado: Record<string, number> = { 'Activo': 1, 'Devuelto': 2, 'Atrasado': 3 };
  const prestamosOrdenados = [...charts.prestamosPorEstado].sort((a: any, b: any) => {
    return (ordenDeseado[a.name] || 99) - (ordenDeseado[b.name] || 99);
  });

  return (
    <IonPage>
      {/* VINCULAMOS LA REFERENCIA AL CONTENEDOR PRINCIPAL */}
      <IonContent ref={contentRef} className="dashboard-bg" style={{ position: 'relative' }}>
        
        {isLoading && (
            <div className="main-loader-overlay">
                <div className="main-loader-spinner"></div>
                <p>Calculando métricas...</p>
            </div>
        )}

        {/* --- TOOLTIP MODAL INFORMATIVO (FOQUITO RESTAURADO CON EJEMPLOS) --- */}
        {showHelp && (
          <div className="help-tooltip-overlay" onClick={() => setShowHelp(false)}>
            <div className="help-tooltip-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
              <div className="help-tooltip-header">
                <h3><IonIcon icon={bulbOutline} /> Guía de Filtros y Rangos de Fecha</h3>
                <IonIcon icon={closeCircleOutline} className="close-help-icon" onClick={() => setShowHelp(false)} />
              </div>
              <p>Aprende a utilizar las herramientas de filtrado para analizar las métricas de las gráficas de manera precisa:</p>
              
              <table className="help-tooltip-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Herramienta</th>
                    <th style={{ width: '50%' }}>Instrucciones de uso</th>
                    <th style={{ width: '25%' }}>Ejemplo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Rango de Fechas <br/>(Desde / Hasta)</strong></td>
                    <td>Haz clic en el primer calendario para elegir la <strong>fecha de inicio</strong> y en el segundo para la <strong>fecha límite</strong>. Una vez seleccionadas, presiona el botón de la lupa morada para graficar los resultados de ese lapso.</td>
                    <td><code className="code-badge">01/06/2026</code> al <br/><code className="code-badge">15/06/2026</code></td>
                  </tr>
                  <tr>
                    <td><strong>Filtro de Tiempo <br/>Rápido</strong></td>
                    <td>Haz clic en el menú desplegable de la derecha para elegir un lapso predeterminado. La gráfica cargará la información automáticamente al seleccionarlo, sin necesidad de usar la lupa.</td>
                    <td><code className="code-badge">Últimos 7 días</code><br/>o bien<br/><code className="code-badge">Hoy</code></td>
                  </tr>
                </tbody>
              </table>
              
              <p style={{ fontSize: '12px', color: '#666', marginTop: '15px', fontStyle: 'italic' }}>
                💡 Tip: Los controles de Préstamos y Sanciones funcionan de forma independiente. Si utilizas los calendarios, el menú rápido cambiará automáticamente a "Personalizado".
              </p>
            </div>
          </div>
        )}

        <div className="dashboard-layout">
          
          <div className="main-top-header">
            <div>
              <h1><IonIcon icon={trendingUpOutline} className="header-icon" /> Dashboard Overview</h1>
              <p>Métricas, usuarios y analíticas de la biblioteca en tiempo real.</p>
            </div>
          </div>

          <h2 className="section-subtitle">Comunidad y Red</h2>
          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-icon-wrapper users-icon"><IonIcon icon={peopleOutline} /></div><div className="kpi-info"><h3>{stats.usuarios}</h3><p>Usuarios</p></div></div>
            <div className="kpi-card"><div className="kpi-icon-wrapper staff-icon"><IonIcon icon={shieldCheckmarkOutline} /></div><div className="kpi-info"><h3>{stats.personal}</h3><p>Personal</p></div></div>
            <div className="kpi-card"><div className="kpi-icon-wrapper authors-icon"><IonIcon icon={personOutline} /></div><div className="kpi-info"><h3>{stats.autores}</h3><p>Autores</p></div></div>
            <div className="kpi-card"><div className="kpi-icon-wrapper publishers-icon"><IonIcon icon={bookmarksOutline} /></div><div className="kpi-info"><h3>{stats.editoriales}</h3><p>Editoriales</p></div></div>
          </div>

          <h2 className="section-subtitle">Recursos y Movimientos</h2>
          <div className="kpi-grid">
            <div className="kpi-card highlight-card"><div className="kpi-icon-wrapper total-icon"><IonIcon icon={libraryOutline} /></div><div className="kpi-info"><h3>{stats.total_catalogo}</h3><p>Total en Catálogo</p></div></div>
            <div className="kpi-card"><div className="kpi-icon-wrapper books-icon"><IonIcon icon={bookOutline} /></div><div className="kpi-info"><h3>{stats.libros}</h3><p>Libros</p></div></div>
            <div className="kpi-card"><div className="kpi-icon-wrapper thesis-icon"><IonIcon icon={documentTextOutline} /></div><div className="kpi-info"><h3>{stats.tesis}</h3><p>Tesis</p></div></div>
            <div className="kpi-card"><div className="kpi-icon-wrapper audiovisual-icon"><IonIcon icon={videocamOutline} /></div><div className="kpi-info"><h3>{stats.audiovisual}</h3><p>Equipo Audio/Visual</p></div></div>
            <div className="kpi-card"><div className="kpi-icon-wrapper magazine-icon"><IonIcon icon={newspaperOutline} /></div><div className="kpi-info"><h3>{stats.revistas}</h3><p>Revistas / Artículos</p></div></div>
            
            <div className="kpi-card highlight-card-blue"><div className="kpi-icon-wrapper loans-icon"><IonIcon icon={swapHorizontalOutline} /></div><div className="kpi-info"><h3>{stats.prestamos_periodo}</h3><p>Préstamos (Total)</p></div></div>
            <div className="kpi-card highlight-card-green"><div className="kpi-icon-wrapper cash-icon"><IonIcon icon={cashOutline} /></div><div className="kpi-info"><h3>${stats.multas_recaudadas}</h3><p>Cobradas (Total)</p></div></div>
          </div>

          <div className="charts-grid">
            
            {/* 1. TENDENCIA DE PRÉSTAMOS */}
            <div className="chart-card chart-span-full">
              <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 className="chart-title chart-title-trend">Tendencia de Préstamos</h3>
                  <p className="chart-subtitle-trend">Actividad según fecha de salida</p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* 1. CÁPSULA UNIFICADA DE FECHAS (AHORA A LA IZQUIERDA) */}
                  <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0 5px', height: '40px', width: 'max-content' }}>
                    <span style={{ paddingLeft: '5px', color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>Desde:</span>
                    <input 
                      type="date" 
                      style={{ border: 'none', outline: 'none', background: 'transparent', height: '100%', padding: '0 5px', color: '#374151', fontSize: '12px', width: '105px' }} 
                      value={fechaInicioPrestamos}
                      onChange={e => setFechaInicioPrestamos(e.target.value)}
                    />
                    <div style={{ height: '20px', width: '1px', backgroundColor: '#e5e7eb', margin: '0 2px' }}></div>
                    <span style={{ paddingLeft: '5px', color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>Hasta:</span>
                    <input 
                      type="date" 
                      style={{ border: 'none', outline: 'none', background: 'transparent', height: '100%', padding: '0 5px', color: '#374151', fontSize: '12px', width: '105px' }} 
                      value={fechaFinPrestamos}
                      onChange={e => setFechaFinPrestamos(e.target.value)}
                    />
                  </div>

                  {/* 2. LUPA DE BÚSQUEDA */}
                  <button onClick={ejecutarBusquedaPrestamos} style={{ background: '#582c83', color: 'white', border: 'none', borderRadius: '8px', height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <IonIcon icon={searchOutline} style={{ fontSize: '18px' }} />
                  </button>

                  {/* 3. SELECTOR RÁPIDO MOVIDO A LA DERECHA Y CON COLOR CORREGIDO */}
                  <select 
                    style={{ height: '40px', width: '160px', padding: '0 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#374151', outline: 'none', cursor: 'pointer', background: 'white' }}
                    value={periodoPrestamos} 
                    onChange={handlePeriodoPrestamos}
                  >
                    <option value="siempre">Todo el historial</option>
                    <option value="hoy">Hoy</option>
                    <option value="7">Últimos 7 días</option>
                    <option value="30">Últimos 30 días</option>
                    <option value="personalizado" disabled>Rango personalizado</option>
                  </select>

                  {/* 4. FOQUITO AL FINAL */}
                  <button className="btn-bulb-help-outside" onClick={() => setShowHelp(true)} title="Ver guía de formatos">
                    <IonIcon icon={bulbOutline} />
                  </button>
                </div>
              </div>

              <div className="chart-wrapper-large">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.tendenciaPrestamos} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    {/* MAGIA: interval="preserveStartEnd" fuerza que la fecha más vieja y la más nueva siempre salgan */}
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} dy={10} interval="preserveStartEnd" minTickGap={15} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="cantidad" stroke="#582c83" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} name="Préstamos" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. TENDENCIA DE SANCIONES */}
            <div className="chart-card chart-span-full">
              <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 className="chart-title chart-title-trend">Tendencia de Sanciones</h3>
                  <p className="chart-subtitle-trend">Sanciones generadas en el periodo seleccionado</p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* 1. CÁPSULA UNIFICADA DE FECHAS (AHORA A LA IZQUIERDA) */}
                  <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0 5px', height: '40px', width: 'max-content' }}>
                    <span style={{ paddingLeft: '5px', color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>Desde:</span>
                    <input 
                      type="date" 
                      style={{ border: 'none', outline: 'none', background: 'transparent', height: '100%', padding: '0 5px', color: '#374151', fontSize: '12px', width: '105px' }} 
                      value={fechaInicioSanciones}
                      onChange={e => setFechaInicioSanciones(e.target.value)}
                    />
                    <div style={{ height: '20px', width: '1px', backgroundColor: '#e5e7eb', margin: '0 2px' }}></div>
                    <span style={{ paddingLeft: '5px', color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>Hasta:</span>
                    <input 
                      type="date" 
                      style={{ border: 'none', outline: 'none', background: 'transparent', height: '100%', padding: '0 5px', color: '#374151', fontSize: '12px', width: '105px' }} 
                      value={fechaFinSanciones}
                      onChange={e => setFechaFinSanciones(e.target.value)}
                    />
                  </div>

                  {/* 2. LUPA DE BÚSQUEDA */}
                  <button onClick={ejecutarBusquedaSanciones} style={{ background: '#582c83', color: 'white', border: 'none', borderRadius: '8px', height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <IonIcon icon={searchOutline} style={{ fontSize: '18px' }} />
                  </button>

                  {/* 3. SELECTOR RÁPIDO MOVIDO A LA DERECHA Y CON COLOR CORREGIDO */}
                  <select 
                    style={{ height: '40px', width: '160px', padding: '0 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#374151', outline: 'none', cursor: 'pointer', background: 'white' }}
                    value={periodoSanciones} 
                    onChange={handlePeriodoSanciones}
                  >
                    <option value="siempre">Todo el historial</option>
                    <option value="hoy">Hoy</option>
                    <option value="7">Últimos 7 días</option>
                    <option value="30">Últimos 30 días</option>
                    <option value="personalizado" disabled>Rango personalizado</option>
                  </select>

                  {/* 4. FOQUITO AL FINAL */}
                  <button className="btn-bulb-help-outside" onClick={() => setShowHelp(true)} title="Ver guía de formatos">
                    <IonIcon icon={bulbOutline} />
                  </button>
                </div>
              </div>

              <div className="chart-wrapper-large">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.tendenciaSanciones} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} dy={10} interval="preserveStartEnd" minTickGap={15} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="cantidad" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6 }} name="Sanciones" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. ESTATUS DE PRÉSTAMOS */}
            <div className="chart-card">
              <h3 className="chart-title">Estatus de los Préstamos</h3>
              <div className="chart-wrapper-standard">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prestamosOrdenados} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50} name="Cantidad">
                      {prestamosOrdenados.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={coloresEstados[entry.name] || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. DISTRIBUCIÓN DEL CATÁLOGO */}
            <div className="chart-card">
              <h3 className="chart-title">Distribución del Catálogo</h3>
              <div className="chart-wrapper-standard">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.recursosPorTipo} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                      {charts.recursosPorTipo.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
import React from 'react';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
} from '@ionic/react';

import { useLocation } from 'react-router-dom';
import { 
  schoolOutline, appsOutline, peopleOutline, bookOutline, 
  libraryOutline, swapHorizontalOutline, alertCircleOutline, logOutOutline,
  personOutline, bookmarksOutline, idCardOutline , settingsOutline
} from 'ionicons/icons';
import './Menu.css';

const Menu: React.FC = () => {
  const location = useLocation();

  const handleLogout = () => {
    // Borramos todas las llaves de sessionStorage que creamos
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('rol');
    sessionStorage.removeItem('datos_google_temporales');
    
    // Forzamos la recarga al login de administrador
    window.location.href = '/';
  };

  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent className="menu-fondo">
        <div className="menu-wrapper">
          <div className="menu-top-content">
            <div className="menu-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3>UPVE</h3>
                <p>Sistema Bibliotecario</p>
              </div>
              <IonIcon 
                icon={settingsOutline} 
                className="btn-config-header" 
                onClick={() => window.location.href = '/configuracion'}
                title="Ajustes del Sistema"
              />
            </div>

        <IonList className="menu-lista">
          <IonListHeader>PANEL</IonListHeader>
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === '/dashboard' ? 'selected' : ''} routerLink="/dashboard" routerDirection="none" lines="none">
              <IonIcon slot="start" icon={appsOutline} />
              <IonLabel>Dashboard</IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonListHeader>ORGANIZACIÓN</IonListHeader>
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === '/usuarios' ? 'selected' : ''} routerLink="/usuarios" routerDirection="none" lines="none">
              <IonIcon slot="start" icon={idCardOutline} />
              <IonLabel>Usuarios</IonLabel>
            </IonItem>
          </IonMenuToggle>
          
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === '/carreras' ? 'selected' : ''} routerLink="/carreras" routerDirection="none" lines="none">
              <IonIcon slot="start" icon={schoolOutline} />
              <IonLabel>Carreras</IonLabel>
            </IonItem>

          </IonMenuToggle>
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === '/grupos' ? 'selected' : ''} routerLink="/grupos" routerDirection="none" lines="none">
              <IonIcon slot="start" icon={peopleOutline} />
              <IonLabel>Grupos</IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonListHeader>BIBLIOTECA</IonListHeader>
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === '/autores' ? 'selected' : ''} routerLink="/autores" routerDirection="none" lines="none">
              <IonIcon slot="start" icon={personOutline} />
              <IonLabel>Autores</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === '/editoriales' ? 'selected' : ''} routerLink="/editoriales" routerDirection="none" lines="none">
              <IonIcon slot="start" icon={bookmarksOutline} />
              <IonLabel>Editoriales</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === '/catalogo' ? 'selected' : ''} routerLink="/catalogo" routerDirection="none" lines="none">
              <IonIcon slot="start" icon={bookOutline} />
              <IonLabel>Catálogo</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === '/inventario' ? 'selected' : ''} routerLink="/inventario" routerDirection="none" lines="none">
              <IonIcon slot="start" icon={libraryOutline} />
              <IonLabel>Inventario</IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonListHeader>PRÉSTAMOS Y PAGOS</IonListHeader>
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === '/prestamos' ? 'selected' : ''} routerLink="/prestamos" routerDirection="none" lines="none">
              <IonIcon slot="start" icon={swapHorizontalOutline} />
              <IonLabel>Préstamos</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === '/sanciones' ? 'selected' : ''} routerLink="/sanciones" routerDirection="none" lines="none">
              <IonIcon slot="start" icon={alertCircleOutline} />
              <IonLabel>Sanciones</IonLabel>
            </IonItem>
          </IonMenuToggle>

        </IonList>
      </div> {/* Cierra menu-top-content */}

          <div className="menu-footer">
            <div>
              <h4>Administrador</h4>
              <p>Control Total</p>
            </div>
            <IonIcon 
              icon={logOutOutline} 
              onClick={handleLogout} 
              className="btn-logout-footer"
              title="Cerrar Sesión"
            />
          </div>

        </div> {/* Cierra menu-wrapper */}
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
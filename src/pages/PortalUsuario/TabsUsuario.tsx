import React from 'react';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/react';
import { Route, Redirect } from 'react-router-dom';
import { homeOutline, searchOutline, bookOutline, personOutline } from 'ionicons/icons';

// Importamos las 4 pantallas
import Inicio from './Inicio/Inicio';
import Explorar from './Explorar/Explorar';
import MiBiblioteca from './MiBiblioteca/MiBiblioteca';
import Perfil from './Perfil/Perfil';

import './TabsUsuario.css';

const TabsUsuario: React.FC = () => {
  return (
    <IonTabs>
      <IonRouterOutlet>
        {/* Rutas internas universales */}
        <Route exact path="/portal/inicio" component={Inicio} />
        <Route exact path="/portal/explorar" component={Explorar} />
        <Route exact path="/portal/mibiblioteca" component={MiBiblioteca} />
        <Route exact path="/portal/perfil" component={Perfil} />
        
        {/* Redirección por defecto */}
        <Route exact path="/portal">
          <Redirect to="/portal/inicio" />
        </Route>
      </IonRouterOutlet>

      {/* LA BARRA DE NAVEGACIÓN INFERIOR */}
      <IonTabBar slot="bottom" className="portal-tab-bar">
        <IonTabButton tab="inicio" href="/portal/inicio" className="portal-tab-btn">
          <IonIcon icon={homeOutline} />
          <IonLabel>Inicio</IonLabel>
        </IonTabButton>

        <IonTabButton tab="explorar" href="/portal/explorar" className="portal-tab-btn">
          <IonIcon icon={searchOutline} />
          <IonLabel>Explorar</IonLabel>
        </IonTabButton>

        <IonTabButton tab="mibiblioteca" href="/portal/mibiblioteca" className="portal-tab-btn">
          <IonIcon icon={bookOutline} />
          <IonLabel>Mi Biblioteca</IonLabel>
        </IonTabButton>

        <IonTabButton tab="perfil" href="/portal/perfil" className="portal-tab-btn">
          <IonIcon icon={personOutline} />
          <IonLabel>Mi Perfil</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

export default TabsUsuario;
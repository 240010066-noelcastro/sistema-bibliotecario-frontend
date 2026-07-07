import React from 'react';
import { IonContent, IonPage } from '@ionic/react';

const MiBiblioteca: React.FC = () => {
  return (
    <IonPage>
      <IonContent className="portal-bg">
        <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
          <h2>Mi Biblioteca</h2> 
          <p>Aquí verás tus libros prestados.</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MiBiblioteca;
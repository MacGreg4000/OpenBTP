/**
 * Déclarations de types personnalisés pour l'application
 */

// Déclaration pour les fichiers d'images
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

// Autres déclarations potentiellement utiles pour l'application
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module 'leaflet-defaulticon-compatibility';
declare module '*.css'; 
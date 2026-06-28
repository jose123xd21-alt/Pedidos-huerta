# Huerto TPV Pro

App web sencilla para gestionar pedidos de huerta desde varios móviles usando Firebase Firestore como base de datos compartida.

## Qué incluye

- Catálogo inicial con productos de huerta: huevos, patatas, tomates, pepinos, pimientos, berenjenas, calabacines, cebollas, lechugas, habicholillas/judía verde, habas, guisantes, acelgas, espinacas, zanahorias, calabaza, melones, sandías, fresas, limones, naranjas, etc.
- Crear pedidos por cliente.
- Varios productos por pedido.
- Estado pendiente / entregado.
- Botón para compartir pedido por WhatsApp.
- Catálogo editable.
- Base de datos compartida para que dos personas vean los mismos pedidos.
- Formato PWA para poder instalarla en el móvil desde el navegador.

## Archivos principales

- `index.html`: estructura de la app.
- `styles.css`: diseño visual.
- `app.js`: lógica de pedidos, catálogo, WhatsApp y Firebase.
- `firebase-config.js`: aquí debes pegar la configuración de tu Firebase.
- `firestore.rules`: reglas de seguridad para Firestore.
- `manifest.json` y `sw.js`: archivos para que funcione como app instalable.

## Paso 1: Crear proyecto en Firebase

1. Entra en Firebase Console.
2. Crea un proyecto nuevo.
3. Añade una app web.
4. Copia la configuración Firebase que te da la consola.
5. Pégala dentro de `firebase-config.js`.

El archivo debe quedar parecido a esto:

```js
export const firebaseConfig = {
  apiKey: "xxxxx",
  authDomain: "xxxxx.firebaseapp.com",
  projectId: "xxxxx",
  storageBucket: "xxxxx.appspot.com",
  messagingSenderId: "xxxxx",
  appId: "xxxxx"
};
```

## Paso 2: Activar inicio de sesión

1. En Firebase, entra en **Authentication**.
2. Activa el proveedor **Email/Password**.
3. Crea manualmente dos usuarios:
   - Tu correo.
   - El correo de tu pareja.

La app no tiene botón de registro, por lo que nadie se puede registrar desde la propia app.

## Paso 3: Crear Firestore

1. En Firebase, entra en **Firestore Database**.
2. Crea la base de datos.
3. En la pestaña **Rules**, pega el contenido de `firestore.rules`.
4. Pulsa **Publish**.

## Paso 4: Subir a GitHub

1. Crea un repositorio nuevo en GitHub.
2. Sube todos los archivos de esta carpeta.
3. Entra en **Settings > Pages**.
4. En **Build and deployment**, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Guarda los cambios.

Cuando GitHub Pages termine, tendrás una URL pública de la app.

## Paso 5: Instalar en el móvil

En Android:

1. Abre la URL de GitHub Pages en Chrome.
2. Pulsa los tres puntos.
3. Pulsa **Añadir a pantalla de inicio** o **Instalar app**.

## Seguridad recomendada

Las reglas incluidas permiten leer y escribir solo a usuarios que hayan iniciado sesión.

Si quieres más seguridad, puedes editar `firestore.rules` y limitar el acceso a vuestros dos correos concretos usando la opción restrictiva que viene comentada al final del archivo.

## Nota importante

No cambies los nombres de estos archivos:

- `index.html`
- `app.js`
- `styles.css`
- `firebase-config.js`

GitHub Pages necesita que `index.html` esté en la raíz del repositorio.

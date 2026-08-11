# Pantallas impulsadas por datos

Visual Builder usa conceptos genéricos para que una misma pantalla funcione con productos,
lecciones, personas, recetas u otros registros. El HTML no necesita conocer el
origen de los datos.

## Flujo para estudiantes

La interfaz llama **colección** a una tabla y **elemento** a una fila. El flujo
predeterminado no requiere conocer SQL:

1. Conectar la URL y la publishable key del proyecto de Supabase.
2. Crear una colección desde Productos, Libros, Proyectos, Eventos o Desde cero.
3. Elegir la información de cada elemento y quién puede verla.
4. Copiar la configuración, ejecutarla una vez en el SQL Editor de Supabase y
   comprobar la colección desde Visual Builder.
5. Seleccionar un contenedor para mostrar uno por cada elemento y conectar sus
   textos o imágenes con la información de la colección.

Las relaciones, los identificadores internos, los campos automáticos y el SQL
permanecen en las opciones avanzadas. Después de comprobar una colección, Visual Builder
bloquea el cambio o la eliminación de campos instalados; se pueden añadir campos
nuevos sin afectar los datos existentes.

Una colección pública solo muestra filas con `published = true`. Si está vacía,
el sitio muestra un estado vacío comprensible en lugar de desaparecer el diseño.
Las colecciones propias del usuario se comprueban con la sesión iniciada guardada
por la vista previa.

## Colecciones relacionadas

En **Datos → Colección → Avanzado → Relaciones** se puede conectar un campo con
otra colección. La relación pregunta tres cosas visibles: dónde guardar el
identificador, de qué colección elegirlo y qué texto debe ver la persona.

Después de crearla:

- **Información** ofrece campos como `Autores → nombre`, sin mostrar el
  identificador interno.
- Los componentes dinámicos pueden mostrar, buscar, filtrar y ordenar usando
  información de la colección relacionada.
- **Añadir campos de esta colección** crea una lista desplegable que carga las
  opciones permitidas y guarda el identificador correcto.
- La vista previa y el ZIP exportado conservan tanto la relación como sus
  controles.

Supabase aplica también las reglas RLS de la colección relacionada. Por ello,
una lista solo ofrece registros que la persona actual tiene permiso de leer.
El selector carga como máximo 100 opciones; las colecciones mucho mayores
necesitarán en el futuro un selector con búsqueda remota.

## Componentes responsive con datos

Desde **Añadir → Supabase → Datos dinámicos**, el estudiante puede comenzar por el
diseño en vez de conectar elementos manualmente:

Al seleccionar o arrastrar un bloque, la biblioteca **Añadir** se cierra
automáticamente. Para **Datos dinámicos**, se abre de inmediato el asistente de
configuración sin dejar un bloque provisional en la página.

1. Elegir cuadrícula de tarjetas, carrusel deslizable, lista visual o detalle
   destacado. Todos incluyen reglas para escritorio, tableta y móvil.
2. Elegir una tabla registrada en el proyecto o crear una nueva con el asistente.
3. Confirmar qué columnas alimentan el medio, título, descripción e indicador.
4. Elegir si el medio debe mostrarse como imagen o video con controles.
5. Elegir el máximo por página y las columnas de escritorio, tableta y móvil.
   Visual Builder calcula las filas; con 12 elementos usa 4 × 3, 4 × 3 y 2 × 6 por defecto.
6. Activar **Anterior y Siguiente** para mostrar controles únicamente cuando
   existan más registros.
7. Añadir el componente a la página. Visual Builder crea automáticamente los repetidores,
   vínculos y estilos que usan la vista previa y la exportación.

Las sugerencias usan los nombres y tipos de las columnas, pero siempre se pueden
cambiar o desactivar. La cuadrícula, el carrusel y la lista repiten registros; el
detalle destacado usa el primer registro disponible hasta que se conecte con el
contexto seleccionado de otra página.

La paginación consulta solamente la página actual. En Supabase se envían `limit`
y `offset`, solicitando un registro adicional para saber si debe habilitarse
**Siguiente**.

La publishable key no se usa para inspeccionar todo el esquema remoto. La lista
muestra las tablas creadas o registradas en el proyecto Visual Builder; esto evita solicitar
una secret key en el navegador.

## Fuentes

Una fuente estática almacena registros dentro de `project.json`:

```json
{
  "id": "items",
  "name": "Items",
  "type": "static",
  "records": [{ "id": "one", "name": "Primer item" }]
}
```

Una fuente REST usa un endpoint de lista y una plantilla para consultar un
registro. `{id}` se reemplaza de forma segura:

```json
{
  "id": "items",
  "name": "Items",
  "type": "rest",
  "listUrl": "https://api.example.com/items",
  "recordUrl": "https://api.example.com/items/{id}"
}
```

Los endpoints REST deben permitir CORS. Credenciales privadas y SQL nunca deben
incluirse en el ZIP; las bases de datos autenticadas necesitan una API o función
de servidor que aplique autorización.

## Listas repetidas

Un `repeater` identifica un elemento HTML que funciona como plantilla. En modo
Probar y en el sitio exportado, el runtime lo clona una vez por registro:

```json
{
  "pageId": "catalog",
  "elementId": "catalog::main:1/article:1",
  "dataSourceId": "items",
  "itemContext": "item"
}
```

Los descendientes se vinculan usando `item` como dato recibido. Una conexión en
la plantilla puede enviar `$record.id`, que se convierte en el ID de la fila
real que fue pulsada.

## Perfiles y gestión por roles

Una colección marcada como **un solo elemento por persona** puede conectarse a
un formulario mediante **Flujo → Guardar mis datos**. El sitio carga el registro
de la sesión actual y la misma acción lo crea o actualiza. `user_id` se obtiene
de la sesión y no de un campo editable.

Para áreas de administración, crea la plantilla **Roles de usuarios** y activa
**Gestión por roles** en cada colección que corresponda. Allí se eligen los
roles y si pueden ver todos los registros, crear, editar o eliminar. El editor
genera políticas RLS y una función de autorización dentro del esquema privado;
ocultar un botón nunca sustituye estas políticas.

El primer `admin` debe asignarse desde Supabase. Después, un formulario de
gestión puede conectar `user_id` y `role` para asignar permisos a otras cuentas.
En **Flujo**, la acción **Cambiar información** convierte un botón en una
actualización segura. Un doble clic abre su configuración. El editor detecta si
el botón está dentro de una tarjeta repetida, si la página recibió un registro
desde otra tarjeta o si existe una colección con un solo elemento por persona.
Solo ofrece esas opciones como posibles destinos.

El nuevo valor puede ser fijo, venir de un campo del formulario, usar la persona
conectada, usar la fecha actual, alternar un campo de Sí/No o sumar y restar en
un campo numérico. El editor limita estas opciones según el tipo del campo y las
conserva tanto en la vista previa como en el ZIP exportado.

## Archivos

Un campo de imagen o archivo puede guardar una URL escrita manualmente o subir
el archivo a Supabase Storage. En **Datos → Colección → Información → Archivos**
se elige la carpeta, el tipo permitido, el tamaño máximo y si los archivos son
públicos o privados. Las listas de archivos usan un campo JSON; los archivos
individuales usan un campo de texto.

Al añadir los campos de una colección a un formulario, el editor crea el
selector de archivo correspondiente. El sitio exportado sube el archivo y
guarda una dirección `storage://` en el registro. Los archivos privados se
abren con un enlace temporal; los públicos usan su dirección pública. Al
reemplazar o quitar un archivo, el anterior se elimina solamente después de
que el registro se haya guardado correctamente.

El SQL generado prepara la carpeta y sus políticas para que cada persona solo
pueda gestionar archivos dentro de su propia subcarpeta. Quitar una
configuración del editor no borra automáticamente la carpeta ni los archivos
existentes.

## Navegación con contexto

Cuando un botón, enlace o tarjeta está dentro de una lista de datos, **Flujo →
Ir a otra pantalla** muestra **Registro que recibirá la otra página**. Se puede enviar el elemento
actual o uno de sus elementos relacionados. Por ejemplo, una fila de intentos
puede abrir la práctica indicada por `practice_id`; la pantalla de destino
recibe entonces un registro de `Practices`, no el intento.

```json
{
  "action": "navigate",
  "targetPage": "detail",
  "context": {
    "selectedRecord": {
      "dataSourceId": "items",
      "recordId": "$record.id"
    }
  }
}
```

En exportaciones estáticas la referencia se conserva como parámetro de URL, por
lo que actualizar, compartir, regresar y avanzar mantienen el registro elegido.

## Vínculos seguros

Un vínculo conecta un campo —incluyendo rutas como `details.title`— con una
propiedad permitida: texto, `src`, `alt`, `href`, `title`, `aria-label` o el
valor de un control de formulario. No se evalúa JavaScript ni HTML procedente
de los registros.

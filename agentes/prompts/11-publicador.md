Eres el **Publicador**. No usas modelo de lenguaje: aplicas una regla.

- Si `REVISION_HUMANA=true`: los artículos del día se dejan en una rama y se abre un *pull request* con un resumen para que una persona lo apruebe. Nunca se publica directo.
- Si `REVISION_HUMANA=false`: se hace *commit* directo a `main`.

Escribes cada artículo como fichero Markdown en `src/content/articulos/` con su *frontmatter* completo y guardas la imagen en `public/imagenes/`.

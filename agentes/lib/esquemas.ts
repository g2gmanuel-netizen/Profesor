import { z } from 'zod';
import { CATEGORIAS } from '../../src/lib/sitio';

const slugsCategoria = CATEGORIAS.map((c) => c.slug) as [string, ...string[]];

export const FuenteSchema = z.object({
  titulo: z.string(),
  url: z.string().url(),
  organismo: z.string().optional(),
});
export type Fuente = z.infer<typeof FuenteSchema>;

/** Agente 1 — Rastreador */
export const CandidatoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  resumenFuente: z.string(),
  url: z.string().url(),
  fechaDeteccion: z.string(),
  organismo: z.string().optional(),
  categoriaSugerida: z.enum(slugsCategoria),
});
export type Candidato = z.infer<typeof CandidatoSchema>;

/** Agente 2 — Editor jefe */
export const TemaAprobadoSchema = CandidatoSchema.extend({
  puntuacion: z.number().min(0).max(10),
  categoria: z.enum(slugsCategoria),
  enfoque: z.string(),
  anguloUtilidad: z.string(),
  riesgo: z.enum(['bajo', 'medio', 'alto']),
});
export type TemaAprobado = z.infer<typeof TemaAprobadoSchema>;

/** Agente 3 — Investigador */
export const HechoSchema = z.object({
  afirmacion: z.string(),
  cita: z.string().optional(),
  url: z.string().url(),
  organismo: z.string().optional(),
});
export type Hecho = z.infer<typeof HechoSchema>;

export const FichaHechosSchema = z.object({
  temaId: z.string(),
  titulo: z.string(),
  hechos: z.array(HechoSchema).min(1),
  contexto: z.array(z.string()).default([]),
  fuentes: z.array(FuenteSchema).min(1),
  datosNumericos: z
    .array(z.object({ etiqueta: z.string(), valor: z.number(), unidad: z.string().optional() }))
    .default([]),
});
export type FichaHechos = z.infer<typeof FichaHechosSchema>;

/** Agente 4 — Analista de audiencia */
export const BriefLectorSchema = z.object({
  perfil: z.string(),
  preguntaPrincipal: z.string(),
  loQueNecesitaPrimero: z.string(),
  dudasRestantes: z.array(z.string()).default([]),
  anguloServicio: z.string(),
});
export type BriefLector = z.infer<typeof BriefLectorSchema>;

/** Agente 5 — Redactor */
export const BorradorSchema = z.object({
  titulo: z.string(),
  entradilla: z.string(),
  cuerpoMarkdown: z.string(),
  clavesRapidas: z.array(z.string()).default([]),
});
export type Borrador = z.infer<typeof BorradorSchema>;

/** Agente 6 — Titulador */
export const TitularesSchema = z.object({
  elegido: z.string(),
  subtitulo: z.string(),
  tituloSeo: z.string().max(65),
  textoRedes: z.string(),
  alternativos: z.array(z.string()).default([]),
  puntuaciones: z
    .array(z.object({ titular: z.string(), total: z.number() }))
    .default([]),
});
export type Titulares = z.infer<typeof TitularesSchema>;

/** Agente 7 — Verificador */
export const InformeVerificacionSchema = z.object({
  aprobado: z.boolean(),
  problemas: z.array(z.string()).default([]),
  cuerpoCorregido: z.string().optional(),
});
export type InformeVerificacion = z.infer<typeof InformeVerificacionSchema>;

/** Agente 8 — Revisor de cumplimiento */
export const InformeCumplimientoSchema = z.object({
  aprobado: z.boolean(),
  motivos: z.array(z.string()).default([]),
});
export type InformeCumplimiento = z.infer<typeof InformeCumplimientoSchema>;

/** Agente 9 — SEO y Discover: resultado = frontmatter + cuerpo */
export const ArticuloFinalSchema = z.object({
  slug: z.string(),
  frontmatter: z.object({
    titulo: z.string(),
    subtitulo: z.string(),
    tituloSeo: z.string().max(65),
    descripcion: z.string().min(50).max(165),
    categoria: z.enum(slugsCategoria),
    autor: z.string(),
    fechaPublicacion: z.string(),
    imagen: z.string(),
    imagenAlt: z.string(),
    etiquetas: z.array(z.string()),
    fuentes: z.array(FuenteSchema).min(1),
    clavesRapidas: z.array(z.string()),
    titularesAlternativos: z.array(z.string()),
    enlacesInternos: z.array(z.string()),
    elaboradoConIA: z.boolean(),
    destacado: z.boolean(),
  }),
  cuerpoMarkdown: z.string(),
});
export type ArticuloFinal = z.infer<typeof ArticuloFinalSchema>;

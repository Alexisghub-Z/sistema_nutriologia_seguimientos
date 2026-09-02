'use client'

/**
 * La hoja que se lleva el paciente.
 * ------------------------------------------------------------
 * No es un volcado del plan: es el documento que acaba pegado en la puerta del
 * refrigerador. Por eso lleva solo lo que se necesita para comer —el tiempo,
 * la hora y los alimentos con su porción— y deja fuera equivalentes y kcal,
 * que son el lenguaje con el que trabaja el nutriólogo, no el paciente.
 *
 * La identidad sale del material que ya existe (`public/word/`): el cian
 * #00b3e3 del membrete y la manzana del fondo, la misma que firma los informes
 * de consulta. La hoja tiene que parecer de Paul, no de un generador de PDFs.
 */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

/** Un alimento tal como se entrega: qué es y cuánto. */
export interface AlimentoImpreso {
  descripcion: string
}

export interface TiempoImpreso {
  nombre: string
  alimentos: AlimentoImpreso[]
  nota?: string
}

export interface DatosDocumento {
  paciente: string
  fecha: string
  tiempos: TiempoImpreso[]
  indicacionesInicio?: string
}

// Helvetica va incrustada en el propio PDF: no depende de fuentes del sistema
// ni de descargas, así que la hoja se ve igual en cualquier equipo e impresora.
Font.registerHyphenationCallback((palabra) => [palabra])

const CIAN = '#00b3e3'
const LIMA = '#c8e050'
const TINTA = '#1a2b34'
const GRIS = '#8a9aa3'

const s = StyleSheet.create({
  pagina: {
    paddingTop: 34,
    paddingBottom: 46,
    paddingHorizontal: 46,
    fontFamily: 'Helvetica',
    color: TINTA,
    fontSize: 10.5,
    position: 'relative',
  },

  // La manzana de la marca, muy tenue detrás del texto. Firma la hoja sin
  // disputarle la lectura a lo que importa.
  marcaAgua: {
    position: 'absolute',
    width: 300,
    height: 290,
    top: 240,
    left: 148,
    opacity: 0.055,
  },

  // ── Membrete ──
  membrete: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: CIAN,
    paddingBottom: 10,
    marginBottom: 20,
  },
  logo: { width: 142, height: 38 },
  destinatario: { alignItems: 'flex-end' },
  paraQuien: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: TINTA },
  cuando: { fontSize: 9, color: GRIS, marginTop: 3 },

  // ── Indicaciones de apertura ──
  indicaciones: {
    backgroundColor: '#f2fbfe',
    borderLeftWidth: 3,
    borderLeftColor: CIAN,
    paddingVertical: 10,
    paddingHorizontal: 13,
    marginBottom: 20,
  },
  indicacionesTexto: { fontSize: 10, lineHeight: 1.55, color: TINTA },

  // ── Tiempos de comida ──
  // El día avanza de arriba abajo, así que los tiempos van sobre una guía
  // vertical: es una secuencia real, no una lista de apartados.
  tiempo: {
    flexDirection: 'row',
    marginBottom: 17,
  },
  guia: {
    width: 3,
    backgroundColor: '#e4f4fb',
    marginRight: 14,
    borderRadius: 2,
  },
  guiaCuerpo: { flex: 1 },

  tiempoNombre: {
    fontSize: 12.5,
    fontFamily: 'Helvetica-Bold',
    color: CIAN,
    marginBottom: 7,
  },

  alimento: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingRight: 10,
  },
  vineta: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: LIMA,
    marginTop: 5,
    marginRight: 9,
  },
  alimentoTexto: { flex: 1, fontSize: 10.5, lineHeight: 1.45 },

  nota: {
    fontSize: 9,
    color: GRIS,
    marginTop: 4,
    marginLeft: 13,
  },

  // ── Pie ──
  pie: {
    position: 'absolute',
    bottom: 24,
    left: 46,
    right: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e8eef1',
    paddingTop: 8,
  },
  pieTexto: { fontSize: 8, color: GRIS },
})

export function DocumentoDieta({ datos, logo, manzana }: {
  datos: DatosDocumento
  logo?: string
  manzana?: string
}) {
  return (
    <Document
      title={`Plan de alimentación · ${datos.paciente}`}
      author="Eder Paul Alavez Cortes"
    >
      <Page size="LETTER" style={s.pagina} wrap>
        {manzana && <Image src={manzana} style={s.marcaAgua} fixed />}

        <View style={s.membrete} fixed>
          {logo ? (
            <Image src={logo} style={s.logo} />
          ) : (
            <Text style={s.paraQuien}>Eder Paul Alavez Cortes</Text>
          )}
          <View style={s.destinatario}>
            <Text style={s.paraQuien}>{datos.paciente}</Text>
            <Text style={s.cuando}>{datos.fecha}</Text>
          </View>
        </View>

        {datos.indicacionesInicio ? (
          <View style={s.indicaciones}>
            <Text style={s.indicacionesTexto}>{datos.indicacionesInicio}</Text>
          </View>
        ) : null}

        {datos.tiempos.map((t, i) => (
          // `wrap={false}` mantiene junto cada tiempo: partir un desayuno entre
          // dos páginas obliga a girar la hoja para saber qué desayunar.
          <View key={i} style={s.tiempo} wrap={false}>
            <View style={s.guia} />
            <View style={s.guiaCuerpo}>
              <Text style={s.tiempoNombre}>{t.nombre}</Text>
              {t.alimentos.map((a, j) => (
                <View key={j} style={s.alimento}>
                  <View style={s.vineta} />
                  <Text style={s.alimentoTexto}>{a.descripcion}</Text>
                </View>
              ))}
              {t.nota ? <Text style={s.nota}>{t.nota}</Text> : null}
            </View>
          </View>
        ))}

        <View style={s.pie} fixed>
          <Text style={s.pieTexto}>Eder Paul Alavez Cortes · Nutriólogo · 951 130 15 54</Text>
          <Text
            style={s.pieTexto}
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `${pageNumber} de ${totalPages}` : ''
            }
          />
        </View>
      </Page>
    </Document>
  )
}

/**
 * La misma hoja del paciente, en Word.
 * ------------------------------------------------------------
 * El PDF es el formato de entrega: sale igual en cualquier impresora y nadie
 * lo descuadra sin querer. Pero a veces el nutriólogo necesita RETOCAR —añadir
 * una línea para un paciente concreto, cambiar una palabra— y para eso el PDF
 * no sirve.
 *
 * Este módulo genera el mismo documento en .docx, reutilizando los tipos del
 * PDF (`DatosDocumento`, `OpcionesDocumento`): así las nueve opciones que el
 * nutriólogo marca en la vista previa valen para los dos formatos, y no hay
 * dos definiciones de "qué lleva la hoja" que puedan separarse con el tiempo.
 *
 * Lo que NO se replica es el diseño exacto del PDF —la marca de agua, las
 * medidas milimétricas—: Word tiene sus propias reglas de maquetación y forzar
 * un calco produce documentos frágiles que se rompen al editarlos, que es
 * justo lo contrario de para lo que se pide el Word.
 */

import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { saveAs } from 'file-saver'
import {
  OPCIONES_POR_DEFECTO,
  type DatosDocumento,
  type OpcionesDocumento,
  nombreDeArchivo,
  type TiempoImpreso,
} from './hoja-paciente'

/** Los colores de marca, los mismos del PDF. */
const CIAN = '00B3E3'
const TINTA = '1A2B34'
const GRIS = '8A9AA3'

/** Un párrafo de texto corriente. */
function parrafo(texto: string, opciones: { gris?: boolean; cursiva?: boolean; tamano?: number } = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: texto,
        size: (opciones.tamano ?? 10.5) * 2, // docx mide en medios puntos
        color: opciones.gris ? GRIS : TINTA,
        italics: opciones.cursiva,
      }),
    ],
  })
}

/** Título de sección, en el cian de la marca. */
function titulo(texto: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: texto, size: 26, bold: true, color: CIAN })],
  })
}

/**
 * Una celda de tabla.
 *
 * Los bordes van solo abajo y muy tenues: una rejilla completa convierte la
 * hoja en un formulario, y esto es algo que el paciente lee en la cocina.
 */
function celda(hijos: Paragraph[], opciones: { ancho?: number; fondo?: string } = {}) {
  return new TableCell({
    children: hijos,
    width: opciones.ancho ? { size: opciones.ancho, type: WidthType.PERCENTAGE } : undefined,
    shading: opciones.fondo
      ? { type: ShadingType.CLEAR, color: 'auto', fill: opciones.fondo }
      : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E8EEF1' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
  })
}

/** Los datos de la consulta, como tabla de dos columnas. */
function bloqueConsulta(datos: DatosDocumento): Paragraph[] | Table[] {
  const c = datos.consulta
  if (!c) return []

  const filas: Array<[string, string]> = []
  if (c.peso != null) filas.push(['Peso', `${c.peso} kg`])
  if (c.talla != null) filas.push(['Talla', `${c.talla} cm`])
  if (c.imc != null) {
    filas.push(['IMC', c.clasificacionImc ? `${c.imc} · ${c.clasificacionImc}` : String(c.imc)])
  }
  if (c.pesoIdeal != null) filas.push(['Peso ideal', `${c.pesoIdeal} kg`])
  if (c.objetivo) filas.push(['Objetivo', c.objetivo])

  if (filas.length === 0) return []

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: filas.map(
        ([etiqueta, valor]) =>
          new TableRow({
            children: [
              celda([parrafo(etiqueta, { gris: true })], { ancho: 35 }),
              celda([parrafo(valor)], { ancho: 65 }),
            ],
          })
      ),
    }),
  ]
}

/** Un tiempo de comida: dieta precisa o recetario con opciones. */
function bloqueTiempo(
  tiempo: TiempoImpreso,
  opciones: OpcionesDocumento
): Array<Paragraph | Table> {
  const bloques: Array<Paragraph | Table> = []

  // Encabezado del tiempo, con sus kcal si se pidieron.
  const encabezado =
    opciones.kcalPorTiempo && tiempo.kcal != null
      ? `${tiempo.nombre}  ·  ${Math.round(tiempo.kcal)} kcal`
      : tiempo.nombre

  bloques.push(
    new Paragraph({
      spacing: { before: 240, after: 100 },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F9FC' },
      children: [new TextRun({ text: encabezado, size: 23, bold: true, color: TINTA })],
    })
  )

  // Dieta precisa: una lista de alimentos.
  if (tiempo.alimentos?.length) {
    for (const alimento of tiempo.alimentos) {
      bloques.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: alimento.descripcion, size: 21, color: TINTA })],
        })
      )
    }
  }

  // Recetario: varias opciones, y el paciente elige una.
  if (tiempo.opciones?.length) {
    tiempo.opciones.forEach((opcion, i) => {
      bloques.push(
        new Paragraph({
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({
              text: opcion.nombre || `Opción ${i + 1}`,
              size: 21,
              bold: true,
              color: CIAN,
            }),
          ],
        })
      )

      for (const alimento of opcion.alimentos) {
        bloques.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: alimento.descripcion, size: 21, color: TINTA })],
          })
        )
      }

      // La preparación va con su platillo: sin ella el recetario es una lista
      // de ingredientes que nadie sabe cocinar.
      if (opciones.preparacion && opcion.preparacion) {
        bloques.push(
          new Paragraph({
            spacing: { before: 60, after: 100 },
            indent: { left: 360 },
            children: [
              new TextRun({ text: 'Preparación: ', size: 19, bold: true, color: GRIS }),
              new TextRun({ text: opcion.preparacion, size: 19, color: GRIS }),
            ],
          })
        )
      }
    })
  }

  if (opciones.notasTiempo && tiempo.nota) {
    bloques.push(parrafo(tiempo.nota, { gris: true, cursiva: true, tamano: 9.5 }))
  }

  return bloques
}

/** Construye el documento completo. Aparte de la descarga, para poder probarlo. */
export function construirDocumentoWord(
  datos: DatosDocumento,
  opciones: OpcionesDocumento = OPCIONES_POR_DEFECTO
): Document {
  const cuerpo: Array<Paragraph | Table> = []

  // Encabezado: quién y cuándo. Sin esto la hoja no se puede archivar.
  cuerpo.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Plan de alimentación', size: 32, bold: true, color: CIAN })],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: datos.paciente, size: 24, bold: true, color: TINTA })],
    }),
    parrafo(datos.fecha, { gris: true, tamano: 9.5 })
  )

  if (opciones.datosConsulta) {
    const bloque = bloqueConsulta(datos)
    if (bloque.length > 0) {
      cuerpo.push(titulo('Datos de la consulta'))
      cuerpo.push(...(bloque as Table[]))
    }
  }

  if (opciones.metaCalorica && datos.kcalMeta != null) {
    cuerpo.push(titulo('Meta diaria'))
    cuerpo.push(parrafo(`${Math.round(datos.kcalMeta)} kcal al día`))

    if (opciones.macros && datos.macros) {
      const m = datos.macros
      cuerpo.push(
        parrafo(
          `Proteína ${Math.round(m.proteina)} g · Grasa ${Math.round(m.grasa)} g · ` +
            `Carbohidratos ${Math.round(m.carbohidrato)} g`,
          { gris: true, tamano: 9.5 }
        )
      )
    }
  }

  if (opciones.restricciones && datos.restricciones?.length) {
    cuerpo.push(titulo('Ten en cuenta'))
    for (const r of datos.restricciones) {
      cuerpo.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: r, size: 21, color: TINTA })],
        })
      )
    }
  }

  if (opciones.indicaciones && datos.indicacionesInicio) {
    cuerpo.push(titulo('Antes de empezar'))
    // Las indicaciones vienen como texto libre: cada salto de línea del
    // nutriólogo es un párrafo suyo y se respeta.
    for (const linea of datos.indicacionesInicio.split('\n')) {
      if (linea.trim()) cuerpo.push(parrafo(linea.trim()))
    }
  }

  cuerpo.push(titulo('Tu plan'))
  for (const tiempo of datos.tiempos) {
    cuerpo.push(...bloqueTiempo(tiempo, opciones))
  }

  if (opciones.espacioNotas) {
    cuerpo.push(titulo('Notas'))
    // Líneas en blanco para escribir a mano sobre la hoja impresa.
    for (let i = 0; i < 6; i++) {
      cuerpo.push(
        new Paragraph({
          spacing: { after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D8E2E7' } },
          children: [new TextRun({ text: '', size: 21 })],
        })
      )
    }
  }

  return new Document({
    creator: 'NutriSys',
    title: `Plan de alimentación — ${datos.paciente}`,
    description: 'Plan de alimentación generado con NutriSys',
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 21, color: TINTA } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } },
        },
        children: cuerpo,
      },
    ],
  })
}

/** Genera el .docx y lo descarga. */
export async function descargarWord(
  datos: DatosDocumento,
  opciones: OpcionesDocumento = OPCIONES_POR_DEFECTO
): Promise<void> {
  const doc = construirDocumentoWord(datos, opciones)
  const blob = await Packer.toBlob(doc)
  saveAs(blob, nombreDeArchivo(datos.paciente, 'docx'))
}

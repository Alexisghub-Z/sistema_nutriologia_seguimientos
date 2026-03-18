import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Header,
  ImageRun,
  TextWrappingType,
} from 'docx'
import { saveAs } from 'file-saver'

// ── Cargar imágenes ──

async function cargarImagen(ruta: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(ruta)
    if (!response.ok) return null
    return await response.arrayBuffer()
  } catch {
    return null
  }
}

interface ConsultaData {
  id: string
  fecha: string
  motivo: string | null
  peso: number | null
  talla: number | null
  imc: number | null
  grasa_corporal: number | null
  porcentaje_agua: number | null
  masa_muscular_kg: number | null
  grasa_visceral: number | null
  brazo_relajado: number | null
  brazo_flexionado: number | null
  cintura: number | null
  cadera_maximo: number | null
  muslo_maximo: number | null
  muslo_medio: number | null
  pantorrilla_maximo: number | null
  pliegue_tricipital: number | null
  pliegue_subescapular: number | null
  pliegue_bicipital: number | null
  pliegue_cresta_iliaca: number | null
  pliegue_supraespinal: number | null
  pliegue_abdominal: number | null
  notas: string | null
  diagnostico: string | null
  antecedentes_familiares: string | null
  estudios_laboratorio: string | null
  observaciones: string | null
  objetivo: string | null
  plan: string | null
  proxima_cita: string | null
  monto_consulta: any
  metodo_pago: string | null
  estado_pago: string | null
  notas_pago: string | null
}

// Colores del sistema
const COLOR_PRIMARY = '2d9f5d'
const COLOR_HEADING = '111827'
const COLOR_BODY = '4b5563'
const COLOR_LABEL = '6b7280'
const COLOR_BORDER = 'e5e7eb'
const COLOR_SURFACE_ALT = 'f8faf9'

const FONT = 'Calibri'

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatearMonto(monto: any): string {
  if (!monto) return '$0.00'
  const montoNum = typeof monto === 'string' ? parseFloat(monto) : monto
  return `$${montoNum.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getMetodoPagoLabel(metodo: string | null): string {
  if (!metodo) return 'No especificado'
  const labels: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
    OTRO: 'Otro',
  }
  return labels[metodo] || metodo
}

function getEstadoPagoLabel(estado: string | null): string {
  if (!estado) return 'No especificado'
  const labels: Record<string, string> = {
    PAGADO: 'Pagado',
    PENDIENTE: 'Pendiente',
    PARCIAL: 'Parcial',
  }
  return labels[estado] || estado
}

// ── Helpers para construir el documento ──

function crearSeparador(): Paragraph {
  return new Paragraph({ spacing: { after: 100 } })
}

function crearTituloSeccion(texto: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_PRIMARY },
    },
    children: [
      new TextRun({
        text: texto,
        bold: true,
        size: 24, // 12pt
        color: COLOR_PRIMARY,
        font: FONT,
      }),
    ],
  })
}

function crearParrafoTexto(texto: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: texto,
        size: 22, // 11pt
        color: COLOR_BODY,
        font: FONT,
      }),
    ],
  })
}

function crearTablaMediciones(
  datos: { label: string; valor: string }[]
): Table {
  const filas = datos.map(
    (d, i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: i % 2 === 0
              ? { type: ShadingType.SOLID, color: COLOR_SURFACE_ALT }
              : undefined,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: d.label,
                    bold: true,
                    size: 20, // 10pt
                    color: COLOR_LABEL,
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: i % 2 === 0
              ? { type: ShadingType.SOLID, color: COLOR_SURFACE_ALT }
              : undefined,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({
                    text: d.valor,
                    size: 22, // 11pt
                    color: COLOR_HEADING,
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: filas,
  })
}

// ── Función principal ──

export async function generarWordConsulta(
  consulta: ConsultaData,
  nombrePaciente: string
): Promise<void> {
  const fechaFormateada = formatearFecha(consulta.fecha)

  const children: (Paragraph | Table)[] = []

  // ── Encabezado del documento ──
  // TODO: Cuando se tenga la plantilla, agregar imagen de encabezado aquí
  // usando ImageRun en el Header de la sección

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [
        new TextRun({
          text: 'Historial Clínico',
          bold: true,
          size: 32, // 16pt
          color: COLOR_PRIMARY,
          font: FONT,
        }),
      ],
    })
  )

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Notas Médicas',
          size: 28, // 14pt
          color: COLOR_LABEL,
          font: FONT,
        }),
      ],
    })
  )

  // ── Información general ──
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR_PRIMARY },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({ text: 'Paciente: ', bold: true, size: 22, color: COLOR_LABEL, font: FONT }),
                    new TextRun({ text: nombrePaciente, size: 22, color: COLOR_HEADING, font: FONT }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR_PRIMARY },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 60 },
                  children: [
                    new TextRun({ text: 'Fecha: ', bold: true, size: 22, color: COLOR_LABEL, font: FONT }),
                    new TextRun({ text: fechaFormateada, size: 22, color: COLOR_HEADING, font: FONT }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  )

  if (consulta.motivo) {
    children.push(crearSeparador())
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'Motivo: ', bold: true, size: 22, color: COLOR_LABEL, font: FONT }),
          new TextRun({ text: consulta.motivo, size: 22, color: COLOR_HEADING, font: FONT }),
        ],
      })
    )
  }

  // ── Mediciones Básicas ──
  const medBasicas: { label: string; valor: string }[] = []
  if (consulta.peso) medBasicas.push({ label: 'Peso', valor: `${consulta.peso} kg` })
  if (consulta.talla) medBasicas.push({ label: 'Talla', valor: `${consulta.talla} m` })
  if (consulta.imc) medBasicas.push({ label: 'IMC', valor: `${consulta.imc}` })

  if (medBasicas.length > 0) {
    children.push(crearTituloSeccion('Mediciones Básicas'))
    children.push(crearTablaMediciones(medBasicas))
  }

  // ── Composición Corporal ──
  const compCorporal: { label: string; valor: string }[] = []
  if (consulta.grasa_corporal) compCorporal.push({ label: '% Grasa Corporal', valor: `${consulta.grasa_corporal}%` })
  if (consulta.porcentaje_agua) compCorporal.push({ label: '% Agua', valor: `${consulta.porcentaje_agua}%` })
  if (consulta.masa_muscular_kg) compCorporal.push({ label: 'Masa Muscular', valor: `${consulta.masa_muscular_kg} kg` })
  if (consulta.grasa_visceral) compCorporal.push({ label: 'Grasa Visceral', valor: `${consulta.grasa_visceral}` })

  if (compCorporal.length > 0) {
    children.push(crearTituloSeccion('Composición Corporal'))
    children.push(crearTablaMediciones(compCorporal))
  }

  // ── Perímetros ──
  const perimetros: { label: string; valor: string }[] = []
  if (consulta.brazo_relajado) perimetros.push({ label: 'Brazo relajado', valor: `${consulta.brazo_relajado} cm` })
  if (consulta.brazo_flexionado) perimetros.push({ label: 'Brazo flexionado', valor: `${consulta.brazo_flexionado} cm` })
  if (consulta.cintura) perimetros.push({ label: 'Cintura', valor: `${consulta.cintura} cm` })
  if (consulta.cadera_maximo) perimetros.push({ label: 'Cadera máximo', valor: `${consulta.cadera_maximo} cm` })
  if (consulta.muslo_maximo) perimetros.push({ label: 'Muslo máximo', valor: `${consulta.muslo_maximo} cm` })
  if (consulta.muslo_medio) perimetros.push({ label: 'Muslo medio', valor: `${consulta.muslo_medio} cm` })
  if (consulta.pantorrilla_maximo) perimetros.push({ label: 'Pantorrilla máximo', valor: `${consulta.pantorrilla_maximo} cm` })

  if (perimetros.length > 0) {
    children.push(crearTituloSeccion('Perímetros'))
    children.push(crearTablaMediciones(perimetros))
  }

  // ── Pliegues Cutáneos ──
  const pliegues: { label: string; valor: string }[] = []
  if (consulta.pliegue_tricipital) pliegues.push({ label: 'P. Tricipital', valor: `${consulta.pliegue_tricipital} mm` })
  if (consulta.pliegue_subescapular) pliegues.push({ label: 'P. Subescapular', valor: `${consulta.pliegue_subescapular} mm` })
  if (consulta.pliegue_bicipital) pliegues.push({ label: 'P. Bicipital', valor: `${consulta.pliegue_bicipital} mm` })
  if (consulta.pliegue_cresta_iliaca) pliegues.push({ label: 'P. Cresta ilíaca', valor: `${consulta.pliegue_cresta_iliaca} mm` })
  if (consulta.pliegue_supraespinal) pliegues.push({ label: 'P. Supraespinal', valor: `${consulta.pliegue_supraespinal} mm` })
  if (consulta.pliegue_abdominal) pliegues.push({ label: 'P. Abdominal', valor: `${consulta.pliegue_abdominal} mm` })

  if (pliegues.length > 0) {
    children.push(crearTituloSeccion('Pliegues Cutáneos'))
    children.push(crearTablaMediciones(pliegues))
  }

  // ── Notas Clínicas (7 secciones) ──
  const seccionesClinicas: { titulo: string; contenido: string | null }[] = [
    { titulo: 'Diagnóstico y tratamiento médico', contenido: consulta.diagnostico },
    { titulo: 'Antecedentes Familiares', contenido: consulta.antecedentes_familiares },
    { titulo: 'Estudios de laboratorio', contenido: consulta.estudios_laboratorio },
    { titulo: 'Hábitos alimenticios', contenido: consulta.notas },
    { titulo: 'Hábitos de Ejercicio', contenido: consulta.observaciones },
    { titulo: 'Objetivos de tratamiento', contenido: consulta.objetivo },
    { titulo: 'Plan nutricional', contenido: consulta.plan },
  ]

  for (const seccion of seccionesClinicas) {
    if (seccion.contenido) {
      children.push(crearTituloSeccion(seccion.titulo))
      // Dividir por saltos de línea para respetar formato
      const lineas = seccion.contenido.split('\n')
      for (const linea of lineas) {
        children.push(crearParrafoTexto(linea || ' '))
      }
    }
  }

  // ── Información de Pago ──
  if (consulta.monto_consulta || consulta.metodo_pago || consulta.estado_pago) {
    const datosPago: { label: string; valor: string }[] = []
    if (consulta.monto_consulta) datosPago.push({ label: 'Monto', valor: formatearMonto(consulta.monto_consulta) })
    if (consulta.metodo_pago) datosPago.push({ label: 'Método de pago', valor: getMetodoPagoLabel(consulta.metodo_pago) })
    if (consulta.estado_pago) datosPago.push({ label: 'Estado', valor: getEstadoPagoLabel(consulta.estado_pago) })
    if (consulta.notas_pago) datosPago.push({ label: 'Notas', valor: consulta.notas_pago })

    children.push(crearTituloSeccion('Información de Pago'))
    children.push(crearTablaMediciones(datosPago))
  }

  // ── Próxima cita ──
  if (consulta.proxima_cita) {
    children.push(crearSeparador())
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({ text: 'Próxima cita sugerida: ', bold: true, size: 22, color: COLOR_LABEL, font: FONT }),
          new TextRun({ text: formatearFecha(consulta.proxima_cita), size: 22, color: COLOR_PRIMARY, font: FONT }),
        ],
      })
    )
  }

  // ── Pie de documento ──
  children.push(crearSeparador())
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: `Documento generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          size: 18, // 9pt
          color: COLOR_LABEL,
          italics: true,
          font: FONT,
        }),
      ],
    })
  )

  // ── Cargar imágenes ──
  const [fondoBuffer, encabezadoBuffer] = await Promise.all([
    cargarImagen('/word/fondo.png'),
    cargarImagen('/word/encabezado.png'),
  ])

  // Crear header con encabezado (izq + der) y marca de agua
  const headerChildren: Paragraph[] = []

  // Encabezado: imagen a la izquierda y a la derecha
  if (encabezadoBuffer) {
    headerChildren.push(
      new Paragraph({
        children: [
          // Imagen izquierda (~0.5cm del borde izquierdo)
          new ImageRun({
            type: 'png',
            data: encabezadoBuffer,
            transformation: {
              width: 180,
              height: 50,
            },
            floating: {
              horizontalPosition: {
                relative: 'page' as const,
                offset: 457200, // 0.5cm en EMUs (desde borde izq de página)
              },
              verticalPosition: {
                relative: 'page' as const,
                offset: 270000, // 0.5cm desde arriba
              },
              behindDocument: false,
              allowOverlap: true,
              wrap: { type: TextWrappingType.NONE },
            },
            outline: {
              type: 'noFill' as const,
            },
          }),
          // Imagen derecha (simétrica, ~0.5cm del borde derecho)
          // Página carta = 12240 twips = 7772400 EMUs de ancho
          // Imagen = 180px ≈ 1714500 EMUs de ancho (180 * 9525)
          // Offset derecho = 7772400 - 1714500 - 457200 = 5600700
          new ImageRun({
            type: 'png',
            data: encabezadoBuffer,
            transformation: {
              width: 180,
              height: 50,
            },
            floating: {
              horizontalPosition: {
                relative: 'page' as const,
                offset: 5600700,
              },
              verticalPosition: {
                relative: 'page' as const,
                offset: 270000,
              },
              behindDocument: false,
              allowOverlap: true,
              wrap: { type: TextWrappingType.NONE },
            },
            outline: {
              type: 'noFill' as const,
            },
          }),
        ],
      })
    )
  }

  // Marca de agua centrada detrás del texto
  if (fondoBuffer) {
    headerChildren.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: 'png',
            data: fondoBuffer,
            transformation: {
              width: 400,
              height: 400,
            },
            floating: {
              horizontalPosition: {
                align: 'center' as const,
              },
              verticalPosition: {
                align: 'center' as const,
              },
              behindDocument: true,
              allowOverlap: true,
            },
          }),
        ],
      })
    )
  }

  // ── Crear documento ──
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 pulgada
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        children,
      },
    ],
  })

  // ── Generar y descargar ──
  const blob = await Packer.toBlob(doc)
  const nombreArchivo = `Notas_Clinicas_${nombrePaciente.replace(/\s+/g, '_')}_${consulta.fecha.split('T')[0]}.docx`
  saveAs(blob, nombreArchivo)
}

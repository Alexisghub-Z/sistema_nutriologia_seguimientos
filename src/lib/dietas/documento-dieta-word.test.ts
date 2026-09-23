import { describe, it, expect } from 'vitest'
import { Packer } from 'docx'
import JSZip from 'jszip'
import { construirDocumentoWord } from './documento-dieta-word'
import { OPCIONES_POR_DEFECTO, nombreDeArchivo, type DatosDocumento } from './hoja-paciente'

/**
 * El .docx se genera de verdad y obedece las opciones.
 * ------------------------------------------------------------
 * Un documento Word es un zip de XML: aquí se empaqueta de verdad y se lee su
 * contenido, en vez de comprobar que la función "no lanzó". Que no lance no
 * significa que el paciente vaya a encontrar su dieta dentro.
 */

const DATOS: DatosDocumento = {
  paciente: 'Ana Martínez López',
  fecha: '21 de septiembre de 2026',
  kcalMeta: 1576,
  macros: { proteina: 79, grasa: 53, carbohidrato: 197 },
  restricciones: ['Alergia al cacahuate', 'Intolerancia a la lactosa'],
  indicacionesInicio: 'Bebe 2 L de agua al día.\nEvita alimentos fritos.',
  consulta: { peso: 70, talla: 170, imc: 24.2, clasificacionImc: 'Normal', objetivo: 'Bajar peso' },
  tiempos: [
    {
      nombre: 'Desayuno',
      kcal: 420,
      alimentos: [{ descripcion: '2 tortillas de maíz' }, { descripcion: '1 huevo cocido' }],
      nota: 'Tómalo antes de las 9.',
    },
    {
      nombre: 'Comida',
      kcal: 600,
      opciones: [
        {
          nombre: 'Pollo con verduras',
          alimentos: [{ descripcion: '120 g de pechuga' }, { descripcion: '1 taza de calabaza' }],
          preparacion: 'Asa la pechuga sin aceite y saltea la calabaza.',
        },
      ],
    },
  ],
}

/**
 * Empaqueta el .docx y devuelve el XML del documento, ya descomprimido.
 *
 * Hay que abrir el zip de verdad: un .docx guarda su contenido COMPRIMIDO, así
 * que leer el binario en crudo solo devuelve bytes ilegibles y cualquier
 * comprobación sobre el texto pasaría o fallaría por el motivo equivocado.
 */
async function textoDelDocumento(doc: ReturnType<typeof construirDocumentoWord>): Promise<string> {
  const buffer = await Packer.toBuffer(doc)
  const zip = await JSZip.loadAsync(Buffer.from(buffer))
  const documento = zip.file('word/document.xml')
  if (!documento) throw new Error('el .docx no contiene word/document.xml')
  return await documento.async('string')
}

describe('documento Word de la dieta', () => {
  it('se genera un archivo .docx real y no vacío', async () => {
    const doc = construirDocumentoWord(DATOS)
    const buffer = await Packer.toBuffer(doc)

    expect(buffer.byteLength).toBeGreaterThan(1000)
    // Un .docx es un zip: empieza por "PK".
    expect(Buffer.from(buffer).subarray(0, 2).toString()).toBe('PK')
  })

  it('lleva el nombre del paciente y sus alimentos', async () => {
    const doc = construirDocumentoWord(DATOS)
    const xml = await textoDelDocumento(doc)

    expect(xml).toContain('Ana Mart')
    expect(xml).toContain('Desayuno')
    expect(xml).toContain('tortillas de ma')
    expect(xml).toContain('huevo cocido')
  })

  it('el recetario incluye la preparación cuando se pide', async () => {
    // Sin preparación, un recetario es una lista de ingredientes que nadie
    // sabe cocinar: por eso se comprueba que llegue al documento.
    const con = await textoDelDocumento(
      construirDocumentoWord(DATOS, { ...OPCIONES_POR_DEFECTO, preparacion: true })
    )
    expect(con).toContain('Asa la pechuga')

    const sin = await textoDelDocumento(
      construirDocumentoWord(DATOS, { ...OPCIONES_POR_DEFECTO, preparacion: false })
    )
    expect(sin).not.toContain('Asa la pechuga')
  })

  it('las restricciones solo salen si se piden', async () => {
    // Son datos clínicos sensibles: que aparezcan sin haberlo pedido sería
    // imprimir en la hoja del paciente algo que el nutriólogo no decidió.
    const con = await textoDelDocumento(
      construirDocumentoWord(DATOS, { ...OPCIONES_POR_DEFECTO, restricciones: true })
    )
    expect(con).toContain('cacahuate')

    const sin = await textoDelDocumento(
      construirDocumentoWord(DATOS, { ...OPCIONES_POR_DEFECTO, restricciones: false })
    )
    expect(sin).not.toContain('cacahuate')
  })

  it('las indicaciones de inicio se respetan línea a línea', async () => {
    const xml = await textoDelDocumento(
      construirDocumentoWord(DATOS, { ...OPCIONES_POR_DEFECTO, indicaciones: true })
    )
    expect(xml).toContain('Bebe 2 L de agua')
    expect(xml).toContain('Evita alimentos fritos')
  })

  it('las kcal por tiempo aparecen solo si se piden', async () => {
    const con = await textoDelDocumento(
      construirDocumentoWord(DATOS, { ...OPCIONES_POR_DEFECTO, kcalPorTiempo: true })
    )
    expect(con).toContain('420 kcal')

    const sin = await textoDelDocumento(
      construirDocumentoWord(DATOS, { ...OPCIONES_POR_DEFECTO, kcalPorTiempo: false })
    )
    expect(sin).not.toContain('420 kcal')
  })

  it('una dieta sin datos opcionales no revienta', async () => {
    // El caso mínimo: un plan recién generado, sin consulta ni restricciones.
    const minimo: DatosDocumento = {
      paciente: 'Paciente',
      fecha: 'hoy',
      tiempos: [{ nombre: 'Cena', alimentos: [{ descripcion: '1 manzana' }] }],
    }
    const buffer = await Packer.toBuffer(construirDocumentoWord(minimo))
    expect(buffer.byteLength).toBeGreaterThan(1000)
  })
})

describe('nombreDeArchivo (compartido con el PDF)', () => {
  it('lleva paciente, fecha y hora', () => {
    // Fecha construida en hora local: el nombre lo lee una persona, y con
    // toISOString() un plan de las 14:30 en México saldría como "2230".
    const nombre = nombreDeArchivo('Ana Martínez López', 'docx', new Date(2026, 8, 21, 14, 30))
    expect(nombre).toBe('plan-ana-martinez-lopez-2026-09-21-1430.docx')
  })

  it('dos descargas el mismo día NO se pisan', () => {
    // El caso que motivó añadir la hora: se corrige algo, se vuelve a
    // descargar, y antes los dos archivos se llamaban igual.
    const primera = nombreDeArchivo('Ana López', 'pdf', new Date(2026, 8, 21, 9, 15))
    const segunda = nombreDeArchivo('Ana López', 'pdf', new Date(2026, 8, 21, 17, 42))
    expect(primera).not.toBe(segunda)
    expect(primera).toBe('plan-ana-lopez-2026-09-21-0915.pdf')
    expect(segunda).toBe('plan-ana-lopez-2026-09-21-1742.pdf')
  })

  it('el PDF y el Word del mismo plan se distinguen por la extensión', () => {
    const momento = new Date(2026, 8, 21, 14, 30)
    expect(nombreDeArchivo('Ana López', 'pdf', momento)).toBe('plan-ana-lopez-2026-09-21-1430.pdf')
    expect(nombreDeArchivo('Ana López', 'docx', momento)).toBe('plan-ana-lopez-2026-09-21-1430.docx')
  })

  it('aguanta nombres raros', () => {
    expect(nombreDeArchivo('  ', 'docx', new Date(2026, 0, 1, 8, 5))).toBe(
      'plan-paciente-2026-01-01-0805.docx'
    )
    expect(nombreDeArchivo('José/María #2', 'docx', new Date(2026, 0, 1, 8, 5))).toBe(
      'plan-jose-maria-2-2026-01-01-0805.docx'
    )
  })
})

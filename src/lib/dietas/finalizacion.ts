import { logSuccess } from '@/lib/logger'

/**
 * Efectos posteriores a finalizar una dieta.
 * ------------------------------------------------------------
 * Punto ÚNICO de extensión para lo que deba ocurrir cuando una dieta pasa a ser
 * versión definitiva. Vive aquí (y no en cada endpoint) para que la lógica no se
 * duplique entre el POST que guarda+finaliza y el PATCH que finaliza después.
 *
 * Se llama SIEMPRE fuera de la transacción que marca la dieta: si se encolara
 * dentro y la transacción hiciera rollback, quedaría un job apuntando a una
 * dieta que no existe.
 */
export async function alFinalizarDieta(dietaId: string): Promise<void> {
  logSuccess('Dieta finalizada', { dietaId })

  // --- GANCHO: generación de imágenes de los platillos (fase futura) ---
  // Cuando se implemente, aquí se encolará un job de Bull (ver src/lib/queue/)
  // con { dietaId } para generar una imagen por platillo único del recetario.
  // Debe ser asíncrono y no bloquear la respuesta: el estado de las imágenes se
  // consultará aparte. Solo se generan aquí, con la dieta ya definitiva, para no
  // gastar en versiones intermedias que la IA todavía iba a reescribir.
  //
  // await encolarImagenesDieta(dietaId)
}

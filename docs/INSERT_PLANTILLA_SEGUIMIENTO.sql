-- Script para agregar plantilla de seguimiento
-- Ejecutar este script en la base de datos para agregar la plantilla

INSERT INTO "plantillas_mensaje" (
  "id",
  "nombre",
  "tipo",
  "contenido",
  "activa",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Recordatorio de Seguimiento',
  'AUTOMATICO_SEGUIMIENTO',
  '¡Hola {nombre}! 👋

Recordatorio: Mañana {fecha_relativa} es tu cita de seguimiento sugerida a las {hora_formateada}.

¿Te gustaría agendarla? Contáctanos para confirmar tu horario.

¡Esperamos verte pronto! 🌟',
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

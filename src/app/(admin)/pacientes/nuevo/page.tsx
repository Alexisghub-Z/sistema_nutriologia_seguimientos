import PacienteForm from '@/components/forms/PacienteForm'
import styles from './nuevo.module.css'

export default function NuevoPacientePage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Agregar Nuevo Paciente</h1>
        <p className={styles.subtitle}>
          Completa la información del paciente para registrarlo en el sistema
        </p>
      </div>

      <PacienteForm />
    </div>
  )
}

import { useEffect } from 'react'

export function useScrollReveal() {
  useEffect(() => {
    // Función para observar elementos
    const observeElements = () => {
      const elements = document.querySelectorAll('[data-scroll-reveal]')

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible')
            }
          })
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px',
        }
      )

      elements.forEach((element) => {
        // Inmediatamente verificar si el elemento ya está visible
        const rect = element.getBoundingClientRect()
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0

        if (isVisible) {
          // Si ya está visible, añadir clase instantánea (sin transición)
          element.classList.add('visible-instant')
        } else {
          // Si no está visible, observar para animación con scroll
          observer.observe(element)
        }
      })

      return observer
    }

    // Observer inicial
    let observer = observeElements()

    // MutationObserver para detectar cambios en el DOM (cuando cambian de paso)
    const mutationObserver = new MutationObserver(() => {
      // Pequeño delay para que el DOM se actualice completamente
      setTimeout(() => {
        // Desconectar observer anterior
        observer.disconnect()
        // Crear nuevo observer con los elementos actuales
        observer = observeElements()
      }, 50)
    })

    // Observar cambios en el body
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [])
}

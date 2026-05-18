import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { openFamilyStream, type FamilyStreamHandler } from '../api/familyStream'

export function useFamilyStream(familyId: string | null | undefined, onEvent: FamilyStreamHandler) {
  const handlerRef = useRef<FamilyStreamHandler>(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!familyId) return

    let close: (() => void) | null = null
    const connect = () => {
      close?.()
      close = openFamilyStream(familyId, (e) => handlerRef.current(e))
    }

    connect()

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') connect()
    })

    return () => {
      sub.remove()
      close?.()
    }
  }, [familyId])
}

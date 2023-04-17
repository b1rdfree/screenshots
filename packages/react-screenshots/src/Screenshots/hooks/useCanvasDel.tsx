import { useEffect } from 'react'
import useEmiter from '../hooks/useEmiter'

export default function useCanvasKeyboardDel (onKeyboardDel: (e: MouseEvent) => unknown): void {
  const emiter = useEmiter()

  useEffect(() => {
    emiter.on('keyboardDel', onKeyboardDel)
    return () => {
      emiter.off('keyboardDel', onKeyboardDel)
    }
  }, [onKeyboardDel, emiter])
}

import { useEffect } from 'react'
import useEmiter from '../hooks/useEmiter'
import { HistoryItemSource } from '../types'

export default function useDoubleClick (
  onDoubleClick: (action: HistoryItemSource<unknown, unknown>, e: MouseEvent) => unknown
): void {
  const emiter = useEmiter()

  useEffect(() => {
    emiter.on('doubleClick', onDoubleClick)
    return () => {
      emiter.off('doubleClick', onDoubleClick)
    }
  }, [onDoubleClick, emiter])
}

import { useCallback } from 'react'
import { Bounds } from '../types'
import useDispatcher from './useDispatcher'
import useStore from './useStore'

export interface BoundsDispatcher {
  set: (bounds: Bounds, type?: string) => void
  reset: () => void
}

export type BoundsValueDispatcher = [Bounds | null, BoundsDispatcher]

export default function useBounds (): BoundsValueDispatcher {
  const { bounds } = useStore()
  const { setBounds } = useDispatcher()

  const set = useCallback(
    (bounds: Bounds, type?:string) => {
      setBounds?.({...bounds, type: type === 'move' ? 'move' : undefined})
    },
    [setBounds]
  )

  const reset = useCallback(() => {
    setBounds?.(null)
  }, [setBounds])

  return [
    bounds,
    {
      set,
      reset
    }
  ]
}

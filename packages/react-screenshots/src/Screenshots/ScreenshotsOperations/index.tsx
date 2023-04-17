import React, { memo, MouseEvent, ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import useBounds from '../hooks/useBounds'
import useStore from '../hooks/useStore'
import OperationButtons from '../operations'
import { Bounds, Position } from '../types'
import './index.less'
import { useGetState } from 'ahooks'

export const ScreenshotsOperationsCtx = React.createContext<Bounds | null>(null)

export default memo(function ScreenshotsOperations (): ReactElement | null {
  const { width, height } = useStore()
  const [bounds] = useBounds()
  const [operationsRect, setOperationsRect] = useState<Bounds | null>(null)
  const [position, setPosition, getPosition] = useGetState<Position | null>(null)

  const elRef = useRef<HTMLDivElement>(null)
  const onDoubleClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
  }, [])

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!bounds || !elRef.current) {
      return
    }

    const elRect = elRef.current.getBoundingClientRect()

    let x = bounds.x + bounds.width - elRect.width
    let y = bounds.y + bounds.height + 10

    if (x < 0) {
      x = 0
    }

    if (x > width - elRect.width) {
      x = width - elRect.width
    }

    if (y > height - elRect.height) {
      y = height - elRect.height - 10
    }


    // 小数存在精度问题
    if (
      !operationsRect ||
      Math.abs(operationsRect.x - elRect.x) > 1 ||
      Math.abs(operationsRect.y - elRect.y) > 1 ||
      Math.abs(operationsRect.width - elRect.width) > 1 ||
      Math.abs(operationsRect.height - elRect.height) > 1
    ) {
      setOperationsRect({
        x: elRect.x,
        y: elRect.y,
        width: elRect.width,
        height: elRect.height
      })
    }
  })

  useEffect(() => {
    let timer: any = null;

    if (bounds) {
      if (getPosition()) setPosition(null);
      const opWrapperWidth = 342;
      const opWrapperHeight = 34;
      const { x, y, width, height, type } = bounds;

      let top: number = 0;
      let left: number = 0;

      if (document.body.clientHeight - y - height > opWrapperHeight + 10) {
        top = y + height + 10;
      } else {
        top = y - 10 - opWrapperHeight;
      }

      if((document.body.clientHeight - height) < opWrapperHeight){
        top = y + height - 10 -opWrapperHeight
      }

      if (x + width < opWrapperWidth) {
        left = x + 4;
      } else {
        left = x + width - opWrapperWidth - 4;
      }

      if ((top > 0 || left > 0) && !type) {
        timer = setTimeout(() => {
          setPosition({ x: left, y: top });
        }, 100);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [bounds]);


  if (!bounds) {
    return null
  }

  return (
    <ScreenshotsOperationsCtx.Provider value={operationsRect}>
      <div
        ref={elRef}
        className='screenshots-operations'
        style={{
          visibility: position ? 'visible' : 'hidden',
          transform: `translate(${position?.x ?? 0}px, ${position?.y ?? 0}px)`
        }}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        <div className='screenshots-operations-buttons'>
          {OperationButtons.map((OperationButton, index) => {
            if (OperationButton === '|') {
              return <div key={index} className='screenshots-operations-divider' />
            } else {
              return <OperationButton key={index} />
            }
          })}
        </div>
      </div>
    </ScreenshotsOperationsCtx.Provider>
  )
})

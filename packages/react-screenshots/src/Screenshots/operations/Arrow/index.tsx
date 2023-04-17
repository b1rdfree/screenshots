import React, { ReactElement, useCallback, useEffect, useRef } from 'react'
import ScreenshotsButton from '../../ScreenshotsButton'
import ScreenshotsSizeColor from '../../ScreenshotsSizeColor'
import useCanvasMousedown from '../../hooks/useCanvasMousedown'
import useCanvasMousemove from '../../hooks/useCanvasMousemove'
import useCanvasMouseup from '../../hooks/useCanvasMouseup'
import { HistoryItemEdit, HistoryItemSource, HistoryItemType } from '../../types'
import useCursor from '../../hooks/useCursor'
import useOperation from '../../hooks/useOperation'
import useHistory from '../../hooks/useHistory'
import useCanvasContextRef from '../../hooks/useCanvasContextRef'
import { isHit, isHitCircle } from '../utils'
import useDrawSelect from '../../hooks/useDrawSelect'
import draw, { getEditedArrowData } from './draw'
import useLang from '../../hooks/useLang'
import { useGetState, useMemoizedFn } from 'ahooks'
import useCanvasKeyboardDel from '../../hooks/useCanvasDel'

export interface ArrowData {
  size: number
  color: string
  x1: number
  x2: number
  y1: number
  y2: number
}

export enum ArrowEditType {
  Move,
  MoveStart,
  MoveEnd
}

export interface ArrowEditData {
  type: ArrowEditType
  x1: number
  x2: number
  y1: number
  y2: number
  size: number
  color: string
  isDel: boolean
}

export default function Arrow (): ReactElement {
  const lang = useLang()
  const [, cursorDispatcher] = useCursor()
  const [operation, operationDispatcher] = useOperation()
  const [history, historyDispatcher] = useHistory()
  const canvasContextRef = useCanvasContextRef()
  const [size, setSize, getSize] = useGetState(3)
  const cacheSizeRef = useRef<number>(3)
  const [color, setColor, getColor] = useGetState('#ee5126')
  const cacheColorRef = useRef<string>("#ee5126")
  const arrowRef = useRef<HistoryItemSource<ArrowData, ArrowEditData> | null>(null)
  const arrowEditRef = useRef<HistoryItemEdit<ArrowEditData, ArrowData> | null>(null)

  const checked = operation === 'Arrow'

  const selectArrow = useCallback(() => {
    operationDispatcher.set('Arrow')
    cursorDispatcher.set('default')
  }, [operationDispatcher, cursorDispatcher])

  const onSelectArrow = useCallback(() => {
    if (checked) {
      return
    }
    selectArrow()
    historyDispatcher.clearSelect()
  }, [checked, selectArrow, historyDispatcher])

  const onDrawSelect = useCallback(
    (action: HistoryItemSource<unknown, unknown>, e: MouseEvent) => {
      if (action.name !== 'Arrow' || !canvasContextRef.current) {
        return
      }

      const source = action as HistoryItemSource<ArrowData, ArrowEditData>
      selectArrow()

      const { x1, y1, x2, y2 } = getEditedArrowData(source)
      let type = ArrowEditType.Move
      if (
        isHitCircle(canvasContextRef.current.canvas, e, {
          x: x1,
          y: y1
        })
      ) {
        type = ArrowEditType.MoveStart
      } else if (
        isHitCircle(canvasContextRef.current.canvas, e, {
          x: x2,
          y: y2
        })
      ) {
        type = ArrowEditType.MoveEnd
      }

      const length = source.editHistory.length

      const color: string = length > 0 ? source.editHistory[length - 1].data.color : source.data.color
      const size: number = length > 0 ? source.editHistory[length - 1].data.size : source.data.size
      const isDel: boolean = length > 0 ? source.editHistory[length - 1].data.isDel : false

      arrowEditRef.current = {
        type: HistoryItemType.Edit,
        data: {
          type,
          x1: e.clientX,
          y1: e.clientY,
          x2: e.clientX,
          y2: e.clientY,
          color,
          size,
          isDel
        },
        source
      }

      historyDispatcher.select(action)
    },
    [canvasContextRef, selectArrow, historyDispatcher]
  )

  const onMousedown = useCallback(
    (e: MouseEvent) => {
      if (!checked || arrowRef.current || !canvasContextRef.current) {
        return
      }

      const { left, top } = canvasContextRef.current.canvas.getBoundingClientRect()
      arrowRef.current = {
        name: 'Arrow',
        type: HistoryItemType.Source,
        data: {
          size,
          color,
          x1: e.clientX - left,
          y1: e.clientY - top,
          x2: e.clientX - left,
          y2: e.clientY - top
        },
        editHistory: [],
        draw,
        isHit
      }
    },
    [checked, color, size, canvasContextRef]
  )

  const onMousemove = useCallback(
    (e: MouseEvent) => {
      if (!checked || !canvasContextRef.current) {
        return
      }
      if (arrowEditRef.current) {
        arrowEditRef.current.data.x2 = e.clientX
        arrowEditRef.current.data.y2 = e.clientY
        if (history.top !== arrowEditRef.current) {
          arrowEditRef.current.source.editHistory.push(arrowEditRef.current)
          historyDispatcher.push(arrowEditRef.current)
        } else {
          historyDispatcher.set(history)
        }
      } else if (arrowRef.current) {
        const { left, top } = canvasContextRef.current.canvas.getBoundingClientRect()

        arrowRef.current.data.x2 = e.clientX - left
        arrowRef.current.data.y2 = e.clientY - top

        if (history.top !== arrowRef.current) {
          historyDispatcher.push(arrowRef.current)
        } else {
          historyDispatcher.set(history)
        }
      }
    },
    [checked, history, canvasContextRef, historyDispatcher]
  )

  const onMouseup = useCallback(() => {
    if (!checked) {
      return
    }

    if (arrowRef.current) {
      historyDispatcher.clearSelect()
    }

    arrowRef.current = null
    arrowEditRef.current = null
  }, [checked, historyDispatcher])

  const seletedRectangleRef = useRef<HistoryItemEdit<
    ArrowEditData,
    ArrowData
  > | null>(null);
  useEffect(() => {
    const arr = history.stack
      .filter((item) => item.type === HistoryItemType.Source)
      .filter((item) => !!(item as HistoryItemSource<any, any>)?.isSelected)
      .filter(
        (item) => (item as HistoryItemSource<any, any>)?.name === "Arrow"
      );
    if (arr.length > 0) {
      const infoRectangle = arr[0] as HistoryItemSource<
        ArrowData,
        ArrowEditData
      >;
      const length = infoRectangle.editHistory.length
      let size = length > 0 ? infoRectangle.editHistory[length - 1].data.size : infoRectangle.data.size;
      let color = length > 0 ? infoRectangle.editHistory[length - 1].data.color : infoRectangle.data.color;
      let isDel = length > 0 ? infoRectangle.editHistory[length - 1].data.isDel : false;
      let editPosition: ArrowEditData = {
        type: 0,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        color: color,
        size: size,
        isDel: isDel
      };

      seletedRectangleRef.current = {
        type: HistoryItemType.Edit,
        data: JSON.parse(JSON.stringify(editPosition)),
        source: arr[0] as HistoryItemSource<ArrowData, ArrowEditData>,
      };
      setSize(editPosition.size)
      setColor(editPosition.color)
    } else {
      seletedRectangleRef.current = null;
      setSize(cacheSizeRef.current)
      setColor(cacheColorRef.current)
    }
  }, [history]);

  const onSize = useMemoizedFn((size: number) => {
    if (getSize() === size) return;
    setSize(size);

    if (!checked) return;
    if (seletedRectangleRef.current) {
      seletedRectangleRef.current.data.size = size;
      seletedRectangleRef.current.source.editHistory.push(
        seletedRectangleRef.current
      );
      historyDispatcher.push(seletedRectangleRef.current);
    } else {
      cacheSizeRef.current = size
    }
  });

  const onColor = useMemoizedFn((color: string) => {
    if (getColor() === color) return;
    setColor(color);

    if (!checked) return;
    if (seletedRectangleRef.current) {
      seletedRectangleRef.current.data.color = color;
      seletedRectangleRef.current.source.editHistory.push(
        seletedRectangleRef.current
      );
      historyDispatcher.push(seletedRectangleRef.current);
    } else {
      cacheColorRef.current = color
    }
  });

  const onDel = useMemoizedFn(() => { 
    if (!checked) return;
    if (seletedRectangleRef.current) {
      seletedRectangleRef.current.data.isDel = true
      seletedRectangleRef.current.source.editHistory.push(seletedRectangleRef.current)
      historyDispatcher.push(seletedRectangleRef.current)
      setTimeout(() => {
        historyDispatcher.clearSelect()
      }, 50);
    }
  })

  useDrawSelect(onDrawSelect)
  useCanvasMousedown(onMousedown)
  useCanvasMousemove(onMousemove)
  useCanvasMouseup(onMouseup)
  useCanvasKeyboardDel(onDel)

  return (
    <ScreenshotsButton
      title={lang.operation_arrow_title}
      icon='icon-arrow'
      checked={checked}
      onClick={onSelectArrow}
      option={<ScreenshotsSizeColor size={size} color={color} onSizeChange={onSize} onColorChange={onColor} />}
    />
  )
}
